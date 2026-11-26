export type AppLanguage =
  | 'en'
  | 'hi'
  | 'hinglish'
  | 'bn'
  | 'ta'
  | 'te'
  | 'mr'
  | 'gu'
  | 'kn'
  | 'ml'
  | 'pa'
  | 'or'
  | 'as';

export type SupportedLocale =
  | 'en-IN'
  | 'hi-IN'
  | 'hinglish'
  | 'bn-IN'
  | 'ta-IN'
  | 'te-IN'
  | 'mr-IN'
  | 'gu-IN'
  | 'kn-IN'
  | 'ml-IN'
  | 'pa-IN'
  | 'or-IN'
  | 'as-IN';

export interface TranslationDictionary {
  // Brand & Global
  appName: string;
  tagline: string;
  version: string;
  medicalDisclaimer: string;
  documentationOnly: string;
  verifiedPhysician: string;
  pendingVerification: string;
  patientPortalNav: string;
  doctorPortalNav: string;
  signInRequired: string;
  toggleTheme: string;
  setupGuide: string;
  logout: string;
  footerText: string;
  connectingApp: string;

  // Welcome / Role Selection
  welcomeTitle: string;
  welcomeSubtitle: string;
  chooseRoleTitle: string;
  chooseRoleSubtitle: string;
  doctorRoleTitle: string;
  doctorRoleDesc: string;
  patientRoleTitle: string;
  patientRoleDesc: string;
  continueAsDoctor: string;
  continueAsPatient: string;
  orUseVoice: string;
  voiceCommandHint: string;

  // Auth (Sign In & Sign Up)
  signIn: string;
  createAccount: string;
  welcomeBack: string;
  registerTitle: string;
  fullName: string;
  fullNamePlaceholderDoctor: string;
  fullNamePlaceholderPatient: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  confirmPassword: string;
  passwordsDoNotMatch: string;
  passwordTooShort: string;
  registrationNumber: string;
  registrationNumberPlaceholder: string;
  specialization: string;
  clinicOrHospital: string;
  preferredLanguage: string;
  preferredLanguageSelectPrompt: string;
  patientConsent: string;
  mustConsent: string;
  submitSignIn: string;
  submitSignUp: string;
  backToRoles: string;
  alreadyHaveAccount: string;
  dontHaveAccount: string;
  roleMismatchDoctor: string;
  roleMismatchPatient: string;
  authEmailInUse: string;
  authInvalidCreds: string;
  authFillRequired: string;
  authEnterEmailPassFirst: string;
  authSubmitting: string;
  missingWebKeysPrefix: string;

  // Voice Navigation Floating Banner
  voiceAssistantTitle: string;
  voiceLiveMic: string;
  voiceHeardPrefix: string;
  voiceNavActive: string;
  voiceNavIdle: string;
  voiceNavListening: string;
  voiceNavStopTitle: string;
  voiceNavStartTitle: string;
  voiceNavStopped: string;
  voiceNavMicDenied: string;
  voiceNavUnsupported: string;
  voiceHeard: string;

  // Patient Dashboard - Header & Navigation
  patientGreetingPrefix: string;
  patientBannerBadge: string;
  patientBannerSubtitle: string;
  yourUniquePatientId: string;
  shareWithDoctorHint: string;
  copyPatientId: string;
  copiedId: string;
  copyIdTooltip: string;
  idUsageHint: string;
  pendingRequestsBanner: string;
  reviewNow: string;
  tabRecordHealthUpdate: string;
  tabMedicalTimeline: string;
  tabConnectedDoctors: string;
  tabProfileAndSettings: string;
  voiceAndInterfaceLang: string;
  speakNaturallyHint: string;
  changeInProfile: string;

  // Baseline notices
  activeBaselineConnected: string;
  baselineDoctorPrefix: string;
  diagnosisPrefix: string;
  baselineSymptomsPrefix: string;
  medicalBaselineActiveBadge: string;
  noBaselineNotice: string;

  // Voice Recording & Mic
  patientAskCondition: string;
  micHelpExample: string;
  micTapToSpeak: string;
  micListening: string;
  micProcessing: string;
  tapToStop: string;
  transcriptLabel: string;
  editableBadge: string;
  transcriptPlaceholder: string;
  analyzeUpdateWithAi: string;

  // Structured Update Review
  verifyUpdateTitle: string;
  patientSummaryReady: string;
  pendingConfirmationBadge: string;
  readBackTitle: string;
  listenToSummary: string;
  stopSpeaking: string;
  summaryConfirmationIntro: string;
  summaryConfirmationAsk: string;
  comparisonWithBaselineTitle: string;
  patientReportedComparisonBadge: string;
  improvedSymptomsTitle: string;
  persistentSymptomsTitle: string;
  newlyReportedSymptomsTitle: string;
  resolvedSymptomsTitle: string;
  noneReported: string;
  symptomsIdentifiedTitle: string;
  severityLabel: string;
  durationLabel: string;
  contextLabel: string;
  clinicalSummaryTitle: string;
  patientFriendlyNoteTitle: string;
  confirmAndSaveBtn: string;
  editByVoiceBtn: string;
  cancelDiscardBtn: string;
  confirmAndSaveHint: string;
  saveSuccessTitle: string;
  saveSuccessMessage: string;

  // Voice Correction
  voiceCorrectionActiveTitle: string;
  voiceCorrectionDesc: string;
  tapToRecordCorrection: string;
  listeningCorrection: string;
  correctionInputPlaceholder: string;
  applyCorrectionBtn: string;
  applyingCorrectionBtn: string;
  cancelCorrectionBtn: string;
  correctionPrompt: string;
  correctionSuccessDefault: string;

  // Medical Timeline
  medicalTimelineHeader: string;
  medicalTimelineDesc: string;
  emptyTimelineTitle: string;
  emptyTimelineDesc: string;
  entryInitialConsultation: string;
  entryFollowUpConsultation: string;
  entryHealthUpdate: string;
  verifiedByPatientBadge: string;
  establishedBaselineTag: string;
  chiefComplaintsTitle: string;
  treatmentPlanTitle: string;
  followUpAdviceTitle: string;
  reviewDatePrefix: string;
  rawTranscriptTitle: string;
  noSymptomsRecorded: string;
  viewDetailsBtn: string;
  updateDetailsModalTitle: string;
  consultationDetailsModalTitle: string;
  originalSpokenLanguageLabel: string;
  preferredSummaryLanguageLabel: string;
  confirmedHealthSummaryTitle: string;
  originalSpokenTranscriptTitle: string;
  confirmationStatusConfirmed: string;
  patientReportedVsDoctorNotice: string;
  readAloudSummaryBtn: string;
  spokenLanguageSelectLabel: string;
  healthIndicatorsLabel: string;
  voiceCorrectionsHistoryTitle: string;
  backToTimelineBtn: string;

  // Connected Doctors Tab
  doctorAccessHeader: string;
  doctorAccessDesc: string;
  pendingRequestsSection: string;
  approvedDoctorsSection: string;
  noPendingRequests: string;
  noApprovedDoctors: string;
  approveConnectionBtn: string;
  rejectConnectionBtn: string;
  revokeAccessBtn: string;
  confirmRevokeModal: string;
  doctorNotePrefix: string;
  requestedOnPrefix: string;
  connectedSincePrefix: string;

  // Patient Profile Tab
  patientProfileHeader: string;
  patientProfileDesc: string;
  patientPersonalDetails: string;
  saveLanguagePreferenceBtn: string;
  languageSavedSuccess: string;

  // Doctor Dashboard - Header
  doctorHeaderTitle: string;
  regPrefix: string;
  authorizedPatientsCountLabel: string;
  connectPatientBtn: string;
  doctorProfileBtn: string;

  // Doctor Dashboard - Patient List
  myPatientsHeader: string;
  tabApproved: string;
  tabPending: string;
  tabRejectedRevoked: string;
  noApprovedPatientsNotice: string;
  noPendingRequestsNotice: string;
  noRejectedRequestsNotice: string;
  patientIdLabel: string;
  phoneLabel: string;
  viewPatientRecordsBtn: string;

  // Doctor Dashboard - Connect Modal
  connectPatientModalTitle: string;
  searchPatientSubtitle: string;
  enterPatientIdPlaceholder: string;
  searchPatientBtn: string;
  searchingPatient: string;
  patientFoundTitle: string;
  connectionNoteLabel: string;
  connectionNotePlaceholder: string;
  sendConnectionRequestBtn: string;
  sendingConnectionRequest: string;
  patientNotFound: string;
  connectionRequestSent: string;

  // Doctor Dashboard - Overview & Brief
  selectPatientPrompt: string;
  clinicalOverviewHeader: string;
  establishedBaselineNotice: string;
  noBaselineYetNotice: string;
  recordBaselineBtn: string;
  newConsultationBtn: string;
  tabHealthChangeBrief: string;
  tabTimeline: string;
  sideBySideVerificationBtn: string;
  healthChangeBriefTitle: string;
  healthChangeBriefSubtitle: string;
  compareWithBaselineBtn: string;
  compareWithPreviousBtn: string;
  reanalyzeBriefBtn: string;
  generatingBrief: string;
  comparedRecordsDates: string;
  baselineRecordDate: string;
  latestUpdateDate: string;
  fourHealthCategories: string;
  improvedCategoryTitle: string;
  persistentCategoryTitle: string;
  newlyReportedCategoryTitle: string;
  resolvedCategoryTitle: string;
  noChangesInCategory: string;
  doctorClinicalObservationsTitle: string;
  doctorObservationsPlaceholder: string;
  saveObservationsBtn: string;
  observationsSavedSuccess: string;

  // Doctor Dashboard - Consultation Modal
  newConsultationModalTitle: string;
  baselineCheckboxLabel: string;
  baselineCheckboxHint: string;
  chiefComplaintsField: string;
  chiefComplaintsPlaceholder: string;
  diagnosisField: string;
  diagnosisPlaceholder: string;
  symptomsAssessmentTitle: string;
  addSymptomBtn: string;
  symptomNamePlaceholder: string;
  severityMild: string;
  severityModerate: string;
  severitySevere: string;
  symptomNotesPlaceholder: string;
  treatmentPlanField: string;
  treatmentPlanPlaceholder: string;
  followUpAdviceField: string;
  followUpAdvicePlaceholder: string;
  reviewDateField: string;
  saveConsultationBtn: string;
  savingConsultation: string;

  // Doctor Dashboard - Side-by-Side Modal
  sideBySideModalTitle: string;
  previousRecordCol: string;
  latestRecordCol: string;
  closeModalBtn: string;

  // Doctor Dashboard - Profile Modal
  doctorProfileModalTitle: string;
  doctorDetailsSection: string;
  saveDoctorLanguageBtn: string;

  // Common Feedback
  doctorPendingVerification: string;
  doctorVerified: string;

  // Profile Photo Upload
  profilePhotoTitle: string;
  profilePhotoDesc: string;
  uploadPhotoBtn: string;
  replacePhotoBtn: string;
  removePhotoBtn: string;
  savePhotoBtn: string;
  cancelPhotoBtn: string;
  photoPreviewTitle: string;
  photoUploading: string;
  photoUploadSuccess: string;
  photoRemoveSuccess: string;
  photoSizeError: string;
  photoTypeError: string;
  photoUploadError: string;
  photoStorageNotConfigured: string;

  // Doctor Directory & Connection
  tabFindDoctors: string;
  doctorDirectoryTitle: string;
  doctorDirectorySubtitle: string;
  searchDoctorsPlaceholder: string;
  noDoctorsFound: string;
  noDoctorsRegistered: string;
  viewDoctorProfile: string;
  connectionAlreadyConnected: string;
  connectionRequestPending: string;
  connectionRequestRejected: string;
  reconnectBtn: string;
  doctorSpecializationLabel: string;
  doctorQualificationsLabel: string;
  doctorClinicLabel: string;
  doctorAboutLabel: string;
  doctorRegNumberLabel: string;
  multipleDoctorsFound: string;
  doctorNotFoundSpoken: string;
  doctorConnectAskSpoken: string;
  doctorConnectConfirmedSpoken: string;
}
