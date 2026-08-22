import React, { useState, useRef, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { extractPriceFromImage } from '../utils/priceOCR';
import { C, S, R } from '../theme/index';
import { useLanguage } from '../i18n/LanguageContext';

export default function CameraModal({ visible, onClose, onCapture, mode = 'price' }) {
  const { t } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState('');
  const cameraRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setLoading(false);
      const hints = {
        price: t('camHintPrice'),
        discount: t('camHintDiscount'),
        weight_label: t('camHintWeightLabel'),
        weight_receipt: t('camHintWeightReceipt'),
      };
      setHint(hints[mode] || t('camHintDefault'));
    }
  }, [visible, mode]);

  const handleCapture = async () => {
    if (!cameraRef.current || loading) return;
    setLoading(true);
    setHint(t('camAnalyzing'));

    try {
      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        skipProcessing: true,
      });

      // Resize to reduce API payload — max 800px wide
      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      // Extract price via Claude Vision
      const result = await extractPriceFromImage(manipulated.base64, mode);

      // Delete temp files — we only keep the extracted number
      // (expo-image-manipulator saves to cache, which is auto-cleaned by OS)

      if (result) {
        onCapture(result);
        onClose();
      } else {
        setHint(t('camNoPriceFound'));
        setLoading(false);
      }
    } catch (e) {
      console.error('Camera capture error:', e);
      setHint(t('camError'));
      setLoading(false);
    }
  };

  if (!visible) return null;

  // Permission not granted yet
  if (!permission) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={st.container}>
          <ActivityIndicator color={C.white} size="large" />
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={st.container}>
          <Text style={st.permText}>{t('camPermissionNeeded')}</Text>
          <TouchableOpacity style={st.permBtn} onPress={requestPermission}>
            <Text style={st.permBtnTx}>{t('camGivePermission')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.closeBtn} onPress={onClose}>
            <Text style={st.closeBtnTx}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={st.container}>
        <CameraView ref={cameraRef} style={st.camera} facing="back">
          {/* Header */}
          <View style={st.header}>
            <TouchableOpacity onPress={onClose} style={st.closeBtn}>
              <Text style={st.closeBtnTx}>{t('camCloseX')}</Text>
            </TouchableOpacity>
            <Text style={st.headerTitle}>
              {mode === 'price' ? t('camTitlePrice')
            : mode === 'discount' ? t('camTitleDiscount')
            : mode === 'weight_label' ? t('camTitleWeightLabel')
            : t('camTitleWeightReceipt')}
            </Text>
          </View>

          {/* Targeting frame */}
          <View style={st.frameWrap}>
            <View style={st.frame}>
              <View style={[st.corner, st.tl]} />
              <View style={[st.corner, st.tr]} />
              <View style={[st.corner, st.bl]} />
              <View style={[st.corner, st.br]} />
            </View>
          </View>

          {/* Bottom controls */}
          <View style={st.bottom}>
            <Text style={st.hint}>{hint}</Text>
            {loading ? (
              <View style={st.loadingWrap}>
                <ActivityIndicator color={C.white} size="large" />
                <Text style={st.loadingTx}>{t('camRecognizing')}</Text>
              </View>
            ) : (
              <TouchableOpacity style={st.captureBtn} onPress={handleCapture}>
                <View style={st.captureBtnInner} />
              </TouchableOpacity>
            )}
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center',
  },
  camera: { flex: 1, width: '100%' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingHorizontal: S.xl,
    paddingBottom: S.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    gap: S.md,
  },
  closeBtn: {
    paddingHorizontal: S.md, paddingVertical: S.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: R.full,
  },
  closeBtnTx: { color: '#fff', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  frameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 280, height: 140,
    position: 'relative',
  },
  corner: {
    position: 'absolute', width: 28, height: 28,
    borderColor: '#fff', borderWidth: 3,
  },
  tl: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  tr: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  bl: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  br: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  bottom: {
    paddingBottom: Platform.OS === 'android' ? 48 : 60,
    paddingTop: S.xl,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    gap: S.lg,
  },
  hint: { color: '#fff', fontSize: 14, fontWeight: '500', textAlign: 'center', paddingHorizontal: S.xl },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 3, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtnInner: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#fff',
  },
  loadingWrap: { alignItems: 'center', gap: S.md },
  loadingTx: { color: '#fff', fontSize: 14, fontWeight: '600' },
  permText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: S.xl, paddingHorizontal: S.xl },
  permBtn: {
    backgroundColor: C.primary, borderRadius: R.full,
    paddingHorizontal: S.xxl, paddingVertical: S.md, marginBottom: S.md,
  },
  permBtnTx: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
