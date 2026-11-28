import React, { useState } from 'react';
import { Volume2, VolumeX, Pill, Sun, Sunset, Moon, Utensils, AlertCircle, X } from 'lucide-react';
import { Consultation } from '../../types';
import { speechService } from '../../services/speech';
import { AppLanguage, appLanguageToLocale } from '../../i18n/translations';

interface PrescriptionExplainerModalProps {
  consultation: Consultation | null;
  appLanguage: AppLanguage;
  onClose: () => void;
}

export const PrescriptionExplainerModal: React.FC<PrescriptionExplainerModalProps> = ({
  consultation,
  appLanguage,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!consultation) return null;

  // Generate vernacular spoken explanation from treatment plan
  const generateSpokenScript = (): string => {
    const plan = consultation.treatmentPlan || '';
    const advice = consultation.followUpAdvice || '';
    const lang = appLanguage.toLowerCase();

    if (lang === 'hi' || lang === 'hi-in') {
      return `डॉक्टर ने आपके लिए यह दवाइयाँ तय की हैं: ${plan}। कृपया ध्यान दें: गोलियाँ समय पर लें और डॉक्टर की सलाह का पालन करें: ${advice}। यदि कोई परेशानी हो तो तुरंत डॉक्टर से संपर्क करें।`;
    }
    if (lang === 'hinglish') {
      return `Doctor ne aapke liye ye medicines prescribe ki hain: ${plan}. Yaad rakhein ki dawai samay par aur khane ke baad lein. Doctor ka instruction hai: ${advice}. Course poora kijiye.`;
    }
    if (lang.startsWith('bn')) {
      return `ডাক্তার আপনার জন্য এই ওষুধগুলি দিয়েছেন: ${plan}। দয়া করে খাবারের পর নিয়মিত ওষুধ গ্রহণ করুন। ডাক্তারের পরামর্শ: ${advice}।`;
    }
    if (lang.startsWith('ta')) {
      return `மருத்துவர் உங்களுக்கு பரிந்துரைத்த மருந்துகள்: ${plan}. உணவுக்குப் பிறகு மருந்துகளை தவறாமல் உட்கொள்ளவும். ஆலோசனை: ${advice}.`;
    }
    if (lang.startsWith('te')) {
      return `వైద్యులు మీకు సూచించిన మందులు: ${plan}. భోజనం తర్వాత మందులు క్రమం తప్పకుండా తీసుకోండి. సలహా: ${advice}.`;
    }
    if (lang.startsWith('mr')) {
      return `डॉक्टरांनी आपल्यासाठी ही औषधे लिहून दिली आहेत: ${plan}. कृपया वेळेवर औषधे घ्या आणि डॉक्टरांचा सल्ला पाळा: ${advice}.`;
    }

    return `Your doctor has prescribed the following treatment plan: ${plan}. Please adhere strictly to the schedule: ${advice}. Contact your doctor if symptoms persist.`;
  };

  const handleToggleAudio = () => {
    if (isPlaying) {
      speechService.stopSpeaking();
      setIsPlaying(false);
    } else {
      const script = generateSpokenScript();
      const locale = appLanguageToLocale(appLanguage);
      setIsPlaying(true);
      speechService.speak(script, locale, () => {
        setIsPlaying(false);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                Dawai Samjho (Medication Explainer)
                <span className="text-[10px] bg-white/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                  Wispr Voice
                </span>
              </h3>
              <p className="text-xs text-teal-100">
                Spoken vernacular medicine guide for Indian patients
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              speechService.stopSpeaking();
              onClose();
            }}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Spoken Audio Banner */}
          <div className="p-4 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-2xl flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-teal-900 dark:text-teal-200">
                Listen in Your Native Language
              </h4>
              <p className="text-[11px] text-teal-700 dark:text-teal-400">
                Audio readback designed for low-literacy clarity
              </p>
            </div>
            <button
              onClick={handleToggleAudio}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                  : 'bg-teal-600 hover:bg-teal-700 text-white hover:scale-105'
              }`}
            >
              {isPlaying ? (
                <>
                  <VolumeX className="w-4 h-4" />
                  Stop Voice
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  Play Spoken Guide
                </>
              )}
            </button>
          </div>

          {/* Diagnosis & Treatment Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Doctor's Diagnosis
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {consultation.diagnosis || 'Clinical Assessment Recorded'}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400 tracking-wider flex items-center gap-1.5 mb-1.5">
                <Pill className="w-3.5 h-3.5" />
                Prescribed Treatment Plan
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                {consultation.treatmentPlan || 'None specifically detailed.'}
              </p>
            </div>

            {consultation.followUpAdvice && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Follow-up & Diet Advice
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {consultation.followUpAdvice}
                </p>
              </div>
            )}
          </div>

          {/* Quick Schedule Reference Badges */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl">
              <Sun className="w-4 h-4 mx-auto text-amber-500 mb-1" />
              <span className="font-bold text-amber-900 dark:text-amber-200 block text-[11px]">Subah (Morning)</span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400">After Breakfast</span>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-xl">
              <Sunset className="w-4 h-4 mx-auto text-orange-500 mb-1" />
              <span className="font-bold text-orange-900 dark:text-orange-200 block text-[11px]">Dopahar (Afternoon)</span>
              <span className="text-[10px] text-orange-700 dark:text-orange-400">After Lunch</span>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-xl">
              <Moon className="w-4 h-4 mx-auto text-indigo-500 mb-1" />
              <span className="font-bold text-indigo-900 dark:text-indigo-200 block text-[11px]">Raat (Night)</span>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-400">Before Sleeping</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5" />
            Always take medicines with a full glass of water.
          </span>
          <button
            onClick={() => {
              speechService.stopSpeaking();
              onClose();
            }}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
