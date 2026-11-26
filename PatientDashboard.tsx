import React, { useState, useEffect, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
  UserCheck,
  Languages,
  Edit3,
  Send,
  Sparkles,
  Check,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  History,
  Stethoscope,
  UserX,
  User,
  Eye,
  X,
  Globe,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useVoiceNavigation } from '../../contexts/VoiceNavigationContext';
import { getSpokenFeedbackForIntent } from '../../services/voiceNavigation';
import { speechService } from '../../services/speech';
import { apiService } from '../../services/api';
import { dbService, toSafeISOString } from '../../services/db';
import {
  translations,
  languageOptions,
  getLocalizedRoleButtons,
  AppLanguage,
  appLanguageToLocale,
} from '../../i18n/translations';
import {
  StructuredSummary,
  HealthUpdate,
  Consultation,
  ConnectionRequest,
  TimelineEntry,
  CorrectionRecord,
  PublicDoctorProfile,
  PatientProfile,
} from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { ProfilePhotoUpload } from '../profile/ProfilePhotoUpload';
import { DoctorDirectory } from '../doctor/DoctorDirectory';
import { DoctorProfileModal } from '../doctor/DoctorProfileModal';

type InteractionState = 'idle' | 'listening' | 'processing' | 'reviewing' | 'confirmed';
type ActiveTab = 'voice_update' | 'timeline' | 'find_doctors' | 'connected_doctors' | 'doctor_connections' | 'profile';

export const PatientDashboard: React.FC = () => {
  const { appUser, patientProfile, refreshProfile, appLanguage, setAppLanguage } = useAuth();
  const [livePatientProfile, setLivePatientProfile] = useState<PatientProfile | null>(null);
  const activePatientProfile = livePatientProfile || patientProfile;
  const { registerHandler, speakFeedback, startListening } = useVoiceNavigation();

  // Active Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('voice_update');

  // Registered Doctors Directory & Voice Connect States
  const [allDoctors, setAllDoctors] = useState<PublicDoctorProfile[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [directorySearchQuery, setDirectorySearchQuery] = useState('');
  const [selectedDoctorForProfile, setSelectedDoctorForProfile] = useState<PublicDoctorProfile | null>(null);
  const [voiceSelectedDoctor, setVoiceSelectedDoctor] = useState<PublicDoctorProfile | null>(null);
  const [awaitingConnectConfirm, setAwaitingConnectConfirm] = useState(false);

  // Voice Interaction States
  const [interactionState, setInteractionState] = useState<InteractionState>('idle');
  const t = translations[appLanguage] || translations.en;
  const roleLabels = getLocalizedRoleButtons(appLanguage);
  const selectedLocale = appLanguageToLocale(appLanguage);

  // Spoken Language (defaults to preferred interface language, patient can select another speaking language)
  const [spokenLanguage, setSpokenLanguage] = useState<AppLanguage>(appLanguage);
  const spokenLocale = appLanguageToLocale(spokenLanguage);

  useEffect(() => {
    setSpokenLanguage(appLanguage);
  }, [appLanguage]);

  const [transcript, setTranscript] = useState('');
  const [activeRecognition, setActiveRecognition] = useState<any>(null);

  // Structured AI result
  const [currentSummary, setCurrentSummary] = useState<StructuredSummary | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Voice/Text Correction
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [correctionTranscript, setCorrectionTranscript] = useState('');
  const [correctionRecognition, setCorrectionRecognition] = useState<any>(null);
  const [isCorrectingWithAi, setIsCorrectingWithAi] = useState(false);
  const [correctionHistory, setCorrectionHistory] = useState<CorrectionRecord[]>([]);

  // Baseline & Medical Timeline Data
  const [initialBaseline, setInitialBaseline] = useState<Consultation | null>(null);
  const [confirmedUpdates, setConfirmedUpdates] = useState<HealthUpdate[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Selected Timeline Entry for Detail Modal
  const [selectedTimelineEntry, setSelectedTimelineEntry] = useState<TimelineEntry | null>(null);
  const [isDetailSpeaking, setIsDetailSpeaking] = useState(false);

  // Connection Requests & Doctor Access
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);

  // Speech Support check
  const hasSpeechSynth = speechService.isSynthesisSupported();

  // Safe date formatter for timeline entries
  const formatTimelineDate = (ts: any): string => {
    try {
      const iso = toSafeISOString(ts);
      const d = new Date(iso);
      if (isNaN(d.getTime())) return 'Recorded';
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recorded';
    }
  };

  // Load initial baseline, updates, timeline and connection requests
  const loadPatientData = async () => {
    if (!appUser?.uid) {
      console.warn('[Diagnostics] loadPatientData aborted: appUser.uid is unavailable');
      return;
    }
    console.log(`[Diagnostics] loadPatientData started for patient UID: "${appUser.uid}"`);
    try {
      setLoadingTimeline(true);
      setLoadingRequests(true);
      setLoadingDoctors(true);

      const [baselineRes, updatesRes, timelineRes, requestsRes, doctorsRes] = await Promise.allSettled([
        dbService.getInitialBaselineConsultation(appUser.uid),
        dbService.getPatientHealthUpdates(appUser.uid, true),
        dbService.getPatientTimeline(appUser.uid),
        dbService.getConnectionRequestsForPatient(appUser.uid),
        dbService.getPublicDoctorsDirectory(),
      ]);

      if (baselineRes.status === 'fulfilled') {
        setInitialBaseline(baselineRes.value);
        console.log('[Diagnostics] Initial baseline loaded:', baselineRes.value ? baselineRes.value.id : 'None');
      } else {
        console.error('[Diagnostics] Failed to load baseline consultation:', baselineRes.reason);
      }

      if (updatesRes.status === 'fulfilled') {
        setConfirmedUpdates(updatesRes.value);
        console.log(`[Diagnostics] setConfirmedUpdates loaded ${updatesRes.value.length} items`);
      } else {
        console.error('[Diagnostics] Failed to load confirmed updates:', updatesRes.reason);
      }

      if (timelineRes.status === 'fulfilled') {
        setTimelineEntries(timelineRes.value);
        console.log(`[Diagnostics] setTimelineEntries loaded ${timelineRes.value.length} entries for Medical Timeline`);
      } else {
        console.error('[Diagnostics] Failed to load patient timeline:', timelineRes.reason);
      }

      if (requestsRes.status === 'fulfilled') {
        setConnectionRequests(requestsRes.value);
      } else {
        console.error('[Diagnostics] Failed to load connection requests:', requestsRes.reason);
      }

      if (doctorsRes.status === 'fulfilled') {
        setAllDoctors(doctorsRes.value.filter((d) => d.isVerified === true));
      } else {
        console.error('[Diagnostics] Failed to load public doctor directory:', doctorsRes.reason);
      }
    } catch (err) {
      console.error('[Diagnostics] Unexpected error in loadPatientData:', err);
    } finally {
      setLoadingTimeline(false);
      setLoadingRequests(false);
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, [appUser?.uid]);

  // Real-time listener for connection requests so patient sees status changes immediately
  useEffect(() => {
    if (!appUser?.uid) return;
    const unsubscribe = dbService.subscribeConnectionRequestsForPatient(appUser.uid, (requests) => {
      setConnectionRequests(requests);
    });
    return () => unsubscribe();
  }, [appUser?.uid]);

  // Real-time listener for verified doctors directory
  useEffect(() => {
    if (!appUser?.uid) return;
    const unsubscribe = dbService.subscribePublicDoctorsDirectory((doctors) => {
      setAllDoctors(doctors);
      setLoadingDoctors(false);
    });
    return () => unsubscribe();
  }, [appUser?.uid]);

  // Real-time listener for patient profile document (authorizedDoctorIds changes)
  // Ensures connected doctors list updates immediately when doctor accepts or revokes connection
  useEffect(() => {
    if (!appUser?.uid) return;
    const unsubscribe = dbService.subscribePatientProfile(appUser.uid, (profile) => {
      if (profile) {
        setLivePatientProfile(profile);
        refreshProfile?.();
      }
    });
    return () => unsubscribe();
  }, [appUser?.uid]);

  // Refresh data whenever user navigates to the Medical Timeline tab
  useEffect(() => {
    if (activeTab === 'timeline' && appUser?.uid) {
      console.log('[Diagnostics] Active tab switched to timeline -> auto-refreshing patient data');
      loadPatientData();
    }
  }, [activeTab]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      speechService.stopSpeaking();
      if (activeRecognition) activeRecognition.stop();
      if (correctionRecognition) correctionRecognition.stop();
    };
  }, [activeRecognition, correctionRecognition]);

  // Start / Stop Main Voice Recording
  const toggleRecording = () => {
    if (interactionState === 'listening') {
      if (activeRecognition) {
        activeRecognition.stop();
        setActiveRecognition(null);
      }
      if (transcript.trim()) {
        handleProcessTranscript(transcript);
      } else {
        setInteractionState('idle');
      }
    } else {
      setErrorMessage(null);
      setTranscript('');
      setInteractionState('listening');

      const rec = speechService.startListening(spokenLocale, {
        onResult: (text) => {
          setTranscript(text);
        },
        onError: (err) => {
          console.error('Speech rec error:', err);
          setErrorMessage(`Microphone error: ${err}. You can type your update directly.`);
          setInteractionState('idle');
        },
        onEnd: () => { },
      });

      setActiveRecognition(rec);
    }
  };

  // Submit transcript to Gemini AI via backend
  const handleProcessTranscript = async (textToProcess: string) => {
    if (!textToProcess.trim()) {
      setErrorMessage('Please provide a health update by voice or typing.');
      return;
    }

    setInteractionState('processing');
    setErrorMessage(null);

    try {
      const response = await apiService.processHealthUpdate({
        transcript: textToProcess.trim(),
        language: spokenLocale,
        preferredLanguage: selectedLocale,
        baselineConsultation: initialBaseline,
        previousUpdates: confirmedUpdates.slice(0, 3),
      });

      setCurrentSummary(response.structured);
      setInteractionState('reviewing');

      if (hasSpeechSynth) {
        speakGeneratedSummaryConfirmation(response.structured);
      }
    } catch (err: any) {
      console.error('Error processing update:', err);
      setErrorMessage(err.message || 'AI processing encountered an issue. Please try again.');
      setInteractionState('idle');
    }
  };

  // Builds the complete, empathetic confirmation prompt in the user's selected language
  const buildSpokenSummaryPrompt = (summaryText: string): string => {
    let clean = summaryText.trim();
    // Strip trailing questions from AI generation so we present a clear single confirmation request
    clean = clean.replace(/(\.|\?|!|।)\s*(?:is\s+everything\s+accurate|is\s+this\s+correct|please\s+confirm|please\s+check\s+your\s+details|kya\s+ye\s+sahi\s+hai|kya\s+sab\s+sahi\s+hai|क्या\s+सब\s+सही\s+है|क्या\s+यह\s+सही\s+है|क्या\s+जानकारी\s+सही\s+है|کیا\s+سب\s+صحیح\s+ہے)\??$/i, '');
    clean = clean.replace(/[?؟]$/, '').trim();

    const intro = t.summaryConfirmationIntro || 'I understood the following: ';
    const ask = t.summaryConfirmationAsk || 'Is this correct? You can say Confirm or Edit.';

    const lowerClean = clean.toLowerCase();
    const lowerIntro = intro.toLowerCase().trim();

    const startsWithIntro =
      lowerClean.startsWith(lowerIntro) ||
      lowerClean.startsWith('i understood') ||
      lowerClean.startsWith('मैंने समझा') ||
      lowerClean.startsWith('maine samjha');

    const prefix = startsWithIntro ? '' : intro;
    const punct = /[.!।]$/.test(clean) ? ' ' : (appLanguage === 'hi' ? '। ' : '. ');

    return `${prefix}${clean}${punct}${ask}`;
  };

  // Automatically speaks the complete generated summary + confirmation question aloud, then auto-listens for confirm/edit
  const speakGeneratedSummaryConfirmation = (summary: StructuredSummary) => {
    if (!hasSpeechSynth) return;

    const baseText = summary.patientFriendlyNote || summary.generalWellbeing || transcript.trim();
    if (!baseText) return;

    const promptToSpeak = buildSpokenSummaryPrompt(baseText);

    // Cancel any previous / ongoing speech immediately (such as recording stopped feedback)
    speechService.stopSpeaking();
    setIsSpeaking(true);

    speechService.speak(promptToSpeak, selectedLocale, () => {
      setIsSpeaking(false);
      // Auto-start listening for user response ("Confirm" / "Edit")
      if (typeof startListening === 'function') {
        startListening();
      }
    });
  };

  // Text-to-speech manual toggle
  const handleSpeak = (text: string) => {
    if (isSpeaking) {
      speechService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    speechService.speak(text, selectedLocale, () => {
      setIsSpeaking(false);
    });
  };

  // Voice-based Correction
  const toggleCorrectionRecording = () => {
    if (correctionRecognition) {
      correctionRecognition.stop();
      setCorrectionRecognition(null);
    } else {
      setCorrectionTranscript('');
      const rec = speechService.startListening(spokenLocale, {
        onResult: (text) => {
          setCorrectionTranscript(text);
        },
        onError: (err) => {
          console.error('Correction mic error:', err);
        },
      });
      setCorrectionRecognition(rec);
    }
  };

  const handleApplyCorrection = async () => {
    if (!currentSummary || !correctionTranscript.trim()) return;

    setIsCorrectingWithAi(true);
    setErrorMessage(null);

    try {
      const response = await apiService.correctHealthUpdate({
        originalSummary: currentSummary,
        correctionTranscript: correctionTranscript.trim(),
        language: spokenLocale,
        preferredLanguage: selectedLocale,
      });

      setCorrectionHistory((prev) => [
        ...prev,
        {
          correctionTranscript: correctionTranscript.trim(),
          previousSummary: currentSummary,
          timestamp: new Date().toISOString(),
        },
      ]);

      setCurrentSummary(response.corrected);
      setIsCorrecting(false);
      setCorrectionTranscript('');

      if (hasSpeechSynth) {
        speakGeneratedSummaryConfirmation(response.corrected);
      }
    } catch (err: any) {
      console.error('Correction failed:', err);
      setErrorMessage(err.message || 'Failed to update summary with correction.');
    } finally {
      setIsCorrectingWithAi(false);
    }
  };

  // Explicit Confirmation: Save to Firestore
  const handleConfirmAndSave = async () => {
    if (!currentSummary || !appUser || interactionState === 'processing') return;

    try {
      setInteractionState('processing');

      const updateId = `update_${Date.now()}_${appUser.uid.slice(0, 5)}`;
      const confirmedSummaryText =
        currentSummary.patientFriendlyNote || currentSummary.generalWellbeing || transcript.trim();

      const newUpdate: HealthUpdate = {
        id: updateId,
        patientId: appUser.uid,
        rawTranscript: transcript.trim(),
        originalLanguage: spokenLocale,
        language: spokenLocale,
        preferredLanguage: selectedLocale,
        finalConfirmedSummary: confirmedSummaryText,
        structuredSummary: currentSummary,
        correctionHistory: correctionHistory || [],
        isConfirmed: true,
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      if (initialBaseline && typeof initialBaseline.id === 'string' && initialBaseline.id.trim()) {
        const baselineId = initialBaseline.id.trim();
        newUpdate.consultationId = baselineId;
        newUpdate.baselineConsultationId = baselineId;
      }

      if (currentSummary.comparisonWithBaseline) {
        newUpdate.comparisonWithBaseline = currentSummary.comparisonWithBaseline;
      }

      console.log(`[Diagnostics] Saving confirmed update ID: "${updateId}" for patient UID: "${appUser.uid}"`);
      await dbService.saveHealthUpdate(newUpdate);
      console.log(`[Diagnostics] Confirmed update "${updateId}" saved to Firestore successfully`);

      // Immediately prepend to timeline entries so it appears instantly on the Medical Timeline
      const newTimelineEntry: TimelineEntry = {
        id: newUpdate.id,
        type: 'patient_voice_update',
        timestamp: newUpdate.confirmedAt || new Date().toISOString(),
        title: 'Patient Voice Health Update',
        authorName: 'Patient',
        authorRole: 'patient',
        data: newUpdate,
      };

      setConfirmedUpdates((prev) => [newUpdate, ...prev.filter((u) => u.id !== newUpdate.id)]);
      setTimelineEntries((prev) => [newTimelineEntry, ...prev.filter((e) => e.id !== newUpdate.id)]);
      setInteractionState('confirmed');

      // Refresh full dataset in background
      loadPatientData();

      setTimeout(() => {
        setInteractionState('idle');
        setCurrentSummary(null);
        setTranscript('');
        setCorrectionHistory([]);
      }, 4000);
    } catch (err: any) {
      console.error('[Diagnostics] Failed to save update:', err);
      setErrorMessage(err.message || 'Failed to save confirmed update to database.');
      setInteractionState('reviewing');
    }
  };

  // Voice-initiated connection request handler
  const handleSendVoiceConnectionRequest = async (targetDoctor: PublicDoctorProfile) => {
    if (!appUser?.uid) return;
    try {
      await dbService.sendConnectionRequest({
        patientId: appUser.uid,
        uniquePatientId: activePatientProfile?.uniquePatientId || `VF-P-${appUser.uid.slice(0, 6).toUpperCase()}`,
        patientName: activePatientProfile?.fullName || appUser.displayName || 'Patient',
        patientPhotoURL: activePatientProfile?.photoURL || appUser.photoURL,
        doctorId: targetDoctor.doctorId,
        doctorName: targetDoctor.fullName,
        doctorSpecialization: targetDoctor.specialization,
        doctorClinic: targetDoctor.clinicOrHospital,
        doctorRegNumber: targetDoctor.registrationNumber || 'PENDING',
        doctorPhotoURL: targetDoctor.photoURL,
        initiatedBy: 'patient',
      });
      const confMsg = t.doctorConnectConfirmedSpoken
        ? t.doctorConnectConfirmedSpoken.replace(/\{name\}/g, targetDoctor.fullName)
        : `Connection request sent to Dr. ${targetDoctor.fullName}.`;
      speakFeedback(confMsg);
      setAwaitingConnectConfirm(false);
      setVoiceSelectedDoctor(null);
      await loadPatientData();
    } catch (err: any) {
      console.error('Error sending connection request by voice:', err);
      speakFeedback(err.message || 'Failed to send connection request.');
    }
  };

  // App-Wide Voice Navigation Handler Registration for Patient
  useEffect(() => {
    const unregister = registerHandler('patient', (action) => {
      if (action.intent === 'NAVIGATE_HEALTH_UPDATE') {
        setActiveTab('voice_update');
        speakFeedback(getSpokenFeedbackForIntent('NAVIGATE_HEALTH_UPDATE', appLanguage));
        return true;
      }
      if (action.intent === 'OPEN_TIMELINE') {
        setActiveTab('timeline');
        speakFeedback(getSpokenFeedbackForIntent('OPEN_TIMELINE', appLanguage));
        return true;
      }
      if (action.intent === 'FIND_DOCTOR_VOICE' && action.doctorNameQuery) {
        const queryName = action.doctorNameQuery.toLowerCase().replace(/^dr\.?\s+/i, '').trim();
        const matches = allDoctors.filter((d) => {
          if (d.isVerified !== true) return false;
          const normDocName = d.fullName.toLowerCase().replace(/^dr\.?\s+/i, '').trim();
          return normDocName.includes(queryName) || queryName.includes(normDocName) || d.specialization.toLowerCase().includes(queryName);
        });

        setActiveTab('find_doctors');
        setDirectorySearchQuery(action.doctorNameQuery);

        if (matches.length === 1) {
          const target = matches[0];
          setVoiceSelectedDoctor(target);
          setSelectedDoctorForProfile(target);
          setAwaitingConnectConfirm(true);
          const askMsg = t.doctorConnectAskSpoken
            ? t.doctorConnectAskSpoken.replace(/\{name\}/g, target.fullName).replace(/\{specialization\}/g, target.specialization)
            : `Found Dr. ${target.fullName}, ${target.specialization}. Would you like to send a connection request to Dr. ${target.fullName}?`;
          speakFeedback(askMsg);
          return true;
        } else if (matches.length > 1) {
          const multiMsg = t.multipleDoctorsFound
            ? t.multipleDoctorsFound.replace(/\{name\}/g, action.doctorNameQuery).replace(/\{count\}/g, String(matches.length))
            : `Found ${matches.length} doctors matching ${action.doctorNameQuery}. Please select the correct doctor.`;
          speakFeedback(multiMsg);
          return true;
        } else {
          const notFoundMsg = t.doctorNotFoundSpoken || "I couldn't find that doctor. Please try another name.";
          speakFeedback(notFoundMsg);
          return true;
        }
      }
      if (action.intent === 'CONFIRM_DOCTOR_CONNECT' || (awaitingConnectConfirm && (action.intent === 'CONFIRM_UPDATE' || action.recordAction === 'confirm'))) {
        if (awaitingConnectConfirm && voiceSelectedDoctor && appUser?.uid) {
          handleSendVoiceConnectionRequest(voiceSelectedDoctor);
          return true;
        }
      }
      if (action.intent === 'CONNECT_DOCTOR' || action.intent === 'VIEW_DOCTOR_REQUESTS') {
        setActiveTab('find_doctors');
        speakFeedback(getSpokenFeedbackForIntent('CONNECT_DOCTOR', appLanguage));
        return true;
      }
      if (action.intent === 'OPEN_PROFILE') {
        setActiveTab('profile');
        speakFeedback(getSpokenFeedbackForIntent('OPEN_PROFILE', appLanguage));
        return true;
      }
      if (action.intent === 'GO_BACK') {
        setActiveTab('voice_update');
        speakFeedback(getSpokenFeedbackForIntent('GO_BACK', appLanguage));
        return true;
      }
      if (action.intent === 'START_RECORDING') {
        if (activeTab !== 'voice_update') setActiveTab('voice_update');
        if (interactionState === 'idle') {
          toggleRecording();
          speakFeedback(getSpokenFeedbackForIntent('START_RECORDING', appLanguage));
          return true;
        }
      }
      if (action.intent === 'STOP_RECORDING') {
        if (interactionState === 'listening') {
          toggleRecording();
          speakFeedback(getSpokenFeedbackForIntent('STOP_RECORDING', appLanguage));
          return true;
        }
      }
      if (action.intent === 'CONFIRM_UPDATE' || (interactionState === 'reviewing' && currentSummary && action.intent === 'CONFIRM_DOCTOR_CONNECT')) {
        if (interactionState === 'reviewing' && currentSummary) {
          handleConfirmAndSave();
          speakFeedback(getSpokenFeedbackForIntent('CONFIRM_UPDATE', appLanguage));
          return true;
        }
      }
      if (action.intent === 'EDIT_BY_VOICE') {
        if (interactionState === 'reviewing') {
          setIsCorrecting(true);
          speakFeedback(getSpokenFeedbackForIntent('EDIT_BY_VOICE', appLanguage));
          return true;
        }
      }
      if (action.intent === 'READ_SUMMARY') {
        if (currentSummary) {
          speakGeneratedSummaryConfirmation(currentSummary);
          return true;
        }
      }
      if (action.intent === 'VIEW_SUMMARY' || action.intent === 'ANALYZE_UPDATE') {
        if (interactionState === 'listening' && transcript.trim()) {
          toggleRecording();
          return true;
        }
      }

      return false;
    });
    return unregister;
  }, [
    registerHandler,
    speakFeedback,
    activeTab,
    interactionState,
    currentSummary,
    transcript,
    appLanguage,
    allDoctors,
    awaitingConnectConfirm,
    voiceSelectedDoctor,
    activePatientProfile,
    appUser,
    t,
  ]);

  // Respond to Connection Request (Approve / Reject)
  const handleRespondToRequest = async (request: ConnectionRequest, status: 'approved' | 'rejected') => {
    if (!appUser?.uid) return;
    try {
      setRespondingRequestId(request.id);
      await dbService.respondToConnectionRequest(request.id, status, appUser.uid, request.doctorId);
      await refreshProfile();
      await loadPatientData();
    } catch (err: any) {
      console.error('Failed to respond to connection request:', err);
      alert('Action failed: ' + err.message);
    } finally {
      setRespondingRequestId(null);
    }
  };

  // Revoke Doctor Connection Access
  const handleRevokeDoctorAccess = async (request: ConnectionRequest) => {
    if (!appUser?.uid) return;
    const confirmRevoke = window.confirm(
      `Are you sure you want to revoke access for Dr. ${request.doctorName}? They will no longer be able to view your medical updates or timeline.`
    );
    if (!confirmRevoke) return;

    try {
      setRespondingRequestId(request.id);
      await dbService.revokeDoctorAccess(appUser.uid, request.doctorId, request.id);
      await refreshProfile();
      await loadPatientData();
    } catch (err: any) {
      console.error('Failed to revoke access:', err);
      alert('Revoke failed: ' + err.message);
    } finally {
      setRespondingRequestId(null);
    }
  };

  // Distinct Incoming vs Outgoing requests and connected doctors
  const outgoingRequests = useMemo(() => {
    return connectionRequests.filter(
      (r) => r.status === 'pending' && (r.initiatedBy === 'patient' || !r.initiatedBy)
    );
  }, [connectionRequests]);

  const incomingRequests = useMemo(() => {
    return connectionRequests.filter(
      (r) => r.status === 'pending' && r.initiatedBy === 'doctor'
    );
  }, [connectionRequests]);

  const connectedDoctors = useMemo(() => {
    const list: Array<{
      id: string;
      doctorId: string;
      doctorName: string;
      doctorSpecialization: string;
      doctorClinic: string;
      doctorRegNumber: string;
      doctorPhotoURL?: string;
      connectedAt?: string;
    }> = [];

    const seenDoctorIds = new Set<string>();

    for (const r of connectionRequests) {
      if ((r.status === 'approved' || r.status === 'accepted') && r.doctorId) {
        if (!seenDoctorIds.has(r.doctorId)) {
          seenDoctorIds.add(r.doctorId);
          list.push({
            id: r.id,
            doctorId: r.doctorId,
            doctorName: r.doctorName,
            doctorSpecialization: r.doctorSpecialization,
            doctorClinic: r.doctorClinic,
            doctorRegNumber: r.doctorRegNumber,
            doctorPhotoURL: r.doctorPhotoURL,
            connectedAt: r.updatedAt || r.createdAt,
          });
        }
      }
    }

    if (activePatientProfile?.authorizedDoctorIds) {
      for (const docId of activePatientProfile.authorizedDoctorIds) {
        // Exclude if connection request was revoked or rejected
        const isRevokedOrRejected = connectionRequests.some(
          (r) => r.doctorId === docId && (r.status === 'revoked' || r.status === 'rejected')
        );
        if (isRevokedOrRejected) continue;

        if (!seenDoctorIds.has(docId)) {
          seenDoctorIds.add(docId);
          const found = allDoctors.find((d) => d.doctorId === docId);
          list.push({
            id: `auth_${docId}`,
            doctorId: docId,
            doctorName: found?.fullName || 'Specialist Doctor',
            doctorSpecialization: found?.specialization || 'Clinical Specialist',
            doctorClinic: found?.clinicOrHospital || 'Hospital / Clinic',
            doctorRegNumber: found?.registrationNumber || 'VERIFIED',
            doctorPhotoURL: found?.photoURL,
          });
        }
      }
    }

    return list;
  }, [connectionRequests, activePatientProfile?.authorizedDoctorIds, allDoctors]);

  const approvedConnections = connectedDoctors;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Patient Welcome Header & Unique Patient ID */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-950 text-white shadow-xl shadow-teal-950/20 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 max-w-xl">
            <UserAvatar
              photoURL={activePatientProfile?.photoURL || appUser?.photoURL}
              name={activePatientProfile?.fullName || appUser?.displayName || 'Patient'}
              role="patient"
              size="xl"
              className="ring-4 ring-white/20 shadow-lg shrink-0"
            />
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/15 backdrop-blur text-[11px] font-semibold tracking-wide uppercase">
                <Languages className="w-3.5 h-3.5" /> {t.patientBannerBadge}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {t.patientGreetingPrefix.replace(/,\s*$/, '')}, {activePatientProfile?.fullName || appUser?.displayName || 'Patient'}
              </h1>
              <p className="text-teal-100 text-xs sm:text-sm">
                {t.patientBannerSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Real-time Connection Status Notice inside Welcome Banner */}
        {outgoingRequests.length > 0 && (
          <div className="mt-5 p-3.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 backdrop-blur text-amber-200 text-xs flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-300 shrink-0 animate-spin" />
              <span>
                <strong>Connection Request Pending:</strong> Dr. {outgoingRequests[0].doctorName} is reviewing your connection request.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('connected_doctors')}
              className="px-3 py-1 bg-amber-400 text-amber-950 font-bold rounded-lg hover:bg-amber-300 transition-colors shrink-0 cursor-pointer"
            >
              View Status
            </button>
          </div>
        )}

        {incomingRequests.length > 0 && (
          <div className="mt-3 p-3.5 rounded-2xl bg-teal-500/20 border border-teal-400/40 backdrop-blur text-teal-200 text-xs flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-teal-300 shrink-0 animate-pulse" />
              <span>
                <strong>Incoming Request:</strong> Dr. {incomingRequests[0].doctorName} requested to connect with you.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('connected_doctors')}
              className="px-3 py-1 bg-teal-400 text-teal-950 font-bold rounded-lg hover:bg-teal-300 transition-colors shrink-0 cursor-pointer"
            >
              Review Request
            </button>
          </div>
        )}
      </div>

      {/* Persistent Connection Quick Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${connectedDoctors.length > 0
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600'
              : outgoingRequests.length > 0
                ? 'bg-amber-50 dark:bg-amber-950 text-amber-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Doctor Connection Status:</span>
              {connectedDoctors.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {connectedDoctors.length} Connected
                </span>
              ) : outgoingRequests.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-black">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  Request Pending
                </span>
              ) : (
                <span className="text-slate-500 font-semibold">Not Connected</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {connectedDoctors.length > 0
                ? `Authorized doctors: Dr. ${connectedDoctors.map((d: any) => d.doctorName).join(', ')}`
                : outgoingRequests.length > 0
                  ? `Pending review from Dr. ${outgoingRequests[0].doctorName}`
                  : 'Connect with a verified specialist to share your health updates and medical timeline.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connectedDoctors.length === 0 && (
            <button
              onClick={() => setActiveTab('find_doctors')}
              className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Find Doctors
            </button>
          )}
          <button
            onClick={() => setActiveTab('connected_doctors')}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            Manage Connections
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('voice_update')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'voice_update'
            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
        >
          <Mic className="w-4 h-4" />
          <span>{t.tabRecordHealthUpdate}</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'timeline'
            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
        >
          <History className="w-4 h-4" />
          <span>{t.tabMedicalTimeline} ({timelineEntries.length})</span>
        </button>

        {/* TAB 3: Find Doctors (Directory) */}
        <button
          onClick={() => setActiveTab('find_doctors')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'find_doctors'
            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>{t.tabFindDoctors || 'Find Doctors'}</span>
        </button>

        {/* TAB 4: Connected Doctors */}
        <button
          onClick={() => setActiveTab('connected_doctors')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative cursor-pointer ${activeTab === 'connected_doctors' || activeTab === 'doctor_connections'
            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>{t.tabConnectedDoctors || 'Connected Doctors'} ({connectedDoctors.length})</span>
          {outgoingRequests.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center">
              {outgoingRequests.length} pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${activeTab === 'profile'
            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
        >
          <User className="w-4 h-4" />
          <span>{roleLabels.profile}</span>
        </button>
      </div>

      {/* TAB 1: Voice Health Update */}
      {activeTab === 'voice_update' && (
        <div className="space-y-6">
          {/* Language Status Banner */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                <Languages className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{t.voiceAndInterfaceLang}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-extrabold text-[11px]">
                    {languageOptions.find((l) => l.code === appLanguage)?.native || 'English'}
                    {' '}({languageOptions.find((l) => l.code === appLanguage)?.label || 'English'})
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t.speakNaturallyHint}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all shrink-0 self-start sm:self-auto"
            >
              {t.changeInProfile}
            </button>
          </div>

          {/* Active Medical Baseline Notice */}
          {initialBaseline ? (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                  <Stethoscope className="w-4 h-4" />
                  <span>{t.activeBaselineConnected} ({t.baselineDoctorPrefix} {initialBaseline.doctorName || 'Practitioner'})</span>
                </div>
                <p className="text-[11px] text-blue-600/90 dark:text-blue-300/80">
                  {t.diagnosisPrefix}: <strong>{initialBaseline.diagnosis}</strong> • {t.baselineSymptomsPrefix}: {initialBaseline.baselineSymptoms?.map((s) => s.symptom).join(', ')}
                </p>
              </div>
              <span className="text-[10px] bg-blue-200/60 dark:bg-blue-900 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider shrink-0 text-blue-800 dark:text-blue-200">
                {t.medicalBaselineActiveBadge}
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                <span>{t.noBaselineNotice}</span>
              </div>
            </div>
          )}

          {/* Spoken Language (Voice Input) Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {t.spokenLanguageSelectLabel}
                </span>
                <span className="text-[11px] text-slate-500">
                  {t.preferredSummaryLanguageLabel}: <strong className="text-teal-600 dark:text-teal-400 font-semibold">{languageOptions.find((l) => l.code === appLanguage)?.native} ({languageOptions.find((l) => l.code === appLanguage)?.label})</strong>
                </span>
              </div>
            </div>
            <select
              id="patient-spoken-language-select"
              value={spokenLanguage}
              onChange={(e) => setSpokenLanguage(e.target.value as AppLanguage)}
              className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-teal-500 shadow-sm"
            >
              {languageOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.native} ({opt.label})
                </option>
              ))}
            </select>
          </div>

          {/* Voice-First Microphone Interface */}
          <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {interactionState === 'listening'
                  ? t.micListening
                  : interactionState === 'processing'
                    ? t.micProcessing
                    : t.patientAskCondition}
              </h2>
            </div>

            {/* Microphone Button */}
            <div className="relative flex items-center justify-center">
              {interactionState === 'listening' && (
                <>
                  <div className="absolute w-36 h-36 rounded-full bg-teal-500/20 animate-ping" />
                  <div className="absolute w-44 h-44 rounded-full bg-teal-500/10 animate-pulse" />
                </>
              )}

              <button
                onClick={toggleRecording}
                disabled={interactionState === 'processing'}
                className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-300 transform active:scale-95 ${interactionState === 'listening'
                  ? 'bg-red-500 text-white hover:bg-red-600 ring-8 ring-red-500/20'
                  : interactionState === 'processing'
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-teal-600/30 ring-8 ring-teal-500/10'
                  }`}
              >
                {interactionState === 'listening' ? (
                  <>
                    <MicOff className="w-10 h-10 animate-pulse" />
                    <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">{t.tapToStop}</span>
                  </>
                ) : interactionState === 'processing' ? (
                  <>
                    <RefreshCw className="w-10 h-10 animate-spin text-teal-600" />
                    <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">{t.micProcessing}</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-10 h-10" />
                    <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">{t.micTapToSpeak}</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Transcript / Manual Input Box */}
            <div className="w-full max-w-xl space-y-2 text-left">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>{t.transcriptLabel}</span>
                {transcript && <span className="text-teal-600">{t.editableBadge}</span>}
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={t.transcriptPlaceholder}
                rows={3}
                className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />

              {transcript && interactionState !== 'listening' && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="text-[11px] text-slate-500 truncate">
                    {interactionState === 'processing' ? (
                      <span className="text-teal-600 dark:text-teal-400 font-semibold animate-pulse flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Analyzing symptoms with Gemini AI...</span>
                      </span>
                    ) : (
                      <span>Review or edit before analyzing.</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleProcessTranscript(transcript)}
                    disabled={interactionState === 'processing'}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-60 cursor-pointer shrink-0"
                  >
                    {interactionState === 'processing' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{t.analyzeUpdateWithAi}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* In-place Error Notification with Retry */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{errorMessage}</p>
                      <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                        Your transcript &ldquo;{transcript.slice(0, 40)}{transcript.length > 40 ? '...' : ''}&rdquo; is preserved. You can edit it or retry analysis.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleProcessTranscript(transcript)}
                      disabled={interactionState === 'processing' || !transcript.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${interactionState === 'processing' ? 'animate-spin' : ''}`} />
                      <span>Retry Analysis</span>
                    </button>
                    <button
                      onClick={() => setErrorMessage(null)}
                      className="p-1 rounded-lg text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 cursor-pointer"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Structured Review & Explicit Confirmation */}
          {currentSummary && (
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-teal-500/30 shadow-lg space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-600 shrink-0" />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {t.verifyUpdateTitle}
                    </h3>
                    <p className="text-xs text-teal-700 dark:text-teal-300 font-medium mt-0.5">
                      {t.patientSummaryReady}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-full uppercase self-start sm:self-auto">
                  {t.pendingConfirmationBadge}
                </span>
              </div>

              {/* Spoken Confirmation Banner after Correction */}
              {currentSummary.spokenConfirmation && (
                <div className="p-3.5 rounded-2xl bg-teal-50/90 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-100 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="text-xs font-semibold">{currentSummary.spokenConfirmation}</span>
                </div>
              )}

              {/* Patient-Friendly Audio Playback Card */}
              {currentSummary.patientFriendlyNote && (
                <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
                      {t.readBackTitle}
                    </span>
                    <p className="text-xs sm:text-sm text-teal-950 dark:text-teal-100 font-medium italic">
                      &ldquo;{currentSummary.patientFriendlyNote}&rdquo;
                    </p>
                  </div>
                  {hasSpeechSynth && (
                    <button
                      onClick={() => handleSpeak(currentSummary.patientFriendlyNote)}
                      className={`p-2.5 rounded-xl shrink-0 transition-colors ${isSpeaking
                        ? 'bg-teal-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 hover:bg-teal-100'
                        }`}
                      title={isSpeaking ? t.stopSpeaking : t.listenToSummary}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Health Change Detection Comparison (against Baseline) */}
              {currentSummary.comparisonWithBaseline && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-teal-600" />
                      <span>{t.comparisonWithBaselineTitle}</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {t.patientReportedComparisonBadge}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Improved */}
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5" /> {t.improvedSymptomsTitle}
                      </span>
                      {currentSummary.comparisonWithBaseline.improvedSymptoms?.length ? (
                        <ul className="mt-1 space-y-1 text-xs text-emerald-900 dark:text-emerald-200 list-disc list-inside">
                          {currentSummary.comparisonWithBaseline.improvedSymptoms.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-emerald-600/70 mt-1">{t.noneReported}</p>
                      )}
                    </div>

                    {/* Persistent */}
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                      <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {t.persistentSymptomsTitle}
                      </span>
                      {currentSummary.comparisonWithBaseline.persistentSymptoms?.length ? (
                        <ul className="mt-1 space-y-1 text-xs text-amber-900 dark:text-amber-200 list-disc list-inside">
                          {currentSummary.comparisonWithBaseline.persistentSymptoms.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-amber-600/70 mt-1">{t.noneReported}</p>
                      )}
                    </div>

                    {/* New Symptoms */}
                    <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900">
                      <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> {t.newlyReportedSymptomsTitle}
                      </span>
                      {currentSummary.comparisonWithBaseline.newSymptoms?.length ? (
                        <ul className="mt-1 space-y-1 text-xs text-indigo-900 dark:text-indigo-200 list-disc list-inside">
                          {currentSummary.comparisonWithBaseline.newSymptoms.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-indigo-600/70 mt-1">{t.noneReported}</p>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 italic">
                    {t.medicalDisclaimer}
                  </p>
                </div>
              )}

              {/* Symptoms Grid */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {t.symptomsIdentifiedTitle}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentSummary.symptoms?.map((sym, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                          {sym.symptom}
                        </div>
                        {sym.notes && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{sym.notes}</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${sym.status === 'improved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                            : sym.status === 'worsened'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                            }`}
                        >
                          {sym.status}
                        </span>
                        {sym.severity && (
                          <div className="text-[10px] text-slate-400 capitalize mt-0.5">
                            {sym.severity} {t.severityLabel}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Voice-Based Correction Section */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {t.correctionPrompt}
                  </span>
                  <button
                    onClick={() => setIsCorrecting(!isCorrecting)}
                    className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isCorrecting ? t.cancelCorrectionBtn : t.editByVoiceBtn}</span>
                  </button>
                </div>

                {isCorrecting && (
                  <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={correctionTranscript}
                        onChange={(e) => setCorrectionTranscript(e.target.value)}
                        placeholder={t.correctionInputPlaceholder}
                        className="flex-1 p-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        onClick={toggleCorrectionRecording}
                        className={`p-2.5 rounded-xl transition-colors ${correctionRecognition
                          ? 'bg-red-500 text-white'
                          : 'bg-amber-500 text-white hover:bg-amber-600'
                          }`}
                        title={t.tapToRecordCorrection}
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleApplyCorrection}
                        disabled={isCorrectingWithAi || !correctionTranscript.trim()}
                        className="px-4 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isCorrectingWithAi ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>{t.applyCorrectionBtn}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Explicit Confirmation Action Bar */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[11px] text-slate-500">
                  {t.confirmAndSaveHint}
                </p>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setCurrentSummary(null);
                      setTranscript('');
                      setInteractionState('idle');
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {t.cancelDiscardBtn}
                  </button>

                  <button
                    onClick={handleConfirmAndSave}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 shadow-md shadow-teal-600/30 transition-all active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t.confirmAndSaveBtn}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Confirmation Toast */}
          {interactionState === 'confirmed' && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs">
                  <strong>{t.saveSuccessTitle}: </strong>{t.saveSuccessMessage}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer self-end sm:self-auto"
              >
                <History className="w-3.5 h-3.5" />
                <span>{t.tabMedicalTimeline} →</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Chronological Medical Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-teal-600" />
                <span>{t.medicalTimelineHeader}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {t.medicalTimelineDesc}
              </p>
            </div>
            <button
              onClick={loadPatientData}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-teal-600"
              title="Refresh timeline"
            >
              <RefreshCw className={`w-4 h-4 ${loadingTimeline ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingTimeline ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
              {t.connectingApp}
            </div>
          ) : timelineEntries.length === 0 ? (
            <div className="p-10 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {t.emptyTimelineTitle}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {t.emptyTimelineDesc}
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {timelineEntries.map((entry) => {
                const isBaseline = entry.type === 'initial_baseline';
                const isConsult = entry.type === 'followup_consultation';

                return (
                  <div key={entry.id} className="relative group">
                    <div
                      className={`absolute -left-[27px] top-4 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${isBaseline
                        ? 'bg-blue-600 ring-4 ring-blue-500/20'
                        : isConsult
                          ? 'bg-indigo-600'
                          : 'bg-emerald-500'
                        }`}
                    />

                    <div
                      className={`p-5 rounded-2xl border shadow-sm space-y-3 ${isBaseline
                        ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60'
                        : isConsult
                          ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full ${isBaseline
                              ? 'bg-blue-600 text-white'
                              : isConsult
                                ? 'bg-indigo-600 text-white'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                              }`}
                          >
                            {isBaseline
                              ? t.entryInitialConsultation
                              : isConsult
                                ? t.entryFollowUpConsultation
                                : t.entryHealthUpdate}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {entry.authorName}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500">
                          {formatTimelineDate(entry.timestamp)}
                        </span>
                      </div>

                      {isBaseline || isConsult ? (
                        (() => {
                          const consult = entry.data as Consultation;
                          return (
                            <div className="space-y-3 text-xs">
                              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/40 space-y-1">
                                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                                  {t.diagnosisPrefix}
                                </span>
                                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                  {consult.diagnosis || 'Diagnosis recorded'}
                                </p>
                              </div>

                              {consult.chiefComplaints?.length > 0 && (
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    {t.chiefComplaintsTitle}:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {consult.chiefComplaints.map((c, i) => (
                                      <span
                                        key={i}
                                        className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300"
                                      >
                                        {c}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {consult.baselineSymptoms?.length > 0 && (
                                <div>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    {t.baselineSymptomsPrefix}:
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                    {consult.baselineSymptoms.map((bs, i) => (
                                      <div
                                        key={i}
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

                              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-1">
                                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                                  {t.treatmentPlanTitle}
                                </span>
                                <p className="text-xs text-emerald-950 dark:text-emerald-100 whitespace-pre-line">
                                  {consult.treatmentPlan || 'As advised during consultation.'}
                                </p>
                              </div>

                              {consult.followUpAdvice && (
                                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                  <strong>{t.followUpAdviceTitle}:</strong> {consult.followUpAdvice}
                                </div>
                              )}

                              {/* View Details Button for Consultation */}
                              <div className="pt-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTimelineEntry(entry)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{t.viewDetailsBtn}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        (() => {
                          const update = entry.data as HealthUpdate;
                          const spokenOpt = languageOptions.find(
                            (l) => l.code === (update.originalLanguage?.replace('-IN', '') as any) || l.locale === update.originalLanguage || l.code === (update.language?.replace('-IN', '') as any)
                          );
                          const spokenLangLabel = spokenOpt ? `${spokenOpt.native} (${spokenOpt.label})` : (update.originalLanguage || update.language || 'Default');
                          const summaryPreview = update.finalConfirmedSummary || update.structuredSummary?.patientFriendlyNote || update.rawTranscript;

                          return (
                            <div className="space-y-3 text-xs">
                              {/* Status and Spoken Language Meta Badges */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  {t.confirmationStatusConfirmed}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[10px]">
                                  <Globe className="w-3 h-3 text-slate-500" />
                                  {t.originalSpokenLanguageLabel}: <strong className="ml-0.5">{spokenLangLabel}</strong>
                                </span>
                              </div>

                              {/* Confirmed Summary Preview */}
                              <div className="p-3.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/40 space-y-1">
                                <span className="text-[10px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider block">
                                  {t.confirmedHealthSummaryTitle}
                                </span>
                                <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-3 leading-relaxed">
                                  {summaryPreview}
                                </p>
                              </div>

                              {/* Original Spoken Voice Transcript Quote */}
                              <div className="italic text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 line-clamp-2">
                                &ldquo;{update.rawTranscript}&rdquo;
                              </div>

                              {/* Symptoms Pills */}
                              {update.structuredSummary?.symptoms?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {update.structuredSummary.symptoms.map((s, idx) => (
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
                              )}

                              {/* Health Change Indicators */}
                              {update.comparisonWithBaseline && (
                                <div className="flex flex-wrap gap-2 text-[11px]">
                                  {update.comparisonWithBaseline.improvedSymptoms?.length > 0 && (
                                    <div className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-semibold">
                                      <TrendingDown className="w-3 h-3" />
                                      <span>{t.improvedSymptomsTitle}: {update.comparisonWithBaseline.improvedSymptoms.join(', ')}</span>
                                    </div>
                                  )}
                                  {update.comparisonWithBaseline.persistentSymptoms?.length > 0 && (
                                    <div className="text-amber-700 dark:text-amber-300 flex items-center gap-1 font-semibold">
                                      <Clock className="w-3 h-3" />
                                      <span>{t.persistentSymptomsTitle}: {update.comparisonWithBaseline.persistentSymptoms.join(', ')}</span>
                                    </div>
                                  )}
                                  {update.comparisonWithBaseline.newSymptoms?.length > 0 && (
                                    <div className="text-indigo-700 dark:text-indigo-300 flex items-center gap-1 font-semibold">
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>{t.newlyReportedSymptomsTitle}: {update.comparisonWithBaseline.newSymptoms.join(', ')}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* View Details Button */}
                              <div className="pt-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTimelineEntry(entry)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{t.viewDetailsBtn}</span>
                                </button>
                              </div>
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
      )}

      {/* TAB 3: Find Doctors (Directory) */}
      {activeTab === 'find_doctors' && (
        <DoctorDirectory
          doctors={allDoctors}
          connectionRequests={connectionRequests}
          authorizedDoctorIds={activePatientProfile?.authorizedDoctorIds || []}
          isLoading={loadingDoctors}
          onRefresh={loadPatientData}
          initialSearchQuery={directorySearchQuery}
          onRequestSent={(newReq) => {
            setConnectionRequests((prev) => {
              const filtered = prev.filter((r) => r.id !== newReq.id && r.doctorId !== newReq.doctorId);
              return [newReq, ...filtered];
            });
            loadPatientData();
          }}
        />
      )}

      {/* TAB 4: Connected Doctors & Access Management */}
      {(activeTab === 'connected_doctors' || activeTab === 'doctor_connections') && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-600" />
                <span>{t.tabConnectedDoctors || 'Connected Doctors'}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {t.doctorAccessDesc}
              </p>
            </div>
            <button
              onClick={loadPatientData}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-teal-600 cursor-pointer"
              title="Refresh requests"
            >
              <RefreshCw className={`w-4 h-4 ${loadingRequests ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* SECTION 1: Outgoing Requests (Sent by You to Doctors) */}
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Outgoing Requests to Doctors ({outgoingRequests.length})</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Connection requests you sent to doctors that are pending their clinical review.
              </p>
            </div>

            {outgoingRequests.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                No outgoing requests pending doctor review.
              </div>
            ) : (
              <div className="space-y-3">
                {outgoingRequests.map((req: ConnectionRequest) => (
                  <div
                    key={req.id}
                    className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          Dr. {req.doctorName}
                        </span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                          <span>Request Pending</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {req.doctorSpecialization} • {req.doctorClinic}
                      </p>
                      {req.requestNote && (
                        <p className="text-[11px] text-amber-900 dark:text-amber-200 italic mt-1">
                          &ldquo;{req.requestNote}&rdquo;
                        </p>
                      )}
                      <span className="text-[10px] text-slate-400 block">
                        Requested: {formatTimelineDate(req.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const pub = allDoctors.find((d) => d.doctorId === req.doctorId) || {
                            doctorId: req.doctorId,
                            fullName: req.doctorName,
                            specialization: req.doctorSpecialization,
                            clinicOrHospital: req.doctorClinic,
                            registrationNumber: req.doctorRegNumber,
                            photoURL: req.doctorPhotoURL,
                            isVerified: true,
                          };
                          setSelectedDoctorForProfile(pub);
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Doctor Profile</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: Incoming Requests from Doctors (if any) */}
          {incomingRequests.length > 0 && (
            <div className="space-y-3 pt-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  <span>Incoming Doctor Requests ({incomingRequests.length})</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Doctors requesting connection with you to view your health updates.
                </p>
              </div>

              <div className="space-y-3">
                {incomingRequests.map((req: ConnectionRequest) => (
                  <div
                    key={req.id}
                    className="p-5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border-2 border-teal-300 dark:border-teal-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          Dr. {req.doctorName}
                        </span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 font-bold px-2 py-0.5 rounded-full">
                          Reg: {req.doctorRegNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {req.doctorSpecialization} • {req.doctorClinic}
                      </p>
                      {req.requestNote && (
                        <p className="text-[11px] text-teal-900 dark:text-teal-200 italic mt-1">
                          &ldquo;{req.requestNote}&rdquo;
                        </p>
                      )}
                      <span className="text-[10px] text-slate-400 block">
                        Requested: {formatTimelineDate(req.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRespondToRequest(req, 'rejected')}
                        disabled={respondingRequestId === req.id}
                        className="px-4 py-2 rounded-xl border border-red-200 text-red-600 font-bold text-xs hover:bg-red-50 dark:border-red-900 dark:text-red-400 transition-colors cursor-pointer"
                      >
                        {t.rejectConnectionBtn}
                      </button>
                      <button
                        onClick={() => handleRespondToRequest(req, 'approved')}
                        disabled={respondingRequestId === req.id}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        {respondingRequestId === req.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>{t.approveConnectionBtn}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: Connected Doctors (Authorized Active Access) */}
          <div className="space-y-3 pt-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Connected Doctors ({connectedDoctors.length})</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Doctors currently authorized to review your confirmed health updates and medical timeline.
              </p>
            </div>

            {connectedDoctors.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                <Stethoscope className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No connected doctors yet
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Browse our directory of registered medical specialists and connect to share your health updates and consultation records.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('find_doctors')}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                >
                  Browse Doctor Directory
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connectedDoctors.map((conn: any) => (
                  <div
                    key={conn.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          Dr. {conn.doctorName}
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" /> Connected
                        </span>
                      </div>
                      <p className="text-xs text-teal-700 dark:text-teal-400 font-semibold">
                        {conn.doctorSpecialization}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {conn.doctorClinic}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Reg: {conn.doctorRegNumber}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          const pub = allDoctors.find((d) => d.doctorId === conn.doctorId) || {
                            doctorId: conn.doctorId,
                            fullName: conn.doctorName,
                            specialization: conn.doctorSpecialization,
                            clinicOrHospital: conn.doctorClinic,
                            registrationNumber: conn.doctorRegNumber,
                            photoURL: conn.doctorPhotoURL,
                            isVerified: true,
                          };
                          setSelectedDoctorForProfile(pub);
                        }}
                        className="flex-1 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Profile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRevokeDoctorAccess(conn as any)}
                        disabled={respondingRequestId === conn.id}
                        className="px-3.5 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 font-bold text-xs hover:bg-red-100 dark:bg-red-950/40 dark:border-red-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Revoke Access</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Patient Profile & Language Settings */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
          {/* Profile Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-extrabold text-lg">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {roleLabels.profile}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.patientProfileDesc}
                </p>
              </div>
            </div>

            {/* Profile Photo Upload Section */}
            <ProfilePhotoUpload
              currentPhotoURL={activePatientProfile?.photoURL || appUser?.photoURL}
              name={activePatientProfile?.fullName || appUser?.displayName || 'Patient'}
              role="patient"
              onPhotoUpdated={() => refreshProfile()}
            />

            {/* Patient Personal Details */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">{t.fullName}:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {activePatientProfile?.fullName || appUser?.displayName || 'Patient'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">{t.email}:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {appUser?.email || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">{t.tabConnectedDoctors}:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {approvedConnections.length} Active
                </span>
              </div>
            </div>

            {/* Language Selection Setting */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Languages className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <label htmlFor="patient-profile-lang-select" className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {roleLabels.interfaceLang}
                </label>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t.speakNaturallyHint}
              </p>
              <select
                id="patient-profile-lang-select"
                value={appLanguage}
                onChange={async (e) => {
                  const newAppLang = e.target.value as AppLanguage;
                  setAppLanguage(newAppLang);
                  const opt = languageOptions.find((l) => l.code === newAppLang);
                  if (appUser?.uid) {
                    await dbService.updateUserPreferredLanguage(appUser.uid, 'patient', (opt?.locale || newAppLang) as any);
                  }
                  speakFeedback(`Language switched to ${opt?.label || newAppLang}`);
                }}
                className="w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 shadow-sm cursor-pointer"
              >
                {languageOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.native} ({opt.label})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Medical Timeline Entry Details View */}
      {selectedTimelineEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {selectedTimelineEntry.type === 'patient_voice_update'
                      ? t.updateDetailsModalTitle
                      : t.consultationDetailsModalTitle}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {formatTimelineDate(selectedTimelineEntry.timestamp)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  speechService.stopSpeaking();
                  setIsDetailSpeaking(false);
                  setSelectedTimelineEntry(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Patient Voice Update */}
            {selectedTimelineEntry.type === 'patient_voice_update' && (() => {
              const update = selectedTimelineEntry.data as HealthUpdate;
              const spokenOpt = languageOptions.find(
                (l) => l.code === (update.originalLanguage?.replace('-IN', '') as any) || l.locale === update.originalLanguage || l.code === (update.language?.replace('-IN', '') as any)
              );
              const prefOpt = languageOptions.find(
                (l) => l.code === (update.preferredLanguage?.replace('-IN', '') as any) || l.locale === update.preferredLanguage
              ) || languageOptions.find((l) => l.code === appLanguage);

              const spokenLangLabel = spokenOpt ? `${spokenOpt.native} (${spokenOpt.label})` : (update.originalLanguage || update.language || 'Default');
              const prefLangLabel = prefOpt ? `${prefOpt.native} (${prefOpt.label})` : appLanguage;
              const confirmedText = update.finalConfirmedSummary || update.structuredSummary?.patientFriendlyNote || update.rawTranscript;

              return (
                <div className="space-y-4 text-xs">
                  {/* Meta Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {t.confirmationStatusConfirmed}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                      <Globe className="w-3.5 h-3.5 text-teal-600" />
                      {t.originalSpokenLanguageLabel}: <strong className="text-slate-900 dark:text-white">{spokenLangLabel}</strong>
                    </span>
                  </div>

                  {/* 1. Patient-Confirmed Summary in Preferred Language */}
                  <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span className="font-extrabold text-teal-900 dark:text-teal-200 text-xs">
                          {t.confirmedHealthSummaryTitle}
                        </span>
                        <span className="text-[10px] bg-teal-200/60 dark:bg-teal-900 px-2 py-0.5 rounded-full text-teal-900 dark:text-teal-200 font-bold">
                          {prefLangLabel}
                        </span>
                      </div>
                      {hasSpeechSynth && (
                        <button
                          type="button"
                          onClick={() => {
                            if (isDetailSpeaking) {
                              speechService.stopSpeaking();
                              setIsDetailSpeaking(false);
                            } else {
                              setIsDetailSpeaking(true);
                              speechService.speak(confirmedText, selectedLocale, () => {
                                setIsDetailSpeaking(false);
                              });
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer"
                        >
                          <Volume2 className={`w-3.5 h-3.5 ${isDetailSpeaking ? 'animate-bounce' : ''}`} />
                          <span>{isDetailSpeaking ? t.stopSpeaking : t.readAloudSummaryBtn}</span>
                        </button>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {confirmedText}
                    </p>
                  </div>

                  {/* 2. Original Spoken Transcript */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        {t.originalSpokenTranscriptTitle}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {spokenLangLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                      &ldquo;{update.rawTranscript}&rdquo;
                    </p>
                  </div>

                  {/* 3. Structured Symptom Information */}
                  {update.structuredSummary?.symptoms?.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        {t.symptomsIdentifiedTitle}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {update.structuredSummary.symptoms.map((sym, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-2"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                                {sym.symptom}
                              </div>
                              {sym.notes && (
                                <div className="text-[11px] text-slate-500 mt-0.5">{sym.notes}</div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span
                                className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${sym.status === 'improved'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                                  : sym.status === 'worsened'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                                  }`}
                              >
                                {sym.status}
                              </span>
                              {sym.severity && (
                                <div className="text-[10px] text-slate-400 capitalize mt-0.5">
                                  {sym.severity} {t.severityLabel}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Health Change Comparison with Baseline */}
                  {update.comparisonWithBaseline && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                        {t.healthIndicatorsLabel}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" /> {t.improvedSymptomsTitle}
                          </span>
                          <p className="text-[11px] text-emerald-900 dark:text-emerald-200 mt-1 font-medium">
                            {update.comparisonWithBaseline.improvedSymptoms?.length
                              ? update.comparisonWithBaseline.improvedSymptoms.join(', ')
                              : t.noneReported}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {t.persistentSymptomsTitle}
                          </span>
                          <p className="text-[11px] text-amber-900 dark:text-amber-200 mt-1 font-medium">
                            {update.comparisonWithBaseline.persistentSymptoms?.length
                              ? update.comparisonWithBaseline.persistentSymptoms.join(', ')
                              : t.noneReported}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900">
                          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {t.newlyReportedSymptomsTitle}
                          </span>
                          <p className="text-[11px] text-indigo-900 dark:text-indigo-200 mt-1 font-medium">
                            {update.comparisonWithBaseline.newSymptoms?.length
                              ? update.comparisonWithBaseline.newSymptoms.join(', ')
                              : t.noneReported}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. Medical Safety Distinction Notice */}
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 italic">
                    {t.patientReportedVsDoctorNotice}
                  </div>

                  {/* 6. Clinical Summary for Doctor (English) */}
                  {update.structuredSummary?.clinicalNote && (
                    <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs">
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block mb-1">
                        {t.clinicalSummaryTitle} (Standard Medical English)
                      </span>
                      <p className="text-slate-800 dark:text-slate-200">
                        {update.structuredSummary.clinicalNote}
                      </p>
                    </div>
                  )}

                  {/* 7. Voice Correction History */}
                  {update.correctionHistory?.length > 0 && (
                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {t.voiceCorrectionsHistoryTitle} ({update.correctionHistory.length})
                      </span>
                      <div className="space-y-1">
                        {update.correctionHistory.map((c, i) => (
                          <div key={i} className="text-[11px] text-slate-600 dark:text-slate-400">
                            • &ldquo;{c.correctionTranscript}&rdquo; <span className="text-[10px] text-slate-400">({new Date(c.timestamp).toLocaleTimeString()})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Modal Body: Consultation */}
            {(selectedTimelineEntry.type === 'initial_baseline' || selectedTimelineEntry.type === 'followup_consultation') && (() => {
              const consult = selectedTimelineEntry.data as Consultation;
              return (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-blue-600 text-white font-bold text-xs uppercase">
                      {consult.isInitialBaseline ? t.entryInitialConsultation : t.entryFollowUpConsultation}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Dr. {consult.doctorName || 'Doctor'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-1">
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
                      {t.diagnosisPrefix}
                    </span>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {consult.diagnosis || 'Clinical Diagnosis Recorded'}
                    </p>
                  </div>

                  {consult.chiefComplaints?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        {t.chiefComplaintsTitle}:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {consult.chiefComplaints.map((c, i) => (
                          <span key={i} className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {consult.baselineSymptoms?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        {t.baselineSymptomsPrefix}:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {consult.baselineSymptoms.map((bs, i) => (
                          <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between text-xs">
                            <span className="font-semibold text-slate-900 dark:text-white">{bs.symptom}</span>
                            <span className="text-slate-500 capitalize">{bs.severity} {bs.notes && `• ${bs.notes}`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                      {t.treatmentPlanTitle}
                    </span>
                    <p className="text-xs text-emerald-950 dark:text-emerald-100 whitespace-pre-line leading-relaxed">
                      {consult.treatmentPlan || 'As advised during consultation.'}
                    </p>
                  </div>

                  {consult.followUpAdvice && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                      <strong>{t.followUpAdviceTitle}:</strong> {consult.followUpAdvice}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  speechService.stopSpeaking();
                  setIsDetailSpeaking(false);
                  setSelectedTimelineEntry(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                {t.backToTimelineBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Doctor Detailed Profile Modal */}
      {selectedDoctorForProfile && (
        <DoctorProfileModal
          doctor={selectedDoctorForProfile}
          isOpen={Boolean(selectedDoctorForProfile)}
          onClose={() => {
            setSelectedDoctorForProfile(null);
            setVoiceSelectedDoctor(null);
            setAwaitingConnectConfirm(false);
          }}
          existingRequest={connectionRequests.find((r) => r.doctorId === selectedDoctorForProfile.doctorId)}
          isAlreadyConnected={
            activePatientProfile?.authorizedDoctorIds?.includes(selectedDoctorForProfile.doctorId) ||
            connectionRequests.some((r) => r.doctorId === selectedDoctorForProfile.doctorId && (r.status === 'approved' || r.status === 'accepted'))
          }
          onRequestSent={(newReq) => {
            setConnectionRequests((prev) => {
              const filtered = prev.filter((r) => r.id !== newReq.id && r.doctorId !== newReq.doctorId);
              return [newReq, ...filtered];
            });
            loadPatientData();
          }}
        />
      )}

      {/* Error Message Display */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
