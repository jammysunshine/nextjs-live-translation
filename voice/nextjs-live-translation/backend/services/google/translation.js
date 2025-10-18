
import { Translate } from '@google-cloud/translate/build/src/v2';

class GoogleTranslationService {
    constructor() {
        this.translate = new Translate();
    }

    async translateText(text, sourceLang, targetLang) {
        if (!text || !sourceLang || !targetLang) {
            throw new Error('Text, source language, and target language are required for translation.');
        }
        const [translation] = await this.translate.translate(text, { from: sourceLang, to: targetLang });
        return translation;
    }
}

export default GoogleTranslationService;
