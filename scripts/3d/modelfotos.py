"""
Haalt de grote productfoto's en de maten van productpagina's op, als bron om een model op af te stemmen.

  python3 -I scripts/3d/modelfotos.py                          alle producten van de lijstpagina's
  python3 -I scripts/3d/modelfotos.py --paginas kotor,nestor   alleen deze productpagina's
  python3 -I scripts/3d/modelfotos.py --site https://www.voorbeeld.be --lijsten zetels,stoelen

Uitvoer: fotos-bron/<pagina>/1.jpg, 2.jpg … en maten.txt met elke zin van de pagina waarin een maat staat.
De map staat niet in git: het zijn foto's van de klant. De website moet toegelaten zijn in de cloudomgeving.
Standaard: de website van de pilootklant. Voor een andere klant: geef --site en --lijsten mee.
"""
import argparse
import io
import os
import re
import time
import urllib.request

from PIL import Image

p = argparse.ArgumentParser()
p.add_argument('--site', default='https://www.corneille-silence.be')
p.add_argument('--lijsten', default='sofas,fauteuils,zetelbedden,poufs--hockers', help="lijstpagina's waarop de producten staan")
p.add_argument('--paginas', default='', help="productpagina's (zonder .html); leeg = alles van de lijstpagina's")
p.add_argument('--uit', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'fotos-bron'))
p.add_argument('--min', type=int, default=300, help='kleinste breedte van een foto in pixels (logo\'s en knoppen overslaan)')
a = p.parse_args()


def haal(url):
    verzoek = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(verzoek, timeout=30) as antwoord:
        return antwoord.read()


def productpaginas():
    """Alle productpagina's die op de lijstpagina's staan."""
    uit = []
    for lijst in a.lijsten.split(','):
        html = haal(f'{a.site}/{lijst}.html').decode('utf-8', 'replace')
        for m in re.finditer(r'<a[^>]*href="/([a-z0-9\-]+)\.html"[^>]*>\s*<img', html, re.I):
            if m.group(1) not in uit:
                uit.append(m.group(1))
    return uit


paginas = [x for x in a.paginas.split(',') if x]
if not paginas:
    paginas = productpaginas()
print(f"{len(paginas)} productpagina's")

alle = None
for pagina in paginas:
    try:
        html = haal(f'{a.site}/{pagina}.html').decode('utf-8', 'replace')
    except Exception as fout:
        # Een pagina die anders heet (mabel → mabel-1-zit): zeggen welke namen erop lijken en verder gaan.
        alle = alle if alle is not None else productpaginas()
        lijkt = [x for x in alle if pagina.split('-')[0] in x]
        print(f'  {pagina}: niet gevonden ({fout}). ' + (f'Bedoel je: {", ".join(lijkt)}?' if lijkt else 'Geen pagina met die naam op de lijsten.'))
        continue
    map_ = os.path.join(a.uit, pagina)
    os.makedirs(map_, exist_ok=True)
    nummer = 0
    for bron in dict.fromkeys(re.findall(r'<img[^>]*?src="([^"]+)"', html, re.I)):
        try:
            beeld = Image.open(io.BytesIO(haal(a.site + bron.split('?')[0] if bron.startswith('/') else bron))).convert('RGBA')
        except Exception:
            continue
        if beeld.width < a.min:
            continue
        # Doorzichtige achtergrond (technische tekening) op wit zetten.
        wit = Image.new('RGBA', beeld.size, 'white')
        wit.alpha_composite(beeld)
        nummer += 1
        wit.convert('RGB').save(os.path.join(map_, f'{nummer}.jpg'), 'JPEG', quality=88)
        time.sleep(0.3)
    tekst = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', html, flags=re.S | re.I)
    tekst = re.sub(r'<[^>]+>', ' ', tekst)
    maten = [' '.join(m.group(0).split()) for m in re.finditer(r'[^.]{0,70}\b\d{2,3}\s*(?:cm|x|×)\b[^.]{0,90}', tekst)]
    with open(os.path.join(map_, 'maten.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(dict.fromkeys(maten)) + '\n')
    print(f'  {pagina}: {nummer} foto\'s, {len(maten)} regels met maten')
