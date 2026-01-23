
import { TRANSLATIONS } from '../utils/constants';

const useTranslations = (lang) => {
    const t = (key) => {
        return TRANSLATIONS[lang]?.[key] || key;
    };
    return t;
};

export default useTranslations;
