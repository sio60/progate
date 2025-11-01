// screens/RecipeScreen.js
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import HeaderLogo from "../components/HeaderLogo";
import { useGlobalLang } from "../components/GlobalLang";
import recipes from "../data/recipes";

/** 언어별 폰트 크기 테이블 (원하면 여기 값만 조절) */
const SIZE = {
  ko: { name: 35, section: 23, p: 25, listen: 18 },
  en: { name: 22, section: 17, p: 17, listen: 15 },
  ja: { name: 22, section: 16, p: 16, listen: 15 },
};

const tMap = {
  ko: { ingredients: "재료", steps: "조리 과정", listen: "음성으로 듣기 →" },
  en: { ingredients: "Ingredients", steps: "Steps", listen: "Listen →" },
  ja: { ingredients: "材料", steps: "作り方", listen: "音声で聞く →" },
};

export default function RecipeScreen({ route, navigation }) {
  const { food } = route.params || {};
  const { lang, font, footerH } = useGlobalLang();
  const t = useMemo(() => tMap[lang], [lang]);
  const sz = SIZE[lang] || SIZE.ko;

  const r = recipes[food?.key];
  const ings = r?.[lang]?.ingredients ?? [];
  const steps = r?.[lang]?.steps ?? [];

  const F = { fontFamily: font };
  const L = (fs, lh = 1.12) => ({ fontSize: fs, lineHeight: Math.round(fs * lh) });

  return (
    <View style={[styles.container, { paddingBottom: footerH }]}>
      <HeaderLogo />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate("TTS", { food })}>
          <Text style={[styles.listenText, F, L(sz.listen, 1.1)]}>{t.listen}</Text>
        </TouchableOpacity>
      </View>

      <ImageBackground
        source={food?.image}
        style={styles.cover}
        imageStyle={{ resizeMode: "cover" }}
      >
        <Text style={[styles.foodName, F, L(sz.name, 1.1)]}>
          {food?.names?.[lang] ?? ""}
        </Text>
      </ImageBackground>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, F, L(sz.section, 1.12)]}>
          {t.ingredients}
        </Text>
        {ings.map((it, i) => (
          <Text key={`i-${i}`} style={[styles.p, F, L(sz.p, 1.35)]}>
            - {it}
          </Text>
        ))}

        <Text style={[styles.sectionTitle, F, L(sz.section, 1.12), { marginTop: 16 }]}>
          {t.steps}
        </Text>
        {steps.map((s, i) => (
          <Text key={`s-${i}`} style={[styles.p, F, L(sz.p, 1.35)]}>
            {i + 1}) {s}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 8 },
  topBar: { paddingHorizontal: 16, paddingBottom: 6, alignItems: "flex-end" },
  listenText: { color: "#111", includeFontPadding: false },
  cover: { width: "100%", height: 320, justifyContent: "flex-start" },
  foodName: {
    color: "#000",
    paddingTop: 10,
    paddingHorizontal: 14,
    includeFontPadding: false,
    width: "100%",
    textAlign: "right",
  },
  body: { paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 8 },
  sectionTitle: {
    fontWeight: "600",
    color: "#222",
    includeFontPadding: false,
  },
  p: { color: "#444", marginTop: 6, includeFontPadding: false },
});
