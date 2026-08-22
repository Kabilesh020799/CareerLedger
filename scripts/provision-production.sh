#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
aws_region="${AWS_REGION:-us-east-1}"
aws_account_id="$(aws sts get-caller-identity --query Account --output text)"
state_bucket="${TF_STATE_BUCKET:-jat-terraform-state-${aws_account_id}}"
resume_bucket="${RESUME_BUCKET:-jat-resumes-${aws_account_id}}"
name_prefix="${NAME_PREFIX:-job-application-tracker}"
github_subject="${GITHUB_OIDC_SUBJECT:-repo:Kabilesh020799/CareerLedger:environment:production}"
git_ref="${GIT_REF:-$(git -C "$repo_root" rev-parse HEAD)}"
bootstrap_dir="$repo_root/infrastructure/bootstrap"
stack_dir="$repo_root/infrastructure/standalone"
plan_file="$stack_dir/standalone.tfplan"

for command in terraform aws gh jq curl git; do
  command -v "$command" >/dev/null 2>&1 || { echo "$command is required." >&2; exit 2; }
done

terraform_version="$(terraform version -json | jq -r .terraform_version)"
if ! jq -en --arg version "$terraform_version" '
  ($version | split(".") | map(tonumber)) as $parts |
  ($parts[0] > 1) or ($parts[0] == 1 and $parts[1] >= 10)
' >/dev/null; then
  echo "Terraform 1.10 or newer is required; found $terraform_version." >&2
  exit 2
fi

if ! git -C "$repo_root" merge-base --is-ancestor "$git_ref" origin/master; then
  echo "GIT_REF must already be pushed to origin/master before provisioning." >&2
  exit 2
fi

echo "AWS account: $aws_account_id"
echo "Region: $aws_region"
echo "State bucket: $state_bucket"
echo "Resume bucket: $resume_bucket"
echo "Git revision: $git_ref"

terraform -chdir="$bootstrap_dir" init
terraform -chdir="$bootstrap_dir" plan \
  -var="aws_region=$aws_region" \
  -var="state_bucket_name=$state_bucket" \
  -out=bootstrap.tfplan

read -r -p "Apply the reviewed state-bucket plan? [y/N] " answer
[[ "$answer" =~ ^[Yy]$ ]] || exit 1
terraform -chdir="$bootstrap_dir" apply bootstrap.tfplan

cat > "$stack_dir/backend.hcl" <<EOF
bucket       = "$state_bucket"
key          = "job-application-tracker/standalone/terraform.tfstate"
region       = "$aws_region"
encrypt      = true
use_lockfile = true
EOF

cat > "$stack_dir/terraform.tfvars" <<EOF
aws_region          = "$aws_region"
name_prefix         = "$name_prefix"
resume_bucket_name  = "$resume_bucket"
instance_type       = "${INSTANCE_TYPE:-t3.small}"
root_volume_size    = ${ROOT_VOLUME_SIZE:-20}
github_oidc_subject = "$github_subject"
EOF

terraform -chdir="$stack_dir" init -reconfigure -backend-config=backend.hcl

oidc_arn="arn:aws:iam::${aws_account_id}:oidc-provider/token.actions.githubusercontent.com"
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$oidc_arn" >/dev/null 2>&1; then
  if ! terraform -chdir="$stack_dir" state show aws_iam_openid_connect_provider.github >/dev/null 2>&1; then
    terraform -chdir="$stack_dir" import aws_iam_openid_connect_provider.github "$oidc_arn"
  fi
fi

terraform -chdir="$stack_dir" plan -out=standalone.tfplan
terraform -chdir="$stack_dir" show "$plan_file"
read -r -p "Apply this production infrastructure plan? [y/N] " answer
[[ "$answer" =~ ^[Yy]$ ]] || exit 1
terraform -chdir="$stack_dir" apply standalone.tfplan

application_url="$(terraform -chdir="$stack_dir" output -raw application_url)"
instance_id="$(terraform -chdir="$stack_dir" output -raw instance_id)"
deploy_role_arn="$(terraform -chdir="$stack_dir" output -raw aws_deploy_role_arn)"
parameter_prefix="$(terraform -chdir="$stack_dir" output -raw deployment_parameter_prefix)"

gh variable set DEPLOY_METHOD --env production --body ssm
gh variable set DEPLOY_INSTANCE_ID --env production --body "$instance_id"
gh variable set DEPLOY_PARAMETER_PREFIX --env production --body "$parameter_prefix"
gh variable set AWS_DEPLOY_ROLE_ARN --env production --body "$deploy_role_arn"
gh variable set AWS_REGION --env production --body "$aws_region"
gh variable set PRODUCTION_URL --env production --body "$application_url"
gh variable set RESUME_BUCKET --env production --body "$resume_bucket"

echo "Waiting for EC2 cloud-init and Systems Manager..."
for _ in $(seq 1 60); do
  ready="$(aws ssm describe-instance-information \
    --region "$aws_region" \
    --filters "Key=InstanceIds,Values=$instance_id" \
    --query 'InstanceInformationList[0].PingStatus' \
    --output text 2>/dev/null || true)"
  [ "$ready" = "Online" ] && break
  sleep 10
done
[ "${ready:-}" = "Online" ] || { echo "The instance did not become available in SSM." >&2; exit 1; }

bootstrap_command="curl -fsSL https://raw.githubusercontent.com/Kabilesh020799/CareerLedger/${git_ref}/scripts/bootstrap-instance.sh -o /tmp/bootstrap-instance.sh && chmod 700 /tmp/bootstrap-instance.sh && /tmp/bootstrap-instance.sh '${application_url}' '${resume_bucket}' '${aws_region}' '${git_ref}'"
parameters_file="$(mktemp)"
trap 'rm -f "$parameters_file"' EXIT
jq -n --arg command "$bootstrap_command" '{commands: [$command]}' > "$parameters_file"

command_id="$(aws ssm send-command \
  --region "$aws_region" \
  --instance-ids "$instance_id" \
  --document-name AWS-RunShellScript \
  --parameters "file://$parameters_file" \
  --query 'Command.CommandId' \
  --output text)"

aws ssm wait command-executed --region "$aws_region" --command-id "$command_id" --instance-id "$instance_id"
status="$(aws ssm get-command-invocation --region "$aws_region" --command-id "$command_id" --instance-id "$instance_id" --query Status --output text)"
if [ "$status" != "Success" ]; then
  aws ssm get-command-invocation --region "$aws_region" --command-id "$command_id" --instance-id "$instance_id" --query StandardErrorContent --output text >&2
  exit 1
fi

for _ in $(seq 1 30); do
  if curl --fail --silent --show-error "$application_url/api/health" | grep -q '"status":"ok"'; then
    echo "Production is healthy at $application_url"
    exit 0
  fi
  sleep 10
done

echo "Infrastructure and containers started, but the public health check did not become ready." >&2
exit 1
