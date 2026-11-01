# Configurator — context voor Claude

Productconfigurator (configureren → prijzen → offerte) voor maatwerkmeubelen, eerste case: zitmeubelen voor een Belgische maker (vermoedelijke pilootklant Corneille & Silence, Harelbeke). Aparte app, koppelbaar met het ERP **Missing Link** (REST API met etag/If-Match en idempotency keys). Taal: **TypeScript**. De gebruiker (Jonas) is functioneel analist/implementator, geen programmeur: antwoord in het Nederlands, in gewone taal.

**Lees eerst `docs/overdracht.md`** voor de stand van zaken, links en open punten. Voor alles rond 3D, boven- en vooraanzicht: gebruik de skill `zetel-3d` (`.claude/skills/zetel-3d/SKILL.md`).

## Structuur
- `packages/core`: de motor (geen UI/ERP-afhankelijkheid). Formules als Excel-tekst → JsonLogic (`formule.ts`, `logica.ts`), productmodel (`types.ts`, `motor.ts`), modelcontrole, SVG-tekening (`svg.ts`), materialen, vrij ontwerp (`ontwerp.ts`: elementen, opties, vormgeving), vooraanzicht, 3D-opbouw (`ruimtelijk.ts`).
- `packages/core/voorbeelden`: demomodellen (kast, sofa per cm, zetelcatalogus `vrij-ontwerp.ts`, modellen `modellen.ts`). **Alle prijzen zijn verzonnen.**
- `packages/demo-web`: klikbare demo, gebundeld met esbuild tot één HTML-bestand (`npm run build -w @configurator/demo-web` → `dist/configurator-demo.html`). three.js r128 wordt van cdnjs geladen.
- `packages/bouw-web`: aparte demo voor de bouwsector (ramen, deuren, aanbouw) op dezelfde motor, model in `core/voorbeelden/aanbouw.ts` + `aanbouw3d.ts` (`npm run build -w @configurator/bouw-web` → `dist/bouw-configurator.html` en `-offline.html`). Sinds 1/11 ook plattegrond (ruimtes, muren, openingen, meubels: `core/src/plattegrond.ts`, `plattegrondsvg.ts`), raam/deur-model (`voorbeelden/raam.ts`, `raam3d.ts`), offerte met posities (`core/src/offerte.ts`), catalogus inrichting (`voorbeelden/inrichting.ts`) en voorbeeldwoning (`voorbeelden/woning.ts`). Onderzoek: `docs/onderzoek-bouw-ramen-deuren.md`, analyse: `docs/analyse-bouw-woning-demo.md`, begrippen: `docs/begrippen-bouw.md`, concurrentie (LogiKal, ReynaPro, Chacal): `docs/onderzoek-raamsoftware.md`. Voor alles rond de bouwdemo (plattegrond, verdiepingen, gevels, werf, raam-3D): gebruik de skill `bouw-woning` (`.claude/skills/bouw-woning/SKILL.md`).
- `docs/`: analyse en stappenplan, fase 0-sjabloon, onderzoek, overdracht, afbeeldingen.

## Werkwijze
- Controles vóór elke commit: `npm test` (vitest) en `npm run typecheck` in de root.
- Code, namen en commentaar in het Nederlands, zoals de bestaande code.
- Branch: `claude/vigilant-cray-yi2j33` (enige branch in de repo, dus geen PR mogelijk).
- 3D lokaal testen: cdnjs is vanuit de cloudomgeving niet bereikbaar; three@0.128.0 staat als devDependency, gebruik in Playwright `page.route('https://cdnjs.cloudflare.com/**', …)` met `node_modules/three/build/three.min.js`, en Chromium met `--use-angle=swiftshader --enable-unsafe-swiftshader`.
- Modellen van de klant niet verzinnen: wat uit foto's is afgeleid, markeren als benadering.
- De versie in de huisstijl van de klant (`configurator-corneille-silence.html`) alleen als bestand geven, niet publiek publiceren.
