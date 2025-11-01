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
    check: "연결확인",
    pongOk: (code) => `통신 OK (HTTP ${code})`,
    netFail: "연결 실패: API_BASE/IP/방화벽 확인",
    timeout: "요청이 시간 초과됐어요(30s). 서버 지연 또는 IP 설정 확인",
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
    check: "Check",
    pongOk: (code) => `Reachable (HTTP ${code})`,
    netFail: "Network failed: check API_BASE/IP/firewall",
    timeout: "Request timed out (30s). Server slow or wrong IP",
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
    check: "接続確認",
    pongOk: (code) => `到達 (HTTP ${code})`,
    netFail: "接続失敗: API/IP/Firewallを確認",
    timeout: "タイムアウト(30秒)。サーバ遅延またはIP設定を確認",
  },
};

// ✅ API BASE 우선순위: app.json(extra) → EXPO_PUBLIC_* → 10.0.2.2/localhost
const fromExtra = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE;
const fromEnv = process.env?.EXPO_PUBLIC_API_BASE;
const DEFAULT_BASE =
  Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";
const API_BASE = (fromExtra || fromEnv || DEFAULT_BASE).replace(/\/+$/, "");

// 공통 타임아웃 fetch
async function fetchWithTimeout(url, opt = {}, ms = 30000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opt, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export default function IngredientsSheet({ visible, onClose }) {
  const { lang, font } = useGlobalLang();
  const t = useMemo(() => tMap[lang] ?? tMap.ko, [lang]);

  const [input, setInput] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); // [{id, food, ingredient, recipe}]
  const [err, setErr] = useState("");
  const [diag, setDiag] = useState("");

  const addItem = () => {
    const v = input.trim();
    if (!v) return;
    if (items.includes(v)) { setInput(""); return; }
    setItems((prev) => [...prev, v]);
    setInput("");
  };

  const removeItem = (v) => setItems((prev) => prev.filter((x) => x !== v));
  const resetAll   = () => { setItems([]); setResults([]); setErr(""); setDiag(""); setInput(""); };

  // 연결 확인(ping)
  const checkReachable = async () => {
    setDiag("…");
    try {
      const r = await fetchWithTimeout(`${API_BASE}/api/ping`, {}, 6000);
      setDiag(t.pongOk(r.status));
    } catch {
      setDiag(t.netFail);
    }
  };

  const requestRecipes = async () => {
    setErr(""); setResults([]);
    if (!items.length) { setErr(t.empty); return; }

    try {
      setLoading(true);
      const res = await fetchWithTimeout(`${API_BASE}/api/recipes/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ingredients: items }),
      }, 30000); // ⏱ 30s

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${text?.slice(0, 200)}`);
      }

      const json = await res.json().catch(() => null);
      if (!Array.isArray(json)) throw new Error("Invalid response shape");
      setResults(json);
    } catch (e) {
      const msg = e?.name === "AbortError"
        ? t.timeout
        : (String(e?.message || e).includes("Network request failed")
            ? t.netFail
            : String(e?.message || e));
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={[styles.title, { fontFamily: font }]}>{t.title}</Text>

          {/* 입력 */}
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
            {items.map((v) => (
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
              {loading ? <ActivityIndicator /> : <Text style={[styles.genTxt, { fontFamily: font }]}>{t.generate}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.pingBtn} onPress={checkReachable} disabled={loading}>
              <Text style={styles.pingTxt}>{t.check}</Text>
            </TouchableOpacity>
          </View>

          {!!diag && <Text style={styles.diag}>{diag}</Text>}

          {/* 에러 */}
          {!!err && <Text style={styles.err}>{err}</Text>}

          {/* 결과 */}
          {!!results.length && (
            <>
              <Text style={[styles.resultTitle, { fontFamily: font }]}>{t.result}</Text>
              <ScrollView style={styles.resultBox}>
                {results.map((it) => (
                  <View key={`${it.id}-${it.food}`} style={styles.card}>
                    <Text style={[styles.food, { fontFamily: font }]}>{it.food}</Text>
                    <Text style={styles.ing}>• {it.ingredient}</Text>
                    <Text style={styles.recipe}>{it.recipe}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {/* 닫기 */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={loading}>
            <Text style={[styles.closeTxt, { fontFamily: font }]}>{t.close}</Text>
          </TouchableOpacity>

          {/* 현재 API 주소(디버깅용) */}
          <Text style={styles.apiHint}>API: {API_BASE}</Text>
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
  genBtn: { backgroundColor: "#ffe98a", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  genBtnDisabled: { opacity: 0.5 },
  genTxt: { color: "#333", fontSize: 15 },
  pingBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  pingTxt: { color: "#666", fontSize: 12, textDecorationLine: "underline" },
  diag: { marginTop: 6, color: "#777", fontSize: 12, textAlign: "right" },
  err: { marginTop: 8, color: "#d22" },
  resultTitle: { marginTop: 16, fontSize: 16 },
  resultBox: { marginTop: 8, maxHeight: 320 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 12, marginBottom: 10 },
  food: { fontSize: 16, marginBottom: 6 },
  ing: { color: "#666", marginBottom: 6 },
  recipe: { lineHeight: 20, color: "#333" },
  closeBtn: { alignSelf: "center", marginTop: 12, paddingVertical: 10, paddingHorizontal: 16 },
  closeTxt: { color: "#333" },
  apiHint: { marginTop: 6, color: "#999", fontSize: 12, textAlign: "center" },
});
