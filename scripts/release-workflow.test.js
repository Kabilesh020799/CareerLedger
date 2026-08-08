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
const verifyWorkflowPath = path.join(
  __dirname,
  "..",
  ".github",
  "workflows",
  "verify.yml",
);

test("publishes the GitHub Release only after production deployment", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const deployStep = workflow.indexOf("- name: Deploy immutable images");
  const releaseStep = workflow.indexOf("- name: Publish successful GitHub Release");

  assert.notEqual(deployStep, -1, "deployment step is missing");
  assert.notEqual(releaseStep, -1, "release step is missing");
  assert.ok(deployStep < releaseStep, "release must follow successful deployment");
  assert.doesNotMatch(workflow, /^  create_release:/m);
  assert.match(workflow, /node scripts\/release-notes\.js > release-notes\.md/);
  assert.match(workflow, /--notes-file release-notes\.md/);
  assert.doesNotMatch(workflow, /--generate-notes/);
});

test("validates the versioned changelog before publishing images", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const verifyWorkflow = fs.readFileSync(verifyWorkflowPath, "utf8");
  const validationStep = workflow.indexOf("- name: Validate release changelog");
  const publishJob = workflow.indexOf("  publish:");

  assert.notEqual(validationStep, -1, "changelog validation step is missing");
  assert.ok(validationStep < publishJob, "changelog validation must happen before publishing");
  assert.match(workflow, /node scripts\/release-notes\.js >\/dev\/null/);
  assert.match(verifyWorkflow, /npm run release:notes >\/dev\/null/);
});

test("configures the HTTP application origin without account secrets", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const authStep = workflow.indexOf(
    "- name: Configure HTTP application environment",
  );
  const deployStep = workflow.indexOf("- name: Deploy immutable images");

  assert.notEqual(authStep, -1, "authentication configuration step is missing");
  assert.ok(authStep < deployStep, "authentication must be configured before deployment");
  assert.doesNotMatch(workflow, /secrets\.APP_USERNAME/);
  assert.doesNotMatch(workflow, /secrets\.APP_PASSWORD/);
  assert.doesNotMatch(workflow, /secrets\.SESSION_SECRET/);
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
