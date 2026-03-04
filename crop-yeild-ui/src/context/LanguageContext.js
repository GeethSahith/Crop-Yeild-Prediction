import React, { createContext, useState, useContext } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('app_lang') || 'en';
  });

  const changeLanguage = (newLang) => {
    localStorage.setItem('app_lang', newLang);
    setLang(newLang);
  };

  const t = (key, vars = {}) => {
    let text = translations?.[lang]?.[key] || key;

    Object.keys(vars).forEach((k) => {
      text = text.replace(`{{${k}}}`, vars[k]);
    });

    return text;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);