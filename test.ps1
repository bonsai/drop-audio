[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$r = Invoke-WebRequest -Uri 'https://drop-audio.vercel.app/mp3' -UseBasicParsing -TimeoutSec 15
Write-Host $r.StatusCode
Write-Host $r.Content
