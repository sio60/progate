import React, { useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Font from "expo-font";
import {
  View,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import Main from "./screens/Main";
import HomeScreen from "./screens/HomeScreen";
import RecipeScreen from "./screens/RecipeScreen";
import TtsScreen from "./screens/TtsScreen";
import FooterNav from "./components/FooterNav";
import { GlobalLang } from "./components/GlobalLang";

const Stack = createNativeStackNavigator();

const footerI18n = {
  ko: {
    langName: "한국어",
    font: "Unheo",
    navIngredients: "재료 입력",
    navSearch: "레시피 검색",
    navBrowse: "한식 둘러보기",
    navSettings: "설정",
  },
  en: {
    langName: "English",
    font: "Tegomin",
    navIngredients: "Add Ingredients",
    navSearch: "Search Recipes",
    navBrowse: "Browse Korean Food",
    navSettings: "Settings",
  },
  ja: {
    langName: "日本語",
    font: "Brush",
    navIngredients: "材料入力",
    navSearch: "レシピ検索",
    navBrowse: "韓国料理を見る",
    navSettings: "設定",
  },
};

function Root() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [lang, setLang] = useState("ko");
  const [showLang, setShowLang] = useState(false);
  const [footerH, setFooterH] = useState(0);
  const insets = useSafeAreaInsets();
  const t = useMemo(() => footerI18n[lang], [lang]);
  const font = t.font;

  const navRef = useNavigationContainerRef();
  const [routeName, setRouteName] = useState(null);
  const showFooter = routeName && routeName !== "Main";

  useEffect(() => {
    (async () => {
      await Font.loadAsync({
        Unheo: require("./assets/font/NYJUnheo.ttf"),
        Tegomin: require("./assets/font/NewTegomin-Regular.ttf"),
        Brush: require("./assets/font/NanumBrushScript-Regular.ttf"),
      });
      setFontsLoaded(true);
    })();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GlobalLang.Provider value={{ lang, setLang, font, footerH, setFooterH }}>
      <StatusBar style="dark" />
      <View style={styles.appBody}>
        <NavigationContainer
          ref={navRef}
          onReady={() => setRouteName(navRef.getCurrentRoute()?.name)}
          onStateChange={() => setRouteName(navRef.getCurrentRoute()?.name)}
        >
          <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main" component={Main} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Recipe" component={RecipeScreen} />
            <Stack.Screen name="TTS" component={TtsScreen} />
          </Stack.Navigator>
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
            onOpenSettings={() => setShowLang(true)}
            fontFamily={font}
          />
        </View>
      )}

      <Modal visible={showLang} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowLang(false)}
          activeOpacity={1}
        >
          <View style={styles.modalContent}>
            {Object.keys(footerI18n).map((code) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.langButton,
                  lang === code && styles.langButtonActive,
                ]}
                onPress={() => {
                  setLang(code);
                  setShowLang(false);
                }}
              >
                <Text
                  style={[
                    styles.langText,
                    { fontFamily: footerI18n[code].font },
                  ]}
                >
                  {footerI18n[code].langName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </GlobalLang.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  appBody: { flex: 1, backgroundColor: "#fff" },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    paddingTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: { backgroundColor: "#fff", padding: 24, borderRadius: 12, width: 240 },
  langButton: { paddingVertical: 12, alignItems: "center" },
  langButtonActive: { backgroundColor: "#ffe98a", borderRadius: 8 },
  langText: { fontSize: 16 },
});
