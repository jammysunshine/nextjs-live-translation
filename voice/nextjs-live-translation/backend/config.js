
import GoogleLanguageDetectionService from './services/google/languageDetection';
import GoogleTranslationService from './services/google/translation';
import GoogleSpeechToTextService from './services/google/speechToText'; // New import

// Function to get the Language Detection Service instance
function getLanguageDetectionService() {
    const provider = process.env.LANGUAGE_DETECTION_PROVIDER || 'google'; // Default to google

    switch (provider) {
        case 'google':
            return new GoogleLanguageDetectionService();
        // Add other providers here as they are implemented
        // case 'grok':
        //     return new GrokLanguageDetectionService();
        default:
            throw new Error(`Unsupported language detection provider: ${provider}`);
    }
}

// Function to get the Translation Service instance
function getTranslationService() {
    const provider = process.env.TRANSLATION_PROVIDER || 'google'; // Default to google

    switch (provider) {
        case 'google':
            return new GoogleTranslationService();
        // Add other providers here as they are implemented
        // case 'grok':
        //     return new GrokTranslationService();
        default:
            throw new Error(`Unsupported translation provider: ${provider}`);
    }
}

// New function to get the Speech-to-Text Service instance
function getSpeechToTextService() {
    const provider = process.env.SPEECH_TO_TEXT_PROVIDER || 'google'; // Default to google

    switch (provider) {
        case 'google':
            return new GoogleSpeechToTextService();
        default:
            throw new Error(`Unsupported speech-to-text provider: ${provider}`);
    }
}

export {
    getLanguageDetectionService,
    getTranslationService,
    getSpeechToTextService, // New export
};
