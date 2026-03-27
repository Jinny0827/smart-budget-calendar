param(
    [string]$target = "all"  # all, frontend, backend
)

function Deploy-Frontend {
    Write-Host "▶ 프론트엔드 배포 시작..." -ForegroundColor Cyan
    Set-Location frontend
    npm run build
    aws s3 sync dist/ s3://smart-budget-calendar
    aws cloudfront create-invalidation --distribution-id E2B9SWYBSMQLW9 --paths "/*"
    Set-Location ..
    Write-Host "✓ 프론트엔드 배포 완료" -ForegroundColor Green
}

function Deploy-Backend {
    Write-Host "▶ 백엔드 배포 시작..." -ForegroundColor Cyan
    Set-Location backend
    sam build
    sam deploy
    Set-Location ..
    Write-Host "✓ 백엔드 배포 완료" -ForegroundColor Green
}

switch ($target) {
    "frontend" { Deploy-Frontend }
    "backend"  { Deploy-Backend }
    "all"      { Deploy-Frontend; Deploy-Backend }
}
