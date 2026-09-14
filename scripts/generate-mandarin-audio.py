"""Regenerate bundled Mandarin poetry and song audio on macOS using the Tingting voice.
The app plays the resulting M4A files; end users do not need an installed voice.
"""
import hashlib
import json
import re
import subprocess
import tempfile
import struct
from pathlib import Path

culture = json.loads(Path('app/data/culture.json').read_text())
texts = dict.fromkeys([
    *(row['hanzi'] for item in culture for row in item['lines'] + item['vocabulary']),
])
output = Path('public/audio/mandarin')
output.mkdir(parents=True, exist_ok=True)
manifest = {}
expected = {hashlib.sha256(text.encode()).hexdigest()[:20] + '.m4a' for text in texts}
for stale in output.glob('*.m4a'):
    if stale.name not in expected:
        stale.unlink()
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
        decoded = subprocess.check_output([
            'ffmpeg', '-v', 'error', '-i', str(target), '-f', 's16le', '-acodec', 'pcm_s16le', '-'
        ])
        samples = struct.unpack('<' + 'h' * (len(decoded) // 2), decoded)
        if not samples or max(abs(value) for value in samples) < 300:
            raise RuntimeError(f'Silent audio for {text!r}')
        manifest[text] = '/audio/mandarin/' + name
        if (index + 1) % 40 == 0: print(f'Generated and validated {index + 1}/{len(texts)} clips', flush=True)
Path('app/data/mandarin-audio.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(f'Complete: {len(manifest)} Mandarin clips', flush=True)
