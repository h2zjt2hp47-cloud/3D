# Overdracht — stand van zaken (31 oktober 2026)

## Waar staan we

| Onderdeel | Status |
|---|---|
| Analyse en stappenplan | `docs/configurator-analyse-en-stappenplan.md` (incl. beslissingen en voortgangstabel) |
| Onderzoek zetelconfigurators | `docs/onderzoek-zetelconfigurators.md` |
| Fase 0-sjabloon (productkennis klant) | `docs/fase0-productkennis-meubels.md`, nog in te vullen met de klant |
| Motor (`packages/core`) | Klaar voor demo: formules, regels, prijstabellen, korting, stuklijst, materialen, vrij ontwerp met opties, vormgeving (ontwerpmodus), vooraanzicht, 3D-opbouw. **83 tests groen.** |
| Klikbare demo (`packages/demo-web`) | Tabbladen: Modellen · Sofa op maat · Vrij ontwerp (tekenen, vooraanzicht, 3D, ontwerpmodus) · Kast op maat · Materialen |

**Demo online (privé artifact):** https://claude.ai/artifact/BtVKYeQKC7szR1ZwW97VB1
- slug `582bc583-72e1-4309-953b-520181a53044`, laatste versie `1793483812-f877`
- Opnieuw publiceren: `npm run build -w @configurator/demo-web`, dan `publish_files` met `dist/configurator-demo.html` als `index.html`, met slug + base_version.

## Beslissingen
1. Eerste case: **meubels/zitmeubelen**. Vermoedelijke pilot: Corneille & Silence (nog formeel te bevestigen).
2. **Aparte app**, verkoopbaar op zichzelf, **koppelbaar met Missing Link**.
3. **TypeScript**.
4. Sofa's worden **per cm** gemaakt.

## Modellen van de klant (uit screenshot van de pagina "Zitten")
Kotor, Doha, Montego, Belize in `packages/core/voorbeelden/modellen.ts`. Dit is een **benadering op basis van foto's**: maten, opties en prijzen zijn te bevestigen. Op de pagina staan meer modellen (onder de vier zichtbare), maar die vielen buiten de screenshot.

De demostof "Belize" heet nu **Bouclé Écru**, omdat Belize een model is. De interne code is nog `boucle_belize`.

## Open punten / volgende stappen
1. **Website klant ophalen:** `corneille-silence.be` werd geweigerd door het netwerkbeleid (proxy 403). Toevoegen bij Network access → Allowed domains (`corneille-silence.be`, `www.corneille-silence.be`). Daarna in de nieuwe sessie:
   - alle modellen (ook die onder de screenshot) en hun echte opties overnemen in `modellen.ts`;
   - de stofcollecties overnemen in `standaardMaterialen` in `sofa.ts`.
2. **Echte gegevens van de klant** (fase 0.2): prijslijst per model × maat × stofgroep, stofgroepen, stofverbruik, toegelaten opties per model, levertermijnen.
3. **Opties per model beperken:** een model kan nu alle opties kiezen. Volgende stap: per model een lijst met toegelaten keuzes.
4. **Bedden ("Bedding & Beyond"):** hoofdborden, bedbodems, matrassen en linnen zijn nog niet opgenomen.
5. **Fase 3:** server met opslag (gedeelde materialen en ontwerpen), offerte-PDF met tekening en koppeling met Missing Link (eerst de betekenis van de offerteregelvelden `keuzegroep`/`optie_sleutel`/`vereist_sleutel`/`berekening` laten bevestigen).
6. Vraag aan de gebruiker die nog openstaat: ontwerpt een interieurinrichter later zelf vrij, of alleen de verkoper in de showroom?

## Bekende beperkingen
- 3D is schematisch (eenvoudige vormen), geen fotorealistisch model.
- Eigen materialen en het laatste ontwerp worden alleen in de browser bewaard (localStorage).
- Het afgeronde eindelement is een benadering (halve ronding) van de organische vormen van Doha/Montego.
