import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  HeartPulse,
  Lock,
  Mail,
  User,
  Award,
  CheckSquare,
  Square,
  AlertCircle,
  Mic,
  ArrowLeft,
  ChevronRight,
  Languages,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useVoiceNavigation } from '../../contexts/VoiceNavigationContext';
import { UserRole, LanguageCode } from '../../types';
import {
  translations,
  languageOptions,
  getLocalizedRoleButtons,
  AppLanguage,
  appLanguageToLocale,
} from '../../i18n/translations';
import { VoiceCommandAction, getSpokenFeedbackForIntent } from '../../services/voiceNavigation';
import { getMissingFirebaseKeys } from '../../services/firebase';

interface DualRoleAuthProps {
  onOpenSetupGuide: () => void;
}

export const DualRoleAuth: React.FC<DualRoleAuthProps> = ({ onOpenSetupGuide }) => {
  const { login, signup, isConfigured, appLanguage, setAppLanguage } = useAuth();
  const t = translations[appLanguage] || translations.en;
  const roleLabels = getLocalizedRoleButtons(appLanguage);
  const { registerHandler, speakFeedback, toggleListening } = useVoiceNavigation();

  // View state: 'welcome' | 'signin' | 'signup'
  const [view, setView] = useState<'welcome' | 'signin' | 'signup'>('welcome');
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [specialization, setSpecialization] = useState('General Medicine');
  const [clinicOrHospital, setClinicOrHospital] = useState('Apollo Hospitals');
  const [preferredSpeakingLang, setPreferredSpeakingLang] = useState<LanguageCode>('hinglish');
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Status & Feedback
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const missingKeys = getMissingFirebaseKeys();

  // App-Wide Voice Navigation Handler Registration
  useEffect(() => {
    const unregister = registerHandler('auth', (action: VoiceCommandAction) => {
      // 1. Role Selection
      if (action.intent === 'SELECT_ROLE_DOCTOR') {
        setSelectedRole('doctor');
        setView('signin');
        speakFeedback(getSpokenFeedbackForIntent('SELECT_ROLE_DOCTOR', appLanguage));
        return true;
      }
      if (action.intent === 'SELECT_ROLE_PATIENT') {
        setSelectedRole('patient');
        setView('signin');
        speakFeedback(getSpokenFeedbackForIntent('SELECT_ROLE_PATIENT', appLanguage));
        return true;
      }

      // 2. Open Login / Register / Go Back
      if (action.intent === 'OPEN_LOGIN') {
        setView('signin');
        setError(null);
        speakFeedback(getSpokenFeedbackForIntent('OPEN_LOGIN', appLanguage));
        return true;
      }
      if (action.intent === 'OPEN_REGISTER') {
        setView('signup');
        setError(null);
        speakFeedback(getSpokenFeedbackForIntent('OPEN_REGISTER', appLanguage));
        return true;
      }
      if (action.intent === 'GO_BACK') {
        setView('welcome');
        setError(null);
        speakFeedback(getSpokenFeedbackForIntent('GO_BACK', appLanguage));
        return true;
      }

      // 3. Confirm / Submit Login or Registration
      if (action.intent === 'SUBMIT_AUTH') {
        if (view === 'signin') {
          if (!email.trim() || !password) {
            const warn = t.authEnterEmailPassFirst;
            speakFeedback(warn);
            setError(warn);
          } else {
            handleSubmit({ preventDefault: () => {} } as any);
            const sub = t.authSubmitting;
            speakFeedback(sub);
          }
          return true;
        } else if (view === 'signup') {
          if (!email.trim() || !password || !confirmPassword) {
            const warn = t.authFillRequired;
            speakFeedback(warn);
            setError(warn);
          } else {
            handleSubmit({ preventDefault: () => {} } as any);
          }
          return true;
        }
      }

      // 4. Form Field Dictation (Non-sensitive)
      if (action.intent === 'FILL_FIELD' && action.field && action.value) {
        if (action.field === 'fullName') setFullName(action.value);
        else if (action.field === 'specialization') setSpecialization(action.value);
        else if (action.field === 'clinicOrHospital') setClinicOrHospital(action.value);
        else if (action.field === 'registrationNumber') setRegistrationNumber(action.value);
        else if (action.field === 'email') setEmail(action.value.replace(/\s+/g, '').toLowerCase());
        speakFeedback(`Updated ${action.field}.`);
        return true;
      }
      return false;
    });
    return unregister;
  }, [registerHandler, speakFeedback, appLanguage, view, email, password, confirmPassword]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (view === 'signup') {
      if (password !== confirmPassword) {
        setError(t.passwordsDoNotMatch);
        return;
      }
      if (password.length < 6) {
        setError(t.passwordTooShort);
        return;
      }
      if (selectedRole === 'patient' && !consentAccepted) {
        setError(t.mustConsent);
        return;
      }
      if (selectedRole === 'doctor' && !registrationNumber.trim()) {
        setError(t.registrationNumberPlaceholder);
        return;
      }
    }

    setLoading(true);

    try {
      if (view === 'signin') {
        // Enforce role authorization during login
        await login(email.trim(), password, selectedRole);
      } else {
        await signup({
          email: email.trim(),
          pass: password,
          fullName: fullName.trim(),
          role: selectedRole,
          preferredLanguage: preferredSpeakingLang,
          specialization: specialization.trim(),
          registrationNumber: registrationNumber.trim(),
          clinicOrHospital: clinicOrHospital.trim(),
          consentGiven: consentAccepted,
        });
      }
    } catch (err: any) {
      console.error('Auth submission error:', err);
      let msg = err.message || 'Authentication error occurred.';
      if (err.code === 'auth/role-mismatch') {
        msg = selectedRole === 'doctor' ? t.roleMismatchDoctor : t.roleMismatchPatient;
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = t.authInvalidCreds;
      } else if (err.code === 'auth/email-already-in-use') {
        msg = t.authEmailInUse;
      } else if (err.code === 'auth/weak-password') {
        msg = t.passwordTooShort;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Banner if Firebase configuration is missing */}
      {!isConfigured && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Firebase Project voiceflow-f53b8 Active</p>
              <p className="text-[11px] leading-relaxed">
                Missing Web App keys: <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">{missingKeys.join(', ')}</code>.
              </p>
              <button
                type="button"
                onClick={onOpenSetupGuide}
                className="text-teal-700 dark:text-teal-400 font-bold underline block mt-1"
              >
                {t.setupGuide} →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. WELCOME SCREEN: ROLE SELECTION CARDS                       */}
      {/* ============================================================ */}
      {view === 'welcome' && (
        <div className="space-y-8 animate-fade-in">
          {/* Hero Header */}
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center font-extrabold text-2xl mx-auto shadow-xl shadow-teal-600/20">
              VF
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {t.welcomeTitle}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t.welcomeSubtitle}
            </p>
          </div>

          {/* Voice Prompt Chip */}
          <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-center text-xs text-teal-900 dark:text-teal-200 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              <strong>{t.orUseVoice}:</strong> {t.voiceCommandHint}
            </span>
          </div>

          {/* Language Selection Card before proceeding */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-teal-500/30 dark:border-teal-500/20 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 shadow-sm">
                  <Languages className="w-6 h-6" />
                </div>
                <div>
                  <label htmlFor="preferred-app-language-select" className="text-base font-extrabold text-slate-900 dark:text-white block">
                    {roleLabels.selectLang}
                  </label>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t.preferredLanguageSelectPrompt}
                  </span>
                </div>
              </div>
              <div className="w-full sm:w-auto min-w-[240px]">
                <select
                  id="preferred-app-language-select"
                  value={appLanguage}
                  onChange={(e) => {
                    const newLang = e.target.value as AppLanguage;
                    setAppLanguage(newLang);
                    setPreferredSpeakingLang(appLanguageToLocale(newLang));
                    const opt = languageOptions.find((l) => l.code === newLang);
                    speakFeedback(`Language set to ${opt?.label || newLang}`);
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none shadow-sm cursor-pointer"
                >
                  {languageOptions.map((opt) => (
                    <option key={opt.code} value={opt.code} className="text-slate-900 dark:text-white">
                      {opt.native} ({opt.label})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dual Role Choice Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Doctor Portal Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-blue-500/50 transition-all flex flex-col justify-between space-y-6 group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
                  <Stethoscope className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {t.doctorRoleTitle}
                    </h3>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {t.doctorRoleTitle}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {t.doctorRoleDesc}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('doctor');
                    setView('signin');
                  }}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                >
                  <span>{roleLabels.doctor}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="flex justify-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('doctor');
                      setView('signin');
                    }}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {t.signIn}
                  </button>
                  <span>&bull;</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('doctor');
                      setView('signup');
                    }}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {t.createAccount}
                  </button>
                </div>
              </div>
            </div>

            {/* Patient Portal Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-teal-500/50 transition-all flex flex-col justify-between space-y-6 group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
                  <HeartPulse className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {t.patientRoleTitle}
                    </h3>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                      {t.patientRoleTitle}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {t.patientRoleDesc}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('patient');
                    setView('signin');
                  }}
                  className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                >
                  <span>{roleLabels.patient}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="flex justify-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('patient');
                      setView('signin');
                    }}
                    className="hover:text-teal-600 transition-colors"
                  >
                    {t.signIn}
                  </button>
                  <span>&bull;</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('patient');
                      setView('signup');
                    }}
                    className="hover:text-teal-600 transition-colors"
                  >
                    {t.createAccount}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. AUTHENTICATION SCREENS: SIGN IN & REGISTER                */}
      {/* ============================================================ */}
      {view !== 'welcome' && (
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl animate-fade-in space-y-6">
          {/* Header & Back Button */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setView('welcome');
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t.backToRoles}</span>
            </button>

            <span
              className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                selectedRole === 'doctor'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
              }`}
            >
              {selectedRole === 'doctor' ? t.doctorRoleTitle : t.patientRoleTitle}
            </span>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => {
                setView('signin');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                view === 'signin'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              {t.signIn}
            </button>
            <button
              type="button"
              onClick={() => {
                setView('signup');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                view === 'signup'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              {t.createAccount}
            </button>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {view === 'signin' ? t.welcomeBack : t.registerTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {selectedRole === 'doctor' ? t.doctorRoleDesc : t.patientRoleDesc}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Registration Specific Fields */}
            {view === 'signup' && (
              <>
                {/* Full Name with Mic Dictation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      {t.fullName}
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleListening('fullName')}
                      title="Speak full name"
                      className="text-teal-600 hover:text-teal-700 flex items-center gap-1 font-semibold text-[11px]"
                    >
                      <Mic className="w-3 h-3" /> Voice
                    </button>
                  </div>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={
                        selectedRole === 'doctor'
                          ? t.fullNamePlaceholderDoctor
                          : t.fullNamePlaceholderPatient
                      }
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Preferred Language Selection (both patient and doctor) */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.preferredLanguage}
                  </label>
                  <select
                    value={preferredSpeakingLang}
                    onChange={(e) => setPreferredSpeakingLang(e.target.value as LanguageCode)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {languageOptions.map((opt) => (
                      <option key={opt.code} value={opt.locale}>
                        {opt.native} ({opt.label})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Doctor Registration Details */}
                {selectedRole === 'doctor' && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">
                          {t.registrationNumber}
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleListening('registrationNumber')}
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold text-[11px]"
                        >
                          <Mic className="w-3 h-3" /> Voice
                        </button>
                      </div>
                      <div className="relative">
                        <Award className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={registrationNumber}
                          onChange={(e) => setRegistrationNumber(e.target.value)}
                          placeholder={t.registrationNumberPlaceholder}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t.specialization}
                        </label>
                        <input
                          type="text"
                          value={specialization}
                          onChange={(e) => setSpecialization(e.target.value)}
                          placeholder="e.g. Cardiologist"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t.clinicOrHospital}
                        </label>
                        <input
                          type="text"
                          value={clinicOrHospital}
                          onChange={(e) => setClinicOrHospital(e.target.value)}
                          placeholder="e.g. Apollo Hospital"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Verification Status Notice */}
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-300 text-[11px] flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Verification Policy:</strong> Newly registered doctors undergo credential review. Your profile will initially display <strong>{t.doctorPendingVerification}</strong> until verified.
                      </span>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Email Address */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.email}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Password - STRICTLY MANUAL, NO DICTATION FOR SECURITY */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.password}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Confirm Password (Registration Only) */}
            {view === 'signup' && (
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.confirmPassword}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}

            {/* Patient Consent Acknowledgement Checkbox */}
            {view === 'signup' && selectedRole === 'patient' && (
              <div
                onClick={() => setConsentAccepted(!consentAccepted)}
                className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
              >
                <button type="button" className="mt-0.5 text-teal-600 shrink-0">
                  {consentAccepted ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                </button>
                <span className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 select-none">
                  {t.patientConsent}
                </span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-2xl font-extrabold text-xs text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                selectedRole === 'doctor'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                  : 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/20'
              } ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
            >
              {loading ? (
                <span>{t.authSubmitting}</span>
              ) : (
                <span>{view === 'signin' ? t.submitSignIn : t.submitSignUp}</span>
              )}
            </button>
          </form>

          {/* Toggle between Sign In and Sign Up */}
          <div className="text-center text-xs text-slate-500 dark:text-slate-400">
            {view === 'signin' ? (
              <p>
                {t.dontHaveAccount}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setView('signup');
                    setError(null);
                  }}
                  className={`font-bold underline ${
                    selectedRole === 'doctor' ? 'text-blue-600' : 'text-teal-600'
                  }`}
                >
                  {t.createAccount}
                </button>
              </p>
            ) : (
              <p>
                {t.alreadyHaveAccount}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setView('signin');
                    setError(null);
                  }}
                  className={`font-bold underline ${
                    selectedRole === 'doctor' ? 'text-blue-600' : 'text-teal-600'
                  }`}
                >
                  {t.signIn}
                </button>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
