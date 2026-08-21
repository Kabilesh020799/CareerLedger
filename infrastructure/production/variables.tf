variable "aws_region" {
  description = "AWS region containing the production application."
  type        = string
  default     = "us-east-1"
}

variable "vpc_id" {
  description = "VPC containing the existing EC2 instance."
  type        = string
}

variable "subnet_id" {
  description = "Public subnet containing the existing EC2 instance."
  type        = string
}

variable "ami_id" {
  description = "AMI currently used by the existing EC2 instance. Match it before import to avoid replacement."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type currently in use."
  type        = string
  default     = "t3.medium"
}

variable "key_name" {
  description = "Name of the existing EC2 key pair. The private key is never managed by Terraform."
  type        = string
}

variable "root_volume_size" {
  description = "Existing EC2 root EBS volume size in GiB."
  type        = number
  default     = 8
}

variable "root_volume_type" {
  description = "Existing EC2 root EBS volume type."
  type        = string
  default     = "gp3"
}

variable "root_volume_encrypted" {
  description = "Whether the existing EC2 root EBS volume is encrypted. Changing this requires instance replacement."
  type        = bool
  default     = false
}

variable "resume_bucket_name" {
  description = "Private S3 bucket used for resume attachments."
  type        = string
  default     = "jatbucket2799"
}

variable "cloudfront_origin_domain" {
  description = "Existing EC2 public DNS hostname used as the CloudFront HTTP origin."
  type        = string
}

variable "cloudfront_origin_id" {
  description = "Stable identifier currently assigned to the CloudFront EC2 origin."
  type        = string
  default     = "ec2-54-204-226-12.compute-1.amazonaws.com-msmfz3jb4wc"
}

variable "cloudfront_origin_prefix_list_id" {
  description = "AWS-managed CloudFront origin-facing prefix list ID for the region."
  type        = string
  default     = "pl-3b927c52"
}

variable "github_oidc_subject" {
  description = "Exact GitHub OIDC subject currently trusted by the production deployment role."
  type        = string
  default     = "repo:Kabilesh020799@47252881/CareerLedger@1326925254:environment:production"
}
