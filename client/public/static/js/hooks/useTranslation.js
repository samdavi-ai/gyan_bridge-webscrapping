
import { TRANSLATIONS } from '../constants.js';

export const useTranslation = (lang) => {
    return (key) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en'][key] || key;
};
