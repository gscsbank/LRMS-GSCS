// js/pdf-scanner.js v2.2

if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}

// ── Utility: extract only digits ─────────────────────────────────────────────
function digitsOnly(str) {
    return String(str || '').replace(/[^0-9]/g, '');
}

// ── Utility: find DB customer matching a PDF row ──────────────────────────────
// Checks:
// 1. Ignores "Loan Closed" and Deleted profiles
// 2. Pass 1: Exact / Digits match on full Loan Account No (e.g. "01-3030102-00905")
// 3. Pass 2: Member Account No + Category (Naya Wargaya) for multi-loan members
function findDBMatch(existingCustomers, pdfRow) {
    const pdfLoanAcc   = String(pdfRow.loanAccountNo || '').trim();
    const pdfMemberAcc = String(pdfRow.accountNo || '').trim();
    const pdfCategory  = String(pdfRow.category || '').trim();

    const pdflDigits   = digitsOnly(pdfLoanAcc);
    const pdfmDigits   = digitsOnly(pdfMemberAcc);

    // Filter out Loan Closed and Deleted customers — closed loans must NOT be updated!
    const activeCandidates = existingCustomers.filter(ex => 
        !ex.isDeleted && 
        ex.isDeleted !== 'true' && 
        ex.status !== 'Loan Closed'
    );

    // PASS 1: Match by exact full Loan Account Number (e.g. "01-3030102-00905")
    if (pdfLoanAcc) {
        const match = activeCandidates.find(ex => {
            const exLoanAcc = String(ex.loanAccountNo || '').trim();
            return exLoanAcc === pdfLoanAcc || (pdflDigits.length >= 8 && digitsOnly(exLoanAcc) === pdflDigits);
        });
        if (match) return match;
    }

    // PASS 2: Match by Member Account Number (Samajika Angkaya) + Loan Category
    if (pdfMemberAcc) {
        const memberMatches = activeCandidates.filter(ex => {
            const exAccD     = digitsOnly(ex.accountNo);
            const exLoanAccD = digitsOnly(ex.loanAccountNo);
            return (exAccD === pdfmDigits || exLoanAccD === pdfmDigits || String(ex.accountNo || '').trim() === pdfMemberAcc);
        });

        if (memberMatches.length === 1) {
            return memberMatches[0];
        } else if (memberMatches.length > 1) {
            // Member has MULTIPLE loans! Match by Loan Category (Naya Wargaya)
            const catMatch = memberMatches.find(ex => String(ex.category || '').trim().toLowerCase() === pdfCategory.toLowerCase());
            if (catMatch) return catMatch;

            // Fallback: return first matching member record
            return memberMatches[0];
        }
    }

    return null;
}

// ── MAIN: Handle PDF Upload ───────────────────────────────────────────────────
async function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (typeof pdfjsLib === 'undefined') {
        alert("PDF.js library is not loaded. Please check your internet connection.");
        return;
    }

    const modal       = document.getElementById('pdfLoadingModal');
    const loadingText = document.getElementById('pdfLoadingText');
    if (modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        document.body.classList.add('modal-active');
    }

    try {
        const fileReader = new FileReader();
        fileReader.onload = async function () {
            try {
                const typedarray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;

                let extractedCustomers = [];
                let currentCategory   = "General Loan";
                let lastCustomer      = null;

                const categoryMap = {
                    "CIKsl Kh"           : "Instant Loan",
                    "iajYla;S Kh"        : "Swashakthi Loan 01",
                    "idudkH Kh"          : "General Loan",
                    "jHdmdßl Kh"         : "Business Loan",
                    "os.= ld,Sk Kh"      : "Long Term Loan",
                    "W;aij Kh"           : "Festival Loan",
                    "w;aje, lKavdhï Kh"  : "Athwela Team Loan",
                    "w;udre Kh"          : "Athamaru Loan"
                };

                const rowRegex = /^([\w-]+)\s+(\d+)\s+(.+?)\s+([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)\s+(\d+)\s+([\d.]+)\s*%\s+([\d,]+(?:\.\d+)?)\s+([\d.]+)\s+(\d{4}-\d{2}-\d{2})(?:\s+(\d{4}-\d{2}-\d{2}))?/;
                const guarantorRegex = /w[a-z]+mlre\s*:\s*01\s*-\s*(\d+)\s+(.*?)(?:\s+w[a-z]+mlre\s*:\s*02\s*-\s*(\d+)\s+(.*))?/;

                // ── Page loop ─────────────────────────────────────────────────
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    if (loadingText) loadingText.innerText = `Scanning page ${pageNum} of ${pdf.numPages}...`;
                    const page        = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();

                    // Group text items by Y coordinate (same line = same Y)
                    const linesMap = new Map();
                    for (const item of textContent.items) {
                        const y = Math.round(item.transform[5]);
                        let key = y;
                        for (const k of linesMap.keys()) {
                            if (Math.abs(k - y) <= 4) { key = k; break; }
                        }
                        if (!linesMap.has(key)) linesMap.set(key, []);
                        linesMap.get(key).push(item);
                    }

                    // Sort Y descending (top → bottom)
                    const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

                    for (const y of sortedY) {
                        const items = linesMap.get(y);
                        items.sort((a, b) => a.transform[4] - b.transform[4]);

                        // Reconstruct line string by joining all items on the line with spaces
                        let lineStr = items.map(i => i.str.trim()).filter(Boolean).join(' ');
                        lineStr = lineStr.replace(/\s+/g, ' ').trim();
                        if (!lineStr) continue;

                        // Category header detection
                        if (lineStr.startsWith('01-') && !lineStr.match(/^01-\d{7}-\d{5}/)) {
                            const catKey = lineStr.substring(3).trim();
                            for (const key in categoryMap) {
                                if (catKey.includes(key) || key.includes(catKey)) {
                                    currentCategory = categoryMap[key];
                                    break;
                                }
                            }
                        }

                        // Data row
                        const rowMatch = lineStr.match(rowRegex);
                        if (rowMatch) {
                            lastCustomer = {
                                loanAccountNo       : rowMatch[1],
                                accountNo           : rowMatch[2],
                                name                : rowMatch[3].trim(),
                                loanAmount          : parseFloat(rowMatch[4].replace(/,/g, '')),
                                balanceAmount       : parseFloat(rowMatch[5].replace(/,/g, '')),
                                interestRate        : parseFloat(rowMatch[7]),
                                arrearsAmount       : parseFloat(rowMatch[8].replace(/,/g, '')),
                                arrearsInstallments : parseFloat(rowMatch[9]),
                                loanDate            : rowMatch[10],
                                lastPaidDate        : rowMatch[11] || null,
                                category            : currentCategory,
                                status              : "High Risk",
                                statusDate          : new Date().toISOString().split('T')[0],
                                addedDate           : new Date().toISOString().split('T')[0],
                                createdDate         : new Date().toISOString().split('T')[0],
                                phone               : '',
                                address             : '',
                                guarantor1          : '',
                                guarantor1Address   : '',
                                guarantor2          : '',
                                guarantor2Address   : ''
                            };
                            extractedCustomers.push(lastCustomer);
                        } else if (lastCustomer && (lineStr.match(/01\s*[-:]/i) || lineStr.match(/w[a-z]+|æp|ඇප|guarantor/i))) {
                            // Extract Guarantor 1 & 2 (ID & Name)
                            const g1Match = lineStr.match(/01\s*[-:]\s*(\d+)\s+(.*?)(?=\s*02\s*[-:]|\bw[a-z]+|\bæp|\bඇප|$)/i);
                            if (g1Match) {
                                const id1 = g1Match[1].trim();
                                let name1 = g1Match[2].replace(/^(?:w[a-z]+mlre|w[a-z]+mkaru|æpmlre|ඇපකරු|ඇපකරුවන්|guarantor)\s*:?/gi, '').trim();
                                name1 = name1.replace(/\s*(?:w[a-z]+mlre|w[a-z]+mkaru|æpmlre|ඇපකරු|ඇපකරුවන්|guarantor)\s*:?.*$/gi, '').trim();
                                if (id1 && name1) {
                                    lastCustomer.guarantor1 = id1 + ' ' + name1;
                                }
                            }
                            const g2Match = lineStr.match(/02\s*[-:]\s*(\d+)\s+(.*?)$/i);
                            if (g2Match) {
                                const id2 = g2Match[1].trim();
                                let name2 = g2Match[2].replace(/^(?:w[a-z]+mlre|w[a-z]+mkaru|æpmlre|ඇපකරු|ඇපකරුවන්|guarantor)\s*:?/gi, '').trim();
                                if (id2 && name2) {
                                    lastCustomer.guarantor2 = id2 + ' ' + name2;
                                }
                            }
                        }
                    }
                }

                if (loadingText) loadingText.innerText = `Matching ${extractedCustomers.length} records...`;

                // ── Match & Save ──────────────────────────────────────────────
                const allExisting = await window.db.getAll('customers');

                let updatedCount = 0;
                let newCount     = 0;

                for (const c of extractedCustomers) {
                    try {
                        const match = findDBMatch(allExisting, c);

                        if (match) {
                            updatedCount++;
                            // Persist full loanAccountNo into DB record
                            if (c.loanAccountNo && (!match.loanAccountNo || match.loanAccountNo === match.accountNo)) {
                                match.loanAccountNo = c.loanAccountNo;
                            }
                            match.loanAmount         = c.loanAmount;
                            match.balanceAmount       = c.balanceAmount;
                            match.arrearsAmount       = c.arrearsAmount;
                            match.arrearsInstallments = c.arrearsInstallments;
                            if (c.lastPaidDate)  match.lastPaidDate = c.lastPaidDate;
                            if (c.guarantor1)    match.guarantor1   = c.guarantor1;
                            if (c.guarantor2)    match.guarantor2   = c.guarantor2;
                            if (c.arrearsInstallments > 3 && match.status === 'Normal') {
                                match.status = 'High Risk';
                            }
                            await window.db.update('customers', match.id, match);
                        } else {
                            newCount++;
                            if (c.arrearsInstallments <= 3) c.status = 'Normal';
                            c.addedDate = c.addedDate || new Date().toISOString().split('T')[0];
                            c.createdDate = c.createdDate || new Date().toISOString().split('T')[0];
                            await window.db.add('customers', c);
                        }
                    } catch (rowErr) {
                        console.error(`Error saving ${c.name}:`, rowErr);
                    }
                }

                if (window.lrmsCache && typeof invalidateCache === 'function') invalidateCache('customers');
                if (modal) { modal.classList.add('opacity-0', 'pointer-events-none'); document.body.classList.remove('modal-active'); }
                event.target.value = '';
                if (typeof loadTableData === 'function') loadTableData();
                if (typeof initDashboardCharts === 'function') initDashboardCharts();

                let msg = `Scan Complete!<br><br>Found in PDF: <b>${extractedCustomers.length}</b> records<br>Updated Existing: <b>${updatedCount}</b> profiles<br>Created New: <b>${newCount}</b> profiles`;
                if (typeof lrmsAlert === 'function') await lrmsAlert(msg);
                else alert(`Scan Complete!\nUpdated: ${updatedCount}\nCreated: ${newCount}`);

            } catch (err) {
                console.error('PDF parse error:', err);
                if (modal) { modal.classList.add('opacity-0', 'pointer-events-none'); document.body.classList.remove('modal-active'); }
                event.target.value = '';
                if (typeof lrmsAlert === 'function') await lrmsAlert('Failed to parse PDF: ' + err.message);
                else alert('Failed to parse PDF: ' + err.message);
            }
        };
        fileReader.readAsArrayBuffer(file);
    } catch (error) {
        if (modal) { modal.classList.add('opacity-0', 'pointer-events-none'); document.body.classList.remove('modal-active'); }
        console.error(error);
        event.target.value = '';
    }
}

// ── Fix Duplicates: merge true duplicate (same accountNo + same category) entries
async function fixDuplicateCustomers() {
    const allDocs = await window.db.getAll('customers');
    const active  = allDocs.filter(c => !c.isDeleted && c.isDeleted !== 'true');

    // Group by digitsOnly(accountNo) + category
    const groups = {};
    for (const c of active) {
        const key = digitsOnly(c.accountNo) + '_' + String(c.category || '').trim().toLowerCase();
        if (!key) continue;
        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
    }

    let merged = 0;
    for (const key in groups) {
        const group = groups[key];
        if (group.length <= 1) continue;

        // Sort: prefer entry WITH arrearsInstallments set
        group.sort((a, b) => {
            const aHas = a.arrearsInstallments !== undefined && a.arrearsInstallments !== null;
            const bHas = b.arrearsInstallments !== undefined && b.arrearsInstallments !== null;
            if (aHas && !bHas) return -1;
            if (!aHas && bHas) return 1;
            return (a.id || 0) - (b.id || 0);
        });

        const keeper = group[0];
        for (let i = 1; i < group.length; i++) {
            const dup = group[i];
            if (dup.arrearsInstallments !== undefined) keeper.arrearsInstallments = dup.arrearsInstallments;
            if (dup.lastPaidDate)     keeper.lastPaidDate  = dup.lastPaidDate;
            if (dup.loanAccountNo && dup.loanAccountNo !== dup.accountNo) keeper.loanAccountNo = dup.loanAccountNo;
            if (dup.balanceAmount)    keeper.balanceAmount  = dup.balanceAmount;
            if (dup.arrearsAmount)    keeper.arrearsAmount  = dup.arrearsAmount;
            if (dup.guarantor1 && !keeper.guarantor1) keeper.guarantor1 = dup.guarantor1;
            if (dup.guarantor2 && !keeper.guarantor2) keeper.guarantor2 = dup.guarantor2;
            await window.db.update('customers', dup.id, { ...dup, isDeleted: true });
            merged++;
        }
        await window.db.update('customers', keeper.id, keeper);
    }

    if (window.lrmsCache && typeof invalidateCache === 'function') invalidateCache('customers');
    if (typeof loadTableData === 'function') loadTableData();
    return merged;
}
