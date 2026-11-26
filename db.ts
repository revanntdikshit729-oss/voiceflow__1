import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  AppUser,
  PatientProfile,
  DoctorProfile,
  PublicDoctorProfile,
  Consultation,
  HealthUpdate,
  ConnectionRequest,
  TimelineEntry,
  HealthChangeBrief,
  UserRole,
  LanguageCode,
} from '../types';

/**
 * Recursively removes all keys with `undefined` values from an object or array.
 * Firestore strictly rejects documents containing `undefined` properties.
 * Preserves Date, null, primitives, and Firestore FieldValues (like serverTimestamp, arrayUnion).
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  // Handle objects
  if (typeof data === 'object') {
    // If it is a special object (Date, RegExp, or Firestore Sentinel / FieldValue), preserve as-is
    if (
      data instanceof Date ||
      data instanceof RegExp ||
      (data as any)._methodName !== undefined ||
      (data.constructor && data.constructor.name !== 'Object')
    ) {
      return data;
    }

    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean as T;
  }

  return data;
}

/**
 * Safely converts any timestamp representation (ISO string, Firestore Timestamp, Date, ms number)
 * into a valid ISO string. Never throws RangeError.
 */
export function toSafeISOString(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : val;
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  if (typeof val.toDate === 'function') {
    try {
      return val.toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  if (typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000).toISOString();
  }
  if (val._seconds !== undefined && typeof val._seconds === 'number') {
    return new Date(val._seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Safely extracts epoch milliseconds from any timestamp representation for stable sorting.
 * Guaranteed to never return NaN.
 */
export function toSafeTimeMs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
  }
  if (typeof val.toMillis === 'function') {
    try {
      return val.toMillis();
    } catch {
      return 0;
    }
  }
  if (typeof val.toDate === 'function') {
    try {
      return val.toDate().getTime();
    } catch {
      return 0;
    }
  }
  if (typeof val.seconds === 'number') {
    return val.seconds * 1000;
  }
  if (val._seconds !== undefined && typeof val._seconds === 'number') {
    return val._seconds * 1000;
  }
  return 0;
}

export const dbService = {
  // --- User Profiles ---
  async createUserProfile(user: AppUser): Promise<void> {
    if (!db) throw new Error('Firestore is not configured.');
    await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore({
      ...user,
      createdAt: serverTimestamp(),
    }));
  },

  async getUserProfile(uid: string): Promise<AppUser | null> {
    if (!db) throw new Error('Firestore is not configured.');
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as AppUser;
  },

  async updateUserPreferredLanguage(uid: string, role: UserRole, preferredLanguage: LanguageCode): Promise<void> {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'users', uid), { preferredLanguage });
      const targetCol = role === 'doctor' ? 'doctors' : 'patients';
      await updateDoc(doc(db, targetCol, uid), { preferredLanguage, updatedAt: serverTimestamp() });
    } catch (err) {
      console.warn('Failed to persist preferred language to Firestore:', err);
    }
  },

  // --- Patient Profiles ---
  async createPatientProfile(profile: PatientProfile): Promise<void> {
    if (!db) throw new Error('Firestore is not configured.');
    const uniquePatientId = profile.uniquePatientId || `VF-P-${profile.patientId.slice(0, 6).toUpperCase()}`;
    await setDoc(doc(db, 'patients', profile.patientId), sanitizeForFirestore({
      ...profile,
      uniquePatientId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
  },

  async getPatientProfile(patientId: string): Promise<PatientProfile | null> {
    if (!db) throw new Error('Firestore is not configured.');
    const snap = await getDoc(doc(db, 'patients', patientId));
    if (!snap.exists()) return null;
    const data = snap.data() as PatientProfile;
    if (!data.uniquePatientId) {
      data.uniquePatientId = `VF-P-${patientId.slice(0, 6).toUpperCase()}`;
      // Persist in background
      updateDoc(doc(db, 'patients', patientId), { uniquePatientId: data.uniquePatientId }).catch(() => { });
    }
    return data;
  },

  /**
   * Real-time listener for patient profile document.
   * Emits updates immediately when authorizedDoctorIds or patient profile details change.
   */
  subscribePatientProfile(
    patientId: string,
    callback: (profile: PatientProfile | null) => void
  ): () => void {
    if (!db) {
      console.warn('Firestore is not configured.');
      return () => {};
    }
    const docRef = doc(db, 'patients', patientId);
    return onSnapshot(
      docRef,
      (snap) => {
        if (!snap.exists()) {
          callback(null);
          return;
        }
        const data = snap.data() as PatientProfile;
        const pid = data.patientId || snap.id;
        if (!data.patientId) data.patientId = pid;
        if (!data.uniquePatientId) {
          data.uniquePatientId = `VF-P-${pid.slice(0, 6).toUpperCase()}`;
        }
        callback(data);
      },
      (err) => {
        console.error('Error in subscribePatientProfile:', err);
      }
    );
  },

  async updatePatientPhoto(patientId: string, photoURL: string): Promise<void> {
    if (!db) throw new Error('Firestore is not configured.');
    await Promise.all([
      updateDoc(doc(db, 'patients', patientId), {
        photoURL,
        updatedAt: serverTimestamp(),
      }),
      updateDoc(doc(db, 'users', patientId), {
        photoURL,
      }),
    ]);
  },

  async searchPatientById(queryId: string): Promise<PatientProfile | null> {
    if (!db) throw new Error('Firestore is not configured.');
    const trimmed = queryId.trim();
    if (!trimmed) return null;

    // 1. Direct UID match
    try {
      const directSnap = await getDoc(doc(db, 'patients', trimmed));
      if (directSnap.exists()) {
        const data = directSnap.data() as PatientProfile;
        if (!data.uniquePatientId) {
          data.uniquePatientId = `VF-P-${trimmed.slice(0, 6).toUpperCase()}`;
        }
        return data;
      }
    } catch {
      // Continue to query
    }

    // 2. Query by uniquePatientId (exact match uppercase)
    const upper = trimmed.toUpperCase();
    const formattedWithPrefix = upper.startsWith('VF-P-') ? upper : `VF-P-${upper}`;

    try {
      const q1 = query(collection(db, 'patients'), where('uniquePatientId', '==', formattedWithPrefix));
      const snap1 = await getDocs(q1);
      if (!snap1.empty) {
        return snap1.docs[0].data() as PatientProfile;
      }
    } catch {
      // Continue
    }

    try {
      const q2 = query(collection(db, 'patients'), where('uniquePatientId', '==', upper));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        return snap2.docs[0].data() as PatientProfile;
      }
    } catch {
      // Continue
    }

    // 3. Fallback: Scan patients list for prefix match
    try {
      const allSnap = await getDocs(collection(db, 'patients'));
      for (const d of allSnap.docs) {
        const p = d.data() as PatientProfile;
        const computedUnique = p.uniquePatientId || `VF-P-${d.id.slice(0, 6).toUpperCase()}`;
        if (
          computedUnique.toUpperCase() === formattedWithPrefix ||
          computedUnique.toUpperCase() === upper ||
          d.id.toLowerCase().startsWith(trimmed.toLowerCase())
        ) {
          return {
            ...p,
            uniquePatientId: computedUnique,
          };
        }
      }
    } catch (err) {
      console.warn('Error during patient fallback search:', err);
    }

    return null;
  },

  // --- Doctor Profiles ---
  async createDoctorProfile(profile: DoctorProfile): Promise<void> {
    if (!db) throw new Error('Firestore is not configured.');
    await setDoc(doc(db, 'doctors', profile.doctorId), sanitizeForFirestore({
      ...profile,
      createdAt: serverTimestamp(),
    }));
  },

  async getDoctorProfile(doctorId: string): Promise<DoctorProfile | null> {
    if (!db) throw new Error('Firestore is not configured.');
    const snap = await getDoc(doc(db, 'doctors', doctorId));
    if (!snap.exists()) return null;
    return snap.data() as DoctorProfile;
  },

  async updateDoctorPhoto(doctorId: string, photoURL: string): Promise<void> {
    if (!db) throw new Error('Firestore is not configured.');
    await Promise.all([
      updateDoc(doc(db, 'doctors', doctorId), {
        photoURL,
      }),
      updateDoc(doc(db, 'users', doctorId), {
        photoURL,
      }),
    ]);
  },

  async getAllDoctors(): Promise<DoctorProfile[]> {
    if (!db) throw new Error('Firestore is not configured.');
    const q = query(collection(db, 'doctors'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as DoctorProfile));
  },

  /**
   * Returns public doctor directory without sensitive fields (email, phone, private patient records).
   * Strictly filters to return ONLY doctors whose isVerified status is true (approved by admin).
   * Uses where('isVerified', '==', true) to comply with Firestore security rules.
   */
  async getPublicDoctorsDirectory(): Promise<PublicDoctorProfile[]> {
    if (!db) throw new Error('Firestore is not configured.');
    const q = query(collection(db, 'doctors'), where('isVerified', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        doctorId: d.id,
        fullName: data.fullName || 'Doctor',
        photoURL: data.photoURL || undefined,
        specialization: data.specialization || 'General Practice',
        registrationNumber: data.registrationNumber || undefined,
        clinicOrHospital: data.clinicOrHospital || 'Clinic / Hospital',
        qualifications: data.qualifications || (data.registrationNumber ? `Reg: ${data.registrationNumber}` : 'Certified Medical Practitioner'),
        description: data.description || `Consultant ${data.specialization || 'Practitioner'} practicing at ${data.clinicOrHospital || 'Clinic / Hospital'}.`,
        isVerified: true,
      };
    });
  },

  /**
   * Real-time listener for verified public doctor directory.
   * Emits updates immediately when a doctor is newly verified or profile details change.
   */
  subscribePublicDoctorsDirectory(callback: (doctors: PublicDoctorProfile[]) => void): () => void {
    if (!db) return () => {};
    const q = query(collection(db, 'doctors'), where('isVerified', '==', true));
    return onSnapshot(
      q,
      (snap) => {
        const list: PublicDoctorProfile[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            doctorId: d.id,
            fullName: data.fullName || 'Doctor',
            photoURL: data.photoURL || undefined,
            specialization: data.specialization || 'General Practice',
            registrationNumber: data.registrationNumber || undefined,
            clinicOrHospital: data.clinicOrHospital || 'Clinic / Hospital',
            qualifications: data.qualifications || (data.registrationNumber ? `Reg: ${data.registrationNumber}` : 'Certified Medical Practitioner'),
            description: data.description || `Consultant ${data.specialization || 'Practitioner'} practicing at ${data.clinicOrHospital || 'Clinic / Hospital'}.`,
            isVerified: true,
          };
        });
        callback(list);
      },
      (err) => {
        console.error('Error in subscribePublicDoctorsDirectory:', err);
      }
    );
  },

  /**
   * Admin verification for doctors.
   */
  async verifyDoctor(doctorId: string, isVerified: boolean = true): Promise<void> {
    if (!db) throw new Error('Firestore is not configured.');
    await updateDoc(doc(db, 'doctors', doctorId), {
      isVerified,
      verifiedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  // --- Connection Requests (Patient-Doctor Connection Flow) ---
  async sendConnectionRequest(params: {
    patientId: string;
    uniquePatientId?: string;
    patientName: string;
    patientEmail?: string;
    doctorId: string;
    doctorName: string;
    doctorSpecialization: string;
    doctorClinic: string;
    doctorRegNumber: string;
    patientPhotoURL?: string;
    doctorPhotoURL?: string;
    requestNote?: string;
    initiatedBy?: 'patient' | 'doctor';
  }): Promise<ConnectionRequest> {
    if (!db) throw new Error('Firestore is not configured.');

    // Deterministic canonical requestId: ${patientId}_${doctorId}
    const requestId = `${params.patientId}_${params.doctorId}`;
    const requestDocRef = doc(db, 'connection_requests', requestId);

    // Check if request already exists between this patient and doctor by direct ID lookup
    const existingSnap = await getDoc(requestDocRef);
    if (existingSnap.exists()) {
      const active = existingSnap.data() as ConnectionRequest;
      if (active.status === 'approved' || active.status === 'accepted') {
        throw new Error(`You are already connected with Dr. ${params.doctorName}.`);
      } else if (active.status === 'pending') {
        throw new Error(`A connection request is already pending with Dr. ${params.doctorName}.`);
      }
    }

    const newRequest: ConnectionRequest = {
      id: requestId,
      patientId: params.patientId,
      uniquePatientId: params.uniquePatientId,
      patientName: params.patientName?.trim() || 'Patient',
      patientEmail: params.patientEmail,
      patientPhotoURL: params.patientPhotoURL,
      doctorId: params.doctorId,
      doctorName: params.doctorName?.trim() || 'Doctor',
      doctorSpecialization: params.doctorSpecialization?.trim() || 'General Practice',
      doctorClinic: params.doctorClinic?.trim() || 'Clinic / Hospital',
      doctorRegNumber: params.doctorRegNumber?.trim() || 'VERIFIED',
      doctorPhotoURL: params.doctorPhotoURL,
      status: 'pending',
      initiatedBy: 'patient',
      requestNote: (params.requestNote || `Patient requested connection to consult Dr. ${params.doctorName || 'Doctor'} and share medical timeline updates.`).slice(0, 1000),
      createdAt: new Date().toISOString(),
    };

    await setDoc(requestDocRef, sanitizeForFirestore({
      ...newRequest,
      createdAtServer: serverTimestamp(),
      updatedAtServer: serverTimestamp(),
    }));

    return newRequest;
  },

  async getConnectionRequestsForPatient(patientId: string): Promise<ConnectionRequest[]> {
    if (!db) throw new Error('Firestore is not configured.');
    const q = query(
      collection(db, 'connection_requests'),
      where('patientId', '==', patientId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as ConnectionRequest));
    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  },

  async getConnectionRequestsForDoctor(doctorId: string): Promise<ConnectionRequest[]> {
    if (!db) throw new Error('Firestore is not configured.');
    const q = query(
      collection(db, 'connection_requests'),
      where('doctorId', '==', doctorId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as ConnectionRequest));
    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  },

  /**
   * Real-time listener for connection requests for a patient.
   */
  subscribeConnectionRequestsForPatient(
    patientId: string,
    callback: (requests: ConnectionRequest[]) => void
  ): () => void {
    if (!db) {
      console.warn('Firestore is not configured.');
      return () => { };
    }
    const q = query(
      collection(db, 'connection_requests'),
      where('patientId', '==', patientId)
    );
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as ConnectionRequest));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        callback(list);
      },
      (err) => {
        console.error('Error in subscribeConnectionRequestsForPatient:', err);
      }
    );
  },

  /**
   * Real-time listener for incoming connection requests for a doctor.
   */
  subscribeConnectionRequestsForDoctor(
    doctorId: string,
    callback: (requests: ConnectionRequest[]) => void
  ): () => void {
    if (!db) {
      console.warn('Firestore is not configured.');
      return () => { };
    }
    const q = query(
      collection(db, 'connection_requests'),
      where('doctorId', '==', doctorId)
    );
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as ConnectionRequest));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        callback(list);
      },
      (err) => {
        console.error('Error in subscribeConnectionRequestsForDoctor:', err);
      }
    );
  },

  async respondToConnectionRequest(
    requestId: string,
    status: 'approved' | 'accepted' | 'rejected',
    patientId: string,
    doctorId: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not configured.');

    const isAccepting = status === 'approved' || status === 'accepted';
    const normalizedStatus: 'accepted' | 'rejected' = isAccepting ? 'accepted' : 'rejected';
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    // 1. Update connection request status
    const reqRef = doc(db, 'connection_requests', requestId);
    batch.update(reqRef, {
      status: normalizedStatus,
      updatedAt: nowIso,
      updatedAtServer: serverTimestamp(),
    });

    const consentDocId = `${patientId}_${doctorId}`;
    const consentRef = doc(db, 'consents', consentDocId);

    if (isAccepting) {
      // 2. Add doctor to patient's authorized list
      const patientRef = doc(db, 'patients', patientId);
      batch.update(patientRef, {
        authorizedDoctorIds: arrayUnion(doctorId),
        updatedAt: serverTimestamp(),
        updatedAtServer: serverTimestamp(),
      });

      // 3. Atomically update consent record to active
      batch.set(
        consentRef,
        {
          patientId,
          doctorId,
          status: 'active',
          grantedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      // 2. Atomically update consent record to rejected
      batch.set(
        consentRef,
        {
          patientId,
          doctorId,
          status: 'rejected',
          rejectedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    // Atomic commit: all documents succeed or none do
    await batch.commit();
  },

  // --- Doctor-Patient Authorization Consent & Revocation ---
  async grantDoctorAccess(patientId: string, doctorId: string): Promise<void> {
    if (!db) throw new Error('Firestore is not configured.');
    const batch = writeBatch(db);

    const patientRef = doc(db, 'patients', patientId);
    batch.update(patientRef, {
      authorizedDoctorIds: arrayUnion(doctorId),
      updatedAt: serverTimestamp(),
      updatedAtServer: serverTimestamp(),
    });

    const consentDocId = `${patientId}_${doctorId}`;
    batch.set(
      doc(db, 'consents', consentDocId),
      {
        patientId,
        doctorId,
        status: 'active',
        grantedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();
  },

  async revokeDoctorAccess(patientId: string, doctorId: string, requestId?: string): Promise<void> {
    if (!db) throw new Error('Firestore is not configured.');
    const batch = writeBatch(db);

    // 1. Remove from patient document
    const patientRef = doc(db, 'patients', patientId);
    batch.update(patientRef, {
      authorizedDoctorIds: arrayRemove(doctorId),
      updatedAt: serverTimestamp(),
      updatedAtServer: serverTimestamp(),
    });

    // 2. Mark consent as revoked
    const consentDocId = `${patientId}_${doctorId}`;
    batch.set(
      doc(db, 'consents', consentDocId),
      {
        patientId,
        doctorId,
        status: 'revoked',
        revokedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 3. Update connection request status if provided or search matching
    if (requestId) {
      batch.update(doc(db, 'connection_requests', requestId), {
        status: 'revoked',
        updatedAt: new Date().toISOString(),
        updatedAtServer: serverTimestamp(),
      });
    } else {
      const q = query(
        collection(db, 'connection_requests'),
        where('patientId', '==', patientId),
        where('doctorId', '==', doctorId)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        batch.update(d.ref, {
          status: 'revoked',
          updatedAt: new Date().toISOString(),
          updatedAtServer: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  },

  async getAuthorizedPatientsForDoctor(doctorId: string): Promise<PatientProfile[]> {
    if (!db) throw new Error('Firestore is not configured.');
    const patientsMap = new Map<string, PatientProfile>();

    // 1. Direct query on patients collection where authorizedDoctorIds array-contains doctorId
    try {
      const q = query(
        collection(db, 'patients'),
        where('authorizedDoctorIds', 'array-contains', doctorId)
      );
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        const data = d.data() as PatientProfile;
        const pid = data.patientId || d.id;
        if (!data.patientId) data.patientId = pid;
        if (!data.uniquePatientId) {
          data.uniquePatientId = `VF-P-${pid.slice(0, 6).toUpperCase()}`;
        }
        patientsMap.set(pid, data);
      });
    } catch (pErr) {
      // Expected if collection query is restricted by cross-document security rules
      console.warn('Note: Direct collection query on patients deferred to verified connection_requests:', pErr);
    }

    // 2. Verified connection_requests lookup: fetch patient profile for each accepted connection
    try {
      const connQ = query(
        collection(db, 'connection_requests'),
        where('doctorId', '==', doctorId)
      );
      const connSnap = await getDocs(connQ);
      for (const cd of connSnap.docs) {
        const cData = cd.data() as ConnectionRequest;
        // Strictly only accepted/approved connections
        if ((cData.status === 'approved' || cData.status === 'accepted') && cData.patientId) {
          if (!patientsMap.has(cData.patientId)) {
            try {
              const pDoc = await getDoc(doc(db, 'patients', cData.patientId));
              if (pDoc.exists()) {
                const pData = pDoc.data() as PatientProfile;
                const pid = pData.patientId || pDoc.id;
                if (!pData.patientId) pData.patientId = pid;
                if (!pData.uniquePatientId) pData.uniquePatientId = `VF-P-${pid.slice(0, 6).toUpperCase()}`;
                // Only include if doctor is actively in authorizedDoctorIds
                if (pData.authorizedDoctorIds?.includes(doctorId)) {
                  patientsMap.set(pid, pData);
                }
              }
            } catch {
              // Consent revoked or unauthorized: correctly exclude this patient
            }
          }
        } else if (cData.status === 'revoked' || cData.status === 'rejected') {
          // Explicitly ensure revoked/rejected patients are not present in the list
          patientsMap.delete(cData.patientId);
        }
      }
    } catch (cErr) {
      console.warn('Error fetching connection requests in getAuthorizedPatientsForDoctor:', cErr);
    }

    return Array.from(patientsMap.values());
  },

  /**
   * Real-time listener for authorized patients of a doctor.
   * Listens to connection_requests where doctorId == doctorId, and verifies active consent & profile.
   * Excludes revoked and rejected patients in real-time.
   */
  subscribeAuthorizedPatientsForDoctor(
    doctorId: string,
    callback: (patients: PatientProfile[]) => void
  ): () => void {
    if (!db) {
      console.warn('Firestore is not configured.');
      return () => {};
    }

    const connQ = query(
      collection(db, 'connection_requests'),
      where('doctorId', '==', doctorId)
    );

    return onSnapshot(
      connQ,
      async (connSnap) => {
        if (!db) return;
        const patientsMap = new Map<string, PatientProfile>();

        for (const cd of connSnap.docs) {
          const cData = cd.data() as ConnectionRequest;
          if ((cData.status === 'approved' || cData.status === 'accepted') && cData.patientId) {
            try {
              const pDoc = await getDoc(doc(db, 'patients', cData.patientId));
              if (pDoc.exists()) {
                const pData = pDoc.data() as PatientProfile;
                const pid = pData.patientId || pDoc.id;
                if (!pData.patientId) pData.patientId = pid;
                if (!pData.uniquePatientId) pData.uniquePatientId = `VF-P-${pid.slice(0, 6).toUpperCase()}`;
                if (pData.authorizedDoctorIds?.includes(doctorId)) {
                  patientsMap.set(pid, pData);
                }
              }
            } catch {
              // Revoked or consent inactive: exclude
            }
          }
        }

        callback(Array.from(patientsMap.values()));
      },
      (err) => {
        console.error('Error in subscribeAuthorizedPatientsForDoctor:', err);
      }
    );
  },

  // --- Consultations (Doctor Baseline & Follow-ups) ---
  async createConsultation(consultation: Consultation): Promise<void> {
    if (!db) throw new Error('Firestore is not configured.');
    await setDoc(doc(db, 'consultations', consultation.id), sanitizeForFirestore({
      ...consultation,
      createdAt: serverTimestamp(),
    }));
  },

  async getConsultationsForPatient(patientId: string): Promise<Consultation[]> {
    if (!db) throw new Error('Firestore is not configured.');
    const q = query(
      collection(db, 'consultations'),
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc')
    );
    try {
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Consultation));
    } catch {
      // Fallback query if composite index is pending
      const qFallback = query(
        collection(db, 'consultations'),
        where('patientId', '==', patientId)
      );
      const snap = await getDocs(qFallback);
      return (snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Consultation))).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }
  },

  async getInitialBaselineConsultation(patientId: string): Promise<Consultation | null> {
    if (!db) throw new Error('Firestore is not configured.');
    const all = await this.getConsultationsForPatient(patientId);
    // Find explicitly flagged initial baseline
    const baseline = all.find((c) => c.isInitialBaseline);
    if (baseline) return baseline;
    // Fallback: the earliest consultation is the baseline
    if (all.length > 0) return all[all.length - 1];
    return null;
  },

  // --- Health Updates (Patient Confirmed Voice Updates) ---
  async saveHealthUpdate(update: HealthUpdate): Promise<void> {
    if (!db) {
      console.warn('[Diagnostics] saveHealthUpdate: Firestore is not configured');
      throw new Error('Firestore is not configured.');
    }

    const docPath = `health_updates/${update.id}`;
    const confirmedSummary = update.finalConfirmedSummary || update.structuredSummary?.patientFriendlyNote;
    console.log(`[Diagnostics] Saving health update to "${docPath}" for patientId: "${update.patientId}"`);
    console.log(`[Diagnostics] Preferred Language: "${update.preferredLanguage}", Original Language: "${update.originalLanguage}"`);
    console.log(`[Diagnostics] Final Confirmed Summary length: ${confirmedSummary?.length || 0}`);

    if (!confirmedSummary) {
      console.warn(`[Diagnostics] Warning: Final confirmed summary is empty when saving update ${update.id}`);
    }

    try {
      const payload = sanitizeForFirestore({
        ...update,
        isConfirmed: update.isConfirmed !== undefined ? update.isConfirmed : true,
        finalConfirmedSummary: confirmedSummary || update.rawTranscript || '',
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'health_updates', update.id), payload);
      console.log(`[Diagnostics] SUCCESSFUL write confirmation: Document "${docPath}" successfully persisted to Firestore!`);
    } catch (err: any) {
      console.error(`[Diagnostics] FAILED to write document "${docPath}" to Firestore:`, err);
      throw err;
    }
  },

  async getPatientHealthUpdates(patientId: string, onlyConfirmed = false): Promise<HealthUpdate[]> {
    if (!db) {
      console.warn('[Diagnostics] getPatientHealthUpdates: Firestore is not configured');
      throw new Error('Firestore is not configured.');
    }
    console.log(`[Diagnostics] Retrieving health updates for patientId: "${patientId}", onlyConfirmed: ${onlyConfirmed}`);

    try {
      // If onlyConfirmed is requested (e.g. by authorized doctors), explicitly query where isConfirmed == true
      // to ensure exact compatibility with Firestore security rules
      const q = onlyConfirmed
        ? query(
            collection(db, 'health_updates'),
            where('patientId', '==', patientId),
            where('isConfirmed', '==', true)
          )
        : query(
            collection(db, 'health_updates'),
            where('patientId', '==', patientId)
          );
      const snap = await getDocs(q);
      console.log(`[Diagnostics] Firestore returned ${snap.size} documents from collection 'health_updates' for patientId: "${patientId}"`);

      const rawUpdates: HealthUpdate[] = snap.docs.map((d) => {
        const data = d.data();
        const confirmedAtIso = toSafeISOString(data.confirmedAt || data.createdAt);
        const createdAtIso = toSafeISOString(data.createdAt);
        return {
          id: d.id,
          ...data,
          confirmedAt: confirmedAtIso,
          createdAt: createdAtIso,
        } as HealthUpdate;
      });

      // Filter confirmed updates if requested
      const filtered = onlyConfirmed
        ? rawUpdates.filter((u) => u.isConfirmed === true || u.status === 'confirmed' || !!u.finalConfirmedSummary)
        : rawUpdates;

      // Diagnostic logging of retrieved documents
      console.log(`[Diagnostics] Filtered confirmed updates: ${filtered.length}. Document IDs: [${filtered.map(u => u.id).join(', ')}]`);
      filtered.forEach((u) => {
        const summary = u.finalConfirmedSummary || u.structuredSummary?.patientFriendlyNote || u.rawTranscript;
        if (!summary) {
          console.warn(`[Diagnostics] Update ${u.id} has missing or empty summary field!`);
        } else {
          console.log(`[Diagnostics] Update ${u.id} summary present: "${summary.slice(0, 50)}..." (prefLang: ${u.preferredLanguage || 'unspecified'}, origLang: ${u.originalLanguage || 'unspecified'})`);
        }
      });

      // Safe descending sort by timestamp
      return filtered.sort((a, b) => {
        return toSafeTimeMs(b.confirmedAt || b.createdAt) - toSafeTimeMs(a.confirmedAt || a.createdAt);
      });
    } catch (err: any) {
      console.error(`[Diagnostics] Retrieval error querying 'health_updates' for patientId "${patientId}":`, err);
      throw err;
    }
  },

  /**
   * Real-time listener for patient health updates.
   * If onlyConfirmed is true, queries strictly for where isConfirmed == true,
   * satisfying Firestore security rules for authorized doctors.
   * Automatically fires whenever a new confirmed health update is recorded.
   */
  subscribePatientHealthUpdates(
    patientId: string,
    onlyConfirmed: boolean,
    callback: (updates: HealthUpdate[]) => void
  ): () => void {
    if (!db) {
      console.warn('Firestore is not configured.');
      return () => {};
    }

    const q = onlyConfirmed
      ? query(
          collection(db, 'health_updates'),
          where('patientId', '==', patientId),
          where('isConfirmed', '==', true)
        )
      : query(
          collection(db, 'health_updates'),
          where('patientId', '==', patientId)
        );

    return onSnapshot(
      q,
      (snap) => {
        const rawUpdates: HealthUpdate[] = snap.docs.map((d) => {
          const data = d.data();
          const confirmedAtIso = toSafeISOString(data.confirmedAt || data.createdAt);
          const createdAtIso = toSafeISOString(data.createdAt);
          return {
            id: d.id,
            ...data,
            confirmedAt: confirmedAtIso,
            createdAt: createdAtIso,
          } as HealthUpdate;
        });

        const filtered = onlyConfirmed
          ? rawUpdates.filter((u) => u.isConfirmed === true || u.status === 'confirmed' || !!u.finalConfirmedSummary)
          : rawUpdates;

        const sorted = filtered.sort((a, b) => {
          return toSafeTimeMs(b.confirmedAt || b.createdAt) - toSafeTimeMs(a.confirmedAt || a.createdAt);
        });

        callback(sorted);
      },
      (err) => {
        console.error(`Error in subscribePatientHealthUpdates for patient ${patientId}:`, err);
      }
    );
  },

  // --- Medical Memory Timeline (Chronological Baseline + Voice Updates + Consultations) ---
  async getPatientTimeline(patientId: string): Promise<TimelineEntry[]> {
    if (!db) throw new Error('Firestore is not configured.');
    console.log(`[Diagnostics] Building timeline for patientId: "${patientId}"`);

    // Use Promise.allSettled so that if consultations or updates encounter an issue, the other is not lost
    const [consultResult, updateResult] = await Promise.allSettled([
      this.getConsultationsForPatient(patientId),
      this.getPatientHealthUpdates(patientId, true),
    ]);

    const consultations: Consultation[] = consultResult.status === 'fulfilled' ? consultResult.value : [];
    if (consultResult.status === 'rejected') {
      console.error(`[Diagnostics] Error retrieving consultations for timeline:`, consultResult.reason);
    }

    const updates: HealthUpdate[] = updateResult.status === 'fulfilled' ? updateResult.value : [];
    if (updateResult.status === 'rejected') {
      console.error(`[Diagnostics] Error retrieving health updates for timeline:`, updateResult.reason);
    }

    console.log(`[Diagnostics] Timeline components retrieved: ${consultations.length} consultations, ${updates.length} health updates`);

    const timeline: TimelineEntry[] = [];

    // Map consultations
    for (const c of consultations) {
      timeline.push({
        id: c.id,
        type: c.isInitialBaseline ? 'initial_baseline' : 'followup_consultation',
        timestamp: toSafeISOString(c.consultationDate || c.createdAt),
        title: c.isInitialBaseline
          ? 'Initial Consultation (Medical Baseline)'
          : 'Doctor Consultation & Treatment Advisory',
        authorName: c.doctorName || 'Doctor',
        authorRole: 'doctor',
        data: {
          ...c,
          createdAt: toSafeISOString(c.createdAt),
        },
      });
    }

    // Map patient-confirmed voice updates
    for (const u of updates) {
      timeline.push({
        id: u.id,
        type: 'patient_voice_update',
        timestamp: toSafeISOString(u.confirmedAt || u.createdAt),
        title: 'Patient Voice Health Update',
        authorName: 'Patient',
        authorRole: 'patient',
        data: u,
      });
    }

    // Sort descending by timestamp (newest first) safely
    const sorted = timeline.sort((a, b) => toSafeTimeMs(b.timestamp) - toSafeTimeMs(a.timestamp));
    console.log(`[Diagnostics] Total sorted timeline entries: ${sorted.length}. IDs: [${sorted.map(t => `${t.id}(${t.type})`).join(', ')}]`);
    return sorted;
  },

  // --- Intelligent Health Change Briefs (Firestore Persistence & Review) ---
  async saveHealthChangeBrief(brief: HealthChangeBrief): Promise<void> {
    if (!db) throw new Error('Firestore is not configured.');
    await setDoc(doc(db, 'health_change_briefs', brief.id), sanitizeForFirestore({
      ...brief,
      createdAtServer: serverTimestamp(),
      updatedAtServer: serverTimestamp(),
    }));
  },

  async getHealthChangeBriefsForPatient(patientId: string): Promise<HealthChangeBrief[]> {
    if (!db) throw new Error('Firestore is not configured.');
    const q = query(
      collection(db, 'health_change_briefs'),
      where('patientId', '==', patientId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as HealthChangeBrief));
    return list.sort((a, b) => new Date(b.generatedAt || 0).getTime() - new Date(a.generatedAt || 0).getTime());
  },

  async getLatestHealthChangeBrief(patientId: string): Promise<HealthChangeBrief | null> {
    if (!db) throw new Error('Firestore is not configured.');
    const all = await this.getHealthChangeBriefsForPatient(patientId);
    return all.length > 0 ? all[0] : null;
  },

  async reviewHealthChangeBrief(
    briefId: string,
    doctorId: string,
    doctorName: string,
    observations?: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not configured.');
    await updateDoc(doc(db, 'health_change_briefs', briefId), {
      isReviewedByDoctor: true,
      clinicalObservations: observations?.trim() || '',
      reviewedBy: {
        doctorId,
        doctorName,
        reviewedAt: new Date().toISOString(),
      },
      updatedAtServer: serverTimestamp(),
    });
  },
};
