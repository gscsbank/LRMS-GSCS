$cssFile = "css/style.css"
if ([System.IO.File]::Exists($cssFile)) {
    $css = [System.IO.File]::ReadAllText($cssFile)
    
    # 1. Inject Lighter Font Import (Inter)
    $importLine = "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');`n"
    if ($css -notmatch "Inter:wght") {
        $css = $importLine + $css
    }

    # 2. Update Font Family to Inter (Elegant and Clean)
    $systemFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    $newFont = "'Inter', $systemFont"
    $css = $css -replace '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', $newFont

    # 3. Global Weight Reduction (Addressing "no bold font" request)
    # 800 -> 600 (Semi-Bold)
    # 700 -> 500 (Medium)
    # 600 -> 400 (Regular)
    # 500 -> 400
    $css = $css -replace 'font-weight:\s*800', 'font-weight: 600'
    $css = $css -replace 'font-weight:\s*700', 'font-weight: 500'
    $css = $css -replace 'font-weight:\s*600', 'font-weight: 400'
    $css = $css -replace 'font-weight:\s*500', 'font-weight: 400'

    # Set base font weight in body to 400 (Regular)
    if ($css -match 'body\s*\{') {
        $css = $css -replace '(body\s*\{[^}]*)', '$1`n    font-weight: 400;'
    }

    [System.IO.File]::WriteAllText($cssFile, $css, [System.Text.Encoding]::UTF8)
    Write-Host "Typography refined: Weights reduced and switched to Lighter Inter font."
}
else {
    Write-Host "style.css not found."
}
