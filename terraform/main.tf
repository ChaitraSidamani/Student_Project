terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ─── USE THE DEFAULT VPC — no custom VPC created ─────────────────────────────

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ─── SECURITY GROUP ──────────────────────────────────────────────────────────

resource "aws_security_group" "erp" {
  name   = "college-erp-sg"
  vpc_id = data.aws_vpc.default.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 8082
    to_port     = 8082
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "college-erp-sg" }
}

# ─── IAM ROLE FOR EC2 (SSM + S3) ─────────────────────────────────────────────

resource "aws_iam_role" "ec2_role" {
  name = "college-erp-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  lifecycle {
    ignore_changes = [assume_role_policy]
  }
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "s3" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "college-erp-ec2-profile"
  role = aws_iam_role.ec2_role.name
  lifecycle {
    ignore_changes = [role]
  }
}

# ─── EC2 INSTANCE ────────────────────────────────────────────────────────────

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "erp" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = tolist(data.aws_subnets.default.ids)[0]
  vpc_security_group_ids      = [aws_security_group.erp.id]
  key_name                    = var.key_name
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name
  associate_public_ip_address = true

  root_block_device {
    volume_size = 20
    volume_type = "gp2"
  }

  user_data = <<-SHELL
    #!/bin/bash
    set -e
    export DEBIAN_FRONTEND=noninteractive

    apt-get update -y && apt-get upgrade -y

    # SSM Agent
    systemctl enable amazon-ssm-agent
    systemctl start amazon-ssm-agent

    # MySQL 8
    apt-get install -y mysql-server
    systemctl enable mysql
    systemctl start mysql
    mysql -u root <<SQL
      ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${var.db_password}';
      CREATE DATABASE IF NOT EXISTS sms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
      FLUSH PRIVILEGES;
SQL

    # Java 21
    apt-get install -y wget apt-transport-https gnupg unzip curl
    wget -qO /tmp/temurin.asc https://packages.adoptium.net/artifactory/api/gpg/key/public
    gpg --dearmor < /tmp/temurin.asc > /usr/share/keyrings/adoptium.gpg
    echo "deb [signed-by=/usr/share/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb jammy main" \
      > /etc/apt/sources.list.d/adoptium.list
    apt-get update -y && apt-get install -y temurin-21-jdk

    # AWS CLI is pre-installed on Ubuntu 22.04 AMI — no install needed

    # Nginx
    apt-get install -y nginx
    systemctl enable nginx

    # Prometheus
    PROM_VERSION="2.51.2"
    wget -qO /tmp/prometheus.tar.gz \
      https://github.com/prometheus/prometheus/releases/download/v$${PROM_VERSION}/prometheus-$${PROM_VERSION}.linux-amd64.tar.gz
    tar -xzf /tmp/prometheus.tar.gz -C /tmp
    mv /tmp/prometheus-$${PROM_VERSION}.linux-amd64/prometheus /usr/local/bin/
    mv /tmp/prometheus-$${PROM_VERSION}.linux-amd64/promtool   /usr/local/bin/
    mkdir -p /etc/prometheus /var/lib/prometheus
    cat > /etc/prometheus/prometheus.yml <<PROM
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: sms-backend
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ['localhost:8082']
PROM
    useradd --no-create-home --shell /bin/false prometheus || true
    chown -R prometheus:prometheus /etc/prometheus /var/lib/prometheus
    cat > /etc/systemd/system/prometheus.service <<SVC
[Unit]
Description=Prometheus
After=network.target
[Service]
User=prometheus
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus
Restart=always
[Install]
WantedBy=multi-user.target
SVC
    systemctl daemon-reload
    systemctl enable prometheus
    systemctl start prometheus

    # Grafana
    wget -qO /usr/share/keyrings/grafana.key https://apt.grafana.com/gpg.key
    echo "deb [signed-by=/usr/share/keyrings/grafana.key] https://apt.grafana.com stable main" \
      > /etc/apt/sources.list.d/grafana.list
    apt-get update -y && apt-get install -y grafana
    sed -i 's/^;http_port = 3000/http_port = 3001/' /etc/grafana/grafana.ini
    systemctl enable grafana-server
    systemctl start grafana-server

    mkdir -p /home/ubuntu/frontend
    chown -R ubuntu:ubuntu /home/ubuntu
    echo "===== EC2 bootstrap complete =====" > /tmp/bootstrap_done.txt
  SHELL

  tags = { Name = "college-erp-server" }
}

# ─── S3 BUCKET ───────────────────────────────────────────────────────────────

resource "random_id" "suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "deploy" {
  bucket        = "college-erp-deploy-${random_id.suffix.hex}"
  force_destroy = true
  tags          = { Name = "college-erp-deploy" }
}

# ─── OUTPUTS ─────────────────────────────────────────────────────────────────

output "instance_public_ip" {
  value = aws_instance.erp.public_ip
}

output "instance_id" {
  value = aws_instance.erp.id
}

output "s3_bucket_name" {
  value = aws_s3_bucket.deploy.bucket
}
