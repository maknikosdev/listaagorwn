// src/components/LanguageToggle.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';

export default function LanguageToggle({ style }) {
  const { lang, toggleLang } = useLanguage();
  return (
    <TouchableOpacity style={[styles.btn, style]} onPress={toggleLang}>
      <Text style={styles.txt}>{lang === 'el' ? '🇬🇷 EL' : '🇬🇧 EN'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txt: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
