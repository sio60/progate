// screens/RecipeSearch.jsx
import React, { useMemo, useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, FlatList, StyleSheet, Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGlobalLang } from "../components/GlobalLang";
// ⬇️ 서버 검색 대신 Gemini 직접 호출
import { generateAiRecipeByName } from "../config/gemini";

const tMap = {
  ko: {
    title: "레시피 검색",
    placeholder: "예) 김치찌개, 잡채, 된장찌개",
    button: "검색",
    empty: "검색 결과가 없어요.",
    meta: (c, t, s, d) => `· 분류 ${c || "-"} · ${t ?? "-"}분 · ${s ?? "-"}인분 · ${d || "-"}`,
    ingredients: "재료",
    steps: "조리 과정",
    retry: "다시 검색",
  },
  en: {
    title: "Recipe Search",
    placeholder: "e.g., Kimchi stew, Japchae",
    button: "Search",
    empty: "No results.",
    meta: (c, t, s, d) => `· Cat ${c || "-"} · ${t ?? "-"}m · ${s ?? "-"} servings · ${d || "-"}`,
    ingredients: "Ingredients",
    steps: "Steps",
    retry: "Search again",
  },
  ja: {
    title: "レシピ検索",
    placeholder: "例）キムチチゲ、チャプチェ",
    button: "検索",
    empty: "結果がありません。",
    meta: (c, t, s, d) => `· 分類 ${c || "-"} · ${t ?? "-"}分 · ${s ?? "-"}人分 · ${d || "-"}`,
    ingredients: "材料",
    steps: "作り方",
    retry: "再検索",
  },
};

export default function RecipeSearch() {
  const insets = useSafeAreaInsets();
  const { lang, font } = useGlobalLang();
  const t = useMemo(() => tMap[lang] ?? tMap.ko, [lang]);

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [error, setError] = useState("");

  const doSearch = useCallback(async () => {
    const keyword = q.trim();
    if (!keyword) return;

    setLoading(true);
    setError("");
    setList([]);
    Keyboard.dismiss();

    try {
      const r = await generateAiRecipeByName({ dish: keyword, lang, servings: 2, timeMax: 60 });
      // 컴포넌트는 배열 렌더에 맞춰 단건을 배열로 래핑
      setList([{
        title: r.title,
        category: r.category,
        timeMin: r.timeMin,
        servings: r.servings,
        difficulty: r.difficulty,
        ingredients: r.ingredients,
        steps: r.steps,
      }]);
      if (!r?.title && (!r?.ingredients?.length && !r?.steps?.length)) setError(t.empty);
    } catch (e) {
      setError(e?.message || t.empty);
    } finally {
      setLoading(false);
    }
  }, [q, lang, t.empty]);

  const renderItem = ({ item }) => {
    return (
      <View style={styles.card}>
        <Text style={[styles.title, { fontFamily: font }]}>{item.title}</Text>
        <Text style={styles.meta}>
          {t.meta(item.category, item.timeMin, item.servings, item.difficulty)}
        </Text>

        {/* 재료 */}
        <Text style={[styles.section, { fontFamily: font }]}>{t.ingredients}</Text>
        {Array.isArray(item.ingredients) && item.ingredients.length > 0 ? (
          item.ingredients.map((g, idx) => (
            <Text key={idx} style={styles.li}>
              • {g.name}{g.qty != null && g.unit ? ` — ${g.qty}${g.unit}` : ""}
            </Text>
          ))
        ) : (
          <Text style={styles.dim}>-</Text>
        )}

        {/* 조리 과정 */}
        <Text style={[styles.section, { fontFamily: font, marginTop: 12 }]}>{t.steps}</Text>
        {Array.isArray(item.steps) && item.steps.length > 0 ? (
          item.steps.map((s, idx) => (
            <Text key={idx} style={styles.li}>
              {`${s.order ?? idx + 1}. ${s.text}`}
            </Text>
          ))
        ) : (
          <Text style={styles.dim}>-</Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      {/* 헤더 + 검색바 */}
      <Text style={[styles.header, { fontFamily: font }]}>{t.title}</Text>
      <View style={styles.row}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t.placeholder}
          placeholderTextColor="#999"
          style={[styles.input, { fontFamily: font }]}
          returnKeyType="search"
          onSubmitEditing={doSearch}
        />
        <TouchableOpacity style={styles.btn} onPress={doSearch}>
          <Text style={[styles.btnText, { fontFamily: font }]}>{t.button}</Text>
        </TouchableOpacity>
      </View>

      {/* 목록 / 상태 */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="small" /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.dim}>{error}</Text>
          <TouchableOpacity style={[styles.btn, { marginTop: 8 }]} onPress={doSearch}>
            <Text style={[styles.btnText, { fontFamily: font }]}>{t.retry}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={<Text style={[styles.dim, { textAlign: "center", marginTop: 24 }]}>{t.empty}</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },
  header: { fontSize: 22, marginBottom: 12 },
  row: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 12 },
  input: {
    flex: 1,
    borderWidth: 1, borderColor: "#eee",
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, fontSize: 15, backgroundColor: "#fafafa",
  },
  btn: { backgroundColor: "#ffe98a", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnText: { fontSize: 15 },
  center: { alignItems: "center", justifyContent: "center", paddingTop: 24 },
  card: {
    borderWidth: 1, borderColor: "#f2f2f2", borderRadius: 14, padding: 14, marginBottom: 12,
    backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  title: { fontSize: 18, marginBottom: 6 },
  meta: { color: "#666", marginBottom: 8 },
  section: { fontSize: 16, marginTop: 6, marginBottom: 6 },
  li: { fontSize: 14, lineHeight: 20, color: "#222" },
  dim: { color: "#999", fontSize: 14 },
});
