import React, {
  useState, useEffect, useRef,
  useMemo, useCallback, Component,
} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  FlatList, SectionList, StyleSheet,
  StatusBar, Modal, TextInput,
  Pressable, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator, Image,
  BackHandler, Keyboard,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { exportListAsPDF } from './src/utils/pdfExport';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { importFromPDF, categorizeProduct } from './src/utils/pdfImport';
import { CATEGORIES, DEFAULT_PRODUCTS, FREQUENT, MARKETS } from './src/data/defaultData';
import { C, S, R } from './src/theme/index';
import { LanguageProvider, useLanguage } from './src/i18n/LanguageContext';
import LanguageToggle from './src/components/LanguageToggle';


const uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;

const EMOJI_OPTIONS = ['📁','🛒','🍕','🏋️','💊','📚','🧹','🐾','🎮','🌿','🍷','🧴','🏠','✈️','💰','🎁'];

const buildInitialCatalog = () => {
  const out = {};
  CATEGORIES.forEach(cat => {
    out[cat.id] = (DEFAULT_PRODUCTS[cat.id] || []).map((name, i) => ({
      id: `${cat.id}_${i}`, name, catId: cat.id,
    }));
  });
  return out;
};

const STORAGE_KEY = '@smlist_stable_v1';
const LOGO = require('./assets/icon.png');

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, message: '' }; }
  static getDerivedStateFromError(err) { return { hasError: true, message: String(err) }; }
  render() {
    if (this.state.hasError) {
      return (
        <View style={st.errScreen}>
          <Text style={st.errEmoji}>⚠️</Text>
          <Text style={st.errTitle}>{t('somethingWrong')}</Text>
          <Text style={st.errMsg}>{this.state.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── AddModal ─────────────────────────────────────────────────────────────────
function AddModal({ visible, onClose, onSave, initName='', initCatId='other', title, showCat=false, mode='add', allCategories=[] }) {
  const { t, td, tc } = useLanguage();
  const modalTitle = title || t('add');
  const [name, setName] = useState('');
  const [catId, setCatId] = useState(initCatId);
  const inputRef = useRef(null);
  useEffect(() => {
    if (visible) {
      setName(initName); setCatId(initCatId);
      const timer = setTimeout(() => { try { inputRef.current?.focus(); } catch(_){} }, 350);
      return () => clearTimeout(timer);
    }
  }, [visible]);
  const handleSave = () => {
    const trimmed = name.trim(); if (!trimmed) return;
    onSave({ name: trimmed, catId }); setName(''); onClose();
  };
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent={false}>
      <Pressable style={st.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={0}>
          <Pressable style={[st.modalSheet, {backgroundColor: C.surface}]} onPress={()=>{}}>
            <View style={st.modalHandle}/>
            <Text style={st.modalTitle}>{modalTitle}</Text>
            <TextInput ref={inputRef} style={st.textInput} placeholder={t('productName')} placeholderTextColor={C.tx3} value={name} onChangeText={setName} onSubmitEditing={handleSave} returnKeyType="done" maxLength={80} autoCorrect={false} autoCapitalize="sentences"/>
            {showCat && (
              <>
                <Text style={st.fieldLabel}>{t('category')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:S.lg}} keyboardShouldPersistTaps="handled">
                  {allCategories.map(cat => (
                    <TouchableOpacity key={cat.id} onPress={()=>setCatId(cat.id)} style={[st.catChip, catId===cat.id&&{backgroundColor:cat.accent,borderColor:cat.accent}]}>
                      <Text style={st.catChipEmoji}>{cat.emoji}</Text>
                      <Text style={[st.catChipName, catId===cat.id&&{color:C.white}]} numberOfLines={1}>{tc(cat.id, cat.name)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <View style={st.modalBtns}>
              <TouchableOpacity style={st.cancelBtn} onPress={onClose}><Text style={st.cancelTx}>{t('cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={[st.saveBtn,!name.trim()&&st.saveBtnDis]} onPress={handleSave} disabled={!name.trim()}>
                <Text style={st.saveTx}>{mode==='edit'?t('save'):t('add')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── ActionSheet ──────────────────────────────────────────────────────────────
function ActionSheet({ visible, onClose, title, actions=[] }) {
  const { t, td, tc } = useLanguage();
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent={false}>
      <Pressable style={st.modalOverlay} onPress={onClose}>
        <View style={st.asWrap}>
          <View style={[st.asCard, {backgroundColor: C.surface}]}>
            <View style={[st.asHead, {backgroundColor: C.surfaceAlt}]}><Text style={st.asHeadTx} numberOfLines={1}>{title}</Text></View>
            {actions.map((a, i) => (
              <React.Fragment key={i}>
                {i>0 && <View style={st.asSep}/>}
                <TouchableOpacity style={[st.asRow,a.disabled&&{opacity:0.35}]} onPress={()=>{ if(!a.disabled){a.onPress();onClose();} }} disabled={!!a.disabled}>
                  <Text style={st.asIcon}>{a.icon}</Text>
                  <Text style={[st.asLabel,a.danger&&{color:C.danger}]}>{a.label}</Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
          <TouchableOpacity style={[st.asCancel, {backgroundColor: C.surface}]} onPress={onClose}><Text style={st.asCancelTx}>{t('cancel')}</Text></TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── PriceModal ───────────────────────────────────────────────────────────────
function PriceModal({ visible, onClose, onSave, itemName, lastEntry }) {
  const { t, td, tc } = useLanguage();
  const [price, setPrice] = useState('');
  const [brand, setBrand] = useState('');
  const [market, setMarket] = useState('');
  const [customMarket, setCustomMarket] = useState('');
  const [hasOffer, setHasOffer] = useState(false);
  const [offerType, setOfferType] = useState('euro');
  const [offerValue, setOfferValue] = useState('');
  // Weight/scale fields
  const [isWeighed, setIsWeighed] = useState(false);
  const [pricePerKg, setPricePerKg] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const priceRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setPrice(''); setBrand(''); setMarket(''); setCustomMarket('');
      setHasOffer(false); setOfferType('euro'); setOfferValue('');
      setIsWeighed(false); setPricePerKg(''); setFinalPrice('');
      const timer = setTimeout(()=>{ try{priceRef.current?.focus();}catch(_){} },350);
      return ()=>clearTimeout(timer);
    }
  },[visible]);

  // Calculate shelf price (when offer active)
  const calcShelfPrice = () => {
    const paid = parseFloat(price);
    if (!paid || !hasOffer || !offerValue) return null;
    const ov = parseFloat(offerValue);
    if (!ov) return null;
    if (offerType === 'euro') return paid + ov;
    if (offerType === 'percent') {
      const factor = 1 - ov / 100;
      if (factor <= 0) return null;
      return paid / factor;
    }
    return null;
  };
  const shelfPrice = calcShelfPrice();

  // Weight calculations
  const calcWeight = () => {
    const ppkg = parseFloat(pricePerKg);
    const fp = parseFloat(finalPrice);
    if (!ppkg || !fp) return null;
    return fp / ppkg; // kg
  };
  const calcFinalFromWeight = () => {
    // not used directly — user enters finalPrice
    return null;
  };
  const weight = calcWeight();

  const save = () => {
    // If weighed product, use finalPrice as the paid price
    const paidAmt = isWeighed ? finalPrice : price;
    const paidPrice = paidAmt ? parseFloat(paidAmt) : null;
    const finalMarket = market === 'Άλλο' ? customMarket.trim() : market;
    onSave({
      price: paidAmt, brand, market: finalMarket,
      hasOffer, offerType, offerValue,
      paidPrice, shelfPrice,
      isWeighed,
      pricePerKg: pricePerKg ? parseFloat(pricePerKg) : null,
      weightKg: weight,
    });
    onClose();
  };
  const skip = () => {
    onSave({ price:'', brand:'', market:'', hasOffer:false, offerType:'euro', offerValue:'', paidPrice:null, shelfPrice:null, isWeighed:false, pricePerKg:null, weightKg:null });
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={skip} statusBarTranslucent={false}>
        <Pressable style={st.modalOverlay} onPress={skip}>
          <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
            <Pressable style={st.modalSheet} onPress={()=>{}}>
              <View style={st.modalHandle}/>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                <View style={st.pmRow}>
                  <View style={st.pmCircle}><Text style={st.pmCircleTx}>✓</Text></View>
                  <View style={{flex:1}}>
                    <Text style={st.modalTitle}>{t('purchasedExcl')}</Text>
                    <Text style={{fontSize:13,color:C.tx2,marginTop:2}} numberOfLines={1}>{itemName}</Text>
                  </View>
                </View>

                {lastEntry?.price ? (
                  <View style={st.lastBox}>
                    <Text style={st.lastTx}>
                      {t('lastLabel')} {lastEntry.shelfPrice&&lastEntry.paidPrice&&lastEntry.shelfPrice!==lastEntry.paidPrice
                        ? `${t('shelfLabel')} ${lastEntry.shelfPrice.toFixed(2)}€ → ${t('youPaidLabel')} ${lastEntry.paidPrice.toFixed(2)}€`
                        : `${lastEntry.price}€`}
                      {lastEntry.weightKg ? ` · ${(lastEntry.weightKg*1000).toFixed(0)}g` : ''}
                      {lastEntry.brand?` · ${lastEntry.brand}`:''}
                      {lastEntry.market?` · ${lastEntry.market}`:''}
                    </Text>
                  </View>
                ):null}

                {/* ── WEIGHED PRODUCT TOGGLE ── */}
                <TouchableOpacity style={st.offerRow} onPress={()=>{ Keyboard.dismiss(); setIsWeighed(w=>!w); }}>
                  <View style={[st.offerCheckbox, isWeighed && st.offerCheckboxOn]}>
                    {isWeighed && <Text style={{color:C.white,fontSize:13,fontWeight:'800'}}>✓</Text>}
                  </View>
                  <Text style={st.offerLabel}>{t('weighedProductToggle')}</Text>
                </TouchableOpacity>

                {isWeighed ? (
                  <View style={st.offerBox}>
                    {/* Price per kg */}
                    <Text style={st.fieldLabel}>{t('pricePerKg')}</Text>
                    <TextInput
                      style={st.textInput}
                      placeholder={t('egPrice399')}
                      placeholderTextColor={C.tx3}
                      value={pricePerKg}
                      onChangeText={setPricePerKg}
                      keyboardType="decimal-pad"
                    />

                    {/* Final price paid */}
                    <Text style={st.fieldLabel}>{t('finalPricePaid')}</Text>
                    <TextInput
                      style={st.textInput}
                      placeholder={t('egPrice215')}
                      placeholderTextColor={C.tx3}
                      value={finalPrice}
                      onChangeText={setFinalPrice}
                      keyboardType="decimal-pad"
                    />

                    {/* Computed weight */}
                    {weight !== null && (
                      <View style={st.offerPreview}>
                        <Text style={st.offerPreviewLabel}>{t('weightLabel')}</Text>
                        <Text style={[st.offerPreviewFinal,{fontSize:20}]}>
                          {weight >= 1
                            ? `${weight.toFixed(3)} kg`
                            : `${(weight*1000).toFixed(0)} g`}
                        </Text>
                        <Text style={st.offerPreviewArrow}>·</Text>
                        <Text style={st.offerPreviewLabel}>{pricePerKg}€/kg</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <>
                    {/* Normal price field */}
                    <Text style={st.fieldLabel}>{t('purchasePriceLabel')}</Text>
                    <TextInput
                      ref={priceRef}
                      style={st.textInput}
                      placeholder={t('egPrice249')}
                      placeholderTextColor={C.tx3}
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="decimal-pad"
                    />

                    {/* Offer */}
                    <TouchableOpacity style={st.offerRow} onPress={()=>{ setHasOffer(!hasOffer); if(hasOffer){setOfferValue('');} }}>
                      <View style={[st.offerCheckbox, hasOffer && st.offerCheckboxOn]}>
                        {hasOffer && <Text style={{color:C.white,fontSize:13,fontWeight:'800'}}>✓</Text>}
                      </View>
                      <Text style={st.offerLabel}>{t('offerLabelIcon')}</Text>
                    </TouchableOpacity>

                    {hasOffer && (
                      <View style={st.offerBox}>
                        <View style={st.offerTypeRow}>
                          <TouchableOpacity style={[st.offerTypeBtn, offerType==='euro'&&st.offerTypeBtnOn]} onPress={()=>{setOfferType('euro');setOfferValue('');}}>
                            <Text style={[st.offerTypeTx, offerType==='euro'&&st.offerTypeTxOn]}>{t('discountEuro')}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[st.offerTypeBtn, offerType==='percent'&&st.offerTypeBtnOn]} onPress={()=>{setOfferType('percent');setOfferValue('');}}>
                            <Text style={[st.offerTypeTx, offerType==='percent'&&st.offerTypeTxOn]}>{t('discountPercent')}</Text>
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          style={st.textInput}
                          placeholder={offerType==='euro'?t('egOfferEuro'):t('egOfferPercent')}
                          placeholderTextColor={C.tx3}
                          value={offerValue}
                          onChangeText={setOfferValue}
                          keyboardType="decimal-pad"
                        />
                        {shelfPrice !== null && (
                          <View style={st.offerPreview}>
                            <Text style={st.offerPreviewLabel}>{t('shelfPriceLabel')}</Text>
                            <Text style={st.offerPreviewFinal}>{shelfPrice.toFixed(2)}€</Text>
                            <Text style={st.offerPreviewArrow}>→</Text>
                            <Text style={st.offerPreviewLabel}>{t('youPaidLabel')}</Text>
                            <Text style={st.offerPreviewOrig}>{price}€</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}

                {/* BRAND */}
                <Text style={st.fieldLabel}>{t('brand')}</Text>
                <TextInput style={st.textInput} placeholder={t('egBrandName')} placeholderTextColor={C.tx3} value={brand} onChangeText={setBrand}/>

                {/* MARKET */}
                <Text style={st.fieldLabel}>{t('market')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:S.lg}} keyboardShouldPersistTaps="handled">
                  {MARKETS.map(mk=>(
                    <TouchableOpacity key={mk} style={[st.mkChip,market===mk&&st.mkChipOn]} onPress={()=>{ const next = market===mk?'':mk; setMarket(next); if(next!=='Άλλο') setCustomMarket(''); }}>
                      <Text style={[st.mkChipTx,market===mk&&st.mkChipTxOn]}>{mk}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {market === 'Άλλο' && (
                  <TextInput
                    style={st.textInput}
                    placeholder={t('typeMarketName')}
                    placeholderTextColor={C.tx3}
                    value={customMarket}
                    onChangeText={setCustomMarket}
                    autoFocus
                  />
                )}

                <View style={st.modalBtns}>
                  <TouchableOpacity style={st.cancelBtn} onPress={skip}><Text style={st.cancelTx}>{t('skip')}</Text></TouchableOpacity>
                  <TouchableOpacity style={st.saveBtn} onPress={save}><Text style={st.saveTx}>{t('saveWithIcon')}</Text></TouchableOpacity>
                </View>
                <View style={{height:24}}/>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
  );
}

function ExpenseAnalysisModal({ visible, onClose, priceHistory, allCategories, catalog, FREQUENT }) {
  const { t, td, tc } = useLanguage();
  const [mode, setMode] = useState('all'); // 'all' | 'category' | 'products'
  const [selectedCatIds, setSelectedCatIds] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (visible) {
      setMode('all');
      setSelectedCatIds([]);
      setSelectedProducts([]);
      setDateFrom('');
      setDateTo('');
      setProductSearch('');
    }
  }, [visible]);

  const parseGreekDate = (str) => {
    if (!str) return null;
    const parts = str.split('/');
    if (parts.length !== 3) return null;
    const d = parseInt(parts[0], 10), m = parseInt(parts[1], 10), y = parseInt(parts[2], 10);
    if (!d || !m || !y) return null;
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  };

  const getEntryDate = (entry) => (entry.ts ? new Date(entry.ts) : parseGreekDate(entry.date));
  const formatDateInput = (d) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

  const applyPreset = (days) => {
    if (days === 'all') { setDateFrom(''); setDateTo(''); return; }
    const to = new Date();
    const from = new Date();
    if (days === 'year') from.setMonth(0, 1);
    else from.setDate(from.getDate() - days);
    setDateFrom(formatDateInput(from));
    setDateTo(formatDateInput(to));
  };

  // Best-effort product name -> category id map, same logic as the Ιστορικό tab
  const productCategoryMap = useMemo(() => {
    const map = {};
    allCategories.forEach(cat => {
      (catalog[cat.id] || []).forEach(p => { if (!map[p.name]) map[p.name] = cat.id; });
      FREQUENT.filter(f => f.catId === cat.id).forEach(f => { if (!map[f.name]) map[f.name] = cat.id; });
    });
    return map;
  }, [allCategories, catalog]);

  const allProductNames = useMemo(
    () => Object.keys(priceHistory).sort((a, b) => a.localeCompare(b, 'el')),
    [priceHistory]
  );

  const filteredProductNames = useMemo(() => {
    if (!productSearch.trim()) return allProductNames;
    const q = productSearch.trim().toLowerCase();
    return allProductNames.filter(n => n.toLowerCase().includes(q));
  }, [allProductNames, productSearch]);

  const toggleCat = (id) => setSelectedCatIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  const toggleProduct = (name) => setSelectedProducts(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);

  const fromDateObj = useMemo(() => parseGreekDate(dateFrom), [dateFrom]);
  const toDateObj = useMemo(() => {
    const d = parseGreekDate(dateTo);
    if (d) d.setHours(23, 59, 59, 999);
    return d;
  }, [dateTo]);

  const result = useMemo(() => {
    let entries = [];
    Object.entries(priceHistory).forEach(([name, list]) => {
      (list || []).forEach(e => entries.push({ ...e, name }));
    });

    entries = entries.filter(e => {
      const d = getEntryDate(e);
      if (!d) return true; // can't parse date → don't silently exclude it
      if (fromDateObj && d < fromDateObj) return false;
      if (toDateObj && d > toDateObj) return false;
      return true;
    });

    if (mode === 'category') {
      if (selectedCatIds.length === 0) return { total: 0, count: 0, byProduct: [], empty: true };
      entries = entries.filter(e => selectedCatIds.includes(productCategoryMap[e.name]));
    } else if (mode === 'products') {
      if (selectedProducts.length === 0) return { total: 0, count: 0, byProduct: [], empty: true };
      entries = entries.filter(e => selectedProducts.includes(e.name));
    }

    const total = entries.reduce((sum, e) => sum + (e.totalPaid ?? e.paidPrice ?? e.price ?? 0), 0);
    const byProductMap = {};
    entries.forEach(e => {
      const amt = e.totalPaid ?? e.paidPrice ?? e.price ?? 0;
      if (!byProductMap[e.name]) byProductMap[e.name] = { name: e.name, total: 0, count: 0 };
      byProductMap[e.name].total += amt;
      byProductMap[e.name].count += 1;
    });
    const byProduct = Object.values(byProductMap).sort((a, b) => b.total - a.total);

    return { total, count: entries.length, byProduct, empty: false };
  }, [priceHistory, mode, selectedCatIds, selectedProducts, fromDateObj, toDateObj, productCategoryMap]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent={false}>
      <Pressable style={st.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={[st.modalSheet, { maxHeight: '88%' }]} onPress={() => {}}>
            <View style={st.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.lg }}>
                <Text style={st.modalTitle}>{t('expenseAnalysisIcon')}</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={{ fontSize: 22, color: C.tx2 }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Mode selector */}
              <View style={{ flexDirection: 'row', gap: S.sm, marginBottom: S.lg }}>
                {[
                  { key: 'all', label:t('allIcon') },
                  { key: 'category', label:t('categoryIcon') },
                  { key: 'products', label:t('productsIcon') },
                ].map(m => (
                  <TouchableOpacity
                    key={m.key}
                    style={[st.offerTypeBtn, mode === m.key && st.offerTypeBtnOn, { flex: 1 }]}
                    onPress={() => setMode(m.key)}
                  >
                    <Text style={[st.offerTypeTx, mode === m.key && st.offerTypeTxOn]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date range */}
              <Text style={st.fieldLabel}>{t('dateRange')}</Text>
              <View style={{ flexDirection: 'row', gap: S.sm }}>
                <TextInput
                  style={[st.textInput, { flex: 1 }]}
                  placeholder={t('fromDatePlaceholder')}
                  placeholderTextColor={C.tx3}
                  value={dateFrom}
                  onChangeText={setDateFrom}
                  keyboardType="numbers-and-punctuation"
                />
                <TextInput
                  style={[st.textInput, { flex: 1 }]}
                  placeholder={t('toDatePlaceholder')}
                  placeholderTextColor={C.tx3}
                  value={dateTo}
                  onChangeText={setDateTo}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: S.lg }}>
                {[
                  { label:t('days7'), days: 7 },
                  { label:t('days30'), days: 30 },
                  { label:t('months3'), days: 90 },
                  { label:t('thisYear'), days: 'year' },
                  { label:t('allFem'), days: 'all' },
                ].map(p => (
                  <TouchableOpacity key={p.label} style={st.mkChip} onPress={() => applyPreset(p.days)}>
                    <Text style={st.mkChipTx}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Category selector */}
              {mode === 'category' && (
                <>
                  <Text style={st.fieldLabel}>{t('selectCategories')}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.lg }}>
                    {allCategories.map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[st.mkChip, selectedCatIds.includes(cat.id) && st.mkChipOn, { marginRight: 0 }]}
                        onPress={() => toggleCat(cat.id)}
                      >
                        <Text style={[st.mkChipTx, selectedCatIds.includes(cat.id) && st.mkChipTxOn]}>{cat.emoji} {tc(cat.id, cat.name)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Product selector */}
              {mode === 'products' && (
                <>
                  <Text style={st.fieldLabel}>{t('selectProducts')}</Text>
                  <TextInput
                    style={st.textInput}
                    placeholder={t('searchProduct')}
                    placeholderTextColor={C.tx3}
                    value={productSearch}
                    onChangeText={setProductSearch}
                  />
                  <View style={{ maxHeight: 200, marginBottom: S.lg }}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {filteredProductNames.length === 0 ? (
                        <Text style={{ color: C.tx3, fontSize: 13, padding: S.sm }}>{t('noProductsFound')}</Text>
                      ) : filteredProductNames.map(name => (
                        <TouchableOpacity
                          key={name}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                          onPress={() => toggleProduct(name)}
                        >
                          <View style={[st.checkbox, selectedProducts.includes(name) && st.checkboxOn, { marginRight: S.sm }]}>
                            {selectedProducts.includes(name) && <Text style={{ color: C.white, fontSize: 12 }}>✓</Text>}
                          </View>
                          <Text style={{ fontSize: 14, color: C.tx, flex: 1 }} numberOfLines={1}>{td(name)}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}

              {/* Result */}
              <View style={{ backgroundColor: C.primary, borderRadius: 16, padding: S.lg, marginBottom: S.md }}>
                {result.empty ? (
                  <Text style={{ color: C.white, fontSize: 14, textAlign: 'center' }}>
                    {mode === 'category' ? t('chooseAtLeastOneCategory') : t('chooseAtLeastOneProduct')}
                  </Text>
                ) : (
                  <>
                    <Text style={{ color: '#FFFFFFAA', fontSize: 13, marginBottom: 4 }}>{t('totalExpenses')}</Text>
                    <Text style={{ color: C.white, fontSize: 32, fontWeight: '800' }}>{result.total.toFixed(2)} €</Text>
                    <Text style={{ color: '#FFFFFFCC', fontSize: 13, marginTop: 4 }}>{result.count} {t('purchasesWord')}</Text>
                  </>
                )}
              </View>

              {!result.empty && result.byProduct.length > 0 && (
                <View style={{ marginBottom: S.lg }}>
                  <Text style={st.fieldLabel}>{t('analysisByProduct')}</Text>
                  {result.byProduct.slice(0, 30).map(p => (
                    <View key={p.name} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.surfaceAlt }}>
                      <Text style={{ fontSize: 13, color: C.tx, flex: 1 }} numberOfLines={1}>{td(p.name)} <Text style={{ color: C.tx3 }}>({p.count})</Text></Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: C.tx }}>{p.total.toFixed(2)} €</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity style={st.saveBtn} onPress={onClose}>
                <Text style={st.saveTx}>{t('close')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function NewCategoryModal({ visible, onClose, onSave }) {
  const { t, td, tc } = useLanguage();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setName(''); setEmoji('📁');
      const timer = setTimeout(() => { try { inputRef.current?.focus(); } catch(_){} }, 350);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const save = () => {
    if (!name.trim()) return;
    onSave(name.trim(), emoji);
    onClose();
  };

  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent={false}>
      <Pressable style={st.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
          <Pressable style={st.modalSheet} onPress={()=>{}}>
            <View style={st.modalHandle}/>
            <Text style={st.modalTitle}>{t('newCategory')}</Text>

            <Text style={st.fieldLabel}>{t('categoryName')}</Text>
            <TextInput
              ref={inputRef}
              style={st.textInput}
              placeholder={t('egCategoryName')}
              placeholderTextColor={C.tx3}
              value={name}
              onChangeText={setName}
              onSubmitEditing={save}
              returnKeyType="done"
              maxLength={40}
              autoCapitalize="sentences"
            />

            <Text style={st.fieldLabel}>{t('icon')}</Text>
            <View style={st.emojiGrid}>
              {EMOJI_OPTIONS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[st.emojiBtn, emoji === e && st.emojiBtnOn]}
                  onPress={() => setEmoji(e)}
                >
                  <Text style={{fontSize:24}}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={st.modalBtns}>
              <TouchableOpacity style={st.cancelBtn} onPress={onClose}>
                <Text style={st.cancelTx}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.saveBtn, !name.trim() && st.saveBtnDis]}
                onPress={save}
                disabled={!name.trim()}
              >
                <Text style={st.saveTx}>{t('createWord')} {emoji}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}


// ─── EditCategoryModal ────────────────────────────────────────────────────────
function EditCategoryModal({ visible, onClose, onSave, onDelete, category }) {
  const { t, td, tc } = useLanguage();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📁');

  useEffect(() => {
    if (visible && category) {
      setName(tc(category.id, category.name));
      setEmoji(category.emoji || '📁');
    }
  }, [visible, category]);

  const save = () => {
    if (!name.trim()) return;
    onSave(name.trim(), emoji);
    onClose();
  };

  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent={false}>
      <Pressable style={st.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
          <Pressable style={st.modalSheet} onPress={()=>{}}>
            <View style={st.modalHandle}/>
            <Text style={st.modalTitle}>{t('editCategory')}</Text>

            <Text style={st.fieldLabel}>{t('categoryName')}</Text>
            <TextInput
              style={st.textInput}
              placeholder={t('namePh')}
              placeholderTextColor={C.tx3}
              value={name}
              onChangeText={setName}
              onSubmitEditing={save}
              returnKeyType="done"
              maxLength={40}
              autoCapitalize="sentences"
            />

            <Text style={st.fieldLabel}>{t('icon')}</Text>
            <View style={st.emojiGrid}>
              {EMOJI_OPTIONS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[st.emojiBtn, emoji === e && st.emojiBtnOn]}
                  onPress={() => setEmoji(e)}
                >
                  <Text style={{fontSize:24}}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={st.modalBtns}>
              <TouchableOpacity style={st.cancelBtn} onPress={onClose}>
                <Text style={st.cancelTx}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.saveBtn, !name.trim() && st.saveBtnDis]}
                onPress={save}
                disabled={!name.trim()}
              >
                <Text style={st.saveTx}>{t('save')}</Text>
              </TouchableOpacity>
            </View>

            {onDelete && (
              <TouchableOpacity
                style={[st.cancelBtn, {marginTop: S.sm, borderColor: C.danger}]}
                onPress={() => {
                  onClose();
                  setTimeout(() => onDelete(), 300);
                }}
              >
                <Text style={[st.cancelTx, {color: C.danger}]}>{t('deleteCategoryIcon')}</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}


// ─── QtyPickerModal ───────────────────────────────────────────────────────────
function QtyPickerModal({ visible, onClose, onAdd, productName }) {
  const { t, td, tc } = useLanguage();
  const [mode, setMode] = useState('pieces'); // 'pieces' | 'weight'
  const [qty, setQty] = useState(1);
  const [kg, setKg] = useState('');

  useEffect(() => {
    if (visible) { setMode('pieces'); setQty(1); setKg(''); }
  }, [visible]);

  const handleAdd = () => {
    if (mode === 'pieces') {
      onAdd(qty, false, null);
    } else {
      onAdd(1, true, kg ? parseFloat(kg) : null);
    }
    onClose();
  };

  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent={false}>
      <Pressable style={st.modalOverlay} onPress={onClose}>
        <Pressable style={st.modalSheet} onPress={()=>{}}>
          <View style={st.modalHandle}/>
          <Text style={st.modalTitle}>{t('addToList')}</Text>
          <Text style={{fontSize:14,color:C.tx2,marginBottom:S.lg}} numberOfLines={1}>{td(productName)}</Text>

          {/* Mode toggle */}
          <View style={st.offerTypeRow}>
            <TouchableOpacity
              style={[st.offerTypeBtn, mode==='pieces' && st.offerTypeBtnOn]}
              onPress={()=>setMode('pieces')}
            >
              <Text style={[st.offerTypeTx, mode==='pieces' && st.offerTypeTxOn]}>{t('piecesIcon')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.offerTypeBtn, mode==='weight' && st.offerTypeBtnOn]}
              onPress={()=>setMode('weight')}
            >
              <Text style={[st.offerTypeTx, mode==='weight' && st.offerTypeTxOn]}>{t('kilos')}</Text>
            </TouchableOpacity>
          </View>

          {mode === 'pieces' ? (
            <View style={{alignItems:'center', paddingVertical:S.xl}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:S.xl}}>
                <TouchableOpacity
                  style={[st.qtyLargeBtn]}
                  onPress={()=>setQty(q=>Math.max(1,q-1))}
                >
                  <Text style={st.qtyLargeTx}>−</Text>
                </TouchableOpacity>
                <Text style={st.qtyLargeNum}>{qty}</Text>
                <TouchableOpacity
                  style={st.qtyLargeBtn}
                  onPress={()=>setQty(q=>q+1)}
                >
                  <Text style={st.qtyLargeTx}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={{color:C.tx3,fontSize:12,marginTop:S.md}}>{t('piecesWord')}</Text>
            </View>
          ) : (
            <View style={{paddingVertical:S.lg}}>
              <Text style={st.fieldLabel}>{t('quantityKgOptional')}</Text>
              <TextInput
                style={st.textInput}
                placeholder={t('egWeight')}
                placeholderTextColor={C.tx3}
                value={kg}
                onChangeText={setKg}
                keyboardType="decimal-pad"
                autoFocus
              />
              <Text style={{color:C.tx3,fontSize:12,marginTop:-S.sm,marginBottom:S.md}}>
                {t('canFillWeightLater')}
              </Text>
            </View>
          )}

          <View style={st.modalBtns}>
            <TouchableOpacity style={st.cancelBtn} onPress={onClose}>
              <Text style={st.cancelTx}>{t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.saveBtn} onPress={handleAdd}>
              <Text style={st.saveTx}>{t('addedCheck')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── EditListItemModal ─────────────────────────────────────────────────────────
function EditListItemModal({ visible, onClose, onSave, item }) {
  const { t, td, tc } = useLanguage();
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const [isWeighed, setIsWeighed] = useState(false);
  const [kgAmount, setKgAmount] = useState('');

  useEffect(() => {
    if (visible && item) {
      setName(td(item.name || ''));
      setQty(item.qty || 1);
      setIsWeighed(item.isWeighed || false);
      setKgAmount(item.kgAmount ? String(item.kgAmount) : '');
    }
  }, [visible, item]);

  const save = () => {
    onSave({
      name: name.trim() || item?.name,
      qty,
      isWeighed,
      kgAmount: kgAmount ? parseFloat(kgAmount) : null,
    });
    onClose();
  };

  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent={false}>
      <Pressable style={st.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
          <Pressable style={st.modalSheet} onPress={()=>{}}>
            <View style={st.modalHandle}/>
            <Text style={st.modalTitle}>{t('edit')}</Text>

            <Text style={st.fieldLabel}>{t('name')}</Text>
            <TextInput
              style={st.textInput}
              value={name}
              onChangeText={setName}
              placeholder={t('productNamePh')}
              placeholderTextColor={C.tx3}
              returnKeyType="done"
              maxLength={80}
            />

            {/* Pieces / Weight toggle */}
            <View style={[st.offerTypeRow, {marginBottom:S.md}]}>
              <TouchableOpacity
                style={[st.offerTypeBtn, !isWeighed && st.offerTypeBtnOn]}
                onPress={()=>{ Keyboard.dismiss(); setIsWeighed(false); }}
              >
                <Text style={[st.offerTypeTx, !isWeighed && st.offerTypeTxOn]}>{t('piecesIcon')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.offerTypeBtn, isWeighed && st.offerTypeBtnOn]}
                onPress={()=>{ Keyboard.dismiss(); setIsWeighed(true); }}
              >
                <Text style={[st.offerTypeTx, isWeighed && st.offerTypeTxOn]}>{t('kilos')}</Text>
              </TouchableOpacity>
            </View>

            {!isWeighed ? (
              <View>
                <Text style={st.fieldLabel}>{t('quantityPieces')}</Text>
                <View style={{flexDirection:'row',alignItems:'center',gap:S.lg,marginBottom:S.lg}}>
                  <TouchableOpacity style={st.qtyLargeBtn} onPress={()=>setQty(q=>Math.max(1,q-1))}>
                    <Text style={st.qtyLargeTx}>−</Text>
                  </TouchableOpacity>
                  <Text style={st.qtyLargeNum}>{qty}</Text>
                  <TouchableOpacity style={st.qtyLargeBtn} onPress={()=>setQty(q=>q+1)}>
                    <Text style={st.qtyLargeTx}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <Text style={st.fieldLabel}>{t('quantityKgOptional')}</Text>
                <TextInput
                  style={st.textInput}
                  value={kgAmount}
                  onChangeText={setKgAmount}
                  placeholder={t('egWeight')}
                  placeholderTextColor={C.tx3}
                  keyboardType="decimal-pad"
                />
              </View>
            )}

            <View style={st.modalBtns}>
              <TouchableOpacity style={st.cancelBtn} onPress={onClose}>
                <Text style={st.cancelTx}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.saveBtn} onPress={save}>
                <Text style={st.saveTx}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════
function AppContent() {
  const { t, td, tc, lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [pendingImport, setPendingImport] = useState(null);
  const [catalog, setCatalog] = useState(()=>buildInitialCatalog());
  const [customCategories, setCustomCategories] = useState([]); // user-created categories
  const [listItems, setListItems] = useState([]);
  const [usageCounts, setUsageCounts] = useState({});
  const [priceHistory, setPriceHistory] = useState({});

  // Navigation
  const [screen, setScreen] = useState('home');
  const [activeCatId, setActiveCatId] = useState(null);
  const [priceHistoryName, setPriceHistoryName] = useState(null);

  // Modals
  const [showAddCatalog, setShowAddCatalog] = useState(false);
  const [qtyPicker, setQtyPicker] = useState(null); // {name, catId, refId, isWeighed}
  const [editListModal, setEditListModal] = useState(null); // item to edit // {name, catId, refId, isWeighed}
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showAddList, setShowAddList] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showExpenseAnalysis, setShowExpenseAnalysis] = useState(false);
  const [editCategoryTarget, setEditCategoryTarget] = useState(null); // {id, name, emoji, isCustom}
  const [categoryOverrides, setCategoryOverrides] = useState({}); // {catId: {name, emoji}} for default cats
  const [editCatalogItem, setEditCatalogItem] = useState(null);
  const [editListItem_, setEditListItem] = useState(null);
  const [actionItem, setActionItem] = useState(null);
  const [actionContext, setActionContext] = useState(null);
  const [priceModalItem, setPriceModalItem] = useState(null);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!mounted) return;
        if (raw) {
          try {
            const d = JSON.parse(raw);
            if (d.catalog) setCatalog(d.catalog);
            if (d.customCategories) setCustomCategories(d.customCategories);
            if (d.categoryOverrides) setCategoryOverrides(d.categoryOverrides);
            if (d.listItems) setListItems(d.listItems);
            if (d.usageCounts) setUsageCounts(d.usageCounts);
            if (d.priceHistory) setPriceHistory(d.priceHistory);
          } catch(_) {}
        }
      })
      .catch(()=>{})
      .finally(()=>{ if(mounted) setReady(true); });
    return ()=>{ mounted=false; };
  }, []);

  // ── Splash screen: show for 2 seconds after data loads ────────────────────
  useEffect(() => {
    if (!ready) return;
    const splashTimer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(splashTimer);
  }, [ready]);

  // ── Save data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({catalog,customCategories,categoryOverrides,listItems,usageCounts,priceHistory})).catch(()=>{});
  }, [catalog,customCategories,categoryOverrides,listItems,usageCounts,priceHistory,ready]);

  // Handle opening .json file from external app (WhatsApp, email, etc.)
  useEffect(() => {
    const handleOpenURL = async (url) => {
      if (!url) return;
      try {
        const text = await FileSystem.readAsStringAsync(
          url.startsWith('content://') ? url : decodeURIComponent(url.replace('file://', '')),
          { encoding: FileSystem.EncodingType.UTF8 }
        );
        const parsed = JSON.parse(text);
        if (parsed.version === 1 && Array.isArray(parsed.items)) {
          setPendingImport(parsed.items);
        }
      } catch (e) {
        console.log('Linking open error:', e);
      }
    };

    // Capture the initial URL exactly once. `pendingImport` state persists
    // even if this resolves before `ready` becomes true — the separate
    // effect below (which depends on `ready`) picks it up once data is loaded.
    Linking.getInitialURL().then(url => { if (url) handleOpenURL(url); });
    const sub = Linking.addEventListener('url', (event) => handleOpenURL(event.url));
    return () => sub?.remove();
  }, []);

  // Process pending import when ready
  useEffect(() => {
    if (!pendingImport || !ready) return;
    Alert.alert(
      t('importListTitle'),
      t('foundListMsg').replace('{n}', pendingImport.length),
      [
        { text: t('cancel'), style: 'cancel', onPress: () => setPendingImport(null) },
        {
          text: t('importAction'),
          onPress: () => {
            let added = 0;
            pendingImport.forEach(({ name, catId, qty, isWeighed, kgAmount }) => {
              const inList = listItems.some(i => i.name.toLowerCase() === name.toLowerCase());
              if (!inList) {
                addToList(name, catId, null, qty || 1, isWeighed || false, kgAmount || null);
                added++;
              }
            });
            setPendingImport(null);
            Alert.alert(t('successTitle'), t('addedNItems').replace('{n}', added), [{ text: 'OK', onPress: () => goTab('list') }]);
          }
        }
      ]
    );
  }, [pendingImport, ready]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const listCount = listItems.length;
  const checkedCount = listItems.filter(i=>i.checked).length;
  const progress = listCount>0 ? checkedCount/listCount : 0;
  const isInList = useCallback((refId)=>listItems.some(i=>i.refId===refId),[listItems]);

  // ── Catalog actions ────────────────────────────────────────────────────────
  const addCatalogProduct = useCallback((catId,name)=>{
    setCatalog(prev=>{
      const existing=prev[catId]||[];
      if(existing.some(p=>p.name.toLowerCase()===name.toLowerCase())) return prev;
      return {...prev,[catId]:[...existing,{id:uid(),name,catId}]};
    });
  },[]);

  const editCatalogProduct = useCallback((catId,id,name)=>{
    setCatalog(prev=>({...prev,[catId]:prev[catId].map(p=>p.id===id?{...p,name}:p)}));
  },[]);

  const delCatalogProduct = useCallback((catId,id)=>{
    setCatalog(prev=>({...prev,[catId]:prev[catId].filter(p=>p.id!==id)}));
    setListItems(prev=>prev.filter(i=>i.refId!==id));
  },[]);

  // ── List actions ───────────────────────────────────────────────────────────
  const addToList = useCallback((name,catId,refId=null,qty=1,isWeighed=false,kgAmount=null)=>{
    setListItems(prev=>{
      if(refId){const ex=prev.find(i=>i.refId===refId); if(ex) return prev.map(i=>i.id===ex.id?{...i,qty:i.qty+(isWeighed?0:1),kgAmount:isWeighed?kgAmount:i.kgAmount}:i);}
      return [...prev,{id:uid(),refId,name,catId,qty,isWeighed,kgAmount,checked:false,price:null,brand:'',market:''}];
    });
    setUsageCounts(prev=>({...prev,[name]:(prev[name]||0)+1}));
  },[]);

  // Open qty picker before adding to list
  const promptAddToList = useCallback((name, catId, refId=null) => {
    setQtyPicker({ name, catId, refId });
  }, []);

  const toggleItem = useCallback((id)=>{
    setListItems(prev=>prev.map(i=>i.id===id?{...i,checked:!i.checked}:i));
  },[]);

  const checkWithPrice = useCallback((id,price,brand,market,hasOffer,offerType,offerValue,paidPrice,shelfPrice,isWeighed,pricePerKg,weightKg)=>{
    setListItems(prev=>{
      const item=prev.find(i=>i.id===id); if(!item) return prev;
      const paid = paidPrice !== null ? paidPrice : (price ? parseFloat(price) : null);
      const qty = item.qty || 1;
      // totalPaid: what was actually spent on this purchase.
      // Weighed products: `paid` already reflects the full amount paid for the weight bought.
      // Piece products: the price field is per unit, so multiply by quantity.
      const totalPaid = paid === null ? null : (isWeighed ? paid : paid * qty);
      const entry={
        price: paid,
        paidPrice: paid,
        totalPaid,
        shelfPrice: shelfPrice ? parseFloat(shelfPrice.toFixed(2)) : null,
        brand:brand||'',
        market:market||'',
        hasOffer: hasOffer||false,
        offerType: offerType||'euro',
        offerValue: offerValue ? parseFloat(offerValue) : null,
        isWeighed: isWeighed||false,
        pricePerKg: pricePerKg||null,
        weightKg: weightKg||null,
        date:new Date().toLocaleDateString('el-GR'),
        ts: Date.now(),
        qty:item.qty,
      };
      setPriceHistory(ph=>({...ph,[item.name]:[entry,...(ph[item.name]||[])].slice(0,20)}));
      return prev.map(i=>i.id===id?{...i,checked:true,price:paid,brand:entry.brand,market:entry.market}:i);
    });
  },[]);

  const editListItemFn = useCallback((id,name)=>setListItems(prev=>prev.map(i=>i.id===id?{...i,name}:i)),[]);
  const editListItemFull = useCallback((id,{name,qty,isWeighed,kgAmount})=>{
    setListItems(prev=>prev.map(i=>i.id===id?{...i,name,qty,isWeighed,kgAmount}:i));
  },[]);
  const delListItemFn = useCallback((id)=>setListItems(prev=>prev.filter(i=>i.id!==id)),[]);
  const incQty = useCallback((id)=>setListItems(prev=>prev.map(i=>i.id===id?{...i,qty:i.qty+1}:i)),[]);
  const decQty = useCallback((id)=>setListItems(prev=>prev.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty-1)}:i)),[]);
  const handleTapCheck = useCallback((item)=>{ if(item.checked) toggleItem(item.id); else setPriceModalItem(item); },[toggleItem]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goCategory = useCallback((catId)=>{ setActiveCatId(catId); setScreen('category'); },[]);
  const goPriceHistory = useCallback((name)=>{ setPriceHistoryName(name); setScreen('priceHistory'); },[]);
  const goBack = useCallback(()=>{
    if(screen==='category') setScreen('home');
    else if(screen==='priceHistory') setScreen('list');
    else setScreen('home');
  },[screen]);
  const goTab = useCallback((tab)=>setScreen(tab),[]);

  // Handle Android back button
  useEffect(() => {
    const onBackPress = () => {
      if (screen === 'category') {
        setScreen('home');
        return true; // prevent default (exit app)
      } else if (screen === 'priceHistory') {
        setScreen('list');
        return true;
      } else if (screen !== 'home') {
        setScreen('home');
        return true;
      }
      return false; // allow exit when on home
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [screen]);

  // Delete a single entry from price history
  const deleteHistoryEntry = useCallback((productName, entryIndex) => {
    setPriceHistory(ph => {
      const entries = [...(ph[productName] || [])];
      entries.splice(entryIndex, 1);
      if (entries.length === 0) {
        const updated = { ...ph };
        delete updated[productName];
        return updated;
      }
      return { ...ph, [productName]: entries };
    });
  }, []);

  // ── PDF Export ─────────────────────────────────────────────────────────────
  const handleExportPDF = useCallback(async () => {
    setShowPdfMenu(false);
    if (listItems.length === 0) {
      Alert.alert(t('emptyListTitleAlert'), t('addProductsBeforeExport'));
      return;
    }
    setPdfLoading(true);
    try {
      await exportListAsPDF(listItems, allCategories, { lang, t, td, tc });
    } catch (e) {
      Alert.alert(t('errorTitle'), e.message || t('couldNotExportPdf'));
    } finally {
      setPdfLoading(false);
    }
  }, [listItems, allCategories]);

  const handleExportJSON = useCallback(async () => {
    setShowPdfMenu(false);
    if (listItems.length === 0) {
      Alert.alert(t('emptyListTitleAlert'), t('addProductsBeforeExport'));
      return;
    }
    setPdfLoading(true);
    try {
      const data = listItems.map(i => ({ name: i.name, catId: i.catId, qty: i.qty, isWeighed: i.isWeighed||false, kgAmount: i.kgAmount||null }));
      const json = JSON.stringify({ version: 1, items: data, date: new Date().toLocaleDateString('el-GR') });
      const fileName = `lista-agoron-${Date.now()}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: t('saveListDialogTitle') });
      } else {
        Alert.alert(t('exportTitle'), `${t('savedAsPrefix')} ${fileName}`);
      }
    } catch (e) {
      Alert.alert(t('errorTitle'), e.message || t('couldNotExport'));
    } finally {
      setPdfLoading(false);
    }
  }, [listItems]);

  // ── Settings Backup (categories + catalog + price history) ────────────────
  const handleExportBackup = useCallback(async () => {
    setShowPdfMenu(false);
    setPdfLoading(true);
    try {
      const backup = {
        version: 1,
        type: 'smlist_backup',
        date: new Date().toLocaleDateString('el-GR'),
        catalog, customCategories, categoryOverrides, usageCounts, priceHistory,
      };
      const json = JSON.stringify(backup);
      const fileName = `smlist-backup-${Date.now()}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: t('saveBackupDialogTitle') });
      } else {
        Alert.alert(t('backupTitle'), `${t('savedAsPrefix')} ${fileName}`);
      }
    } catch (e) {
      Alert.alert(t('errorTitle'), e.message || t('couldNotExport'));
    } finally {
      setPdfLoading(false);
    }
  }, [catalog, customCategories, categoryOverrides, usageCounts, priceHistory]);

  const handleImportBackup = useCallback(async () => {
    setShowPdfMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      setPdfLoading(true);
      const text = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const data = JSON.parse(text);
      if (data.type !== 'smlist_backup') {
        Alert.alert(t('invalidFileTitle'), t('notBackupFileMsg'));
        return;
      }
      Alert.alert(
        t('restoreBackup'),
        t('restoreBackupConfirmMsg'),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('restoreAction'), style: 'destructive', onPress: () => {
            if (data.catalog) setCatalog(data.catalog);
            if (data.customCategories) setCustomCategories(data.customCategories);
            if (data.categoryOverrides) setCategoryOverrides(data.categoryOverrides);
            if (data.usageCounts) setUsageCounts(data.usageCounts);
            if (data.priceHistory) setPriceHistory(data.priceHistory);
            Alert.alert(t('doneTitle'), t('backupRestoredMsg'));
          }},
        ]
      );
    } catch (e) {
      Alert.alert(t('errorTitle'), e.message || t('couldNotImport'));
    } finally {
      setPdfLoading(false);
    }
  }, []);

  // ── PDF Import ─────────────────────────────────────────────────────────────
  const handleImportPDF = useCallback(async () => {
    setShowPdfMenu(false);
    setPdfLoading(true);
    try {
      const items = await importFromPDF(t);
      if (!items) return; // user cancelled

      let added = 0;
      let alreadyInList = 0;

      items.forEach(({ name, catId, qty }) => {
        // Check if already in list
        const inList = listItems.some(i => i.name.toLowerCase() === name.toLowerCase());
        if (inList) { alreadyInList++; return; }

        // Ensure product exists in catalog, if not add it
        const catProducts = catalog[catId] || [];
        const inCatalog = catProducts.some(p => p.name.toLowerCase() === name.toLowerCase());
        if (!inCatalog) {
          addCatalogProduct(catId, name);
        }

        // Add to list
        addToList(name, catId);
        added++;
      });

      Alert.alert(
        t('importSuccessTitle'),
        t('addedNItemsToList').replace('{n}', added) +
        (alreadyInList > 0 ? `
${t('alreadyInListMsg').replace('{n}', alreadyInList)}` : ''),
        [{ text: t('niceExcl'), onPress: () => goTab('list') }]
      );
    } catch (e) {
      Alert.alert(t('importErrorTitle'), e.message || t('couldNotImportFile'));
    } finally {
      setPdfLoading(false);
    }
  }, [listItems, catalog, addCatalogProduct, addToList, goTab]);

  // Custom category actions
  const CUSTOM_CAT_COLORS = ['#EDE7F6','#FFF3E0','#E8F5E9','#E3F2FD','#FCE4EC','#F9FBE7','#E0F7FA','#FFF8E1'];
  const CUSTOM_CAT_ACCENTS = ['#7B1FA2','#E65100','#2E7D32','#1565C0','#AD1457','#558B2F','#00695C','#F57F17'];

  const addCustomCategory = useCallback((name, emoji) => {
    const idx = customCategories.length % CUSTOM_CAT_COLORS.length;
    const newCat = {
      id: `custom_${uid()}`,
      name: name.trim(),
      emoji: emoji || '📁',
      color: CUSTOM_CAT_COLORS[idx],
      accent: CUSTOM_CAT_ACCENTS[idx],
      isCustom: true,
    };
    setCustomCategories(prev => [...prev, newCat]);
    setCatalog(prev => ({ ...prev, [newCat.id]: [] }));
    return newCat;
  }, [customCategories]);

  const editCategoryName = useCallback((catId, newName, newEmoji) => {
    const isDefaultCat = CATEGORIES.some(c => c.id === catId);
    if (isDefaultCat) {
      // Store override for default category
      setCategoryOverrides(prev => ({ ...prev, [catId]: { name: newName.trim(), emoji: newEmoji } }));
    } else {
      // Edit custom category directly
      setCustomCategories(prev =>
        prev.map(c => c.id === catId ? { ...c, name: newName.trim(), emoji: newEmoji || c.emoji } : c)
      );
    }
  }, []);

  const deleteCustomCategory = useCallback((catId) => {
    setCustomCategories(prev => prev.filter(c => c.id !== catId));
    setCatalog(prev => { const updated = { ...prev }; delete updated[catId]; return updated; });
    setListItems(prev => prev.filter(i => i.catId !== catId));
  }, []);

  // ── Frequent & sections ────────────────────────────────────────────────────
  const frequentItems = useMemo(()=>{
    const fromUsage=Object.entries(usageCounts).sort((a,b)=>b[1]-a[1]).slice(0,12)
      .map(([name])=>{ const f=FREQUENT.find(x=>x.name===name); return {name,emoji:f?.emoji||'🛒',catId:f?.catId||'other'}; });
    if(fromUsage.length>=4) return fromUsage;
    const names=new Set(fromUsage.map(i=>i.name));
    return [...fromUsage,...FREQUENT.filter(f=>!names.has(f.name))].slice(0,12);
  },[usageCounts]);

  // All categories = default (with any overrides) + user-created
  // MUST be defined before any early return to keep hook order stable
  const allCategories = useMemo(() => [
    ...CATEGORIES.map(cat => categoryOverrides[cat.id]
      ? { ...cat, name: categoryOverrides[cat.id].name, emoji: categoryOverrides[cat.id].emoji }
      : cat
    ),
    ...customCategories,
  ], [customCategories, categoryOverrides]);

  const listSections = useMemo(()=>{
    const grouped={};
    listItems.forEach(item=>{ if(!grouped[item.catId]) grouped[item.catId]=[]; grouped[item.catId].push(item); });
    return Object.entries(grouped).map(([catId,items])=>{
      const cat=allCategories.find(c=>c.id===catId)||{id:'other',name:t('otherCategory'),emoji:'🧩',color:'#F3E5F5',accent:'#9C27B0'};
      return {...cat,data:[...items].sort((a,b)=>Number(a.checked)-Number(b.checked))};
    });
  },[listItems, allCategories]);

  const activeCat = activeCatId ? allCategories.find(c=>c.id===activeCatId)||CATEGORIES[CATEGORIES.length-1] : null;
  const activeProducts = activeCatId ? (catalog[activeCatId]||[]) : [];

  const isMainTab = screen==='home'||screen==='list'||screen==='frequent'||screen==='history';

  // ── SPLASH SCREEN ──────────────────────────────────────────────────────────
  if (!ready || showSplash) {
    return (
      <View style={st.splashScreen}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Image
          source={LOGO}
          style={st.splashLogo}
          resizeMode="contain"
        />
        <Text style={st.splashTitle}>{t('appName')}</Text>
        <Text style={st.splashSub}>{t('organizeShoppingEasily')}</Text>
        {ready && (
          <ActivityIndicator
            color={C.primary}
            style={{ marginTop: S.xxl }}
            size="small"
          />
        )}
      </View>
    );
  }


  return (
    <SafeAreaView style={[st.safe, {backgroundColor: C.bg}]} edges={['left','right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary}/>

      {/* ══ CATEGORY ══ */}
      {screen==='category' && activeCat && (
        <View style={{flex:1}}>
          <View style={[st.navBar, {backgroundColor: C.primary, paddingTop: insets.top + 8}]}>
            <TouchableOpacity onPress={goBack} hitSlop={{top:12,bottom:12,left:12,right:12}}>
              <Text style={st.backTx}>‹</Text>
            </TouchableOpacity>
            <Text style={st.navTitle} numberOfLines={1}>{activeCat.emoji} {tc(activeCat.id, activeCat.name)}</Text>
            <TouchableOpacity onPress={()=>setShowAddCatalog(true)} hitSlop={{top:12,bottom:12,left:12,right:12}}>
              <Text style={st.navPlus}>＋</Text>
            </TouchableOpacity>
          </View>
          <View style={[st.hero,{backgroundColor:activeCat.color}]}>
            <Text style={{fontSize:42}}>{activeCat.emoji}</Text>
            <View>
              <Text style={st.heroName}>{tc(activeCat.id, activeCat.name)}</Text>
              <Text style={[st.heroSub,{color:activeCat.accent}]}>
                {activeProducts.length} {t('productsWord')} · {activeProducts.filter(p=>isInList(p.id)).length} {t('inListWord')}
              </Text>
            </View>
          </View>
          <FlatList
            data={activeProducts}
            keyExtractor={item=>item.id}
            contentContainerStyle={activeProducts.length===0?{flex:1}:{paddingVertical:S.sm}}
            ItemSeparatorComponent={()=><View style={{height:1,backgroundColor:C.borderLight}}/>}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={()=>(
              <View style={st.emptyWrap}>
                <Text style={st.emptyEmoji}>📭</Text>
                <Text style={st.emptyTitle}>{t('noProducts')}</Text>
                <Text style={[st.emptySub,{marginBottom:S.xl}]}>{t('tapPlusToAddFirst')}</Text>
                <TouchableOpacity style={st.emptyBtn} onPress={()=>setShowAddCatalog(true)}>
                  <Text style={st.emptyBtnTx}>{t('plusAddProduct')}</Text>
                </TouchableOpacity>
              </View>
            )}
            renderItem={({item})=>{
              const inList=isInList(item.id);
              return (
                <TouchableOpacity
                  style={[st.productRow,inList&&{backgroundColor:C.checkedBg}]}
                  onPress={()=>{ if(!inList) promptAddToList(item.name,item.catId,item.id); }}
                  onLongPress={()=>{ setActionItem(item); setActionContext('catalog'); }}
                  activeOpacity={0.75} delayLongPress={400}
                >
                  <View style={[st.productBar,{backgroundColor:inList?activeCat.accent:activeCat.accent+'30'}]}/>
                  <View style={st.productInfo}>
                    <Text style={[st.productName,inList&&st.productNameIn]}>{td(item.name)}</Text>
                    {inList&&<Text style={st.productTag}>{t('inYourListCheck')}</Text>}
                  </View>
                  <TouchableOpacity style={[st.productBtn,inList&&{backgroundColor:activeCat.accent}]}
                    onPress={()=>{ if(!inList) promptAddToList(item.name,item.catId,item.id); }}
                    hitSlop={{top:10,bottom:10,left:10,right:10}}>
                    <Text style={[st.productBtnTx,inList&&{color:C.white,fontSize:14}]}>{inList?'✓':'+'}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* ══ PRICE HISTORY ══ */}
      {screen==='priceHistory' && priceHistoryName && (()=>{
        const history=priceHistory[priceHistoryName]||[];
        const cheapest=history.reduce((min,e)=>!e.price?min:(!min||e.price<min.price)?e:min,null);
        return (
          <View style={{flex:1}}>
            <View style={[st.navBar, {backgroundColor: C.primary, paddingTop: insets.top + 8}]}>
              <TouchableOpacity onPress={goBack} hitSlop={{top:12,bottom:12,left:12,right:12}}><Text style={st.backTx}>‹</Text></TouchableOpacity>
              <Text style={st.navTitle} numberOfLines={1}>{td(priceHistoryName)}</Text>
              <View style={{width:32}}/>
            </View>
            <View style={{backgroundColor:C.primaryMid,paddingHorizontal:S.xl,paddingVertical:S.sm}}>
              <Text style={{color:C.primarySoft,fontSize:12}}>{t('priceHistory')} · {history.length} {t('purchasesWord')} · {t('longPressToDelete')}</Text>
              {cheapest?.price&&<Text style={{color:C.white,fontSize:13,fontWeight:'700',marginTop:2}}>{t('cheapestLabel')} {cheapest.price}€{cheapest.market?` · ${cheapest.market}`:''}</Text>}
            </View>
            {history.length===0?(
              <View style={st.emptyWrap}>
                <Text style={st.emptyEmoji}>📊</Text>
                <Text style={st.emptyTitle}>{t('noData')}</Text>
                <Text style={st.emptySub}>{t('logPriceNextTime')}</Text>
              </View>
            ):(
              <FlatList data={history} keyExtractor={(_,i)=>String(i)}
                contentContainerStyle={{padding:S.lg,gap:S.md,paddingBottom:40}}
                showsVerticalScrollIndicator={false}
                renderItem={({item, index})=>{
                  const isBest=cheapest&&item.price===cheapest.price&&item.date===cheapest.date;
                  const hasOffer = item.hasOffer && item.shelfPrice && item.paidPrice;
                  return (
                    <TouchableOpacity
                      style={[st.histCard,isBest&&{borderWidth:2,borderColor:C.success}]}
                      onLongPress={()=>{
                        Alert.alert(
                          t('deleteEntryTitle'),
                          t('deletePurchaseOfDate').replace('{date}', item.date),
                          [
                            {text:t('cancel'),style:'cancel'},
                            {text:t('delete'),style:'destructive',onPress:()=>deleteHistoryEntry(priceHistoryName, index)},
                          ]
                        );
                      }}
                      activeOpacity={0.85}
                      delayLongPress={500}
                    >
                      {isBest&&<View style={st.bestBadge}><Text style={st.bestBadgeTx}>{t('cheapestPurchase')}</Text></View>}
                      {hasOffer&&<View style={[st.bestBadge,{backgroundColor:'#FF9800',marginBottom:S.sm}]}><Text style={st.bestBadgeTx}>{t('offerBadge')} {item.offerType==='percent'?`-${item.offerValue}%`:`-${item.offerValue}€`}</Text></View>}
                      <View style={{flexDirection:'row',gap:S.lg,alignItems:'flex-start'}}>
                        <View style={{minWidth:100,gap:4}}>
                          {hasOffer ? (
                            <>
                              <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                                <Text style={{fontSize:11,color:C.tx3}}>{t('shelfLabel')}</Text>
                                <Text style={{fontSize:15,color:C.tx3,textDecorationLine:'line-through',fontWeight:'600'}}>{item.shelfPrice.toFixed(2)}€</Text>
                              </View>
                              <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                                <Text style={{fontSize:11,color:C.tx2}}>{t('iPaidLabel')}</Text>
                                <Text style={[st.histPrice,{fontSize:20},isBest&&{color:C.success}]}>{(item.totalPaid ?? item.paidPrice).toFixed(2)}€</Text>
                              </View>
                            </>
                          ) : (
                            <Text style={[st.histPrice,isBest&&{color:C.success}]}>{item.price?`${(item.totalPaid ?? item.price).toFixed(2)}€`:'—'}</Text>
                          )}
                          {item.qty>1&&!item.isWeighed&&item.price&&(
                            <Text style={{fontSize:11,color:C.tx3}}>({item.price}€ × {item.qty})</Text>
                          )}
                        </View>
                        <View style={{flex:1,gap:4}}>
                          {item.brand?<Text style={st.histDetail}>🏷️  {item.brand}</Text>:null}
                          {item.market?<Text style={st.histDetail}>🏪  {item.market}</Text>:null}
                          <Text style={[st.histDetail,{color:C.tx3}]}>📅  {item.date}</Text>
                          {item.qty>1&&<Text style={[st.histDetail,{color:C.tx3}]}>x{item.qty} {t('piecesWord')}</Text>}
                          {item.isWeighed&&item.weightKg&&<Text style={st.histDetail}>⚖️  {item.weightKg>=1?`${item.weightKg.toFixed(3)} kg`:`${(item.weightKg*1000).toFixed(0)} g`}</Text>}
                          {item.isWeighed&&item.pricePerKg&&<Text style={[st.histDetail,{color:C.tx3}]}>💰 {item.pricePerKg}€/kg</Text>}
                        </View>
                        <View style={{justifyContent:'center',alignItems:'center',paddingLeft:S.sm}}>
                          <Text style={{fontSize:18}}>🗑️</Text>
                          <Text style={{fontSize:9,color:C.tx3,marginTop:2}}>hold</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        );
      })()}

      {/* ══ MAIN TABS ══ */}
      {isMainTab && (
        <View style={{flex:1}}>

          {/* HOME */}
          {screen==='home' && (
            <ScrollView style={{flex:1,backgroundColor:C.bg}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{backgroundColor:C.bg}}>
              <View style={[st.homeHdr, {paddingTop: insets.top + S.xl}]}>
                <View style={{flex:1}}>
                  <Text style={st.homeGreet}>{t('goodMorning')}</Text>
                  <Text style={st.homeTitle}>{t('whatDoYouNeedToday')}</Text>
                </View>
                <View style={{flexDirection:'row', gap: S.sm, alignItems:'center'}}>
                  <LanguageToggle style={st.cartBtn}/>
                  <TouchableOpacity style={st.cartBtn} onPress={()=>setShowInfo(true)}>
                    <Text style={{fontSize:22}}>ℹ️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={st.cartBtn} onPress={()=>goTab('list')}>
                    <Text style={{fontSize:24}}>🛒</Text>
                    {listCount>0&&<View style={st.cartBadge}><Text style={st.cartBadgeTx}>{listCount>99?'99+':listCount}</Text></View>}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Frequent */}
              <View style={{marginTop:S.xl,marginBottom:S.lg}}>
                <View style={st.secRow}>
                  <Text style={st.secTitle}>{t('frequentlyBought')}</Text>
                  <TouchableOpacity onPress={()=>goTab('frequent')}><Text style={st.secLink}>{t('allArrow')}</Text></TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:S.xl,gap:S.sm}} keyboardShouldPersistTaps="handled">
                  {frequentItems.slice(0,8).map((item,i)=>(
                    <TouchableOpacity key={i} style={st.freqChip} onPress={()=>promptAddToList(item.name,item.catId)} activeOpacity={0.75}>
                      <Text style={{fontSize:15}}>{item.emoji}</Text>
                      <Text style={{fontSize:12,fontWeight:'500',color:C.tx,maxWidth:80}} numberOfLines={1}>{td(item.name)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Categories */}
              <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:S.xl,marginBottom:S.md}}>
                <Text style={st.secTitle}>{t('categoriesIcon')}</Text>
                <TouchableOpacity onPress={()=>setShowAddCategory(true)} style={st.addCatBtn}>
                  <Text style={st.addCatBtnTx}>{t('plusNew')}</Text>
                </TouchableOpacity>
              </View>
              <View style={st.catGrid}>
                {allCategories.map(cat=>{
                  const count=(catalog[cat.id]||[]).length;
                  return (
                    <TouchableOpacity key={cat.id}
                      style={[st.catCard,{backgroundColor:cat.color}]}
                      onPress={()=>goCategory(cat.id)}
                      onLongPress={()=>{
                        if (cat.isCustom) {
                          setEditCategoryTarget(cat);
                        } else {
                          // Default categories: only allow rename via same modal but no delete
                          Alert.alert(
                            tc(cat.id, cat.name),
                            t('whatDoYouWantToDo'),
                            [
                              { text: t('cancel'), style: 'cancel' },
                              { text: t('renameIcon'), onPress: () => setEditCategoryTarget(cat) },
                            ]
                          );
                        }
                      }}
                      activeOpacity={0.8}
                      delayLongPress={600}
                    >
                      <Text style={{fontSize:30,marginBottom:S.sm}}>{cat.emoji}</Text>
                      <Text style={{fontSize:13,fontWeight:'700',color:C.tx,marginBottom:2}} numberOfLines={2}>{tc(cat.id, cat.name)}</Text>
                      <Text style={{fontSize:11,fontWeight:'500',color:cat.accent}}>{count} {t('itemsWord')}</Text>
                      {cat.isCustom && <Text style={{fontSize:9,color:cat.accent,marginTop:2}}>{t('yourOwnEdit')}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>


              <View style={{height:100}}/>
            </ScrollView>
          )}

          {/* LIST */}
          {screen==='list' && (
            <View style={{flex:1}}>
              <View style={[st.listHdr, {backgroundColor: C.primary, paddingTop: insets.top + S.lg}]}>
                <View style={st.listHdrRow}>
                  <View>
                    <Text style={st.listTitle}>{t('myListIcon')}</Text>
                    <Text style={st.listSub}>{checkedCount}/{listCount} {t('completedWord')}</Text>
                  </View>
                  <View style={{flexDirection:'row', gap: S.sm}}>
                    {/* PDF Menu */}
                    <TouchableOpacity style={st.trashBtn} onPress={()=>setShowPdfMenu(true)}>
                      <Text style={{fontSize:20}}>{pdfLoading ? '⏳' : '📄'}</Text>
                    </TouchableOpacity>
                    {listCount>0&&(
                      <TouchableOpacity style={st.trashBtn} onPress={()=>Alert.alert(t('clearTitle'),t('deleteAllQuestion'),[{text:t('cancel'),style:'cancel'},{text:t('yes'),style:'destructive',onPress:()=>setListItems([])}])}>
                        <Text style={{fontSize:20}}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {listCount>0&&(
                  <View>
                    <View style={st.progressTrack}><View style={[st.progressFill,{width:`${progress*100}%`}]}/></View>
                    {checkedCount>0&&checkedCount<listCount&&(
                      <TouchableOpacity onPress={()=>setListItems(prev=>prev.filter(i=>!i.checked))}>
                        <Text style={st.clearDoneTx}>{t('removeCompleted')}</Text>
                      </TouchableOpacity>
                    )}
                    {checkedCount===listCount&&listCount>0&&<Text style={st.doneTx}>{t('shoppingDoneCelebrate')}</Text>}
                  </View>
                )}
              </View>

              {listCount===0?(
                <View style={st.emptyWrap}>
                  <Text style={st.emptyEmoji}>🛒</Text>
                  <Text style={st.emptyTitle}>{t('yourListIsEmpty')}</Text>
                  <Text style={[st.emptySub,{marginBottom:S.xl}]}>{t('addProductsFromCategories')}</Text>
                  <TouchableOpacity style={st.emptyBtn} onPress={()=>goTab('home')}><Text style={st.emptyBtnTx}>{t('goToCategories')}</Text></TouchableOpacity>
                </View>
              ):(
                <SectionList
                  sections={listSections} keyExtractor={item=>item.id}
                  contentContainerStyle={{paddingBottom:100}}
                  stickySectionHeadersEnabled showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  renderSectionHeader={({section})=>(
                    <View style={[st.listSecHdr,{backgroundColor:section.color+'CC'}]}>
                      <Text style={{fontSize:14}}>{section.emoji}</Text>
                      <Text style={st.listSecName}>{tc(section.id, section.name)}</Text>
                      <View style={[st.listSecBadge,{backgroundColor:section.accent}]}>
                        <Text style={{color:C.white,fontSize:10,fontWeight:'700'}}>{section.data.filter(i=>!i.checked).length}/{section.data.length}</Text>
                      </View>
                    </View>
                  )}
                  renderItem={({item})=>(
                    <TouchableOpacity
                      style={[st.listItem,{backgroundColor:C.surface,borderBottomColor:C.borderLight},item.checked&&{backgroundColor:C.checkedBg}]}
                      onPress={()=>handleTapCheck(item)}
                      onLongPress={()=>{ setActionItem(item); setActionContext('list'); }}
                      activeOpacity={0.8} delayLongPress={400}
                    >
                      <TouchableOpacity style={[st.checkbox,item.checked&&st.checkboxOn]} onPress={()=>handleTapCheck(item)} hitSlop={{top:10,bottom:10,left:10,right:10}}>
                        {item.checked&&<Text style={{color:C.white,fontSize:14,fontWeight:'800'}}>✓</Text>}
                      </TouchableOpacity>
                      <View style={{flex:1}}>
                        <Text style={[st.listItemName,item.checked&&st.listItemNameCkd]}>{td(item.name)}</Text>
                        {item.isWeighed&&item.kgAmount?<Text style={{fontSize:11,color:C.tx2,fontWeight:'500',marginTop:1}}>⚖️ {item.kgAmount>=1?`${item.kgAmount} kg`:`${(item.kgAmount*1000).toFixed(0)} g`}</Text>:item.isWeighed?<Text style={{fontSize:11,color:C.tx3,marginTop:1}}>{t('weighing')}</Text>:null}
                        {item.checked&&item.price?<Text style={st.priceTag}>💰 {item.price}€{item.brand?` · ${item.brand}`:''}{item.market?` · ${item.market}`:''}</Text>:null}
                        {(priceHistory[item.name]||[]).length>0&&(
                          <TouchableOpacity onPress={()=>goPriceHistory(item.name)} hitSlop={{top:6,bottom:6,left:6,right:6}}>
                            <Text style={st.histLink}>{t('priceHistoryArrow')}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {!item.isWeighed?(
                        <View style={st.qtyRow}>
                          <TouchableOpacity style={st.qtyBtn} onPress={()=>decQty(item.id)} hitSlop={{top:8,bottom:8,left:8,right:8}}><Text style={st.qtyBtnTx}>−</Text></TouchableOpacity>
                          <Text style={st.qtyNum}>{item.qty}</Text>
                          <TouchableOpacity style={st.qtyBtn} onPress={()=>incQty(item.id)} hitSlop={{top:8,bottom:8,left:8,right:8}}><Text style={st.qtyBtnTx}>+</Text></TouchableOpacity>
                        </View>
                      ):<Text style={{fontSize:20,paddingHorizontal:S.sm}}>⚖️</Text>}
                    </TouchableOpacity>
                  )}
                />
              )}

            </View>
          )}

          {/* FREQUENT */}
          {screen==='frequent' && (
            <View style={{flex:1}}>
              <View style={[st.freqHdr, {backgroundColor: C.primary, paddingTop: insets.top + S.lg}]}>
                <Text style={st.listTitle}>{t('frequentlyBought')}</Text>
                <Text style={st.listSub}>{t('quickAddToList')}</Text>
              </View>
              <FlatList
                data={frequentItems} keyExtractor={(item,i)=>`${item.name}_${i}`}
                contentContainerStyle={{padding:S.lg,gap:S.sm,paddingBottom:40}}
                showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                renderItem={({item})=>{
                  const cat=allCategories.find(c=>c.id===item.catId);
                  return (
                    <View style={[st.freqCard, {backgroundColor: C.surface}]}>
                      <View style={[st.freqEmojiBox,{backgroundColor:cat?.color||'#F3E5F5'}]}><Text style={{fontSize:22}}>{item.emoji}</Text></View>
                      <View style={{flex:1}}>
                        <Text style={st.freqName}>{td(item.name)}</Text>
                        <Text style={[st.freqCat,{color:cat?.accent||C.tx3}]}>{cat?.emoji} {cat?tc(cat.id,cat.name):t('otherCategory')}</Text>
                      </View>
                      {(usageCounts[item.name]||0)>0&&<View style={st.usageBadge}><Text style={st.usageTx}>{usageCounts[item.name]}x</Text></View>}
                      <TouchableOpacity style={st.freqAddBtn} onPress={()=>promptAddToList(item.name,item.catId)} activeOpacity={0.75}>
                        <Text style={st.freqAddBtnTx}>+</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            </View>
          )}


          {/* HISTORY */}
          {screen==='history' && (()=>{
            // Build sections: for each category that has price history entries
            const sections = allCategories.map(cat => {
              // Find all products in this category that have price history
              const products = Object.entries(priceHistory)
                .filter(([name]) => {
                  // Check if product belongs to this category via catalog
                  const catProds = catalog[cat.id] || [];
                  const inCat = catProds.some(p => p.name === name);
                  // Also check via FREQUENT
                  const freq = FREQUENT.find(f => f.name === name && f.catId === cat.id);
                  return inCat || !!freq;
                })
                .map(([name, entries]) => ({ name, entries }));
              return { ...cat, data: products };
            }).filter(s => s.data.length > 0);

            // Also collect products with history that don't match any category
            const allHistoryNames = Object.keys(priceHistory);
            const matched = new Set();
            sections.forEach(s => s.data.forEach(p => matched.add(p.name)));
            const uncategorized = allHistoryNames
              .filter(n => !matched.has(n))
              .map(n => ({ name: n, entries: priceHistory[n] }));
            if (uncategorized.length > 0) {
              sections.push({ id:'other', name:t('otherCategory'), emoji:'🧩', color:'#F3E5F5', accent:'#9C27B0', data: uncategorized });
            }

            return (
              <View style={{flex:1}}>
                <View style={[st.freqHdr, {backgroundColor: C.primary, paddingTop: insets.top + S.lg}]}>
                  <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}>
                    <View style={{flex:1}}>
                      <Text style={st.listTitle}>{t('priceHistoryIcon')}</Text>
                      <Text style={st.listSub}>{t('allPurchasesByCategory')}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={()=>setShowExpenseAnalysis(true)}
                      style={{backgroundColor:'rgba(255,255,255,0.2)', borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: S.sm, flexDirection:'row', alignItems:'center', gap:6}}
                      hitSlop={{top:10,bottom:10,left:10,right:10}}
                    >
                      <Text style={{fontSize:16}}>📊</Text>
                      <Text style={{color:C.white, fontSize:12, fontWeight:'700'}}>{t('analysis')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {sections.length === 0 ? (
                  <View style={st.emptyWrap}>
                    <Text style={st.emptyEmoji}>📊</Text>
                    <Text style={st.emptyTitle}>{t('noData')}</Text>
                    <Text style={st.emptySub}>{t('buyProductsToSeeHere')}</Text>
                  </View>
                ) : (
                  <SectionList
                    sections={sections}
                    keyExtractor={(item, i) => `${item.name}_${i}`}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    stickySectionHeadersEnabled
                    showsVerticalScrollIndicator={false}
                    renderSectionHeader={({ section }) => (
                      <View style={[st.listSecHdr, { backgroundColor: section.color + 'CC' }]}>
                        <Text style={{ fontSize: 16 }}>{section.emoji}</Text>
                        <Text style={st.listSecName}>{tc(section.id, section.name)}</Text>
                        <View style={[st.listSecBadge, { backgroundColor: section.accent }]}>
                          <Text style={{ color: C.white, fontSize: 10, fontWeight: '700' }}>{section.data.length} {t('itemsWord')}</Text>
                        </View>
                      </View>
                    )}
                    renderItem={({ item }) => {
                      const entries = item.entries || [];
                      const cheapest = entries.reduce((min, e) => {
                        const p = e.paidPrice || e.price;
                        return (!p ? min : (!min || p < min) ? p : min);
                      }, null);
                      const lastEntry = entries[0];
                      const lastPrice = lastEntry?.paidPrice || lastEntry?.price;
                      const lastShelf = lastEntry?.shelfPrice;
                      return (
                        <TouchableOpacity
                          style={st.historyProductRow}
                          onPress={() => goPriceHistory(item.name)}
                          onLongPress={() => {
                            Alert.alert(
                              t('deleteProductTitle'),
                              t('deleteAllHistoryFor').replace('{name}', item.name),
                              [
                                { text: t('cancel'), style: 'cancel' },
                                {
                                  text: t('delete'),
                                  style: 'destructive',
                                  onPress: () => setPriceHistory(ph => {
                                    const updated = { ...ph };
                                    delete updated[item.name];
                                    return updated;
                                  }),
                                },
                              ]
                            );
                          }}
                          activeOpacity={0.75}
                          delayLongPress={500}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={st.historyProductName}>{td(item.name)}</Text>
                            <Text style={st.historyProductSub}>
                              {entries.length} {t('purchasesWord')} · {t('lastColonLower')} {lastEntry?.date || '—'}
                            </Text>
                            <Text style={{fontSize:9,color:C.tx3,marginTop:1}}>{t('longPressToDelete')}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 2 }}>
                            {lastShelf && lastPrice && lastShelf !== lastPrice ? (
                              <>
                                <Text style={{ fontSize: 11, color: C.tx3, textDecorationLine: 'line-through' }}>{lastShelf.toFixed(2)}€</Text>
                                <Text style={st.historyProductPrice}>{lastPrice.toFixed(2)}€</Text>
                              </>
                            ) : (
                              <Text style={st.historyProductPrice}>{lastPrice ? `${lastPrice}€` : '—'}</Text>
                            )}
                            {cheapest && (
                              <Text style={st.historyCheapest}>min: {cheapest}€</Text>
                            )}
                          </View>
                          <Text style={{ color: C.tx3, fontSize: 18, marginLeft: S.sm }}>›</Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </View>
            );
          })()}

          {/* TAB BAR */}
          <View style={[st.tabBar, {backgroundColor: C.surface, borderTopColor: C.border, height: 72 + insets.bottom, paddingBottom: 8 + insets.bottom}]}>
            {[
              {id:'home',emoji:'🏠',label:t('home')},
              {id:'list',emoji:'🛒',label:t('list'),badge:listCount},
              {id:'frequent',emoji:'⭐',label:t('frequent')},
              {id:'history',emoji:'📈',label:t('history')},
            ].map(tab=>(
              <TouchableOpacity key={tab.id} style={[st.tabItem,screen===tab.id&&st.tabItemOn]} onPress={()=>goTab(tab.id)}>
                <View style={{position:'relative'}}>
                  <Text style={{fontSize:22,marginBottom:2}}>{tab.emoji}</Text>
                  {tab.badge>0&&<View style={st.tabBadge}><Text style={st.tabBadgeTx}>{tab.badge>99?'99+':tab.badge}</Text></View>}
                </View>
                <Text style={[st.tabLabel,screen===tab.id&&st.tabLabelOn]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ══ MODALS ══ */}
      <AddModal visible={showAddCatalog} onClose={()=>setShowAddCatalog(false)} onSave={({name})=>{ if(activeCatId) addCatalogProduct(activeCatId,name); }} title={activeCat?`${t('newProductFor')} — ${tc(activeCat.id, activeCat.name)}`:t('newProduct')} allCategories={allCategories}/>
      <AddModal visible={showAddList} onClose={()=>setShowAddList(false)} onSave={({name,catId})=>addToList(name,catId)} title={t('addToList')} showCat initCatId="other" allCategories={allCategories}/>
      <AddModal visible={!!editCatalogItem} onClose={()=>setEditCatalogItem(null)} onSave={({name})=>{ if(editCatalogItem&&activeCatId) editCatalogProduct(activeCatId,editCatalogItem.id,name); setEditCatalogItem(null); }} initName={editCatalogItem?td(editCatalogItem.name):''} title={t('editProduct')} mode="edit" allCategories={allCategories}/>
      <AddModal visible={!!editListItem_} onClose={()=>setEditListItem(null)} onSave={({name})=>{ if(editListItem_) editListItemFn(editListItem_.id,name); setEditListItem(null); }} initName={editListItem_?td(editListItem_.name):''} title={t('edit')} mode="edit" allCategories={allCategories}/>

      <ActionSheet
        visible={!!actionItem&&actionContext==='catalog'}
        onClose={()=>{ setActionItem(null); setActionContext(null); }}
        title={actionItem?td(actionItem.name):''}
        actions={[
          {icon:isInList(actionItem?.id)?'✓':'+',label:isInList(actionItem?.id)?t('alreadyInList'):t('addToList'),onPress:()=>{ if(actionItem) promptAddToList(actionItem.name,actionItem.catId,actionItem.id); },disabled:isInList(actionItem?.id)},
          {icon:'✏️',label:t('edit'),onPress:()=>setEditCatalogItem(actionItem)},
          {icon:'🗑️',label:t('deleteFromCategory'),danger:true,onPress:()=>{ if(actionItem&&activeCatId) delCatalogProduct(activeCatId,actionItem.id); }},
        ]}
      />

      <ActionSheet
        visible={!!actionItem&&actionContext==='list'}
        onClose={()=>{ setActionItem(null); setActionContext(null); }}
        title={actionItem?td(actionItem.name):''}
        actions={[
          {icon:'📊',label:t('priceHistory'),onPress:()=>{ if(actionItem) goPriceHistory(actionItem.name); }},
          {icon:actionItem?.checked?'↩️':'✓',label:actionItem?.checked?t('uncheck'):t('markAsPurchased'),onPress:()=>{ if(actionItem) handleTapCheck(actionItem); }},
          {icon:'✏️',label:t('edit'),onPress:()=>setEditListItem(actionItem)},
          {icon:'🗑️',label:t('delete'),danger:true,onPress:()=>{ if(actionItem) delListItemFn(actionItem.id); }},
        ]}
      />

      <PriceModal
        visible={!!priceModalItem}
        onClose={()=>setPriceModalItem(null)}
        onSave={({price,brand,market,hasOffer,offerType,offerValue,paidPrice,shelfPrice,isWeighed,pricePerKg,weightKg})=>{ if(priceModalItem) checkWithPrice(priceModalItem.id,price,brand,market,hasOffer,offerType,offerValue,paidPrice,shelfPrice,isWeighed,pricePerKg,weightKg); setPriceModalItem(null); }}
        itemName={priceModalItem?td(priceModalItem.name):''}
        lastEntry={priceModalItem?(priceHistory[priceModalItem.name]||[])[0]:null}
      />

      <EditCategoryModal
        visible={!!editCategoryTarget}
        onClose={()=>setEditCategoryTarget(null)}
        category={editCategoryTarget}
        onSave={(newName, newEmoji) => {
          if (editCategoryTarget) {
            if (editCategoryTarget.isCustom) {
              editCategoryName(editCategoryTarget.id, newName, newEmoji);
            } else {
              // For default categories, we store a rename in customCategories as override
              // Simple approach: just rename via editCategoryName if somehow in custom
              // For default: store display override
              editCategoryName(editCategoryTarget.id, newName, newEmoji);
            }
          }
          setEditCategoryTarget(null);
        }}
        onDelete={editCategoryTarget?.isCustom ? () => {
          Alert.alert(
            t('deleteCategoryTitleAlert'),
            t('deleteCategoryConfirmMsg').replace('{name}', editCategoryTarget?.name),
            [
              { text: t('cancel'), style: 'cancel' },
              { text: t('delete'), style: 'destructive', onPress: () => { deleteCustomCategory(editCategoryTarget.id); setEditCategoryTarget(null); } },
            ]
          );
        } : null}
      />

      {/* INFO MODAL */}
      <Modal visible={showInfo} transparent animationType="slide" onRequestClose={()=>setShowInfo(false)} statusBarTranslucent={false}>
        <Pressable style={[st.modalOverlay, {backgroundColor:'rgba(0,0,0,0.6)'}]} onPress={()=>setShowInfo(false)}>
          <Pressable style={[st.modalSheet, {backgroundColor: C.surface}]} onPress={()=>{}}>
            <View style={st.modalHandle}/>
            <View style={{alignItems:'center', marginBottom: S.xl}}>
              <Image source={LOGO} style={{width:80,height:80,marginBottom:S.md}} resizeMode="contain"/>
              <Text style={[st.modalTitle, {color:C.tx, fontSize:22, textAlign:'center'}]}>{t('appName')}</Text>
              <Text style={{fontSize:12, color:C.tx3, marginTop:4}}>{t('smartShoppingApp')}</Text>
            </View>

            {[
              {emoji:'🏠', title:t('home'), desc:t('helpHomeDesc')},
              {emoji:'🛒', title:t('list'), desc:t('helpListDesc')},
              {emoji:'⭐', title:t('frequent'), desc:t('helpFrequentDesc')},
              {emoji:'📈', title:t('history'), desc:t('helpHistoryDesc')},
              {emoji:'🏷️', title:t('offers'), desc:t('offerHelpDesc')},
              {emoji:'📁', title:t('yourCategories'), desc:t('createOwnCategoriesDesc')},
            ].map((item, i) => (
              <View key={i} style={{flexDirection:'row', gap:S.md, marginBottom:S.md}}>
                <Text style={{fontSize:22, width:32}}>{item.emoji}</Text>
                <View style={{flex:1}}>
                  <Text style={{fontSize:14, fontWeight:'700', color:C.tx, marginBottom:2}}>{item.title}</Text>
                  <Text style={{fontSize:12, color:C.tx2, lineHeight:18}}>{item.desc}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={[st.saveBtn, {marginTop:S.md}]} onPress={()=>setShowInfo(false)}>
              <Text style={st.saveTx}>{t('gotIt')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <NewCategoryModal
        visible={showAddCategory}
        onClose={()=>setShowAddCategory(false)}
        onSave={(name, emoji) => {
          const newCat = addCustomCategory(name, emoji);
          // Navigate to new category
          setTimeout(() => goCategory(newCat.id), 100);
        }}
      />
      <ExpenseAnalysisModal
        visible={showExpenseAnalysis}
        onClose={()=>setShowExpenseAnalysis(false)}
        priceHistory={priceHistory}
        allCategories={allCategories}
        catalog={catalog}
        FREQUENT={FREQUENT}
      />
      {/* QTY PICKER MODAL */}
      <QtyPickerModal
        visible={!!qtyPicker}
        onClose={()=>setQtyPicker(null)}
        productName={qtyPicker?.name||''}
        onAdd={(qty, isWeighed, kgAmount)=>{
          if(qtyPicker) addToList(qtyPicker.name, qtyPicker.catId, qtyPicker.refId||null, qty, isWeighed, kgAmount);
          setQtyPicker(null);
        }}
      />

      {/* EDIT LIST ITEM MODAL */}
      <EditListItemModal
        visible={!!editListModal}
        onClose={()=>setEditListModal(null)}
        item={editListModal}
        onSave={({name,qty,isWeighed,kgAmount})=>{
          if(editListModal) editListItemFull(editListModal.id,{name,qty,isWeighed,kgAmount});
          setEditListModal(null);
        }}
      />

      {/* PDF MENU */}
      <Modal visible={showPdfMenu} transparent animationType="fade" onRequestClose={()=>setShowPdfMenu(false)} statusBarTranslucent={false}>
        <Pressable style={[st.modalOverlay, {backgroundColor:'rgba(0,0,0,0.55)'}]} onPress={()=>setShowPdfMenu(false)}>
          <View style={{padding: S.lg, paddingBottom: 40}}>
            <View style={[{backgroundColor: C.surface, borderRadius: R.xl, overflow:'hidden', marginBottom: S.sm}]}>
              <View style={[{backgroundColor: C.surfaceAlt, padding: S.md, alignItems:'center'}]}>
                <Text style={{fontSize: 12, fontWeight:'600', color: C.tx2, textTransform:'uppercase', letterSpacing:0.5}}>
                  {t('pdfListIcon')}
                </Text>
              </View>

              {/* Export PDF */}
              <TouchableOpacity
                style={{flexDirection:'row', alignItems:'center', gap: S.md, padding: S.lg, backgroundColor: C.surface}}
                onPress={handleExportPDF}
                disabled={pdfLoading}
              >
                <Text style={{fontSize: 24, width: 32}}>📄</Text>
                <View style={{flex:1}}>
                  <Text style={{fontSize: 15, fontWeight:'600', color: C.tx}}>{t('exportToPdf')}</Text>
                  <Text style={{fontSize: 12, color: C.tx3, marginTop: 2}}>{t('forPrintOrShare')}</Text>
                </View>
              </TouchableOpacity>

              <View style={{height:1, backgroundColor: C.surfaceAlt, marginHorizontal: S.lg}}/>

              {/* Export JSON */}
              <TouchableOpacity
                style={{flexDirection:'row', alignItems:'center', gap: S.md, padding: S.lg, backgroundColor: C.surface}}
                onPress={handleExportJSON}
                disabled={pdfLoading}
              >
                <Text style={{fontSize: 24, width: 32}}>💾</Text>
                <View style={{flex:1}}>
                  <Text style={{fontSize: 15, fontWeight:'600', color: C.tx}}>{t('saveListJson')}</Text>
                  <Text style={{fontSize: 12, color: C.tx3, marginTop: 2}}>{t('saveForLaterImport')}</Text>
                </View>
              </TouchableOpacity>

              <View style={{height:1, backgroundColor: C.surfaceAlt, marginHorizontal: S.lg}}/>

              {/* Import */}
              <TouchableOpacity
                style={{flexDirection:'row', alignItems:'center', gap: S.md, padding: S.lg, backgroundColor: C.surface}}
                onPress={handleImportPDF}
                disabled={pdfLoading}
              >
                <Text style={{fontSize: 24, width: 32}}>📥</Text>
                <View style={{flex:1}}>
                  <Text style={{fontSize: 15, fontWeight:'600', color: C.tx}}>{t('importList')}</Text>
                  <Text style={{fontSize: 12, color: C.tx3, marginTop: 2}}>{t('openSavedListJson')}</Text>
                </View>
              </TouchableOpacity>

              <View style={{height:8, backgroundColor: C.bg}}/>

              <View style={[{backgroundColor: C.surfaceAlt, padding: S.md, alignItems:'center'}]}>
                <Text style={{fontSize: 12, fontWeight:'600', color: C.tx2, textTransform:'uppercase', letterSpacing:0.5}}>
                  {t('backupSettingsIcon')}
                </Text>
              </View>

              {/* Export full backup */}
              <TouchableOpacity
                style={{flexDirection:'row', alignItems:'center', gap: S.md, padding: S.lg, backgroundColor: C.surface}}
                onPress={handleExportBackup}
                disabled={pdfLoading}
              >
                <Text style={{fontSize: 24, width: 32}}>📤</Text>
                <View style={{flex:1}}>
                  <Text style={{fontSize: 15, fontWeight:'600', color: C.tx}}>{t('exportBackup')}</Text>
                  <Text style={{fontSize: 12, color: C.tx3, marginTop: 2}}>{t('categoriesProductsHistory')}</Text>
                </View>
              </TouchableOpacity>

              <View style={{height:1, backgroundColor: C.surfaceAlt, marginHorizontal: S.lg}}/>

              {/* Import full backup */}
              <TouchableOpacity
                style={{flexDirection:'row', alignItems:'center', gap: S.md, padding: S.lg, backgroundColor: C.surface}}
                onPress={handleImportBackup}
                disabled={pdfLoading}
              >
                <Text style={{fontSize: 24, width: 32}}>📲</Text>
                <View style={{flex:1}}>
                  <Text style={{fontSize: 15, fontWeight:'600', color: C.tx}}>{t('restoreBackup')}</Text>
                  <Text style={{fontSize: 12, color: C.tx3, marginTop: 2}}>{t('onNewDeviceFromFile')}</Text>
                </View>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[{backgroundColor: C.surface, borderRadius: R.lg, padding: S.md, alignItems:'center'}]} onPress={()=>setShowPdfMenu(false)}>
              <Text style={{fontSize: 15, fontWeight:'700', color: C.tx}}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* PDF LOADING OVERLAY */}
      {pdfLoading && (
        <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.4)',alignItems:'center',justifyContent:'center'}}>
          <View style={{backgroundColor: C.surface, borderRadius: R.lg, padding: S.xxl, alignItems:'center', gap: S.md}}>
            <ActivityIndicator size="large" color={C.primary}/>
            <Text style={{color: C.tx, fontWeight:'600', fontSize:14}}>{t('pleaseWait')}</Text>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ErrorBoundary><AppContent/></ErrorBoundary>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.bg},
  // Splash
  splashScreen:{flex:1,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center',padding:S.xxxl},
  splashLogo:{width:180,height:180,marginBottom:S.xxl},
  splashTitle:{fontSize:28,fontWeight:'800',color:C.primary,marginBottom:S.sm},
  splashSub:{fontSize:15,color:C.tx2,fontWeight:'400'},
  // Error
  errScreen:{flex:1,backgroundColor:C.bg,alignItems:'center',justifyContent:'center',padding:S.xxxl},
  errEmoji:{fontSize:52,marginBottom:S.lg},
  errTitle:{fontSize:20,fontWeight:'700',color:C.tx,marginBottom:S.md,textAlign:'center'},
  errMsg:{fontSize:13,color:C.tx2,textAlign:'center',lineHeight:20},
  // Modal
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},
  modalSheet:{backgroundColor:C.surface,borderTopLeftRadius:24,borderTopRightRadius:24,padding:S.xl,paddingBottom:Platform.OS==='ios'?44:S.xl},
  modalHandle:{width:36,height:4,backgroundColor:C.border,borderRadius:2,alignSelf:'center',marginBottom:S.lg},
  modalTitle:{fontSize:18,fontWeight:'700',color:C.tx,marginBottom:S.lg},
  textInput:{backgroundColor:C.surfaceAlt,borderRadius:R.md,borderWidth:1.5,borderColor:C.border,paddingHorizontal:S.lg,paddingVertical:14,fontSize:15,color:C.tx,marginBottom:S.lg},
  fieldLabel:{fontSize:12,fontWeight:'600',color:C.tx2,marginBottom:S.xs,textTransform:'uppercase',letterSpacing:0.5},
  catChip:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:C.surfaceAlt,borderRadius:R.full,paddingHorizontal:S.md,paddingVertical:7,borderWidth:1.5,borderColor:C.border,marginRight:S.sm},
  catChipEmoji:{fontSize:14},
  catChipName:{fontSize:12,fontWeight:'500',color:C.tx2,maxWidth:90},
  modalBtns:{flexDirection:'row',gap:S.md},
  cancelBtn:{flex:1,paddingVertical:S.md,backgroundColor:C.surfaceAlt,borderRadius:R.md,alignItems:'center',borderWidth:1.5,borderColor:C.border},
  cancelTx:{color:C.tx2,fontWeight:'600',fontSize:15},
  saveBtn:{flex:2,paddingVertical:S.md,backgroundColor:C.primary,borderRadius:R.md,alignItems:'center'},
  saveBtnDis:{backgroundColor:C.tx3},
  saveTx:{color:C.white,fontWeight:'700',fontSize:15},
  // ActionSheet
  asWrap:{padding:S.lg,paddingBottom:Platform.OS==='ios'?40:S.lg},
  asCard:{backgroundColor:C.surface,borderRadius:R.xl,overflow:'hidden',marginBottom:S.sm},
  asHead:{backgroundColor:C.surfaceAlt,padding:S.md,alignItems:'center'},
  asHeadTx:{fontSize:12,fontWeight:'600',color:C.tx2,textTransform:'uppercase',letterSpacing:0.5},
  asRow:{flexDirection:'row',alignItems:'center',gap:S.md,padding:S.lg,backgroundColor:C.surface},
  asSep:{height:1,backgroundColor:C.surfaceAlt,marginHorizontal:S.lg},
  asIcon:{fontSize:20,width:28},
  asLabel:{fontSize:15,fontWeight:'500',color:C.tx},
  asCancel:{backgroundColor:C.surface,borderRadius:R.lg,padding:S.md,alignItems:'center'},
  asCancelTx:{fontSize:15,fontWeight:'700',color:C.tx},
  // PriceModal
  pmRow:{flexDirection:'row',alignItems:'center',gap:S.md,marginBottom:S.lg},
  pmCircle:{width:44,height:44,borderRadius:22,backgroundColor:C.success,alignItems:'center',justifyContent:'center'},
  pmCircleTx:{color:C.white,fontSize:22,fontWeight:'800'},
  lastBox:{backgroundColor:C.primaryPale,borderRadius:R.md,padding:S.md,marginBottom:S.md},
  lastTx:{fontSize:12,fontWeight:'600',color:C.primaryLight},
  mkChip:{paddingHorizontal:S.md,paddingVertical:7,borderRadius:R.full,borderWidth:1.5,borderColor:C.border,backgroundColor:C.surfaceAlt,marginRight:S.sm},
  mkChipOn:{backgroundColor:C.primary,borderColor:C.primary},
  mkChipTx:{fontSize:12,fontWeight:'500',color:C.tx2},
  mkChipTxOn:{color:C.white,fontWeight:'700'},
  // Nav
  navBar:{backgroundColor:C.primary,paddingHorizontal:S.lg,paddingVertical:S.md,flexDirection:'row',alignItems:'center',gap:S.md,minHeight:56},
  backTx:{color:C.white,fontSize:30,lineHeight:36,fontWeight:'300'},
  navTitle:{flex:1,color:C.white,fontSize:17,fontWeight:'700'},
  navPlus:{color:C.white,fontSize:26,lineHeight:30},
  // Hero
  hero:{flexDirection:'row',alignItems:'center',gap:S.lg,paddingHorizontal:S.xl,paddingVertical:S.lg},
  heroName:{fontSize:18,fontWeight:'800',color:C.tx},
  heroSub:{fontSize:12,fontWeight:'500',marginTop:2},
  // Home
  homeHdr:{backgroundColor:C.primary,paddingHorizontal:S.xl,paddingTop:S.xl,paddingBottom:S.xxl,flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},
  homeGreet:{color:C.primarySoft,fontSize:12,fontWeight:'500',marginBottom:2},
  homeTitle:{color:C.white,fontSize:22,fontWeight:'800'},
  cartBtn:{width:48,height:48,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:R.md,alignItems:'center',justifyContent:'center'},
  cartBadge:{position:'absolute',top:-4,right:-4,backgroundColor:C.accent,borderRadius:R.full,minWidth:18,height:18,alignItems:'center',justifyContent:'center',paddingHorizontal:4,borderWidth:2,borderColor:C.primary},
  cartBadgeTx:{color:C.white,fontSize:10,fontWeight:'800'},
  secRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:S.xl,marginBottom:S.md},
  secTitle:{fontSize:16,fontWeight:'700',color:C.tx},
  secLink:{fontSize:13,fontWeight:'600',color:C.primaryLight},
  freqChip:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:C.surface,borderRadius:R.full,paddingHorizontal:S.md,paddingVertical:S.sm,borderWidth:1.5,borderColor:C.border,elevation:1},
  catGrid:{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:S.lg,gap:S.md,marginBottom:S.xl},
  catCard:{width:'47%',borderRadius:R.lg,padding:S.lg,elevation:1},
  quickAddBtn:{marginHorizontal:S.xl,marginBottom:S.lg,backgroundColor:C.primaryPale,borderRadius:R.lg,paddingVertical:S.lg,alignItems:'center',borderWidth:2,borderColor:C.primarySoft,borderStyle:'dashed'},
  quickAddTx:{fontSize:14,fontWeight:'600',color:C.primary},
  // Product row
  productRow:{flexDirection:'row',alignItems:'center',backgroundColor:C.surface,marginHorizontal:S.lg,marginVertical:3,borderRadius:R.md,overflow:'hidden',elevation:1},
  productBar:{width:4,alignSelf:'stretch',minHeight:56},
  productInfo:{flex:1,paddingHorizontal:S.md,paddingVertical:S.md},
  productName:{fontSize:15,fontWeight:'500',color:C.tx},
  productNameIn:{color:C.tx3},
  productTag:{fontSize:11,color:C.primaryLight,fontWeight:'500',marginTop:2},
  productBtn:{width:40,height:40,borderRadius:R.sm,backgroundColor:C.primaryPale,alignItems:'center',justifyContent:'center',marginRight:S.md},
  productBtnTx:{fontSize:20,color:C.primary,fontWeight:'700',lineHeight:24},
  // History
  histCard:{backgroundColor:C.surface,borderRadius:R.lg,padding:S.lg,elevation:1},
  bestBadge:{backgroundColor:C.success,borderRadius:R.full,paddingHorizontal:S.md,paddingVertical:3,alignSelf:'flex-start',marginBottom:S.sm},
  bestBadgeTx:{color:C.white,fontSize:11,fontWeight:'700'},
  histPrice:{fontSize:26,fontWeight:'800',color:C.primary,minWidth:70},
  histDetail:{fontSize:14,color:C.tx2},
  // List
  listHdr:{backgroundColor:C.primary,paddingHorizontal:S.xl,paddingTop:S.lg,paddingBottom:S.md},
  listHdrRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:S.sm},
  listTitle:{fontSize:22,fontWeight:'800',color:C.white},
  listSub:{fontSize:12,color:C.primarySoft,marginTop:2},
  trashBtn:{width:40,height:40,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:R.sm,alignItems:'center',justifyContent:'center'},
  progressTrack:{height:6,backgroundColor:'rgba(255,255,255,0.2)',borderRadius:R.full,overflow:'hidden',marginBottom:S.xs},
  progressFill:{height:'100%',backgroundColor:C.primarySoft,borderRadius:R.full},
  clearDoneTx:{fontSize:11,color:C.primarySoft,fontWeight:'500',textAlign:'right'},
  doneTx:{fontSize:13,color:C.primarySoft,fontWeight:'700',textAlign:'center',paddingVertical:S.xs},
  listSecHdr:{flexDirection:'row',alignItems:'center',gap:S.sm,paddingHorizontal:S.lg,paddingVertical:S.sm},
  listSecName:{flex:1,fontSize:11,fontWeight:'700',color:C.tx,textTransform:'uppercase',letterSpacing:0.5},
  listSecBadge:{borderRadius:R.full,paddingHorizontal:8,paddingVertical:2},
  listItem:{flexDirection:'row',alignItems:'center',gap:S.md,backgroundColor:C.surface,paddingHorizontal:S.lg,paddingVertical:S.md,borderBottomWidth:1,borderBottomColor:C.borderLight},
  checkbox:{width:24,height:24,borderRadius:6,borderWidth:2,borderColor:C.primaryLight,backgroundColor:C.surface,alignItems:'center',justifyContent:'center',flexShrink:0},
  checkboxOn:{backgroundColor:C.primaryLight,borderColor:C.primaryLight},
  listItemName:{fontSize:15,fontWeight:'500',color:C.tx},
  listItemNameCkd:{color:C.tx3,textDecorationLine:'line-through'},
  priceTag:{fontSize:12,color:C.primaryLight,fontWeight:'600',marginTop:2},
  histLink:{fontSize:11,color:C.accent,fontWeight:'600',marginTop:2},
  qtyRow:{flexDirection:'row',alignItems:'center',gap:4},
  qtyBtn:{width:28,height:28,borderRadius:6,backgroundColor:C.surfaceAlt,borderWidth:1,borderColor:C.border,alignItems:'center',justifyContent:'center'},
  qtyBtnTx:{fontSize:16,fontWeight:'700',color:C.tx,lineHeight:20},
  qtyNum:{minWidth:22,textAlign:'center',fontSize:15,fontWeight:'700',color:C.tx},
  fab:{position:'absolute',right:S.xl,bottom:S.xl,backgroundColor:C.primary,borderRadius:R.full,paddingHorizontal:S.xl,paddingVertical:S.md,elevation:8,shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  fabTx:{color:C.white,fontSize:15,fontWeight:'700'},
  // Frequent
  freqHdr:{backgroundColor:C.primary,paddingHorizontal:S.xl,paddingTop:S.lg,paddingBottom:S.xl},
  freqCard:{flexDirection:'row',alignItems:'center',gap:S.md,backgroundColor:C.surface,borderRadius:R.md,padding:S.md,elevation:1},
  freqEmojiBox:{width:44,height:44,borderRadius:R.md,alignItems:'center',justifyContent:'center'},
  freqName:{fontSize:15,fontWeight:'600',color:C.tx},
  freqCat:{fontSize:11,fontWeight:'500',marginTop:2},
  usageBadge:{backgroundColor:C.surfaceAlt,borderRadius:R.full,paddingHorizontal:8,paddingVertical:2},
  usageTx:{fontSize:11,color:C.tx3,fontWeight:'500'},
  freqAddBtn:{width:36,height:36,borderRadius:R.full,backgroundColor:C.primaryPale,borderWidth:2,borderColor:C.primarySoft,alignItems:'center',justifyContent:'center'},
  freqAddBtnTx:{fontSize:20,color:C.primary,fontWeight:'700',lineHeight:24},
  // Empty
  emptyWrap:{flex:1,alignItems:'center',justifyContent:'center',padding:S.xxxl},
  emptyEmoji:{fontSize:64,marginBottom:S.lg},
  emptyTitle:{fontSize:20,fontWeight:'700',color:C.tx,textAlign:'center',marginBottom:S.sm},
  emptySub:{fontSize:14,color:C.tx2,textAlign:'center',lineHeight:22},
  emptyBtn:{backgroundColor:C.primary,borderRadius:R.full,paddingHorizontal:S.xxl,paddingVertical:S.md},
  emptyBtnTx:{color:C.white,fontWeight:'700',fontSize:14},
  // Large qty picker styles
  qtyLargeBtn:{width:52,height:52,borderRadius:R.full,backgroundColor:C.primaryPale,borderWidth:2,borderColor:C.primarySoft,alignItems:'center',justifyContent:'center'},
  qtyLargeTx:{fontSize:28,color:C.primary,fontWeight:'700',lineHeight:34},
  qtyLargeNum:{fontSize:42,fontWeight:'800',color:C.primary,minWidth:64,textAlign:'center'},
  // Offer styles
  offerRow:{flexDirection:'row',alignItems:'center',gap:S.md,marginBottom:S.lg,paddingVertical:S.sm},
  offerCheckbox:{width:24,height:24,borderRadius:6,borderWidth:2,borderColor:C.primaryLight,backgroundColor:C.surface,alignItems:'center',justifyContent:'center'},
  offerCheckboxOn:{backgroundColor:C.primaryLight,borderColor:C.primaryLight},
  offerLabel:{fontSize:15,fontWeight:'600',color:C.tx},
  offerBox:{backgroundColor:C.primaryPale,borderRadius:R.md,padding:S.md,marginBottom:S.lg},
  offerTypeRow:{flexDirection:'row',gap:S.sm,marginBottom:S.md},
  offerTypeBtn:{flex:1,paddingVertical:S.sm,borderRadius:R.md,alignItems:'center',backgroundColor:C.surface,borderWidth:1.5,borderColor:C.border},
  offerTypeBtnOn:{backgroundColor:C.primary,borderColor:C.primary},
  offerTypeTx:{fontSize:13,fontWeight:'600',color:C.tx2},
  offerTypeTxOn:{color:C.white},
  offerPreview:{flexDirection:'row',alignItems:'center',gap:S.sm,backgroundColor:C.surface,borderRadius:R.sm,padding:S.md,marginTop:S.sm},
  offerPreviewLabel:{fontSize:12,color:C.tx2,fontWeight:'500'},
  offerPreviewOrig:{fontSize:14,color:C.tx3,textDecorationLine:'line-through',fontWeight:'600'},
  offerPreviewArrow:{fontSize:16,color:C.tx3},
  offerPreviewFinal:{fontSize:16,color:C.success,fontWeight:'800'},
  // New category modal styles
  addCatBtn:{backgroundColor:C.primaryPale,borderRadius:R.full,paddingHorizontal:S.md,paddingVertical:6,borderWidth:1.5,borderColor:C.primarySoft},
  addCatBtnTx:{fontSize:13,fontWeight:'700',color:C.primary},
  emojiGrid:{flexDirection:'row',flexWrap:'wrap',gap:S.sm,marginBottom:S.lg},
  emojiBtn:{width:48,height:48,borderRadius:R.md,backgroundColor:C.surfaceAlt,alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:C.border},
  emojiBtnOn:{backgroundColor:C.primaryPale,borderColor:C.primary,borderWidth:2},
  // History tab styles
  historyProductRow:{flexDirection:'row',alignItems:'center',backgroundColor:C.surface,paddingHorizontal:S.lg,paddingVertical:S.md,borderBottomWidth:1,borderBottomColor:C.borderLight},
  historyProductName:{fontSize:15,fontWeight:'600',color:C.tx,marginBottom:2},
  historyProductSub:{fontSize:11,color:C.tx3,fontWeight:'400'},
  historyProductPrice:{fontSize:16,fontWeight:'800',color:C.primary},
  historyCheapest:{fontSize:10,color:C.success,fontWeight:'600'},
  // Tab bar
  tabBar:{height:72,backgroundColor:C.surface,borderTopWidth:1,borderTopColor:C.border,flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingBottom:8,paddingTop:8,elevation:8},
  tabItem:{alignItems:'center',justifyContent:'center',paddingHorizontal:S.lg,paddingVertical:S.xs,borderRadius:R.md,minWidth:64},
  tabItemOn:{backgroundColor:C.primaryPale},
  tabLabel:{fontSize:10,fontWeight:'500',color:C.tx3},
  tabLabelOn:{color:C.primary,fontWeight:'700'},
  tabBadge:{position:'absolute',top:-4,right:-8,backgroundColor:C.accent,borderRadius:R.full,minWidth:16,height:16,alignItems:'center',justifyContent:'center',paddingHorizontal:3,borderWidth:1.5,borderColor:C.surface},
  tabBadgeTx:{color:C.white,fontSize:9,fontWeight:'800'},
});
