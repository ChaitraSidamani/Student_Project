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

        stage('Terraform Init and Plan') {
            steps {
                dir('terraform') {
                    sh '''
                        terraform init

                        # ── Import any leftover resources so Terraform adopts them ──
                        # IAM Role
                        terraform import aws_iam_role.ec2_role college-erp-ec2-role 2>/dev/null || true
                        # IAM Instance Profile
                        terraform import aws_iam_instance_profile.ec2_profile college-erp-ec2-profile 2>/dev/null || true
                        # Security Group
                        SG_ID=$(aws ec2 describe-security-groups --region us-east-1 \
                            --filters "Name=group-name,Values=college-erp-sg" \
                            --query "SecurityGroups[0].GroupId" \
                            --output text 2>/dev/null)
                        if [ -n "$SG_ID" ] && [ "$SG_ID" != "None" ]; then
                            echo "Importing existing security group: $SG_ID"
                            terraform import aws_security_group.erp $SG_ID 2>/dev/null || true
                        fi

                        # ── Now plan with full state ──
                        terraform plan -out=tfplan
                    '''
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

                    aws s3 cp .env                                                s3://${env.S3_BUCKET}/.env
                    aws s3 cp database/schema.sql                                s3://${env.S3_BUCKET}/schema.sql
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
                    sed -e 's|\\\${S3_BUCKET}|${env.S3_BUCKET}|g' \
                        -e 's|\\\${INSTANCE_IP}|${env.INSTANCE_IP}|g' \
                        deploy.sh > /tmp/deploy.sh

                    aws s3 cp /tmp/deploy.sh s3://${env.S3_BUCKET}/deploy.sh
                    echo "Deploy script uploaded to S3"
                """
            }
        }

        stage('Wait for Instance Ready') {
            steps {
                sh """
                    echo "Waiting 60 seconds for EC2 and SSM agent to start..."
                    sleep 60

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
                        --parameters '{"commands":["#!/bin/bash","set -e","apt-get install -y unzip curl 2>/dev/null || true","if ! command -v aws &>/dev/null; then curl -s https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o /tmp/awscliv2.zip && unzip -q /tmp/awscliv2.zip -d /tmp && /tmp/aws/install --update; fi","/usr/local/bin/aws s3 cp s3://${env.S3_BUCKET}/deploy.sh /home/ubuntu/deploy.sh","chmod +x /home/ubuntu/deploy.sh","bash /home/ubuntu/deploy.sh"]}' \
                        --query "Command.CommandId" \
                        --output text)

                    echo "SSM Command ID: \$COMMAND_ID"
                    echo "Waiting for deployment to complete..."

                    for i in \$(seq 1 20); do
                        sleep 30
                        STATUS=\$(aws ssm get-command-invocation \
                            --command-id \$COMMAND_ID \
                            --instance-id ${env.INSTANCE_ID} \
                            --region us-east-1 \
                            --query "Status" \
                            --output text 2>/dev/null || echo "Pending")
                        echo "Attempt \$i: Status = \$STATUS"
                        if [ "\$STATUS" = "Success" ] || [ "\$STATUS" = "Failed" ] || [ "\$STATUS" = "TimedOut" ] || [ "\$STATUS" = "Cancelled" ]; then
                            break
                        fi
                    done

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

                    echo "====== DEPLOY OUTPUT ======"
                    echo "\$OUTPUT"
                    echo "====== DEPLOY ERRORS ======"
                    echo "\$ERROR"
                    echo "====== STATUS: \$STATUS ======"

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