"""Check real bytes from a spread of published episode URLs, without full downloads.
Use --all to check the whole catalog; the default checks up to 10 per level.
"""
import concurrent.futures
import json
import sys
import subprocess
import tempfile
from urllib.parse import urlparse
from pathlib import Path

items = json.loads(Path('app/data/podcasts.json').read_text())
if '--all' not in sys.argv:
    selection = []
    for level in dict.fromkeys(item['level'] for item in items):
        group = [item for item in items if item['level'] == level]
        selection.extend(group[round(i * (len(group)-1)/9)] for i in range(10))
    items = selection

def check(item):
    try:
        with tempfile.TemporaryDirectory(prefix='mandarin-check-') as temporary:
            path = Path(temporary) / 'sample.mp3'
            result = subprocess.run(['curl', '-fsSL', '--max-time', '25', '--max-filesize', '1048576', '--range', '0-65535', '-o', str(path), '-w', '%{http_code}\n%{content_type}\n%{url_effective}', item['audioUrl']], capture_output=True, text=True, check=True)
            status, kind, url = result.stdout.split('\n')
            data = path.read_bytes()
            if status not in ('200', '206') or len(data) < 4096 or ('audio/' not in kind and 'octet-stream' not in kind):
                raise ValueError(f'{status}, {kind}, {len(data)} bytes')
            if not (data.startswith(b'ID3') or data[4:8] == b'ftyp' or any(data[i] == 255 and data[i+1] & 224 == 224 for i in range(min(4096,len(data)-1)))):
                raise ValueError('No MP3 or M4A header found')
            return {'id':item['id'], 'ok': True, 'bytes':len(data), 'type':kind, 'host':urlparse(url).hostname}
    except Exception as error:
        return {'id':item['id'], 'title':item['title'], 'ok':False, 'error':str(error)}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(check, items))
failed = [result for result in results if not result['ok']]
print(json.dumps({'checked':len(results), 'passed':len(results)-len(failed), 'hosts':sorted(set(x.get('host','') for x in results)), 'failures':failed}, indent=2))
sys.exit(bool(failed))
