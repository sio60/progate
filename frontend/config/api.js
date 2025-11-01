import Constants from "expo-constants";
import { Platform } from "react-native";

// 우선순위: .env(EXPO_PUBLIC_API_BASE) → app.json extra.EXPO_PUBLIC_API_BASE → 플랫폼 기본값
const fromEnv   = process.env?.EXPO_PUBLIC_API_BASE;
const fromExtra = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE;

const guess = Platform.select({
  android: "http://192.168.219.57:8080",   // 에뮬레이터일 때
  ios:     "http://localhost:8080",
  default: "http://localhost:8080",
});

let BASE = String(fromEnv || fromExtra || guess).replace(/\/+$/g, "");
export const getApiBase = () => BASE;
export const setApiBase = (v) => { BASE = String(v || BASE).replace(/\/+$/g, ""); };

const join = (path) => `${BASE}/${String(path).replace(/^\/+/, "")}`;

// 공용 fetch (문자/JSON 자동 처리 + 타임아웃)
export async function apiFetch(path, { method="GET", headers={}, body, timeout=30000 } = {}) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(join(path), {
      method,
      headers: { Accept: "application/json", ...headers },
      body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
      signal: ctrl.signal,
    });
    const txt = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`HTTP ${res.status} ${txt.slice(0, 200)}`);
    try { return JSON.parse(txt); } catch { return txt; } // JSON 아니면 원문 텍스트 반환
  } finally { clearTimeout(to); }
}

export const apiGet  = (path, timeout)          => apiFetch(path, { method: "GET", timeout });
export const apiPost = (path, data, timeout)    =>
  apiFetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: data, timeout });

// 편의 예시
export const postPrepare = (ingredients) => apiPost("/api/recipes/prepare", { ingredients });
