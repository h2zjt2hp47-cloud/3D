"""
Haalt de productfoto's van de website van de pilootklant op en verkleint ze
naar packages/demo-web/fotos/<sleutel>.jpg (wordt NIET in git bewaard).

Gebruik (vanuit de root):  python3 -I packages/demo-web/scripts/haal_fotos.py
De bouwstap (npm run build -w @configurator/demo-web) neemt de foto's mee als ze bestaan.
"""
import io
import os
import re
import sys
import tempfile
import urllib.request

from PIL import Image

BASIS = 'https://www.corneille-silence.be'
PAGINAS = {
    'sofas': ['Kotor', 'Doha', 'Montego', 'Nestor', 'Belize', 'Pula', 'Fréjus', 'Gozo', 'Azar', 'Amusette', 'Attribute', 'Husk', 'Wallace', 'Esmee'],
    'fauteuils': ['F-Pebble', 'F-Karl', 'F-Tumble', 'F-Ross', 'F-Amusette', 'F-Quin', 'F-Satie', 'F-Mabel1', 'F-Sullivan', 'F-Fraser', 'F-Milton', 'F-Manon', 'F-Mabel2', 'F-MabelMeridienne'],
    'zetelbedden': ['Z-Ziggy', 'Z-Aurora', 'Z-Zora', 'Z-Phoenix', 'Z-DaizyClassic', 'Z-DaizySlim'],
    'poufs--hockers': ['P-Sullivan', 'P-Tumble', 'P-Stockholm', 'P-Kanto', 'P-Fez', 'P-Pebble'],
}
UIT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fotos')


def haal(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read()


def main():
    os.makedirs(UIT, exist_ok=True)
    aantal = 0
    for pagina, sleutels in PAGINAS.items():
        html = haal(f'{BASIS}/{pagina}.html').decode('utf-8', 'replace')
        srcs = [s for s in re.findall(r'<img[^>]*?src="([^"]+)"', html, re.I) if '1479998588' not in s and 'blanco' not in s]
        for sleutel, src in zip(sleutels, srcs):
            try:
                beeld = Image.open(io.BytesIO(haal(BASIS + src)))
                beeld = beeld.convert('RGB')
                beeld.thumbnail((420, 300))
                beeld.save(os.path.join(UIT, f'{sleutel}.jpg'), 'JPEG', quality=72, optimize=True)
                aantal += 1
            except Exception as fout:  # noqa: BLE001
                print(f'{sleutel}: {fout}', file=sys.stderr)
    print(f'{aantal} foto\'s bewaard in {os.path.normpath(UIT)}')


if __name__ == '__main__':
    main()
