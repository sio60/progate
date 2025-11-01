// IngredientsSheet.js
import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import Constants from "expo-constants";
import { useGlobalLang } from "./GlobalLang";

const tMap = {
  ko: {
    title: "재료 입력",
    placeholder: "예) 김치",
    add: "추가",
    generate: "추천받기",
    reset: "초기화",
    close: "닫기",
    empty: "재료를 1개 이상 입력하세요.",
    result: "생성 결과",
    ingredients: "재료",
    steps: "조리 과정",
    failGen: "레시피를 만들지 못했어요. 재시도 해보세요.",
    timeout: "요청이 시간 초과됐어요(30s). 서버 지연 또는 IP 설정 확인",
    netFail: "연결 실패: API_BASE/IP/방화벽 확인",
  },
  en: {
    title: "Add Ingredients",
    placeholder: "e.g., kimchi",
    add: "Add",
    generate: "Generate",
    reset: "Reset",
    close: "Close",
    empty: "Please add at least one ingredient.",
    result: "Results",
    ingredients: "Ingredients",
    steps: "Steps",
    failGen: "Couldn't build a recipe. Please try again.",
    timeout: "Request timed out (30s). Server slow or wrong IP",
    netFail: "Network failed: check API_BASE/IP/firewall",
  },
  ja: {
    title: "材料入力",
    placeholder: "例) キムチ",
    add: "追加",
    generate: "提案を受ける",
    reset: "リセット",
    close: "閉じる",
    empty: "材料を1つ以上入力してください。",
    result: "生成結果",
    ingredients: "材料",
    steps: "作り方",
    failGen: "レシピを作成できませんでした。再試行してください。",
    timeout: "タイムアウト(30秒)。サーバ遅延またはIP設定を確認",
    netFail: "接続失敗: API/IP/Firewallを確認",
  },
};

const fromExtra = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE;
const fromEnv = process.env?.EXPO_PUBLIC_API_BASE;
const DEFAULT_BASE =
  Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";
const API_BASE = (fromExtra || fromEnv || DEFAULT_BASE).replace(/\/+$/g, "");

// ---- JSON이 깨져 와도 최대한 복구해서 파싱 ----
function extractJson(text) {
  if (!text) throw new Error("EMPTY");
  const cleaned = text.replace(/```json|```/g, "").trim();
  // 1) 바로 파싱
  try { return JSON.parse(cleaned); } catch (_) {}
  // 2) 본문에 설명이 섞였을 때, 가장 바깥 [] 또는 {}만 잘라 파싱
  const sArr = cleaned.indexOf("[");
  const sObj = cleaned.indexOf("{");
  const s = [sArr, sObj].filter(i => i >= 0).sort((a,b)=>a-b)[0];
  const eArr = cleaned.lastIndexOf("]");
  const eObj = cleaned.lastIndexOf("}");
  const e = Math.max(eArr, eObj);
  if (s >= 0 && e > s) {
    const slice = cleaned.slice(s, e + 1);
    try { return JSON.parse(slice); } catch (_) {}
  }
  throw new Error("BAD_JSON");
}

// 문자열/배열 모두 커버하는 정규화
function normalizeResult(raw, idx = 0) {
  const name = raw?.title || raw?.food || raw?.name || "(제목 없음)";

  let ingredients = [];
  if (Array.isArray(raw?.ingredients)) {
    ingredients = raw.ingredients
      .map(i => {
        if (!i) return "";
        const n = i.name ?? i.item ?? "";
        const q = i.qty != null ? String(i.qty) : "";
        const u = i.unit ?? "";
        return [n, q, u].filter(Boolean).join(" ").trim();
      })
      .filter(Boolean);
  } else if (typeof raw?.ingredient === "string") {
    ingredients = raw.ingredient
      .split(/\r?\n|,|·|•/g)
      .map(s => s.trim())
      .filter(Boolean);
  }

  let steps = [];
  if (Array.isArray(raw?.steps)) {
    steps = raw.steps.map(s => (typeof s === "string" ? s : s?.text)).filter(Boolean);
  } else if (typeof raw?.recipe === "string") {
    steps = raw.recipe
      .split(/\r?\n/g)
      .map(line => line.replace(/^\s*\d+[\).\-\s]?\s*/, "").trim())
      .filter(Boolean);
  }

  return { id: idx + 1, name, ingredients, steps };
}

export default function IngredientsSheet({ visible, onClose }) {
  const { lang, font } = useGlobalLang();
  const t = useMemo(() => tMap[lang] ?? tMap.ko, [lang]);

  const [input, setInput] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [err, setErr] = useState("");

  const addItem = () => {
    const v = input.trim();
    if (!v) return;
    if (items.includes(v)) { setInput(""); return; }
    setItems(prev => [...prev, v]);
    setInput("");
  };

  const removeItem = (v) => setItems(prev => prev.filter(x => x !== v));
  const resetAll = () => { setItems([]); setResults([]); setErr(""); setInput(""); };

  const requestRecipes = async () => {
    setErr(""); setResults([]);
    if (!items.length) { setErr(t.empty); return; }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/recipes/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ingredients: items }), // 옵션 제거: timeMax/servings 안 보냄
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text?.slice(0, 200)}`);
      }

      const rawText = await res.text();
      let json;
      try { json = extractJson(rawText); }
      catch (e) {
        console.warn("[ParseFail] raw preview:", rawText?.slice(0, 400));
        throw e;
      }

      const arr = Array.isArray(json) ? json : [json];
      const norm = arr.map((it, idx) => normalizeResult(it, idx)).filter(
        r => (r.ingredients?.length || r.steps?.length || r.name !== "(제목 없음)")
      );

      if (!norm.length) {
        setErr(t.failGen);
        return;
      }
      setResults(norm);
    } catch (e) {
      const msg =
        String(e?.name) === "AbortError" ? t.timeout :
        String(e?.message || "").includes("Network request failed") ? t.netFail :
        t.failGen;
      setErr(msg);
      console.warn("[에러]", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={[styles.title, { fontFamily: font }]}>{t.title}</Text>

          {/* 입력 & 추가 */}
          <View style={styles.row}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t.placeholder}
              placeholderTextColor="#999"
              style={[styles.input, { fontFamily: font }]}
              onSubmitEditing={addItem}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={addItem}>
              <Text style={[styles.addTxt, { fontFamily: font }]}>{t.add}</Text>
            </TouchableOpacity>
          </View>

          {/* 칩 */}
          <View style={styles.chips}>
            {items.map(v => (
              <View key={v} style={styles.chip}>
                <Text style={[styles.chipTxt, { fontFamily: font }]}>{v}</Text>
                <TouchableOpacity onPress={() => removeItem(v)} style={styles.chipX}>
                  <Text style={styles.chipXTxt}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* 액션 */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.resetBtn} onPress={resetAll} disabled={loading}>
              <Text style={[styles.resetTxt, { fontFamily: font }]}>{t.reset}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genBtn, (!items.length || loading) && styles.genBtnDisabled]}
              onPress={requestRecipes}
              disabled={loading || !items.length}
            >
              {loading ? <ActivityIndicator /> :
                <Text style={[styles.genTxt, { fontFamily: font }]}>{t.generate}</Text>}
            </TouchableOpacity>
          </View>

          {!!err && <Text style={styles.err}>{err}</Text>}

          {!!results.length && (
            <>
              <Text style={[styles.resultTitle, { fontFamily: font }]}>{t.result}</Text>
              <ScrollView style={styles.resultScroll}>
                {results.map(r => (
                  <View key={r.id} style={styles.card}>
                    <Text style={[styles.foodName, { fontFamily: font }]}>{r.name}</Text>

                    {!!r.ingredients?.length && (
                      <>
                        <Text style={[styles.sectionTitle, { fontFamily: font }]}>
                          {t.ingredients}
                        </Text>
                        {r.ingredients.map((line, i) => (
                          <Text key={i} style={[styles.li, { fontFamily: font }]}>• {line}</Text>
                        ))}
                      </>
                    )}

                    {!!r.steps?.length && (
                      <>
                        <Text style={[styles.sectionTitle, { fontFamily: font }]}>{t.steps}</Text>
                        {r.steps.map((line, i) => (
                          <Text key={i} style={[styles.li, { fontFamily: font }]}>
                            {i + 1}. {line}
                          </Text>
                        ))}
                      </>
                    )}
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={loading}>
            <Text style={[styles.closeTxt, { fontFamily: font }]}>{t.close}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: "92%" },
  title: { fontSize: 18, marginBottom: 10 },
  row: { flexDirection: "row", gap: 8 },
  input: { flex: 1, height: 44, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12 },
  addBtn: { paddingHorizontal: 14, minWidth: 72, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#222" },
  addTxt: { color: "#fff", fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: { flexDirection: "row", alignItems: "center", backgroundColor: "#f2f2f2", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipTxt: { fontSize: 14 },
  chipX: { marginLeft: 6, paddingHorizontal: 4 },
  chipXTxt: { fontSize: 16, color: "#777" },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  resetBtn: { paddingVertical: 10, paddingHorizontal: 10 },
  resetTxt: { color: "#666" },
  genBtn: { backgroundColor: "#111", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  genBtnDisabled: { opacity: 0.5 },
  genTxt: { color: "#fff", fontSize: 15 },
  err: { marginTop: 8, color: "#d22" },
  resultTitle: { marginTop: 16, fontSize: 16 },
  resultScroll: { marginTop: 8, maxHeight: 360 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 14, padding: 12, marginBottom: 12, backgroundColor: "#fff" },
  foodName: { fontSize: 18, marginBottom: 8, color: "#111" },
  sectionTitle: { fontSize: 15, marginTop: 6, marginBottom: 4, color: "#333" },
  li: { fontSize: 14, lineHeight: 22, color: "#333" },
  closeBtn: { alignSelf: "center", marginTop: 12, paddingVertical: 10, paddingHorizontal: 16 },
  closeTxt: { color: "#333" },
});
