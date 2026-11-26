import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  voiceNavigationService,
  VoiceCommandAction,
  getSpokenFeedbackForIntent,
} from '../services/voiceNavigation';
import { translations } from '../i18n/translations';

type CommandHandler = (action: VoiceCommandAction) => boolean;

interface VoiceNavigationContextType {
  isListening: boolean;
  isSupported: boolean;
  toggleListening: (targetField?: string) => void;
  stopListening: () => void;
  startListening: (targetField?: string) => void;
  lastHeard: string | null;
  feedbackText: string | null;
  activeField?: string;
  setActiveField: (field?: string) => void;
  registerHandler: (scope: string, handler: CommandHandler) => () => void;
  speakFeedback: (message: string) => void;
}

const VoiceNavigationContext = createContext<VoiceNavigationContextType | undefined>(undefined);

export const VoiceNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { appLanguage, setAppLanguage, logout } = useAuth();
  const t = translations[appLanguage] || translations.en;

  const [isListening, setIsListening] = useState(false);
  const [activeField, setActiveField] = useState<string | undefined>(undefined);
  const [lastHeard, setLastHeard] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const handlersRef = useRef<Map<string, CommandHandler>>(new Map());
  const lastActionRef = useRef<{ intent: string; text: string; time: number } | null>(null);
  const isSupported = voiceNavigationService.isSupported();

  const speakFeedback = useCallback((message: string) => {
    voiceNavigationService.speakFeedback(message, appLanguage);
  }, [appLanguage]);

  const registerHandler = useCallback((scope: string, handler: CommandHandler) => {
    handlersRef.current.set(scope, handler);
    return () => {
      handlersRef.current.delete(scope);
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setActiveField(undefined);
  }, []);

  const handleAction = useCallback((action: VoiceCommandAction) => {
    // Prevent duplicate triggers of identical intent within 1200ms
    const now = Date.now();
    if (
      lastActionRef.current &&
      lastActionRef.current.intent === action.intent &&
      now - lastActionRef.current.time < 1200
    ) {
      return;
    }
    lastActionRef.current = { intent: action.intent, text: action.rawText, time: now };

    setLastHeard(action.rawText);

    // 1. Password security rejection
    if (action.intent === 'REJECT_SENSITIVE_FIELD') {
      const msg = 'Password dictation is disabled for security. Please type your password.';
      setFeedbackText(msg);
      speakFeedback(msg);
      return;
    }

    // 2. Global Language Switching (All 13 Languages)
    if (action.intent.startsWith('SELECT_LANGUAGE_') && action.language) {
      setAppLanguage(action.language);
      const msg = getSpokenFeedbackForIntent(action.intent, action.language);
      setFeedbackText(msg);
      speakFeedback(msg);
      return;
    }

    // 3. Global Sign Out
    if (action.intent === 'LOGOUT') {
      logout();
      const msg = getSpokenFeedbackForIntent('LOGOUT', appLanguage);
      setFeedbackText(msg);
      speakFeedback(msg);
      stopListening();
      return;
    }

    // 4. Global Theme Toggle
    if (action.intent === 'TOGGLE_THEME') {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        document.documentElement.classList.remove('dark');
        setFeedbackText('Switched to Light mode.');
      } else {
        document.documentElement.classList.add('dark');
        setFeedbackText('Switched to Dark mode.');
      }
      return;
    }

    // 5. Delegate to registered active scoped handlers (e.g. Auth, Patient, Doctor)
    let handled = false;
    for (const [, handler] of handlersRef.current.entries()) {
      if (handler(action)) {
        handled = true;
        break;
      }
    }

    if (!handled) {
      if (action.intent === 'FILL_FIELD') {
        setFeedbackText(`Dictated: "${action.value}"`);
      } else if (action.intent === 'UNKNOWN') {
        setFeedbackText(`Heard: "${action.rawText}"`);
        const clarification = getSpokenFeedbackForIntent('UNKNOWN', appLanguage);
        speakFeedback(clarification);
      } else {
        setFeedbackText(`Heard: "${action.rawText}"`);
      }
    }

    // Auto-clear feedback after 4 seconds
    setTimeout(() => {
      setFeedbackText(null);
    }, 4000);
  }, [appLanguage, setAppLanguage, logout, speakFeedback, stopListening]);

  const startListening = useCallback((targetField?: string) => {
    if (!isSupported) {
      setFeedbackText(t.voiceNavUnsupported);
      return;
    }

    stopListening();
    setActiveField(targetField);
    setIsListening(true);
    setFeedbackText(t.voiceNavListening);

    const rec = voiceNavigationService.listen(
      appLanguage,
      (action) => {
        handleAction(action);
      },
      (err) => {
        console.warn('Voice navigation error:', err);
        setIsListening(false);
        setFeedbackText(t.voiceNavMicDenied);
      },
      targetField
    );

    recognitionRef.current = rec;
  }, [isSupported, appLanguage, t, stopListening, handleAction]);

  const toggleListening = useCallback((targetField?: string) => {
    if (isListening) {
      stopListening();
    } else {
      startListening(targetField);
    }
  }, [isListening, stopListening, startListening]);

  // Clean up on unmount or language change
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return (
    <VoiceNavigationContext.Provider
      value={{
        isListening,
        isSupported,
        toggleListening,
        stopListening,
        startListening,
        lastHeard,
        feedbackText,
        activeField,
        setActiveField,
        registerHandler,
        speakFeedback,
      }}
    >
      {children}
    </VoiceNavigationContext.Provider>
  );
};

export const useVoiceNavigation = () => {
  const context = useContext(VoiceNavigationContext);
  if (!context) {
    throw new Error('useVoiceNavigation must be used within a VoiceNavigationProvider');
  }
  return context;
};
