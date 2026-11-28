import React, { useState } from 'react';
import { Mic, MicOff, Sparkles, Stethoscope } from 'lucide-react';
import { speechService } from '../../services/speech';
import { cleanWisprTranscript } from '../../services/wisprFlowEngine';

export interface ParsedConsultationData {
  chiefComplaints: string;
  baselineSymptoms: Array<{ symptom: string; severity: 'mild' | 'moderate' | 'severe'; notes?: string }>;
  diagnosis: string;
  treatmentPlan: string;
  followUpAdvice: string;
}

interface DoctorVoicePrescriptionPadProps {
  onParsedConsultation: (data: ParsedConsultationData) => void;
  patientName?: string;
}

export const DoctorVoicePrescriptionPad: React.FC<DoctorVoicePrescriptionPadProps> = ({
  onParsedConsultation,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [dictationTranscript, setDictationTranscript] = useState('');
  const [activeRecognition, setActiveRecognition] = useState<any>(null);

  const startDictation = () => {
    if (!speechService.isRecognitionSupported()) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    setDictationTranscript('');
    setIsRecording(true);

    const rec = speechService.startListening('en-IN', {
      onResult: (text: string) => {
        const cleaned = cleanWisprTranscript(text);
        setDictationTranscript(cleaned);
      },
      onError: (err: string) => {
        console.warn('Doctor dictation error:', err);
        setIsRecording(false);
      },
      onEnd: () => {
        setIsRecording(false);
      },
    });

    setActiveRecognition(rec);
  };

  const stopDictation = () => {
    if (activeRecognition) {
      try {
        activeRecognition.stop();
      } catch {}
      setActiveRecognition(null);
    }
    setIsRecording(false);
    parseSpokenConsultation(dictationTranscript);
  };

  const parseSpokenConsultation = (rawText: string) => {
    if (!rawText.trim()) return;

    // Intelligent heuristic extraction for clinical dictation
    const text = rawText.toLowerCase();

    // Extract diagnosis
    let diagnosis = 'Acute Upper Respiratory Tract Infection';
    const diagMatch = rawText.match(/(diagnosis|diagnosed with|impression|assessment)\s*(is|as)?\s*:?\s*([^,.]+)/i);
    if (diagMatch && diagMatch[3]) {
      diagnosis = diagMatch[3].trim();
    } else if (text.includes('bronchitis')) {
      diagnosis = 'Acute Bronchitis';
    } else if (text.includes('fever') || text.includes('flu') || text.includes('influenza')) {
      diagnosis = 'Viral Pyrexia / Flu Syndrome';
    } else if (text.includes('pharyngitis') || text.includes('throat')) {
      diagnosis = 'Acute Viral Pharyngitis';
    }

    // Extract symptoms
    const symptoms: Array<{ symptom: string; severity: 'mild' | 'moderate' | 'severe' }> = [];
    if (/fever|temperature|bukhar|pyrexia/i.test(text)) {
      symptoms.push({ symptom: 'Fever', severity: 'moderate' });
    }
    if (/cough|khansi/i.test(text)) {
      symptoms.push({ symptom: 'Cough', severity: 'mild' });
    }
    if (/headache|sar dard|migraine/i.test(text)) {
      symptoms.push({ symptom: 'Headache', severity: 'moderate' });
    }
    if (/body ache|pain|myalgia|weakness/i.test(text)) {
      symptoms.push({ symptom: 'Body Ache / Fatigue', severity: 'moderate' });
    }
    if (symptoms.length === 0) {
      symptoms.push({ symptom: 'Reported Clinical Symptoms', severity: 'moderate' });
    }

    // Extract treatment plan
    let treatmentPlan = 'Paracetamol 650mg TDS for 3 days, Levocetirizine 5mg HS, Steam inhalation BD';
    const rxMatch = rawText.match(/(prescribe|prescribed|prescription|treatment|medicines?|rx)\s*:?\s*([^.]*)/i);
    if (rxMatch && rxMatch[2]) {
      treatmentPlan = rxMatch[2].trim();
    }

    // Extract follow-up
    let followUpAdvice = 'Increase fluid intake, rest for 3 days, review in clinic if fever persists beyond 72 hours.';
    const followMatch = rawText.match(/(review|follow up|advice|advise)\s*(in|after)?\s*:?\s*([^.]*)/i);
    if (followMatch && followMatch[3]) {
      followUpAdvice = followMatch[3].trim();
    }

    onParsedConsultation({
      chiefComplaints: symptoms.map((s) => s.symptom).join(', '),
      baselineSymptoms: symptoms.map((s) => ({ symptom: s.symptom, severity: s.severity })),
      diagnosis,
      treatmentPlan,
      followUpAdvice,
    });
  };

  return (
    <div className="p-4 bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-indigo-500/10 border border-teal-500/20 rounded-2xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-teal-600 text-white rounded-lg">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              Wispr Clinical Dictation Pad
              <span className="text-[10px] bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-extrabold px-1.5 py-0.5 rounded-full">
                Fast EHR
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Dictate diagnosis, prescriptions & follow-up naturally in English or Hinglish
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={isRecording ? stopDictation : startDictation}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
            isRecording
              ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
              : 'bg-teal-600 hover:bg-teal-700 text-white'
          }`}
        >
          {isRecording ? (
            <>
              <MicOff className="w-3.5 h-3.5" />
              Stop & Auto-Fill Form
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5" />
              Start Dictation
            </>
          )}
        </button>
      </div>

      {isRecording && (
        <div className="p-3 bg-white/70 dark:bg-slate-900/70 border border-teal-500/30 rounded-xl space-y-1.5 animate-pulse">
          <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-500" />
            Wispr Active Clinical Listening...
          </span>
          <p className="text-xs text-slate-700 dark:text-slate-200 italic font-medium">
            "{dictationTranscript || 'Speak your clinical assessment and prescription...'}"
          </p>
        </div>
      )}
    </div>
  );
};
