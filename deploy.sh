#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
export PATH=/usr/local/bin:/usr/bin:/bin:$PATH
export AWS_DEFAULT_REGION=us-east-1

echo "===== Starting full deployment ====="

# ── System update ─────────────────────────────────────────────────────────────
echo "=== Updating system ==="
apt-get update -y && apt-get upgrade -y
apt-get install -y wget curl unzip gnupg apt-transport-https

# ── AWS CLI ───────────────────────────────────────────────────────────────────
echo "=== Installing AWS CLI ==="
curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp
/tmp/aws/install --update
export PATH=/usr/local/bin:$PATH

# ── Download files from S3 ────────────────────────────────────────────────────
echo "=== Downloading files from S3 ==="
cd /home/ubuntu
aws s3 cp s3://${S3_BUCKET}/.env           /home/ubuntu/.env
aws s3 cp s3://${S3_BUCKET}/schema.sql     /home/ubuntu/schema.sql
aws s3 cp s3://${S3_BUCKET}/app.jar        /home/ubuntu/app.jar
aws s3 sync s3://${S3_BUCKET}/frontend/    /home/ubuntu/frontend/
aws s3 sync s3://${S3_BUCKET}/monitoring/  /home/ubuntu/monitoring/

# ── Load environment variables ────────────────────────────────────────────────
echo "=== Loading environment variables ==="
sed -i "s|APP_CORS_ALLOWED_ORIGINS=.*|APP_CORS_ALLOWED_ORIGINS=http://${INSTANCE_IP}|" /home/ubuntu/.env
set -a
source /home/ubuntu/.env
set +a

# ── MySQL 8 ───────────────────────────────────────────────────────────────────
echo "=== Installing MySQL ==="
apt-get install -y mysql-server
systemctl enable mysql
systemctl start mysql
mysql -u root <<SQL
  ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_ROOT_PASSWORD}';
  CREATE DATABASE IF NOT EXISTS sms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  FLUSH PRIVILEGES;
SQL
mysql -u root -p"${DB_ROOT_PASSWORD}" -e "CREATE USER IF NOT EXISTS '${SPRING_DATASOURCE_USERNAME}'@'localhost' IDENTIFIED BY '${SPRING_DATASOURCE_PASSWORD}';"
mysql -u root -p"${DB_ROOT_PASSWORD}" -e "GRANT ALL PRIVILEGES ON sms_db.* TO '${SPRING_DATASOURCE_USERNAME}'@'localhost'; FLUSH PRIVILEGES;"
mysql -u root -p"${DB_ROOT_PASSWORD}" sms_db < /home/ubuntu/schema.sql
echo "MySQL setup complete"

# ── Java 21 ───────────────────────────────────────────────────────────────────
echo "=== Installing Java 21 ==="
wget -qO /tmp/temurin.asc https://packages.adoptium.net/artifactory/api/gpg/key/public
gpg --dearmor < /tmp/temurin.asc > /usr/share/keyrings/adoptium.gpg
echo "deb [signed-by=/usr/share/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb jammy main" \
  > /etc/apt/sources.list.d/adoptium.list
apt-get update -y && apt-get install -y temurin-21-jdk
java -version

# ── Nginx ─────────────────────────────────────────────────────────────────────
echo "=== Installing Nginx ==="
apt-get install -y nginx
systemctl enable nginx

cat > /etc/nginx/sites-available/default << 'NGINXEOF'
server {
    listen 80;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGINXEOF

# ── Prometheus ────────────────────────────────────────────────────────────────
echo "=== Installing Prometheus ==="
PROM_VERSION="2.51.2"
wget -qO /tmp/prometheus.tar.gz \
  https://github.com/prometheus/prometheus/releases/download/v${PROM_VERSION}/prometheus-${PROM_VERSION}.linux-amd64.tar.gz
tar -xzf /tmp/prometheus.tar.gz -C /tmp
mv /tmp/prometheus-${PROM_VERSION}.linux-amd64/prometheus /usr/local/bin/
mv /tmp/prometheus-${PROM_VERSION}.linux-amd64/promtool   /usr/local/bin/
mkdir -p /etc/prometheus /var/lib/prometheus
cp /home/ubuntu/monitoring/prometheus.yml /etc/prometheus/prometheus.yml
useradd --no-create-home --shell /bin/false prometheus 2>/dev/null || true
chown -R prometheus:prometheus /etc/prometheus /var/lib/prometheus

cat > /etc/systemd/system/prometheus.service << 'PROMSVC'
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
PROMSVC

systemctl daemon-reload
systemctl enable prometheus
systemctl start prometheus

# ── Grafana ───────────────────────────────────────────────────────────────────
echo "=== Installing Grafana ==="
wget -qO /usr/share/keyrings/grafana.key https://apt.grafana.com/gpg.key
echo "deb [signed-by=/usr/share/keyrings/grafana.key] https://apt.grafana.com stable main" \
  > /etc/apt/sources.list.d/grafana.list
apt-get update -y && apt-get install -y grafana
sed -i 's/^;http_port = 3000/http_port = 3001/' /etc/grafana/grafana.ini
systemctl enable grafana-server
systemctl start grafana-server

# ── Deploy Frontend ───────────────────────────────────────────────────────────
echo "=== Deploying Frontend ==="
mkdir -p /var/www/html
cp -r /home/ubuntu/frontend/* /var/www/html/
nginx -t && systemctl restart nginx

# ── Start Spring Boot Backend ─────────────────────────────────────────────────
echo "=== Starting Spring Boot Backend ==="
pkill -f 'app.jar' 2>/dev/null || true
sleep 2
DB_URL="jdbc:mysql://localhost:3306/sms_db?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC"
nohup java -jar /home/ubuntu/app.jar \
  --spring.datasource.url="${DB_URL}" \
  --spring.datasource.username="${SPRING_DATASOURCE_USERNAME}" \
  --spring.datasource.password="${SPRING_DATASOURCE_PASSWORD}" \
  --app.cors.allowed-origins="http://${INSTANCE_IP}" \
  > /var/log/backend.log 2>&1 &
echo "Backend started with PID: $!"
sleep 15
curl -s http://localhost:8082/actuator/health || echo "Backend still starting, check /var/log/backend.log"

echo "===== Deployment complete! ====="
echo "App:        http://${INSTANCE_IP}"
echo "Grafana:    http://${INSTANCE_IP}:3001  (admin/admin)"
echo "Prometheus: http://${INSTANCE_IP}:9090"