---
name: bouw-woning
description: Bouw, wijzig of debug de woningconfigurator voor de bouwsector (packages/bouw-web) — plattegrond met verdiepingen (ruimtes en samengestelde L/U-ruimtes, automatisch afgeleide muren, wand tekenen, ruimte in ruimte, ramen/deuren in muren, trap, meubels), gevelaanzichten met kettingmaten, het raam/deur-model met vakken en draairichting, zonwering, de koppeling plattegrond ↔ offertepositie, de offerte, de werf (inmeting, akkoord, meerwerkbon met handtekening) en de 3D van woning en raam. Gebruik deze skill bij een nieuw raamtype, een nieuwe controle (veiligheidsglas, daglicht, ventilatie), een nieuw meubel of afwerking, een fout in draairichting of 3D-plaatsing van een raam, of een uitbreiding van de offerte.
---

# Woningconfigurator (bouw) — hoe het werkt

Demo: `packages/bouw-web` (één HTML-bestand, `npm run build -w @configurator/bouw-web`). Vier stappen: **Plattegrond → Configurator → Offerte → Werf**. Dezelfde motor als de zetels (`packages/core`). Alle prijzen en technische waarden zijn voorbeelden.

## Bestanden
| Bestand | Rol |
|---|---|
| `core/src/plattegrond.ts` | Types (Ruimte, Opening, Meubel, Plattegrond), `murenVan`, `muurVlak`, `muurVanOpening`, `dichtsteMuur`, `ruimteMaten`, `controleerPlan`, `plattegrond3D`, meubelvormen |
| `core/src/plattegrondsvg.ts` | `tekenPlattegrond` (SVG met `data-soort`/`data-id` voor de editor), deurbogen, raamvakken, maatlijnen |
| `core/src/offerte.ts` | `berekenOfferte`: posities × aantal + vrije regels, korting en btw over het geheel |
| `core/src/gevels.ts` | `gevelAanzichten`: 4 gevels als TekeningResultaat (alle verdiepingen, ramen gezien van buiten, kettingmaten), `kantVan` |
| `core/src/werf.ts` | `verwerkMeting` (bestelmaat, haaksheid, afwijking) en `vergelijkOfferte` (meerwerk t.o.v. een momentopname) |
| `bouw-web/src/werf-ui.ts` | Werfscherm: inmeting per positie (foto, overnemen), akkoord vastleggen, meerwerkbon met handtekening, afdrukken |
| `core/voorbeelden/raam.ts` | ProductModel `RAAM` (mm): raam, terrasdeur, voordeur, schuif |
| `core/voorbeelden/raam3d.ts` | `raamBlokken` (lokaal) en `raamScene` (raam in een stuk gevel) |
| `core/voorbeelden/aanbouw.ts`, `aanbouw3d.ts` | ProductModel `AANBOUW` (eerste bouwcase) |
| `core/voorbeelden/inrichting.ts` | `planCatalogus` (vloeren, wanden, binnendeuren, meubels) en `planNaarRegels` (offerteregels) |
| `core/voorbeelden/woning.ts` | Voorbeeldwoning + `raamKeuzes` |
| `bouw-web/src/staat.ts` | Toestand (plan, posities, meta), localStorage, ongedaan maken, synchronisatie plan ↔ positie |
| `bouw-web/src/plattegrond-ui.ts`, `positie-ui.ts`, `offerte-ui.ts` | De drie schermen |

## Plattegrond
- Eenheid **cm**; x naar rechts, y naar onder (papier). In 3D wordt plan-y de z-as.
- **Verdiepingen:** `niveau` op Ruimte, Opening en Meubel (standaard 0) en `plan.verdiepingen` (namen). Alle muur-/controlefuncties werken per verdieping: geef ze `niveauPlan(plan, n)`. `vloerHoogte(plan, n) = n × (muurhoogte + VLOERDIKTE)` (VLOERDIKTE 30). De editor werkt op een gefilterde kopie (`plan()`), wijzigt via `wijzig()` op id en zet `niveau` op nieuwe elementen.
- **Samengestelde ruimtes:** `delen` (extra rechthoeken); `delenVan(r)` geeft alle delen. Tussen twee delen van dezelfde ruimte komt geen muur (`plus === min` wordt overgeslagen). Netto oppervlakte van een samengestelde ruimte is een benadering (bruto min halve muurdikte × lengte). Grepen om wanden te verschuiven alleen bij enkelvoudige ruimtes.
- **Ruimte in ruimte:** `tekenRuimteIn(plan, nieuw)` snijdt de nieuwe rechthoek uit elke ruimte op die verdieping (`trekAf` geeft hoogstens 4 stukken), het grootste stuk wordt het hoofddeel (`zetDelen`).
- **Wand tekenen:** `splitsRuimtes(plan, niveau, as, lijn, van, tot, nieuweRuimte, min)` deelt elk deel dat de wand echt kruist (klik: punt binnen het deel; sleep: overlap > 1 cm); de stukken aan de grote kant worden één nieuwe ruimte.
- **Trap:** meubel `trap` (vorm `trap`, hoogte = muurhoogte + vloerdikte). Verbindt in `controleerPlan` de ruimte beneden met die erboven (bereikbaarheid); in 3D gat in vloerplaat en vloer erboven; in de plattegrond erboven "trapgat" via de `onderlegger`.
- Ruimtes zijn rechthoeken op de **as van de muren**. Muren teken je niet: `murenVan` neemt alle randen, groepeert per lijn (`h` = horizontaal met lijn = y, `v` = verticaal met lijn = x), knipt in stukken op alle eindpunten en bepaalt per stuk welke ruimte aan de **plus-kant** (grotere coördinaat) en **min-kant** ligt. Beide → binnenmuur, één → buitenmuur. Stukken worden alleen samengevoegd als soort en buurruimtes gelijk blijven (zodat elke wandzijde bij één ruimte hoort).
- Hoeken (`muurVlak`): een h-muur wordt verlengd met de halve dikte als een v-muur daar eindigt, ingekort als een v-muur er doorloopt, en niets als een collineaire h-muur verdergaat; v-muren worden ingekort waar een h-muur passeert. Zo overlappen er geen boxen (geen z-fighting).
- Netto oppervlakte: per rand de dikste muur op die lijn, half eraf aan elke kant.
- Indelen = een ruimte in twee splitsen; de gedeelde rand wordt vanzelf binnenmuur. Wand verschuiven = alle ruimtes met een rand op die lijn in hetzelfde stuk schuiven mee, openingen op die lijn ook.

## Openingen en draairichting
- Opening: `as`, `lijn`, `midden`, `breedte`, `hoogte`, `borstwering`, `scharnier` ('begin' = kleinste coördinaat | 'einde'), `naarPlus` (draait naar de plus-kant), optioneel `positie` (offertepositie) en `deurtype`.
- Ramen/buitendeuren/schuiframen horen in een buitenmuur, binnendeuren/doorgangen in een binnenmuur (controle).
- **Lokaal x van een raam = links → rechts gezien van binnen.** Of dat met of tegen de planrichting loopt: `tegen = as === 'h' ? !binnenPlus : binnenPlus` (binnenPlus = de ruimte ligt aan de plus-kant). Gebruikt voor de raamvakbogen in de SVG, de 3D-plaatsing en de synchronisatie van `deur_draai`/`vak1` met `scharnier`.
- 3D-plaatsing van een raam (kader 10 cm achter de buitenkant van de muur): h-muur buiten aan min-kant → draai 0, oorsprong (begin); buiten aan plus-kant → 180, oorsprong (einde); v-muur buiten aan min-kant → 270, oorsprong (lijn, einde); plus-kant → 90, oorsprong (lijn, begin).
- Binnendeuren in 3D: kader in de muur, blad 90° open naar de draaikant; schuifdeur half in de wand.

## Raam/deur-model (`RAAM`, mm)
- Soorten: raam (1–3 vakken), terrasdeur, voordeur (paneel, greep, scharnierkant, binnen/buiten), schuif (welke vleugel schuift).
- Per vak: `vast`, `draai_l`, `draai_r`, `draaikip_l`, `draaikip_r`, `kip` (alleen raam). `_l` = scharnieren links gezien van binnen. Afgeleid `op1..op3` = symbool per vak (voordeur → `draai_l/r`, schuif → `schuif_l/r`/`vast`).
- **Symboolafspraak in de tekening (zicht van binnen):** de punt van de driehoek wijst naar de scharnierzijde; kip gestippeld met de punt onderaan; schuif = pijl. Getekend door `symbool` op een `Vorm` (motor) → `symboolLijnen` in `svg.ts`. Te bevestigen met de klant welke afspraak zij hanteren.
- Controles (regels): maat per vak t.o.v. beslag (maxb/maxh per vakkeuze), vleugelgewicht (draai 130 kg, schuif 250 kg), veiligheidsglas (deur of borstwering < 850 mm), valbeveiliging, ventilatierooster in droge ruimtes, mat glas in badkamer/wc, RC2 vraagt gelaagd glas, Uw > 1,5, screen > 5 m. De wettelijke grenzen zijn **te verifiëren**.
- Uw = (glas·Ug + paneel·0,8 + rest·Uf + lg·ψ) / A, met ψ van de gekozen **afstandhouder** (alu 0,08, rvs 0,06, warm edge 0,04); `randkleur` kleurt de rand rond het glas in 3D.
- **Statiek** (stap `statiek`): `heeft_stijl` = schuifraam, bovenlicht of ≥ 2 vakken. Nodig E·I = 5 · q · L³ · k / 384 met q = winddruk × invloedsbreedte (`stijl_a` = vb, `regel_a` = (bl + vh)/2), L = `stijl_l` (vh + f) of `regel_l` (breedte − 2f), k = 300 of 200. `i_nodig` (cm⁴) = E·I / E van het dragende deel (profiel `e`, koppelprofiel 70 000); `i_aanwezig` = profiel `ix`, `ix_vers` of 400 (koppel), × 2 bij een schuifraam (twee ontmoetingsstijlen). Regel `statiek` (fout) als niet `statiek_ok`; in 3D maakt `stijl()` de stijl rood (#e0412f) of dieper (koppel, 13 cm). Profielstijfheden zijn demowaarden.
- **Glasbestelling**: `ruitenVan(r)` geeft per ruit dagmaat, falsmaat (dagmaat + 2 × `glasinstand`), glasmaat (falsmaat − `glasspeling`), m², kg, samenstelling. De stuklijst glas rekent op `glasmaat_b × glasmaat_h`. De offerte bundelt alle ruiten (kopiëren of CSV).
- Zonwering: kast boven het raam (`zon_kast`), in 3D doek/lamellen deels neer, geleiders opzij.

## Koppeling plattegrond ↔ positie (`staat.ts`)
- Plaats je een raam/buitendeur/schuifraam, dan maakt de editor een positie met standaardkeuzes volgens de ruimte (hal → voordeur, badkamer → kip + mat glas, keuken → hoger raam, droge ruimte → rooster).
- Na elke wijziging `synchroniseer(bron)`: bij bron `positie` gaan maten, soort en draairichting van de positie naar de opening; anders van de opening (en de ruimte) naar de positie. Codes P1…Pn worden hernummerd.
- Een opening verwijderen verwijdert ook de positie; een positie verwijderen in de offerte verwijdert de opening.

## Projecten en opslag (`staat.ts`, `projecten-ui.ts`)
- localStorage: index `bouw-demo.projecten.v1` ({ actief, projecten: ProjectInfo[] }), elk project apart in `bouw-demo.project.<id>`, sjablonen in `bouw-demo.sjablonen.v1`, bibliotheek in `bouw-demo.bibliotheek.v1`. Het oude enkele project (`bouw-demo.v1`) wordt bij de eerste start het eerste project.
- `bewaar()` na elke `wijzig()`: schrijft het actieve project en werkt de index bij (geeft `opslagProbleem` als het niet lukt). Doet niets zonder actief project.
- `nieuwProject(bron, naam)`: schone kopie (`schoon`: geen akkoord, meerwerk, inmeting; standaard zonder klant), volgend offertenummer `OF-jaar-nnnn`. `wissel()` bewaart eerst het huidige project, behalve bij verwijderen (`huidigBewaren: false`).
- Bestand: `{ soort: 'woningconfigurator-project', versie: 1, bewaard, toestand }`; `projectUitBestand` maakt er altijd een nieuw project van.
- Sjabloon = schone kopie zonder klant; ingebouwd: Leeg project en Voorbeeldwoning. Bibliotheek = positie (model + keuzes zonder verdieping); `positieUitBibliotheek` neemt de winddruk van het project over.

## Offerte
- `berekenOfferte`: stukprijs = brutoprijs van de positie, × aantal; regels uit `planNaarRegels` (vloeren +7 % snijverlies, wandafwerking per kleur/tegel, binnendeuren, ruwbouw, inrichting); korting (aannemer) en btw (6/21) over het geheel.
- Scherm: bestellijst per leverancier (op artikelprefix), planning (montage-uren / 16 per dag met 2 plaatsers), afdruk via `@media print` op `#afdruk`, export als JSON (basis voor Missing Link).

## Gevels
- Per kant de buitenmuren met de buitenkant naar die kant (`boven` = buiten aan de min-kant van een h-muur). Gezien van buiten: x gespiegeld voor `boven` en `rechts`; de vakvolgorde wordt omgekeerd en de symbolen gespiegeld (`draai_l` ↔ `draai_r`).
- Kettingmaten per verdieping onder de tekening: alleen de gevelranden en de randen van openingen (geen muuraansluitingen); daaronder de totale breedte; rechts de hoogte per verdieping (muurhoogte + vloerplaat/dakrand).
- Naam: de kant met de voordeur is de voorgevel, de overkant de achtergevel.

## Werf
- Inmeting per positie (`Positie.inmeting`): breedtes [boven, midden, onder], hoogtes [links, rechts], diagonalen, speling. Bestelmaat = min(breedtes) − 2 × speling en min(hoogtes) − speling. Waarschuwing bij een afwijking > 10 mm, een diagonaalverschil > 6 mm of een verschil met de offerte > 20 mm. "Overnemen" zet de maat in de positie met bron `positie`, zodat de opening in de plattegrond mee verandert. Het raammodel heeft daarom `stapgrootte` 1 mm.
- Akkoord (`meta.akkoord`) = momentopname (stukprijs, aantal, samenvatting per positie en de planregels). Meerwerk = `vergelijkOfferte(akkoord, nu)` plus vrije regels (`meta.meerwerk`), met dezelfde korting en btw als de offerte. Handtekening = canvas → PNG (data-URL) in `meta.meerwerkbon`. "Afsluiten" maakt de huidige toestand het nieuwe akkoord en start bon n + 1.

## 3D
- Verdiepingen op elkaar met vloerplaat (min trapgaten) en plat dak (`dak`) boven delen zonder verdieping erboven; `totNiveau` toont alleen tot een verdieping (de bovenste zonder dak); "Muren laag" geldt voor de bovenste getoonde verdieping.
- Blokken (cm) zoals bij de zetels; nieuwe soorten `steen`, `planken`, `tegel`, `parket`, `kunststof`, `matglas`; `zijden` voor een ander materiaal per zijvlak (baksteen buiten, verf of tegels binnen per ruimte); `plaatsBlokken` draait per 90° (en draait `zijden`/`kantel` mee); `kaderVan` voor het camerakader.
- "Muren laag" knipt muren en openingen op 110 cm (meubels niet).

## Uitbreiden
- **Nieuw raamtype of optie:** kenmerk + afgeleide + regel + stuklijstregel in `raam.ts`; tekening (`vormen`, eventueel `symbool`); 3D in `raam3d.ts`; controlekaart in `positie-ui.ts` (`raamControles`); test in `core/test/woning.test.ts`.
- **Nieuw meubel:** `planCatalogus.meubels` (+ vorm in `meubelBlokken` en `meubelSvg` als het een nieuwe vorm is).
- **Nieuwe planregel:** `controleerPlan` (met `ruimte`/`opening`-id zodat de editor kan selecteren).

## Testen
- `npm test` en `npm run typecheck` in de root (145 tests op 1/11/2026; `core/test/woning.test.ts` en `werf.test.ts`).
- Browser: Playwright met cdnjs gerouteerd naar `node_modules/three/build/three.min.js`, Chromium met `--use-angle=swiftshader --enable-unsafe-swiftshader`. Klik op een opening met `{ force: true }` (de groep bevat ook bogen in de ruimte).

## Valkuilen
- In `staat.ts` moet `synchroniseer('plan')` bij het laden **na** alle declaraties staan (esbuild maakt van `const` een `var`; anders "Cannot read properties of undefined").
- `main.view { display: block }` overschrijft `hidden`; daarom staat `[hidden] { display: none !important; }` in de CSS.
- Daglicht telt alleen ramen/deuren in een **buitenmuur**.
