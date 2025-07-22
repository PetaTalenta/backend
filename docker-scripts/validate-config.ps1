# Configuration Validation Script for Windows PowerShell
# Validates that docker-compose.yml is consistent with .env.docker files

Write-Host "🔍 ATMA Backend Configuration Validation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$ValidationPassed = $true

# Function to check if a value exists in docker-compose.yml
function Check-DockerComposeValue {
    param(
        [string]$Service,
        [string]$Key,
        [string]$ExpectedValue
    )

    $dockerComposeContent = Get-Content "docker-compose.yml" -Raw
    $serviceName = $Service + ":"
    $serviceSection = ($dockerComposeContent -split "(?m)^  $serviceName")[1]
    if ($serviceSection) {
        $serviceSection = ($serviceSection -split "(?m)^  [a-zA-Z]")[0]
        $pattern = "      $Key\s*:\s*(.+)"
        if ($serviceSection -match $pattern) {
            $actualValue = $matches[1].Trim()
            if ($actualValue -eq $ExpectedValue) {
                Write-Host "  ✅ $Service.$Key = $actualValue" -ForegroundColor Green
            } else {
                Write-Host "  ❌ $Service.$Key = Expected '$ExpectedValue', got '$actualValue'" -ForegroundColor Red
                $script:ValidationPassed = $false
            }
        } else {
            Write-Host "  ❌ $Service.$Key = Not found in docker-compose.yml" -ForegroundColor Red
            $script:ValidationPassed = $false
        }
    }
}

# Function to validate service configuration
function Validate-Service {
    param([string]$Service)
    
    $envFile = "$Service\.env.docker"
    
    Write-Host ""
    Write-Host "🔧 Validating $Service..." -ForegroundColor Yellow
    
    if (-not (Test-Path $envFile)) {
        Write-Host "  ❌ Missing .env.docker file" -ForegroundColor Red
        $script:ValidationPassed = $false
        return
    }
    
    # Read key configurations from .env.docker
    $envContent = Get-Content $envFile
    foreach ($line in $envContent) {
        if ($line -match '^([^#=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim() -replace '^"(.*)"$', '$1'
            
            # Check important configurations
            switch ($key) {
                { $_ -in @('PORT', 'NODE_ENV', 'JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'RABBITMQ_URL', 'REDIS_HOST') } {
                    Check-DockerComposeValue $Service $key $value
                }
            }
        }
    }
}

# Validate each service
Validate-Service "api-gateway"
Validate-Service "auth-service"
Validate-Service "assessment-service"
Validate-Service "archive-service"
Validate-Service "notification-service"

# Special validation for analysis workers
Write-Host ""
Write-Host "🔧 Validating analysis workers..." -ForegroundColor Yellow
for ($i = 1; $i -le 3; $i++) {
    Write-Host "  Checking analysis-worker-$i..."
    Check-DockerComposeValue "analysis-worker-$i" "WORKER_ID" "worker-$i"
    Check-DockerComposeValue "analysis-worker-$i" "RABBITMQ_URL" "amqp://admin:admin123@rabbitmq:5672"
}

# Check port mappings
Write-Host ""
Write-Host "🔧 Validating port mappings..." -ForegroundColor Yellow
$expectedPorts = @{
    "api-gateway" = "3000"
    "auth-service" = "3001"
    "archive-service" = "3002"
    "assessment-service" = "3003"
    "notification-service" = "3005"
    "postgres" = "5432"
    "rabbitmq" = "5672"
    "redis" = "6379"
    "documentation-service" = "8080"
}

$dockerComposeContent = Get-Content "docker-compose.yml" -Raw
foreach ($service in $expectedPorts.Keys) {
    $port = $expectedPorts[$service]
    $portPattern = '"' + $port + ':' + $port + '"'
    if ($dockerComposeContent -match [regex]::Escape($portPattern)) {
        Write-Host "  ✅ $service port mapping: $port" + ":" + "$port" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $service port mapping missing or incorrect" -ForegroundColor Red
        $ValidationPassed = $false
    }
}

# Check network configuration
Write-Host ""
Write-Host "🔧 Validating network configuration..." -ForegroundColor Yellow
if ($dockerComposeContent -match "atma-network") {
    Write-Host "  ✅ atma-network defined" -ForegroundColor Green
} else {
    Write-Host "  ❌ atma-network missing" -ForegroundColor Red
    $ValidationPassed = $false
}

# Check volume configuration
Write-Host ""
Write-Host "🔧 Validating volume configuration..." -ForegroundColor Yellow
$expectedVolumes = @("postgres_data", "rabbitmq_data", "redis_data")
foreach ($volume in $expectedVolumes) {
    $volumePattern = $volume + ":"
    if ($dockerComposeContent -match [regex]::Escape($volumePattern)) {
        Write-Host "  ✅ Volume $volume defined" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Volume $volume missing" -ForegroundColor Red
        $ValidationPassed = $false
    }
}

# Check health checks
Write-Host ""
Write-Host "🔧 Validating health checks..." -ForegroundColor Yellow
$servicesWithHealth = @("postgres", "rabbitmq", "redis")
foreach ($service in $servicesWithHealth) {
    $serviceName = $service + ":"
    $healthPattern = "healthcheck:"
    if ($dockerComposeContent -match [regex]::Escape($serviceName) -and $dockerComposeContent -match $healthPattern) {
        Write-Host "  ✅ $service has health check" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $service missing health check" -ForegroundColor Red
        $ValidationPassed = $false
    }
}

# Final result
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($ValidationPassed) {
    Write-Host "🎉 All validations passed! Configuration is consistent." -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Ready for deployment:" -ForegroundColor Green
    Write-Host "   docker-compose up -d" -ForegroundColor White
    exit 0
} else {
    Write-Host "❌ Validation failed! Please fix the issues above." -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Common fixes:" -ForegroundColor Yellow
    Write-Host "   - Update docker-compose.yml to match .env.docker files" -ForegroundColor White
    Write-Host "   - Ensure all required environment variables are set" -ForegroundColor White
    Write-Host "   - Check port mappings and service names" -ForegroundColor White
    exit 1
}
