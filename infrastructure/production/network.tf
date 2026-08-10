resource "aws_security_group" "application" {
  name        = "launch-wizard-2"
  description = "launch-wizard-2 created 2026-08-07T16:30:44.749Z"
  vpc_id      = var.vpc_id

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_vpc_security_group_ingress_rule" "cloudfront_http" {
  security_group_id = aws_security_group.application.id
  description       = "CloudFront origin access"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  prefix_list_id    = var.cloudfront_origin_prefix_list_id
}

resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.application.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}
