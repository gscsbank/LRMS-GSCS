$cssFile = "css/style.css"
if ([System.IO.File]::Exists($cssFile)) {
    $css = [System.IO.File]::ReadAllText($cssFile)
    
    # Update navigation and generic UI timings
    $css = $css -replace 'animation: slideDownNav 0.7s', 'animation: slideDownNav 1.5s'
    $css = $css -replace 'transition: transform 0.4s cubic-bezier', 'transition: transform 0.8s cubic-bezier'
    $css = $css -replace 'transition: all 0.4s cubic-bezier', 'transition: all 0.8s cubic-bezier'
    $css = $css -replace 'transition: all 0.3s cubic-bezier', 'transition: all 0.6s cubic-bezier'
    
    # Update nested/specific transitions
    $css = $css -replace 'transition: transform 0.6s ease', 'transition: transform 1.2s ease'
    $css = $css -replace 'transition: all 0.3s ease', 'transition: all 0.6s ease'
    $css = $css -replace 'transition: all 0.2s ease', 'transition: all 0.4s ease'
    $css = $css -replace 'transition: opacity 0.3s', 'transition: opacity 0.6s'
    
    # Update keyframe animation durations
    $css = $css -replace 'animation: floatLogo 3s', 'animation: floatLogo 6s'
    $css = $css -replace 'animation: shineText 3s', 'animation: shineText 6s'
    $css = $css -replace 'animation: pulseGlow 1s', 'animation: pulseGlow 2.5s'

    [System.IO.File]::WriteAllText($cssFile, $css, [System.Text.Encoding]::UTF8)
    Write-Host "Animation speeds have been reduced (slowed down) universally."
}
else {
    Write-Host "style.css not found."
}
