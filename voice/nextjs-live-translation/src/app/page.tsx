'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [listening, setListening] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [translatedArabicText, setTranslatedArabicText] = useState('');
  const [isMicInitialized, setIsMicInitialized] = useState(false); // New state for mic initialization
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // Ref for MediaRecorder
  const audioChunksRef = useRef<Blob[]>([]); // Ref to store audio data chunks
  const audioStreamRef = useRef<MediaStream | null>(null); // Ref for audio stream
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentSourceLanguageRef = useRef<string>('en-US'); // Default or last detected language

  // Helper function to convert AudioBuffer to WAV Blob
  const bufferToWav = (buffer: AudioBuffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan;
    const result = new Float32Array(length);
    const nowBuffering = new Float32Array(buffer.length);

    for (let i = 0; i < numOfChan; i++) {
      buffer.copyFromChannel(nowBuffering, i, 0);
      for (let j = 0; j < buffer.length; j++) {
        result[j * numOfChan + i] = nowBuffering[j];
      }
    }

    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2; // 16-bit pcm
    const blockAlign = numOfChan * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * bytesPerSample;

    const bufferArray = new ArrayBuffer(44 + dataSize);
    const view = new DataView(bufferArray);

    function writeString(view: DataView, offset: number, string: string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    // FMT sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChan, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // write the PCM samples
    let offset = 44;
    for (let i = 0; i < length; i++) {
      let s = Math.max(-1, Math.min(1, result[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(offset, s, true);
      offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  };

  useEffect(() => {
    // Request microphone access and set up MediaRecorder
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          audioStreamRef.current = stream;
          console.log('Microphone stream obtained:', stream);
          mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/mp4' });
          console.log('MediaRecorder initialized:', mediaRecorderRef.current);
          setIsMicInitialized(true); // Set mic initialized to true

          mediaRecorderRef.current.ondataavailable = async (event) => {
            console.log('MediaRecorder ondataavailable event:', event);
            console.log('event.data.size:', event.data.size);
            console.log('event.data.type:', event.data.type);
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
              // Send chunks every 10 seconds
              if (audioChunksRef.current.length * 1000 >= 10000) { // Assuming 1-second chunks
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = []; // Clear chunks for next recording

                // Decode WebM to AudioBuffer
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                try {
                  const arrayBuffer = await audioBlob.arrayBuffer();
                  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                  console.log('Decoded AudioBuffer - duration:', audioBuffer.duration, 'channels:', audioBuffer.numberOfChannels, 'sampleRate:', audioBuffer.sampleRate);

                  // Convert AudioBuffer to WAV Blob
                  const wavBlob = bufferToWav(audioBuffer);
                  console.log('Converted WAV Blob size:', wavBlob.size);

                  if (wavBlob.size > 0) {
                    const reader = new FileReader();
                    reader.readAsDataURL(wavBlob);
                    reader.onloadend = () => {
                      const base64data = reader.result?.toString().split(',')[1];
                      if (base64data) {
                        sendAudioToSpeechToText(base64data);
                        console.log('Base64 data generated and sent to backend.');
                      }
                    };
                  } else {
                    console.log('Warning: WAV Blob is empty, not sending to backend.');
                  }
                } catch (error) {
                  console.error('Error decoding audio data:', error);
                }
              }
            }
          };

          mediaRecorderRef.current.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
          };

          mediaRecorderRef.current.onstop = async () => {
            if (audioChunksRef.current.length > 0) {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp4' });
              audioChunksRef.current = []; // Clear chunks for next recording

              // Decode WebM to AudioBuffer
              const audioContext = new (window.AudioContext || window.webkitAudioContext)();
              try {
                const arrayBuffer = await audioBlob.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                console.log('Decoded AudioBuffer - duration:', audioBuffer.duration, 'channels:', audioBuffer.numberOfChannels, 'sampleRate:', audioBuffer.sampleRate);

                // Convert AudioBuffer to WAV Blob
                const wavBlob = bufferToWav(audioBuffer);
                console.log('Converted WAV Blob size:', wavBlob.size);

                if (wavBlob.size > 0) {
                  const reader = new FileReader();
                  reader.readAsDataURL(wavBlob);
                  reader.onloadend = () => {
                    const base64data = reader.result?.toString().split(',')[1];
                    if (base64data) {
                      sendAudioToSpeechToText(base64data);
                      console.log('Base64 data generated and sent to backend.');
                    }
                  };
                } else {
                  console.log('Warning: WAV Blob is empty, not sending to backend.');
                }
              } catch (error) {
                console.error('Error decoding audio data on stop:', error);
              }
            } else {
              console.log('No audio chunks to process on stop.');
            }
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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []); // Empty dependency array to run once on mount

  const toggleListening = () => {
    console.log('toggleListening called.');
    console.log('mediaRecorderRef.current:', mediaRecorderRef.current);
    console.log('audioStreamRef.current:', audioStreamRef.current);
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
      mediaRecorderRef.current.start(1000); // Start recording and emit data every 1000ms
    }
    setListening(!listening);
  };

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
        console.error('Backend error response:', errorData);
        throw new Error(`Speech-to-Text API Error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      console.log('Backend response data:', data);
      const { transcription, detectedLanguage } = data;
      console.log('Received transcription:', transcription);
      console.log('Received detectedLanguage:', detectedLanguage);

      if (transcription) {
        setOriginalText(transcription);
        console.log('setOriginalText called with:', transcription);
        currentSourceLanguageRef.current = detectedLanguage || 'en-US'; // Use detected language
        detectAndTranslate(transcription); // Trigger translation with the new transcription
        console.log('detectAndTranslate called with:', transcription);
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



  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <button
        id="startButton"
        onClick={toggleListening}
        disabled={!isMicInitialized} // Disable button until mic is initialized
        className="px-8 py-4 text-2xl cursor-pointer bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        {listening ? 'Stop Session' : 'Start Session'}
      </button>

      <div className="w-4/5 max-w-2xl mt-8 border border-gray-300 p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2">Original Text:</h2>
        <p id="originalText" className="text-gray-700">{originalText}</p>
      </div>

      <div className="w-4/5 max-w-2xl mt-4 border border-gray-300 p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2">Detected Language:</h2>
        <p id="detectedLanguage" className="text-gray-700">{currentSourceLanguageRef.current}</p>
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