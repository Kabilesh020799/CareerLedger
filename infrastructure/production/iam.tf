data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "resume_storage" {
  name               = "JobTrackerResumeStorageRole"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json

  lifecycle {
    prevent_destroy = true
  }
}

data "aws_iam_policy_document" "resume_storage" {
  statement {
    sid    = "ManagePrivateResumes"
    effect = "Allow"
    actions = [
      "s3:DeleteObject",
      "s3:GetObject",
      "s3:PutObject",
    ]
    resources = ["${aws_s3_bucket.resumes.arn}/resumes/*"]
  }
}

resource "aws_iam_role_policy" "resume_storage" {
  name   = "JobTrackerResumeStorageRolePolicy"
  role   = aws_iam_role.resume_storage.id
  policy = data.aws_iam_policy_document.resume_storage.json
}

resource "aws_iam_instance_profile" "application" {
  name = "JobTrackerResumeStorageRole"
  role = aws_iam_role.resume_storage.name

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["ab9d0263244dd0326eb67015705a667e79cfe998"]

  tags = {
    Application = "CareerLedger"
    ManagedBy   = "Codex"
  }

  lifecycle {
    prevent_destroy = true
  }
}

data "aws_iam_policy_document" "github_deploy_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [var.github_oidc_subject]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name               = "JobApplicationTrackerGitHubDeploy"
  description        = "Temporary GitHub Actions access for CareerLedger production deployment"
  assume_role_policy = data.aws_iam_policy_document.github_deploy_assume_role.json

  tags = {
    Application = "CareerLedger"
    ManagedBy   = "Codex"
  }

  lifecycle {
    prevent_destroy = true
  }
}

data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid    = "ManageOnlyDeploymentSecurityGroupIngress"
    effect = "Allow"
    actions = [
      "ec2:AuthorizeSecurityGroupIngress",
      "ec2:RevokeSecurityGroupIngress",
    ]
    resources = [
      "arn:aws:ec2:${var.aws_region}:${data.aws_caller_identity.current.account_id}:security-group/${aws_security_group.application.id}",
    ]
  }

}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "ManageEphemeralDeploymentSsh"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.github_deploy.json
}
