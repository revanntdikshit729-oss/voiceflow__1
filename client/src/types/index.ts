// Core Domain Types for VoiceFlow

export type UserRole = 'patient' | 'doctor';

export type LanguageCode =
  | 'en-IN'
  | 'hi-IN'
  | 'hinglish'
  | 'bn-IN' // Bengali (বাংলা)
  | 'ta-IN' // Tamil (தமிழ்)
  | 'te-IN' // Telugu (తెలుగు)
  | 'mr-IN' // Marathi (मराठी)
  | 'gu-IN' // Gujarati (ગુજરાતી)
  | 'kn-IN' // Kannada (ಕನ್ನಡ)
  | 'ml-IN' // Malayalam (മലയാളം)
  | 'pa-IN' // Punjabi (ਪੰਜਾਬੀ)
  | 'or-IN' // Odia (ଓଡ଼ିଆ)
  | 'as-IN'; // Assamese (অসমীয়া)

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  preferredLanguage?: LanguageCode;
  createdAt: string;
}

export interface PatientProfile {
  patientId: string;
  uniquePatientId?: string; // Human-friendly ID, e.g. VF-P-9A4B2C
  fullName: string;
  photoURL?: string;
  age?: number;
  gender?: string;
  preferredLanguage: LanguageCode;
  phoneNumber?: string;
  primaryDoctorId?: string;
  authorizedDoctorIds: string[];
  createdAt: string;
  updatedAt?: string;
}

export type ConnectionStatus = 'pending' | 'approved' | 'accepted' | 'rejected' | 'revoked';

export interface ConnectionRequest {
  id: string;
  patientId: string;
  uniquePatientId?: string;
  patientName: string;
  patientEmail?: string;
  patientPhotoURL?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  doctorClinic: string;
  doctorRegNumber: string;
  doctorPhotoURL?: string;
  status: ConnectionStatus;
  initiatedBy?: 'patient' | 'doctor';
  requestNote?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DoctorProfile {
  doctorId: string;
  fullName: string;
  photoURL?: string;
  specialization: string;
  registrationNumber: string;
  clinicOrHospital: string;
  qualifications?: string;
  description?: string;
  isVerified: boolean;
  preferredLanguage?: LanguageCode;
  createdAt: string;
}

export interface PublicDoctorProfile {
  doctorId: string;
  fullName: string;
  photoURL?: string;
  specialization: string;
  registrationNumber?: string;
  clinicOrHospital: string;
  qualifications?: string;
  description?: string;
  isVerified?: boolean;
}

export interface SymptomStatus {
  symptom: string;
  status: 'improved' | 'worsened' | 'persistent' | 'new';
  severity?: 'mild' | 'moderate' | 'severe' | 'unspecified';
  notes?: string;
}

export interface StructuredSummary {
  symptoms: SymptomStatus[];
  generalWellbeing: string;
  patientFriendlyNote: string;
  spokenConfirmation?: string; // Natural human-like spoken confirmation of voice corrections
  clinicalNote: string;
  durationOrOnset?: string;
  medicationAdherenceReported?: string;
  comparisonWithBaseline?: {
    improvedSymptoms: string[];
    persistentSymptoms: string[];
    newSymptoms: string[];
    patientReportedNotes?: string;
  };
}

export interface CorrectionRecord {
  correctionTranscript: string;
  previousSummary: StructuredSummary;
  timestamp: string;
}

export interface HealthUpdate {
  id: string;
  patientId: string;
  consultationId?: string;
  baselineConsultationId?: string;
  rawTranscript: string;
  originalLanguage?: LanguageCode;
  language: LanguageCode;
  preferredLanguage?: LanguageCode;
  finalConfirmedSummary?: string;
  structuredSummary: StructuredSummary;
  correctionHistory: CorrectionRecord[];
  comparisonWithBaseline?: {
    improvedSymptoms: string[];
    persistentSymptoms: string[];
    newSymptoms: string[];
    patientReportedNotes?: string;
  };
  isConfirmed: boolean;
  status?: 'confirmed';
  confirmedAt?: string;
  createdAt: string;
}

export interface BaselineSymptom {
  symptom: string;
  severity: 'mild' | 'moderate' | 'severe';
  notes?: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialization?: string;
  doctorRegNumber?: string;
  isInitialBaseline?: boolean; // True if this establishes the medical baseline
  consultationDate: string;
  chiefComplaints: string[]; // Patient-reported concerns
  diagnosis: string; // Doctor's clinical diagnosis
  baselineSymptoms: BaselineSymptom[]; // Patient-reported baseline symptoms
  treatmentPlan: string; // Doctor-approved treatment plan
  followUpAdvice: string; // Doctor-approved follow-up advisory
  reviewDate?: string;
  createdAt: string;
}

export type TimelineItemType = 'initial_baseline' | 'followup_consultation' | 'patient_voice_update';

export interface TimelineEntry {
  id: string;
  type: TimelineItemType;
  timestamp: string;
  title: string;
  authorName: string;
  authorRole: 'doctor' | 'patient';
  data: Consultation | HealthUpdate;
}

export interface DoctorMemoryBrief {
  patientId: string;
  lastUpdated: string;
  quickSummary: string; // 10-second summary
  improvedSymptoms: string[];
  persistentSymptoms: string[];
  newSymptoms: string[];
  medicationFeedback: string;
  clinicalAlertsOrFollowUpRecommendations: string[];
}

export interface SymptomChangeItem {
  symptom: string;
  previousDetails?: string;
  latestDetails?: string;
  patientReportedStatement?: string;
  explanation: string;
}

export interface UnmentionedSymptomItem {
  symptom: string;
  previousDetails: string;
  note: string; // Strict: Unmentioned symptoms are NEVER assumed resolved, improved or absent
}

export interface FourCategoriesComparison {
  improved: SymptomChangeItem[];
  persistent: SymptomChangeItem[];
  newlyReported: SymptomChangeItem[];
  notMentioned: UnmentionedSymptomItem[];
}

export interface HealthChangeBrief {
  id: string;
  patientId: string;
  generatedAt: string;
  doctorLanguage: string;
  previousRecord: {
    id: string;
    type: 'consultation' | 'health_update';
    date: string;
    summary: string;
    diagnosis?: string;
    treatmentPlan?: string;
    followUpAdvice?: string;
    rawTranscript?: string;
  } | null;
  latestRecord: {
    id: string;
    date: string;
    rawTranscript: string;
    clinicalNote: string;
    generalWellbeing?: string;
    medicationAdherenceReported?: string;
  };
  hasReliableComparison: boolean;
  unreliableReason?: string;
  quickSummary: string;
  categories: FourCategoriesComparison;
  patientReportedContext: {
    generalWellbeing: string;
    medicationAdherence: string;
    treatmentPlanContext?: string;
  };
  clinicalObservations?: string; // Doctor's independent observations
  isReviewedByDoctor: boolean;
  reviewedBy?: {
    doctorId: string;
    doctorName: string;
    reviewedAt: string;
  };
}
