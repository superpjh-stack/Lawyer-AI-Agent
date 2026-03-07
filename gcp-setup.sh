#!/bin/bash
# GCP Cloud Build + Cloud Run 초기 셋업 스크립트
# 실행: bash gcp-setup.sh

PROJECT_ID="lawyer-ai-agent-489501"
REGION="asia-northeast3"
REPO="lawyer-agent"

echo "🚀 GCP 셋업 시작 (프로젝트: $PROJECT_ID)"

# 프로젝트 설정
gcloud config set project $PROJECT_ID

# 필요한 API 활성화
echo "📡 API 활성화 중..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com

# Artifact Registry 저장소 생성
echo "📦 Artifact Registry 저장소 생성..."
gcloud artifacts repositories create $REPO \
  --repository-format=docker \
  --location=$REGION \
  --description="Lawyer Agent Docker images" \
  2>/dev/null || echo "  (이미 존재)"

# Secret Manager에 환경변수 등록
echo "🔐 Secret Manager 등록 (값을 입력해주세요)..."

create_secret() {
  local name=$1
  local prompt=$2
  echo -n "  $prompt: "
  read -s value
  echo
  echo -n "$value" | gcloud secrets create $name --data-file=- 2>/dev/null || \
  echo -n "$value" | gcloud secrets versions add $name --data-file=-
}

create_secret "AUTH_SECRET"      "AUTH_SECRET"
create_secret "DATABASE_URL"     "DATABASE_URL (postgresql://...)"
create_secret "OPENAI_API_KEY"   "OPENAI_API_KEY"
create_secret "NEXTAUTH_URL"     "NEXTAUTH_URL (https://your-domain.run.app)"

# Cloud Build 서비스 계정에 권한 부여
echo "🔑 Cloud Build 권한 설정..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CB_SA="$PROJECT_NUMBER@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CB_SA" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CB_SA" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CB_SA" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CB_SA" \
  --role="roles/artifactregistry.writer"

# GitHub 연결 안내
echo ""
echo "✅ GCP 셋업 완료!"
echo ""
echo "📌 다음 단계: GitHub 트리거 설정"
echo "   1. https://console.cloud.google.com/cloud-build/triggers?project=$PROJECT_ID"
echo "   2. '트리거 만들기' 클릭"
echo "   3. GitHub 저장소: superpjh-stack/Lawyer-AI-Agent"
echo "   4. 브랜치: main"
echo "   5. 구성 파일: cloudbuild.yaml"
echo ""
echo "🔨 수동 빌드 실행:"
echo "   gcloud builds submit --config cloudbuild.yaml ."
