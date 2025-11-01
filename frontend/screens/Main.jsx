import React, { useMemo, useState } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { useGlobalLang } from '../components/GlobalLang';

const { width, height } = Dimensions.get('window');
const { width: W } = Dimensions.get('window');

const languageText = {
  ko: '레시피 받기',
  en: 'Get Recipe',
  ja: 'レシピをもらう',
};

const fontMap = {
  ko: 'Unheo',
  en: 'Brush',
  ja: 'Tegomin',
};

/** 언어별 버튼 프리셋(기준 화면폭 390px에서의 기준값) */
const BUTTON_PRESETS = {
  ko: { fontSize: 40, padH: 36, padV: 12, radius: 12, minWFrac: 0.62, charW: 0.58 },
  en: { fontSize: 36, padH: 30, padV: 12, radius: 12, minWFrac: 0.50, charW: 0.55 },
  ja: { fontSize: 25, padH: 28, padV: 12, radius: 12, minWFrac: 0.66, charW: 0.62 },
};
const BASE_W = 390;

/** 현재 언어에 맞춰 버튼 크기/폰트 크기 동적으로 계산 */
function useButtonSizing(lang, label) {
  const preset = BUTTON_PRESETS[lang] ?? BUTTON_PRESETS.ko;
  // 화면 폭에 따라 부드럽게 스케일 (과도 축소/확대 방지)
  const scale = Math.min(1.15, Math.max(0.85, W / BASE_W));

  // 텍스트 길이에 따른 최소 폭 보정 (아주 러프한 문자폭 추정)
  const approxLabelW = (label?.length ?? 0) * preset.fontSize * preset.charW * scale;
  const minWidthByText = approxLabelW + 2 * preset.padH * scale;
  const minWidth = Math.max(W * preset.minWFrac, minWidthByText);

  return {
    buttonStyle: {
      paddingVertical: Math.round(preset.padV * scale),
      paddingHorizontal: Math.round(preset.padH * scale),
      borderRadius: Math.round(preset.radius * scale),
      minWidth: Math.round(minWidth),
      alignItems: 'center',
    },
    textStyle: {
      fontSize: Math.round(preset.fontSize * scale),
    },
  };
}

export default function Main({ navigation }) {
  const { lang, setLang } = useGlobalLang();
  const [modalVisible, setModalVisible] = useState(false);

  const label = languageText[lang];
  const fontFamily = fontMap[lang];

  const { buttonStyle, textStyle } = useButtonSizing(lang, label);

  const handleStart = () => {
    navigation.navigate('Home');
  };

  const changeLanguage = (selected) => {
    setLang(selected);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/slide/slide3.png')} style={styles.background} blurRadius={2} />

      <TouchableOpacity style={styles.settingBtn} onPress={() => setModalVisible(true)}>
        <Image source={require('../assets/icons/setting.png')} style={{ width: 24, height: 24 }} />
      </TouchableOpacity>

      <View style={styles.center}>
        <Image source={require('../assets/icons/main.png')} style={styles.logo} />
        <TouchableOpacity style={[styles.buttonBase, buttonStyle]} onPress={handleStart}>
          <Text style={[styles.buttonTextBase, textStyle, { fontFamily }]}>{label}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <TouchableOpacity onPress={() => changeLanguage('ko')}>
              <Text style={[styles.modalOption, { fontFamily: 'Unheo' }]}>한국어</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeLanguage('en')}>
              <Text style={[styles.modalOption, { fontFamily: 'Brush' }]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeLanguage('ja')}>
              <Text style={[styles.modalOption, { fontFamily: 'Tegomin' }]}>日本語</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  background: { width, height, position: 'absolute', resizeMode: 'cover' },
  settingBtn: { position: 'absolute', top: 60, right: 24, zIndex: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  logo: { width: W * 1, height: W * 0.9, resizeMode: 'contain', marginBottom: 40 },

  /** 고정 베이스 + 언어/화면폭에 따른 동적 오버레이 */
  buttonBase: {
    backgroundColor: 'transparent', // 디자인에 맞게 필요시 변경
    // 그림자/테두리 넣고 싶으면 여기 추가
  },
  buttonTextBase: { color: '#4b371f' },

  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#fff', padding: 24, borderRadius: 16, width: '80%', alignItems: 'center' },
  modalTitle: { fontSize: 18, marginBottom: 16 },
  modalOption: { fontSize: 16, marginVertical: 8, color: '#333' },
});
