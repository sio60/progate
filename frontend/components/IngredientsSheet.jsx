// IngredientsSheet.jsx
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
} from "react-native";
import { useGlobalLang } from "./GlobalLang";
import { apiPost } from "../config/api";

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

// ── 유틸: 개행 정규화 + 멀티라인 렌더러 ──────────────────────────────
const normalizeLB = (s = "") =>
  String(s)
    .replace(/\r\n?/g, "\n")
    .replace(/\u2028|\u2029/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

function ML({ text, style }) {
  const parts = normalizeLB(text).split("\n");
  return (
    <Text style={style}>
      {parts.map((p, i) => (
        <Text key={i}>
          {p}
          {i < parts.length - 1 ? "\n" : ""}
        </Text>
      ))}
    </Text>
  );
}

// ── Gemini 응답에서 JSON 추출 ───────────────────────────────────────
function extractJson(text) {
  if (!text) throw new Error("EMPTY");
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  const s = Math.min(
    ...["[", "{"].map((c) => cleaned.indexOf(c)).filter((i) => i >= 0)
  );
  const e = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  if (s >= 0 && e > s) {
    const slice = cleaned.slice(s, e + 1);
    try {
      return JSON.parse(slice);
    } catch (_) {}
  }
  throw new Error("BAD_JSON");
}

// ── 단계 텍스트를 1/2/3/4… 배열로 쪼개기 ───────────────────────────
function tokenizeSteps(value) {
  if (!value) return [];

  // 이미 배열인 경우
  if (Array.isArray(value)) {
    return value
      .map((s) => (typeof s === "string" ? s : s?.text))
      .filter(Boolean)
      .map((s) => s.trim());
  }

  // 문자열인 경우
  if (typeof value === "string") {
    const cleaned = normalizeLB(value);

    // 1) 우선 개행 기준 분해
    let parts = cleaned.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      parts = parts
        .map((s) => s.replace(/^\s*\d+[\.\)\-\s]\s*/, "").trim())
        .filter(Boolean);
    }

    // 2) 여전히 한 줄이면  "1. " / "2) " / "3 - " 등 숫자 토큰으로 분해
    if (parts.length <= 1 && /\d+[\.\)\-]\s/.test(cleaned)) {
      parts = cleaned
        .replace(/^\s*\d+[\.\)\-]\s*/, "")
        .split(/\s+\d+[\.\)\-]\s+/g)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // 3) 그래도 한 덩어리면 문장 단위로 분해(마침표+공백)
    if (parts.length <= 1) {
      parts = cleaned
        .split(/(?<=\.)\s+(?=[가-힣A-Za-z0-9])/g)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    return parts;
  }

  return [];
}

// ── 정규화 ──────────────────────────────────────────────────────────
function normalizeResult(raw, idx = 0) {
  const name = raw?.title || raw?.food || raw?.name || "(제목 없음)";

  // 재료
  let ingredients = [];
  if (Array.isArray(raw?.ingredients)) {
    ingredients = raw.ingredients
      .map((i) => {
        if (!i) return "";
        const n = i.name ?? i.item ?? "";
        const q = i.qty != null ? String(i.qty) : "";
        const u = i.unit ?? "";
        return [n, q, u].filter(Boolean).join(" ").trim();
      })
      .filter(Boolean);
  }
  if (!ingredients.length && typeof raw?.ingredient === "string") {
    ingredients = raw.ingredient
      .split(/\r?\n|,|·|•/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // 단계
  let steps = [];
  if (raw?.steps != null) steps = tokenizeSteps(raw.steps);
  else if (raw?.recipe != null) steps = tokenizeSteps(raw.recipe);

  return { id: idx + 1, name, ingredients, steps };
}

// ── 컴포넌트 ────────────────────────────────────────────────────────
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
    if (items.includes(v)) {
      setInput("");
      return;
    }
    setItems((prev) => [...prev, v]);
    setInput("");
  };

  const removeItem = (v) => setItems((prev) => prev.filter((x) => x !== v));
  const resetAll = () => {
    setItems([]);
    setResults([]);
    setErr("");
    setInput("");
  };

  const requestRecipes = async () => {
    setErr("");
    setResults([]);
    if (!items.length) {
      setErr(t.empty);
      return;
    }

    try {
      setLoading(true);
      const raw = await apiPost("/api/recipes/prepare", { ingredients: items });
      const rawText = typeof raw === "string" ? raw : JSON.stringify(raw);

      console.log("🧪 Gemini 응답 rawText:\n", rawText);

      let json;
      try {
        json = extractJson(rawText);
      } catch (e) {
        console.warn("[❌ JSON 파싱 실패]", e.message);
        setErr(t.failGen);
        return;
      }

      const arr = Array.isArray(json) ? json : [json];
      const norm = arr
        .map((it, idx) => normalizeResult(it, idx))
        .filter(
          (r) =>
            r.ingredients?.length || r.steps?.length || r.name !== "(제목 없음)"
        );

      console.log("✅ 정규화 결과:", norm);

      if (!norm.length) {
        console.warn("[⚠️ 정규화 실패] → 응답은 있었으나 내용 없음");
        setErr(t.failGen);
        return;
      }

      setResults(norm);
    } catch (e) {
      const msg =
        String(e?.name) === "AbortError"
          ? t.timeout
          : String(e?.message || "").includes("Network request failed")
          ? t.netFail
          : t.failGen;
      setErr(msg);
      console.warn("[💥 에러]", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={[styles.title, { fontFamily: font }]}>{t.title}</Text>

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

          <View style={styles.chips}>
            {items.map((v) => (
              <View key={v} style={styles.chip}>
                <Text style={[styles.chipTxt, { fontFamily: font }]}>{v}</Text>
                <TouchableOpacity onPress={() => removeItem(v)} style={styles.chipX}>
                  <Text style={styles.chipXTxt}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.resetBtn} onPress={resetAll} disabled={loading}>
              <Text style={[styles.resetTxt, { fontFamily: font }]}>{t.reset}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genBtn, (!items.length || loading) && styles.genBtnDisabled]}
              onPress={requestRecipes}
              disabled={loading || !items.length}
            >
              {loading ? <ActivityIndicator /> : (
                <Text style={[styles.genTxt, { fontFamily: font }]}>{t.generate}</Text>
              )}
            </TouchableOpacity>
          </View>

          {!!err && <Text style={styles.err}>{err}</Text>}

          {!!results.length && (
            <>
              <Text style={[styles.resultTitle, { fontFamily: font }]}>{t.result}</Text>
              <ScrollView style={styles.resultScroll}>
                {results.map((r) => (
                  <View key={r.id} style={styles.card}>
                    <Text style={[styles.foodName, { fontFamily: font }]}>{r.name}</Text>

                    {!!r.ingredients?.length && (
                      <>
                        <Text style={[styles.sectionTitle, { fontFamily: font }]}>
                          {t.ingredients}
                        </Text>
                        {r.ingredients.map((line, i) => (
                          <View key={i} style={styles.liRow}>
                            <Text style={[styles.bullet, { fontFamily: font }]}>•</Text>
                            <ML text={line} style={[styles.liText, { fontFamily: font }]} />
                          </View>
                        ))}
                      </>
                    )}

                    {!!r.steps?.length && (
                      <>
                        <Text style={[styles.sectionTitle, { fontFamily: font }]}>{t.steps}</Text>
                        {r.steps.map((line, i) => (
                          <View key={i} style={styles.stepRow}>
                            <Text style={[styles.stepIdx, { fontFamily: font }]}>{i + 1}.</Text>
                            <ML text={line} style={[styles.liText, { fontFamily: font }]} />
                          </View>
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
  sectionTitle: { fontSize: 15, marginTop: 6, marginBottom: 8, color: "#333" },

  // 리스트 레이아웃
  liRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },

  bullet: { width: 16, textAlign: "center", lineHeight: 22, color: "#333", marginTop: 1 },
  stepIdx: { width: 22, textAlign: "right", lineHeight: 22, color: "#333", marginTop: 1 },

  liText: {
    flex: 1,
    lineHeight: 22,
    color: "#333",
    includeFontPadding: false,
  },

  closeBtn: { alignSelf: "center", marginTop: 12, paddingVertical: 10, paddingHorizontal: 16 },
  closeTxt: { color: "#333" },
});
