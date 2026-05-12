$file = "reports.html"
if ([System.IO.File]::Exists($file)) {
    $content = [System.IO.File]::ReadAllText($file)
    
    # Update font-family for print
    $content = $content -replace "'Outfit', 'Segoe UI', serif", "'Inter', sans-serif"
    
    # Global weight reduction in style block and inline styles
    $content = $content -replace 'font-weight:\s*800', 'font-weight: 600'
    $content = $content -replace 'font-weight:\s*700', 'font-weight: 500'
    $content = $content -replace 'font-weight:\s*600', 'font-weight: 500'
    
    # Ensure body print weight is light
    $content = $content -replace 'font-weight:\s*300', 'font-weight: 400' # Normalizing light to regular
    if ($content -match 'body\s*\{[^}]*font-weight:\s*10pt[^}]*\}') {
        $content = $content -replace '(body\s*\{[^}]*)', '$1`n                font-weight: 400;'
    }

    [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Report print weights lightened and font updated to Inter."
}
else {
    Write-Host "File not found."
}
