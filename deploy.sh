#!/bin/bash
set -e
export AWS_DEFAULT_REGION=us-east-1
cd /home/ubuntu

echo "=== Downloading files from S3 ==="
aws s3 cp s3://${S3_BUCKET}/.env           /home/ubuntu/.env
aws s3 cp s3://${S3_BUCKET}/schema.sql     /home/ubuntu/schema.sql
aws s3 cp s3://${S3_BUCKET}/app.jar        /home/ubuntu/app.jar
aws s3 sync s3://${S3_BUCKET}/frontend/    /home/ubuntu/frontend/
aws s3 sync s3://${S3_BUCKET}/monitoring/  /home/ubuntu/monitoring/

echo "=== Updating CORS with actual instance IP ==="
sed -i "s|APP_CORS_ALLOWED_ORIGINS=.*|APP_CORS_ALLOWED_ORIGINS=http://${INSTANCE_IP}|" /home/ubuntu/.env

echo "=== Loading environment variables ==="
set -a
source /home/ubuntu/.env
set +a

echo "=== Setting up MySQL ==="
mysql -u root -p"${DB_ROOT_PASSWORD}" -e "CREATE DATABASE IF NOT EXISTS sms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null || true
mysql -u root -p"${DB_ROOT_PASSWORD}" -e "CREATE USER IF NOT EXISTS '${SPRING_DATASOURCE_USERNAME}'@'localhost' IDENTIFIED BY '${SPRING_DATASOURCE_PASSWORD}';" 2>/dev/null || true
mysql -u root -p"${DB_ROOT_PASSWORD}" -e "GRANT ALL PRIVILEGES ON sms_db.* TO '${SPRING_DATASOURCE_USERNAME}'@'localhost'; FLUSH PRIVILEGES;"
mysql -u root -p"${DB_ROOT_PASSWORD}" sms_db < /home/ubuntu/schema.sql

echo "=== Deploying Prometheus config ==="
cp /home/ubuntu/monitoring/prometheus.yml /etc/prometheus/prometheus.yml
chown prometheus:prometheus /etc/prometheus/prometheus.yml
systemctl restart prometheus

echo "=== Starting Spring Boot Backend ==="
pkill -f 'app.jar' || true
sleep 3
DB_URL="jdbc:mysql://localhost:3306/sms_db?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC"
nohup java -jar /home/ubuntu/app.jar \
  --spring.datasource.url="${DB_URL}" \
  --spring.datasource.username="${SPRING_DATASOURCE_USERNAME}" \
  --spring.datasource.password="${SPRING_DATASOURCE_PASSWORD}" \
  --app.cors.allowed-origins="http://${INSTANCE_IP}" \
  > /var/log/backend.log 2>&1 &
echo "Backend started with PID: $!"
sleep 10
curl -s http://localhost:8082/actuator/health || echo "Backend still starting..."

echo "=== Deploying Frontend to Nginx ==="
mkdir -p /var/www/html
cp -r /home/ubuntu/frontend/* /var/www/html/

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

nginx -t && systemctl restart nginx
echo "=== Deployment complete! ==="
