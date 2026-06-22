# s3 bucket
resource "aws_s3_bucket" "media_bucket" {
    bucket = var.bucket_name
}
# public access block for media bucket(files accessed only with pre-signed urls)
resource "aws_s3_bucket_public_access_block" "media_bucket_public_access" {
    bucket = aws_s3_bucket.media_bucket.id
    block_public_acls       = true
    block_public_policy     = true
    ignore_public_acls      = true
    restrict_public_buckets = true
}

# technical user for django
resource "aws_iam_user" "django_user" {
    name = var.iam_user_name
}

# credentials for technical user
resource "aws_iam_user_access_key" "django_user_key" {
    user = aws_iam_user.django_user.name
}

