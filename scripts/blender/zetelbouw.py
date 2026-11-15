"""
Bouwstenen om een zetel als 3D-bestand (GLB) te bouwen in Blender, voor de configurator (zie LEESMIJ.md).

Twee manieren om een model te beschrijven:
  - met de hand, als gegevens in een eigen script (sullivan.py);
  - vanuit de opbouw van de motor (gegevens/<code>.json, gemaakt door exporteer.mjs), met aanpassingen per model
    (uit_motor.py). Zo heeft het bestand dezelfde maten en opbouw als het model in de configurator.

Assen in dit bestand (cm): x = breedte, y = diepte met de RUG naar +y, z = hoogte. De motor rekent met x, hoogte y en
diepte z met de rug naar −z; `van_motor()` zet om. Bij het exporteren wordt alles meter, y omhoog, voorkant naar +z.
"""
import json
import math
import os
import struct
import tempfile

import numpy as np

RIJEN = [0, .04, .09, .15, .23, .32, .42, .52, .62, .72, .81, .89, .95, 1.0]   # hoogtes langs een wand (0 = onder, 1 = rand)
ROL_STAPPEN = 5         # tussenpunten over de ronde rand
KOP_STAPPEN = 4         # ringen in de ronde kop van een wanduiteinde
SEGMENTEN = 72


def pchip(punten):
    """Vloeiende kromme door de punten, zonder doorschieten (monotone kubische interpolatie)."""
    xs = np.array([p[0] for p in punten], float)
    ys = np.array([p[1] for p in punten], float)
    h = np.diff(xs)
    d = np.diff(ys) / h
    m = np.zeros_like(ys)
    m[0], m[-1] = d[0], d[-1]
    for i in range(1, len(xs) - 1):
        if d[i - 1] * d[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])

    def f(x):
        x = np.clip(np.asarray(x, float), xs[0], xs[-1])
        i = np.clip(np.searchsorted(xs, x, side='right') - 1, 0, len(xs) - 2)
        t = (x - xs[i]) / h[i]
        return ((2 * t**3 - 3 * t**2 + 1) * ys[i] + (t**3 - 2 * t**2 + t) * h[i] * m[i]
                + (-2 * t**3 + 3 * t**2) * ys[i + 1] + (t**3 - t**2) * h[i] * m[i + 1])
    return f


def eenheid(v):
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return v / np.where(n > 1e-9, n, 1)


def zacht(t):
    """Vloeiende overgang van 0 naar 1."""
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


class Net:
    """Verzamelt hoekpunten, vlakken, stukken stof (UV-eilanden in cm) en naden van één deel."""

    def __init__(self):
        self.punten, self.vlakken, self.uv, self.eilanden, self.naden = [], [], [], {}, []

    def punt(self, p):
        self.punten.append(tuple(float(c) for c in p))
        return len(self.punten) - 1

    def vlak(self, hoeken, eiland, uvs):
        """hoeken: indexen; uvs: per hoek (u, v) in cm binnen het eiland."""
        self.vlakken.append(tuple(hoeken))
        self.uv.append((eiland, [tuple(map(float, q)) for q in uvs]))
        e = self.eilanden.setdefault(eiland, [1e9, 1e9, -1e9, -1e9])
        for u, v in uvs:
            e[0], e[1], e[2], e[3] = min(e[0], u), min(e[1], v), max(e[2], u), max(e[3], v)


# ----------------------------------------------------------------------------------------------------------------
# Dikke wand: een gestoffeerde schaal (rug en armen) met een ronde rand en ronde koppen
# ----------------------------------------------------------------------------------------------------------------
def dikke_wand(net, buiten, onder, top, dikte_rand, dikte, *, raak=None, naar_buiten=None, groef=None, rijen=RIJEN,
               naam='schaal', naden=True, naad_rand=True, rand_vorm=2.0, rand_hoog=1.0):
    """
    Een wand als dik vel: de buitenkant is gegeven, de binnenkant is de buitenkant min de dikte, en de vrije rand
    (bovenkant en de twee uiteinden) is overal een halve rol.

      buiten(Z)        punten (n, K+1, 3) van de buitenkant op de hoogtes Z (n, K+1), n = aantal standen langs de wand;
      onder            hoogte van de onderrand: getal of (n,);
      top              hoogste punt van de rol per stand (n,);
      dikte_rand       dikte aan de rand per stand (n,): de rol heeft de halve dikte als straal;
      dikte(Z)         dikte per punt (n, K+1), bv. dunner waar de wand achter de zitting verdwijnt;
      raak(Z)          (langs de wand, omhoog): raakrichtingen; standaard uit verschillen;
      naar_buiten(O)   richting die naar buiten wijst per punt (om de normaal de goede kant op te zetten);
      groef            (n,) diepte van een plooi in de binnenkant (waar een arm tegen de rug ligt);
      rand_vorm        vorm van de rand in doorsnede: 2 = halve cirkel, hoger = vlakker bovenaan met rondere schouders;
      rand_hoog        hoogte van de rand tegenover een halve cirkel (1 = even hoog als de halve dikte).

    Geeft het rooster terug (O, I, Z) voor wie wil meten.
    """
    top, dikte_rand = np.asarray(top, float), np.asarray(dikte_rand, float)
    n, K = len(top), len(rijen) - 1
    onder = np.broadcast_to(np.asarray(onder, float), (n,))
    f = np.array(rijen)
    dz = 0.25
    if raak is None:
        raak = lambda Z: (np.gradient(buiten(Z), axis=0), buiten(Z + dz) - buiten(Z - dz))
    if naar_buiten is None:
        naar_buiten = lambda O: np.stack([O[..., 0], O[..., 1], np.zeros_like(O[..., 0])], -1)
    hoeken_rol = [(j + 1) * math.pi / (ROL_STAPPEN + 1) for j in range(ROL_STAPPEN)]
    # Doorsnede van de rand: (deel langs de rand omhoog, deel dwars) per hoek; bij vorm 2 en hoogte 1 een halve cirkel.
    op = lambda al: rand_hoog * math.sin(al) ** (2 / rand_vorm)
    dwars = lambda al: math.copysign(abs(math.cos(al)) ** (2 / rand_vorm), math.cos(al))
    z_rand = top - rand_hoog * dikte_rand / 2
    # De rol staat haaks op de (schuine) wand en op de randlijn: zijn hoogste punt ligt dus niet precies een halve dikte
    # boven de rand. Enkele rondes bijstellen tot de rol overal op de gevraagde hoogte uitkomt.
    for ronde in range(4):
        Z = onder[:, None] + f[None, :] * (z_rand[:, None] - onder[:, None])
        O = buiten(Z)
        Tg, Tz = raak(Z)
        N = eenheid(np.cross(Tg, Tz))
        N *= np.sign(np.sum(N * naar_buiten(O), -1, keepdims=True))
        D = dikte(Z)
        I = O - N * D[..., None]
        M = O - N * D[..., None] / 2
        # Rand: een halve rol, haaks op de randlijn.
        rl = np.gradient(O[:, K, :], axis=0)
        Trand = eenheid(np.cross(N[:, K, :], eenheid(rl)))
        Trand *= np.sign(np.sum(Trand * (O[:, K, :] - O[:, K - 1, :]), -1, keepdims=True))
        # Waar de randlijn knikt (van de zwaai naar de arm) de richting van de rol uitmiddelen: anders draait ze daar in één stap.
        for _ in range(3):
            rand = np.pad(Trand, ((1, 1), (0, 0)), mode='edge')
            Trand = eenheid(0.25 * rand[:-2] + 0.5 * rand[1:-1] + 0.25 * rand[2:])
        hoogst = np.max([M[:, K, 2] + (Trand[:, 2] * op(al) + N[:, K, 2] * dwars(al)) * D[:, K] / 2 for al in np.linspace(0, math.pi, 25)], axis=0)
        z_rand = z_rand - (hoogst - top)
    # Per ringpunt: hart en uitwijking (zodat de kop van een uiteinde dezelfde opbouw kan krimpen).
    L = 2 * (K + 1) + ROL_STAPPEN
    hart = np.zeros((n, L, 3)); uit = np.zeros((n, L, 3))
    for k in range(K + 1):
        hart[:, k] = M[:, k]; uit[:, k] = N[:, k] * D[:, k, None] / 2
        hart[:, L - 1 - k] = M[:, k]; uit[:, L - 1 - k] = -N[:, k] * D[:, k, None] / 2
    for j, al in enumerate(hoeken_rol):
        hart[:, K + 1 + j] = M[:, K]
        uit[:, K + 1 + j] = (Trand * op(al) + N[:, K] * dwars(al)) * D[:, K, None] / 2
    # Een plooi: een smalle geul in de binnenkant (en de binnenste helft van de rol); buiten blijft glad.
    if groef is not None:
        groef = np.asarray(groef, float)
        for k in range(K + 1):
            uit[:, L - 1 - k] += N[:, k] * groef[:, None]
        for j, al in enumerate(hoeken_rol):
            if al > math.pi / 2:
                s = (al - math.pi / 2) / (math.pi / 2)
                uit[:, K + 1 + j] += N[:, K] * (groef * s * s * (3 - 2 * s))[:, None]
    ringen = [hart[i] + uit[i] for i in range(n)]
    # Ronde kop aan elk uiteinde: de laatste ring krimpt rond zijn hartlijn en schuift verder langs de wand.
    Teind = eenheid(Tg)
    straal_ring = np.linalg.norm(uit, axis=-1)

    def kop(i, teken):
        t = np.zeros((L, 3))
        for k in range(K + 1):
            t[k] = t[L - 1 - k] = Teind[i, k] * teken
        for j in range(ROL_STAPPEN):
            t[K + 1 + j] = Teind[i, K] * teken
        uitkomst = []
        for j in range(1, KOP_STAPPEN + 1):
            be = j * (math.pi / 2) / KOP_STAPPEN
            uitkomst.append(hart[i] + t * straal_ring[i][:, None] * math.sin(be) + uit[i] * math.cos(be))
        return uitkomst

    links = list(reversed(kop(0, -1.0)))
    rechts = kop(n - 1, 1.0)
    alle = links + ringen + rechts
    idx = [[net.punt(p) for p in ring] for ring in alle]
    # Stof: u = lengte langs de wand (gemiddeld over de zichtbare rijen), v = lengte langs de ring.
    kam = K + 1 + ROL_STAPPEN // 2                                   # ringpunt op de kam van de rol: daar splitst de stof
    alle_np = np.array(alle)
    stap_b = np.linalg.norm(np.diff(alle_np[:, 3:K + 1], axis=0), axis=-1).mean(axis=1)
    stap_i = np.linalg.norm(np.diff(alle_np[:, L - 1 - K:L - 3], axis=0), axis=-1).mean(axis=1)
    u_b = np.concatenate([[0], np.cumsum(stap_b)]); u_i = np.concatenate([[0], np.cumsum(stap_i)])
    v = np.concatenate([np.zeros((len(alle), 1)), np.cumsum(np.linalg.norm(np.diff(alle_np, axis=1), axis=-1), axis=1)], axis=1)
    for i in range(len(alle) - 1):
        for r in range(L):
            r2 = (r + 1) % L
            hoeken = (idx[i][r], idx[i + 1][r], idx[i + 1][r2], idx[i][r2])
            if r2 == 0:                                              # onderkant (verborgen): klein stukje stof
                net.vlak(hoeken, f'{naam}_onder', [(0, 0), (1, 0), (1, 1), (0, 1)])
            elif r < kam:                                            # buitenkant tot op de kam
                net.vlak(hoeken, f'{naam}_buiten', [(u_b[i], v[i][r]), (u_b[i + 1], v[i + 1][r]), (u_b[i + 1], v[i + 1][r2]), (u_b[i], v[i][r2])])
            else:                                                    # binnenkant: hoogte gemeten vanaf haar onderrand, zodat de stof rechtop staat
                w = lambda a, b: v[a][L - 1] - v[a][b]
                net.vlak(hoeken, f'{naam}_binnen', [(u_i[i], w(i, r)), (u_i[i + 1], w(i + 1, r)), (u_i[i + 1], w(i + 1, r2)), (u_i[i], w(i, r2))])
    # Naden (lijnen op het vel stof): rond de rug waar de rol begint, en rond de kop van elk uiteinde.
    if naden:
        eerste, laatste = len(links), len(links) + n - 1
        if naad_rand:
            net.naden.append((f'{naam}_buiten', [(u_b[i], v[i][K]) for i in range(eerste, laatste + 1)]))
        for i in (eerste, laatste):
            net.naden.append((f'{naam}_buiten', [(u_b[i], v[i][r]) for r in range(2, kam + 1)]))
            net.naden.append((f'{naam}_binnen', [(u_i[i], v[i][L - 1] - v[i][r]) for r in range(kam + 1, L - 2)]))
    return dict(O=O, I=I, Z=Z)


# ----------------------------------------------------------------------------------------------------------------
# Draailichamen, lichamen rond een omtrek, balken, kussens
# ----------------------------------------------------------------------------------------------------------------
def draailichaam(net, profiel, eiland_zij, eiland_boven=None, boven_vanaf=None, segmenten=SEGMENTEN, hart=(0.0, 0.0)):
    """profiel: (straal, z) van onder naar boven. Zijkant: stof rond de omtrek; bovenvlak: vlak stuk stof."""
    pr = np.array(profiel, float)
    lengte = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pr, axis=0), axis=1))])
    r_ref = pr[:, 0].max()
    ring = []
    for r, z in pr:
        if r < 1e-6:
            ring.append([net.punt((hart[0], hart[1], z))] * (segmenten + 1))
        else:
            rij = [net.punt((hart[0] + r * math.sin(2 * math.pi * s / segmenten), hart[1] - r * math.cos(2 * math.pi * s / segmenten), z)) for s in range(segmenten)]
            ring.append(rij + [rij[0]])
    for k in range(len(pr) - 1):
        boven = boven_vanaf is not None and k >= boven_vanaf
        for s in range(segmenten):
            a, b, c, d = ring[k][s], ring[k][s + 1], ring[k + 1][s + 1], ring[k + 1][s]
            hoeken = [h for i, h in enumerate((a, b, c, d)) if h not in (a, b, c, d)[:i]]
            if len(hoeken) < 3:
                continue
            if boven:
                uv = [(net.punten[h][0], net.punten[h][1]) for h in hoeken]
                net.vlak(hoeken, eiland_boven, uv)
            else:
                u0, u1 = 2 * math.pi * r_ref * s / segmenten, 2 * math.pi * r_ref * (s + 1) / segmenten
                alle = {a: (u0, lengte[k]), b: (u1, lengte[k]), c: (u1, lengte[k + 1]), d: (u0, lengte[k + 1])}
                net.vlak(hoeken, eiland_zij, [alle[h] for h in hoeken])


def omtreklichaam(net, omtrek, profiel, eiland_zij, eiland_boven=None, boven_vanaf=None, bol=0.0, ringen_boven=4, onder_dicht=False):
    """
    Een lichaam rond een gesloten omtrek in het grondvlak (zitting, houten ring, plint): het profiel loopt de omtrek rond.

      omtrek    punten (x, y) rondom, tegen of met de klok;
      profiel   (naar binnen, z) van onder naar boven: hoeveel cm de wand op die hoogte binnen de omtrek ligt;
      bol       hoe hoog het bovenvlak in het midden boven de laatste ring uitkomt (bolle zitting).
    Het bovenvlak (vanaf `boven_vanaf`, plus het vlak binnen de laatste ring) is een eigen, vlak stuk stof.
    """
    P = np.array(omtrek, float)
    if np.allclose(P[0], P[-1]):
        P = P[:-1]
    m = len(P)
    # Normaal naar buiten per punt (haaks op de richting van de omtrek, weg van het zwaartepunt).
    raak = eenheid(np.roll(P, -1, axis=0) - np.roll(P, 1, axis=0))
    nrm = np.stack([raak[:, 1], -raak[:, 0]], -1)
    zw = P.mean(axis=0)
    if np.sum(nrm * (P - zw)) < 0:
        nrm = -nrm
    pr = np.array(profiel, float)
    lengte = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pr, axis=0), axis=1))])
    langs = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(np.vstack([P, P[:1]]), axis=0), axis=1))])
    ring = []
    for inw, z in pr:
        q = P - nrm * inw
        rij = [net.punt((q[s, 0], q[s, 1], z)) for s in range(m)]
        ring.append(rij + [rij[0]])
    for k in range(len(pr) - 1):
        boven = boven_vanaf is not None and k >= boven_vanaf
        for s in range(m):
            a, b, c, d = ring[k][s], ring[k][s + 1], ring[k + 1][s + 1], ring[k + 1][s]
            if boven:
                net.vlak((a, b, c, d), eiland_boven, [(net.punten[h][0], net.punten[h][1]) for h in (a, b, c, d)])
            else:
                net.vlak((a, b, c, d), eiland_zij, [(langs[s], lengte[k]), (langs[s + 1], lengte[k]), (langs[s + 1], lengte[k + 1]), (langs[s], lengte[k + 1])])
    if onder_dicht:                                                  # onderkant (meestal verborgen): één waaier
        midden = net.punt((zw[0], zw[1], pr[0, 1]))
        for s in range(m):
            net.vlak((ring[0][s + 1], ring[0][s], midden), f'{eiland_zij}_onder', [(0, 0), (1, 0), (0.5, 1)])
    if eiland_boven is None:
        return
    # Bovenvlak: ringen naar het zwaartepunt toe, met de bolling.
    rand = P - nrm * pr[-1, 0]
    z0 = pr[-1, 1]
    vorige = ring[-1]
    for j in range(1, ringen_boven + 1):
        t = 1 - j / ringen_boven
        z = z0 + bol * (1 - t * t)
        if j == ringen_boven:
            midden = net.punt((zw[0], zw[1], z))
            for s in range(m):
                hoeken = (vorige[s], vorige[s + 1], midden)
                net.vlak(hoeken, eiland_boven, [(net.punten[h][0], net.punten[h][1]) for h in hoeken])
        else:
            q = zw + (rand - zw) * t
            rij = [net.punt((q[s, 0], q[s, 1], z)) for s in range(m)]
            rij.append(rij[0])
            for s in range(m):
                hoeken = (vorige[s], vorige[s + 1], rij[s + 1], rij[s])
                net.vlak(hoeken, eiland_boven, [(net.punten[h][0], net.punten[h][1]) for h in hoeken])
            vorige = rij


def balk(net, onder, boven, eiland):
    """Balk tussen twee vierkanten/rechthoeken: onder en boven zijn elk 4 hoekpunten (tegen de klok in, van boven gezien)."""
    o = [net.punt(p) for p in onder]
    b = [net.punt(p) for p in boven]
    vier = [(0, 0), (1, 0), (1, 1), (0, 1)]
    for i in range(4):
        j = (i + 1) % 4
        net.vlak((o[i], o[j], b[j], b[i]), eiland, vier)
    net.vlak((o[3], o[2], o[1], o[0]), eiland, vier)
    net.vlak((b[0], b[1], b[2], b[3]), eiland, vier)


def rechthoek(cx, cy, hx, hy, z, draai=0.0):
    c, s = math.cos(draai), math.sin(draai)
    return [(cx + x * c - y * s, cy + x * s + y * c, z) for x, y in ((-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy))]


def staaf(net, onder, boven, straal_onder, straal_boven, eiland, zijden=14):
    """Ronde poot of schijf tussen twee middelpunten (x, y, z)."""
    o = [net.punt((onder[0] + straal_onder * math.cos(2 * math.pi * s / zijden), onder[1] + straal_onder * math.sin(2 * math.pi * s / zijden), onder[2])) for s in range(zijden)]
    b = [net.punt((boven[0] + straal_boven * math.cos(2 * math.pi * s / zijden), boven[1] + straal_boven * math.sin(2 * math.pi * s / zijden), boven[2])) for s in range(zijden)]
    vier = [(0, 0), (1, 0), (1, 1), (0, 1)]
    for s in range(zijden):
        t = (s + 1) % zijden
        net.vlak((o[s], o[t], b[t], b[s]), eiland, vier)
    mo, mb = net.punt(onder), net.punt(boven)
    for s in range(zijden):
        t = (s + 1) % zijden
        net.vlak((o[t], o[s], mo), eiland, vier[:3])
        net.vlak((b[s], b[t], mb), eiland, vier[:3])


def kussen(net, hart, breed, hoog, dik, naam, *, hoekig=5.0, rand_dik=0.16, kantel=0.0, draai=0.0, ringen=5, segmenten=28):
    """
    Los kussen: een lens met een afgerond vierkante omtrek en een naad rondom.

      hart      midden van het kussen (x, y, z);
      breed, hoog   maten van het vlak; dik = dikte in het midden;
      kantel    graden achterover (rond de onderrand); draai = graden rond de verticale as (van boven gezien, tegen de klok).
      hoekig    hoe vierkant de omtrek is (2 = ovaal, 5 = afgerond vierkant); rand_dik = dikte aan de naad tegenover het midden.
    Voor- en achterkant zijn elk een eigen stuk stof; de naad loopt over de omtrek.
    """
    a, b = breed / 2, hoog / 2
    al = np.linspace(0, 2 * math.pi, segmenten, endpoint=False)
    c, s = np.cos(al), np.sin(al)
    straal = (np.abs(c / a) ** hoekig + np.abs(s / b) ** hoekig) ** (-1 / hoekig)
    rand = np.stack([straal * c, straal * s], -1)                    # omtrek in het vlak (x, hoogte)
    kt, dr = math.radians(kantel), math.radians(draai)

    def plaats(x, h, d):
        """Lokaal (x langs de breedte, h omhoog, d naar voren) → wereld: kantelen rond de onderrand, draaien, verplaatsen."""
        hh = h + b                                                   # hoogte boven de onderrand
        y_lok = -d * math.cos(kt) + hh * math.sin(kt)                # naar achter
        z_lok = hh * math.cos(kt) + d * math.sin(kt) - b
        xw = x * math.cos(dr) - y_lok * math.sin(dr)
        yw = x * math.sin(dr) + y_lok * math.cos(dr)
        return (hart[0] + xw, hart[1] + yw, hart[2] + z_lok)

    randen = {}
    for kant, teken in (('voor', 1.0), ('achter', -1.0)):
        vorige, uv_van = None, {}
        for j in range(ringen + 1):
            t = j / ringen                                           # 0 = midden, 1 = rand
            half = (dik / 2) * (rand_dik + (1 - rand_dik) * math.sqrt(max(0.0, 1 - t ** 2.6)))
            if j == 0:
                midden = net.punt(plaats(0, 0, teken * half))
                uv_van[midden] = (0.0, 0.0)
                rij = [midden] * (segmenten + 1)
            else:
                rij = [net.punt(plaats(rand[q, 0] * t, rand[q, 1] * t, teken * half)) for q in range(segmenten)]
                for q in range(segmenten):
                    uv_van[rij[q]] = (rand[q, 0] * t * teken, rand[q, 1] * t)
                rij.append(rij[0])
            if vorige is not None:
                for q in range(segmenten):
                    hoeken = [vorige[q], vorige[q + 1], rij[q + 1], rij[q]] if teken > 0 else [vorige[q + 1], vorige[q], rij[q], rij[q + 1]]
                    hoeken = [h for i, h in enumerate(hoeken) if h not in hoeken[:i]]
                    net.vlak(hoeken, f'{naam}_{kant}', [uv_van[h] for h in hoeken])
            vorige = rij
        randen[kant] = vorige
    # De naadrand tussen voor- en achterkant sluiten (anders zijn het twee losse vellen).
    for q in range(segmenten):
        net.vlak((randen['voor'][q], randen['voor'][q + 1], randen['achter'][q + 1], randen['achter'][q]), f'{naam}_rand', [(0, 0), (1, 0), (1, 1), (0, 1)])
    net.naden.append((f'{naam}_voor', [(rand[q % segmenten, 0] * 0.985, rand[q % segmenten, 1] * 0.985) for q in range(segmenten + 1)]))


# ----------------------------------------------------------------------------------------------------------------
# Stof verdelen over één vel (atlas): alle stukken op dezelfde schaal en rechtop, naast en boven elkaar.
# ----------------------------------------------------------------------------------------------------------------
def verdeel(netten, marge=2.5):
    stukken = {}
    for net in netten:
        for naam, (u0, v0, u1, v1) in net.eilanden.items():
            stukken[naam] = (u0, v0, u1 - u0 + 2 * marge, v1 - v0 + 2 * marge)
    zijde = max(max(s[2] for s in stukken.values()), math.sqrt(sum(s[2] * s[3] for s in stukken.values())))
    while True:
        plaats, x, y, rij_h, past = {}, 0.0, 0.0, 0.0, True
        for naam, (u0, v0, w, h) in sorted(stukken.items(), key=lambda s: -s[1][3]):
            if x + w > zijde:
                x, y, rij_h = 0.0, y + rij_h, 0.0
            if y + h > zijde:
                past = False
                break
            plaats[naam] = (x + marge - u0, y + marge - v0)
            x, rij_h = x + w, max(rij_h, h)
        if past:
            return plaats, zijde
        zijde *= 1.04


# ----------------------------------------------------------------------------------------------------------------
# Blender: netten maken, schaduw in de plooien bakken (AO), exporteren
# ----------------------------------------------------------------------------------------------------------------
def schrijf_glb(uit, stof, hout=(), eigen=(), maat=None, ao_px=512, met_ao=True, ao_pad=None, bron='', hoek_scherp=50):
    """
    Schrijft het GLB-bestand.
      stof    netten die onze stof krijgen (één deel `stof_bekleding`, één vel stof, schaduwtextuur);
      hout    netten die onze hout- of metaalafwerking krijgen (`poot_onderstel`);
      eigen   (naam, kleur, netten): delen met een eigen vaste kleur (bv. een donkere plint);
      maat    (breedte, diepte, hoogte) in cm waar het geheel precies op moet uitkomen; None = zoals gebouwd.
    """
    import bpy

    bpy.ops.wm.read_factory_settings(use_empty=True)
    plaats, zijde = verdeel(list(stof))
    alle = np.array([p for net in list(stof) + list(hout) + [n for _, _, nn in eigen for n in nn] for p in net.punten])
    lo, hi = alle.min(axis=0), alle.max(axis=0)
    factor = np.array(maat) / (hi - lo) if maat is not None else np.ones(3)
    print('maten voor het bijstellen (cm):', np.round(hi - lo, 2), '-> factor', np.round(factor, 4))

    def naar_meter(p):
        return tuple(((np.array(p) - np.array([0, 0, lo[2]])) * factor / 100).tolist())

    def maak(naam, netten, materiaal):
        punten, vlakken, uvs = [], [], []
        for net in netten:
            basis = len(punten)
            punten += [naar_meter(p) for p in net.punten]
            vlakken += [tuple(basis + h for h in v) for v in net.vlakken]
            for eiland, hoeken in net.uv:
                dx, dy = plaats.get(eiland, (0, 0))
                uvs.append([((u + dx) / zijde, (v + dy) / zijde) for u, v in hoeken])
        me = bpy.data.meshes.new(naam)
        me.from_pydata(punten, [], vlakken)
        laag = me.uv_layers.new(name='UVMap')
        i = 0
        for vlak_uv in uvs:
            for q in vlak_uv:
                laag.data[i].uv = q
                i += 1
        me.materials.append(materiaal)
        ob = bpy.data.objects.new(naam, me)
        bpy.context.collection.objects.link(ob)
        bpy.context.view_layer.objects.active = ob
        ob.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.remove_doubles(threshold=0.00005)
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        me.set_sharp_from_angle(angle=math.radians(hoek_scherp))
        ob.select_set(False)
        return ob

    mat_stof = bpy.data.materials.new('stof')
    ob_stof = maak('stof_bekleding', list(stof), mat_stof)
    tekst = 'stof: %d punten, %d vlakken' % (len(ob_stof.data.vertices), len(ob_stof.data.polygons))
    if hout:
        ob_hout = maak('poot_onderstel', list(hout), bpy.data.materials.new('poot_hout'))
        tekst += '; hout: %d punten' % len(ob_hout.data.vertices)
    for naam, kleur, netten in eigen:
        m = bpy.data.materials.new(naam)
        m.diffuse_color = (*kleur, 1)
        m.use_nodes = True
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*kleur, 1)
        m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
        maak(naam, list(netten), m)
    print(tekst + '; vel stof %.0f x %.0f cm' % (zijde, zijde))

    ao_bytes = None
    if met_ao:
        naden = []
        for net in stof:
            for eiland, lijn in net.naden:
                dx, dy = plaats[eiland]
                naden.append([((u + dx) / zijde, (w + dy) / zijde) for u, w in lijn])
        ao_bytes = bak_ao(bpy, ob_stof, mat_stof, ao_px, ao_pad or os.path.join(tempfile.mkdtemp(), 'schaduw.jpg'), naden)
    bpy.ops.export_scene.gltf(filepath=uit, export_format='GLB', export_apply=True, export_yup=True)
    werk_af(uit, ao_bytes, bron)
    return (hi - lo) * factor


def teken_naden(beeld, px, naden, sterkte=0.42, breed=1.1):
    """Naden als dunne donkere lijnen in de schaduwtextuur (de configurator vermenigvuldigt ze met de stof)."""
    a = np.empty(px * px * 4, np.float32)
    beeld.pixels.foreach_get(a)
    a = a.reshape(px, px, 4)
    lijn = np.zeros((px, px), np.float32)
    breed = breed * px / 1024
    r = int(math.ceil(breed * 2.5))
    for naad in naden:
        p = np.array(naad) * px
        for (x0, y0), (x1, y1) in zip(p[:-1], p[1:]):
            for s in np.linspace(0, 1, max(2, int(math.hypot(x1 - x0, y1 - y0) * 2))):
                x, y = x0 + (x1 - x0) * s, y0 + (y1 - y0) * s
                ix, iy = int(round(x)), int(round(y))
                ys, xs = np.mgrid[max(0, iy - r):min(px, iy + r + 1), max(0, ix - r):min(px, ix + r + 1)]
                if ys.size:
                    g = np.exp(-0.5 * (((xs - x) ** 2 + (ys - y) ** 2) / breed ** 2))
                    blok = lijn[ys[0, 0]:ys[-1, 0] + 1, xs[0, 0]:xs[0, -1] + 1]
                    np.maximum(blok, g, out=blok)
    a[..., :3] *= (1 - sterkte * lijn)[..., None]
    beeld.pixels.foreach_set(a.ravel())


def bak_ao(bpy, ob, materiaal, px, pad, naden=()):
    """Schaduw in plooien en naden (ambient occlusion) als textuur op het vel stof."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 96
    if sc.world is None:
        sc.world = bpy.data.worlds.new('wereld')
    sc.world.light_settings.distance = 0.18
    beeld = bpy.data.images.new('ao', px, px, alpha=False)
    beeld.colorspace_settings.name = 'Non-Color'
    materiaal.use_nodes = True
    knoop = materiaal.node_tree.nodes.new('ShaderNodeTexImage')
    knoop.image = beeld
    materiaal.node_tree.nodes.active = knoop
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.bake(type='AO', margin=max(3, px // 170), use_clear=True)
    ob.select_set(False)
    materiaal.node_tree.nodes.remove(knoop)
    if naden:
        teken_naden(beeld, px, naden)
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'JPEG'
    sc.render.image_settings.quality = 82
    sc.render.image_settings.color_mode = 'BW'
    beeld.save_render(pad, scene=sc)
    with open(pad, 'rb') as f:
        return f.read()


def werk_af(pad, jpeg, bron):
    """Zet de schaduwtextuur in het GLB-bestand (occlusionTexture op het stofmateriaal) en de bronvermelding erbij."""
    with open(pad, 'rb') as f:
        b = f.read()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n])
    binair = bytearray(b[20 + n + 8:])
    while len(binair) % 4:
        binair.append(0)
    if jpeg:
        begin = len(binair)
        binair += jpeg
        while len(binair) % 4:
            binair.append(0)
        j['bufferViews'].append({'buffer': 0, 'byteOffset': begin, 'byteLength': len(jpeg)})
        j['images'] = [{'bufferView': len(j['bufferViews']) - 1, 'mimeType': 'image/jpeg', 'name': 'schaduw'}]
        j['samplers'] = [{'magFilter': 9729, 'minFilter': 9987}]
        j['textures'] = [{'sampler': 0, 'source': 0, 'name': 'schaduw'}]
        for m in j['materials']:
            if 'stof' in m['name']:
                m['occlusionTexture'] = {'index': 0}
    j['buffers'][0]['byteLength'] = len(binair)
    if bron:
        j['asset']['extras'] = {'bron': bron}
    tekst = json.dumps(j, separators=(',', ':')).encode()
    tekst += b' ' * (-len(tekst) % 4)
    totaal = 12 + 8 + len(tekst) + 8 + len(binair)
    with open(pad, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, totaal))
        f.write(struct.pack('<II', len(tekst), 0x4E4F534A) + tekst)
        f.write(struct.pack('<II', len(binair), 0x004E4942) + bytes(binair))
