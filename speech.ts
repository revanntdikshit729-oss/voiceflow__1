// Multilingual Speech Recognition and Text-to-Speech Engine for VoiceFlow
// Supports 13 Indian languages with intelligent script detection and graceful browser fallbacks

import { LanguageCode } from '../types';

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export const speechService = {
  isRecognitionSupported(): boolean {
    return typeof window !== 'undefined' &&
      Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  },

  isSynthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },

  // Map LanguageCode to BCP-47 speech recognition locale
  getRecognitionLocale(language: LanguageCode): string {
    switch (language) {
      case 'bn-IN': return 'bn-IN';
      case 'ta-IN': return 'ta-IN';
      case 'te-IN': return 'te-IN';
      case 'mr-IN': return 'mr-IN';
      case 'gu-IN': return 'gu-IN';
      case 'kn-IN': return 'kn-IN';
      case 'ml-IN': return 'ml-IN';
      case 'pa-IN': return 'pa-IN';
      case 'or-IN': return 'or-IN';
      case 'as-IN': return 'as-IN';
      case 'hi-IN': return 'hi-IN';
      case 'hinglish': return 'hi-IN';
      case 'en-IN':
      default:
        return 'en-IN';
    }
  },

  startListening(language: LanguageCode, callbacks: SpeechRecognitionCallbacks) {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      if (callbacks.onError) callbacks.onError('Speech Recognition is not supported in this browser. Please use keyboard text input.');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = this.getRecognitionLocale(language);

    recognition.onstart = () => {
      if (callbacks.onStart) callbacks.onStart();
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      callbacks.onResult(final || interim, Boolean(final));
    };

    recognition.onerror = (event: any) => {
      console.warn(`Speech recognition event error (${recognition.lang}):`, event.error);
      let friendlyError = event.error;
      if (event.error === 'language-not-supported') {
        friendlyError = `Speech recognition for ${language} is not supported by your current browser. You can type your update directly in the text area.`;
      } else if (event.error === 'not-allowed') {
        friendlyError = 'Microphone permission was denied. Please allow microphone access or use typing.';
      }
      if (callbacks.onError) callbacks.onError(friendlyError);
    };

    recognition.onend = () => {
      if (callbacks.onEnd) callbacks.onEnd();
    };

    try {
      recognition.start();
      return recognition;
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      if (callbacks.onError) callbacks.onError(err.message || 'Microphone activation error');
      return null;
    }
  },

  // Sanitizes text for natural, human-like speech output (strips technical markup, JSON tokens, symbols)
  sanitizeForSpeech(text: string): string {
    return text
      // Remove code fences and markdown
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`.*?`/g, '')
      .replace(/[*_#~]/g, '')
      // Remove JSON artifacts if any slipped in
      .replace(/\{.*?\}|\[.*?\]/g, '')
      .replace(/([a-zA-Z]+):\s*/g, '$1, ')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  },

  // Picks the most natural, human-sounding voice available on the device for the given language
  getBestVoice(language: LanguageCode, text: string): SpeechSynthesisVoice | null {
    if (!this.isSynthesisSupported()) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Detect script from text
    const hasDevanagari = /[\u0900-\u097F]/.test(text); // Hindi, Marathi
    const hasBengali = /[\u0980-\u09FF]/.test(text);    // Bengali, Assamese
    const hasTamil = /[\u0B80-\u0BFF]/.test(text);      // Tamil
    const hasTelugu = /[\u0C00-\u0C7F]/.test(text);     // Telugu
    const hasKannada = /[\u0C80-\u0CFF]/.test(text);    // Kannada
    const hasMalayalam = /[\u0D00-\u0D7F]/.test(text);  // Malayalam
    const hasGujarati = /[\u0A80-\u0AFF]/.test(text);   // Gujarati
    const hasGurmukhi = /[\u0A00-\u0A7F]/.test(text);   // Punjabi
    const hasOdia = /[\u0B00-\u0B7F]/.test(text);       // Odia

    // 1. Bengali / Assamese
    if (hasBengali || language === 'bn-IN' || language === 'as-IN') {
      const bnVoice = voices.find(
        (v) => (v.lang === 'bn-IN' || v.lang.startsWith('bn')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Bashkar'))
      ) || voices.find((v) => v.lang.startsWith('bn'));
      if (bnVoice) return bnVoice;
    }

    // 2. Tamil
    if (hasTamil || language === 'ta-IN') {
      const taVoice = voices.find(
        (v) => (v.lang === 'ta-IN' || v.lang.startsWith('ta')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Valluvar'))
      ) || voices.find((v) => v.lang.startsWith('ta'));
      if (taVoice) return taVoice;
    }

    // 3. Telugu
    if (hasTelugu || language === 'te-IN') {
      const teVoice = voices.find(
        (v) => (v.lang === 'te-IN' || v.lang.startsWith('te')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Mohan'))
      ) || voices.find((v) => v.lang.startsWith('te'));
      if (teVoice) return teVoice;
    }

    // 4. Marathi
    if (language === 'mr-IN') {
      const mrVoice = voices.find(
        (v) => (v.lang === 'mr-IN' || v.lang.startsWith('mr')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Aarohi'))
      ) || voices.find((v) => v.lang.startsWith('mr'));
      if (mrVoice) return mrVoice;
      // Marathi fallback to Hindi Devanagari voice
      const hiVoice = voices.find((v) => v.lang.startsWith('hi'));
      if (hiVoice) return hiVoice;
    }

    // 5. Gujarati
    if (hasGujarati || language === 'gu-IN') {
      const guVoice = voices.find(
        (v) => (v.lang === 'gu-IN' || v.lang.startsWith('gu')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Dhwani'))
      ) || voices.find((v) => v.lang.startsWith('gu'));
      if (guVoice) return guVoice;
    }

    // 6. Kannada
    if (hasKannada || language === 'kn-IN') {
      const knVoice = voices.find(
        (v) => (v.lang === 'kn-IN' || v.lang.startsWith('kn')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Gagan'))
      ) || voices.find((v) => v.lang.startsWith('kn'));
      if (knVoice) return knVoice;
    }

    // 7. Malayalam
    if (hasMalayalam || language === 'ml-IN') {
      const mlVoice = voices.find(
        (v) => (v.lang === 'ml-IN' || v.lang.startsWith('ml')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Midhun'))
      ) || voices.find((v) => v.lang.startsWith('ml'));
      if (mlVoice) return mlVoice;
    }

    // 8. Punjabi
    if (hasGurmukhi || language === 'pa-IN') {
      const paVoice = voices.find(
        (v) => (v.lang === 'pa-IN' || v.lang.startsWith('pa')) && (v.name.includes('Natural') || v.name.includes('Google'))
      ) || voices.find((v) => v.lang.startsWith('pa'));
      if (paVoice) return paVoice;
    }

    // 9. Odia
    if (hasOdia || language === 'or-IN') {
      const orVoice = voices.find(
        (v) => (v.lang === 'or-IN' || v.lang.startsWith('or')) && (v.name.includes('Natural') || v.name.includes('Google'))
      ) || voices.find((v) => v.lang.startsWith('or'));
      if (orVoice) return orVoice;
    }

    // 10. Hindi
    if (hasDevanagari || language === 'hi-IN') {
      const naturalHindi = voices.find(
        (v) => (v.lang === 'hi-IN' || v.lang.startsWith('hi')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Swara') || v.name.includes('Madhur'))
      ) || voices.find((v) => v.lang === 'hi-IN' || v.lang.startsWith('hi'));
      if (naturalHindi) return naturalHindi;
    }

    // 11. Hinglish
    if (language === 'hinglish') {
      const naturalIndianEng = voices.find(
        (v) => v.lang === 'en-IN' && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Heera') || v.name.includes('Neerja'))
      ) || voices.find((v) => v.lang === 'en-IN' || (v.lang.includes('IN') && v.lang.startsWith('en')));
      if (naturalIndianEng) return naturalIndianEng;
    }

    // 12. Indian English fallback
    const indEng = voices.find((v) => v.lang === 'en-IN');
    if (indEng) return indEng;

    // 13. System default English voice
    return voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
  },

  // Checks whether a native TTS voice is installed on this device for the requested language
  isVoiceAvailableForLanguage(language: LanguageCode, text?: string): boolean {
    if (!this.isSynthesisSupported()) return false;
    const voice = this.getBestVoice(language, text || '');
    if (!voice) return false;

    const localePrefix = language.split('-')[0];
    if (language === 'hinglish') return true;
    return voice.lang.toLowerCase().startsWith(localePrefix.toLowerCase()) || voice.lang.includes('IN');
  },

  speak(text: string, language: LanguageCode, onEnd?: () => void) {
    if (!this.isSynthesisSupported()) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      if (onEnd) onEnd();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const cleanText = this.sanitizeForSpeech(text);
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = this.getRecognitionLocale(language);

    // Human-like cadence: calm, empathetic tempo (0.92) with natural pitch (1.0)
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    const selectAndSpeak = () => {
      const voice = this.getBestVoice(language, cleanText);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis event error:', e);
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);
    };

    let executed = false;
    const safeSelectAndSpeak = () => {
      if (executed) return;
      executed = true;
      window.speechSynthesis.onvoiceschanged = null;
      selectAndSpeak();
    };

    // If voices are already loaded, speak immediately
    if (window.speechSynthesis.getVoices().length > 0) {
      safeSelectAndSpeak();
    } else {
      // Wait for voices to initialize
      window.speechSynthesis.onvoiceschanged = safeSelectAndSpeak;
      // Fallback trigger in case event already fired
      setTimeout(safeSelectAndSpeak, 120);
    }
  },

  stopSpeaking() {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
  },
};
