$file = "reports.html"
$content = [System.IO.File]::ReadAllText($file)

# New CSS for print
$newCss = @"
        @media print {
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-shadow: none !important;
                text-shadow: none !important;
            }

            body {
                background: white !important;
                color: black !important;
                font-family: 'Outfit', 'Segoe UI', serif !important;
                font-size: 10pt;
                line-height: 1.4;
            }

            .sidebar, .modern-top-nav, .top-header, .no-print, #reportSummaryCards, .card.no-print {
                display: none !important;
            }

            .content-area {
                padding: 0 !important;
                margin: 0 !important;
            }

            .card {
                border: none !important;
                box-shadow: none !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border-radius: 0 !important;
            }

            .premium-table {
                width: 100% !important;
                border-collapse: collapse !important;
                border: 1.5pt solid #000 !important;
                margin-top: 10pt;
            }

            .premium-table th {
                background: #f0f0f0 !important;
                color: #000 !important;
                border: 1pt solid #000 !important;
                padding: 10pt 6pt !important;
                text-transform: uppercase !important;
                font-size: 9pt !important;
                font-weight: 800 !important;
                text-align: center !important;
            }

            .premium-table td {
                border: 0.5pt solid #000 !important;
                color: #000 !important;
                padding: 8pt 6pt !important;
                vertical-align: top !important;
                font-size: 9pt !important;
            }

            .badge {
                border: 1.5pt solid #000 !important;
                background: transparent !important;
                color: #000 !important;
                padding: 2pt 6pt !important;
                font-weight: 800 !important;
                text-transform: uppercase !important;
                font-size: 7.5pt !important;
                border-radius: 0 !important;
                display: inline-block !important;
            }

            .print-only {
                display: block !important;
            }

            .signature-grid {
                display: grid !important;
                grid-template-columns: repeat(3, 1fr);
                gap: 50pt;
                text-align: center;
                margin-top: 80pt;
                font-size: 9pt;
            }
        }
"@

# New Header HTML
$newHeader = @"
        <!-- Print Header -->
        <div class="print-only" style="padding: 0 0 15pt 0; border-bottom: 2pt solid #000; margin-bottom: 25pt;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 20pt;">
                    <img src="assets/logo.png" style="height: 65pt; filter: grayscale(100%);">
                    <div>
                        <h1 id="printBankName" style="font-size: 18pt; font-weight: 800; color: #000; margin: 0; text-transform: uppercase; letter-spacing: 1px;">GALAPITIYAGAMA SANASA BANK</h1>
                        <p style="font-size: 10pt; color: #000; margin: 2pt 0 0 0; font-weight: 600;">Loan Recovery Management System</p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <h2 style="font-size: 13pt; font-weight: 800; margin: 0; text-transform: uppercase;">Recovery Report</h2>
                    <p style="font-size: 9pt; margin: 4pt 0 0 0; font-weight: 600;">Generated: <span id="printDate"></span></p>
                </div>
            </div>
            <div style="margin-top: 15pt; display: flex; gap: 40pt; font-size: 10pt; border-top: 1pt solid #000; padding-top: 10pt;">
                <div><span style="font-weight: 800; text-transform: uppercase;">Status:</span> <span id="printFilterLabel" style="margin-left: 5pt;"></span></div>
                <div><span style="font-weight: 800; text-transform: uppercase;">Target Month:</span> <span id="printMonthLabel" style="margin-left: 5pt;"></span></div>
            </div>
        </div>
"@

# Replacement logic using regex to handle spacing/formatting variations
$content = $content -replace '(?si)\s*@media print \{.*?\}\s*@page \{.*?\}', "`n$newCss`n`n        @page { size: A4 portrait; margin: 1.5cm; }"
$content = $content -replace '(?si)<!-- Print Header -->.*?</div>', $newHeader

[System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
Write-Host "Injected legal print styles and header into reports.html"
