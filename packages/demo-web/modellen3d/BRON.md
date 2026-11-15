# Echte 3D-modellen (proef)

`bouw.mjs` sluit elk `.glb`-bestand in deze map in de demo in (`window.__MODELLEN3D`, sleutel = bestandsnaam zonder `.glb`).
De motor beschrijft per model welk bestand het gebruikt en voor welke elementen (zie `core/voorbeelden/proefmodellen.ts`).

## glam_velvet.glb

- **Model:** "Glam Velvet Sofa", © 2021 Wayfair, LLC, gemaakt door Eric Chadwick.
- **Bron:** Khronos glTF Sample Assets, `Models/GlamVelvetSofa`
  (https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa).
- **Licentie:** Creative Commons Naamsvermelding 4.0 Internationaal (CC BY 4.0),
  https://creativecommons.org/licenses/by/4.0/legalcode.nl.
- **Aangepast voor de configurator** (4/11/2026):
  - lamp (KHR_lights_punctual) en kleurvarianten (KHR_materials_variants) verwijderd;
  - normal map van de stof weggelaten (de configurator legt zijn eigen weefsel);
  - AO-textuur verkleind tot 512 px JPEG.

  Resultaat: 163 kB in plaats van 3,1 MB.

- **glam_velvet.jpg** (beeld op de modelkaart): `screenshot/screenshot_large.jpg` uit dezelfde map (render van het
  3D-bestand, zelfde licentie), verkleind tot 640 px breed.

Het is een product van Wayfair en **geen model van Corneille & Silence**. Het dient alleen om te tonen hoe een echt
3D-bestand (van de fabrikant) eruitziet in de configurator, met onze stoffen en poten. De naamsvermelding staat in
de 3D-weergave zodra het model in beeld is.

## sullivan_blender.glb

- **Model:** Sullivan van Corneille & Silence, **nagebouwd in Blender** op 15/11/2026 met `scripts/blender/sullivan.py`.
- **Bron:** de vier productfoto's en de maten van de productpagina (72 × 80 × 93 cm, zithoogte 42, zitdiepte 60). Al de
  rest (de vorm van rug en armen, het onderstel, de naden) is afgeleid uit de foto's: **een benadering, geen bestand
  van de fabrikant.** Die vermelding staat ook in de 3D-weergave.
- **Onderstel:** iets groter dan in onze bouwstenen (ring 58 cm in plaats van 56, poten verder uit elkaar), zodat het
  op de foto's past; een benadering (zie de twee lezingen in `docs/echte-3d-modellen.md`).
- **Inhoud:** één deel `stof_bekleding` (zitting en schaal, 3.100 punten) en één deel `poot_onderstel` (ring, vier
  poten, kruis), met een schaduwtextuur van 512 px (plooien en naden). 206 kB.
- **Opnieuw maken:** zie `scripts/blender/LEESMIJ.md`. Niet met de hand bewerken: pas het script aan.
- Het bestand hoort bij het gewone model Sullivan (geen apart proefmodel meer).

## manon, ross, fraser, milton, mabel-1, mabel-2, mabel-meridienne, satie (.glb)

- **Modellen:** fauteuils van Corneille & Silence, op 15/11/2026 gebouwd met `scripts/blender/uit_motor.py`.
- **Bron:** de opbouw van elk model in de configurator (`scripts/blender/gegevens/<code>.json`, uit de motor), in Blender
  afgewerkt (ronde rand, onderrand, bolle zitting, schaduw, naden), met per model wat de productfoto's anders tonen
  (`scripts/blender/aanpassingen.py`). **Benaderingen, geen bestanden van de fabrikant.** Die vermelding staat ook in
  de 3D-weergave.
- **Inhoud per bestand:** één deel `stof_bekleding`, zo nodig `poot_onderstel` (hout) en `plint` (de donkere voet), met
  een schaduwtextuur van 512 px. 186 tot 234 kB.
- **Opnieuw maken:** zie `scripts/blender/LEESMIJ.md`. Niet met de hand bewerken: pas `aanpassingen.py` aan.

Welk model welk bestand gebruikt, staat in `packages/core/voorbeelden/bestanden3d.ts`. Quin, Tumble, Karl, Pebble en de
Amusette fauteuil hebben er geen: daar was het bestand niet beter dan de bouwstenen (zie `docs/echte-3d-modellen.md`).

De negen bestanden die we zelf bouwden, zitten in de gewone demo en (sinds 15/11, akkoord van Jonas) ook in de versie in de
huisstijl van de klant. `glam_velvet.glb` komt van een externe bron en zit alleen in de gewone demo (`VREEMD` in `bouw.mjs`).
