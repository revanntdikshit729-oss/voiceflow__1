import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  UserCheck,
  Clock,
  Sparkles,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Plus,
  RefreshCw,
  Shield,
  Award,
  UserPlus,
  Search,
  CheckCircle2,
  Check,
  History,
  X,
  AlertCircle,
  Eye,
  HelpCircle,
  Globe,
  ClipboardCheck,
  Layers,
  ArrowRight,
  Languages,
  User,
  Volume2,
  VolumeX,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useVoiceNavigation } from '../../contexts/VoiceNavigationContext';
import { getSpokenFeedbackForIntent } from '../../services/voiceNavigation';
import { dbService } from '../../services/db';
import { apiService } from '../../services/api';
import { speechService } from '../../services/speech';
import { translations, languageOptions, getLocalizedRoleButtons, AppLanguage } from '../../i18n/translations';
import {
  PatientProfile,
  Consultation,
  HealthUpdate,
  BaselineSymptom,
  ConnectionRequest,
  TimelineEntry,
  HealthChangeBrief,
} from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { ProfilePhotoUpload } from '../profile/ProfilePhotoUpload';
import { DoctorVoicePrescriptionPad } from './DoctorVoicePrescriptionPad';
import { SymptomTrajectoryChart } from './SymptomTrajectoryChart';

export const DoctorDashboard: React.FC = () => {
  const { appUser, doctorProfile, appLanguage, setAppLanguage, refreshProfile } = useAuth();
  const t = translations[appLanguage] || translations.en;
  const roleLabels = getLocalizedRoleButtons(appLanguage);
  const { registerHandler, speakFeedback } = useVoiceNavigation();

  // Doctor Profile & Language Settings Modal
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Authorized patients list & selected patient
  const [authorizedPatients, setAuthorizedPatients] = useState<PatientProfile[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(true);

  // Connection Requests sent to or by this doctor
  const [doctorRequests, setDoctorRequests] = useState<ConnectionRequest[]>([]);
  const [patientTab, setPatientTab] = useState<'approved' | 'pending' | 'rejected_revoked'>('approved');
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);

  // Real-time Incoming Patient Connection Request Pop-up Modal
  const [activePopupRequest, setActivePopupRequest] = useState<ConnectionRequest | null>(null);
  const [dismissedRequestIds, setDismissedRequestIds] = useState<Set<string>>(new Set());
  const [isRespondingPopup, setIsRespondingPopup] = useState(false);
  const [viewingPatientProfileRequest, setViewingPatientProfileRequest] = useState<ConnectionRequest | null>(null);

  // Patient Medical Summary in Doctor's Preferred Language
  const doctorPreferredLanguage = doctorProfile?.preferredLanguage || appLanguage || 'en';
  const [summaryLanguage, setSummaryLanguage] = useState<string>(doctorPreferredLanguage);
  const [translatedMedicalSummary, setTranslatedMedicalSummary] = useState<string | null>(null);
  const [loadingSummaryTranslation, setLoadingSummaryTranslation] = useState(false);
  const [translationFailed, setTranslationFailed] = useState(false);
  const [isSpeakingSummary, setIsSpeakingSummary] = useState(false);

  const pendingRequests = doctorRequests.filter((r) => r.status === 'pending');
  const rejectedOrRevokedRequests = doctorRequests.filter((r) => r.status === 'rejected' || r.status === 'revoked');

  // Search & Connect Patient Modal
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [searchPatientId, setSearchPatientId] = useState('');
  const [searchedPatient, setSearchedPatient] = useState<PatientProfile | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [connectNote, setConnectNote] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [connectSuccessMsg, setConnectSuccessMsg] = useState<string | null>(null);

  // Selected Patient Clinical Data
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [confirmedUpdates, setConfirmedUpdates] = useState<HealthUpdate[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [initialBaseline, setInitialBaseline] = useState<Consultation | null>(null);

  // Intelligent Health Change Brief States
  const [healthChangeBrief, setHealthChangeBrief] = useState<HealthChangeBrief | null>(null);
  const [historicalBriefs, setHistoricalBriefs] = useState<HealthChangeBrief[]>([]);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [briefLanguage, setBriefLanguage] = useState<string>(doctorProfile?.preferredLanguage || appLanguage || 'en');
  const [comparisonTarget, setComparisonTarget] = useState<'initial_baseline' | 'previous_update'>('initial_baseline');

  // Side-by-Side Verification Modal
  const [showSideBySideModal, setShowSideBySideModal] = useState(false);

  // Doctor Review & Observations
  const [doctorObservationsInput, setDoctorObservationsInput] = useState('');
  const [savingDoctorReview, setSavingDoctorReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState(false);

  // New Consultation / Baseline Modal
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [isBaselineCheckbox, setIsBaselineCheckbox] = useState(true);
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [followUpAdvice, setFollowUpAdvice] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [baselineSymptoms, setBaselineSymptoms] = useState<BaselineSymptom[]>([
    { symptom: 'Fever', severity: 'moderate', notes: 'Recorded at 101.5°F since 2 days' },
    { symptom: 'Dry Cough', severity: 'mild', notes: 'Worse during night' },
  ]);
  const [savingConsultation, setSavingConsultation] = useState(false);

  // Load doctor's authorized patients and connection requests
  const loadDoctorData = async () => {
    if (!appUser?.uid) return;

    try {
      setLoadingPatients(true);
      const [patientsList, requests] = await Promise.all([
        dbService.getAuthorizedPatientsForDoctor(appUser.uid),
        dbService.getConnectionRequestsForDoctor(appUser.uid),
      ]);

      setAuthorizedPatients(patientsList);
      setDoctorRequests(requests);

      if (patientsList.length > 0) {
        if (!selectedPatient || !patientsList.some((p) => p.patientId === selectedPatient.patientId)) {
          setSelectedPatient(patientsList[0]);
        }
      } else {
        setSelectedPatient(null);
      }
    } catch (err) {
      console.error('Failed to load doctor data:', err);
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, [appUser?.uid]);

  // Sync language preferences when doctor profile or app language updates
  useEffect(() => {
    const docLang = doctorProfile?.preferredLanguage || appLanguage || 'en';
    setSummaryLanguage(docLang);
    setBriefLanguage(docLang);
  }, [doctorProfile?.preferredLanguage, appLanguage]);

  // Real-time Firestore subscription to doctor's connection requests
  useEffect(() => {
    if (!appUser?.uid) return;
    const unsubscribe = dbService.subscribeConnectionRequestsForDoctor(appUser.uid, (requests) => {
      setDoctorRequests(requests);
      // Auto-trigger pop-up for incoming pending connection requests from patients
      const pendingFromPatients = requests.filter(
        (r) => r.status === 'pending' && (!r.initiatedBy || r.initiatedBy === 'patient')
      );
      if (pendingFromPatients.length > 0) {
        const nextToShow = pendingFromPatients.find((r) => !dismissedRequestIds.has(r.id));
        if (nextToShow) {
          setActivePopupRequest(nextToShow);
        }
      } else {
        setActivePopupRequest(null);
      }
    });

    return () => unsubscribe();
  }, [appUser?.uid, dismissedRequestIds]);

  // Real-time Firestore subscription to doctor's authorized patients
  // Automatically refreshes the connected patients list when a connection is accepted or revoked
  useEffect(() => {
    if (!appUser?.uid) return;
    const unsubscribe = dbService.subscribeAuthorizedPatientsForDoctor(appUser.uid, (patients) => {
      setAuthorizedPatients(patients);
      setLoadingPatients(false);

      // Auto-select or update selected patient reference
      setSelectedPatient((current) => {
        if (!current) return patients.length > 0 ? patients[0] : null;
        const matching = patients.find((p) => p.patientId === current.patientId);
        return matching || (patients.length > 0 ? patients[0] : null);
      });
    });

    return () => unsubscribe();
  }, [appUser?.uid]);

  // Accept incoming patient connection request from popup modal
  const handleAcceptPopupRequest = async (request: ConnectionRequest) => {
    if (!appUser?.uid) return;
    setIsRespondingPopup(true);
    try {
      await dbService.respondToConnectionRequest(request.id, 'approved', request.patientId, appUser.uid);
      const updatedPatients = await dbService.getAuthorizedPatientsForDoctor(appUser.uid);
      setAuthorizedPatients(updatedPatients);
      setPatientTab('approved');

      // Auto-select this newly accepted patient
      const newlyAccepted = updatedPatients.find((p) => p.patientId === request.patientId);
      if (newlyAccepted) {
        setSelectedPatient(newlyAccepted);
      } else {
        const fallbackPatient: PatientProfile = {
          patientId: request.patientId,
          fullName: request.patientName,
          photoURL: request.patientPhotoURL,
          preferredLanguage: (doctorProfile?.preferredLanguage || appLanguage || 'en') as any,
          authorizedDoctorIds: [appUser.uid],
          uniquePatientId: request.uniquePatientId,
          createdAt: request.createdAt || new Date().toISOString(),
        };
        setSelectedPatient(fallbackPatient);
      }

      // Close popup modal
      setActivePopupRequest(null);
      const docLang = doctorProfile?.preferredLanguage || appLanguage || 'en';
      setSummaryLanguage(docLang);
      setBriefLanguage(docLang);
      speakFeedback(`Connection accepted for ${request.patientName}. Medical summary ready in your preferred language.`);
    } catch (err: any) {
      console.error('Failed to accept connection request:', err);
      alert('Failed to accept connection request: ' + err.message);
    } finally {
      setIsRespondingPopup(false);
    }
  };

  // Reject incoming patient connection request from popup modal
  const handleRejectPopupRequest = async (request: ConnectionRequest) => {
    if (!appUser?.uid) return;
    setIsRespondingPopup(true);
    try {
      await dbService.respondToConnectionRequest(request.id, 'rejected', request.patientId, appUser.uid);
      setDismissedRequestIds((prev) => new Set(prev).add(request.id));
      setActivePopupRequest(null);
      await loadDoctorData();
    } catch (err: any) {
      console.error('Failed to reject connection request:', err);
      alert('Failed to reject connection request: ' + err.message);
    } finally {
      setIsRespondingPopup(false);
    }
  };

  // Dismiss popup modal (review later)
  const handleDismissPopup = (request: ConnectionRequest) => {
    setDismissedRequestIds((prev) => new Set(prev).add(request.id));
    setActivePopupRequest(null);
  };

  // Synthesize and translate patient medical summary into doctor's preferred language
  const loadTranslatedMedicalSummary = async (
    patient: PatientProfile,
    targetLang: string,
    cList: Consultation[],
    uList: HealthUpdate[]
  ) => {
    setLoadingSummaryTranslation(true);
    setTranslationFailed(false);
    try {
      const baseline = cList.find((c) => c.isInitialBaseline) || (cList.length > 0 ? cList[cList.length - 1] : null);
      let sourceText = '';
      let context = '';

      if (uList.length > 0) {
        const latest = uList[0];
        const summary = latest.finalConfirmedSummary || latest.structuredSummary?.patientFriendlyNote || latest.rawTranscript;
        sourceText = summary;
        const symptoms = latest.structuredSummary?.symptoms?.map((s) => `${s.symptom} (${s.status}${s.severity ? `, ${s.severity}` : ''})`).join(', ');
        context = `Reported symptoms: ${symptoms || 'None'}. General wellbeing: ${latest.structuredSummary?.generalWellbeing || 'Normal'}.`;
        if (baseline) {
          context += ` Baseline Diagnosis: ${baseline.diagnosis}. Baseline Treatment Plan: ${baseline.treatmentPlan}.`;
        }
      } else if (baseline) {
        sourceText = `Initial baseline consultation recorded by Dr. ${baseline.doctorName || 'Doctor'}. Diagnosis: ${baseline.diagnosis}. Approved treatment plan: ${baseline.treatmentPlan}.`;
        context = `Chief complaints: ${baseline.chiefComplaints?.join(', ') || 'General'}. Advisory: ${baseline.followUpAdvice || 'Follow doctor advice'}.`;
      } else {
        setTranslatedMedicalSummary(null);
        setLoadingSummaryTranslation(false);
        setTranslationFailed(false);
        return;
      }

      const res = await apiService.translateMedicalSummary({
        text: sourceText,
        targetLanguage: targetLang,
        sourceLanguage: uList.length > 0 ? uList[0].preferredLanguage || uList[0].originalLanguage : undefined,
        patientName: patient.fullName,
        context,
      });

      setTranslatedMedicalSummary(res.translatedText);
      setTranslationFailed(false);
    } catch (err: any) {
      console.error('Error translating medical summary:', err);
      setTranslationFailed(true);
      // Fallback: use confirmed summary or baseline
      if (uList.length > 0) {
        setTranslatedMedicalSummary(uList[0].finalConfirmedSummary || uList[0].rawTranscript);
      } else if (cList.length > 0) {
        setTranslatedMedicalSummary(`Baseline Diagnosis: ${cList[0].diagnosis}. Treatment Plan: ${cList[0].treatmentPlan}`);
      }
    } finally {
      setLoadingSummaryTranslation(false);
    }
  };

  // Toggle TTS Audio Playback for Medical Summary
  const toggleSpeakSummary = () => {
    if (isSpeakingSummary) {
      speechService.stopSpeaking();
      setIsSpeakingSummary(false);
    } else {
      if (!translatedMedicalSummary) return;
      setIsSpeakingSummary(true);
      speechService.speak(translatedMedicalSummary, summaryLanguage as any, () => {
        setIsSpeakingSummary(false);
      });
    }
  };

  // App-Wide Voice Navigation Handler Registration for Doctor
  useEffect(() => {
    const unregister = registerHandler('doctor', (action) => {
      if (action.intent === 'VIEW_PATIENTS') {
        setPatientTab('approved');
        speakFeedback(getSpokenFeedbackForIntent('VIEW_PATIENTS', appLanguage));
        return true;
      }
      if (action.intent === 'OPEN_PROFILE') {
        setShowProfileModal(true);
        speakFeedback(getSpokenFeedbackForIntent('OPEN_PROFILE', appLanguage));
        return true;
      }
      if (action.intent === 'CONNECT_DOCTOR') {
        setShowConnectModal(true);
        setSearchError(null);
        setConnectSuccessMsg(null);
        speakFeedback(getSpokenFeedbackForIntent('CONNECT_DOCTOR', appLanguage));
        return true;
      }
      if (action.intent === 'BASELINE_CONSULTATION') {
        setShowConsultModal(true);
        speakFeedback(getSpokenFeedbackForIntent('BASELINE_CONSULTATION', appLanguage));
        return true;
      }
      if (action.intent === 'HEALTH_CHANGE_BRIEF') {
        speakFeedback(getSpokenFeedbackForIntent('HEALTH_CHANGE_BRIEF', appLanguage));
        return true;
      }
      if (action.intent === 'COMPARE_RECORDS') {
        setShowSideBySideModal(true);
        speakFeedback(getSpokenFeedbackForIntent('COMPARE_RECORDS', appLanguage));
        return true;
      }
      if (action.intent === 'VIEW_DOCTOR_REQUESTS') {
        setPatientTab('pending');
        speakFeedback('Viewing pending connection requests.');
        return true;
      }
      if (action.intent === 'ACCEPT_CONNECTION_REQUEST') {
        if (activePopupRequest) {
          handleAcceptPopupRequest(activePopupRequest);
          speakFeedback(`Approved connection request for ${activePopupRequest.patientName}.`);
          return true;
        }
        if (pendingRequests.length > 0) {
          const req = pendingRequests[0];
          handleRespondToRequest(req, 'approved');
          speakFeedback(`Approved connection request for ${req.patientName}.`);
          return true;
        }
      }
      if (action.intent === 'REJECT_CONNECTION_REQUEST') {
        if (activePopupRequest) {
          handleRejectPopupRequest(activePopupRequest);
          speakFeedback(`Declined connection request for ${activePopupRequest.patientName}.`);
          return true;
        }
        if (pendingRequests.length > 0) {
          const req = pendingRequests[0];
          handleRespondToRequest(req, 'rejected');
          speakFeedback(`Declined connection request for ${req.patientName}.`);
          return true;
        }
      }
      if (action.intent === 'CONFIRM_UPDATE' || action.doctorAction === 'save_consultation') {
        if (showConsultModal) {
          handleSaveConsultation({ preventDefault: () => {} } as any);
          speakFeedback(getSpokenFeedbackForIntent('CONFIRM_UPDATE', appLanguage));
          return true;
        }
        if (activePopupRequest) {
          handleAcceptPopupRequest(activePopupRequest);
          speakFeedback(`Approved connection request for ${activePopupRequest.patientName}.`);
          return true;
        }
        if (patientTab === 'pending' && pendingRequests.length > 0) {
          const req = pendingRequests[0];
          handleRespondToRequest(req, 'approved');
          speakFeedback(`Approved connection request for ${req.patientName}.`);
          return true;
        }
      }
      if (action.intent === 'GO_BACK') {
        if (showProfileModal) setShowProfileModal(false);
        if (showConnectModal) setShowConnectModal(false);
        if (showConsultModal) setShowConsultModal(false);
        if (showSideBySideModal) setShowSideBySideModal(false);
        speakFeedback(getSpokenFeedbackForIntent('GO_BACK', appLanguage));
        return true;
      }
      return false;
    });
    return unregister;
  }, [
    registerHandler,
    speakFeedback,
    showConsultModal,
    showProfileModal,
    showConnectModal,
    showSideBySideModal,
    patientTab,
    pendingRequests,
    activePopupRequest,
    appLanguage,
  ]);

  // Load clinical records, timeline, and health change briefs when patient is selected
  useEffect(() => {
    if (!selectedPatient) {
      setConsultations([]);
      setConfirmedUpdates([]);
      setTimelineEntries([]);
      setInitialBaseline(null);
      setHealthChangeBrief(null);
      setHistoricalBriefs([]);
      return;
    }

    const loadPatientRecords = async () => {
      try {
        const [cList, uList, timeline, baseline, briefs] = await Promise.all([
          dbService.getConsultationsForPatient(selectedPatient.patientId),
          dbService.getPatientHealthUpdates(selectedPatient.patientId, true),
          dbService.getPatientTimeline(selectedPatient.patientId),
          dbService.getInitialBaselineConsultation(selectedPatient.patientId),
          dbService.getHealthChangeBriefsForPatient(selectedPatient.patientId),
        ]);

        setConsultations(cList);
        setConfirmedUpdates(uList);
        setTimelineEntries(timeline);
        setInitialBaseline(baseline);
        setIsBaselineCheckbox(!baseline);
        setHistoricalBriefs(briefs);

        // Load translated medical summary in doctor's preferred language immediately
        loadTranslatedMedicalSummary(selectedPatient, summaryLanguage, cList, uList);

        if (briefs.length > 0) {
          setHealthChangeBrief(briefs[0]);
          setDoctorObservationsInput(briefs[0].clinicalObservations || '');
        } else {
          setHealthChangeBrief(null);
          setDoctorObservationsInput('');
          // If updates exist, trigger initial generation
          if (uList.length > 0) {
            triggerGenerateHealthChangeBrief(selectedPatient.patientId, baseline, uList, 'initial_baseline', summaryLanguage);
          }
        }
      } catch (err) {
        console.error('Error loading patient records:', err);
      }
    };

    loadPatientRecords();
  }, [selectedPatient?.patientId]);

  // Real-time listener for confirmed health updates of the selected patient.
  // Whenever the patient creates and confirms a new health update, it immediately synchronizes
  // with this doctor's dashboard, updating the timeline entries and translating the new summary.
  useEffect(() => {
    if (!selectedPatient?.patientId) return;

    const unsubscribe = dbService.subscribePatientHealthUpdates(
      selectedPatient.patientId,
      true,
      (newUpdates) => {
        setConfirmedUpdates(newUpdates);

        // Update timeline with newly confirmed updates
        setTimelineEntries((prevTimeline) => {
          const nonUpdates = prevTimeline.filter((t) => t.type !== 'patient_voice_update');
          const updateEntries: TimelineEntry[] = newUpdates.map((u) => ({
            id: u.id,
            type: 'patient_voice_update',
            timestamp: u.confirmedAt || u.createdAt,
            title: 'Patient Voice Health Update',
            authorName: 'Patient',
            authorRole: 'patient',
            data: u,
          }));
          const combined = [...nonUpdates, ...updateEntries];
          return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        });

        // Auto-translate latest update into doctor's preferred language
        if (newUpdates.length > 0) {
          loadTranslatedMedicalSummary(selectedPatient, summaryLanguage, consultations, newUpdates);
        }
      }
    );

    return () => unsubscribe();
  }, [selectedPatient?.patientId, summaryLanguage, consultations]);

  // Re-translate medical summary when doctor changes summaryLanguage
  useEffect(() => {
    if (selectedPatient && (consultations.length > 0 || confirmedUpdates.length > 0)) {
      loadTranslatedMedicalSummary(selectedPatient, summaryLanguage, consultations, confirmedUpdates);
    }
  }, [summaryLanguage]);

  // Helper to build payload and generate Intelligent Health Change Brief
  const triggerGenerateHealthChangeBrief = async (
    patientId: string,
    baseline: Consultation | null,
    updates: HealthUpdate[],
    target: 'initial_baseline' | 'previous_update',
    lang: string
  ) => {
    if (updates.length === 0) return;

    setGeneratingBrief(true);
    try {
      const latest = updates[0]; // Newest confirmed update

      // Formulate Previous Record structure
      let prevRecord: any = null;

      if (target === 'initial_baseline' && baseline) {
        prevRecord = {
          id: baseline.id,
          type: 'consultation',
          date: new Date(baseline.consultationDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          summaryText: `Initial Baseline Consultation by Dr. ${baseline.doctorName || 'Practitioner'}`,
          diagnosis: baseline.diagnosis,
          treatmentPlan: baseline.treatmentPlan,
          followUpAdvice: baseline.followUpAdvice,
          symptoms: baseline.baselineSymptoms?.map((s) => ({
            symptom: s.symptom,
            severity: s.severity,
            notes: s.notes,
          })) || [],
        };
      } else if (updates.length > 1) {
        // Immediate previous update
        const prevUpdate = updates[1];
        prevRecord = {
          id: prevUpdate.id,
          type: 'health_update',
          date: new Date(prevUpdate.confirmedAt || prevUpdate.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          summaryText: prevUpdate.structuredSummary?.clinicalNote || 'Previous confirmed voice update',
          rawTranscript: prevUpdate.rawTranscript,
          treatmentPlan: baseline?.treatmentPlan,
          followUpAdvice: baseline?.followUpAdvice,
          symptoms: prevUpdate.structuredSummary?.symptoms?.map((s) => ({
            symptom: s.symptom,
            status: s.status,
            severity: s.severity,
            notes: s.notes,
          })) || [],
        };
      } else if (baseline) {
        // Fallback to baseline if only 1 update exists
        prevRecord = {
          id: baseline.id,
          type: 'consultation',
          date: new Date(baseline.consultationDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          summaryText: `Initial Baseline Consultation by Dr. ${baseline.doctorName || 'Practitioner'}`,
          diagnosis: baseline.diagnosis,
          treatmentPlan: baseline.treatmentPlan,
          followUpAdvice: baseline.followUpAdvice,
          symptoms: baseline.baselineSymptoms?.map((s) => ({
            symptom: s.symptom,
            severity: s.severity,
            notes: s.notes,
          })) || [],
        };
      }

      const latestInput = {
        id: latest.id,
        date: new Date(latest.confirmedAt || latest.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        rawTranscript: latest.rawTranscript,
        language: latest.language,
        symptoms: latest.structuredSummary?.symptoms || [],
        generalWellbeing: latest.structuredSummary?.generalWellbeing,
        patientFriendlyNote: latest.structuredSummary?.patientFriendlyNote,
        clinicalNote: latest.structuredSummary?.clinicalNote,
        medicationAdherenceReported: latest.structuredSummary?.medicationAdherenceReported,
      };

      const res = await apiService.getHealthChangeBrief({
        patientId,
        doctorLanguage: lang,
        previousRecord: prevRecord,
        latestUpdate: latestInput,
      });

      const newBrief: HealthChangeBrief = {
        id: 'brief_' + Date.now(),
        patientId,
        generatedAt: new Date().toISOString(),
        doctorLanguage: lang,
        previousRecord: prevRecord,
        latestRecord: latestInput,
        hasReliableComparison: res.brief.hasReliableComparison,
        unreliableReason: res.brief.unreliableReason,
        quickSummary: res.brief.quickSummary,
        categories: res.brief.categories,
        patientReportedContext: res.brief.patientReportedContext,
        clinicalObservations: '',
        isReviewedByDoctor: false,
      };

      await dbService.saveHealthChangeBrief(newBrief);
      setHealthChangeBrief(newBrief);
      setDoctorObservationsInput('');
      setHistoricalBriefs((prev) => [newBrief, ...prev.filter((b) => b.id !== newBrief.id)]);
    } catch (err: any) {
      console.error('Failed to generate Health Change Brief:', err);
    } finally {
      setGeneratingBrief(false);
    }
  };

  // Manual regenerate button
  const handleRegenerateBrief = () => {
    if (!selectedPatient) return;
    triggerGenerateHealthChangeBrief(
      selectedPatient.patientId,
      initialBaseline,
      confirmedUpdates,
      comparisonTarget,
      briefLanguage
    );
  };

  // Doctor Review & Observations submission
  const handleSaveDoctorReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!healthChangeBrief || !appUser) return;

    try {
      setSavingDoctorReview(true);
      const doctorName = doctorProfile?.fullName || appUser.displayName || 'Doctor';

      await dbService.reviewHealthChangeBrief(
        healthChangeBrief.id,
        appUser.uid,
        doctorName,
        doctorObservationsInput
      );

      const updated: HealthChangeBrief = {
        ...healthChangeBrief,
        isReviewedByDoctor: true,
        clinicalObservations: doctorObservationsInput.trim(),
        reviewedBy: {
          doctorId: appUser.uid,
          doctorName,
          reviewedAt: new Date().toISOString(),
        },
      };

      setHealthChangeBrief(updated);
      setHistoricalBriefs((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setReviewSuccessMsg(true);
      setTimeout(() => setReviewSuccessMsg(false), 3000);
    } catch (err: any) {
      console.error('Error saving doctor review:', err);
      alert('Failed to save review: ' + err.message);
    } finally {
      setSavingDoctorReview(false);
    }
  };

  // Search Patient by ID for Connection
  const handleSearchPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setSearchedPatient(null);
    setConnectSuccessMsg(null);

    const query = searchPatientId.trim();
    if (!query) {
      setSearchError('Please enter a Patient ID (e.g. VF-P-ABC123).');
      return;
    }

    try {
      setIsSearching(true);
      const found = await dbService.searchPatientById(query);
      if (!found) {
        setSearchError(`No patient found matching ID "${query}". Please verify with the patient.`);
      } else {
        setSearchedPatient(found);
      }
    } catch (err: any) {
      console.error('Patient search error:', err);
      setSearchError(err.message || 'Error occurred while searching for patient.');
    } finally {
      setIsSearching(false);
    }
  };

  // Send Connection Request to Patient
  const handleSendConnectionRequest = async () => {
    if (!searchedPatient || !appUser) return;

    try {
      setSendingRequest(true);
      setSearchError(null);

      await dbService.sendConnectionRequest({
        patientId: searchedPatient.patientId,
        uniquePatientId: searchedPatient.uniquePatientId,
        patientName: searchedPatient.fullName,
        doctorId: appUser.uid,
        doctorName: doctorProfile?.fullName || appUser.displayName || 'Doctor',
        doctorSpecialization: doctorProfile?.specialization || 'General Practitioner',
        doctorClinic: doctorProfile?.clinicOrHospital || 'Clinic / Hospital',
        doctorRegNumber: doctorProfile?.registrationNumber || 'PENDING',
        requestNote: connectNote.trim() || 'Doctor requested connection to establish medical baseline and monitor health updates.',
      });

      setConnectSuccessMsg(
        `Connection request sent to ${searchedPatient.fullName}! The patient must approve this request from their portal before you can access their medical memory.`
      );
      setSearchedPatient(null);
      setSearchPatientId('');
      setConnectNote('');

      await loadDoctorData();
    } catch (err: any) {
      console.error('Failed to send request:', err);
      setSearchError(err.message || 'Failed to send connection request.');
    } finally {
      setSendingRequest(false);
    }
  };

  // Respond to incoming connection request from a patient (Accept or Reject)
  const handleRespondToRequest = async (request: ConnectionRequest, status: 'approved' | 'rejected') => {
    if (!appUser?.uid) return;
    try {
      setRespondingRequestId(request.id);
      await dbService.respondToConnectionRequest(request.id, status, request.patientId, appUser.uid);
      await loadDoctorData();
      if (status === 'approved') {
        const updatedPatients = await dbService.getAuthorizedPatientsForDoctor(appUser.uid);
        setAuthorizedPatients(updatedPatients);
        setPatientTab('approved');

        // Auto-select this newly accepted patient so clinical overview opens
        const newlyAccepted = updatedPatients.find((p) => p.patientId === request.patientId);
        if (newlyAccepted) {
          setSelectedPatient(newlyAccepted);
        } else {
          const fallbackPatient: PatientProfile = {
            patientId: request.patientId,
            fullName: request.patientName,
            photoURL: request.patientPhotoURL,
            preferredLanguage: (doctorProfile?.preferredLanguage || appLanguage || 'en') as any,
            authorizedDoctorIds: [appUser.uid],
            uniquePatientId: request.uniquePatientId,
            createdAt: request.createdAt || new Date().toISOString(),
          };
          setSelectedPatient(fallbackPatient);
        }

        const docLang = doctorProfile?.preferredLanguage || appLanguage || 'en';
        setSummaryLanguage(docLang);
        setBriefLanguage(docLang);
        speakFeedback(`Connection accepted for ${request.patientName}. Medical summary ready in your preferred language.`);
      }
    } catch (err: any) {
      console.error('Failed to respond to connection request:', err);
      alert('Action failed: ' + err.message);
    } finally {
      setRespondingRequestId(null);
    }
  };

  // Baseline Symptom row helpers
  const addSymptomRow = () => {
    setBaselineSymptoms([
      ...baselineSymptoms,
      { symptom: '', severity: 'moderate', notes: '' },
    ]);
  };

  const updateSymptomRow = (idx: number, field: keyof BaselineSymptom, val: any) => {
    const updated = [...baselineSymptoms];
    updated[idx] = { ...updated[idx], [field]: val };
    setBaselineSymptoms(updated);
  };

  const removeSymptomRow = (idx: number) => {
    setBaselineSymptoms(baselineSymptoms.filter((_, i) => i !== idx));
  };

  // Handle voice-dictated consultation from Wispr Voice Prescription Pad
  const handleVoiceParsedConsultation = (data: {
    chiefComplaints: string;
    baselineSymptoms: Array<{ symptom: string; severity: 'mild' | 'moderate' | 'severe'; notes?: string }>;
    diagnosis: string;
    treatmentPlan: string;
    followUpAdvice: string;
  }) => {
    if (data.chiefComplaints) setChiefComplaints(data.chiefComplaints);
    if (data.baselineSymptoms && data.baselineSymptoms.length > 0) {
      setBaselineSymptoms(data.baselineSymptoms);
    }
    if (data.diagnosis) setDiagnosis(data.diagnosis);
    if (data.treatmentPlan) setTreatmentPlan(data.treatmentPlan);
    if (data.followUpAdvice) setFollowUpAdvice(data.followUpAdvice);
  };

  // Save Consultation (Initial Baseline or Follow-up)
  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !appUser) return;

    try {
      setSavingConsultation(true);
      const isBaseline = isBaselineCheckbox;

      const newConsult: Consultation = {
        id: 'consult_' + Date.now(),
        patientId: selectedPatient.patientId,
        doctorId: appUser.uid,
        doctorName: doctorProfile?.fullName || appUser.displayName || 'Doctor',
        doctorSpecialization: doctorProfile?.specialization || 'General Practitioner',
        doctorRegNumber: doctorProfile?.registrationNumber || '',
        isInitialBaseline: isBaseline,
        consultationDate: new Date().toISOString(),
        chiefComplaints: chiefComplaints.split(',').map((s) => s.trim()).filter(Boolean),
        diagnosis: diagnosis.trim(),
        baselineSymptoms: baselineSymptoms.filter((s) => s.symptom.trim().length > 0),
        treatmentPlan: treatmentPlan.trim(),
        followUpAdvice: followUpAdvice.trim(),
        reviewDate: reviewDate.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      await dbService.createConsultation(newConsult);

      setConsultations([newConsult, ...consultations]);
      if (isBaseline) {
        setInitialBaseline(newConsult);
      }
      setShowConsultModal(false);

      const [timeline, baseline] = await Promise.all([
        dbService.getPatientTimeline(selectedPatient.patientId),
        dbService.getInitialBaselineConsultation(selectedPatient.patientId),
      ]);
      setTimelineEntries(timeline);
      setInitialBaseline(baseline);

      if (confirmedUpdates.length > 0) {
        triggerGenerateHealthChangeBrief(
          selectedPatient.patientId,
          baseline || newConsult,
          confirmedUpdates,
          comparisonTarget,
          briefLanguage
        );
      }
    } catch (err: any) {
      console.error('Error saving consultation:', err);
      alert('Failed to save consultation: ' + err.message);
    } finally {
      setSavingConsultation(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Doctor Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white shadow-xl shadow-blue-950/20">
        <div className="flex items-center gap-4">
          <UserAvatar
            photoURL={doctorProfile?.photoURL || appUser?.photoURL}
            name={doctorProfile?.fullName || appUser?.displayName || 'Dr. Practitioner'}
            role="doctor"
            size="xl"
            className="ring-4 ring-white/20 shadow-lg shrink-0"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {doctorProfile?.isVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400/30 text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                  <Award className="w-3.5 h-3.5 text-emerald-300" />
                  {t.doctorVerified}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/30 border border-amber-400/30 text-[11px] font-bold uppercase tracking-wider text-amber-200">
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  {t.doctorPendingVerification}
                </span>
              )}
              <span className="text-xs text-blue-200 font-mono">
                Reg: {doctorProfile?.registrationNumber || 'PENDING'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {doctorProfile?.fullName || appUser?.displayName || 'Dr. Practitioner'}
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm">
              {doctorProfile?.specialization || 'General Physician'} • {doctorProfile?.clinicOrHospital || 'Apollo Clinic'}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Doctor Profile & Language Settings Button */}
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs backdrop-blur transition-all active:scale-95 shrink-0"
            title="Doctor Profile & Language Settings"
          >
            <User className="w-4 h-4 text-blue-200" />
            <span>{roleLabels.profile}</span>
          </button>

          <button
            onClick={() => {
              setShowConnectModal(true);
              setSearchError(null);
              setConnectSuccessMsg(null);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-blue-900 font-bold text-xs shadow-md hover:bg-blue-50 transition-all active:scale-95 shrink-0"
          >
            <UserPlus className="w-4 h-4 text-blue-700" />
            <span>{t.connectPatientBtn}</span>
          </button>

          <div className="text-right shrink-0">
            <div className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
              {t.authorizedPatientsCountLabel}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {authorizedPatients.length}
            </div>
          </div>
        </div>
      </div>

      {/* Incoming Patient Requests Section - Clearly Visible on Doctor Dashboard */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-teal-500/30 dark:border-teal-500/20 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Incoming Patient Requests</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  pendingRequests.length > 0
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {pendingRequests.length} Pending
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Patients requesting connection to consult you and share clinical health updates.
              </p>
            </div>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
            <UserCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No incoming patient requests
            </p>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              When patients connect with you from the Doctor Directory, their requests will appear here in real time with options to accept or reject.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-800/80 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start gap-3">
                  <UserAvatar
                    photoURL={req.patientPhotoURL}
                    name={req.patientName}
                    role="patient"
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                      {req.patientName}
                    </h4>
                    <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold block">
                      {req.uniquePatientId || `VF-P-${req.patientId.slice(0, 6).toUpperCase()}`}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Requested {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {req.requestNote && (
                  <p className="text-xs text-amber-900 dark:text-amber-200 italic bg-amber-100/60 dark:bg-amber-900/40 p-2.5 rounded-xl">
                    &ldquo;{req.requestNote}&rdquo;
                  </p>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-amber-200 dark:border-amber-900/50">
                  <button
                    type="button"
                    onClick={() => setViewingPatientProfileRequest(req)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRespondToRequest(req, 'approved')}
                    disabled={respondingRequestId === req.id}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRespondToRequest(req, 'rejected')}
                    disabled={respondingRequestId === req.id}
                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid: Left Column (Patients & Connections) + Right Column (Clinical View) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Patient Connection Manager (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>{t.myPatientsHeader}</span>
            </h2>
            <button
              onClick={() => {
                setShowConnectModal(true);
                setSearchError(null);
                setConnectSuccessMsg(null);
              }}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addSymptomBtn}</span>
            </button>
          </div>

          {/* Sub-tabs */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
            <button
              onClick={() => setPatientTab('approved')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                patientTab === 'approved'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.tabApproved} ({authorizedPatients.length})
            </button>
            <button
              onClick={() => setPatientTab('pending')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all relative ${
                patientTab === 'pending'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.tabPending} ({pendingRequests.length})
            </button>
            <button
              onClick={() => setPatientTab('rejected_revoked')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                patientTab === 'rejected_revoked'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.tabRejectedRevoked} ({rejectedOrRevokedRequests.length})
            </button>
          </div>

          {/* TAB: Approved Patients */}
          {patientTab === 'approved' && (
            <div className="space-y-2">
              {loadingPatients ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-blue-600" />
                  {t.searchingPatient}
                </div>
              ) : authorizedPatients.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                  <Shield className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    {t.noApprovedPatientsNotice}
                  </p>
                </div>
              ) : (
                authorizedPatients.map((p) => {
                  const isSelected = selectedPatient?.patientId === p.patientId;
                  return (
                    <button
                      key={p.patientId}
                      onClick={() => setSelectedPatient(p)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-950/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar photoURL={p.photoURL} name={p.fullName} role="patient" size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {p.fullName}
                            </span>
                            <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold ml-1 shrink-0">
                              {p.uniquePatientId || `VF-P-${p.patientId.slice(0, 6).toUpperCase()}`}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-between">
                            <span className="capitalize">{p.preferredLanguage || 'Hinglish'}</span>
                            <span className="text-emerald-600 text-[10px] font-bold">Approved</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* TAB: Pending Requests */}
          {patientTab === 'pending' && (
            <div className="space-y-3">
              {pendingRequests.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  {t.noPendingRequestsNotice}
                </div>
              ) : (
                pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl border-2 border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/20 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          photoURL={req.patientPhotoURL}
                          name={req.patientName}
                          role="patient"
                          size="md"
                        />
                        <div>
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm block">
                            {req.patientName}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            ID: {req.uniquePatientId || 'VF-P-XXXX'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold shrink-0">
                        Pending
                      </span>
                    </div>

                    {req.requestNote && (
                      <p className="text-[11px] text-amber-900 dark:text-amber-200 italic bg-amber-100/60 dark:bg-amber-900/40 p-2.5 rounded-xl">
                        &ldquo;{req.requestNote}&rdquo;
                      </p>
                    )}

                    <p className="text-[10px] text-slate-400">
                      Requested on {new Date(req.createdAt).toLocaleDateString()}
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200 dark:border-amber-900/50">
                      <button
                        type="button"
                        onClick={() => setViewingPatientProfileRequest(req)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Profile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRespondToRequest(req, 'rejected')}
                        disabled={respondingRequestId === req.id}
                        className="px-3.5 py-1.5 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 font-bold text-xs hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      >
                        {t.rejectConnectionBtn || 'Reject'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRespondToRequest(req, 'approved')}
                        disabled={respondingRequestId === req.id}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {respondingRequestId === req.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>{t.approveConnectionBtn || 'Accept Request'}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB: Rejected / Revoked */}
          {patientTab === 'rejected_revoked' && (
            <div className="space-y-2">
              {rejectedOrRevokedRequests.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  {t.noRejectedRequestsNotice}
                </div>
              ) : (
                rejectedOrRevokedRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {req.patientName}
                      </span>
                      <span className="text-[10px] bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200 px-2 py-0.5 rounded-full font-bold uppercase">
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Access revoked or request rejected by patient.
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Column: Selected Patient Clinical Memory, Baseline & Health Change Brief (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedPatient ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <Stethoscope className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                {t.doctorHeaderTitle}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t.selectPatientPrompt}
              </p>
            </div>
          ) : (
            <>
              {/* Patient Profile Header Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <UserAvatar
                    photoURL={selectedPatient.photoURL}
                    name={selectedPatient.fullName}
                    role="patient"
                    size="lg"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                        {selectedPatient.fullName}
                      </h2>
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold">
                        {selectedPatient.uniquePatientId || `VF-P-${selectedPatient.patientId.slice(0, 6).toUpperCase()}`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Preferred Language: <strong className="capitalize">{selectedPatient.preferredLanguage || 'Hinglish'}</strong> • Doctor View: <strong className="text-teal-600 dark:text-teal-400 capitalize">{languageOptions.find((o) => o.code === summaryLanguage)?.label || summaryLanguage}</strong> • Connection: <strong className="text-emerald-600">Consent Verified</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setShowConsultModal(true);
                      setIsBaselineCheckbox(!initialBaseline);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {initialBaseline ? 'Record Follow-up Consultation' : t.newConsultationBtn}
                    </span>
                  </button>
                </div>
              </div>

              {/* PATIENT MEDICAL SUMMARY IN DOCTOR'S PREFERRED LANGUAGE */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-teal-500/40 shadow-lg space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 ring-2 ring-teal-500/20">
                      <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Patient Medical Summary</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 uppercase tracking-wide">
                          In Doctor&apos;s Preferred Language
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Patient medical summary translated and presented in your preferred clinical language.
                      </p>
                    </div>
                  </div>

                  {/* Controls: Language Selector, Audio Playback, Refresh */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
                      <Globe className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <select
                        value={summaryLanguage}
                        onChange={(e) => {
                          const newLang = e.target.value;
                          setSummaryLanguage(newLang);
                        }}
                        className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                        title="Select Language for Medical Summary"
                      >
                        {languageOptions.map((opt) => (
                          <option key={opt.code} value={opt.code} className="text-slate-900 bg-white">
                            {opt.native} ({opt.label})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={toggleSpeakSummary}
                      disabled={!translatedMedicalSummary || loadingSummaryTranslation}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        isSpeakingSummary
                          ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 animate-pulse'
                          : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                      title={isSpeakingSummary ? 'Stop Audio' : 'Listen to Medical Summary'}
                    >
                      {isSpeakingSummary ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => loadTranslatedMedicalSummary(selectedPatient, summaryLanguage, consultations, confirmedUpdates)}
                      disabled={loadingSummaryTranslation}
                      className="p-2 rounded-xl bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Refresh Translation"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingSummaryTranslation ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                {loadingSummaryTranslation ? (
                  <div className="py-8 text-center text-xs text-teal-600 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600" />
                    <p className="font-bold">
                      Translating patient medical summary into {languageOptions.find((o) => o.code === summaryLanguage)?.label || summaryLanguage}...
                    </p>
                  </div>
                ) : translatedMedicalSummary ? (
                  <div className="space-y-4">
                    {translationFailed && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-semibold">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>Translation Unavailable &mdash; Displaying Original Patient Content</span>
                      </div>
                    )}
                    <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 text-xs sm:text-sm font-medium text-teal-950 dark:text-teal-100 leading-relaxed shadow-sm">
                      {translatedMedicalSummary}
                    </div>

                    {/* Active Symptoms Overview */}
                    {confirmedUpdates.length > 0 && confirmedUpdates[0].structuredSummary?.symptoms && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                          Reported Symptoms in Latest Update
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {confirmedUpdates[0].structuredSummary.symptoms.map((s, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold"
                            >
                              <span className="capitalize">{s.symptom}</span>:
                              <span className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400">
                                {s.status}{s.severity ? `, ${s.severity}` : ''}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Original Spoken Transcript disclosure */}
                    {confirmedUpdates.length > 0 && confirmedUpdates[0].rawTranscript && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
                        <span className="font-semibold text-slate-600 dark:text-slate-400 block">
                          Patient Spoken Statement (Original Language: {confirmedUpdates[0].originalLanguage || confirmedUpdates[0].preferredLanguage || 'Spoken'}):
                        </span>
                        <p className="italic text-slate-700 dark:text-slate-300">
                          &ldquo;{confirmedUpdates[0].rawTranscript}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-2 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto" />
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      Connection Active with {selectedPatient.fullName}
                    </h4>
                    <p className="text-slate-500 max-w-md mx-auto">
                      No patient voice health updates submitted yet. You can record the Initial Medical Baseline consultation below, or await the patient&apos;s first voice update.
                    </p>
                  </div>
                )}
              </div>

              {/* Initial Baseline Banner (if recorded) */}
              {initialBaseline && (
                <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-blue-600" />
                      <span>Initial Medical Baseline (Recorded by {initialBaseline.doctorName || 'Doctor'})</span>
                    </span>
                    <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                      {new Date(initialBaseline.consultationDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                        Doctor&apos;s Clinical Diagnosis
                      </span>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {initialBaseline.diagnosis}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                        Doctor-Approved Treatment Plan
                      </span>
                      <p className="font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line">
                        {initialBaseline.treatmentPlan}
                      </p>
                    </div>
                  </div>

                  {/* Patient-Reported Baseline Symptoms */}
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase mb-1">
                      Patient-Reported Baseline Symptoms:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {initialBaseline.baselineSymptoms?.map((bs, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900 text-[11px] text-slate-800 dark:text-slate-200"
                        >
                          <strong>{bs.symptom}</strong> ({bs.severity}) {bs.notes && `• ${bs.notes}`}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: Longitudinal Symptom Trajectory (Scaler x Wispr Flow Innovation) */}
              <SymptomTrajectoryChart
                baselineConsultation={initialBaseline}
                updates={confirmedUpdates}
              />

              {/* SECTION: Intelligent Health Change Brief (Improvement 4) */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-500/30 shadow-md space-y-6">
                {/* Brief Section Header & Configuration */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {t.healthChangeBriefTitle}
                      </h3>
                      {healthChangeBrief?.isReviewedByDoctor ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Reviewed by Doctor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-[10px] font-bold uppercase tracking-wider">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Awaiting Review
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Symptom-by-symptom change detection between previous record and latest confirmed update.
                    </p>
                  </div>

                  {/* Controls: Target Comparison & Language Selector */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Historical Briefs Selector */}
                    {historicalBriefs.length > 1 && (
                      <select
                        value={healthChangeBrief?.id}
                        onChange={(e) => {
                          const found = historicalBriefs.find((b) => b.id === e.target.value);
                          if (found) {
                            setHealthChangeBrief(found);
                            setDoctorObservationsInput(found.clinicalObservations || '');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                      >
                        {historicalBriefs.map((b, i) => (
                          <option key={b.id} value={b.id}>
                            Brief #{historicalBriefs.length - i} ({new Date(b.generatedAt).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Comparison Baseline Target Toggle */}
                    <select
                      value={comparisonTarget}
                      onChange={(e) => setComparisonTarget(e.target.value as any)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                    >
                      <option value="initial_baseline">Compare vs Initial Baseline</option>
                      <option value="previous_update">Compare vs Prior Update</option>
                    </select>

                    {/* Brief Language Selector with all 13 Indian Languages */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
                      <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="text-slate-500 text-[11px] hidden sm:inline">Brief Lang:</span>
                      <select
                        value={briefLanguage}
                        onChange={(e) => setBriefLanguage(e.target.value)}
                        className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                        title="Select Language for Health Change Brief"
                      >
                        {languageOptions.map((opt) => (
                          <option key={opt.code} value={opt.code} className="text-slate-900 bg-white">
                            {opt.native} ({opt.label})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Regenerate Action */}
                    <button
                      onClick={handleRegenerateBrief}
                      disabled={generatingBrief || confirmedUpdates.length === 0}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      title="Regenerate comparison"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${generatingBrief ? 'animate-spin' : ''}`} />
                      <span>{generatingBrief ? 'Analyzing...' : 'Generate Brief'}</span>
                    </button>
                  </div>
                </div>

                {/* No Updates on File */}
                {confirmedUpdates.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                    <History className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      No confirmed voice updates from this patient yet
                    </p>
                    <p className="text-[11px] max-w-sm mx-auto">
                      Once the patient submits a confirmed voice health update, VoiceFlow AI will automatically calculate this symptom-by-symptom change brief.
                    </p>
                  </div>
                ) : generatingBrief ? (
                  <div className="py-12 text-center text-xs text-indigo-600 space-y-3">
                    <RefreshCw className="w-7 h-7 animate-spin mx-auto text-indigo-600" />
                    <p className="font-extrabold text-sm">
                      Synthesizing 4-Category Health Change Brief with VoiceFlow AI...
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Comparing symptoms, checking medication adherence, and formatting for doctor review.
                    </p>
                  </div>
                ) : healthChangeBrief ? (
                  <div className="space-y-6">
                    {/* Record Date Anchors & Side-by-Side Action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-500">Comparison Scope:</span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200">
                          {healthChangeBrief.previousRecord ? (
                            <>
                              {healthChangeBrief.previousRecord.type === 'consultation' ? 'Baseline Consultation' : 'Prior Voice Update'} ({healthChangeBrief.previousRecord.date})
                            </>
                          ) : (
                            'No Prior Record'
                          )}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="px-2.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 font-bold text-teal-800 dark:text-teal-200">
                          Latest Update ({healthChangeBrief.latestRecord?.date})
                        </span>
                      </div>

                      <button
                        onClick={() => setShowSideBySideModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t.sideBySideVerificationBtn}</span>
                      </button>
                    </div>

                    {/* Trajectory QuickSummary */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-100/70 to-blue-100/70 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-200 dark:border-indigo-900 text-xs sm:text-sm font-semibold text-indigo-950 dark:text-indigo-100 leading-relaxed shadow-sm">
                      ⚡ <strong>Clinically Neutral Trajectory:</strong> {healthChangeBrief.quickSummary}
                    </div>

                    {/* Unreliable Warning if no previous record */}
                    {!healthChangeBrief.hasReliableComparison && (
                      <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>{healthChangeBrief.unreliableReason}</span>
                      </div>
                    )}

                    {/* THE FOUR HEALTH CHANGE CATEGORIES */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                          Four Symptom Progression Categories
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Strict Medical Guardrail: Unmentioned symptoms never inferred as resolved
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* CATEGORY A: IMPROVED */}
                        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800/80 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-900/40">
                            <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900 dark:text-emerald-200">
                              <TrendingDown className="w-4 h-4 text-emerald-600" />
                              <span>A. {t.improvedCategoryTitle}</span>
                            </div>
                            <span className="text-[10px] font-extrabold bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                              {healthChangeBrief.categories.improved?.length || 0} Reported
                            </span>
                          </div>

                          {(!healthChangeBrief.categories.improved || healthChangeBrief.categories.improved.length === 0) ? (
                            <p className="text-xs text-emerald-700/70 italic py-2">
                              No symptoms explicitly reported as improved in this update.
                            </p>
                          ) : (
                            <div className="space-y-2.5">
                              {healthChangeBrief.categories.improved.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 text-xs space-y-1 shadow-sm"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-slate-900 dark:text-white capitalize text-xs sm:text-sm">
                                      {item.symptom}
                                    </span>
                                    <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded uppercase">
                                      Patient-Reported
                                    </span>
                                  </div>
                                  {item.previousDetails && (
                                    <p className="text-[11px] text-slate-500">
                                      <strong>Previous:</strong> {item.previousDetails}
                                    </p>
                                  )}
                                  {item.latestDetails && (
                                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                                      <strong>Latest:</strong> {item.latestDetails}
                                    </p>
                                  )}
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                                    {item.explanation}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* CATEGORY B: PERSISTENT */}
                        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800/80 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-900/40">
                            <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900 dark:text-amber-200">
                              <Clock className="w-4 h-4 text-amber-600" />
                              <span>B. {t.persistentCategoryTitle}</span>
                            </div>
                            <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
                              {healthChangeBrief.categories.persistent?.length || 0} Reported
                            </span>
                          </div>

                          {(!healthChangeBrief.categories.persistent || healthChangeBrief.categories.persistent.length === 0) ? (
                            <p className="text-xs text-amber-700/70 italic py-2">
                              No previously reported symptoms confirmed persistent.
                            </p>
                          ) : (
                            <div className="space-y-2.5">
                              {healthChangeBrief.categories.persistent.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 text-xs space-y-1 shadow-sm"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-slate-900 dark:text-white capitalize text-xs sm:text-sm">
                                      {item.symptom}
                                    </span>
                                    <span className="text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded uppercase">
                                      Still Present
                                    </span>
                                  </div>
                                  {item.previousDetails && (
                                    <p className="text-[11px] text-slate-500">
                                      <strong>Previous:</strong> {item.previousDetails}
                                    </p>
                                  )}
                                  {item.latestDetails && (
                                    <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                                      <strong>Latest:</strong> {item.latestDetails}
                                    </p>
                                  )}
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                                    {item.explanation}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* CATEGORY C: NEWLY REPORTED */}
                        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border-2 border-indigo-300 dark:border-indigo-800/80 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60 dark:border-indigo-900/40">
                            <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                              <TrendingUp className="w-4 h-4 text-indigo-600" />
                              <span>C. {t.newlyReportedCategoryTitle}</span>
                            </div>
                            <span className="text-[10px] font-extrabold bg-indigo-200 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-200 px-2 py-0.5 rounded-full">
                              {healthChangeBrief.categories.newlyReported?.length || 0} Reported
                            </span>
                          </div>

                          {(!healthChangeBrief.categories.newlyReported || healthChangeBrief.categories.newlyReported.length === 0) ? (
                            <p className="text-xs text-indigo-700/70 italic py-2">
                              No new symptoms reported in this update.
                            </p>
                          ) : (
                            <div className="space-y-2.5">
                              {healthChangeBrief.categories.newlyReported.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 text-xs space-y-1 shadow-sm"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-slate-900 dark:text-white capitalize text-xs sm:text-sm">
                                      {item.symptom}
                                    </span>
                                    <span className="text-[9px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold px-1.5 py-0.5 rounded uppercase">
                                      Newly Emerged
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                                    <strong>Reported:</strong> {item.latestDetails}
                                  </p>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                                    {item.explanation}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* CATEGORY D: NOT MENTIONED / INSUFFICIENT INFO */}
                        <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/50 border-2 border-slate-300 dark:border-slate-700 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                              <HelpCircle className="w-4 h-4 text-slate-500" />
                              <span>D. {t.resolvedCategoryTitle}</span>
                            </div>
                            <span className="text-[10px] font-extrabold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">
                              {healthChangeBrief.categories.notMentioned?.length || 0} Symptoms
                            </span>
                          </div>

                          {(!healthChangeBrief.categories.notMentioned || healthChangeBrief.categories.notMentioned.length === 0) ? (
                            <p className="text-xs text-slate-500 italic py-2">
                              All prior symptoms were addressed in the latest update.
                            </p>
                          ) : (
                            <div className="space-y-2.5">
                              {healthChangeBrief.categories.notMentioned.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1 shadow-sm"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-slate-900 dark:text-white capitalize text-xs sm:text-sm">
                                      {item.symptom}
                                    </span>
                                    <span className="text-[9px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-bold px-1.5 py-0.5 rounded uppercase">
                                      Not Reported
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500">
                                    <strong>Previous Baseline:</strong> {item.previousDetails}
                                  </p>
                                  <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-[10px] text-amber-800 dark:text-amber-200 font-semibold">
                                    ⚠️ {item.note || 'Not mentioned in latest update; cannot be assumed resolved or absent.'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Context & Treatment Alignment Card */}
                    {healthChangeBrief.patientReportedContext && (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                          Patient Reported Context & Treatment Plan Relevance
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-slate-500 font-semibold block text-[10px]">
                              Reported General Wellbeing:
                            </span>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {healthChangeBrief.patientReportedContext.generalWellbeing || 'Not reported'}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold block text-[10px]">
                              Medication Adherence Reported:
                            </span>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {healthChangeBrief.patientReportedContext.medicationAdherence || 'None reported'}
                            </p>
                          </div>
                        </div>
                        {healthChangeBrief.patientReportedContext.treatmentPlanContext && (
                          <div className="pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                            <strong>Treatment alignment note:</strong> {healthChangeBrief.patientReportedContext.treatmentPlanContext}
                          </div>
                        )}
                      </div>
                    )}

                    {/* DOCTOR CLINICAL REVIEW & OBSERVATIONS SECTION */}
                    <div className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-900/60 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                            {t.doctorClinicalObservationsTitle}
                          </h4>
                        </div>
                        {healthChangeBrief.isReviewedByDoctor && healthChangeBrief.reviewedBy ? (
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                            Reviewed by Dr. {healthChangeBrief.reviewedBy.doctorName} on{' '}
                            {new Date(healthChangeBrief.reviewedBy.reviewedAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-bold">
                            Review pending by physician
                          </span>
                        )}
                      </div>

                      <form onSubmit={handleSaveDoctorReview} className="space-y-3">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Clinical Observations & Examination Notes (Strictly preserved separate from patient statements):
                        </label>
                        <textarea
                          rows={2}
                          value={doctorObservationsInput}
                          onChange={(e) => setDoctorObservationsInput(e.target.value)}
                          placeholder="e.g. Chest clear on auscultation. Patient looks clinically stable. Advised completing antibiotic course."
                          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />

                        <div className="flex items-center justify-between">
                          {reviewSuccessMsg ? (
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                              <Check className="w-4 h-4" /> Doctor review saved successfully!
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              Marking as reviewed records your timestamp and identity.
                            </span>
                          )}

                          <button
                            type="submit"
                            disabled={savingDoctorReview}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                          >
                            {savingDoctorReview ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>{healthChangeBrief.isReviewedByDoctor ? t.observationsSavedSuccess : t.saveObservationsBtn}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Chronological Medical Memory Timeline */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" />
                    <span>Patient Medical Memory Timeline ({timelineEntries.length})</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    Chronological Record (Newest First)
                  </span>
                </div>

                {timelineEntries.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                    No medical timeline entries recorded yet. Record the Initial Baseline consultation above!
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    {timelineEntries.map((entry) => {
                      const isBaseline = entry.type === 'initial_baseline';
                      const isConsult = entry.type === 'followup_consultation';

                      return (
                        <div key={entry.id} className="relative group">
                          {/* Node dot */}
                          <div
                            className={`absolute -left-[27px] top-4 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                              isBaseline
                                ? 'bg-blue-600 ring-4 ring-blue-500/20'
                                : isConsult
                                ? 'bg-indigo-600'
                                : 'bg-teal-500'
                            }`}
                          />

                          <div
                            className={`p-5 rounded-2xl border shadow-sm space-y-3 ${
                              isBaseline
                                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60'
                                : isConsult
                                ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full ${
                                    isBaseline
                                      ? 'bg-blue-600 text-white'
                                      : isConsult
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200'
                                  }`}
                                >
                                  {isBaseline
                                    ? 'Initial Medical Baseline (Doctor Approved)'
                                    : isConsult
                                    ? 'Doctor Consultation'
                                    : 'Patient Voice Update'}
                                </span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {entry.authorName}
                                </span>
                              </div>
                              <span className="text-[11px] font-medium text-slate-500">
                                {new Date(entry.timestamp).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            {/* Item Data */}
                            {isBaseline || isConsult ? (
                              (() => {
                                const c = entry.data as Consultation;
                                return (
                                  <div className="space-y-3 text-xs">
                                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/40">
                                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase block">
                                        Clinical Diagnosis
                                      </span>
                                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                                        {c.diagnosis}
                                      </p>
                                    </div>

                                    {c.chiefComplaints?.length > 0 && (
                                      <div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                                          Patient-Reported Concerns:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                          {c.chiefComplaints.map((comp, idx) => (
                                            <span
                                              key={idx}
                                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]"
                                            >
                                              {comp}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {c.baselineSymptoms?.length > 0 && (
                                      <div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                                          Baseline Symptoms:
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                          {c.baselineSymptoms.map((bs, idx) => (
                                            <div
                                              key={idx}
                                              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] flex justify-between"
                                            >
                                              <span className="font-semibold text-slate-900 dark:text-white">
                                                {bs.symptom}
                                              </span>
                                              <span className="text-slate-500 capitalize">
                                                {bs.severity} {bs.notes && `• ${bs.notes}`}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase block">
                                        Doctor-Approved Treatment Plan
                                      </span>
                                      <p className="text-xs text-emerald-950 dark:text-emerald-100 whitespace-pre-line mt-0.5">
                                        {c.treatmentPlan}
                                      </p>
                                    </div>

                                    {c.followUpAdvice && (
                                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                        <strong>Follow-up advisory:</strong> {c.followUpAdvice}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()
                            ) : (
                              (() => {
                                const u = entry.data as HealthUpdate;
                                const confirmedSummaryText = u.finalConfirmedSummary || u.structuredSummary?.patientFriendlyNote;
                                return (
                                  <div className="space-y-2.5 text-xs">
                                    {confirmedSummaryText && (
                                      <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 space-y-1">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-teal-800 dark:text-teal-300">
                                          <span className="uppercase flex items-center gap-1">
                                            <FileText className="w-3 h-3" />
                                            <span>Confirmed Health Summary</span>
                                          </span>
                                          <span className="bg-teal-200/70 dark:bg-teal-900/80 px-1.5 py-0.5 rounded text-[9px] font-medium">
                                            {u.preferredLanguage || 'Preferred'} Language
                                          </span>
                                        </div>
                                        <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                                          {confirmedSummaryText}
                                        </p>
                                      </div>
                                    )}

                                    <div className="italic text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                      <span className="text-[10px] font-bold text-slate-400 block not-italic uppercase mb-0.5">
                                        Original Spoken Transcript ({u.originalLanguage || 'Spoken'}):
                                      </span>
                                      &ldquo;{u.rawTranscript}&rdquo;
                                    </div>

                                    {/* Symptoms pills */}
                                    <div className="flex flex-wrap gap-1.5">
                                      {u.structuredSummary?.symptoms?.map((s, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                        >
                                          <span className="capitalize">{s.symptom}</span>:
                                          <span className="font-bold text-teal-600 dark:text-teal-400 uppercase text-[10px]">
                                            {s.status}
                                          </span>
                                        </span>
                                      ))}
                                    </div>

                                    {u.comparisonWithBaseline?.improvedSymptoms && u.comparisonWithBaseline.improvedSymptoms.length > 0 && (
                                      <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                                        <TrendingDown className="w-3.5 h-3.5" />
                                        <span>Patient-reported improved: {u.comparisonWithBaseline.improvedSymptoms.join(', ')}</span>
                                      </div>
                                    )}

                                    <p className="text-slate-500">
                                      <strong>Clinical note:</strong> {u.structuredSummary?.clinicalNote}
                                    </p>
                                  </div>
                                );
                              })()
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL: Side-by-Side Comparison & Original Record Verification */}
      {showSideBySideModal && healthChangeBrief && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full p-6 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Side-by-Side Clinical Verification & Source Inspection
                </h3>
              </div>
              <button
                onClick={() => setShowSideBySideModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SIDE A: Previous Health Record */}
              <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-900/60 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200/50">
                  <span className="text-xs font-extrabold uppercase text-blue-900 dark:text-blue-200">
                    Side A: Previous Health Record
                  </span>
                  <span className="text-[11px] font-bold font-mono text-blue-700 dark:text-blue-300">
                    {healthChangeBrief.previousRecord?.date || 'N/A'}
                  </span>
                </div>

                {healthChangeBrief.previousRecord ? (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/40">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Record Type & Summary
                      </span>
                      <p className="font-extrabold text-slate-900 dark:text-white mt-0.5">
                        {healthChangeBrief.previousRecord.summary}
                      </p>
                      {healthChangeBrief.previousRecord.diagnosis && (
                        <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-1 font-semibold">
                          Diagnosis: {healthChangeBrief.previousRecord.diagnosis}
                        </p>
                      )}
                    </div>

                    {healthChangeBrief.previousRecord.rawTranscript && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Previous Spoken Transcript:
                        </span>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 italic text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                          &ldquo;{healthChangeBrief.previousRecord.rawTranscript}&rdquo;
                        </div>
                      </div>
                    )}

                    {healthChangeBrief.previousRecord.treatmentPlan && (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block">
                          Doctor-Approved Treatment Plan at that Time
                        </span>
                        <p className="text-xs text-emerald-950 dark:text-emerald-100 mt-0.5 whitespace-pre-line">
                          {healthChangeBrief.previousRecord.treatmentPlan}
                        </p>
                      </div>
                    )}

                    {healthChangeBrief.previousRecord.followUpAdvice && (
                      <p className="text-[11px] text-slate-500">
                        <strong>Follow-up advisory:</strong> {healthChangeBrief.previousRecord.followUpAdvice}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No prior record exists.</p>
                )}
              </div>

              {/* SIDE B: Latest Confirmed Update */}
              <div className="p-5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border-2 border-teal-200 dark:border-teal-900/60 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-teal-200/50">
                  <span className="text-xs font-extrabold uppercase text-teal-900 dark:text-teal-200">
                    Side B: Latest Patient Confirmed Update
                  </span>
                  <span className="text-[11px] font-bold font-mono text-teal-700 dark:text-teal-300">
                    {healthChangeBrief.latestRecord?.date}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Patient Spoken Words (Direct Transcript):
                    </span>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 italic text-slate-800 dark:text-slate-200 border border-teal-100 dark:border-teal-900 shadow-sm leading-relaxed">
                      &ldquo;{healthChangeBrief.latestRecord?.rawTranscript}&rdquo;
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Confirmed Clinical Note
                    </span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                      {healthChangeBrief.latestRecord?.clinicalNote}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block">Wellbeing:</span>
                      <span className="font-semibold">{healthChangeBrief.latestRecord?.generalWellbeing || 'Not stated'}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block">Meds Adherence:</span>
                      <span className="font-semibold">{healthChangeBrief.latestRecord?.medicationAdherenceReported || 'None stated'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                You are reviewing the exact patient-confirmed source records used to synthesize the Intelligent Health Change Brief.
              </span>
              <button
                onClick={() => setShowSideBySideModal(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700"
              >
                {t.closeModalBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: Real-time Incoming Patient Connection Request with Accept/Reject */}
      {activePopupRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-teal-500 dark:border-teal-400 overflow-hidden space-y-5 p-6 sm:p-7 relative"
            role="dialog"
            aria-modal="true"
            aria-labelledby="incoming-request-title"
          >
            {/* Dismiss button */}
            <button
              onClick={() => handleDismissPopup(activePopupRequest)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Review Later"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 ring-4 ring-teal-500/20 shrink-0">
                <UserCheck className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                  New Connection Request
                </span>
                <h3 id="incoming-request-title" className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  Incoming Patient Connection
                </h3>
              </div>
            </div>

            {/* Patient Details Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center gap-3.5">
              <UserAvatar
                photoURL={activePopupRequest.patientPhotoURL}
                name={activePopupRequest.patientName}
                role="patient"
                size="lg"
              />
              <div className="space-y-0.5 flex-1 min-w-0">
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                  {activePopupRequest.patientName}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Requested on {new Date(activePopupRequest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Patient
                </p>
              </div>
            </div>

            {/* Patient Request Message */}
            <div className="p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 text-xs text-teal-950 dark:text-teal-100 space-y-1">
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase block">
                Patient Message:
              </span>
              <p className="italic leading-relaxed">
                &ldquo;{activePopupRequest.requestNote || 'Patient requested connection to consult you and share medical memory timeline.'}&rdquo;
              </p>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              When you accept, {activePopupRequest.patientName} will be added to your authorized patients list, and their complete medical summary will immediately be presented in your preferred clinical language (<strong className="capitalize">{languageOptions.find((o) => o.code === (doctorProfile?.preferredLanguage || appLanguage || 'en'))?.label || 'English'}</strong>).
            </p>

            {/* Action Buttons: View Profile, Accept and Reject */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setViewingPatientProfileRequest(activePopupRequest)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>View Profile</span>
              </button>

              <button
                onClick={() => handleAcceptPopupRequest(activePopupRequest)}
                disabled={isRespondingPopup}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg hover:shadow-emerald-500/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isRespondingPopup ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Accept Connection</span>
              </button>

              <button
                onClick={() => handleRejectPopupRequest(activePopupRequest)}
                disabled={isRespondingPopup}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Connect with Patient */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {t.connectPatientModalTitle}
                </h3>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Search the patient using their Unique Patient ID (e.g. <strong>VF-P-ABC123</strong>) or UID. The patient must approve before their medical baseline and timeline become accessible.
            </p>

            <form onSubmit={handleSearchPatient} className="flex gap-2">
              <input
                type="text"
                value={searchPatientId}
                onChange={(e) => setSearchPatientId(e.target.value)}
                placeholder={t.enterPatientIdPlaceholder}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
              />
              <button
                type="submit"
                disabled={isSearching || !searchPatientId.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors disabled:opacity-50 shrink-0"
              >
                {isSearching ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>{t.searchPatientBtn}</span>
              </button>
            </form>

            {searchError && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {connectSuccessMsg && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{connectSuccessMsg}</span>
              </div>
            )}

            {searchedPatient && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Patient Found
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 px-2 py-0.5 rounded">
                    {searchedPatient.uniquePatientId || searchedPatient.patientId}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {searchedPatient.fullName}
                  </p>
                  <p className="text-slate-500">
                    Preferred Language: <strong className="capitalize">{searchedPatient.preferredLanguage || 'Hinglish'}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Request Note to Patient (optional)
                  </label>
                  <input
                    type="text"
                    value={connectNote}
                    onChange={(e) => setConnectNote(e.target.value)}
                    placeholder="e.g. Requesting connection to record your initial consultation baseline"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSendConnectionRequest}
                  disabled={sendingRequest}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {sendingRequest ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{t.sendConnectionRequestBtn}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Record Initial Baseline or Follow-up Consultation */}
      {showConsultModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {t.newConsultationModalTitle} - {selectedPatient.fullName}
                </h3>
              </div>
              <button
                onClick={() => setShowConsultModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConsultation} className="space-y-5 text-xs">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isBaselineCheckbox"
                  checked={isBaselineCheckbox}
                  onChange={(e) => setIsBaselineCheckbox(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isBaselineCheckbox" className="font-bold text-blue-900 dark:text-blue-200 cursor-pointer">
                  {t.baselineCheckboxLabel}
                </label>
              </div>

              {/* Wispr Flow Voice Prescription Pad (Hands-Free OPD Dictation) */}
              <DoctorVoicePrescriptionPad
                onParsedConsultation={handleVoiceParsedConsultation}
                patientName={selectedPatient.fullName}
              />

              {/* 1. Patient-Reported Information */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  1. Patient-Reported Concerns & Baseline Symptoms
                </span>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Chief Complaints & Concerns (comma-separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={chiefComplaints}
                    onChange={(e) => setChiefComplaints(e.target.value)}
                    placeholder="e.g. High fever since yesterday, chest tightness, throat irritation"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Baseline Symptoms with Severity & Notes
                    </label>
                    <button
                      type="button"
                      onClick={addSymptomRow}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      + Add Symptom
                    </button>
                  </div>

                  {baselineSymptoms.map((bs, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Symptom (e.g. Fever)"
                        value={bs.symptom}
                        onChange={(e) => updateSymptomRow(i, 'symptom', e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      />
                      <select
                        value={bs.severity}
                        onChange={(e) => updateSymptomRow(i, 'severity', e.target.value)}
                        className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      >
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Notes (e.g. 101.5F)"
                        value={bs.notes}
                        onChange={(e) => updateSymptomRow(i, 'notes', e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      />
                      {baselineSymptoms.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSymptomRow(i)}
                          className="text-red-500 font-bold px-1.5 hover:bg-red-50 rounded"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Doctor-Approved Clinical Evaluation */}
              <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 space-y-3">
                <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
                  2. Doctor-Approved Clinical Evaluation & Plan
                </span>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.diagnosisField}
                  </label>
                  <input
                    type="text"
                    required
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g. Acute Upper Respiratory Tract Infection (URTI)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t.treatmentPlanField}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={treatmentPlan}
                    onChange={(e) => setTreatmentPlan(e.target.value)}
                    placeholder="e.g. Paracetamol 650mg TDS PRN, Levocetirizine 5mg HS, Steam inhalation BD, Warm saline gargles"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t.followUpAdviceField}
                    </label>
                    <input
                      type="text"
                      value={followUpAdvice}
                      onChange={(e) => setFollowUpAdvice(e.target.value)}
                      placeholder="e.g. Daily voice updates. Immediate visit if dyspnea develops."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Follow-up Review Date (optional)
                    </label>
                    <input
                      type="date"
                      value={reviewDate}
                      onChange={(e) => setReviewDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConsultModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  {t.closeModalBtn}
                </button>
                <button
                  type="submit"
                  disabled={savingConsultation}
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 shadow-md"
                >
                  {savingConsultation
                    ? 'Saving Consultation...'
                    : t.saveConsultationBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Doctor Profile & Language Settings Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-fade-in space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {roleLabels.profile}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Doctor Credentials & Interface Language
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Photo Upload Section */}
            <ProfilePhotoUpload
              currentPhotoURL={doctorProfile?.photoURL || appUser?.photoURL}
              name={doctorProfile?.fullName || appUser?.displayName || 'Dr. Practitioner'}
              role="doctor"
              onPhotoUpdated={() => refreshProfile()}
            />

            {/* Doctor Info */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Doctor Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {doctorProfile?.fullName || appUser?.displayName || 'Dr. Practitioner'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Medical Reg. Number:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {doctorProfile?.registrationNumber || 'PENDING'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Specialization:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {doctorProfile?.specialization || 'General Physician'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Clinic / Hospital:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {doctorProfile?.clinicOrHospital || 'Clinic'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Verification Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  doctorProfile?.isVerified
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {doctorProfile?.isVerified ? 'Verified Practitioner' : 'Pending Verification'}
                </span>
              </div>
            </div>

            {/* Language Selection Setting */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <label htmlFor="doctor-profile-lang-select" className="text-xs font-bold text-slate-900 dark:text-white">
                  {roleLabels.interfaceLang} (13 Indian Languages)
                </label>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Updating your language adapts all clinical views, buttons, and voice responses without modifying existing consultation or patient clinical records.
              </p>
              <select
                id="doctor-profile-lang-select"
                value={appLanguage}
                onChange={async (e) => {
                  const newLang = e.target.value as AppLanguage;
                  setAppLanguage(newLang);
                  if (appUser?.uid) {
                    await dbService.updateUserPreferredLanguage(appUser.uid, 'doctor', newLang as any);
                  }
                  const opt = languageOptions.find((l) => l.code === newLang);
                  speakFeedback(`Interface language updated to ${opt?.label || newLang}`);
                }}
                className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
              >
                {languageOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.native} ({opt.label})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                {t.closeModalBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Patient Profile (from incoming connection request) */}
      {viewingPatientProfileRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-5 p-6 relative"
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={() => setViewingPatientProfileRequest(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pt-2">
              <UserAvatar
                photoURL={viewingPatientProfileRequest.patientPhotoURL}
                name={viewingPatientProfileRequest.patientName}
                role="patient"
                size="xl"
              />
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {viewingPatientProfileRequest.patientName}
                </h3>
                <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {viewingPatientProfileRequest.uniquePatientId || `VF-P-${viewingPatientProfileRequest.patientId.slice(0, 6).toUpperCase()}`}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Requested {new Date(viewingPatientProfileRequest.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                Connection Request Note
              </span>
              <p className="text-slate-700 dark:text-slate-300 italic leading-relaxed">
                &ldquo;{viewingPatientProfileRequest.requestNote || 'Patient requested connection to consult you and share clinical health updates.'}&rdquo;
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const req = viewingPatientProfileRequest;
                  setViewingPatientProfileRequest(null);
                  handleRespondToRequest(req, 'rejected');
                }}
                className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 font-bold text-xs hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              >
                Reject
              </button>

              <button
                type="button"
                onClick={() => {
                  const req = viewingPatientProfileRequest;
                  setViewingPatientProfileRequest(null);
                  handleRespondToRequest(req, 'approved');
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Accept Connection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
