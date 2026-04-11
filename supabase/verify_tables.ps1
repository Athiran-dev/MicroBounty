# Load environment variables from .env file if it exists
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim())
    }
}

$supabaseUrl = [System.Environment]::GetEnvironmentVariable("SUPABASE_URL")
$supabaseKey = [System.Environment]::GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY")

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Host "Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables not set." -ForegroundColor Red
    Write-Host "Please ensure they are defined in $envFile or your system environment."
    exit 1
}

$headers = @{
  'apikey' = $supabaseKey
  'Authorization' = "Bearer $supabaseKey"
}

$tables = @('bounties','applications','bounty_rooms','messages','submissions','scheduled_deletions')

foreach ($t in $tables) {
  try {
    $r = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/$t`?select=id&limit=0" -Headers $headers -Method GET
    Write-Host "$t : OK"
  } catch {
    Write-Host "$t : FAILED - $($_.Exception.Message)"
  }
}

