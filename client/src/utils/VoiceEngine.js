/**
 * JURIS Voice Engine - Intelligent Voice Selection
 * Syncs browser TTS voices with i18n state for multi-lingual legal assistant
 * Based on voicebot_logic.md specification
 */
class VoiceEngine {
    constructor(i18nInstance) {
        this.i18n = i18nInstance;

        // Voice profile preferences for each language
        this.voiceProfiles = {
            'en': { lang: 'en-IN', keywords: ['Google', 'India', 'English', 'Microsoft'] },
            'ta': { lang: 'ta-IN', keywords: ['Valluvar', 'Google', 'Tamil'] },
            'hi': { lang: 'hi-IN', keywords: ['Google', 'Hindi', 'Kalpana', 'Microsoft'] }
        };

        // Ensure voices are loaded
        this.voices = [];
        this.loadVoices();

        // Some browsers need event listener for voices
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = () => {
                this.loadVoices();
            };
        }
    }

    loadVoices() {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            this.voices = window.speechSynthesis.getVoices();
        }
    }

    /**
     * Smart voice selection algorithm
     * Priority: 1. Exact lang + quality keyword match
     *           2. Any voice in target language
     *           3. Fallback to first available voice
     */
    selectVoice(locale) {
        const profile = this.voiceProfiles[locale] || this.voiceProfiles['en'];

        if (!this.voices.length) {
            this.loadVoices();
        }

        // Priority 1: Exact match with quality keywords (Google/Microsoft)
        let selected = this.voices.find(v =>
            v.lang === profile.lang && profile.keywords.some(k => v.name.includes(k))
        );

        // Priority 2: Any voice in target language
        if (!selected) {
            selected = this.voices.find(v => v.lang === profile.lang);
        }

        // Priority 3: Broader language match (e.g., en-IN matches en-US)
        if (!selected) {
            const langPrefix = profile.lang.split('-')[0];
            selected = this.voices.find(v => v.lang.startsWith(langPrefix));
        }

        return selected;
    }

    /**
     * Speak text using intelligent voice selection
     * Applies pitch and rate optimization for natural assistant-like speech
     */
    speak(text, locale = null) {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            console.warn('Speech synthesis not available');
            return null;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const currentLocale = locale || this.i18n.language;
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = this.selectVoice(currentLocale);

        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
            console.log(`🎙️ Using voice: ${voice.name} (${voice.lang})`);
        } else {
            // Fallback to language code
            const profile = this.voiceProfiles[currentLocale] || this.voiceProfiles['en'];
            utterance.lang = profile.lang;
            console.warn(`⚠️ No specific voice found, using lang: ${utterance.lang}`);
        }

        // Audio engineering: Slightly higher pitch for clarity
        utterance.pitch = 1.05;
        utterance.rate = 1.0;  // Normal speed

        window.speechSynthesis.speak(utterance);
        return utterance;
    }

    /**
     * Cancel current speech
     */
    cancel() {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }

    /**
     * Get available voices for debugging
     */
    getAvailableVoices() {
        return this.voices.map(v => ({
            name: v.name,
            lang: v.lang,
            default: v.default
        }));
    }
}

export default VoiceEngine;
