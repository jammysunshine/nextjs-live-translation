import { getSpeechToTextService } from '@backend/config';

export async function POST(req) {
    try {
        const speechToTextService = getSpeechToTextService();
        const { audioBase64, config } = await req.json(); // Expecting base64 encoded audio and config

        const audio = {
            content: audioBase64,
        };

        const request = {
            audio: audio,
            config: {
                encoding: config.encoding || 'LINEAR16', // Must match the audio encoding
                sampleRateHertz: config.sampleRateHertz || 16000, // Must match the audio sample rate
                languageCode: config.languageCode || 'en-US', // Initial language hint, can be omitted for auto-detection
                enableAutomaticPunctuation: config.enableAutomaticPunctuation || true,
                enableWordTimeOffsets: config.enableWordTimeOffsets || true,
                enableAutomaticLanguageDetection: true, // Crucial for auto-detection
                model: config.model || 'default',
            },
        };

        const [response] = await speechToTextService.client.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
        const detectedLanguage = response.results[0]?.languageCode || config.languageCode; // Get detected language

        return new Response(JSON.stringify({ transcription, detectedLanguage }), { status: 200 });

    } catch (error) {
        console.error('Speech-to-Text API route error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}