import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Order } from '../services/orders';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildInvoiceHtml(order: Order): string {
  const rows = order.items
    .map(
      (item) => `
    <tr>
      <td>${escapeHtml(item.productName)}</td>
      <td>${escapeHtml(item.categoryName || '—')}</td>
      <td class="center">${item.quantity}</td>
      <td class="right">₪${item.pricePerUnit.toFixed(2)} / ${escapeHtml(item.unit)}</td>
      <td class="right">₪${item.total.toFixed(2)}</td>
    </tr>`
    )
    .join('');

  const invoiceRef = order.invoiceReference?.trim();
  const showSubtotal = Math.abs(order.subtotal - order.total) > 0.009;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(order.orderNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #111827;
      padding: 40px;
      max-width: 820px;
      margin: 0 auto;
      line-height: 1.45;
    }
    h1 { font-size: 28px; margin: 0 0 6px; }
    .meta { color: #6b7280; font-size: 13px; margin-bottom: 28px; }
    .grid { display: flex; gap: 32px; margin-bottom: 28px; }
    .grid > div { flex: 1; }
    .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #6b7280;
      margin-bottom: 6px;
      font-weight: 700;
    }
    .party { font-size: 14px; }
    .status {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 999px;
      background: #eff6ff;
      color: #1d4ed8;
      font-size: 12px;
      font-weight: 700;
      text-transform: capitalize;
    }
    .ref {
      margin-top: 14px;
      padding: 12px 14px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 13px;
      word-break: break-word;
    }
    h2 {
      font-size: 13px;
      margin: 28px 0 10px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #374151;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      border-bottom: 1px solid #e5e7eb;
      padding: 10px 8px;
      text-align: left;
      font-size: 13px;
      vertical-align: top;
    }
    th {
      background: #f3f4f6;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #4b5563;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .note { margin-top: 20px; font-size: 13px; color: #374151; }
    .total-box { margin-top: 28px; text-align: right; }
    .subtotal { color: #6b7280; margin-bottom: 6px; font-size: 14px; }
    .total { font-size: 26px; font-weight: 800; color: #2563eb; }
    .footer {
      margin-top: 48px;
      font-size: 11px;
      color: #9ca3af;
      text-align: center;
    }
    @media print {
      body { padding: 24px; }
    }
  </style>
</head>
<body>
  <h1>Invoice</h1>
  <div class="meta">
    Order ${escapeHtml(order.orderNumber)} · ${escapeHtml(order.createdAt.toLocaleString())}
  </div>
  <div class="grid">
    <div>
      <div class="label">Seller</div>
      <div class="party">
        <strong>${escapeHtml(order.supplierName)}</strong><br />
        ${order.supplierEmail ? `${escapeHtml(order.supplierEmail)}<br />` : ''}
        ${order.supplierPhone ? `${escapeHtml(order.supplierPhone)}<br />` : ''}
        ${order.supplierAddress ? escapeHtml(order.supplierAddress) : ''}
      </div>
    </div>
    <div>
      <div class="label">Buyer</div>
      <div class="party">
        <strong>${escapeHtml(order.buyerName)}</strong><br />
        ${order.buyerEmail ? `${escapeHtml(order.buyerEmail)}<br />` : ''}
        ${order.buyerPhone ? `${escapeHtml(order.buyerPhone)}<br />` : ''}
        ${order.buyerAddress ? escapeHtml(order.buyerAddress) : ''}
      </div>
    </div>
  </div>
  <div class="label">Invoice status</div>
  <span class="status">${escapeHtml(order.invoiceStatus || 'sent')}</span>
  ${
    invoiceRef
      ? `<div class="ref"><strong>Reference:</strong> ${escapeHtml(invoiceRef)}</div>`
      : '<div class="ref">No reference text was provided by the seller.</div>'
  }
  <h2>Line items</h2>
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>Category</th>
        <th class="center">Qty</th>
        <th class="right">Unit price</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  ${order.note ? `<p class="note"><strong>Note:</strong> ${escapeHtml(order.note)}</p>` : ''}
  <div class="total-box">
    ${
      showSubtotal
        ? `<div class="subtotal">Subtotal: ₪${order.subtotal.toFixed(2)}</div>`
        : ''
    }
    <div class="total">₪${order.total.toFixed(2)}</div>
  </div>
  <p class="footer">Generated by Loopify</p>
</body>
</html>`;
}

function downloadInvoicePdfWeb(html: string, fileName: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Could not open the print window. Allow pop-ups and try again.');
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = fileName.replace(/\.pdf$/i, '');

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  };

  // Fallback if onload does not fire for written documents.
  setTimeout(() => {
    if (!printWindow.closed) {
      printWindow.focus();
      printWindow.print();
    }
  }, 400);
}

async function downloadInvoicePdfNative(html: string, orderNumber: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();

  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Invoice — ${orderNumber}`,
      UTI: 'com.adobe.pdf',
    });
    return;
  }

  throw new Error('Sharing is not available on this device.');
}

export async function downloadInvoicePdf(order: Order): Promise<void> {
  const html = buildInvoiceHtml(order);
  const fileName = `invoice-${order.orderNumber.replace(/[^a-zA-Z0-9-_]/g, '-')}.pdf`;

  if (Platform.OS === 'web') {
    downloadInvoicePdfWeb(html, fileName);
    return;
  }

  await downloadInvoicePdfNative(html, order.orderNumber);
}
