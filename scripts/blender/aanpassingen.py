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
  zit_bol, zit_rand_factor, zit_onderrand, zit_buik   de zitting
  naden, naad_rand  naden tekenen (ja/nee)
  weg              dit blok niet meenemen
"""
AANPASSINGEN = {}
