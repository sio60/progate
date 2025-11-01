import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { useGlobalLang } from './GlobalLang';

const uiText = {
  ko: { start: '시작', next: '다음', repeat: '다시 듣기', done: '끝', playing: '읽는 중…', voice: '보이스', noVoice: '해당 언어 보이스가 없습니다. 기기 TTS에서 언어 음성 데이터를 설치하세요.' },
  en: { start: 'Start', next: 'Next', repeat: 'Repeat', done: 'Done', playing: 'Speaking…', voice: 'Voice', noVoice: 'No voice available. Install the language voice in device TTS settings.' },
  ja: { start: '開始', next: '次へ', repeat: 'もう一度', done: '終了', playing: '読み上げ中…', voice: 'ボイス', noVoice: 'この言語の音声が見つかりません。端末のTTS設定で音声データをインストールしてください。' },
};

const LOCALE = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP' };
const RATE  = { ko: 0.52, en: 0.54, ja: 0.52 };
const PITCH = { ko: 0.5,  en: 0.5,  ja: 0.5 }; // Android 안전 하한

function normalizeLang(code) {
  if (!code) return 'ko';
  const lc = code.toLowerCase();
  if (lc === 'jp') return 'ja';
  if (lc.startsWith('ja')) return 'ja';
  if (lc.startsWith('ko')) return 'ko';
  if (lc.startsWith('en')) return 'en';
  return lc;
}

function filterLangVoices(all, lang) {
  if (!Array.isArray(all)) return [];
  const keysMap = {
    ja: ['ja', 'ja-jp', 'japanese', 'nihon', '日本', '日本語'],
    ko: ['ko', 'ko-kr', 'korean', '한국', '한국어'],
    en: ['en', 'en-us', 'en-gb', 'english'],
  };
  const keys = keysMap[lang] ?? [lang];
  const list = all.filter(v => {
    const L = (v.language || '').toLowerCase();
    const N = (v.name || '').toLowerCase();
    return keys.some(k => L.includes(k) || N.includes(k));
  });
  const prefer = ['neural','grand','older','female','woman','girl','std','standard'];
  return list.sort((a, b) => {
    const an = (a.name || '').toLowerCase();
    const bn = (b.name || '').toLowerCase();
    const as = prefer.some(p => an.includes(p)) ? 1 : 0;
    const bs = prefer.some(p => bn.includes(p)) ? 1 : 0;
    return bs - as;
  });
}

async function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

export default function TtsPlayer({ lines = [] }) {
  const { lang: rawLang, font } = useGlobalLang();
  const lang = normalizeLang(rawLang);
  const t = useMemo(() => uiText[lang] || uiText.ko, [lang]);

  const [idx, setIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [started, setStarted] = useState(false);
  const [voices, setVoices] = useState([]);
  const [voiceIdx, setVoiceIdx] = useState(0);
  const [err, setErr] = useState('');

  const current = lines[idx] ?? '';
  const mounted = useRef(true);

  // iOS 무음모드에서도 재생
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch {}
    })();
  }, []);

  // 보이스 로드
  useEffect(() => {
    mounted.current = true;
    (async () => {
      try {
        const v = await Speech.getAvailableVoicesAsync();
        setVoices(Array.isArray(v) ? v : []);
      } catch {
        setVoices([]);
      }
    })();
    return () => { mounted.current = false; try { Speech.stop(); } catch {} };
  }, []);

  // 언어 바뀌면 처음 줄부터
  useEffect(() => { if (started) setIdx(0); }, [lang, started]);

  // 줄/언어/보이스 바뀌면 읽기
  useEffect(() => {
    if (!started || !current) return;
    speak(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, lang, started, voiceIdx]);

  const candVoices = useMemo(() => filterLangVoices(voices, lang), [voices, lang]);

  async function trySpeak(text, opts, needDetect=true){
    try { Speech.stop(); } catch {}
    await wait(20);
    setErr('');
    setSpeaking(true);
    const base = {
      rate:  RATE[lang] ?? 0.54,
      pitch: PITCH[lang] ?? 0.5,
      volume: 1.0,
      onDone:    () => mounted.current && setSpeaking(false),
      onStopped: () => mounted.current && setSpeaking(false),
      onError:   () => { mounted.current && setSpeaking(false); setErr(t.noVoice); },
    };
    const short = (text?.trim()?.length || 0) <= 3;
    const say = short ? `${text}。` : text; // 초단문 길이 확보

    Speech.speak(say, { ...base, ...opts });

    if (!needDetect || short) return true; // 초단문은 감지 안 함(바로 끝나서 실패로 오인 방지)

    // 재생 시작 감지 (최대 1.2초 + 글자수 보정)
    const deadline = Date.now() + Math.max(1200, say.length * 40);
    while (Date.now() < deadline) {
      const s = await Speech.isSpeakingAsync().catch(() => false);
      if (s) return true;
      await wait(60);
    }
    try { Speech.stop(); } catch {}
    return false;
  }

  async function speak(text) {
    // 시도 순서: 1) 기본(옵션 없음) → 2) 언어만 → 3) 보이스만
    if (await trySpeak(text, {}, true)) return;
    if (await trySpeak(text, { language: LOCALE[lang] || 'ko-KR' }, true)) return;

    const v = candVoices.length ? candVoices[voiceIdx % candVoices.length] : null;
    if (v && await trySpeak(text, { voice: v.identifier }, true)) return;

    setErr(t.noVoice);
    setSpeaking(false);
  }

  const onStart  = () => { setStarted(true); setIdx(0); };
  const onNext   = () => { try { Speech.stop(); } catch {} if (idx < lines.length - 1) setIdx(i => i + 1); };
  const onRepeat = () => { if (current) speak(current); };
  const atEnd    = idx >= lines.length - 1;
  const onCycleVoice = () => setVoiceIdx(i => i + 1);

  const currentVoiceName = candVoices.length ? (candVoices[voiceIdx % candVoices.length]?.name || 'auto') : 'auto';

  return (
    <View style={styles.wrap}>
      <View style={styles.center}>
        <Image source={require('../assets/icons/logo.png')} style={styles.logo} />
        {!started && (
          <TouchableOpacity style={styles.startBtn} onPress={onStart}>
            <Text style={[styles.startText, { fontFamily: font }]}>{t.start}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bottom}>
        <Text style={[styles.line, { fontFamily: font }]} numberOfLines={4}>
          {started ? current : ''}
        </Text>

        {started && (
          <>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, styles.subBtn]} onPress={onRepeat}>
                <Text style={[styles.btnTextDark, { fontFamily: font }]}>{t.repeat}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, atEnd ? styles.endBtn : styles.nextBtn]}
                onPress={onNext}
                disabled={atEnd}
              >
                <Text style={[styles.btnText, { fontFamily: font }]}>{atEnd ? uiText[lang].done : uiText[lang].next}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.voiceChip} onLongPress={onCycleVoice}>
              <Text style={[styles.voiceText, { fontFamily: font }]}>{t.voice}: {currentVoiceName}</Text>
            </TouchableOpacity>
          </>
        )}

        {err ? <Text style={[styles.err, { fontFamily: font }]}>{err}</Text> : null}
        {started && speaking ? <Text style={[styles.hint, { fontFamily: font }]}>{t.playing}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 180, height: 180, resizeMode: 'contain' },
  startBtn: { marginTop: 18, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12, backgroundColor: '#111' },
  startText: { color: '#fff', fontSize: 18 },
  bottom: { paddingHorizontal: 20, paddingBottom: 28 },
  line: { fontSize: 18, color: '#111', textAlign: 'center', minHeight: 72 },
  row: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 14 },
  btn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
  subBtn: { backgroundColor: '#eee' },
  nextBtn: { backgroundColor: '#111' },
  endBtn: { backgroundColor: '#888' },
  btnText: { color: '#fff', fontSize: 16 },
  btnTextDark: { color: '#111', fontSize: 16 },
  voiceChip: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#f2f2f2' },
  voiceText: { color: '#333', fontSize: 13 },
  hint: { textAlign: 'center', marginTop: 8, color: '#666', fontSize: 12 },
  err: { textAlign: 'center', marginTop: 8, color: '#b00020', fontSize: 12 },
});
