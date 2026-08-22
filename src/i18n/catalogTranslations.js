// src/i18n/catalogTranslations.js
//
// ΣΗΜΑΝΤΙΚΟ: Αυτό το αρχείο μεταφράζει ΜΟΝΟ την ΕΜΦΑΝΙΣΗ (display) των default
// κατηγοριών/προϊόντων. Τα πραγματικά δεδομένα (defaultData.js) ΔΕΝ αλλάζουν —
// παραμένουν στα ελληνικά γιατί χρησιμοποιούνται ως "κλειδιά ταυτότητας" για:
//   - το ιστορικό τιμών (priceHistory[όνομα])
//   - την αναγνώριση προϊόντων από OCR/receipt scanning (πάντα ελληνικά, αφού
//     οι πραγματικές αποδείξεις σούπερ μάρκετ είναι στα ελληνικά)
//   - matching κατά την εισαγωγή λίστας/backup
//
// Προϊόντα που προσθέτει ΧΕΙΡΟΚΙΝΗΤΑ ο χρήστης ΔΕΝ μπαίνουν εδώ — παραμένουν
// όπως τα έγραψε, σε όποια γλώσσα διάλεξε η εφαρμογή τη στιγμή εκείνη.

// Κατηγορίες — keyed by σταθερό id (ποτέ δεν αλλάζει, ασφαλές)
export const CATEGORY_TR_EN = {
  dairy: 'Dairy',
  bakery: 'Bakery',
  meat: 'Meat',
  vegetables: 'Vegetables & Fruit',
  drinks: 'Drinks',
  cleaning: 'Cleaning',
  sweets: 'Sweets',
  snacks: 'Chips & Nuts',
  pasta: 'Pasta & Cereals',
  sauces: 'Sauces',
  oils: 'Oil & Vinegar',
  other: 'Other',
};

// Προϊόντα — keyed by το ΑΚΡΙΒΕΣ ελληνικό όνομα (όπως στο defaultData.js)
export const PRODUCT_TR_EN = {
  // dairy
  'Γάλα': 'Milk',
  'Γιαούρτι': 'Yogurt',
  'Τυρί': 'Cheese',
  'Βούτυρο': 'Butter',
  'Κρέμα γάλακτος': 'Cream',
  // bakery
  'Ψωμί': 'Bread',
  'Φρυγανιές': 'Toast',
  'Κουλούρια': 'Koulouri (bread rings)',
  'Κρουασάν': 'Croissant',
  // meat
  'Κοτόπουλο': 'Chicken',
  'Μοσχάρι': 'Beef',
  'Χοιρινό': 'Pork',
  'Κιμάς': 'Ground meat',
  // vegetables
  'Ντομάτες': 'Tomatoes',
  'Πατάτες': 'Potatoes',
  'Κρεμμύδια': 'Onions',
  'Μαρούλι': 'Lettuce',
  'Καρότα': 'Carrots',
  // drinks
  'Νερό': 'Water',
  'Αναψυκτικά': 'Soft drinks',
  'Χυμοί': 'Juices',
  'Καφές': 'Coffee',
  // cleaning
  'Απορρυπαντικό ρούχων': 'Laundry detergent',
  'Υγρό πιάτων': 'Dish soap',
  'Χλωρίνη': 'Bleach',
  'Καθαριστικό': 'Cleaner',
  // sweets
  'Σοκολάτες': 'Chocolate',
  'Μπισκότα': 'Biscuits',
  'Παγωτά': 'Ice cream',
  'Κέικ': 'Cake',
  // snacks
  'Πατατάκια': 'Chips',
  'Αμύγδαλα': 'Almonds',
  'Φιστίκια': 'Peanuts',
  'Καρύδια': 'Walnuts',
  // pasta
  'Μακαρόνια': 'Pasta',
  'Ρύζι': 'Rice',
  'Δημητριακά πρωινού': 'Breakfast cereal',
  'Όσπρια': 'Legumes',
  // sauces
  'Σάλτσα ντομάτας': 'Tomato sauce',
  'Κέτσαπ': 'Ketchup',
  'Μαγιονέζα': 'Mayonnaise',
  'Μουστάρδα': 'Mustard',
  // oils
  'Ελαιόλαδο': 'Olive oil',
  'Σπορέλαιο': 'Vegetable oil',
  'Ξύδι': 'Vinegar',
  'Βαλσάμικο': 'Balsamic vinegar',
  // extra FREQUENT entries not already above
  'Αυγά': 'Eggs',
  'Μπανάνες': 'Bananas',
};
