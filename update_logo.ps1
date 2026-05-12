$newLogoHtml = @"
            <div class="nav-logo">
                <div class="logo-wrapper">
                    <img src="assets/logo.png" alt="Logo">
                </div>
                <div class="brand-info">
                    <span class="nav-brand">GSCS Bank</span>
                    <span class="system-name">Loan Recovery System</span>
                    <span class="powered-by">Powered by <span class="power-glow">Iraasoft</span></span>
                </div>
            </div>
"@

$files = Get-ChildItem -Filter *.html | Where-Object { $_.Name -ne "login.html" }
foreach ($file in $files) {
    if ([System.IO.File]::Exists($file.FullName)) {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        
        # We need to replace the exact old nav-logo block
        # Using a regex that matches the div and its contents exactly.
        $content = $content -replace '(?si)<div class="nav-logo">\s*<img src="assets/logo\.png"[^>]*>\s*<span class="nav-brand">[^<]*<span[^>]*>[^<]*</span></span>\s*</div>', $newLogoHtml
        
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    }
}

$cssAppend = @"

/* =====================================================
   DYNAMIC LOGO BRANDING ANIMATIONS
   ===================================================== */
.nav-logo {
    display: flex;
    align-items: center;
    gap: 14px;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.3s ease;
}

.nav-logo:hover {
    transform: translateX(4px);
}

.logo-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.logo-wrapper img {
    height: 48px;
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
    animation: floatLogo 3s ease-in-out infinite;
}

@keyframes floatLogo {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-3px) scale(1.05); filter: drop-shadow(0 8px 12px rgba(124, 58, 237, 0.2)); }
}

.brand-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    line-height: 1.1;
}

.nav-brand {
    font-family: 'Poppins', sans-serif;
    font-size: 1.3rem;
    font-weight: 800;
    background: linear-gradient(90deg, #4c1d95, #7c3aed, #4c1d95);
    background-size: 200% auto;
    color: transparent;
    -webkit-background-clip: text;
    background-clip: text;
    animation: shineText 3s linear infinite;
    letter-spacing: -0.02em;
}

@keyframes shineText {
    to { background-position: 200% center; }
}

.system-name {
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-top: 2px;
}

.powered-by {
    font-size: 0.6rem;
    color: var(--text-muted);
    font-weight: 600;
    margin-top: 2px;
    letter-spacing: 0.04em;
}

.power-glow {
    color: var(--violet-600);
    font-weight: 800;
    position: relative;
    display: inline-block;
    transition: all 0.3s ease;
}

.nav-logo:hover .power-glow {
    animation: pulseGlow 1s ease-in-out infinite;
}

@keyframes pulseGlow {
    0%, 100% { text-shadow: 0 0 4px rgba(124,58,237,0.2); }
    50% { text-shadow: 0 0 12px rgba(124,58,237,0.7); }
}
"@

Add-Content -Path "css/style.css" -Value $cssAppend -Encoding UTF8
Write-Host "Updated HTML files and injected new logo CSS"
