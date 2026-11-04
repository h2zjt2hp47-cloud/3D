# Echte 3D-modellen (proef)

`bouw.mjs` sluit elk `.glb`-bestand in deze map in de demo in (`window.__MODELLEN3D`, sleutel = bestandsnaam zonder `.glb`).
De motor beschrijft per model welk bestand het gebruikt en voor welke elementen (zie `core/voorbeelden/echt3d.ts`).

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
