# Proeven 3D-motor: alle punten van de analyse (04-11)

Uitgevoerd op 04-11 in de cloudsessie (Chromium zonder grafische kaart, swiftshader), volgens
`ANALYSE-3D-MOTOR-0411.md` en de werkbrief van account 2. Elke stap staat op een eigen tak, vertrekkend van `7765a75`;
over samenvoegen beslist Jonas. Prijs, offerte, boven- en vooraanzicht veranderen bij geen enkele stap.

Schermafbeeldingen: alleen op één breedte (1400 px), in Chromium zonder grafische kaart. De vaste lijst met
schermbreedtes en browsers van Jonas was niet beschikbaar.

## Overzicht

| # | Punt | Tak | Uitslag | Advies |
|---|---|---|---|---|
| 2 | Weefselkaarten (linnen, velours) | `claude/weefselkaarten-proef` | Linnen: fijner, regelmatiger weefsel; de fotomodus toont nu het reliëf (vroeger vlak). Velours: eerst harde vierkantjes, opgelost met een verzachting van de hoogte. Pagina +2 kB. | Behouden; daarna de andere weefsels. |
| 1 | Glas met transmission | `claude/glas-proef` | Klaarder glas, volle spiegeling; het decorraam toont een helder uitzicht, ook in de fotomodus (vroeger melkachtig). Geen donkere vlekken door de schaduw in hoeken; ramen in de woning tonen het interieur nog. | Behouden. |
| 3 | Scherpere omgeving + HDRI | `claude/omgeving-proef` | Zelfgemaakt beeld op 1024 × 512: bijna geen zichtbaar verschil bij matte stof. Nieuwe lichtsfeer *Fotostudio* met een echte HDRI (CC0): andere, zachtere belichting. Eerste wissel van licht ±0,1 s i.p.v. ±0,03 s. Pagina +2,2 MB. | Beslissen op de M5: de HDRI houden als hij daar beter oogt. |
| 4 | Scheerlicht voor velours | – | Alleen een iets lichtere bovenrand: niet duidelijk beter. | Niet opgenomen. |
| 5 | Fotomodus op WebGPU met ontruiser | – | Niet te testen hier: geen WebGPU zonder grafische kaart. | Eerst `webgpu-test.html` op de M5 openen; is de uitslag "WebGPU werkt", dan de fotomodus bouwen en daar testen. |
| 6 | Basiskleur uit foto's (Marigold) | – | Bouclé (foto Doha): goede basiskleur zonder licht en schaduw (`#dcd7cf` i.p.v. `#9f9a8e` in de foto). Velours (foto Montego): mislukt, verkeerde kleur door de glans. 11 à 16 s per beeld op de processor. | Bruikbaar voor matte stoffen, als hulp bij het kiezen van een kleur, met controle. Niet voor velours. |
| 7 | Manifold `levelSet` | – | Wallace en Kotor: 2 × zoveel driehoeken, 1,5 à 2,3 × trager, niet nauwkeuriger (onze punten liggen al precies op het oppervlak). | Niet doen. |
| 8 | Volledige overstap naar WebGPU | – | Hangt af van punt 5; hier niet te testen. | Pas na een geslaagde fotomodus op de M5. |
| 9 | Ander sheen-model (Zeltner) | – | Niet gebouwd: het scheerlicht (punt 4) toonde weinig winst voor velours, en geen bron vergelijkt het model met het huidige. | Niet nu. |

## Metingen

- **Paginagrootte** (`dist/configurator-demo.html`, vóór 2.233.448 bytes):
  - weefselkaarten 2.235.595 (+2 kB);
  - glas ongewijzigd;
  - omgeving met HDRI 4.391.381 (+2,2 MB). De 2K-versie van de HDRI zou ±8,4 MB toevoegen.
- **Beeldsnelheid** bij draaien in de bouwdemo, raam en woning: ±60 beelden per seconde, vóór en na het glas. In
  swiftshader zegt dat weinig: opnieuw meten op de M5.
- **Wisseltijd licht** (eerste keer), vóór → na: studio 21 → 27 ms, daglicht 31 → 135 ms, Fotostudio 155 ms.
- **Tests:** groen op elke tak. Weefselkaarten: 241 tests, 7 nieuwe.

## Bestanden

- `webgpu-test.html`: openen op het toestel in de toonzaal, in de browser die daar draait. Zegt of WebGPU werkt, met de
  adapter en de grenzen.
- `marigold_iid.py`: de proef met Marigold IID Appearance (offline, CPU, model `prs-eth/marigold-iid-appearance-v1-1`,
  licentie openrail++). Nodig: Python met `torch` (CPU), `diffusers`, `transformers`, `accelerate`. De foto's van de
  klant staan niet in deze repo.

## Opgemerkt, niet aangepast

- De stof *Chill Zone 051* gebruikt een staalfoto van de leverancier (Chivasso/JAB) als textuur. Jonas' regel is "geen
  bestanden van fabrikanten": nakijken of die staalfoto mag blijven.
- De stoffoto's dienen ook als reliëf (bumpmap). Dat geeft nep-reliëf uit de schaduw in de foto (al vermeld in de
  werkbrief).
