import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const MedicalDisclaimer: React.FC = () => {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/50 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Clinical Safety Disclaimer:</strong> VoiceFlow is an assistive documentation tool for patients and physicians. It does not diagnose diseases, prescribe medication, or replace professional medical consultation.
          </span>
        </div>
        <span className="hidden sm:inline-block text-[11px] font-semibold tracking-wider uppercase bg-amber-200/60 dark:bg-amber-900/50 px-2 py-0.5 rounded">
          Documentation Only
        </span>
      </div>
    </div>
  );
};
