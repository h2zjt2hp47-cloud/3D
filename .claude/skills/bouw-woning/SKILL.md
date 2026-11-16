---
name: bouw-woning
description: Bouw, wijzig of debug de woningconfigurator voor de bouwsector (packages/bouw-web) — gevel-editor met gevelmaterialen (verven per muurvlak, sokkel), enkel ramen zonder woning (ramenlijst, maatlijst plakken), klantweergave, plattegrond met verdiepingen (ruimtes en samengestelde L/U-ruimtes, automatisch afgeleide muren, wand tekenen, ruimte in ruimte, ramen/deuren in muren, trap, meubels), gevelaanzichten met kettingmaten, het dak (plat, lessenaar of zadel, met bedekking uit de dakcatalogus) en lichtkoepels, de lichtinval (stand van de zon op een dag en uur, noordrichting, zon per gevel), het raam/deur-model met vakken en draairichting, zonwering, de koppeling plattegrond ↔ offertepositie, de offerte, de werf (inmeting, akkoord, meerwerkbon met handtekening) en de 3D van woning en raam. Gebruik deze skill bij een nieuw raamtype, een nieuwe controle (veiligheidsglas, daglicht, ventilatie), een nieuw meubel of afwerking, een fout in draairichting of 3D-plaatsing van een raam, of een uitbreiding van de offerte.
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
| `core/src/dak.ts` | Dak als gegevens (`DakKeuze`, `DakLicht`, `DakMateriaal`) en de zuivere meetkunde van een hellend dak op één rechthoek: `hellendDak`, `dakHoogte`, `gevelOnderDak`, `dakBlokken`, `daklichtBlokken`, `prisma` |
| `bouw-web/src/dak-ui.ts` | Kaart *Dak* naast plattegrond en 3D (vorm, helling, richting, oversteek, bedekking, kleur), `metDak`, `dakLijnen` |
| `core/src/zon.ts` | Stand van de zon (`zonnestand`, `zonOpEnOnder`, `zonTekst`), noordrichting (`zonRichtingOpPlan`, `gevelRichting`) en zon per gevel (`zonOpGevels`); zuivere rekenfuncties |
| `bouw-web/src/zon-ui.ts` | Blok *Lichtinval* onder de 3D van de woning: aan/uit, dag, uur, stand in woorden, tabel zon per gevel |
| `core/src/werf.ts` | `verwerkMeting` (bestelmaat, haaksheid, afwijking) en `vergelijkOfferte` (meerwerk t.o.v. een momentopname) |
| `bouw-web/src/werf-ui.ts` | Werfscherm: inmeting per positie (foto, overnemen), akkoord vastleggen, meerwerkbon met handtekening, afdrukken |
| `core/voorbeelden/raam.ts` | ProductModel `RAAM` (mm): raam, terrasdeur, voordeur, schuif |
| `core/voorbeelden/raam3d.ts` | `raamBlokken` (lokaal) en `raamScene` (raam in een stuk gevel) |
| `core/voorbeelden/aanbouw.ts`, `aanbouw3d.ts` | ProductModel `AANBOUW` (eerste bouwcase) |
| `core/voorbeelden/inrichting.ts` | `planCatalogus` (vloeren, wanden, binnendeuren, meubels) en `planNaarRegels` (offerteregels) |
| `core/voorbeelden/woning.ts` | Voorbeeldwoning + `raamKeuzes` |
| `bouw-web/src/staat.ts` | Toestand (plan, posities, meta), localStorage, ongedaan maken, synchronisatie plan ↔ positie |
| `bouw-web/src/plattegrond-ui.ts`, `positie-ui.ts`, `offerte-ui.ts` | De drie schermen |
| `bouw-web/src/gevel-ui.ts` | Gevel-editor (tab Gevels): palet, verven, pipet, sokkel, ramen verschuiven/toevoegen, `gevelSvgs` voor de afdruk |
| `bouw-web/src/ramenlijst-ui.ts` | Ramenlijst voor projecten zonder woning, maatlijst plakken |
| `core/voorbeelden/maatlijst.ts` | `leesMaatlijst`: tekst of Excel-kolommen → posities (RAAM-keuzes) |

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

## Gevelmaterialen en gevel-editor
- **Model** (`plattegrond.ts`): `plan.gevelOntwerp = { standaard, vlakken?, sokkel? }` met `GevelKeuze { materiaal, kleur, voeg? }` (codes uit `cat.gevels`, catalogus `gevelCatalogus` in `inrichting.ts`). Zonder ontwerp geldt nog `plan.gevel` (soort + kleur); `gevelOntwerpVan(plan)` maakt een ontwerp dat erop lijkt. De editor maakt het ontwerp aan bij de eerste verfbeurt en zet `meta.regels.gevel` aan.
- **Muurvlak** = buitenmuur van één ruimte aan één kant: `vlakSleutel(m) = "<ruimte-id>:<kant>"` met `buitenKant(m)` (boven/onder/links/rechts, zoals `kantVan`). Blijft gelijk als de ruimte verschuift.
- **Verven**: `verfGevel(plan, keuze, bereik, doel)` met bereik `vlak` | `gevel` (alle verdiepingen, één kant) | `verdieping` | `woning` (standaard, vlakken gewist). Laatste verfbeurt wint, net als bij een verfborstel.
- **Indelen / ruimte in ruimte**: `splitsRuimtes` en `tekenRuimteIn` roepen `erfGevel(plan, oud, nieuw)` aan, zodat de nieuwe ruimte (nieuwe id) het gevelmateriaal per kant houdt.
- **3D** (`niveau3D`): de buitenzijde krijgt `gevelAfwerking(plan, cat, gevelKeuzeVan(plan, m))` (soort, kleur, voeg).
  - Op het gelijkvloers wordt elk stuk gesplitst op de sokkelhoogte (`_sokkel`).
  - Op een verdieping begint een buitenmuur 30 cm lager, voor de rand van de vloerplaat.
  - Kopse kanten op een hoek krijgen het materiaal van de gevel ernaast; kopse kanten waar de muur doorloopt krijgen gevelmateriaal (anders zie je witte haarlijnen).
  - Een dakrand (`dakrand_*`, 32 cm, donker) staat op de buitenmuren waar geen muur van de verdieping erboven staat.
  - Texturen in `drie-d.ts`:
    - `steen` met voegkleur, `planken`, `planken_h`, `leien`, `zink`, `natuursteen`, `pleister`;
    - textuurmaat per zijvlak (`wereldUV` met een maat per vlak);
    - `tint` is begrensd op 255.
- **Gevelaanzicht** (`gevels.ts`, derde parameter `cat`): muren met `vulling` + `patroon`/`patroonKleur`, getekend als `<pattern>` in `svg.ts`. Ook een `sokkel.<n>.<muur>`-vorm. Ramen staan na alle muren. `Gevel.vlakken` (code → sleutel, niveau, muur, ruimte, sokkel) en `naarU`/`vanU`/`naarY`/`vanY` dienen voor de editor.
- **Oppervlakte**: `gevelOppervlaktes(plan)` per muurvlak, berekend op de buitenkant:
  - lengte = as + ½ dikte op een buitenhoek en − ½ dikte op een binnenhoek;
  - hoogte = muurhoogte, + 30 cm op een verdieping;
  - netto = zonder ramen en deuren; de sokkel komt apart.
- **Offerte** (`planNaarRegels`, optie `gevel === true`): groep *Gevel*, één regel per materiaal, kleur en voeg (m² netto), plus een regel voor de sokkel. De ruwbouw-buitenmuur wordt dan `buitenmuur_kaal` (zonder gevelsteen), om niet dubbel te tellen.
- **Editor** (`gevel-ui.ts`):
  - één gevel tegelijk (tabs per kant) met zoom en groot scherm;
  - het voorbeeld onder de muis is een `structuredClone` van het plan met de verfbeurt, met de getroffen vormen blauw omlijnd;
  - Shift = hele gevel;
  - Alt of *Pipet* = materiaal overnemen;
  - klik op een sokkelvorm = sokkel verven;
  - verven, pipet en raam toevoegen gebeuren pas bij **pointerup** (`wacht`), niet als de vinger > 8 px verschoof of er een tweede vinger bijkwam (`opKnijpen` wist `wacht` en draait een begonnen verplaatsing terug), anders verft knijpen-om-te-zoomen een muur;
  - ramen slepen gebeurt via `momentopname()` + `wijzig(..., { zonderOngedaan: true })`;
  - deuren gaan alleen opzij;
  - een raam toevoegen gebeurt via `voegRaamToe` uit `plattegrond-ui.ts`.

## Dak en lichtkoepels (15/11)
- **Gegevens in het plan**, beide optioneel: `plan.dak` (`DakKeuze`: `vorm` plat | lessenaar | zadel, `helling` in graden, `richting`, `oversteek` in cm, `bedekking { materiaal, kleur }`, en `plat` = bedekking van de platte delen naast een hellend dak) en `plan.daklichten` (`DakLicht`: `type`, opening `x, y, b, d`, `niveau`). **Ontbreekt `plan.dak` (en zijn er geen daklichten), dan is alles zoals vroeger**: geen dak op de bovenste verdieping, het effen donkere blok `dak_<ruimte>` op lagere delen, geen dakregels. `dakVan(plan)` geeft de keuze; een plan met daklichten maar zonder keuze is een plat dak met EPDM.
- `richting`: bij een lessenaar de kant waar het dak naar **afloopt** (de lage kant); bij een zadeldak een kant met een dakvoet (boven en onder geven hetzelfde dak: de nok ligt dan van links naar rechts).
- **Catalogus als gegevens** (`inrichting.ts`, zoals `gevelCatalogus`): `dakCatalogus` (`cat.daken`: label, groep, `soort` voor de 3D, `voor` plat | hellend, kleuren, eenheid, prijs, kost, artikel, `minHelling`) en `daklichtCatalogus` (`cat.daklichten`: koepel of lichtstraat met een vaste dagmaat). Plat: EPDM, roofing, grind, groendak. Hellend: keramische pannen, leien, zink. **Alle prijzen zijn verzonnen.** Een nieuwe bedekking = een rij; alleen een nieuwe structuur vraagt een tekening in `drie-d.ts`.
- **`dakOpbouw(plan)`** (`plattegrond.ts`) rekent alles één keer uit; de 3D, de gevelaanzichten, `gevelOppervlaktes`, de offerte, `controleerPlan` en de kaart *Dak* lezen dit: `hellend` (meetkunde), `terugval` (tekst), `plat` (stukken), `dakranden`, `daklichten` (met `reden` als het niet kan), `m2Hellend`, `m2Plat`, `mDakrand`.
- **Grens van ronde 1** (bewust, niet half): een hellend dak komt op de **bovenste verdieping** en alleen als die **één rechthoek** is (de delen van alle ruimtes vullen samen hun kader). Lagere delen zonder verdieping erboven blijven plat. Is de bovenste verdieping een L of U, dan valt alles terug op plat met een waarschuwing in `controleerPlan` (`terugval`). Geen schilddak, geen kilgoten, geen dakramen, geen goten, geen hellend dak op een lager volume.
- **Controles** (`controleerDak`): de terugval, een bedekking die niet bij de vorm past, een helling onder `minHelling`, een dakvoet die meer dan 60 cm onder de muurkop hangt (grote oversteek op een steil dak), en daklichten die niet kunnen, te dicht bij een muur of bij elkaar liggen.
- **Meetkunde** (`dak.ts`): `hellendDak(buitenrechthoek, keuze)` geeft `nokAs` ('x' of 'z'), `p0..p1` dwars op de nok, `q0..q1` langs de nok (buitenkant gevels), `nok`, `top` en de oppervlakte langs de helling met oversteek. De **onderkant van het dak gaat door de buitenkant van de muurkop** (`dakHoogte(d, p)`, negatief in de oversteek).
- **3D** (`plattegrond3D`, dus in de gegevens van de scène): dak op de bovenste verdieping alleen als alle verdiepingen getoond worden, niet bij "Muren laag" en niet met `opties.dak === false` (schakelaar *Dak tonen*).
  - Hellend: `dak_opbouw` en `dak_bedekking` als **prisma** langs de nok, `dak_nok` (ronde vorst, zadel); per buitenmuur `topgevel_<muur>` (prisma door de dikte van de muur, buiten het gevelmateriaal van dat muurvlak, binnen de wandafwerking), en voor muren langs de nok `dakmuur_<muur>` (recht stuk, de hoge gevel van een lessenaar) plus `dakwig_<muur>`.
  - Plat met dakkeuze: per ruimte `dakplaat_<ruimte>` (onderkant licht = het plafond; zijkanten en bovenkant in de kleur van de bedekking) en daarop de bedekking als één laag per verdieping, `dak_<niveau>`, in zo weinig mogelijk stroken (`voegSamen`); per daklicht een opening (`trekAf`), opstand, lichte dagkanten in de schacht en glas (`daklichtBlokken`); een lichtstraat is een glazen prisma. De dakrand is dan een muurkap die 1,5 cm buiten de muur steekt.
  - **Naden en doorschemeren** (les van 15/11): een staand vlak in een andere kleur vlak onder een dakvlak of in een naad schemert onder een schuine kijkhoek als een stippellijn door (de kijker tekent met kantverzachting; een vlak dat je bijna op zijn kant ziet, krijgt dan een verkeerde diepte). Daarom: stukken die op een muurkop staan, grijpen er 1 cm over en de muurkop krijgt gevelmateriaal (`zijden['y+']`); de zijkanten van de dakplaat hebben de kleur van de bedekking; stroken bedekking grijpen een halve cm in elkaar. De witte lijn boven een binnenmuur onder het lage dak (bij een hoog standpunt) bestond al vóór het dak en is niet opgelost.
- **Kijker** (`drie-d.ts`, alleen toevoegingen): vorm `prisma` (`doorsnede` [p, y] in wereldmaat, `as` 'x' of 'z'; `zijden` geldt voor de twee kopse vlakken; op een schuin vlak loopt de textuur met de helling mee in ware lengte) en de soorten `pannen`, `roofing`, `grind`, `groendak`. Glas werpt geen schaduw, het dak wel.
- **Lichtkoepels**: gereedschap *Lichtkoepel of lichtstraat* (K) met een palet; klik in een ruimte zonder verdieping erboven. Het daklicht moet volledig boven één ruimte liggen op een plat dakstuk; anders weigert de editor met de reden. Ze verslepen, verwijderen, van maat wisselen en draaien zoals een meubel, en gaan mee als je de ruimte versleept. De eerste koepel of dakkeuze maakt `plan.dak` aan en zet `meta.regels.dak` aan (`metDak`). Na indelen, een wand verschuiven of "+ Verdieping" meldt `controleerPlan` een koepel die niet meer kan (fout, klikbaar).
- **Daglicht**: `ruimteMaten().daklicht` (80 % van de dagmaat) telt mee voor het daglicht; "zonder raam: mechanische afzuiging" blijft aan `glas === 0` hangen (een vaste koepel verlucht niet).
- **Gevelaanzicht**: `topgevel.<n>.<muur>` (pad met patroon, zelfde `sleutel` als het muurvlak, dus mee te verven), `dak.doorsnede` aan de kant van de topgevel, `dak.vlak` aan de kant van de dakvoet, `dak.rand` aan de hoge kant van een lessenaar; hoogtematen tot de dakvoet en tot de nok. `top` en `sy` zijn niet veranderd: de nok krijgt een negatieve y. Koepels staan boven de dakrand, tenzij een hogere verdieping ervoor staat.
- **Oppervlakte en offerte**: `gevelOppervlaktes` telt de topgevel bij `netto` (veld `topgevel`), dus ook in de groep Gevel en in de ruwbouw. `planNaarRegels` met `opties.dak === true` én een dakkeuze geeft de groep *Dak*: alleen **hoeveelheden** (m² bedekking langs de helling met oversteek, m² plat zonder de openingen, lopende meter dakrand, daklichten per stuk). Prijzen zijn niet verder uitgewerkt (keuze van 15/11: eerst de 3D).

## Lichtinval (15/11)
- **Motor** (`core/src/zon.ts`): `zonnestand({ maand, dag, uur }, plaats = BELGIE, utc?)` geeft `azimut` (0 = noord, 90 = oost) en `hoogte` in graden; negatief = onder de horizon. `uur` is het uur **op de klok**; zonder `utc` geldt de Belgische winter- of zomertijd van die dag (`zomertijd`: benadering 29/3 – 25/10). Benadering van NOAA, getest tegen bekende waarden (21 juni ±62°, 21 december ±16°, equinox ±39°, zonsopgang en -ondergang van Brussel binnen 12 minuten). Meetkundig: zonder breking, buren of bomen.
- **Oriëntatie**: `plan.noord` (optioneel) = graden met de klok mee vanaf de bovenkant van het plan (90 = noord ligt rechts). Ontbreekt = noord boven. Veld *Noord* bij *Woning* in het plattegrondscherm (0 haalt het veld weer weg); `tekenPlattegrond` tekent de noordpijl linksboven met `opties.noordpijl` (de editor) of als `plan.noord` gezet is (ook in de afdruk). `zonRichtingOpPlan(stand, noord)` = richting naar de zon op het plan (0 = boven, 90 = rechts).
- **Kijker** (`drie-d.ts`, algemeen, alleen toevoegingen): `viewer.zon({ richting, hoogte } | null)`. `richting` = waar de zon staat, in graden met de klok mee gezien van boven, 0 = de −z-kant van de scène (bovenkant van een plattegrond), 90 = +x; `hoogte` = graden boven de horizon. De zon komt dan met schaduw uit die richting, sterker tegenover het vullicht (zodat een zonnevlek afsteekt), warmer bij een lage stand, uit onder de horizon. `null` = exact het vaste licht van vroeger (de browsertest vergelijkt het beeld vóór en na). Elke pagina met deze kijker kan dit aanroepen; het plattegrondscherm doet het in `plan3D`.
- **Binnenkijken met licht**: `plattegrond3D(…, { lichtinval: true })` geeft bovenop wat je ziet alle blokken van de volledige woning mét dak die niet getoond worden (het dak, de verdiepingen erboven, de muren boven de snijhoogte bij "Muren laag") als `alleenSchaduw`-blokken (code `schaduw_…`). De kijker tekent die met een onzichtbaar materiaal (`colorWrite` en `depthWrite` uit) en `castShadow`: je ziet ze niet, ze houden de zon tegen. Glas (soort `glas`, `matglas`) komt er niet bij en werpt nooit schaduw: het licht valt door ramen en koepels. Zonder dakkeuze rekent de schaduw met een plat dak. Het kader (camera) blijft dat van wat je ziet.
- **Scherm** (`zon-ui.ts`, blok onder de 3D): vinkje *Lichtinval*, dag (vier seizoensdagen of een datum), uur (schuifbalk 4–22 u), de stand in woorden ("zuid, 61° hoog", zonsopgang en -ondergang) en de tabel **zon per gevel** (`zonOpGevels`: per kant de windstreek, de periodes en de uren zon; een noordgevel heeft er in de zomer twee). Aan/uit bouwt de 3D opnieuw op; dag en uur verzetten alleen de zon (`viewer.zon`), zodat schuiven vlot gaat. De instellingen horen bij het kijken, niet bij het project (alleen `plan.noord` wordt bewaard).
- **Grenzen**: de tabel per gevel is meetkundig (zon boven de horizon en vóór het gevelvlak), zonder buren, bomen of de schaduw van de woning zelf (oversteek, uitbouw). In de 3D geeft de woning zelf wél schaduw. Een screen dat half neer hangt (zoals het schuifraam van de voorbeeldwoning) houdt ook in 3D zon tegen. Geen weerkaatsing van zonlicht binnen (geen globale belichting): een zonnevlek verlicht de kamer errond niet. Zomertijd is een benadering zonder jaartal.

## Enkel ramen (project zonder woning)
- `meta.zonderWoning` (sjabloon *Enkel ramen en deuren*, `ramenToestand()`): body-klasse `zonder-woning`.
  - De plattegrond, "Uit de plattegrond", de positiekaarten en "Toon in plattegrond" verdwijnen.
  - `toon('plan')` gaat naar de offerte.
  - Navigatie: 1 Ramenlijst, 2 Configurator, 3 Werf.
- **Ramenlijst** (`ramenlijst-ui.ts`, op volle breedte boven de offerte):
  - per regel soort, indeling (vaste combinaties; anders "Andere indeling"), breedte, hoogte, ruimte, verdieping en aantal;
  - knoppen: status, configureren, dupliceren, verwijderen.
  - Nieuwe ramen krijgen situatie `renovatie`. Schuiframen zijn standaard aluminium, omdat PVC van 3 m de statiek niet haalt.
- **`leesMaatlijst`** herkent:
  - `b x h`, of twee getallenkolommen (in cm als beide maten < 400);
  - aantal: `2 st`, `2x` of een losse kolom;
  - soort, indeling (`+` voor vakken), ruimte en verdieping.
  - Een kopregel en regels zonder maten worden overgeslagen, met de reden.
- **Klantweergave** (`body.klantmodus`): verbergt `.intern`, de stap statiek en de afstandhouder.
  - Ruimte en verdieping alleen bij een project mét woning; zonder woning zijn ze de enige invoer voor de controles.
  - In de configurator staat de prijs incl. btw (zonder de korting, die op het totaal komt).

## Zoomen (`demo-web/src/zoom.ts`, gedeeld met de zetelontwerper)
- `Zoom` beheert het beeld (viewBox) van een SVG-tekenvlak:
  - muiswiel of trackpad zoomt rond de muisaanwijzer;
  - twee vingers knijpen of verschuiven (vangfase; `opKnijpen` laat de editor zijn actie stoppen);
  - middelste muisknop of slepen op een leeg stuk verschuift (de editor roept `startPan`/`beweegPan`/`stopPan` aan);
  - knoppen −, +, Passend, Selectie en sneltoetsen + − 0.
- **Muiswiel:** gewoon scrollen scrolt de pagina (`wielZoomt` in `ZoomOpties`); zoomen met Ctrl/⌘ + wiel, knijpen of de knoppen, met een korte `zoomhint` (`wielHint`) als je toch scrolt. Alleen in het groot scherm (`body.heeft-groot-scherm`) zoomt het wiel. Dezelfde regel geldt voor de 3D (`drie-d.ts`). Zo is er geen scrolval boven de tekening.
- **Groot scherm** (`main.view.groot-scherm`): flex-kolom, drie kolommen naast elkaar (ook < 1200 px), elke kolom scrolt zelf (`overflow-y: auto`), tekening vult de rest; onder 900 px één kolom met ruimte onder de tekening. Een zware `main.view`-regel (`display: block`) wint van `.groot-scherm`; gebruik daarom `main.view.groot-scherm`. De knop komt op de tekening, de gevels én de 3D; alle labels blijven gelijk.
- De verhouding van het beeld blijft gelijk, zodat het tekenvlak niet van grootte verandert. Een wereldpunt blijft onder de cursor: x' = p − (p − x)/f.
- `vastzetten()`/`losmaken()` houden het automatische beeld stil tijdens het slepen.
- Plattegrond:
  - het raster volgt de zoom: 10, 5 of 1 cm (`rasterStap`, met `schaalNu` = cm per pixel), met een fijn raster van 10 cm bij inzoomen;
  - tekst, labels en grepen blijven op schermgrootte (`schaal` in `tekenPlattegrond`);
  - lijnen blijven dun via `vector-effect: non-scaling-stroke` (alleen in de editor-CSS).

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
- Verdiepingen op elkaar met vloerplaat (min trapgaten) en plat dak (`dak`) boven delen zonder verdieping erboven; `totNiveau` toont alleen tot een verdieping (de bovenste zonder dak); "Muren laag" geldt voor de bovenste getoonde verdieping. Met een dakkeuze: zie *Dak en lichtkoepels*.
- Blokken (cm) zoals bij de zetels; nieuwe soorten `steen`, `planken`, `tegel`, `parket`, `kunststof`, `matglas`; `zijden` voor een ander materiaal per zijvlak (baksteen buiten, verf of tegels binnen per ruimte); `plaatsBlokken` draait per 90° (en draait `zijden`/`kantel` mee); `kaderVan` voor het camerakader.
- "Muren laag" knipt muren en openingen op 110 cm (meubels niet).
- **Ramen echter maken (advies 4/11, nog niet gebouwd):** zie `docs/3d-technieken.md`. Geen zachte vormen (te grof en te zwaar voor harde profielen met mm-details). Wel een eigen doorsnede per profielsysteem, langs het kader getrokken met verstek (hout: stomp), dezelfde doorsnede voor een doorsnedetekening, rondboog met hetzelfde profiel langs een boog; doorsnedes als DXF van de systeemleverancier, met dezelfde maten als `raam.ts` (dagmaat, glasmaat, aftrekken). Echte 3D-bestanden (GLB, zoals `echt3d.ts`) voor krukken, trekbeugels, scharnieren en brievenbussen.

## Bouwdelen en opbouw als gegevens (ronde 5, 15/11; alleen de motor, nog niet in de woning of in een scherm)
- **Opbouw** (`core/src/opbouw.ts`, maten in **mm**): een wand, vloer of dak als lagen; wand van binnen naar buiten, vloer en dak van onder naar boven. Een laag heeft naam, materiaal (code in een lijst `BouwMateriaal`: label, bloksoort, kleur), dikte en rol (`afwerking_binnen`, `plaat`, `folie`, `skelet`, `isolatie`, `latten`, `massief`, `spouw`, `afwerking_buiten`); een skelet en latten hebben `hout` (breedte, hart-op-hart, vulling, richting, latei). `controleerOpbouw` (gewone taal), `totaleDikte`, `laagPlaatsen`, `dragendeLaag`. `warmtegeleiding` is een gereserveerd veld: er wordt nergens mee gerekend.
- **Voorbeelden** (`core/voorbeelden/opbouwen.ts`): `bouwMaterialen` en negen `opbouwen`. **Voorbeelden, geen nagelezen bouwdetails**: elke opbouw heeft `herkomst` met `nagelezen: false`; geen merknamen, geen prijzen.
- **Bouwdelen** (`core/src/bouwdelen.ts`, maten in **cm**): `wandvlak` (met openingen), `vloervlak`, `dakvlak` (helling 0 = plat), `paal`, `ligger` en `spant` geven een `Bouwdeel` als gegevens (`maten`, `stukken`, `lagen`, `vlak`, `meldingen`). Daaruit `bouwdeelBlokken(deel, 'afgewerkt' | 'constructie', opties)` en `meetstaat(delen, materialen)` (hout per doorsnede met aantal en lengte, latten in lopende meter, de rest in m²; netto, zonder prijzen). De 3D tekent dezelfde stukken als de meetstaat telt (test).
- **Assen**: alles ligt tussen 0 en `maten`. Wand: x langs de wand (links → rechts van binnen gezien, zoals een raam), y hoogte, **z = 0 is buiten**. Vloer en plat dak: x lengte, z breedte, y dikte. Hellend dak: x langs de dakvoet, z horizontaal van dakvoet naar nok, y hoogte. Spant: x overspanning, z dikte.
- **Plaats een bouwdeel met `plaatsBouwdeel`, niet met `plaatsBlokken`**: kepers, spantbenen en de lagen van een hellend dak zijn prisma's, en `plaatsBlokken` laat hun `doorsnede` staan (ook bij een gewone verschuiving).
- **Constructie**: het skelet overal zichtbaar (`skelet.<rol>.<n>`), de lagen als staal aan het einde (x = lengte), elke laag een trede later (`laag.<i>`, `lat.<i>`, `vulling.<i>`); `lagen: false` geeft alleen het skelet. **Afgewerkt**: de binnenste en de buitenste laag met een effen kern ertussen. De buitenmaten zijn in beide gelijk.
- **Houtskeletwand**: onder- en bovenregel, een stijl aan elk einde en op het raster vanaf x = 0; naast een opening een doorlopende stijl en een draagstijl, een latei erop, bij een raam een regel eronder, korte stijlen op het raster. Een opening te dicht bij een rand wordt ingekort (`meldingen`, `vlak.openingen`). Een voorstelling, geen berekening; een vakman moet het recept nalezen.
- **Beperking**: rond een opening bestaat een laag uit meerdere blokken; op die naden schemert een dunne stippellijn door, en in vooraanzicht ook een stijl vlak achter een folie (zelfde verschijnsel als de naden bij het dak; de oorzaak is niet uitgezocht). De kijker kent geen vlak met een gat en geen doorzichtig materiaal behalve glas.
- Tests: `core/test/opbouw.test.ts` en `bouwdelen.test.ts`.

## Inbouwen in Missing Link en extra afwerkingen (analyse 15/11, nog niet gebouwd)
- Lees `docs/analyse-bouw-3d-missing-link.md` vóór je hieraan begint: de drie lagen (motor → scène als gegevens → kijker), de gemeten bundel (three.js is 60 % van het programma, met de fotomodus van 615 kB, die de bouw nergens oproept, 85 %), de dertien punten om klaar te maken, de 24 afwerkingen met een top 5, en de vragen voor de ontwikkelaar van Missing Link.
- Principe: een afwerking is gegevens (zoals `gevelCatalogus`), geen programma; catalogus en prijzen komen van buiten.
- Er wordt niets gebouwd vóór Jonas de vijf beslissingen in hoofdstuk 10 nam.

## Uitbreiden
- **Nieuw raamtype of optie:** kenmerk + afgeleide + regel + stuklijstregel in `raam.ts`; tekening (`vormen`, eventueel `symbool`); 3D in `raam3d.ts`; controlekaart in `positie-ui.ts` (`raamControles`); test in `core/test/woning.test.ts`.
- **Nieuw meubel:** `planCatalogus.meubels` (+ vorm in `meubelBlokken` en `meubelSvg` als het een nieuwe vorm is).
- **Nieuwe planregel:** `controleerPlan` (met `ruimte`/`opening`-id zodat de editor kan selecteren).

## Testen
- `npm test` en `npm run typecheck` in de root (159 tests op 1/11/2026; `core/test/woning.test.ts`, `werf.test.ts`, `gevel.test.ts`, `maatlijst.test.ts`, en sinds 15/11 `dak.test.ts`).
- `dak.test.ts` begint met **vingerafdrukken** van de voorbeeldwoning zonder dakkeuze (3D-blokken, offerteregels, gevelaanzichten, oppervlaktes, plattegrond, controles), vastgelegd vóór het dak erbij kwam. Verandert er een, dan is een bestaand project veranderd: dat mag niet zonder reden.
- `npm run beelden`: `bouw-dak` (zadeldak, grind, koepel) wordt ná `bouw-woning` en `bouw-raam` genomen, `bouw-zon` (lichtinval, van boven in het gelijkvloers) daarna.
- `zon.test.ts`: stand van de zon tegen bekende waarden, zon per gevel, de verborgen schaduwwerpers en de noordpijl.
- Browser: er zijn nu twee knoppen met `data-weergave="offerte"` (Ramenlijst en Offerte); klik in tests op `.nav [data-weergave="offerte"]:not(.alleen-ramen)`. Coördinaten in een tekenvlak pas berekenen ná klikken in het palet (Playwright scrolt het palet in beeld).
- Browser: Playwright met Chromium `--use-angle=swiftshader --enable-unsafe-swiftshader` (three.js zit sinds 3/11 in de bundel, geen CDN meer). Klik op een opening met `{ force: true }` (de groep bevat ook bogen in de ruimte).

## Gebruiksgemak testen
- Testrun in de browser: `docs/analyse-gebruiksgemak.md`, hoofdstuk 8. Per scherm en schermformaat (desktop, laptop, tablet, telefoon) controleren op aanraakdoelen onder 44 px, een pagina die te breed is, afgekapte tekst en contrast, en de taken doorlopen met een teller voor het aantal handelingen.
- Echt volledig scherm (Fullscreen API) werkt in headless Chromium niet betrouwbaar (het muiswiel scrolt maar over een deel van het scherm). Test de groot-scherm-opmaak met `Element.prototype.requestFullscreen = undefined` (dan geldt alleen de klasse `.groot-scherm`) en controleer echt volledig scherm op een toestel.
- Aanraking: `Input.dispatchTouchEvent` via CDP; wacht ± 1 s na een sleepbeweging voor je opnieuw tikt, anders wordt de tik niet als klik gezien (testartefact).
- Tabellen die op een smal scherm kaartjes worden (`#o-ramenlijst`, `#pr-lijst`) krijgen `data-label` via `labelCellen()` uit `hulp.ts`.

## Valkuilen
- In `staat.ts` moet `synchroniseer('plan')` bij het laden **na** alle declaraties staan (esbuild maakt van `const` een `var`; anders "Cannot read properties of undefined").
- `main.view { display: block }` overschrijft `hidden`; daarom staat `[hidden] { display: none !important; }` in de CSS.
- Daglicht telt alleen ramen/deuren in een **buitenmuur**.
