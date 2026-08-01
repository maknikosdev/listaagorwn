export const CATEGORIES = [
  { id:'dairy',      name:'Γαλακτοκομικά',           emoji:'🥛', color:'#E8F4FD', accent:'#2196F3' },
  { id:'bakery',     name:'Αρτοποιείο',               emoji:'🍞', color:'#FFF3E0', accent:'#FF9800' },
  { id:'meat',       name:'Κρέας',                    emoji:'🥩', color:'#FCE4EC', accent:'#E91E63' },
  { id:'vegetables', name:'Λαχανικά',                 emoji:'🥦', color:'#E8F5E9', accent:'#4CAF50' },
  { id:'drinks',     name:'Ποτά',                     emoji:'🧃', color:'#E3F2FD', accent:'#1976D2' },
  { id:'cleaning',   name:'Καθαριστικά',              emoji:'🧴', color:'#E0F7FA', accent:'#00BCD4' },
  { id:'sweets',     name:'Γλυκά',                    emoji:'🍫', color:'#FBE9E7', accent:'#795548' },
  { id:'snacks',     name:'Πατατάκια & Ξηροί',        emoji:'🥜', color:'#FFF8E1', accent:'#FFC107' },
  { id:'pasta',      name:'Μακαρόνια & Δημητριακά',  emoji:'🍝', color:'#FFF9C4', accent:'#F57F17' },
  { id:'sauces',     name:'Σάλτσες',                  emoji:'🍅', color:'#FFEBEE', accent:'#F44336' },
  { id:'oils',       name:'Λάδι & Ξύδι',              emoji:'🫒', color:'#F9FBE7', accent:'#8BC34A' },
  { id:'other',      name:'Άλλα',                     emoji:'🧩', color:'#F3E5F5', accent:'#9C27B0' },
];
export const DEFAULT_PRODUCTS = {
  dairy:['Γάλα','Γιαούρτι','Τυρί','Βούτυρο','Κρέμα γάλακτος'],
  bakery:['Ψωμί','Φρυγανιές','Κουλούρια','Κρουασάν'],
  meat:['Κοτόπουλο','Μοσχάρι','Χοιρινό','Κιμάς'],
  vegetables:['Ντομάτες','Πατάτες','Κρεμμύδια','Μαρούλι','Καρότα'],
  drinks:['Νερό','Αναψυκτικά','Χυμοί','Καφές'],
  cleaning:['Απορρυπαντικό ρούχων','Υγρό πιάτων','Χλωρίνη','Καθαριστικό'],
  sweets:['Σοκολάτες','Μπισκότα','Παγωτά','Κέικ'],
  snacks:['Πατατάκια','Αμύγδαλα','Φιστίκια','Καρύδια'],
  pasta:['Μακαρόνια','Ρύζι','Δημητριακά πρωινού','Όσπρια'],
  sauces:['Σάλτσα ντομάτας','Κέτσαπ','Μαγιονέζα','Μουστάρδα'],
  oils:['Ελαιόλαδο','Σπορέλαιο','Ξύδι','Βαλσάμικο'],
  other:[],
};
export const FREQUENT = [
  {name:'Γάλα',emoji:'🥛',catId:'dairy'},{name:'Ψωμί',emoji:'🍞',catId:'bakery'},
  {name:'Αυγά',emoji:'🥚',catId:'dairy'},{name:'Τυρί',emoji:'🧀',catId:'dairy'},
  {name:'Νερό',emoji:'💧',catId:'drinks'},{name:'Ντομάτες',emoji:'🍅',catId:'vegetables'},
  {name:'Πατάτες',emoji:'🥔',catId:'vegetables'},{name:'Κοτόπουλο',emoji:'🍗',catId:'meat'},
  {name:'Μακαρόνια',emoji:'🍝',catId:'pasta'},{name:'Ελαιόλαδο',emoji:'🫒',catId:'oils'},
  {name:'Γιαούρτι',emoji:'🥛',catId:'dairy'},{name:'Μπανάνες',emoji:'🍌',catId:'vegetables'},
];
export const MARKETS = ['AB Βασιλόπουλος','Lidl','Sklavenitis','My Market','Masoutis','Άλλο'];
