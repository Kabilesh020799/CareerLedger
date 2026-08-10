variable "aws_region" {
  description = "AWS region for the complete standalone stack."
  type        = string
  default     = "us-east-1"
}

variable "name_prefix" {
  description = "Unique prefix applied to standalone AWS resources."
  type        = string
  default     = "job-application-tracker"
}

variable "resume_bucket_name" {
  description = "Globally unique private S3 bucket for resume attachments."
  type        = string
}

variable "instance_type" {
  description = "EC2 size used to build and run the application."
  type        = string
  default     = "t3.small"
}

variable "root_volume_size" {
  description = "Encrypted root volume size in GiB."
  type        = number
  default     = 20
}

variable "github_oidc_subject" {
  description = "Exact GitHub OIDC subject allowed to deploy through the production environment."
  type        = string
}
