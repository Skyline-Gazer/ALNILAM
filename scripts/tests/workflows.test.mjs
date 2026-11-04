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
  assert.equal(coreCheckout.with.repository, "Skyline-Gazer/ALNILAM");
  assert.equal(coreCheckout.with.ref, "${{ inputs.core_ref }}");
  const siteCheckout = steps.find((step) => step.name === "Check out the external Site at the pinned SHA");
  assert.equal(siteCheckout.with.repository, "${{ inputs.site_repository }}");
  assert.ok(siteCheckout, "the Site checkout step must exist");
  assert.equal(siteCheckout.with["persist-credentials"], false);
  assert.equal(siteCheckout.with.token, "${{ secrets.site_token }}");
  for (const step of steps) {
    if (step === siteCheckout) continue;
    assert.doesNotMatch(JSON.stringify(step), /secrets\./, "no other step may reference secrets");
  }
  // The guard step validates the caller-supplied SHA/URL before they are used.
  const guard = steps.find((step) => /Guard the caller-supplied inputs/.test(step.name ?? ""));
  assert.equal(guard.env.SITE_REF, "${{ inputs.site_ref }}");
  assert.match(guard.run, /\[\[ "\$SITE_REF" =~ \^\[0-9a-f\]\{40\}\$ \]\]/);
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

test("every workflow declares exactly its allowed permissions", () => {
  const allowed = {
    "ci.yml": { contents: "read" },
    "deploy.yml": { contents: "read", pages: "write", "id-token": "write" },
    "p0-evidence.yml": { contents: "read" },
    "p1-astro-compatibility.yml": { contents: "read" },
    "p1-browser-baseline.yml": { contents: "read" },
    "site-ci.yml": { contents: "read" },
  };
  const files = fs.readdirSync(workflowsDir).filter((name) => name.endsWith(".yml"));
  assert.deepEqual(files.sort(), Object.keys(allowed).sort(), "an unreviewed workflow was added");
  for (const file of files) {
    assert.deepEqual(loadWorkflow(file).permissions ?? {}, allowed[file], `${file}: permissions drifted`);
  }
});
