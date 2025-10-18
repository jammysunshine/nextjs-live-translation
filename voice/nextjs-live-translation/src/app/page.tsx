'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [listening, setListening] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [translatedArabicText, setTranslatedArabicText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // Ref for MediaRecorder
  const audioChunksRef = useRef<Blob[]>([]); // Ref to store audio data chunks
  const audioStreamRef = useRef<MediaStream | null>(null); // Ref for audio stream
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSourceLanguageRef = useRef<string>('en-US'); // Default or last detected language

  useEffect(() => {
    // Request microphone access and set up MediaRecorder
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          audioStreamRef.current = stream;
          mediaRecorderRef.current = new MediaRecorder(stream);

          mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
          };

          mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            audioChunksRef.current = []; // Clear chunks for next recording

            // Convert Blob to Base64
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
              const base64data = reader.result?.toString().split(',')[1]; // Get base64 part
              if (base64data) {
                sendAudioToSpeechToText(base64data);
              }
            };
          };

          mediaRecorderRef.current.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
          };
        })
        .catch(error => {
          console.error('Microphone access denied or error:', error);
          alert('Microphone access is required for speech recognition.');
        });
    } else {
      alert('getUserMedia not supported on your browser!');
    }

    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array to run once on mount

  const sendAudioToSpeechToText = async (audioBase64: string) => {
    try {
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          config: {
            encoding: 'WEBM_OPUS', // Assuming MediaRecorder records in webm/opus
            sampleRateHertz: 48000, // Common sample rate for web audio, adjust if needed
            languageCode: 'en-US', // Initial hint, API will auto-detect
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Speech-to-Text API Error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      const { transcription, detectedLanguage } = data;

      if (transcription) {
        setOriginalText(transcription);
        currentSourceLanguageRef.current = detectedLanguage || 'en-US'; // Use detected language
        detectAndTranslate(transcription); // Trigger translation with the new transcription
      }

    } catch (error) {
      console.error('Error sending audio to Speech-to-Text API:', error);
      if (error instanceof Error) {
        setOriginalText(`Error: ${error.message}`);
      } else {
        setOriginalText(`Error: An unknown error occurred.`);
      }
    }
  };

  const detectAndTranslate = async (text: string) => {
    if (!text.trim()) return;

    try {
      // Language detection is now handled by Speech-to-Text API, so we use currentSourceLanguageRef.current
      // which is updated by sendAudioToSpeechToText

      // 2. Translate to English
      if (currentSourceLanguageRef.current === 'en') {
        setTranslatedText(text);
      } else {
        const translateEnResponse = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, sourceLang: currentSourceLanguageRef.current, targetLang: 'en' }),
        });
        if (!translateEnResponse.ok) {
          const errorData = await translateEnResponse.json();
          throw new Error(`English Translation Error: ${errorData.error || translateEnResponse.statusText}`);
        }
        const translateEnData = await translateEnResponse.json();
        setTranslatedText(translateEnData.translatedText);
      }

      // 3. Translate to Arabic
      const translateArResponse = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLang: currentSourceLanguageRef.current, targetLang: 'ar' }),
      });
      if (!translateArResponse.ok) {
        const errorData = await translateArResponse.json();
        throw new Error(`Arabic Translation Error: ${errorData.error || translateArResponse.statusText}`);
      }
      const translateArData = await translateArResponse.json();
      setTranslatedArabicText(translateArData.translatedText);

    } catch (error) {
      console.error('Translation process error:', error);
      if (error instanceof Error) {
        setTranslatedText(`Error: ${error.message}`);
        setTranslatedArabicText(`Error: ${error.message}`);
      } else {
        setTranslatedText(`Error: An unknown error occurred.`);
        setTranslatedArabicText(`Error: An unknown error occurred.`);
      }
    }
  };

  const toggleListening = () => {
    if (!mediaRecorderRef.current || !audioStreamRef.current) {
      alert('Microphone not accessible or MediaRecorder not initialized.');
      return;
    }

    if (listening) {
      mediaRecorderRef.current.stop();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    } else {
      setOriginalText('');
      setTranslatedText('');
      setTranslatedArabicText('');
      audioChunksRef.current = []; // Clear any previous audio chunks
      mediaRecorderRef.current.start();
    }
    setListening(!listening);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <button
        id="startButton"
        onClick={toggleListening}
        className="px-8 py-4 text-2xl cursor-pointer bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        {listening ? 'Stop Session' : 'Start Session'}
      </button>

      <div className="w-4/5 max-w-2xl mt-8 border border-gray-300 p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2">Original Text:</h2>
        <p id="originalText" className="text-gray-700">{originalText}</p>
      </div>

      <div className="w-4/5 max-w-2xl mt-4 border border-gray-300 p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2">Translated Text (to English):</h2>
        <p id="translatedText" className="text-gray-700">{translatedText}</p>
      </div>

      <div className="w-4/5 max-w-2xl mt-4 border border-gray-300 p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2">Translated Text (to Arabic):</h2>
        <p id="translatedArabicText" className="text-gray-700">{translatedArabicText}</p>
      </div>
    </main>
  );
}