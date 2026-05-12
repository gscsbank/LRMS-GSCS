// js/app.js
console.log("LRMS Script Version: 3.14 - OFFLINE_STABLE");

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
    if (accountNo) {
        delete window.lrmsCache.actions[accountNo];
    } else if (type === 'all' || type === 'actions') {
        window.lrmsCache.actions = {};
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
                <div class="modal-box" style="max-width: 400px; text-align: center; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.95); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
                    <div class="modal-header" style="background: var(--violet-600); color: white; border: none; padding: 15px 20px;">
                        <h3 style="color: white; margin: 0; font-weight: 600;"><i data-lucide="info" style="width:18px;height:18px"></i> ${title}</h3>
                    </div>
                    <div class="modal-body" style="padding: 30px 24px;">
                        <p style="color: var(--text-primary); font-size: 0.95rem; line-height: 1.6; margin: 0;">${message}</p>
                    </div>
                    <div class="modal-footer" style="border: none; padding: 0 24px 24px; justify-content: center;">
                        <button id="${modalId}-ok" class="btn btn-primary" style="min-width: 120px; justify-content: center; padding: 10px 24px;">OK</button>
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
                <div class="modal-box" style="max-width: 420px; text-align: center; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.95); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
                    <div class="modal-header" style="background: var(--text-primary); color: white; border: none; padding: 15px 20px;">
                        <h3 style="color: white; margin: 0; font-weight: 600;"><i data-lucide="help-circle" style="width:18px;height:18px"></i> ${title}</h3>
                    </div>
                    <div class="modal-body" style="padding: 30px 24px;">
                        <p style="color: var(--text-primary); font-size: 0.95rem; line-height: 1.6; margin: 0;">${message}</p>
                    </div>
                    <div class="modal-footer" style="border: none; padding: 0 24px 24px; justify-content: center; gap: 12px;">
                        <button id="${modalId}-cancel" class="btn" style="min-width: 100px; justify-content: center; background: #f3f4f6; color: #4b5563; border: 1px solid #d1d5db;">Cancel</button>
                        <button id="${modalId}-confirm" class="btn btn-primary" style="min-width: 100px; justify-content: center;">Confirm</button>
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
    console.log("Checking for duplicate before adding:", customerData.accountNo);
    try {
        if (customerData.accountNo) {
            customerData.accountNo = customerData.accountNo.toString().trim();
        }

        const existing = await getCustomerByAccountNo(customerData.accountNo);
        if (existing) {
            console.warn("Duplicate found in DB:", existing);
            await lrmsAlert(`Account Number [${customerData.accountNo}] already exists!\n(Record ID: ${existing.id})`);
            return false;
        }
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

// Helper Function: Get customer by Account No
async function getCustomerByAccountNo(accountNo) {
    if (!accountNo) return null;
    const cleanAcc = accountNo.toString().trim();

    // Check Cache
    if (window.lrmsCache.customers) {
        const found = window.lrmsCache.customers.find(c =>
            (c.accountNo || "").toString().trim() === cleanAcc ||
            Number(c.accountNo) === Number(cleanAcc)
        );
        if (found) return found;
    }

    try {
        console.log("Fetching Customer from DB:", cleanAcc);
        const allDocs = await window.db.getAll("customers");
        const found = allDocs.find(c =>
            !c.isDeleted &&
            ((c.accountNo || "").toString().trim() === cleanAcc || Number(c.accountNo) === Number(cleanAcc))
        );
        return found || null;
    } catch (error) {
        console.error("Error fetching customer:", error);
        return null;
    }
}

// Helper Function: Add recovery action
async function addAction(actionData) {
    try {
        await window.db.add("actions", actionData);
        invalidateCache('actions', actionData.customerAccountNo);
        await logActivity("Log Action", `Logged ${actionData.actionType} for Acc: ${actionData.customerAccountNo}`, "info");
        console.log("Action recorded successfully!");
        return true;
    } catch (error) {
        console.error("Error adding action:", error);
        return false;
    }
}

// Helper Function: Get actions for a customer
async function getCustomerActions(accountNo, forceRefresh = false) {
    if (!accountNo) return [];
    const cleanAcc = accountNo.toString().trim();

    if (!forceRefresh && window.lrmsCache.actions[cleanAcc]) {
        console.log("Cache Hit: getCustomerActions", cleanAcc);
        return window.lrmsCache.actions[cleanAcc];
    }

    try {
        console.log("Fetching Actions from DB:", cleanAcc);
        const allActions = await window.db.getByIndex("actions", "customerAccountNo", cleanAcc);
        const numCleanAcc = isNaN(cleanAcc) || cleanAcc === "" ? null : Number(cleanAcc);
        let actions = allActions;

        if (numCleanAcc !== null) {
            const numActions = await window.db.getByIndex("actions", "customerAccountNo", numCleanAcc);
            actions = [...allActions, ...numActions];
        }

        actions = actions.filter(a => !a.isDeleted);
        actions.sort((a, b) => new Date(b.date) - new Date(a.date));

        window.lrmsCache.actions[cleanAcc] = actions;
        return actions;
    } catch (error) {
        console.error("Error fetching actions:", error);
        return [];
    }
}

// Helper Function: Update Customer Status
async function updateCustomerStatus(accountNo, newStatus, statusDate) {
    try {
        const customer = await getCustomerByAccountNo(accountNo);
        if (customer) {
            await window.db.update("customers", customer.id, {
                status: newStatus,
                statusDate: statusDate || new Date().toISOString().split('T')[0]
            });
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
async function updateCustomer(accountNo, updatedData) {
    try {
        const customer = await getCustomerByAccountNo(accountNo);
        if (customer) {
            await window.db.update("customers", customer.id, updatedData);
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
async function deleteCustomer(accountNo) {
    try {
        const customer = await getCustomerByAccountNo(accountNo);
        if (customer) {
            await window.db.update("customers", customer.id, {
                isDeleted: true,
                deletedAt: new Date().toISOString()
            });
            await logActivity("Delete Customer", `Deleted customer: ${customer.name} (${accountNo})`, "danger");
            return true;
        } else {
            console.warn("Soft delete failed to find customer by standard query. Trying fallback...");
            const allDocs = await window.db.getAll("customers");
            const found = allDocs.find(d => {
                const dAcc = (d.accountNo || "").toString().trim();
                const sAcc = accountNo.toString().trim();
                return (dAcc === sAcc || Number(dAcc) === Number(sAcc)) && !d.isDeleted;
            });
            if (found) {
                await window.db.update("customers", found.id, { isDeleted: true, deletedAt: new Date().toISOString() });
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

        const cleanAcc = accountNo.toString().trim();

        // 1. Delete Customer Doc
        await window.db.delete("customers", docId);

        // 2. Delete associated actions
        const allActions = await window.db.getAll("actions");
        for (const action of allActions) {
            const aAcc = (action.customerAccountNo || "").toString().trim();
            if (aAcc === cleanAcc || Number(aAcc) === Number(cleanAcc)) {
                await window.db.delete("actions", action.id);
            }
        }

        // 3. Delete associated documents
        const allDocs = await window.db.getAll("documents");
        for (const doc of allDocs) {
            const dAcc = (doc.customerAccountNo || "").toString().trim();
            if (dAcc === cleanAcc || Number(dAcc) === Number(cleanAcc)) {
                await window.db.delete("documents", doc.id);
            }
        }

        await logActivity("Permanent Delete", `Hard deleted customer and all data for Acc: ${accountNo}`, "danger");
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

// Database Backup / Export
async function exportDatabase() {
    try {
        const customers = await window.db.getAll("customers");
        const actions = await window.db.getAll("actions");
        const users = await window.db.getAll("users");
        const documents = await window.db.getAll("documents");
        const activity_logs = await window.db.getAll("activity_logs");
        return JSON.stringify({ customers, actions, users, documents, activity_logs });
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
        if (allUsers.find(u => u.username === normalizedUsername)) return false;

        userData.username = normalizedUsername;
        await window.db.add("users", userData);
        return true;
    } catch (error) {
        console.error("Error adding user:", error);
        return false;
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

async function getCustomerDocuments(accountNo) {
    try {
        const cleanAcc = accountNo.toString().trim();
        const allDocs = await window.db.getAll("documents");
        return allDocs.filter(d => {
            const dAcc = (d.customerAccountNo || "").toString().trim();
            return dAcc === cleanAcc || Number(dAcc) === Number(cleanAcc);
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

// Show Admin Menu Links and Settings if authorized
if (!window.lrmsInitHandled) {
    document.addEventListener('DOMContentLoaded', () => {
        // Initial global icon render (handles Top Bar and layout)
        if (typeof lucide !== 'undefined') lucide.createIcons();

        if (sessionStorage.getItem('lrms_role') === 'admin') {
            document.getElementById('adminMenuLink')?.classList.remove('hidden');
            document.getElementById('settingsMenuLink')?.classList.remove('hidden');
        }

        // Initialize charts if on dashboard
        if (document.getElementById('statusChart')) {
            setTimeout(initDashboardCharts, 500);
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

// ---- SPA-lite Navigation System ----
window.navigate = async function (url, pushState = true) {
    if (!url || url.startsWith('http') || url.startsWith('#')) return;

    const mainContent = document.querySelector('.main-content');
    if (!mainContent) { window.location.href = url; return; }

    // Start fade-out
    mainContent.classList.add('fade-out');

    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error("Page not found");
        const html = await response.text();

        // Create a temporary element to parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newMain = doc.querySelector('.main-content');

        if (!newMain) { window.location.href = url; return; }

        // 1. Extract and apply Styles from the new page's <head>
        const newStyles = doc.querySelectorAll('style, link[rel="stylesheet"]');
        newStyles.forEach(style => {
            // Only add if not already present to avoid duplicates
            const isDuplicate = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]')).some(existing => {
                if (style.tagName === 'LINK') return existing.href === style.href;
                return existing.textContent === style.textContent;
            });
            if (!isDuplicate) {
                const clonedStyle = style.cloneNode(true);
                document.head.appendChild(clonedStyle);
            }
        });

        // 2. Swap main content
        mainContent.innerHTML = newMain.innerHTML;
        mainContent.className = newMain.className;

        mainContent.classList.remove('fade-out');
        mainContent.classList.add('fade-in');

        // Update Page Title
        document.title = doc.title;

        // Update active link in sidebar
        const currentPath = url.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-link').forEach(l => {
            const linkHref = l.getAttribute('href');
            if (linkHref === currentPath) l.classList.add('active');
            else l.classList.remove('active');
        });

        // Pre-cleanup for safe execution
        window.initPage = null;

        // 3. Extract and Execute Page-Specific Scripts
        const scripts = newMain.querySelectorAll('script');
        
        // Helper to load script and return promise
        const loadScript = (oldScript) => {
            return new Promise((resolve, reject) => {
                // Skip core scripts that are already loaded
                if (oldScript.src && (
                    oldScript.src.includes('app.js') || 
                    oldScript.src.includes('db.js') || 
                    oldScript.src.includes('lucide') || 
                    oldScript.src.includes('tailwind') ||
                    oldScript.src.includes('chart.js')
                )) {
                    return resolve();
                }

                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                
                if (oldScript.src) {
                    newScript.onload = resolve;
                    newScript.onerror = reject;
                    document.body.appendChild(newScript);
                } else {
                    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                    document.body.appendChild(newScript);
                    newScript.remove(); // Inline scripts execute instantly
                    resolve();
                }
            });
        };

        // Execute all scripts sequentially to preserve order and dependencies
        for (const s of scripts) {
            await loadScript(s);
        }

        // 4. Re-initialize for the new content
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({
                root: mainContent,
                attrs: { class: 'lucide-icon' }
            });
        }
        if (typeof window.checkAdmin === 'function') window.checkAdmin();
        if (typeof window.initPage === 'function') window.initPage();

        // Handle History
        if (pushState) {
            try {
                history.pushState({ url }, doc.title, url);
                await loadPriorityReminders();
            } catch (e) {
                console.warn("history.pushState failed:", e);
            }
        }

        // Close sidebar on mobile
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            toggleSidebar();
        }

        window.scrollTo(0, 0);

    } catch (err) {
        console.error("Navigation failed:", err);
        window.location.href = url; // Fallback
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
            const cust = await getCustomerByAccountNo(p.customerAccountNo);
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
                if (typeof window.navigate === 'function') window.navigate(`customer-detail.html?accountNo=${p.customerAccountNo}`);
                else window.location.href = `customer-detail.html?accountNo=${p.customerAccountNo}`;
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













