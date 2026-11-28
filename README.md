# VoiceFlow – Bharat Voice-First Healthcare Platform
### Built for the Scaler × Wispr Flow Hackathon: "India Runs on Voice"
**Track:** Healthcare & Social Impact | **Theme:** Voice-First Systems for Bharat

---

## 🇮🇳 Executive Summary

> **"India Runs on Voice, But Healthcare Still Runs on English-First Typing."**

Over 70% of India's 1.4 billion citizens communicate in vernacular languages and code-mixed dialects like **Hinglish**, **Tanglish**, and **Benglish**. For rural, elderly, and semi-literate patients, traditional English-first patient portals and typing-heavy apps create an insurmountable digital barrier.

Meanwhile, in overburdened Indian OPDs (Outpatient Departments), doctors examine 60–100 patients daily and spend over 40% of their consultation time typing EHR notes, leading to physician burnout and reduced patient engagement.

**VoiceFlow** transforms healthcare delivery across Bharat by replacing keyboards and complex portals with natural, conversational voice:
1. **For Patients:** Patients speak their symptoms and follow-ups naturally in any of **13 Indian languages** or conversational **Hinglish**. The platform listens, removes conversational filler words, triages critical emergency red flags, reads back a simplified audio summary, and commits updates to Cloud Firestore **only upon explicit patient confirmation**.
2. **For Illiterate & Elderly Patients ("Dawai Samjho"):** A one-click spoken prescription explainer that translates complex medical terminology and dosage instructions into clear vernacular audio with visual morning/afternoon/night pill schedules.
3. **For Doctors:** A hands-free **Wispr Clinical Dictation Pad** that converts spoken OPD notes into structured EHR baselines in seconds, alongside an instant **Longitudinal Symptom Trajectory Chart** and **10-Second Health Change Brief** comparing current status against baseline.

---

## 🏆 Key Wispr Flow Innovations & Hackathon Features

### 1. 🎙️ Wispr Conversational Voice Engine (`client/src/services/wisprFlowEngine.ts`)
- **Conversational Filter & Tone Normalization:** Indian speakers frequently use fillers like *"um"*, *"ah"*, *"matlab"*, *"toh"*, *"actually"*, *"bhaiya"*. VoiceFlow cleans these artifacts on-the-fly while preserving the core clinical meaning.
- **13 Indic Languages & Dialects:** Native speech recognition and natural text-to-speech support for Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, Indian English, and conversational Hinglish.

### 2. 🚨 Real-Time Emergency Red Flag Triage (`client/src/components/medical/EmergencyRedFlagModal.tsx`)
- Detects life-threatening symptoms directly from patient voice input (e.g., severe chest pain radiating to left arm, acute dyspnea, sudden facial drooping or limb paralysis, high fever with stiff neck, uncontrolled hemorrhage).
- Instantly halts standard processing and surfaces a high-priority emergency triage overlay with **direct 108 / 112 ambulance dial buttons** and nearest emergency room advisory.

### 3. 💊 "Dawai Samjho" – Vernacular Audio Prescription Explainer (`client/src/components/patient/PrescriptionExplainerModal.tsx`)
- Solves medicine non-adherence among rural and elderly patients who cannot read written English doctor prescriptions.
- Synthesizes doctor-approved treatment plans into spoken regional audio paired with intuitive visual icons (Breakfast 🌅, Lunch ☀️, Dinner 🌙, Bedtime 🛌).

### 4. 🩺 Doctor Hands-Free Dictation Pad (`client/src/components/doctor/DoctorVoicePrescriptionPad.tsx`)
- Eliminates keyboard entry in high-volume OPD clinics.
- Doctors dictate clinical findings naturally: *"Patient presenting with acute high-grade pyrexia since 2 days, sore throat, and severe myalgia. Diagnosis: Acute Pharyngitis. Prescribing Paracetamol 650 TDS, Azithromycin 500 OD for 3 days, warm saline gargles. Review in 3 days."*
- VoiceFlow extracts chief complaints, symptom severity, diagnosis, treatment plan, and follow-up advice into structured EHR fields automatically.

### 5. 📈 Longitudinal Symptom Trajectory Chart (`client/src/components/doctor/SymptomTrajectoryChart.tsx`)
- Provides doctors with an at-a-glance graphical progression of patient recovery:
  - **Symptom Improvement Rate (%):** Quantitative recovery index calculated across chronological visits.
  - **Categorical Breakdown:** Number of Improved, Persistent, and Newly Emerged symptoms.
  - **Chronological Milestones:** Visual historical timeline tracking symptom states over time.

### 6. 🧠 10-Second Intelligent Health Change Brief (`client/src/components/doctor/DoctorDashboard.tsx`)
- Categorizes longitudinal symptom shifts into 4 strict clinical buckets:
  - 🟢 **Improved Symptoms:** Decreased severity or patient-confirmed relief.
  - 🟡 **Persistent Symptoms:** Ongoing active complaints.
  - 🔴 **New Symptoms:** Emergent symptoms not present at baseline.
  - ⚪ **Unmentioned Symptoms:** Crucial safety rule: VoiceFlow **never** assumes unmentioned symptoms are resolved without patient confirmation.

---

## 🔒 Clinical Safety & Data Sovereign Guardrails

| Guardrail | Implementation | Clinical Reason |
|:---|:---|:---|
| **No Autonomous Diagnosis** | AI strictly structures & translates; never prescribes or diagnoses | Prevents medical hallucinations and algorithmic harm |
| **Explicit Patient Confirmation** | Voice/text edits permitted; commit requires explicit "Confirm" click | Protects patient agency; ensures the patient agrees with what the doctor sees |
| **Two-Tier Consent Architecture** | Patient holds sole revocation power; instant data cutoff | Complies with Indian Digital Personal Data Protection (DPDP) Act 2023 |
| **34/34 Security Rules Verification** | Automated Firestore security rule test suite (`scripts/test-rules.cjs`) | Prevents unauthorized cross-patient data access or privilege escalation |

---

## 🛠️ Technology Stack & Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        VOICEFLOW ARCHITECTURE                          │
└────────────────────────────────────────────────────────────────────────┘

 [ Patient (Voice/Bharat) ]            [ Doctor (OPD Dictation) ]
            │                                      │
            ▼                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React 18 + Vite)                     │
│  • Wispr Flow Engine & Audio Visualizer (Web Audio API)                │
│  • Multilingual Web Speech API (13 Indic Languages + Hinglish)        │
│  • Emergency Red Flag Triage Interceptor                               │
│  • "Dawai Samjho" Vernacular Prescription Explainer Modal             │
│  • Doctor Voice Prescription Pad & Symptom Trajectory Visualizer       │
│  • Tailwind CSS Dark/Light Responsive UI                               │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ REST API & Realtime Streams
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Node.js + Express)                     │
│  • Express REST API (`/api/ai/*`)                                      │
│  • Gemini 1.5 Flash / Pro Multilingual Clinical Parser                 │
│  • Static Client Bundle Hosting (Zero CORS, Production Ready)           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   PERSISTENCE & SECURITY (Cloud Firestore)             │
│  • Granular Role-Based Security Rules (`firestore.rules`)              │
│  • Atomic Batch Commits for Patient-Doctor Linking                     │
│  • DPDP-Compliant Two-Tier Sovereign Consent Architecture              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18.x or v20.x recommended)
- **npm** (v9+)
- A free **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/revanntdikshit729-oss/voiceflow__1.git
cd voiceflow__1

# Install Root, Client, and Server packages
npm install
npm --prefix client install
npm --prefix server install
```

### 3. Environment Configuration
Create a `.env` file in the root (or `server/.env`):
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Firebase client credentials are pre-configured in `client/src/firebase.ts` with fallback support for instant out-of-the-box evaluation).*

### 4. Build & Verify
Run the production build:
```bash
# Compile client and server
npm --prefix client run build
npm --prefix server run build

# Run automated 34-point security test suite
node scripts/test-rules.cjs
```

### 5. Launch Locally
Start the unified production server on port 5000:
```bash
node server/dist/index.js
```
Open **`http://localhost:5000`** in Chrome, Edge, or any modern browser.

---

## ☁️ 1-Click Cloud Deployment (Render & Vercel)

### Deploy to Render
The repository includes a ready-to-use [`render.yaml`](file:///c:/Users/adity/Downloads/Scalar_wispr_hack/render.yaml) blueprint:
1. Log into [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Blueprint**.
3. Connect repository `revanntdikshit729-oss/voiceflow__1`.
4. Enter your `GEMINI_API_KEY` when prompted.
5. Click **Apply**. Render will automatically build the client, compile the server, and serve the application live with SSL.

---

## 🎭 Judge Demo & Walkthrough Guide

### Scenario 1: Rural Patient Check-in (Ramesh Kumar, Bihar)
1. Sign in as Patient (`ramesh@demo.com` or create any account).
2. Select language **Hindi** or **Hinglish**.
3. Click the glowing microphone button and say:
   > *"Namaste doctor saab, do din se bukhar kam ho gaya hai lekin gale mein abhi bhi khansi aur dard bana hua hai."*
4. Watch the **Wispr Audio Visualizer** react to voice frequencies.
5. Notice how the engine removes conversational hesitation, structures the symptom changes, reads back the summary in Hindi, and awaits confirmation before saving.

### Scenario 2: Emergency Red Flag Detection
1. Click the microphone or use the **Emergency Demo Preset**.
2. Speak: *"Mujhe seene mein bohot tez dard ho raha hai aur saans lene mein bohot takleef ho rahi hai."*
3. The platform immediately triggers the **Emergency Red Flag Warning Modal**, displays an acute cardiac warning, and surfaces one-click **Call 108 / 112** ambulance buttons.

### Scenario 3: Illiterate Patient Prescription Guide ("Dawai Samjho")
1. In the Patient Dashboard, navigate to Active Prescriptions.
2. Click **"Dawai Samjho (Listen to Medicine Guide)"**.
3. VoiceFlow speaks the entire dosage schedule aloud in the patient's native dialect while displaying clear morning, noon, and night pill cards.

### Scenario 4: OPD Doctor Hands-Free Dictation (Dr. Sharma)
1. Switch to Doctor mode.
2. Select a patient and click **"Record Baseline Consultation"**.
3. Click **"Start Dictation"** on the **Wispr Clinical Dictation Pad**.
4. Dictate clinical notes hands-free; observe symptoms, diagnosis, and treatment plan auto-populate in real-time.
5. View the **Symptom Trajectory Chart** showing the patient's % improvement and longitudinal milestones.

---

## 📜 License & Acknowledgements

- Built with ❤️ for the **Scaler × Wispr Flow Hackathon ("India Runs on Voice")**.
- Powered by Google Gemini AI, Wispr Voice Architecture, Web Audio API, and Cloud Firestore.
