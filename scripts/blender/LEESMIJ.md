# 3D-bestanden bouwen in Blender

Blender is hier een **werkplaats naast de configurator**: een script bouwt een vast model als 3D-bestand (GLB), en de
configurator toont dat bestand met onze stoffen en afwerkingen (zie `docs/echte-3d-modellen.md`). Blender draait niet in
de pagina en is geen onderdeel van de bouw: het GLB-bestand staat in de repo, het script dient om het opnieuw te maken.

Eerste proef (15/11/2026): **Sullivan**, met de hand gemeten op de productfoto's. Daarna de andere fauteuils, vertrokken
van de opbouw die de motor al heeft. Alles is een benadering, geen bestand van de fabrikant.

## Installeren (eenmalig, ook in een cloudsessie zonder scherm)

```bash
python3 -m venv /tmp/blender-omgeving
/tmp/blender-omgeving/bin/pip install bpy opencv-python-headless
```

`bpy` is Blender als Python-pakket (5.3, ±1 GB). `opencv-python-headless` is alleen nodig voor `overlay.py`. De
meldingen "Draco is not available" en "MeshOptimizer is not available" bij het exporteren zijn onschuldig: we gebruiken
die compressie niet (de weergave in de configurator leest ze niet).

## De bestanden

| Bestand | Wat |
|---|---|
| `zetelbouw.py` | De bouwstenen: een dikke wand met ronde rand en ronde koppen (rug en armen als één gestoffeerd vel), draailichaam, lichaam rond een omtrek (zitting, ring, plint), balken en poten, losse kussens, de stof verdeeld over één vel, de schaduw in de plooien (AO) met de naden erin, de export. |
| `exporteer.mjs` | Schrijft per fauteuil de opbouw uit de motor (de blokken van `bouw3D`) naar `gegevens/<code>.json`. |
| `uit_motor.py` | Bouwt een fauteuil vanuit die gegevens. De middenlijn, hoogtes, dikte, helling en waaier van de schaal, de omtrek van de zitting, het onderstel en de losse kussens komen uit de motor; Blender voegt de ronde rand, de onderrand, de bolle zitting, de schaduw en de naden toe. |
| `aanpassingen.py` | Per model wat de productfoto's anders tonen dan de motor (dikte van de rand, vorm van de rand, de zitting ...). Alles wat daar staat, is een benadering uit foto's. |
| `sullivan.py` | Sullivan, met de hand gemeten op de foto's (de eerste proef): alleen de vorm, de bouwstenen komen uit `zetelbouw.py`. |
| `overlay.py`, `cameras-sullivan.json` | Legt een bestand met een passende camera over de productfoto's: de omtrek als lijn op de foto, en het model in grijs vanuit hetzelfde standpunt. |
| `pas.py`, `cameras-manon.json` | Meten zonder Blender: het silhouet van de zetel uit een foto halen, per foto de camera zoeken waarmee het bestand het best past, en per hoogte in cm melden waar het afwijkt. |
| `vormpas.py` | Proef (15/11): de aanpassingen zelf laten zoeken op de silhouetten. **Afgekeurd bij Manon**, zie "Nameten op de foto's" hieronder. |
| `raster.py` | Uitsnede van een foto met een raster in fotopixels, om punten af te lezen (gewone Python met Pillow, zonder Blender). |

## Een bestand (opnieuw) maken

```bash
node scripts/blender/exporteer.mjs
```

```bash
/tmp/blender-omgeving/bin/python scripts/blender/uit_motor.py manon packages/demo-web/modellen3d/manon.glb
```

```bash
/tmp/blender-omgeving/bin/python scripts/blender/sullivan.py packages/demo-web/modellen3d/sullivan_blender.glb
```

Eerst de gegevens uit de motor (alleen nodig als het model in `modellen.ts` veranderd is), dan het bestand. Een bestand
duurt ±10 seconden (het meeste is het bakken van de schaduw). `--zonder-ao` slaat dat over (±2 s, om de vorm te
proberen), `--ao 1024` maakt de schaduwtextuur fijner (standaard 512). Daarna `npm run build -w @configurator/demo-web`:
de bouw sluit elk `.glb` uit `modellen3d/` in de gewone demo in. **Zet geen half afgewerkt bestand in die map.**

Welk model welk bestand heeft, staat in `packages/core/voorbeelden/bestanden3d.ts` (met de hoogte van het bestand: het
script meldt ze). De test `packages/core/test/echt3d.test.ts` loopt elk model met een bestand af: het standaardontwerp
toont het bestand, de maten kloppen, er ligt geen los bestand in de map, alles samen blijft onder 3 MB.

**Een model bijsturen.** Vertrek van wat de motor geeft en zet in `aanpassingen.py` alleen wat de foto's anders tonen:
per model, of per blok onder de naam na de punt (`rug`, `zitkussen`). De sleutels staan bovenaan dat bestand. Leg het
resultaat naast de foto's (`overlay.py`, of gewoon naast elkaar) en koppel een bestand alleen als het duidelijk beter is
dan de bouwstenen.

**Sullivan** is anders gemaakt: zijn vorm staat bovenaan `sullivan.py` als gegevens (`B_ACHTER`, `A_OPZIJ`, `HOEKIG` voor
de buitenkant per hoogte, `RAND` voor de hoogte van de rand per hoek, `DIKTE`, `RUG_DIKKER`, `PLOOI`, `ZIT_PROFIEL`,
`RING`, `POOT`, `KRUIS`). Het script stelt de maten op het einde bij tot precies de maten van de website.

## Regels voor een bestand dat de configurator kan tonen

- **Meter, y omhoog, voorkant naar +z** (Blender: voorkant naar −Y, exporteren met `export_yup`). De weergave rekt het
  kader van het bestand per richting tot de maten van het element: het kader moet dus de maten van het model hebben.
- **Namen:** alles met `stof` in de naam krijgt onze stof, alles met `poot` onze hout- of metaalafwerking.
- **Eén stofmateriaal, één vel stof:** de weergave leest de maat van het weefsel en de schaduwtextuur uit het eerste
  stofdeel. Alle stukken stof liggen daarom op dezelfde schaal en rechtop op één vel (UV), zonder overlap.
- **Schaduw in de plooien:** `occlusionTexture` op het stofmateriaal, ingesloten als JPEG. De export van Blender zet
  die er niet vanzelf in; `voeg_ao_toe()` doet het achteraf.
- **Geen compressie** (Draco, meshopt), geen verschuiving of schaal op de delen.

## Het model naast de foto's leggen

```bash
/tmp/blender-omgeving/bin/python scripts/blender/overlay.py packages/demo-web/modellen3d/sullivan_blender.glb \
  <map met de foto's> scripts/blender/cameras-sullivan.json <uitmap>
```

Geeft per foto `lijn-<naam>.jpg` (omtrek op de foto) en `grijs-<naam>.png` (het model vanuit hetzelfde standpunt). De
productfoto's zitten niet in de repo: haal ze van de productpagina in een eigen map.

**De camera vinden.** De foto's zijn van dichtbij genomen (±3 m): de voorste en achterste poten staan op een andere
hoogte in beeld. Verhoudingen meten in pixels klopt daardoor niet; een camera wel. Zo vind je ze:

1. Lees met `raster.py` af waar de poten de vloer raken.
2. De poten staan op een vierkant. Uit de verhouding tussen de afstand van de voorste en van de achterste poten volgt
   de afstand `D`, uit de afstand zelf het brandpunt `F`, uit het hoogteverschil in beeld de camerahoogte `h`, en uit
   de zijwaartse verschuiving van de achterste poten de hoek `az`.
3. Bij Sullivan gaf dat voor twee foto's los van elkaar hetzelfde brandpunt (±1600 px, een lens van ±50 mm). Neem dat
   voor alle foto's van dezelfde reeks.
4. Leg het model erover en stel bij tot onderstel, breedte en hoogte passen. Pas dan de vorm beoordelen.

**Voorbehoud bij Sullivan.** Met de camera's uit stap 2 was de bekleding van het model ±9 % groter dan op de foto. De
camera's in `cameras-sullivan.json` staan daarom ±10 % verder (zodat 72 breed en 93 hoog passen), en het onderstel in
het script is wat groter dan in onze bouwstenen (ring 58 cm in plaats van 56). De foto's passen niet op alle maten van
de website tegelijk; welke maat afwijkt, moet de klant zeggen (zie `docs/echte-3d-modellen.md`). Schrijf zo'n
bijstelling altijd op: het is een keuze, geen meting.

## Nameten op de foto's: wat `pas.py` kan, en wat de proef met Manon leerde (15/11)

Jonas vroeg om ook de acht andere bestanden na te meten zoals Sullivan. Voor Manon (geen onderstel, drie foto's uit één
reeks) is daarvoor gereedschap geschreven:

```bash
/tmp/blender-omgeving/bin/python scripts/blender/pas.py masker <foto> <masker.png> x,y [x,y ...] [--weg x,y,straal ...]
```

```bash
/tmp/blender-omgeving/bin/python scripts/blender/pas.py pas packages/demo-web/modellen3d/manon.glb scripts/blender/cameras-manon.json <maskermap>
```

- `masker` haalt het silhouet uit de foto (punten op de bekleding; `--weg` voor weerspiegelingen met dezelfde kleur).
  Bekijk elk masker één keer.
- `pas` zoekt de camera per foto en meldt de afwijking per hoogte en per plaats. `"samen": true` houdt de camerahoogte
  voor alle foto's gelijk (zelfde statief); de afstand blijft per foto vrij, want de zetel stond niet altijd even ver.
- `vormpas.py` liet daarna de vorm zelf zoeken (rand, helling, zitting). De overlap steeg van 95 / 93 / 92 % naar
  98 / 96 / 97 %.

**Toch is het resultaat afgekeurd** (Jonas, 15/11: "vorig bestand van Manon was correcter"), en terecht:

1. **Een silhouet ziet alleen de buitenomtrek.** De zitting kwam 4,6 cm hoger en forser te staan omdat dat de omtrek van
   opzij beter vulde. Op de foto van voren ligt de voorrand van de zitting op 49 % van de hoogte; in het goedgekeurde
   bestand op 48 %, in het "nagemeten" op 55 %. Die lijn ligt binnen de omtrek en telde dus niet mee.
2. **Zonder onderstel is er geen vaste maat buiten de zetel.** Camera (hoogte, afstand, richting) en vorm kunnen elkaar
   dan compenseren: een hogere overlap bewijst niet dat de vorm juister is. Bij Sullivan kwam de camera uit de poten.
3. **De foto's passen niet op de maten van de website:** bij gelijke hoogte is Manon op de foto's ±4 % smaller en ±10 %
   dieper dan 75 × 70 × 75. Het bestand moet op de maten van de site blijven, dus wordt een vorm die op de foto past,
   daarna ±9 % ingedrukt. Welke maat afwijkt, is een vraag voor de klant.
4. Eerdere pogingen lieten de zitting zelfs door de schaal steken: dat ziet een silhouet evenmin.

**Wat blijft:** `pas.py` om te meten en te tonen waar een bestand afwijkt (cijfers, geen oordeel), en de nieuwe sleutels
in `aanpassingen.py` (`rand_eind`, `rand_hoek`, `zit_*`, `maat_vast`) om een model met de hand bij te sturen. **Wat niet
meer mag:** een bestand vervangen op grond van de overlap alleen. Meet ook lijnen binnen de omtrek (voorrand van de
zitting, naden), leg foto, vorig en nieuw bestand naast elkaar, en laat Jonas kiezen.

Let op het teken van `az`: schuiven de achterste poten in beeld naar links, dan is `az` negatiever.
