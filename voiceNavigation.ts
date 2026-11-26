// App-Wide Multilingual Voice Navigation Engine for VoiceFlow
// Supports natural spoken commands across all 13 Indian regional languages
// Standardized Common Intent System with transcript normalization and shared actions

import { speechService } from './speech';
import { AppLanguage, appLanguageToLocale } from '../i18n/translations';
import { UserRole } from '../types';

/**
 * Standard Common Intent Identifiers for VoiceFlow
 * Shared across all 13 supported Indian languages
 */
export type CommonIntent =
  // 1. Language Switching (All 13 Languages)
  | 'SELECT_LANGUAGE_EN'
  | 'SELECT_LANGUAGE_HI'
  | 'SELECT_LANGUAGE_HINGLISH'
  | 'SELECT_LANGUAGE_BN'
  | 'SELECT_LANGUAGE_TA'
  | 'SELECT_LANGUAGE_TE'
  | 'SELECT_LANGUAGE_MR'
  | 'SELECT_LANGUAGE_GU'
  | 'SELECT_LANGUAGE_KN'
  | 'SELECT_LANGUAGE_ML'
  | 'SELECT_LANGUAGE_PA'
  | 'SELECT_LANGUAGE_OR'
  | 'SELECT_LANGUAGE_AS'

  // 2. Auth, Roles & Session
  | 'SELECT_ROLE_DOCTOR'
  | 'SELECT_ROLE_PATIENT'
  | 'OPEN_LOGIN'
  | 'OPEN_REGISTER'
  | 'SUBMIT_AUTH'
  | 'GO_BACK'
  | 'LOGOUT'

  // 3. Navigation & Views
  | 'OPEN_PROFILE'
  | 'OPEN_TIMELINE'
  | 'NAVIGATE_HEALTH_UPDATE'
  | 'CONNECT_DOCTOR'
  | 'FIND_DOCTOR_VOICE'
  | 'CONFIRM_DOCTOR_CONNECT'
  | 'ACCEPT_CONNECTION_REQUEST'
  | 'REJECT_CONNECTION_REQUEST'
  | 'VIEW_DOCTOR_REQUESTS'
  | 'VIEW_PATIENTS'
  | 'BASELINE_CONSULTATION'
  | 'HEALTH_CHANGE_BRIEF'
  | 'COMPARE_RECORDS'
  | 'TOGGLE_THEME'

  // 4. Clinical Health Updates & AI Workflow
  | 'START_RECORDING'
  | 'STOP_RECORDING'
  | 'ANALYZE_UPDATE'
  | 'VIEW_SUMMARY'
  | 'READ_SUMMARY'
  | 'EDIT_BY_VOICE'
  | 'CONFIRM_UPDATE'

  // 5. Dictation & Security
  | 'FILL_FIELD'
  | 'REJECT_SENSITIVE_FIELD'
  | 'UNKNOWN';

export type VoiceIntent = CommonIntent;

export interface VoiceCommandAction {
  intent: CommonIntent;
  type: CommonIntent; // Alias for intent (maintains compatibility)
  language?: AppLanguage;
  role?: UserRole;
  view?: 'welcome' | 'signin' | 'signup' | 'profile';
  tab?: 'voice_update' | 'timeline' | 'doctor_connections' | 'find_doctors' | 'connected_doctors' | 'profile' | 'patients' | 'baseline' | 'brief';
  recordAction?: 'start' | 'stop' | 'confirm' | 'edit';
  doctorAction?: 'connect_patient' | 'save_consultation' | 'review_brief' | 'compare';
  doctorNameQuery?: string;
  field?: string;
  value?: string;
  rawText: string;
  normalizedText: string;
}

/**
 * Normalizes speech recognition transcripts across all Indic scripts and English
 * - Unicode NFKC normalization
 * - Removes zero-width joiners, non-joiners, spaces
 * - Strips punctuation marks (Devanagari danda, commas, periods, question marks)
 * - Converts to lower-case and collapses whitespace
 */
export function normalizeTranscript(raw: string): string {
  if (!raw) return '';
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width characters
    .replace(/[।,?!.:;'"“”‘’()[\]{}—\-_/\\`~*]/g, ' ') // replace punctuation with space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Multilingual phrase matchers for each common intent
 * Supports natural sentence variations, not just exact keywords
 */
interface IntentMatcher {
  intent: CommonIntent;
  patterns: (string | RegExp)[];
  payload?: Partial<VoiceCommandAction>;
}

const INTENT_MATCHERS: IntentMatcher[] = [
  // ============================================================
  // 1. LANGUAGE SWITCHING (Matches from any language to target)
  // ============================================================
  {
    intent: 'SELECT_LANGUAGE_EN',
    payload: { language: 'en' },
    patterns: [
      'english', 'angrezi', 'ingreji', 'ingraji',
      'अंग्रेजी', 'अंग्रेज़ी', 'इंग्रजी', 'ইংরেজি', 'ஆங்கிலம்',
      'ఆంగ్లం', 'ఇంగ్లీష్', 'ಇಂಗ್ಲಿಷ್', 'ഇംഗ്ലീഷ്', 'ਅੰਗਰੇਜ਼ੀ',
      'ଇଂରାଜୀ', 'ইংৰাজী', 'angreji',
      /भाषा.*(अंग्रेजी|इंग्रजी|english)/i,
      /(select|change|switch).*english/i,
      /(इंग्रजीत|ஆங்கிலத்தில்|ইংরেজিতে|ఆంగ్లంలో|અંગ્રેજીમાં|ಇಂಗ್ಲಿಷ್‌ಗೆ|ഇംഗ്ലീഷിലേക്ക്|ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ|ଇଂରାଜୀରେ|ইংৰাজীলৈ).*(बदला|மாற்று|পরিবর্তন|మార్చండి|કરો|ಬದಲಾಯಿಸಿ|മാറ്റുക|ਬਦਲੋ|ପରିବର୍ତ୍ତନ|সলনি)/i,
    ],
  },
  {
    intent: 'SELECT_LANGUAGE_HI',
    payload: { language: 'hi' },
    patterns: [
      'hindi', 'हिंदी', 'हिन्दी', 'হিন্দি', 'ஹிந்தி',
      'హిందీ', 'ಹಿಂದಿ', 'ഹിന്ദി', 'ਹਿੰਦੀ', 'ହିନ୍ଦୀ', 'হিন্দী',
      /भाषा.*(हिंदी|हिन्दी|hindi)/i,
      /(select|change|switch).*hindi/i,
      /(हिंदीत|ஹிந்தியில்|হিন্দিতে|హిందీలో|હિન્દીમાં|ಹಿಂದಿಗೆ|ഹിന്ദിയിലേക്ക്|ਹਿੰਦੀ ਵਿੱਚ|ହିନ୍ଦୀରେ|হিন্দীলৈ).*(बदला|மாற்று|পরিবর্তন|మార్చండి|કરો|ಬದಲಾಯಿಸಿ|മാറ്റുക|ਬਦਲੋ|ପରିବର୍ତ୍ତନ|সলনি)/i,
    ],
  },
  {
    intent: 'SELECT_LANGUAGE_HINGLISH',
    payload: { language: 'hinglish' },
    patterns: [
      'hinglish', 'हिंग्लिश', 'হিংলিশ', 'ஹிங்கிலிஷ்', 'హింగ్లిష్',
      'ಹಿಂಗ್ಲಿಷ್', 'ഹിംഗ്ലീഷ്', 'ਹਿੰਗਲਿਸ਼',
      /(select|change|switch).*hinglish/i,
    ],
  },
  {
    intent: 'SELECT_LANGUAGE_BN',
    payload: { language: 'bn' },
    patterns: [
      'bengali', 'bangla', 'বাংলা', 'बंगाली', 'বাঙালি',
      'வங்காளம்', 'బెంగాలీ', 'ಬೆಂಗಾಲಿ', 'ബംഗാളി', 'ਬੰਗਾਲੀ', 'ବଙ୍ଗାଳୀ',
      /(select|change|switch).*(bengali|bangla)/i,
    ],
  },
  {
    intent: 'SELECT_LANGUAGE_TA',
    payload: { language: 'ta' },
    patterns: [
      'tamil', 'தமிழ்', 'तमिल', 'তামিল', 'தமிள்', 'தமிழ் மொழிக்கு மாற்று', 'தமிழ் மொழி',
      'తమిళం', 'ತಮಿಳು', 'തമിഴ്', 'ਤਾਮਿਲ', 'ତାମିଲ',
      /(select|change|switch).*tamil/i,
    ],
  },
  {
    intent: 'SELECT_LANGUAGE_TE',
    payload: { language: 'te' },
    patterns: [
      'telugu', 'తెలుగు', 'तेलुगु', 'তেলেগু', 'தெலுங்கு',
      'ತೆಲುಗು', 'തെലുങ്ക്', 'ਤੇਲਗੂ', 'ତେଲୁଗୁ',
      /(select|change|switch).*telugu/i,
    ],
  },
  {
    intent: 'SELECT_LANGUAGE_MR',
    payload: { language: 'mr' },
    patterns: [
      'marathi', 'मराठी', 'मराठि', 'মারাঠি', 'மராத்தி',
      'మరాఠీ', 'ಮರಾಠಿ', 'മറാഠി', 'ਮਰਾਠੀ', 'ମରାଠୀ',
      /(मराठी|marathi).*(करा|निवडा|बदला|भाषा)/i,
      /(select|change|switch).*marathi/i,
    ],
  },
  {
    intent: 'SELECT_LANGUAGE_GU',
    payload: { language: 'gu' },
    patterns: [
      'gujarati', 'ગુજરાતી', 'गुजराती', 'গুজরাটি', 'குஜராத்தி',
      'గుజరాతీ', 'ಗುಜರಾತಿ', 'ഗുജറാത്തി', 'ਗੁਜਰਾਤੀ', 'ଗୁଜରାଟୀ',
      /(select|change|switch).*gujarati/i,
    ],
  },
  {
    intent: 'SELECT_LANGUAGE_KN',
    payload: { language: 'kn' },
    patterns: [
      'kannada', 'ಕನ್ನಡ', 'कन्नड़', 'কন্নড়', 'கன்னடம்',
      'కన్నడ', 'കന്നഡ', 'ਕੰਨੜ', 'କନ୍ନଡ',
      /(select|change|switch).*kannada/i,
    ],
  },
  {
    intent: 'SELECT_LANGUAGE_ML',
    payload: { language: 'ml' },
    patterns: [
      'malayalam', 'മലയാളം', 'मलयालम', 'মালয়ালম', 'மலையாளம்',
      'మలయాళం', 'ಮಲಯಾಳಂ', 'ਮਲਿਆਲਮ', 'ମଲୟାଲମ',
      /(select|change|switch).*malayalam/i,
    ],
  },
  {
    intent: 'SELECT_LANGUAGE_PA',
    payload: { language: 'pa' },
    patterns: [
      'punjabi', 'ਪੰਜਾਬੀ', 'पंजाबी', 'পাঞ্জাবি', 'பஞ்சாபி',
      'పంజాబీ', 'ಪಂಜಾಬಿ', 'പഞ്ചാബി', 'ପଞ୍ଜାବୀ',
      /(select|change|switch).*punjabi/i,
    ],
  },
  {
    intent: 'SELECT_LANGUAGE_OR',
    payload: { language: 'or' },
    patterns: [
      'odia', 'oriya', 'ଓଡ଼ିଆ', 'उड़िया', 'ওড়িয়া',
      'ஒடியா', 'ఒడియా', 'ಒಡಿಯಾ', 'ഒഡിയ', 'ਓਡੀਆ',
      /(select|change|switch).*(odia|oriya)/i,
    ],
  },
  {
    intent: 'SELECT_LANGUAGE_AS',
    payload: { language: 'as' },
    patterns: [
      'assamese', 'asomiya', 'অসমীয়া', 'असमिया', 'অসমিয়া',
      'அசாமீஸ்', 'అస్సామీ', 'ಅಸ್ಸಾಮಿ', 'അസമീസ്', 'ਅਸਾਮੀ', 'ଅସମୀୟା',
      /(select|change|switch).*(assamese|asomiya)/i,
    ],
  },

  // ============================================================
  // 2. AUTH, ROLES & LOGOUT
  // ============================================================
  {
    intent: 'LOGOUT',
    patterns: [
      'logout', 'log out', 'sign out', 'signout', 'exit application',
      'लॉगआउट', 'लॉग आउट', 'बाहर निकलें', 'साइन आउट', 'baahar niklo',
      'बाहेर पडा', 'लॉगआउट व्हा',
      'লগআউট', 'লগ আউট', 'প্রস্থান করুন',
      'வெளியேறு', 'வெளியேறவும்', 'லாக் அவுட்',
      'లాగౌట్', 'బయటకు రండి', 'నిష్క్రమించు',
      'લૉગઆઉટ', 'બહાર નીકળો',
      'ನಿರ್ಗಮಿಸಿ', 'ಲಾಗೌಟ್', 'ಲಾಗ್‌ಔಟ್ ಮಾಡಿ', 'ಲಾಗ್‌ಔಟ್', 'ಲಾಗೌಟ್ ಮಾಡಿ', 'ಹೊರಬನ್ನಿ',
      'ലോഗൗട്ട്', 'ലോഗ്ഔട്ട് ചെയ്യുക', 'ലോഗ്ഔട്ട്', 'ലോഗൗട്ട് ചെയ്യുക', 'പുറത്തുകടക്കുക',
      'ਲੌਗਆਊਟ', 'ਬਾਹਰ ਨਿਕਲੋ',
      'ଲଗଆଉଟ', 'ବାହାରକୁ ଯାଆନ୍ତୁ',
      'প্ৰস্থান', 'লগআউট কৰক',
      /(log|sign)\s*(out|off)/i,
    ],
  },
  {
    intent: 'SELECT_ROLE_DOCTOR',
    payload: { role: 'doctor', view: 'signin' },
    patterns: [
      'doctor', 'doctor portal', 'doctor login', 'continue as doctor', 'physician', 'doctor account',
      'डॉक्टर', 'डाक्टर', 'चिकित्सक', 'doctor sahab',
      'वैद्य', 'डॉक्टर पोर्टल', 'डॉक्टर लॉगिन', 'वैद्यकीय अधिकारी',
      'চিকিৎসক', 'ডাক্তার', 'ডাক্তার পোর্টাল', 'ডাক্তার লগইন',
      'மருத்துவர்', 'டாக்டர்', 'மருத்துவர் உள்நுழைவு', 'மருத்துவர் போர்ட்டல்',
      'వైద్యుడు', 'డాక్టర్', 'డాక్టర్ పోర్టల్', 'డాక్టర్ లాగిన్',
      'ડૉક્ટર', 'ડોક્ટર', 'ડોક્ટર પસંદ કરો', 'ડૉક્ટર પસંદ કરો', 'તબીબ', 'ડૉક્ટર પોર્ટલ', 'ડૉક્ટર લૉગિન',
      'ವೈದ್ಯರು', 'ಡಾಕ್ಟರ್', 'ವೈದ್ಯರ ಪೋರ್ಟಲ್', 'ಡಾಕ್ಟರ್ ಲಾಗಿನ್',
      'ഡോക്ടർ', 'വൈദ്യൻ', 'ഡോക്ടർ പോർട്ടൽ', 'ഡോക്ടർ ലോഗിൻ',
      'ਡਾਕਟਰ', 'ਵੈਦ', 'ਡਾਕਟਰ ਪੋਰਟਲ', 'ਡਾਕਟਰ ਲੌਗਇਨ',
      'ଡାକ୍ତର', 'ଚିକିତ୍ସକ', 'ଡାକ୍ତର ପୋର୍ଟାଲ', 'ଡାକ୍ତର ଲଗଇନ୍',
      'ডাক্তাৰ', 'চিকিৎসক প\'ৰ্টেল', 'চিকিৎসক লগইন',
    ],
  },
  {
    intent: 'SELECT_ROLE_PATIENT',
    payload: { role: 'patient', view: 'signin' },
    patterns: [
      'patient', 'patient portal', 'patient login', 'continue as patient', 'patient account',
      'मरीज', 'रोगी', 'मरीज पोर्टल', 'मरीज लॉगिन', 'mareez', 'rogi',
      'रुग्ण', 'पेशंट', 'रुग्ण पोर्टल', 'रुग्ण लॉगिन', 'रुग्ण खाते',
      'রোগী', 'পেশেন্ট', 'রোগীর পোর্টাল', 'রোগী লগইন',
      'நோயாளி', 'பேயிண்ட்', 'நோயாளி உள்நுழைவு', 'நோயாளி போர்ட்டல்',
      'రోగి', 'పేషెంట్', 'రోగి పోర్టల్', 'రోగి లాగిన్',
      'દર્દી', 'પેશન્ટ', 'દર્દી પોર્ટલ', 'દર્દી લૉગિન',
      'ರೋಗಿ', 'ಪೇಷೆಂಟ್', 'ರೋಗಿಯ ಪೋರ್ಟಲ್', 'ರೋಗಿ ಲಾಗಿನ್',
      'രോഗി', 'പേഷ്യന്റ്', 'രോഗി പോർട്ടൽ', 'രോഗി ലോഗിൻ',
      'ਮਰੀਜ਼', 'ਰੋਗੀ', 'ਮਰੀਜ਼ ਪੋਰਟਲ', 'ਮਰੀਜ਼ ਲੌਗਇਨ',
      'ରୋଗୀ', 'ପେସେଣ୍ଟ', 'ରୋଗୀ ପୋର୍ଟାଲ', 'ରୋଗୀ ଲଗଇନ୍',
      'ৰোগী', 'পেশ্বেন্ট', 'ৰোগী প\'ৰ্টেল', 'ৰোগী লগইন',
      'rugna',
    ],
  },
  {
    intent: 'OPEN_LOGIN',
    payload: { view: 'signin' },
    patterns: [
      'login', 'log in', 'sign in', 'signin', 'open login', 'show sign in', 'go to login', 'already have account',
      'लॉगिन', 'लॉग इन', 'साइन इन', 'लॉगिन खोलो', 'लॉगिन करें',
      'लॉगिन करा', 'लॉगिन उघडा', 'साइन इन करा',
      'লগইন', 'লগইন করুন', 'লগইন খুলুন', 'সাইন ইন',
      'உள்நுழை', 'உள்நுழையவும்', 'சைன் இன்',
      'లాగిన్', 'లాగిన్ చేయండి', 'సైన్ ఇన్',
      'લૉગિન', 'લૉગિન કરો', 'સાઇન ઇન',
      'ಲಾಗಿನ್', 'ಲಾಗಿನ್ ಮಾಡಿ', 'ಸೈನ್ ಇನ್',
      'ലോഗിൻ', 'ലോഗിൻ ചെയ്യുക', 'സൈൻ ഇൻ',
      'ਲਾਗਇਨ', 'ਲਾਗਇਨ ਕਰੋ', 'ਸਾਈਨ ਇਨ',
      'ଲଗଇନ', 'ଲଗଇନ୍ କରନ୍ତୁ', 'ସାଇନ୍ ଇନ୍',
      'লগইন কৰক', 'ছাইন ইন',
    ],
  },
  {
    intent: 'OPEN_REGISTER',
    payload: { view: 'signup' },
    patterns: [
      'register', 'registration', 'create account', 'sign up', 'signup', 'new account', 'open registration',
      'पंजीकरण', 'रजिस्टर', 'नया खाता', 'खाता बनाएं', 'साइन अप', 'naya account',
      'नोंदणी', 'नोंदणी करा', 'नवे खाते', 'खाते उघडा', 'रजिस्टर करा',
      'নিবন্ধন', 'নিবন্ধন করুন', 'নতুন অ্যাকাউন্ট', 'অ্যাকাউন্ট তৈরি করুন',
      'பதிவு', 'பதிவு செய்', 'புதிய கணக்கு', 'கணக்கை உருவாக்கவும்',
      'నమోదు', 'ఖాతా సృష్టించండి', 'కొత్త ఖాతా', 'రిజిస్టర్',
      'નોંધણી', 'નોંધણી કરો', 'નવું ખાતું', 'ખાતું બનાવો',
      'ನೋಂದಣಿ', 'ನೋಂದಾಯಿಸಿ', 'ಹೊಸ ಖಾತೆ', 'ಖಾತೆ ತೆರೆಯಿರಿ',
      'രജിസ്ട്രേഷൻ', 'രജിസ്റ്റർ ചെയ്യുക', 'പുതിയ അക്കൗണ്ട്', 'അക്കൗണ്ട് ഉണ്ടാക്കുക',
      'ਰਜਿਸਟਰ', 'ਰਜਿਸਟ੍ਰੇਸ਼ਨ', 'ਨਵਾਂ ਖਾਤਾ', 'ਖਾਤਾ ਬਣਾਓ',
      'ପଞ୍ଜୀକରଣ', 'ପଞ୍ଜୀକରଣ କରନ୍ତୁ', 'ନୂଆ ଖାତା', 'ଖାତା ଖୋଲନ୍ତୁ',
      'পঞ্জীয়ন', 'পঞ্জীয়ন কৰক', 'নতুন একাউণ্ট', 'একাউণ্ট খোলক',
    ],
  },
  {
    intent: 'SUBMIT_AUTH',
    patterns: [
      'submit', 'submit login', 'enter', 'confirm login', 'proceed to login', 'submit credentials',
      'सबमिट करें', 'जमा करें', 'लॉगिन पूरा करें', 'आगे बढ़ें',
      'सबमिट करा', 'लॉगिन पूर्ण करा', 'पुढे जा',
      'জমা দিন', 'দাখিল করুন', 'লগইন নিশ্চিত করুন',
      'சமர்ப்பி', 'சமர்ப்பிக்கவும்', 'முன்னேறவும்',
      'సమర్పించండి', 'సమర్పించు', 'ముందుకు సాగండి',
      'સબમિટ કરો', 'આગળ વધો',
      'ಸಲ್ಲಿಸಿ', 'ಮುಂದೆ ಹೋಗಿ',
      'സമർപ്പിക്കുക', 'തുടരുക',
      'ਜਮ੍ਹਾਂ ਕਰੋ', 'ਸਬਮਿਟ ਕਰੋ', 'ਅੱਗੇ ਵਧੋ',
      'ଦାଖଲ କରନ୍ତୁ', 'ଆଗକୁ ବଢନ୍ତୁ',
      'দাখিল কৰক', 'আগবাঢ়ক',
    ],
  },
  {
    intent: 'GO_BACK',
    payload: { view: 'welcome' },
    patterns: [
      'back', 'go back', 'return', 'previous', 'welcome screen', 'main menu',
      'वापस', 'पीछे', 'वापस जाएं', 'पीछे जाएं', 'peeche', 'wapas',
      'मागे', 'मागे जा', 'परत', 'परत जा', 'मागे या',
      'পেছনে', 'ফিরে যান', 'পেছনে যান', 'পূর্ববর্তী',
      'பின்னே', 'திரும்பு', 'பின்னால் செல்',
      'వెనక్కి', 'వెనుకకు', 'తిరిగి వెళ్ళండి',
      'પાછા', 'પાછા જાઓ', 'પાછળ',
      'ಹಿಂದೆ', 'ಹಿಂದಕ್ಕೆ ಹೋಗಿ', 'ಹಿಂದಿರುಗಿ',
      'പിന്നോട്ട്', 'തിരികെ പോകുക', 'പിന്നിലേക്ക്',
      'ਪਿੱਛੇ', 'ਵਾਪਸ ਜਾਓ', 'ਪਿੱਛੇ ਜਾਓ',
      'ପଛକୁ', 'ଫେରିଯାଆନ୍ତୁ', 'ପଛକୁ ଯାଆନ୍ତୁ',
      'পিছলৈ', 'উভতি যাওক', 'পূৰ্ববৰ্তী',
    ],
  },

  // ============================================================
  // 3. NAVIGATION TABS & PROFILE
  // ============================================================
  {
    intent: 'OPEN_PROFILE',
    payload: { tab: 'profile', view: 'profile' },
    patterns: [
      'profile', 'my profile', 'open profile', 'settings', 'language settings', 'view profile', 'account settings',
      'प्रोफ़ाइल', 'प्रोफाइल', 'मेरी प्रोफाइल', 'सेटिंग्स', 'भाषा सेटिंग',
      'माझी माहिती', 'सेटिंग्ज', 'माझी प्रोफाइल', 'माझे खाते', 'भाषा सेटिंग्ज',
      'প্রোফাইল', 'আমার প্রোফাইল', 'সেটিংস', 'ভাষা সেটিংস',
      'சுயவிவரம்', 'என் சுயவிவரம்', 'அமைப்புகள்', 'மொழி அமைப்புகள்',
      'ప్రొఫైల్', 'నా ప్రొఫైల్', 'సెట్టింగులు', 'భాష సెట్టింగులు',
      'પ્રોફાઇલ', 'મારી પ્રોફાઇલ', 'સેટિંગ્સ', 'ભાષા સેટિંગ્સ',
      'ಪ್ರೊಫೈಲ್', 'ನನ್ನ ಪ್ರೊಫೈಲ್', 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು', 'ಭಾಷಾ ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
      'പ്രൊഫൈൽ', 'എന്റെ പ്രൊഫൈൽ', 'ക്രമീകരണങ്ങൾ', 'ഭാഷാ ക്രമീകരണങ്ങൾ',
      'ਪ੍ਰੋਫਾਈਲ', 'ਮੇਰੀ ਪ੍ਰੋਫਾਈਲ', 'ਸੈਟਿੰਗਾਂ', 'ਭਾਸ਼ਾ ਸੈਟਿੰਗਾਂ',
      'ପ୍ରୋଫାଇଲ', 'ମୋ ପ୍ରୋଫାଇଲ', 'ସେଟିଙ୍ଗସ୍', 'ଭାଷା ସେଟିଙ୍ଗସ୍',
      'প্ৰফাইল', 'মোৰ প্ৰফাইল', 'ছেটিংছ', 'ভাষা ছেটিংছ',
    ],
  },
  {
    intent: 'OPEN_TIMELINE',
    payload: { tab: 'timeline' },
    patterns: [
      'timeline', 'open timeline', 'medical timeline', 'history', 'medical history', 'view timeline', 'past updates',
      'टाइमलाइन', 'इतिहास', 'चिकित्सा इतिहास', 'पिछला रिकॉर्ड', 'मेडिकल टाइमलाइन',
      'मागील नोंदी', 'वैद्यकीय इतिहास', 'मागील रेकॉर्ड', 'जुन्या नोंदी',
      'সময়রেখা', 'চিকিৎসা ইতিহাস', 'পুরোনো রেকর্ড',
      'காலவரிசை', 'மருத்துவ வரலாறு', 'முந்தைய பதிவுகள்',
      'కాలక్రమం', 'వైద్య చరిత్ర', 'టైమ్‌లైన్',
      'સમયરેખા', 'તબીબી ઇતિહાસ', 'જૂના રેકોર્ડ',
      'ಸಮಯರೇಖೆ', 'ವೈದ್ಯಕೀಯ ಇತಿಹಾಸ', 'ಹಳೆಯ ದಾಖಲೆಗಳು',
      'ടൈംലൈൻ', 'ചികിത്സാ ചരിത്രം', 'പഴയ രേഖകൾ',
      'ਟਾਈਮਲਾਈਨ', 'ਮੈਡੀਕਲ ਇਤਿਹਾਸ', 'ਪਿਛਲੇ ਰਿਕਾਰਡ',
      'ସମୟରେଖା', 'ଡାକ୍ତରୀ ଇତିହାସ', 'ପୂର୍ବ ରେକର୍ଡ',
      'সময়ৰেখা', 'চিকিৎসাৰ ইতিহাস', 'পুৰণি ৰেকৰ্ড',
    ],
  },
  {
    intent: 'NAVIGATE_HEALTH_UPDATE',
    payload: { tab: 'voice_update' },
    patterns: [
      'health update', 'record health update', 'new update', 'voice update', 'speak update', 'record update',
      'हेल्थ अपडेट', 'अपडेट दें', 'नया अपडेट', 'स्वास्थ्य अपडेट', 'बोलकर बताएं',
      'आरोग्य अपडेट', 'आरोग्य नोंद', 'नवीन नोंद', 'आरोग्य माहिती',
      'স্বাস্থ্য আপডেট', 'নতুন আপডেট', 'আপডেট দিন', 'স্বাস্থ্য তথ্য',
      'சுகாதார புதுப்பிப்பு', 'புதிய புதுப்பிப்பு',
      'ఆరోగ్య నవీకరణ', 'కొత్త అప్‌డేట్', 'అప్‌డేట్ చేయండి',
      'આરોગ્ય અપડેટ', 'નવી અપડેટ', 'અપડેટ આપો',
      'ಆರೋಗ್ಯ ಅಪ್ಡೇಟ್', 'ಹೊಸ ಅಪ್ಡೇಟ್', 'ಅಪ್ಡೇಟ್ ನೀಡಿ',
      'ആരോഗ്യ അപ്ഡേറ്റ്', 'പുതിയ അപ്ഡേറ്റ്', 'വിവരം നൽകുക',
      'ਸਿਹਤ ਅੱਪਡੇਟ', 'ਨਵਾਂ ਅੱਪਡੇਟ', 'ਅੱਪਡੇਟ ਦਿਓ',
      'ସ୍ୱାସ୍ଥ୍ୟ ଅପଡେଟ୍', 'ନୂଆ ଅପଡେଟ୍', 'ତଥ୍ୟ ଦିଅନ୍ତୁ',
      'স্বাস্থ্যৰ তথ্য', 'নতুন আপডেট', 'আপডেট দিয়ক',
    ],
  },
  {
    intent: 'CONNECT_DOCTOR',
    payload: { tab: 'find_doctors', doctorAction: 'connect_patient' },
    patterns: [
      'connect doctor', 'connect to doctor', 'doctor connection', 'add doctor', 'find doctor', 'find doctors', 'doctor directory', 'my doctors', 'connected doctors', 'connect with doctor',
      'connect patient', 'add patient', 'search patient',
      'डॉक्टर से जुड़ें', 'डॉक्टर जोड़ें', 'डॉक्टर कनेक्शन', 'मेरे डॉक्टर', 'मरीज जोड़ें', 'मरीज खोजें', 'doctor connect karo', 'डॉक्टर डायरेक्टरी', 'डॉक्टर खोजें',
      'डॉक्टर जोडा', 'माझे डॉक्टर', 'वैद्य जोडा', 'रुग्ण जोडा', 'रुग्ण शोधा', 'डॉक्टर शोधा',
      'ডাক্তারের সাথে সংযোগ', 'ডাক্তার যোগ করুন', 'আমার ডাক্তার', 'রোগী যোগ করুন', 'ডাক্তার খুঁজুন',
      'மருத்துவர் இணைப்பு', 'மருத்துவரைச் சேர்', 'என் மருத்துவர்', 'நோயாளி சேர்', 'மருத்துவரைத் தேடுங்கள்',
      'వైద్యుడిని కనెక్ట్ చేయండి', 'డాక్టర్‌ను కలపండి', 'వైద్యుడిని జోడించండి', 'నా డాక్టర్లు', 'రోగిని జోడించండి', 'డాక్టర్‌ను వెతకండి',
      'ડૉક્ટર સાથે જોડાઓ', 'ડૉક્ટર જોડો', 'મારા ડૉક્ટર', 'દર્દી જોડો', 'દર્દી શોધો', 'ડૉક્ટર શોધો',
      'ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ', 'ವೈದ್ಯರನ್ನು ಸೇರಿಸಿ', 'ನನ್ನ ವೈದ್ಯರು', 'ರೋಗಿಯನ್ನು ಸೇರಿಸಿ', 'ವೈದ್ಯರನ್ನು ಹುಡುಕಿ',
      'ഡോക്ടറെ ബന്ധിപ്പിക്കുക', 'ഡോക്ടറെ ചേർക്കുക', 'എന്റെ ഡോക്ടർമാർ', 'രോഗിയെ ചേർക്കുക', 'ഡോക്ടറെ കണ്ടെത്തുക',
      'ਡਾਕਟਰ ਨਾਲ ਜੁੜੋ', 'ਡਾਕਟਰ ਸ਼ਾਮਲ ਕਰੋ', 'ਮੇਰੇ ਡਾਕਟਰ', 'ਮਰੀਜ਼ ਸ਼ਾਮਲ ਕਰੋ', 'ਡਾਕਟਰ ਲੱਭੋ',
      'ଡାକ୍ତରଙ୍କ ସହ ଯୋଡ଼ନ୍ତୁ', 'ମୋ ଡାକ୍ତର', 'ରୋଗୀ ଯୋଡ଼ନ୍ତୁ', 'ଡାକ୍ତର ଖୋଜନ୍ତୁ',
      'চিকিৎসকৰ সৈতে সংযোগ', 'চিকিৎসক সংযোগ', 'চিকিৎসক যোগ কৰক', 'মোৰ চিকিৎসক', 'ৰোগী যোগ কৰক', 'চিকিৎসক বিচাৰক',
    ],
  },
  {
    intent: 'CONFIRM_DOCTOR_CONNECT',
    patterns: [
      'yes connect', 'connect to doctor', 'yes please connect', 'send request', 'confirm connect', 'connect with doctor',
      'हाँ कनेक्ट करो', 'हां भेजो', 'कनेक्ट करो', 'जी हाँ कनेक्ट करो', 'हाँ करो', 'डॉक्टर से जोड़ें',
      'haan connect karo', 'haan connect', 'haan bhejo', 'haan ji connect', 'haan karo', 'ha connect karo',
      'হাঁ সংযোগ করুন', 'সংযোগ করুন', 'হ্যাঁ সংযোগ করুন',
      'ஆம் இணைக்கவும்', 'இணைக்கவும்', 'சரி இணைக்கவும்',
      'అవును కనెక్ట్ చేయండి', 'కనెక్ట్ చేయండి',
      'हो जोडा', 'जोडा', 'होय जोडा',
      'હા જોડાઓ', 'જોડાઓ',
      'ಹೌದು ಸಂಪರ್ಕಿಸಿ', 'ಸಂಪರ್ಕಿಸಿ',
      'അതെ ബന്ധിപ്പിക്കുക', 'ബന്ധിപ്പിക്കുക',
      'ਹਾਂ ਜੁੜੋ', 'ਜੁੜੋ',
      'ହଁ ଯୋଡ଼ନ୍ତୁ', 'ଯୋଡ଼ନ୍ତୁ',
      'হয় সংযোগ কৰক', 'সংযোগ কৰক',
    ],
  },
  {
    intent: 'VIEW_PATIENTS',
    payload: { tab: 'patients' },
    patterns: [
      'my patients', 'view patients', 'patient list', 'view patient list', 'authorized patients', 'show patients',
      'मेरे मरीज', 'मरीजों की सूची', 'मरीज देखें', 'मरीज सूची',
      'माझे रुग्ण', 'रुग्णांची यादी', 'रुग्ण पहा', 'रुग्ण यादी',
      'আমার রোগী', 'রোগীদের তালিকা', 'রোগী দেখুন', 'রোগী তালিকা',
      'என் நோயாளிகள்', 'நோயாளிகள் பட்டியல்', 'நோயாளி பட்டியல்', 'நோயாளிகளைக் காட்டு',
      'నా రోగులు', 'రోగుల జాబితా', 'రోగులను చూడండి',
      'મારા દર્દીઓ', 'દર્દીઓની યાદી', 'દર્દીઓ જુઓ',
      'ನನ್ನ ರೋಗಿಗಳು', 'ರೋಗಿಗಳ ಪಟ್ಟಿ', 'ರೋಗಿಗಳನ್ನು ನೋಡಿ',
      'എന്റെ രോഗികൾ', 'രോഗികളുടെ പട്ടിക', 'രോഗികളെ കാണുക',
      'ਮੇਰੇ ਮਰੀਜ਼', 'ਮਰੀਜ਼ਾਂ ਦੀ ਸੂਚੀ', 'ਮਰੀਜ਼ ਵੇਖੋ',
      'ମୋ ରୋଗୀ', 'ରୋଗୀ ତାଲିକା', 'ରୋଗୀଙ୍କୁ ଦେଖନ୍ତୁ',
      'মোৰ ৰোগী', 'ৰোগীৰ তালিকা', 'ৰোগী চাওক',
    ],
  },
  {
    intent: 'ACCEPT_CONNECTION_REQUEST',
    payload: { tab: 'patients' },
    patterns: [
      'accept request', 'approve request', 'accept connection', 'approve connection', 'accept patient', 'approve patient', 'accept', 'approve',
      'स्वीकार करें', 'अनुरोध स्वीकार करें', 'स्वीकार', 'मंजूर करें', 'जोड़ें', 'कन्फर्म', 'accept karo', 'manzoor karo', 'swikar karo',
      'स्वीकारा', 'मंजूर करा', 'मान्य करा',
      'অনুমোদন করুন', 'গ্রহণ করুন',
      'ஏற்றுக்கொள்', 'அங்கீகரி',
      'ఆమోదించు', 'అంగీకరించు',
      'સ્વીકારો', 'મંજૂર કરો',
      'ಸ್ವೀಕರಿಸಿ', 'ಅನುಮೋದಿಸಿ',
      'സ്വീകരിക്കുക', 'അംഗീകരിക്കുക',
      'ਸਵੀਕਾਰ ਕਰੋ', 'ਮਨਜ਼ੂਰ ਕਰੋ',
      'ସ୍ୱୀକାର କରନ୍ତୁ', 'ଅନୁମୋଦନ କରନ୍ତୁ',
      'গ্ৰহণ কৰক', 'অনুমোদন কৰক',
    ],
  },
  {
    intent: 'REJECT_CONNECTION_REQUEST',
    patterns: [
      'reject request', 'decline request', 'reject connection', 'decline connection', 'reject patient', 'reject', 'decline',
      'अस्वीकार करें', 'अनुरोध अस्वीकार करें', 'अस्वीकार', 'रद्द करें', 'ना मंजूर करें', 'खारिज करें', 'reject karo', 'aswikar karo', 'mana karo',
      'नाकारा', 'फेटाळा', 'रद्द करा',
      'প্রত্যাখ্যান করুন', 'বাতিল করুন',
      'நிராகரி', 'மறு',
      'తిరస్కరించు', 'రద్దు చేయి',
      'અસ્વીકાર કરો', 'નકારો',
      'ತಿರಸ್ಕರಿಸಿ', 'ರದ್ದುಮಾಡಿ',
      'നിരസിക്കുക', 'തള്ളിക്കളയുക',
      'ਰੱਦ ਕਰੋ', 'ਅਸਵੀਕਾਰ ਕਰੋ',
      'ପ୍ରତ୍ୟାଖ୍ୟାନ କରନ୍ତୁ', 'ଖାରଜ କରନ୍ତୁ',
      'প্ৰত্যাখ্যান কৰক', 'বাতিল কৰক',
    ],
  },

  // ============================================================
  // 4. HEALTH RECORDING & CLINICAL AI ACTIONS
  // ============================================================
  {
    intent: 'START_RECORDING',
    payload: { recordAction: 'start', tab: 'voice_update' },
    patterns: [
      'start recording', 'start health recording', 'start voice', 'record now', 'speak now', 'start speaking', 'begin recording',
      'रिकॉर्डिंग शुरू करें', 'रिकॉर्डिंग शुरू करो', 'रिकॉर्डिंग शुरू', 'रिकॉर्ड शुरू', 'बोलना शुरू', 'शुरू करें', 'shuru karo', 'record karo', 'bolna shuru', 'recording start karo',
      'रेकॉर्डिंग सुरू करा', 'सुरू करा', 'रेकॉर्ड सुरू', 'बोलायला सुरुवात करा', 'नोंदणी सुरू', 'suru kara',
      'রেকর্ডিং শুরু করুন', 'রেকর্ড শুরু', 'বলতে শুরু করুন', 'রেকর্ডিং শুরু', 'শুরু করুন',
      'பதிவு தொடங்கு', 'பேசத் தொடங்கு', 'பதிவு செய்', 'தொடங்கு',
      'రికార్డింగ్ ప్రారంభించు', 'రికార్డింగ్ ప్రారంభించండి', 'రికార్డ్ చేయండి', 'మాట్లాడటం ప్రారంభించండి', 'ప్రారంభించండి',
      'રેકોર્ડિંગ શરૂ કરો', 'બોલવાનું શરૂ કરો', 'શરૂ કરો', 'રેકોર્ડ કરો',
      'ರೆಕಾರ್ಡಿಂಗ್ ಪ್ರಾರಂಭಿಸಿ', 'ಮಾತನಾಡಲು ಪ್ರಾರಂಭಿಸಿ', 'ಪ್ರಾರಂಭಿಸಿ', 'ರೆಕಾರ್ಡ್ ಮಾಡಿ',
      'റെക്കോർഡിംഗ് ആരംഭിക്കുക', 'സംസാരിച്ചു തുടങ്ങുക', 'തുടങ്ങുക', 'റെക്കോർഡ് ചെയ്യുക',
      'ਰਿਕਾਰਡਿੰਗ ਸ਼ੁਰੂ ਕਰੋ', 'ਬੋਲਣਾ ਸ਼ੁਰੂ ਕਰੋ', 'ਸ਼ੁਰੂ ਕਰੋ', 'ਰਿਕਾਰਡ ਕਰੋ',
      'ରେକର୍ଡିଂ ଆରମ୍ଭ କରନ୍ତୁ', 'କହିବା ଆରମ୍ଭ କରନ୍ତୁ', 'ଆରମ୍ଭ କରନ୍ତୁ', 'ରେକର୍ଡ କରନ୍ତୁ',
      'ৰেকৰ্ডিং আৰম্ভ কৰক', 'কবলৈ আৰম্ভ কৰক', 'আৰম্ভ কৰক', 'ৰেকৰ্ড কৰক',
      /(start|begin).*(record|voice|speak)/i,
    ],
  },
  {
    intent: 'STOP_RECORDING',
    payload: { recordAction: 'stop' },
    patterns: [
      'stop recording', 'stop recording now', 'stop voice', 'finish recording', 'done speaking', 'stop listening', 'i am done', 'completed',
      'रिकॉर्डिंग बंद करो', 'रिकॉर्डिंग बंद करें', 'रोकें', 'बंद करें', 'समाप्त करें', 'हो गया', 'रुकिए', 'rok do', 'band karo', 'recording band karo',
      'थांबवा', 'रेकॉर्डिंग थांबवा', 'झाले', 'पूर्ण झाले', 'बंद करा', 'thambwa',
      'থামুন', 'রেকর্ডিং বন্ধ করুন', 'শেষ হয়েছে', 'সম্পন্ন',
      'நிறுத்து', 'பதிவை நிறுத்து', 'முடிந்தது', 'நிறுத்தவும்',
      'ఆపండి', 'రికార్డింగ్ ఆపు', 'రికార్డింగ్ ఆపండి', 'పూర్తయింది', 'ముగించు',
      'રોકો', 'રેકોર્ડિંગ બંધ કરો', 'પૂરું થયું', 'થોભો',
      'ನಿಲ್ಲಿಸಿ', 'ರೆಕಾರ್ಡಿಂಗ್ ನಿಲ್ಲಿಸಿ', 'ಮುಗಿಯಿತು', 'ಸಾಕು',
      'നിർത്തുക', 'റെക്കോർഡിംഗ് നിർത്തുക', 'കഴിഞ്ഞു', 'പൂർത്തിയായി',
      'ਰੋਕੋ', 'ਰਿਕਾਰਡਿੰਗ ਰੋਕੋ', 'ਖ਼ਤਮ ਹੋ ਗਿਆ', 'ਬੰਦ ਕਰੋ',
      'ବନ୍ଦ କରନ୍ତୁ', 'ରେକର୍ଡିଂ ବନ୍ଦ କରନ୍ତୁ', 'ସରିଗଲା', 'ରୁହନ୍ତୁ',
      'বন্ধ কৰক', 'ৰেকৰ্ডিং বন্ধ কৰক', 'হৈ গ\'ল', 'সমাপ্ত',
      /(stop|finish|end).*(record|voice|speak)/i,
    ],
  },
  {
    intent: 'CONFIRM_UPDATE',
    payload: { recordAction: 'confirm' },
    patterns: [
      'confirm and save', 'confirm update', 'save update', 'confirm', 'save now', 'looks good', 'submit update',
      'correct', 'it is correct', 'that is correct', 'this is correct', 'yes save it', 'yes, save it', 'yes save', 'yes confirm', 'yes please', 'yes', 'save it', 'all correct', 'everything is correct', 'accurate',
      'पुष्टि करें', 'सेव करें', 'सुरक्षित करें', 'कन्फर्म करें', 'save karo', 'confirm karo',
      'सही है', 'हां सही है', 'हाँ सही है', 'हाँ', 'हां', 'पुष्टि', 'सेव कर दो', 'सब सही है', 'बिल्कुल सही', 'बिलकुल सही है', 'हां सेव करें', 'सही', 'हाँ सेव कर दो', 'पुष्टि करो',
      'खात्री करा', 'जतन करा', 'नोंद जतन करा', 'पुष्टी करा', 'कन्फर्म करा', 'सेव्ह करा', 'khatri kara',
      'बरोबर आहे', 'हो बरोबर आहे', 'हो', 'योग्य आहे', 'हो जतन करा', 'बरोबर',
      'নিশ্চিত করুন', 'সংরক্ষণ করুন', 'সেভ করুন', 'ঠিক আছে', 'সঠিক', 'হ্যাঁ', 'হ্যাঁ সঠিক', 'হ্যাঁ সংরক্ষণ করুন', 'সব ঠিক আছে',
      'உறுதிப்படுத்து', 'சேமி', 'சேமிக்கவும்', 'சரி', 'ஆம்', 'ஆம் சேமி', 'ஆம் உறுதிப்படுத்து', 'சரியானது', 'உறுதி',
      'ధృవీకరించు', 'సేవ్ చేయండి', 'భద్రపరచు', 'సరైనది', 'అవును', 'అవును సేవ్ చేయండి', 'సరిగ్గా ఉంది', 'అవును ధృవీకరించు',
      'ખાતરી કરો', 'સાચવો', 'સેવ કરો', 'બરાબર છે', 'હા', 'હા સાચવો', 'સાચું છે', 'બરાબર',
      'ಖಚಿತಪಡಿಸಿ', 'ಉಳಿಸಿ', 'ಸೇವ್ ಮಾಡಿ', 'ಸರಿಯಾಗಿದೆ', 'ಹೌದು', 'ಹೌದು ಉಳಿಸಿ', 'ಸರಿ', 'ಖಚಿತ',
      'ഉറപ്പാക്കുക', 'സംരക്ഷിക്കുക', 'സേവ് ചെയ്യുക', 'ശരിയാണ്', 'അതെ', 'അതെ സംരക്ഷിക്കുക', 'ശരി', 'ഉറപ്പാണ്',
      'ਪੁਸ਼ਟੀ ਕਰੋ', 'ਸੰਭਾਲੋ', 'ਸੇਵ ਕਰੋ', 'ਠੀਕ ਹੈ', 'ਸਹੀ ਹੈ', 'ਹਾਂ', 'ਹਾਂ ਸੰਭਾਲੋ', 'ਬਿਲਕੁਲ ਸਹੀ', 'ਸਹੀ',
      'ନିଶ୍ଚିତ କରନ୍ତୁ', 'ସାଇତି ରଖନ୍ତୁ', 'ସେଭ୍ କରନ୍ତୁ', 'ଠିକ୍ ଅଛି', 'ଠିକ୍', 'ହଁ', 'ହଁ ସାଇତି ରଖନ୍ତୁ', 'ନିଶ୍ଚିତ',
      'নিশ্চিত কৰক', 'সংৰক্ষণ কৰক', 'ছেভ কৰক', 'ঠিক আছে', 'শুদ্ধ', 'হয়', 'হয় সংৰক্ষণ কৰক', 'শুদ্ধ হয়',
      'sahi hai', 'haan sahi hai', 'yes sahi hai', 'haan', 'save kar do', 'bilkul sahi hai', 'sab sahi hai', 'correct hai', 'confirm hai',
    ],
  },
  {
    intent: 'EDIT_BY_VOICE',
    payload: { recordAction: 'edit' },
    patterns: [
      'edit by voice', 'edit update', 'correct update', 'correction', 'change update', 'modify', 'make correction',
      'edit', 'no', 'that is incorrect', 'thats incorrect', "that's incorrect", 'incorrect', 'wrong', 'not correct', 'change', 'change it', 'make changes', 'edit summary',
      'सुधार करें', 'बदलें', 'सही करें', 'करेक्शन करें', 'edit karo',
      'नहीं', 'गलत है', 'यह गलत है', 'गलत', 'बदलाव', 'बदलो', 'सुधार', 'सुधारना है', 'बदलाव बताएं', 'बदलाव बता सकते हैं', 'एडिट',
      'बदल करा', 'सुधारणा करा', 'दुरुस्ती करा', 'दुरुस्त करा', 'एडिट करा',
      'नाही', 'चूक आहे', 'बदल', 'सुधारणा', 'बदला',
      'সংশোধন করুন', 'পরিবর্তন করুন', 'সঠিক করুন', 'না', 'ভুল', 'সংশোধন', 'পরিবর্তন',
      'திருத்தம் செய்', 'மாற்று', 'மாற்றவும்', 'இல்லை', 'தவறு', 'மாற்று', 'திருத்தம்',
      'సవరించండి', 'మార్చండి', 'సరిదిద్దండి', 'కాదు', 'తప్పు', 'మార్చండి', 'సవరణ',
      'સુધારો કરો', 'બદલો', 'ફેરફાર કરો', 'ના', 'ખોટું છે', 'સુધારો', 'ફેરફાર',
      'ತಿದ್ದುಪಡಿ ಮಾಡಿ', 'ಬದಲಾಯಿಸಿ', 'ಸರಿಪಡಿಸಿ', 'ಇಲ್ಲ', 'ತಪ್ಪು', 'ತಿದ್ದುಪಡಿ',
      'തിരുത്തുക', 'മാറ്റുക', 'മാറ്റം വരുത്തുക', 'അല്ല', 'തെറ്റാണ്',
      'ਸੋਧ ਕਰੋ', 'ਬਦਲੋ', 'ਠੀਕ ਕਰੋ', 'ਨਹੀਂ', 'ਗ਼ਲਤ ਹੈ', 'ਸੋਧ',
      'ସଂଶୋଧନ କରନ୍ତୁ', 'ବଦଳାନ୍ତୁ', 'ଠିକ୍ କରନ୍ତୁ', 'ନା', 'ଭୁଲ୍', 'ସଂଶୋଧନ',
      'সংশোধন কৰক', 'সলনি কৰক', 'শুদ্ধ কৰক', 'নহয়', 'ভুল', 'সালসলনি',
      'nahi', 'galat hai', 'change karo', 'badlo', 'galat', 'incorrect hai', 'badal do', 'thik nahi hai',
    ],
  },
  {
    intent: 'READ_SUMMARY',
    patterns: [
      'read summary', 'read aloud summary', 'read aloud', 'speak summary', 'read back', 'read notes', 'listen to summary',
      'पढ़कर सुनाएं', 'सुनाएं', 'बोलकर सुनाओ', 'नोट्स सुनाओ', 'notes sunao', 'summary sunao',
      'वाचून दाखवा', 'वाचा', 'ऐकवा', 'सारांश ऐकवा',
      'পড়ে শোনান', 'শোনান', 'উচ্চস্বরে পড়ুন',
      'வாசித்துக் காட்டு', 'படி', 'சத்தமாகப் படி',
      'చదివి వినిపించండి', 'వినిపించు', 'చదవండి',
      'વાંચી સંભળાવો', 'સંભળાવો', 'વાંચો',
      'ಓದಿ ಹೇಳಿ', 'ಓದಿ ಕೇಳಿಸಿ', 'ಕೇಳಿಸಿ',
      'വായിച്ചു കേൾപ്പിക്കുക', 'കേൾപ്പിക്കുക', 'വായിക്കുക',
      'ਪੜ੍ਹ ਕੇ ਸੁਣਾਓ', 'ਸੁਣਾਓ', 'ਉੱਚੀ ਪੜ੍ਹੋ',
      'ପଢ଼ି ଶୁଣାନ୍ତୁ', 'ଶୁଣାନ୍ତୁ', 'ପଢ଼ନ୍ତୁ',
      'পঢ়ি শুনাক', 'শুনাওক', 'পঢ়ক',
    ],
  },
  {
    intent: 'VIEW_SUMMARY',
    patterns: [
      'view summary', 'show summary', 'see summary', 'summary', 'patient summary',
      'सारांश देखें', 'समरी दिखाओ', 'सारांश',
      'सारांश पहा', 'सारांश दाखवा', 'माहितीचा सारांश',
      'সারাংশ দেখুন', 'সারসংক্ষেপ',
      'சுருக்கத்தைக் காட்டு', 'சுருக்கம்',
      'సారాంశం చూడండి', 'సారాంశం',
      'સારાંશ જુઓ', 'સારાંશ',
      'ಸಾರಾಂಶ ನೋಡಿ', 'ಸಾರಾಂಶ',
      'സംഗ്രഹം കാണുക', 'സംഗ്രഹം',
      'ਸਾਰ ਵੇਖੋ', 'ਸੰਖੇਪ ਵੇਖੋ',
      'ସାରାଂଶ ଦେଖନ୍ତୁ', 'ସାରାଂଶ',
      'সাৰাংশ চাওক', 'সাৰাংশ',
    ],
  },
  {
    intent: 'ANALYZE_UPDATE',
    patterns: [
      'analyze update', 'analyze', 'process update', 'check health update', 'run ai analysis',
      'विश्लेषण करें', 'अपडेट जांचें', 'एनालाइज़ करें',
      'विश्लेषण करा', 'तपासणी करा', 'माहिती तपासा',
      'বিশ্লেষণ করুন', 'আপডেট যাচাই করুন',
      'பகுப்பாய்வு செய்', 'ஆய்வு செய்',
      'విశ్లేషించండి', 'నవీకరణను విశ్లేషించు',
      'વિશ્લેષણ કરો', 'તપાસો',
      'ವಿಶ್ಲೇಷಿಸಿ', 'ಪರಿಶೀಲಿಸಿ',
      'വിശകലനം ചെയ്യുക', 'പരിശോധിക്കുക',
      'ਵਿਸ਼ਲੇਸ਼ਣ ਕਰੋ', 'ਜਾਂਚ ਕਰੋ',
      'ବିଶ୍ଳେଷଣ କରନ୍ତୁ', 'ପରୀକ୍ଷା କରନ୍ତୁ',
      'বিশ্লেষণ কৰক', 'পৰীক্ষা কৰক',
    ],
  },

  // ============================================================
  // 5. DOCTOR CLINICAL WORKFLOWS
  // ============================================================
  {
    intent: 'BASELINE_CONSULTATION',
    payload: { tab: 'baseline', doctorAction: 'save_consultation' },
    patterns: [
      'baseline consultation', 'medical baseline', 'initial consultation', 'new consultation', 'consultation',
      'आरंभिक परामर्श', 'बेसलाइन कंसल्टेशन', 'बेसलाइन', 'पहला परामर्श',
      'मूलभूत सल्ला', 'परामर्श', 'आरंभिक सल्ला', 'पहिली तपासणी',
      'প্রাথমিক পরামর্শ', 'বেসলাইন',
      'ஆரம்ப ஆலோசனை', 'அடிப்படை ஆலோசனை',
      'ప్రాథమిక సంప్రదింపులు', 'బేస్‌లైన్ కన్సల్టేషన్',
      'પ્રારંભિક સલાહ', 'પ્રારંભિક પરામર્શ',
      'ಆರಂಭಿಕ ಸಮಾಲೋಚನೆ', 'ಮೂಲ ಸಮಾಲೋಚನೆ',
      'പ്രാഥമിക കൺസൾട്ടേഷൻ',
      'ਮੁੱਢਲੀ ਸਲਾਹ',
      'ପ୍ରାରମ୍ଭିକ ପରାମର୍ଶ', 'ପ୍ରାଥମିକ ପରାମର୍ଶ',
      'প্ৰাৰম্ভিক পৰামৰ্শ',
    ],
  },
  {
    intent: 'HEALTH_CHANGE_BRIEF',
    payload: { tab: 'brief', doctorAction: 'review_brief' },
    patterns: [
      'health change brief', 'health change', 'change brief', 'patient brief', 'brief',
      'स्वास्थ्य परिवर्तन देखें', 'स्वास्थ्य परिवर्तन', 'स्वास्थ्य बदलाव', 'हेल्थ ब्रीफ', 'परिवर्तन विवरण',
      'आरोग्य बदल', 'बदल सारांश', 'आरोग्य बदल सारांश',
      'স্বাস্থ্য পরিবর্তন', 'পরিবর্তন সংক্ষেপ',
      'சுகாதார மாற்றம்', 'மாற்ற விவரம்',
      'ఆరోగ్య మార్పులు', 'మార్పుల నివేదిక',
      'આરોગ્ય ફેરફાર', 'ફેરફાર સારાંશ',
      'ಆರೋಗ್ಯ ಬದಲಾವಣೆ', 'ಬದಲಾವಣೆ ಸಂಕ್ಷಿಪ್ತ',
      'ആരോഗ്യ മാറ്റം', 'മാറ്റ വിവരണം',
      'ਸਿਹਤ ਤਬਦੀਲੀ', 'ਤਬਦੀਲੀ ਸੰਖੇਪ',
      'ସ୍ୱାସ୍ଥ୍ୟ ପରିବର୍ତ୍ତନ', 'ପରିବର୍ତ୍ତନ ସଂକ୍ଷେପ',
      'স্বাস্থ্য পৰিৱৰ্তন', 'পৰিৱৰ্তন চমুটোকা',
    ],
  },
  {
    intent: 'COMPARE_RECORDS',
    payload: { doctorAction: 'compare' },
    patterns: [
      'compare records side by side', 'compare records', 'side by side', 'comparison', 'compare',
      'तुलना देखें', 'तुलना',
      'तुलना करा',
      'তুলনা দেখুন',
      'ஒப்பீடு செய்', 'ஒப்பீடு',
      'పోల్చి చూడండి',
      'સરખામણી કરો',
      'ಹೋಲಿಸಿ ನೋಡಿ',
      'താരതമ്യം ചെയ്യുക',
      'ਤੁਲਨਾ ਕਰੋ',
      'ତୁଳନା କରନ୍ତୁ',
      'তুলনা কৰক',
    ],
  },

  // ============================================================
  // 6. THEME TOGGLE
  // ============================================================
  {
    intent: 'TOGGLE_THEME',
    patterns: [
      'toggle theme', 'dark mode', 'light mode', 'theme', 'night mode',
      'डार्क मोड', 'लाइट मोड', 'थीम बदला',
      'ডার্ক মোড', 'டார்க் மோட்', 'డార్క్ మోడ్', 'ડાર્ક મોડ',
      'ಡಾರ್ಕ್ ಮೋಡ್', 'ഡാർക്ക് മോഡ്', 'ਡਾਰਕ ਮੋਡ', 'ଡାର୍କ ମୋଡ୍', 'ডাৰ্ক মোড',
    ],
  },
];

/**
 * Extracts doctor name from multilingual spoken search or connect queries.
 * Handles English and 13 Indian languages with prefixes and suffixes.
 */
export function extractDoctorSpokenQuery(text: string): string | null {
  if (!text) return null;
  const raw = text.trim();

  // Pattern 1: Connect me to Doctor [Name], Find Doctor [Name], Search Doctor [Name]
  const docPrefixRegex = /^(?:connect(?:\s+me)?(?:\s+to|\s+with)?|find|search|look(?:\s+for)?)\s+(?:doctor|dr\.?)\s+(.+)$/i;
  const m1 = raw.match(docPrefixRegex);
  if (m1 && m1[1]) {
    const clean = m1[1].replace(/[।,?!.:;'"“”‘’]/g, '').trim();
    if (clean.length > 1 && !['directory', 'list', 'connections', 'connection'].includes(clean.toLowerCase())) {
      return clean;
    }
  }

  // Suffix patterns (Hindi, Hinglish, Bengali, Marathi, etc.)
  const suffixClean = /(?:\s+se\s+connect\s+karo|\s+ko\s+connect\s+karo|\s+se\s+connect\s+kar\s+do|\s+connect\s+karo|\s+se\s+jodo|\s+ko\s+dhundo|\s+dhundo|\s+khojo|\s+khojiye|\s+se\s+baat\s+karo|\s+से\s+जुड़ें|\s+से\s+जुड़ें|\s+को\s+खोजें|\s+को\s+ढूंढें|\s+को\s+ढूँढें|\s+से\s+जोड़ें|\s+से\s+कनेक्ट\s+करो|\s+यांच्याशी\s+जोडा|\s+शोधा|\s+जोडा|\s+সাথে\s+সংযোগ\s+করুন|\s+খুঁজুন|\s+যোগ\s+করুন|\s+இணைக்கவும்|\s+தேடுங்கள்|\s+తో\s+కనెక్ట్\s+చేయండి|\s+కనుగొనండి|\s+સાથે\s+જોડાઓ|\s+શોધો|\s+ಅವರನ್ನು\s+ಸಂಪರ್ಕಿಸಿ|\s+ಹುಡುಕಿ|\s+മായി\s+ബന്ധിപ്പിക്കുക|\s+കണ്ടെത്തുക|\s+ਨਾਲ\s+ਜੁੜੋ|\s+ਲੱਭੋ|\s+ସହ\s+ଯୋଡ଼ନ୍ତୁ|\s+ଖୋଜନ୍ତୁ|\s+সৈতে\s+সংযোগ\s+কৰক|\s+বিচাৰক)$/i;

  // Pattern 2: Doctor [Name] se connect karo / डॉक्टर [Name] से जुड़ें / Dr. [Name]
  const prefixDoc = /^(?:connect(?:\s+me)?(?:\s+to|\s+with)?\s+)?(?:doctor|dr\.?|डॉक्टर|डाक्टर|डॉ|डा|ডাক্তার|ডাঃ|চিকিৎসক|டாக்டர்|డాక్టర్|ડૉક્ટર|ಡಾಕ್ಟರ್|ഡോക്ടർ|ਡਾਕਟਰ|ଡାକ୍ତର)\s+(.+)$/i;
  const m2 = raw.match(prefixDoc);
  if (m2 && m2[1]) {
    let name = m2[1].replace(suffixClean, '').replace(/[।,?!.:;'"“”‘’]/g, '').trim();
    const generic = ['directory', 'list', 'connections', 'connection', 'डायरेक्टरी', 'सूची', 'यादी', 'তালিকা', 'பட்டியல்', 'జాబితా', 'સૂચિ'];
    if (name.length > 1 && !generic.includes(name.toLowerCase())) {
      return name;
    }
  }

  return null;
}

/**
 * Universal Multilingual Natural Language Command Matcher
 * Parses transcripts spoken in any of the 13 supported Indian languages into unified CommonIntent.
 */
export function parseVoiceCommand(transcript: string, currentField?: string): VoiceCommandAction {
  const rawText = transcript || '';
  const normalized = normalizeTranscript(rawText);

  // 1. Password Protection Check: NEVER dictate sensitive credentials
  if (currentField && currentField.toLowerCase().includes('password')) {
    return {
      intent: 'REJECT_SENSITIVE_FIELD',
      type: 'REJECT_SENSITIVE_FIELD',
      rawText,
      normalizedText: normalized,
    };
  }

  // 2. Doctor Discovery by Name (e.g. "Connect me to Doctor Aarav", "Doctor Sharma se connect karo")
  const doctorName = extractDoctorSpokenQuery(rawText);
  if (doctorName) {
    return {
      intent: 'FIND_DOCTOR_VOICE',
      type: 'FIND_DOCTOR_VOICE',
      doctorNameQuery: doctorName,
      tab: 'find_doctors',
      rawText,
      normalizedText: normalized,
    };
  }

  // 3. Multilingual Intent Matching with Longest-Match Selection
  // Ensures specific compound phrases (e.g. "connect doctor", "patient list", "start recording")
  // are never eclipsed by shorter single-word triggers (e.g. "doctor", "patient", "record").
  let bestMatch: {
    intent: CommonIntent;
    matchScore: number;
    payload?: Partial<VoiceCommandAction>;
  } | null = null;

  for (const matcher of INTENT_MATCHERS) {
    for (const pattern of matcher.patterns) {
      let matchScore = 0;
      if (typeof pattern === 'string') {
        const normPattern = normalizeTranscript(pattern);
        if (normPattern) {
          if (normalized === normPattern) {
            // Exact match receives highest priority
            matchScore = normPattern.length + 1000;
          } else if (normalized.includes(normPattern)) {
            matchScore = normPattern.length;
          }
        }
      } else if (pattern instanceof RegExp) {
        const match = normalized.match(pattern) || rawText.match(pattern);
        if (match) {
          matchScore = (match[0] ? match[0].length : 10) + 500;
        }
      }

      if (matchScore > 0) {
        if (!bestMatch || matchScore > bestMatch.matchScore) {
          bestMatch = {
            intent: matcher.intent,
            matchScore,
            payload: matcher.payload,
          };
        }
      }
    }
  }

  if (bestMatch) {
    return {
      intent: bestMatch.intent,
      type: bestMatch.intent,
      rawText,
      normalizedText: normalized,
      ...(bestMatch.payload || {}),
    };
  }

  // 3. Field Dictation (Form Input - ONLY non-sensitive)
  if (currentField && !currentField.toLowerCase().includes('password')) {
    const cleanVal = rawText
      .replace(/^(my name is|mera naam hai|mera naam|name is|i am)\s+/i, '')
      .replace(/^(registration number is|reg number is|mera registration number)\s+/i, '')
      .trim();

    return {
      intent: 'FILL_FIELD',
      type: 'FILL_FIELD',
      field: currentField,
      value: cleanVal || rawText,
      rawText,
      normalizedText: normalized,
    };
  }

  return {
    intent: 'UNKNOWN',
    type: 'UNKNOWN',
    rawText,
    normalizedText: normalized,
  };
}

/**
 * Natural Spoken Confirmations across all 13 Indian Languages
 */
const FEEDBACK_MESSAGES: Record<string, Record<string, string>> = {
  SELECT_LANGUAGE_EN: {
    en: 'Language switched to English.',
    hi: 'भाषा अंग्रेजी में बदल दी गई है।',
    mr: 'भाषा इंग्रजीमध्ये बदलली आहे.',
    bn: 'ভাষা ইংরেজিতে পরিবর্তন করা হয়েছে।',
    ta: 'மொழி ஆங்கிலத்திற்கு மாற்றப்பட்டது.',
    te: 'భాష ఆంగ్లంలోకి మార్చబడింది.',
    gu: 'ભાષા અંગ્રેજીમાં બદલાઈ ગઈ છે.',
    kn: 'ಭಾಷೆಯನ್ನು ಇಂಗ್ಲಿಷ್‌ಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.',
    ml: 'ഭാഷ ഇംഗ്ലീഷിലേക്ക് മാറ്റി.',
    pa: 'ਭਾਸ਼ਾ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਬਦਲ ਦਿੱਤੀ ਗਈ ਹੈ।',
    or: 'ଭାଷା ଇଂରାଜୀରେ ପରିବର୍ତ୍ତନ କରାଯାଇଛି।',
    as: 'ভাষা ইংৰাজীলৈ সলনি কৰা হৈছে।',
  },
  SELECT_LANGUAGE_HI: {
    en: 'Language switched to Hindi.',
    hi: 'भाषा हिंदी में बदल दी गई है।',
    mr: 'भाषा हिंदीमध्ये बदलली आहे.',
    bn: 'ভাষা হিন্দিতে পরিবর্তন করা হয়েছে।',
    ta: 'மொழி ஹிந்திக்கு மாற்றப்பட்டது.',
    te: 'భాష హిందీలోకి మార్చబడింది.',
    gu: 'ભાષા હિન્દીમાં બદલાઈ ગઈ છે.',
    kn: 'ಭಾಷೆಯನ್ನು ಹಿಂದಿಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.',
    ml: 'ഭാഷ ഹിന്ദിയിലേക്ക് മാറ്റി.',
    pa: 'ਭਾਸ਼ਾ ਹਿੰਦੀ ਵਿੱਚ ਬਦਲ ਦਿੱਤੀ ਗਈ ਹੈ।',
    or: 'ଭାଷା ହିନ୍ଦୀରେ ପରିବର୍ତ୍ତନ କରାଯାଇଛି।',
    as: 'ভাষা হিন্দীলৈ সলনি কৰা হৈছে।',
  },
  SELECT_LANGUAGE_MR: {
    en: 'Language switched to Marathi.',
    hi: 'भाषा मराठी में बदल दी गई है।',
    mr: 'भाषा मराठीमध्ये बदलली आहे.',
    bn: 'ভাষা মারাঠিতে পরিবর্তন করা হয়েছে।',
    ta: 'மொழி மராத்திக்கு மாற்றப்பட்டது.',
    te: 'భాష మరాఠీలోకి మార్చబడింది.',
    gu: 'ભાષા મરાઠીમાં બદલાઈ ગઈ છે.',
    kn: 'ಭಾಷೆಯನ್ನು ಮರಾಠಿಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.',
    ml: 'ഭാഷ മറാഠിയിലേക്ക് മാറ്റി.',
    pa: 'ਭਾਸ਼ਾ ਮਰਾਠੀ ਵਿੱਚ ਬਦਲ ਦਿੱਤੀ ਗਈ ਹੈ।',
    or: 'ଭାଷା ମରାଠୀରେ ପରିବର୍ତ୍ତନ କରାଯାଇଛି।',
    as: 'ভাষা মাৰাঠীলৈ সলনি কৰা হৈছে।',
  },
  SELECT_LANGUAGE_BN: {
    en: 'Language switched to Bengali.',
    bn: 'ভাষা বাংলায় পরিবর্তন করা হয়েছে।',
    hi: 'भाषा बंगाली में बदल दी गई है।',
  },
  SELECT_LANGUAGE_TA: {
    en: 'Language switched to Tamil.',
    ta: 'மொழி தமிழுக்கு மாற்றப்பட்டது.',
    hi: 'भाषा तमिल में बदल दी गई है।',
  },
  SELECT_LANGUAGE_TE: {
    en: 'Language switched to Telugu.',
    te: 'భాష తెలుగులోకి మార్చబడింది.',
    hi: 'भाषा तेलुगु में बदल दी गई है।',
  },
  SELECT_LANGUAGE_GU: {
    en: 'Language switched to Gujarati.',
    gu: 'ભાષા ગુજરાતીમાં બદલાઈ ગઈ છે.',
    hi: 'भाषा गुजराती में बदल दी गई है।',
  },
  SELECT_LANGUAGE_KN: {
    en: 'Language switched to Kannada.',
    kn: 'ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.',
    hi: 'भाषा कन्नड़ में बदल दी गई है।',
  },
  SELECT_LANGUAGE_ML: {
    en: 'Language switched to Malayalam.',
    ml: 'ഭാഷ മലയാളത്തിലേക്ക് മാറ്റി.',
    hi: 'भाषा मलयालम में बदल दी गई है।',
  },
  SELECT_LANGUAGE_PA: {
    en: 'Language switched to Punjabi.',
    pa: 'ਭਾਸ਼ਾ ਪੰਜਾਬੀ ਵਿੱਚ ਬਦਲ ਦਿੱਤੀ ਗਈ ਹੈ।',
    hi: 'भाषा पंजाबी में बदल दी गई है।',
  },
  SELECT_LANGUAGE_OR: {
    en: 'Language switched to Odia.',
    or: 'ଭାଷା ଓଡ଼ିଆରେ ପରିବର୍ତ୍ତନ କରାଯାଇଛି।',
    hi: 'भाषा उड़िया में बदल दी गई है।',
  },
  SELECT_LANGUAGE_AS: {
    en: 'Language switched to Assamese.',
    as: 'ভাষা অসমীয়ালৈ সলনি কৰা হৈছে।',
    hi: 'भाषा असमिया में बदल दी गई है।',
  },
  SELECT_LANGUAGE_HINGLISH: {
    en: 'Language switched to Hinglish.',
    hinglish: 'Language Hinglish me set ho gayi hai.',
    hi: 'भाषा हिंग्लिश में बदल दी गई है।',
  },

  OPEN_LOGIN: {
    en: 'Opened login screen. Please enter your credentials.',
    hi: 'लॉगिन स्क्रीन खुल गई है। कृपया अपना विवरण दर्ज करें।',
    mr: 'लॉगिन पृष्ठ उघडले आहे. कृपया आपली माहिती प्रविष्ट करा.',
    bn: 'লগইন স্ক্রিন খোলা হয়েছে।',
    ta: 'உள்நுழைவு திரை திறக்கப்பட்டது.',
    te: 'లాగిన్ స్క్రీన్ తెరవబడింది.',
    gu: 'લૉગિન સ્ક્રીન ખોલવામાં આવી છે.',
    kn: 'ಲಾಗಿನ್ ಪರದೆ ತೆರೆಯಲಾಗಿದೆ.',
    ml: 'ലോഗിൻ സ്ക്രീൻ തുറന്നു.',
    pa: 'ਲਾਗਇਨ ਸਕ੍ਰੀਨ ਖੁੱਲ੍ਹ ਗਈ ਹੈ।',
    or: 'ଲଗଇନ୍ ସ୍କ୍ରିନ୍ ଖୋଲାଗଲା।',
    as: 'লগইন স্ক্ৰীণ খোলা হ\'ল।',
  },
  OPEN_REGISTER: {
    en: 'Opened registration screen. Please fill your details.',
    hi: 'पंजीकरण स्क्रीन खुल गई है।',
    mr: 'नोंदणी पृष्ठ उघडले आहे. कृपया आपली माहिती भरा.',
    bn: 'নিবন্ধন স্ক্রিন খোলা হয়েছে।',
    ta: 'பதிவு திரை திறக்கப்பட்டது.',
    te: 'నమోదు స్క్రీన్ తెరవబడింది.',
    gu: 'નોંધણી સ્ક્રીન ખોલવામાં આવી છે.',
    kn: 'ನೋಂದಣಿ ಪರದೆ ತೆರೆಯಲಾಗಿದೆ.',
    ml: 'രജിസ്ട്രേഷൻ സ്ക്രീൻ തുറന്നു.',
    pa: 'ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਸਕ੍ਰੀਨ ਖੁੱਲ੍ਹ ਗਈ ਹੈ।',
    or: 'ପଞ୍ଜୀକରଣ ସ୍କ୍ରିନ୍ ଖୋଲାଗଲା।',
    as: 'পঞ্জীয়ন স্ক্ৰীণ খোলা হ\'ল।',
  },
  START_RECORDING: {
    en: 'Recording started. Please speak your health update.',
    hi: 'रिकॉर्डिंग शुरू हो गई है। कृपया अपना स्वास्थ्य अपडेट बोलें।',
    mr: 'रेकॉर्डिंग सुरू झाले आहे. कृपया आपले आरोग्य अपडेट बोला.',
    bn: 'রেকর্ডিং শুরু হয়েছে। আপনার স্বাস্থ্য আপডেট বলুন।',
    ta: 'பதிவு தொடங்கியது. உங்கள் சுகாதார தகவலைப் பேசுங்கள்.',
    te: 'రికార్డింగ్ ప్రారంభమైంది. మీ ఆరోగ్య నవీకరణ మాట్లాడండి.',
    gu: 'રેકોર્ડિંગ શરૂ થયું છે. કૃપા કરીને તમારું અપડેટ બોલો.',
    kn: 'ರೆಕಾರ್ಡಿಂಗ್ ಪ್ರಾರಂಭವಾಗಿದೆ. ದಯವಿಟ್ಟು ಮಾತನಾಡಿ.',
    ml: 'റെക്കോർഡിംഗ് ആരംഭിച്ചു. ദയവായി സംസാരിക്കുക.',
    pa: 'ਰਿਕਾਰਡਿੰਗ ਸ਼ੁਰੂ ਹੋ ਗਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਬੋਲੋ।',
    or: 'ରେକର୍ଡିଂ ଆରମ୍ଭ ହେଲା। ଦୟାକରି କୁହନ୍ତୁ।',
    as: 'ৰেকৰ্ডিং আৰম্ভ হৈছে। অনুগ্ৰহ কৰি কওক।',
  },
  STOP_RECORDING: {
    en: 'Recording stopped. Analyzing your health update.',
    hi: 'रिकॉर्डिंग रुक गई है। अपडेट का विश्लेषण किया जा रहा है।',
    mr: 'रेकॉर्डिंग थांबवले आहे. माहितीचे विश्लेषण केले जात आहे.',
    bn: 'রেকর্ডিং বন্ধ হয়েছে। আপডেট বিশ্লেষণ করা হচ্ছে।',
    ta: 'பதிவு நிறுத்தப்பட்டது. தகவல் ஆய்வு செய்யப்படுகிறது.',
    te: 'రికార్డింగ్ ఆగింది. నవీకరణ విశ్లేషించబడుతోంది.',
    gu: 'રેકોર્ડિંગ બંધ થયું છે. અપડેટનું વિશ્લેષણ થઈ રહ્યું છે.',
    kn: 'ರೆಕಾರ್ಡಿಂಗ್ ನಿಲ್ಲಿಸಲಾಗಿದೆ. ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ.',
    ml: 'റെക്കോർഡിംഗ് നിർത്തി. വിവരങ്ങൾ വിശകലനം ചെയ്യുന്നു.',
    pa: 'ਰਿਕਾਰਡਿੰਗ ਰੋਕ ਦਿੱਤੀ ਗਈ ਹੈ। ਵਿਸ਼ਲੇਸ਼ਣ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ।',
    or: 'ରେକର୍ଡିଂ ବନ୍ଦ ହେଲା। ବିଶ୍ଳେଷଣ ଚାଲିଛି।',
    as: 'ৰেকৰ্ডিং বন্ধ হৈছে। তথ্য বিশ্লেষণ কৰা হৈছে।',
  },
  CONFIRM_UPDATE: {
    en: 'Health update confirmed and saved to your medical timeline.',
    hi: 'स्वास्थ्य अपडेट की पुष्टि हो गई है और टाइमलाइन में सुरक्षित कर दिया गया है।',
    hinglish: 'Health update confirm ho gaya hai aur medical timeline me save ho gaya hai.',
    mr: 'आरोग्य अपडेटची खात्री झाली असून टाइमलाइनमध्ये जतन केले आहे.',
    bn: 'স্বাস্থ্য আপডেট নিশ্চিত করা হয়েছে এবং টাইমলাইনে সংরক্ষণ করা হয়েছে।',
    ta: 'சுகாதார தகவல் உறுதிப்படுத்தப்பட்டு காலவரிசையில் சேமிக்கப்பட்டது.',
    te: 'ఆరోగ్య నవీకరణ ధృవీకరించబడింది మరియు టైమ్‌లైన్‌లో సేవ్ చేయబడింది.',
    gu: 'આરોગ્ય અપડેટ ખાતરી થઈ અને સમયરેખામાં સાચવવામાં આવી છે.',
    kn: 'ಆರೋಗ್ಯ ಅಪ್ಡೇಟ್ ಖಚಿತಪಡಿಸಲಾಗಿದೆ ಮತ್ತು ಟೈಮ್‌ಲೈನ್‌ನಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ.',
    ml: 'ആരോഗ്യ അപ്ഡേറ്റ് ഉറപ്പിച്ചു ടൈംലൈനിൽ സംരക്ഷിച്ചു.',
    pa: 'ਸਿਹਤ ਅੱਪਡੇਟ ਦੀ ਪੁਸ਼ਟੀ ਹੋ ਗਈ ਹੈ ਅਤੇ ਸੁਰੱਖਿਅਤ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।',
    or: 'ସ୍ୱାସ୍ଥ୍ୟ ଅପଡେଟ୍ ନିଶ୍ଚିତ ହେଲା ଏବଂ ସମୟରେଖାରେ ସାଇତି ରଖାଗଲା।',
    as: 'স্বাস্থ্যৰ তথ্য নিশ্চিত কৰা হ\'ল আৰু সময়ৰেখাত সংৰক্ষণ কৰা হ\'ল।',
  },
  OPEN_TIMELINE: {
    en: 'Opened medical timeline.',
    hi: 'मेडिकल टाइमलाइन खुल गई है।',
    mr: 'वैद्यकीय इतिहास टाइमलाइन उघडली आहे.',
    bn: 'চিকিৎসা সময়রেখা খোলা হয়েছে।',
    ta: 'மருத்துவ காலவரிசை திறக்கப்பட்டது.',
    te: 'వైద్య కాలక్రమం తెరవబడింది.',
    gu: 'તબીબી સમયરેખા ખોલવામાં આવી છે.',
    kn: 'ವೈದ್ಯಕೀಯ ಸಮಯರೇಖೆ ತೆರೆಯಲಾಗಿದೆ.',
    ml: 'ചികിത്സാ ടൈംലൈൻ തുറന്നു.',
    pa: 'ਮੈਡੀਕਲ ਟਾਈਮਲਾਈਨ ਖੁੱਲ੍ਹ ਗਈ ਹੈ।',
    or: 'ଡାକ୍ତରୀ ସମୟରେଖା ଖୋଲାଗଲା।',
    as: 'চিকিৎসাৰ সময়ৰেখা খোলা হ\'ল।',
  },
  OPEN_PROFILE: {
    en: 'Opened profile and language settings.',
    hi: 'प्रोफाइल और भाषा सेटिंग्स खुल गई हैं।',
    mr: 'प्रोफाइल आणि भाषा सेटिंग्ज उघडल्या आहेत.',
    bn: 'প্রোফাইল এবং ভাষা সেটিংস খোলা হয়েছে।',
    ta: 'சுயவிவரம் மற்றும் மொழி அமைப்புகள் திறக்கப்பட்டன.',
    te: 'ప్రొఫైల్ మరియు భాషా సెట్టింగ్‌లు తెరవబడ్డాయి.',
    gu: 'પ્રોફાઇલ અને ભાષા સેટિંગ્સ ખોલવામાં આવી છે.',
    kn: 'ಪ್ರೊಫೈಲ್ ಮತ್ತು ಭಾಷಾ ಸೆಟ್ಟಿಂಗ್‌ಗಳು ತೆರೆಯಲ್ಪಟ್ಟಿವೆ.',
    ml: 'പ്രൊഫൈലും ഭാഷാ ക്രമീകരണങ്ങളും തുറന്നു.',
    pa: 'ਪ੍ਰੋਫਾਈਲ ਅਤੇ ਭਾਸ਼ਾ ਸੈਟਿੰਗਾਂ ਖੁੱਲ੍ਹ ਗਈਆਂ ਹਨ।',
    or: 'ପ୍ରୋଫାଇଲ୍ ଏବଂ ଭାଷା ସେଟିଙ୍ଗସ୍ ଖୋଲାଗଲା।',
    as: 'প্ৰফাইল আৰু ভাষা ছেটিংছ খোলা হ\'ল।',
  },
  GO_BACK: {
    en: 'Navigated back.',
    hi: 'वापस आ गए हैं।',
    mr: 'मागे परत आलो आहोत.',
    bn: 'ফিরে আসা হয়েছে।',
    ta: 'பின்னே சென்றது.',
    te: 'వెనక్కి వచ్చాము.',
    gu: 'પાછા આવ્યા છીએ.',
    kn: 'ಹಿಂದೆ ಬಂದಿದೆ.',
    ml: 'തിരികെ വന്നു.',
    pa: 'ਵਾਪਸ ਆ ਗਏ ਹਾਂ।',
    or: 'ପଛକୁ ଫେରିଆସିଲୁ।',
    as: 'উভতি অহা হ\'ল।',
  },
  LOGOUT: {
    en: 'Logged out successfully.',
    hi: 'सफलतापूर्वक लॉगआउट हो गया।',
    mr: 'यशस्वीरित्या बाहेर पडला आहात.',
    bn: 'সফলভাবে লগআউট হয়েছে।',
    ta: 'வெற்றிகரமாக வெளியேறியது.',
    te: 'విజయవంతంగా లాగౌట్ అయ్యారు.',
    gu: 'સફળતાપૂર્વક લૉગઆઉટ થઈ ગયું.',
    kn: 'ಯಶಸ್ವಿಯಾಗಿ ನಿರ್ಗಮಿಸಲಾಗಿದೆ.',
    ml: 'വിജയകരമായി ലോഗൗട്ട് ചെയ്തു.',
    pa: 'ਸਫਲਤਾਪੂਰਵਕ ਲੌਗਆਊਟ ਹੋ ਗਿਆ।',
    or: 'ସଫଳତାର ସହ ଲଗଆଉଟ୍ ହେଲା।',
    as: 'সফলভাৱে প্ৰস্থান কৰা হ\'ল।',
  },
  SELECT_ROLE_DOCTOR: {
    en: 'Selected Doctor portal. Please enter your credentials.',
    hi: 'डॉक्टर पोर्टल चुना गया। कृपया अपना विवरण दर्ज करें।',
    mr: 'डॉक्टर पोर्टल निवडले आहे. कृपया आपली माहिती प्रविष्ट करा.',
    bn: 'ডাক্তার পোর্টাল নির্বাচিত।',
    ta: 'மருத்துவர் போர்ட்டல் தேர்ந்தெடுக்கப்பட்டது.',
    te: 'డాక్టర్ పోర్టల్ ఎంపిక చేయబడింది.',
  },
  SELECT_ROLE_PATIENT: {
    en: 'Selected Patient portal. Please enter your credentials.',
    hi: 'मरीज पोर्टल चुना गया। कृपया अपना विवरण दर्ज करें।',
    mr: 'रुग्ण पोर्टल निवडले आहे. कृपया आपली माहिती प्रविष्ट करा.',
    bn: 'রোগী পোর্টাল নির্বাচিত।',
    ta: 'நோயாளி போர்ட்டல் தேர்ந்தெடுக்கப்பட்டது.',
    te: 'రోగి పోర్టల్ ఎంపిక చేయబడింది.',
  },
  CONNECT_DOCTOR: {
    en: 'Opened doctor directory. Search and connect with registered doctors.',
    hi: 'डॉक्टर डायरेक्टरी खुल गई है। पंजीकृत डॉक्टरों को खोजें और जुड़ें।',
    mr: 'डॉक्टर डायरेक्टरी उघडली आहे. नोंदणीकृत डॉक्टर शोधा आणि जोडा.',
    bn: 'ডাক্তার ডিরেক্টরি খোলা হয়েছে। নিবন্ধিত ডাক্তার খুঁজুন এবং সংযোগ করুন।',
    ta: 'மருத்துவர் அடைவு திறக்கப்பட்டது. பதிவுசெய்த மருத்துவர்களைத் தேடுங்கள்.',
    te: 'డాక్టర్ డైరెక్టరీ తెరవబడింది. రిజిస్టర్డ్ డాక్టర్లను వెతకండి.',
    gu: 'ડૉક્ટર ડિરેક્ટરી ખુલી ગઈ છે. રજિસ્ટર્ડ ડૉક્ટરો શોધો અને જોડાઓ.',
    kn: 'ವೈದ್ಯರ ಡೈರೆಕ್ಟರಿ ತೆರೆಯಲಾಗಿದೆ. ನೋಂದಾಯಿತ ವೈದ್ಯರನ್ನು ಹುಡುಕಿ.',
    ml: 'ഡോക്ടർ ഡയറക്ടറി തുറന്നു. രജിസ്റ്റർ ചെയ്ത ഡോക്ടർമാരെ തിരയുക.',
    pa: 'ਡਾਕਟਰ ਡਾਇਰੈਕਟਰੀ ਖੁੱਲ੍ਹ ਗਈ ਹੈ। ਰਜਿਸਟਰਡ ਡਾਕਟਰਾਂ ਦੀ ਖੋਜ ਕਰੋ।',
    or: 'ଡାକ୍ତର ଡାଇରେକ୍ଟୋରୀ ଖୋଲାଗଲା। ପଞ୍ଜୀକୃତ ଡାକ୍ତରଙ୍କୁ ଖୋଜନ୍ତୁ।',
    as: 'চিকিৎসক ডাইৰেক্টৰী খোলা হ\'ল। পঞ্জীভুক্ত চিকিৎসক বিচাৰক।',
  },
  FIND_DOCTOR_VOICE: {
    en: 'Searching for doctor in directory...',
    hi: 'डायरेक्टरी में डॉक्टर खोज रहे हैं...',
    mr: 'डायरेक्टरीमध्ये डॉक्टर शोधत आहे...',
    bn: 'ডিরেক্টরিতে ডাক্তার খোঁজা হচ্ছে...',
    ta: 'மருத்துவரைத் தேடுகிறது...',
    te: 'డైరెక్టరీలో డాక్టర్‌ను వెతుకుతోంది...',
    gu: 'ડાયરેક્ટરીમાં ડૉક્ટર શોધી રહ્યાં છીએ...',
    kn: 'ಡೈರೆಕ್ಟರಿಯಲ್ಲಿ ವೈದ್ಯರನ್ನು ಹುಡುಕಲಾಗುತ್ತಿದೆ...',
    ml: 'ഡയറക്ടറിയിൽ ഡോക്ടറെ തിരയുന്നു...',
    pa: 'ਡਾਇਰੈਕਟਰੀ ਵਿੱਚ ਡਾਕਟਰ ਦੀ ਖੋਜ ਕਰ ਰਿਹਾ ਹੈ...',
    or: 'ଡାଇରେକ୍ଟୋରୀରେ ଡାକ୍ତରଙ୍କୁ ଖୋଜୁଛି...',
    as: 'ডাইৰেক্টৰীত চিকিৎসক বিচাৰি থকা হৈছে...',
  },
  CONFIRM_DOCTOR_CONNECT: {
    en: 'Sending connection request to doctor...',
    hi: 'डॉक्टर को कनेक्शन अनुरोध भेजा जा रहा है...',
    mr: 'डॉक्टरांना कनेक्शन विनंती पाठवली जात आहे...',
    bn: 'ডাক্তারকে সংযোগ অনুরোধ পাঠানো হচ্ছে...',
    ta: 'மருத்துவருக்கு இணைப்பு கோரிக்கை அனுப்பப்படுகிறது...',
    te: 'డాక్టర్‌కు కనెక్షన్ అభ్యర్థన పంపబడుతోంది...',
    gu: 'ડૉક્ટરને કનેક્શન વિનંતી મોકલી રહ્યાં છીએ...',
    kn: 'ವೈದ್ಯರಿಗೆ ಸಂಪರ್ಕ ವಿನಂತಿಯನ್ನು ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ...',
    ml: 'ഡോക്ടർക്ക് കണക്ഷൻ അഭ്യർത്ഥന അയക്കുന്നു...',
    pa: 'ਡਾਕਟਰ ਨੂੰ ਕਨੈਕਸ਼ਨ ਬੇਨਤੀ ਭੇਜੀ ਜਾ ਰਹੀ ਹੈ...',
    or: 'ଡାକ୍ତରଙ୍କୁ ସଂଯୋଗ ଅନୁରୋଧ ପଠାଯାଉଛି...',
    as: 'চিকিৎসকলৈ সংযোগ অনুৰোধ প্ৰেৰণ কৰা হৈছে...',
  },
  VIEW_PATIENTS: {
    en: 'Viewing approved patients list.',
    hi: 'स्वीकृत मरीजों की सूची देखी जा रही है।',
    mr: 'मंजूर रुग्णांची यादी उघडली आहे.',
  },
  ACCEPT_CONNECTION_REQUEST: {
    en: 'Accepting connection request.',
    hi: 'कनेक्शन अनुरोध स्वीकार किया जा रहा है।',
    mr: 'सहमती विनंती मंजूर केली जात आहे.',
  },
  REJECT_CONNECTION_REQUEST: {
    en: 'Declining connection request.',
    hi: 'कनेक्शन अनुरोध अस्वीकार किया जा रहा है।',
    mr: 'सहमती विनंती नाकारली जात आहे.',
  },
  NAVIGATE_HEALTH_UPDATE: {
    en: 'Switched to Record Health Update.',
    hi: 'हेल्थ अपडेट रिकॉर्डिंग टैब खुल गया है।',
    mr: 'आरोग्य नोंदणी टॅब उघडला आहे.',
  },
  EDIT_BY_VOICE: {
    en: 'Voice correction active. Please speak your correction.',
    hi: 'आवाज से सुधार सक्रिय है। कृपया अपना सुधार बोलें।',
    hinglish: 'Voice correction active hai. Please apna correction bolein.',
    mr: 'आवाज सुधारणा सक्रिय आहे. कृपया दुरुस्ती सांगा.',
    bn: 'ভয়েস সংশোধন সক্রিয়। আপনার সংশোধন বলুন।',
    ta: 'குரல் திருத்தம் செயலில் உள்ளது. உங்கள் திருத்தத்தைக் கூறுங்கள்.',
    te: 'వాయిస్ సవరణ యాక్టివ్‌గా ఉంది. మీ సవరణను చెప్పండి.',
    gu: 'વોઇસ સુધારો સક્રિય છે. કૃપા કરીને તમારો સુધારો બોલો.',
    kn: 'ಧ್ವನಿ ತಿದ್ದುಪಡಿ ಸಕ್ರಿಯವಾಗಿದೆ. ನಿಮ್ಮ ತಿದ್ದುಪಡಿಯನ್ನು ಮಾತನಾಡಿ.',
    ml: 'ശബ്ദ തിരുത്തൽ സജീവമാണ്. ദയവായി തിരുത്തൽ പറയുക.',
    pa: 'ਵੌਇਸ ਸੁਧਾਰ ਕਿਰਿਆਸ਼ੀਲ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਸੁਧਾਰ ਬੋਲੋ।',
    or: 'ଭଏସ୍ ସଂଶୋଧନ ସକ୍ରିୟ। ଦୟାକରି ଆପଣଙ୍କ ସଂଶୋଧନ କୁହନ୍ତୁ।',
    as: 'ভইচ সংশোধন সক্ৰিয় হৈছে। অনুগ্ৰহ কৰি আপোনাৰ সংশোধন কওক।',
  },
  UNKNOWN: {
    en: 'I did not recognize that command. You can say Login, Register, Record update, Timeline, or Profile.',
    hi: 'यह आदेश समझ नहीं आया। आप लॉगिन, पंजीकरण, रिकॉर्ड, टाइमलाइन, या प्रोफाइल कह सकते हैं।',
    mr: 'हा आदेश समजला नाही. आपण लॉगिन, नोंदणी, रेकॉर्ड, इतिहास किंवा प्रोफाइल म्हणू शकता.',
    bn: 'কমান্ডটি বুঝতে পারিনি। আপনি লগইন, নিবন্ধন, রেকর্ড, সময়রেখা বা প্রোফাইল বলতে পারেন।',
    ta: 'கட்டளை புரியவில்லை. உள்நுழை, பதிவு, பதிவு செய், காலவரிசை அல்லது சுயவிவரம் என்று கூறலாம்.',
    te: 'ఆదేశం అర్థం కాలేదు. మీరు లాగిన్, నమోదు, రికార్డ్, టైమ్‌లైన్ లేదా ప్రొఫైల్ అని చెప్పవచ్చు.',
    gu: 'આદેશ સમજાયો નથી. તમે લૉગિન, નોંધણી, રેકોર્ડ, સમયરેખા અથવા પ્રોફાઇલ કહી શકો છો.',
    kn: 'ಆಜ್ಞೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ನೀವು ಲಾಗಿನ್, ನೋಂದಣಿ, ರೆಕಾರ್ಡ್, ಸಮಯರೇಖೆ ಅಥವಾ ಪ್ರೊಫೈಲ್ ಎಂದು ಹೇಳಬಹುದು.',
    ml: 'കമാൻഡ് മനസ്സിലായില്ല. ലോഗിൻ, രജിസ്ട്രേഷൻ, റെക്കോർഡ്, ടൈംലൈൻ അല്ലെങ്കിൽ പ്രൊഫൈൽ എന്ന് പറയാം.',
    pa: 'ਹੁਕਮ ਸਮਝ ਨਹੀਂ ਆਇਆ। ਤੁਸੀਂ ਲੌਗਇਨ, ਰਜਿਸਟ੍ਰੇਸ਼ਨ, ਰਿਕਾਰਡ, ਟਾਈਮਲਾਈਨ ਜਾਂ ਪ੍ਰੋਫਾਈਲ ਕਹਿ ਸਕਦੇ ਹੋ।',
    or: 'ଆଦେଶ ବୁଝିହେଲାନାହିଁ। ଆପଣ ଲଗଇନ୍, ପଞ୍ଜୀକରଣ, ରେକର୍ଡ, ସମୟରେଖା କିମ୍ବା ପ୍ରୋଫାଇଲ୍ କହିପାରିବେ।',
    as: 'নিৰ্দেশ বুজি পোৱা নগ\'ল। আপুনি লগইন, পঞ্জীয়ন, ৰেকৰ্ড, সময়ৰেখা বা প্ৰফাইল ক\'ব পাৰে।',
  },
};

/**
 * Retrieves natural spoken feedback for any intent in any of the 13 supported languages
 */
export function getSpokenFeedbackForIntent(
  intent: CommonIntent,
  lang: AppLanguage,
  detail?: string
): string {
  const intentDict = FEEDBACK_MESSAGES[intent];
  if (intentDict) {
    if (intentDict[lang]) return intentDict[lang];
    if (intentDict.en) return intentDict.en;
  }
  if (detail) return detail;
  return `Action completed.`;
}

/**
 * Voice Navigation Service with Native Multi-Language Speech Recognition
 */
export const voiceNavigationService = {
  isSupported(): boolean {
    return speechService.isRecognitionSupported();
  },

  listen(
    language: AppLanguage,
    onResult: (action: VoiceCommandAction) => void,
    onError: (err: string) => void,
    activeField?: string
  ) {
    const locale = appLanguageToLocale(language);

    return speechService.startListening(locale, {
      onResult: (text, isFinal) => {
        if (isFinal && text.trim()) {
          const action = parseVoiceCommand(text, activeField);
          onResult(action);
        }
      },
      onError,
    });
  },

  speakFeedback(message: string, language: AppLanguage) {
    if (!speechService.isSynthesisSupported()) return;
    const locale = appLanguageToLocale(language);
    speechService.speak(message, locale);
  },
};
