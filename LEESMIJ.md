# Belgica

Een strategiespel over België en de randen, van de Romeinen tot nu. Ontwerp en keuzes: `docs/ontwerp.md`.

## Spelen
Open `dist/belgica.html` in een browser (Safari, Chrome, Firefox). Er is geen internet nodig.

- Klik op een leger om het te kiezen; Shift+klik kiest er meer.
- Rechtsklik, Ctrl+klik, lang drukken of *Kies bestemming* stuurt de gekozen legers naar een vak.
- Spatie = klok stil of verder; 1 tot 5 = snelheid.
- Klik op een eigen vak om te bouwen; zonder selectie toont het paneel je schatkist en belastingdruk.

## Bouwen
- `npm install`, daarna `npm run build` → `dist/belgica.html`
- `npm test` (vitest) en `npm run typecheck` vóór elke commit
- `npm run kaart` maakt de kaart opnieuw uit Natural Earth (`src/kaart/vakken.json`)

## Opbouw
- `scripts/kaart/maak-kaart.mjs`: de kaart (vakken, randen, rivieren, terrein; plaatsnamen en kleine rivieren met de hand, benadering)
- `src/kaart/`: de kaart in het spel
- `src/spel/`: de regels zonder scherm: `kalender.ts`, `toestand.ts`, `regels.ts` (bewegen, vechten, bezetten), `ki.ts` (computerspelers), `verloop.ts` (gebeurtenissen, onderwerping, opvolging, score), `economie.ts` (zilver, belasting, soldij, bouwen, bevolking, tevredenheid, opstanden), `romeinen.ts` (het eerste tijdperk)
- `src/ui/kaartbeeld.ts`: de kaart tekenen; `src/main.ts`: scherm en bediening; `src/index.html`: opmaak
