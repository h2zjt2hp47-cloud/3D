# Configurator

Productconfigurator (configureren → prijzen → offerte) voor maatwerkmeubelen en andere maakbedrijven.

- **Werkt op zichzelf**: kan als apart product verkocht worden.
- **Koppelbaar met Missing Link**: artikels, prijzen en offertes via de API.
- **TypeScript**: dezelfde motor draait in de browser (live prijs en foutmeldingen) en op de server (controle vóór de offerte).

Achtergrond en stappenplan: [`docs/configurator-analyse-en-stappenplan.md`](docs/configurator-analyse-en-stappenplan.md)
Fase 0 (productkennis van de pilootklant): [`docs/fase0-productkennis-meubels.md`](docs/fase0-productkennis-meubels.md)
Onderzoek andere zetelconfigurators (prijsopbouw, stofverbruik, tekenen): [`docs/onderzoek-zetelconfigurators.md`](docs/onderzoek-zetelconfigurators.md)

## Structuur

```
packages/
  core/                 De configurator-motor (geen afhankelijkheid van UI, server of ERP)
    src/
      types.ts          Productmodel: kenmerken, keuzes, regels, stuklijst, prijstabellen
      formule.ts        Excel-achtige formules → JsonLogic
      logica.ts         Evaluatie (JsonLogic + eigen functies)
      motor.ts          berekenConfiguratie(): zichtbaarheid, fouten, stuklijst, prijs
      modelcontrole.ts  controleerModel(): fouten in een productmodel vinden
      svg.ts            tekenSvg(): 2D-tekening (bovenaanzicht, vooraanzicht) met maatlijnen
      materialen.ts     Materialen (stof/leder): controle, unieke codes, patroonfactor, inlezen uit JSON
      ontwerp.ts        berekenOntwerp(): vrij zetelontwerp uit elementen (prijs, stof, overlap, tekening)
    voorbeelden/
      maatkast.ts       Kast op maat (prijs = kostprijs stuklijst + opslag)
      sofa.ts           Sofa op maat per cm: recht, chaise longue, hoeksofa; prijstabel × stofgroep,
                        eigen stof/leder, contraststof, stofverbruik, bovenaanzicht
      vrij-ontwerp.ts   Catalogus van zetelelementen en startopstellingen voor de vrije ontwerper
      demo.ts           Commandoregel-demo
      galerij.ts        Maakt galerij.html met tekeningen en prijzen van voorbeeldconfiguraties
    test/               Automatische tests
  demo-web/             Klikbare demo, gebundeld tot één HTML-bestand:
                        - Sofa/Kast op maat: formulier uit het productmodel, live prijs en tekening
                        - Vrij ontwerp: elementen tekenen, slepen (magneet), vergroten, draaien,
                          materiaal per element, ongedaan maken
                        - Materialen: toevoegen, bewerken, verwijderen, lijst kopiëren/inlezen
```

Later volgen: het echte configuratiescherm met beheer, een server (API, opslag, offerte-PDF) en `packages/koppeling-missing-link`.

## Uitproberen

**Klikbare demo in de browser** (sofa per cm en kast, prijs en tekening live):

```bash
npm run build -w @configurator/demo-web
```

Open daarna `packages/demo-web/dist/configurator-demo.html` in een browser.

**Commandoregel:**

```bash
npm install
```

```bash
npm test
```

```bash
npm run demo -- sofa opstelling=hoek_links breedte=283 zijlengte=215 stof=jacquard_ruit contrast=ja contraststof=linnen_brume korting=20
```

```bash
npm run demo -- kast breedte=2400 deurtype=schuifdeuren materiaal=fineer_eik
```

```bash
npm run galerij
```

> De voorbeeldmodellen en alle prijzen zijn **verzonnen** en dienen alleen om de motor te testen.

![Galerij met voorbeeldtekeningen](docs/afbeeldingen/galerij.png)

## Formules

Beheerders schrijven formules zoals in Excel; argumenten scheiden met `;`.

| Wat | Voorbeeld |
|---|---|
| Rekenen | `breedte * hoogte / 1000000` |
| Vergelijken | `breedte >= 1000`, `deurtype <> "geen"` |
| Logisch | `hoek en hoekdiepte >= breedte`, `niet montage` |
| Als | `als(plint; 80; 0)` |
| Afronden | `naarboven(x; 100)`, `naarbeneden(x; 10)`, `afronden(x; 2)` |
| Min/max | `min(a; b)`, `max(a; b; c)` |
| In lijst | `in(kleur; "wit"; "zwart")` |
| Prijstabel | `tabel("basisprijs"; breedte; stof_groep)`; tussenmaten gaan naar de volgende maatklasse |
| Rest na deling | `rest(i; 2)` |
| Eigenschap van een keuze | `materiaal_dikte`, `stof_groep` (= `<kenmerk>_<eigenschap>`) |

## Tekening

Een productmodel kan een `tekening` hebben: rechthoeken en maatlijnen waarvan alle maten formules zijn. `herhaal` tekent een vorm meerdere keren (met volgnummer `i`), bv. zitkussens of legplanken. `vulling` kan de kleur van de gekozen stof zijn (`stof_kleur`). `tekenSvg()` maakt er een SVG van, bruikbaar op scherm en in de offerte-PDF.
