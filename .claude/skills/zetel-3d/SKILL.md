---
name: zetel-3d
description: Bouw, wijzig of debug de 3D-weergave (en boven-/vooraanzicht) van zetels in de configurator — elementen zoals zitelement, hoek, chaise, arm, kuipfauteuil, poef, afgerond eindelement, houten tussenstuk en opzet-elementen (rugleuning, kussens). Gebruik deze skill wanneer een nieuw elementtype, een nieuwe poot/arm/rugvorm of een nieuwe optie zichtbaar moet worden in 3D, wanneer iets in 3D verkeerd staat (draaiing, hoogte, kleur), of wanneer de three.js-weergave aangepast moet worden.
---

# Zetel-3D: hoe de 3D-logica werkt

De 3D zit in twee lagen. Houd ze gescheiden:

1. **Motor** (`packages/core/src/ruimtelijk.ts`): `bouw3D(ontwerp, catalogus, materialen)` zet een ontwerp om naar een lijst **blokken** (`Blok`). Geen 3D-bibliotheek, volledig testbaar met vitest.
2. **Weergave** (`packages/demo-web/src/drie-d.ts`): zet blokken om naar three.js-meshes (three 0.187 uit npm, gebundeld; `const THREE: any = THREE_`, typen losjes via `three.d.ts`). Alleen presentatie: materialen, licht, camera, nabewerking, fotomodus.

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
- Basis: van `P` tot `zithoogte − kussendikte`; zitkussen daarbovenop. Rug: van `P` tot `rughoogte` (optie `rughoogte`; bij losse rugkussens is de frame-rug 10 cm lager).
- **Opzet-elementen** (`ElementType.opzet`: rugleuning, rugkussen, sierkussen, rolkussen) liggen op een **drager**: `dragerVan(ontwerp, catalogus, e)` = de zitting (`DRAGER_STIJLEN`: zit, hoek, chaise, zit_zonder_rug, rond, kuip, poef; niet arm of console) met de grootste overlap, en alleen als het opzet-element **voor minstens 60 % op zittingen** ligt (anders melding `opzet.los` en in 3D op de vloer). Waarop het rust: **`draagHoogteVan`** (zithoogte − kussendikte van de drager, bij een poef zithoogte − 2). Bovenkant van een losse rugleuning: **`rugleuningTop`** = max(rughoogte, draaghoogte + 20). Vooraanzicht, 3D, prijs en het hoogteveld in de ontwerper gebruiken deze twee; nooit zelf herberekenen. Krijgen geen poten, mogen overlappen (behalve twee dezelfde op elkaar: `opzet.op_elkaar`) en nemen standaard het materiaal van de drager (`materiaalVan`).

## Opties zichtbaar maken
Opties komen uit de catalogus (`OptieGroep` → `OptieKeuze`). De tekening leest **alleen `keuze.teken`**:
- `poten.teken.vorm`: conisch, blok, cilinder, slede, haarspeld, plint, verdekt, draaivoet, housse; `metaal: true` (+ `kleur`).
- `hout.teken.kleur`, `metaal.teken.kleur`, `zithoogte/poothoogte/rughoogte/armhoogte.teken.hoogte`.
- `armstijl.teken.vorm`: strak, rond, engels, schuin, houtblad, hout. `rug.teken`: `los`, `capitonne`. `naad.teken`: `bies`, `contrast`, `stiksel`.
- `kuipvorm`, `poefvorm`, `ronde_kant`, `console_uitvoering`, `functie`: `teken.vorm` of `teken.kant`.
- `chaise_rug.teken.kant`: achter (**standaard**: de rug loopt door achter de chaise), geen (open uiteinde, minprijs), links/rechts (méridienne). Lees met `chaiseRugVan(opties)`; null = geen rug.
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
- Bouwmaterialen (ook gebruikt door de bouwdemo): `steen` (baksteen), `planken`, `tegel` (60 × 60), `parket`, `kunststof`, `glas`, `matglas`. Textuur in wereldmaat (cm) via `wereldUV`, zodat stenen en tegels hun echte maat houden.
- `zijden` op een blok geeft één zijvlak een ander materiaal (bv. baksteen buiten, verf binnen); `plaatsBlokken` (ruimtelijk.ts) draait blokken per 90° en draait `zijden` en `kantel` mee.
- **Realisme (3/11):** `scene.environment` = studio-omgevingsbeeld (eigen kamer met softboxen via `PMREMGenerator`, `OMGEVING` = envMapIntensity). Stof met weefsel: `stofMateriaal()` (bumpMap = `weefselCanvas` in grijs, `RELIEF` per weefsel; velours `MeshPhysicalMaterial` met `sheen`, leder met `clearcoat`). Blokken `kussen` (en bij `zetel: true` ook `stof`) met `afronding` → `kussenGeometrie()`: fijn opgedeeld, bol langs de dunste as, analytische normalen, hoekpuntkleuren als schaduw onderaan. `Blok.naad` (uit optie `naad`, gezet in `ruimtelijk.ts`) → `naden()`: buizen rond de twee grote vlakken (bies, naad, sierstiksel) als kinderen van de kussenmesh. Bij opruimen: `traverse` voor `geometry.dispose()`.
- `maak3D(houder, { zetel: true })` (alleen ontwerper): contactschaduw, mist in de achtergrondkleur, houtnerf, buren-schaduw op kussens (`burenVan`), en de instellingen `decor()` / `licht()` / `kwaliteit()` / `foto()` met presets `DECORS` en `LICHTEN` (gegevens; `zetDecor` en `zetLicht` passen ze toe). UI in `ontwerper.ts` (`start3DInstellingen`), groot scherm via `grootSchermKnop($('#o-tekenvlak'))`.
- Schaduwen via één `DirectionalLight` waarvan het schaduwkader meeschaalt met de zetel. Camera: eigen orbit (slepen, scrollen, knijpen) en vaste standpunten.

## Testen in de browser
- three.js zit in de bundel (geen CDN). Neem beelden met `canvas.toDataURL()`; *Mooi* (GTAO + VSM) is in swiftshader ±7 s per beeld, dus test met *Snel* of wacht 30–45 s. `window.__zetel3d.fotoRealistisch({ stappen: 6, breedte: 520 })` = snelle proef van de fotomodus.
- Start Chromium met `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` voor WebGL zonder GPU.

## Valkuilen
- Vergeet de rotatie niet: test elke nieuwe vorm bij 0, 90, 180 en 270.
- Vooraanzicht: achterste elementen eerst tekenen (sortering op voorrand), anders bedekken ze de voorste.
- Ronde elementen: poten en verdekte voet naar binnen zetten, anders steken ze buiten de ronding uit.
- Prijs en tekening los houden: de tekening leest `teken`, de prijs leest `prijs/prijsPerM/pct`.
- Alle maten en prijzen in de voorbeelden zijn demo-waarden (benadering op basis van foto's).
- Twee vlakken op exact dezelfde plaats geven vlekken en strepen (z-fighting). Voorbeeld: de buitenkant van de kuipwand en de zijkant van de onderbouw. Daarom ligt de onderbouw van een kuip 0,8 cm binnen de wand (`ruimtelijk.ts`, `krimp`). Doe hetzelfde bij elke nieuwe vorm die tegen een andere aanligt.
- Nieuwe meldingen die alleen voor de verkoper zijn (marge, kostprijs): `intern: true` op de melding; de demo verbergt ze in de klantweergave.
