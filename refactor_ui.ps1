$topNavHtml = @"
    <!-- Modern Top Navigation -->
    <nav class="modern-top-nav">
        <div class="nav-container">
            <div class="nav-logo">
                <img src="assets/logo.png" alt="Logo">
                <span class="nav-brand">GSCS<span style="font-weight: 300; opacity: 0.7">Bank</span></span>
            </div>
            
            <div class="nav-links" id="topNavLinks">
                <a href="index.html" class="nav-link"><i data-lucide="layout-dashboard"></i> <span>Dashboard</span></a>
                <a href="calendar.html" class="nav-link"><i data-lucide="calendar"></i> <span>Calendar</span></a>
                <a href="bulk-messenger.html" class="nav-link"><i data-lucide="send"></i> <span>Messenger</span></a>
                <a href="categories.html" class="nav-link"><i data-lucide="layers"></i> <span>Categories</span></a>
                
                <div class="nav-dropdown">
                    <button class="nav-link dropdown-toggle"><i data-lucide="grid"></i> <span>More</span></button>
                    <div class="dropdown-menu">
                        <a href="reminders.html"><i data-lucide="bell"></i> Reminders</a>
                        <a href="calculator.html"><i data-lucide="calculator"></i> Calculator</a>
                        <a href="legal-actions.html"><i data-lucide="scale"></i> Legal Actions</a>
                        <a href="closed-loans.html"><i data-lucide="archive"></i> Closed Loans</a>
                        <a href="reports.html"><i data-lucide="file-bar-chart"></i> Reports</a>
                        <a href="activity-log.html"><i data-lucide="list"></i> Activity Log</a>
                        <div style="border-top:1px solid var(--border); margin:4px 0"></div>
                        <a href="recycle-bin.html"><i data-lucide="trash-2"></i> Recycle Bin</a>
                    </div>
                </div>
            </div>

            <div class="nav-right">
                <div class="nav-time no-print">
                    <div id="navTimeDisplay" style="font-weight:700; color:var(--text-primary); font-size:0.9rem">00:00</div>
                </div>
                
                <div class="nav-dropdown">
                    <button class="nav-circle-btn"><i data-lucide="user"></i></button>
                    <div class="dropdown-menu align-right" style="width:220px">
                        <div style="padding:12px; border-bottom:1px solid var(--border); margin-bottom:4px">
                            <strong style="display:block;color:var(--text-primary)">Administrator</strong>
                            <span style="font-size:0.75rem;color:var(--text-secondary)">Welcome back</span>
                        </div>
                        <a href="#" onclick="handleBackup()"><i data-lucide="download-cloud"></i> Backup Data</a>
                        <a href="#" onclick="document.getElementById('restoreFile').click()"><i data-lucide="upload-cloud"></i> Restore Data</a>
                        <a href="admin.html" id="adminMenuLink" class="admin-only hidden"><i data-lucide="users"></i> Manage Users</a>
                        <a href="settings.html" id="settingsMenuLink" class="admin-only hidden"><i data-lucide="settings"></i> Settings</a>
                        <div style="border-top:1px solid var(--border); margin:4px 0"></div>
                        <a href="#" onclick="handleLogout()" style="color:#ef4444"><i data-lucide="log-out"></i> Logout</a>
                    </div>
                </div>
            </div>
        </div>
    </nav>
"@

$files = Get-ChildItem -Filter *.html | Where-Object { $_.Name -ne "login.html" }
foreach ($file in $files) {
    if ([System.IO.File]::Exists($file.FullName)) {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        
        # Remove sidebar completely
        $content = $content -replace '(?si)<!-- Sidebar -->.*?</aside>', ''
        
        # Remove old mobile toggle from top-header
        $content = $content -replace '(?si)<button class="mobile-toggle".*?</button>', ''
        
        # insert top-nav before main-content if not already there
        if ($content -match '<main class="main-content">' -and $content -notmatch 'modern-top-nav') {
            $content = $content -replace '(?i)<main class="main-content">', "$topNavHtml`n    <!-- Main -->`n    <main class=`"main-content`">"
        }
        
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
    }
}

Write-Host "Updated HTML files."
