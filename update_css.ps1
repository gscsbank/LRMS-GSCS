$cssAppend = @"

/* =====================================================
   MODERN UI REDESIGN OVERRIDES
   ===================================================== */
body.modern-body, body {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100vh;
    background: #f3f4f6;
}

.main-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    width: 100%;
}

/* Modern Top Navigation Glassmorphism */
.modern-top-nav {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05);
    flex-shrink: 0;
    z-index: 50;
    padding: 0 24px;
}

.nav-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 70px;
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;
}

.nav-logo {
    display: flex;
    align-items: center;
    gap: 12px;
}

.nav-logo img {
    height: 40px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.nav-brand {
    font-family: 'Poppins', sans-serif;
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--violet-900);
}

.nav-links {
    display: flex;
    align-items: center;
    gap: 8px;
}

.nav-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 999px;
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 0.9rem;
    text-decoration: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: transparent;
    border: none;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
}

.nav-link:hover {
    background: rgba(124, 58, 237, 0.1);
    color: var(--violet-700);
    transform: translateY(-2px);
}

.nav-link.active {
    background: var(--violet-600);
    color: #fff;
    box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
}

.nav-link.active i, .nav-link.active svg {
    color: #fff !important;
}

.nav-link svg, .nav-link i {
    width: 18px;
    height: 18px;
}

.nav-right {
    display: flex;
    align-items: center;
    gap: 20px;
}

.nav-time {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.5);
    padding: 6px 14px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.8);
}

.nav-dropdown {
    position: relative;
    cursor: pointer;
}

.dropdown-menu {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.8);
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    padding: 8px;
    min-width: 200px;
    opacity: 0;
    visibility: hidden;
    transform: translateY(10px) scale(0.95);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 100;
}

.nav-dropdown:hover .dropdown-menu,
.nav-dropdown:focus-within .dropdown-menu {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
}

.dropdown-menu.align-right {
    right: 0;
    left: auto;
}

.dropdown-menu a {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    color: var(--text-primary);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.85rem;
    border-radius: 10px;
    transition: all 0.2s ease;
}

.dropdown-menu a:hover {
    background: var(--violet-50);
    color: var(--violet-700);
    padding-left: 18px;
}

.dropdown-menu a i, .dropdown-menu a svg {
    width: 16px;
    height: 16px;
    color: var(--violet-500);
}

.dropdown-toggle {
    background: transparent;
    border: none;
    cursor: pointer;
}

.nav-circle-btn {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--violet-50), var(--violet-200));
    color: var(--violet-700);
    border: 2px solid #fff;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-circle-btn:hover {
    transform: scale(1.1) rotate(5deg);
    box-shadow: 0 6px 20px rgba(124, 58, 237, 0.25);
    background: linear-gradient(135deg, var(--violet-100), var(--violet-300));
}

.nav-circle-btn svg {
    width: 20px;
    height: 20px;
}

/* Enhancing Global Animations */
.card {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: center bottom;
}

.card:hover {
    transform: translateY(-4px) scale(1.005);
    box-shadow: 0 15px 35px rgba(124, 58, 237, 0.12);
}

.btn {
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy spring */
    position: relative;
    overflow: hidden;
}

.btn:active {
    transform: scale(0.95);
}

table tr {
    transition: all 0.3s ease;
}

table tr:hover {
    background: rgba(124, 58, 237, 0.04) !important;
    transform: scale(1.005) translateX(2px);
    box-shadow: 0 4px 15px rgba(124,58,237,0.05);
    border-radius: 8px;
}

/* Adding subtle glow to primary gradient buttons */
.btn-primary::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
}

.btn-primary:hover::after {
    opacity: 1;
}

/* Restyling .top-header since sidebar is gone */
.top-header {
    background: transparent;
    backdrop-filter: none;
    border-bottom: none;
    padding: 24px 32px 10px;
}
"@

Add-Content -Path "css/style.css" -Value $cssAppend -Encoding UTF8
Write-Host "Injected modern CSS styles into style.css"
