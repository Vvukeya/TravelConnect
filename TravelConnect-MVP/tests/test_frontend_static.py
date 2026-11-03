from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
web = ROOT / 'web'
html = (web/'index.html').read_text()
js = (web/'app.js').read_text()
manifest = (web/'manifest.webmanifest').read_text()
assert '<html lang="en-ZA">' in html
assert 'id="app"' in html
assert '<script type="module" src="./app.js"></script>' in html
assert all((web/f).is_file() for f in ['app.js','index.html','styles.css','sw.js','manifest.webmanifest','assets/icon-192.png','assets/icon-512.png'])
assert 'display": "standalone"' in manifest
assert all(f'{route}:' in js or f'{route},' in js for route in ['home','search','detail','checkout','booked','trips','track','chat','assistant','driver','admin','profile','safety'])
assert 'No payment' in js or 'no payment' in js
print('TravelConnect static tests passed')
