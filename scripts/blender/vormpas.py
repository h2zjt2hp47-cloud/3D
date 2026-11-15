"""
PROEF, NIET GEBRUIKEN ZONDER DE BINNENLIJNEN MEE TE METEN.
Uitslag bij Manon (15/11/2026): de overlap van de silhouetten steeg (98 / 95 / 97 %), maar Jonas vond het vorige bestand
juister, en terecht: de voorrand van de zitting ligt op de foto op 49 % van de hoogte, in het vorige bestand op 48 %, in
het "nagemeten" bestand op 55 %. Een silhouet weet niets van de lijnen binnen de omtrek, en zonder onderstel is er geen
vaste maat om de camera aan op te hangen: camera en vorm compenseren elkaar. Het resultaat is niet gekoppeld; Manon
staat weer op het goedgekeurde bestand. Zie LEESMIJ.md, "Nameten op de foto's".

Zoekt voor een model uit de motor de aanpassingen (aanpassingen.py) waarmee zijn silhouet het best op de productfoto's
ligt. Zonder Blender: de netten van uit_motor.py worden rechtstreeks op de foto's gelegd (zie pas.py).

    python vormpas.py <code> <opstelling.json> <maskermap> <vrij.json> [--rondes 2] [--vrij-D] [--bewaar] [--uit map --fotos map]

vrij.json: welke aanpassingen mogen bewegen, met start en grenzen:
    { "rug.leun_extra": [0, -0.05, 0.1], "rug.rand:0.6": [72, 60, 75], "zitkussen.zit_schaal": [1, 0.9, 1.15] }
  "blok.sleutel" is een sleutel uit aanpassingen.py; "rug.rand:0.6" is de hoogte van de rand op plaats 0.6 (0 = midden van
  de rug, 1 = uiteinde); alle rand-punten samen worden de aanpassing `rand`.
  "foto.breed" en "foto.diep" zijn geen aanpassing van het model maar een meting: hoeveel breder of dieper de zetel op de
  foto's is dan de maten van de website, als de hoogte klopt. Het bestand zelf blijft op de maten van de website.

Per ronde: eerst de camera's opnieuw passen op het model zoals het dan is, dan de vorm. Het model komt altijd op de maten
van de website uit (maat_vast), dus gemeten wordt de vorm binnen die maten. Met --bewaar komt het resultaat in
gemeten/<code>.json; uit_motor.py legt dat bovenop wat met de hand in aanpassingen.py staat. Kijk het resultaat altijd na
op de foto's: een silhouet zegt niets over wat achter de omtrek zit (de zitting mag bv. niet door de wand steken; daar
waakt door_de_wand over).
"""
import copy
import json
import os
import sys

import cv2
import numpy as np
from scipy.optimize import minimize

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aanpassingen import AANPASSINGEN                               # noqa: E402
from pas import Camera, hart_van, pas_fotos                         # noqa: E402
from uit_motor import HIER, netten_uit_motor                        # noqa: E402

K = 0.35                                                            # zoeken op een derde van de resolutie


def door_de_wand(meet):
    """
    Hoe ver de zitting op haar ergste punt te dicht bij de buitenkant van de wand komt (cm; 0 = in orde). Aan de
    uiteinden van de wand, waar je de dikte van de wand ziet, blijft er onderaan 3 cm en ter hoogte van de zitting
    5 cm wand rond de zitting; achteraan (niet te zien) volstaat het dat de zitting binnen de wand blijft.
    """
    if 'wand' not in meet or 'zit' not in meet:
        return 0.0
    buiten, nrm, schuif, onder = meet['wand']
    plaats = np.abs(np.linspace(-1, 1, len(buiten)))                # 0 = midden van de rug, 1 = uiteinde
    erg = 0.0
    for omtrek, laag, hoog, taps in meet['zit']:
        hart = (omtrek.max(0) + omtrek.min(0)) / 2
        straal = np.linalg.norm(omtrek - hart, axis=1, keepdims=True)
        for z, q, zichtbaar in ((max(laag, onder), hart + (omtrek - hart) * (1 - taps / np.maximum(straal, 1)), 3.0), (hoog, omtrek, 5.0)):
            lijn = buiten + schuif * (z - onder)
            dichtst = np.linalg.norm(q[:, None, :] - lijn[None, :, :], axis=-1).argmin(1)
            binnen = (dichtst > 0) & (dichtst < len(lijn) - 1)       # voorbij het uiteinde van de wand is de zitting vrij
            if binnen.any():
                uit = ((q - lijn[dichtst]) * nrm[dichtst]).sum(1)
                nodig = np.where(plaats[dichtst] >= 0.55, zichtbaar, 0.3)
                erg = max(erg, float((uit + nodig)[binnen].max()))
    return max(0.0, erg)


def driehoeken(g, aan, straf=None):
    """Alle driehoeken van het model (cm), op de maten van de website gezet zoals schrijf_glb dat doet."""
    foto = aan.pop('foto', {})
    aan['_meet'] = {}
    stof, hout, donker, _ = netten_uit_motor(g, aan)
    if straf is not None:
        straf.append(door_de_wand(aan['_meet']))
    uit = []
    for net in list(stof) + [hout, donker]:
        if not net.punten:
            continue
        p = np.array(net.punten)
        for v in net.vlakken:
            for i in range(1, len(v) - 1):
                uit.append(p[[v[0], v[i], v[i + 1]]])
    drie = np.array(uit)
    lo, hi = drie.reshape(-1, 3).min(0), drie.reshape(-1, 3).max(0)
    drie = (drie - [0, 0, lo[2]]) * (np.array([g['maat']['b'], g['maat']['d'], g['maat']['h']]) / (hi - lo))
    return drie * [foto.get('breed', 1.0), foto.get('diep', 1.0), 1.0]


def aan_van(basis, namen, waarden, hoogte):
    aan = copy.deepcopy(basis)
    rand = {}
    for naam, w in zip(namen, waarden):
        blok, sleutel = naam.split('.', 1)
        if sleutel.startswith('rand:'):
            rand.setdefault(blok, {})[float(sleutel[5:])] = float(w)
        else:
            aan.setdefault(blok, {})[sleutel] = float(w)
    for blok, punten in rand.items():
        punten.setdefault(0.0, hoogte)
        aan.setdefault(blok, {})['rand'] = sorted(punten.items())
    return aan


if __name__ == '__main__':
    arg = sys.argv[1:]
    code, opstelling_pad, maskermap, vrij_pad = arg[:4]
    rondes = int(arg[arg.index('--rondes') + 1]) if '--rondes' in arg else 2
    uit = arg[arg.index('--uit') + 1] if '--uit' in arg else None
    fotomap = arg[arg.index('--fotos') + 1] if '--fotos' in arg else None
    g = json.load(open(os.path.join(HIER, 'gegevens', f'{code}.json')))
    op = json.load(open(opstelling_pad))
    vrij = json.load(open(vrij_pad))
    namen = list(vrij)
    x = np.array([vrij[n][0] for n in namen], float)
    grenzen = [(vrij[n][1], vrij[n][2]) for n in namen]
    basis = copy.deepcopy(AANPASSINGEN.get(code, {}))
    basis['maat_vast'] = True
    fotos = {}
    for naam in op['fotos']:
        m = (cv2.imread(os.path.join(maskermap, f'{naam}.png'), 0) > 127).astype(np.uint8)
        klein = cv2.resize(m, (round(m.shape[1] * K), round(m.shape[0] * K)), interpolation=cv2.INTER_AREA).astype(np.float32)
        fotos[naam] = (m.shape, cv2.GaussianBlur(klein, (0, 0), 1.5))

    def fout(w, cams):
        straf = []
        try:
            drie = driehoeken(g, aan_van(basis, namen, w, g['maat']['h']), straf)
        except Exception:                                           # een onmogelijke vorm (bv. een wand zonder lengte)
            return 9.0
        som = 0.0
        for naam, cam in cams.items():
            _, zacht = fotos[naam]
            s = cv2.GaussianBlur(cam.silhouet(drie, K).astype(np.float32), (0, 0), 1.5)
            som += float(np.abs(s - zacht).sum() / zacht.sum())
        # Een silhouet ziet niet dat de zitting door de wand steekt: dat kost hier evenveel als een slechte overlap.
        return som / len(cams) + 0.01 * straf[0] ** 2

    for ronde in range(rondes):
        drie = driehoeken(g, aan_van(basis, namen, x, g['maat']['h']))
        overlap = pas_fotos(drie, op, maskermap, stil=True, vrij_d='--vrij-D' in arg)
        hart = hart_van(drie, op)
        cams = {n: Camera(c, hart, fotos[n][0][1], fotos[n][0][0]) for n, c in op['fotos'].items()}
        voor = fout(x, cams)
        r = minimize(fout, x, args=(cams,), method='Powell', bounds=grenzen, options={'xtol': 0.01, 'ftol': 1e-4, 'maxiter': 3})
        x = r.x
        print(f"ronde {ronde + 1}: overlap bij de start {', '.join(f'{n} {o * 100:.1f} %' for n, o in overlap.items())} | fout {voor:.4f} -> {r.fun:.4f} ({r.nfev} proeven)", flush=True)
    aan = aan_van(basis, namen, x, g['maat']['h'])
    straf = []
    drie = driehoeken(g, aan, straf)
    print(f'\nna het passen (zitting door de wand: {straf[0]:.1f} cm):')
    overlap = pas_fotos(drie, op, maskermap, uit=uit, fotomap=fotomap, vrij_d='--vrij-D' in arg)
    json.dump(op, open(opstelling_pad, 'w'), indent=2, ensure_ascii=False)
    if '--bewaar' in arg:
        gemeten = aan_van({}, namen, np.round(x, 3), round(float(x[namen.index('rug.rand:0')]), 1) if 'rug.rand:0' in namen else g['maat']['h'])
        foto = gemeten.pop('foto', {})
        for blok in gemeten.values():
            if 'rand' in blok:
                blok['rand'] = [[p, round(h, 1)] for p, h in blok['rand']]
        bewaar = {'_uitleg': "Gemeten op de productfoto's met vormpas.py (benadering). _foto: verhouding van de zetel op de foto's tot de maten "
                             "van de website bij gelijke hoogte; _overlap: hoeveel van het silhouet samenvalt, per foto.",
                  '_foto': foto, '_overlap': {n: round(o * 100, 1) for n, o in overlap.items()}, 'maat_vast': True, **gemeten}
        os.makedirs(os.path.join(HIER, 'gemeten'), exist_ok=True)
        json.dump(bewaar, open(os.path.join(HIER, 'gemeten', f'{code}.json'), 'w'), indent=2, ensure_ascii=False)
        print('bewaard in', os.path.join('gemeten', f'{code}.json'))
    print('\ngevonden (afronden en in aanpassingen.py zetten):')
    for n, w in zip(namen, x):
        print(f'  {n:28s} {w:8.3f}   (start {vrij[n][0]}, grenzen {vrij[n][1]} .. {vrij[n][2]})')
    json.dump({n: round(float(w), 3) for n, w in zip(namen, x)}, open(vrij_pad.replace('.json', '-uit.json'), 'w'), indent=1)
