// config/api.js
import Constants from "expo-constants";
import { Platform } from "react-native";

/** ========= BASE 둘로 분리 (Main=Gemini/레시피, YT=YouTube) ========= */
const extra = Constants?.expoConfig?.extra ?? {};

const fromEnvMain   = process.env?.EXPO_PUBLIC_API_BASE_MAIN;
const fromExtraMain = extra?.EXPO_PUBLIC_API_BASE_MAIN;

const fromEnvYt     = process.env?.EXPO_PUBLIC_API_BASE_YT || process.env?.EXPO_PUBLIC_YT_BASE;
const fromExtraYt   = extra?.EXPO_PUBLIC_API_BASE_YT       || extra?.EXPO_PUBLIC_YT_BASE;

const guessMain = Platform.select({
  android: "http://192.168.219.57:8080", // 레시피 서버
  ios:     "http://localhost:8080",
  default: "http://localhost:8080",
});
const guessYt = Platform.select({
  android: "http://192.168.219.58:8080", // 유튜브 서버
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

// Main / YT 공용 GET/POST
export const apiGetMain  = (path, timeout)       => apiFetchBase(MAIN, path, { method: "GET", timeout });
export const apiPostMain = (path, data, timeout) => apiFetchBase(MAIN, path, { method: "POST", headers: { "Content-Type": "application/json" }, body: data, timeout });
export const apiGetYt    = (path, timeout)       => apiFetchBase(YT,   path, { method: "GET", timeout });

// (호환) 기존 이름
export const apiPost = apiPostMain;

/** ========= MAIN 서버 Fallback 유틸 ========= */
async function apiGetFirstFromMAIN(paths, timeout) {
  let lastErr;
  for (const p of paths) {
    try {
      console.log("[recipe GET]", getApiBaseMain() + p);
      return await apiGetMain(p, timeout);
    } catch (e) {
      console.warn("[recipe GET fail]", p, e?.message || e);
      lastErr = e;
    }
  }
  throw lastErr || new Error("All MAIN GET endpoints failed");
}
async function apiPostFirstFromMAIN(paths, data, timeout) {
  let lastErr;
  for (const p of paths) {
    try {
      console.log("[recipe POST]", getApiBaseMain() + p);
      return await apiPostMain(p, data, timeout);
    } catch (e) {
      console.warn("[recipe POST fail]", p, e?.message || e);
      lastErr = e;
    }
  }
  throw lastErr || new Error("All MAIN POST endpoints failed");
}

// 베이스가 이미 /api context-path로 끝나는지 체크 (…:8080/api 형태)
const baseHasContextApi = () => /\/api\/?$/.test(getApiBaseMain());

/** ========= 레시피 도메인 ========= */

// 1) 재료 → 레시피 생성 (POST)
export const postPrepare = (ingredients, timeout = 30000) => {
  const body = { ingredients };
  const paths = baseHasContextApi()
    ? ["/recipes/prepare"]         // base가 …/api면 여기로
    : ["/recipes/prepare"];    // base가 …:8080이면 여기로
  return apiPostFirstFromMAIN(paths, body, timeout);
};

// 2) 이름으로 레시피 검색 (GET)
export function searchRecipesByName(rawQuery, timeout = 30000) {
  const q = encodeURIComponent((rawQuery || "").trim());
  // query 우선, 보조로 q도 시도
  const paths = baseHasContextApi()
    ? [`/recipes/search?query=${q}`, `/recipes/search?q=${q}`]
    : [`/recipes/search?query=${q}`, `/recipes/search?q=${q}`];
  return apiGetFirstFromMAIN(paths, timeout);
}

/** ========= 유튜브 도메인 ========= */
async function apiGetFirstFromYT(paths, timeout) {
  let lastErr;
  for (const p of paths) {
    try {
      console.log("[yt GET]", getApiBaseYt() + p);
      return await apiGetYt(p, timeout);
    } catch (e) {
      console.warn("[yt GET fail]", p, e?.message || e);
      lastErr = e;
    }
  }
  throw lastErr || new Error("All YT endpoints failed");
}
export function ytSearchMukbang(rawQuery, lang = "ko", timeout = 30000) {
  const q = encodeURIComponent((rawQuery || "").trim());
  const l = encodeURIComponent(lang || "ko");
  const candidates = [
    `/api/youtube/search?q=${q}&lang=${l}`,
    `/api/youtube/search?query=${q}`,
    `/youtube/search?q=${q}&lang=${l}`,
    `/youtube/search?query=${q}`,
  ];
  return apiGetFirstFromYT(candidates, timeout);
}
