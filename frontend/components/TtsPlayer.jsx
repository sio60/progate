// components/TtsPlayer.jsx
import React, { useEffect, useMemo, useRef } from "react";
import { Platform } from "react-native";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import { useTtsSettings } from "./TtsSettingsContext";

/**
 * props:
 *  - lines: string[]            재생할 문장 배열
 *  - lang:  "ko" | "en" | "ja"  재생 억양
 *  - rate?, pitch?, voiceId?, auto?, onStart?, onDone?, onError?, debug?
 */
export default function TtsPlayer({
  lines = [],
  lang = "ko",
  rate,
  pitch,
  voiceId,
  onStart,
  onDone,
  onError,
  auto = true,
  debug = false,
}) {
  const { koVoiceId, enVoiceId, jaVoiceId } = useTtsSettings();
  const selectedVoiceId =
    voiceId ?? (lang === "ko" ? koVoiceId : lang === "ja" ? jaVoiceId : enVoiceId);

  // iOS 무음모드 우회
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
          interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        debug && console.warn("[TTS] setAudioMode error", e);
      }
    })();
  }, [debug]);

  const locale = useMemo(
    () => (lang === "ko" ? "ko-KR" : lang === "ja" ? "ja-JP" : "en-US"),
    [lang]
  );

  const defaults = useMemo(() => {
    const baseRateIOS = 0.5, baseRateAOS = 1.0;
    const byLangRate = {
      ko: Platform.OS === "ios" ? baseRateIOS : baseRateAOS,
      en: Platform.OS === "ios" ? baseRateIOS : baseRateAOS,
      ja: Platform.OS === "ios" ? baseRateIOS + 0.05 : baseRateAOS + 0.05,
    };
    const byLangPitch = { ko: 1.0, en: 1.0, ja: 1.05 };
    const r = Platform.OS === "ios"
      ? Math.min(1, Math.max(0, Number(rate ?? byLangRate[lang] ?? 0.5)))
      : Math.min(2, Math.max(0.5, Number(rate ?? byLangRate[lang] ?? 1.0)));
    const p = Math.min(2, Math.max(0.5, Number(pitch ?? byLangPitch[lang] ?? 1.0)));
    return { rate: r, pitch: p };
  }, [lang, rate, pitch]);

  const cancelRef = useRef({ cancelled: false });

  useEffect(() => {
    if (!auto || !lines?.length) return;
    cancelRef.current.cancelled = false;

    (async () => {
      try { await Speech.stop(); } catch {}
      onStart?.();

      for (const raw of lines) {
        if (cancelRef.current.cancelled) break;
        const text = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
        if (!text) continue;

        await speakOnce(text, {
          language: locale,
          ...(selectedVoiceId ? { voice: selectedVoiceId } : {}),
          rate: defaults.rate,
          pitch: defaults.pitch,
        }, debug);

        if (cancelRef.current.cancelled) break;
        await delay(60);
      }
      if (!cancelRef.current.cancelled) onDone?.();
    })().catch((e) => { onError?.(e); debug && console.warn("[TTS] loop error", e); });

    return () => { cancelRef.current.cancelled = true; Speech.stop(); };
  }, [auto, JSON.stringify(lines), locale, defaults.rate, defaults.pitch, selectedVoiceId, onStart, onDone, onError, debug]);

  return null;
}

function delay(ms){ return new Promise(res => setTimeout(res, ms)); }
function speakOnce(text, opts, debug){
  return new Promise((resolve) => {
    try {
      Speech.speak(text, {
        ...opts,
        onStart: () => { debug && console.log("[TTS] start:", opts.language, text.slice(0,30)); },
        onDone: resolve,
        onStopped: resolve,
        onError: () => resolve(),
      });
    } catch (e) {
      debug && console.warn("[TTS] speakOnce error", e);
      resolve();
    }
  });
}
