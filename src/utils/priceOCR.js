/**
 * Price OCR using Claude Vision API.
 * Image is NEVER saved — only extracted numbers are returned.
 */
export async function extractPriceFromImage(base64Image, mode = 'price') {
  let prompt = '';

  if (mode === 'price') {
    prompt = `Κοίταξε αυτό το ταμπελάκι σούπερ μάρκετ.
Βρες ΜΟΝΟ την τιμή σε ευρώ (€).
Απάντησε ΜΟΝΟ με τον αριθμό, π.χ. "2.49".
Αν δεν βλέπεις τιμή, απάντησε "".`;

  } else if (mode === 'discount') {
    prompt = `Κοίταξε αυτό το ταμπελάκι προσφοράς.
Βρες ΜΟΝΟ το ποσό έκπτωσης.
- Αν είναι ευρώ (π.χ. "-0.50€"): απάντησε "0.50"
- Αν είναι ποσοστό (π.χ. "-20%"): απάντησε "20%"
Απάντησε ΜΟΝΟ με τον αριθμό (ή αριθμό+%).
Αν δεν βλέπεις έκπτωση, απάντησε "".`;

  } else if (mode === 'weight_label') {
    prompt = `Κοίταξε αυτό το ταμπελάκι τιμής/κιλό σούπερ μάρκετ.
Βρες ΜΟΝΟ την τιμή ανά κιλό (€/kg).
Απάντησε ΜΟΝΟ με τον αριθμό, π.χ. "5.99".
Αν δεν βλέπεις τιμή/κιλό, απάντησε "".`;

  } else if (mode === 'weight_receipt') {
    prompt = `Κοίταξε αυτή την απόδειξη/ταμπελάκι ζυγίσματος σούπερ μάρκετ.
Βρες και επέστρεψε JSON με:
- "pricePerKg": τιμή/κιλό σε ευρώ (π.χ. "5.99") ή null αν δεν υπάρχει
- "weightKg": βάρος σε κιλά (π.χ. "0.350") ή null αν δεν υπάρχει  
- "finalPrice": τελική τιμή σε ευρώ (π.χ. "2.10") ή null αν δεν υπάρχει
Απάντησε ΜΟΝΟ με JSON, π.χ.: {"pricePerKg":"5.99","weightKg":"0.350","finalPrice":"2.10"}
Αν δεν βλέπεις τίποτα, απάντησε: {}`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
            },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });

    const data = await response.json();
    const text = (data.content?.[0]?.text || '').trim();
    if (!text || text === '{}' || text === '""') return null;

    // Weight receipt — parse JSON
    if (mode === 'weight_receipt') {
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        if (parsed.pricePerKg || parsed.finalPrice) {
          return {
            type: 'weight_receipt',
            pricePerKg: parsed.pricePerKg || null,
            weightKg: parsed.weightKg || null,
            finalPrice: parsed.finalPrice || null,
            value: parsed.finalPrice || null,
          };
        }
      } catch (_) {}
      return null;
    }

    // Percentage discount
    if (mode === 'discount' && text.includes('%')) {
      const num = parseFloat(text.replace('%', '').trim());
      if (!isNaN(num) && num > 0 && num < 100) {
        return { value: num.toString(), type: 'percent' };
      }
    }

    // Euro amount
    const cleaned = text.replace(/[€$£\s]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) {
      return { value: num.toFixed(2), type: 'euro' };
    }

    return null;
  } catch (e) {
    console.error('OCR error:', e);
    return null;
  }
}
