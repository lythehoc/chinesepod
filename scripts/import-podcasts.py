"""Build the podcast index from ChinesePod's public RSS feeds (standard library only).
Usage: python3 scripts/import-podcasts.py /path/beginner.xml /path/intermediate.xml
Audio remains on the publisher's servers. No full transcripts are copied.
"""
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from html import unescape
from pathlib import Path
from urllib.parse import urlparse

LEVELS = ['Newbie', 'Elementary', 'Pre Intermediate', 'Intermediate', 'Upper Intermediate', 'Advanced']
records = {}
for path in sys.argv[1:]:
    root = ET.parse(path).getroot()
    for item in root.findall('./channel/item'):
        enclosure = item.find('enclosure')
        if enclosure is None or not enclosure.get('type', '').startswith('audio/'):
            continue
        audio = enclosure.get('url', '')
        if urlparse(audio).scheme != 'https':
            continue
        full_title = unescape(item.findtext('title', ''))
        level, _, title = full_title.partition('|')
        level = level.strip().replace('-', ' ').title()
        if level not in LEVELS:
            continue
        description = unescape(item.findtext('description', ''))
        source = re.search(r'https://(?:www\.)?chinesepod.com/(?:lessons/)?[A-Za-z0-9%_/-]+', description)
        source_url = source.group().rstrip('/') if source else item.findtext('link', '')
        if urlparse(source_url).scheme != 'https':
            continue
        key = source_url.replace('www.', '')
        duration = item.findtext('{http://www.itunes.com/dtds/podcast-1.0.dtd}duration', '0')
        seconds = 0
        try:
            for part in duration.split(':'): seconds = seconds * 60 + int(part)
        except ValueError:
            continue
        if seconds < 60: continue
        # Feeds run newest first. Keep the latest public recording of each lesson.
        if key in records: continue
        records[key] = dict(id='cp-' + hashlib.sha256(key.encode()).hexdigest()[:16], title=title.strip(), level=level, audioUrl=audio, sourceUrl=source_url, published=item.findtext('pubDate', ''), duration=seconds, publisher='ChinesePod')
items = sorted(records.values(), key=lambda x: (LEVELS.index(x['level']), x['title'].casefold()))
Path('app/data/podcasts.json').write_text(json.dumps(items, ensure_ascii=False, indent=2) + '\n')
print(f'{len(items)} unique recorded episodes')
for level in LEVELS: print(level, sum(x['level'] == level for x in items))
