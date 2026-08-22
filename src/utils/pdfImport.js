import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { DEFAULT_PRODUCTS } from '../data/defaultData';

const KEYWORD_MAP = {
  dairy: ['γάλα','γιαούρτι','τυρί','βούτυρο','κρέμα γάλακτος','φέτα','ανθότυρο','αυγά','αβγά','κεφίρ','milk','cheese','butter','cream','eggs','yogurt'],
  bakery: ['ψωμί','φρυγανιές','κουλούρι','κρουασάν','παξιμάδι','πίτα','τσουρέκι','bread','toast','croissant','baguette'],
  meat: ['κοτόπουλο','μοσχάρι','χοιρινό','κιμάς','αρνί','λουκάνικο','μπέικον','σαλάμι','ζαμπόν','μπριζόλα','chicken','beef','pork','mince','lamb','sausage','bacon','ham'],
  vegetables: ['ντομάτα','πατάτα','κρεμμύδι','μαρούλι','καρότο','αγγούρι','πιπεριά','μελιτζάνα','κολοκυθάκι','σκόρδο','σπανάκι','μπρόκολο','μήλο','πορτοκάλι','μπανάνα','λεμόνι','tomato','potato','onion','lettuce','carrot','cucumber','pepper','garlic','apple','banana'],
  drinks: ['νερό','αναψυκτικό','χυμός','καφές','τσάι','μπύρα','κρασί','ούζο','water','juice','coffee','tea','beer','wine','cola','soda'],
  cleaning: ['απορρυπαντικό','υγρό πιάτων','χλωρίνη','καθαριστικό','μαλακτικό','χαρτί κουζίνας','χαρτί τουαλέτας','detergent','bleach','cleaner'],
  sweets: ['σοκολάτα','μπισκότο','παγωτό','καραμέλα','τούρτα','μέλι','μαρμελάδα','chocolate','biscuit','cookie','candy','cake','honey','jam'],
  snacks: ['πατατάκια','αμύγδαλα','φιστίκια','καρύδια','ποπ κορν','chips','almonds','peanuts','nuts','popcorn'],
  pasta: ['μακαρόνια','ρύζι','δημητριακά','όσπρια','φακές','ρεβύθια','φασόλια','pasta','rice','cereal','lentils','beans','spaghetti'],
  sauces: ['σάλτσα','κέτσαπ','μαγιονέζα','μουστάρδα','αλάτι','πιπέρι','μπαχαρικά','ρίγανη','sauce','ketchup','mayonnaise','mustard','salt'],
  oils: ['ελαιόλαδο','σπορέλαιο','λάδι','ξύδι','βαλσάμικο','μαργαρίνη','olive oil','oil','vinegar'],
  other: [],
};

export function categorizeProduct(name) {
  const lower = name.toLowerCase().trim();
  for (const [catId, products] of Object.entries(DEFAULT_PRODUCTS)) {
    if (products.some(p => p.toLowerCase() === lower)) return catId;
  }
  let bestCat = 'other';
  let bestScore = 0;
  for (const [catId, keywords] of Object.entries(KEYWORD_MAP)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) score += kw.length;
    }
    if (score > bestScore) { bestScore = score; bestCat = catId; }
  }
  return bestCat;
}

export async function importFromPDF(t) {
  const tt = t || ((k) => k);
  // Pick file — accept JSON and PDF
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'application/pdf', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  const file = result.assets[0];
  const fileName = (file.name || '').toLowerCase();

  // Read as UTF-8 text
  let textContent = '';
  try {
    textContent = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (e) {
    throw new Error(tt('impCouldNotReadFile'));
  }

  // ── JSON format (from our "Αποθήκευση λίστας" export) ──
  if (fileName.endsWith('.json') || textContent.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(textContent);
      if (parsed.version === 1 && Array.isArray(parsed.items)) {
        return parsed.items.map(item => ({
          name: item.name,
          catId: item.catId || categorizeProduct(item.name),
          qty: item.qty || 1,
          isWeighed: item.isWeighed || false,
          kgAmount: item.kgAmount || null,
        }));
      }
    } catch (e) {
      throw new Error(tt('impInvalidJsonFile'));
    }
  }

  // ── PDF — not supported for import ──
  if (fileName.endsWith('.pdf') || textContent.startsWith('%PDF')) {
    throw new Error(tt('impPdfNotSupported'));
  }

  // ── Plain text — parse line by line ──
  const lines = textContent
    .split(/[\n\r]+/)
    .map(l => l.replace(/^[○✓\-\*•\d\.\)]\s*/, '').trim())
    .filter(l => l.length > 1 && l.length < 100)
    .filter(l => !l.match(/^(Λίστα|Αρχική|Κατηγορ|Εξαγωγή|Import|Export|Page|Σελίδα|🛒|📄)/i));

  if (lines.length === 0) {
    throw new Error(tt('impNoProductsFound'));
  }

  return lines.map(name => ({ name, catId: categorizeProduct(name), qty: 1 }));
}
