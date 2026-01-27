# Project: High-Tech Legal AI Voice Assistant (Web Integration)

## 1. Overview
This document outlines the architecture for a "Voice-First" Legal Assistant integrated into a web application. The system leverages the `i18n` library for state management, driving a multi-lingual AI that switches personality, voice, and language (English, Tamil, Hindi) dynamically.

---

## 2. Master System Prompt (The LLM Logic)
*Integrate this prompt into your backend (OpenAI/Anthropic/Llama). Ensure you pass the current website language code into the `{{CURRENT_LOCALE}}` variable.*

```text
### SYSTEM ROLE: JURIS - ADVANCED LEGAL VOICE ENGINE
**OPERATIONAL CONTEXT:**
- **Environment:** Web Application
- **Input Modality:** Voice-Transcribed Text
- **Output Modality:** Text-to-Speech (TTS) Optimized
- **Active Locale:** {{CURRENT_LOCALE}} (Source: i18n State)

### CORE DIRECTIVE
You are a highly advanced AI Legal Assistant. Your function is to provide accurate Indian legal guidance (BNS, IPC, CrPC) with the conversational fluidity of a smart speaker (Alexa/Siri).

### DYNAMIC LANGUAGE PROTOCOL (STRICT)
You must align your response style strictly with the user's selected website language:

**CASE A: IF {{CURRENT_LOCALE}} == 'en' (English)**
- **Persona:** "The Barrister" (Professional, Precise, Oxford/Indian English).
- **Style:** Use standard legal terminology. Be concise.
- **Output:** "Under Section 69 of the BNS, this act is classified as..."

**CASE B: IF {{CURRENT_LOCALE}} == 'ta' (Tamil)**
- **Persona:** "The Scholar" (Respectful, Clear, Empathetic).
- **Style:** Use high-quality Tamil (Senthamil) mixed with English for non-translatable legal terms (Tanglish is acceptable for clarity).
- **Output:** "சட்டப்பிரிவு (Section) 69-ன் படி, இது ஒரு குற்றமாகும்..."

**CASE C: IF {{CURRENT_LOCALE}} == 'hi' (Hindi)**
- **Persona:** "The Advisor" (Formal, Reassuring, Shuddh Hindi).
- **Style:** Use formal Hindi legal terms (e.g., 'Kanoon', 'Dhara') but keep it conversational.
- **Output:** "BNS ki Dhara 69 ke tehat, ye ek dandaniya apradh hai..."

### INTERACTION RULES (ALEXA-STYLE)
1.  **Brevity is Key:** Do not read 5 paragraphs. Give a 1-sentence summary, then ask: *"Shall I read the full clause?"*
2.  **Proactive Navigation:** If the user asks about a document, assume they want to draft it. *"I can help you draft a Rental Agreement. Should we start?"*
3.  **Visual Triggers:** You control the website UI. Append these tokens to the end of your response to trigger frontend actions:
    - `[UI:SHOW_CITATION_CARD]` -> When citing a specific law.
    - `[UI:OPEN_CONTACT_FORM]` -> If the user mentions "lawyer" or "court".
    - `[UI:ENABLE_MIC]` -> If you end with a question, keep the mic open.

### LEGAL GUARDRAILS
- **Disclaimer:** If the query implies immediate danger or complex litigation, start with: *"I am an AI. For court representation, please consult a human advocate."*
- **Jurisdiction:** Default to Indian Law (Bhartiya Nyaya Sanhita 2023) unless told otherwise.



3. Frontend Features & UI/UX (Webpage)
These features are designed to make the page feel "Alive" and interactive.

A. The "Neural" Mic Button (Canvas API)
Instead of a static icon, use a WebGL/Canvas animation.

Idle State: A slow-pulsing thin ring (Breathing effect).

Listening State: High-frequency waveform reacting to microphone input volume.

Processing State: A spinning "loader" ring in the specific language color (e.g., Orange for Hindi, Blue for English).

B. "Smart Glass" Transcripts
Implement a floating glassmorphism card at the bottom center of the viewport.

As the user speaks, text appears in real-time (using webkitSpeechRecognition.interimResults).

This gives the user immediate visual feedback that the bot is "hearing" them correctly.

C. The "Citation Sidebar" (Dynamic DOM)
Don't clutter the chat window with long legal texts.

Trigger: When the AI says [UI:SHOW_CITATION_CARD].

Action: A drawer slides out from the right side containing the full text of the Law/Section mentioned.

Benefit: Allows the user to read the law while listening to the summary.

D. Contextual "Quick Action" Chips
Floating buttons above the text input that change based on conversation context.

Context: Divorce/Family Law -> Chips: "Alimony Calculator", "Child Custody Rules".

Context: Business -> Chips: "Draft NDA", "Check Compliance".

4. Technical Logic: i18n ↔ Voice Bridge
Logic to sync the Web Language with the Browser's Voice Engine.

JavaScript

/**
 * INTELLIGENT VOICE SWITCHER
 * Syncs the browser's TTS voice with the website's i18n state.
 * * @param {string} text - The text response from the AI
 * @param {string} i18nLocale - Current state ('en', 'ta', 'hi')
 */
function speakAIResponse(text, i18nLocale) {
    if (!window.speechSynthesis) return;

    // 1. Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // 2. Define Voice Preferences (Priority List)
    // We prioritize Google/Microsoft voices as they sound more "AI-like"
    const voiceProfiles = {
        'en': { lang: 'en-IN', keywords: ['Google', 'India', 'English'] },
        'ta': { lang: 'ta-IN', keywords: ['Valluvar', 'Google', 'Tamil'] },
        'hi': { lang: 'hi-IN', keywords: ['Google', 'Hindi', 'Kalpana'] }
    };

    const profile = voiceProfiles[i18nLocale] || voiceProfiles['en'];

    // 3. Smart Voice Selection Algorithm
    const availableVoices = window.speechSynthesis.getVoices();
    let selectedVoice = availableVoices.find(v => 
        v.lang === profile.lang && profile.keywords.some(k => v.name.includes(k))
    );

    // Fallback: If no specific "High Quality" voice is found, find ANY voice in that language
    if (!selectedVoice) {
        selectedVoice = availableVoices.find(v => v.lang === profile.lang);
    }

    // 4. Apply Audio Engineering Settings
    if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = profile.lang;
        
        // Tweaking pitch/rate for a more "Assistant-like" feel
        utterance.pitch = 1.05; // Slightly higher is clearer
        utterance.rate = 1.0;   // Normal speed
    }

    // 5. Speak
    window.speechSynthesis.speak(utterance);
}
5. Implementation Checklist
[ ] State Management: Ensure your i18n toggle updates a global state variable (e.g., Redux, Vuex, or React Context).

[ ] Prompt Injection: When sending the user query to the backend, always append the hidden instructions regarding the current language.

[ ] Silence Detection: Implement a logic in the frontend that detects if the user stops speaking for 1.5 seconds, then automatically submits the query (simulates a real conversation without pressing "Send").