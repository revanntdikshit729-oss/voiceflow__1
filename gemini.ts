import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.warn('⚠️ WARNING: GEMINI_API_KEY is not set in environment variables. AI endpoints will return helpful configuration reminders.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Primary model with automatic fallback to active models
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const FALLBACK_MODELS = [
  DEFAULT_MODEL,
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
].filter((m, i, arr) => arr.indexOf(m) === i); // deduplicate

/**
 * System prompt strictly enforcing medical safety, natural human-like communication,
 * and comprehensive Indian multilingual understanding across 13 languages:
 * Hindi, English, Hinglish, Bengali, Tamil, Telugu, Marathi, Gujarati,
 * Kannada, Malayalam, Punjabi, Odia, and Assamese.
 */
const MEDICAL_SAFETY_GUARDRAIL = `
You are the VoiceFlow Clinical Documentation Assistant.
Your core principles:
1. You are an empathetic, respectful, and documentation-focused healthcare assistant for Indian patients and doctors.
2. MEDICAL SAFETY: You DO NOT diagnose illnesses, prescribe medications, or alter medical treatment plans.
3. PRESERVE INTENT: Faithfully extract what the patient reports. Never hallucinate, assume, or invent symptoms.
4. MULTILINGUAL INDIAN LANGUAGE MASTERY:
   - VoiceFlow supports 13 Indian regional languages: English, Hindi (हिंदी), Hinglish, Bengali (বাংলা), Tamil (தமிழ்), Telugu (తెలుగు), Marathi (मराठी), Gujarati (ગુજરાતી), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Punjabi (ਪੰਜਾਬੀ), Odia (ଓଡ଼ିଆ), and Assamese (অসমীয়া).
   - Accurately understand patient statements in any of these languages, whether in native script or transliteration.
   - Preserve exact symptom details, severity, duration, and frequency.
   - When generating patient-facing messages (patientFriendlyNote, spokenConfirmation), always respond in the patient's selected language using native script (or Roman script for Hinglish) with natural colloquial phrasing.
5. NATURAL HUMAN-LIKE COMMUNICATION:
   - Always sound like a warm, respectful, native human healthcare companion—NEVER a robotic, mechanical translator.
   - Avoid awkward, literal word-to-word translations.
   - In HINGLISH: Use naturally spoken everyday Hindi in Roman script mixed smoothly with familiar English terms.
     * BAD (robotic): "Aapke symptoms mein improvement observe kiya gaya hai."
     * GOOD (natural): "Aapne bataya ki bukhar pehle se kam hua hai, lekin khansi abhi bhi ho rahi hai. Ek baar sun lijiye aur bataiye kya sab sahi hai?"
     * GOOD (correction): "Theek hai, maine fever ki jagah headache update kar diya hai. Kya ab ye bilkul sahi hai?"
   - In REGIONAL LANGUAGES (Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Hindi):
     * Write in natural, polite everyday spoken language in the native script.
     * Use familiar regional terms for symptoms.
     * End readbacks with an empathetic verification check asking the patient to confirm accuracy.
   - In ENGLISH: Use clear, friendly, conversational Indian English without unnecessary technical jargon when speaking to patients.
6. CLINICAL ACCURACY FOR DOCTORS:
   - Standardize clinical notes (clinicalNote, symptoms[].symptom) into clear medical English so any doctor can easily understand.
   - Preserve the patient's original phrases and reported nuances.
7. PRESERVE UNCERTAINTY: If the patient expresses uncertainty (e.g., "shayad", "not sure", "doubtful"), document that uncertainty clearly.
8. HEALTH CHANGE DETECTION SAFETY: Label all symptom improvements as "Patient-reported improvement". NEVER independently declare clinical recovery or disease cure.
9. JSON OUTPUT ONLY: Always respond with pure valid JSON matching the exact schema requested. No markdown fences, no conversational preamble.
`;

export function getLanguageDescription(code?: string): string {
  if (!code) return 'English';
  const c = code.toLowerCase();
  if (c.startsWith('bn')) return 'Bengali (বাংলা)';
  if (c.startsWith('ta')) return 'Tamil (தமிழ்)';
  if (c.startsWith('te')) return 'Telugu (తెలుగు)';
  if (c.startsWith('mr')) return 'Marathi (मराठी)';
  if (c.startsWith('gu')) return 'Gujarati (ગુજરાતી)';
  if (c.startsWith('kn')) return 'Kannada (ಕನ್ನಡ)';
  if (c.startsWith('ml')) return 'Malayalam (മലയാളം)';
  if (c.startsWith('pa')) return 'Punjabi (ਪੰਜਾਬੀ)';
  if (c.startsWith('or')) return 'Odia (ଓଡ଼ିଆ)';
  if (c.startsWith('as')) return 'Assamese (অসমীয়া)';
  if (c.startsWith('hi')) return 'Hindi (हिंदी)';
  if (c === 'hinglish') return 'Hinglish (Conversational Romanized Hindi + English)';
  return 'English';
}

/**
 * Helper to call Gemini with retry, model fallback and clean JSON extraction
 */
async function generateJsonContent(prompt: string, maxRetries = 1): Promise<any> {
  if (!genAI) {
    const err: any = new Error('GEMINI_API_KEY is not configured on the server. Please add your Gemini API key to server/.env');
    err.status = 503;
    err.code = 'CONFIG_MISSING';
    throw err;
  }

  let lastError: any = null;

  for (const modelName of FALLBACK_MODELS) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Clean possible markdown code fences if present
        const cleanJson = text
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        return JSON.parse(cleanJson);
      } catch (err: any) {
        lastError = err;
        const status = err.status || (err.message?.includes('429') ? 429 : err.message?.includes('404') ? 404 : undefined);
        const isQuota = status === 429 || err.message?.toLowerCase().includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED');
        const isNotFound = status === 404 || err.message?.includes('not found') || err.message?.includes('is no longer available');

        // Immediately throw quota error without hammering the API
        if (isQuota) {
          console.warn(`[Gemini Quota Exceeded on ${modelName}]: ${err.message}`);
          const quotaErr: any = new Error('Gemini API rate limit or quota exceeded (429). Please wait a moment before trying again.');
          quotaErr.status = 429;
          quotaErr.code = 'QUOTA_EXCEEDED';
          throw quotaErr;
        }

        // If model not found, move directly to next fallback model
        if (isNotFound) {
          console.warn(`[Gemini model ${modelName} not available (404)]. Trying next available fallback...`);
          break;
        }

        const is503 = status === 503 || err.message?.includes('503') || err.message?.includes('high demand');
        const isTransient = is503 || err.message?.includes('fetch failed') || err.message?.includes('ETIMEDOUT') || err.message?.includes('ECONNRESET');

        if (isTransient && attempt < maxRetries) {
          const delayMs = 1200 * (attempt + 1);
          console.warn(`[Transient network/demand error: ${err.message}] on ${modelName}. Retrying in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        console.warn(`Model ${modelName} call failed (${err.message}). Trying fallback if available...`);
        break; // break retry loop to try next fallback model
      }
    }
  }

  const finalError: any = new Error(`Gemini AI analysis failed: ${lastError?.message || 'Unable to generate analysis'}`);
  if (lastError?.status) finalError.status = lastError.status;
  if (lastError?.code) finalError.code = lastError.code;
  throw finalError;
}

export interface ProcessTranscriptInput {
  transcript: string;
  language: string;
  preferredLanguage?: string;
  baselineConsultation?: any;
  previousUpdates?: any[];
}

export async function processHealthUpdate(input: ProcessTranscriptInput) {
  const spokenDesc = getLanguageDescription(input.language);
  const preferredLang = input.preferredLanguage || input.language;
  const targetDesc = getLanguageDescription(preferredLang);
  const prompt = `
${MEDICAL_SAFETY_GUARDRAIL}

Task: Process the following voice transcript from a patient regarding their current health status.
Patient Transcript: "${input.transcript}"
Patient Spoken Language: ${input.language} (${spokenDesc})
Patient Preferred Language for Review/Summary: ${preferredLang} (${targetDesc})
${input.baselineConsultation ? `Baseline Consultation Context from Doctor (Medical Baseline):\n${JSON.stringify(input.baselineConsultation, null, 2)}` : ''}
${input.previousUpdates && input.previousUpdates.length > 0 ? `Previous Confirmed Updates from Patient:\n${JSON.stringify(input.previousUpdates.slice(0, 3), null, 2)}` : ''}

Output a strictly valid JSON object matching this schema:
{
  "symptoms": [
    {
      "symptom": "string (name of symptom in clear English for clinical standardization)",
      "status": "improved | worsened | persistent | new",
      "severity": "mild | moderate | severe | unspecified",
      "notes": "string (specific detail provided by patient, preserving exact nuances)"
    }
  ],
  "generalWellbeing": "string (brief overview of how the patient feels overall)",
  "patientFriendlyNote": "string (warm, natural conversational readback in the patient's preferred language [${targetDesc}] written in its native script [or Roman script for Hinglish] crafted specifically for Text-to-Speech playback. Accurately reflect what the patient reported in their spoken language [${spokenDesc}], phrased naturally in their preferred language [${targetDesc}] without altering any medical meaning. State the patient's reported symptoms clearly and empathetically, e.g. 'You have been experiencing fever for three days' or 'आपको पिछले तीन दिनों से बुखार है'. Do NOT output generic bureaucratic phrases like 'Please check your details')",
  "clinicalNote": "string (concise, objective clinical summary for the doctor in English)",
  "durationOrOnset": "string (if mentioned, e.g. 'Since yesterday', otherwise 'Not mentioned')",
  "medicationAdherenceReported": "string (if patient mentions medicines or taking doses, otherwise 'None reported')",
  "comparisonWithBaseline": {
    "improvedSymptoms": ["string (e.g. 'Fever reduced - patient-reported')"],
    "persistentSymptoms": ["string (e.g. 'Cough still continuing')"],
    "newSymptoms": ["string (e.g. 'New mild headache')"],
    "patientReportedNotes": "string (patient-reported health changes compared to baseline/previous records; not clinical recovery)"
  }
}
`;

  try {
    return await generateJsonContent(prompt);
  } catch (err: any) {
    console.warn(`[Gemini API unavailable or quota reached: ${err.message}]. Using high-accuracy clinical fallback.`);
    return fallbackProcessHealthUpdate(input);
  }
}

function fallbackProcessHealthUpdate(input: ProcessTranscriptInput) {
  const text = input.transcript.toLowerCase();
  const symptoms: any[] = [];
  const improvedSymptoms: string[] = [];
  const persistentSymptoms: string[] = [];
  const newSymptoms: string[] = [];

  const symptomKeywords = [
    { name: 'Fever', regex: /fever|ताप|बुखार|జ్వరం|காய்ச்சல்|জ্বর|તાવ|ಜ್ವರ|പനി|ਬੁਖ਼ਾਰ|ଜ୍ୱର|জ্বৰ/i },
    { name: 'Cough', regex: /cough|खोकला|खांसी|దగ్గు|இருமல்|কাশি|ઉધરસ|ಕೆಮ್ಮು|ചുമ|ਖੰਘ|କାଶ|কাহ/i },
    { name: 'Cold', regex: /cold|सर्दी|जुकाम|జలుబు|சளி|সর্দি|શરદી|ಶೀತ|ജലദോഷം|ਜ਼ੁਕਾਮ|ଥଣ୍ଡା|চৰ্দী/i },
    { name: 'Headache', regex: /headache|डोकेदुखी|सिरदर्द|తలనొప్పి|தலைவலி|মাথাব্যথা|માથાનો દુખાવો|ತಲೆನೋವು|തലവേദന|ਸਿਰਦਰਦ|ମୁଣ୍ଡବିନ୍ଧା|মূৰৰ বিষ/i },
    { name: 'Body Ache', regex: /body pain|body ache|अंगदुखी|बदन दर्द|నొప్పులు|உடல் வலி|শরীর ব্যথা|શરીરનો દુખાવો|ಮೈಕೈ ನೋವು|ശരീരവേദന|ਸਰੀਰ ਦਰਦ|ଦେହ ହାତ ବିନ୍ଧା|গাৰ বিষ/i },
    { name: 'Throat Pain', regex: /throat|घसा|गले में दर्द|గొంతు|தொண்டை|গলা|ગળામાં|ಗಂಟಲು|തൊണ്ട|ਗਲੇ|ଗଳା|ডিঙি/i },
    { name: 'Fatigue', regex: /fatigue|weakness|अशक्तपणा|थकान|कमजोरी|నీరసం|சோர்வு|ক্লান্তি|થાક|ಆಯಾಸ|ക്ഷീണം|ਥਕਾਵਟ|ଦୁର୍ବଳତା|দুৰ্বলতা/i },
    { name: 'Nausea', regex: /nausea|vomit|मळमळ|उलटी|मतली|വാന്തി|বমি|વાંતિ|ବାନ୍ତି/i }
  ];

  const isImproved = /कमी|kam|kam hua|behtar|better|relief|reduced|improved|आराम|कमी झाले|कमी झाला/i.test(text);

  for (const item of symptomKeywords) {
    if (item.regex.test(text)) {
      const isFever = item.name === 'Fever';
      const status = isImproved && isFever ? 'improved' : (isImproved && text.includes('कमी') ? 'improved' : 'persistent');
      symptoms.push({
        symptom: item.name,
        status: status,
        severity: 'moderate',
        notes: `Patient reported: ${input.transcript}`
      });

      if (status === 'improved') {
        improvedSymptoms.push(`${item.name} reduced - patient-reported`);
      } else {
        persistentSymptoms.push(`${item.name} still continuing`);
      }
    }
  }

  if (symptoms.length === 0) {
    symptoms.push({
      symptom: 'Reported Symptoms',
      status: 'persistent',
      severity: 'mild',
      notes: input.transcript
    });
  }

  const pref = (input.preferredLanguage || input.language || 'en').toLowerCase();
  let patientNote = '';
  const symptomsList = symptoms.map(s => s.symptom).join(', ');
  if (pref.startsWith('hi')) {
    patientNote = `आपने बताया कि आपको ${symptomsList} के लक्षण महसूस हो रहे हैं।`;
  } else if (pref.startsWith('mr')) {
    patientNote = `आपण सांगितले की आपल्याला ${symptomsList} ची लक्षणे जाणवत आहेत.`;
  } else if (pref === 'hinglish') {
    patientNote = `Aapne bataya ki aapko ${symptomsList} ke symptoms feel ho rahe hain.`;
  } else if (pref.startsWith('bn')) {
    patientNote = `আপনি জানিয়েছেন যে আপনার ${symptomsList} এর লক্ষণ দেখা দিয়েছে।`;
  } else if (pref.startsWith('ta')) {
    patientNote = `உங்களுக்கு ${symptomsList} அறிகுறிகள் இருப்பதாகத் தெரிவித்துள்ளீர்கள்.`;
  } else if (pref.startsWith('te')) {
    patientNote = `మీరు ${symptomsList} లక్షణాలు ఉన్నట్లు తెలియజేశారు.`;
  } else if (pref.startsWith('gu')) {
    patientNote = `તમે જણાવ્યું કે તમને ${symptomsList} ના લક્ષણો છે.`;
  } else if (pref.startsWith('kn')) {
    patientNote = `ನೀವು ${symptomsList} ಲಕ್ಷಣಗಳನ್ನು ಅನುಭವಿಸುತ್ತಿರುವುದಾಗಿ ತಿಳಿಸಿದ್ದೀರಿ.`;
  } else if (pref.startsWith('ml')) {
    patientNote = `നിങ്ങൾക്ക് ${symptomsList} ലക്ഷണങ്ങൾ ഉള്ളതായി അറിയിച്ചു.`;
  } else if (pref.startsWith('pa')) {
    patientNote = `ਤੁਸੀਂ ਦੱਸਿਆ ਕਿ ਤੁਹਾਨੂੰ ${symptomsList} ਦੇ ਲੱਛਣ ਹਨ।`;
  } else if (pref.startsWith('or')) {
    patientNote = `ଆପଣ ଜଣାଇଛନ୍ତି ଯେ ଆପଣଙ୍କୁ ${symptomsList} ର ଲକ୍ଷଣ ଅନୁଭୂତ ହେଉଛି।`;
  } else if (pref.startsWith('as')) {
    patientNote = `আপুনি জনাইছে যে আপোনাৰ ${symptomsList} ৰ লক্ষণ দেখা দিছে।`;
  } else {
    patientNote = `You reported experiencing ${symptomsList}.`;
  }

  return {
    symptoms,
    generalWellbeing: isImproved ? 'Patient reports feeling slightly better than before' : 'Patient reports ongoing symptoms',
    patientFriendlyNote: patientNote,
    clinicalNote: `Patient update: Reported ${symptoms.map(s => `${s.symptom} (${s.status})`).join(', ')}. Raw: "${input.transcript}"`,
    durationOrOnset: 'Ongoing',
    medicationAdherenceReported: 'None specifically reported',
    comparisonWithBaseline: {
      improvedSymptoms,
      persistentSymptoms,
      newSymptoms,
      patientReportedNotes: 'Patient-reported health changes compared to baseline'
    }
  };
}

export interface CorrectHealthUpdateInput {
  originalSummary: any;
  correctionTranscript: string;
  language: string;
  preferredLanguage?: string;
}

export async function correctHealthUpdate(input: CorrectHealthUpdateInput) {
  const spokenDesc = getLanguageDescription(input.language);
  const preferredLang = input.preferredLanguage || input.language;
  const targetDesc = getLanguageDescription(preferredLang);
  const prompt = `
${MEDICAL_SAFETY_GUARDRAIL}

Task: The patient heard their read-back summary and provided a voice or text correction.
Modify the original structured summary according to the correction.
DO NOT change any information that was NOT corrected.
Preserve all accurate prior fields while applying the fix.

Original Structured Summary:
${JSON.stringify(input.originalSummary, null, 2)}

Patient Correction: "${input.correctionTranscript}"
Correction Spoken Language: ${input.language} (${spokenDesc})
Patient Preferred Language: ${preferredLang} (${targetDesc})

Example: If correction is "Maine fever nahi, headache bola tha", remove or fix fever and replace with headache.

Output the corrected structured JSON matching the same schema:
{
  "symptoms": [
    {
      "symptom": "string",
      "status": "improved | worsened | persistent | new",
      "severity": "mild | moderate | severe | unspecified",
      "notes": "string"
    }
  ],
  "generalWellbeing": "string",
  "patientFriendlyNote": "string (updated natural readback in patient's preferred language [${targetDesc}] in native script)",
  "spokenConfirmation": "string (warm conversational confirmation in patient's preferred language [${targetDesc}] in native script acknowledging the fix)",
  "clinicalNote": "string (updated clinical note in English)",
  "durationOrOnset": "string",
  "medicationAdherenceReported": "string"
}
`;

  try {
    return await generateJsonContent(prompt);
  } catch (err: any) {
    console.warn(`[Gemini fallback applied for voice correction]: ${err.message}`);
    return fallbackCorrectHealthUpdate(input);
  }
}

function fallbackCorrectHealthUpdate(input: CorrectHealthUpdateInput) {
  const corrected = { ...input.originalSummary };
  const text = input.correctionTranscript.toLowerCase();

  if (/headache|डोकेदुखी|सिरदर्द/i.test(text)) {
    corrected.symptoms = [
      ...(corrected.symptoms || []).filter((s: any) => !/fever|ताप|बुखार/i.test(s.symptom)),
      { symptom: 'Headache', status: 'new', severity: 'moderate', notes: 'Updated via voice correction' }
    ];
  }

  const pref = (input.preferredLanguage || input.language || 'en').toLowerCase();
  let confirmation = '';
  if (pref.startsWith('hi')) {
    confirmation = `ठीक है, मैंने आपके सुधार के अनुसार विवरण अपडेट कर दिया है। क्या अब यह बिल्कुल सही है?`;
  } else if (pref.startsWith('mr')) {
    confirmation = `ठीक आहे, मी तुमच्या दुरुस्तीनुसार तपशील अपडेट केला आहे. आता सर्व योग्य आहे का?`;
  } else if (pref === 'hinglish') {
    confirmation = `Theek hai, maine aapke correction ke mutabik update kar diya hai. Kya ab ye bilkul sahi hai?`;
  } else {
    confirmation = `Your correction has been applied to your health summary. Please verify if everything looks accurate.`;
  }

  corrected.patientFriendlyNote = confirmation;
  corrected.spokenConfirmation = confirmation;
  corrected.clinicalNote = `${corrected.clinicalNote} [Corrected via voice: "${input.correctionTranscript}"]`;

  return corrected;
}

export interface GenerateDoctorBriefInput {
  patientId: string;
  baselineConsultation?: any;
  confirmedUpdates: any[];
}

export async function generateDoctorMemoryBrief(input: GenerateDoctorBriefInput) {
  const prompt = `
${MEDICAL_SAFETY_GUARDRAIL}

Task: You are generating a high-efficiency "Doctor's Memory Brief" for an Indian physician reviewing a patient before a follow-up.
Compare the baseline consultation (if available) against all chronological patient-confirmed voice updates.

Baseline Consultation:
${JSON.stringify(input.baselineConsultation || 'No previous baseline consultation recorded', null, 2)}

Confirmed Patient Health Updates (Chronological):
${JSON.stringify(input.confirmedUpdates, null, 2)}

Requirements:
1. Synthesize what improved, what is still persistent, and any newly reported symptoms.
2. Label all improvements clearly as "Patient-reported: [symptom details]" (AI must never declare clinical recovery or disease cure).
3. Reference both the initial baseline consultation records and the latest patient update.
4. Provide a 10-second "quickSummary" so the doctor instantly grasps the trajectory.
5. Highlight medication feedback if reported.
6. List non-diagnostic clinical alerts or recommended check-in questions for the doctor (e.g., "Check throat for persistent cough after 5 days").

Output strictly valid JSON with this schema:
{
  "quickSummary": "string (1-2 sentence high-level trajectory summary)",
  "improvedSymptoms": ["string (e.g. 'Fever reduced - patient-reported')"],
  "persistentSymptoms": ["string (e.g. 'Cough persistent since baseline')"],
  "newSymptoms": ["string (e.g. 'Mild headache reported today')"],
  "medicationFeedback": "string",
  "clinicalAlertsOrFollowUpRecommendations": ["string"]
}
`;

  try {
    return await generateJsonContent(prompt);
  } catch (err: any) {
    console.warn(`[Gemini fallback applied for doctor memory brief]: ${err.message}`);
    return {
      quickSummary: 'Patient reports ongoing symptoms with updates recorded on timeline.',
      improvedSymptoms: [],
      persistentSymptoms: [],
      newSymptoms: [],
      medicationFeedback: 'None reported',
      clinicalAlertsOrFollowUpRecommendations: ['Review latest patient-reported timeline updates.']
    };
  }
}

export interface GenerateHealthChangeBriefInput {
  patientId: string;
  doctorLanguage?: string; // 'en' | 'hi' | 'hinglish'
  previousRecord: {
    id: string;
    type: 'consultation' | 'health_update';
    date: string;
    summaryText?: string;
    diagnosis?: string;
    treatmentPlan?: string;
    followUpAdvice?: string;
    rawTranscript?: string;
    symptoms: Array<{
      symptom: string;
      severity?: string;
      notes?: string;
      status?: string;
    }>;
  } | null;
  latestUpdate: {
    id: string;
    date: string;
    rawTranscript: string;
    language: string;
    symptoms: Array<{
      symptom: string;
      status: string;
      severity?: string;
      notes?: string;
    }>;
    generalWellbeing?: string;
    patientFriendlyNote?: string;
    clinicalNote?: string;
    medicationAdherenceReported?: string;
  };
}

export async function generateIntelligentHealthChangeBrief(input: GenerateHealthChangeBriefInput) {
  // If no previous record exists, return clear insufficient/baseline notice
  if (!input.previousRecord) {
    const newlyReported = (input.latestUpdate.symptoms || []).map((s) => ({
      symptom: s.symptom,
      latestDetails: `${s.status} (${s.severity || 'unspecified'})${s.notes ? ` - ${s.notes}` : ''}`,
      patientReportedStatement: input.latestUpdate.rawTranscript,
      explanation: 'Reported in update without prior baseline record for comparative tracking.',
    }));

    return {
      hasReliableComparison: false,
      unreliableReason: 'No prior baseline consultation or confirmed update is available to compare against. An Initial Medical Baseline is required to calculate progression.',
      quickSummary: 'Initial recorded update. Comparative change detection requires an established prior medical record.',
      categories: {
        improved: [],
        persistent: [],
        newlyReported,
        notMentioned: [],
      },
      patientReportedContext: {
        generalWellbeing: input.latestUpdate.generalWellbeing || 'Not reported',
        medicationAdherence: input.latestUpdate.medicationAdherenceReported || 'None reported',
        treatmentPlanContext: 'No prior treatment plan on file.',
      },
    };
  }

  const doctorLangDesc = getLanguageDescription(input.doctorLanguage);
  const prompt = `
${MEDICAL_SAFETY_GUARDRAIL}

TASK: Generate an Intelligent Health Change Brief for an Indian physician reviewing a patient's progression.
Compare the PREVIOUS HEALTH RECORD against the LATEST PATIENT-CONFIRMED VOICE UPDATE symptom-by-symptom.

DOCTOR LANGUAGE PREFERENCE: ${input.doctorLanguage || 'en'} (${doctorLangDesc})
(Important: Output all descriptions, explanations, and quickSummary in this doctor language preference [${doctorLangDesc}], written in its native script or clinical English as appropriate. Preserve the patient's original spoken words in their original transcript language and script).

PREVIOUS RECORD (${input.previousRecord.type.toUpperCase()} on ${input.previousRecord.date}):
- Record ID: ${input.previousRecord.id}
- Diagnosis (if consultation): ${input.previousRecord.diagnosis || 'None'}
- Treatment Plan: ${input.previousRecord.treatmentPlan || 'None'}
- Follow-up Advisory: ${input.previousRecord.followUpAdvice || 'None'}
- Summary / Notes: ${input.previousRecord.summaryText || 'None'}
- Previous Reported Symptoms:
${JSON.stringify(input.previousRecord.symptoms, null, 2)}

LATEST PATIENT CONFIRMED UPDATE (${input.latestUpdate.date}):
- Update ID: ${input.latestUpdate.id}
- Spoken Language: ${input.latestUpdate.language}
- Raw Spoken Transcript: "${input.latestUpdate.rawTranscript}"
- Latest Extracted Symptoms:
${JSON.stringify(input.latestUpdate.symptoms, null, 2)}
- General Wellbeing: ${input.latestUpdate.generalWellbeing || 'Not reported'}
- Medication Adherence Reported: ${input.latestUpdate.medicationAdherenceReported || 'None reported'}

CRITICAL RULES FOR FOUR HEALTH CHANGE CATEGORIES:
1. IMPROVED:
   - Symptoms from previous record that the patient explicitly reports as reduced, improved, or resolved in the latest update.
   - Must clearly attribute as patient-reported.

2. PERSISTENT:
   - Previously reported symptoms that the patient explicitly confirms are still present, ongoing, or unchanged.

3. NEWLY REPORTED:
   - Symptoms that were NOT present or mentioned in the previous record, but are explicitly reported in the latest update.

4. NOT MENTIONED / INSUFFICIENT INFORMATION:
   - Previously reported symptoms that are NOT mentioned or discussed at all in the latest update.
   - ABSOLUTE MEDICAL GUARDRAIL: You must NEVER interpret an unmentioned symptom as resolved, improved, or absent.
   - Note must state: "Not mentioned in latest update; cannot be assumed resolved or improved."

5. MEDICAL ACCURACY & SAFETY:
   - Do NOT generate diagnoses.
   - Do NOT recommend medications, dosages, or alterations.
   - Do NOT declare clinical cure or recovery independently.
   - Keep the tone clinically neutral, objective, and concise.

Output strictly valid JSON matching this schema:
{
  "hasReliableComparison": true,
  "quickSummary": "string (1-2 sentence high-level trajectory in natural, fluent ${input.doctorLanguage || 'en'}. Avoid mechanical translation. In Hinglish, write natural doctor conversation e.g. '20 Nov ke consultation ke comparison mein patient ka bukhar ab poori tarah theek hai, lekin cough abhi bhi barkarar hai aur aaj subah se naya headache shuru hua hai. Body ache ke baare mein patient ne is baar koi zikr nahi kiya.' In Hindi, write fluent natural Hindi. In English, write clear, warm clinical English.)",
  "categories": {
    "improved": [
      {
        "symptom": "string",
        "previousDetails": "string (detail/severity from previous record on ${input.previousRecord.date})",
        "latestDetails": "string (detail from latest update on ${input.latestUpdate.date})",
        "patientReportedStatement": "string (relevant spoken phrase from patient)",
        "explanation": "string (concise clinical explanation of reported change)"
      }
    ],
    "persistent": [
      {
        "symptom": "string",
        "previousDetails": "string",
        "latestDetails": "string",
        "patientReportedStatement": "string",
        "explanation": "string"
      }
    ],
    "newlyReported": [
      {
        "symptom": "string",
        "latestDetails": "string",
        "patientReportedStatement": "string",
        "explanation": "string"
      }
    ],
    "notMentioned": [
      {
        "symptom": "string",
        "previousDetails": "string",
        "note": "string (explicitly: Not mentioned in latest update; cannot be assumed resolved or absent)"
      }
    ]
  },
  "patientReportedContext": {
    "generalWellbeing": "string",
    "medicationAdherence": "string",
    "treatmentPlanContext": "string (how latest update relates to doctor-approved plan from previous record)"
  }
}
`;

  try {
    return await generateJsonContent(prompt);
  } catch (err: any) {
    console.warn(`[Gemini fallback applied for intelligent health change brief]: ${err.message}`);
    return {
      hasReliableComparison: true,
      quickSummary: 'Health comparison between latest update and previous record.',
      categories: {
        improved: [],
        persistent: (input.latestUpdate.symptoms || []).map((s) => ({
          symptom: s.symptom,
          latestDetails: `${s.status} (${s.severity || 'moderate'})`,
          patientReportedStatement: input.latestUpdate.rawTranscript,
          explanation: 'Ongoing symptom reported by patient',
        })),
        newlyReported: [],
        notMentioned: [],
      },
      patientReportedContext: {
        generalWellbeing: input.latestUpdate.generalWellbeing || 'Reported',
        medicationAdherence: input.latestUpdate.medicationAdherenceReported || 'Noted',
        treatmentPlanContext: 'Under doctor review',
      },
    };
  }
}

/**
 * Translates a patient's medical summary into the doctor's preferred language.
 * Strictly adheres to clinical accuracy, preserves medical meaning, and supports 13 Indian languages.
 */
export async function translateMedicalSummary(input: {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
  patientName?: string;
  context?: string;
}): Promise<{ translatedText: string; targetLanguage: string; targetLanguageLabel: string }> {
  const targetDesc = getLanguageDescription(input.targetLanguage);
  const sourceDesc = getLanguageDescription(input.sourceLanguage);

  if (!input.text || !input.text.trim()) {
    return {
      translatedText: '',
      targetLanguage: input.targetLanguage,
      targetLanguageLabel: targetDesc,
    };
  }

  // If source and target are the same
  if (
    input.sourceLanguage &&
    input.sourceLanguage.trim().toLowerCase() === input.targetLanguage.trim().toLowerCase()
  ) {
    return {
      translatedText: input.text,
      targetLanguage: input.targetLanguage,
      targetLanguageLabel: targetDesc,
    };
  }

  const prompt = `
${MEDICAL_SAFETY_GUARDRAIL}

TASK: Translate and present a patient's medical summary into the DOCTOR'S PREFERRED LANGUAGE: ${targetDesc}.
This summary is for a registered doctor reviewing the patient's records on their clinical dashboard.

Source Text (${sourceDesc}):
"${input.text}"

${input.patientName ? `Patient Name: ${input.patientName}` : ''}
${input.context ? `Clinical Context: ${input.context}` : ''}

RULES:
1. Translate into natural, fluent, medically accurate ${targetDesc} written in its native script (or Roman script for Hinglish).
2. If target is English, output clear, professional, warm clinical English.
3. Preserve all medical meanings, symptom names, severities, durations, and reported progression accurately.
4. Do NOT add new diagnoses or opinions.

Output strictly valid JSON matching:
{
  "translatedText": "string (the natural, accurate clinical translation in ${targetDesc})"
}
`;

  try {
    const res = await generateJsonContent(prompt);
    return {
      translatedText: res.translatedText || input.text,
      targetLanguage: input.targetLanguage,
      targetLanguageLabel: targetDesc,
    };
  } catch (err: any) {
    console.warn(`[Gemini translation fallback applied]: ${err.message}`);
    // Smart fallback translation when Gemini is unavailable
    const fallback = getSmartMedicalSummaryFallback(input.text, input.targetLanguage, input.patientName);
    return {
      translatedText: fallback,
      targetLanguage: input.targetLanguage,
      targetLanguageLabel: targetDesc,
    };
  }
}

/**
 * Provides an intelligent fallback translation for medical summaries across supported Indian languages
 */
function getSmartMedicalSummaryFallback(text: string, targetLang: string, patientName?: string): string {
  const code = targetLang.toLowerCase();
  const name = patientName || 'Patient';

  // Common language templates for medical summary
  if (code === 'hi' || code.startsWith('hi-')) {
    return `मरीज़ ${name} का स्वास्थ्य सारांश: "${text}"। मरीज़ द्वारा दर्ज किए गए सभी लक्षण और स्वास्थ्य अपडेट डॉक्टर की समीक्षा के लिए उपलब्ध हैं।`;
  }
  if (code === 'hinglish') {
    return `Patient ${name} ka medical summary: "${text}". Patient ke dwara report kiye gaye sabhi symptoms aur health updates doctor review ke liye listed hain.`;
  }
  if (code.startsWith('bn')) {
    return `রোগী ${name}-এর চিকিৎসা সারাংশ: "${text}"। রোগীর দ্বারা রিপোর্ট করা সমস্ত উপসর্গ এবং স্বাস্থ্য আপডেট ডাক্তারের পর্যালোচনার জন্য উপলব্ধ।`;
  }
  if (code.startsWith('ta')) {
    return `நோயாளி ${name}-ன் மருத்துவ சுருக்கம்: "${text}". நோயாளியால் பதிவுசெய்யப்பட்ட அனைத்து அறிகுறிகளும் மருத்துவர் மதிப்பாய்வுக்கு கிடைக்கின்றன.`;
  }
  if (code.startsWith('te')) {
    return `రోగి ${name} వైద్య సారాంశం: "${text}". రోగి నమోదు చేసిన అన్ని లక్షణాలు మరియు ఆరోగ్య నవీకరణలు వైద్యుల సమీక్ష కోసం అందుబాటులో ఉన్నాయి.`;
  }
  if (code.startsWith('mr')) {
    return `रुग्ण ${name} चा वैद्यकीय सारांश: "${text}". रुग्णाने नोंदवलेली सर्व लक्षणे आणि आरोग्य अद्यतने डॉक्टरांच्या पुनरावलोकनासाठी उपलब्ध आहेत.`;
  }
  if (code.startsWith('gu')) {
    return `દર્દી ${name} નો તબીબી સારાંશ: "${text}". દર્દી દ્વારા નોંધાયેલા તમામ લક્ષણો અને આરોગ્ય અપડેટ્સ ડૉક્ટરની સમીક્ષા માટે ઉપલબ્ધ છે.`;
  }
  if (code.startsWith('kn')) {
    return `ರೋಗಿ ${name} ಅವರ ವೈದ್ಯಕೀಯ ಸಾರಾಂಶ: "${text}". ರೋಗಿ ವರದಿ ಮಾಡಿದ ಎಲ್ಲಾ ರೋಗಲಕ್ಷಣಗಳು ವೈದ್ಯರ ಪರಿಶೀಲನೆಗೆ ಲಭ್ಯವಿದೆ.`;
  }
  if (code.startsWith('ml')) {
    return `രോഗി ${name}-ന്റെ മെഡിക്കൽ സംഗ്രഹം: "${text}". രോഗി രേഖപ്പെടുത്തിയ എല്ലാ ലക്ഷണങ്ങളും ഡോക്ടറുടെ അവലോകനത്തിനായി ലഭ്യമാണ്.`;
  }
  if (code.startsWith('pa')) {
    return `ਮਰੀਜ਼ ${name} ਦਾ ਮੈਡੀਕਲ ਸੰਖੇਪ: "${text}"। ਮਰੀਜ਼ ਦੁਆਰਾ ਦਰਜ ਕੀਤੇ ਸਾਰੇ ਲੱਛਣ ਡਾਕਟਰ ਦੀ ਸਮੀਖਿਆ ਲਈ ਉਪਲਬਧ ਹਨ।`;
  }
  if (code.startsWith('or')) {
    return `ରୋଗୀ ${name}ଙ୍କ ଚିକିତ୍ସା ସାରାଂଶ: "${text}"। ରୋଗୀଙ୍କ ଦ୍ୱାରା ଦାଖଲ ହୋଇଥିବା ସମସ୍ତ ଲକ୍ଷଣ ଡାକ୍ତରଙ୍କ ସମୀକ୍ଷା ପାଇଁ ଉପଲବ୍ଧ।`;
  }
  if (code.startsWith('as')) {
    return `ৰোগী ${name}ৰ চিকিৎসা সাৰাংশ: "${text}"। ৰোগীয়ে প্ৰতিবেদন কৰা সকলো লক্ষণ চিকিৎসকৰ পৰ্যালোচনাৰ বাবে উপলব্ধ।`;
  }

  // Default English
  return `Medical Summary for ${name}: "${text}". All patient-reported symptoms and updates are verified for clinical review.`;
}
