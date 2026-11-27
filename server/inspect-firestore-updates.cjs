const { admin, isFirebaseAdminInitialized } = require('./dist/services/firebaseAdmin.js');

async function inspect() {
  console.log('Firebase Admin Initialized:', isFirebaseAdminInitialized);
  const db = admin.firestore();

  console.log('\n--- Checking Consultations Collection ---');
  try {
    const consSnap = await db.collection('consultations').get();
    console.log('Total Consultations in Firestore:', consSnap.size);
    consSnap.forEach(doc => {
      const data = doc.data();
      console.log(`- Consultation ID: ${doc.id}, PatientId: ${data.patientId}, Doctor: ${data.doctorName}, Diagnosis: ${data.diagnosis}, Baseline: ${data.isInitialBaseline}`);
    });
  } catch (e) {
    console.log('Consultations query note:', e.message);
  }

  console.log('\n--- Checking Health Updates Collection ---');
  try {
    const updSnap = await db.collection('health_updates').get();
    console.log('Total Health Updates in Firestore:', updSnap.size);
    updSnap.forEach(doc => {
      const data = doc.data();
      console.log(`- Update ID: ${doc.id}, PatientId: ${data.patientId}, ConsultationId: ${data.consultationId}, Confirmed: ${data.isConfirmed}`);
    });
  } catch (e) {
    console.log('Health updates query note:', e.message);
  }

  console.log('\n--- Checking Patients Collection ---');
  try {
    const patSnap = await db.collection('patients').get();
    console.log('Total Patients in Firestore:', patSnap.size);
    patSnap.forEach(doc => {
      const data = doc.data();
      console.log(`- Patient ID: ${doc.id}, Name: ${data.fullName}, UniqueID: ${data.uniquePatientId}`);
    });
  } catch (e) {
    console.log('Patients query note:', e.message);
  }
}

inspect().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
