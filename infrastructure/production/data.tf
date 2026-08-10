data "aws_caller_identity" "current" {}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_and_cloudfront_headers" {
  name = "Managed-AllViewerAndCloudFrontHeaders-2022-06"
}
