# FoodTrace GH — local backend starter
# Loads .env into the current session then runs Spring Boot

$envFile = Join-Path $PSScriptRoot ".env"

Get-Content $envFile | Where-Object { $_ -match '^\s*[^#\s]' } | ForEach-Object {
  $parts = $_ -split '=', 2
  if ($parts.Count -eq 2) {
    $key   = $parts[0].Trim()
    $value = $parts[1].Trim()
    [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
  }
}

Write-Host "Starting FoodTrace backend on http://localhost:3000 ..." -ForegroundColor Green
mvn spring-boot:run -f "$PSScriptRoot\backend\pom.xml"
