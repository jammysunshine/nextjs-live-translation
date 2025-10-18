import { getTranslationService } from '@backend/config';

export async function POST(req) {
    const { text, sourceLang, targetLang } = await req.json();

    if (!text || !sourceLang || !targetLang) {
        return new Response(JSON.stringify({ error: 'Text, source language, and target language are required for translation.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const translationService = getTranslationService();
        const translatedText = await translationService.translateText(text, sourceLang, targetLang);
        return new Response(JSON.stringify({ translatedText }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Translation API Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to translate text.', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}