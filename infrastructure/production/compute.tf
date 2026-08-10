resource "aws_instance" "application" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = var.key_name
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.application.id]
  iam_instance_profile   = aws_iam_instance_profile.application.name

  metadata_options {
    http_endpoint               = "enabled"
    http_protocol_ipv6          = "disabled"
    http_put_response_hop_limit = 2
    http_tokens                 = "required"
    instance_metadata_tags      = "disabled"
  }

  root_block_device {
    encrypted   = var.root_volume_encrypted
    volume_size = var.root_volume_size
    volume_type = var.root_volume_type
  }

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = "job-application-tracker-production"
  }
}

resource "aws_eip" "application" {
  domain   = "vpc"
  instance = aws_instance.application.id

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = "job-application-tracker-production"
  }
}
