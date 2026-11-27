// Workflow contract tests (#55): least privilege and owner-gated publishing.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
// The workspace root does not depend on yaml directly; packages/core does.
const yaml = createRequire(path.join(repoRoot, "packages/core/src/index.mjs"))("yaml");
const workflowsDir = path.join(repoRoot, ".github/workflows");

function loadWorkflow(name) {
  return yaml.parse(fs.readFileSync(path.join(workflowsDir, name), "utf8"));
}

function triggers(workflow) {
  // The yaml package follows YAML 1.2: the bare key `on` parses as the
  // string "on" (verified against these files with yaml@2).
  return Object.keys(workflow.on);
}

test("site-ci validates external Sites with explicit input and checkout bindings", () => {
  const workflow = loadWorkflow("site-ci.yml");
  // A caller controls the event used to invoke the reusable workflow.
  assert.deepEqual(triggers(workflow).sort(), ["workflow_call", "workflow_dispatch"]);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(workflow.on.workflow_call.secrets.site_token.required, true);
  // The Site token is consumed only through the checkout action, which runs
  // with persist-credentials disabled. No run or env step may reference any
  // secret, so the token can never enter a shell or the build environment.
  const steps = workflow.jobs.validate.steps;
  const coreCheckout = steps.find((step) => step.name === "Check out Core at the requested revision");
  assert.ok(coreCheckout, "the Core checkout step must exist");
  assert.equal(coreCheckout.with.repository, "Skyline-Gazer/ALNILAM");
  assert.equal(coreCheckout.with.ref, "${{ inputs.core_ref }}");
  const siteCheckout = steps.find((step) => step.name === "Check out the external Site at the pinned SHA");
  assert.ok(siteCheckout, "the Site checkout step must exist");
  assert.equal(siteCheckout.with.repository, "${{ inputs.site_repository }}");
  assert.equal(siteCheckout.with["persist-credentials"], false);
  assert.equal(siteCheckout.with.token, "${{ secrets.site_token }}");
  for (const step of steps) {
    if (step === siteCheckout) continue;
    assert.doesNotMatch(JSON.stringify(step), /secrets\./, "no other step may reference secrets");
  }
  // The guard step validates the caller-supplied SHA/URL before they are used.
  const guard = steps.find((step) => /Guard the caller-supplied inputs/.test(step.name ?? ""));
  assert.equal(guard.env.SITE_REF, "${{ inputs.site_ref }}");
  for (const step of steps.filter((step) => step.run)) {
    assert.doesNotMatch(step.run, /\$\{\{\s*inputs\./, "caller inputs must not be interpolated into shell source");
  }
  const verify = steps.find((step) => /Verify the Site was not modified/.test(step.name ?? ""));
  assert.ok(verify, "Site validation must verify inputs after composing");
});

test("deploy publishing is dispatch-only and owner-gated", () => {
  const workflow = loadWorkflow("deploy.yml");
  assert.deepEqual(triggers(workflow), ["workflow_dispatch"]);
  assert.deepEqual(workflow.permissions, { contents: "read", pages: "write", "id-token": "write" });
  assert.equal(workflow.jobs.deploy.environment.name, "github-pages");
  // Multi-host: GitHub Pages subpath and root-domain layouts.
  assert.deepEqual(workflow.on.workflow_dispatch.inputs.deploy_base.options, ["subpath", "root"]);
  // The root layout fails closed when its URL variable is not configured.
  const guard = workflow.jobs.deploy.steps.find((step) => /Guard the caller-supplied inputs/.test(step.name ?? ""));
  assert.ok(guard, "deploy must guard its inputs");
  assert.match(guard.run, /PAGES_ROOT_URL/);
});

test("CI runs the product checks and browser matrix in parallel under one required gate", () => {
  const workflow = loadWorkflow("ci.yml");
  assert.deepEqual(Object.keys(workflow.jobs).sort(), ["browser", "checks", "performance", "scope", "verify"]);
  const gate = workflow.jobs.verify;
  // The rulesets require the check context `verify`; a job name would change it.
  assert.ok(!gate.name, "the aggregated job must keep the job id as its check name");
  assert.deepEqual([...gate.needs].sort(), ["browser", "checks", "scope"]);
  assert.match(gate.if, /always\(\)/, "the gate must still run when a branch is skipped");
  for (const branch of ["checks", "browser"]) {
    assert.match(gate.if, new RegExp(`needs\\.${branch}.result == 'success'`), `${branch} must pass`);
    assert.match(gate.if, new RegExp(`needs\\.${branch}.result == 'skipped'`), `${branch} may skip only for docs scope`);
  }
  assert.doesNotMatch(gate.if, /= 'failure'|= 'cancelled'/, "failure or cancellation may never satisfy the gate");

  const browser = workflow.jobs.browser;
  assert.equal(browser.if, "needs.scope.outputs.product == 'true'");
  const browserSteps = browser.steps.map((step) => step.name ?? step.uses);
  assert.ok(browserSteps.includes("Browser acceptance (root and /ALNILAM/)"));
  assert.ok(browserSteps.includes("Compose demo Site"), "the browser job builds the output it serves");
  assert.ok(browserSteps.includes("Compose the isolated PhotoSwipe test Site at both bases"));

  const checkSteps = workflow.jobs.checks.steps.map((step) => step.name ?? step.uses);
  for (const required of [
    "Contract tests",
    "Python contract, artifact and release tests",
    "Astro type and content checks",
    "Compose nested-base candidate",
    "Verify generated output",
    "Verify external Site composition and isolation",
    "Two-version Core upgrade / rollback against unchanged Site",
    "Verify documentation changes",
  ]) {
    assert.ok(checkSteps.includes(required), `${required} must stay in the product checks job`);
  }
  assert.ok(!checkSteps.some((name) => String(name).startsWith("Browser acceptance")), "browser must not run twice");
});

test("every workflow declares exactly its allowed permissions", () => {
  const allowed = {
    "ci.yml": { contents: "read" },
    "deploy.yml": { contents: "read", pages: "write", "id-token": "write" },
    "site-ci.yml": { contents: "read" },
    "release-status.yml": { contents: "read" },
  };
  const files = fs.readdirSync(workflowsDir).filter((name) => name.endsWith(".yml"));
  assert.deepEqual(files.sort(), Object.keys(allowed).sort(), "an unreviewed workflow was added");
  for (const file of files) {
    assert.deepEqual(loadWorkflow(file).permissions ?? {}, allowed[file], `${file}: permissions drifted`);
  }
});
