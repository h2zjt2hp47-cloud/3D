"""
Sullivan, nagebouwd in Blender (proef 15/11/2026).

Maakt packages/demo-web/modellen3d/sullivan_blender.glb: de fauteuil als 3D-bestand voor de configurator
(zie docs/echte-3d-modellen.md). Alles is een benadering op basis van de productfoto's en de maten van de website
(72 x 80 x 93 cm, zithoogte 42); geen bestand van de fabrikant.

Gebruik (Blender als Python-pakket, zie LEESMIJ.md in deze map):
    python sullivan.py <uit.glb> [--ao 512] [--zonder-ao]

De bouwstenen (dikke wand met ronde rand, draailichaam, stof op één vel, schaduw bakken, exporteren) staan in
zetelbouw.py; dit bestand bevat alleen de vorm van Sullivan, met de hand gemeten op de foto's.

Opbouw (maten in cm; x = breedte, y = diepte met de rug naar +y, z = hoogte; oorsprong = hart van de ronde zitting):
  - zitting: een dikke ronde trommel (draailichaam);
  - schaal: rug en armen als één gestoffeerd lichaam. We beschrijven de buitenkant (een "ei" rond de zitting dat
    naar boven en naar achteren uitloopt), de hoogte van de rand per hoek, en de dikte. De binnenkant is de
    buitenkant min de dikte; de rand is overal een halve rol (ook vooraan aan de armen);
  - onderstel: een houten ring op vier schuine, tapse poten met een kruis.
De configurator legt zelf de stof op alles met "stof" in de naam en de houtafwerking op alles met "poot".
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from zetelbouw import Net, balk, dikke_wand, draailichaam, pchip, rechthoek, schrijf_glb  # noqa: E402

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

# Zitting: omtrek van het draailichaam (straal, hoogte), van onder naar het midden bovenaan.
ZIT_PROFIEL = [(24.0, 21.0), (28.2, 21.0), (29.8, 21.7), (30.7, 23.2), (31.0, 25.5), (31.15, 31.0), (31.0, 36.6), (30.55, 38.7),
               (29.6, 40.2), (27.9, 41.1), (24.0, 41.55), (16.0, 41.85), (8.0, 41.97), (0.0, 42.0)]
ZIT_NAAD = 7           # naad rond de zitting bij dit punt van het profiel (net onder de ronde bovenrand)
ZIT_BOVEN_VANAF = 8     # vanaf dit punt hoort het profiel bij het bovenvlak (eigen stuk stof)




# ----------------------------------------------------------------------------------------------------------------
# De schaal
# ----------------------------------------------------------------------------------------------------------------
def schaal():
    B, A, Hrand, Dik, Hoekig = pchip(B_ACHTER), pchip(A_OPZIJ), pchip(RAND), pchip(DIKTE), pchip(HOEKIG)
    graden = np.array([-h for h in reversed(HOEKEN[1:])] + list(HOEKEN), float)
    G = graden[:, None]

    def straal(phi, z):
        a, b, m = A(z), B(z), Hoekig(z)
        c, s = np.maximum(np.cos(phi), 0), np.abs(np.sin(phi))
        return np.where(np.cos(phi) > 0, ((c / b) ** m + (s / a) ** m) ** (-1 / m), a)

    def buiten(g, z):
        phi = np.radians(g)
        r = straal(phi, z)
        return np.stack([r * np.sin(phi), r * np.cos(phi), np.broadcast_to(z, np.shape(r)) * 1.0], -1)

    dik_rand = Dik(np.abs(graden))
    dg, dz = 0.25, 0.25

    def dikte(Z):
        # Boven de zitting de volle dikte; eronder (verborgen in de zitting) dunner, zodat de binnenkant niet kruist.
        onder = np.clip((Z - 24.0) / (40.0 - 24.0), 0, 1)
        onder = onder * onder * (3 - 2 * onder)
        # De rug is bij de zitting dikker dan bovenaan: zo komt de zitdiepte op de 60 cm van de website.
        laag = np.clip((RUG_DIKKER['tot'] - Z) / (RUG_DIKKER['tot'] - ZITHOOGTE), 0, 1)
        midden = np.clip((RUG_DIKKER['hoek'][1] - np.abs(G)) / (RUG_DIKKER['hoek'][1] - RUG_DIKKER['hoek'][0]), 0, 1)
        extra = RUG_DIKKER['extra'] * laag * laag * (3 - 2 * laag) * midden * midden * (3 - 2 * midden)
        return np.maximum(3.0, (dik_rand[:, None] + extra) * onder)

    # De plooi tussen arm en rug: een smalle geul in de binnenkant.
    geul = PLOOI['diep'] * np.exp(-0.5 * ((np.abs(graden) - PLOOI['hoek']) / PLOOI['breed']) ** 2)
    net = Net()
    rooster = dikke_wand(
        net, lambda Z: buiten(np.broadcast_to(G, Z.shape), Z), Z_STOF, Hrand(np.abs(graden)), dik_rand, dikte,
        raak=lambda Z: (buiten(np.broadcast_to(G, Z.shape) + dg, Z) - buiten(np.broadcast_to(G, Z.shape) - dg, Z),
                        buiten(np.broadcast_to(G, Z.shape), Z + dz) - buiten(np.broadcast_to(G, Z.shape), Z - dz)),
        groef=geul)
    return net, dict(rooster, graden=graden)


# ----------------------------------------------------------------------------------------------------------------
# Het onderstel: een houten ring op vier schuine, tapse poten met een kruis
# ----------------------------------------------------------------------------------------------------------------
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


def bouw(uit, ao_px=512, met_ao=True, ao_pad=None):
    net_schaal, _ = schaal()
    net_zit = Net()
    draailichaam(net_zit, ZIT_PROFIEL, 'zit_zij', 'zit_boven', ZIT_BOVEN_VANAF)
    pr = np.array(ZIT_PROFIEL)
    hoogte_naad = float(np.linalg.norm(np.diff(pr[:ZIT_NAAD + 1], axis=0), axis=1).sum())
    net_zit.naden.append(('zit_zij', [(2 * math.pi * pr[:, 0].max() * s / 48, hoogte_naad) for s in range(49)]))
    # Alles samen krijgt precies de maten van de website.
    schrijf_glb(uit, [net_schaal, net_zit], [onderstel()], maat=(BREEDTE, DIEPTE, HOOGTE), ao_px=ao_px, met_ao=met_ao, ao_pad=ao_pad,
                bron="Proef: Sullivan nagebouwd in Blender op basis van productfoto's en de maten van de website (benadering).")


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    px = int(sys.argv[sys.argv.index('--ao') + 1]) if '--ao' in sys.argv else 512
    if '--ao' in sys.argv:
        args.remove(str(px))
    bouw(args[0], ao_px=px, met_ao='--zonder-ao' not in sys.argv)
