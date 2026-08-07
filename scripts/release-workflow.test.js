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
