import os
import base64
import io
import tempfile
import whisper
from flask import Flask, request, jsonify
import soundfile as sf
import numpy as np
import subprocess


app = Flask(__name__)

# Load Whisper model once when the Flask app starts
# You can choose a different model like "small" or "medium" for better accuracy
# but "base" is a good starting point for CPU and smaller downloads.
print("Loading Whisper model (this may take a while)...")
model = whisper.load_model("base")
print("Whisper model loaded.")

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    print("Received request to /transcribe")
    if 'audio' not in request.json:
        return jsonify({"error": "No audio data provided"}), 400

    audio_base64 = request.json['audio']
    print(f"Received audio_base64 (first 50 chars): {audio_base64[:50]}...")
    
    try:
        # Decode base64 audio
        audio_bytes = base64.b64decode(audio_base64)
        print(f"Decoded audio_bytes length: {len(audio_bytes)}")

        # Use BytesIO to create an in-memory file-like object
        audio_in_memory = io.BytesIO(audio_bytes)

        # Create a new temporary WAV file for Whisper
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_wav_file:
            tmp_wav_file.write(audio_in_memory.read())
            tmp_wav_path = tmp_wav_file.name
        print(f"Saved WAV to temporary file: {tmp_wav_path}")

        # Clean up the original WebM bytes (no temporary file to remove)
        # os.remove(tmp_webm_path) # No longer needed as we use BytesIO

        # Check if the WAV file is empty or too small
        if os.path.getsize(tmp_wav_path) < 1000: # Arbitrary threshold, adjust if needed
            print(f"Warning: WAV file {tmp_wav_path} is too small ({os.path.getsize(tmp_wav_path)} bytes). Skipping transcription.")
            os.remove(tmp_wav_path)
            return jsonify({"transcription": "", "detectedLanguage": ""}), 200

        # Transcribe the audio
        print(f"WAV file size before transcription: {os.path.getsize(tmp_wav_path)} bytes.")
        print("Calling Whisper model.transcribe...")
        import time
        start_time = time.time()
        result = model.transcribe(tmp_wav_path)
        end_time = time.time()
        print(f"Whisper model.transcribe returned in {end_time - start_time:.2f} seconds.")

        # Clean up the temporary WAV file
        os.remove(tmp_wav_path)
        print("Cleaned up temporary files.")

        detected_language = result.get("language", "unknown")
        transcription = result.get("text", "").strip()
        print(f"Whisper Transcription: {transcription}")
        print(f"Whisper Detected Language: {detected_language}")

        print("Returning JSON response.")
        return jsonify({
            "transcription": transcription,
            "detectedLanguage": detected_language
        })

    except Exception as e:
        print(f"Error during transcription (in except block): {e}")
        import traceback
        traceback.print_exc()
        if isinstance(e, subprocess.TimeoutExpired):
            print(f"FFmpeg stderr (on timeout): {e.stderr.decode(errors='ignore')}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run the Flask app
    # This will make the API accessible at http://127.0.0.1:5000/transcribe
    app.run(host='127.0.0.1', port=5000)