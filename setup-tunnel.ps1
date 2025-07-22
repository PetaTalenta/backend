# Setup Cloudflare Tunnel for ATMA Backend
# Run this script after getting tunnel token from Cloudflare dashboard

param(
    [Parameter(Mandatory=$true)]
    [string]$TunnelToken
)

Write-Host "Setting up Cloudflare Tunnel for ATMA Backend..." -ForegroundColor Green

# Update .env file with tunnel token
$envContent = @"
# Cloudflare Tunnel Token
CLOUDFLARE_TUNNEL_TOKEN=$TunnelToken
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "✓ Updated .env file with tunnel token" -ForegroundColor Green

# Check if Docker is running
try {
    docker version | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker first." -ForegroundColor Red
    exit 1
}

# Stop existing containers if running
Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker-compose down

# Build and start services
Write-Host "Building and starting services..." -ForegroundColor Yellow
docker-compose up -d

# Wait for services to start
Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check tunnel status
Write-Host "Checking tunnel status..." -ForegroundColor Yellow
docker-compose logs cloudflared

Write-Host ""
Write-Host "Setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Your services should now be available at:" -ForegroundColor Cyan
Write-Host "  API Gateway: https://api.chhrone.web.id" -ForegroundColor White
Write-Host "  Documentation: https://docs.chhrone.web.id" -ForegroundColor White
Write-Host ""
Write-Host "If the domains are not accessible yet, wait 5-10 minutes for DNS propagation." -ForegroundColor Yellow
Write-Host ""
Write-Host "To check logs:" -ForegroundColor Cyan
Write-Host "  docker-compose logs cloudflared" -ForegroundColor White
Write-Host "  docker-compose logs api-gateway" -ForegroundColor White
Write-Host "  docker-compose logs documentation-service" -ForegroundColor White
