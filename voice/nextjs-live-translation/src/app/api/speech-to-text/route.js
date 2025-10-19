export async function POST(req) {
    try {
        const { audioBase64 } = await req.json(); // Expecting base64 encoded audio

        // Make a POST request to the local Whisper API
        const whisperApiResponse = await fetch('http://127.0.0.1:5000/transcribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ audio: audioBase64 }),
        });

        if (!whisperApiResponse.ok) {
            const errorData = await whisperApiResponse.json();
            throw new Error(`Whisper API Error: ${errorData.error || whisperApiResponse.statusText}`);
        }

        const { transcription, detectedLanguage } = await whisperApiResponse.json();

        return new Response(JSON.stringify({ transcription, detectedLanguage }), { status: 200 });

    } catch (error) {
        console.error('Local Whisper API route error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}