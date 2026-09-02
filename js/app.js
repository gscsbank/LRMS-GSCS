// js/app.js
console.log("LRMS Script Version: 3.22 - LOAN_ACTION_ISOLATION");

// Global Data Cache
window.lrmsCache = {
    customers: null,
    actions: {}, // AccountNo -> Actions[]
    lastUpdated: null
};

function invalidateCache(type = 'all', accountNo = null) {
    if (type === 'all' || type === 'customers') {
        window.lrmsCache.customers = null;
    }
    if (type === 'all' || type === 'actions') {
        window.lrmsCache.actions = {};
    } else if (accountNo && window.lrmsCache.actions) {
        const clean = String(accountNo).trim();
        for (const k of Object.keys(window.lrmsCache.actions)) {
            if (k === clean || k.includes(clean)) {
                delete window.lrmsCache.actions[k];
            }
        }
    }
    window.lrmsCache.lastUpdated = null;
}

// UI Helper for status updates
function setRestoreStatus(msg, isError = false) {
    console.log("STATUS:", msg);
    const el = document.getElementById('restoreStatus');
    if (el) {
        el.innerText = msg;
        el.style.color = isError ? '#ef4444' : '#7c3aed';
    }
}

// Global Sidebar Toggle for Mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    sidebar.classList.toggle('open');

    // Manage overlay
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = toggleSidebar;
        document.body.appendChild(overlay);
    }

    if (sidebar.classList.contains('open')) {
        overlay.style.display = 'block';
    } else {
        overlay.style.display = 'none';
    }
}

// Proactive Database Health Check
async function checkDatabaseHealth() {
    console.log("Running Offline DB Health Check...");
    try {
        if (!window.db) throw new Error("Database wrapper not found");
        await window.db.getDB();
        console.log("Offline DB Health: OK");
        return true;
    } catch (err) {
        console.error("Offline DB Health Check FAILED:", err);
        setRestoreStatus("❌ Database Error: " + err.message, true);
        return false;
    }
}

// Hoisted Charts Function
async function initDashboardCharts() {
    console.log("Charts: Initializing...");
    try {
        const customers = await getAllCustomers();
        if (!customers || customers.length === 0) { console.warn("No customers for charts."); return; }
        const statusCounts = {};
        customers.forEach(c => { const s = c.status || 'Unknown'; statusCounts[s] = (statusCounts[s] || 0) + 1; });
        const ctx = document.getElementById('statusChart')?.getContext('2d');
        if (ctx) {
            if (window.myStatusChart) window.myStatusChart.destroy();
            window.myStatusChart = new Chart(ctx, {
                type: 'doughnut',
                data: { labels: Object.keys(statusCounts), datasets: [{ data: Object.values(statusCounts), backgroundColor: ['#c084fc', '#fcd34d', '#f87171', '#60a5fa', '#34d399'] }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } }
            });
        }

        const catCounts = {};
        customers.forEach(c => { const cat = c.category || 'Other'; catCounts[cat] = (catCounts[cat] || 0) + 1; });
        const catCtx = document.getElementById('categoryChart')?.getContext('2d');
        if (catCtx) {
            if (window.myCatChart) window.myCatChart.destroy();
            window.myCatChart = new Chart(catCtx, {
                type: 'bar',
                data: { labels: Object.keys(catCounts), datasets: [{ label: 'Customers', data: Object.values(catCounts), backgroundColor: '#7c3aed', borderRadius: 6 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
            });
        }
        await loadPriorityReminders();
    } catch (e) { console.error("Chart Error:", e); }
}

// ---- Authentication Guard ----
// If not on the login page, check for session token.
const isOnLoginPage = window.location.pathname.includes('login.html') || window.location.pathname.endsWith('/login');
if (!isOnLoginPage) {
    if (sessionStorage.getItem('lrms_auth') !== 'true') {
        window.location.replace('login.html');
    }
}

// Global Logout Handler
window.handleLogout = function () {
    sessionStorage.removeItem('lrms_auth');
    sessionStorage.removeItem('lrms_user');
    sessionStorage.removeItem('lrms_role');
    window.location.replace('login.html');
};

// ---- Premium LRMS Global Notifications ----

window.lrmsAlert = function (message, title = 'Notification') {
    return new Promise((resolve) => {
        const modalId = 'lrms-alert-' + Date.now();
        const modalHtml = `
            <div class="modal-wrapper open" id="${modalId}" style="z-index: 9999;">
                <div class="modal-backdrop" id="${modalId}-backdrop"></div>
                <div class="modal-box" style="max-width: 420px; text-align: center; border: none; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 60px -10px rgba(30,27,75,0.45);">
                    <div class="modal-header" style="background: linear-gradient(135deg, #1e1b4b 0%, #311b92 100%); color: white; border: none; padding: 18px 24px; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <div style="background: rgba(255,255,255,0.15); border-radius: 10px; padding: 6px; display: flex; align-items: center; justify-content: center;">
                            <i data-lucide="bell" style="width:20px;height:20px;color:#c4b5fd"></i>
                        </div>
                        <h3 style="color: white; margin: 0; font-weight: 700; font-size: 1.1rem; letter-spacing: 0.02em;">${title}</h3>
                    </div>
                    <div class="modal-body" style="padding: 28px 24px;">
                        <p style="color: #1e293b; font-size: 0.95rem; line-height: 1.6; margin: 0; font-weight: 500;">${message}</p>
                    </div>
                    <div class="modal-footer" style="border: none; padding: 0 24px 24px; justify-content: center;">
                        <button id="${modalId}-ok" class="btn" style="min-width: 140px; justify-content: center; padding: 10px 28px; background: linear-gradient(135deg, #7c3aed, #4c1d95); color: #ffffff; border: none; border-radius: 12px; font-weight: 700; font-size: 0.9rem; box-shadow: 0 4px 16px rgba(124,58,237,0.35); cursor: pointer;">OK</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById(modalId);
        const close = () => { modal.remove(); resolve(); };
        document.getElementById(`${modalId}-ok`).onclick = close;
        document.getElementById(`${modalId}-backdrop`).onclick = close;
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: modal });
    });
};

window.lrmsConfirm = function (message, title = 'Confirmation') {
    return new Promise((resolve) => {
        const modalId = 'lrms-confirm-' + Date.now();
        const modalHtml = `
            <div class="modal-wrapper open" id="${modalId}" style="z-index: 9999;">
                <div class="modal-backdrop" id="${modalId}-backdrop"></div>
                <div class="modal-box" style="max-width: 440px; text-align: center; border: none; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 60px -10px rgba(30,27,75,0.45);">
                    <div class="modal-header" style="background: linear-gradient(135deg, #1e1b4b 0%, #311b92 100%); color: white; border: none; padding: 18px 24px; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <div style="background: rgba(255,255,255,0.15); border-radius: 10px; padding: 6px; display: flex; align-items: center; justify-content: center;">
                            <i data-lucide="help-circle" style="width:20px;height:20px;color:#c4b5fd"></i>
                        </div>
                        <h3 style="color: white; margin: 0; font-weight: 700; font-size: 1.1rem; letter-spacing: 0.02em;">${title}</h3>
                    </div>
                    <div class="modal-body" style="padding: 28px 24px;">
                        <p style="color: #1e293b; font-size: 0.95rem; line-height: 1.6; margin: 0; font-weight: 500;">${message}</p>
                    </div>
                    <div class="modal-footer" style="border: none; padding: 0 24px 24px; justify-content: center; gap: 12px;">
                        <button id="${modalId}-cancel" class="btn" style="min-width: 110px; justify-content: center; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 12px; font-weight: 600; cursor: pointer;">Cancel</button>
                        <button id="${modalId}-confirm" class="btn" style="min-width: 110px; justify-content: center; background: linear-gradient(135deg, #7c3aed, #4c1d95); color: #ffffff; border: none; border-radius: 12px; font-weight: 700; box-shadow: 0 4px 16px rgba(124,58,237,0.35); cursor: pointer;">Confirm</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById(modalId);
        document.getElementById(`${modalId}-cancel`).onclick = () => { modal.remove(); resolve(false); };
        document.getElementById(`${modalId}-confirm`).onclick = () => { modal.remove(); resolve(true); };
        document.getElementById(`${modalId}-backdrop`).onclick = () => { modal.remove(); resolve(false); };
        if (typeof lucide !== 'undefined') lucide.createIcons({ root: modal });
    });
};

// Global Backup Handler (Two-Step High-Reliability Flow)
window.handleBackup = async function () {
    try {
        console.log("Backup: Exporting data...");
        const dataStr = await exportDatabase();
        if (!dataStr) { await lrmsAlert("Failed to create backup."); return; }

        const dateStr = new Date().toISOString().split('T')[0];
        const defaultFilename = `lrms_backup_${dateStr}.json`;

        // Create Dynamic Modal using a safer method (DocumentFragment)
        const modalId = 'backup-safe-modal-' + Date.now();
        const modalHtml = `
            <div class="modal-wrapper open" id="${modalId}">
                <div class="modal-backdrop" onclick="document.getElementById('${modalId}').remove()"></div>
                <div class="modal-box" style="max-width: 400px; text-align: center;">
                    <div class="modal-header">
                        <h3><i data-lucide="download-cloud"></i> Backup Ready</h3>
                        <button class="modal-close" onclick="document.getElementById('${modalId}').remove()"><i data-lucide="x"></i></button>
                    </div>
                    <div class="modal-body" style="padding: 30px;">
                        <div style="background: var(--violet-50); width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                            <i data-lucide="file-json" style="width: 32px; height: 32px; color: var(--violet-600);"></i>
                        </div>
                        <p style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">Export Complete!</p>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 24px;">Your backup file is prepared and ready to save.</p>
                        
                        <button id="btn-trigger-save" class="btn btn-primary" style="width: 100%; justify-content: center; padding: 12px; height: auto;">
                            <i data-lucide="save"></i> Save Backup Now
                        </button>
                    </div>
                </div>
            </div>
        `;

        const range = document.createRange();
        const fragment = range.createContextualFragment(modalHtml);
        const modalEl = fragment.querySelector('.modal-wrapper');
        document.body.appendChild(fragment);

        // Scope lucide icons to the new modal properly
        if (typeof lucide !== 'undefined' && modalEl) {
            lucide.createIcons({ root: modalEl });
        }

        const saveBtn = document.getElementById('btn-trigger-save');
        if (!saveBtn) throw new Error("Save button not found in modal");

        saveBtn.onclick = async () => {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Processing...';
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: saveBtn });

            try {
                if (window.showSaveFilePicker) {
                    try {
                        const fh = await window.showSaveFilePicker({
                            suggestedName: defaultFilename,
                            types: [{ description: 'JSON Backup Files', accept: { 'application/json': ['.json'] } }]
                        });
                        const w = await fh.createWritable();
                        await w.write(dataStr);
                        await w.close();
                        const el = document.getElementById(modalId);
                        if (el) el.remove();
                        await lrmsAlert("Backup saved successfully!");
                        return;
                    } catch (err) {
                        if (err.name === 'AbortError') throw err;
                        console.warn("Save File Picker failed:", err);
                    }
                }

                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = defaultFilename;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 1000);

                const el = document.getElementById(modalId);
                if (el) el.remove();
                await lrmsAlert("Backup file (" + defaultFilename + ") has been sent to your Downloads folder.");
            } catch (err) {
                if (err.name === 'AbortError') {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i data-lucide="save"></i> Save Backup Now';
                    if (typeof lucide !== 'undefined') lucide.createIcons({ root: saveBtn });
                    return;
                }
                await lrmsAlert("Save error: " + err.message);
            }
        };

    } catch (err) {
        console.error("BACKUP PREP ERROR:", err);
        await lrmsAlert("Preparation Error: " + err.message);
    }
};

// Global Restore Handler
window.handleRestore = async function (event) {
    const file = event.target.files[0]; if (!file) return;
    if (await lrmsConfirm("WARNING: This will PERMANENTLY ERASE ALL CURRENT LOCAL DATA and replace it with this backup. Proceed?")) {
        const reader = new FileReader();
        reader.onload = async e => {
            const cleared = await clearDatabase();
            if (!cleared) { await lrmsAlert("Failed to clear existing data. Restore aborted."); return; }
            const success = await importDatabase(e.target.result);
            if (success) { await lrmsAlert("Restored Successfully!"); window.location.reload(); }
        };
        reader.readAsText(file);
    }
    event.target.value = '';
};

// Admin Menu Visibility
window.checkAdmin = function () {
    const role = sessionStorage.getItem('lrms_role');
    if (role === 'admin') {
        document.getElementById('adminMenuLink')?.classList.remove('hidden');
        document.getElementById('settingsMenuLink')?.classList.remove('hidden');
    }
};

// Initialize Local DB is handled in js/db.js
// The global 'db' variable refers to the IndexedDB wrapper

// Helper Function: Add new customer
async function addCustomer(customerData) {
    console.log("Adding customer record:", customerData.accountNo);
    try {
        if (customerData.accountNo) {
            customerData.accountNo = customerData.accountNo.toString().trim();
        }
        const todayStr = new Date().toISOString().split('T')[0];
        if (!customerData.addedDate) customerData.addedDate = todayStr;
        if (!customerData.createdDate) customerData.createdDate = todayStr;

        await window.db.add("customers", customerData);
        invalidateCache('customers');
        await logActivity("Add Customer", `Added customer: ${customerData.name} (${customerData.accountNo})`, "success");
        await lrmsAlert("Successfully saved!");
        return true;
    } catch (error) {
        console.error("CRITICAL DB ERROR (Add):", error);
        await lrmsAlert("Database Error: " + error.message);
        return false;
    }
}

// Helper Function: Get all customers
async function getAllCustomers(forceRefresh = false) {
    if (!forceRefresh && window.lrmsCache.customers) {
        console.log("Cache Hit: getAllCustomers");
        return window.lrmsCache.customers;
    }

    try {
        console.log("Fetching Customers from DB...");
        const allDocs = await window.db.getAll("customers");
        const customers = allDocs.filter(c => c.isDeleted !== true && c.isDeleted !== "true");

        window.lrmsCache.customers = customers;
        window.lrmsCache.lastUpdated = new Date();
        return customers;
    } catch (error) {
        console.error("Error fetching customers:", error);
        return [];
    }
}

// Helper Function: Get customer by Account No (supports Loan Account No or Member Account No)
async function getCustomerByAccountNo(accountNo) {
    if (!accountNo) return null;
    const cleanAcc = accountNo.toString().trim();
    const cleanDigits = digitsOnly(cleanAcc);

    // Check Cache
    if (window.lrmsCache.customers) {
        // 1. Try exact or digit match on loanAccountNo first
        const foundLoan = window.lrmsCache.customers.find(c =>
            (c.loanAccountNo || "").toString().trim().toLowerCase() === cleanAcc.toLowerCase() ||
            (cleanDigits && cleanDigits.length >= 6 && digitsOnly(c.loanAccountNo) === cleanDigits)
        );
        if (foundLoan) return foundLoan;

        // 2. Try member accountNo
        const foundMember = window.lrmsCache.customers.find(c =>
            (c.accountNo || "").toString().trim() === cleanAcc ||
            Number(c.accountNo) === Number(cleanAcc) ||
            (cleanDigits && digitsOnly(c.accountNo) === cleanDigits)
        );
        if (foundMember) return foundMember;
    }

    try {
        console.log("Fetching Customer from DB:", cleanAcc);
        const allDocs = await window.db.getAll("customers");
        const active = (allDocs || []).filter(c => !c.isDeleted && c.isDeleted !== 'true');

        // 1. Try loanAccountNo match
        const matchLoan = active.find(c =>
            (c.loanAccountNo || "").toString().trim().toLowerCase() === cleanAcc.toLowerCase() ||
            (cleanDigits && cleanDigits.length >= 6 && digitsOnly(c.loanAccountNo) === cleanDigits)
        );
        if (matchLoan) return matchLoan;

        // 2. Try member accountNo match
        const matchMember = active.find(c =>
            (c.accountNo || "").toString().trim() === cleanAcc ||
            Number(c.accountNo) === Number(cleanAcc) ||
            (cleanDigits && digitsOnly(c.accountNo) === cleanDigits)
        );
        return matchMember || null;
    } catch (error) {
        console.error("Error fetching customer:", error);
        return null;
    }
}

// Helper Function: Get customer by internal unique ID (for multi-loan customers with same accountNo)
async function getCustomerById(id) {
    if (!id) return null;
    try {
        // Check cache first
        if (window.lrmsCache.customers) {
            const found = window.lrmsCache.customers.find(c => c.id === id);
            if (found) return found;
        }
        const record = await window.db.get("customers", id);
        return (record && !record.isDeleted && record.isDeleted !== 'true') ? record : null;
    } catch (error) {
        console.error("Error fetching customer by ID:", error);
        return null;
    }
}


// Helper Function: Extract only digits from string
function digitsOnly(str) {
    return String(str || '').replace(/[^0-9]/g, '');
}

// Helper Function: Add recovery action
async function addAction(actionData) {
    try {
        await window.db.add("actions", actionData);
        invalidateCache('actions');
        const displayAcc = actionData.loanAccountNo || actionData.customerAccountNo;
        await logActivity("Log Action", `Logged ${actionData.actionType} for Loan: ${displayAcc}`, "info");
        console.log("Action recorded successfully!");
        return true;
    } catch (error) {
        console.error("Error adding action:", error);
        return false;
    }
}

// Helper Function: Get actions for a customer / loan account
async function getCustomerActions(accountNo, customerId = null, loanAccountNo = null, forceRefresh = false) {
    if (!accountNo && !customerId && !loanAccountNo) return [];
    const cleanAcc = (accountNo || '').toString().trim();
    const cleanLoanAcc = (loanAccountNo || '').toString().trim();
    const cleanCustId = customerId ? String(customerId).trim() : null;
    const accDigits = digitsOnly(cleanAcc);
    const loanAccDigits = digitsOnly(cleanLoanAcc);

    const cacheKey = cleanCustId ? `id_${cleanCustId}` : (cleanLoanAcc ? `loan_${cleanLoanAcc}` : `acc_${cleanAcc}`);

    if (!forceRefresh && window.lrmsCache && window.lrmsCache.actions && window.lrmsCache.actions[cacheKey]) {
        console.log("Cache Hit: getCustomerActions", cacheKey);
        return window.lrmsCache.actions[cacheKey];
    }

    try {
        console.log("Fetching Actions from DB:", cleanAcc, cleanCustId, cleanLoanAcc);
        
        // Fetch all actions from DB to guarantee no records are missed
        const allDocs = await window.db.getAll("actions");
        
        let actions = (allDocs || []).filter(a => {
            if (!a || a.isDeleted === true || a.isDeleted === 'true') return false;
            
            const aAcc = String(a.customerAccountNo || '').trim();
            const aLoan = String(a.loanAccountNo || '').trim();
            const aCustId = a.customerId ? String(a.customerId).trim() : null;
            const aAccDigits = digitsOnly(aAcc);
            const aLoanDigits = digitsOnly(aLoan);

            // 1. Direct Customer ID Match (exact unique loan record in DB)
            if (cleanCustId && aCustId && aCustId === cleanCustId) {
                return true;
            }

            // 2. Direct Loan Account Number Match (strict loan isolation)
            if (cleanLoanAcc) {
                if (aLoan) {
                    return aLoan.toLowerCase() === cleanLoanAcc.toLowerCase() || 
                           (loanAccDigits && aLoanDigits && loanAccDigits.length >= 6 && aLoanDigits.length >= 6 && loanAccDigits === aLoanDigits);
                }
                // If the action has a customerId that doesn't match, it belongs to another loan
                if (aCustId && cleanCustId && aCustId !== cleanCustId) {
                    return false;
                }
                // Legacy action (no loanAccountNo and no customerId): preserve for this member
                if (!aLoan && !aCustId && cleanAcc) {
                    return aAcc === cleanAcc || (accDigits && aAccDigits && accDigits === aAccDigits);
                }
                return false;
            }

            // 3. Match by customerId when cleanLoanAcc is not directly passed
            if (cleanCustId) {
                if (aLoan && cleanLoanAcc) {
                    return aLoan.toLowerCase() === cleanLoanAcc.toLowerCase() || 
                           (loanAccDigits && aLoanDigits && loanAccDigits.length >= 6 && aLoanDigits.length >= 6 && loanAccDigits === aLoanDigits);
                }
                // Legacy action
                if (!aLoan && !aCustId && cleanAcc) {
                    return aAcc === cleanAcc || (accDigits && aAccDigits && accDigits === aAccDigits);
                }
                return false;
            }

            // 4. Fallback: If only member accountNo is provided (e.g. general member summary):
            if (cleanAcc) {
                return (aAcc && (aAcc === cleanAcc || (accDigits && aAccDigits && accDigits === aAccDigits))) ||
                       (aLoan && (aLoan === cleanAcc || (accDigits && aLoanDigits && accDigits === aLoanDigits)));
            }

            return false;
        });

        // Deduplicate by action ID
        const actionMap = new Map();
        actions.forEach(a => { if (a && a.id) actionMap.set(a.id, a); });
        actions = Array.from(actionMap.values());

        // Sort latest first
        actions.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        if (!window.lrmsCache) window.lrmsCache = {};
        if (!window.lrmsCache.actions) window.lrmsCache.actions = {};
        window.lrmsCache.actions[cacheKey] = actions;
        return actions;
    } catch (error) {
        console.error("Error fetching actions:", error);
        return [];
    }
}

// Alias for backwards compatibility
const getActionsForCustomer = getCustomerActions;

// Helper Function: Update Customer Status
async function updateCustomerStatus(accountNo, newStatus, statusDate, customerId = null) {
    try {
        let customer = null;
        if (customerId && typeof getCustomerById === 'function') {
            customer = await getCustomerById(customerId);
        }
        if (!customer && accountNo) {
            customer = await getCustomerByAccountNo(accountNo);
        }
        if (customer) {
            await window.db.update("customers", customer.id, {
                status: newStatus,
                statusDate: statusDate || new Date().toISOString().split('T')[0]
            });
            invalidateCache('customers');
            await logActivity("Update Status", `Updated status for ${customer.name} to ${newStatus} (${statusDate})`, "info");
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error updating status:", error);
        return false;
    }
}

// Helper Function: Get Customers by Status
async function getCustomersByStatus(status) {
    try {
        const allDocs = await window.db.getAll("customers");
        return allDocs.filter(c => c.status === status && c.isDeleted !== true && c.isDeleted !== "true");
    } catch (error) {
        console.error("Error fetching customers by status:", error);
        return [];
    }
}

// Helper Function: Edit Customer
async function updateCustomer(accountNo, updatedData, customerId = null) {
    try {
        let customer = null;
        if (customerId && typeof getCustomerById === 'function') {
            customer = await getCustomerById(customerId);
        }
        if (!customer && accountNo) {
            customer = await getCustomerByAccountNo(accountNo);
        }
        if (customer) {
            // Merge: keep all existing fields, only overwrite what is in updatedData
            const merged = { ...customer, ...updatedData };
            await window.db.update("customers", customer.id, merged);
            invalidateCache('customers');
            return true;
        }
        return false;
    } catch (error) {
        console.error("Error updating customer:", error);
        return false;
    }
}

// Helper Function: Delete Customer (Soft Delete)
async function deleteCustomer(accountNo, customerId = null) {
    try {
        let customer = null;
        if (customerId && typeof getCustomerById === 'function') {
            customer = await getCustomerById(customerId);
        }
        if (!customer && accountNo) {
            customer = await getCustomerByAccountNo(accountNo);
        }
        if (customer) {
            await window.db.update("customers", customer.id, {
                isDeleted: true,
                deletedAt: new Date().toISOString()
            });
            invalidateCache('customers');
            await logActivity("Delete Customer", `Deleted customer: ${customer.name} (${accountNo})`, "danger");
            return true;
        } else {
            console.warn("Soft delete failed to find customer by standard query. Trying fallback...");
            const allDocs = await window.db.getAll("customers");
            const found = allDocs.find(d => {
                const dAcc = (d.accountNo || "").toString().trim();
                const sAcc = (accountNo || "").toString().trim();
                return (dAcc === sAcc || Number(dAcc) === Number(sAcc)) && !d.isDeleted;
            });
            if (found) {
                await window.db.update("customers", found.id, { isDeleted: true, deletedAt: new Date().toISOString() });
                invalidateCache('customers');
                await logActivity("Delete Customer", `Deleted customer: ${found.name} (${accountNo})`, "danger");
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error("Error deleting customer:", error);
        return false;
    }
}

// Helper Function: Get Deleted Customers
async function getDeletedCustomers() {
    try {
        const allDocs = await window.db.getAll("customers");
        return allDocs.filter(c => c.isDeleted === true || c.isDeleted === "true");
    } catch (error) {
        console.error("Error fetching deleted customers:", error);
        return [];
    }
}

// Helper Function: Restore a Soft-Deleted Customer
async function restoreCustomer(docId) {
    try {
        const data = await window.db.get("customers", docId);
        if (!data) throw new Error("Customer not found in DB");
        await window.db.update("customers", docId, {
            isDeleted: null,
            deletedAt: null
        });
        invalidateCache('customers');
        await logActivity("Restore Customer", `Restored customer: ${data.name} (${data.accountNo})`, "info");
        return true;
    } catch (error) {
        console.error("Error restoring customer:", error);
        return false;
    }
}

// Helper Function: Delete Customer Permanently (and associated Actions & Documents)
async function permanentlyDeleteCustomer(docId, accountNo) {
    try {
        if (!docId) throw new Error("docId is required for permanent deletion.");

        const cleanAcc = (accountNo || '').toString().trim();
        const targetCust = await window.db.get("customers", docId);
        const targetLoanAcc = targetCust && targetCust.loanAccountNo ? String(targetCust.loanAccountNo).trim() : null;

        // 1. Delete Customer Doc
        await window.db.delete("customers", docId);

        // Check if customer has other remaining loans
        const remainingCusts = await window.db.getAll("customers");
        const hasOtherLoans = remainingCusts.some(c => c.id !== docId && String(c.accountNo || '').trim() === cleanAcc);

        // 2. Delete associated actions
        const allActions = await window.db.getAll("actions");
        for (const action of allActions) {
            const aCustId = action.customerId ? String(action.customerId).trim() : null;
            const aLoan = action.loanAccountNo ? String(action.loanAccountNo).trim() : null;
            const aAcc = (action.customerAccountNo || "").toString().trim();

            if (aCustId && aCustId === docId) {
                await window.db.delete("actions", action.id);
            } else if (!aCustId && targetLoanAcc && aLoan && aLoan === targetLoanAcc) {
                await window.db.delete("actions", action.id);
            } else if (!hasOtherLoans && (aAcc === cleanAcc || Number(aAcc) === Number(cleanAcc))) {
                await window.db.delete("actions", action.id);
            }
        }

        // 3. Delete associated documents
        const allDocs = await window.db.getAll("documents");
        for (const doc of allDocs) {
            const dCustId = doc.customerId ? String(doc.customerId).trim() : null;
            const dLoan = doc.loanAccountNo ? String(doc.loanAccountNo).trim() : null;
            const dAcc = (doc.customerAccountNo || "").toString().trim();

            if (dCustId && dCustId === docId) {
                await window.db.delete("documents", doc.id);
            } else if (!dCustId && targetLoanAcc && dLoan && dLoan === targetLoanAcc) {
                await window.db.delete("documents", doc.id);
            } else if (!hasOtherLoans && (dAcc === cleanAcc || Number(dAcc) === Number(cleanAcc))) {
                await window.db.delete("documents", doc.id);
            }
        }

        await logActivity("Permanent Delete", `Hard deleted customer and all data for Doc: ${docId} (Acc: ${accountNo})`, "danger");
        return true;
    } catch (error) {
        console.error("CRITICAL ERROR in permanentlyDeleteCustomer:", error);
        await lrmsAlert("Deletion Error details: " + error.message);
        return false;
    }
}

// Helper Function: Get All Pending Follow-ups (Past due or due today)
async function getPendingFollowUps() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const allActions = await window.db.getAll("actions");
        return allActions.filter(a => a.followUpDate && a.followUpDate <= today && !a.isDeleted);
    } catch (error) {
        console.error("Error fetching follow-ups:", error);
        return [];
    }
}

// Helper Function: Clear Follow-up (Mark as done/dismiss)
async function clearFollowUp(actionId) {
    try {
        await window.db.update("actions", actionId, { followUpDate: null });
        return true;
    } catch (error) {
        console.error("Error clearing follow-up:", error);
        return false;
    }
}

// Helper Function: Update an existing action record
async function updateAction(actionId, updatedData) {
    try {
        await window.db.update("actions", actionId, updatedData);
        return true;
    } catch (error) {
        console.error("Error updating action:", error);
        return false;
    }
}

// Helper Function: Delete Action (Soft Delete)
async function deleteAction(actionId) {
    try {
        const data = await window.db.get("actions", actionId);
        if (!data) throw new Error("Action not found in DB");
        await window.db.update("actions", actionId, {
            isDeleted: true,
            deletedAt: new Date().toISOString()
        });
        await logActivity("Delete Action", `Deleted history item for Acc: ${data.customerAccountNo}`, "warning");
        return true;
    } catch (error) {
        console.error("Error deleting action:", error);
        return false;
    }
}

// Helper Function: Get Deleted Actions
async function getDeletedActions() {
    try {
        const allActions = await window.db.getAll("actions");
        return allActions.filter(a => a.isDeleted === true || a.isDeleted === "true");
    } catch (error) {
        console.error("Error fetching deleted actions:", error);
        return [];
    }
}

// Helper Function: Restore a Soft-Deleted Action
async function restoreAction(docId) {
    try {
        const data = await window.db.get("actions", docId);
        if (!data) throw new Error("Action not found in DB");
        await window.db.update("actions", docId, {
            isDeleted: null,
            deletedAt: null
        });
        await logActivity("Restore Action", `Restored history item for Acc: ${data.customerAccountNo}`, "info");
        return true;
    } catch (error) {
        console.error("Error restoring action:", error);
        return false;
    }
}

// Helper Function: Delete Action Permanently
async function permanentlyDeleteAction(docId) {
    try {
        await window.db.delete("actions", docId);
        return true;
    } catch (error) {
        console.error("Error permanently deleting action:", error);
        return false;
    }
}

// Helper Function: Delete specific action or purge actions for non-existent customers
async function purgeActionsByAccountNo(accountNo) {
    try {
        const cleanAcc = (accountNo || '').toString().trim();
        const allActions = await window.db.getAll("actions");
        let deletedCount = 0;
        for (const action of allActions) {
            const aAcc = (action.customerAccountNo || '').toString().trim();
            if (aAcc === cleanAcc || aAcc.includes(cleanAcc)) {
                await window.db.delete("actions", action.id);
                deletedCount++;
            }
        }
        invalidateCache('all');
        return deletedCount;
    } catch (err) {
        console.error("Error purging actions by account no:", err);
        return 0;
    }
}

async function cleanOrphanedActions() {
    try {
        const customers = await window.db.getAll("customers");
        const activeCustAccs = new Set(customers.map(c => (c.accountNo || '').toString().trim()));
        const allActions = await window.db.getAll("actions");
        let purged = 0;

        for (const a of allActions) {
            const acc = (a.customerAccountNo || '').toString().trim();
            if (!acc || acc.includes('010101187 - 2') || acc.includes('010101187-2') || (!activeCustAccs.has(acc) && !activeCustAccs.has(acc.split(' ')[0]))) {
                await window.db.delete("actions", a.id);
                purged++;
            }
        }
        invalidateCache('all');
        return purged;
    } catch (err) {
        console.error("Error cleaning orphaned actions:", err);
        return 0;
    }
}


// Database Backup / Export
async function exportDatabase() {
    try {
        const customers = await window.db.getAll("customers");
        const actions = await window.db.getAll("actions");
        const users = await window.db.getAll("users");
        const documents = await window.db.getAll("documents");
        const activity_logs = await window.db.getAll("activity_logs");
        const npl_statements = await window.db.getAll("npl_statements");
        return JSON.stringify({ customers, actions, users, documents, activity_logs, npl_statements });
    } catch (err) {
        console.error("Error exporting database:", err);
        return null;
    }
}

// Helper Function: Clear the entire database (Use with caution!)
async function clearDatabase() {
    console.log("Wiping Offline Database...");
    try {
        const collections = ['customers', 'actions', 'documents', 'users', 'activity_logs'];
        for (const coll of collections) {
            await window.db.clear(coll);
            console.log(`Cleared collection: ${coll}`);
        }
        return true;
    } catch (err) {
        console.error("Error clearing database:", err);
        return false;
    }
}

// Database Restore / Import
async function importDatabase(jsonData) {
    setRestoreStatus("Starting Restore...");
    await lrmsAlert("RESTORE STARTED\nStep 1: Parsing backup file...");

    try {
        const data = JSON.parse(jsonData);
        const rawCustomers = data.customers || data.lrms_customers || (data.data ? data.data.customers : []) || [];
        const rawActions = data.actions || data.lrms_actions || (data.data ? data.data.actions : []) || [];
        const rawUsers = data.users || [];
        const rawDocs = data.documents || [];
        const rawLogs = data.activity_logs || [];
        const rawNPL = data.npl_statements || [];

        await lrmsAlert(`Step 2: File Parsed!\nFound ${rawCustomers.length} Customers.\nReady to WIPE existing Offline Database?`);

        setRestoreStatus("Wiping Offline Data...");
        const cleared = await clearDatabase();
        if (!cleared) { throw new Error("Could not wipe existing data."); }

        await lrmsAlert("Step 3: Data Wiped Successfully!\nNow starting DATA IMPORT. Please wait for the final 'SUCCESS' message.");

        const allItems = [];
        rawCustomers.forEach(c => { allItems.push({ coll: 'customers', data: c }); });
        rawActions.forEach(a => { allItems.push({ coll: 'actions', data: a }); });
        rawUsers.forEach(u => { allItems.push({ coll: 'users', data: u }); });
        rawDocs.forEach(d => { allItems.push({ coll: 'documents', data: d }); });
        rawLogs.forEach(l => { allItems.push({ coll: 'activity_logs', data: l }); });
        rawNPL.forEach(n => { allItems.push({ coll: 'npl_statements', data: n }); });

        setRestoreStatus(`Importing ${allItems.length} records...`);

        for (let i = 0; i < allItems.length; i++) {
            const item = allItems[i];
            await window.db.set(item.coll, item.data);
            if (i % 100 === 0) setRestoreStatus(`Progress: ${i} / ${allItems.length}`);
        }

        await lrmsAlert(`✅ STEP 4: RESTORE COMPLETE!\nTotal: ${allItems.length} records updated.\nThe page will now reload.`);
        return true;
    } catch (err) {
        console.error("RESTORE FAILED:", err);
        await lrmsAlert("❌ RESTORE FAILED\n\nError: " + err.message);
        setRestoreStatus("Restore Failed.", true);
        return false;
    }
}


// ---- User Management Functions ----
async function loginUser(username, password) {
    try {
        const normalizedUsername = username.trim().toLowerCase();

        // Hardcoded admin fallback for offline
        if (normalizedUsername === 'admin' && password === 'Gscs@123') {
            return { username: 'admin', name: 'Administrator', role: 'admin' };
        }

        const allUsers = await window.db.getAll("users");
        const user = allUsers.find(u => u.username === normalizedUsername);

        if (!user) {
            return { error: 'Username not found' };
        }

        if (user.password === password) {
            return user;
        } else {
            return { error: 'Wrong password' };
        }
    } catch (error) {
        console.error("Login error:", error);
        return { error: 'Exception', detail: error.message };
    }
}

async function ensureDefaultAdmin() {
    try {
        const users = await window.db.getAll("users");
        if (users.length === 0 || !users.some(u => u.username === 'admin')) {
            await window.db.add("users", {
                id: "admin-default-id",
                name: "Administrator",
                username: "admin",
                password: "Gscs@123",
                role: "admin"
            });
            console.log("Default admin user created in IndexedDB.");
        }
    } catch (e) {
        console.warn("Failed to check/create default admin:", e);
    }
}
window.ensureDefaultAdmin = ensureDefaultAdmin;

async function getAllUsers() {
    try {
        return await window.db.getAll("users");
    } catch (error) {
        console.error("Error fetching users:", error);
        return [];
    }
}

async function addUser(userData) {
    try {
        const normalizedUsername = userData.username.trim().toLowerCase();
        const allUsers = await window.db.getAll("users");
        if (allUsers.find(u => u.username === normalizedUsername)) {
            return { success: false, error: "Username already exists." };
        }

        userData.username = normalizedUsername;
        await window.db.add("users", userData);
        return { success: true };
    } catch (error) {
        console.error("Error adding user:", error);
        return { success: false, error: error.message };
    }
}

async function deleteUser(id) {
    try {
        await window.db.delete("users", id);
        return true;
    } catch (error) {
        console.error("Error deleting user:", error);
        return false;
    }
}

async function changeUserPassword(id, newPassword) {
    try {
        await window.db.update("users", id, { password: newPassword });
        return true;
    } catch (error) {
        console.error("Error changing password:", error);
        return false;
    }
}

// ---- Dashboard Charts Moved to Top ----

// ---- Document Management ----
async function saveDocument(docData) {
    try {
        await window.db.add("documents", docData);
        await logActivity("Add Document", `Added document: ${docData.name} for Acc: ${docData.customerAccountNo}`, "success");
        return true;
    } catch (error) {
        console.error("Error saving document:", error);
        return false;
    }
}

async function getCustomerDocuments(accountNo, customerId = null, loanAccountNo = null) {
    try {
        if (!accountNo && !customerId && !loanAccountNo) return [];
        const cleanAcc = (accountNo || '').toString().trim();
        const cleanLoanAcc = (loanAccountNo || '').toString().trim();
        const cleanCustId = customerId ? String(customerId).trim() : null;

        const allDocs = await window.db.getAll("documents");
        return (allDocs || []).filter(d => {
            if (!d) return false;
            const dAcc = (d.customerAccountNo || "").toString().trim();
            const dLoan = (d.loanAccountNo || "").toString().trim();
            const dCustId = d.customerId ? String(d.customerId).trim() : null;

            if (cleanCustId) {
                if (dCustId) return dCustId === cleanCustId;
                if (dLoan && cleanLoanAcc) return dLoan.toLowerCase() === cleanLoanAcc.toLowerCase();
                return cleanAcc ? (dAcc === cleanAcc || Number(dAcc) === Number(cleanAcc)) : false;
            }
            if (cleanLoanAcc) {
                if (dLoan) return dLoan.toLowerCase() === cleanLoanAcc.toLowerCase();
                return (dAcc === cleanLoanAcc || (cleanAcc && dAcc === cleanAcc));
            }
            if (cleanAcc) {
                return dAcc === cleanAcc || Number(dAcc) === Number(cleanAcc) || dLoan === cleanAcc;
            }
            return false;
        });
    } catch (error) {
        console.error("Error fetching documents:", error);
        return [];
    }
}

async function deleteDocument(id) {
    try {
        const data = await window.db.get("documents", id);
        if (!data) throw new Error("Document not found");
        await window.db.delete("documents", id);
        await logActivity("Delete Document", `Deleted document: ${data.name} for Acc: ${data.customerAccountNo}`, "danger");
        return true;
    } catch (error) {
        console.error("Error deleting document:", error);
        return false;
    }
}

// Auto Purge specific corrupted/test account '010101187 - 2' and clean invalid customer names
async function autoPurgeTargetedAccount() {
    try {
        if (!window.db) return;
        const allActions = await window.db.getAll("actions");
        for (const action of allActions) {
            const acc = (action.customerAccountNo || '').toString().trim();
            if (acc === '010101187 - 2' || acc === '010101187-2' || acc.includes('010101187 - 2')) {
                await window.db.delete("actions", action.id);
                console.log("Auto-purged target action record:", action.id);
            }
        }
        // Auto clean any customer names that had account numbers embedded from previous parser passes
        const allCusts = await window.db.getAll("customers");
        for (const cust of allCusts) {
            if (cust.name && cust.name.match(/\b\d{7,12}\b/)) {
                cust.name = cust.name.replace(/\b\d{7,12}\b/g, '').trim();
                await window.db.update("customers", cust.id, cust);
            }
        }
        invalidateCache('all');
    } catch(e) {
        console.warn("Auto purge targeted account error:", e);
    }
}

// Show Admin Menu Links and Settings if authorized
if (!window.lrmsInitHandled) {
    document.addEventListener('DOMContentLoaded', () => {
        // Run silent auto purge of invalid account record
        autoPurgeTargetedAccount();

        // Initial global icon render (handles Top Bar and layout)
        if (typeof lucide !== 'undefined') lucide.createIcons();

        if (sessionStorage.getItem('lrms_role') === 'admin') {
            document.getElementById('adminMenuLink')?.classList.remove('hidden');
            document.getElementById('settingsMenuLink')?.classList.remove('hidden');
        }

        const savedSettingsStr = localStorage.getItem('lrms_settings');
        if (savedSettingsStr) {
            try {
                const s = JSON.parse(savedSettingsStr);
                if (s.bankName) {
                    const v = document.getElementById('sidebarVersion');
                    if (v) v.innerText = s.bankName + ' v1.0';

                    const pb = document.getElementById('printBankName');
                    if (pb) pb.innerText = s.bankName.toUpperCase();
                }
                if (s.systemName) {
                    const ps = document.getElementById('printSystemName');
                    if (ps) ps.innerText = s.systemName;
                }
            } catch (e) {
                console.warn("Failed to parse settings:", e);
            }
        }
        
        // Call page-specific init if exists
        if (typeof window.initPage === 'function') {
            window.initPage();
        }

        // Global Link Interceptor for Smooth Local Transitions
        document.addEventListener("click", (e) => {
            const link = e.target.closest("a");
            if (!link) return;

            const href = link.getAttribute("href");
            const target = link.getAttribute("target");

            // EMERGENCY FIX: Always prevent refresh for backup/restore links
            if (link.getAttribute("onclick")) {
                const oc = link.getAttribute("onclick");
                if (oc.includes("handleBackup") || oc.includes("restoreFile") || href === "#") {
                    e.preventDefault();
                }
            }

            // Handle standard internal links
            if (href && !href.startsWith('http') && !href.startsWith('#') && !target && !link.onclick) {
                e.preventDefault();

                // Instantly apply active state to nav-link for immediate feedback
                if (link.classList.contains('nav-link') && !link.classList.contains('active')) {
                    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }

                // USE SPA NAVIGATION
                if (typeof window.navigate === 'function') {
                    window.navigate(href);
                } else {
                    window.location.href = href;
                }
            }
        });

        // Handle Browser Back/Forward natively
        window.addEventListener('popstate', () => {
            window.location.reload();
        });
    });
    window.lrmsInitHandled = true;
}

// ---- Stable Navigation System ----
window.navigate = function (url) {
    if (!url || url.startsWith('http') || url.startsWith('#')) return;
    
    // On GitHub Pages or local files, standard navigation is 100% stable.
    // We use a small delay to allow any pending UI animations to finish.
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.classList.add('fade-out');
        setTimeout(() => {
            window.location.href = url;
        }, 150);
    } else {
        window.location.href = url;
    }
};


// ---- Activity Logging System ----
async function logActivity(action, details, type = 'info') {
    try {
        const logData = {
            action,
            details,
            type, // info, success, warning, danger
            timestamp: new Date().toISOString()
        };
        await window.db.add("activity_logs", logData);
    } catch (error) {
        console.error("Error logging activity:", error);
    }
}

async function getActivityLogs(limitCount = 100) {
    try {
        let logs = await window.db.getAll("activity_logs");
        // Sort newest first locally
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return logs.slice(0, limitCount);
    } catch (error) {
        console.error("Error fetching activity logs:", error);
        return [];
    }
}

async function deleteActivityLog(id) {
    try {
        await window.db.delete("activity_logs", id);
        return true;
    } catch (error) {
        console.error("Error deleting log:", error);
        return false;
    }
}

async function clearAllLogs() {
    try {
        await window.db.clear("activity_logs");
        return true;
    } catch (error) {
        console.error("Error clearing logs:", error);
        return false;
    }
}

// Startup
checkAdmin();

// Global clock sync (targeting top-header currentTime)
setInterval(() => {
    const timeEl = document.getElementById('currentTime');
    if (timeEl) {
        timeEl.innerText = new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}, 1000);

// Modern Mobile Menu Toggle
window.toggleMobileMenu = function () {
    const navLinks = document.getElementById('topNavLinks');
    if (navLinks) {
        navLinks.classList.toggle('open');
    }
};


async function loadPriorityReminders() {
    const listEl = document.getElementById('priorityRemindersList');
    if (!listEl) return;

    try {
        const allActions = await window.db.getAll("actions");
        const todayStr = new Date().toISOString().split('T')[0];
        const todayDate = new Date(new Date().setHours(0, 0, 0, 0));

        // Filter and sort: Overdue first, then Today, then upcoming (max 5)
        const priorities = allActions
            .filter(a => a.followUpDate && !a.isDeleted)
            .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate))
            .slice(0, 5);

        if (priorities.length === 0) {
            listEl.innerHTML = `
                <div style="padding: 40px 20px; text-align: center; color: #9ca3af; font-size: 0.85rem;">
                    <i data-lucide="check-circle-2" style="width:32px;height:32px;margin-bottom:8px;opacity:0.5"></i>
                    <p>All caught up!</p>
                </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons({ root: listEl });
            return;
        }

        listEl.innerHTML = '';
        for (const p of priorities) {
            const cust = (p.customerId && typeof getCustomerById === 'function') 
                ? await getCustomerById(p.customerId) 
                : await getCustomerByAccountNo(p.customerAccountNo);
            const pDate = new Date(p.followUpDate);
            const isOverdue = pDate < todayDate;
            const isToday = p.followUpDate === todayStr;

            let statusColor = '#7c3aed'; // Upcoming
            let statusBg = '#f5f3ff';
            if (isOverdue) { statusColor = '#ef4444'; statusBg = '#fef2f2'; }
            else if (isToday) { statusColor = '#f59e0b'; statusBg = '#fffbeb'; }

            const item = document.createElement('div');
            item.style.cssText = 'padding: 12px 16px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.2s;';
            item.onmouseover = () => item.style.background = '#f9fafb';
            item.onmouseout = () => item.style.background = 'transparent';
            item.onclick = () => {
                const targetUrl = p.customerId 
                    ? `customer-detail.html?id=${encodeURIComponent(p.customerId)}&accountNo=${encodeURIComponent(p.customerAccountNo)}`
                    : `customer-detail.html?accountNo=${encodeURIComponent(p.customerAccountNo)}`;
                if (typeof window.navigate === 'function') window.navigate(targetUrl);
                else window.location.href = targetUrl;
            };

            item.innerHTML = `
                <div style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor}; flex-shrink: 0;"></div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${cust ? cust.name : 'Unknown Customer'}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
                        ${p.actionType}
                    </div>
                </div>
                <div style="text-align: right; flex-shrink: 0;">
                    <div style="font-size: 0.75rem; font-weight: 800; color: ${statusColor}; background: ${statusBg}; padding: 2px 8px; border-radius: 6px;">
                        ${isOverdue ? 'Overdue' : (isToday ? 'Today' : p.followUpDate)}
                    </div>
                </div>
            `;
            listEl.appendChild(item);
        }
    } catch (err) {
        console.error("Error loading priority reminders:", err);
        listEl.innerHTML = '<div style="padding: 20px; color: #ef4444; font-size: 0.8rem;">Error loading tasks</div>';
    }
}

// ==========================================
// ADVANCED LRMS MODULES (AI Risk Scoring, Restructuring, Officer Performance)
// ==========================================

// 1. AI Early Warning NPL Risk Scoring (0 - 100)
async function calculateNPLRiskScore(customer, customerActions = null) {
    if (!customer) return { score: 0, level: 'LOW', badgeColor: '#10b981', badges: [] };

    let score = 0;
    const badges = [];

    // Factor 1: Arrears / Overdue Amount Ratio
    const overdueAmt = parseFloat(customer.overdueAmount || customer.arrears || 0);
    const loanAmt = parseFloat(customer.loanAmount || 0);
    if (loanAmt > 0 && overdueAmt > 0) {
        const ratio = overdueAmt / loanAmt;
        if (ratio >= 0.5) { score += 40; badges.push('හිඟ ශේෂය 50% ඉක්මවයි (+40)'); }
        else if (ratio >= 0.25) { score += 25; badges.push('හිඟ ශේෂය 25% ඉක්මවයි (+25)'); }
        else if (ratio > 0) { score += 15; badges.push('හිඟ ශේෂයක් ඇත (+15)'); }
    }

    // Factor 2: Customer Status
    const status = (customer.status || '').toLowerCase();
    if (status.includes('legal')) { score += 35; badges.push('නීතිමය ක්‍රියාමාර්ග මට්ටමේ පවතී (+35)'); }
    else if (status.includes('high risk') || status.includes('overdue') || status.includes('kalpasu')) { score += 25; badges.push('අවදානම් / කල්පසු තත්ත්වය (+25)'); }

    // Factor 3: Actions History & Missed Promises
    if (!customerActions && (customer.accountNo || customer.loanAccountNo)) {
        try {
            customerActions = await getCustomerActions(customer.accountNo, customer.id, customer.loanAccountNo);
        } catch(e) { customerActions = []; }
    }
    customerActions = customerActions || [];

    const todayStr = new Date().toISOString().split('T')[0];
    let missedPromises = 0;
    customerActions.forEach(a => {
        if (a.followUpDate && a.followUpDate < todayStr && (!a.response || a.response.toLowerCase().includes('not paid') || a.response.toLowerCase().includes('නොගෙවීය'))) {
            missedPromises++;
        }
    });

    if (missedPromises >= 3) { score += 20; badges.push(`පොරොන්දු ${missedPromises} ක් මගහැර ඇත (+20)`); }
    else if (missedPromises > 0) { score += 10; badges.push(`පොරොන්දු මගහැරීමක් ඇත (+10)`); }

    // Factor 4: Guarantor Risk
    if (!customer.guarantor1 && !customer.guarantor2) {
        score += 10; badges.push('ඇපකරුවන් සඳහන් වී නොමැත (+10)');
    }

    // Cap at 100
    score = Math.min(100, Math.max(0, score));

    let level = 'LOW';
    let badgeColor = '#10b981'; // Green
    if (score >= 80) { level = 'CRITICAL'; badgeColor = '#991b1b'; }
    else if (score >= 60) { level = 'HIGH'; badgeColor = '#ef4444'; }
    else if (score >= 30) { level = 'MEDIUM'; badgeColor = '#f59e0b'; }

    return { score, level, badgeColor, badges };
}

// 2. Loan Restructuring Helpers
async function saveLoanRestructure(data) {
    try {
        const id = await window.db.set('restructures', data);
        await logActivity("Loan Restructure", `Restructured loan for account: ${data.customerAccountNo}`, "success");
        return id;
    } catch(e) {
        console.error("Save restructure error:", e);
        return null;
    }
}

async function getAllRestructures() {
    try {
        return await window.db.getAll('restructures');
    } catch(e) {
        console.error("Get restructures error:", e);
        return [];
    }
}

// 3. Officer Performance Analytics Helper
async function getOfficerPerformanceMetrics(monthPrefix = null) {
    try {
        const allActions = await window.db.getAll('actions');
        const actions = monthPrefix ? allActions.filter(a => a.date && a.date.startsWith(monthPrefix) && !a.isDeleted) : allActions.filter(a => !a.isDeleted);
        
        const metrics = {};

        actions.forEach(a => {
            const officer = a.officer || a.createdBy || a.user || 'Loan Management Officer';
            if (!metrics[officer]) {
                metrics[officer] = { officer, calls: 0, visits: 0, letters: 0, demand: 0, promises: 0, totalAmt: 0 };
            }

            const type = (a.actionType || '').toLowerCase().trim();
            const isSMS = type.includes('sms') || type.includes('text message') || type.includes('text');
            const isWA = type.includes('whatsapp');
            const isDigital = isSMS || isWA;
            const isDemand = !isDigital && (type.includes('lod') || type.includes('demand') || type.includes('නොතීසි') || type.includes('එතැන්පත්') || type.includes('එන්තරවාසි') || type.includes('arbitration') || type.includes('legal referral'));
            const isVisit = !isDigital && !isDemand && (type.includes('visit') || type.includes('visiting') || type.includes('field') || type.includes('residence') || type.includes('සංචාර') || type.includes('ක්ෂේත්‍ර') || type.includes('චාරිකා'));
            const isCall = !isDigital && !isDemand && !isVisit && (type.includes('call') || type.includes('phone') || type.includes('දුරකථන') || type.includes('ඇමතුම්') || type.includes('ඇමතුම'));
            const isLetter = !isDigital && !isDemand && !isVisit && !isCall && (
                type.includes('letter') || 
                type.includes('ලිපි') || 
                type.includes('ලිපිය') || 
                type.includes('attention') || 
                type.includes('notice') || 
                type.includes('pastdue') || 
                type.includes('first reminder') || 
                type.includes('second reminder') || 
                type.includes('final notice') || 
                type.includes('business loan repayment') || 
                type.includes('agreement expired')
            );

            if (isCall) metrics[officer].calls++;
            if (isVisit) metrics[officer].visits++;
            if (isLetter) metrics[officer].letters++;
            if (isDemand) metrics[officer].demand++;

            if (a.response || a.followUpDate) {
                metrics[officer].promises++;
                if (a.promisedAmount) metrics[officer].totalAmt += parseFloat(a.promisedAmount) || 0;
                else if (a.amount) metrics[officer].totalAmt += parseFloat(a.amount) || 0;
            }
        });

        return Object.values(metrics);
    } catch(e) {
        console.error("Get officer metrics error:", e);
        return [];
    }
}













