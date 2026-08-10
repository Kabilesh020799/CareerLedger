resource "aws_vpc" "application" {
  cidr_block           = "10.42.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "${var.name_prefix}-vpc" }
}

resource "aws_internet_gateway" "application" {
  vpc_id = aws_vpc.application.id
  tags   = { Name = "${var.name_prefix}-igw" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.application.id
  cidr_block              = "10.42.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.name_prefix}-public" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.application.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.application.id
  }

  tags = { Name = "${var.name_prefix}-public" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "application" {
  name        = "${var.name_prefix}-application"
  description = "CloudFront origin traffic only; administration uses SSM"
  vpc_id      = aws_vpc.application.id

  tags = { Name = "${var.name_prefix}-application" }
}

resource "aws_vpc_security_group_ingress_rule" "cloudfront_http" {
  security_group_id = aws_security_group.application.id
  description       = "HTTP from CloudFront origin-facing network"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
}

data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.application.id
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}
