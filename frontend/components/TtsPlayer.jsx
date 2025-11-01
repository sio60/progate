import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { useGlobalLang } from './GlobalLang';

const uiText = {
  ko: { next: '다음', repeat: '다시 듣기', done: '끝', playing: '읽는 중…' },
  en: { next: 'Next', repeat: 'Repeat', done: 'Done', playing: 'Speaking…' },
  ja: { next: '次へ', repeat: 'もう一度', done: '終了', playing: '読み上げ中…' },
};

const LOCALE = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP' };

export default function TtsPlayer({ lines = [] }) {
  const { lang, font } = useGlobalLang();
  const t = useMemo(() => uiText[lang] || uiText.ko, [lang]);
  const [idx, setIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const current = lines[idx] ?? '';
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    speak(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, lang]);

  async function pickVoice() {
    const voices = await Speech.getAvailableVoicesAsync();
    const v = voices?.find(v => v.language?.startsWith(LOCALE[lang]));
    return v?.identifier;
  }

  async function speak(text) {
    setSpeaking(true);
    Speech.stop();
    const voice = await pickVoice();
    await Speech.speak(text, {
      language: LOCALE[lang],
      voice,
      rate: 0.86,
      pitch: 0.82,
      onDone: () => mounted.current && setSpeaking(false),
      onStopped: () => mounted.current && setSpeaking(false),
      onError: () => mounted.current && setSpeaking(false),
    });
  }

  const onNext = () => {
    Speech.stop();
    if (idx < lines.length - 1) setIdx(i => i + 1);
  };

  const onRepeat = () => {
    speak(current);
  };

  const atEnd = idx >= lines.length - 1;

  return (
    <View style={styles.wrap}>
      <View style={styles.center}>
        <Image source={require('../assets/icons/logo.png')} style={styles.logo} />
      </View>

      <View style={styles.bottom}>
        <Text style={[styles.line, { fontFamily: font }]} numberOfLines={3}>
          {current}
        </Text>

        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, styles.subBtn]} onPress={onRepeat}>
            <Text style={[styles.btnText, { fontFamily: font }]}>{t.repeat}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, atEnd ? styles.endBtn : styles.nextBtn]}
            onPress={onNext}
            disabled={atEnd}
          >
            <Text style={[styles.btnText, { fontFamily: font }]}>{atEnd ? t.done : t.next}</Text>
          </TouchableOpacity>
        </View>

        {speaking ? (
          <Text style={[styles.hint, { fontFamily: font }]}>{t.playing}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 180, height: 180, resizeMode: 'contain' },
  bottom: { paddingHorizontal: 20, paddingBottom: 28 },
  line: { fontSize: 18, color: '#111', textAlign: 'center', minHeight: 56 },
  row: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 14 },
  btn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
  subBtn: { backgroundColor: '#eee' },
  nextBtn: { backgroundColor: '#111' },
  endBtn: { backgroundColor: '#888' },
  btnText: { color: '#fff', fontSize: 16 },
  hint: { textAlign: 'center', marginTop: 8, color: '#666', fontSize: 12 },
});
