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
const deployScriptPath = path.join(
  __dirname,
  "deploy-production.sh",
);
const frontendDockerfilePath = path.join(
  __dirname,
  "..",
  "frontend",
  "Dockerfile",
);
const frontendNginxPath = path.join(
  __dirname,
  "..",
  "frontend",
  "nginx.conf",
);
const productionComposePath = path.join(
  __dirname,
  "..",
  "deploy",
  "compose.production.yml",
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

test("configures HTTP or HTTPS application origins without account secrets", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const authStep = workflow.indexOf(
    "- name: Configure application environment",
  );
  const deployStep = workflow.indexOf("- name: Deploy immutable images");

  assert.notEqual(authStep, -1, "authentication configuration step is missing");
  assert.ok(authStep < deployStep, "authentication must be configured before deployment");
  assert.doesNotMatch(workflow, /secrets\.APP_USERNAME/);
  assert.doesNotMatch(workflow, /secrets\.APP_PASSWORD/);
  assert.doesNotMatch(workflow, /secrets\.SESSION_SECRET/);
  assert.doesNotMatch(workflow, /deploy\/Caddyfile/);
  assert.match(workflow, /http:\/\/\*\)/);
  assert.match(workflow, /https:\/\/\*\)/);
  assert.match(workflow, /cookie_secure=true/);
  assert.match(workflow, /printf 'COOKIE_SECURE=%s/);
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

test("provides backend verification with an isolated test database URL", () => {
  const verifyWorkflow = fs.readFileSync(verifyWorkflowPath, "utf8");
  const backendStep = verifyWorkflow.slice(
    verifyWorkflow.indexOf("- name: Verify backend"),
    verifyWorkflow.indexOf("- name: Verify frontend"),
  );

  assert.match(
    backendStep,
    /DATABASE_URL: postgresql:\/\/jobtracker:jobtracker_dev@127\.0\.0\.1:5432\/jobtracker_test/,
  );
});

test("keeps the production frontend in the EC2 Compose release", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const deployScript = fs.readFileSync(deployScriptPath, "utf8");

  assert.doesNotMatch(workflow, /deploy_pages:/);
  assert.doesNotMatch(workflow, /actions\/deploy-pages@/);
  assert.doesNotMatch(workflow, /PAGES_API_URL/);
  assert.match(workflow, /service: frontend/);
  assert.match(deployScript, /docker compose[^\n]*pull backend frontend/);
});

test("runs automatic Gmail synchronization on a private persistent queue", () => {
  const compose = fs.readFileSync(productionComposePath, "utf8");

  assert.match(compose, /gmail-worker:/);
  assert.match(compose, /command: npm run start:worker/);
  assert.match(compose, /REDIS_URL: redis:\/\/redis:6379/);
  assert.match(compose, /redis-data:\/data/);
  assert.doesNotMatch(compose, /6379:6379/);
});

test("configures private S3 resume storage without static AWS keys", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const compose = fs.readFileSync(
    path.join(__dirname, "..", "deploy", "compose.production.yml"),
    "utf8",
  );

  assert.match(workflow, /RESUME_BUCKET: \$\{\{ vars\.RESUME_BUCKET \}\}/);
  assert.match(workflow, /printf 'AWS_REGION=%s\\n'/);
  assert.match(workflow, /printf 'RESUME_BUCKET=%s\\n'/);
  assert.match(compose, /env_file:\s*\n\s*- \.auth\.env/);
  assert.doesNotMatch(workflow, /AWS_ACCESS_KEY_ID/);
  assert.doesNotMatch(workflow, /AWS_SECRET_ACCESS_KEY/);
});

test("keeps the database upload fallback aligned with the five-megabyte limit", () => {
  const nginx = fs.readFileSync(frontendNginxPath, "utf8");

  assert.match(nginx, /client_max_body_size\s+6m;/);
  assert.match(nginx, /error_page\s+413\s+=\s+@resume_too_large;/);
  assert.match(
    nginx,
    /return 413 '\{"error":"Resume must be 5 MB or smaller"\}';/,
  );
});

test("propagates CloudFront HTTPS to secure production sessions", () => {
  const dockerfile = fs.readFileSync(frontendDockerfilePath, "utf8");
  const nginx = fs.readFileSync(frontendNginxPath, "utf8");

  assert.match(dockerfile, /ARG VITE_INSECURE_HTTP_DEPLOYMENT=false/);
  assert.match(nginx, /\$http_cloudfront_forwarded_proto/);
  assert.match(
    nginx,
    /proxy_set_header X-Forwarded-Proto \$upstream_forwarded_proto/,
  );
});

test("opens SSH only for the active GitHub runner and always removes it", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const allowStep = workflow.indexOf("- name: Allow this runner to reach SSH");
  const deployStep = workflow.indexOf("- name: Deploy immutable images");
  const cleanupStep = workflow.indexOf("- name: Remove this runner's SSH access");

  assert.match(workflow, /id-token: write/);
  assert.match(
    workflow,
    /aws-actions\/configure-aws-credentials@e6de054238d6b7531b4efff3b6587d9aade6a06c/,
  );
  assert.match(workflow, /IpRanges=\[\{CidrIp=\$runner_cidr\}\]/);
  assert.match(workflow, /if: always\(\) && steps\.allow_ssh\.outputs\.runner_cidr != ''/);
  assert.match(workflow, /IpRanges=\[\{CidrIp=\$RUNNER_CIDR\}\]/);
  assert.match(workflow, /ConnectTimeout=15/);
  assert.ok(allowStep < deployStep, "runner SSH access must precede deployment");
  assert.ok(deployStep < cleanupStep, "runner SSH access must be removed after deployment");
});
