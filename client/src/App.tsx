import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { VoiceNavigationProvider } from './contexts/VoiceNavigationContext';
import { Navbar } from './components/Navbar';
import { DualRoleAuth } from './components/auth/DualRoleAuth';
import { PatientDashboard } from './components/patient/PatientDashboard';
import { DoctorDashboard } from './components/doctor/DoctorDashboard';
import { SetupInstructionsModal } from './components/SetupInstructionsModal';
import { VoiceNavigationBanner } from './components/voice/VoiceNavigationBanner';
import { translations } from './i18n/translations';
import { RefreshCw } from 'lucide-react';

const MainContent: React.FC<{
  onOpenSetupGuide: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}> = ({ onOpenSetupGuide, darkMode, setDarkMode }) => {
  const { currentUser, appUser, loading, appLanguage } = useAuth();
  const t = translations[appLanguage] || translations.en;

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">{t.connectingApp}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        onOpenSetupGuide={onOpenSetupGuide}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <main className="flex-1 pb-16">
        {!currentUser || !appUser ? (
          <DualRoleAuth onOpenSetupGuide={onOpenSetupGuide} />
        ) : appUser.role === 'doctor' ? (
          /* Enforce Doctor Dashboard strictly by authenticated role */
          <DoctorDashboard />
        ) : (
          /* Enforce Patient Dashboard strictly by authenticated role */
          <PatientDashboard />
        )}
      </main>

      {/* App-Wide Floating Voice Navigation Banner */}
      <VoiceNavigationBanner />

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        <p className="max-w-md mx-auto">
          {t.footerText}
        </p>
      </footer>
    </div>
  );
};

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <AuthProvider>
      <VoiceNavigationProvider>
        <MainContent
          onOpenSetupGuide={() => setIsSetupOpen(true)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
        <SetupInstructionsModal
          isOpen={isSetupOpen}
          onClose={() => setIsSetupOpen(false)}
        />
      </VoiceNavigationProvider>
    </AuthProvider>
  );
}
