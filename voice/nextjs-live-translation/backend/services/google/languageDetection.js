
import { Translate } from '@google-cloud/translate/build/src/v2';

class GoogleLanguageDetectionService {
    constructor() {
        this.translate = new Translate();
    }

    async detectLanguage(text) {
        if (!text) {
            throw new Error('Text for language detection cannot be empty.');
        }
        console.log('Language Detection: Input text:', text); // Added log
        const [detection] = await this.translate.detect(text);
        console.log('Language Detection: API response:', detection); // Added log
        if (!detection || !detection.language) { // Added check for detection result
            throw new Error('Google Cloud Translation API did not return a detectable language.');
        }
        return detection.language;
    }
}

export default GoogleLanguageDetectionService;
