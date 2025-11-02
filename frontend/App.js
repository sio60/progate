// App.js (상단 import 수정)
import React, { useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  View, Modal, TouchableOpacity, Text, StyleSheet, ScrollView, TextInput, Pressable
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
// ❌ import * as Speech from "expo-speech";  (삭제)
// ❌ import { TtsSettingsProvider, useTtsSettings } from "./components/TtsSettingsContext";
import { TtsSettingsProvider } from "./components/TtsSettingsContext"; // Provider만 유지(다른 컴포넌트 호환용)

const Stack = createNativeStackNavigator();

const footerI18n = {
  ko: { langName: "한국어",  navIngredients: "재료 입력",       navSearch: "레시피 검색",   navBrowse: "한국 유행어", navSettings: "설정" },
  en: { langName: "English", navIngredients: "Add Ingredients", navSearch: "Search Recipes", navBrowse: "a Korean buzzword", navSettings: "Settings" },
  ja: { langName: "日本語",   navIngredients: "材料入力",         navSearch: "レシピ検索",     navBrowse: "韓国語の流行語", navSettings: "設定" },
};

const FONT_BY_LANG = { ko: "Unheo", en: "Brush", ja: "Tegomin" };

// ───────────────── Settings Modal (언어만) ─────────────────
function SettingsModal({ visible, onClose, lang, setLang }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalSheet}>
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScrollInner}
          >
            {/* 언어(UI) 선택만 표시 */}
            {Object.keys(footerI18n).map((code) => (
              <TouchableOpacity
                key={code}
                style={[styles.langButton, lang === code && styles.langButtonActive]}
                onPress={() => { setLang(code); }}
              >
                <Text style={[styles.langText, { fontFamily: FONT_BY_LANG[code] }]}>
                  {footerI18n[code].langName}
                </Text>
              </TouchableOpacity>
            ))}

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

// ───────────────── styles (기존 그대로) ─────────────────
const styles = StyleSheet.create({
  appBody: { flex: 1, backgroundColor: "#fff" },
  footerWrap: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", paddingTop: 8 },

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

  input: { borderWidth:1, borderColor:"#ddd", borderRadius:8, paddingHorizontal:12, height:42, marginBottom:8, color:"#111" },
  tagBtn: { paddingHorizontal:10, paddingVertical:6, borderRadius:8, backgroundColor:"#ffe98a" },
  tagTxt: { color:"#222" },
  tagTxtDark: { color:"#222" },
  langButton: { paddingVertical: 12, alignItems: "center" },
  langButtonActive: { backgroundColor: "#ffe98a", borderRadius: 8 },
  langText: { fontSize: 16, color: "#111" },
});
