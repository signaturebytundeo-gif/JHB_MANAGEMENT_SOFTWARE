import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/dal';
import puppeteer from 'puppeteer';

export async function POST(req: Request) {
  try {
    const session = await verifySession();
    const { reportData, reportType = 'quarterly-distribution' } = await req.json();

    if (!reportData) {
      return NextResponse.json(
        { error: 'Report data is required' },
        { status: 400 }
      );
    }

    // Generate HTML for the report
    const htmlContent = generateReportHTML(reportData, reportType);

    // Generate PDF using puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent);

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm',
      },
    });

    await browser.close();

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="JHB-${reportType}-${reportData.metadata?.quarter || 'report'}.pdf"`,
      },
    });
  } catch (error) {
    console.error('[pdf-report] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF report' },
      { status: 500 }
    );
  }
}

function generateReportHTML(reportData: any, reportType: string): string {
  const { reports, summary, metadata } = reportData;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Jamaica House Brand - ${reportType} Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #16A085;
        }
        .header h1 {
            color: #16A085;
            margin: 0 0 10px 0;
            font-size: 28px;
        }
        .header h2 {
            color: #2c3e50;
            margin: 0;
            font-size: 20px;
            font-weight: normal;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #16A085;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #2c3e50;
            font-size: 14px;
            text-transform: uppercase;
        }
        .summary-card .value {
            font-size: 24px;
            font-weight: bold;
            color: #16A085;
        }
        .location-report {
            margin-bottom: 40px;
            break-inside: avoid;
        }
        .location-header {
            background: #16A085;
            color: white;
            padding: 15px;
            border-radius: 8px 8px 0 0;
            margin-bottom: 0;
        }
        .location-header h3 {
            margin: 0;
            font-size: 18px;
        }
        .location-summary {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 0 0 8px 8px;
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        .location-summary div {
            text-align: center;
        }
        .location-summary .label {
            font-size: 12px;
            color: #7f8c8d;
            text-transform: uppercase;
        }
        .location-summary .value {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        table th,
        table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        table th {
            background-color: #34495e;
            color: white;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 12px;
        }
        table tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
        }
        @media print {
            body { margin: 0; }
            .location-report { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Jamaica House Brand</h1>
        <h2>Quarterly Distribution Report - ${summary.quarterLabel}</h2>
        <p>Generated on ${new Date(metadata.generatedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}</p>
    </div>

    <div class="summary-grid">
        <div class="summary-card">
            <h3>Total Locations</h3>
            <div class="value">${summary.totalLocations}</div>
        </div>
        <div class="summary-card">
            <h3>Total Bottles Distributed</h3>
            <div class="value">${summary.totalBottlesDistributed.toLocaleString()}</div>
        </div>
        <div class="summary-card">
            <h3>Total Revenue</h3>
            <div class="value">$${summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div class="summary-card">
            <h3>Average per Location</h3>
            <div class="value">${Math.round(summary.totalBottlesDistributed / summary.totalLocations)}</div>
        </div>
    </div>

    ${reports.map((report: any) => `
        <div class="location-report">
            <div class="location-header">
                <h3>${report.location.name}</h3>
            </div>

            <div class="location-summary">
                <div>
                    <div class="label">Total Bottles</div>
                    <div class="value">${report.summary.totalBottlesDistributed}</div>
                </div>
                <div>
                    <div class="label">Revenue</div>
                    <div class="value">$${report.summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                    <div class="label">Location Type</div>
                    <div class="value">${report.location.type}</div>
                </div>
            </div>

            ${report.products.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Size</th>
                            <th>SKU</th>
                            <th class="text-right">Quantity Sold</th>
                            <th class="text-right">Revenue</th>
                            <th class="text-right">Avg Price</th>
                            <th class="text-center">Last Sale</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.products.map((product: any) => `
                            <tr>
                                <td>${product.productName}</td>
                                <td>${product.size}</td>
                                <td>${product.sku}</td>
                                <td class="text-right">${product.totalQuantitySold}</td>
                                <td class="text-right">$${product.totalRevenue.toFixed(2)}</td>
                                <td class="text-right">$${product.averageSellingPrice.toFixed(2)}</td>
                                <td class="text-center">${product.lastSaleDate ? new Date(product.lastSaleDate).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `
                <p style="text-align: center; color: #7f8c8d; font-style: italic; padding: 20px;">
                    No sales recorded for this location during ${summary.quarterLabel}
                </p>
            `}
        </div>
    `).join('')}

    <div class="footer">
        <p><strong>Jamaica House Brand Command Center</strong></p>
        <p>This report contains confidential business information. Distribution should be limited to authorized personnel only.</p>
        <p>Report Period: ${new Date(summary.quarterStart).toLocaleDateString()} - ${new Date(summary.quarterEnd).toLocaleDateString()}</p>
    </div>
</body>
</html>`;
}