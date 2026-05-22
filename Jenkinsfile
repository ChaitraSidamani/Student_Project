pipeline {
  agent any

  tools {
    jdk 'jdk-21'
    maven 'maven-3'
    nodejs 'node-20'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Backend Build') {
      steps {
        dir('backend_modified') {
          sh 'mvn clean package -DskipTests'
        }
      }
    }

    stage('Frontend Build') {
      steps {
        dir('frontend') {
          sh 'npm install'
          sh 'npm run build'
        }
      }
    }

    stage('Docker Compose Validation') {
      steps {
        sh 'docker compose config'
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'backend_modified/target/*.jar,frontend/dist/**', allowEmptyArchive: true
    }
  }
}
