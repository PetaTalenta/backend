Write-Host "ATMA Backend Configuration Validation" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

$ValidationPassed = $true

# Check if docker-compose.yml exists
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "ERROR: docker-compose.yml not found!" -ForegroundColor Red
    exit 1
}

# Check if .env.docker files exist
$services = @("api-gateway", "auth-service", "assessment-service", "archive-service", "notification-service", "analysis-worker")
foreach ($service in $services) {
    $envFile = "$service\.env.docker"
    if (Test-Path $envFile) {
        Write-Host "OK: $envFile exists" -ForegroundColor Green
    } else {
        Write-Host "ERROR: $envFile missing" -ForegroundColor Red
        $ValidationPassed = $false
    }
}

# Check docker-compose.yml content
$dockerContent = Get-Content "docker-compose.yml" -Raw

# Check for required services
$requiredServices = @("postgres", "rabbitmq", "redis", "api-gateway", "auth-service", "assessment-service", "archive-service", "notification-service", "analysis-worker-1", "analysis-worker-2", "analysis-worker-3")
foreach ($service in $requiredServices) {
    $servicePattern = $service + ":"
    if ($dockerContent -match [regex]::Escape($servicePattern)) {
        Write-Host "OK: Service $service defined" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Service $service missing" -ForegroundColor Red
        $ValidationPassed = $false
    }
}

# Check for required ports
$requiredPorts = @("3000:3000", "3001:3001", "3002:3002", "3003:3003", "3005:3005", "5432:5432", "5672:5672", "6379:6379")
foreach ($port in $requiredPorts) {
    $portPattern = '"' + $port + '"'
    if ($dockerContent -match [regex]::Escape($portPattern)) {
        Write-Host "OK: Port mapping $port found" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Port mapping $port missing" -ForegroundColor Red
        $ValidationPassed = $false
    }
}

# Check for network
if ($dockerContent -match "atma-network") {
    Write-Host "OK: atma-network defined" -ForegroundColor Green
} else {
    Write-Host "ERROR: atma-network missing" -ForegroundColor Red
    $ValidationPassed = $false
}

# Check for volumes
$requiredVolumes = @("postgres_data", "rabbitmq_data", "redis_data")
foreach ($volume in $requiredVolumes) {
    $volumePattern = $volume + ":"
    if ($dockerContent -match [regex]::Escape($volumePattern)) {
        Write-Host "OK: Volume $volume defined" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Volume $volume missing" -ForegroundColor Red
        $ValidationPassed = $false
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
if ($ValidationPassed) {
    Write-Host "SUCCESS: Basic validation passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ready for deployment:" -ForegroundColor Green
    Write-Host "   docker-compose up -d" -ForegroundColor White
} else {
    Write-Host "FAILED: Validation failed! Please fix the issues above." -ForegroundColor Red
}
