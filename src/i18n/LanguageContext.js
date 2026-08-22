// src/i18n/LanguageContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from './translations';
import { CATEGORY_TR_EN, PRODUCT_TR_EN } from './catalogTranslations';

const LANG_KEY = '@smlist_lang';
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('el');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANG_KEY);
        if (saved === 'el' || saved === 'en') setLang(saved);
      } catch (_) {}
      setReady(true);
    })();
  }, []);

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'el' ? 'en' : 'el';
      AsyncStorage.setItem(LANG_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  // UI chrome (buttons, titles, messages)
  const t = useCallback((key) => {
    return (translations[lang] && translations[lang][key]) || translations.el[key] || key;
  }, [lang]);

  // Display-only translation for DEFAULT products. `name` is always the
  // canonical Greek string (used as storage/matching key everywhere else).
  // User-added products are never in PRODUCT_TR_EN, so they pass through
  // unchanged automatically.
  const td = useCallback((name) => {
    if (lang !== 'en' || !name) return name;
    return PRODUCT_TR_EN[name] || name;
  }, [lang]);

  // Display-only translation for DEFAULT categories, keyed by stable catId
  // (not by text, so renames/overrides never break the lookup).
  // `fallbackName` is returned as-is for custom (user-created) categories
  // or renamed categories, since those aren't in CATEGORY_TR_EN.
  const tc = useCallback((catId, fallbackName) => {
    if (lang !== 'en') return fallbackName;
    return CATEGORY_TR_EN[catId] || fallbackName;
  }, [lang]);

  if (!ready) return null; // ή ένα splash/loader

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t, td, tc }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage πρέπει να καλείται μέσα σε LanguageProvider');
  return ctx;
}
