import { app } from './dist/index.js';
import http from 'http';

const server = http.createServer(app);

server.listen(5099, '127.0.0.1', async () => {
  console.log('Testing server running on http://127.0.0.1:5099...');
  
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name} ->`, err.message);
      failed++;
    }
  }

  // 1. Health check test
  await test('GET /api/health returns 200 with service and Firebase status', async () => {
    const res = await fetch('http://127.0.0.1:5099/api/health');
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const data = await res.json();
    if (data.service !== 'VoiceFlow Backend') throw new Error(`Unexpected service: ${data.service}`);
    if (data.firebaseProjectId !== 'voiceflow-f53b8') throw new Error(`Unexpected projectId: ${data.firebaseProjectId}`);
    console.log('   Healthcheck body:', JSON.stringify(data));
  });

  // 2. Auth status endpoint test
  await test('GET /api/auth/status returns Firebase project details', async () => {
    const res = await fetch('http://127.0.0.1:5099/api/auth/status');
    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const data = await res.json();
    if (data.projectId !== 'voiceflow-f53b8') throw new Error(`Expected voiceflow-f53b8, got ${data.projectId}`);
  });

  // 3. Auth token validation: unauthenticated request to /api/auth/me returns 401
  await test('GET /api/auth/me rejects unauthenticated request with 401', async () => {
    const res = await fetch('http://127.0.0.1:5099/api/auth/me');
    if (res.status !== 401) throw new Error(`Expected status 401, got ${res.status}`);
    const data = await res.json();
    if (!data.error) throw new Error('Expected error message in response');
  });

  // 4. AI route validation: empty transcript
  await test('POST /api/ai/process-health-update returns 400 when transcript is missing', async () => {
    const res = await fetch('http://127.0.0.1:5099/api/ai/process-health-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: '' }),
    });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
  });

  // 5. AI route validation: empty correction
  await test('POST /api/ai/correct-health-update returns 400 on missing correction', async () => {
    const res = await fetch('http://127.0.0.1:5099/api/ai/correct-health-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalSummary: {} }),
    });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
  });

  // 6. AI route validation: doctor brief invalid input
  await test('POST /api/ai/doctor-memory-brief returns 400 on missing patientId', async () => {
    const res = await fetch('http://127.0.0.1:5099/api/ai/doctor-memory-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
  });

  // 7. Live Gemini AI: Health Change Detection with Baseline
  await test('POST /api/ai/process-health-update performs Health Change Detection vs Baseline', async () => {
    const sampleBaseline = {
      diagnosis: 'Acute Upper Respiratory Tract Infection',
      treatmentPlan: 'Paracetamol 650mg TDS, Levocetirizine 5mg HS',
      baselineSymptoms: [
        { symptom: 'Fever', severity: 'moderate', notes: '101.5°F' },
        { symptom: 'Dry Cough', severity: 'mild', notes: 'Night cough' }
      ]
    };

    const res = await fetch('http://127.0.0.1:5099/api/ai/process-health-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: 'Kal se bukhar kam hai, lekin khansi abhi bhi ho rahi hai aur thoda sar dard bhi hai.',
        language: 'hinglish',
        baselineConsultation: sampleBaseline,
      }),
    });

    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.structured) throw new Error('Expected structured output from Gemini');
    console.log('   AI Structured Symptoms:', JSON.stringify(data.structured.symptoms));
    if (data.structured.comparisonWithBaseline) {
      console.log('   Health Change Comparison:', JSON.stringify(data.structured.comparisonWithBaseline));
    }
  });

  // 8. Live Gemini AI: Doctor Memory Brief Synthesis
  await test('POST /api/ai/doctor-memory-brief generates 10-second trajectory & differentials', async () => {
    const sampleBaseline = {
      diagnosis: 'Acute Upper Respiratory Tract Infection',
      treatmentPlan: 'Paracetamol 650mg TDS, Levocetirizine 5mg HS',
      baselineSymptoms: [
        { symptom: 'Fever', severity: 'moderate' },
        { symptom: 'Dry Cough', severity: 'mild' }
      ]
    };

    const sampleUpdates = [
      {
        rawTranscript: 'Kal se bukhar kam hai, lekin khansi abhi bhi ho rahi hai.',
        structuredSummary: {
          symptoms: [
            { symptom: 'Fever', status: 'improved' },
            { symptom: 'Cough', status: 'persistent' }
          ]
        },
        confirmedAt: new Date().toISOString()
      }
    ];

    const res = await fetch('http://127.0.0.1:5099/api/ai/doctor-memory-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: 'test_patient_123',
        baselineConsultation: sampleBaseline,
        confirmedUpdates: sampleUpdates,
      }),
    });

    if (res.status !== 200) throw new Error(`Expected status 200, got ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.brief) throw new Error('Expected brief in response');
    console.log('   Doctor Memory Brief QuickSummary:', data.brief.quickSummary);
    console.log('   Improved (patient-reported):', JSON.stringify(data.brief.improvedSymptoms));
    console.log('   Persistent:', JSON.stringify(data.brief.persistentSymptoms));
  });

  console.log(`\n================================`);
  console.log(`Final Test Summary: ${passed} Passed, ${failed} Failed.`);
  console.log(`================================\n`);

  server.close(() => {
    console.log('Test server closed cleanly.');
    process.exit(failed > 0 ? 1 : 0);
  });
});
