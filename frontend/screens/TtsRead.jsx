// screens/TtsRead.jsx
import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Image, ImageBackground, TouchableOpacity, Platform, Animated, Easing } from "react-native";
import * as Speech from "expo-speech";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGlobalLang } from "../components/GlobalLang";

const LOCALE = { ko: "ko-KR", en: "en-US", ja: "ja-JP" };

/** 로고 위치 미세조정: 음수면 위로, 양수면 아래로 */
const LOGO_SHIFT = -8;

/** 더 느리고 낮은 할머니 톤 */
function grandmaTone(lg) {
  if (Platform.OS === "ios") {
    if (lg === "en") return { rate: 0.30, pitch: 0.45 };
    if (lg === "ja") return { rate: 0.28, pitch: 0.45 };
    return { rate: 0.26, pitch: 0.45 }; // ko
  } else {
    if (lg === "en") return { rate: 0.50, pitch: 0.45 };
    if (lg === "ja") return { rate: 0.48, pitch: 0.45 };
    return { rate: 0.46, pitch: 0.45 }; // ko
  }
}

function pickVoice(voices, targetLocale) {
  if (!Array.isArray(voices) || !voices.length) return null;
  const langPrefix = String(targetLocale).slice(0, 2).toLowerCase();
  let cand = voices.filter(v => String(v.language).toLowerCase() === targetLocale.toLowerCase());
  if (!cand.length) cand = voices.filter(v => String(v.language).toLowerCase().startsWith(langPrefix));
  if (!cand.length) cand = voices.filter(v => /ko|kor|korean|ja|jpn|japanese|en|eng|english/i.test(`${v.language} ${v.name}`));
  const hinted = cand.find(v => /female|woman|grand|old|grandma|ajumma|할머니/i.test(`${v.name} ${v.identifier}`));
  return hinted || cand[0] || null;
}

export default function TtsRead({ route }) {
  // 조리 과정만 읽음
  const steps = route?.params?.steps ?? route?.params?.lines ?? [];
  const { ttsLang } = route?.params || {};
  const { lang: uiLang, footerH = 0 } = useGlobalLang();
  const speakLang = ttsLang || uiLang;
  const speakLocale = LOCALE[speakLang] || LOCALE.ko;

  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const voicesRef = useRef([]);

  // ── Progress bar state (px width 애니메이션)
  const [trackW, setTrackW] = useState(0);
  const fillW = useRef(new Animated.Value(0)).current;

  const animateProgress = (index) => {
    if (!trackW || !steps.length) return;
    const pct = (index + 1) / steps.length; // 1부터 표시
    Animated.timing(fillW, {
      toValue: trackW * pct,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  const speakLine = async (i = idx) => {
    const text = String(steps[i] ?? "").trim();
    if (!text) return;
    try { await Speech.stop(); } catch {}
    const voice = pickVoice(voicesRef.current, speakLocale);
    const { rate, pitch } = grandmaTone(speakLang);
    Speech.speak(text, { language: speakLocale, voice: voice?.identifier, rate, pitch });
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const v = await Speech.getAvailableVoicesAsync();
        if (mounted) voicesRef.current = Array.isArray(v) ? v : [];
      } catch {}
      speakLine(0);
    })();
    return () => { mounted = false; Speech.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // idx/트랙폭/총 스텝 변할 때 진행바 업데이트
  useEffect(() => {
    animateProgress(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, trackW, steps.length]);

  const goPrev   = () => { const i = Math.max(0, idx - 1); setIdx(i); setTimeout(() => speakLine(i), 0); };
  const goRepeat = () => speakLine(idx);
  const goNext   = () => { const i = Math.min((steps.length - 1), idx + 1); setIdx(i); setTimeout(() => speakLine(i), 0); };

  // 푸터에 가리지 않도록 아래 여백 확보
  const bottomOffset = Math.max(64, footerH + insets.bottom + 24);

  return (
    <ImageBackground
      source={require("../assets/bg.png")}
      style={[styles.bg, { paddingTop: insets.top + 16 }]}
      imageStyle={styles.bgImg}
    >
      {/* 로고 */}
      <View style={styles.hero}>
        <Image source={require("../assets/icons/logo.png")} style={styles.logo} />

        {/* 진행 바 (로고 아래) */}
        <View
          style={styles.progressTrack}
          onLayout={e => setTrackW(e.nativeEvent.layout.width)}
        >
          <Animated.View style={[styles.progressFill, { width: fillW }]} />
        </View>
      </View>

      {/* 아이콘 컨트롤 (배경/테두리 없음) */}
      <View style={[styles.controlsWrap, { bottom: bottomOffset }]} pointerEvents="box-none">
        <View style={styles.controls}>
          <TouchableOpacity onPress={goPrev}  hitSlop={{ top:12,bottom:12,left:16,right:16 }}>
            <Image source={require("../assets/icons/last.png")}  style={styles.iconImg} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goRepeat} hitSlop={{ top:12,bottom:12,left:16,right:16 }}>
            <Image source={require("../assets/icons/retry.png")} style={styles.iconImg} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goNext}  hitSlop={{ top:12,bottom:12,left:16,right:16 }}>
            <Image source={require("../assets/icons/next.png")}  style={styles.iconImg} />
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: "center" },
  bgImg: { opacity: 1 },

  hero: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    alignSelf: "stretch",
    paddingTop: 24,
    transform: [{ translateY: LOGO_SHIFT }],
  },
  logo: { width: 420, height: 420, resizeMode: "contain", alignSelf: "center" },

  // 진행 바 스타일 (멜로 느낌: 얇고 둥글고 흰 트랙/검정 채움)
  progressTrack: {
    width: "70%",
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.75)",
    overflow: "hidden",
    marginTop: 6,          // 로고와 간격
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#111",
    borderRadius: 999,
  },

  controlsWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  controls: { flexDirection: "row", gap: 24 },
  iconImg: { width: 44, height: 44, resizeMode: "contain" },
});
