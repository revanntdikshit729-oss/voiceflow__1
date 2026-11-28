// Wispr Flow Voice Engine for VoiceFlow
// Engineered specifically for the Scaler x Wispr Flow Hackathon ("India Runs on Voice")
// Handles real-world messy dictation, filler-word elimination, code-mixed formatting, and emergency triage detection.

export interface EmergencyRedFlag {
  isEmergency: boolean;
  severity: 'critical' | 'high' | 'normal';
  triggers: string[];
  recommendedAction: string;
  emergencyNumber: string;
}

// Common Indian filler words across Hindi, Hinglish, and Indian English
const FILLER_WORDS_REGEX = /\b(um|uh|er|ah|like|you know|basically|actually|matlab|matlab ki|woh|wohi|toh|yaar|na|haan|arre|bhai)\b/gi;

/**
 * Wispr Clean Dictation: Removes speech disfluencies, filler words, and awkward pauses,
 * formatting speech into clean, grammatically coherent clinical statements.
 */
export function cleanWisprTranscript(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText
    // Remove filler words
    .replace(FILLER_WORDS_REGEX, '')
    // Collapse multiple spaces
    .replace(/\s{2,}/g, ' ')
    // Fix orphan punctuation
    .replace(/\s+([.,?!])/g, '$1')
    .trim();

  // Capitalize first letter of sentences
  cleaned = cleaned.replace(/(^\w|[.?!]\s*\w)/g, (c) => c.toUpperCase());

  return cleaned;
}

/**
 * Real-time Clinical Safety Guardrail: Scans transcripts for acute life-threatening emergency symptoms.
 * Detects cardiac, respiratory, neurological, and severe anaphylactic red flags in English, Hindi, and Hinglish.
 */
export function detectEmergencyRedFlags(transcript: string): EmergencyRedFlag {
  const text = transcript.toLowerCase();
  const triggers: string[] = [];

  // 1. Cardiac Red Flags
  if (
    /chest pain|left arm pain|heart attack|chaati mein dard|chhati mein dard|seene mein dard|dil ka daura|chest pressure|heaviness in chest/i.test(text)
  ) {
    triggers.push('Suspected Acute Coronary Event / Chest Pain');
  }

  // 2. Severe Respiratory Distress
  if (
    /cannot breathe|can't breathe|severe breathlessness|choking|saans nahi aa rahi|dum ghut raha hai|extreme shortness of breath/i.test(text)
  ) {
    triggers.push('Acute Respiratory Distress / Severe Breathlessness');
  }

  // 3. Neurological / Stroke Red Flags
  if (
    /face drooping|paralysis|sudden weakness in arm|unable to speak|bol nahi pa raha|ek taraf kamzori|loss of consciousness|behosh/i.test(text)
  ) {
    triggers.push('Suspected Stroke / Sudden Neurological Deficit');
  }

  // 4. Severe Allergic / Bleeding
  if (
    /coughing blood|khoon ki ulti|vomiting blood|throat closing|severe bleeding|khoon beh raha/i.test(text)
  ) {
    triggers.push('Severe Bleeding or Airway Compromise');
  }

  const isEmergency = triggers.length > 0;

  return {
    isEmergency,
    severity: isEmergency ? 'critical' : 'normal',
    triggers,
    recommendedAction: isEmergency
      ? 'IMMEDIATE EMERGENCY ATTENTION REQUIRED. Please call 108/112 or proceed to the nearest emergency room immediately.'
      : 'Standard clinical documentation update.',
    emergencyNumber: '108 / 112',
  };
}

/**
 * Web Audio API Visualizer Manager
 * Connects to the user's MediaStream microphone and extracts real-time frequency data
 * to power the interactive waveform animation.
 */
export class AudioVisualizerManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;

  public initialize(stream: MediaStream): Uint8Array {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 64; // Low FFT size for responsive bar animation
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    return this.dataArray;
  }

  public getFrequencyData(): Uint8Array | null {
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray as any);
      return this.dataArray;
    }
    return null;
  }

  public stop(): void {
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {}
      this.source = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }
}

export const audioVisualizer = new AudioVisualizerManager();
