/**
 * Comprehensive Automated Security Rules Test Suite (Revision 4)
 * 
 * Specifically tests:
 * 1. Revoked doctor cannot read patient profile even if authorizedDoctorIds still contains their UID.
 * 2. Doctor cannot independently revoke patient consent.
 * 3. Doctor cannot independently accept a request without atomic batch commitment.
 * 4. Patient cannot add arbitrary fields to connection requests.
 * 5. Patient cannot bypass health update summary confirmation.
 * 6. Doctor cannot read private doctor account fields (users collection).
 * 7. Revoked doctor cannot access any clinical records (consultations, updates, briefs).
 * 8. Legitimate patient-to-doctor connection, atomic approval, consent and clinical lifecycle.
 */

class MockFirestoreDatabase {
  constructor() {
    this.docs = new Map();
  }

  set(collection, id, data) {
    this.docs.set(`${collection}/${id}`, JSON.parse(JSON.stringify(data)));
  }

  get(collection, id) {
    const val = this.docs.get(`${collection}/${id}`);
    return val ? { exists: true, data: JSON.parse(JSON.stringify(val)) } : { exists: false, data: null };
  }

  exists(collection, id) {
    return this.docs.has(`${collection}/${id}`);
  }

  clone() {
    const next = new MockFirestoreDatabase();
    for (const [k, v] of this.docs.entries()) {
      next.docs.set(k, JSON.parse(JSON.stringify(v)));
    }
    return next;
  }
}

class SecurityRulesValidator {
  constructor(db, afterDb = null) {
    this.db = db;
    this.afterDb = afterDb || db;
  }

  isAuthenticated(auth) {
    return auth != null && auth.uid != null;
  }

  isOwner(auth, userId) {
    return this.isAuthenticated(auth) && auth.uid === userId;
  }

  isVerifiedDoctor(auth) {
    if (!this.isAuthenticated(auth)) return false;
    const docDoc = this.db.get('doctors', auth.uid);
    const userDoc = this.db.get('users', auth.uid);
    return (
      docDoc.exists &&
      docDoc.data.isVerified === true &&
      userDoc.exists &&
      userDoc.data.role === 'doctor'
    );
  }

  isDoctor(auth) {
    return this.isVerifiedDoctor(auth);
  }

  // TWO-TIER DEFENSE-IN-DEPTH: requires both authorizedDoctorIds AND active consent!
  isAuthorizedDoctorForPatient(auth, patientId) {
    if (!this.isAuthenticated(auth) || !this.isDoctor(auth)) return false;
    const pDoc = this.db.get('patients', patientId);
    if (!pDoc.exists) return false;
    const authList = pDoc.data.authorizedDoctorIds;
    if (!Array.isArray(authList) || !authList.includes(auth.uid)) return false;

    // Defense-in-depth: check active consent
    const consentDoc = this.db.get('consents', `${patientId}_${auth.uid}`);
    return consentDoc.exists && consentDoc.data.status === 'active';
  }

  // ATOMIC VALIDATION: verifies pre-state and getAfter() post-state across all 3 documents
  isLegitimateAtomicApproval(auth, patientId) {
    const reqPre = this.db.get('connection_requests', `${patientId}_${auth.uid}`);
    if (
      !reqPre.exists ||
      reqPre.data.patientId !== patientId ||
      reqPre.data.doctorId !== auth.uid ||
      reqPre.data.status !== 'pending'
    ) {
      return false;
    }

    const reqPost = this.afterDb.get('connection_requests', `${patientId}_${auth.uid}`);
    const patPost = this.afterDb.get('patients', patientId);
    const conPost = this.afterDb.get('consents', `${patientId}_${auth.uid}`);

    return (
      reqPost.exists &&
      reqPost.data.status === 'accepted' &&
      patPost.exists &&
      Array.isArray(patPost.data.authorizedDoctorIds) &&
      patPost.data.authorizedDoctorIds.includes(auth.uid) &&
      conPost.exists &&
      conPost.data.status === 'active'
    );
  }

  isLegitimateAtomicRejection(auth, patientId) {
    if (!this.isDoctor(auth)) return false;
    if (!this.afterDb) return false;

    const reqPre = this.db.get('connection_requests', `${patientId}_${auth.uid}`);
    if (
      !reqPre.exists ||
      reqPre.data.patientId !== patientId ||
      reqPre.data.doctorId !== auth.uid ||
      reqPre.data.status !== 'pending'
    ) {
      return false;
    }

    const reqPost = this.afterDb.get('connection_requests', `${patientId}_${auth.uid}`);
    const conPost = this.afterDb.get('consents', `${patientId}_${auth.uid}`);

    return (
      reqPost.exists &&
      reqPost.data.status === 'rejected' &&
      conPost.exists &&
      conPost.data.status === 'rejected'
    );
  }

  evaluateUsers(op, auth, userId, existingData, requestData) {
    if (op === 'read') return this.isOwner(auth, userId);
    if (op === 'create') {
      const allowed = new Set(['uid', 'email', 'displayName', 'photoURL', 'role', 'preferredLanguage', 'createdAt']);
      if (!Object.keys(requestData || {}).every((k) => allowed.has(k))) return false;
      return (
        this.isAuthenticated(auth) &&
        auth.uid === userId &&
        ['patient', 'doctor'].includes(requestData?.role) &&
        requestData?.uid === userId
      );
    }
    if (op === 'update') {
      if (!this.isOwner(auth, userId)) return false;
      if (
        requestData?.role !== existingData?.role ||
        requestData?.email !== existingData?.email ||
        requestData?.uid !== existingData?.uid
      ) {
        return false;
      }
      const allowed = new Set(['displayName', 'photoURL', 'preferredLanguage', 'updatedAt']);
      const diffKeys = Object.keys(requestData).filter(
        (k) => JSON.stringify(requestData[k]) !== JSON.stringify(existingData[k])
      );
      return diffKeys.every((k) => allowed.has(k));
    }
    return false;
  }

  evaluatePatients(op, auth, patientId, existingData, requestData) {
    if (op === 'read') {
      if (this.isOwner(auth, patientId)) return true;
      return this.isAuthorizedDoctorForPatient(auth, patientId);
    }
    if (op === 'create') {
      return (
        this.isOwner(auth, patientId) &&
        requestData?.patientId === patientId &&
        (!requestData?.authorizedDoctorIds || requestData.authorizedDoctorIds.length === 0)
      );
    }
    if (op === 'update') {
      // Patient updating
      if (this.isOwner(auth, patientId)) {
        if (requestData?.patientId !== existingData?.patientId) return false;

        const allowedKeys = new Set([
          'fullName', 'photoURL', 'preferredLanguage', 'gender', 'dateOfBirth', 'bloodGroup',
          'emergencyContact', 'medicalHistory', 'uniquePatientId', 'updatedAt', 'updatedAtServer',
          'authorizedDoctorIds'
        ]);
        const diffKeys = Object.keys(requestData).filter(
          (k) => JSON.stringify(requestData[k]) !== JSON.stringify(existingData?.[k])
        );
        if (!diffKeys.every((k) => allowedKeys.has(k))) return false;

        if (diffKeys.includes('authorizedDoctorIds')) {
          const oldList = existingData?.authorizedDoctorIds || [];
          const newList = requestData?.authorizedDoctorIds || [];
          const isSubset = newList.every((x) => oldList.includes(x));
          const isStrictlySmaller = newList.length < oldList.length;
          return isSubset && isStrictlySmaller;
        }
        return true;
      }

      // Doctor updating
      if (this.isDoctor(auth)) {
        const allowedKeys = new Set(['authorizedDoctorIds', 'updatedAt', 'updatedAtServer']);
        const diffKeys = Object.keys(requestData).filter(
          (k) => JSON.stringify(requestData[k]) !== JSON.stringify(existingData?.[k])
        );
        if (!diffKeys.every((k) => allowedKeys.has(k))) return false;

        const existingAuth = existingData?.authorizedDoctorIds || [];
        const newAuth = requestData?.authorizedDoctorIds || [];

        // Adding self via atomic approval
        if (newAuth.includes(auth.uid) && !existingAuth.includes(auth.uid)) {
          if (!this.isLegitimateAtomicApproval(auth, patientId)) return false;
          const isSuperset = existingAuth.every((x) => newAuth.includes(x));
          const exactlyOneMore = newAuth.length === existingAuth.length + 1;
          return isSuperset && exactlyOneMore;
        }

        // Removing self
        if (!newAuth.includes(auth.uid) && existingAuth.includes(auth.uid)) {
          const isSubset = newAuth.every((x) => existingAuth.includes(x));
          const exactlyOneLess = newAuth.length === existingAuth.length - 1;
          return isSubset && exactlyOneLess;
        }
      }
      return false;
    }
    return false;
  }

  evaluateDoctors(op, auth, doctorId, existingData, requestData) {
    if (op === 'read') {
      if (!this.isAuthenticated(auth)) return false;
      return this.isOwner(auth, doctorId) || existingData?.isVerified === true;
    }
    if (op === 'create') {
      if (!this.isOwner(auth, doctorId) || requestData?.doctorId !== doctorId) return false;
      if (requestData?.isVerified === true) return false;
      const allowed = new Set([
        'doctorId', 'fullName', 'photoURL', 'specialization', 'registrationNumber', 
        'clinicOrHospital', 'qualifications', 'description', 'isVerified', 
        'preferredLanguage', 'createdAt'
      ]);
      return Object.keys(requestData).every((k) => allowed.has(k));
    }
    if (op === 'update') {
      if (!this.isOwner(auth, doctorId) || requestData?.doctorId !== resourceDoc(existingData)?.doctorId) return false;
      if (requestData?.isVerified !== existingData?.isVerified) return false;
      const allowed = new Set([
        'fullName', 'photoURL', 'specialization', 'registrationNumber', 
        'clinicOrHospital', 'qualifications', 'description', 
        'preferredLanguage', 'updatedAt', 'updatedAtServer'
      ]);
      const diffKeys = Object.keys(requestData).filter(
        (k) => JSON.stringify(requestData[k]) !== JSON.stringify(existingData[k])
      );
      return diffKeys.every((k) => allowed.has(k));
    }
    return false;
  }

  evaluateConnectionRequests(op, auth, requestId, existingData, requestData) {
    if (op === 'read') {
      return (
        this.isAuthenticated(auth) &&
        (existingData?.patientId === auth.uid || existingData?.doctorId === auth.uid)
      );
    }
    if (op === 'create') {
      if (!this.isAuthenticated(auth)) return false;
      const allowed = new Set([
        'id', 'patientId', 'uniquePatientId', 'patientName', 'patientEmail', 'patientPhotoURL', 
        'doctorId', 'doctorName', 'doctorSpecialization', 'doctorClinic', 
        'doctorRegNumber', 'doctorPhotoURL', 'status', 'requestNote', 
        'initiatedBy', 'createdAt', 'createdAtServer', 'updatedAtServer'
      ]);
      if (!Object.keys(requestData).every((k) => allowed.has(k))) return false;
      if (!['id', 'patientId', 'doctorId', 'status', 'createdAt', 'initiatedBy'].every((k) => k in requestData)) return false;

      // Patient creating with strict type/size validation
      if (
        requestData.patientId === auth.uid &&
        requestData.status === 'pending' &&
        requestData.initiatedBy === 'patient' &&
        typeof requestData.doctorId === 'string' &&
        requestData.doctorId.length > 0 &&
        requestData.doctorId.length <= 128 &&
        requestData.doctorId !== auth.uid &&
        requestId === `${auth.uid}_${requestData.doctorId}` &&
        requestData.id === requestId &&
        typeof requestData.patientName === 'string' &&
        requestData.patientName.length > 0 &&
        requestData.patientName.length <= 150 &&
        typeof requestData.doctorName === 'string' &&
        requestData.doctorName.length > 0 &&
        requestData.doctorName.length <= 150 &&
        typeof requestData.doctorSpecialization === 'string' &&
        requestData.doctorSpecialization.length <= 150 &&
        typeof requestData.doctorClinic === 'string' &&
        requestData.doctorClinic.length <= 200 &&
        typeof requestData.doctorRegNumber === 'string' &&
        requestData.doctorRegNumber.length <= 100 &&
        typeof requestData.createdAt === 'string' &&
        requestData.createdAt.length <= 50 &&
        (!requestData.uniquePatientId || typeof requestData.uniquePatientId === 'string') &&
        (!requestData.patientEmail || typeof requestData.patientEmail === 'string') &&
        (!requestData.patientPhotoURL || typeof requestData.patientPhotoURL === 'string') &&
        (!requestData.doctorPhotoURL || typeof requestData.doctorPhotoURL === 'string') &&
        (!requestData.requestNote || (typeof requestData.requestNote === 'string' && requestData.requestNote.length <= 1000))
      ) {
        return true;
      }
      return false;
    }
    if (op === 'update') {
      if (!this.isAuthenticated(auth)) return false;
      if (
        requestData?.id !== existingData?.id ||
        requestData?.patientId !== existingData?.patientId ||
        requestData?.doctorId !== existingData?.doctorId ||
        requestData?.createdAt !== existingData?.createdAt
      ) {
        return false;
      }
      const allowed = new Set(['status', 'updatedAt', 'updatedAtServer']);
      const diffKeys = Object.keys(requestData).filter(
        (k) => JSON.stringify(requestData[k]) !== JSON.stringify(existingData[k])
      );
      if (!diffKeys.every((k) => allowed.has(k))) return false;

      // Doctor accepting
      if (
        this.isDoctor(auth) &&
        existingData?.doctorId === auth.uid &&
        existingData?.status === 'pending' &&
        requestData?.status === 'accepted'
      ) {
        // Enforce atomic batch commitment
        const patPost = this.afterDb.get('patients', existingData.patientId);
        const conPost = this.afterDb.get('consents', `${existingData.patientId}_${auth.uid}`);
        return (
          patPost.exists &&
          Array.isArray(patPost.data.authorizedDoctorIds) &&
          patPost.data.authorizedDoctorIds.includes(auth.uid) &&
          conPost.exists &&
          conPost.data.status === 'active'
        );
      }

      // Doctor rejecting
      if (
        this.isDoctor(auth) &&
        existingData?.doctorId === auth.uid &&
        existingData?.status === 'pending' &&
        requestData?.status === 'rejected'
      ) {
        const conPost = this.afterDb.get('consents', `${existingData.patientId}_${auth.uid}`);
        return conPost.exists && conPost.data.status === 'rejected';
      }

      // Patient cancelling/revoking
      if (
        existingData?.patientId === auth.uid &&
        ((existingData?.status === 'pending' && ['cancelled', 'revoked'].includes(requestData?.status)) ||
         (existingData?.status === 'accepted' && requestData?.status === 'revoked'))
      ) {
        return true;
      }

      return false;
    }
    return false;
  }

  evaluateConsents(op, auth, consentId, existingData, requestData) {
    if (op === 'read') {
      return (
        this.isAuthenticated(auth) &&
        (existingData?.patientId === auth.uid || existingData?.doctorId === auth.uid)
      );
    }
    if (op === 'create') {
      if (!this.isAuthenticated(auth)) return false;
      const allowed = new Set(['patientId', 'doctorId', 'status', 'grantedAt', 'rejectedAt', 'revokedAt', 'updatedAt', 'updatedAtServer']);
      if (!Object.keys(requestData).every((k) => allowed.has(k))) return false;
      if (!['patientId', 'doctorId', 'status'].every((k) => k in requestData)) return false;

      // Patient creating
      if (
        requestData.patientId === auth.uid &&
        typeof requestData.doctorId === 'string' &&
        consentId === `${auth.uid}_${requestData.doctorId}` &&
        ['active', 'revoked'].includes(requestData.status)
      ) {
        return true;
      }

      // Doctor creating: requires atomic approval (active) or atomic rejection (rejected)
      if (
        this.isDoctor(auth) &&
        requestData.doctorId === auth.uid &&
        typeof requestData.patientId === 'string' &&
        consentId === `${requestData.patientId}_${auth.uid}` &&
        (
          (requestData.status === 'active' && this.isLegitimateAtomicApproval(auth, requestData.patientId)) ||
          (requestData.status === 'rejected' && this.isLegitimateAtomicRejection(auth, requestData.patientId))
        )
      ) {
        return true;
      }
      return false;
    }
    if (op === 'update') {
      if (!this.isAuthenticated(auth)) return false;
      if (
        requestData?.patientId !== existingData?.patientId ||
        requestData?.doctorId !== existingData?.doctorId
      ) {
        return false;
      }
      const allowed = new Set(['status', 'revokedAt', 'rejectedAt', 'grantedAt', 'updatedAt', 'updatedAtServer']);
      const diffKeys = Object.keys(requestData).filter(
        (k) => JSON.stringify(requestData[k]) !== JSON.stringify(existingData[k])
      );
      if (!diffKeys.every((k) => allowed.has(k))) return false;

      // Patient updating
      if (existingData?.patientId === auth.uid && ['active', 'revoked'].includes(requestData?.status)) {
        return true;
      }

      // Doctor updating: DOCTORS CANNOT REVOKE OR UN-REVOKE!
      if (
        this.isDoctor(auth) &&
        existingData?.doctorId === auth.uid &&
        existingData?.status !== 'revoked' &&
        (
          (requestData?.status === 'active' && this.isLegitimateAtomicApproval(auth, existingData.patientId)) ||
          (requestData?.status === 'rejected' && this.isLegitimateAtomicRejection(auth, existingData.patientId))
        )
      ) {
        return true;
      }

      return false;
    }
    return false;
  }

  evaluateConsultations(op, auth, consultationId, existingData, requestData) {
    if (op === 'read') {
      return (
        this.isAuthenticated(auth) &&
        (existingData?.patientId === auth.uid ||
         (this.isDoctor(auth) && this.isAuthorizedDoctorForPatient(auth, existingData?.patientId)))
      );
    }
    if (op === 'create') {
      if (!this.isDoctor(auth) || requestData?.doctorId !== auth.uid) return false;
      if (!this.isAuthorizedDoctorForPatient(auth, requestData?.patientId)) return false;
      if (requestData?.id !== consultationId) return false;

      const allowed = new Set([
        'id', 'patientId', 'doctorId', 'doctorName', 'doctorSpecialization', 
        'doctorRegNumber', 'isInitialBaseline', 'consultationDate', 
        'chiefComplaints', 'diagnosis', 'baselineSymptoms', 'treatmentPlan', 
        'followUpAdvice', 'reviewDate', 'notes', 'createdAt'
      ]);
      if (!Object.keys(requestData).every((k) => allowed.has(k))) return false;
      return ['id', 'patientId', 'doctorId', 'consultationDate', 'diagnosis', 'treatmentPlan', 'createdAt'].every(
        (k) => k in requestData
      );
    }
    if (op === 'update') {
      if (
        !this.isDoctor(auth) ||
        existingData?.doctorId !== auth.uid ||
        !this.isAuthorizedDoctorForPatient(auth, existingData?.patientId)
      ) {
        return false;
      }
      if (
        requestData?.id !== existingData?.id ||
        requestData?.patientId !== existingData?.patientId ||
        requestData?.doctorId !== existingData?.doctorId ||
        requestData?.createdAt !== existingData?.createdAt
      ) {
        return false;
      }
      if (
        existingData?.isInitialBaseline !== undefined &&
        requestData?.isInitialBaseline !== existingData?.isInitialBaseline
      ) {
        return false;
      }
      const allowedKeys = new Set([
        'diagnosis', 'treatmentPlan', 'followUpAdvice', 'baselineSymptoms',
        'chiefComplaints', 'reviewDate', 'notes', 'updatedAt', 'updatedAtServer'
      ]);
      const diffKeys = Object.keys(requestData).filter(
        (k) => JSON.stringify(requestData[k]) !== JSON.stringify(existingData[k])
      );
      return diffKeys.every((k) => allowedKeys.has(k));
    }
    return false;
  }

  evaluateHealthUpdates(op, auth, updateId, existingData, requestData) {
    if (op === 'read') {
      if (!this.isAuthenticated(auth)) return false;
      if (existingData?.patientId === auth.uid) return true;
      return (
        this.isAuthorizedDoctorForPatient(auth, existingData?.patientId) &&
        existingData?.isConfirmed === true
      );
    }
    if (op === 'create') {
      if (!this.isAuthenticated(auth) || requestData?.patientId !== auth.uid || requestData?.id !== updateId) {
        return false;
      }
      const allowed = new Set([
        'id', 'patientId', 'consultationId', 'baselineConsultationId', 
        'rawTranscript', 'originalLanguage', 'language', 'preferredLanguage', 
        'finalConfirmedSummary', 'structuredSummary', 'correctionHistory', 
        'comparisonWithBaseline', 'isConfirmed', 'status', 'confirmedAt', 'createdAt'
      ]);
      if (!Object.keys(requestData).every((k) => allowed.has(k))) return false;
      if (!['id', 'patientId', 'rawTranscript', 'language', 'isConfirmed', 'createdAt'].every((k) => k in requestData)) {
        return false;
      }
      if (requestData.isConfirmed === true) {
        if (!requestData.finalConfirmedSummary || requestData.finalConfirmedSummary.length === 0 || !requestData.confirmedAt) {
          return false;
        }
      }
      return true;
    }
    if (op === 'update') {
      if (!this.isAuthenticated(auth) || existingData?.patientId !== auth.uid || requestData?.patientId !== auth.uid) {
        return false;
      }
      if (
        requestData?.id !== existingData?.id ||
        requestData?.createdAt !== existingData?.createdAt
      ) {
        return false;
      }
      // If confirmed, protected fields are immutable
      if (existingData?.isConfirmed === true) {
        if (
          requestData?.isConfirmed !== true ||
          requestData?.finalConfirmedSummary !== existingData?.finalConfirmedSummary ||
          requestData?.rawTranscript !== existingData?.rawTranscript ||
          requestData?.confirmedAt !== existingData?.confirmedAt
        ) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  evaluateHealthChangeBriefs(op, auth, briefId, existingData, requestData) {
    if (op === 'read') {
      return (
        this.isAuthenticated(auth) &&
        (existingData?.patientId === auth.uid ||
         this.isAuthorizedDoctorForPatient(auth, existingData?.patientId))
      );
    }
    if (op === 'create') {
      if (!this.isAuthenticated(auth) || requestData?.id !== briefId) return false;
      const allowed = new Set([
        'id', 'patientId', 'generatedAt', 'doctorLanguage', 'previousRecord', 
        'latestRecord', 'hasReliableComparison', 'unreliableReason', 
        'quickSummary', 'categories', 'patientReportedContext', 
        'clinicalObservations', 'isReviewedByDoctor', 'reviewedBy', 
        'createdAtServer', 'updatedAtServer'
      ]);
      if (!Object.keys(requestData).every((k) => allowed.has(k))) return false;
      if (!['id', 'patientId', 'quickSummary', 'hasReliableComparison', 'isReviewedByDoctor'].every((k) => k in requestData)) {
        return false;
      }
      return (
        requestData.patientId === auth.uid ||
        this.isAuthorizedDoctorForPatient(auth, requestData.patientId)
      );
    }
    if (op === 'update') {
      if (
        !this.isDoctor(auth) ||
        !this.isAuthorizedDoctorForPatient(auth, existingData?.patientId) ||
        requestData?.patientId !== existingData?.patientId ||
        requestData?.id !== existingData?.id
      ) {
        return false;
      }
      if (
        requestData?.quickSummary !== existingData?.quickSummary ||
        requestData?.hasReliableComparison !== existingData?.hasReliableComparison ||
        JSON.stringify(requestData?.categories) !== JSON.stringify(existingData?.categories) ||
        JSON.stringify(requestData?.previousRecord) !== JSON.stringify(existingData?.previousRecord) ||
        JSON.stringify(requestData?.latestRecord) !== JSON.stringify(existingData?.latestRecord) ||
        JSON.stringify(requestData?.patientReportedContext) !== JSON.stringify(existingData?.patientReportedContext)
      ) {
        return false;
      }
      const allowedKeys = new Set(['clinicalObservations', 'isReviewedByDoctor', 'reviewedBy', 'updatedAtServer']);
      const diffKeys = Object.keys(requestData).filter(
        (k) => JSON.stringify(requestData[k]) !== JSON.stringify(existingData[k])
      );
      if (!diffKeys.every((k) => allowedKeys.has(k))) return false;
      return requestData?.reviewedBy?.doctorId === auth.uid && requestData?.isReviewedByDoctor === true;
    }
    return false;
  }

  evaluateAtomicBatch(auth, writes) {
    const afterDb = this.db.clone();
    for (const w of writes) {
      if (w.op === 'set' || w.op === 'create') {
        afterDb.set(w.collection, w.id, w.data);
      } else if (w.op === 'update') {
        const cur = afterDb.get(w.collection, w.id).data || {};
        afterDb.set(w.collection, w.id, { ...cur, ...w.data });
      }
    }

    const validator = new SecurityRulesValidator(this.db, afterDb);

    for (const w of writes) {
      const existing = this.db.get(w.collection, w.id).data;
      let allowed = false;

      if (w.collection === 'connection_requests') {
        allowed = validator.evaluateConnectionRequests(w.op, auth, w.id, existing, w.data);
      } else if (w.collection === 'patients') {
        const fullRequestData = w.op === 'update' ? { ...existing, ...w.data } : w.data;
        allowed = validator.evaluatePatients(w.op, auth, w.id, existing, fullRequestData);
      } else if (w.collection === 'consents') {
        allowed = validator.evaluateConsents(w.op, auth, w.id, existing, w.data);
      } else if (w.collection === 'consultations') {
        const fullRequestData = w.op === 'update' ? { ...existing, ...w.data } : w.data;
        allowed = validator.evaluateConsultations(w.op, auth, w.id, existing, fullRequestData);
      }

      if (!allowed) {
        return { success: false, failedOperation: w };
      }
    }

    for (const w of writes) {
      if (w.op === 'set' || w.op === 'create') {
        this.db.set(w.collection, w.id, w.data);
      } else if (w.op === 'update') {
        const cur = this.db.get(w.collection, w.id).data || {};
        this.db.set(w.collection, w.id, { ...cur, ...w.data });
      }
    }

    return { success: true };
  }
}

function resourceDoc(d) {
  return d || {};
}

// =========================================================================
// RUN TEST SCENARIOS
// =========================================================================

async function runTestSuite() {
  console.log('================================================================================');
  console.log('REVISION 4 AUTOMATED SECURITY RULES VERIFICATION TEST SUITE');
  console.log('================================================================================\n');

  const db = new MockFirestoreDatabase();
  const rules = new SecurityRulesValidator(db);

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // Base Users
  db.set('users', 'patient_A', { uid: 'patient_A', email: 'alice@example.com', role: 'patient' });
  db.set('users', 'patient_B', { uid: 'patient_B', email: 'bob@example.com', role: 'patient' });
  db.set('users', 'doctor_1', { uid: 'doctor_1', email: 'dr1@example.com', role: 'doctor' });
  db.set('users', 'doctor_2', { uid: 'doctor_2', email: 'dr2@example.com', role: 'doctor' });

  // Base Doctors
  db.set('doctors', 'doctor_1', { doctorId: 'doctor_1', fullName: 'Dr. One', isVerified: true });
  db.set('doctors', 'doctor_2', { doctorId: 'doctor_2', fullName: 'Dr. Two', isVerified: true });

  // Base Patients
  db.set('patients', 'patient_A', {
    patientId: 'patient_A',
    fullName: 'Alice',
    authorizedDoctorIds: ['doctor_1']
  });
  db.set('consents', 'patient_A_doctor_1', {
    patientId: 'patient_A',
    doctorId: 'doctor_1',
    status: 'active'
  });

  db.set('patients', 'patient_B', {
    patientId: 'patient_B',
    fullName: 'Bob',
    authorizedDoctorIds: []
  });

  const authA = { uid: 'patient_A' };
  const authB = { uid: 'patient_B' };
  const authDoc1 = { uid: 'doctor_1' };
  const authDoc2 = { uid: 'doctor_2' };

  // -------------------------------------------------------------------------
  // 1. REVOKED DOCTOR CANNOT READ PATIENT PROFILE EVEN IF AUTHORIZEDDOCTORIDS STILL CONTAINS UID
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Two-Tier Defense: Revoked Consent Blocks Profile Read Even With Stale ID ---');
  // Doctor 1 is in authorizedDoctorIds for Patient A, but consent is set to revoked!
  db.set('consents', 'patient_A_doctor_1', { patientId: 'patient_A', doctorId: 'doctor_1', status: 'revoked' });

  assert(!rules.isAuthorizedDoctorForPatient(authDoc1, 'patient_A'),
    'Doctor 1 is NOT authorized when consent status is revoked');
  assert(!rules.evaluatePatients('read', authDoc1, 'patient_A', db.get('patients', 'patient_A').data),
    'Doctor 1 CANNOT read patient profile even though UID is still in authorizedDoctorIds (requires active consent)');

  // Restore active consent for subsequent tests
  db.set('consents', 'patient_A_doctor_1', { patientId: 'patient_A', doctorId: 'doctor_1', status: 'active' });

  // -------------------------------------------------------------------------
  // 2. DOCTOR CANNOT INDEPENDENTLY REVOKE PATIENT CONSENT
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Doctor Cannot Independently Revoke Patient Consent ---');
  const doctorRevokeAttempt = {
    patientId: 'patient_A',
    doctorId: 'doctor_1',
    status: 'revoked',
    revokedAt: new Date().toISOString()
  };
  assert(!rules.evaluateConsents('update', authDoc1, 'patient_A_doctor_1', db.get('consents', 'patient_A_doctor_1').data, doctorRevokeAttempt),
    'Doctor 1 CANNOT independently revoke consent (only patient can revoke consent)');

  // Patient CAN revoke consent
  assert(rules.evaluateConsents('update', authA, 'patient_A_doctor_1', db.get('consents', 'patient_A_doctor_1').data, doctorRevokeAttempt),
    'Patient A CAN revoke consent');

  // Once revoked, Doctor cannot un-revoke
  db.set('consents', 'patient_A_doctor_1', doctorRevokeAttempt);
  const doctorUnrevokeAttempt = { ...doctorRevokeAttempt, status: 'active' };
  assert(!rules.evaluateConsents('update', authDoc1, 'patient_A_doctor_1', db.get('consents', 'patient_A_doctor_1').data, doctorUnrevokeAttempt),
    'Doctor CANNOT un-revoke or reverse patient revocation');

  // Restore active consent
  db.set('consents', 'patient_A_doctor_1', { patientId: 'patient_A', doctorId: 'doctor_1', status: 'active' });

  // -------------------------------------------------------------------------
  // 3. DOCTOR CANNOT INDEPENDENTLY ACCEPT A REQUEST (MUTUAL ATOMIC CHECK)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Doctor Cannot Independently Accept Request Without Atomic Batch ---');
  const reqBtoD2 = {
    id: 'patient_B_doctor_2',
    patientId: 'patient_B',
    doctorId: 'doctor_2',
    status: 'pending',
    initiatedBy: 'patient',
    createdAt: new Date().toISOString()
  };
  db.set('connection_requests', 'patient_B_doctor_2', reqBtoD2);

  const independentAcceptAttempt = {
    ...reqBtoD2,
    status: 'accepted',
    updatedAt: new Date().toISOString()
  };
  // Standalone call outside atomic batch (afterDb does NOT contain patient or consent updates)
  assert(!rules.evaluateConnectionRequests('update', authDoc2, 'patient_B_doctor_2', reqBtoD2, independentAcceptAttempt),
    'Doctor 2 CANNOT independently accept connection request without atomic batch commitment');

  // -------------------------------------------------------------------------
  // 4. PATIENT-DOCTOR CONNECTION REQUEST SECURITY SUITE (USER AUDIT REQUIREMENTS)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Patient-Doctor Connection Request Security Suite ---');

  // 4.1 Legitimate patient request creation
  const validPatientReq = {
    id: 'patient_B_doctor_2',
    patientId: 'patient_B',
    doctorId: 'doctor_2',
    patientName: 'Bob',
    doctorName: 'Dr. Jane Smith',
    doctorSpecialization: 'General Practice',
    doctorClinic: 'City Health',
    doctorRegNumber: 'MED-12345',
    status: 'pending',
    initiatedBy: 'patient',
    createdAt: new Date().toISOString()
  };
  assert(rules.evaluateConnectionRequests('create', authB, 'patient_B_doctor_2', null, validPatientReq),
    'Patient CAN create legitimate connection request (status=pending, initiatedBy=patient)');

  // 4.2 Patient creating a request for another UID (spoofing)
  const spoofOtherPatientReq = {
    id: 'patient_A_doctor_2',
    patientId: 'patient_A',
    doctorId: 'doctor_2',
    status: 'pending',
    initiatedBy: 'patient',
    createdAt: new Date().toISOString()
  };
  assert(!rules.evaluateConnectionRequests('create', authB, 'patient_A_doctor_2', null, spoofOtherPatientReq),
    'Patient CANNOT create connection request for another patient UID');

  // 4.3 Patient creating an already-approved request (self-approval bypass)
  const preApprovedReqAttempt = {
    id: 'patient_B_doctor_2',
    patientId: 'patient_B',
    doctorId: 'doctor_2',
    status: 'accepted',
    initiatedBy: 'patient',
    createdAt: new Date().toISOString()
  };
  assert(!rules.evaluateConnectionRequests('create', authB, 'patient_B_doctor_2', null, preApprovedReqAttempt),
    'Patient CANNOT create an already-approved connection request (status must be pending)');

  // 4.4 Patient changing authorization fields
  // (a) Patient attempting to modify authorizedDoctorIds on patient document
  const patientAuthEscalationAttempt = {
    patientId: 'patient_B',
    fullName: 'Bob',
    authorizedDoctorIds: ['doctor_2'],
    updatedAt: new Date().toISOString()
  };
  assert(!rules.evaluatePatients('update', authB, 'patient_B', db.get('patients', 'patient_B').data, patientAuthEscalationAttempt),
    'Patient CANNOT add doctors to authorizedDoctorIds on patient profile');

  // (b) Patient attempting to mark connection request as accepted/approved
  const patientSelfAcceptAttempt = {
    ...validPatientReq,
    status: 'accepted',
    updatedAt: new Date().toISOString()
  };
  assert(!rules.evaluateConnectionRequests('update', authB, 'patient_B_doctor_2', validPatientReq, patientSelfAcceptAttempt),
    'Patient CANNOT transition connection request to accepted/approved');

  // 4.5 Unauthorized doctor access
  assert(!rules.isAuthorizedDoctorForPatient(authDoc2, 'patient_B'),
    'Doctor 2 is NOT authorized for Patient B before connection approval');
  assert(!rules.evaluatePatients('read', authDoc2, 'patient_B', db.get('patients', 'patient_B').data),
    'Unauthorized Doctor 2 CANNOT read Patient B profile');
  db.set('health_updates', 'update_B_1', {
    id: 'update_B_1',
    patientId: 'patient_B',
    isConfirmed: true,
    finalConfirmedSummary: 'Fever',
    confirmedAt: new Date().toISOString()
  });
  assert(!rules.evaluateHealthUpdates('read', authDoc2, 'update_B_1', db.get('health_updates', 'update_B_1').data),
    'Unauthorized Doctor 2 CANNOT read Patient B medical updates');

  // 4.6 Patient adding arbitrary/unapproved fields
  const arbitraryFieldReq = {
    ...validPatientReq,
    arbitraryAdminField: true,
    maliciousRoleOverride: 'doctor'
  };
  assert(!rules.evaluateConnectionRequests('create', authB, 'patient_B_doctor_2', null, arbitraryFieldReq),
    'Patient CANNOT inject arbitrary or unapproved fields into connection requests');

  // -------------------------------------------------------------------------
  // 5. PATIENT CANNOT BYPASS SUMMARY CONFIRMATION
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Health Update Integrity & Confirmation Workflow ---');
  const unconfirmedBypassAttempt = {
    id: 'update_101',
    patientId: 'patient_A',
    rawTranscript: 'Fever and chills',
    language: 'en-IN',
    isConfirmed: true, // Marked confirmed without summary!
    createdAt: new Date().toISOString()
  };
  assert(!rules.evaluateHealthUpdates('create', authA, 'update_101', null, unconfirmedBypassAttempt),
    'Patient CANNOT create confirmed health update without providing finalConfirmedSummary and confirmedAt');

  const validConfirmedUpdate = {
    ...unconfirmedBypassAttempt,
    finalConfirmedSummary: 'Patient reports fever and chills for two days.',
    confirmedAt: new Date().toISOString()
  };
  assert(rules.evaluateHealthUpdates('create', authA, 'update_101', null, validConfirmedUpdate),
    'Patient CAN create properly confirmed health update');
  db.set('health_updates', 'update_101', validConfirmedUpdate);

  // Once confirmed, summary cannot be altered
  const alterSummaryAttempt = {
    ...validConfirmedUpdate,
    finalConfirmedSummary: 'Altered diagnosis without voice verification'
  };
  assert(!rules.evaluateHealthUpdates('update', authA, 'update_101', validConfirmedUpdate, alterSummaryAttempt),
    'Confirmed summary is strictly IMMUTABLE after patient confirmation');

  // -------------------------------------------------------------------------
  // 6. DOCTOR CANNOT READ PRIVATE DOCTOR ACCOUNT FIELDS (USERS COLLECTION)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Users Privacy: Doctor Cannot Read Other Doctor Account Fields ---');
  assert(!rules.evaluateUsers('read', authDoc2, 'doctor_1', db.get('users', 'doctor_1').data),
    'Doctor 2 CANNOT read Doctor 1 private user record in users collection');
  assert(rules.evaluateUsers('read', authDoc1, 'doctor_1', db.get('users', 'doctor_1').data),
    'Doctor 1 CAN read their own user record');

  // -------------------------------------------------------------------------
  // 7. REVOKED DOCTOR CANNOT ACCESS ANY CLINICAL RECORDS
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Clinical Records Blocked Immediately After Revocation ---');
  db.set('consultations', 'consult_A1', {
    id: 'consult_A1',
    patientId: 'patient_A',
    doctorId: 'doctor_1',
    consultationDate: '2026-01-01',
    diagnosis: 'Diabetes',
    treatmentPlan: 'Insulin',
    createdAt: '2026-01-01'
  });
  db.set('health_change_briefs', 'brief_A1', {
    id: 'brief_A1',
    patientId: 'patient_A',
    quickSummary: 'Stable',
    hasReliableComparison: true,
    isReviewedByDoctor: false
  });

  // When active:
  assert(rules.evaluateConsultations('read', authDoc1, 'consult_A1', db.get('consultations', 'consult_A1').data),
    'Active Doctor 1 CAN read clinical consultation');
  assert(rules.evaluateHealthUpdates('read', authDoc1, 'update_101', db.get('health_updates', 'update_101').data),
    'Active Doctor 1 CAN read confirmed health update');
  assert(rules.evaluateHealthChangeBriefs('read', authDoc1, 'brief_A1', db.get('health_change_briefs', 'brief_A1').data),
    'Active Doctor 1 CAN read health change brief');

  // Revocation: Patient A removes doctor_1 from authorizedDoctorIds
  db.set('patients', 'patient_A', { ...db.get('patients', 'patient_A').data, authorizedDoctorIds: [] });
  db.set('consents', 'patient_A_doctor_1', { patientId: 'patient_A', doctorId: 'doctor_1', status: 'revoked' });

  assert(!rules.evaluateConsultations('read', authDoc1, 'consult_A1', db.get('consultations', 'consult_A1').data),
    'Revoked Doctor 1 CANNOT read consultations');
  assert(!rules.evaluateHealthUpdates('read', authDoc1, 'update_101', db.get('health_updates', 'update_101').data),
    'Revoked Doctor 1 CANNOT read health updates');
  assert(!rules.evaluateHealthChangeBriefs('read', authDoc1, 'brief_A1', db.get('health_change_briefs', 'brief_A1').data),
    'Revoked Doctor 1 CANNOT read health change briefs');
  assert(!rules.evaluateConsultations('create', authDoc1, 'consult_new', null, {
    id: 'consult_new', patientId: 'patient_A', doctorId: 'doctor_1', consultationDate: '2026-04-01', diagnosis: 'Flu', treatmentPlan: 'Rest', createdAt: '2026-04-01'
  }), 'Revoked Doctor 1 CANNOT create new consultations');

  // -------------------------------------------------------------------------
  // 8. LEGITIMATE PATIENT-TO-DOCTOR CONNECTION & APPROVAL LIFECYCLE
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Full Legitimate Lifecycle: Connect, Atomic Batch Approval & Access ---');
  // 1. Patient B creates connection request to Doctor 2
  const legitReq = {
    id: 'patient_B_doctor_2',
    patientId: 'patient_B',
    doctorId: 'doctor_2',
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.set('connection_requests', 'patient_B_doctor_2', legitReq);
  assert(rules.evaluateConnectionRequests('read', authDoc2, 'patient_B_doctor_2', legitReq),
    'Doctor 2 CAN view incoming pending request');

  // 2. Doctor 2 executes atomic batch approval
  const atomicBatch = [
    {
      op: 'update',
      collection: 'connection_requests',
      id: 'patient_B_doctor_2',
      data: { status: 'accepted', id: 'patient_B_doctor_2', patientId: 'patient_B', doctorId: 'doctor_2', createdAt: legitReq.createdAt }
    },
    {
      op: 'update',
      collection: 'patients',
      id: 'patient_B',
      data: { authorizedDoctorIds: ['doctor_2'], updatedAt: new Date().toISOString() }
    },
    {
      op: 'create',
      collection: 'consents',
      id: 'patient_B_doctor_2',
      data: { patientId: 'patient_B', doctorId: 'doctor_2', status: 'active' }
    }
  ];

  const batchResult = rules.evaluateAtomicBatch(authDoc2, atomicBatch);
  assert(batchResult.success === true,
    'Atomic approval batch (connection_requests + patients + consents) COMMITS SUCCESSFULLY');

  // 3. Post-approval verified access
  assert(rules.isAuthorizedDoctorForPatient(authDoc2, 'patient_B'),
    'Doctor 2 is authorized on Patient B with active consent');
  assert(rules.evaluatePatients('read', authDoc2, 'patient_B', db.get('patients', 'patient_B').data),
    'Doctor 2 CAN read Patient B profile');

  // 4. Doctor 2 creates initial consultation
  const legitConsult = {
    id: 'consult_B_init',
    patientId: 'patient_B',
    doctorId: 'doctor_2',
    isInitialBaseline: true,
    consultationDate: '2026-04-01T10:00:00Z',
    diagnosis: 'Asthma',
    treatmentPlan: 'Albuterol inhaler',
    createdAt: new Date().toISOString()
  };
  assert(rules.evaluateConsultations('create', authDoc2, 'consult_B_init', null, legitConsult),
    'Doctor 2 CAN create baseline consultation after atomic approval');

  // -------------------------------------------------------------------------
  // 9. DOCTOR ATOMIC REJECTION WORKFLOW
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 9: Doctor Rejection Atomic Batch Workflow ---');
  const reqAtoD2 = {
    id: 'patient_A_doctor_2',
    patientId: 'patient_A',
    doctorId: 'doctor_2',
    status: 'pending',
    initiatedBy: 'patient',
    createdAt: new Date().toISOString()
  };
  db.set('connection_requests', 'patient_A_doctor_2', reqAtoD2);

  const rejectionBatch = [
    {
      op: 'update',
      collection: 'connection_requests',
      id: 'patient_A_doctor_2',
      data: { status: 'rejected', id: 'patient_A_doctor_2', patientId: 'patient_A', doctorId: 'doctor_2', createdAt: reqAtoD2.createdAt }
    },
    {
      op: 'create',
      collection: 'consents',
      id: 'patient_A_doctor_2',
      data: { patientId: 'patient_A', doctorId: 'doctor_2', status: 'rejected' }
    }
  ];

  const rejResult = rules.evaluateAtomicBatch(authDoc2, rejectionBatch);
  assert(rejResult.success === true,
    'Doctor atomic rejection batch (connection_requests + consents) COMMITS SUCCESSFULLY');
  assert(!rules.isAuthorizedDoctorForPatient(authDoc2, 'patient_A'),
    'Doctor 2 remains UNAUTHORIZED for Patient A after rejection');

  console.log('\n================================================================================');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================================');

  if (failed > 0) process.exit(1);
}

runTestSuite().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
