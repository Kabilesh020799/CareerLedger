output "application_url" { value = "https://${aws_cloudfront_distribution.application.domain_name}" }
output "instance_id" { value = aws_instance.application.id }
output "resume_bucket" { value = aws_s3_bucket.resumes.id }
output "elastic_ip" { value = aws_eip.application.public_ip }
output "aws_deploy_role_arn" { value = aws_iam_role.github_deploy.arn }
output "deployment_parameter_prefix" { value = "/${var.name_prefix}/deploy" }
