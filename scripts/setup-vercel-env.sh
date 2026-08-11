#!/bin/bash
# Vercel 환경변수 등록 — 대시보드 UI 대신 명령어로 한 번에 처리한다.
#
#   bash scripts/setup-vercel-env.sh
#
# 하는 일: 로그인 확인 → 프로젝트 연결 → .env.local 의 변수 10개를
#          Production/Preview/Development 세 환경에 모두 등록 → 재배포
set -e
cd "$(dirname "$0")/.."

VC="npx --yes vercel@latest"

echo "── 1. 로그인 확인 ─────────────────────────────"
if ! $VC whoami >/dev/null 2>&1; then
  echo "   로그인이 필요합니다. 브라우저가 열리면 승인해 주세요."
  $VC login
fi
echo "   로그인됨: $($VC whoami 2>/dev/null)"

echo ""
echo "── 2. 프로젝트 연결 ───────────────────────────"
if [ ! -f .vercel/project.json ]; then
  $VC link --yes --project modi-hub-ai
fi
echo "   연결됨: modi-hub-ai"

echo ""
echo "── 3. 환경변수 등록 ───────────────────────────"
while IFS='=' read -r KEY VALUE; do
  # 주석·빈 줄 건너뛰기
  [[ "$KEY" =~ ^[A-Z_]+$ ]] || continue
  [ "$KEY" = "VERCEL_OIDC_TOKEN" ] && continue
  VALUE="${VALUE%\"}"; VALUE="${VALUE#\"}"     # 양끝 따옴표 제거
  [ -z "$VALUE" ] && { echo "   ⚠️  $KEY 값이 비어 건너뜀"; continue; }

  for ENV in production preview development; do
    # 이미 있으면 지우고 다시 넣는다 (여러 번 실행해도 안전)
    $VC env rm "$KEY" "$ENV" --yes >/dev/null 2>&1 || true
    printf '%s' "$VALUE" | $VC env add "$KEY" "$ENV" >/dev/null 2>&1
  done
  echo "   ✅ $KEY  (production·preview·development)"
done < .env.local

echo ""
echo "── 4. 재배포 ──────────────────────────────────"
$VC --prod --yes
echo ""
echo "완료. 위에 표시된 Production URL 로 접속해 보세요."
