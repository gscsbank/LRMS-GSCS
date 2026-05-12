$cssFile = "css/style.css"
if ([System.IO.File]::Exists($cssFile)) {
    $css = [System.IO.File]::ReadAllText($cssFile)
    
    # 1. Update Fonts to iPhone System Stack
    $systemFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    $css = $css -replace "@import url\('https://fonts.googleapis.com[^']*'\);", ""
    $css = $css -replace "'Outfit', sans-serif", $systemFont
    $css = $css -replace "'Plus Jakarta Sans', sans-serif", $systemFont
    $css = $css -replace "font-family:\s*[^;!]*[Outfit|Jakarta][^;!]*;", "font-family: $systemFont;"

    # 2. Prune Animations (Remove from non-navigation elements)
    
    # Remove .card transitions/transforms
    $css = $css -replace '\.card\s*\{[^}]*transition:[^}]*\}', '.card { overflow: hidden; }'
    $css = $css -replace '\.card:hover\s*\{[^}]*transform:[^}]*\}', '.card:hover { }'
    
    # Remove .btn transitions (except simple hover)
    $css = $css -replace '\.btn\s*\{[^}]*transition:[^}]*\/\* Bouncy spring \*\/[^}]*\}', '.btn { position: relative; overflow: hidden; }'
    $css = $css -replace '\.btn:active\s*\{[^}]*transform: scale\(0.95\);[^}]*\}', '.btn:active { }'
    
    # Remove table row transitions
    $css = $css -replace 'table tr\s*\{[^}]*transition:[^}]*\}', 'table tr { }'
    $css = $css -replace 'table tr:hover\s*\{[^}]*transform: scale\(1.005\) translateX\(2px\);[^}]*\}', 'table tr:hover { background: rgba(124, 58, 237, 0.04) !important; }'

    # Remove global transitions for non-nav items
    $css = $css -replace '--transition:\s*all\s*0.22s\s*cubic-bezier\(0.4, 0, 0.2, 1\);', '--transition: none;'

    [System.IO.File]::WriteAllText($cssFile, $css, [System.Text.Encoding]::UTF8)
    Write-Host "Fonts updated to System UI and non-essential animations pruned."
}
else {
    Write-Host "style.css not found."
}
