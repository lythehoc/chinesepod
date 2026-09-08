"""Regenerate bundled Mandarin practice audio on macOS using the Tingting voice.
The app plays the resulting M4A files; end users do not need an installed voice.
"""
import hashlib
import json
import re
import subprocess
import tempfile
import wave
import struct
from pathlib import Path

lessons = json.loads(Path('app/data/lessons.json').read_text())
texts = dict.fromkeys(row['hanzi'] for lesson in lessons for row in lesson['dialogue'] + lesson['vocabulary'])
output = Path('public/audio/starter')
output.mkdir(parents=True, exist_ok=True)
manifest = {}
with tempfile.TemporaryDirectory(prefix='mandarin-audio-') as temp:
    for index, text in enumerate(texts):
        name = hashlib.sha256(text.encode()).hexdigest()[:20] + '.m4a'
        target = output / name
        if not target.exists():
            source = Path(temp) / 'speech.aiff'
            subprocess.run(['say', '-v', 'Tingting', '-r', '145', '-o', str(source), text], check=True)
            subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', str(source), str(target)], check=True)
        info = subprocess.check_output(['afinfo', str(target)], text=True)
        duration = re.search(r'estimated duration:\s+([\d.]+)', info)
        if not duration or float(duration[1]) < 0.1 or target.stat().st_size < 4500:
            raise RuntimeError(f'Empty audio for {text!r}')
        decoded = Path(temp) / 'decoded.wav'
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16', str(target), str(decoded)], check=True)
        with wave.open(str(decoded), 'rb') as audio:
            samples = struct.unpack('<' + 'h' * audio.getnframes() * audio.getnchannels(), audio.readframes(audio.getnframes()))
            if not samples or max(abs(value) for value in samples) < 300:
                raise RuntimeError(f'Silent audio for {text!r}')
        manifest[text] = '/audio/starter/' + name
        if (index + 1) % 40 == 0: print(f'Generated and validated {index + 1}/{len(texts)} clips', flush=True)
Path('app/data/starter-audio.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(f'Complete: {len(manifest)} Mandarin clips', flush=True)
