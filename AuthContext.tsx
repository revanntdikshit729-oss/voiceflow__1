import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';
import { dbService } from '../services/db';
import { AppUser, PatientProfile, DoctorProfile, UserRole, LanguageCode } from '../types';
import { AppLanguage, languageCodeToAppLanguage, appLanguageToLocale } from '../i18n/translations';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  appUser: AppUser | null;
  patientProfile: PatientProfile | null;
  doctorProfile: DoctorProfile | null;
  loading: boolean;
  isConfigured: boolean;
  appLanguage: AppLanguage;
  setAppLanguage: (lang: AppLanguage) => void;
  login: (email: string, pass: string, expectedRole?: UserRole) => Promise<AppUser>;
  signup: (params: {
    email: string;
    pass: string;
    fullName: string;
    role: UserRole;
    preferredLanguage?: LanguageCode;
    specialization?: string;
    registrationNumber?: string;
    clinicOrHospital?: string;
    consentGiven?: boolean;
  }) => Promise<AppUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isConfigured = isFirebaseConfigured();

  // Language state persisted in localStorage and Firebase User Profile
  const [appLanguage, setAppLanguageState] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('voiceflow_language');
    if (saved) {
      return languageCodeToAppLanguage(saved);
    }
    return 'en';
  });

  const setAppLanguage = (lang: AppLanguage) => {
    setAppLanguageState(lang);
    localStorage.setItem('voiceflow_language', lang);
    if (currentUser?.uid && appUser?.role) {
      const locale = appLanguageToLocale(lang);
      dbService.updateUserPreferredLanguage(currentUser.uid, appUser.role, locale);
    }
  };

  const loadUserProfile = async (uid: string): Promise<AppUser | null> => {
    try {
      const u = await dbService.getUserProfile(uid);
      setAppUser(u);

      if (u?.role === 'patient') {
        const p = await dbService.getPatientProfile(uid);
        if (p && !p.uniquePatientId) {
          p.uniquePatientId = 'VF-P-' + uid.substring(0, 6).toUpperCase();
        }
        setPatientProfile(p);
        setDoctorProfile(null);
        const pref = p?.preferredLanguage || u.preferredLanguage;
        if (pref) {
          const mappedLang = languageCodeToAppLanguage(pref);
          setAppLanguageState(mappedLang);
          localStorage.setItem('voiceflow_language', mappedLang);
        }
      } else if (u?.role === 'doctor') {
        const d = await dbService.getDoctorProfile(uid);
        setDoctorProfile(d);
        setPatientProfile(null);
        const pref = d?.preferredLanguage || u.preferredLanguage;
        if (pref) {
          const mappedLang = languageCodeToAppLanguage(pref);
          setAppLanguageState(mappedLang);
          localStorage.setItem('voiceflow_language', mappedLang);
        }
      }
      return u;
    } catch (err) {
      console.error('Error loading user profile:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await loadUserProfile(currentUser.uid);
    }
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadUserProfile(user.uid);
      } else {
        setAppUser(null);
        setPatientProfile(null);
        setDoctorProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string, expectedRole?: UserRole): Promise<AppUser> => {
    if (!auth) throw new Error('Firebase Auth is not configured. Please add your Firebase configuration.');
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const profile = await loadUserProfile(cred.user.uid);

    if (!profile) {
      throw new Error('User profile record not found in database. Please contact support.');
    }

    // Role-authorization verification
    if (expectedRole && profile.role !== expectedRole) {
      // Sign out immediately to prevent unauthorized session retention
      await firebaseSignOut(auth);
      setAppUser(null);
      setPatientProfile(null);
      setDoctorProfile(null);

      const err: any = new Error(
        profile.role === 'patient'
          ? 'This account is registered as a Patient. Please use the Patient portal.'
          : 'This account is registered as a Doctor. Please use the Doctor portal.'
      );
      err.code = 'auth/role-mismatch';
      err.userRole = profile.role;
      throw err;
    }

    return profile;
  };

  const signup = async ({
    email,
    pass,
    fullName,
    role,
    preferredLanguage = 'hinglish',
    specialization = 'General Medicine',
    registrationNumber = '',
    clinicOrHospital = 'Clinic / Hospital',
    consentGiven = true,
  }: {
    email: string;
    pass: string;
    fullName: string;
    role: UserRole;
    preferredLanguage?: LanguageCode;
    specialization?: string;
    registrationNumber?: string;
    clinicOrHospital?: string;
    consentGiven?: boolean;
  }): Promise<AppUser> => {
    if (!auth) throw new Error('Firebase Auth is not configured. Please add your Firebase configuration.');

    if (role === 'patient' && !consentGiven) {
      const err: any = new Error('Patient consent is required to register.');
      err.code = 'auth/consent-required';
      throw err;
    }

    if (role === 'doctor' && !registrationNumber.trim()) {
      const err: any = new Error('Medical registration number is mandatory for doctors.');
      err.code = 'auth/missing-registration-number';
      throw err;
    }

    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const user = cred.user;

    await updateProfile(user, { displayName: fullName });

    const chosenLang: LanguageCode = preferredLanguage || 'en-IN';
    const baseUser: AppUser = {
      uid: user.uid,
      email: user.email || email,
      displayName: fullName,
      role,
      preferredLanguage: chosenLang,
      createdAt: new Date().toISOString(),
    };

    await dbService.createUserProfile(baseUser);
    setAppUser(baseUser);
    setAppLanguage(languageCodeToAppLanguage(chosenLang));

    if (role === 'patient') {
      const pProfile: PatientProfile = {
        patientId: user.uid,
        uniquePatientId: 'VF-P-' + user.uid.substring(0, 6).toUpperCase(),
        fullName,
        preferredLanguage: chosenLang,
        authorizedDoctorIds: [],
        createdAt: new Date().toISOString(),
      };
      await dbService.createPatientProfile(pProfile);
      setPatientProfile(pProfile);
    } else {
      // Requirement: Do not automatically mark doctors as verified!
      const dProfile: DoctorProfile = {
        doctorId: user.uid,
        fullName,
        specialization: specialization.trim() || 'General Practitioner',
        registrationNumber: registrationNumber.trim(),
        clinicOrHospital: clinicOrHospital.trim() || 'Clinic / Hospital',
        isVerified: false, // Default is unverified pending review
        preferredLanguage: chosenLang,
        createdAt: new Date().toISOString(),
      };
      await dbService.createDoctorProfile(dProfile);
      setDoctorProfile(dProfile);
    }

    return baseUser;
  };

  const logout = async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
    setAppUser(null);
    setPatientProfile(null);
    setDoctorProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        appUser,
        patientProfile,
        doctorProfile,
        loading,
        isConfigured,
        appLanguage,
        setAppLanguage,
        login,
        signup,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
