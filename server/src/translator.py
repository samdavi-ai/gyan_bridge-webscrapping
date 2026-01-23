
import json
from deep_translator import GoogleTranslator

class ContentTranslator:
    def __init__(self, api_key=None):
        # API Key not needed for deep-translator
        self.cache = {} 
        self.disabled = False

    def translate_batch(self, items, target_lang):
        """
        Translates a list of dictionaries. 
        Expects items to have 'title' and 'snippet' keys.
        """
        if getattr(self, 'disabled', False) or target_lang == 'en':
             return items
            
        # Standardize lang codes (e.g. 'ta' -> 'ta', 'hi' -> 'hi')
        dest_lang = target_lang.lower()[:2]
        
        for item in items:
            for key in ['title', 'snippet']:
                if key in item and item[key]:
                    text = item[key]
                    item[key] = self.translate_text(text, dest_lang)
                    
        return items

    def translate_text(self, text, target_lang):
        """Translates a single string to target_lang."""
        if not text or target_lang == 'en': return text
        
        dest_lang = target_lang.lower()[:2]
        cache_key = (text, dest_lang)
        if cache_key in self.cache: return self.cache[cache_key]
        
        try:
            # Use deep-translator
            # It handles creating a new instance for each call or we can instantiate one if we want multiple, 
            # but creating one per request is safer for threading if it's lightweight. 
            # Actually, per docs, it's fine.
            translated = GoogleTranslator(source='auto', target=dest_lang).translate(text)
            
            if translated:
                self.cache[cache_key] = translated
                return translated
            return text
        except Exception as e:
            print(f"Translation error ({dest_lang}): {e}")
            return text

