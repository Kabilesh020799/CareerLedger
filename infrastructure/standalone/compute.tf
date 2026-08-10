resource "aws_instance" "application" {
  ami                    = data.aws_ssm_parameter.amazon_linux_2023.value
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.application.id]
  iam_instance_profile   = aws_iam_instance_profile.application.name
  user_data              = file("${path.module}/cloud-init.sh")

  metadata_options {
    http_endpoint               = "enabled"
    http_put_response_hop_limit = 2
    http_tokens                 = "required"
  }

  root_block_device {
    encrypted   = true
    volume_size = var.root_volume_size
    volume_type = "gp3"
  }

  lifecycle {
    prevent_destroy = true
  }
  tags = { Name = "${var.name_prefix}-application" }
}

resource "aws_eip" "application" {
  domain   = "vpc"
  instance = aws_instance.application.id
  lifecycle {
    prevent_destroy = true
  }
  tags = { Name = "${var.name_prefix}-application" }
}
