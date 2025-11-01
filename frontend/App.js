import React, { useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Modal, TouchableOpacity, Text, StyleSheet } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import Main from "./screens/Main";
import HomeScreen from "./screens/HomeScreen";
import RecipeScreen from "./screens/RecipeScreen";
import FooterNav from "./components/FooterNav";

// ✅ 추가: 재료 입력 모달
import IngredientsSheet from "./components/IngredientsSheet";

// ✅ 컨텍스트/프로바이더 임포트
import { GlobalLangProvider, useGlobalLang } from "./components/GlobalLang";

const Stack = createNativeStackNavigator();

const footerI18n = {
  ko: { langName: "한국어",  navIngredients: "재료 입력",       navSearch: "레시피 검색",   navBrowse: "한식 둘러보기", navSettings: "설정" },
  en: { langName: "English", navIngredients: "Add Ingredients", navSearch: "Search Recipes", navBrowse: "Browse Korean Food", navSettings: "Settings" },
  ja: { langName: "日本語",   navIngredients: "材料入力",         navSearch: "レシピ検索",     navBrowse: "韓国料理を見る", navSettings: "設定" },
};

const FONT_BY_LANG = { ko: "Unheo", en: "Brush", ja: "Tegomin" };

function Root() {
  const { lang, setLang, font, footerH, setFooterH } = useGlobalLang();
  const insets = useSafeAreaInsets();

  const t = useMemo(() => footerI18n[lang] ?? footerI18n.ko, [lang]);

  const navRef = useNavigationContainerRef();
  const [routeName, setRouteName] = React.useState(null);
  const showFooter = routeName && routeName !== "Main";

  const [showLang, setShowLang] = React.useState(false);
  // ✅ 추가: 재료 입력 모달 on/off
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
          <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main" component={Main} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Recipe" component={RecipeScreen} />
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
            fontFamily={font}
            onOpenSettings={() => setShowLang(true)}
            // ✅ 추가: “재료 입력” 아이콘 누르면 모달 열기
            onOpenIngredients={() => setShowIngredients(true)}
          />
        </View>
      )}

      {/* 언어 선택 모달 */}
      <Modal visible={showLang} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowLang(false)} activeOpacity={1}>
          <View style={styles.modalContent}>
            {Object.keys(footerI18n).map((code) => (
              <TouchableOpacity
                key={code}
                style={[styles.langButton, lang === code && styles.langButtonActive]}
                onPress={() => {
                  setLang(code);
                  setShowLang(false);
                }}
              >
                <Text style={[styles.langText, { fontFamily: FONT_BY_LANG[code] }]}>
                  {footerI18n[code].langName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ✅ 재료 입력 모달 */}
      <IngredientsSheet
        visible={showIngredients}
        onClose={() => setShowIngredients(false)}
      />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GlobalLangProvider>
        <Root />
      </GlobalLangProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appBody: { flex: 1, backgroundColor: "#fff" },
  footerWrap: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", paddingTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#fff", padding: 24, borderRadius: 12, width: 240 },
  langButton: { paddingVertical: 12, alignItems: "center" },
  langButtonActive: { backgroundColor: "#ffe98a", borderRadius: 8 },
  langText: { fontSize: 16 },
});
