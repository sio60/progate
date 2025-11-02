// screens/TtsDiag.jsx
import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, TextInput } from "react-native";
import * as Speech from "expo-speech";
import { useTtsSettings } from "../components/TtsSettingsContext";

function VoiceSelect({ label, items, value, onChange, sampleText }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>{label}</Text>
      <TouchableOpacity style={styles.selBox} onPress={() => setOpen(v=>!v)}>
        <Text style={{ color: "#111" }}>
          {items.find(v => v.identifier === value)?.name || "Select a voice"}
        </Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.selList}>
          <ScrollView>
            {items.map(v => (
              <TouchableOpacity key={v.identifier} style={styles.selItem} onPress={() => { onChange(v.identifier); setOpen(false); }}>
                <Text style={{ color:"#111" }}>
                  {v.name} <Text style={{ color:"#999" }}>({v.language}{v.quality?` · ${v.quality}`:""})</Text>
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <TouchableOpacity style={styles.btn} onPress={() => {
          const voice = items.find(v => v.identifier === value);
          const language = voice?.language || (label.includes("KO") ? "ko-KR" : label.includes("JA") ? "ja-JP" : "en-US");
          Speech.speak(sampleText, { language, ...(voice ? { voice: voice.identifier } : {}), rate: Platform.OS === "ios" ? 0.5 : 1.0, pitch: 1.0 });
        }}>
          <Text style={styles.bt}>Test</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor:"#f1f1f1" }]} onPress={() => Speech.stop()}>
          <Text style={[styles.bt, { color:"#333" }]}>Stop</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TtsDiag(){
  const [voices, setVoices] = useState([]);
  const [filter, setFilter] = useState("");
  const { koVoiceId, enVoiceId, jaVoiceId, setKoVoiceId, setEnVoiceId, setJaVoiceId } = useTtsSettings();

  useEffect(() => { (async () => {
    try { const v = await Speech.getAvailableVoicesAsync(); setVoices(Array.isArray(v)?v:[]); } catch {}
  })(); }, []);

  const by = useCallback((prefix) => {
    const p = prefix.toLowerCase();
    return voices.filter(v => (v.language||"").toLowerCase().startsWith(p) || (v.language||"").toLowerCase().slice(0,2) === p.slice(0,2));
  }, [voices]);

  const filt = (arr) => {
    if (!filter.trim()) return arr;
    const f = filter.toLowerCase();
    return arr.filter(v =>
      (v.name || "").toLowerCase().includes(f) ||
      (v.language || "").toLowerCase().includes(f) ||
      (v.identifier || "").toLowerCase().includes(f)
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>TTS 음성 선택</Text>

      <VoiceSelect
        label="KO (한국어)"
        items={by("ko")}
        value={koVoiceId}
        onChange={setKoVoiceId}
        sampleText="안녕하세요. 한국어 테스트입니다."
      />
      <VoiceSelect
        label="EN (English)"
        items={by("en")}
        value={enVoiceId}
        onChange={setEnVoiceId}
        sampleText="Hello, this is an English test."
      />
      <VoiceSelect
        label="JA (日本語)"
        items={by("ja")}
        value={jaVoiceId}
        onChange={setJaVoiceId}
        sampleText="こんにちは。日本語テストです。"
      />

      <Text style={[styles.h1, { marginTop: 16 }]}>All Voices on Device</Text>
      <TextInput
        value={filter}
        onChangeText={setFilter}
        placeholder="Filter by name / language / id"
        style={styles.input}
        placeholderTextColor="#999"
      />

      <View style={{ borderWidth:1, borderColor:"#eee", borderRadius:8, maxHeight: 300 }}>
        <ScrollView>
          {filt(voices).map(v => (
            <View key={v.identifier} style={{ padding:10, borderBottomWidth:1, borderBottomColor:"#f7f7f7" }}>
              <Text style={{ color:"#111" }}>
                {v.name} <Text style={{ color:"#999" }}>({v.language}{v.quality?` · ${v.quality}`:""})</Text>
              </Text>
              <View style={{ flexDirection:"row", gap:8, marginTop:6, flexWrap:"wrap" }}>
                <TouchableOpacity
                  style={{ paddingHorizontal:10, paddingVertical:6, borderRadius:8, backgroundColor:"#111" }}
                  onPress={() => Speech.speak("Sample voice test.", { language: v.language || "en-US", voice: v.identifier, rate: Platform.OS === "ios" ? 0.5 : 1.0, pitch: 1.0 })}
                >
                  <Text style={{ color:"#fff" }}>Test</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tagBtn} onPress={() => setKoVoiceId(v.identifier)}>
                  <Text style={styles.tagTxt}>Set KO</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tagBtn, { backgroundColor:"#cdeffd" }]} onPress={() => setEnVoiceId(v.identifier)}>
                  <Text style={styles.tagTxtDark}>Set EN</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tagBtn, { backgroundColor:"#f0defd" }]} onPress={() => setJaVoiceId(v.identifier)}>
                  <Text style={styles.tagTxtDark}>Set JA</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16 },
  h1: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  selBox: { borderWidth:1, borderColor:"#ddd", borderRadius:8, padding:10 },
  selList: { borderWidth:1, borderColor:"#eee", borderRadius:8, marginTop:6, maxHeight:180 },
  selItem: { padding:10, borderBottomWidth:1, borderBottomColor:"#f7f7f7" },
  btn: { backgroundColor:"#111", paddingHorizontal:14, paddingVertical:10, borderRadius:10 },
  bt: { color:"#fff" },
  input: { borderWidth:1, borderColor:"#ddd", borderRadius:8, paddingHorizontal:12, height:42, marginBottom:8, color:"#111" },
  tagBtn: { paddingHorizontal:10, paddingVertical:6, borderRadius:8, backgroundColor:"#ffe98a" },
  tagTxt: { color:"#222" },
  tagTxtDark: { color:"#222" },
});
