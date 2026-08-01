import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Exports the current shopping list as a PDF and opens share sheet.
 * Format is structured so it can be re-imported later.
 */
export async function exportListAsPDF(listItems, allCategories) {
  if (!listItems || listItems.length === 0) {
    throw new Error('Η λίστα είναι άδεια');
  }

  // Group by category
  const grouped = {};
  listItems.forEach(item => {
    const key = item.catId || 'other';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  const today = new Date().toLocaleDateString('el-GR');

  // Build HTML
  let rows = '';
  Object.entries(grouped).forEach(([catId, items]) => {
    const cat = allCategories.find(c => c.id === catId) || { name: 'Άλλα', emoji: '🧩' };
    rows += `
      <tr class="cat-header">
        <td colspan="3">${cat.emoji} ${cat.name}</td>
      </tr>
    `;
    items.forEach(item => {
      const checked = item.checked ? '✓' : '○';
      rows += `
        <tr class="product-row" data-name="${escapeHtml(item.name)}" data-catid="${escapeHtml(item.catId || 'other')}">
          <td class="check">${checked}</td>
          <td class="name">${escapeHtml(item.name)}</td>
          <td class="qty">${item.qty > 1 ? `x${item.qty}` : ''}</td>
        </tr>
      `;
    });
  });

  // Embed all product data as JSON in a hidden div for re-import
  const importData = JSON.stringify(listItems.map(i => ({
    name: i.name,
    catId: i.catId,
    qty: i.qty,
  })));

  const html = `
<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 32px; color: #1a1a1a; background: #fff; }
    .header { display:flex; align-items:center; gap:16px; margin-bottom:32px; border-bottom: 3px solid #1B4332; padding-bottom:16px; }
    .logo-placeholder { width:60px; height:60px; background:#1B4332; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:28px; color:white; }
    .header-text h1 { font-size:24px; color:#1B4332; font-weight:800; }
    .header-text p { font-size:12px; color:#666; margin-top:4px; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    .cat-header td { background:#1B4332; color:white; padding:10px 14px; font-size:13px; font-weight:700; letter-spacing:0.5px; border-radius:4px; }
    .product-row td { padding:10px 14px; border-bottom:1px solid #f0f0f0; font-size:14px; }
    .product-row:nth-child(even) td { background:#f9fbf9; }
    .check { width:32px; color:#1B4332; font-weight:700; text-align:center; }
    .qty { width:40px; text-align:right; color:#888; font-size:12px; }
    .name { font-weight:500; }
    .footer { margin-top:32px; padding-top:16px; border-top:1px solid #ddd; font-size:11px; color:#999; text-align:center; }
    /* Hidden import data */
    .import-data { display:none; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-placeholder">🛒</div>
    <div class="header-text">
      <h1>Λίστα Αγορών</h1>
      <p>Εξαγωγή: ${today} · ${listItems.length} προϊόντα</p>
    </div>
  </div>
  <table>
    ${rows}
  </table>
  <div class="footer">
    Δημιουργήθηκε από την εφαρμογή Λίστα Αγορών
  </div>
  <!-- IMPORT_DATA_BEGIN
  ${importData}
  IMPORT_DATA_END -->
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Κοινοποίηση Λίστας Αγορών',
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new Error('Η κοινοποίηση δεν είναι διαθέσιμη σε αυτή τη συσκευή');
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
