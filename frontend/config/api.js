// config/api.js
import Constants from "expo-constants";
import { Platform } from "react-native";

/** ========= BASE 둘로 분리 (Main=Gemini/레시피, YT=YouTube) ========= */
const extra = Constants?.expoConfig?.extra ?? {};

// 전용 키 우선 사용. (기존 EXPO_PUBLIC_API_BASE는 무시)
const fromEnvMain   = process.env?.EXPO_PUBLIC_API_BASE_MAIN;
const fromExtraMain = extra?.EXPO_PUBLIC_API_BASE_MAIN;

const fromEnvYt     = process.env?.EXPO_PUBLIC_API_BASE_YT || process.env?.EXPO_PUBLIC_YT_BASE;
const fromExtraYt   = extra?.EXPO_PUBLIC_API_BASE_YT       || extra?.EXPO_PUBLIC_YT_BASE;

// 기본값: 안드/실기기에서 LAN IP
const guessMain = Platform.select({
  android: "http://192.168.219.57:8080", // ✅ Gemini/레시피 서버
  ios:     "http://localhost:8080",
  default: "http://localhost:8080",
});
const guessYt = Platform.select({
  android: "http://192.168.219.58:8080", // ✅ YouTube 서버
  ios:     "http://localhost:8080",
  default: "http://localhost:8080",
});

let MAIN = String(fromEnvMain || fromExtraMain || guessMain).replace(/\/+$/g, "");
let YT   = String(fromEnvYt   || fromExtraYt   || guessYt).replace(/\/+$/g, "");

export const getApiBaseMain = () => MAIN;
export const setApiBaseMain = (v) => { MAIN = String(v || MAIN).replace(/\/+$/g, ""); };

export const getApiBaseYt   = () => YT;
export const setApiBaseYt   = (v) => { YT   = String(v || YT).replace(/\/+$/g, ""); };

const join = (base, path) => `${base}/${String(path).replace(/^\/+/, "")}`;

/** ========= 공용 fetch ========= */
async function apiFetchBase(base, path, { method="GET", headers={}, body, timeout=30000 } = {}) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(join(base, path), {
      method,
      headers: { Accept: "application/json", ...headers },
      body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
      signal: ctrl.signal,
    });
    const txt = await res.text().catch(() => "");
    if (!res.ok) throw new Error(`HTTP ${res.status} ${txt.slice(0, 200)}`);
    try { return JSON.parse(txt); } catch { return txt; }
  } finally { clearTimeout(to); }
}

// Main 서버용
export const apiGetMain  = (path, timeout)       => apiFetchBase(MAIN, path, { method: "GET", timeout });
export const apiPostMain = (path, data, timeout) => apiFetchBase(MAIN, path, { method: "POST", headers: { "Content-Type": "application/json" }, body: data, timeout });

// YT 서버용
export const apiGetYt    = (path, timeout)       => apiFetchBase(YT,   path, { method: "GET", timeout });

/** ========= 기존 헬퍼 (호환 위해 유지) ========= */
// IngredientsSheet 등에서 쓰는 기존 이름 유지: apiPost → Main으로 보냄
export const apiPost = apiPostMain;

/** ========= 도메인별 API ========= */

// 1) 레시피(Gemini/Main)
export const postPrepare = (ingredients) =>
  apiPostMain("/api/recipes/prepare", { ingredients });

// 2) YouTube 먹방 검색 (유튜브 서버)
//    - 백엔드가 /api 유무, q/query 혼용일 수 있어 후보 경로 순차 시도
async function apiGetFirstFromYT(paths, timeout) {
  let lastErr;
  for (const p of paths) {
    try {
      console.log("[ytSearchMukbang] try:", getApiBaseYt() + p);
      return await apiGetYt(p, timeout);
    } catch (e) {
      console.warn("[ytSearchMukbang] fail:", p, e?.message || e);
      lastErr = e;
    }
  }
  throw lastErr || new Error("All YT endpoints failed");
}

export function ytSearchMukbang(rawQuery, lang = "ko", timeout = 30000) {
  const q = encodeURIComponent((rawQuery || "").trim());
  const l = encodeURIComponent(lang || "ko");

  // 우선순위: /api + q → /api + query → / + q → / + query
  const candidates = [
    `/api/youtube/search?q=${q}&lang=${l}`,
    `/api/youtube/search?query=${q}`,
    `/youtube/search?q=${q}&lang=${l}`,
    `/youtube/search?query=${q}`,
  ];
  return apiGetFirstFromYT(candidates, timeout);
}
