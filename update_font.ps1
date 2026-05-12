$cssFile = "css/style.css"
if ([System.IO.File]::Exists($cssFile)) {
    $css = [System.IO.File]::ReadAllText($cssFile)
    
    # Replace Font API import URL
    $css = $css -replace 'family=Inter:wght[^&]*&family=Poppins:wght[^&]*', 'family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800'
    
    # Replace font families
    $css = $css -replace "'Inter', sans-serif", "'Outfit', sans-serif"
    $css = $css -replace "'Poppins', sans-serif", "'Plus Jakarta Sans', sans-serif"

    [System.IO.File]::WriteAllText($cssFile, $css, [System.Text.Encoding]::UTF8)
    Write-Host "Fonts updated to Outfit and Plus Jakarta Sans."
}
else {
    Write-Host "File not found!"
}
