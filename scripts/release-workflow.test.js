const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const workflowPath = path.join(
  __dirname,
  "..",
  ".github",
  "workflows",
  "deploy-production.yml",
);

test("publishes the GitHub Release only after production deployment", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const deployStep = workflow.indexOf("- name: Deploy immutable images");
  const releaseStep = workflow.indexOf("- name: Publish successful GitHub Release");

  assert.notEqual(deployStep, -1, "deployment step is missing");
  assert.notEqual(releaseStep, -1, "release step is missing");
  assert.ok(deployStep < releaseStep, "release must follow successful deployment");
  assert.doesNotMatch(workflow, /^  create_release:/m);
});

test("installs authentication secrets before deploying protected endpoints", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const authStep = workflow.indexOf(
    "- name: Configure protected authentication environment",
  );
  const deployStep = workflow.indexOf("- name: Deploy immutable images");

  assert.notEqual(authStep, -1, "authentication configuration step is missing");
  assert.ok(authStep < deployStep, "authentication must be configured before deployment");
  assert.match(workflow, /secrets\.APP_USERNAME/);
  assert.match(workflow, /secrets\.APP_PASSWORD/);
  assert.match(workflow, /secrets\.SESSION_SECRET/);
  assert.doesNotMatch(workflow, /deploy\/Caddyfile/);
  assert.match(workflow, /COOKIE_SECURE=false/);
});

test("plans releases alongside verification but gates image publishing on both", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const planBlock = workflow.slice(
    workflow.indexOf("  plan_release:"),
    workflow.indexOf("  publish:"),
  );
  const publishBlock = workflow.slice(
    workflow.indexOf("  publish:"),
    workflow.indexOf("  deploy:"),
  );

  assert.doesNotMatch(planBlock, /^    needs:/m);
  assert.match(publishBlock, /needs: \[verify, plan_release\]/);
});
