---
name: zetel-3d
description: Bouw, wijzig of debug de 3D-weergave (en boven-/vooraanzicht) van zetels in de configurator — elementen zoals zitelement, hoek, chaise, arm, kuipfauteuil, poef, afgerond eindelement, houten tussenstuk en opzet-elementen (rugleuning, kussens). Gebruik deze skill wanneer een nieuw elementtype, een nieuwe poot/arm/rugvorm of een nieuwe optie zichtbaar moet worden in 3D, wanneer iets in 3D verkeerd staat (draaiing, hoogte, kleur), of wanneer de three.js-weergave aangepast moet worden.
---

# Zetel-3D: hoe de 3D-logica werkt

De 3D zit in twee lagen. Houd ze gescheiden:

1. **Motor** (`packages/core/src/ruimtelijk.ts`): `bouw3D(ontwerp, catalogus, materialen)` zet een ontwerp om naar een lijst **blokken** (`Blok`). Geen 3D-bibliotheek, volledig testbaar met vitest.
2. **Weergave** (`packages/demo-web/src/drie-d.ts`): zet blokken om naar three.js-meshes (three 0.187 uit npm, gebundeld; `const THREE: any = THREE_`, typen losjes via `three.d.ts`). Alleen presentatie: materialen, licht, camera, nabewerking, fotomodus.

Welke techniek waarvoor (blokken, eigen doorsnede, zachte vormen, doorlopende opbouw, boog, echt 3D-bestand), de lessen en een werkwijze voor een nieuw model: `docs/3d-technieken.md`.

Boven- en vooraanzicht volgen dezelfde regels: `tekenElement()` in `ontwerp.ts` (bovenaanzicht) en `tekenVooraanzicht()` in `vooraanzicht.ts`. **Een nieuwe vorm hoort in alle drie** (boven, voor, 3D).

## Assen en eenheden
- Alles in **cm**. `x` = links→rechts (zoals het bovenaanzicht), `z` = diepte achter→voor (= `y` van het bovenaanzicht), `y` = hoogte vanaf de vloer.
- Een `Blok` heeft een minimumhoek (`x, y, z`) en afmetingen `b` (langs x), `h` (langs y), `d` (langs z).
- `vorm`: `blok` (eventueel `afronding` in cm), `cilinder` (staand, of liggend met `as: 'x' | 'z'`), `kegel` (staand, `taps` = verhouding onderste/bovenste straal), `bol` (knoop).
- `soort` bepaalt het materiaal in de weergave: `stof`, `kussen` (stof met weefsel), `hout`, `metaal`, `donker`.
- `kantel: { graden, richting }` laat een rug of kussen achterover hellen; `richting` is de kant van de rug (`z-` bij rotatie 0, `x+` bij 90, `z+` bij 180, `x-` bij 270).

## Elementen, lokale coördinaten en draaiing
- Elk element heeft `breedte` (de kant met de rug) en `diepte` (rug → voorkant) en een `rotatie` 0/90/180/270 (0 = rug achteraan, 90 = rug rechts, 180 = rug vooraan, 270 = rug links).
- **Werk altijd lokaal**: definieer onderdelen als rechthoeken `(lx, ly, lb, ld)` met de rug bij `ly = 0`, en zet ze om met `lokaalNaarWereld(e, lx, ly, lb, ld)`. Gebruik in `ruimtelijk.ts` de helper `lokaal(code, soort, lx, ly, lb, ld, y, h, kleur, extra)`.
- `voetafdruk(e)` geeft de rechthoek in het bovenaanzicht (bij 90/270 zijn breedte en diepte omgewisseld).

## Hoogtes (één bron van waarheid)
- **Gebruik altijd `hoogtesVan(ontwerp, catalogus, e)`** → `{ zithoogte, poothoogte, rughoogte, armhoogte }`. Die neemt eerst de **vrij getekende hoogtes** (vooraanzicht): `e.vorm.rughoogte/armhoogte` per element, `ontwerp.vormgeving.zithoogte/poothoogte` voor de hele zetel; anders de opties (`teken.hoogte`). Grenzen: `HOOGTE_BEREIK`.
- Poothoogte `P`: `plint` = 4, `verdekt` ≤ 8; `draaivoet` en `housse` vervangen de poten.
- Zithoogte standaard uit optie `zithoogte` (42/45/48). Kussendikte, rugdikte, aantal zitkussens, zachtheid, rugvorm en houten frame komen uit **vormgeving**: `vormgevingVan(ontwerp, e)` (standaard ← model ← element).
- Basis: van `P` tot `zithoogte − kussendikte`; zitkussen daarbovenop. Rug: van `P` tot `rughoogte` (optie `rughoogte`).
- **Losse rugkussens (zoals bij de klant):** het karkas (vaste rug) staat op **`karkasHoogteVan`** (vormgeving `karkashoogte`, anders rughoogte − 10). De rugkussens (`rugkussendikte` diep, `rugkussens` per element, anders evenveel als zitkussens) staan op de zitting, leunen 7° achterover (14° bij `hellend`) en reiken tot de rughoogte. Bij de modellen: `rughoogte` = "totale hoogte met rugkussen", `karkashoogte` = "totale hoogte corpus" en `armhoogte` van de productpagina. Kussens zijn bol volgens `Blok.bol` (cm, op het dunste vlak; drie-d `kussenGeometrie`).
- **Opzet-elementen** (`ElementType.opzet`: rugleuning, rugkussen, sierkussen, rolkussen) liggen op een **drager**: `dragerVan(ontwerp, catalogus, e)` = de zitting (`DRAGER_STIJLEN`: zit, hoek, chaise, zit_zonder_rug, rond, kuip, poef; niet arm of console) met de grootste overlap, en alleen als het opzet-element **voor minstens 60 % op zittingen** ligt (anders melding `opzet.los` en in 3D op de vloer). Waarop het rust: **`draagHoogteVan`** (zithoogte − kussendikte van de drager, bij een poef zithoogte − 2). Bovenkant van een losse rugleuning: **`rugleuningTop`** = max(rughoogte, draaghoogte + 20). Vooraanzicht, 3D, prijs en het hoogteveld in de ontwerper gebruiken deze twee; nooit zelf herberekenen. Krijgen geen poten, mogen overlappen (behalve twee dezelfde op elkaar: `opzet.op_elkaar`) en nemen standaard het materiaal van de drager (`materiaalVan`).

## Opties zichtbaar maken
Opties komen uit de catalogus (`OptieGroep` → `OptieKeuze`). De tekening leest **alleen `keuze.teken`**:
- `poten.teken.vorm`: conisch, blok, cilinder, slede, haarspeld, plint, verdekt, draaivoet, housse; `metaal: true` (+ `kleur`).
- `hout.teken.kleur`, `metaal.teken.kleur`, `zithoogte/poothoogte/rughoogte/armhoogte.teken.hoogte`.
- `armstijl.teken.vorm`: strak, rond, engels, schuin, houtblad, hout. `rug.teken`: `los`, `capitonne`. `naad.teken`: `bies`, `contrast`, `stiksel`.
- `kuipvorm`, `poefvorm`, `ronde_kant`, `console_uitvoering`, `functie`: `teken.vorm` of `teken.kant`.
- `chaise_rug.teken.kant`: achter (**standaard**: de rug loopt door achter de chaise), geen (open uiteinde, minprijs), links/rechts (méridienne). Lees met `chaiseRugVan(opties)`; null = geen rug.
- `armstijl` *uitlopend* (technische tekening van Wallace): een smalle wand (`kuipwand`) tegen de zitting die vooraan op armhoogte ligt en naar achteren oploopt tot de karkashoogte, plus een lip (`${id}.lip`, korte `kuipwand`) die bovenaan naar buiten uitsteekt. De buitenkant volgt uit `naarBuiten` (voetafdrukken t.o.v. het midden van de zetel; werkt ook bij gedraaide armen). Vooraanzicht: silhouet met de lip en het oplopende deel.
- Hoes tot op de grond (`housse`): bij zitelementen in één stuk van de vloer tot onder het zitkussen (3D en vooraanzicht).
- `nekrol.teken.nekrol`: cilinder op het karkas achter de losse rugkussens (zit/hoek, chaise achteraan, recht deel van een afgerond eindelement); alleen met losse rugkussens (`alleenMet`), en niet aangerekend zonder rug (`RUGGROEPEN`).
- `rug_rond.teken.rond` (afgerond eindelement): blok `${id}.rugrond` met vorm `kuipwand` langs een boog van 140° rond de ronde kant, van karkashoogte achteraan tot zithoogte + 10 vooraan; vooraanzicht als silhouet achter de zitting.
- **Zachtheid** stuurt de losse rugkussens: afronding 1 + 0,9 × z, bol = dikte × (0,03 + 0,022 × z) (× 1,25 bij dons), helling 2 + 0,8 × z graden (14° bij *hellend*). Zitkussens: bol = 0,05 × dikte + 0,22 × z.
Lees opties via `gekozenOpties(ontwerp, catalogus, e)` en `te(groep, veld, standaard)`. Een nieuwe optie die alleen de prijs beïnvloedt, heeft geen tekencode nodig.
- **Prijs = tekening (`vormEffect` in `ontwerp.ts`):** per tekenstijl staat wat zichtbaar is: rug (rugopties en rughoogte aanrekenen), rugvorm/rugdikte, meerdere zitkussens, houten frame. Tekent `ruimtelijk.ts` iets nieuws (bv. een houten frame rond een hoekelement), pas dan ook `vormEffect` aan, anders betaalt de klant niet voor wat hij ziet of omgekeerd. De ontwerpmodus in de demo toont per element alleen de velden met effect.
- **Getekende hoogtes vervangen de keuze** in de prijs: rughoogte per cm, arm-, zit- en poothoogte als de keuze met de dichtstbijzijnde `teken.hoogte` (`keuzeBijHoogte`).

## Stappenplan: een nieuwe vorm of nieuw element
1. **Catalogus** (`voorbeelden/vrij-ontwerp.ts` of via de catalogus-editor): `ElementType` met een (nieuwe of bestaande) `tekenstijl`, maten, prijzen. Voeg de tekenstijl toe aan het type `Tekenstijl` en aan `tekenstijlen` in `catalogus.ts`.
2. **Bovenaanzicht**: case in `tekenElement()` (rechthoeken in lokale coördinaten, of `pad`/`ellips` voor ronde vormen).
3. **Vooraanzicht**: case in `tekenVooraanzicht()` (x-bereik = voetafdruk, hoogtes zoals hierboven; `bovenRond()` voor afgeronde bovenkanten).
4. **3D**: case in `bouw3D()` met `lokaal(...)`, `cilinderMidden(...)` of liggende cilinders. Sla poten over als het element zijn eigen onderbouw heeft.
5. **Weergave** alleen aanpassen als er een nieuwe `vorm` of `soort` bij komt (`mesh()` in `drie-d.ts`).
6. **Tests** (`packages/core/test/`): controleer codes, hoogtes (`y`, `h`), `vorm` en `kantel` van de blokken, en dat `controleerCatalogus()` en alle modellen geldig blijven.
7. `npm test` en `npm run typecheck` in de root; daarna `npm run build -w @configurator/demo-web`.

## Interactie in de demo (ontwerper.ts)
- Bovenaanzicht: tekenen met een elementgereedschap; daarna springt het gereedschap terug naar "selecteren". Slepen op een bestaand element verplaatst het (ook met een tekengereedschap actief), behalve bij opzet-gereedschap (dat teken je bewust bovenop een element).
- Rugleuningen en kussens op een element **verhuizen mee** (`kinderenVan` / `verhuisKinderen`); de magneet negeert opzet-elementen voor basiselementen.
- Vooraanzicht is tekenbaar: element klikken/zijwaarts slepen; grepen voor breedte (rij schuift mee, rugleuning over volle breedte groeit mee), rug-/arm-/zithoogte (bovenkant) en poothoogte (onderkant); nieuw element tekenen (breedte = kader, hoogte = rug-/armhoogte); opzet komt op het element met de meeste overlap, vóór een eigen rug of losse rugleuning (`voorkantRug`).

## Zoomen in boven- en vooraanzicht
- `zoom.ts` (klasse `Zoom`): muiswiel, knijpen, verschuiven (leeg stuk of middelste muisknop), knoppen −, +, Passend en Selectie, sneltoetsen + − 0.
- `passendBoven()` en `passendVoor()` geven het automatische beeld; `tekenCanvas` en `tekenVoorvlak` tekenen met `zoom.kijkvak()`.

## Weergave (drie-d.ts)
- Afgeronde balken: `ExtrudeGeometry` van een afgerond grondvlak met bevel, gedraaid zodat de extrusie naar boven gaat; onderkant op `y = 0` van de mesh.
- Kleurbeheer staat aan: `new THREE.Color(hex)` zet sRGB zelf om (geen `convertSRGBToLinear` meer); texturen krijgen `colorSpace = SRGBColorSpace`; `tint()` rekent op de sRGB-waarden (niet via THREE.Color). Tonemapping **Neutral** (Khronos PBR Neutral, belichting 1): gemeten het dichtst bij de stalen (ACES maakte petrol turkoois). Lichtsterktes × π (fysische eenheden sinds r155). Controleer kleurgetrouwheid door canvaspixels te meten tegen de staal.
- **Licht en omgeving:** `LICHTEN` (Studio, Daglicht, Ochtend, Bewolkt, Avond, Toonzaal/spots) met elk een eigen HDR-equirect (`hdrBeeld`: wanden + ronde lichtbronnen, Float32) als `scene.environment`; die dient ook de path tracer. **Decors** `DECORS` (Studio, Woonkamer, Scandinavisch, Loft, Japandi, Klassiek, Toonzaal, Terras) + losse `Weergave3D` (vloer `VLOEREN`, muur, tapijt, spullen, lens, helderheid, zonrichting, maten, draaien) via `instellen()`.
- **Prestaties:** `render()` voegt aanvragen samen tot één beeld per schermverversing (`render(true)` = meteen, voor foto's); schaduwen alleen opnieuw bij een andere scène, decor of zon (`shadowMap.autoUpdate = false`, `schaduwOpnieuw()`); `instellen()` herbouwt het decor alleen bij vloer/muur/tapijt/spullen (vertraagd 120 ms); fotobreedte begrensd op `maxTextureSize − 64` (max 2400).
- **Kwaliteit Mooi** (alleen zetel): `EffectComposer` met `GTAOPass` + `OutputPass` en VSM-schaduwen (2048, blur). Tijdens draaien het gewone beeld, 180 ms na de laatste beweging één keer de nabewerking (`render(direct)`).
- **Fotomodus:** `fotoRealistisch()` met `WebGLPathTracer` (three-gpu-pathtracer): mist, contactschaduwvlak en hoekpuntkleuren uit (die laatste leest de tracer verkeerd: zwarte vlakken), `environmentIntensity` = OMGEVING × 1,15, synchroon `setScene` (async vraagt een BVH-worker), lus met `renderSample()` tot het aantal stappen. Bump-maps negeert de tracer.
- **Downloads:** altijd via `bewaarBestand()` (`demo-web/src/bewaren.ts`): in de claude.ai-weergave via de toelating `downloads` (publiceren met `capabilities: {downloads: true}`; alleen o.a. png, json, csv, zip toegestaan), elders een gewone downloadlink. Ook de bouwdemo gebruikt die helper.
- **Decors (`demo-web/src/decor3d.ts`):** `DECORS` in drie-d.ts zijn gegevens (`DecorSpec`: vloer, muur, `wanden: 'hoek' | 'achter'`, raam met kader/gordijn/zicht, afwerking lambrisering/lijsten/latten, tapijt, tafel, bijzettafel, lamp, plant, kunst, buiten, podium, `zon` = standaardzonrichting). `bouwDecor()` bouwt de hoekkamer: achterwand + zijwand **rechts** met raam (de camera staat standaard links-voor), wanden in groepen die `wandenNaarCamera()` verbergt als de camera erachter staat; schaduwbereik = zetel + `schaduwMarge` (lichtvlek door het raam). Alles in cm; texturen getekend op canvas (uitzicht, tapijt, kunst, steen).
- **Vrije omtrek en kuip (3/11):** `Blok.omtrek` (punten x/z, wereld) → `omtrekGeometrie()` in drie-d: hoeken in het grondvlak afgerond met straal ≥ randafronding (anders vouwt de rand om), omtrek gelijkmatig herverdeeld (om ±4 cm), bovenvlak met een gladde welving over het kader, textuur langs de omtrek (dubbele kolom en dubbele ring op 45° voor de textuurnaad, `gelijkeNormalen`). Kuipfauteuils: `core/src/kuip.ts` (`kuipParameters` uit `kuipvorm.teken`, `kuipOpbouw` → grondvlak, wandmiddenlijn met hoogtes, zitting, rugkussens), gebruikt door `ruimtelijk.ts` (vorm `kuipwand` met `pad`/`hoogtes`/`dikte`), `vooraanzicht.ts` (omhullende van de wand, fijn bemonsterd) en `ontwerp.ts` (wand als band met ronde uiteinden). `kuipwandGeometrie()` veegt een afgerond profiel langs de middenlijn. Test elke vorm bij 0/90/180/270 (`test/kuip.test.ts`).
- **Klikken:** meshes heten `b.code`; `opKlik(elementId)` via raycast bij een klik zonder slepen; `markeer(id)` tekent een `Box3Helper`.
- Stof krijgt een fijne weefseltextuur (canvas) die met de kleur vermenigvuldigd wordt; hout ruwheid 0,55; metaal metalness 0,85.
- **Glas (proef 4/11):** `glas` en `matglas` zijn `MeshPhysicalMaterial` met `transmission: 1`, `ior 1.5`, `thickness 1`, ruwheid 0,03 en 0,55, kleur halfweg naar wit (`glasTint`); het decorraam (`decor3d.ts`) ook. Niet terug naar `opacity`: dan blijft maar een deel van de spiegeling over. Beperking: glas ziet ander glas niet (een raam achter een raam).
- Bouwmaterialen (ook gebruikt door de bouwdemo): `steen` (baksteen), `planken`, `tegel` (60 × 60), `parket`, `kunststof`, `glas`, `matglas`. Textuur in wereldmaat (cm) via `wereldUV`, zodat stenen en tegels hun echte maat houden.
- `zijden` op een blok geeft één zijvlak een ander materiaal (bv. baksteen buiten, verf binnen); `plaatsBlokken` (ruimtelijk.ts) draait blokken per 90° en draait `zijden` en `kantel` mee.
- **Realisme (3/11):** `scene.environment` = studio-omgevingsbeeld (eigen kamer met softboxen via `PMREMGenerator`, `OMGEVING` = envMapIntensity). Stof met weefsel: `stofMateriaal()` (bumpMap = `weefselCanvas` in grijs, `RELIEF` per weefsel; velours `MeshPhysicalMaterial` met `sheen`, leder met `clearcoat`). Blokken `kussen` (en bij `zetel: true` ook `stof`) met `afronding` → `kussenGeometrie()`: fijn opgedeeld, bol langs de dunste as, analytische normalen, hoekpuntkleuren als schaduw onderaan. `Blok.naad` (uit optie `naad`, gezet in `ruimtelijk.ts`) → `naden()`: buizen rond de twee grote vlakken (bies, naad, sierstiksel) als kinderen van de kussenmesh. Bij opruimen: `traverse` voor `geometry.dispose()`.
- `maak3D(houder, { zetel: true })` (alleen ontwerper): contactschaduw, mist in de achtergrondkleur, houtnerf, buren-schaduw op kussens (`burenVan`), en de instellingen `decor()` / `licht()` / `kwaliteit()` / `foto()` met presets `DECORS` en `LICHTEN` (gegevens; `zetDecor` en `zetLicht` passen ze toe). UI in `ontwerper.ts` (`start3DInstellingen`), groot scherm via `grootSchermKnop($('#o-tekenvlak'))`.
- Schaduwen via één `DirectionalLight` waarvan het schaduwkader meeschaalt met de zetel. Camera: eigen orbit (slepen, scrollen, knijpen) en vaste standpunten.

## Echt 3D-model (bestand van de fabrikant, proef 4/11)
- **Motor:** `core/src/echt3d.ts`. `ModelDefinitie.echt3d` beschrijft:
  - het bestand en de elementtypes van links naar rechts (aansluitend, rotatie 0);
  - de maten in het bestand (`maat`: b, d, h, zithoogte, poothoogte);
  - `rek` (standaard 0,15);
  - `toont` (per optiegroep de keuzes die het bestand kan tonen; groepen die er niet in staan, doen niet mee);
  - `vast` (houtframe, rugvorm).

  `echt3dPlaatsing()` controleert opstelling, opzet-elementen erop, één stof, keuzes, vormgeving, breedte, diepte, zithoogte, poothoogte en het hoogste punt (rug of arm). `bouw3D(o, c, m, { echt3d })` zet `scene.echt` (kader, stof zoals op de blokken, pootafwerking, de elementen met hun x-stuk) of `scene.echtNiet` (reden in gewone taal). **De blokken blijven altijd in de scène**: terugval, schakelaar *Benadering*, contactschaduw, tests. Prijs, tekeningen en offerte lezen `echt3d` niet.
- **Weergave (`drie-d.ts`):**
  - `echtModelVan(bestand)` laadt `window.__MODELLEN3D[bestand]` (data-URL) één keer met `GLTFLoader.parseAsync`. Daarna volgt opnieuw `toon(laatsteScene)`; tot dan de blokken.
    - Het base64 decodeert de weergave zelf, zonder `fetch` van de data-URL: de artifact-pagina kan dat blokkeren (connect-src).
    - Afbeeldingen in het bestand gaan via de plugin `afbeeldingenViaDataUrl` (data-URL + TextureLoader, zoals de stoffoto's) in plaats van blob-adressen. Getest met een strenge CSP: geen connect, geen blob, alleen `img-src data:`.
  - `echtGroep()` kloont per beeld de geometrie (`toon()` gooit geometrie weg) en schaalt de groep per richting tot het kader (meter → cm, normalen kloppen via de normalMatrix).
  - Delen met *fabric/stof* in de naam krijgen `echtStof()`: kloon van het blokmateriaal, weefsel of foto herhaald met `cmPerUV / tegelmaat`, de AO-textuur van het bestand (kanaal 0, zoals GLTFLoader die zet). Delen met *leg/poot* krijgen de pootafwerking; de rest blijft zoals in het bestand.
  - De blokken van de elementen onder het model worden niet getekend.
  - Klikken kiest het element via `userData.echt` en `raak.point.x`; `zetMarkering` tekent het stuk van dat element.
  - De contactschaduw tekent de driehoeken van het model van boven (alle in dezelfde draairichting, één vulling).
  - `Weergave3D.echtModel` (false = benadering) via `instellen()`.
  - `opEcht(plaatsing | null, toestand)` meldt na elke opbouw wat in beeld staat: getoond, laden, benadering, fout of geen. De ontwerper toont de naamsvermelding en de passende uitleg, ook na het laden of bij een fout.
- **Bestanden:** `demo-web/modellen3d/<sleutel>.glb` (+ `<sleutel>.jpg` voor de modelkaart, `BRON.md` met licentie). `bouw.mjs` sluit ze alleen in de gewone demo in (`/*MODELLEN3D*/`), niet in de huisstijlversie. `staat.ts` toont proefmodellen alleen als hun bestand er is (`proefModellenNu`).
- **Een bestand voorbereiden:** lampen en camera's eruit, kleurvarianten eruit, texturen verkleinen (zie `docs/echte-3d-modellen.md`). Meet de maten en de zithoogte in het bestand, en kies elementtypes die binnen de catalogusgrenzen vallen (arm ≤ 40 cm, afgerond eindelement ≥ 80 cm). Wat de klant moet aanleveren, staat in dat document.

## Zachte vormen (proef 4/11, `core/src/zachtevorm.ts`)
- **`zachteVorm(blokken, { raster 2, overgang 4, overgangBinnen 10, minAfronding 1,25 × raster, buren, tegelCm })`**: maakt van gestoffeerde blokken één dichte vorm. Werkwijze:
  - afstandsveld per blok: `balk` (ook met kantel, zelfde draaiing als de weergave: rond de onderkant in het midden), `rol`, `wand` (kuipwand), `omtrekBlok`, `profielVorm`;
  - zacht samenvoegen met een straal × (1 − cos hoek tussen de richtingen naar buiten), dus geen richel waar vlakken in elkaars verlengde liggen; binnen één element (code vóór het punt) de ruimere `overgangBinnen`;
  - eerst een grof raster (3×), dan fijn alleen vlak bij het oppervlak;
  - surface nets op een licht verschoven raster (vlakken niet op rasterpunten, anders dubbele randen), punten met 3 Newton-stappen op het oppervlak;
  - daarna twee keer gelijkmatiger verdeeld (half naar het gemiddelde van de buren, terug op het oppervlak): anders een kartelrand langs scherpe bochten zoals de krul;
  - normalen uit het veld, schaduw (AO) uit 5 stappen langs de normaal met kussens en vloer erbij;
  - uitvoer per driehoek met textuurcoördinaten in cm volgens de richting van de driehoek (zoals `wereldUV`).
- **`smeltMee(b)`**: stof, geen kussen of zijden, geen kuipwand en geen omtrek. Die zijn al rond en gaven foutjes aan de randen; `zachteVorm` kan ze wel als je ze rechtstreeks geeft. Uitzondering: een `glad` blok in de stof (doorlopende zetel) smelt wel mee, ook als omtrek of kuipwand.
- **Weergave:** `Weergave3D.vormen` (`'blokken' | 'zacht'`), keuze *Vormen* in de 3D-balk.
  - `zachteGroepen` groepeert per materiaalsleutel en raakvlak (union-find).
  - Een vorm wordt onthouden per sleutel: maten van de delen en de kussens eromheen; de kleur hoort niet bij de sleutel.
  - `planZacht` rekent 140 ms na de laatste wijziging, één vorm per keer (het scherm kan tussendoor reageren); tot dan de blokken. Kader groter dan 3 m³ of grondvlak groter dan 4 m²: raster 2,5 cm. Hooguit 12 vormen onthouden.
  - Snelheid meten: bundel een testscript met esbuild en draai het met node (`tsx` meet de eerste, koude keer en geeft een veel te hoge tijd).
  - De mesh krijgt `userData.delen` (per element een Box3) voor kiezen (`raak.point`) en markeren.
- **`Blok.vorm = 'profiel'`** (uitlopende en strakke arm, `uitlopendProfiel` / `strakProfiel` in `ruimtelijk.ts`, ook gebruikt door `vooraanzicht.ts`):
  - `rand` = afronding van voor- en achterkant (standaard 2,5), `kopBol` = bolling van het voorpaneel (in het midden, met de juiste richting in de gradiënt);
  - de naad of bies rond het voorpaneel komt van `profielNaad` in `drie-d.ts`: op de afgeronde rand (0,29 × rand naar binnen en naar achter), niet langs de onderkant, ook als het blok samensmelt;
  - een uitlopende of strakke arm met hoes loopt zelf tot op de vloer (geen `.housse` onder de arm, ook niet in het vooraanzicht);
  - `pad` is de rechte middenlijn (15 punten) met `hoogtes`;
  - `profiel` bestaat uit punten [s, y, boven]: s naar `uit` (buitenkant); `boven = 1` betekent onder de bovenkant ter plaatse, dus mee met de hoogte;
  - de helling van de opgaande arm zit in de richting en de afstand (−gy × deel dat meeschuift × stijging), anders kartels;
  - de veelhoek-richting komt van de dichtste zijde, ook precies op de rand, anders verkeerde normalen (strepen);
  - in de weergave altijd via `zachteVorm([b])`, ook bij *Blokken*.
- **Valkuil:** samensmelten alleen geeft weinig winst. Een overtuigende vorm vraagt een eigen doorsnede per stijl (arm, rug, hoes). Test met `zachtVeld` en de vergelijking van normalen met de numerieke gradiënt.
- **Tabellen in het grondvlak** (sneller, zelfde uitkomst): een vrije omtrek (`omtrekBlok`) en een gebogen wand (`wand`) hangen niet van de hoogte af. Na 2000 oproepen maakt de motor per cm een tabel:
  - omtrek: afstand en richting, bilineair (`veelhoekTabel`); waar de vier richtingen meer dan ±11° uiteenlopen (een knik), rekent hij gewoon;
  - wand: het dichtste stuk van het pad per cm; daarna zoekt hij alleen in de stukken rond die van de vier tabelpunten (liggen die meer dan 4 stukken uit elkaar, dan overal). Dat blijft exact.
  - De wand rekent de helling van de bovenkant langs het pad mee in de richting (`mee`), anders kloppen de normalen niet waar de wand oploopt of zakt.

## Doorlopende opbouw (4/11, `core/src/doorlopend.ts`)
- **`Vormgeving.opbouw`** `'elementen' | 'doorlopend'` en **`Vormgeving.bocht`** (cm, 0–60): alleen op zetelniveau (verborgen bij een element). Doha (`doorlopend`) en Montego (`doorlopend`, `bocht: 30`, benadering uit de foto).
- **`doorlopendeRij`**: de langste rij aansluitende elementen met tekenstijl zit, rond of zit_zonder_rug, rotatie 0, op één lijn. **`doorlopendeOpbouw`** (vanuit `bouw3D`) haalt hun blokken weg en zet er één zetel voor in de plaats, met codes van het middelste element:
  - diepte per x (`diepteBij`): een dieper buurelement loopt over met een smoothstep van 1,6 × het verschil aan elke kant (25–70 cm), hooguit de helft van elk element en buiten de ronde voorhoeken (anders een sprong aan het eind van de boog);
  - `.voet` (verdekt/plint, gewone omtrek, `glad: false`, donker, 7,5 cm binnen de onderbouw) of poten langs de omtrek;
  - met losse zitkussens (`metKussen`): `.zitkussen` rondom (inset 0,5, ook onder de rug, afronding ≤ 0,42 × dikte, met naad) en `.basis` 3 cm terug (inset 3,5) met afronding ±0,47 × hoogte: twee ronde banden zoals Doha. Met een vaste zitting: alleen `.basis` (inset 0,5, afronding ±0,36 × hoogte), één vorm zoals Montego. Beide `glad: true`;
  - `.rug`: kuipwand langs de achterkant; met een zitkussen staat hij op de onderbouw (`y = zitOnder`, middenlijn 1 cm verder binnen), anders vanaf de voet. Bij een afgerond uiteinde volgt hij `rug_rond`: `rond` = omloop langs de omtrek tot 32 % van de diepte, `recht` = begin/einde op de rechte achterkant op ≥ 40 % van het eindelement. Overal karkashoogte: de ronde kop komt van de capsule zelf;
  - losse rugkussens om de ±75 cm (met `draai` in een boog).
- **Omtrek in stukken** (`omtrekStukken`): achterhoeken, achterkant, zijkanten, voorhoeken, voorkant met de diepte per x (`diepteBij`). De hoeken worden kleiner als de achterkant naar voor schuift (anders plooit de omtrek: test op snijdende zijden in `doorlopend.test.ts`). Dubbele punten eruit (`zonderDubbel`).
- **Boog** (`buig`): R = W²/(8s) + s/2 en θ = (x − xc)/R; alle punten (omtrek, pad, kussens, opzet-elementen op de rij) gaan mee; `Blok.draai` (graden, x naar z) draait een blok rond zijn midden (weergave: `rotation.order = 'YXZ'`, `rotation.y = −draai`).
- **`Blok.glad`**: altijd als zachte vorm, ook bij *Blokken*. `toon()` groepeert de gladde stofdelen (onderbouw + rug = één vorm) en zet de andere gladde delen (zitkussen) apart, met de gladde stofdelen als buren voor de schaduw; `planZacht` rekent ze in de achtergrond, één per keer, tot dan de gewone vorm. Raster 2,5 cm bij meer dan 3 m³ of meer dan 4 m² grondvlak.
- **Schaduw van buren** (`zachteVorm`, `buren`): een buur met een vrije omtrek, gebogen wand of profiel telt met zijn echte vorm (`primitiefVan`), andere als afgeronde doos. Als doos rond zijn kader gaf een zitkussen met vrije omtrek grijze vlekken waar niets staat.
- **Vergelijken met de klant:** de productpagina's (bv. `https://www.corneille-silence.be/doha.html`) hebben grote foto's (`…_orig.jpg`, 1100 px); de foto's in `demo-web/fotos/` zijn maar 420 px. Haal ze in een eigen map in de scratchpad en lees ze met `python3 -I`.
- **Prijs, bovenaanzicht en vooraanzicht blijven per element** (test in `doorlopend.test.ts`). Een gedraaid element breekt de rij.

## Testen in de browser
- three.js zit in de bundel (geen CDN). Neem beelden met `canvas.toDataURL()`; *Mooi* (GTAO + VSM) is in swiftshader ±7 s per beeld, dus test met *Snel* of wacht 30–45 s. `window.__zetel3d.fotoRealistisch({ stappen: 6, breedte: 520 })` = snelle proef van de fotomodus.
- Start Chromium met `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` voor WebGL zonder GPU.
- Menu (3/11): `[data-weergave]` = modellen, ontwerp, offerte, sofa, kast, beheer (Beheer opent `#materialen` of `#catalogus`; tabbladen `[data-beheer="stoffen"]` en `[data-cat]`). De startopstellingen zitten ingeklapt in `#o-opnieuw` (eerst `open = true`) en vragen een tweede klik als er al een ontwerp is ("Klik nogmaals"). *Alles wissen* bestaat niet meer: dat is *Leeg tekenvlak*.

## Valkuilen
- Vergeet de rotatie niet: test elke nieuwe vorm bij 0, 90, 180 en 270.
- Vooraanzicht: achterste elementen eerst tekenen (sortering op voorrand), anders bedekken ze de voorste.
- Ronde elementen: poten en verdekte voet naar binnen zetten, anders steken ze buiten de ronding uit.
- Prijs en tekening los houden: de tekening leest `teken`, de prijs leest `prijs/prijsPerM/pct`.
- Alle maten en prijzen in de voorbeelden zijn demo-waarden (benadering op basis van foto's).
- Twee vlakken op exact dezelfde plaats geven vlekken en strepen (z-fighting). Voorbeeld: de buitenkant van de kuipwand en de zijkant van de onderbouw. Daarom ligt de onderbouw van een kuip 0,8 cm binnen de wand (`ruimtelijk.ts`, `krimp`). Doe hetzelfde bij elke nieuwe vorm die tegen een andere aanligt.
- Nieuwe meldingen die alleen voor de verkoper zijn (marge, kostprijs): `intern: true` op de melding; de demo verbergt ze in de klantweergave.
