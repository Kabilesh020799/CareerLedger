# Existing production resource identifiers inventoried on 2026-08-10.
# Import blocks are idempotent and remain as adoption history. Confirm these
# IDs against AWS before the first apply.

import {
  to = aws_instance.application
  id = "i-02ccf1e8e494fa6a9"
}

import {
  to = aws_eip.application
  id = "eipalloc-0d9029449e92e84a4"
}

import {
  to = aws_security_group.application
  id = "sg-08748225d519d8a11"
}

import {
  to = aws_vpc_security_group_ingress_rule.cloudfront_http
  id = "sgr-0a3f885ad4d33a762"
}

import {
  to = aws_vpc_security_group_egress_rule.all
  id = "sgr-05626a8820d97c612"
}

import {
  to = aws_s3_bucket.resumes
  id = "jatbucket2799"
}

import {
  to = aws_s3_bucket_public_access_block.resumes
  id = "jatbucket2799"
}

import {
  to = aws_s3_bucket_ownership_controls.resumes
  id = "jatbucket2799"
}

import {
  to = aws_s3_bucket_server_side_encryption_configuration.resumes
  id = "jatbucket2799"
}

import {
  to = aws_s3_bucket_cors_configuration.resumes
  id = "jatbucket2799"
}

import {
  to = aws_iam_role.resume_storage
  id = "JobTrackerResumeStorageRole"
}

import {
  to = aws_iam_role_policy.resume_storage
  id = "JobTrackerResumeStorageRole:JobTrackerResumeStorageRolePolicy"
}

import {
  to = aws_iam_instance_profile.application
  id = "JobTrackerResumeStorageRole"
}

import {
  to = aws_cloudfront_distribution.application
  id = "EI1Q2B9SNAQJH"
}

import {
  to = aws_wafv2_web_acl.application
  id = "440b7dc1-a975-452f-b54d-dfba7914e3d8/CreatedByCloudFront-64f9f64d/CLOUDFRONT"
}

import {
  to = aws_iam_openid_connect_provider.github
  id = "arn:aws:iam::654654198046:oidc-provider/token.actions.githubusercontent.com"
}

import {
  to = aws_iam_role.github_deploy
  id = "JobApplicationTrackerGitHubDeploy"
}

import {
  to = aws_iam_role_policy.github_deploy
  id = "JobApplicationTrackerGitHubDeploy:ManageEphemeralDeploymentSsh"
}
