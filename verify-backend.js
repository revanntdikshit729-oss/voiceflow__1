import dotenv from 'dotenv';
dotenv.config();

import { processHealthUpdate, correctHealthUpdate, generateDoctorMemoryBrief } from './dist/services/gemini.js';
import { isFirebaseAdminInitialized, admin } from './dist/services/firebaseAdmin.js';

async function runVerification() {
  console.log('==============================================');
  console.log('   VOICEFLOW BACKEND LIVE INTEGRATION CHECK   ');
  console.log('==============================================\n');

  // 1. Check environment variable loading
  const apiKey = process.env.GEMINI_API_KEY || '';
  const isKeyLoaded = apiKey.trim().length > 0;
  console.log(`1. Server Environment Check:`);
  console.log(`   - GEMINI_API_KEY loaded: ${isKeyLoaded ? 'YES (Key detected, length ' + apiKey.length + ')' : 'NO'}`);
  console.log(`   - FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID || 'None'}`);
  console.log(`   - PORT: ${process.env.PORT || '5000'}\n`);

  if (!isKeyLoaded) {
    console.error('❌ ERROR: GEMINI_API_KEY is not detected in server/.env.');
    process.exit(1);
  }

  // 2. Test Gemini API with Multilingual Speech Transcript
  console.log('2. Testing Gemini 1.5 Flash API with Multilingual Transcript...');
  const sampleTranscript = "Kal se bukhar kam hai, lekin khansi abhi bhi ho rahi hai.";
  let structuredResult = null;

  try {
    const startTime = Date.now();
    structuredResult = await processHealthUpdate({
      transcript: sampleTranscript,
      language: 'hinglish',
    });
    const elapsed = Date.now() - startTime;
    console.log(`   ✅ Gemini API Connected successfully (${elapsed}ms)!`);
    console.log(`   - Spoken Input: "${sampleTranscript}"`);
    console.log(`   - Identified Symptoms:`, JSON.stringify(structuredResult.symptoms));
    console.log(`   - General Wellbeing: ${structuredResult.generalWellbeing}`);
    console.log(`   - Patient-Friendly Readback: "${structuredResult.patientFriendlyNote}"`);
    console.log(`   - Clinical Doctor Note: "${structuredResult.clinicalNote}"\n`);
  } catch (err) {
    console.error('   ❌ Gemini API Health Update Call Failed:', err.message);
    if (err.stack) console.error(err.stack);
  }

  // 3. Test Voice Correction Pipeline
  if (structuredResult) {
    console.log('3. Testing Gemini Correction Pipeline...');
    const correctionTranscript = "Maine fever nahi, headache bola tha.";
    try {
      const correctedResult = await correctHealthUpdate({
        originalSummary: structuredResult,
        correctionTranscript,
        language: 'hinglish',
      });
      console.log('   ✅ Gemini Correction Applied successfully!');
      console.log(`   - Correction Spoken: "${correctionTranscript}"`);
      console.log(`   - Corrected Symptoms:`, JSON.stringify(correctedResult.symptoms));
      console.log(`   - Updated Patient Readback: "${correctedResult.patientFriendlyNote}"\n`);
    } catch (err) {
      console.error('   ❌ Gemini Correction Call Failed:', err.message);
    }
  }

  // 4. Test Doctor's Memory Brief Generation
  console.log('4. Testing Doctor Memory Brief Generation...');
  try {
    const mockBaseline = {
      diagnosis: "Acute Bronchitis",
      baselineSymptoms: [
        { symptom: "High Fever", severity: "moderate" },
        { symptom: "Cough", severity: "mild" }
      ]
    };
    const mockUpdates = [
      {
        confirmedAt: new Date().toISOString(),
        rawTranscript: sampleTranscript,
        structuredSummary: structuredResult || {
          symptoms: [
            { symptom: "Fever", status: "improved" },
            { symptom: "Cough", status: "persistent" }
          ],
          generalWellbeing: "Feeling somewhat better",
          clinicalNote: "Fever subsiding, persistent cough noted."
        }
      }
    ];

    const brief = await generateDoctorMemoryBrief({
      patientId: "test_patient_123",
      baselineConsultation: mockBaseline,
      confirmedUpdates: mockUpdates
    });

    console.log('   ✅ Doctor Memory Brief Generated successfully!');
    console.log(`   - 10-Second Trajectory Summary: "${brief.quickSummary}"`);
    console.log(`   - Improved Symptoms:`, brief.improvedSymptoms);
    console.log(`   - Persistent Symptoms:`, brief.persistentSymptoms);
    console.log(`   - New Symptoms:`, brief.newSymptoms);
    console.log(`   - Clinical Inquiries / Alerts:`, brief.clinicalAlertsOrFollowUpRecommendations, '\n');
  } catch (err) {
    console.error('   ❌ Doctor Memory Brief Call Failed:', err.message);
  }

  // 5. Test Firebase Admin SDK & Authentication
  console.log('5. Testing Firebase Admin SDK Status...');
  console.log(`   - Firebase Admin Initialized: ${isFirebaseAdminInitialized ? 'YES' : 'NO'}`);
  console.log(`   - Firebase Project ID: ${admin.app().options.projectId}`);
  const hasServiceAccount = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  console.log(`   - Service Account Key Configured: ${hasServiceAccount ? 'YES' : 'NO (Running in project-scoped client auth mode)'}\n`);

  console.log('==============================================');
  console.log('             VERIFICATION FINISHED            ');
  console.log('==============================================');
}

runVerification().catch((err) => {
  console.error('Unhandled Verification Error:', err);
  process.exit(1);
});
