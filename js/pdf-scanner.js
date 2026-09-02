// js/pdf-scanner.js v2.7

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
// 2. Pass 1: Strict Match on Loan Account No (e.g. "01-3030102-00905")
// 3. Pass 2: Member Account No + Category (for legacy records without loanAccountNo)
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

    // PASS 1: Strict Match by full or digit-matching Loan Account Number
    if (pdfLoanAcc) {
        const match = activeCandidates.find(ex => {
            const exLoanAcc = String(ex.loanAccountNo || '').trim();
            const exlDigits = digitsOnly(exLoanAcc);
            if (!exLoanAcc) return false;
            return exLoanAcc.toLowerCase() === pdfLoanAcc.toLowerCase() || 
                   (pdflDigits.length >= 6 && exlDigits.length >= 6 && exlDigits === pdflDigits);
        });
        if (match) return match;
    }

    // PASS 2: Match by Member Account Number ONLY for legacy records that don't yet have a specific loanAccountNo
    if (pdfMemberAcc) {
        const memberMatches = activeCandidates.filter(ex => {
            const exAccD     = digitsOnly(ex.accountNo);
            const exLoanAccD = digitsOnly(ex.loanAccountNo);
            return (exAccD === pdfmDigits || (exLoanAccD && exLoanAccD === pdfmDigits) || String(ex.accountNo || '').trim() === pdfMemberAcc);
        });

        // If an existing record for this member does NOT have a distinct loanAccountNo yet,
        // and matches the category, we can bind this loan to it.
        const unboundCategoryMatch = memberMatches.find(ex => {
            const exLoan = String(ex.loanAccountNo || '').trim();
            const exCat = String(ex.category || '').trim().toLowerCase();
            const isUnbound = !exLoan || exLoan === String(ex.accountNo || '').trim() || digitsOnly(exLoan) === digitsOnly(ex.accountNo);
            return isUnbound && (exCat === pdfCategory.toLowerCase() || !ex.category);
        });

        if (unboundCategoryMatch) {
            return unboundCategoryMatch;
        }

        // If all existing records for this member already belong to specific other loanAccountNumbers,
        // this is a NEW / SEPARATE loan for this member -> return null so a distinct loan profile is created!
        return null;
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

                const categoryRules = [
                    // Specific Multi-word / Prefixed rules first
                    { match: /01\s*-\s*(?:w;|ath|අත්|Adv)/i, name: "Advanced Loan" },
                    { match: /අත්තිකාරම්/, name: "Advanced Loan" },
                    { match: /අත්තිකාරම/, name: "Advanced Loan" },
                    { match: /Advance/i, name: "Advanced Loan" },
                    { match: /aththikar/i, name: "Advanced Loan" },
                    { match: /athikar/i, name: "Advanced Loan" },
                    { match: /w;a;sldr/, name: "Advanced Loan" },
                    { match: /w;sldr/, name: "Advanced Loan" },
                    { match: /w;a;s/, name: "Advanced Loan" },

                    // Athwela
                    { match: /අත්වැල/, name: "Athwela Team Loan" },
                    { match: /w;aje,/, name: "Athwela Team Loan" },
                    { match: /Athwela/i, name: "Athwela Team Loan" },

                    // Athamaru
                    { match: /අතමාරු/, name: "Athamaru Loan" },
                    { match: /w;udre/, name: "Athamaru Loan" },
                    { match: /Athamaru/i, name: "Athamaru Loan" },

                    // Other Categories
                    { match: /සාමාන්‍ය/, name: "General Loan" },
                    { match: /idudkH/, name: "General Loan" },
                    { match: /General/i, name: "General Loan" },

                    { match: /ක්ෂණික/, name: "Instant Loan" },
                    { match: /CIKsl/, name: "Instant Loan" },
                    { match: /Instant/i, name: "Instant Loan" },

                    { match: /ස්වශක්ති/, name: "Swashakthi Loan 01" },
                    { match: /iajYla;S/, name: "Swashakthi Loan 01" },
                    { match: /Swashakthi/i, name: "Swashakthi Loan 01" },

                    { match: /ව්‍යාපාරික/, name: "Business Loan" },
                    { match: /jHdmdßl/, name: "Business Loan" },
                    { match: /Business/i, name: "Business Loan" },

                    { match: /දිගු\s*කාලීන/, name: "Long Term Loan" },
                    { match: /දිගුකාලීන/, name: "Long Term Loan" },
                    { match: /os\.=\s*ld,Sk/, name: "Long Term Loan" },
                    { match: /os\.=/, name: "Long Term Loan" },
                    { match: /Long\s*Term/i, name: "Long Term Loan" },

                    { match: /උත්සව/, name: "Festival Loan" },
                    { match: /W;aij/, name: "Festival Loan" },
                    { match: /Festival/i, name: "Festival Loan" }
                ];

                // Regex 1: SmartCoop "All Loans" format (සියලුම ණය ලේඛනය)
                // Col Order: [MemberAcc] [Name] [LoanAcc] [LoanDate] [LoanAmt] [Months] [MonthlyInst] [Balance] [ArrInst] [0] [ArrAmt] [Rate] [Interest] [Penalty] [LastPaidDate]
                const allLoansRegex = /^(\d{5,12})\s+(.+?)(?:\s+|\b)(\d{2}-\d{6,8}-\d{4,6}|\w+-\w+-\w+)\s+(\d{4}-\d{2}-\d{2})\s+([\d,]+(?:\.\d+)?)\s+(\d+)\s+([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)\s+([\d.]+)\s*%?\s+([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)(?:\s+(\d{4}-\d{2}-\d{2}|-|N\/A))?/;

                // Regex 2: SmartCoop "Arrears Report" format (කල්පසු ණය ලේඛනය)
                // MUST start with hyphenated loan account number so it never mistakes member numbers for loan numbers
                const arrearsRegex = /^(\d{2}-\d{6,8}-\d{4,6}|[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+)\s+(\d+)\s+(.+?)\s+([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)\s+(\d+)\s+([\d.]+)\s*%\s+([\d,]+(?:\.\d+)?)\s+([\d.]+)\s+(\d{4}-\d{2}-\d{2})(?:\s+(\d{4}-\d{2}-\d{2}))?/;

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

                        // Category header detection (check non-loan lines against all category rules)
                        const isLoanRow = allLoansRegex.test(lineStr) || arrearsRegex.test(lineStr);
                        if (!isLoanRow) {
                            for (const rule of categoryRules) {
                                if (rule.match.test(lineStr)) {
                                    currentCategory = rule.name;
                                    break;
                                }
                            }
                        }

                        // Try All Loans Format first
                        const matchA = lineStr.match(allLoansRegex);
                        if (matchA) {
                            const arrInst   = parseFloat(matchA[9].replace(/,/g, '')) || 0;
                            const arrAmt    = parseFloat(matchA[11].replace(/,/g, '')) || 0;
                            const balAmt    = parseFloat(matchA[8].replace(/,/g, '')) || 0;
                            const lnAmt     = parseFloat(matchA[5].replace(/,/g, '')) || 0;
                            const monthlyInst = parseFloat(matchA[7].replace(/,/g, '')) || 0;
                            const lnRate    = parseFloat(matchA[12]) || 0;
                            const lnDate    = matchA[4].trim();
                            const lastPaid  = (matchA[15] && matchA[15].match(/^\d{4}-\d{2}-\d{2}$/)) ? matchA[15].trim() : null;
                            const rawName   = matchA[2].replace(/\b\d{7,12}\b/g, '').trim();

                            lastCustomer = {
                                accountNo           : matchA[1].trim(),
                                name                : rawName,
                                loanAccountNo       : matchA[3].trim(),
                                loanDate            : lnDate,
                                loanAmount          : lnAmt,
                                installmentAmount   : monthlyInst,
                                balanceAmount       : balAmt,
                                interestRate        : lnRate,
                                arrearsAmount       : arrAmt,
                                arrearsInstallments : arrInst,
                                lastPaidDate        : lastPaid,
                                category            : currentCategory,
                                status              : arrInst > 3 ? "High Risk" : "Normal",
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
                            continue;
                        }

                        // Fallback: Try Arrears Format (Old)
                        const matchB = lineStr.match(arrearsRegex);
                        if (matchB) {
                            const lnAmt   = parseFloat(matchB[4].replace(/,/g, '')) || 0;
                            const balAmt  = parseFloat(matchB[5].replace(/,/g, '')) || 0;
                            const lnRate  = parseFloat(matchB[7]) || 0;
                            const arrAmt  = parseFloat(matchB[8].replace(/,/g, '')) || 0;
                            const arrInst = parseFloat(matchB[9]) || 0;
                            const lnDate  = matchB[10].trim();
                            const lastPaid = matchB[11] || null;
                            const rawNameB = matchB[3].replace(/\b\d{7,12}\b/g, '').trim();

                            lastCustomer = {
                                loanAccountNo       : matchB[1].trim(),
                                accountNo           : matchB[2].trim(),
                                name                : rawNameB,
                                loanAmount          : lnAmt,
                                balanceAmount       : balAmt,
                                interestRate        : lnRate,
                                arrearsAmount       : arrAmt,
                                arrearsInstallments : arrInst,
                                loanDate            : lnDate,
                                lastPaidDate        : lastPaid,
                                category            : currentCategory,
                                status              : arrInst > 3 ? "High Risk" : "Normal",
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
                            // Clean up name if match had embedded digits
                            if (c.name && (!match.name || match.name.match(/\b\d{7,12}\b/))) {
                                match.name = c.name;
                            }
                            match.loanAmount         = c.loanAmount;
                            match.balanceAmount       = c.balanceAmount;
                            match.arrearsAmount       = c.arrearsAmount;
                            match.arrearsInstallments = c.arrearsInstallments;
                            if (c.category) match.category = c.category;
                            if (c.installmentAmount) match.installmentAmount = c.installmentAmount;
                            if (c.loanDate && !match.loanDate) match.loanDate = c.loanDate;
                            if (c.interestRate) match.interestRate = c.interestRate;
                            if (c.lastPaidDate)  match.lastPaidDate = c.lastPaidDate;

                            // Automatic Bidirectional Status Management:
                            // Protect manual terminal statuses ('Loan Closed' and any 'Legal Action' variants)
                            const currentStatus = String(match.status || 'Normal');
                            const isProtected = currentStatus === 'Loan Closed' || currentStatus.toLowerCase().includes('legal');

                            if (!isProtected) {
                                if (c.arrearsInstallments > 3) {
                                    // Arrears > 3 -> Automatically mark as High Risk
                                    if (match.status !== 'High Risk') {
                                        match.status = 'High Risk';
                                        match.statusDate = new Date().toISOString().split('T')[0];
                                    }
                                } else {
                                    // Arrears <= 3 (Loan paid / recovered) -> Automatically return to Normal
                                    if (match.status !== 'Normal') {
                                        match.status = 'Normal';
                                        match.statusDate = new Date().toISOString().split('T')[0];
                                    }
                                }
                            }

                            // Guarantor 1 & 2 details are kept as manually entered (never overwritten from PDF)
                            await window.db.update('customers', match.id, match);
                        } else {
                            newCount++;
                            c.status = (c.arrearsInstallments > 3) ? 'High Risk' : 'Normal';
                            c.addedDate = c.addedDate || new Date().toISOString().split('T')[0];
                            c.createdDate = c.createdDate || new Date().toISOString().split('T')[0];
                            // Guarantors remain blank for manual entry
                            c.guarantor1 = '';
                            c.guarantor1Address = '';
                            c.guarantor2 = '';
                            c.guarantor2Address = '';
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
                window.location.reload();

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

    // Group by unique loanAccountNo when available, or digitsOnly(accountNo) + category for legacy records
    const groups = {};
    for (const c of active) {
        const cleanLoanDigits = digitsOnly(c.loanAccountNo);
        const cleanAccDigits  = digitsOnly(c.accountNo);
        const hasDistinctLoanNo = cleanLoanDigits && cleanLoanDigits.length >= 6 && cleanLoanDigits !== cleanAccDigits;
        
        const key = hasDistinctLoanNo 
            ? ('loan_' + cleanLoanDigits) 
            : ('acc_' + cleanAccDigits + '_' + String(c.category || '').trim().toLowerCase());

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
