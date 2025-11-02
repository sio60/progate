// App.js
import React, { useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  View, Modal, TouchableOpacity, Text, StyleSheet, Platform,
  ScrollView, TextInput, Pressable
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import Main from "./screens/Main";
import HomeScreen from "./screens/HomeScreen";
import RecipeScreen from "./screens/RecipeScreen";
import YoutubeSearch from "./screens/YoutubeSearch";
import RecipeSearch from "./screens/RecipeSearch";
import FooterNav from "./components/FooterNav";
import IngredientsSheet from "./components/IngredientsSheet";

import { GlobalLangProvider, useGlobalLang } from "./components/GlobalLang";

import * as Speech from "expo-speech";
import { TtsSettingsProvider, useTtsSettings } from "./components/TtsSettingsContext";

const Stack = createNativeStackNavigator();

const footerI18n = {
  ko: { langName: "한국어",  navIngredients: "재료 입력",       navSearch: "레시피 검색",   navBrowse: "한국 유행어", navSettings: "설정" },
  en: { langName: "English", navIngredients: "Add Ingredients", navSearch: "Search Recipes", navBrowse: "a Korean buzzword", navSettings: "Settings" },
  ja: { langName: "日本語",   navIngredients: "材料入力",         navSearch: "レシピ検索",     navBrowse: "韓国語の流行語", navSettings: "設定" },
};

const FONT_BY_LANG = { ko: "Unheo", en: "Brush", ja: "Tegomin" };

// ───────────────── Settings Modal ─────────────────
function SettingsModal({ visible, onClose, lang, setLang }) {
  const [voices, setVoices] = React.useState([]);
  const [filter, setFilter] = React.useState("");
  const { koVoiceId, enVoiceId, jaVoiceId, setKoVoiceId, setEnVoiceId, setJaVoiceId } = useTtsSettings();

  React.useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const v = await Speech.getAvailableVoicesAsync();
        setVoices(Array.isArray(v) ? v : []);
      } catch {}
    })();
  }, [visible]);

  const by = React.useCallback((prefix) => {
    const p = prefix.toLowerCase();
    return voices.filter(v => {
      const L = (v.language || "").toLowerCase();
      return L.startsWith(p) || L.slice(0,2) === p.slice(0,2);
    });
  }, [voices]);

  const filt = React.useCallback((arr) => {
    if (!filter.trim()) return arr;
    const f = filter.toLowerCase();
    return arr.filter(v =>
      (v.name || "").toLowerCase().includes(f) ||
      (v.language || "").toLowerCase().includes(f) ||
      (v.identifier || "").toLowerCase().includes(f)
    );
  }, [filter]);

  const testVoice = (v, sampleText) => {
    Speech.stop();
    Speech.speak(sampleText, {
      language: v?.language || "en-US",
      voice: v?.identifier,
      rate: Platform.OS === "ios" ? 0.5 : 1.0,
      pitch: 1.0,
    });
  };

  // 내부 드롭다운(국가별)
  const VoiceSelect = ({ label, items, value, onChange, sampleText }) => {
    const [open, setOpen] = React.useState(false);
    return (
      <View style={{ marginTop: 10 }}>
        <Text style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>{label}</Text>
        <TouchableOpacity
          style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10 }}
          onPress={() => setOpen(o=>!o)}
        >
          <Text style={{ color: "#111" }}>
            {items.find(v => v.identifier === value)?.name || "Select a voice"}
          </Text>
        </TouchableOpacity>
        {open && (
          <View style={{ borderWidth: 1, borderColor: "#eee", borderRadius: 8, marginTop: 6, maxHeight: 180 }}>
            <ScrollView nestedScrollEnabled>
              {items.map(v => (
                <TouchableOpacity
                  key={v.identifier}
                  style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: "#f7f7f7" }}
                  onPress={() => { onChange(v.identifier); setOpen(false); }}
                >
                  <Text style={{ color: "#111" }}>
                    {v.name} <Text style={{ color:"#999" }}>({v.language}{v.quality?` · ${v.quality}`:""})</Text>
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <TouchableOpacity
            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#111" }}
            onPress={() => {
              const v = items.find(v => v.identifier === value);
              const language = v?.language || (label.includes("KO") ? "ko-KR" : label.includes("JA") ? "ja-JP" : "en-US");
              Speech.speak(sampleText, { language, ...(v ? { voice: v.identifier } : {}), rate: Platform.OS === "ios" ? 0.5 : 1.0, pitch: 1.0 });
            }}
          >
            <Text style={{ color:"#fff" }}>Test</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#f1f1f1" }}
            onPress={() => Speech.stop()}
          >
            <Text style={{ color:"#333" }}>Stop</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* 백드롭 & 시트 분리: 백드롭은 누르면 닫힘, 시트는 스크롤 */}
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.modalSheet}>
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScrollInner}
          >
            {/* 언어(UI) 선택 */}
            {Object.keys(footerI18n).map((code) => (
              <TouchableOpacity
                key={code}
                style={[styles.langButton, lang === code && styles.langButtonActive]}
                onPress={() => { setLang(code); }}
              >
                <Text style={[styles.langText, { fontFamily: FONT_BY_LANG[code] }]}>{footerI18n[code].langName}</Text>
              </TouchableOpacity>
            ))}

            <View style={{ height: 1, backgroundColor: "#eee", marginVertical: 12 }} />

            {/* 나라별 보이스 드롭다운 */}
            <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 6 }}>TTS Voices</Text>
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

            {/* 전체 보이스 라이브러리 */}
            <View style={{ height: 1, backgroundColor: "#eee", marginVertical: 12 }} />
            <Text style={{ fontSize: 15, fontWeight: "600", marginBottom: 6 }}>All Voices on Device</Text>
            <TextInput
              value={filter}
              onChangeText={setFilter}
              placeholder="Filter by name / language / id"
              style={styles.input}
              placeholderTextColor="#999"
            />
            <View style={{ borderWidth:1, borderColor:"#eee", borderRadius:8, maxHeight: 260 }}>
              <ScrollView nestedScrollEnabled>
                {filt(voices).map(v => (
                  <View key={v.identifier} style={{ padding:10, borderBottomWidth:1, borderBottomColor:"#f7f7f7" }}>
                    <Text style={{ color:"#111" }}>
                      {v.name} <Text style={{ color:"#999" }}>({v.language}{v.quality?` · ${v.quality}`:""})</Text>
                    </Text>
                    <View style={{ flexDirection:"row", gap:8, marginTop:6, flexWrap:"wrap" }}>
                      <TouchableOpacity
                        style={{ paddingHorizontal:10, paddingVertical:6, borderRadius:8, backgroundColor:"#111" }}
                        onPress={() => testVoice(v, "Sample voice test.")}
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

            <TouchableOpacity
              style={{ marginTop: 16, alignSelf: "center", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#111", borderRadius: 10 }}
              onPress={onClose}
            >
              <Text style={{ color:"#fff" }}>닫기</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ───────────────── Root ─────────────────
const StackNav = createNativeStackNavigator();

function Root() {
  const { lang, setLang, font, footerH, setFooterH } = useGlobalLang();
  const insets = useSafeAreaInsets();
  const t = useMemo(() => footerI18n[lang] ?? footerI18n.ko, [lang]);

  const navRef = useNavigationContainerRef();
  const [routeName, setRouteName] = React.useState(null);
  const showFooter = routeName && routeName !== "Main";

  const [showLang, setShowLang] = React.useState(false);
  const [showIngredients, setShowIngredients] = React.useState(false);

  return (
    <>
      <StatusBar style="dark" />
      <View style={styles.appBody}>
        <NavigationContainer
          ref={navRef}
          onReady={() => setRouteName(navRef.getCurrentRoute()?.name)}
          onStateChange={() => setRouteName(navRef.getCurrentRoute()?.name)}
        >
          <StackNav.Navigator initialRouteName="Main" screenOptions={{ headerShown: false }}>
            <StackNav.Screen name="Main" component={Main} />
            <StackNav.Screen name="Home" component={HomeScreen} />
            <StackNav.Screen name="Recipe" component={RecipeScreen} />
            <StackNav.Screen name="RecipeSearch" component={RecipeSearch} />
            <StackNav.Screen name="Youtube" component={YoutubeSearch} />
          </StackNav.Navigator>
        </NavigationContainer>
      </View>

      {showFooter && (
        <View
          style={[styles.footerWrap, { paddingBottom: insets.bottom }]}
          onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}
        >
          <FooterNav
            t={t}
            lang={lang}
            fontFamily={font}
            onOpenSettings={() => setShowLang(true)}
            onOpenIngredients={() => setShowIngredients(true)}
            onOpenBrowse={() => navRef.navigate("Youtube")}
            onOpenSearch={() => navRef.navigate("RecipeSearch")}
          />
        </View>
      )}

      {/* 설정 모달 */}
      <SettingsModal
        visible={showLang}
        onClose={() => setShowLang(false)}
        lang={lang}
        setLang={setLang}
      />

      {/* 재료 입력 모달 */}
      <IngredientsSheet visible={showIngredients} onClose={() => setShowIngredients(false)} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <TtsSettingsProvider>
        <GlobalLangProvider>
          <Root />
        </GlobalLangProvider>
      </TtsSettingsProvider>
    </SafeAreaProvider>
  );
}

// ───────────────── styles ─────────────────
const styles = StyleSheet.create({
  appBody: { flex: 1, backgroundColor: "#fff" },
  footerWrap: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", paddingTop: 8 },

  // 모달 시트/스크롤
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalSheet: {
    backgroundColor: "#fff",
    width: 340,
    maxHeight: "85%",
    borderRadius: 12,
    overflow: "hidden",
  },
  modalScrollInner: {
    padding: 20,
    paddingBottom: 24,
  },

  // 재사용
  input: { borderWidth:1, borderColor:"#ddd", borderRadius:8, paddingHorizontal:12, height:42, marginBottom:8, color:"#111" },
  tagBtn: { paddingHorizontal:10, paddingVertical:6, borderRadius:8, backgroundColor:"#ffe98a" },
  tagTxt: { color:"#222" },
  tagTxtDark: { color:"#222" },
  langButton: { paddingVertical: 12, alignItems: "center" },
  langButtonActive: { backgroundColor: "#ffe98a", borderRadius: 8 },
  langText: { fontSize: 16, color: "#111" },
});
