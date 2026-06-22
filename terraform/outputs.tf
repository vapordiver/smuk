output "AWS_BUCKET_NAME" {
  description = "Bucket name"
  value       = aws_s3_bucket.media_bucket.bucket
}

output "AWS_ACCESS_KEY_ID" {
  description = "Django worker access key ID"
  value       = aws_iam_user.django_user_key.id
}

output "AWS_SECRET_ACCESS_KEY" {
  description = "Django worker secret access key"
  value       = aws_iam_user.django_user_key.secret
  sensitive   = true
}
