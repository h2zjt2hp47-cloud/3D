# Configurator — context voor Claude

Productconfigurator (configureren → prijzen → offerte) voor maatwerkmeubelen, eerste case: zitmeubelen voor een Belgische maker (vermoedelijke pilootklant Corneille & Silence, Harelbeke). Aparte app, koppelbaar met het ERP **Missing Link** (REST API met etag/If-Match en idempotency keys). Taal: **TypeScript**. De gebruiker (Jonas) is functioneel analist/implementator, geen programmeur: antwoord in het Nederlands, in gewone taal.

**Lees eerst `docs/overdracht.md`** voor de stand van zaken, links en open punten. Voor alles rond 3D, boven- en vooraanzicht: gebruik de skill `zetel-3d` (`.claude/skills/zetel-3d/SKILL.md`).

## Structuur
- `packages/core`: de motor (geen UI/ERP-afhankelijkheid). Formules als Excel-tekst → JsonLogic (`formule.ts`, `logica.ts`), productmodel (`types.ts`, `motor.ts`), modelcontrole, SVG-tekening (`svg.ts`), materialen, vrij ontwerp (`ontwerp.ts`: elementen, opties, vormgeving), vooraanzicht, 3D-opbouw (`ruimtelijk.ts`).
- `packages/core/voorbeelden`: demomodellen (kast, sofa per cm, zetelcatalogus `vrij-ontwerp.ts`, modellen `modellen.ts`). **Alle prijzen zijn verzonnen.** Proef met een echt 3D-bestand (4/11): `core/src/echt3d.ts`, `voorbeelden/proefmodellen.ts`, bestanden in `demo-web/modellen3d/` (geen model van de klant, niet in de huisstijlversie); uitleg `docs/echte-3d-modellen.md`.
- `packages/demo-web`: klikbare demo, gebundeld met esbuild tot één HTML-bestand (`npm run build -w @configurator/demo-web` → `dist/configurator-demo.html`). three.js 0.187 (met de uitbreidingen voor nabewerking en `three-gpu-pathtracer` voor de fotomodus) zit mee in de bundel; er wordt niets van een CDN geladen.
- `packages/bouw-web`: aparte demo voor de bouwsector (ramen, deuren, aanbouw) op dezelfde motor, model in `core/voorbeelden/aanbouw.ts` + `aanbouw3d.ts` (`npm run build -w @configurator/bouw-web` → `dist/bouw-configurator.html` en `-offline.html`). Sinds 1/11 ook plattegrond (ruimtes, muren, openingen, meubels: `core/src/plattegrond.ts`, `plattegrondsvg.ts`), raam/deur-model (`voorbeelden/raam.ts`, `raam3d.ts`), offerte met posities (`core/src/offerte.ts`), catalogus inrichting en gevelmaterialen (`voorbeelden/inrichting.ts`) en voorbeeldwoning (`voorbeelden/woning.ts`). Ronde 5: gevel-editor (`bouw-web/src/gevel-ui.ts`, materialen per muurvlak en sokkel), enkel ramen zonder woning (`bouw-web/src/ramenlijst-ui.ts`, `voorbeelden/maatlijst.ts`), klantweergave; analyse gebruiksgemak: `docs/analyse-gebruiksgemak.md`. Onderzoek: `docs/onderzoek-bouw-ramen-deuren.md`, analyse: `docs/analyse-bouw-woning-demo.md`, begrippen: `docs/begrippen-bouw.md`, concurrentie (LogiKal, ReynaPro, Chacal): `docs/onderzoek-raamsoftware.md`. Voor alles rond de bouwdemo (plattegrond, verdiepingen, gevels, werf, raam-3D): gebruik de skill `bouw-woning` (`.claude/skills/bouw-woning/SKILL.md`).
- `docs/`: analyse en stappenplan, fase 0-sjabloon, onderzoek, overdracht, afbeeldingen.

## Werkwijze
- Controles vóór elke commit: `npm test` (vitest) en `npm run typecheck` in de root.
- Code, namen en commentaar in het Nederlands, zoals de bestaande code.
- Branch: `claude/vigilant-cray-yi2j33` (enige branch in de repo, dus geen PR mogelijk).
- 3D lokaal testen: Chromium met `--use-angle=swiftshader --enable-unsafe-swiftshader` (zonder grafische kaart; kwaliteit *Mooi* is daar ±7 s per beeld, gebruik *Snel* of wacht lang). Beelden nemen met `canvas.toDataURL()` (preserveDrawingBuffer staat aan) i.p.v. een elementscreenshot. `window.__zetel3d` geeft in de ontwerper de 3D-weergave (bv. `fotoRealistisch({ stappen: 6, breedte: 520 })` voor een snelle proef van de fotomodus, ±2 min in swiftshader).
- Modellen van de klant niet verzinnen: wat uit foto's is afgeleid, markeren als benadering.
- De versie in de huisstijl van de klant (`configurator-corneille-silence.html`) alleen als bestand geven, niet publiek publiceren.
