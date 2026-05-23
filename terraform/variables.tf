variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "instance_type" {
  type    = string
  default = "t3.medium"
}

variable "key_name" {
  type        = string
  description = "EC2 key pair name (SMS-Production-Server)"
  default     = "SMS-Production-Server"
}

variable "db_password" {
  type      = string
  sensitive = true
}
