param(
  [int]$ByteLength = 64
)

if ($ByteLength -le 0) {
  throw "ByteLength must be greater than 0."
}

$bytes = New-Object byte[] $ByteLength
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
  $rng.GetBytes($bytes)
}
finally {
  $rng.Dispose()
}
[Convert]::ToBase64String($bytes)
