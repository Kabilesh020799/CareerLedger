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
const provisionScriptPath = path.join(__dirname, "provision-production.sh");
const standaloneDirectory = path.join(__dirname, "..", "infrastructure", "standalone");

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

test("runs dependency-free release checks without a root npm cache", () => {
  const verifyWorkflow = fs.readFileSync(verifyWorkflowPath, "utf8");
  const releaseBlock = verifyWorkflow.slice(
    verifyWorkflow.indexOf("  release:"),
    verifyWorkflow.indexOf("  backend:"),
  );

  assert.match(releaseBlock, /node-version: 22/);
  assert.doesNotMatch(releaseBlock, /cache: npm/);
  assert.doesNotMatch(releaseBlock, /npm ci/);
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
    verifyWorkflow.indexOf("  backend:"),
    verifyWorkflow.indexOf("  frontend:"),
  );

  assert.match(
    backendStep,
    /DATABASE_URL: postgresql:\/\/jobtracker:jobtracker_dev@127\.0\.0\.1:5432\/jobtracker_test/,
  );
});

test("runs critical Playwright workflows with failure artifacts", () => {
  const verifyWorkflow = fs.readFileSync(verifyWorkflowPath, "utf8");

  assert.match(verifyWorkflow, /image: postgres:16-alpine/);
  assert.match(verifyWorkflow, /image: redis:7-alpine/);
  assert.match(verifyWorkflow, /image: mcr\.microsoft\.com\/playwright:v1\.62\.1-noble/);
  assert.match(verifyWorkflow, /shard: \[1, 2\]/);
  assert.match(verifyWorkflow, /DATABASE_URL: postgresql:\/\/jobtracker:jobtracker_dev@postgres:5432\/jobtracker_test/);
  assert.match(verifyWorkflow, /REDIS_URL: redis:\/\/redis:6379/);
  assert.doesNotMatch(verifyWorkflow, /npx playwright install/);
  assert.match(verifyWorkflow, /npm run test:e2e -- --shard=\$\{\{ matrix\.shard \}\}\/2/);
  assert.match(verifyWorkflow, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
  assert.match(verifyWorkflow, /playwright-report-\$\{\{ matrix\.shard \}\}/);
  assert.match(verifyWorkflow, /frontend\/test-results/);
});

test("runs frontend and browser verification as independent parallel jobs", () => {
  const verifyWorkflow = fs.readFileSync(verifyWorkflowPath, "utf8");
  const frontendBlock = verifyWorkflow.slice(
    verifyWorkflow.indexOf("  frontend:"),
    verifyWorkflow.indexOf("  browser:"),
  );
  const browserBlock = verifyWorkflow.slice(
    verifyWorkflow.indexOf("  browser:"),
    verifyWorkflow.indexOf("  deployment:"),
  );

  assert.doesNotMatch(frontendBlock, /^    needs:/m);
  assert.doesNotMatch(browserBlock, /^    needs:/m);
  assert.match(frontendBlock, /npm test/);
  assert.match(browserBlock, /npm run test:e2e/);
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

test("removes production observability packages and services", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const compose = fs.readFileSync(productionComposePath, "utf8");

  assert.doesNotMatch(compose, /prometheus:|grafana:|postgres-exporter:|redis-exporter:|nginx-exporter:|cadvisor:|node-exporter:/);
  assert.doesNotMatch(compose, /LOG_LEVEL|LOG_FORMAT|METRICS_ENABLED|WORKER_METRICS_PORT/);
  assert.doesNotMatch(workflow, /deploy\/monitoring/);
});

test("configures private S3 application-document storage without static AWS keys", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const compose = fs.readFileSync(
    path.join(__dirname, "..", "deploy", "compose.production.yml"),
    "utf8",
  );
  const productionIam = fs.readFileSync(
    path.join(__dirname, "..", "infrastructure", "production", "iam.tf"),
    "utf8",
  );
  const productionStorage = fs.readFileSync(
    path.join(__dirname, "..", "infrastructure", "production", "storage.tf"),
    "utf8",
  );
  const standaloneIam = fs.readFileSync(
    path.join(__dirname, "..", "infrastructure", "standalone", "iam.tf"),
    "utf8",
  );
  const standaloneStorage = fs.readFileSync(
    path.join(__dirname, "..", "infrastructure", "standalone", "storage.tf"),
    "utf8",
  );

  assert.match(workflow, /RESUME_BUCKET: \$\{\{ vars\.RESUME_BUCKET \}\}/);
  assert.match(workflow, /printf 'AWS_REGION=%s\\n'/);
  assert.match(workflow, /printf 'RESUME_BUCKET=%s\\n'/);
  assert.match(compose, /env_file:\s*\n\s*- \.auth\.env/);
  for (const iam of [productionIam, standaloneIam]) {
    assert.match(iam, /\/resumes\/\*/);
  }
  for (const storage of [productionStorage, standaloneStorage]) {
    assert.match(storage, /prefix = "resumes\/pending\/"/);
    assert.match(storage, /prefix = "resumes\/cover-letters\/pending\/"/);
  }
  assert.doesNotMatch(workflow, /AWS_ACCESS_KEY_ID/);
  assert.doesNotMatch(workflow, /AWS_SECRET_ACCESS_KEY/);
});

test("deploys optional Gmail LLM fallback configuration without requiring it", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  const compose = fs.readFileSync(productionComposePath, "utf8");

  assert.match(workflow, /OPENAI_API_KEY: \$\{\{ secrets\.OPENAI_API_KEY \}\}/);
  assert.match(workflow, /OPENAI_ALLOWED_ACCOUNT_EMAILS: \$\{\{ vars\.OPENAI_ALLOWED_ACCOUNT_EMAILS \}\}/);
  assert.match(workflow, /printf 'OPENAI_ALLOWED_ACCOUNT_EMAILS=%s\\n'/);
  assert.match(workflow, /OPENAI_GMAIL_MODEL: \$\{\{ vars\.OPENAI_GMAIL_MODEL \}\}/);
  assert.match(workflow, /OPENAI_GMAIL_CONFIDENCE_THRESHOLD: \$\{\{ vars\.OPENAI_GMAIL_CONFIDENCE_THRESHOLD \}\}/);
  assert.match(workflow, /OPENAI_GMAIL_TIMEOUT_MS: \$\{\{ vars\.OPENAI_GMAIL_TIMEOUT_MS \}\}/);
  assert.match(workflow, /OPENAI_GMAIL_MODEL:-gpt-5-nano/);
  assert.match(compose, /env_file:\s*\n\s*- \.auth\.env/);
});

test("deploys an optional administrator account allowlist", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  assert.match(workflow, /ADMIN_ACCOUNT_EMAILS: \$\{\{ vars\.ADMIN_ACCOUNT_EMAILS \}\}/);
  assert.match(workflow, /printf 'ADMIN_ACCOUNT_EMAILS=%s\\n'/);
});

test("keeps production demo credentials in protected environment settings", () => {
  const workflow = fs.readFileSync(workflowPath, "utf8");
  assert.match(workflow, /DEMO_USER_PASSWORD: \$\{\{ secrets\.DEMO_USER_PASSWORD \}\}/);
  assert.match(workflow, /DEMO_USER_2_PASSWORD: \$\{\{ secrets\.DEMO_USER_2_PASSWORD \}\}/);
  assert.match(workflow, /DEMO_USER_USERNAME: \$\{\{ vars\.DEMO_USER_USERNAME \}\}/);
  assert.match(workflow, /printf 'DEMO_USER_PASSWORD=%s\\n'/);
  assert.equal(
    (workflow.match(/\*\[!A-Za-z0-9\._\\ -\]\*/g) ?? []).length,
    2,
    "demo display-name validation must escape spaces in both deployment paths",
  );
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

test("deploys through SSM while retaining temporary SSH fallback cleanup", () => {
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
  assert.match(workflow, /vars\.DEPLOY_METHOD == 'ssm'/);
  assert.match(workflow, /id: ssh_install\s+continue-on-error: true/);
  assert.match(
    workflow,
    /vars\.DEPLOY_METHOD == 'ssm' \|\| steps\.ssh_install\.outcome == 'failure'/,
  );
  assert.match(workflow, /aws ssm put-parameter/);
  assert.match(workflow, /aws ssm send-command/);
  assert.match(workflow, /aws ssm delete-parameters/);
  assert.match(workflow, /if: always\(\) && vars\.DEPLOY_METHOD != 'ssm' && steps\.allow_ssh\.outputs\.runner_cidr != ''/);
  assert.match(workflow, /IpRanges=\[\{CidrIp=\$RUNNER_CIDR\}\]/);
  assert.match(workflow, /ConnectTimeout=15/);
  assert.ok(allowStep < deployStep, "runner SSH access must precede deployment");
  assert.ok(deployStep < cleanupStep, "runner SSH access must be removed after deployment");
});

test("provisions a complete reviewed stack without SSH", () => {
  const provision = fs.readFileSync(provisionScriptPath, "utf8");
  const network = fs.readFileSync(path.join(standaloneDirectory, "network.tf"), "utf8");
  const iam = fs.readFileSync(path.join(standaloneDirectory, "iam.tf"), "utf8");
  const cloudInit = fs.readFileSync(path.join(standaloneDirectory, "cloud-init.sh"), "utf8");

  assert.match(provision, /plan -out=standalone\.tfplan/);
  assert.match(provision, /Apply this production infrastructure plan\?/);
  assert.doesNotMatch(provision, /-auto-approve/);
  assert.match(provision, /aws ssm send-command/);
  assert.match(provision, /api\/health/);
  assert.doesNotMatch(network, /from_port\s*=\s*22/);
  assert.match(iam, /AmazonSSMManagedInstanceCore/);
  assert.match(cloudInit, /systemctl enable --now docker/);
  assert.match(cloudInit, /sha256sum --check/);
});
