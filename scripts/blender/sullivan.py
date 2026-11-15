"""
Sullivan, nagebouwd in Blender (proef 15/11/2026).

Maakt packages/demo-web/modellen3d/sullivan_blender.glb: de fauteuil als 3D-bestand voor de configurator
(zie docs/echte-3d-modellen.md). Alles is een benadering op basis van de productfoto's en de maten van de website
(72 x 80 x 93 cm, zithoogte 42); geen bestand van de fabrikant.

Gebruik (Blender als Python-pakket, zie LEESMIJ.md in deze map):
    python sullivan.py <uit.glb> [--ao 1024] [--zonder-ao] [--dump <map>]

Opbouw (maten in cm; x = breedte, y = diepte met de rug naar +y, z = hoogte; oorsprong = hart van de ronde zitting):
  - zitting: een dikke ronde trommel (draailichaam);
  - schaal: rug en armen als één gestoffeerd lichaam. We beschrijven de buitenkant (een "ei" rond de zitting dat
    naar boven en naar achteren uitloopt), de hoogte van de rand per hoek, en de dikte. De binnenkant is de
    buitenkant min de dikte; de rand is overal een halve rol (ook vooraan aan de armen);
  - onderstel: een houten ring op vier schuine, tapse poten met een kruis.
De configurator legt zelf de stof op alles met "stof" in de naam en de houtafwerking op alles met "poot".
"""
import json
import math
import os
import struct
import sys
import tempfile

import numpy as np

# ----------------------------------------------------------------------------------------------------------------
# Maten (cm). Wat van de website komt staat erbij; al de rest is afgeleid uit de foto's (benadering).
# ----------------------------------------------------------------------------------------------------------------
BREEDTE, DIEPTE, HOOGTE, ZITHOOGTE = 72.0, 80.0, 93.0, 42.0   # website
R_ZIT = 31.0            # straal van de ronde zitting (de hocker is 62 cm rond: website)
Z_STOF = 21.0           # onderkant van de bekleding = bovenkant van de houten ring
RING = dict(r_buiten=29.0, r_binnen=23.0, dik=3.0)
POOT = dict(boven=5.0, onder=3.6, hart_boven=18.0, schuin=3.6)
KRUIS = dict(breed=2.4, hoog=3.2, z=8.4)

# Buitenkant van de schaal: straal achteraan (hoek 0) en opzij (hoek 90) per hoogte. Daartussen een ellips.
B_ACHTER = [(21, 28.6), (24, 31.2), (28, 33.8), (35, 37.4), (42, 40.2), (53, 43.6), (62, 45.7), (72, 47.5), (82, 48.9), (93, 49.6)]
A_OPZIJ = [(21, 28.6), (24, 31.4), (28, 33.2), (35, 34.7), (42, 35.5), (50, 36.0), (56, 35.8), (62, 36.0), (70, 36.6), (80, 37.3), (93, 37.8)]
# Hoekigheid van de plattegrond per hoogte: 2 = ellips; hoger = vlakkere rug met rondere hoeken (bovenaan).
HOEKIG = [(21, 2.0), (55, 2.0), (70, 2.5), (82, 3.0), (93, 3.0)]
# Hoogte van de rand (bovenkant van de rol) per hoek in graden vanaf het midden van de rug.
RAND = [(0, 93.0), (27, 93.0), (33, 91.5), (38, 88.0), (42, 83.0), (46, 76.0), (50, 68.5), (53, 62.5), (55.5, 60.0), (60, 59.6), (70, 59.3), (85, 58.6), (93, 57.8), (100, 56.0)]
# Dikte van de schaal per hoek (rug, schouder, arm).
DIKTE = [(0, 9.0), (48, 9.0), (54, 9.0), (58, 10.8), (64, 10.8), (100, 10.5)]
# De rug is bij de zitting dikker: extra cm op zithoogte, uitlopend tot 'tot' cm hoogte, alleen in het midden (hoeken in graden).
RUG_DIKKER = dict(extra=2.2, tot=64.0, hoek=(34.0, 50.0))
# Plooi aan de binnenkant waar de arm tegen de rug ligt: hoek, diepte (cm) en breedte (graden).
PLOOI = dict(hoek=54.5, diep=1.5, breed=1.9)
HOEK_EIND = 100.0       # tot waar de arm loopt (de ronde kop komt er nog voor)
HOEKEN = [0, 7, 14, 20, 25, 29, 32, 35, 38, 40, 42, 44, 46, 48, 50, 51.5, 53, 54, 55, 56, 57, 58.5, 61, 65, 70, 76, 83, 90, 95, 100]
RIJEN = [0, .04, .09, .15, .23, .32, .42, .52, .62, .72, .81, .89, .95, 1.0]   # hoogtes langs de wand (0 = onder, 1 = rand)
ROL_STAPPEN = 5         # tussenpunten over de ronde rand
KOP_STAPPEN = 4         # ringen in de ronde kop van de arm

# Zitting: omtrek van het draailichaam (straal, hoogte), van onder naar het midden bovenaan.
ZIT_PROFIEL = [(24.0, 21.0), (28.2, 21.0), (29.8, 21.7), (30.7, 23.2), (31.0, 25.5), (31.15, 31.0), (31.0, 36.6), (30.55, 38.7),
               (29.6, 40.2), (27.9, 41.1), (24.0, 41.55), (16.0, 41.85), (8.0, 41.97), (0.0, 42.0)]
ZIT_NAAD = 7           # naad rond de zitting bij dit punt van het profiel (net onder de ronde bovenrand)
ZIT_BOVEN_VANAF = 8     # vanaf dit punt hoort het profiel bij het bovenvlak (eigen stuk stof)
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


class Net:
    """Verzamelt hoekpunten, vlakken en stukken stof (UV-eilanden in cm) van één deel."""

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
# De schaal
# ----------------------------------------------------------------------------------------------------------------
def schaal():
    B, A, Hrand, Dik, Hoekig = pchip(B_ACHTER), pchip(A_OPZIJ), pchip(RAND), pchip(DIKTE), pchip(HOEKIG)
    graden = np.array([-h for h in reversed(HOEKEN[1:])] + list(HOEKEN), float)
    n, K = len(graden), len(RIJEN) - 1

    def straal(phi, z):
        a, b, m = A(z), B(z), Hoekig(z)
        c, s = np.maximum(np.cos(phi), 0), np.abs(np.sin(phi))
        return np.where(np.cos(phi) > 0, ((c / b) ** m + (s / a) ** m) ** (-1 / m), a)

    def buiten(g, z):
        phi = np.radians(g)
        r = straal(phi, z)
        return np.stack([r * np.sin(phi), r * np.cos(phi), np.broadcast_to(z, np.shape(r)) * 1.0], -1)

    dik_rand = Dik(np.abs(graden))
    doel = Hrand(np.abs(graden))                                     # hoogste punt van de rol per hoek
    z_rand = doel - dik_rand / 2
    f = np.array(RIJEN)
    dg, dz = 0.25, 0.25
    hoeken_rol = [(j + 1) * math.pi / (ROL_STAPPEN + 1) for j in range(ROL_STAPPEN)]
    # De rol staat haaks op de (schuine) wand en op de randlijn: zijn hoogste punt ligt dus niet precies een halve dikte
    # boven de rand. Enkele rondes bijstellen tot de rol overal op de gevraagde hoogte uitkomt.
    for ronde in range(4):
        Z = Z_STOF + f[None, :] * (z_rand[:, None] - Z_STOF)        # (n, K+1)
        G = np.broadcast_to(graden[:, None], Z.shape)
        O = buiten(G, Z)                                             # buitenkant
        # Normaal op de buitenkant uit kleine verschillen langs de hoek en de hoogte.
        Tg = buiten(G + dg, Z) - buiten(G - dg, Z)
        Tz = buiten(G, Z + dz) - buiten(G, Z - dz)
        N = eenheid(np.cross(Tg, Tz))
        naar_buiten = np.stack([O[..., 0], O[..., 1], np.zeros_like(O[..., 0])], -1)
        N *= np.sign(np.sum(N * naar_buiten, -1, keepdims=True))
        # Dikte: boven de zitting de volle dikte; eronder (verborgen in de zitting) dunner, zodat de binnenkant niet kruist.
        onder = np.clip((Z - 24.0) / (40.0 - 24.0), 0, 1)
        onder = onder * onder * (3 - 2 * onder)
        # De rug is bij de zitting dikker dan bovenaan: zo komt de zitdiepte op de 60 cm van de website.
        laag = np.clip((RUG_DIKKER['tot'] - Z) / (RUG_DIKKER['tot'] - ZITHOOGTE), 0, 1)
        midden = np.clip((RUG_DIKKER['hoek'][1] - np.abs(G)) / (RUG_DIKKER['hoek'][1] - RUG_DIKKER['hoek'][0]), 0, 1)
        extra = RUG_DIKKER['extra'] * laag * laag * (3 - 2 * laag) * midden * midden * (3 - 2 * midden)
        D = np.maximum(3.0, (dik_rand[:, None] + extra) * onder)
        I = O - N * D[..., None]                                     # binnenkant
        M = O - N * D[..., None] / 2                                 # hartlijn
        # Rand: een halve rol, haaks op de randlijn.
        rl = np.gradient(O[:, K, :], axis=0)
        Trand = eenheid(np.cross(N[:, K, :], eenheid(rl)))
        Trand *= np.sign(np.sum(Trand * (O[:, K, :] - O[:, K - 1, :]), -1, keepdims=True))
        # Waar de randlijn knikt (van de zwaai naar de arm) de richting van de rol uitmiddelen: anders draait ze daar in één stap.
        for _ in range(3):
            rand = np.pad(Trand, ((1, 1), (0, 0)), mode='edge')
            Trand = eenheid(0.25 * rand[:-2] + 0.5 * rand[1:-1] + 0.25 * rand[2:])
        top = np.max([M[:, K, 2] + (Trand[:, 2] * math.sin(al) + N[:, K, 2] * math.cos(al)) * D[:, K] / 2 for al in np.linspace(0, math.pi, 25)], axis=0)
        z_rand = z_rand - (top - doel)
    # Per ringpunt: hart en uitwijking (zodat de kop van de arm dezelfde opbouw kan krimpen).
    L = 2 * (K + 1) + ROL_STAPPEN
    hart = np.zeros((n, L, 3)); uit = np.zeros((n, L, 3))
    for k in range(K + 1):
        hart[:, k] = M[:, k]; uit[:, k] = N[:, k] * D[:, k, None] / 2
        hart[:, L - 1 - k] = M[:, k]; uit[:, L - 1 - k] = -N[:, k] * D[:, k, None] / 2
    for j, al in enumerate(hoeken_rol):
        hart[:, K + 1 + j] = M[:, K]
        uit[:, K + 1 + j] = (Trand * math.sin(al) + N[:, K] * math.cos(al)) * D[:, K, None] / 2
    # De plooi tussen arm en rug: een smalle geul in de binnenkant (en de binnenste helft van de rol); buiten blijft glad.
    geul = PLOOI['diep'] * np.exp(-0.5 * ((np.abs(graden) - PLOOI['hoek']) / PLOOI['breed']) ** 2)
    for k in range(K + 1):
        uit[:, L - 1 - k] += N[:, k] * geul[:, None]
    for j, al in enumerate(hoeken_rol):
        if al > math.pi / 2:
            s = (al - math.pi / 2) / (math.pi / 2)
            uit[:, K + 1 + j] += N[:, K] * (geul * s * s * (3 - 2 * s))[:, None]
    ringen = [hart[i] + uit[i] for i in range(n)]
    # Ronde kop vooraan aan elke arm: de laatste ring krimpt rond zijn hartlijn en schuift naar voren.
    Teind = eenheid(buiten(G + dg, Z) - buiten(G - dg, Z))           # richting langs de wand (naar grotere hoek)
    straal_ring = np.linalg.norm(uit, axis=-1)                       # (n, L)

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
    net = Net()
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
                net.vlak(hoeken, 'schaal_onder', [(0, 0), (1, 0), (1, 1), (0, 1)])
            elif r < kam:                                            # buitenkant tot op de kam
                net.vlak(hoeken, 'schaal_buiten', [(u_b[i], v[i][r]), (u_b[i + 1], v[i + 1][r]), (u_b[i + 1], v[i + 1][r2]), (u_b[i], v[i][r2])])
            else:                                                    # binnenkant: hoogte gemeten vanaf haar onderrand, zodat de stof rechtop staat
                w = lambda a, b: v[a][L - 1] - v[a][b]
                net.vlak(hoeken, 'schaal_binnen', [(u_i[i], w(i, r)), (u_i[i + 1], w(i + 1, r)), (u_i[i + 1], w(i + 1, r2)), (u_i[i], w(i, r2))])
    # Naden (lijnen op het vel stof): rond de rug waar de rol begint, en rond de kop van elke arm.
    eerste, laatste = len(links), len(links) + n - 1
    net.naden.append(('schaal_buiten', [(u_b[i], v[i][K]) for i in range(eerste, laatste + 1)]))
    for i in (eerste, laatste):
        net.naden.append(('schaal_buiten', [(u_b[i], v[i][r]) for r in range(2, kam + 1)]))
        net.naden.append(('schaal_binnen', [(u_i[i], v[i][L - 1] - v[i][r]) for r in range(kam + 1, L - 2)]))
    return net, dict(O=O, I=I, graden=graden, Z=Z)


# ----------------------------------------------------------------------------------------------------------------
# Draailichamen (zitting, ring) en balken (poten, kruis)
# ----------------------------------------------------------------------------------------------------------------
def draailichaam(net, profiel, eiland_zij, eiland_boven=None, boven_vanaf=None, segmenten=SEGMENTEN):
    """profiel: (straal, z) van onder naar boven. Zijkant: stof rond de omtrek; bovenvlak: vlak stuk stof."""
    pr = np.array(profiel, float)
    lengte = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pr, axis=0), axis=1))])
    r_ref = pr[:, 0].max()
    ring = []
    for r, z in pr:
        if r < 1e-6:
            ring.append([net.punt((0, 0, z))] * (segmenten + 1))
        else:
            rij = [net.punt((r * math.sin(2 * math.pi * s / segmenten), -r * math.cos(2 * math.pi * s / segmenten), z)) for s in range(segmenten)]
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


def onderstel():
    net = Net()
    z1 = Z_STOF
    z0 = z1 - RING['dik']
    f = 0.35
    draailichaam(net, [(RING['r_binnen'], z0), (RING['r_buiten'] - f, z0), (RING['r_buiten'], z0 + f), (RING['r_buiten'], z1 - f),
                       (RING['r_buiten'] - f, z1), (RING['r_binnen'], z1), (RING['r_binnen'], z0)], 'hout', segmenten=64)
    for sx in (-1, 1):
        for sy in (-1, 1):
            hb, ho = POOT['hart_boven'], POOT['hart_boven'] + POOT['schuin']
            balk(net, rechthoek(sx * ho, sy * ho, POOT['onder'] / 2, POOT['onder'] / 2, 0.0),
                 rechthoek(sx * hb, sy * hb, POOT['boven'] / 2, POOT['boven'] / 2, z0 + 0.6), 'hout')
    # Kruis tussen de poten, op de hoogte KRUIS['z'].
    zk = KRUIS['z']
    hart = POOT['hart_boven'] + POOT['schuin'] * (1 - (zk + KRUIS['hoog'] / 2) / z0)
    half = hart * math.sqrt(2)
    for draai in (math.pi / 4, 3 * math.pi / 4):
        balk(net, rechthoek(0, 0, half, KRUIS['breed'] / 2, zk, draai), rechthoek(0, 0, half, KRUIS['breed'] / 2, zk + KRUIS['hoog'], draai), 'hout')
    return net


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
def bouw(uit, ao_px=1024, met_ao=True, ao_pad=None):
    import bpy

    bpy.ops.wm.read_factory_settings(use_empty=True)
    net_schaal, _ = schaal()
    net_zit = Net()
    draailichaam(net_zit, ZIT_PROFIEL, 'zit_zij', 'zit_boven', ZIT_BOVEN_VANAF)
    pr = np.array(ZIT_PROFIEL)
    hoogte_naad = float(np.linalg.norm(np.diff(pr[:ZIT_NAAD + 1], axis=0), axis=1).sum())
    net_zit.naden.append(('zit_zij', [(2 * math.pi * pr[:, 0].max() * s / 48, hoogte_naad) for s in range(49)]))
    net_hout = onderstel()
    plaats, zijde = verdeel([net_schaal, net_zit])

    # Maten: alles samen moet precies de maten van de website hebben.
    alle = np.array(net_schaal.punten + net_zit.punten + net_hout.punten)
    lo, hi = alle.min(axis=0), alle.max(axis=0)
    factor = np.array([BREEDTE, DIEPTE, HOOGTE]) / (hi - lo)
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
        me.set_sharp_from_angle(angle=math.radians(50))
        ob.select_set(False)
        return ob

    stof = bpy.data.materials.new('stof')
    hout = bpy.data.materials.new('poot_hout')
    ob_stof = maak('stof_bekleding', [net_schaal, net_zit], stof)
    ob_hout = maak('poot_onderstel', [net_hout], hout)
    print('stof: %d punten, %d vlakken; hout: %d punten; vel stof %.0f x %.0f cm' % (
        len(ob_stof.data.vertices), len(ob_stof.data.polygons), len(ob_hout.data.vertices), zijde, zijde))

    ao_bytes = None
    if met_ao:
        naden = []
        for net in (net_schaal, net_zit):
            for eiland, lijn in net.naden:
                dx, dy = plaats[eiland]
                naden.append([((u + dx) / zijde, (w + dy) / zijde) for u, w in lijn])
        ao_bytes = bak_ao(bpy, ob_stof, stof, ao_px, ao_pad or os.path.join(tempfile.mkdtemp(), 'schaduw.jpg'), naden)
    bpy.ops.export_scene.gltf(filepath=uit, export_format='GLB', export_apply=True, export_yup=True)
    if ao_bytes:
        voeg_ao_toe(uit, ao_bytes)
    return ob_stof, ob_hout


def teken_naden(beeld, px, naden, sterkte=0.42, breed=1.1):
    """Naden als dunne donkere lijnen in de schaduwtextuur (de configurator vermenigvuldigt ze met de stof)."""
    a = np.empty(px * px * 4, np.float32)
    beeld.pixels.foreach_get(a)
    a = a.reshape(px, px, 4)
    lijn = np.zeros((px, px), np.float32)
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
    bpy.ops.object.bake(type='AO', margin=6, use_clear=True)
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


def voeg_ao_toe(pad, jpeg):
    """Zet de AO-textuur in het GLB-bestand en koppelt ze aan het stofmateriaal (occlusionTexture)."""
    with open(pad, 'rb') as f:
        b = f.read()
    n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n])
    binair = bytearray(b[20 + n + 8:])
    while len(binair) % 4:
        binair.append(0)
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
    j['asset']['extras'] = {'bron': "Proef: Sullivan nagebouwd in Blender op basis van productfoto's en de maten van de website (benadering)."}
    tekst = json.dumps(j, separators=(',', ':')).encode()
    tekst += b' ' * (-len(tekst) % 4)
    totaal = 12 + 8 + len(tekst) + 8 + len(binair)
    with open(pad, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, totaal))
        f.write(struct.pack('<II', len(tekst), 0x4E4F534A) + tekst)
        f.write(struct.pack('<II', len(binair), 0x004E4942) + bytes(binair))


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    px = int(sys.argv[sys.argv.index('--ao') + 1]) if '--ao' in sys.argv else 1024
    if '--ao' in sys.argv:
        args.remove(str(px))
    bouw(args[0], ao_px=px, met_ao='--zonder-ao' not in sys.argv)
