# Production infrastructure

Terraform describes the existing AWS production infrastructure. It manages infrastructure only; GitHub Actions continues to build and deploy Docker images and Docker Compose continues to own PostgreSQL and Redis containers and volumes.

For a new self-contained environment, the `standalone/` stack and `scripts/provision-production.sh` provide the supported one-command path. The command creates remote state, networking, EC2, S3, CloudFront, WAF, IAM, and SSM deployment access; bootstraps Docker; starts every Compose service; configures GitHub environment variables; and waits for HTTPS health. It creates billable AWS resources and asks for confirmation before each saved plan.

```bash
./scripts/provision-production.sh
```

## Safety model

- Production EC2, Elastic IP, CloudFront, S3, and IAM resources use `prevent_destroy` where losing them would interrupt service or data access.
- No private keys, OAuth credentials, GitHub secrets, database credentials, or Terraform state belong in Git.
- Do not run `terraform apply` until every existing resource has been imported and `terraform plan` proposes no replacement or deletion.
- Back up the PostgreSQL volume before infrastructure or schema maintenance. Terraform does not back up container data.

## Prerequisites

- Terraform 1.10 or newer (S3 lockfile support)
- AWS CLI authenticated to account `654654198046` with permission to inspect and import these resources
- A globally unique S3 bucket name for Terraform state

## 1. Bootstrap remote state once

```bash
cd infrastructure/bootstrap
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan -out=bootstrap.tfplan
terraform apply bootstrap.tfplan
```

The state bucket has encryption, versioning, public-access blocking, and deletion protection. Keep the small bootstrap state secure; do not commit it.

## 2. Discover the existing EC2 identifiers

The application currently has known CloudFront, S3, IAM, and AWS account identifiers in `imports.tf.example`. Discover the instance-specific values without printing secrets:

```bash
aws ec2 describe-instances \
  --filters "Name=ip-address,Values=54.204.226.12" \
  --query 'Reservations[0].Instances[0].{InstanceId:InstanceId,VpcId:VpcId,SubnetId:SubnetId,ImageId:ImageId,InstanceType:InstanceType,KeyName:KeyName,PublicDnsName:PublicDnsName,SecurityGroups:SecurityGroups,RootDeviceName:RootDeviceName}'

aws ec2 describe-addresses \
  --filters "Name=public-ip,Values=54.204.226.12" \
  --query 'Addresses[0].{AllocationId:AllocationId,InstanceId:InstanceId}'

aws ec2 describe-volumes \
  --filters "Name=attachment.instance-id,Values=INSTANCE_ID" \
  --query 'Volumes[].{VolumeId:VolumeId,Size:Size,Type:VolumeType,Encrypted:Encrypted}'
```

If the public IP changes, use the current Elastic IP. Compare the CloudFront origin in AWS with `cloudfront_origin_domain`; it must be the EC2 public DNS name, not the CloudFront hostname.

## 3. Prepare production inputs and imports

```bash
cd infrastructure/production
cp backend.hcl.example backend.hcl
cp terraform.tfvars.example terraform.tfvars
```

Set the state bucket in `backend.hcl`. The checked-in examples contain non-secret resource identifiers discovered on 2026-08-10; confirm them against AWS before use and replace any value that has changed.

Initialize without putting AWS credentials in backend files:

```bash
terraform init -backend-config=backend.hcl
terraform fmt -check -recursive ..
terraform validate
terraform plan -out=adoption.tfplan
terraform show adoption.tfplan
```

The adoption plan should contain imports and only intentional in-place normalization. It must show no destroy and no replacement. Adjust configuration to match AWS until that is true. Have a second person review the plan when possible, then apply the saved plan to record the imports:

```bash
terraform apply adoption.tfplan
terraform plan
```

The final plan should report no changes. Import blocks are idempotent and may remain as adoption history.

## Import identifiers

| Resource | Import ID |
| --- | --- |
| EC2 instance | Instance ID, such as `i-...` |
| Elastic IP | Allocation ID, such as `eipalloc-...` |
| Security group | Group ID, such as `sg-...` |
| S3 bucket subresources | Bucket name |
| IAM role or instance profile | Name |
| IAM inline role policy | `role-name:policy-name` |
| GitHub OIDC provider | Full provider ARN |
| CloudFront distribution | Distribution ID (`EI1Q2B9SNAQJH`) |

The CloudFront-origin ingress and all-egress security-group rules have explicit import IDs. GitHub Actions still creates and removes temporary `/32` SSH rules outside Terraform; do not add permanent SSH ingress. The inventory found an unmanaged SSH rule for `192.168.4.239/32`; verify whether it is still required and revoke it separately if it is stale. Terraform intentionally does not adopt it.

The resume bucket did not have the documented `resumes/pending/` lifecycle rule when inventoried. The first reviewed apply will propose creating that rule so abandoned pending uploads expire after one day. CloudFront currently has an AWS WAF web ACL; its ARN is included in the configuration so import cannot silently detach it.

## GitHub environment outputs

After adoption, `terraform output` provides `PRODUCTION_URL`, `DEPLOY_HOST`, `DEPLOY_SECURITY_GROUP_ID`, `AWS_DEPLOY_ROLE_ARN`, and `RESUME_BUCKET` values. Continue storing the SSH host, user, private key, known hosts, and Gmail OAuth values in the protected GitHub `production` environment; Terraform intentionally does not manage those secrets.

## Routine workflow

```bash
terraform fmt -check -recursive ..
terraform validate
terraform plan -out=production.tfplan
terraform show production.tfplan
terraform apply production.tfplan
```

Always apply the exact reviewed saved plan. Never use `-auto-approve` for production.
