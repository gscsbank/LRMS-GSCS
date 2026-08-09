$newNavLinks = @"
            <div class="nav-links" id="topNavLinks">
                <a href="index.html" class="nav-link"><i data-lucide="layout-dashboard"></i> <span>Dashboard</span></a>
                <a href="calendar.html" class="nav-link"><i data-lucide="calendar"></i> <span>Calendar</span></a>
                <a href="bulk-messenger.html" class="nav-link"><i data-lucide="send"></i> <span>Messenger</span></a>
                <a href="categories.html" class="nav-link"><i data-lucide="layers"></i> <span>Categories</span></a>
                <a href="reports.html" class="nav-link"><i data-lucide="file-bar-chart"></i> <span>Reports</span></a>
                <a href="letters.html" class="nav-link"><i data-lucide="file-text"></i> <span>Letters</span></a>
                <a href="field-visit.html" class="nav-link"><i data-lucide="map-pin"></i> <span>Field Visit</span></a>
                <a href="loan-restructuring.html" class="nav-link"><i data-lucide="refresh-cw"></i> <span>Restructuring</span></a>
                
                <div class="nav-dropdown">
                    <button class="nav-link dropdown-toggle"><i data-lucide="grid"></i> <span>More</span></button>
                    <div class="dropdown-menu">
                        <a href="reminders.html"><i data-lucide="bell"></i> Reminders</a>
                        <a href="calculator.html"><i data-lucide="calculator"></i> Calculator</a>
                        <a href="legal-actions.html"><i data-lucide="scale"></i> Legal Actions</a>
                        <a href="closed-loans.html"><i data-lucide="archive"></i> Closed Loans</a>
                        <a href="activity-log.html"><i data-lucide="list"></i> Activity Log</a>
                        <div style="border-top:1px solid var(--border); margin:4px 0"></div>
                        <a href="support.html"><i data-lucide="headphones"></i> Customer Care</a>
                        <a href="recycle-bin.html"><i data-lucide="trash-2"></i> Recycle Bin</a>
                    </div>
                </div>
            </div>
"@

$htmlFiles = Get-ChildItem -Filter *.html
foreach ($file in $htmlFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $pattern = '(?si)<div class="nav-links" id="topNavLinks">.*?(<div class="nav-dropdown">.*?</div>\s*</div>)\s*</div>'
    
    if ($content -match $pattern) {
        $content = $content -replace $pattern, $newNavLinks
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "Updated $($file.Name)"
    }
    else {
        Write-Host "Could not find nav block in $($file.Name)"
    }
}
