# Belgica — context voor Claude

Eigen strategiespel (doorlopende klok met pauze, kaart met vakken) over het gebied van België en de randen, van de Romeinen tot nu. Geen kopie van een bestaand spel: eigen regels, kaart en beeld. De gebruiker (Jonas) is geen programmeur: antwoord in het Nederlands, in gewone taal, kort, resultaat eerst.

**Lees eerst `docs/ontwerp.md`**: alle keuzes van Jonas, de tijdperken en de volgorde van bouwen.

## Plaats
- Deze tak (`claude/brave-hopper-9hiwhj`) staat voorlopig in de repo van de configurator, maar heeft een eigen geschiedenis zonder configuratorbestanden. Later verhuist het spel naar een eigen repo.
- De configurator zelf staat op `claude/vigilant-cray-yi2j33`: daar niets aan veranderen vanuit dit spel.

## Stand
- Alle stappen zijn gebouwd: elf tijdperken van 57 v.Chr. tot 2026, met oorlog, economie, diplomatie, vorsten en erfenis; zie `LEESMIJ.md` voor de opbouw en `docs/ontwerp.md` (Stand) voor wat er nog niet is.

## Werkwijze
- TypeScript, in de browser, gebundeld tot één HTML-bestand om te openen. Niets van een CDN laden.
- Controles vóór elke commit: `npm test` en `npm run typecheck`; daarna `npm run build` en `dist/belgica.html` mee committen.
- Code, namen en commentaar in het Nederlands.
- Jaartallen en feiten pas in het spel na nakijken; wat niet nagekeken is, zo markeren (`onzeker: true` bij een gebeurtenis). Bron: `docs/onderzoek-geschiedenis.md`.
- Een nieuw tijdperk of een nieuwe gebeurtenis: als gegevens in `src/spel/tijdperken/`, met de bouwstenen uit `effecten.ts`. `test/campagne.test.ts` speelt de hele geschiedenis (±40 s).
- Kaartgegevens enkel uit vrije bronnen, met vermelding van de bron.
