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
- **Inhoud:** één deel `stof_bekleding` (zitting en schaal, 3.100 punten) en één deel `poot_onderstel` (ring, vier
  poten, kruis), met een schaduwtextuur van 1024 px (plooien en naden). 251 kB.
- **Opnieuw maken:** zie `scripts/blender/LEESMIJ.md`. Niet met de hand bewerken: pas het script aan.
- Geen eigen beeld voor de modelkaart: het proefmodel gebruikt de productfoto van Sullivan.

Zoals het andere proefmodel zit het alleen in de gewone demo, niet in de versie in de huisstijl van de klant.
