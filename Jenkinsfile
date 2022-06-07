// Git params
def repoName  = scm.getUserRemoteConfigs()[0].getUrl().tokenize('/').last().split("\\.")[0].toLowerCase().replaceAll("[\\p{Punct}\\s\\t]+", "-") // get repo name and replace all special characters
// AWS Params
def NVM_INSTALL_URL="https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh"
def NVM_IOJS_MIRROR="https://iojs.org/dist"
def NVM_NODEJS_MIRROR="https://nodejs.org/dist"
def NODEJS_VERSION="14/*"

// Pipeline
pipeline {
  agent { label 'stage-ecs-spot' }
  options {
    ansiColor('xterm')
    timeout(time: 60, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '10'))
    disableConcurrentBuilds()
  }
  environment {
    REPO_NAME = "${repoName}"
  }
  stages {
    stage('Slack') {
      steps {
        slackSend (color: '#0000FF', message: "*Started*\n${env.JOB_NAME} [${env.BUILD_NUMBER}]'\n${env.BUILD_URL}", channel: 'api-builds', tokenCredentialId: 'cirrent-slack-api')
      }
    }
    stage('Build and test Interop') {
      steps {
        nvm(nvmInstallURL: "${NVM_INSTALL_URL}",nvmIoJsOrgMirror: "${NVM_IOJS_MIRROR}", nvmNodeJsOrgMirror: "${NVM_NODEJS_MIRROR}",version: "${NODEJS_VERSION}") {
          dir("interop") {
            sh "npm install"
            sh "npm run test"
          }
        }
      }
    }
  }
  post {
    success {
      slackSend (color: '#00FF00', message: "*Staging Deployed*\n${env.JOB_NAME} [${env.BUILD_NUMBER}]'\n${env.BUILD_URL}", channel: 'api-builds', tokenCredentialId: 'cirrent-slack-api')
    }
    failure {
      slackSend (color: '#FF0000', message: "*Staging Failed*\n${env.JOB_NAME} [${env.BUILD_NUMBER}]'\n${env.BUILD_URL}", channel: 'api-builds', tokenCredentialId: 'cirrent-slack-api')
    }
  }
}
