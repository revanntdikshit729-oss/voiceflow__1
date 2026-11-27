import React, { useState } from 'react';
import {
  X,
  Stethoscope,
  Building,
  GraduationCap,
  ShieldCheck,
  Send,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { PublicDoctorProfile, ConnectionRequest } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { dbService } from '../../services/db';
import { useAuth } from '../../contexts/AuthContext';
import { translations } from '../../i18n/translations';

interface DoctorProfileModalProps {
  doctor: PublicDoctorProfile | null;
  isOpen: boolean;
  onClose: () => void;
  existingRequest?: ConnectionRequest | null;
  isAlreadyConnected?: boolean;
  onRequestSent?: (newRequest: ConnectionRequest) => void;
}

export const DoctorProfileModal: React.FC<DoctorProfileModalProps> = ({
  doctor,
  isOpen,
  onClose,
  existingRequest,
  isAlreadyConnected = false,
  onRequestSent,
}) => {
  const { appUser, patientProfile, appLanguage, refreshProfile } = useAuth();
  const t = translations[appLanguage] || translations.en;

  const [currentRequest, setCurrentRequest] = useState<ConnectionRequest | null | undefined>(existingRequest);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setCurrentRequest(existingRequest);
  }, [existingRequest]);

  if (!isOpen || !doctor) return null;

  // Determine connection status
  const effectiveRequest = currentRequest !== undefined ? currentRequest : existingRequest;
  const isApproved = isAlreadyConnected || effectiveRequest?.status === 'approved' || effectiveRequest?.status === 'accepted';
  const isPending = !isApproved && effectiveRequest?.status === 'pending';
  const isRejected = !isApproved && effectiveRequest?.status === 'rejected';
  const isRevoked = !isApproved && effectiveRequest?.status === 'revoked';

  const handleConnect = async () => {
    if (!appUser?.uid || isSending) return;
    setIsSending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const patientName = patientProfile?.fullName || appUser.displayName || 'Patient';
      const patientPhoto = patientProfile?.photoURL || appUser.photoURL;

      const req = await dbService.sendConnectionRequest({
        patientId: appUser.uid,
        uniquePatientId: patientProfile?.uniquePatientId || `VF-P-${appUser.uid.slice(0, 6).toUpperCase()}`,
        patientName,
        patientPhotoURL: patientPhoto,
        doctorId: doctor.doctorId,
        doctorName: doctor.fullName,
        doctorSpecialization: doctor.specialization,
        doctorClinic: doctor.clinicOrHospital,
        doctorRegNumber: doctor.registrationNumber || 'PENDING',
        doctorPhotoURL: doctor.photoURL,
        initiatedBy: 'patient',
        requestNote: `Patient requested connection to consult Dr. ${doctor.fullName} and share medical timeline updates.`,
      });

      // Immediately reflect pending state in UI
      setCurrentRequest(req);
      setSuccessMessage(`${t.connectionRequestSent || 'Request Sent'}! Dr. ${doctor.fullName} will review your connection request.`);
      await refreshProfile();
      if (onRequestSent) {
        onRequestSent(req);
      }
    } catch (err: any) {
      console.error('Failed to send connection request:', err);
      setErrorMessage(err.message || 'Failed to send connection request.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="doctor-profile-name"
      >
        {/* Header with gradient banner */}
        <div className="relative p-6 bg-gradient-to-r from-teal-700 via-teal-800 to-blue-900 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pt-2">
            <div className="ring-4 ring-white/20 rounded-full shadow-lg">
              <UserAvatar
                photoURL={doctor.photoURL}
                name={doctor.fullName}
                role="doctor"
                size="2xl"
                showRoleBadge={true}
              />
            </div>

            <div className="text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 id="doctor-profile-name" className="text-xl font-extrabold">
                  Dr. {doctor.fullName}
                </h2>
                {doctor.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-100 border border-emerald-400/40">
                    <ShieldCheck className="w-3 h-3 text-emerald-300" />
                    <span>{t.doctorVerified || 'Verified'}</span>
                  </span>
                )}
              </div>

              <p className="text-teal-100 text-xs font-semibold flex items-center justify-center sm:justify-start gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" />
                <span>{doctor.specialization}</span>
              </p>

              <p className="text-teal-200/80 text-[11px] flex items-center justify-center sm:justify-start gap-1.5">
                <Building className="w-3.5 h-3.5" />
                <span>{doctor.clinicOrHospital}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Status Feedback Banners */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="font-semibold leading-relaxed">{successMessage}</p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Current Connection Status Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Connection Status
            </span>
            {isApproved ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.connectionAlreadyConnected || 'Already Connected'}</span>
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span>{t.connectionRequestPending || 'Request Pending'}</span>
              </span>
            ) : isRejected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>{t.connectionRequestRejected || 'Request Declined'}</span>
              </span>
            ) : isRevoked ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-700/80">
                <span>Connection Revoked</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-700/60">
                Not Connected
              </span>
            )}
          </div>

          {/* Professional Credentials & Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>{t.doctorQualificationsLabel || 'Qualifications & Expertise'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 text-[11px] block">{t.doctorSpecializationLabel || 'Specialization'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{doctor.specialization}</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 text-[11px] block">{t.doctorQualificationsLabel || 'Qualifications'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {doctor.qualifications || 'MBBS, Certified Practitioner'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 text-[11px] block">{t.doctorClinicLabel || 'Hospital / Clinic'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{doctor.clinicOrHospital}</span>
              </div>

              {doctor.registrationNumber && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] block">{t.doctorRegNumberLabel || 'Registration Number'}</span>
                  <span className="font-mono font-bold text-teal-700 dark:text-teal-400">{doctor.registrationNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* About & Clinical Focus */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>{t.doctorAboutLabel || 'About Doctor'}</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              {doctor.description ||
                `Dr. ${doctor.fullName} is an active specialist in ${doctor.specialization} at ${doctor.clinicOrHospital}. Available on VoiceFlow to review patient clinical timelines and conduct baseline consultations.`}
            </p>
          </div>

          {/* Privacy Notice */}
          <div className="p-3 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 text-[11px] text-teal-900 dark:text-teal-200 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <p>
              Connecting allows Dr. {doctor.fullName} to review your confirmed health updates and medical timeline with your explicit consent.
            </p>
          </div>
        </div>

        {/* Modal Footer with Primary Connect Action */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            {t.closeModalBtn || 'Close'}
          </button>

          {isApproved ? (
            <button
              disabled
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-default"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Connected</span>
            </button>
          ) : isPending ? (
            <button
              disabled
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-500/20 cursor-default"
            >
              <Clock className="w-4 h-4 text-white animate-spin" />
              <span>Request Pending</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isSending}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-md shadow-teal-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>
                {isSending
                  ? 'Sending...'
                  : isRejected
                  ? t.reconnectBtn || 'Send New Request'
                  : `Connect with Dr. ${doctor.fullName}`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
