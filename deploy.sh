#!/usr/bin/env bash
# deploy.sh — build, push, and force-deploy amplifier to ECS
set -euo pipefail

AWS_PROFILE="prod-aicoe-admin"
AWS_REGION="us-east-1"
AWS_ACCOUNT="913524910742"
ECR_REPO="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/amplifier/dev/web"
ECS_CLUSTER="amplifier-dev-cluster"
ECS_SERVICE="amplifier-dev-web"

echo "🔐 Logging into ECR..."
aws ecr get-login-password --region "$AWS_REGION" --profile "$AWS_PROFILE" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "🐳 Building Docker image (linux/amd64)..."
docker build --platform linux/amd64 \
  -t "${ECR_REPO}:latest" \
  apps/web/

echo "📤 Pushing image to ECR..."
docker push "${ECR_REPO}:latest"

echo "🚀 Triggering ECS force deployment..."
aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --force-new-deployment \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --query 'service.{status:status,running:runningCount,desired:desiredCount}' \
  --output table

echo "⏳ Waiting for service to stabilize..."
aws ecs wait services-stable \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION"

echo "✅ Deploy complete — https://amplify.elelem.expert"
