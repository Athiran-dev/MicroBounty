$headers = @{
  'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkaXRzaXRjd3Bqc3hieG56cXRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzNDM2NSwiZXhwIjoyMDkxNTEwMzY1fQ.bGgYOpM5qC1JTpSfDqrpO0V8KXV5xjDMQkEj4fyJSeM'
  'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkaXRzaXRjd3Bqc3hieG56cXRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkzNDM2NSwiZXhwIjoyMDkxNTEwMzY1fQ.bGgYOpM5qC1JTpSfDqrpO0V8KXV5xjDMQkEj4fyJSeM'
}
$tables = @('bounties','applications','bounty_rooms','messages','submissions','scheduled_deletions')
foreach ($t in $tables) {
  try {
    $r = Invoke-RestMethod -Uri "https://sditsitcwpjsxbxnzqtf.supabase.co/rest/v1/$t`?select=id&limit=0" -Headers $headers -Method GET
    Write-Host "$t : OK"
  } catch {
    Write-Host "$t : FAILED - $($_.Exception.Message)"
  }
}
