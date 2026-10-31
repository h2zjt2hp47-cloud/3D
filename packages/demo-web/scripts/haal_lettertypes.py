"""
Haalt de lettertypes (Google Fonts, alleen het Latijnse deel) op en zet ze als data-URI in
packages/demo-web/lettertypen/lettertypen.css, zodat de offline-versie zonder internet werkt.
Gebruik (vanuit de root):  python3 -I packages/demo-web/scripts/haal_lettertypes.py
"""
import base64
import os
import re
import urllib.request

URL = ('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500&family=Figtree:wght@400;500;600'
       '&family=Montserrat:wght@300;400;500;600&family=Raleway:wght@400;500&display=swap')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
UIT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lettertypen')


def haal(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def main():
    css = haal(URL).decode('utf-8')
    # Blokken per subset; alleen /* latin */ houden (niet latin-ext, cyrillic, ...).
    blokken = re.findall(r'/\* ([a-z-]+) \*/\s*(@font-face\s*\{[^}]*\})', css)
    uit = []
    for subset, blok in blokken:
        if subset != 'latin':
            continue
        url = re.search(r'url\((https://[^)]+\.woff2)\)', blok).group(1)
        data = base64.b64encode(haal(url)).decode('ascii')
        uit.append(blok.replace(url, f'data:font/woff2;base64,{data}'))
    os.makedirs(UIT, exist_ok=True)
    with open(os.path.join(UIT, 'lettertypen.css'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(uit))
    print(f'{len(uit)} lettertypes bewaard in {os.path.normpath(UIT)}')


if __name__ == '__main__':
    main()
