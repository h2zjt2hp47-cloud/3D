"""
Aanpassingen per model bovenop de opbouw van de motor (zie uit_motor.py). Alleen wat de productfoto's anders tonen dan
de motor; alles wat hier staat is een benadering uit foto's. Leeg = de opbouw van de motor, afgewerkt in Blender.

Sleutels (voor het hele model, of per blok onder de naam na de punt, bv. 'rug' of 'zitkussen'):
  onderrand        straal van de ronde onderrand van de schaal (cm)
  bol              hoe ver de schaal halverwege naar buiten bolt (cm)
  dikte_factor, dikte_extra, dikte   dikte van de schaal (factor, extra cm, of punten (plaats 0..1, cm))
  dikte_naar_buiten   welk deel van de extra dikte naar buiten komt (0 = alles naar binnen)
  rand, rand_extra  hoogte van de rand: punten (plaats 0..1 van midden naar uiteinde, cm), of extra cm
  waaier_extra     extra uitwaaieren (cm per cm hoogte)
  rand_vorm, rand_hoog   doorsnede van de rand: 2 en 1 = halve cirkel; vorm hoger = vlakker bovenaan, hoog lager = platter
  zit_bol, zit_rand_factor, zit_onderrand, zit_buik   de zitting
  naden, naad_rand  naden tekenen (ja/nee)
  weg              dit blok niet meenemen
Gemeten op de foto's met pas.py en vormpas.py (camera's per model in cameras-<code>.json):
  maat_vast        het bestand komt precies op de maten van de website uit
  inkorten         de wand eindigt zoveel cm vroeger aan elk uiteinde
  rand_eind, rand_macht, rand_top   vloeiende randlijn: hoogte aan het uiteinde (cm), hoe lang ze vlak blijft (2 = parabool,
                   hoger = langer vlak), hoogte in het midden (cm; leeg = zoals de motor)
  rand_hoek        straal van de ronde hoek waar de rand in de voorkant van de wand overgaat (cm)
  pad_breed, pad_diep   de plattegrond van de wand breder of dieper (factor)
  leun_extra       extra helling naar achter (cm per cm hoogte)
  zit_schaal, zit_diep, zit_voor, zit_taps   de trommel groter (factor), dieper dan breed (factor), verder naar voor (cm), onderaan smaller (cm per kant)
  zit_hoog         de zitting hoger of lager dan in de motor (cm); de zithoogte in de configurator verandert niet
"""
AANPASSINGEN = {
    # Manon: de rand van de schaal is op de foto's breder en ronder dan de 6 cm van de motor; de zitting is een dikke
    # trommel met een ruim afgeronde bovenrand.
    'manon': {'rug': {'dikte_extra': 2.0, 'onderrand': 2.5}, 'zitkussen': {'zit_rand_factor': 1.6, 'zit_bol': 2.0}},
    # Fraser en Milton: de bovenkant van de rugband is vlak met ronde schouders, geen halve cirkel.
    'fraser': {'rug': {'rand_vorm': 3.0, 'rand_hoog': 0.6}},
    'milton': {'rug': {'rand_vorm': 2.8, 'rand_hoog': 0.7}},
}
