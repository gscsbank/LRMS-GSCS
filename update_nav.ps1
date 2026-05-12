$newNavLinks = @"
            <div class="nav-links" id="topNavLinks">
                <a href="index.html" class="nav-link"><i data-lucide="layout-dashboard"></i> <span>Dashboard</span></a>
                <a href="calendar.html" class="nav-link"><i data-lucide="calendar"></i> <span>Calendar</span></a>
                <a href="bulk-messenger.html" class="nav-link"><i data-lucide="send"></i> <span>Messenger</span></a>
                <a href="categories.html" class="nav-link"><i data-lucide="layers"></i> <span>Categories</span></a>
                <a href="reports.html" class="nav-link"><i data-lucide="file-bar-chart"></i> <span>Reports</span></a>
                
                <div class="nav-dropdown">
                    <button class="nav-link dropdown-toggle"><i data-lucide="grid"></i> <span>More</span></button>
                    <div class="dropdown-menu">
                        <a href="reminders.html"><i data-lucide="bell"></i> Reminders</a>
                        <a href="calculator.html"><i data-lucide="calculator"></i> Calculator</a>
                        <a href="legal-actions.html"><i data-lucide="scale"></i> Legal Actions</a>
                        <a href="closed-loans.html"><i data-lucide="archive"></i> Closed Loans</a>
                        <a href="activity-log.html"><i data-lucide="list"></i> Activity Log</a>
                        <div style="border-top:1px solid var(--border); margin:4px 0"></div>
                        <a href="recycle-bin.html"><i data-lucide="trash-2"></i> Recycle Bin</a>
                    </div>
                </div>
            </div>
"@

$htmlFiles = Get-ChildItem -Filter *.html
foreach ($file in $htmlFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    # Target the entire nav-links block using regex to handle variations in content/whitespace
    $pattern = '(?si)<div class="nav-links" id="topNavLinks">.*?</div>\s*</div>\s*</div>'
    # Wait, the closing tags might be different. Let's match up to the end of the nav-links div carefully.
    # The block ends with </div> (nav-links) then </div> (nav-dropdown menu) then </div> (nav-dropdown container)
    # Actually, let's match specifically the nav-links div content.
    
    $pattern = '(?si)<div class="nav-links" id="topNavLinks">.*?</div>\s*</div>'
    # Re-checking the structure in index.html:
    # <div class="nav-links" id="topNavLinks">
    #   ... links ...
    #   <div class="nav-dropdown">
    #     <button>...More...</button>
    #     <div class="dropdown-menu">
    #        ... dropdown links ...
    #     </div>
    #   </div>
    # </div>
    
    # Correct regex to match the outermost <div class="nav-links"> and its balanced content.
    # Since we know the structure is fairly consistent, we can match up to the specific closing of the nav-links div.
    
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
