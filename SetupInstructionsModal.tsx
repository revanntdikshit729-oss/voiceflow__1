import React from 'react';
import { X, Key, Database, Cpu, CheckCircle2 } from 'lucide-react';
import { getMissingFirebaseKeys } from '../services/firebase';

interface SetupInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupInstructionsModal: React.FC<SetupInstructionsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  const missingKeys = getMissingFirebaseKeys();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 flex items-center justify-center font-bold">
              VF
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Firebase & AI Configuration Guide
              </h3>
              <p className="text-xs text-slate-500">
                Connected Project: <span className="font-mono text-teal-600 font-bold">voiceflow-f53b8</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-6 text-sm text-slate-600 dark:text-slate-300">
          {/* Status Alert */}
          {missingKeys.length > 0 ? (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-bold">Missing Client Keys in client/.env:</p>
              <ul className="list-disc list-inside space-y-0.5 font-mono">
                {missingKeys.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All client Firebase keys are configured!</span>
            </div>
          )}

          {/* Step 1: Firebase Console Setup */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Database className="w-4 h-4 text-teal-600" />
              <span>Step 1: Firebase Console Next Steps (voiceflow-f53b8)</span>
            </div>
            <ol className="list-decimal list-inside text-xs text-slate-500 dark:text-slate-400 space-y-2 leading-relaxed">
              <li>
                Open the <a href="https://console.firebase.google.com/project/voiceflow-f53b8/authentication" target="_blank" rel="noreferrer" className="text-teal-600 underline font-semibold">Firebase Authentication Console</a> &rarr; click <strong>Get Started</strong> &rarr; enable <strong>Email/Password</strong> provider.
              </li>
              <li>
                Open the <a href="https://console.firebase.google.com/project/voiceflow-f53b8/firestore" target="_blank" rel="noreferrer" className="text-teal-600 underline font-semibold">Cloud Firestore Console</a> &rarr; click <strong>Create Database</strong> (start in Test mode or deploy rules).
              </li>
              <li>
                Go to <strong>Project Settings &rarr; General &rarr; Your apps</strong> &rarr; find your Web App configuration and copy the <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">apiKey</code>, <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">messagingSenderId</code>, and <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">appId</code>.
              </li>
            </ol>
            <div className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto">
              <p className="text-slate-400"># In client/.env</p>
              <p>VITE_FIREBASE_PROJECT_ID=voiceflow-f53b8</p>
              <p>VITE_FIREBASE_AUTH_DOMAIN=voiceflow-f53b8.firebaseapp.com</p>
              <p>VITE_FIREBASE_STORAGE_BUCKET=voiceflow-f53b8.firebasestorage.app</p>
              <p className="text-teal-300">VITE_FIREBASE_API_KEY=AIzaSy... (Paste from console)</p>
              <p className="text-teal-300">VITE_FIREBASE_MESSAGING_SENDER_ID=... (Paste from console)</p>
              <p className="text-teal-300">VITE_FIREBASE_APP_ID=1:... (Paste from console)</p>
            </div>
          </div>

          {/* Step 2: Gemini API Key */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Cpu className="w-4 h-4 text-emerald-600" />
              <span>Step 2: Google Gemini API Key</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Get an API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-teal-600 underline">Google AI Studio</a>.
            </p>
            <div className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto">
              <p className="text-slate-400"># In server/.env</p>
              <p>PORT=5000</p>
              <p>FIREBASE_PROJECT_ID=voiceflow-f53b8</p>
              <p>GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere</p>
            </div>
          </div>

          {/* Step 3: Security Rules */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Key className="w-4 h-4 text-blue-600" />
              <span>Step 3: Firestore Security Rules</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Paste the contents of <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono">firestore.rules</code> into the Firebase Console Firestore Rules tab.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition-colors"
          >
            Got it, Close
          </button>
        </div>
      </div>
    </div>
  );
};
