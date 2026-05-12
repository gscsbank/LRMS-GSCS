$file = "reports.html"
$lines = Get-Content $file
$newLines = @()
$skipCount = 0

for ($i = 0; $i -lt $lines.Count; $i++) {
    # Detect the exactly duplicated section based on line 208 from view_file (index 207)
    # We want to remove lines 208 to 218 (indices 207 to 217)
    if ($i -ge 207 -and $i -le 217) {
        continue
    }
    $newLines += $lines[$i]
}

[System.IO.File]::WriteAllLines($file, $newLines, [System.Text.Encoding]::UTF8)
Write-Host "Manually cleaned up debris lines from reports.html"
