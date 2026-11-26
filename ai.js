import { Router } from 'express';
import { processHealthUpdate, correctHealthUpdate, generateDoctorMemoryBrief, generateIntelligentHealthChangeBrief, translateMedicalSummary, } from '../services/gemini.js';
const router = Router();
function handleAiRouteError(res, error, defaultMsg) {
    console.error(`AI Route Error (${defaultMsg}):`, error);
    res.setHeader('Content-Type', 'application/json');
    const status = error.status || (error.message?.includes('429') ? 429 : 500);
    const isQuota = status === 429 || error.code === 'QUOTA_EXCEEDED' || error.message?.toLowerCase().includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED');
    if (isQuota) {
        return res.status(429).json({
            success: false,
            error: 'Gemini AI API quota limit reached. Please wait a moment before trying again.',
            code: 'QUOTA_EXCEEDED',
            details: error.message,
        });
    }
    const statusCode = status >= 400 && status < 600 ? status : 500;
    return res.status(statusCode).json({
        success: false,
        error: error.message || defaultMsg,
        code: error.code || 'AI_PROCESSING_ERROR',
        details: error.message,
    });
}
// Process raw voice transcript into structured health update
router.post('/process-health-update', async (req, res) => {
    try {
        const { transcript, language, preferredLanguage, baselineConsultation, previousUpdates } = req.body;
        if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
            return res.status(400).json({ error: 'Transcript is required and must be non-empty.' });
        }
        const structured = await processHealthUpdate({
            transcript: transcript.trim(),
            language: language || 'hinglish',
            preferredLanguage: preferredLanguage || language || 'hinglish',
            baselineConsultation,
            previousUpdates,
        });
        return res.json({ success: true, structured });
    }
    catch (error) {
        return handleAiRouteError(res, error, 'Failed to process voice health update.');
    }
});
// Apply patient voice/text correction to structured summary
router.post('/correct-health-update', async (req, res) => {
    try {
        const { originalSummary, correctionTranscript, language, preferredLanguage } = req.body;
        if (!originalSummary) {
            return res.status(400).json({ error: 'originalSummary is required.' });
        }
        if (!correctionTranscript || typeof correctionTranscript !== 'string' || !correctionTranscript.trim()) {
            return res.status(400).json({ error: 'correctionTranscript is required.' });
        }
        const corrected = await correctHealthUpdate({
            originalSummary,
            correctionTranscript: correctionTranscript.trim(),
            language: language || 'hinglish',
            preferredLanguage: preferredLanguage || language || 'hinglish',
        });
        return res.json({ success: true, corrected });
    }
    catch (error) {
        return handleAiRouteError(res, error, 'Failed to process correction.');
    }
});
// Generate Doctor's Memory Brief comparing baseline against confirmed updates
router.post('/doctor-memory-brief', async (req, res) => {
    try {
        const { patientId, baselineConsultation, confirmedUpdates } = req.body;
        if (!patientId) {
            return res.status(400).json({ error: 'patientId is required.' });
        }
        if (!Array.isArray(confirmedUpdates)) {
            return res.status(400).json({ error: 'confirmedUpdates must be an array.' });
        }
        const brief = await generateDoctorMemoryBrief({
            patientId,
            baselineConsultation,
            confirmedUpdates,
        });
        return res.json({ success: true, brief });
    }
    catch (error) {
        return handleAiRouteError(res, error, 'Failed to generate doctor memory brief.');
    }
});
// Generate Intelligent Health Change Brief (4 Categories: Improved, Persistent, Newly Reported, Not Mentioned)
router.post('/health-change-brief', async (req, res) => {
    try {
        const { patientId, doctorLanguage, previousRecord, latestUpdate } = req.body;
        if (!patientId) {
            return res.status(400).json({ error: 'patientId is required.' });
        }
        if (!latestUpdate || !latestUpdate.id) {
            return res.status(400).json({ error: 'latestUpdate object is required.' });
        }
        const brief = await generateIntelligentHealthChangeBrief({
            patientId,
            doctorLanguage: doctorLanguage || 'en',
            previousRecord: previousRecord || null,
            latestUpdate,
        });
        return res.json({ success: true, brief });
    }
    catch (error) {
        return handleAiRouteError(res, error, 'Failed to generate intelligent health change brief.');
    }
});
// Translate medical summary into doctor's preferred language
router.post('/translate-medical-summary', async (req, res) => {
    try {
        const { text, targetLanguage, sourceLanguage, patientName, context } = req.body;
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text string is required to translate.' });
        }
        const result = await translateMedicalSummary({
            text: text.trim(),
            targetLanguage: targetLanguage || 'en',
            sourceLanguage: sourceLanguage || undefined,
            patientName: patientName || undefined,
            context: context || undefined,
        });
        return res.json({
            success: true,
            translatedText: result.translatedText,
            targetLanguage: result.targetLanguage,
            targetLanguageLabel: result.targetLanguageLabel,
        });
    }
    catch (error) {
        return handleAiRouteError(res, error, 'Failed to translate medical summary.');
    }
});
export default router;
