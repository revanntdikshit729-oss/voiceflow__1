// Automated 13-Language Verification Matrix Test for VoiceFlow
// Tests speech transcript normalization, intent mapping, action execution, security rules, and TTS feedback

import {
  parseVoiceCommand,
  getSpokenFeedbackForIntent,
  CommonIntent,
} from './voiceNavigation';
import { AppLanguage } from '../i18n/translations';

interface TestCase {
  language: string;
  langCode: AppLanguage;
  transcript: string;
  expectedIntent: CommonIntent;
  description: string;
  field?: string;
}

const TEST_CASES: TestCase[] = [
  // ==========================================
  // 1. ENGLISH (en)
  // ==========================================
  { language: 'English', langCode: 'en', transcript: 'switch to english', expectedIntent: 'SELECT_LANGUAGE_EN', description: 'Language switch to English' },
  { language: 'English', langCode: 'en', transcript: 'i am a doctor', expectedIntent: 'SELECT_ROLE_DOCTOR', description: 'Doctor role selection' },
  { language: 'English', langCode: 'en', transcript: 'open patient login', expectedIntent: 'SELECT_ROLE_PATIENT', description: 'Patient role selection' },
  { language: 'English', langCode: 'en', transcript: 'please log in', expectedIntent: 'OPEN_LOGIN', description: 'Open login screen' },
  { language: 'English', langCode: 'en', transcript: 'create new account', expectedIntent: 'OPEN_REGISTER', description: 'Open registration screen' },
  { language: 'English', langCode: 'en', transcript: 'start health recording', expectedIntent: 'START_RECORDING', description: 'Start health recording' },
  { language: 'English', langCode: 'en', transcript: 'stop recording now', expectedIntent: 'STOP_RECORDING', description: 'Stop health recording' },
  { language: 'English', langCode: 'en', transcript: 'show summary', expectedIntent: 'VIEW_SUMMARY', description: 'View AI summary' },
  { language: 'English', langCode: 'en', transcript: 'read aloud summary', expectedIntent: 'READ_SUMMARY', description: 'Read summary aloud' },
  { language: 'English', langCode: 'en', transcript: 'edit by voice', expectedIntent: 'EDIT_BY_VOICE', description: 'Voice correction mode' },
  { language: 'English', langCode: 'en', transcript: 'confirm and save update', expectedIntent: 'CONFIRM_UPDATE', description: 'Confirm and save health update' },
  { language: 'English', langCode: 'en', transcript: 'open medical timeline', expectedIntent: 'OPEN_TIMELINE', description: 'Open medical timeline' },
  { language: 'English', langCode: 'en', transcript: 'open profile settings', expectedIntent: 'OPEN_PROFILE', description: 'Open profile settings' },
  { language: 'English', langCode: 'en', transcript: 'connect doctor', expectedIntent: 'CONNECT_DOCTOR', description: 'Connect with doctor' },
  { language: 'English', langCode: 'en', transcript: 'view patient list', expectedIntent: 'VIEW_PATIENTS', description: 'Doctor view patient list' },
  { language: 'English', langCode: 'en', transcript: 'initial consultation', expectedIntent: 'BASELINE_CONSULTATION', description: 'Doctor baseline consultation' },
  { language: 'English', langCode: 'en', transcript: 'health change brief', expectedIntent: 'HEALTH_CHANGE_BRIEF', description: 'Doctor health change brief' },
  { language: 'English', langCode: 'en', transcript: 'compare records side by side', expectedIntent: 'COMPARE_RECORDS', description: 'Side by side comparison' },
  { language: 'English', langCode: 'en', transcript: 'go back', expectedIntent: 'GO_BACK', description: 'Navigation go back' },
  { language: 'English', langCode: 'en', transcript: 'logout from app', expectedIntent: 'LOGOUT', description: 'User logout' },

  // ==========================================
  // 2. HINDI (hi)
  // ==========================================
  { language: 'Hindi', langCode: 'hi', transcript: 'हिंदी भाषा चुनो', expectedIntent: 'SELECT_LANGUAGE_HI', description: 'Language switch to Hindi' },
  { language: 'Hindi', langCode: 'hi', transcript: 'डॉक्टर पोर्टल', expectedIntent: 'SELECT_ROLE_DOCTOR', description: 'Doctor role selection' },
  { language: 'Hindi', langCode: 'hi', transcript: 'मरीज लॉगिन', expectedIntent: 'SELECT_ROLE_PATIENT', description: 'Patient role selection' },
  { language: 'Hindi', langCode: 'hi', transcript: 'लॉगिन करें', expectedIntent: 'OPEN_LOGIN', description: 'Open login screen' },
  { language: 'Hindi', langCode: 'hi', transcript: 'नया खाता बनाएं', expectedIntent: 'OPEN_REGISTER', description: 'Open registration screen' },
  { language: 'Hindi', langCode: 'hi', transcript: 'रिकॉर्डिंग शुरू करें।', expectedIntent: 'START_RECORDING', description: 'Start recording with danda' },
  { language: 'Hindi', langCode: 'hi', transcript: 'रिकॉर्डिंग बंद करो', expectedIntent: 'STOP_RECORDING', description: 'Stop recording' },
  { language: 'Hindi', langCode: 'hi', transcript: 'सारांश देखें', expectedIntent: 'VIEW_SUMMARY', description: 'View AI summary' },
  { language: 'Hindi', langCode: 'hi', transcript: 'पढ़कर सुनाएं', expectedIntent: 'READ_SUMMARY', description: 'Read summary aloud' },
  { language: 'Hindi', langCode: 'hi', transcript: 'सुधार करें', expectedIntent: 'EDIT_BY_VOICE', description: 'Voice correction mode' },
  { language: 'Hindi', langCode: 'hi', transcript: 'पुष्टि करें और सुरक्षित करें', expectedIntent: 'CONFIRM_UPDATE', description: 'Confirm and save update' },
  { language: 'Hindi', langCode: 'hi', transcript: 'मेडिकल टाइमलाइन', expectedIntent: 'OPEN_TIMELINE', description: 'Open timeline' },
  { language: 'Hindi', langCode: 'hi', transcript: 'प्रोफाइल खोलें', expectedIntent: 'OPEN_PROFILE', description: 'Open profile' },
  { language: 'Hindi', langCode: 'hi', transcript: 'डॉक्टर से जुड़ें', expectedIntent: 'CONNECT_DOCTOR', description: 'Connect with doctor' },
  { language: 'Hindi', langCode: 'hi', transcript: 'मरीजों की सूची', expectedIntent: 'VIEW_PATIENTS', description: 'Doctor view patient list' },
  { language: 'Hindi', langCode: 'hi', transcript: 'आरंभिक परामर्श', expectedIntent: 'BASELINE_CONSULTATION', description: 'Doctor baseline consultation' },
  { language: 'Hindi', langCode: 'hi', transcript: 'स्वास्थ्य परिवर्तन देखें', expectedIntent: 'HEALTH_CHANGE_BRIEF', description: 'Doctor health change brief' },
  { language: 'Hindi', langCode: 'hi', transcript: 'तुलना देखें', expectedIntent: 'COMPARE_RECORDS', description: 'Compare records' },
  { language: 'Hindi', langCode: 'hi', transcript: 'वापस जाएं', expectedIntent: 'GO_BACK', description: 'Navigation go back' },
  { language: 'Hindi', langCode: 'hi', transcript: 'लॉगआउट करें', expectedIntent: 'LOGOUT', description: 'User logout' },

  // ==========================================
  // 3. HINGLISH (hinglish)
  // ==========================================
  { language: 'Hinglish', langCode: 'hinglish', transcript: 'hinglish me baat karo', expectedIntent: 'SELECT_LANGUAGE_HINGLISH', description: 'Language switch to Hinglish' },
  { language: 'Hinglish', langCode: 'hinglish', transcript: 'doctor select karo', expectedIntent: 'SELECT_ROLE_DOCTOR', description: 'Doctor role selection' },
  { language: 'Hinglish', langCode: 'hinglish', transcript: 'patient select karo', expectedIntent: 'SELECT_ROLE_PATIENT', description: 'Patient role selection' },
  { language: 'Hinglish', langCode: 'hinglish', transcript: 'login karo', expectedIntent: 'OPEN_LOGIN', description: 'Open login screen' },
  { language: 'Hinglish', langCode: 'hinglish', transcript: 'register karo', expectedIntent: 'OPEN_REGISTER', description: 'Open registration screen' },
  { language: 'Hinglish', langCode: 'hinglish', transcript: 'recording start karo', expectedIntent: 'START_RECORDING', description: 'Start health recording' },
  { language: 'Hinglish', langCode: 'hinglish', transcript: 'recording band karo', expectedIntent: 'STOP_RECORDING', description: 'Stop health recording' },
  { language: 'Hinglish', langCode: 'hinglish', transcript: 'summary dikhao', expectedIntent: 'VIEW_SUMMARY', description: 'View summary' },
  { language: 'Hinglish', langCode: 'hinglish', transcript: 'notes sunao', expectedIntent: 'READ_SUMMARY', description: 'Read aloud' },
  { language: 'Hinglish', langCode: 'hinglish', transcript: 'edit karo', expectedIntent: 'EDIT_BY_VOICE', description: 'Edit by voice' },
  { language: 'Hinglish', langCode: 'hinglish', transcript: 'save karo', expectedIntent: 'CONFIRM_UPDATE', description: 'Confirm and save' },
  { language: 'Hinglish', langCode: 'hinglish', transcript: 'wapas jao', expectedIntent: 'GO_BACK', description: 'Go back' },
  { language: 'Hinglish', langCode: 'hinglish', transcript: 'logout karo', expectedIntent: 'LOGOUT', description: 'User logout' },

  // ==========================================
  // 4. MARATHI (mr)
  // ==========================================
  { language: 'Marathi', langCode: 'mr', transcript: 'मराठी भाषा निवडा', expectedIntent: 'SELECT_LANGUAGE_MR', description: 'Language switch to Marathi' },
  { language: 'Marathi', langCode: 'mr', transcript: 'डॉक्टर निवडा', expectedIntent: 'SELECT_ROLE_DOCTOR', description: 'Doctor role selection' },
  { language: 'Marathi', langCode: 'mr', transcript: 'रुग्ण पोर्टल', expectedIntent: 'SELECT_ROLE_PATIENT', description: 'Patient role selection' },
  { language: 'Marathi', langCode: 'mr', transcript: 'लॉगिन करा', expectedIntent: 'OPEN_LOGIN', description: 'Open login screen' },
  { language: 'Marathi', langCode: 'mr', transcript: 'नोंदणी करा', expectedIntent: 'OPEN_REGISTER', description: 'Open registration screen' },
  { language: 'Marathi', langCode: 'mr', transcript: 'रेकॉर्डिंग सुरू करा', expectedIntent: 'START_RECORDING', description: 'Start recording' },
  { language: 'Marathi', langCode: 'mr', transcript: 'रेकॉर्डिंग थांबवा', expectedIntent: 'STOP_RECORDING', description: 'Stop recording' },
  { language: 'Marathi', langCode: 'mr', transcript: 'सारांश दाखवा', expectedIntent: 'VIEW_SUMMARY', description: 'View summary' },
  { language: 'Marathi', langCode: 'mr', transcript: 'वाचून दाखवा', expectedIntent: 'READ_SUMMARY', description: 'Read summary aloud' },
  { language: 'Marathi', langCode: 'mr', transcript: 'बदल करा', expectedIntent: 'EDIT_BY_VOICE', description: 'Voice correction mode' },
  { language: 'Marathi', langCode: 'mr', transcript: 'खात्री करा आणि जतन करा', expectedIntent: 'CONFIRM_UPDATE', description: 'Confirm and save' },
  { language: 'Marathi', langCode: 'mr', transcript: 'वैद्यकीय इतिहास', expectedIntent: 'OPEN_TIMELINE', description: 'Open medical timeline' },
  { language: 'Marathi', langCode: 'mr', transcript: 'माझी माहिती उघडा', expectedIntent: 'OPEN_PROFILE', description: 'Open profile settings' },
  { language: 'Marathi', langCode: 'mr', transcript: 'डॉक्टर जोडा', expectedIntent: 'CONNECT_DOCTOR', description: 'Connect doctor' },
  { language: 'Marathi', langCode: 'mr', transcript: 'रुग्णांची यादी', expectedIntent: 'VIEW_PATIENTS', description: 'Doctor view patient list' },
  { language: 'Marathi', langCode: 'mr', transcript: 'मूलभूत सल्ला', expectedIntent: 'BASELINE_CONSULTATION', description: 'Doctor baseline consultation' },
  { language: 'Marathi', langCode: 'mr', transcript: 'आरोग्य बदल', expectedIntent: 'HEALTH_CHANGE_BRIEF', description: 'Doctor health change brief' },
  { language: 'Marathi', langCode: 'mr', transcript: 'तुलना करा', expectedIntent: 'COMPARE_RECORDS', description: 'Compare records' },
  { language: 'Marathi', langCode: 'mr', transcript: 'मागे जा', expectedIntent: 'GO_BACK', description: 'Navigation go back' },
  { language: 'Marathi', langCode: 'mr', transcript: 'लॉगआउट करा', expectedIntent: 'LOGOUT', description: 'User logout' },

  // ==========================================
  // 5. BENGALI (bn)
  // ==========================================
  { language: 'Bengali', langCode: 'bn', transcript: 'বাংলা ভাষা নির্বাচন করুন', expectedIntent: 'SELECT_LANGUAGE_BN', description: 'Language switch to Bengali' },
  { language: 'Bengali', langCode: 'bn', transcript: 'ডাক্তার লগইন', expectedIntent: 'SELECT_ROLE_DOCTOR', description: 'Doctor role selection' },
  { language: 'Bengali', langCode: 'bn', transcript: 'রোগী পোর্টাল', expectedIntent: 'SELECT_ROLE_PATIENT', description: 'Patient role selection' },
  { language: 'Bengali', langCode: 'bn', transcript: 'লগইন করুন', expectedIntent: 'OPEN_LOGIN', description: 'Open login screen' },
  { language: 'Bengali', langCode: 'bn', transcript: 'নতুন নিবন্ধন করুন', expectedIntent: 'OPEN_REGISTER', description: 'Open registration screen' },
  { language: 'Bengali', langCode: 'bn', transcript: 'রেকর্ডিং শুরু করুন', expectedIntent: 'START_RECORDING', description: 'Start recording' },
  { language: 'Bengali', langCode: 'bn', transcript: 'রেকর্ডিং বন্ধ করুন', expectedIntent: 'STOP_RECORDING', description: 'Stop recording' },
  { language: 'Bengali', langCode: 'bn', transcript: 'সারাংশ দেখুন', expectedIntent: 'VIEW_SUMMARY', description: 'View summary' },
  { language: 'Bengali', langCode: 'bn', transcript: 'পড়ে শোনান', expectedIntent: 'READ_SUMMARY', description: 'Read summary aloud' },
  { language: 'Bengali', langCode: 'bn', transcript: 'সংশোধন করুন', expectedIntent: 'EDIT_BY_VOICE', description: 'Edit by voice' },
  { language: 'Bengali', langCode: 'bn', transcript: 'নিশ্চিত করুন এবং সংরক্ষণ করুন', expectedIntent: 'CONFIRM_UPDATE', description: 'Confirm and save' },
  { language: 'Bengali', langCode: 'bn', transcript: 'চিকিৎসা সময়রেখা', expectedIntent: 'OPEN_TIMELINE', description: 'Open timeline' },
  { language: 'Bengali', langCode: 'bn', transcript: 'প্রোফাইল সেটিংস', expectedIntent: 'OPEN_PROFILE', description: 'Open profile' },
  { language: 'Bengali', langCode: 'bn', transcript: 'ডাক্তারের সাথে সংযোগ', expectedIntent: 'CONNECT_DOCTOR', description: 'Connect doctor' },
  { language: 'Bengali', langCode: 'bn', transcript: 'রোগীদের তালিকা', expectedIntent: 'VIEW_PATIENTS', description: 'Doctor view patient list' },
  { language: 'Bengali', langCode: 'bn', transcript: 'প্রাথমিক পরামর্শ', expectedIntent: 'BASELINE_CONSULTATION', description: 'Doctor baseline consultation' },
  { language: 'Bengali', langCode: 'bn', transcript: 'স্বাস্থ্য পরিবর্তন', expectedIntent: 'HEALTH_CHANGE_BRIEF', description: 'Health change brief' },
  { language: 'Bengali', langCode: 'bn', transcript: 'তুলনা দেখুন', expectedIntent: 'COMPARE_RECORDS', description: 'Compare records' },
  { language: 'Bengali', langCode: 'bn', transcript: 'ফিরে যান', expectedIntent: 'GO_BACK', description: 'Go back' },
  { language: 'Bengali', langCode: 'bn', transcript: 'লগআউট করুন', expectedIntent: 'LOGOUT', description: 'User logout' },

  // ==========================================
  // 6. TAMIL (ta)
  // ==========================================
  { language: 'Tamil', langCode: 'ta', transcript: 'தமிழ் மொழிக்கு மாற்று', expectedIntent: 'SELECT_LANGUAGE_TA', description: 'Language switch to Tamil' },
  { language: 'Tamil', langCode: 'ta', transcript: 'மருத்துவர் தேர்வு', expectedIntent: 'SELECT_ROLE_DOCTOR', description: 'Doctor role selection' },
  { language: 'Tamil', langCode: 'ta', transcript: 'நோயாளி போர்டல்', expectedIntent: 'SELECT_ROLE_PATIENT', description: 'Patient role selection' },
  { language: 'Tamil', langCode: 'ta', transcript: 'உள்நுழைக', expectedIntent: 'OPEN_LOGIN', description: 'Open login screen' },
  { language: 'Tamil', langCode: 'ta', transcript: 'பதிவு செய்க', expectedIntent: 'OPEN_REGISTER', description: 'Open registration screen' },
  { language: 'Tamil', langCode: 'ta', transcript: 'பதிவு தொடங்கு', expectedIntent: 'START_RECORDING', description: 'Start recording' },
  { language: 'Tamil', langCode: 'ta', transcript: 'பதிவு நிறுத்து', expectedIntent: 'STOP_RECORDING', description: 'Stop recording' },
  { language: 'Tamil', langCode: 'ta', transcript: 'சுருக்கத்தைக் காட்டு', expectedIntent: 'VIEW_SUMMARY', description: 'View summary' },
  { language: 'Tamil', langCode: 'ta', transcript: 'வாசித்துக் காட்டு', expectedIntent: 'READ_SUMMARY', description: 'Read summary aloud' },
  { language: 'Tamil', langCode: 'ta', transcript: 'திருத்தம் செய்', expectedIntent: 'EDIT_BY_VOICE', description: 'Edit by voice' },
  { language: 'Tamil', langCode: 'ta', transcript: 'உறுதிப்படுத்து மற்றும் சேமி', expectedIntent: 'CONFIRM_UPDATE', description: 'Confirm and save' },
  { language: 'Tamil', langCode: 'ta', transcript: 'மருத்துவ காலவரிசை', expectedIntent: 'OPEN_TIMELINE', description: 'Open timeline' },
  { language: 'Tamil', langCode: 'ta', transcript: 'சுயவிவரம்', expectedIntent: 'OPEN_PROFILE', description: 'Open profile' },
  { language: 'Tamil', langCode: 'ta', transcript: 'மருத்துவர் இணைப்பு', expectedIntent: 'CONNECT_DOCTOR', description: 'Connect doctor' },
  { language: 'Tamil', langCode: 'ta', transcript: 'நோயாளிகள் பட்டியல்', expectedIntent: 'VIEW_PATIENTS', description: 'Doctor view patient list' },
  { language: 'Tamil', langCode: 'ta', transcript: 'ஆரம்ப ஆலோசனை', expectedIntent: 'BASELINE_CONSULTATION', description: 'Doctor baseline consultation' },
  { language: 'Tamil', langCode: 'ta', transcript: 'சுகாதார மாற்றம்', expectedIntent: 'HEALTH_CHANGE_BRIEF', description: 'Health change brief' },
  { language: 'Tamil', langCode: 'ta', transcript: 'ஒப்பீடு செய்', expectedIntent: 'COMPARE_RECORDS', description: 'Compare records' },
  { language: 'Tamil', langCode: 'ta', transcript: 'பின்னே செல்', expectedIntent: 'GO_BACK', description: 'Go back' },
  { language: 'Tamil', langCode: 'ta', transcript: 'வெளியேறு', expectedIntent: 'LOGOUT', description: 'User logout' },

  // ==========================================
  // 7. TELUGU (te)
  // ==========================================
  { language: 'Telugu', langCode: 'te', transcript: 'తెలుగు భాష ఎంచుకోండి', expectedIntent: 'SELECT_LANGUAGE_TE', description: 'Language switch to Telugu' },
  { language: 'Telugu', langCode: 'te', transcript: 'వైద్యుడు ఎంపిక', expectedIntent: 'SELECT_ROLE_DOCTOR', description: 'Doctor role selection' },
  { language: 'Telugu', langCode: 'te', transcript: 'రోగి పోర్టల్', expectedIntent: 'SELECT_ROLE_PATIENT', description: 'Patient role selection' },
  { language: 'Telugu', langCode: 'te', transcript: 'లాగిన్ చేయండి', expectedIntent: 'OPEN_LOGIN', description: 'Open login screen' },
  { language: 'Telugu', langCode: 'te', transcript: 'నమోదు చేయండి', expectedIntent: 'OPEN_REGISTER', description: 'Open registration screen' },
  { language: 'Telugu', langCode: 'te', transcript: 'రికార్డింగ్ ప్రారంభించు', expectedIntent: 'START_RECORDING', description: 'Start recording' },
  { language: 'Telugu', langCode: 'te', transcript: 'రికార్డింగ్ ఆపు', expectedIntent: 'STOP_RECORDING', description: 'Stop recording' },
  { language: 'Telugu', langCode: 'te', transcript: 'సారాంశం చూడండి', expectedIntent: 'VIEW_SUMMARY', description: 'View summary' },
  { language: 'Telugu', langCode: 'te', transcript: 'చదివి వినిపించండి', expectedIntent: 'READ_SUMMARY', description: 'Read aloud' },
  { language: 'Telugu', langCode: 'te', transcript: 'సవరించండి', expectedIntent: 'EDIT_BY_VOICE', description: 'Edit by voice' },
  { language: 'Telugu', langCode: 'te', transcript: 'ధృవీకరించు మరియు సేవ్ చేయండి', expectedIntent: 'CONFIRM_UPDATE', description: 'Confirm and save' },
  { language: 'Telugu', langCode: 'te', transcript: 'వైద్య కాలక్రమం', expectedIntent: 'OPEN_TIMELINE', description: 'Open timeline' },
  { language: 'Telugu', langCode: 'te', transcript: 'ప్రొఫైల్ తెరవండి', expectedIntent: 'OPEN_PROFILE', description: 'Open profile' },
  { language: 'Telugu', langCode: 'te', transcript: 'వైద్యుడిని కనెక్ట్ చేయండి', expectedIntent: 'CONNECT_DOCTOR', description: 'Connect doctor' },
  { language: 'Telugu', langCode: 'te', transcript: 'రోగుల జాబితా', expectedIntent: 'VIEW_PATIENTS', description: 'Doctor view patient list' },
  { language: 'Telugu', langCode: 'te', transcript: 'ప్రాథమిక సంప్రదింపులు', expectedIntent: 'BASELINE_CONSULTATION', description: 'Doctor baseline' },
  { language: 'Telugu', langCode: 'te', transcript: 'ఆరోగ్య మార్పులు', expectedIntent: 'HEALTH_CHANGE_BRIEF', description: 'Health change brief' },
  { language: 'Telugu', langCode: 'te', transcript: 'పోల్చి చూడండి', expectedIntent: 'COMPARE_RECORDS', description: 'Compare records' },
  { language: 'Telugu', langCode: 'te', transcript: 'వెనక్కి వెళ్ళు', expectedIntent: 'GO_BACK', description: 'Go back' },
  { language: 'Telugu', langCode: 'te', transcript: 'లాగౌట్ చేయండి', expectedIntent: 'LOGOUT', description: 'User logout' },

  // ==========================================
  // 8. GUJARATI (gu)
  // ==========================================
  { language: 'Gujarati', langCode: 'gu', transcript: 'ગુજરાતી ભાષા પસંદ કરો', expectedIntent: 'SELECT_LANGUAGE_GU', description: 'Language switch to Gujarati' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'ડોક્ટર પસંદ કરો', expectedIntent: 'SELECT_ROLE_DOCTOR', description: 'Doctor role selection' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'દર્દી પોર્ટલ', expectedIntent: 'SELECT_ROLE_PATIENT', description: 'Patient role selection' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'લૉગિન કરો', expectedIntent: 'OPEN_LOGIN', description: 'Open login screen' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'નોંધણી કરો', expectedIntent: 'OPEN_REGISTER', description: 'Open registration screen' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'રેકોર્ડિંગ શરૂ કરો', expectedIntent: 'START_RECORDING', description: 'Start recording' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'રેકોર્ડિંગ બંધ કરો', expectedIntent: 'STOP_RECORDING', description: 'Stop recording' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'સારાંશ જુઓ', expectedIntent: 'VIEW_SUMMARY', description: 'View summary' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'વાંચી સંભળાવો', expectedIntent: 'READ_SUMMARY', description: 'Read summary aloud' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'સુધારો કરો', expectedIntent: 'EDIT_BY_VOICE', description: 'Edit by voice' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'ખાતરી કરો અને સાચવો', expectedIntent: 'CONFIRM_UPDATE', description: 'Confirm and save' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'તબીબી સમયરેખા', expectedIntent: 'OPEN_TIMELINE', description: 'Open timeline' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'પ્રોફાઇલ ખોલો', expectedIntent: 'OPEN_PROFILE', description: 'Open profile' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'ડૉક્ટર સાથે જોડાઓ', expectedIntent: 'CONNECT_DOCTOR', description: 'Connect doctor' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'દર્દીઓની યાદી', expectedIntent: 'VIEW_PATIENTS', description: 'Doctor view patient list' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'પ્રારંભિક સલાહ', expectedIntent: 'BASELINE_CONSULTATION', description: 'Doctor baseline' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'આરોગ્ય ફેરફાર', expectedIntent: 'HEALTH_CHANGE_BRIEF', description: 'Health change brief' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'સરખામણી કરો', expectedIntent: 'COMPARE_RECORDS', description: 'Compare records' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'પાછા જાઓ', expectedIntent: 'GO_BACK', description: 'Go back' },
  { language: 'Gujarati', langCode: 'gu', transcript: 'લૉગઆઉટ કરો', expectedIntent: 'LOGOUT', description: 'User logout' },

  // ==========================================
  // 9. KANNADA (kn)
  // ==========================================
  { language: 'Kannada', langCode: 'kn', transcript: 'ಕನ್ನಡ ಭಾಷೆ ಆಯ್ಕೆ ಮಾಡಿ', expectedIntent: 'SELECT_LANGUAGE_KN', description: 'Language switch to Kannada' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ವೈದ್ಯರು ಆಯ್ಕೆ', expectedIntent: 'SELECT_ROLE_DOCTOR', description: 'Doctor role selection' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ರೋಗಿ ಪೋರ್ಟಲ್', expectedIntent: 'SELECT_ROLE_PATIENT', description: 'Patient role selection' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ಲಾಗಿನ್ ಮಾಡಿ', expectedIntent: 'OPEN_LOGIN', description: 'Open login screen' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ನೋಂದಣಿ ಮಾಡಿ', expectedIntent: 'OPEN_REGISTER', description: 'Open registration screen' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ರೆಕಾರ್ಡಿಂಗ್ ಪ್ರಾರಂಭಿಸಿ', expectedIntent: 'START_RECORDING', description: 'Start recording' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ರೆಕಾರ್ಡಿಂಗ್ ನಿಲ್ಲಿಸಿ', expectedIntent: 'STOP_RECORDING', description: 'Stop recording' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ಸಾರಾಂಶ ನೋಡಿ', expectedIntent: 'VIEW_SUMMARY', description: 'View summary' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ಓದಿ ಹೇಳಿ', expectedIntent: 'READ_SUMMARY', description: 'Read summary aloud' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ತಿದ್ದುಪಡಿ ಮಾಡಿ', expectedIntent: 'EDIT_BY_VOICE', description: 'Edit by voice' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ಖಚಿತಪಡಿಸಿ ಮತ್ತು ಉಳಿಸಿ', expectedIntent: 'CONFIRM_UPDATE', description: 'Confirm and save' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ವೈದ್ಯಕೀಯ ಸಮಯರೇಖೆ', expectedIntent: 'OPEN_TIMELINE', description: 'Open timeline' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ಪ್ರೊಫೈಲ್ ತೆರೆಯಿರಿ', expectedIntent: 'OPEN_PROFILE', description: 'Open profile' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ', expectedIntent: 'CONNECT_DOCTOR', description: 'Connect doctor' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ರೋಗಿಗಳ ಪಟ್ಟಿ', expectedIntent: 'VIEW_PATIENTS', description: 'Doctor view patient list' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ಆರಂಭಿಕ ಸಮಾಲೋಚನೆ', expectedIntent: 'BASELINE_CONSULTATION', description: 'Doctor baseline' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ಆರೋಗ್ಯ ಬದಲಾವಣೆ', expectedIntent: 'HEALTH_CHANGE_BRIEF', description: 'Health change brief' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ಹೋಲಿಸಿ ನೋಡಿ', expectedIntent: 'COMPARE_RECORDS', description: 'Compare records' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ಹಿಂದೆ ಹೋಗಿ', expectedIntent: 'GO_BACK', description: 'Go back' },
  { language: 'Kannada', langCode: 'kn', transcript: 'ಲಾಗ್‌ಔಟ್ ಮಾಡಿ', expectedIntent: 'LOGOUT', description: 'User logout' },

  // ==========================================
  // 10. MALAYALAM (ml)
  // ==========================================
  { language: 'Malayalam', langCode: 'ml', transcript: 'മലയാളം ഭാഷ തിരഞ്ഞെടുക്കുക', expectedIntent: 'SELECT_LANGUAGE_ML', description: 'Language switch to Malayalam' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'ഡോക്ടർ തിരഞ്ഞെടുക്കുക', expectedIntent: 'SELECT_ROLE_DOCTOR', description: 'Doctor role selection' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'രോഗി പോർട്ടൽ', expectedIntent: 'SELECT_ROLE_PATIENT', description: 'Patient role selection' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'ലോഗിൻ ചെയ്യുക', expectedIntent: 'OPEN_LOGIN', description: 'Open login screen' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'രജിസ്റ്റർ ചെയ്യുക', expectedIntent: 'OPEN_REGISTER', description: 'Open registration screen' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'റെക്കോർഡിംഗ് ആരംഭിക്കുക', expectedIntent: 'START_RECORDING', description: 'Start recording' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'റെക്കോർഡിംഗ് നിർത്തുക', expectedIntent: 'STOP_RECORDING', description: 'Stop recording' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'സംഗ്രഹം കാണുക', expectedIntent: 'VIEW_SUMMARY', description: 'View summary' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'വായിച്ചു കേൾപ്പിക്കുക', expectedIntent: 'READ_SUMMARY', description: 'Read aloud' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'തിരുത്തുക', expectedIntent: 'EDIT_BY_VOICE', description: 'Edit by voice' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'ഉറപ്പാക്കുക സംരക്ഷിക്കുക', expectedIntent: 'CONFIRM_UPDATE', description: 'Confirm and save' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'ചികിത്സാ ടൈംലൈൻ', expectedIntent: 'OPEN_TIMELINE', description: 'Open timeline' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'പ്രൊഫൈൽ തുറക്കുക', expectedIntent: 'OPEN_PROFILE', description: 'Open profile' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'ഡോക്ടറെ ബന്ധിപ്പിക്കുക', expectedIntent: 'CONNECT_DOCTOR', description: 'Connect doctor' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'രോഗികളുടെ പട്ടിക', expectedIntent: 'VIEW_PATIENTS', description: 'Doctor view patient list' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'പ്രാഥമിക കൺസൾട്ടേഷൻ', expectedIntent: 'BASELINE_CONSULTATION', description: 'Doctor baseline' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'ആരോഗ്യ മാറ്റം', expectedIntent: 'HEALTH_CHANGE_BRIEF', description: 'Health change brief' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'താരതമ്യം ചെയ്യുക', expectedIntent: 'COMPARE_RECORDS', description: 'Compare records' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'പിന്നോട്ട് പോകുക', expectedIntent: 'GO_BACK', description: 'Go back' },
  { language: 'Malayalam', langCode: 'ml', transcript: 'ലോഗ്ഔട്ട് ചെയ്യുക', expectedIntent: 'LOGOUT', description: 'User logout' },

  // ==========================================
  // 11. PUNJABI (pa)
  // ==========================================
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਪੰਜਾਬੀ ਭਾਸ਼ਾ ਚੁਣੋ', expectedIntent: 'SELECT_LANGUAGE_PA', description: 'Language switch to Punjabi' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਡਾਕਟਰ ਪੋਰਟਲ', expectedIntent: 'SELECT_ROLE_DOCTOR', description: 'Doctor role selection' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਮਰੀਜ਼ ਪੋਰਟਲ', expectedIntent: 'SELECT_ROLE_PATIENT', description: 'Patient role selection' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਲਾਗਇਨ ਕਰੋ', expectedIntent: 'OPEN_LOGIN', description: 'Open login screen' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਰਜਿਸਟਰ ਕਰੋ', expectedIntent: 'OPEN_REGISTER', description: 'Open registration screen' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਰਿਕਾਰਡਿੰਗ ਸ਼ੁਰੂ ਕਰੋ', expectedIntent: 'START_RECORDING', description: 'Start recording' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਰਿਕਾਰਡਿੰਗ ਰੋਕੋ', expectedIntent: 'STOP_RECORDING', description: 'Stop recording' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਸਾਰ ਵੇਖੋ', expectedIntent: 'VIEW_SUMMARY', description: 'View summary' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਪੜ੍ਹ ਕੇ ਸੁਣਾਓ', expectedIntent: 'READ_SUMMARY', description: 'Read summary aloud' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਸੋਧ ਕਰੋ', expectedIntent: 'EDIT_BY_VOICE', description: 'Edit by voice' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਪੁਸ਼ਟੀ ਕਰੋ ਅਤੇ ਸੰਭਾਲੋ', expectedIntent: 'CONFIRM_UPDATE', description: 'Confirm and save' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਮੈਡੀਕਲ ਟਾਈਮਲਾਈਨ', expectedIntent: 'OPEN_TIMELINE', description: 'Open timeline' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਪ੍ਰੋਫਾਈਲ ਖੋਲ੍ਹੋ', expectedIntent: 'OPEN_PROFILE', description: 'Open profile' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਡਾਕਟਰ ਨਾਲ ਜੁੜੋ', expectedIntent: 'CONNECT_DOCTOR', description: 'Connect doctor' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਮਰੀਜ਼ਾਂ ਦੀ ਸੂਚੀ', expectedIntent: 'VIEW_PATIENTS', description: 'Doctor view patient list' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਮੁੱਢਲੀ ਸਲਾਹ', expectedIntent: 'BASELINE_CONSULTATION', description: 'Doctor baseline' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਸਿਹਤ ਤਬਦੀਲੀ', expectedIntent: 'HEALTH_CHANGE_BRIEF', description: 'Health change brief' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਤੁਲਨਾ ਕਰੋ', expectedIntent: 'COMPARE_RECORDS', description: 'Compare records' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਪਿੱਛੇ ਜਾਓ', expectedIntent: 'GO_BACK', description: 'Go back' },
  { language: 'Punjabi', langCode: 'pa', transcript: 'ਲੌਗਆਊਟ ਕਰੋ', expectedIntent: 'LOGOUT', description: 'User logout' },

  // ==========================================
  // 12. ODIA (or)
  // ==========================================
  { language: 'Odia', langCode: 'or', transcript: 'ଓଡ଼ିଆ ଭାଷା ବାଛନ୍ତୁ', expectedIntent: 'SELECT_LANGUAGE_OR', description: 'Language switch to Odia' },
  { language: 'Odia', langCode: 'or', transcript: 'ଡାକ୍ତର ପୋର୍ଟାଲ୍', expectedIntent: 'SELECT_ROLE_DOCTOR', description: 'Doctor role selection' },
  { language: 'Odia', langCode: 'or', transcript: 'ରୋଗୀ ପୋର୍ଟାଲ୍', expectedIntent: 'SELECT_ROLE_PATIENT', description: 'Patient role selection' },
  { language: 'Odia', langCode: 'or', transcript: 'ଲଗଇନ୍ କରନ୍ତୁ', expectedIntent: 'OPEN_LOGIN', description: 'Open login screen' },
  { language: 'Odia', langCode: 'or', transcript: 'ପଞ୍ଜୀକରଣ କରନ୍ତୁ', expectedIntent: 'OPEN_REGISTER', description: 'Open registration screen' },
  { language: 'Odia', langCode: 'or', transcript: 'ରେକର୍ଡିଂ ଆରମ୍ଭ କରନ୍ତୁ', expectedIntent: 'START_RECORDING', description: 'Start recording' },
  { language: 'Odia', langCode: 'or', transcript: 'ରେକର୍ଡିଂ ବନ୍ଦ କରନ୍ତୁ', expectedIntent: 'STOP_RECORDING', description: 'Stop recording' },
  { language: 'Odia', langCode: 'or', transcript: 'ସାରାଂଶ ଦେଖନ୍ତୁ', expectedIntent: 'VIEW_SUMMARY', description: 'View summary' },
  { language: 'Odia', langCode: 'or', transcript: 'ପଢ଼ି ଶୁଣାନ୍ତୁ', expectedIntent: 'READ_SUMMARY', description: 'Read summary aloud' },
  { language: 'Odia', langCode: 'or', transcript: 'ସଂଶୋଧନ କରନ୍ତୁ', expectedIntent: 'EDIT_BY_VOICE', description: 'Edit by voice' },
  { language: 'Odia', langCode: 'or', transcript: 'ନିଶ୍ଚିତ କରନ୍ତୁ ଏବଂ ସାଇତି ରଖନ୍ତୁ', expectedIntent: 'CONFIRM_UPDATE', description: 'Confirm and save' },
  { language: 'Odia', langCode: 'or', transcript: 'ଡାକ୍ତରୀ ସମୟରେଖା', expectedIntent: 'OPEN_TIMELINE', description: 'Open timeline' },
  { language: 'Odia', langCode: 'or', transcript: 'ପ୍ରୋଫାଇଲ୍ ଖୋଲନ୍ତୁ', expectedIntent: 'OPEN_PROFILE', description: 'Open profile' },
  { language: 'Odia', langCode: 'or', transcript: 'ଡାକ୍ତରଙ୍କ ସହ ଯୋଡ଼ନ୍ତୁ', expectedIntent: 'CONNECT_DOCTOR', description: 'Connect doctor' },
  { language: 'Odia', langCode: 'or', transcript: 'ରୋଗୀ ତାଲିକା', expectedIntent: 'VIEW_PATIENTS', description: 'Doctor view patient list' },
  { language: 'Odia', langCode: 'or', transcript: 'ପ୍ରାରମ୍ଭିକ ପରାମର୍ଶ', expectedIntent: 'BASELINE_CONSULTATION', description: 'Doctor baseline' },
  { language: 'Odia', langCode: 'or', transcript: 'ସ୍ୱାସ୍ଥ୍ୟ ପରିବର୍ତ୍ତନ', expectedIntent: 'HEALTH_CHANGE_BRIEF', description: 'Health change brief' },
  { language: 'Odia', langCode: 'or', transcript: 'ତୁଳନା କରନ୍ତୁ', expectedIntent: 'COMPARE_RECORDS', description: 'Compare records' },
  { language: 'Odia', langCode: 'or', transcript: 'ପଛକୁ ଯାଆନ୍ତୁ', expectedIntent: 'GO_BACK', description: 'Go back' },
  { language: 'Odia', langCode: 'or', transcript: 'ଲଗଆଉଟ୍ କରନ୍ତୁ', expectedIntent: 'LOGOUT', description: 'User logout' },

  // ==========================================
  // 13. ASSAMESE (as)
  // ==========================================
  { language: 'Assamese', langCode: 'as', transcript: 'অসমীয়া ভাষা নিৰ্বাচন কৰক', expectedIntent: 'SELECT_LANGUAGE_AS', description: 'Language switch to Assamese' },
  { language: 'Assamese', langCode: 'as', transcript: 'চিকিৎসক নিৰ্বাচন', expectedIntent: 'SELECT_ROLE_DOCTOR', description: 'Doctor role selection' },
  { language: 'Assamese', langCode: 'as', transcript: 'ৰোগী প\'ৰ্টেল', expectedIntent: 'SELECT_ROLE_PATIENT', description: 'Patient role selection' },
  { language: 'Assamese', langCode: 'as', transcript: 'লগইন কৰক', expectedIntent: 'OPEN_LOGIN', description: 'Open login screen' },
  { language: 'Assamese', langCode: 'as', transcript: 'পঞ্জীয়ন কৰক', expectedIntent: 'OPEN_REGISTER', description: 'Open registration screen' },
  { language: 'Assamese', langCode: 'as', transcript: 'ৰেকৰ্ডিং আৰম্ভ কৰক', expectedIntent: 'START_RECORDING', description: 'Start recording' },
  { language: 'Assamese', langCode: 'as', transcript: 'ৰেকৰ্ডিং বন্ধ কৰক', expectedIntent: 'STOP_RECORDING', description: 'Stop recording' },
  { language: 'Assamese', langCode: 'as', transcript: 'সাৰাংশ চাওক', expectedIntent: 'VIEW_SUMMARY', description: 'View summary' },
  { language: 'Assamese', langCode: 'as', transcript: 'পঢ়ি শুনাক', expectedIntent: 'READ_SUMMARY', description: 'Read summary aloud' },
  { language: 'Assamese', langCode: 'as', transcript: 'সংশোধন কৰক', expectedIntent: 'EDIT_BY_VOICE', description: 'Edit by voice' },
  { language: 'Assamese', langCode: 'as', transcript: 'নিশ্চিত কৰক আৰু সংৰক্ষণ কৰক', expectedIntent: 'CONFIRM_UPDATE', description: 'Confirm and save' },
  { language: 'Assamese', langCode: 'as', transcript: 'চিকিৎসাৰ সময়ৰেখা', expectedIntent: 'OPEN_TIMELINE', description: 'Open timeline' },
  { language: 'Assamese', langCode: 'as', transcript: 'প্ৰফাইল খোলক', expectedIntent: 'OPEN_PROFILE', description: 'Open profile' },
  { language: 'Assamese', langCode: 'as', transcript: 'চিকিৎসকৰ সৈতে সংযোগ', expectedIntent: 'CONNECT_DOCTOR', description: 'Connect doctor' },
  { language: 'Assamese', langCode: 'as', transcript: 'ৰোগীৰ তালিকা', expectedIntent: 'VIEW_PATIENTS', description: 'Doctor view patient list' },
  { language: 'Assamese', langCode: 'as', transcript: 'প্ৰাৰম্ভিক পৰামৰ্শ', expectedIntent: 'BASELINE_CONSULTATION', description: 'Doctor baseline' },
  { language: 'Assamese', langCode: 'as', transcript: 'স্বাস্থ্য পৰিৱৰ্তন', expectedIntent: 'HEALTH_CHANGE_BRIEF', description: 'Health change brief' },
  { language: 'Assamese', langCode: 'as', transcript: 'তুলনা কৰক', expectedIntent: 'COMPARE_RECORDS', description: 'Compare records' },
  { language: 'Assamese', langCode: 'as', transcript: 'উভতি যাওক', expectedIntent: 'GO_BACK', description: 'Go back' },
  { language: 'Assamese', langCode: 'as', transcript: 'লগআউট কৰক', expectedIntent: 'LOGOUT', description: 'User logout' },

  // ==========================================
  // 14. SECURITY & FORM DICTATION TESTS
  // ==========================================
  { language: 'Security', langCode: 'en', transcript: 'my secret password 1234', expectedIntent: 'REJECT_SENSITIVE_FIELD', description: 'Block password dictation in password field', field: 'password' },
  { language: 'Security', langCode: 'en', transcript: 'userPassword987', expectedIntent: 'REJECT_SENSITIVE_FIELD', description: 'Block password dictation in userPassword field', field: 'userPassword' },
  { language: 'Dictation', langCode: 'en', transcript: 'John Doe', expectedIntent: 'FILL_FIELD', description: 'Allow name dictation in non-sensitive field', field: 'patientName' },
  { language: 'Dictation', langCode: 'mr', transcript: 'रमेश जोशी', expectedIntent: 'FILL_FIELD', description: 'Allow Marathi name dictation in name field', field: 'fullName' },
];

export function runMultilingualVoiceTests() {
  console.log('======================================================================');
  console.log('VOICEFLOW MULTILINGUAL VOICE COMMAND ENGINE VERIFICATION MATRIX (13 LANGUAGES)');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;
  const resultsByLanguage: Record<string, { total: number; passed: number; failed: number }> = {};

  for (const tc of TEST_CASES) {
    if (!resultsByLanguage[tc.language]) {
      resultsByLanguage[tc.language] = { total: 0, passed: 0, failed: 0 };
    }
    resultsByLanguage[tc.language].total++;

    const action = parseVoiceCommand(tc.transcript, tc.field);
    const feedback = getSpokenFeedbackForIntent(action.intent, tc.langCode);

    const isIntentMatch = action.intent === tc.expectedIntent;
    const hasFeedback = Boolean(feedback && feedback.trim().length > 0);
    const testPassed = isIntentMatch && hasFeedback;

    if (testPassed) {
      passed++;
      resultsByLanguage[tc.language].passed++;
    } else {
      failed++;
      resultsByLanguage[tc.language].failed++;
      console.error(`FAILED: [${tc.language}] "${tc.transcript}"`);
      console.error(`   Expected: ${tc.expectedIntent}`);
      console.error(`   Actual:   ${action.intent}`);
      console.error(`   Feedback: ${feedback}\n`);
    }
  }

  console.log('----------------------------------------------------------------------');
  console.log('LANGUAGE BREAKDOWN');
  console.log('----------------------------------------------------------------------');
  for (const [lang, stats] of Object.entries(resultsByLanguage)) {
    const status = stats.failed === 0 ? 'PASS (100%)' : `FAIL (${stats.failed} failed)`;
    console.log(`- ${lang.padEnd(14)} : ${stats.passed}/${stats.total} tests passed -> ${status}`);
  }

  console.log('----------------------------------------------------------------------');
  console.log(`TOTAL TESTS: ${TEST_CASES.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('======================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} tests failed in Multilingual Voice Command Engine verification.`);
  }

  return { total: TEST_CASES.length, passed, failed, resultsByLanguage };
}

// If executed directly
runMultilingualVoiceTests();
