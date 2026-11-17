# Belgica

Een strategiespel over België en de randen, van de Romeinen tot nu. Ontwerp en keuzes: `docs/ontwerp.md`.

## Spelen
Open `dist/belgica.html` in een browser (Safari, Chrome, Firefox). Er is geen internet nodig.

- Klik op een leger om het te kiezen; Shift+klik kiest er meer.
- Rechtsklik, Ctrl+klik, lang drukken of *Kies bestemming* stuurt de gekozen legers naar een vak.
- Spatie = klok stil of verder; 1 tot 5 = snelheid.
- Klik op een eigen vak om te bouwen; zonder selectie toont het paneel je schatkist, belastingdruk en legers.
- D = diplomatie, L = overzicht, J = logboek, F = zoeken, H = naar je land, Q W E R T = kaartsoorten, punt = springen naar de volgende gebeurtenis.

## Bouwen
- `npm install`, daarna `npm run build` → `dist/belgica.html`
- `npm test` (vitest) en `npm run typecheck` vóór elke commit
- `npm run kaart` maakt de kaart opnieuw uit Natural Earth (`src/kaart/vakken.json`)

## Opbouw
- `scripts/kaart/maak-kaart.mjs`: de kaart (vakken, randen, rivieren, terrein; plaatsnamen en kleine rivieren met de hand, benadering)
- `src/kaart/`: de kaart in het spel
- `src/spel/`: de regels zonder scherm
  - `kalender.ts`, `toestand.ts` (alles wat bewaard wordt), `regels.ts` (bewegen, vechten, bezetten, voorspelling)
  - `economie.ts` (zilver, belasting, soldij, bouwen, bevolking, tevredenheid, opstanden), `diplomatie.ts` (vrede, bond, oorlog, huwelijk, oorlogsscore), `vorsten.ts` (sterfte, opvolging, erfenis)
  - `ki.ts` (computerspelers), `verloop.ts` (gebeurtenissen, overgangen, onderwerping, opvolging, score)
  - `tijdperk.ts` (de motor van de tijdperken), `effecten.ts` (bouwstenen voor gebeurtenissen), `tijdperken/` (de elf tijdperken als gegevens)
- `src/ui/`: `kaartbeeld.ts` (de kaart tekenen), `vensters.ts` (diplomatie, overzicht, logboek, opslaan…), `tip.ts` (uitlegballonnen), `context.ts`; `src/main.ts`: hoofdscherm en bediening; `src/index.html`: opmaak
- `docs/`: ontwerp, onderzoek naar strategiespellen, onderzoek naar de geschiedenis (met bronnen; ook als JSON). `scripts/geschiedenis/maak.py` maakt die twee bestanden.
