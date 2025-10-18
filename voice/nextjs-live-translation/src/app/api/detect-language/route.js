import { getLanguageDetectionService } from '@backend/config';

export async function POST(req) {
    const { text } = await req.json();

    if (!text) {
        return new Response(JSON.stringify({ error: 'Text is required for language detection.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const languageDetectionService = getLanguageDetectionService();
        const detectedLanguage = await languageDetectionService.detectLanguage(text);
        return new Response(JSON.stringify({ detectedLanguage }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Language Detection API Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to detect language.', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}