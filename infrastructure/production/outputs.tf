output "production_url" {
  description = "Set as the GitHub production environment PRODUCTION_URL variable."
  value       = "https://${aws_cloudfront_distribution.application.domain_name}"
}

output "deploy_host" {
  description = "Set as the GitHub production environment DEPLOY_HOST secret."
  value       = aws_eip.application.public_ip
}

output "deploy_security_group_id" {
  description = "Set as the GitHub production environment DEPLOY_SECURITY_GROUP_ID variable."
  value       = aws_security_group.application.id
}

output "aws_deploy_role_arn" {
  description = "Set as the GitHub production environment AWS_DEPLOY_ROLE_ARN variable."
  value       = aws_iam_role.github_deploy.arn
}

output "resume_bucket" {
  description = "Set as the GitHub production environment RESUME_BUCKET variable."
  value       = aws_s3_bucket.resumes.id
}
