variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "db_username" {
  type    = string
  default = "admin"
}

variable "db_password" {
  type      = string
  sensitive = true
}
