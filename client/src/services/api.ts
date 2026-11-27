import {
  StructuredSummary,
  Consultation,
  HealthUpdate,
  DoctorMemoryBrief,
  HealthChangeBrief,
} from '../types';
import { auth } from './firebase';

// Support deployed backend URL via environment variable (e.g. VITE_API_URL=https://your-backend.onrender.com)
// Falls back to '/api' for local development via Vite proxy
const rawBackendUrl = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  ''
).trim();

const API_BASE = rawBackendUrl
  ? rawBackendUrl.endsWith('/api')
    ? rawBackendUrl.replace(/\/$/, '')
    : `${rawBackendUrl.replace(/\/$/, '')}/api`
  : '/api';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    if (auth?.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (err) {
    console.warn('Could not retrieve current user Firebase ID token:', err);
  }

  return headers;
}

async function safeParseApiResponse<T>(res: Response, defaultErrorMsg: string): Promise<T> {
  let text = '';
  try {
    text = await res.text();
  } catch (err: any) {
    throw new Error(`Failed to read response from server: ${err.message || 'Connection lost'}`);
  }

  let data: any = null;
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON response (e.g. gateway HTML or plain text error)
      if (res.status === 429) {
        throw new Error('Gemini AI API quota limit exceeded (429). Please wait a moment before trying again.');
      }
      if (res.status === 504 || res.status === 502) {
        throw new Error('AI backend server timed out or is restarting. Please retry in a few moments.');
      }
      throw new Error(`Server returned HTTP ${res.status}: ${text.slice(0, 150)}`);
    }
  }

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(data?.error || 'Gemini AI API quota limit exceeded. Please wait a moment before retrying.');
    }
    if (res.status === 504 || res.status === 502) {
      throw new Error('AI backend gateway timeout. The service is temporarily busy. Please retry.');
    }
    throw new Error(data?.error || data?.message || `${defaultErrorMsg} (HTTP ${res.status})`);
  }

  if (!data) {
    throw new Error(`Server returned an empty response (HTTP ${res.status}). Please try again.`);
  }

  return data as T;
}

export const apiService = {
  async checkHealth(): Promise<{
    status: string;
    geminiConfigured: boolean;
    firebaseProjectId?: string;
    firebaseAdminInitialized?: boolean;
  }> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      return await safeParseApiResponse(res, 'Health check failed');
    } catch {
      return { status: 'unreachable', geminiConfigured: false };
    }
  },

  async verifyBackendToken(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/auth/me`, { headers });
      return await safeParseApiResponse(res, 'Token verification failed');
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async processHealthUpdate(params: {
    transcript: string;
    language: string;
    preferredLanguage?: string;
    baselineConsultation?: Consultation | null;
    previousUpdates?: HealthUpdate[];
  }): Promise<{ success: boolean; structured: StructuredSummary }> {
    const headers = await getAuthHeaders();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/ai/process-health-update`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
    } catch (err: any) {
      throw new Error('Unable to connect to AI server. Please verify the backend is running.');
    }

    return await safeParseApiResponse<{ success: boolean; structured: StructuredSummary }>(
      res,
      'Failed to process voice update with AI.'
    );
  },

  async correctHealthUpdate(params: {
    originalSummary: StructuredSummary;
    correctionTranscript: string;
    language: string;
    preferredLanguage?: string;
  }): Promise<{ success: boolean; corrected: StructuredSummary }> {
    const headers = await getAuthHeaders();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/ai/correct-health-update`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
    } catch (err: any) {
      throw new Error('Unable to connect to AI server. Please verify the backend is running.');
    }

    return await safeParseApiResponse<{ success: boolean; corrected: StructuredSummary }>(
      res,
      'Failed to apply voice correction.'
    );
  },

  async getDoctorMemoryBrief(params: {
    patientId: string;
    baselineConsultation?: Consultation | null;
    confirmedUpdates: HealthUpdate[];
  }): Promise<{ success: boolean; brief: DoctorMemoryBrief }> {
    const headers = await getAuthHeaders();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/ai/doctor-memory-brief`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
    } catch (err: any) {
      throw new Error('Unable to connect to AI server. Please verify the backend is running.');
    }

    return await safeParseApiResponse<{ success: boolean; brief: DoctorMemoryBrief }>(
      res,
      'Failed to generate Doctor Memory Brief.'
    );
  },

  async getHealthChangeBrief(params: {
    patientId: string;
    doctorLanguage?: string;
    previousRecord: any;
    latestUpdate: any;
  }): Promise<{ success: boolean; brief: HealthChangeBrief }> {
    const headers = await getAuthHeaders();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/ai/health-change-brief`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
    } catch (err: any) {
      throw new Error('Unable to connect to AI server. Please verify the backend is running.');
    }

    return await safeParseApiResponse<{ success: boolean; brief: HealthChangeBrief }>(
      res,
      'Failed to generate Intelligent Health Change Brief.'
    );
  },

  async translateMedicalSummary(params: {
    text: string;
    targetLanguage: string;
    sourceLanguage?: string;
    patientName?: string;
    context?: string;
  }): Promise<{ success: boolean; translatedText: string; targetLanguage: string; targetLanguageLabel: string }> {
    const headers = await getAuthHeaders();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/ai/translate-medical-summary`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
    } catch (err: any) {
      throw new Error('Unable to connect to AI server. Please verify the backend is running.');
    }

    return await safeParseApiResponse<{ success: boolean; translatedText: string; targetLanguage: string; targetLanguageLabel: string }>(
      res,
      'Failed to translate medical summary.'
    );
  },
};
