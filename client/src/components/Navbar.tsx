import React, { useState } from 'react';
import {
  Activity,
  LogOut,
  Moon,
  Sun,
  User,
  Settings,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../i18n/translations';
import { UserAvatar } from './common/UserAvatar';

interface NavbarProps {
  onOpenSetupGuide: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSetupGuide, darkMode, setDarkMode }) => {
  const { appUser, currentUser, doctorProfile, logout, isConfigured, appLanguage } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const t = translations[appLanguage] || translations.en;

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-teal-500/20">
            <Activity className="w-6 h-6 animate-pulse-subtle" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-teal-400 dark:to-emerald-300">
                VoiceFlow
              </span>
              <span className="text-[10px] font-extrabold tracking-wide uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-teal-500/10 text-indigo-700 dark:text-teal-300 border border-teal-500/30 flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping"></span>
                Scaler × Wispr Flow
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              {t.tagline} • <span className="text-teal-600 dark:text-teal-400 font-semibold">Bharat Voice-First Healthcare</span>
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Setup Guide Button if not configured */}
          {!isConfigured && (
            <button
              onClick={onOpenSetupGuide}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 transition-colors shadow-sm"
            >
              <Settings className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              {t.setupGuide}
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            title="Toggle theme"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>

          {/* User info & Logout */}
          {currentUser && appUser ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-left">
                <UserAvatar
                  photoURL={appUser.photoURL}
                  name={appUser.displayName}
                  role={appUser.role}
                  size="sm"
                />
                <div className="hidden md:block">
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {appUser.displayName}
                  </div>
                  <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">
                    {appUser.role === 'doctor'
                      ? doctorProfile?.isVerified
                        ? t.doctorVerified
                        : t.doctorPendingVerification
                      : t.patientRoleTitle}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                title={t.logout}
                className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> {t.signInRequired}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
