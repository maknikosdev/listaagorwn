# 🛒 Λίστα Αγορών (Shopping List App)

🇬🇧 [English version below](#-english) | 🇬🇷 Ελληνική έκδοση παρακάτω

---

## 🇬🇷 Ελληνικά

Έφτιαξα αυτή την εφαρμογή για να οργανώνω τα ψώνια μου ανά κατηγορία και να κρατάω ιστορικό τιμών, ώστε να ξέρω πού βρίσκω πιο φθηνά ό,τι ψωνίζω συνήθως. Είναι Android app, χτισμένη με **React Native** και **Expo**, και τρέχει εξ ολοκλήρου offline.

### ✨ Τι κάνει

- 🛍️ Λίστα αγορών οργανωμένη σε κατηγορίες (προεπιλεγμένες + δικές μου custom)
- 💰 Καταχώρηση τιμής, μάρκας και μάρκετ για κάθε αγορά (με δυνατότητα να προσθέτεις κι εσύ δικό σου μάρκετ μέσω "Άλλο")
- ⚖️ Υποστήριξη προϊόντων ζύγισης (τιμή/κιλό)
- 🏷️ Προσφορές σε € ή % με αυτόματο υπολογισμό τιμής ραφιού
- 📈 Ιστορικό τιμών ανά προϊόν, με εύρεση φθηνότερης αγοράς
- 📊 **Ανάλυση Εξόδων**: επίλεξε εύρος ημερομηνιών και δες πόσα ξόδεψες συνολικά — μπορείς επίσης να φιλτράρεις ανά κατηγορία (π.χ. πόσα πήγαν σε "Λαχανικά") ή ανά συγκεκριμένα προϊόντα
- ⭐ Αυτόματη λίστα "Συχνά αγοραζόμενα" βάσει του τι ψωνίζω πιο συχνά
- 📄 Εξαγωγή/εισαγωγή λίστας σε PDF και JSON
- 🗂️ Backup & επαναφορά κατηγοριών, καταλόγου προϊόντων και ιστορικού τιμών — χρήσιμο όταν αλλάζω κινητό
- 🌐 **Δίγλωσση διεπαφή** (νέο): εναλλαγή Ελληνικά ⇄ Αγγλικά με ένα πάτημα, χωρίς επανεκκίνηση. Οι προεπιλεγμένες κατηγορίες και τα προϊόντα μεταφράζονται αυτόματα· τα δικά μου custom προϊόντα και οι μετονομασίες παραμένουν όπως τα έγραψα
- 🔒 100% offline — όλα μένουν στη συσκευή μου, χωρίς λογαριασμό, χωρίς διαφημίσεις

### 🧱 Με τι είναι φτιαγμένη

- [Expo](https://expo.dev) (SDK 53) / React Native
- [EAS Build](https://docs.expo.dev/build/introduction/) για τα production builds
- `@react-native-async-storage/async-storage` για τοπική αποθήκευση (και για την αποθήκευση της επιλεγμένης γλώσσας)
- `react-native-safe-area-context` για σωστό edge-to-edge layout σε Android 15+
- `expo-document-picker`, `expo-file-system`, `expo-sharing` για export/import αρχείων
- `expo-build-properties` για ρύθμιση των Android SDK levels
- Custom i18n σύστημα (χωρίς εξωτερική βιβλιοθήκη) — βλ. `src/i18n/`

### 📁 Δομή project

```
FinalApp_Fixed/
├── App.js                          # Όλη η εφαρμογή (οθόνες + modals)
├── app.json                        # Ρυθμίσεις Expo (SDK, plugins, package name)
├── eas.json                        # Ρυθμίσεις EAS build profiles
├── babel.config.js
├── metro.config.js
├── index.js                        # Entry point
├── plugins/
│   └── withDisablePredictiveBack.js  # Config plugin: απενεργοποιεί predictive back
│                                      # gesture ώστε να δουλεύει σωστά το BackHandler
├── src/
│   ├── data/
│   │   └── defaultData.js          # Προεπιλεγμένες κατηγορίες, προϊόντα, μάρκετ (πάντα ελληνικά — κλειδί ταυτότητας)
│   ├── i18n/
│   │   ├── translations.js         # Λεξικό UI strings EL/EN (212 κλειδιά)
│   │   ├── catalogTranslations.js  # Μετάφραση εμφάνισης default κατηγοριών/προϊόντων
│   │   └── LanguageContext.js      # Provider + hooks: t() για UI, td()/tc() για default κατάλογο
│   ├── theme/
│   │   └── index.js                # Χρώματα, spacing, στυλ σταθερές
│   ├── components/
│   │   ├── LanguageToggle.js       # Κουμπί εναλλαγής γλώσσας
│   │   └── CameraModal.js          # Modal σάρωσης τιμής με κάμερα (OCR) — δεν είναι ακόμα συνδεδεμένο στο App.js
│   └── utils/
│       ├── pdfExport.js            # Εξαγωγή λίστας σε PDF (ακολουθεί την επιλεγμένη γλώσσα)
│       ├── pdfImport.js            # Εισαγωγή λίστας από αρχείο
│       └── priceOCR.js             # Αναγνώριση τιμής από φωτογραφία
└── store-assets/                   # Υλικό για Play Store (icons, screenshots, κείμενα)
```

### 🚀 Πώς το τρέχω τοπικά

```bash
npm install
npx expo start
```

Άνοιξε το **Expo Go** στο κινητό και σκάναρε το QR code, ή πάτα `a` για emulator (Android).

### 📦 Build για το Play Store (production AAB)

```bash
npx eas login
npx expo-doctor          # έλεγχος πριν το build
eas build --platform android --profile production --clear-cache
```

Μόλις τελειώσει, κατεβάζω το `.aab` από το link του EAS και το ανεβάζω στο [Play Console](https://play.google.com/console) — πρώτα σε Internal Testing, μετά σε Production.

#### Τρέχουσες ρυθμίσεις Android SDK

| Ρύθμιση | Τιμή |
|---|---|
| `minSdkVersion` | 24 |
| `targetSdkVersion` | 36 (Android 16) |
| `compileSdkVersion` | 36 |

> Η Google απαιτεί `targetSdkVersion 36` για νέες υποβολές/ενημερώσεις από τις 31/8/2026.

### 🆕 Τι πρόσθεσα στην 1.3.0

- 🌐 **Δίγλωσση διεπαφή EL/EN**: νέο κουμπί εναλλαγής γλώσσας στην αρχική οθόνη. Καλύπτει όλο το UI (τίτλους, κουμπιά, μηνύματα, Alerts) και τις 12 προεπιλεγμένες κατηγορίες + 48 προεπιλεγμένα προϊόντα
- Η αρχιτεκτονική διαχωρίζει ρητά "δεδομένα ταυτότητας" (πάντα ελληνικά — ιστορικό τιμών, OCR matching, backup) από "εμφάνιση" (μεταφράζεται), ώστε η αλλαγή γλώσσας να μη σπάει ποτέ υπάρχοντα δεδομένα
- Custom προϊόντα και μετονομασμένες κατηγορίες του χρήστη δεν μεταφράζονται ποτέ αυτόματα — παραμένουν όπως γράφτηκαν
- Η εξαγωγή PDF ακολουθεί πλέον την επιλεγμένη γλώσσα
- 🐛 Διόρθωση: το `AddModal` (οθόνη "Προσθήκη στη λίστα") έκανε crash επειδή δεν του περνιόταν σωστά η λίστα κατηγοριών

### 🆕 Τι πρόσθεσα στην 1.2.0

- 📊 Νέο κουμπί "Ανάλυση" στο Ιστορικό Τιμών, με φίλτρα εύρους ημερομηνιών (custom ή γρήγορα presets όπως "30 ημέρες"/"Φέτος"), ανάλυση ανά κατηγορία ή ανά συγκεκριμένα προϊόντα, και συνολικό ποσό εξόδων με αναλυτική λίστα

### 🐛 Τι διόρθωσα στην 1.1.0

- **Edge-to-edge layout (Android 15+):** τα πάνω/κάτω UI στοιχεία χρησιμοποιούν πλέον `react-native-safe-area-context`, ώστε να μην κρύβονται πίσω από τη status bar / gesture navigation bar.
- **Predictive back gesture:** το απενεργοποίησα ρητά μέσω custom config plugin (`plugins/withDisablePredictiveBack.js`), γιατί έσπαγε το `BackHandler` του React Native.
- **Σπάνιο crash στο toggle "Προϊόν ζύγισης":** διορθώθηκε με `Keyboard.dismiss()` πριν αλλάξει η προβολή, ώστε να μην καταρρέει το layout όταν το πληκτρολόγιο είναι ανοιχτό.

### 🧭 Τι ξέρω ότι χρειάζεται δουλειά ακόμα

- **Μονολιθικό `App.js`:** όλες οι οθόνες και τα modals είναι προς το παρόν σε ένα αρχείο (~2.400+ γραμμές πλέον, μετά την προσθήκη i18n), χωρίς React Navigation ή ξεχωριστά components ανά οθόνη. Δουλεύει μια χαρά, αλλά είναι στη λίστα μου για refactor.
- **Predictive back gesture:** το κράτησα απενεργοποιημένο σαν προσωρινή λύση. Ο στόχος είναι κάποια στιγμή να το υποστηρίξω σωστά μέσω navigation library (π.χ. React Navigation), αντί να μένει έτσι.
- **`CameraModal.js` / `priceOCR.js`:** μεταφρασμένα, αλλά δεν είναι ακόμα συνδεδεμένα στο `App.js` — προφανώς λειτουργία σε εξέλιξη.
- **Επεξεργασία ονόματος default προϊόντος/κατηγορίας:** αν μετονομάσω ένα προεπιλεγμένο προϊόν ή κατηγορία, το νέο όνομα γίνεται μόνιμο (custom) και δεν ακολουθεί πλέον την αυτόματη μετάφραση — αναμενόμενη συμπεριφορά, αλλά καλό να το ξέρω.

Προσωπικό project μου — όλα τα δικαιώματα δικά μου.

---

## 🇬🇧 English

I built this app to organize my grocery shopping by category and keep a price history, so I know where things are cheaper. It's an Android app, built with **React Native** and **Expo**, and it runs entirely offline.

### ✨ What it does

- 🛍️ Shopping list organized into categories (default + my own custom ones)
- 💰 Log price, brand, and store for every purchase (you can add your own store via "Other")
- ⚖️ Support for weighed products (price per kg)
- 🏷️ Offers in € or % with automatic shelf-price calculation
- 📈 Price history per product, with automatic cheapest-purchase detection
- 📊 **Expense Analysis**: pick a date range and see how much you spent in total — you can also filter by category (e.g. how much went to "Vegetables") or by specific products
- ⭐ Automatic "Frequently bought" list based on what I buy most
- 📄 Export/import shopping list as PDF and JSON
- 🗂️ Backup & restore categories, product catalog, and price history — handy when switching phones
- 🌐 **Bilingual interface** (new): switch Greek ⇄ English with one tap, no restart needed. Default categories and products translate automatically; my own custom products and renamed categories stay exactly as I typed them
- 🔒 100% offline — everything stays on my device, no account, no ads

### 🧱 Built with

- [Expo](https://expo.dev) (SDK 53) / React Native
- [EAS Build](https://docs.expo.dev/build/introduction/) for production builds
- `@react-native-async-storage/async-storage` for local persistence (and for storing the selected language)
- `react-native-safe-area-context` for correct edge-to-edge layout on Android 15+
- `expo-document-picker`, `expo-file-system`, `expo-sharing` for file export/import
- `expo-build-properties` to configure Android SDK levels
- Custom i18n system (no external library) — see `src/i18n/`

### 📁 Project structure

```
FinalApp_Fixed/
├── App.js                          # The whole app (screens + modals)
├── app.json                        # Expo config (SDK, plugins, package name)
├── eas.json                        # EAS build profile settings
├── babel.config.js
├── metro.config.js
├── index.js                        # Entry point
├── plugins/
│   └── withDisablePredictiveBack.js  # Config plugin: disables the predictive
│                                      # back gesture so BackHandler works reliably
├── src/
│   ├── data/
│   │   └── defaultData.js          # Default categories, products, stores (always Greek — identity key)
│   ├── i18n/
│   │   ├── translations.js         # UI strings dictionary EL/EN (212 keys)
│   │   ├── catalogTranslations.js  # Display translation for default categories/products
│   │   └── LanguageContext.js      # Provider + hooks: t() for UI, td()/tc() for the default catalog
│   ├── theme/
│   │   └── index.js                # Colors, spacing, style constants
│   ├── components/
│   │   ├── LanguageToggle.js       # Language switch button
│   │   └── CameraModal.js          # Camera price-scanning modal (OCR) — not wired into App.js yet
│   └── utils/
│       ├── pdfExport.js            # Export list to PDF (follows the selected language)
│       ├── pdfImport.js            # Import list from file
│       └── priceOCR.js             # Price recognition from photo
└── store-assets/                   # Play Store assets (icons, screenshots, copy)
```

### 🚀 Running it locally

```bash
npm install
npx expo start
```

Open **Expo Go** on your phone and scan the QR code, or press `a` for an emulator.

### 📦 Building for the Play Store (production AAB)

```bash
npx eas login
npx expo-doctor          # sanity check before building
eas build --platform android --profile production --clear-cache
```

Once it's done, I download the `.aab` from the EAS link and upload it to the [Play Console](https://play.google.com/console) — Internal Testing first, then Production.

#### Current Android SDK settings

| Setting | Value |
|---|---|
| `minSdkVersion` | 24 |
| `targetSdkVersion` | 36 (Android 16) |
| `compileSdkVersion` | 36 |

> Google requires `targetSdkVersion 36` for new submissions/updates starting 31 Aug 2026.

### 🆕 What's new in 1.3.0

- 🌐 **Bilingual EL/EN interface**: new language toggle button on the home screen. Covers the whole UI (titles, buttons, messages, alerts) plus all 12 default categories and 48 default products
- The architecture explicitly separates "identity data" (always Greek — price history, OCR matching, backups) from "display" (translated), so switching languages never breaks existing data
- The user's own custom products and renamed categories are never auto-translated — they stay exactly as written
- PDF export now follows the selected language
- 🐛 Fix: `AddModal` (the "Add to list" screen) was crashing because the category list wasn't being passed to it correctly

### 🆕 What's new in 1.2.0

- 📊 New "Analysis" button on the Price History screen, with date-range filters (custom or quick presets like "30 days"/"This year"), analysis by category or by specific products, and a total spend figure with a breakdown list

### 🐛 What I fixed in 1.1.0

- **Edge-to-edge layout (Android 15+):** top/bottom UI elements now use `react-native-safe-area-context` so they don't sit behind the status bar / gesture navigation bar anymore.
- **Predictive back gesture:** explicitly disabled it via a custom config plugin (`plugins/withDisablePredictiveBack.js`) since it was breaking React Native's `BackHandler`.
- **Rare crash toggling "Weighed product":** fixed by calling `Keyboard.dismiss()` before switching views, so the layout doesn't collapse while the keyboard is open.

### 🧭 What still needs work

- **Monolithic `App.js`:** all screens and modals currently live in one file (~2,400+ lines now, after the i18n addition), with no React Navigation or per-screen components. It works fine, but it's on my list for a refactor.
- **Predictive back gesture:** kept disabled as a temporary workaround. Eventually I want to support it properly through a navigation library (e.g. React Navigation) instead of leaving it off.
- **`CameraModal.js` / `priceOCR.js`:** translated, but not wired into `App.js` yet — apparently a work in progress.
- **Renaming a default product/category:** once renamed, it becomes permanent (custom) and no longer follows automatic translation — expected behavior, but good to keep in mind.

### 📄 License

My own private project — all rights reserved.
