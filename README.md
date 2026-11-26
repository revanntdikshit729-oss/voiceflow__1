# VoiceFlow – Speak Naturally. Get Understood Medically.

A voice-first, multilingual healthcare platform designed for Indian patients and doctors.

## 🩺 Overview

VoiceFlow enables patients to communicate health updates naturally using speech in **Hindi**, **Indian English**, and **Hinglish** (code-mixed). The application securely structures and summarizes their statements using Google's **Gemini 1.5 Flash API**, reads back the summary via Text-to-Speech (TTS), permits voice-based and text-based corrections, and commits updates to **Cloud Firestore** only upon explicit patient confirmation.

Authorized doctors receive a **Doctor's Memory Brief** and chronological comparison against their initial baseline consultation, surfacing improved, persistent, and newly reported symptoms in a 10-second glance.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, TypeScript, `@google/generative-ai`
- **Database & Auth**: Firebase Authentication & Cloud Firestore (Persistent, real backend services)
- **Security**: Granular Firebase Security Rules (`firestore.rules`) & role-based access control
- **Voice**: Web Speech API (`SpeechRecognition` / `SpeechSynthesis`) with manual text alternatives

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
# In client/
cd client
npm install

# In server/
cd ../server
npm install
```

### 2. Configure Environment Variables

#### Backend (`server/.env`):
Create `server/.env` (copied from `server/.env.example`):
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_from_ai_studio
```
> Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).

#### Frontend (`client/.env`):
Create `client/.env` (copied from `client/.env.example`):
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```
> Enable **Email/Password Auth** and **Cloud Firestore** in your [Firebase Console](https://console.firebase.google.com).

### 3. Deploy Firestore Security Rules
Deploy `firestore.rules` using the Firebase CLI or paste into the Firestore Rules tab:
```bash
firebase deploy --only firestore:rules
```

### 4. Run Development Servers
```bash
# Terminal 1: Start Backend Server (port 5000)
cd server
npm run dev

# Terminal 2: Start Frontend Client (port 5173)
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🧪 Testing and Verification

- **Client Production Build**:
  ```bash
  cd client && npm run build
  ```
  Verified: 0 TypeScript errors, bundle generated cleanly (`dist/`).

- **Server Compilation & API Integration Tests**:
  ```bash
  cd server && npm run build && node test-api.js
  ```
  Verified:
  - `GET /api/health` -> 200 OK
  - `POST /api/ai/process-health-update` -> Validation & error handling
  - `POST /api/ai/correct-health-update` -> Correction handling
  - `POST /api/ai/doctor-memory-brief` -> Memory brief validation

---

## 🔒 Medical Safety Guardrails

VoiceFlow is designed strictly as a clinical documentation assistant:
1. **No Autonomous Diagnoses**: The system does not diagnose conditions or prescribe medications.
2. **Preserve Patient Intent**: Nuances and uncertainties (e.g., *"shayad bukhar hai"*) are preserved without hallucination.
3. **Explicit Confirmation**: Spoken updates never enter the verified timeline until the patient reviews and clicks **Confirm & Save to Record**.
4. **Consent-Gated Doctor Access**: Doctors can access a patient's timeline only after explicit consent is granted by the patient.
