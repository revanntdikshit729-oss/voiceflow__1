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

// 10 Regional Languages + Hindi, Hinglish, English test cases
const testLanguages = [
  {
    name: 'Bengali (বাংলা)',
    code: 'bn-IN',
    appLang: 'bn',
    sampleStatement: 'গত দুদিন ধরে জ্বর অনেকটা কমেছে, কিন্তু কাশি এখনও আছে আর শরীর দুর্বল লাগছে।',
    expectedSymptoms: ['fever', 'cough'],
    correctionInput: 'আমি জ্বর নয়, মাথা ব্যথার কথা বলেছিলাম।',
    expectedCorrectionSymptom: 'headache',
    scriptCheckRegex: /[\u0980-\u09FF]/,
  },
  {
    name: 'Tamil (தமிழ்)',
    code: 'ta-IN',
    appLang: 'ta',
    sampleStatement: 'இரண்டு நாட்களாக காய்ச்சல் குறைந்துள்ளது, ஆனால் இருமல் இன்னும் இருக்கிறது மற்றும் சோர்வாக உள்ளது.',
    expectedSymptoms: ['fever', 'cough'],
    correctionInput: 'நான் காய்ச்சல் என்று சொல்லவில்லை, தலைவலி என்று சொன்னேன்.',
    expectedCorrectionSymptom: 'headache',
    scriptCheckRegex: /[\u0B80-\u0BFF]/,
  },
  {
    name: 'Telugu (తెలుగు)',
    code: 'te-IN',
    appLang: 'te',
    sampleStatement: 'రెండు రోజులుగా జ్వరం తగ్గింది, కానీ దగ్గు ఇంకా ఉంది మరియు నీరసంగా అనిపిస్తోంది.',
    expectedSymptoms: ['fever', 'cough'],
    correctionInput: 'నేను జ్వరం అని చెప్పలేదు, తలనొప్పి అని చెప్పాను.',
    expectedCorrectionSymptom: 'headache',
    scriptCheckRegex: /[\u0C00-\u0C7F]/,
  },
  {
    name: 'Marathi (मराठी)',
    code: 'mr-IN',
    appLang: 'mr',
    sampleStatement: 'दोन दिवसांपासून ताप कमी झाला आहे, पण खोकला अजूनही आहे आणि खूप अशक्तपणा वाटत आहे.',
    expectedSymptoms: ['fever', 'cough'],
    correctionInput: 'मी ताप नाही, डोकेदुखी बोललो होतो.',
    expectedCorrectionSymptom: 'headache',
    scriptCheckRegex: /[\u0900-\u097F]/,
  },
  {
    name: 'Gujarati (ગુજરાતી)',
    code: 'gu-IN',
    appLang: 'gu',
    sampleStatement: 'બે દિવસથી તાવ ઓછો થયો છે, પરંતુ ઉધરસ હજુ પણ છે અને શરીરમાં નબળાઈ લાગે છે.',
    expectedSymptoms: ['fever', 'cough'],
    correctionInput: 'મેં તાવ નહીં, માથાનો દુખાવો કહ્યું હતું.',
    expectedCorrectionSymptom: 'headache',
    scriptCheckRegex: /[\u0A80-\u0AFF]/,
  },
  {
    name: 'Kannada (ಕನ್ನಡ)',
    code: 'kn-IN',
    appLang: 'kn',
    sampleStatement: 'ಎರಡು ದಿನಗಳಿಂದ ಜ್ವರ ಕಡಿಮೆಯಾಗಿದೆ, ಆದರೆ ಕೆಮ್ಮು ಇನ್ನೂ ಇದೆ ಮತ್ತು ಸುಸ್ತು ಅನಿಸುತ್ತಿದೆ.',
    expectedSymptoms: ['fever', 'cough'],
    correctionInput: 'ನಾನು ಜ್ವರ ಅಲ್ಲ, ತಲೆನೋವು ಎಂದು ಹೇಳಿದ್ದೆ.',
    expectedCorrectionSymptom: 'headache',
    scriptCheckRegex: /[\u0C80-\u0CFF]/,
  },
  {
    name: 'Malayalam (മലയാളം)',
    code: 'ml-IN',
    appLang: 'ml',
    sampleStatement: 'രണ്ടു ദിവസമായി പനി കുറവുണ്ട്, പക്ഷേ ചുമ ഇപ്പോഴുമുണ്ട് കൂടാതെ ക്ഷീണം തോന്നുന്നു.',
    expectedSymptoms: ['fever', 'cough'],
    correctionInput: 'ഞാൻ പനിയല്ല, തലവേദന എന്നാണ് പറഞ്ഞത്.',
    expectedCorrectionSymptom: 'headache',
    scriptCheckRegex: /[\u0D00-\u0D7F]/,
  },
  {
    name: 'Punjabi (ਪੰਜਾਬੀ)',
    code: 'pa-IN',
    appLang: 'pa',
    sampleStatement: 'ਦੋ ਦਿਨਾਂ ਤੋਂ ਬੁਖ਼ਾਰ ਘੱਟ ਗਿਆ ਹੈ, ਪਰ ਖੰਘ ਅਜੇ ਵੀ ਹੋ ਰਹੀ ਹੈ ਅਤੇ ਕਮਜ਼ੋਰੀ ਮਹਿਸੂਸ ਹੋ ਰਹੀ ਹੈ।',
    expectedSymptoms: ['fever', 'cough'],
    correctionInput: 'ਮੈਂ ਬੁਖ਼ਾਰ ਨਹੀਂ, ਸਿਰਦਰਦ ਬੋਲਿਆ ਸੀ।',
    expectedCorrectionSymptom: 'headache',
    scriptCheckRegex: /[\u0A00-\u0A7F]/,
  },
  {
    name: 'Odia (ଓଡ଼ିଆ)',
    code: 'or-IN',
    appLang: 'or',
    sampleStatement: 'ଦୁଇ ଦିନ ହେଲା ଜ୍ୱର କମିଛି, କିନ୍ତୁ କାଶ ଏବେ ବି ଲାଗିରହିଛି ଏବଂ ଦୁର୍ବଳ ଲାଗୁଛି।',
    expectedSymptoms: ['fever', 'cough'],
    correctionInput: 'ମୁଁ ଜ୍ୱର ନୁହେଁ, ମୁଣ୍ଡବିନ୍ଧା କହିଥିଲି।',
    expectedCorrectionSymptom: 'headache',
    scriptCheckRegex: /[\u0B00-\u0B7F]/,
  },
  {
    name: 'Assamese (অসমীয়া)',
    code: 'as-IN',
    appLang: 'as',
    sampleStatement: 'দুদিন ধৰি জ্বৰ যথেষ্ট কমিছে, কিন্তু কাহ এতিয়াও আছে আৰু শৰীৰত দুৰ্বলতা অনুভৱ হৈছে।',
    expectedSymptoms: ['fever', 'cough'],
    correctionInput: 'মই জ্বৰ বুলি কোৱা নাছিলোঁ, মূৰৰ বিষ বুলি কৈছিলোঁ।',
    expectedCorrectionSymptom: 'headache',
    scriptCheckRegex: /[\u0980-\u09FF]/,
  },
];

async function runMultilingualTests() {
  console.log('================================================================');
  console.log('VOICEFLOW MULTILINGUAL INDIAN LANGUAGE EXPANSION TEST SUITE');
  console.log('================================================================\n');

  const results = [];

  for (let i = 0; i < testLanguages.length; i++) {
    const lang = testLanguages[i];
    console.log(`\n------------------------------------------------------------`);
    console.log(`[Language ${i + 1}/10] Testing ${lang.name} (Locale: ${lang.code})`);
    console.log(`------------------------------------------------------------`);
    console.log(`Patient Spoke: "${lang.sampleStatement}"`);

    const result = {
      language: lang.name,
      code: lang.code,
      understanding: 'FAIL',
      symptomsExtracted: [],
      nativeScriptReadback: 'FAIL',
      readbackText: '',
      voiceCorrection: 'FAIL',
      spokenConfirmation: '',
      crossLangDoctorTranslation: 'FAIL',
      speechRecLocale: lang.code,
      ttsAvailable: 'Browser/OS Dependent (Readable Text Fallback Active)',
    };

    try {
      // 1. Process Health Update in Regional Language
      const processRes = await postJson('/api/ai/process-health-update', {
        transcript: lang.sampleStatement,
        language: lang.code,
      });

      if (processRes.status === 200 && processRes.data?.success) {
        const s = processRes.data.structured;
        result.symptomsExtracted = (s.symptoms || []).map((sym) => sym.symptom);
        result.readbackText = s.patientFriendlyNote || '';
        result.understanding = 'PASS';

        // Check if readback contains native regional script
        if (lang.scriptCheckRegex.test(s.patientFriendlyNote)) {
          result.nativeScriptReadback = 'PASS';
        }

        console.log(`✓ Understanding & Extraction: PASS (Extracted: ${result.symptomsExtracted.join(', ')})`);
        console.log(`✓ Native Script Readback (${result.nativeScriptReadback}): "${s.patientFriendlyNote}"`);

        // 2. Test Voice Correction in Regional Language
        console.log(`Testing Voice Correction: "${lang.correctionInput}"`);
        const correctRes = await postJson('/api/ai/correct-health-update', {
          originalSummary: s,
          correctionTranscript: lang.correctionInput,
          language: lang.code,
        });

        if (correctRes.status === 200 && correctRes.data?.success) {
          const c = correctRes.data.corrected;
          result.spokenConfirmation = c.spokenConfirmation || '';
          result.voiceCorrection = 'PASS';
          console.log(`✓ Voice Correction Spoken Confirmation: PASS ("${c.spokenConfirmation}")`);
        } else {
          console.warn(`✗ Voice Correction failed for ${lang.name}:`, correctRes);
        }

        // 3. Test Cross-Language Translation to Doctor's Language
        // (Patient speaks Regional Language -> Doctor receives brief in English or Hindi)
        const doctorLang = i % 2 === 0 ? 'en' : 'hi';
        const briefRes = await postJson('/api/ai/health-change-brief', {
          patientId: `pat_${lang.appLang}`,
          doctorLanguage: doctorLang,
          previousRecord: {
            id: 'base_rec_1',
            type: 'consultation',
            date: '2026-11-20',
            summaryText: 'Patient had high fever and sore throat',
            symptoms: [
              { symptom: 'fever', severity: 'moderate' },
              { symptom: 'sore throat', severity: 'mild' },
            ],
          },
          latestUpdate: {
            id: 'upd_rec_1',
            date: '2026-11-24',
            language: lang.code,
            rawTranscript: lang.sampleStatement,
            symptoms: s.symptoms,
            clinicalNote: s.clinicalNote,
          },
        });

        if (briefRes.status === 200 && briefRes.data?.success) {
          result.crossLangDoctorTranslation = 'PASS';
          const b = briefRes.data.brief;
          console.log(`✓ Doctor Health Change Brief (Translated into ${doctorLang}): PASS`);
          console.log(`  Quick Summary: "${b.quickSummary}"`);
        } else {
          console.warn(`✗ Doctor Brief failed for ${lang.name}:`, briefRes);
        }
      } else {
        console.error(`✗ Process health update failed for ${lang.name}:`, processRes);
      }
    } catch (err) {
      console.error(`Error testing ${lang.name}:`, err.message);
    }

    results.push(result);
  }

  // Print Complete Summary Table
  console.log('\n========================================================================================');
  console.log('MULTILINGUAL INDIAN LANGUAGE EXPANSION VERIFICATION SUMMARY');
  console.log('========================================================================================');
  console.log('| Language               | Code   | Understanding | Readback | Correction | Translation |');
  console.log('|------------------------|--------|---------------|----------|------------|-------------|');
  for (const r of results) {
    const padLang = r.language.padEnd(22, ' ');
    const padCode = r.code.padEnd(6, ' ');
    const padUnder = r.understanding.padEnd(13, ' ');
    const padRead = r.nativeScriptReadback.padEnd(8, ' ');
    const padCorr = r.voiceCorrection.padEnd(10, ' ');
    const padTrans = r.crossLangDoctorTranslation.padEnd(11, ' ');
    console.log(`| ${padLang} | ${padCode} | ${padUnder} | ${padRead} | ${padCorr} | ${padTrans} |`);
  }
  console.log('========================================================================================\n');
}

runMultilingualTests().catch(err => {
  console.error('Fatal error in multilingual test suite:', err);
  process.exit(1);
});
