# 3D-bestanden bouwen in Blender

Blender is hier een **werkplaats naast de configurator**: een script bouwt een vast model als 3D-bestand (GLB), en de
configurator toont dat bestand met onze stoffen en afwerkingen (zie `docs/echte-3d-modellen.md`). Blender draait niet in
de pagina en is geen onderdeel van de bouw: het GLB-bestand staat in de repo, het script dient om het opnieuw te maken.

Eerste proef (15/11/2026): **Sullivan**, op basis van de productfoto's en de maten van de website. Een benadering, geen
bestand van de fabrikant.

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
| `sullivan.py` | Bouwt `packages/demo-web/modellen3d/sullivan_blender.glb`: zitting, schaal (rug en armen als één gestoffeerd lichaam), onderstel, stof verdeeld over één vel, schaduw in de plooien (AO) met de naden erin, export. |
| `overlay.py` | Legt het model met een passende camera over de productfoto's: de omtrek als lijn op de foto, en het model in grijs vanuit hetzelfde standpunt. |
| `cameras-sullivan.json` | De vier camera's bij de foto's van Sullivan (van voren, schuin, opzij, schuin van achter). |
| `raster.py` | Uitsnede van een foto met een raster in fotopixels, om punten af te lezen (gewone Python met Pillow, zonder Blender). |

## Het model opnieuw maken

```bash
/tmp/blender-omgeving/bin/python scripts/blender/sullivan.py packages/demo-web/modellen3d/sullivan_blender.glb
```

Duurt ±20 seconden (het meeste is het bakken van de schaduw). `--zonder-ao` slaat dat over (±2 s, om de vorm te
proberen), `--ao 2048` maakt de schaduwtextuur fijner. Daarna `npm run build -w @configurator/demo-web`: de bouw sluit
elk `.glb` uit `modellen3d/` in de gewone demo in.

De vorm staat bovenaan het script als gegevens, niet als code:

- `B_ACHTER`, `A_OPZIJ`, `HOEKIG`: de buitenkant van de schaal per hoogte (hoe ver naar achter, hoe ver opzij, hoe
  vierkant de plattegrond);
- `RAND`: de hoogte van de rand per hoek, van het midden van de rug (0°) tot de kop van de arm;
- `DIKTE`, `RUG_DIKKER`, `PLOOI`: de dikte van rug en armen, de rug die dikker is bij de zitting, de plooi waar de arm
  tegen de rug ligt;
- `ZIT_PROFIEL`, `RING`, `POOT`, `KRUIS`: de zitting en het onderstel.

Het script stelt de maten op het einde bij tot precies de maten van de website (het meldt met welke factor: die hoort
binnen 1 % te blijven). De test `packages/core/test/echt3d.test.ts` bewaakt het bestand: maten, delen, schaduwtextuur.

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

Let op het teken van `az`: schuiven de achterste poten in beeld naar links, dan is `az` negatiever.
