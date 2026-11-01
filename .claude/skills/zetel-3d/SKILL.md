---
name: zetel-3d
description: Bouw, wijzig of debug de 3D-weergave (en boven-/vooraanzicht) van zetels in de configurator — elementen zoals zitelement, hoek, chaise, arm, kuipfauteuil, poef, afgerond eindelement, houten tussenstuk en opzet-elementen (rugleuning, kussens). Gebruik deze skill wanneer een nieuw elementtype, een nieuwe poot/arm/rugvorm of een nieuwe optie zichtbaar moet worden in 3D, wanneer iets in 3D verkeerd staat (draaiing, hoogte, kleur), of wanneer de three.js-weergave aangepast moet worden.
---

# Zetel-3D: hoe de 3D-logica werkt

De 3D zit in twee lagen. Houd ze gescheiden:

1. **Motor** (`packages/core/src/ruimtelijk.ts`): `bouw3D(ontwerp, catalogus, materialen)` zet een ontwerp om naar een lijst **blokken** (`Blok`). Geen 3D-bibliotheek, volledig testbaar met vitest.
2. **Weergave** (`packages/demo-web/src/drie-d.ts`): zet blokken om naar three.js-meshes (r128, globale `THREE` van cdnjs). Alleen presentatie: materialen, licht, camera.

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
- **Opzet-elementen** (`ElementType.opzet`: rugleuning, rugkussen, sierkussen, rolkussen) liggen op een **drager**: `dragerVan(ontwerp, catalogus, e)` (basiselement met de grootste overlap). Ze rusten op `zithoogte − kussendikte(drager)`, krijgen geen poten, mogen overlappen en nemen standaard het materiaal van de drager (`materiaalVan`).

## Opties zichtbaar maken
Opties komen uit de catalogus (`OptieGroep` → `OptieKeuze`). De tekening leest **alleen `keuze.teken`**:
- `poten.teken.vorm`: conisch, blok, cilinder, slede, haarspeld, plint, verdekt, draaivoet, housse; `metaal: true` (+ `kleur`).
- `hout.teken.kleur`, `metaal.teken.kleur`, `zithoogte/poothoogte/rughoogte/armhoogte.teken.hoogte`.
- `armstijl.teken.vorm`: strak, rond, engels, schuin, houtblad, hout. `rug.teken`: `los`, `capitonne`. `naad.teken`: `bies`, `contrast`, `stiksel`.
- `kuipvorm`, `poefvorm`, `ronde_kant`, `console_uitvoering`, `functie`: `teken.vorm` of `teken.kant`.
Lees opties via `gekozenOpties(ontwerp, catalogus, e)` en `te(groep, veld, standaard)`. Een nieuwe optie die alleen de prijs beïnvloedt, heeft geen tekencode nodig.

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
- Kleuren zijn sRGB-hex → `new THREE.Color(hex).convertSRGBToLinear()`; `renderer.outputEncoding = sRGBEncoding`, ACES-tonemapping, belichting ≈ 0,88.
- Stof krijgt een fijne weefseltextuur (canvas) die met de kleur vermenigvuldigd wordt; hout ruwheid 0,55; metaal metalness 0,85.
- Bouwmaterialen (ook gebruikt door de bouwdemo): `steen` (baksteen), `planken`, `tegel` (60 × 60), `parket`, `kunststof`, `glas`, `matglas`. Textuur in wereldmaat (cm) via `wereldUV`, zodat stenen en tegels hun echte maat houden.
- `zijden` op een blok geeft één zijvlak een ander materiaal (bv. baksteen buiten, verf binnen); `plaatsBlokken` (ruimtelijk.ts) draait blokken per 90° en draait `zijden` en `kantel` mee.
- Schaduwen via één `DirectionalLight` waarvan het schaduwkader meeschaalt met de zetel. Camera: eigen orbit (slepen, scrollen, knijpen) en vaste standpunten.

## Testen in de browser
- three.js komt van cdnjs; in de cloudomgeving kan dat geblokkeerd zijn. Gebruik de lokale kopie (`three@0.128.0` devDependency) met Playwright: `page.route('https://cdnjs.cloudflare.com/**', …)` → `node_modules/three/build/three.min.js`.
- Start Chromium met `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` voor WebGL zonder GPU.

## Valkuilen
- Vergeet de rotatie niet: test elke nieuwe vorm bij 0, 90, 180 en 270.
- Vooraanzicht: achterste elementen eerst tekenen (sortering op voorrand), anders bedekken ze de voorste.
- Ronde elementen: poten en verdekte voet naar binnen zetten, anders steken ze buiten de ronding uit.
- Prijs en tekening los houden: de tekening leest `teken`, de prijs leest `prijs/prijsPerM/pct`.
- Alle maten en prijzen in de voorbeelden zijn demo-waarden (benadering op basis van foto's).
