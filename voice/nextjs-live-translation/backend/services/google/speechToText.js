import { SpeechClient } from '@google-cloud/speech';

class GoogleSpeechToTextService {
    constructor() {
        this.client = new SpeechClient();
    }

    createRecognizeStream(config) {
        // This method will create a new streaming recognize request.
        // The config should include languageCode, enableAutomaticPunctuation, etc.
        // For auto-language detection, languageCode can be omitted or set to a list of possible languages.
        const request = {
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000, // This should match the audio input from the frontend
                languageCode: config.languageCode || 'en-US', // Default or initial language
                enableAutomaticPunctuation: true,
                enableWordTimeOffsets: true,
                // For auto-language detection, you can specify a list of language codes
                // or rely on the API to detect if languageCode is omitted.
                // If enableAutomaticLanguageDetection is true, languageCode is optional.
                enableAutomaticLanguageDetection: true,
                model: 'default',
            },
            interimResults: true,
        };

        return this.client.streamingRecognize(request);
    }
}

export default GoogleSpeechToTextService;
