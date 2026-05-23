pipeline {
    agent any

    environment {
        AWS_ACCESS_KEY_ID     = credentials('aws-access-key-id')
        AWS_SECRET_ACCESS_KEY = credentials('aws-secret-access-key')
        TF_VAR_key_name       = 'SMS-Production-Server'
        ENV_FILE              = credentials('sms-env-file')
        AWS_DEFAULT_REGION    = 'us-east-1'
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/ChaitraSidamani/Student_Project.git',
                    credentialsId: 'New-Github-Credentials'
            }
        }

        stage('Build Backend') {
            steps {
                dir('backend') {
                    sh 'mvn clean package -DskipTests'
                }
            }
        }

        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

        stage('Terraform Init') {
            steps {
                dir('terraform') {
                    sh 'terraform init'
                }
            }
        }

        stage('Terraform Plan') {
            steps {
                dir('terraform') {
                    sh 'terraform plan -out=tfplan'
                }
            }
        }

        stage('Terraform Apply') {
            steps {
                dir('terraform') {
                    sh 'terraform apply -auto-approve tfplan'
                }
            }
        }

        stage('Get Instance and Bucket Info') {
            steps {
                script {
                    env.INSTANCE_IP = sh(script: 'cd terraform && terraform output -raw instance_public_ip', returnStdout: true).trim()
                    env.INSTANCE_ID = sh(script: 'cd terraform && terraform output -raw instance_id',        returnStdout: true).trim()
                    env.S3_BUCKET   = sh(script: 'cd terraform && terraform output -raw s3_bucket_name',    returnStdout: true).trim()
                    echo "Instance IP: ${env.INSTANCE_IP}"
                    echo "Instance ID: ${env.INSTANCE_ID}"
                    echo "S3 Bucket:   ${env.S3_BUCKET}"
                }
            }
        }

        stage('Upload to S3') {
            steps {
                sh """
                    cp \${ENV_FILE} .env

                    aws s3 cp .env                                               s3://${env.S3_BUCKET}/.env
                    aws s3 cp database/schema.sql                               s3://${env.S3_BUCKET}/schema.sql
                    aws s3 cp backend/target/student-management-system-1.0.0.jar s3://${env.S3_BUCKET}/app.jar
                    aws s3 cp --recursive frontend/dist                          s3://${env.S3_BUCKET}/frontend/
                    aws s3 cp --recursive monitoring                              s3://${env.S3_BUCKET}/monitoring/

                    echo "=== S3 upload complete ==="
                    aws s3 ls s3://${env.S3_BUCKET}/
                """
            }
        }

        stage('Create Deploy Script') {
            steps {
                sh """
                    cat > /tmp/deploy.sh << 'DEPLOYEOF'
#!/bin/bash
set -e
export AWS_DEFAULT_REGION=us-east-1
cd /home/ubuntu

echo "=== Downloading files from S3 ==="
aws s3 cp s3://${env.S3_BUCKET}/.env          /home/ubuntu/.env
aws s3 cp s3://${env.S3_BUCKET}/schema.sql    /home/ubuntu/schema.sql
aws s3 cp s3://${env.S3_BUCKET}/app.jar       /home/ubuntu/app.jar
aws s3 cp --recursive s3://${env.S3_BUCKET}/frontend  /home/ubuntu/frontend/
aws s3 cp --recursive s3://${env.S3_BUCKET}/monitoring /home/ubuntu/monitoring/

echo "=== Updating CORS with actual instance IP ==="
sed -i 's|APP_CORS_ALLOWED_ORIGINS=.*|APP_CORS_ALLOWED_ORIGINS=http://${env.INSTANCE_IP}|' /home/ubuntu/.env

echo "=== Loading environment variables ==="
set -a
source /home/ubuntu/.env
set +a

echo "=== Setting up MySQL ==="
mysql -u root -p"\$DB_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS sms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p"\$DB_ROOT_PASSWORD" -e "CREATE USER IF NOT EXISTS '\$SPRING_DATASOURCE_USERNAME'@'localhost' IDENTIFIED BY '\$SPRING_DATASOURCE_PASSWORD';"
mysql -u root -p"\$DB_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON sms_db.* TO '\$SPRING_DATASOURCE_USERNAME'@'localhost'; FLUSH PRIVILEGES;"
mysql -u root -p"\$DB_ROOT_PASSWORD" sms_db < /home/ubuntu/schema.sql

echo "=== Deploying Prometheus config ==="
cp /home/ubuntu/monitoring/prometheus.yml /etc/prometheus/prometheus.yml
chown prometheus:prometheus /etc/prometheus/prometheus.yml
systemctl restart prometheus

echo "=== Starting Spring Boot Backend on port 8082 ==="
pkill -f 'app.jar' || true
sleep 3
DB_URL="jdbc:mysql://localhost:3306/sms_db?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC"
nohup java -jar /home/ubuntu/app.jar \
  --spring.datasource.url="$DB_URL" \
  --spring.datasource.username="$SPRING_DATASOURCE_USERNAME" \
  --spring.datasource.password="$SPRING_DATASOURCE_PASSWORD" \
  --app.cors.allowed-origins="http://${env.INSTANCE_IP}" \
  > /var/log/backend.log 2>&1 &
echo "Backend started with PID: \$!"
sleep 10
curl -s http://localhost:8082/actuator/health || echo "Backend still starting..."

echo "=== Deploying Frontend to Nginx ==="
cp -r /home/ubuntu/frontend/* /var/www/html/

cat > /etc/nginx/sites-available/default << NGINXEOF
server {
    listen 80;
    root /var/www/html;
    index index.html;

    location / {
        try_files \\\$uri \\\$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8082;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
    }
}
NGINXEOF

nginx -t && systemctl restart nginx
echo "=== Deployment complete! ==="
DEPLOYEOF

                    echo "Deploy script created"
                    aws s3 cp /tmp/deploy.sh s3://${env.S3_BUCKET}/deploy.sh
                    echo "Deploy script uploaded to S3"
                """
            }
        }

        stage('Wait for Instance Ready') {
            steps {
                sh """
                    echo "Waiting 300 seconds for EC2 user-data to complete..."
                    sleep 300

                    echo "Checking SSM agent status..."
                    for i in 1 2 3 4 5; do
                        STATUS=\$(aws ssm describe-instance-information \
                            --filters "Key=InstanceIds,Values=${env.INSTANCE_ID}" \
                            --region us-east-1 \
                            --query "InstanceInformationList[0].PingStatus" \
                            --output text 2>/dev/null || echo "None")

                        echo "Attempt \$i: SSM Status = \$STATUS"

                        if [ "\$STATUS" = "Online" ]; then
                            echo "SSM agent is online and ready!"
                            break
                        fi

                        if [ \$i -eq 5 ]; then
                            echo "SSM agent never came online after 5 attempts"
                            exit 1
                        fi

                        echo "SSM not ready yet, waiting 30 more seconds..."
                        sleep 30
                    done
                """
            }
        }

        stage('Deploy via SSM') {
            steps {
                sh """
                    echo "Sending deploy command via SSM..."

                    COMMAND_ID=\$(aws ssm send-command \
                        --instance-ids ${env.INSTANCE_ID} \
                        --document-name "AWS-RunShellScript" \
                        --region us-east-1 \
                        --timeout-seconds 600 \
                        --parameters commands="aws s3 cp s3://${env.S3_BUCKET}/deploy.sh /home/ubuntu/deploy.sh && chmod +x /home/ubuntu/deploy.sh && bash /home/ubuntu/deploy.sh" \
                        --query "Command.CommandId" \
                        --output text)

                    echo "SSM Command ID: \$COMMAND_ID"

                    echo "Waiting for deployment to complete..."
                    aws ssm wait command-executed \
                        --command-id \$COMMAND_ID \
                        --instance-id ${env.INSTANCE_ID} \
                        --region us-east-1

                    STATUS=\$(aws ssm get-command-invocation \
                        --command-id \$COMMAND_ID \
                        --instance-id ${env.INSTANCE_ID} \
                        --region us-east-1 \
                        --query "Status" \
                        --output text)

                    OUTPUT=\$(aws ssm get-command-invocation \
                        --command-id \$COMMAND_ID \
                        --instance-id ${env.INSTANCE_ID} \
                        --region us-east-1 \
                        --query "StandardOutputContent" \
                        --output text)

                    ERROR=\$(aws ssm get-command-invocation \
                        --command-id \$COMMAND_ID \
                        --instance-id ${env.INSTANCE_ID} \
                        --region us-east-1 \
                        --query "StandardErrorContent" \
                        --output text)

                    echo "Status:  \$STATUS"
                    echo "Output:  \$OUTPUT"
                    echo "Errors:  \$ERROR"

                    if [ "\$STATUS" != "Success" ]; then
                        echo "Deployment failed with status: \$STATUS"
                        exit 1
                    fi
                """
            }
        }
    }

    post {
        always {
            sh 'rm -f .env'
            cleanWs()
        }
        success {
            echo "Deployment successful! App available at http://${env.INSTANCE_IP}"
        }
        failure {
            echo 'Pipeline failed. Check logs above.'
        }
    }
}
