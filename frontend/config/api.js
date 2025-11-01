import Constants from "expo-constants";
import { Platform } from "react-native";

const extra = Constants.expoConfig?.extra ?? {};
const DEFAULT = Platform.OS === "android" ? "http://192.168.219.57:8080" : "http://localhost:8080";

// app.json → expo.extra.EXPO_PUBLIC_API_BASE 에 지정(실기기면 PC IP)
export const ORIGIN = String(extra.EXPO_PUBLIC_API_BASE || DEFAULT).replace(/\/+$/, "");

// 공용 fetch (30s 타임아웃)
export async function apiPost(path, body, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${ORIGIN}/${String(path).replace(/^\/+/, "")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: ctrl.signal,
    });
    const txt = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`HTTP ${res.status} ${txt?.slice(0, 200)}`);
    try { return JSON.parse(txt); } catch { return txt; }
  } finally {
    clearTimeout(to);
  }
}

// 사용 예: 재료 → 레시피
export const postPrepare = (ingredients) =>
  apiPost("/api/recipes/prepare", { ingredients });
