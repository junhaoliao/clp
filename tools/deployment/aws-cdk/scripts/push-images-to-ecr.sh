#!/usr/bin/env bash
# Pushes CLP and third-party images to a private ECR registry.
# Usage: ./push-images-to-ecr.sh [AWS_ACCOUNT_ID] [AWS_REGION]
#
# Prerequisites:
#   - AWS CLI v2 authenticated (`aws login` or `aws configure`)
#   - Docker daemon running
set -euo pipefail

AWS_ACCOUNT_ID="${1:-$(aws sts get-caller-identity --query Account --output text)}"
AWS_REGION="${2:-$(aws configure get region || echo us-east-2)}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# CLP package image -- uses the tag from Chart.yaml appVersion
CLP_TAG="${CLP_TAG:-0.9.1-dev}"
CLP_SOURCE="${CLP_SOURCE:-ghcr.io/y-scope/clp/clp-package:${CLP_TAG}}"

# Third-party images used by the Helm chart (hardcoded in templates today)
declare -A IMAGES=(
  ["clp/clp-package:${CLP_TAG}"]="${CLP_SOURCE}"
  ["clp/mariadb:10-jammy"]="mariadb:10-jammy"
  ["clp/mongo:7.0.1"]="mongo:7.0.1"
  ["clp/rabbitmq:3.9.8"]="rabbitmq:3.9.8"
  ["clp/redis:7.2.4"]="redis:7.2.4"
  ["clp/kubectl:1.32.0"]="bitnami/kubectl:1.32.0"
)

echo "==> Authenticating Docker to ECR (${ECR_REGISTRY})"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

for ecr_path in "${!IMAGES[@]}"; do
  source_image="${IMAGES[$ecr_path]}"
  ecr_repo="${ecr_path%%:*}"
  ecr_image="${ECR_REGISTRY}/${ecr_path}"

  echo ""
  echo "==> Processing ${source_image} -> ${ecr_image}"

  # Create ECR repo if it doesn't exist
  aws ecr describe-repositories --repository-names "${ecr_repo}" --region "${AWS_REGION}" \
    >/dev/null 2>&1 || \
    aws ecr create-repository --repository-name "${ecr_repo}" --region "${AWS_REGION}" \
      --image-scanning-configuration scanOnPush=true \
      --query 'repository.repositoryUri' --output text

  docker pull "${source_image}"
  docker tag "${source_image}" "${ecr_image}"
  docker push "${ecr_image}"

  echo "    Done: ${ecr_image}"
done

echo ""
echo "==> All images pushed to ${ECR_REGISTRY}"
echo ""
echo "To deploy with these images, set Helm values:"
echo "  image.clpPackage.repository: ${ECR_REGISTRY}/clp/clp-package"
echo "  image.clpPackage.tag: ${CLP_TAG}"
