import React from 'react';
import { Mic, MicOff, Sparkles } from 'lucide-react';
import { useVoiceNavigation } from '../../contexts/VoiceNavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { languageOptions, translations } from '../../i18n/translations';

export const VoiceNavigationBanner: React.FC = () => {
  const { isListening, isSupported, toggleListening, lastHeard, feedbackText, activeField } = useVoiceNavigation();
  const { appLanguage } = useAuth();
  const t = translations[appLanguage] || translations.en;

  const currentOpt = languageOptions.find((o) => o.code === appLanguage);

  if (!isSupported) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {/* Visual Feedback Popup */}
      {(lastHeard || feedbackText || isListening) && (
        <div className="pointer-events-auto max-w-sm sm:max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-teal-500/30 rounded-2xl p-3.5 shadow-2xl space-y-2 animate-fade-in text-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isListening ? 'bg-red-500 animate-ping' : 'bg-teal-500'}`} />
              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                {t.voiceAssistantTitle} ({currentOpt?.native || 'English'})
              </span>
            </div>
            {isListening && (
              <span className="text-[10px] uppercase font-bold text-red-600 bg-red-100 dark:bg-red-950 px-2 py-0.5 rounded-full animate-pulse">
                {t.voiceLiveMic}
              </span>
            )}
          </div>

          {lastHeard && (
            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-slate-700 dark:text-slate-300">
              <span className="text-teal-600 dark:text-teal-400 font-bold mr-1.5">{t.voiceHeardPrefix}</span>
              <span className="italic font-medium">&ldquo;{lastHeard}&rdquo;</span>
              {activeField && (
                <span className="ml-1 text-[10px] bg-teal-200 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-1.5 py-0.5 rounded font-bold">
                  {activeField}
                </span>
              )}
            </div>
          )}

          {feedbackText && (
            <div className="text-[11px] text-teal-700 dark:text-teal-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-teal-500" />
              <span>{feedbackText}</span>
            </div>
          )}
        </div>
      )}

      {/* Persistent Floating Microphone Button */}
      <button
        type="button"
        onClick={() => toggleListening()}
        title={isListening ? t.voiceNavStopped : `${t.voiceNavListening} (${currentOpt?.native || 'English'})`}
        className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-full font-extrabold text-xs shadow-xl transition-all transform hover:scale-105 active:scale-95 ${
          isListening
            ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/30 ring-4 ring-red-400/40 animate-pulse'
            : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/30'
        }`}
      >
        {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        <span className="hidden sm:inline">
          {isListening ? t.voiceNavListening : t.voiceNavIdle}
        </span>
      </button>
    </div>
  );
};
