import React, { createContext, useContext, useMemo, useState } from "react";
import { useFonts } from "expo-font";
import { Platform } from "react-native";

// 컨텍스트 직접 export (Provider 쓰려면 이게 필요)
export const GlobalLang = createContext(null);

// 언어 → fontFamily 키 (키는 useFonts의 key와 반드시 일치)
const FONT_BY_LANG = {
  ko: "Unheo",
  en: "Brush",
  ja: "Tegomin",
};

export function GlobalLangProvider({ children }) {
  // ⚠ 키 이름이 곧 fontFamily 값
  const [fontsLoaded] = useFonts({
    Unheo: require("../assets/font/NYJUnheo.ttf"),
    Brush: require("../assets/font/NanumBrushScript-Regular.ttf"),
    Tegomin: require("../assets/font/NewTegomin-Regular.ttf"),
  });

  const [lang, setLang] = useState("ko");
  const [footerH, setFooterH] = useState(0);

  const font = useMemo(() => {
    const want = FONT_BY_LANG[lang] || "Unheo";
    // 로딩 전 임시 폴백 (원하면 그냥 want 반환해도 됨)
    return fontsLoaded ? want : Platform.select({ ios: "System", android: "sans-serif" });
  }, [fontsLoaded, lang]);

  const value = useMemo(
    () => ({ lang, setLang, font, footerH, setFooterH }),
    [lang, font, footerH]
  );

  return <GlobalLang.Provider value={value}>{children}</GlobalLang.Provider>;
}

export function useGlobalLang() {
  return useContext(GlobalLang);
}
