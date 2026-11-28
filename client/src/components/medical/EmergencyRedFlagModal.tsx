import React from 'react';
import { AlertOctagon, PhoneCall, ShieldAlert, ArrowRight, X } from 'lucide-react';
import { EmergencyRedFlag } from '../../services/wisprFlowEngine';

interface EmergencyRedFlagModalProps {
  redFlag: EmergencyRedFlag | null;
  onClose: () => void;
  onProceedAnyway: () => void;
}

export const EmergencyRedFlagModal: React.FC<EmergencyRedFlagModalProps> = ({
  redFlag,
  onClose,
  onProceedAnyway,
}) => {
  if (!redFlag || !redFlag.isEmergency) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-2 border-red-500 rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Urgent Header */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <AlertOctagon className="w-7 h-7 text-white animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-wide uppercase">
                Clinical Red Flag Warning
              </h3>
              <p className="text-xs text-red-100 font-medium">
                Potentially Critical Symptoms Reported via Voice
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl">
            <h4 className="text-sm font-bold text-red-800 dark:text-red-300 flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
              Detected Life-Threatening Indicators:
            </h4>
            <ul className="list-disc list-inside text-xs text-red-700 dark:text-red-300 font-semibold space-y-1">
              {redFlag.triggers.map((trigger, i) => (
                <li key={i}>{trigger}</li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            VoiceFlow's clinical safety guardrails detected symptoms that may require
            <strong> immediate in-person emergency care</strong> rather than routine documentation.
            Please do not wait for an online doctor callback if experiencing acute distress.
          </p>

          {/* Emergency Call Action */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <a
              href="tel:108"
              className="flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-red-500/30 transition-all hover:scale-105"
            >
              <PhoneCall className="w-4 h-4 animate-pulse" />
              Call 108 (Ambulance)
            </a>
            <a
              href="tel:112"
              className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-2xl shadow-md transition-all hover:scale-105"
            >
              <PhoneCall className="w-4 h-4" />
              Call 112 (National)
            </a>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Cancel & Re-record
          </button>
          <button
            onClick={onProceedAnyway}
            className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
          >
            I understand, continue documentation
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
