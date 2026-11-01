// Workflow contract tests (#55): least privilege, no secret exposure on
// pull requests, and owner-gated production publishing.
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
  // YAML parses the bare key `on` as boolean true.
  return Object.keys(workflow.on ?? workflow[true] ?? {});
}

test("site-ci validates external Sites without running on pull requests", () => {
  const workflow = loadWorkflow("site-ci.yml");
  // No pull_request/push trigger: an untrusted PR can never run a job that
  // receives the Site token, so the token cannot leak into PR logs.
  assert.deepEqual(triggers(workflow).sort(), ["workflow_call", "workflow_dispatch"]);
  assert.equal(workflow.permissions.contents, "read");
  assert.equal(Object.keys(workflow.permissions).length, 1);
  assert.equal(workflow.on.workflow_call.secrets.site_token.required, true);
  // The Site token is consumed only through the checkout action, which runs
  // with persist-credentials disabled.
  const steps = workflow.jobs.validate.steps;
  const siteCheckout = steps.find((step) => step.uses === "actions/checkout@v4" && step.with?.repository);
  assert.ok(siteCheckout, "the Site checkout step must exist");
  assert.equal(siteCheckout.with["persist-credentials"], false);
  assert.equal(siteCheckout.with.token, "${{ secrets.site_token }}");
  for (const step of steps) {
    const serialized = JSON.stringify(step);
    if (serialized.includes("secrets.site_token")) {
      assert.equal(step, siteCheckout, "the Site token must appear only in the checkout step");
    }
  }
});

test("deploy publishing is dispatch-only and owner-gated", () => {
  const workflow = loadWorkflow("deploy.yml");
  assert.deepEqual(triggers(workflow), ["workflow_dispatch"]);
  assert.equal(workflow.permissions.contents, "read");
  assert.equal(workflow.permissions.pages, "write");
  assert.equal(workflow.jobs.deploy.environment.name, "github-pages");
  // Multi-host: GitHub Pages subpath and root-domain layouts.
  assert.deepEqual(workflow.on.workflow_dispatch.inputs.deploy_base.options, ["subpath", "root"]);
});

test("every workflow runs with least privilege", () => {
  for (const file of fs.readdirSync(workflowsDir).filter((name) => name.endsWith(".yml"))) {
    const permissions = loadWorkflow(file).permissions ?? {};
    assert.equal(permissions.contents, "read", `${file}: contents must be read-only`);
    for (const key of Object.keys(permissions)) {
      if (key === "contents") continue;
      assert.equal(permissions[key], "write", `${file}: ${key} must be write or absent`);
    }
  }
});
