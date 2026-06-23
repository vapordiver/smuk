variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-central-1"
}

variable "bucket_name" {
  description = "S3 bucket name"
  type        = string
  default     = "smuk-app-s3-storage"
}

variable "iam_user_name" {
  description = "Name of the django worker"
  type        = string
  default     = "django_worker"
}
