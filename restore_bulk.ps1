$restoredContent = @"
    <main class="main-content">
        <header class="top-header">
            <div>
                <h2>Custom Bulk Messenger</h2>
                <p>Send personalized messages to multiple recipients</p>
            </div>
        </header>

        <div class="content-area">
            <div style="max-width: 800px; margin: 0 auto">
                <div class="card">
                    <div class="card-header">
                        <h3><i data-lucide="users" style="color:#7c3aed"></i> Selected Recipients</h3>
                    </div>
                    <div class="card-body">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <div id="recipientCount" class="text-sm font-bold text-violet-600">0 Recipients Selected</div>
                            <button onclick="clearRecipients()" class="btn btn-ghost" style="color: #ef4444; padding: 4px 10px; font-size: 0.75rem; display: none;" id="clearRecipientsBtn">
                                <i data-lucide="trash-2" style="width:14px;height:14px;"></i> Clear All
                            </button>
                        </div>
                        <div id="recipientList" class="recipient-list">
                            <!-- Recipients will be loaded here -->
                        </div>
                        <div class="mt-4 text-xs text-gray-500 italic">
                            * Selected from the Dashboard. If list is empty, go to Dashboard and select customers first.
                        </div>
                    </div>
                </div>

                <div class="card mt-6">
                    <div class="card-header">
                        <h3><i data-lucide="message-square" style="color:#7c3aed"></i> Message Editor</h3>
                    </div>
                    <div class="card-body">
                        <label class="form-label">Type your message here</label>
                        <textarea id="customMessage" class="form-input"
                            style="height: 150px; resize: none; margin-bottom: 16px"
                            placeholder="Enter the message you want to send..."></textarea>

                        <div class="grid grid-cols-2 gap-4">
                            <button id="sendWhatsApp" class="btn btn-primary"
                                style="background:#25d366; border:none; justify-content:center">
                                <i data-lucide="message-circle"></i> Send via WhatsApp
                            </button>
                            <button id="sendSMS" class="btn btn-primary"
                                style="background:#3b82f6; border:none; justify-content:center">
                                <i data-lucide="smartphone"></i> Send via SMS
                            </button>
                        </div>
                    </div>
                </div>

                <div id="statusLog" class="mt-6 hidden">
                    <div class="card">
                        <div class="card-header">
                            <h3>Sending Progress</h3>
                        </div>
                        <div id="logContent" class="card-body text-sm space-y-1"></div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script>
        {
            let selectedRecipients = [];

            window.initPage = async function() {
                if (typeof lucide !== 'undefined') lucide.createIcons();
                const stored = localStorage.getItem('selected_bulk_accounts');
                selectedRecipients = []; // Reset locally
                if (stored) {
                    try {
                        const accounts = JSON.parse(stored);
                        for (const acc of accounts) {
                            const customer = await getCustomerByAccountNo(acc);
                            if (customer) selectedRecipients.push(customer);
                        }
                    } catch (e) {
                        console.error("Error parsing bulk accounts", e);
                    }
                    renderRecipients();
                }
            }

            window.clearRecipients = function() {
                if (confirm('Are you sure you want to clear all selected recipients?')) {
                    selectedRecipients = [];
                    localStorage.removeItem('selected_bulk_accounts');
                    renderRecipients();
                }
            }

            window.renderRecipients = function() {
                const list = document.getElementById('recipientList');
                const count = document.getElementById('recipientCount');
                const clearBtn = document.getElementById('clearRecipientsBtn');
                if (!count || !list) return;
                
                count.innerText = `${selectedRecipients.length} Recipient(s) Selected`;

                if (selectedRecipients.length === 0) {
                    list.innerHTML = '<div class="text-gray-400 italic">No recipients selected. Go back to Dashboard.</div>';
                    if (clearBtn) clearBtn.style.display = 'none';
                    return;
                }
                
                if (clearBtn) clearBtn.style.display = 'flex';

                list.innerHTML = selectedRecipients.map(r => `
                    <div class="recipient-tag">
                        <i data-lucide="user" style="width:12px;height:12px"></i>
                        ${r.name} (${r.accountNo})
                    </div>
                `).join('');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }

            window.sendBulk = async function(type) {
                const cm = document.getElementById('customMessage');
                if (!cm) return;
                const message = cm.value.trim();
                if (!message) { alert("Please enter a message!"); return; }
                if (selectedRecipients.length === 0) { alert("No recipients selected!"); return; }

                if (!confirm(`Are you sure you want to send this message to ${selectedRecipients.length} customers via ${type.toUpperCase()}?`)) return;

                const sl = document.getElementById('statusLog');
                const log = document.getElementById('logContent');
                if (sl) sl.classList.remove('hidden');
                if (log) log.innerHTML = '';

                for (const c of selectedRecipients) {
                    if (!c.phone) {
                        if (log) log.innerHTML += `<div class="text-red-500">Skipped ${c.name}: No phone number</div>`;
                        continue;
                    }

                    const cleanPhone = c.phone.replace(/\D/g, '');
                    const encodedMsg = encodeURIComponent(message);

                    if (log) log.innerHTML += `<div class="text-violet-600">Sending to ${c.name}...</div>`;

                    if (type === 'whatsapp') {
                        window.open(`https://wa.me/${cleanPhone.startsWith('0') ? '94' + cleanPhone.substring(1) : cleanPhone}?text=${encodedMsg}`, '_blank');
                    } else {
                        const separator = (navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPod/i)) ? '&' : '?';
                        window.open(`sms:${cleanPhone}${separator}body=${encodedMsg}`, '_blank');
                    }

                    // Small delay to prevent browser blocking
                    await new Promise(r => setTimeout(r, 800));
                }

                if (log) log.innerHTML += `<div class="font-bold text-green-600 mt-2">Process completed!</div>`;
            }

            const sendWhatsApp = document.getElementById('sendWhatsApp');
            if (sendWhatsApp) {
                sendWhatsApp.onclick = () => sendBulk('whatsapp');
            }
            const sendSMS = document.getElementById('sendSMS');
            if (sendSMS) {
                sendSMS.onclick = () => sendBulk('sms');
            }
        }
    </script>
    <script src="js/app.js?v=3.12"></script>
</body>
</html>
"@

$content = [System.IO.File]::ReadAllText("bulk-messenger.html")
$content = $content -replace '(?si)<main class="main-content">.*', $restoredContent
[System.IO.File]::WriteAllText("bulk-messenger.html", $content, [System.Text.Encoding]::UTF8)

Write-Host "Restored bulk messenger."
