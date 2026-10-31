# Configurator — context voor Claude

Productconfigurator (configureren → prijzen → offerte) voor maatwerkmeubelen, eerste case: zitmeubelen voor een Belgische maker (vermoedelijke pilootklant Corneille & Silence, Harelbeke). Aparte app, koppelbaar met het ERP **Missing Link** (REST API met etag/If-Match en idempotency keys). Taal: **TypeScript**. De gebruiker (Jonas) is functioneel analist/implementator, geen programmeur: antwoord in het Nederlands, in gewone taal.

**Lees eerst `docs/overdracht.md`** voor de stand van zaken, links en open punten.

## Structuur
- `packages/core`: de motor (geen UI/ERP-afhankelijkheid). Formules als Excel-tekst → JsonLogic (`formule.ts`, `logica.ts`), productmodel (`types.ts`, `motor.ts`), modelcontrole, SVG-tekening (`svg.ts`), materialen, vrij ontwerp (`ontwerp.ts`: elementen, opties, vormgeving), vooraanzicht, 3D-opbouw (`ruimtelijk.ts`).
- `packages/core/voorbeelden`: demomodellen (kast, sofa per cm, zetelcatalogus `vrij-ontwerp.ts`, modellen `modellen.ts`). **Alle prijzen zijn verzonnen.**
- `packages/demo-web`: klikbare demo, gebundeld met esbuild tot één HTML-bestand (`npm run build -w @configurator/demo-web` → `dist/configurator-demo.html`). three.js r128 wordt van cdnjs geladen.
- `docs/`: analyse en stappenplan, fase 0-sjabloon, onderzoek, overdracht, afbeeldingen.

## Werkwijze
- Controles vóór elke commit: `npm test` (vitest) en `npm run typecheck` in de root.
- Code, namen en commentaar in het Nederlands, zoals de bestaande code.
- Branch: `claude/vigilant-cray-yi2j33` (enige branch in de repo, dus geen PR mogelijk).
- 3D lokaal testen: cdnjs is vanuit de cloudomgeving niet bereikbaar; three@0.128.0 staat als devDependency, gebruik in Playwright `page.route('https://cdnjs.cloudflare.com/**', …)` met `node_modules/three/build/three.min.js`, en Chromium met `--use-angle=swiftshader --enable-unsafe-swiftshader`.
- Modellen van de klant niet verzinnen: wat uit foto's is afgeleid, markeren als benadering.
