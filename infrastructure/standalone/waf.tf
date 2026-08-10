resource "aws_wafv2_web_acl" "application" {
  name  = "${var.name_prefix}-protection"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  dynamic "rule" {
    for_each = {
      AWSManagedRulesAmazonIpReputationList = 0
      AWSManagedRulesCommonRuleSet          = 1
      AWSManagedRulesKnownBadInputsRuleSet  = 2
    }
    content {
      name     = "AWS-${rule.key}"
      priority = rule.value
      override_action {
        none {}
      }
      statement {
        managed_rule_group_statement {
          name        = rule.key
          vendor_name = "AWS"
        }
      }
      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "AWS-${rule.key}"
        sampled_requests_enabled   = true
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.name_prefix}-protection"
    sampled_requests_enabled   = true
  }

  lifecycle {
    prevent_destroy = true
  }
}
