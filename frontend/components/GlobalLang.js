import React, { createContext, useContext } from 'react';

export const GlobalLang = createContext({
  lang: 'ko',
  setLang: () => {},
  font: 'Unheo',
  footerH: 0,
  setFooterH: () => {},
});

export const useGlobalLang = () => useContext(GlobalLang);
export default GlobalLang;
