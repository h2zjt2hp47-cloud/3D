"""
Bouwt een fauteuil als 3D-bestand vanuit de opbouw van de motor (gegevens/<code>.json, gemaakt door exporteer.mjs),
met de aanpassingen per model uit aanpassingen.py.

    python uit_motor.py <code> <uit.glb> [--ao 512] [--zonder-ao]

Wat de motor al weet, nemen we over: de middenlijn en de hoogtes van de schaal, haar dikte, helling en waaier, de
omtrek van de zitting, het onderstel, de losse kussens. Wat Blender eraan toevoegt: de schaal als één dik gestoffeerd
vel met een ronde rand en ronde koppen, een ronde onderrand, een bolle zitting met een ronde rand, de schaduw in de
plooien en de naden. Wat de foto's anders tonen dan de motor, staat per model in aanpassingen.py.
"""
import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from zetelbouw import Net, balk, dikke_wand, eenheid, koord, kussen, omtreklichaam, pchip, rechthoek, schrijf_glb, staaf, zacht  # noqa: E402

BIES = 0.45             # straal van een bies (koord) in cm, waar het model een bies heeft

HIER = os.path.dirname(os.path.abspath(__file__))


def kwartrond(straal, stappen=4):
    """Hoeken van een kwartcirkel als (naar binnen, omhoog) vanaf de voet: 0 = onderaan."""
    return [(straal * (1 - math.sin(a)), straal * (1 - math.cos(a))) for a in np.linspace(0, math.pi / 2, stappen + 1)]


def wand(net, b, naar, zit_top, aan):
    """Kuipwand van de motor → dik vel met ronde rand. `naar` zet (x, z) van de motor om naar (x, y) hier."""
    P = np.array([naar(x, z) for x, z in b['pad']])
    top = np.array(b['hoogtes'], float)
    n = len(P)
    onder = float(b['y'])
    dik = float(b['dikte'])
    binnen = np.maximum(0, np.array(b.get('binnen') or [0.0] * n, float))
    # Zelfde doorsnede als de motor (wandDoorsnede): normaal haaks op de middenlijn, naar de buitenkant van de bocht.
    raaklijn = eenheid(P[np.minimum(n - 1, np.arange(n) + 1)] - P[np.maximum(0, np.arange(n) - 1)])
    ruw = np.stack([raaklijn[:, 1], -raaklijn[:, 0]], -1)
    m = n // 2
    teken = 1.0 if np.dot(ruw[m], P[m] - (P[0] + P[-1]) / 2) >= 0 else -1.0
    nrm = ruw * teken
    half = dik / 2 + binnen / 2
    buitenlijn = P - nrm * (binnen / 2)[:, None] + nrm * half[:, None]
    # Helling (weegt met het deel van de normaal dat naar achteren wijst) en waaier (rondom naar buiten), per cm hoogte.
    leun = np.array(naar(*b.get('leun', [0, 0]), richting=True))
    lang = float(np.hypot(*leun))
    gewicht = np.maximum(0, (1.0 if np.dot(ruw[m], leun) >= 0 else -1.0) * (ruw @ leun) / lang) if lang > 0 else np.zeros(n)
    waaier = float(b.get('waaier', 0.0)) + aan.get('waaier_extra', 0.0)
    schuif = leun[None, :] * gewicht[:, None] + nrm * waaier
    # Aanpassingen per model.
    if 'rand' in aan:                                               # hoogte van de rand: functie van de plaats langs de wand (0 = midden, 1 = uiteinde)
        plaats = np.abs(np.linspace(-1, 1, n))
        top = pchip(aan['rand'])(plaats)
    top = top + aan.get('rand_extra', 0.0)
    dikte_rand = 2 * half * aan.get('dikte_factor', 1.0) + aan.get('dikte_extra', 0.0)
    if 'dikte' in aan:
        dikte_rand = pchip(aan['dikte'])(np.abs(np.linspace(-1, 1, n)))
    buitenlijn = buitenlijn + nrm * ((dikte_rand - 2 * half) * aan.get('dikte_naar_buiten', 0.0))[:, None]
    onderrand = aan.get('onderrand', 3.5 if onder >= 8 else 2.0)
    bol = aan.get('bol', 0.0)                                       # hoe ver de wand halverwege naar buiten bolt (cm)
    # Te lage uiteinden (lager dan de rol dik is) laten we weg: de ronde kop sluit de wand daar af.
    laag = (top - onder) < 0.75 * dikte_rand + 1
    eerste = int(np.argmax(~laag)); laatste = n - 1 - int(np.argmax(~laag[::-1]))
    kies = slice(eerste, laatste + 1)
    P, top, nrm, buitenlijn, schuif, dikte_rand = P[kies], top[kies], nrm[kies], buitenlijn[kies], schuif[kies], dikte_rand[kies]
    n = len(P)
    nrm3 = np.concatenate([nrm, np.zeros((n, 1))], -1)[:, None, :]
    hoog = np.maximum(top - onder, 1.0)[:, None]

    def buiten(Z):
        y = Z - onder
        uit = np.zeros_like(y)
        if onderrand > 0:                                           # ronde onderrand: de wand plooit onderaan naar binnen
            t = np.clip(1 - y / onderrand, 0, 1)
            uit = uit - onderrand * (1 - np.sqrt(np.clip(1 - t * t, 0, 1)))
        if bol:
            uit = uit + bol * np.sin(np.clip(y / hoog, 0, 1) * math.pi) ** 1.5
        xy = buitenlijn[:, None, :] + y[..., None] * schuif[:, None, :] + nrm[:, None, :] * uit[..., None]
        return np.concatenate([xy, Z[..., None]], -1)

    # Achter de zitting is de wand niet te zien: daar dunner, zodat de binnenkant niet door de zitting steekt.
    verborgen = zit_top is not None and onder < zit_top - 6

    def dikte(Z):
        D = np.broadcast_to(dikte_rand[:, None], Z.shape).copy()
        if verborgen:
            D = np.maximum(3.0, D * zacht((Z - (zit_top - 18)) / 16))
        return D

    return dikke_wand(net, buiten, onder, top, dikte_rand, dikte, naar_buiten=lambda O: nrm3,
                      naden=aan.get('naden', True), naad_rand=aan.get('naad_rand', True), naam=b['code'].replace('.', '_'),
                      rand_vorm=aan.get('rand_vorm', 2.0), rand_hoog=aan.get('rand_hoog', 1.0), bies=BIES if b.get('naad') == 'bies' else 0.0)


def zitting(net, b, naar, aan, zichtbaar_onder, bovenste=True):
    """
    Zitting met een omtrek (ronde of ovale trommel): ronde bovenrand, bol bovenvlak, onderrand, naad. Bij een zitting in
    twee lagen (Fraser) is alleen de bovenste laag bol en rond; de onderste is een band met een kleine rand.
    """
    omtrek = [naar(x, z) for x, z in b['omtrek']]
    y, h = float(b['y']), float(b['h'])
    r = min(float(b.get('afronding', 4)) * aan.get('zit_rand_factor', 1.0), h / 2 - 0.5) if bovenste else min(1.2, h / 3)
    ro = min(aan.get('zit_onderrand', 2.5 if zichtbaar_onder else 0.8), h / 3)
    kroon = aan.get('zit_bol', min(2.0, 0.03 * min(b['b'], b['d']))) if bovenste else 0.0
    buik = aan.get('zit_buik', 0.25)                                # de zijkant bolt een beetje
    top = y + h - 0.6 * kroon
    profiel = [(ro + 2.5, y)] + [(i, y + o) for i, o in kwartrond(ro)]
    for t in (0.25, 0.5, 0.75):
        profiel.append((-buik * math.sin(t * math.pi), y + ro + t * (top - r - y - ro)))
    naad = len(profiel)
    profiel += [(r * (1 - math.cos(a)), top - r + r * math.sin(a)) for a in np.linspace(0, math.pi / 2, 6)]
    naam = b['code'].replace('.', '_')
    P, nrm = omtreklichaam(net, omtrek, profiel, f'{naam}_zij', f'{naam}_boven', boven_vanaf=naad + 2, bol=kroon, onder_dicht=True)
    if b.get('naad') == 'bies' and bovenste:
        # Bies rond de zitting, waar de ronde bovenrand begint.
        inw, z = profiel[naad]
        schuin = np.concatenate([nrm * 0.75, np.full((len(P), 1), 0.66)], -1)
        koord(net, np.concatenate([P - nrm * inw, np.full((len(P), 1), z)], -1), schuin, f'{naam}_bies', straal=BIES, gesloten=True)
    elif aan.get('naden', True):
        pr = np.array(profiel)
        v = float(np.linalg.norm(np.diff(pr[:naad + 1], axis=0), axis=1).sum())
        P = np.array(omtrek + omtrek[:1])
        langs = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
        net.naden.append((f'{naam}_zij', [(u, v) for u in langs]))


def hard(net, b, naar, eiland='hout'):
    """Houten, metalen of donkere delen: ring of plint (omtrek), poot (kegel), balk, schijf."""
    y, h = float(b['y']), float(b['h'])
    if b.get('omtrek'):
        f = min(0.35, h / 3)
        omtreklichaam(net, [naar(x, z) for x, z in b['omtrek']], [(f, y), (0, y + f), (0, y + h - f), (f, y + h)], eiland, eiland, boven_vanaf=3, onder_dicht=True, ringen_boven=1)
        return
    cx, cy = naar(b['x'] + b['b'] / 2, b['z'] + b['d'] / 2)
    if b['vorm'] == 'kegel' or (b['vorm'] == 'cilinder' and b.get('vierkant')):
        taps = float(b.get('taps', 1.0))
        sx, sy = naar(*b.get('schuin', [0, 0]), richting=True)
        if b.get('vierkant'):
            balk(net, rechthoek(cx + sx, cy + sy, b['b'] * taps / 2, b['d'] * taps / 2, y), rechthoek(cx, cy, b['b'] / 2, b['d'] / 2, y + h), eiland)
        else:
            staaf(net, (cx + sx, cy + sy, y), (cx, cy, y + h), b['b'] * taps / 2, b['b'] / 2, eiland)
    elif b['vorm'] == 'cilinder':
        staaf(net, (cx, cy, y), (cx, cy, y + h), b['b'] / 2, b['b'] / 2, eiland, zijden=32)
    elif b['vorm'] == 'blok':
        draai = -math.radians(b.get('draai', 0.0))
        balk(net, rechthoek(cx, cy, b['b'] / 2, b['d'] / 2, y, draai), rechthoek(cx, cy, b['b'] / 2, b['d'] / 2, y + h, draai), eiland)
    else:
        raise ValueError(f"onbekende vorm voor {b['code']}: {b['vorm']}")


def netten_uit_motor(g, aan=None):
    """Alle netten van één model: (stof, hout, donker, niet omgezet)."""
    aan = aan or {}
    k = g['kader']
    mx, mz = k['x'] + k['b'] / 2, k['z'] + k['d'] / 2

    def naar(x, z, richting=False):                                 # motor (x, diepte z met de rug naar −z) → hier (x, y met de rug naar +y)
        return (x, -z) if richting else (x - mx, -(z - mz))

    zittingen = [b for b in g['blokken'] if b['soort'] == 'kussen' and b.get('omtrek')]
    zit_top = max((b['y'] + b['h'] for b in zittingen), default=None)
    laagste_zit = min((b['y'] for b in zittingen), default=0)
    stof, hout, donker, over = [], Net(), Net(), []
    # Alleen de fauteuil zelf: losse delen erop (een sierkussen) tekent de configurator zelf.
    stoel = next(b['code'].split('.')[0] for b in g['blokken'] if b['vorm'] == 'kuipwand')
    for b in g['blokken']:
        if b['code'].split('.')[0] != stoel:
            continue
        eigen = aan.get(b['code'].split('.', 1)[1], {})
        deel = {**aan, **eigen}
        if deel.get('weg'):
            continue
        if b['vorm'] == 'kuipwand':
            net = Net(); wand(net, b, naar, zit_top, deel); stof.append(net)
        elif b['soort'] == 'kussen' and b.get('omtrek'):
            net = Net()
            zitting(net, b, naar, deel, zichtbaar_onder=b['y'] <= laagste_zit + 0.01 and b['y'] >= 8, bovenste=b['y'] + b['h'] >= zit_top - 0.01)
            stof.append(net)
        elif b['soort'] == 'kussen' and b['vorm'] == 'blok':
            net = Net()
            cx, cy = naar(b['x'] + b['b'] / 2, b['z'] + b['d'] / 2)
            achter = {'z-': 1.0, 'z+': -1.0}.get((b.get('kantel') or {}).get('richting', 'z-'), 1.0)
            kussen(net, (cx, cy, b['y'] + b['h'] / 2), b['b'], b['h'], min(18.0, b['d'] + 2 * b.get('bol', 2.0)) * deel.get('kussen_dik', 1.0), b['code'].replace('.', '_'),
                   kantel=achter * (b.get('kantel') or {}).get('graden', 0.0), draai=-b.get('draai', 0.0), bies=BIES if b.get('naad') == 'bies' else 0.0,
                   segmenten=40 if b.get('naad') == 'bies' else 28)
            stof.append(net)
        elif b['soort'] in ('hout', 'metaal'):
            hard(hout, b, naar)
        elif b['soort'] == 'donker':
            hard(donker, b, naar, 'donker')
        else:
            over.append(b['code'])
    return stof, hout, donker, over


def bouw(code, uit, ao_px=512, met_ao=True):
    from aanpassingen import AANPASSINGEN
    g = json.load(open(os.path.join(HIER, 'gegevens', f'{code}.json')))
    stof, hout, donker, over = netten_uit_motor(g, AANPASSINGEN.get(code, {}))
    if over:
        print('niet omgezet (blijven weg uit het bestand):', ', '.join(over))
    eigen = [('plint', (0.02, 0.02, 0.02), [donker])] if donker.punten else []
    maat = schrijf_glb(uit, stof, [hout] if hout.punten else [], eigen, maat=None, ao_px=ao_px, met_ao=met_ao, hoek_scherp=65,
                       bron=f"{g['naam']}: opbouw uit de configurator, afgewerkt in Blender; vorm naar de productfoto's (benadering, geen bestand van de fabrikant).")
    print('maten van het bestand (cm):', np.round(maat, 1), '| kader van het model:', g['maat']['b'], g['maat']['d'], g['maat']['h'])
    return maat


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    px = int(sys.argv[sys.argv.index('--ao') + 1]) if '--ao' in sys.argv else 512
    if '--ao' in sys.argv:
        args.remove(str(px))
    bouw(args[0], args[1], ao_px=px, met_ao='--zonder-ao' not in sys.argv)
