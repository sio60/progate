import Constants from "expo-constants";

/** ───────────────── 키/모델 로딩 ───────────────── */
const KEY = String(
  process.env?.EXPO_PUBLIC_GEMINI_API_KEY ??
  Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEMINI_API_KEY ??
  ""
).trim().replace(/^"(.*)"$/, "$1"); // 양끝 따옴표 제거

// v1beta에서 generateContent 지원되는 플래시 계열 기본값
const MODEL =
  (process.env?.EXPO_PUBLIC_GEMINI_MODEL ||
   Constants?.expoConfig?.extra?.EXPO_PUBLIC_GEMINI_MODEL ||
   "gemini-2.0-flash").trim();

const ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;

if (!KEY) {
  console.warn("[gemini] 🚫 API key missing. Set EXPO_PUBLIC_GEMINI_API_KEY.");
} else {
  console.log(`[gemini] ✅ Key loaded (len=${KEY.length}, tail=...${KEY.slice(-6)})`);
}

/** ───────────────── 프롬프트 ───────────────── */
const LANG_NAME = { ko: "Korean", en: "English", ja: "Japanese" };

function buildUserPrompt({ ingredients, lang = "ko", servings = 2, timeMax = 60 }) {
  const list = ingredients.map((s) => `- ${s}`).join("\n");
  const target = LANG_NAME[lang] || "Korean";
  return `
You are a professional home-style Korean food assistant.
Return strict JSON only (no markdown, no extra text).
Language for "name" and "steps" must be ${target}.
Prefer recipes feasible with user's ingredients (allow pantry staples).
Servings ≈ ${servings}, total time ≈ ${timeMax} minutes.

User ingredients:
${list}
`;
}

/** ───────────────── fetch + timeout ───────────────── */
async function fetchWithTimeout(url, { timeout = 30000, ...opts } = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

/** ───────────────── JSON 파싱 보강 ───────────────── */
function tryParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // 모델이 앞/뒤에 잡담을 붙였을 경우 마지막 중괄호까지 잘라 재시도
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const sliced = text.slice(start, end + 1);
      try { return JSON.parse(sliced); } catch {}
    }
    return null;
  }
}

/** ───────────────── 후처리: UI 친화 포맷 ───────────────── */
function formatQty(n) {
  if (typeof n !== "number" || isNaN(n)) return "";
  const v = Math.round(n * 10) / 10;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function toIngredientLabel(it) {
  if (!it) return "";
  const name = (it.name || "").trim();
  const q = typeof it.qty === "number" ? formatQty(it.qty) : "";
  const unit = (it.unit || "").trim();
  const note = it.note ? ` (${String(it.note).trim()})` : "";
  const qtyUnit = [q, unit].filter(Boolean).join("");
  return [name, qtyUnit].filter(Boolean).join(" ") + note;
}

/** ───────────────── 단일언어 호출기 ─────────────────
 *  input: { ingredients: string[], lang?: 'ko'|'en'|'ja', servings?: number, timeMax?: number }
 *  return: { raw, name, ingredientsText[], steps[] }
 */
export async function generateAiRecipe({ ingredients, lang = "ko", servings = 2, timeMax = 60 }) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw new Error("ingredients must be a non-empty array");
  }
  if (!KEY) {
    throw new Error("Gemini API key is missing (EXPO_PUBLIC_GEMINI_API_KEY).");
  }

  const body = {
    generationConfig: {
      temperature: 0.6,
      topP: 0.95,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      // v1beta 대응: additionalProperties 사용 안 함
      responseSchema: {
        type: "object",
        required: ["name", "ingredients", "steps"],
        properties: {
          name: { type: "string" },
          servings: { type: "integer" },
          timeMinutes: { type: "integer" },
          ingredients: {
            type: "array",
            items: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string" },
                qty: { type: "number" },
                unit: { type: "string" },
                note: { type: "string" }
              }
            }
          },
          steps: { type: "array", items: { type: "string" } }
        }
      }
    },
    contents: [
      { role: "user", parts: [{ text: buildUserPrompt({ ingredients, lang, servings, timeMax }) }] }
    ]
  };

  const res = await fetchWithTimeout(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeout: 30000
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn("[gemini] HTTP fail:", res.status, text || res.statusText);
    // 404: 모델명/버전 불일치, 400: 스키마/페이로드, 403: 권한/쿼터
    if (res.status === 404) {
      throw new Error(`[Gemini] Model not found on v1beta: "${MODEL}"`);
    }
    if (res.status === 403) {
      throw new Error("[Gemini] Permission or quota issue (403). Check key & API enablement.");
    }
    throw new Error(`[Gemini] HTTP ${res.status}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  const data = tryParseJson(text);
  if (!data) throw new Error("Failed to parse JSON from Gemini.");

  const ingredientsText = Array.isArray(data.ingredients)
    ? data.ingredients.map(toIngredientLabel).filter(Boolean)
    : [];

  return {
    raw: data,
    name: (data.name || "").trim(),
    ingredientsText,
    steps: Array.isArray(data.steps) ? data.steps.map((s) => String(s).trim()).filter(Boolean) : []
  };
}

/** ───────────────── 멀티랭 호출기(ko/en/ja 동시) ─────────────────
 *  return: { byLang: { ko:{name,ingredients[],steps[]}, en:{...}, ja:{...} } }
 */
export async function generateAiRecipeMulti({ ingredients, servings = 2, timeMax = 60 }) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw new Error("ingredients must be a non-empty array");
  }
  if (!KEY) throw new Error("Gemini API key is missing (EXPO_PUBLIC_GEMINI_API_KEY).");

  const list = ingredients.map((s) => `- ${s}`).join("\n");

  const prompt = `
You are a professional home-style Korean food assistant.
Return strict JSON ONLY with three top-level keys: "ko", "en", "ja". No markdown, no extra text.

For each locale, the schema is:
{
  "name": string,          // dish name in that language
  "ingredients": string[], // each item already localized like "배추 300g" / "Cabbage 300 g" / "白菜 300g"
  "steps": string[]        // short sequential steps in that language
}

Constraints:
- Use user's ingredients when possible; pantry staples allowed (oil, salt, pepper, soy sauce, sugar, garlic).
- Servings ≈ ${servings}, total time ≈ ${timeMax} minutes.
- Keep numeric values consistent across locales. Localize units:
  ko: 컵 / 큰술 / 작은술 / g / ml
  en: cup / Tbsp / tsp / g / ml
  ja: カップ / 大さじ / 小さじ / g / ml

User ingredients:
${list}
`;

  const body = {
    generationConfig: {
      temperature: 0.6,
      topP: 0.95,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      // v1beta: additionalProperties 사용 금지
      responseSchema: {
        type: "object",
        required: ["ko", "en", "ja"],
        properties: {
          ko: {
            type: "object",
            required: ["name", "ingredients", "steps"],
            properties: {
              name: { type: "string" },
              ingredients: { type: "array", items: { type: "string" } },
              steps: { type: "array", items: { type: "string" } }
            }
          },
          en: {
            type: "object",
            required: ["name", "ingredients", "steps"],
            properties: {
              name: { type: "string" },
              ingredients: { type: "array", items: { type: "string" } },
              steps: { type: "array", items: { type: "string" } }
            }
          },
          ja: {
            type: "object",
            required: ["name", "ingredients", "steps"],
            properties: {
              name: { type: "string" },
              ingredients: { type: "array", items: { type: "string" } },
              steps: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    },
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  };

  const res = await fetchWithTimeout(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeout: 30000
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn("[gemini] HTTP fail:", res.status, text || res.statusText);
    if (res.status === 404) throw new Error(`[Gemini] Model not found on v1beta: "${MODEL}"`);
    if (res.status === 403) throw new Error("[Gemini] Permission or quota issue (403). Check key & API enablement.");
    throw new Error(`[Gemini] HTTP ${res.status}`);
  }

  const json = await res.json();
  const txt = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  const data = tryParseJson(txt);
  if (!data) throw new Error("Failed to parse JSON from Gemini (multi).");

  const byLang = {
    ko: {
      name: String(data?.ko?.name || "").trim(),
      ingredients: Array.isArray(data?.ko?.ingredients) ? data.ko.ingredients.map(String) : [],
      steps: Array.isArray(data?.ko?.steps) ? data.ko.steps.map(String) : []
    },
    en: {
      name: String(data?.en?.name || "").trim(),
      ingredients: Array.isArray(data?.en?.ingredients) ? data.en.ingredients.map(String) : [],
      steps: Array.isArray(data?.en?.steps) ? data.en.steps.map(String) : []
    },
    ja: {
      name: String(data?.ja?.name || "").trim(),
      ingredients: Array.isArray(data?.ja?.ingredients) ? data.ja.ingredients.map(String) : [],
      steps: Array.isArray(data?.ja?.steps) ? data.ja.steps.map(String) : []
    }
  };

  return { byLang };
}

/** (옵션) 현재 키가 접근 가능한 모델 목록 점검용 */
export async function listModels() {
  if (!KEY) throw new Error("Missing API key.");
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(KEY)}`;
  const res = await fetchWithTimeout(url, { method: "GET", timeout: 15000 });
  if (!res.ok) throw new Error(`ListModels HTTP ${res.status}`);
  const j = await res.json();
  return j?.models?.map((m) => m.name) ?? [];
}
// ⬇️ config/gemini.js 맨 아래쪽(다른 export들 아래)에 붙여넣기
export async function generateAiRecipeByName({
  dish,
  lang = "ko",
  servings = 2,
  timeMax = 60,
}) {
  if (!dish || !String(dish).trim()) {
    throw new Error("dish is required");
  }
  if (!KEY) {
    throw new Error("Gemini API key is missing (EXPO_PUBLIC_GEMINI_API_KEY).");
  }

  const target = LANG_NAME[lang] || "Korean";

  // 프롬프트: 정확히 UI가 기대하는 스키마로 강제
  const prompt = `
You are a professional home-style Korean food assistant.
User wants a detailed recipe for the dish by name.

Return STRICT JSON ONLY (no markdown, no extra text) in ${target} with this schema:

{
  "title": string,          // dish name in ${target}
  "category": string,       // e.g., stew, noodle, stir-fry (localized)
  "timeMin": integer,       // total time in minutes
  "servings": integer,      // default ${servings}
  "difficulty": string,     // e.g., Easy / Medium / Hard (localized)
  "ingredients": [          // structured list; localize units
    { "name": string, "qty": number, "unit": string }
  ],
  "steps": [
    { "order": integer, "text": string }
  ]
}

Constraints:
- Dish name: "${String(dish).trim()}"
- Language: ${target} (all fields)
- Servings ≈ ${servings}, total time ≈ ${timeMax} minutes.
- Prefer authentic, home-style Korean approach.
- Use pantry staples when needed (oil, salt, pepper, soy sauce, sugar, garlic).
- Keep numbers consistent and realistic.
- Localize units:
  ko: 컵 / 큰술 / 작은술 / g / ml
  en: cup / Tbsp / tsp / g / ml
  ja: カップ / 大さじ / 小さじ / g / ml
`;

  const body = {
    generationConfig: {
      temperature: 0.6,
      topP: 0.95,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      // v1beta: responseSchema는 additionalProperties 없이 선언
      responseSchema: {
        type: "object",
        required: [
          "title",
          "category",
          "timeMin",
          "servings",
          "difficulty",
          "ingredients",
          "steps",
        ],
        properties: {
          title: { type: "string" },
          category: { type: "string" },
          timeMin: { type: "integer" },
          servings: { type: "integer" },
          difficulty: { type: "string" },
          ingredients: {
            type: "array",
            items: {
              type: "object",
              required: ["name"],
              properties: {
                name: { type: "string" },
                qty: { type: "number" },
                unit: { type: "string" },
              },
            },
          },
          steps: {
            type: "array",
            items: {
              type: "object",
              required: ["text"],
              properties: {
                order: { type: "integer" },
                text: { type: "string" },
              },
            },
          },
        },
      },
    },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  };

  const res = await fetchWithTimeout(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    timeout: 30000,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn("[gemini] HTTP fail:", res.status, text || res.statusText);
    if (res.status === 404)
      throw new Error(`[Gemini] Model not found on v1beta: "${MODEL}"`);
    if (res.status === 403)
      throw new Error(
        "[Gemini] Permission or quota issue (403). Check key & API enablement."
      );
    throw new Error(`[Gemini] HTTP ${res.status}`);
  }

  const json = await res.json();
  const txt = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  const data = tryParseJson(txt);
  if (!data) throw new Error("Failed to parse JSON from Gemini (by name).");

  // 보정: 문자열로 온 재료/단계도 안전하게 구조화
  const normIng = (x) => {
    if (!x) return null;
    if (typeof x === "string") return { name: x, qty: null, unit: null };
    const name = String(x.name ?? "").trim();
    let qty = x.qty;
    if (typeof qty === "string") {
      const f = parseFloat(qty.replace(/[^\d.]/g, ""));
      qty = isNaN(f) ? null : f;
    }
    if (typeof qty !== "number" || isNaN(qty)) qty = null;
    const unit = x.unit != null ? String(x.unit).trim() : null;
    return name ? { name, qty, unit } : null;
  };

  const normStep = (x, i) => {
    if (!x) return null;
    if (typeof x === "string")
      return { order: i + 1, text: x.trim() };
    const text = String(x.text ?? "").trim();
    const order =
      typeof x.order === "number" && x.order > 0 ? x.order : i + 1;
    return text ? { order, text } : null;
  };

  const ingredients = Array.isArray(data.ingredients)
    ? data.ingredients.map(normIng).filter(Boolean)
    : [];

  const steps = Array.isArray(data.steps)
    ? data.steps.map(normStep).filter(Boolean)
    : [];

  return {
    title: String(data.title ?? "").trim(),
    category: String(data.category ?? "").trim(),
    timeMin:
      typeof data.timeMin === "number" && data.timeMin >= 0
        ? Math.round(data.timeMin)
        : null,
    servings:
      typeof data.servings === "number" && data.servings > 0
        ? Math.round(data.servings)
        : servings,
    difficulty: String(data.difficulty ?? "").trim(),
    ingredients,
    steps,
  };
}
