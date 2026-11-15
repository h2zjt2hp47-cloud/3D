"""
Meet een 3D-bestand op de productfoto's, zonder Blender (numpy, opencv, scipy).

    python pas.py masker <foto> <uit.png> x,y [x,y ...] [--drempel 16] [--weg x,y[,straal] ...]
        Silhouet van de zetel op de foto. De punten x,y (fotopixels) liggen op de bekleding (of het onderstel);
        --weg zijn punten die er zeker niet bij horen (een schaduw, een plint). Bekijk het masker altijd één keer.

    python pas.py pas <model.glb> <opstelling.json> <maskermap> [--uit map --fotos map] [--vast] [--vrij-D]
        Zoekt per foto de camera waarmee het silhouet van het model het best op dat van de foto ligt, en meldt waar
        het model afwijkt: per hoogte de linker- en rechterrand, per plaats de bovenrand, in cm (positief = de zetel
        op de foto steekt verder uit dan het model). Schrijft de gevonden camera's terug in de opstelling, in de vorm
        die overlay.py leest. --vast houdt de camera's uit de opstelling (alleen meten), --vrij-D zoekt ook de afstand.

opstelling.json:
    { "hart_achter_voorkant": 35, "fotos": { "voor": { "bestand": "foto.jpg", "az": 0, "h": 60, "D": 300 } } }
  az, h, D zijn een eerste gok (zie overlay.py voor de betekenis); F en doel zoekt het script.
  "samen": true     de foto's komen uit één reeks op hetzelfde statief: de camerahoogte h is dan voor alle foto's gelijk.
                    Dat meet scherper dan een losse camera per foto, waar hoogte en vorm elkaar kunnen compenseren;
  "az_grens": [a, b] per foto: de richting blijft binnen deze grenzen (bv. een zijaanzicht waar je de binnenkant niet ziet).

Eerlijk blijven: bij een model zonder onderstel is er geen vaste maat buiten de zetel zelf. De camera wordt dan gepast
op het silhouet van de zetel met de maten van de website. Wat je zo meet, is de vorm binnen die maten (rand, helling,
dikte, zitting), niet de maten zelf.
"""
import json
import math
import os
import struct
import sys

import cv2
import numpy as np
from scipy.optimize import minimize


def lees_glb(pad):
    """Driehoeken (n, 3, 3) in cm, in de assen van de scripts: x breedte, y naar achter, z omhoog."""
    data = open(pad, 'rb').read()
    lengte = struct.unpack_from('<I', data, 12)[0]
    j = json.loads(data[20:20 + lengte])
    bak = data[20 + lengte + 8:]
    soort = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
    delen = {5121: 1, 5123: 1, 5125: 1, 5126: 1}

    def lees(i):
        a = j['accessors'][i]
        v = j['bufferViews'][a['bufferView']]
        n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        begin = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        return np.frombuffer(bak, soort[a['componentType']], a['count'] * n, begin).reshape(a['count'], n)

    uit = []
    for mesh in j['meshes']:
        for p in mesh['primitives']:
            pos = lees(p['attributes']['POSITION']).astype(float) * 100
            idx = lees(p['indices']).reshape(-1, 3)
            uit.append(np.stack([pos[idx][..., 0], -pos[idx][..., 2], pos[idx][..., 1]], -1))
    return np.concatenate(uit)


class Camera:
    def __init__(self, c, hart, breed, hoog):
        a = math.radians(c['az'])
        self.F, self.breed, self.hoog = c['F'], breed, hoog
        self.plaats = np.array([hart[0] + c['D'] * math.sin(a), hart[1] - c['D'] * math.cos(a), c['h']])
        doel = np.array([hart[0] + c['doel'][0], hart[1] + c['doel'][1], c['doel'][2]])
        self.voor = (doel - self.plaats) / np.linalg.norm(doel - self.plaats)
        self.rechts = np.cross(self.voor, [0, 0, 1.0]); self.rechts /= np.linalg.norm(self.rechts)
        self.op = np.cross(self.rechts, self.voor)

    def beeld(self, p):
        d = np.asarray(p, float) - self.plaats
        z = d @ self.voor
        return np.stack([self.breed / 2 + self.F * (d @ self.rechts) / z, self.hoog / 2 - self.F * (d @ self.op) / z], -1)

    def silhouet(self, drie, schaal=1.0):
        m = np.zeros((round(self.hoog * schaal), round(self.breed * schaal)), np.uint8)
        # Elke driehoek apart: fillPoly met alle driehoeken samen vult even-oneven, en laat dus gaten waar er twee overlappen.
        for d in np.round(self.beeld(drie) * schaal * 16).astype(np.int32):
            cv2.fillConvexPoly(m, d, 1, shift=4)
        return m


def masker(foto, uit, punten, weg, drempel):
    im = cv2.imread(foto)
    hoog, breed = im.shape[:2]
    lab = cv2.cvtColor(cv2.GaussianBlur(im, (0, 0), 2), cv2.COLOR_BGR2LAB).astype(float)
    m = np.full((hoog, breed), cv2.GC_PR_BGD, np.uint8)
    for x, y in punten:                                             # kleur rond elk punt: wat erop lijkt, is waarschijnlijk zetel
        kleur = lab[max(0, y - 4):y + 5, max(0, x - 4):x + 5].reshape(-1, 3).mean(0)
        m[np.linalg.norm((lab - kleur) * [0.5, 1, 1], axis=-1) < drempel] = cv2.GC_PR_FGD
    for x, y in punten:
        cv2.circle(m, (x, y), 9, int(cv2.GC_FGD), -1)
    for x, y, *straal in weg:                                       # ruime cirkel: een weerspiegeling van de zetel heeft dezelfde kleur
        cv2.circle(m, (x, y), straal[0] if straal else 24, int(cv2.GC_BGD), -1)
    rand = max(4, breed // 60)
    m[:rand] = m[-rand:] = cv2.GC_BGD; m[:, :rand] = m[:, -rand:] = cv2.GC_BGD
    cv2.grabCut(im, m, None, np.zeros((1, 65)), np.zeros((1, 65)), 6, cv2.GC_INIT_WITH_MASK)
    binnen = ((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD)).astype(np.uint8)
    binnen = cv2.morphologyEx(binnen, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, labels, stat, _ = cv2.connectedComponentsWithStats(binnen)
    kies = {labels[y, x] for x, y in punten} - {0}                  # de stukken waar een punt in ligt
    binnen = np.isin(labels, list(kies)).astype(np.uint8)
    vul = binnen.copy(); cv2.floodFill(vul, None, (0, 0), 2)        # gaten dichten
    binnen[vul == 0] = 1
    cv2.imwrite(uit, binnen * 255)
    toon = im.copy(); toon[binnen == 0] = toon[binnen == 0] // 3
    cv2.imwrite(uit.replace('.png', '-kijk.jpg'), cv2.resize(toon, (breed // 2, hoog // 2)), [cv2.IMWRITE_JPEG_QUALITY, 80])
    print(uit, f'{binnen.mean() * 100:.1f} % van de foto')


def randen(m):
    """Per rij de eerste en laatste kolom van het masker (nan = leeg), en per kolom de eerste en laatste rij."""
    def uiteinden(a):
        heeft = a.any(1)
        eerste = np.where(heeft, a.argmax(1), np.nan)
        laatste = np.where(heeft, a.shape[1] - 1 - a[:, ::-1].argmax(1), np.nan)
        return eerste, laatste
    return uiteinden(m), uiteinden(m.T)


def pas(glb, opstelling_pad, maskermap, uit, vast, vrij_d, fotomap=None):
    op = json.load(open(opstelling_pad))
    pas_fotos(lees_glb(glb), op, maskermap, uit, vast, vrij_d, fotomap)
    if not vast:
        json.dump(op, open(opstelling_pad, 'w'), indent=2, ensure_ascii=False)


def hart_van(drie, op):
    laag, hoogst = drie.reshape(-1, 3).min(0), drie.reshape(-1, 3).max(0)
    return np.array([(laag[0] + hoogst[0]) / 2, laag[1] + op.get('hart_achter_voorkant', (hoogst[1] - laag[1]) / 2), 0.0])


def pas_fotos(drie, op, maskermap, uit=None, vast=False, vrij_d=False, fotomap=None, stil=False):
    """Past de camera's van `op` op de driehoeken (in cm) en meldt de afwijkingen; geeft de overlap per foto."""
    overlap = {}
    laag, hoogst = drie.reshape(-1, 3).min(0), drie.reshape(-1, 3).max(0)
    hart = hart_van(drie, op)
    K = 0.5                                                         # zoeken op halve resolutie
    namen = list(op['fotos'])
    maskers, zacht, start = {}, {}, {}
    for naam in namen:
        c = op['fotos'][naam]
        m = (cv2.imread(os.path.join(maskermap, f'{naam}.png'), 0) > 127).astype(np.uint8)
        maskers[naam] = m
        klein = cv2.resize(m, (round(m.shape[1] * K), round(m.shape[0] * K)), interpolation=cv2.INTER_AREA).astype(np.float32)
        zacht[naam] = (klein, cv2.GaussianBlur(klein, (0, 0), 2.5))
        c.setdefault('D', 300); c.setdefault('h', 60); c.setdefault('F', 1600); c.setdefault('doel', [0, 0, hoogst[2] / 2])
        dwars = c['doel'][0] * math.cos(math.radians(c['az'])) + c['doel'][1] * math.sin(math.radians(c['az']))
        start[naam] = [c['az'], c['h'], math.log(c['F']), dwars, c['doel'][2], c['D']]

    def camera(naam, v):                                            # v = az, h, ln F, dwars, hoogte van het doel, D
        hoog, breed = maskers[naam].shape
        return Camera({'az': v[0], 'h': v[1], 'F': math.exp(v[2]), 'D': v[5], 'doel': cam_doel(v)}, hart, breed, hoog)

    def fout(naam, v):
        grens = op['fotos'][naam].get('az_grens')
        if not 5 < v[1] < 250 or not 150 < v[5] < 900 or (grens and not grens[0] <= v[0] <= grens[1]):
            return 1.0
        s = camera(naam, v).silhouet(drie, K).astype(np.float32)
        return float(np.abs(cv2.GaussianBlur(s, (0, 0), 2.5) - zacht[naam][1]).sum() / (zacht[naam][1].sum() + 1e-6))

    def zoek(doel, v, stappen):
        for stap in (stappen, [x / 3 for x in stappen]):
            simplex = np.array([v] + [list(np.array(v) + np.eye(len(v))[i] * stap[i]) for i in range(len(v))])
            v = list(minimize(doel, v, method='Nelder-Mead', options={'initial_simplex': simplex, 'xatol': 0.01, 'fatol': 1e-4, 'maxiter': 900}).x)
        return v

    if not vast:
        for naam in namen:
            # Eerst schaal en plaats op de kaders leggen.
            v = start[naam]
            klein = zacht[naam][0]
            for _ in range(3):
                s = camera(naam, v).silhouet(drie, K)
                ys, xs = np.nonzero(s); fy, fx = np.nonzero(klein > 0.5)
                if len(xs) == 0:
                    break
                v[2] += math.log(((fy.max() - fy.min()) / max(1, ys.max() - ys.min()) + (fx.max() - fx.min()) / max(1, xs.max() - xs.min())) / 2)
                cm = np.linalg.norm(camera(naam, v).plaats - hart) / math.exp(v[2]) / K
                # Staat de zetel op de foto verder naar rechts of lager dan het model, dan mikt de camera meer naar links of hoger.
                v[3] -= ((fx.max() + fx.min()) - (xs.max() + xs.min())) / 2 * cm
                v[4] += ((fy.max() + fy.min()) - (ys.max() + ys.min())) / 2 * cm
        if op.get('samen'):
            # De foto's komen uit één reeks op hetzelfde statief: de camerahoogte h is voor alle foto's gelijk (en D met
            # --vrij-D). Per foto vrij: de richting az, de schaal (de zetel stond niet altijd even ver), en waar ze stond.
            vrij = [1] + ([5] if vrij_d else [])
            eigen = [0, 2, 3, 4]

            def uit_g(g):
                for k, naam in enumerate(namen):
                    for j, i in enumerate(vrij):
                        start[naam][i] = g[j]
                    for j, i in enumerate(eigen):
                        start[naam][i] = g[len(vrij) + len(eigen) * k + j]

            def samen(g):
                uit_g(g)
                return sum(fout(n, start[n]) for n in namen) / len(namen)

            g = [float(np.mean([start[n][i] for n in namen])) for i in vrij] + [start[n][i] for n in namen for i in eigen]
            g = zoek(samen, g, [12, 40][:len(vrij)] + [6, 0.05, 3, 3] * len(namen))
            uit_g(g)
        else:
            for naam in namen:
                vrij = [0, 1, 2, 3, 4] + ([5] if vrij_d else [])

                def los(w, naam=naam, vrij=vrij):
                    v = list(start[naam])
                    for j, i in enumerate(vrij):
                        v[i] = w[j]
                    return fout(naam, v)

                w = zoek(los, [start[naam][i] for i in vrij], [6, 12, 0.05, 3, 3, 40][:len(vrij)])
                for j, i in enumerate(vrij):
                    start[naam][i] = w[j]
    for naam in namen:
        c, v = op['fotos'][naam], start[naam]
        cam = camera(naam, v)
        foto_m = maskers[naam]
        hoog, breed = foto_m.shape
        c.update(az=round(v[0], 1), h=round(v[1], 1), F=round(math.exp(v[2])), D=round(v[5]), doel=[round(float(x), 1) for x in cam_doel(v)])
        model_m = cam.silhouet(drie)
        iou = (model_m & foto_m).sum() / (model_m | foto_m).sum()
        overlap[naam] = float(iou)
        if stil:
            continue
        cm = np.linalg.norm(cam.plaats - hart) / cam.F               # cm per fotopixel op de afstand van het draaipunt
        (fl, fr), (fb, fo) = randen(foto_m)
        (ml, mr), (mb, mo) = randen(model_m)
        print(f"{naam}: overlap {iou * 100:.1f} %  camera az {c['az']} h {c['h']} F {c['F']} D {c['D']} doel {c['doel']}  ({cm:.3f} cm/px)")
        hoogtes = [z for z in (4, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100) if z < hoogst[2] + 3]
        rij = [int(round(cam.beeld(hart + [0, 0, z])[1])) for z in hoogtes]
        ok = [0 <= r < hoog for r in rij]
        toon = lambda a: ' '.join(f'{x:+5.1f}' if np.isfinite(x) else '    .' for x in a)
        print('   hoogte (cm)  ', ' '.join(f'{z:5d}' for z in hoogtes))
        print('   links  (cm)  ', toon([(ml[r] - fl[r]) * cm if k else np.nan for r, k in zip(rij, ok)]))
        print('   rechts (cm)  ', toon([(fr[r] - mr[r]) * cm if k else np.nan for r, k in zip(rij, ok)]))
        half = max(hoogst[0] - laag[0], hoogst[1] - laag[1]) / 2
        plaatsen = [round(t * half) for t in (-0.9, -0.7, -0.5, -0.3, -0.1, 0.1, 0.3, 0.5, 0.7, 0.9)]
        kol = [int(round(cam.beeld(hart + cam.rechts * [1, 1, 0] * p + [0, 0, hoogst[2] / 2])[0])) for p in plaatsen]
        okk = [0 <= k < breed for k in kol]
        print('   plaats (cm)  ', ' '.join(f'{p:5d}' for p in plaatsen))
        print('   boven  (cm)  ', toon([(mb[k] - fb[k]) * cm if o else np.nan for k, o in zip(kol, okk)]))
        print('   onder  (cm)  ', toon([(fo[k] - mo[k]) * cm if o else np.nan for k, o in zip(kol, okk)]))
        if uit:
            os.makedirs(uit, exist_ok=True)
            beeld = cv2.imread(os.path.join(fotomap or maskermap, c['bestand']))
            if beeld is None:
                beeld = cv2.cvtColor(foto_m * 160, cv2.COLOR_GRAY2BGR)
            for m, kleur in ((foto_m, (255, 200, 0)), (model_m, (0, 255, 255))):   # foto: blauw, model: geel
                lijnen, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
                cv2.drawContours(beeld, lijnen, -1, kleur, 2)
            cv2.imwrite(os.path.join(uit, f'pas-{naam}.jpg'), beeld, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return overlap


def cam_doel(v):
    return [v[3] * math.cos(math.radians(v[0])), v[3] * math.sin(math.radians(v[0])), v[4]]


if __name__ == '__main__':
    arg = sys.argv[1:]
    paar = lambda s: tuple(int(t) for t in s.split(','))
    if arg[0] == 'masker':
        weg = [paar(a) for a in arg[arg.index('--weg') + 1:]] if '--weg' in arg else []
        rest = arg[3:arg.index('--weg')] if '--weg' in arg else arg[3:]
        drempel = float(rest[rest.index('--drempel') + 1]) if '--drempel' in rest else 16.0
        punten = [paar(a) for a in rest if ',' in a]
        masker(arg[1], arg[2], punten, weg, drempel)
    elif arg[0] == 'pas':
        uit = arg[arg.index('--uit') + 1] if '--uit' in arg else None
        fotos = arg[arg.index('--fotos') + 1] if '--fotos' in arg else None
        pas(arg[1], arg[2], arg[3], uit, '--vast' in arg, '--vrij-D' in arg, fotos)
