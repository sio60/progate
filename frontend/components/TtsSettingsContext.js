// components/TtsSettingsContext.js
import React, { createContext, useContext, useMemo, useState } from "react";

const Ctx = createContext(null);

export function TtsSettingsProvider({ children }) {
  const [koVoiceId, setKoVoiceId] = useState(null);
  const [enVoiceId, setEnVoiceId] = useState(null);
  const [jaVoiceId, setJaVoiceId] = useState(null);

  const value = useMemo(
    () => ({
      koVoiceId, enVoiceId, jaVoiceId,
      setKoVoiceId, setEnVoiceId, setJaVoiceId,
    }),
    [koVoiceId, enVoiceId, jaVoiceId]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTtsSettings() {
  return useContext(Ctx) || {};
}
