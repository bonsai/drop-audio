[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try {
  $r = Invoke-WebRequest -Uri 'https://drop-audio.vercel.app/mp3' -UseBasicParsing -TimeoutSec 20
  Write-Host $r.StatusCode
  Write-Host $r.Content
} catch {
  Write-Host $_.Exception.Message
}
