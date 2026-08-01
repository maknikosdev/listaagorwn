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
- 📊 **Ανάλυση Εξόδων** (νέο): επίλεξε εύρος ημερομηνιών και δες πόσα ξόδεψες συνολικά — μπορείς επίσης να φιλτράρεις ανά κατηγορία (π.χ. πόσα πήγαν σε "Λαχανικά") ή ανά συγκεκριμένα προϊόντα
- ⭐ Αυτόματη λίστα "Συχνά αγοραζόμενα" βάσει του τι ψωνίζω πιο συχνά
- 📄 Εξαγωγή/εισαγωγή λίστας σε PDF και JSON
- 🗂️ Backup & επαναφορά κατηγοριών, καταλόγου προϊόντων και ιστορικού τιμών — χρήσιμο όταν αλλάζω κινητό
- 🔒 100% offline — όλα μένουν στη συσκευή μου, χωρίς λογαριασμό, χωρίς διαφημίσεις

### 🧱 Με τι είναι φτιαγμένη

- [Expo](https://expo.dev) (SDK 53) / React Native
- [EAS Build](https://docs.expo.dev/build/introduction/) για τα production builds
- `@react-native-async-storage/async-storage` για τοπική αποθήκευση
- `react-native-safe-area-context` για σωστό edge-to-edge layout σε Android 15+
- `expo-document-picker`, `expo-file-system`, `expo-sharing` για export/import αρχείων
- `expo-build-properties` για ρύθμιση των Android SDK levels

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
│   │   └── defaultData.js          # Προεπιλεγμένες κατηγορίες, προϊόντα, μάρκετ
│   ├── theme/
│   │   └── index.js                # Χρώματα, spacing, στυλ σταθερές
│   ├── components/
│   │   └── CameraModal.js          # Modal σάρωσης τιμής με κάμερα (OCR)
│   └── utils/
│       ├── pdfExport.js            # Εξαγωγή λίστας σε PDF
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

### 🆕 Τι πρόσθεσα στην 1.2.0

- 📊 Νέο κουμπί "Ανάλυση" στο Ιστορικό Τιμών, με φίλτρα εύρους ημερομηνιών (custom ή γρήγορα presets όπως "30 ημέρες"/"Φέτος"), ανάλυση ανά κατηγορία ή ανά συγκεκριμένα προϊόντα, και συνολικό ποσό εξόδων με αναλυτική λίστα

### 🐛 Τι διόρθωσα στην 1.1.0

- **Edge-to-edge layout (Android 15+):** τα πάνω/κάτω UI στοιχεία χρησιμοποιούν πλέον `react-native-safe-area-context`, ώστε να μην κρύβονται πίσω από τη status bar / gesture navigation bar.
- **Predictive back gesture:** το απενεργοποίησα ρητά μέσω custom config plugin (`plugins/withDisablePredictiveBack.js`), γιατί έσπαγε το `BackHandler` του React Native.
- **Σπάνιο crash στο toggle "Προϊόν ζύγισης":** διορθώθηκε με `Keyboard.dismiss()` πριν αλλάξει η προβολή, ώστε να μην καταρρέει το layout όταν το πληκτρολόγιο είναι ανοιχτό.

### 🧭 Τι ξέρω ότι χρειάζεται δουλειά ακόμα

- **Μονολιθικό `App.js`:** όλες οι οθόνες και τα modals είναι προς το παρόν σε ένα αρχείο (~2.000+ γραμμές), χωρίς React Navigation ή ξεχωριστά components ανά οθόνη. Δουλεύει μια χαρά, αλλά είναι στη λίστα μου για refactor.
- **Predictive back gesture:** το κράτησα απενεργοποιημένο σαν προσωρινή λύση. Ο στόχος είναι κάποια στιγμή να το υποστηρίξω σωστά μέσω navigation library (π.χ. React Navigation), αντί να μένει έτσι.

### 🔐 Σημείωση ασφαλείας

Το keystore **δεν** είναι μέσα σε αυτό το repo — το κρατάει η Expo/EAS στους δικούς τους servers. Ποτέ δεν κάνω commit `.jks`, `.keystore` ή credentials σε plain text (δες `.gitignore`).

### 📄 Άδεια χρήσης

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
- 📊 **Expense Analysis** (new): pick a date range and see how much you spent in total — you can also filter by category (e.g. how much went to "Vegetables") or by specific products
- ⭐ Automatic "Frequently bought" list based on what I buy most
- 📄 Export/import shopping list as PDF and JSON
- 🗂️ Backup & restore categories, product catalog, and price history — handy when switching phones
- 🔒 100% offline — everything stays on my device, no account, no ads

### 🧱 Built with

- [Expo](https://expo.dev) (SDK 53) / React Native
- [EAS Build](https://docs.expo.dev/build/introduction/) for production builds
- `@react-native-async-storage/async-storage` for local persistence
- `react-native-safe-area-context` for correct edge-to-edge layout on Android 15+
- `expo-document-picker`, `expo-file-system`, `expo-sharing` for file export/import
- `expo-build-properties` to configure Android SDK levels

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
│   │   └── defaultData.js          # Default categories, products, stores
│   ├── theme/
│   │   └── index.js                # Colors, spacing, style constants
│   ├── components/
│   │   └── CameraModal.js          # Camera price-scanning modal (OCR)
│   └── utils/
│       ├── pdfExport.js            # Export list to PDF
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

### 🆕 What's new in 1.2.0

- 📊 New "Analysis" button on the Price History screen, with date-range filters (custom or quick presets like "30 days"/"This year"), analysis by category or by specific products, and a total spend figure with a breakdown list

### 🐛 What I fixed in 1.1.0

- **Edge-to-edge layout (Android 15+):** top/bottom UI elements now use `react-native-safe-area-context` so they don't sit behind the status bar / gesture navigation bar anymore.
- **Predictive back gesture:** explicitly disabled it via a custom config plugin (`plugins/withDisablePredictiveBack.js`) since it was breaking React Native's `BackHandler`.
- **Rare crash toggling "Weighed product":** fixed by calling `Keyboard.dismiss()` before switching views, so the layout doesn't collapse while the keyboard is open.

### 🧭 What still needs work

- **Monolithic `App.js`:** all screens and modals currently live in one file (~2,000+ lines), with no React Navigation or per-screen components. It works fine, but it's on my list for a refactor.
- **Predictive back gesture:** kept disabled as a temporary workaround. Eventually I want to support it properly through a navigation library (e.g. React Navigation) instead of leaving it off.

### 🔐 Security note

The signing keystore is **not** in this repo — it's managed by Expo/EAS on their servers. I never commit `.jks`/`.keystore` files or plaintext credentials (see `.gitignore`).

### 📄 License

My own private project — all rights reserved.
