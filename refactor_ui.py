import os
import glob
import re

top_nav_html = """    <!-- Modern Top Navigation -->
    <nav class="modern-top-nav fade-in delay-1">
        <div class="nav-container">
            <div class="nav-logo">
                <img src="assets/logo.png" alt="Logo">
                <span class="nav-brand">Bank<span style="font-weight: 300; opacity: 0.7">System</span></span>
            </div>
            
            <button class="mobile-toggle" onclick="toggleMobileMenu()">
                <i data-lucide="menu"></i>
            </button>
            
            <div class="nav-links" id="topNavLinks">
                <button class="close-mobile" onclick="toggleMobileMenu()"><i data-lucide="x"></i></button>
                <a href="index.html" class="nav-link"><i data-lucide="layout-dashboard"></i> <span>Dashboard</span></a>
                <a href="calendar.html" class="nav-link"><i data-lucide="calendar"></i> <span>Calendar</span></a>
                <a href="bulk-messenger.html" class="nav-link"><i data-lucide="send"></i> <span>Messenger</span></a>
                <a href="categories.html" class="nav-link"><i data-lucide="layers"></i> <span>Categories</span></a>
                
                <!-- More Dropdown -->
                <div class="nav-dropdown">
                    <button class="nav-link dropdown-toggle"><i data-lucide="grid"></i> <span>More</span></button>
                    <div class="dropdown-menu">
                        <a href="reminders.html"><i data-lucide="bell"></i> Reminders</a>
                        <a href="calculator.html"><i data-lucide="calculator"></i> Calculator</a>
                        <a href="legal-actions.html"><i data-lucide="scale"></i> Legal Actions</a>
                        <a href="closed-loans.html"><i data-lucide="archive"></i> Closed Loans</a>
                        <a href="reports.html"><i data-lucide="file-bar-chart"></i> Reports</a>
                        <a href="activity-log.html"><i data-lucide="list"></i> Activity Log</a>
                        <hr>
                        <a href="recycle-bin.html"><i data-lucide="trash-2"></i> Recycle Bin</a>
                    </div>
                </div>
            </div>

            <div class="nav-right">
                <div class="nav-time no-print">
                    <i data-lucide="clock" style="width:16px;height:16px;opacity:0.6"></i>
                    <span id="currentTimeNav">00:00</span>
                </div>
                
                <div class="nav-dropdown">
                    <button class="profile-btn">
                        <div class="avatar"><i data-lucide="user"></i></div>
                    </button>
                    <div class="dropdown-menu align-right">
                        <div class="dropdown-header">
                            <div>
                                <strong>System User</strong>
                                <span>Welcome</span>
                            </div>
                        </div>
                        <hr>
                        <a href="#" onclick="handleBackup()"><i data-lucide="download-cloud"></i> Backup Data</a>
                        <a href="#" onclick="document.getElementById('restoreFile').click()"><i data-lucide="upload-cloud"></i> Restore Data</a>
                        <a href="admin.html" id="adminMenuLink" class="admin-only hidden"><i data-lucide="users"></i> Manage Users</a>
                        <a href="settings.html" id="settingsMenuLink" class="admin-only hidden"><i data-lucide="settings"></i> Settings</a>
                        <hr>
                        <a href="#" onclick="handleLogout()" class="text-red"><i data-lucide="log-out"></i> Logout</a>
                    </div>
                </div>
            </div>
        </div>
    </nav>
"""

html_files = glob.glob('*.html')

for file in html_files:
    if file == 'login.html':
        continue
        
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove the existing Sidebar completely
    content = re.sub(r'<!-- Sidebar -->.*?</aside>', '', content, flags=re.DOTALL)
    
    # Remove old body layout class if it existed
    content = content.replace('<body class="flex', '<body class="modern-body')
    
    # In index.html, remove mobile toggle button from top-header
    content = re.sub(r'<button class="mobile-toggle".*?</button>', '', content, flags=re.DOTALL)
    
    # We already have <main class="main-content">
    # Let's insert the modern-top-nav before <main class="main-content">
    if '<main class="main-content">' in content and 'modern-top-nav' not in content:
        content = content.replace('<main class="main-content">', top_nav_html + '\n    <!-- Main -->\n    <main class="main-content">')
        
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
        
print(f"Refactored {len(html_files)} HTML files for Top Nav.")
