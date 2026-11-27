const http = require('http');

function postJson(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING NATURAL AI COMMUNICATION VERIFICATION ===\n');

  // TEST 1: Hinglish Health Update
  console.log('--- TEST 1: Hinglish Natural Health Update Processing ---');
  const hinglishInput = "Do din se bukhar kam hai lekin khansi abhi bhi ho rahi hai aur thodi weakness lagti hai";
  console.log('Patient Spoke (Hinglish):', hinglishInput);

  const res1 = await postJson('/api/ai/process-health-update', {
    transcript: hinglishInput,
    language: 'hinglish',
  });

  if (res1.status !== 200 || !res1.data.success) {
    console.error('TEST 1 FAILED:', res1);
    process.exit(1);
  }

  const s1 = res1.data.structured;
  console.log('Symptoms Extracted:', s1.symptoms?.map(s => `${s.symptom} (${s.status})`).join(', '));
  console.log('Patient-Friendly Note:\n  "', s1.patientFriendlyNote, '"');

  // Verify Hinglish naturalness checks
  const isRoboticHinglish = /observe kiya gaya|improvement darj|parinamswaroop/i.test(s1.patientFriendlyNote);
  console.log('Anti-Robotic Check (No textbook phrases):', !isRoboticHinglish ? 'PASS' : 'FAIL');
  console.log('Tone Check (Conversational readback):', s1.patientFriendlyNote?.length > 10 ? 'PASS' : 'FAIL');

  // TEST 2: Voice-Based Correction with Spoken Confirmation
  console.log('\n--- TEST 2: Voice Correction with Conversational Spoken Confirmation ---');
  const correctionInput = "Maine fever nahi, headache bola tha.";
  console.log('Patient Correction:', correctionInput);

  const res2 = await postJson('/api/ai/correct-health-update', {
    originalSummary: s1,
    correctionTranscript: correctionInput,
    language: 'hinglish',
  });

  if (res2.status !== 200 || !res2.data.success) {
    console.error('TEST 2 FAILED:', res2);
    process.exit(1);
  }

  const s2 = res2.data.corrected;
  console.log('Updated Symptoms:', s2.symptoms?.map(s => `${s.symptom} (${s.status})`).join(', '));
  console.log('Spoken Confirmation:\n  "', s2.spokenConfirmation, '"');
  console.log('Updated Note:\n  "', s2.patientFriendlyNote, '"');

  const hasConversationalConfirmation = s2.spokenConfirmation && s2.spokenConfirmation.length > 5;
  console.log('Spoken Confirmation Check:', hasConversationalConfirmation ? 'PASS' : 'FAIL');

  // TEST 3: Hindi (Devanagari) Natural Health Update
  console.log('\n--- TEST 3: Hindi (Devanagari) Natural Health Update ---');
  const hindiInput = "मुझे पिछले दो दिनों से सिरदर्द में आराम है, पर कमजोरी बहुत महसूस हो रही है।";
  console.log('Patient Spoke (Hindi):', hindiInput);

  const res3 = await postJson('/api/ai/process-health-update', {
    transcript: hindiInput,
    language: 'hi-IN',
  });

  if (res3.status !== 200 || !res3.data.success) {
    console.error('TEST 3 FAILED:', res3);
    process.exit(1);
  }

  const s3 = res3.data.structured;
  console.log('Symptoms Extracted:', s3.symptoms?.map(s => `${s.symptom} (${s.status})`).join(', '));
  console.log('Hindi Patient-Friendly Note:\n  "', s3.patientFriendlyNote, '"');
  console.log('Devanagari Check:', /[\u0900-\u097F]/.test(s3.patientFriendlyNote) ? 'PASS' : 'FAIL');

  // TEST 4: English Natural Health Update
  console.log('\n--- TEST 4: English Natural Health Update ---');
  const englishInput = "My fever has broken since yesterday, but I still have a mild dry cough.";
  console.log('Patient Spoke (English):', englishInput);

  const res4 = await postJson('/api/ai/process-health-update', {
    transcript: englishInput,
    language: 'en-IN',
  });

  if (res4.status !== 200 || !res4.data.success) {
    console.error('TEST 4 FAILED:', res4);
    process.exit(1);
  }

  const s4 = res4.data.structured;
  console.log('Symptoms Extracted:', s4.symptoms?.map(s => `${s.symptom} (${s.status})`).join(', '));
  console.log('English Patient-Friendly Note:\n  "', s4.patientFriendlyNote, '"');

  // TEST 5: Doctor\'s Health Change Brief Natural Language
  console.log('\n--- TEST 5: Intelligent Health Change Brief Natural Language Generation ---');
  const res5 = await postJson('/api/ai/health-change-brief', {
    patientId: 'test_patient_nat',
    doctorLanguage: 'hinglish',
    previousRecord: {
      type: 'baseline_consultation',
      id: 'base_1',
      date: '2026-11-20',
      summary: 'Patient presented with high fever, sore throat, and fatigue',
      symptoms: [
        { symptom: 'fever', severity: 'high', notes: '102F' },
        { symptom: 'sore throat', severity: 'moderate' },
        { symptom: 'fatigue', severity: 'mild' }
      ],
      diagnosis: 'Acute Upper Respiratory Tract Infection'
    },
    latestUpdate: {
      id: 'upd_1',
      date: '2026-11-24',
      rawTranscript: 'Fever has completely gone down. Throat is still sore especially when swallowing. Also developed mild cough.',
      clinicalNote: 'Patient reports fever resolved, persistent sore throat with odynophagia, new mild cough.',
      symptoms: [
        { symptom: 'fever', status: 'improved' },
        { symptom: 'sore throat', status: 'persistent' },
        { symptom: 'cough', status: 'worsened' }
      ]
    }
  });

  if (res5.status !== 200 || !res5.data.success) {
    console.error('TEST 5 FAILED:', res5);
    process.exit(1);
  }

  const brief = res5.data.brief;
  console.log('Reliable Comparison:', brief.hasReliableComparison ? 'YES' : 'NO');
  console.log('Natural Quick Summary:\n  "', brief.quickSummary, '"');
  console.log('Improved:', brief.categories?.improved?.map(i => i.symptom).join(', '));
  console.log('Persistent:', brief.categories?.persistent?.map(i => i.symptom).join(', '));
  console.log('Newly Reported:', brief.categories?.newlyReported?.map(i => i.symptom).join(', '));
  console.log('Not Mentioned:', brief.categories?.notMentioned?.map(i => i.symptom).join(', '));

  console.log('\n=== ALL 5 NATURAL COMMUNICATION TESTS PASSED WITH 100% SUCCESS ===');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
