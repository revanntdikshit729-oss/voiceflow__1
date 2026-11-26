import React, { useState, useMemo } from 'react';
import {
  Search,
  Stethoscope,
  Building,
  GraduationCap,
  Eye,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  X,
  UserCheck,
} from 'lucide-react';
import { PublicDoctorProfile, ConnectionRequest } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { translations } from '../../i18n/translations';
import { useAuth } from '../../contexts/AuthContext';
import { DoctorProfileModal } from './DoctorProfileModal';

interface DoctorDirectoryProps {
  doctors: PublicDoctorProfile[];
  connectionRequests: ConnectionRequest[];
  authorizedDoctorIds?: string[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onRequestSent?: (newRequest: ConnectionRequest) => void;
  initialSearchQuery?: string;
}

export const DoctorDirectory: React.FC<DoctorDirectoryProps> = ({
  doctors,
  connectionRequests,
  authorizedDoctorIds = [],
  isLoading = false,
  onRefresh,
  onRequestSent,
  initialSearchQuery = '',
}) => {
  const { appLanguage } = useAuth();
  const t = translations[appLanguage] || translations.en;

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedDoctor, setSelectedDoctor] = useState<PublicDoctorProfile | null>(null);

  // Sync initial query if voice sets it
  React.useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Map doctors to their connection status
  const doctorStatusMap = useMemo(() => {
    const map = new Map<string, { status: 'approved' | 'pending' | 'rejected' | 'none'; request?: ConnectionRequest }>();

    for (const req of connectionRequests) {
      const current = map.get(req.doctorId);
      const isApprovedOrAccepted = req.status === 'approved' || req.status === 'accepted';
      const isCurrentApprovedOrAccepted = current?.status === 'approved';
      // Prioritize approved/accepted over pending, and pending over rejected
      if (!current || isApprovedOrAccepted || (req.status === 'pending' && !isCurrentApprovedOrAccepted)) {
        map.set(req.doctorId, { status: isApprovedOrAccepted ? 'approved' : (req.status as any), request: req });
      }
    }

    // Check authorizedDoctorIds
    for (const docId of authorizedDoctorIds) {
      map.set(docId, { status: 'approved' });
    }

    return map;
  }, [connectionRequests, authorizedDoctorIds]);

  // Filter doctors by name or specialization or hospital (strictly verified doctors only)
  const filteredDoctors = useMemo(() => {
    // Only show doctors whose isVerified is explicitly true (verified by admin)
    const verifiedDoctors = doctors.filter((doc) => doc.isVerified === true);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return verifiedDoctors;

    // Remove honorific "dr." or "dr " from query for easier matching
    const cleanQ = q.replace(/^dr\.?\s+/i, '');

    return verifiedDoctors.filter((doc) => {
      const nameMatch = doc.fullName.toLowerCase().includes(cleanQ) || doc.fullName.toLowerCase().includes(q);
      const specMatch = doc.specialization.toLowerCase().includes(cleanQ);
      const clinicMatch = doc.clinicOrHospital.toLowerCase().includes(cleanQ);
      return nameMatch || specMatch || clinicMatch;
    });
  }, [doctors, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Directory Header & Voice Discovery Hint */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-teal-800 via-teal-900 to-slate-900 text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-teal-400" />
              <span>{t.doctorDirectoryTitle || 'Doctor Directory'}</span>
            </h2>
            <p className="text-xs text-teal-200/90 leading-relaxed max-w-xl">
              {t.doctorDirectorySubtitle || 'Discover and connect with registered medical doctors. Search by doctor name or specialization without requiring any Doctor ID.'}
            </p>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
              title="Refresh Doctors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Voice Command Discovery Banner */}
        <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur text-xs flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <p className="text-teal-100">
            <strong>Voice Command:</strong> Speak <code className="bg-black/30 px-1.5 py-0.5 rounded text-amber-200 font-mono">&ldquo;Connect me to Doctor [Name]&rdquo;</code> to automatically discover and connect with any doctor.
          </p>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchDoctorsPlaceholder || 'Search doctors by name, medical specialization, or clinic...'}
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-semibold shadow-inner focus:outline-none focus:ring-2 focus:ring-teal-400 border border-transparent dark:border-slate-700"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading registered doctors...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
          <Stethoscope className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {searchQuery ? (t.noDoctorsFound || 'No doctors found matching your search.') : (t.noDoctorsRegistered || 'No doctors are currently registered.')}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery ? `Try clearing your search query or speaking the doctor's name.` : 'When doctors register with VoiceFlow, they will appear here automatically.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-colors cursor-pointer"
            >
              Clear Search Filter
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDoctors.map((doc) => {
            const connInfo = doctorStatusMap.get(doc.doctorId);
            const isApproved = connInfo?.status === 'approved';
            const isPending = connInfo?.status === 'pending';

            return (
              <div
                key={doc.doctorId}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                {/* Doctor Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        photoURL={doc.photoURL}
                        name={doc.fullName}
                        role="doctor"
                        size="lg"
                        showRoleBadge={true}
                        className="group-hover:scale-105 transition-transform"
                      />
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white line-clamp-1">
                          Dr. {doc.fullName}
                        </h3>
                        <p className="text-xs text-teal-700 dark:text-teal-400 font-semibold line-clamp-1 flex items-center gap-1 mt-0.5">
                          <Stethoscope className="w-3 h-3 shrink-0" />
                          <span>{doc.specialization}</span>
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    {isApproved ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Connected</span>
                      </span>
                    ) : isPending ? (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Pending</span>
                      </span>
                    ) : null}
                  </div>

                  {/* Public Details (Qualifications & Hospital) */}
                  <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="line-clamp-1 font-medium">{doc.qualifications || 'MBBS, Medical Practitioner'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="line-clamp-1 font-medium">{doc.clinicOrHospital}</span>
                    </div>
                  </div>
                </div>

                {/* Actions: View Profile & Dynamic Connection Status Button */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDoctor(doc)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t.viewDoctorProfile || 'View Profile'}</span>
                  </button>

                  {isApproved ? (
                    <button
                      type="button"
                      onClick={() => setSelectedDoctor(doc)}
                      className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold shadow-sm cursor-pointer hover:bg-emerald-100"
                      title="Already Connected - Click to view doctor profile"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Connected</span>
                    </button>
                  ) : isPending ? (
                    <button
                      type="button"
                      onClick={() => setSelectedDoctor(doc)}
                      className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold shadow-sm cursor-pointer hover:bg-amber-100"
                      title="Request Pending - Click to view status"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                      <span>Request Pending</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedDoctor(doc)}
                      className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                      title={`Connect with Dr. ${doc.fullName}`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Connect</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Doctor Profile Modal */}
      {selectedDoctor && (
        <DoctorProfileModal
          doctor={selectedDoctor}
          isOpen={Boolean(selectedDoctor)}
          onClose={() => setSelectedDoctor(null)}
          existingRequest={doctorStatusMap.get(selectedDoctor.doctorId)?.request}
          isAlreadyConnected={doctorStatusMap.get(selectedDoctor.doctorId)?.status === 'approved'}
          onRequestSent={(newReq) => {
            if (onRequestSent) onRequestSent(newReq);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};
