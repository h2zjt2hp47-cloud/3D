# 3D-technieken: wat werkt waarvoor (kennisbank)

*Stand 11/11/2026.* **De werkwijze zelf (zes vaste stappen, bouwstijlen, gereedschap) staat in `docs/werkwijze-3d.md`.**
Dit document is de naslag erbij: wat we bij de zetels leerden over 3D, en hoe je het hergebruikt: voor een nieuw zetelmodel, een ander
meubel of de ramen en deuren van de bouwdemo. De uitwerking per onderwerp staat in de notities onderaan.

## De technieken op een rij

| Techniek | Wat het doet | Goed voor | Niet voor | Rekentijd |
|---|---|---|---|---|
| **Blokken** | Elk onderdeel apart: afgeronde balken, cilinders, kegels, een vrije omtrek of een gebogen wand. | Een snelle eerste indruk; alles wat recht en eenvoudig is (poten, houten delen, kasten, de huidige ramen). | Vormen die "uit één stuk" moeten lijken. | Meteen |
| **Eigen doorsnede** (profiel) | Eén doorsnede in 2D die langs een lijn loopt. Dezelfde doorsnede tekent ook het vooraanzicht. | Een vorm die per stijl terugkomt: de strakke en de uitlopende arm. Later ook raamprofielen. | Vrije, organische vormen. | ±40 ms per arm, daarna onthouden |
| **Zachte vormen** | De delen smelten samen tot één vorm, met een afronding in de hoeken en schaduw in de plooien. | Gestoffeerde, ronde vormen: zetels. | Harde, precieze producten met details van millimeters (ramen, deuren, kasten). | 0,2 à 0,7 s per zetel, 20.000 à 110.000 driehoeken; in de achtergrond |
| **Doorlopende opbouw** | Een rij elementen wordt in 3D één product. Prijs en tekeningen blijven per element. | Modulaire zetels die als één geheel ogen (Doha, Montego). | Hoeksofa's (nog niet uitgewerkt). | Zoals de zachte vormen |
| **Boog** | De hele vorm buigt in een boog; wat erop staat (kussens) draait mee. | Gebogen sofa's (Montego); later rondboogramen. | – | Meteen |
| **Genaaid kussen** (sinds 11/11) | Een kussen krijgt de vorm die het door naaien en vullen heeft. Een zitkussen ligt plat op de onderbouw, heeft scherpe hoeken in het grondvlak en rolt alleen bovenaan zacht om. Een los kussen (sierkussen, donzen rugkussen) is dun aan de naad, dik in het midden, met licht holle zijden. | Alle zit-, rug- en sierkussens; ook de vaste zitting (grote rol vooraan bij een zachte vormgeving). | Vormen zonder naden (schalen, houten delen). | Meteen |
| **Echt 3D-bestand** | Een afgewerkt model uit een 3D-programma of van de fabrikant (GLB), met onze stoffen en afwerking. De configurator kijkt of het bestand bij de gekozen maten past. | Vaste onderdelen (krukken, scharnieren) of topmodellen met een eigen bestand. | Producten op maat: een bestand kun je uitrekken, niet omvormen. | Laden bij het openen |
| **Weergave** | Licht en reflecties uit een omgevingsbeeld, schaduw in de hoeken, zachte slagschaduwen, echte kamers als decor, een fotomodus die licht natuurgetrouw narekent. | Beide demo's: de bouwdemo gebruikt dezelfde 3D-weergave. | – | Fotomodus ±1 min |
| **Snelheid** | Zware vormen in de achtergrond rekenen (één per keer, tot dan de eenvoudige vorm) en onthouden; tabellen per cm in het grondvlak voor lange vormen. | Alles wat zwaar rekent. | – | 2 à 3 × sneller |

Waar in de code: blokken in `packages/core/src/ruimtelijk.ts` (zetels) en `packages/core/voorbeelden/raam3d.ts`
(ramen), de doorsnedes `strakProfiel` en `uitlopendProfiel` in `ruimtelijk.ts`, de zachte vormen in
`packages/core/src/zachtevorm.ts`, de doorlopende opbouw en de boog in `packages/core/src/doorlopend.ts`, echte
3D-bestanden in `packages/core/src/echt3d.ts`, de weefselkaarten (normal map en ruwheid, proef 4/11) in `packages/core/src/weefselkaart.ts` en
`packages/demo-web/src/weefsel.ts`, de weergave in `packages/demo-web/src/drie-d.ts` en de decors in
`decor3d.ts`.

## WebGPU (sinds 4/11)

De 3D draait op de WebGPU-renderer van three.js: op WebGPU waar de browser het heeft (Safari 26 of nieuwer op de Mac in
de toonzaal, Chrome), anders automatisch op WebGL2, met hetzelfde beeld. De fotomodus rekent met WebGPU op de
WebGPU-path tracer met ontruiser, anders zoals vroeger. Nieuwe effecten maken we in TSL (de taal van three.js voor
WebGPU), niet meer met eigen WebGL-shaders. Sinds 11/11 zijn in de cloud beide wegen te testen (zie *Testen in de cloud*
hieronder): WebGL2 én WebGPU, zonder grafische kaart.

## Wat we leerden

1. **Echtheid komt van één eigen vorm per type.** Samensmelten alleen gaf weinig winst. Het verschil kwam van een eigen
   doorsnede per armstijl, die dan geldt voor alle modellen met die stijl (de strakke arm: 16 van de 21 modellen met
   armen). Voor ramen is dat een eigen doorsnede per profielsysteem.
2. **Eerst de opbouw, dan de details.** Doha en Montego leken identiek omdat de opbouw niet klopte (losse elementen
   naast elkaar), niet door een detail. Beschrijf eerst in woorden hoe het product is opgebouwd:
   - welke banden of lagen er zijn;
   - waar de rug staat en waar hij stopt;
   - wat eronder doorloopt;
   - wat één stuk is.
3. **Vergelijk met de grote foto's.** De foto's in de demo zijn 420 px breed. De productpagina's hebben foto's van
   1100 px, vaak vanuit meerdere standpunten. Pas daarop zagen we de twee banden van Doha en de kortere rug van Montego.
   Lees ook de maten op de productpagina (bij Doha: armhoogte 65 cm, armbreedte 20 cm).
4. **Een vergelijkingsbeeld per ronde**: foto · vorige versie · nu, in hetzelfde standpunt. Zo ziet iedereen wat
   verbeterd is en wat nog verschilt.
5. **Benaderingen markeren.** Alles wat uit een foto komt (diepte van het loungedeel, dikte van de zitting, de boog,
   hoe ver de rug omloopt) is een benadering tot de klant het bevestigt. Modellen van de klant niet verzinnen.
6. **Een 3D-keuze kan prijs en offerte raken.** Bij Montego veranderde de opbouw (vaste zitting, rug alleen op het
   rechte deel) ook de prijs en de offertetekst. Zeg dat er altijd bij.
7. **3D en tekeningen kunnen uit elkaar lopen.** De doorlopende zetel is in 3D één geheel, in het boven- en vooraanzicht
   nog losse elementen. Vermeld dat, of trek het gelijk.
8. **Meten op het echte toestel.** Rekentijd op een tablet is waarschijnlijk 2 à 3 keer langer dan op de server.
   Zwaar werk hoort in de achtergrond, met eerst een eenvoudige vorm.
9. **Een echt 3D-bestand is geen vervanging voor maatwerk.** Het past bij een vast model of een vast onderdeel. Voor
   een zetel of raam op maat moet de configurator de vorm zelf maken.

## Zo maken 3D-tekenaars een zetel, en wat wij ervan overnemen (11/11)

Vraag van Jonas (11/11): "Kunnen we de technieken niet overnemen die Sketchfab gebruikt om zetels te maken in 3D, of onze
manier hiermee verbeteren? De zetels van Corneille blijven wel het doel." Met links naar de zetels op Sketchfab, Free3D
en CGTrader.

> **Eerlijk vooraf.** De drie pagina's zelf konden we niet openen: die sites staan niet in de toegelaten adressen van de
> cloudomgeving. Wat hier staat is algemene vakkennis over hoe zulke modellen gemaakt worden, niet afgelezen van die
> pagina's. De licentie van één bepaald model is dus niet nagekeken.

**Wat die sites zijn.** Marktplaatsen waar 3D-tekenaars afgewerkte modellen aanbieden. Zo'n model is handwerk: één
zetel, in één maat en één opstelling. Het is geen techniek die je inschakelt, maar het resultaat van een werkwijze. Die
werkwijze kunnen we wel overnemen.

| Stap van de 3D-tekenaar | Wat het oplevert | Bij ons |
|---|---|---|
| **1. Grote vlakken, daarna verfijnen** (subdivision) | Zachte vormen zonder knikken | Hadden we al: afgeronde blokken, eigen doorsnedes, zachte vormen |
| **2. Kussens "naaien en vullen"** (stofsimulatie: lappen aan elkaar zetten en opblazen) | De echte kussenvorm: plat waar het kussen rust, bol in het midden, dun aan de naad, puntige hoeken | **Overgenomen op 11/11** als rekenregel (zie hieronder). Wij simuleren niet, we rekenen de vorm uit de maten: zo blijft elke maat mogelijk |
| **3. Plooien en kreuken boetseren** | Leven: geen enkel kussen is perfect glad | Deels: de vulling is licht onregelmatig (alleen in de schaduwwerking). Echte plooien nog niet |
| **4. Naden, biezen en stiksels** | Het verschil tussen "blok" en "gestoffeerd" | Hadden we al; ze volgen nu de nieuwe kussenvorm. Een vaste zitting en (met bies of stiksel) een vaste rug krijgen nu ook een naad |
| **5. Details "bakken" in kaarten** (reliëf, schaduw in de kieren) | Een licht model dat er toch gedetailleerd uitziet | Hadden we al: weefselkaarten per stof; schaduw in kieren rekenen we live |
| **6. Materialen** (kleur, ruwheid, reliëf, glans van de vezels) | Stof die als stof oogt | Hadden we al |
| **7. Kleine onregelmatigheid** (sierkussens nooit kaarsrecht) | Minder "computerbeeld" | **Overgenomen op 11/11**: elk sierkussen staat een paar graden gedraaid |
| **8. Belichting en achtergrond** (studiolicht, achterdoek) | Leesbare vormen, ook bij een witte zetel | Licht geijkt op 11/11; nieuw decor *Fotodoek (grijs)* zoals op de productfoto's |
| **9. Een echte zetel inscannen** | Een exacte kopie van één exemplaar | Niet: vast model, zwaar bestand. Wel bruikbaar als "echt 3D-bestand" voor een topmodel (zie `docs/echte-3d-modellen.md`) |

**Waarom we hun modellen zelf niet inladen.**
1. Het zijn geen zetels van Corneille & Silence. Het doel blijft hun collectie.
2. Een afgewerkt model is vast. Je kunt het uitrekken, niet omvormen: een arm van 15 cm wordt bij uitrekken een arm van 20 cm
   met uitgerekte naden. Onze zetels moeten per cm en per element kunnen.
3. Elk model heeft zijn eigen licentie (vaak alleen voor eigen gebruik, of met naamsvermelding). Dat moet per model
   nagekeken worden voor het in een product komt.
4. Zulke modellen zijn zwaar (honderdduizenden driehoeken, grote texturen) voor een tablet in de toonzaal.

**Wat op 11/11 in de motor kwam** (`packages/demo-web/src/drie-d.ts`, `kussenGeometrie`; opbouw in `packages/core/src/ruimtelijk.ts`):
- **Zitkussen:** kleine afronding onderaan en in de hoeken van het grondvlak, grote afronding bovenaan (veld
  `afrondingOnder` op het blok). Tot dan overal dezelfde grote afronding: een zeepvorm die bij elke zetel hetzelfde oogde.
- **Los kussen met mesrand** (veld `mesrand`): sierkussens en donzen rugkussens. Een sierkussen heeft een dunne rand, een
  groot rugkussen een dikke, ronde rand. Gewone losse rugkussens houden een band (rechte zijkant).
- **Onderbouw in de stof zelf**, met het weefsel. Tot dan 18 % donkerder en vlak: elke zetel had een grijze band onder
  de kussens.
- **Vaste zitting:** bovenaan afgerond volgens de zachtheid; vanaf zachtheid 6 rolt de voorkant in een grote boog naar
  beneden (Amusette).
- **Naden** lopen over het kussen zelf en zijn subtieler; een bies in dezelfde stof is iets donkerder dan de stof (ze werd
  anders een witte lijn).

**Volgende stappen in dezelfde lijn** (nog niet gebouwd):
- plooien en kreuken als kaart over het weefsel (vraagt een eigen materiaal in TSL; eerst testen op de M5);
- de hoes tot op de grond met plooien op de hoeken (Husk, Wallace, Esmee);
- voor topmodellen een echt 3D-bestand van de fabrikant. De sfeerbeelden op de website lijken computerbeelden: dan
  bestaan die bestanden waarschijnlijk al. Vraag aan Corneille & Silence wie ze maakte.

## Gratis hulpmiddelen (advies en proeven van 5/11)

Voorwaarden: alles in één HTML-bestand, niets van internet laden, alleen materialen die we zelf maken (procedureel of
uit de foto's van de productsite), gratis HDRI's mogen (CC0, met bronvermelding).

**In de configurator zelf** (zit in three.js 0.187, MIT):

| Hulpmiddel | Wat het doet | Uitslag |
|---|---|---|
| **SSS** (fijne contactschaduw op het scherm) | Kleine schaduwen van de zon waar de schaduwkaart te grof is. | Getest 5/11, **niet opgenomen**: ook op volle sterkte alleen dunne randjes; de zonneschaduw dekt die plekken al. Kost een extra tekenronde van de hele scène. |
| **TRAA** (randverzachting over meerdere beelden) | Bouwt het beeld op over 8 à 16 schermbeelden. | Getest 5/11, **niet opgenomen**: even goed als de huidige randverzachting (MSAA 4×), iets zachter; het weefsel wordt een fractie waziger. Helpt niet tijdens het draaien (dan tekenen we het snelle beeld). |
| **SSGI** (weerkaatsend licht) | Kleur die van het ene vlak op het andere straalt. | Nog niet getest. Zwaar: alleen bij *Mooi* en op WebGPU, eerst op de M5. Met mist (die wij gebruiken) meldt het forum een te donkere vloer. |
| **SSR** (spiegelingen) | Spiegeling in een glanzende vloer, glas, metaal. | Weinig nut bij stof; wel later voor ramen en deuren. |
| **Inspector** | Meetvenster: beelden per seconde, geheugen, tussenbeelden. | Om op de M5 te meten. |

Beeld van de proef: `docs/afbeeldingen/proef-sss-traa.jpg`.

![Proef SSS en TRAA (5/11)](afbeeldingen/proef-sss-traa.jpg)

**Buiten de app** (het resultaat gaat als afbeelding mee in de pagina):
- **Material Maker 1.8** (MIT, Windows, Mac, Linux): naadloze stoffen bouwen (bouclé, velours, linnen, rib) met kleur,
  reliëf en glans, met blokjes die je verbindt, zonder code. Past bij de regel "procedureel, zelf gemaakt". Voorrang 1.
- **DeepBump** (Blender-uitbreiding, GPL-3): een echte reliëfkaart uit de stoffoto van de productsite, in plaats van de
  foto zelf als reliëf (dat geeft nep-reliëf uit de schaduw in de foto). De licentie geldt voor het hulpmiddel, niet
  voor de kaarten die het maakt.
- **Real-ESRGAN** (BSD-3): kleine foto's vergroten. Verzint fijn detail en is niet vanzelf naadloos: lage voorrang,
  altijd als benadering markeren.
- **Poly Haven** (CC0): extra HDRI's voor lichtsferen. Hun stoffen en modellen zijn scans: valt buiten de regel.

**Kwaliteitscontrole:** de beeldvergelijking `npm run beelden` (Playwright, pixelmatch, pngjs), sinds 5/11. Zie
[Beeldvergelijking](../beeldtest/LEESMIJ.md).

## Werkwijze voor een nieuw model of product

1. **Bronnen:** de grote foto's en de maten van de productpagina. Voor de bouw: doorsnedes en gegevens van de
   systeemleverancier.
2. **Opbouw in woorden** (zie les 2).
3. **Per onderdeel een techniek** kiezen uit de tabel hierboven.
4. **In de motor bouwen**, met tests:
   - de vorm is dicht en de schaduw klopt;
   - de maten van de opbouw kloppen;
   - prijs en tekening veranderen niet ongewild.
5. **3D-beelden** nemen in hetzelfde standpunt als de foto, en het vergelijkingsbeeld maken. Daarna
   `npm run beelden`: de vaste reeks beelden tegenover de vorige versie (zie [Beeldvergelijking](../beeldtest/LEESMIJ.md)).
   Wat verandert moet bewust zijn; dan `npm run beelden -- --vernieuw`.
6. **Benaderingen markeren**; prijs en offertetekst nakijken.
7. **Documenteren** (overdracht, uitleg, skill), publiceren en het doorstuurpakket vernieuwen.

## Toepassen op ramen en deuren (advies van 4/11, nog niet gebouwd)

**Hoe het nu is** (`raam3d.ts`):
- **Kader en vleugels:** rechthoekige balken van 7 cm diep; in de hoeken schuiven ze over elkaar.
- **Glas en afstandhouder:** het glas is een plaat van 1 cm, de afstandhouder een smalle rand eromheen.
- **Beslag:** een kruk is een balkje, een trekbeugel een cilinder met twee blokjes.
- **Zonwering en afwerking:** de zonwering is een kast met geleiders en lamellen of doek. Vensterbank en dorpel zijn
  ook balken.
- **Weergave:** de 3D-weergave is dezelfde als bij de zetels.

**De zachte vormen zelf passen niet:**
- **Ander soort product:** een zetel is stof die over hoeken spant. Een raam is een hard, recht profiel in aluminium,
  kunststof of hout, met details van enkele millimeter (sponning, glaslat, dichting). Wat een raam echt doet lijken,
  zijn net de strakke randen en de zichtbare naden in de hoeken, die de zachte vormen juist wegwerken.
- **Te grof:** de zachte vormen rekenen op een raster van 2 cm, waarin alle details van een profiel verdwijnen. Een
  fijner raster is veel te traag.
- **Te zwaar:** een woning met 20 ramen zou twintig keer de rekentijd van een zetel vragen, voor niets.

**Wat wel past, in volgorde van winst:**
1. **Een eigen doorsnede per profielsysteem**, zoals de armstijlen bij de zetels.
   - **Het echte profiel:** kader met sponning, vleugel, glaslat, dorpel. In de hoeken in verstek (aluminium,
     kunststof) of stomp (hout).
   - **Andere manier van tekenen:** het profiel wordt langs het kader getrokken. Dat is exact, licht en meteen klaar;
     het is niet dezelfde techniek als de zachte vormen.
   - **Ook een tekening:** dezelfde doorsnede geeft een technische doorsnedetekening voor de offerte of het
     werfdossier.
   - **Bogen:** rondboog- en segmentboogramen worden mogelijk, met hetzelfde profiel langs een boog (zoals de boog bij
     Montego).
   - **Bron:** de doorsnedes komen van de systeemleverancier (Reynaers, Schüco, Aliplast, Deceuninck … leveren ze als
     DXF), niet verzonnen. Voor een demo kan een benadering, als benadering gemarkeerd.
   - **Zelfde maten:** dezelfde maten als de rekenregels in `raam.ts` (dagmaat, glasmaat, aftrekken), zodat 3D en
     berekening kloppen.
2. **Echte 3D-bestanden voor vaste onderdelen:** krukken, trekbeugels, scharnieren, brievenbussen, ventilatieroosters.
   - Die hebben een vaste maat, dus een bestand past perfect.
   - Vooral bij voordeuren loont het: die worden op uitzicht gekocht.
   - Fabrikanten bieden 3D-modellen aan; de licentie per bestand nakijken.
3. **De weergave hebben we al:** licht, reflecties en de fotomodus. Sinds de proef met glas (4/11) laat het glas het
   licht door en spiegelt het volledig (vroeger half doorzichtig, met maar ±28 % van de spiegeling), ook in de fotomodus.
4. **Kleine afrondingen** (de ronde randen van kunststofprofielen) gaan in de doorsnede zelf, niet via zachte vormen.

**Wat we van een leverancier of klant nodig hebben:**
- **Doorsnedes** (DXF) per systeem: kader, vleugel, tussenstijl, glaslat, dorpel, koppelprofiel;
- **Maten:** de aanzichtbreedtes en de bouwdiepte;
- **Kleuren en afwerking:** RAL, structuur, anodisatie;
- **Beslag:** 3D-bestanden of goede foto's van krukken en trekbeugels.

**Mogelijke eerste stap:** één systeem met een benaderde doorsnede, verstek in de hoeken en een doorsnedetekening, en
één echte kruk of trekbeugel.

## Technische valkuilen (voor wie verder bouwt)

- **Omgevingslicht: één instelling (opgeruimd 11/11).** Met `WebGPURenderer` telt `material.envMapIntensity` niet
  voor het omgevingsbeeld van de scène; three.js leest `scene.environmentIntensity`. De sterkte per lichtsfeer had
  daardoor sinds 4/11 geen effect: het omgevingslicht stond altijd op volle sterkte en bovenkanten waren te fel. Nu is
  `LICHTEN[..].omgeving` die echte sterkte (1 = vol) en is `envMapIntensity` overal weg (geen pixel verschil in de
  beeldvergelijking: het had dus echt geen effect). De ijking staat per weergave in `ZETEL_LICHT` en `BOUW_LICHT`.
  Les: een instelling die je niet meet, kan stuk zijn zonder dat iemand het merkt. `npm run lichtmeting`.
- **Een omtrek mag niet plooien.** Schuift een kant naar binnen, maak de hoeken dan kleiner. De test op snijdende
  zijden staat in `doorlopend.test.ts`.
- **Een wand die oploopt of zakt:** de helling moet meetellen in de richting van het oppervlak, anders kloppen de
  schaduwen niet. Test de richtingen tegen kleine stapjes in het veld (`zachtevorm.test.ts`).
- **Schaduw van buurdelen met hun echte vorm.** Een zitkussen met een vrije omtrek dat als rechthoekige doos meetelde,
  gaf grijze vlekken waar niets staat.
- **Elke schaduw volgt de echte vorm, niet het kader.** De contactschaduw onder de zetel tekende per onderdeel een
  rechthoek: een ronde poef kreeg een vierkante schaduw, en bij Doha stak de schaduw rechthoekig uit voorbij de ronde
  uiteinden. Ook de verdekte voet (donker, onder het meubel) was altijd vierkant en stak onder een ronde fauteuil uit:
  dat leek een harde, vierkante schaduw. Sinds 5/11 volgen beide de vorm (omtrek, rond, gedraaid, gebogen wand, arm).
- **Delen binnen elkaars omtrek houden.** Een rug die buiten de onderbouw uitstak, gaf vinnen en strepen.
- **Snelheid meten:** met een gebundeld script in node; de eerste keer met `tsx` geeft een veel te hoge tijd.
- **Twee vlakken op exact dezelfde plaats** geven vlekken (z-fighting): laat het ene deel net binnen het andere liggen.
- **Eenheden:** de voorbeelden van three.js rekenen in meter, onze scène in cm. Een afstand of dikte uit een voorbeeld
  (bv. 0,1 voor de fijne contactschaduw) doet bij ons niets: maal 100.
- **Nabewerking in de scène loopt één beeld achter.** Een effect dat via `builtinShadowContext` of `builtinAOContext`
  in de scène zelf werkt, werd op de WebGL2-weg pas berekend nadat de scène getekend was: spookranden van het vorige
  standpunt. Eerst apart berekenen (een kleine pijplijn naar een doel van 4 × 4 pixels), dan de scène tekenen.
- **Effecten die over meerdere beelden opbouwen** (TRAA, tijdsfilters) passen slecht bij een weergave die alleen
  tekent als er iets verandert: ze vragen 8 à 16 schermbeelden na elke wijziging, en een foto voor de offerte ook. Ze
  rekenen hun geschiedenis maar één keer per schermbeeld bij, dus snel na elkaar tekenen helpt niet.
- **Een gebogen wand die oploopt:** op de knikpunten van het pad moet de helling meetellen (gemiddelde van de stukken
  ernaast), anders lichte vlekjes om de 2 cm. Hou de stijging ook niet te steil, en laat een wand niet eindigen op
  exact de hoogte van een ander vlak (flikkeren): liever een paar cm erin. Verdeel de punten op gelijke afstanden en
  laat de hoogte de afstand volgen, niet de hoek: bij een afgeronde rechthoek golfde de bovenkant anders.
- **Geen Math.random in texturen:** dan ziet het parket er bij elke keer laden anders uit, en kan de beeldvergelijking
  niets vergelijken. Gebruik `vasteReeks(sleutel)` in `drie-d.ts`.
- **Meer:** de skills `zetel-3d` (`.claude/skills/zetel-3d/SKILL.md`) en `bouw-woning`
  (`.claude/skills/bouw-woning/SKILL.md`).

## Meer lezen

- [Zachte vormen](zachte-vormen.md): zelf zetels opmaken in 3D, de eigen armvormen en de doorlopende zetel.
- [Echte 3D-modellen](echte-3d-modellen.md): de proef met een echt 3D-bestand, en wat we van de klant nodig hebben.
- [Overdracht](overdracht.md): de stand van zaken per ronde.
- [Onderzoek raamsoftware](onderzoek-raamsoftware.md): hoe LogiKal, ReynaPro en Chacal met profielen en tekeningen
  werken.
- [Onderzoek bouw](onderzoek-bouw-ramen-deuren.md): de pijnpunten bij ramen en deuren.

## Testen in de cloud: drie rekenwegen (11/11)

De cloud heeft geen grafische kaart. Toch zijn er drie manieren om de 3D te laten rekenen; `scripts/3d/werkbank.mjs`
kiest ze met `--weg`.

| Weg | Hoe | Gemeten (Kotor, 900 px, kwaliteit Mooi) | Waarvoor |
|---|---|---|---|
| `snel` | Volledige Chromium op een virtueel scherm (Xvfb) met `--use-gl=angle --use-angle=gl`: Mesa llvmpipe | 56 ms per beeld | Dagelijks: beelden, controleblad, lichtmeting |
| `webgl2` | Headless Chromium met swiftshader (`--use-angle=swiftshader --enable-unsafe-swiftshader`) | 189 ms per beeld | `npm run beelden` (de referentiebeelden) |
| `webgpu` | Volledige Chromium op Xvfb met `--enable-unsafe-webgpu --enable-features=Vulkan --use-webgpu-adapter=swiftshader` | zie `npm run toestelcontrole` | De weg van de M5 nagaan |

- **WebGPU in de cloud werkt alleen met de volledige browser op een virtueel scherm.** In de headless-schil krijgt de
  pagina wel een adapter, maar het toestel valt weg bij het eerste beeld ("Device Lost: A valid external Instance
  reference no longer exists").
- **WebGL2 en WebGPU geven hetzelfde beeld:** 0,02 tot 0,5 % van de pixels verschilt (randen, korrel van de zachte
  schaduw). Een groter verschil is een fout in één van de twee wegen. `npm run toestelcontrole` gaat dat na.
- **Wat de cloud niet zegt:** hoe snel de M5 is en hoe het op zijn scherm oogt. Daarvoor de knop *Toestelcontrole* op
  de werkbankpagina.
- **Zonder grafische kaart is *Snel* trager dan *Mooi*** (153 tegenover 56 ms): rechtstreeks naar het canvas tekenen
  kost in software meer dan via de nabewerking. Gebruik in het gereedschap dus *Mooi*.

## Wachten tot een beeld af is (11/11)

Een beeld is niet af op het moment dat `toon()` terugkeert: stoffoto's laden, zachte vormen worden op de achtergrond
berekend, het decor wordt 120 ms later gebouwd, shaders van nieuwe delen worden op de achtergrond gemaakt en de schaduw
wordt daarna nog twee keer bijgewerkt. Vroeger wachtte het gereedschap daarom met vaste pauzes en vergeleek het twee
opeenvolgende beelden: traag (35 s per model onder belasting) en toch niet zeker. Nu houdt de weergave zelf bij wat nog
loopt en biedt ze `viewer.stil()`: een belofte die vervult zodra het definitieve beeld op het canvas staat. Gevolg: het
controleblad van 86 items duurt 49 s, en de beeldvergelijking geeft exact dezelfde pixels als met het oude wachten.

## Tekenopdrachten tellen, niet driehoeken (11/11)

`viewer.info()` geeft per beeld het aantal tekenopdrachten en driehoeken. Richtwaarde uit de praktijk van three.js:
onder de paar honderd tekenopdrachten per beeld; het aantal driehoeken weegt veel minder.

| Scène | Tekenopdrachten | Driehoeken |
|---|---|---|
| Hoeksofa (Kotor) | 79 | 171 000 |
| Doorlopende zetel (Doha) | 27 | 178 000 |
| Voorbeeldwoning, onderdeel per onderdeel | 3 909 | 110 000 |
| Voorbeeldwoning, samengevoegd per materiaal | 153 | 110 000 |

De woning was dus het probleem, niet de zetel: 697 blokken met tot zes materialen per blok. `voegSamen` in `drie-d.ts`
maakt er één vorm per materiaal van (alleen in de bouwweergave, niet voor glas). Het beeld blijft hetzelfde (0,02 %
verschil), het opbouwen gaat van 351 naar 137 ms. Voor een scène met honderden gelijke onderdelen zou `InstancedMesh`
of `BatchedMesh` nog verder gaan; bij ons zijn de onderdelen verschillend en volstaat samenvoegen.

## Ronde vormen: de gepolsterde schaal (11/11)

Een kuipfauteuil is een gebogen wand (rug die overloopt in de armen) rond een zitting. Drie dingen maken zo'n wand
geloofwaardig, en ze ontbraken alle drie:

1. **Helling.** Een echte kuip is bovenaan breder dan aan de voet en de rug helt achterover (5 tot 11 cm). Recht omhoog
   lijkt ze een schutting. De helling is het grootst waar de wand het hoogst is en klein aan de lage uiteinden; een
   negatieve helling geeft een schelp die over de zitting leunt (Pebble).
2. **Vloeiende lijn.** De motor geeft ±40 punten met een hoogte; de weergave legt er een vloeiende kromme door
   (Catmull-Rom) en neemt om de 1,5 cm een doorsnede. De hoogte mag daarbij niet doorschieten voorbij haar buren.
3. **Polstering en ronde einden.** De doorsnede is dikker halverwege de hoogte, de bovenrand een volle ronding, en het
   uiteinde is rond in het grondvlak én van opzij (anders eindigt de wand in een opstaande punt). Het uiteinde moet
   dichtlopen tot breedte nul: een spleet van een millimeter toont de achtergrond als een wit streepje.

De opgegeven maat blijft de buitenmaat: de voet (onderbouw, zitting, poten) schuift zoveel naar binnen als de wand helt.
Wanneer een samengesmolten zachte vorm (raster) en wanneer een schaal? Een schaal waar de vorm een duidelijke wand is
(alle kuipen); een zachte vorm waar delen echt in elkaar overvloeien (doorlopende zetel, strakke arm). De zachte vorm
toont op een grof raster kartels; fijner rekenen kost rekentijd bij het opbouwen, geen tekentijd.

Doeltoestel sinds 11/11: een toestel met een bescheiden grafische kaart (MacBook). Driehoeken zijn daar geen probleem
(een zetel telt er 200 000 tot 250 000); tekenopdrachten wel (zie hierboven).

## Lessen uit het controleblad (11/11)

- **Hoogte langs een gebogen wand: reken met de afstand, niet met de hoek.** Punten op gelijke hoeken liggen bij een
  hoekig grondvlak (een afgeronde rechthoek) opeengepakt in de hoeken. Wie de hoogte per punt laat verlopen, krijgt dan
  een knik. Herverdeel de punten eerst op gelijke afstanden (`gelijkVerdeeld` in `kuip.ts`).
- **Een kussen dat ergens op een frame hangt, is rondom rond.** De kuipwand had een vlakke onderkant (ze stond altijd
  ergens op). Voor een rug op een frame (Karl) rondt `kuipwandGeometrie` nu ook de onderkant af en krijgen de hoeken
  een eigen straal boven en onder (`wandOvaal`). Laat zo'n kussen als één plaat hellen: helt elke doorsnede apart,
  dan waaieren de lage uiteinden uit als vleugels.
- **Een los gevuld kussen herken je aan zijn rand, niet aan zijn buik.** Meer bolling alleen maakt een kussen niet
  losser. Wat het oog leest: een dunne naad, zijden die tussen de hoeken naar binnen trekken (oortjes) en een bovenrand
  die doorzakt. De onderrand blijft recht: daar rust het kussen (`losGevuld`).
- **Een maat is een buitenmaat.** Buig je een zetel in een boog, dan wordt hij van uiteinde tot uiteinde korter. Reken
  de boog zo dat de opgegeven breedte de buitenmaat blijft, anders klopt de 3D niet meer met de maten op de offerte.

## Safari: het beeld bleef hangen tot je het venster van grootte veranderde (11/11)

Melding van Jonas, de eerste test op een echte MacBook in Safari (WebGPU): elk model bleef het eerste beeld tonen tot hij
het venster groter of kleiner maakte. In Chrome en in de cloud (WebGL2 én WebGPU op swiftshader) was er niets te zien.

Wat een grootte-wijziging anders doet dan gewoon tekenen: `renderer.setSize()` laat three.js het canvas opnieuw aan de
grafische kaart koppelen (`context.configure`). De demo riep `setSize` bij elke aanpassing en bij elk model dat je
opende, ook als de maat dezelfde bleef. Aangepast in `drie-d.ts`:

1. `formaat()` stelt de grootte alleen nog in als ze verandert.
2. Was het canvas verborgen (een ander scherm van de demo) of verhuisd (tabblad 3D ↔ voorbeeld naast de tekening), dan
   verandert het op de WebGPU-weg één keer echt van grootte en terug: hetzelfde als het venster even groter maken.
3. Het mooie beeld (met nabewerking) wordt binnen een beeldronde van de browser getekend (`requestAnimationFrame`),
   niet meer rechtstreeks vanuit een tijdklok.

**Niet bewezen:** Safari kan hier niet draaien, dus dit is de meest waarschijnlijke oorzaak, geen nagemeten. Na te kijken
op de MacBook. Wat wel vaststaat: de beelden zijn pixel voor pixel gelijk gebleven en de beeldvergelijking test nu ook
of het scherm vanzelf volgt na een klik (`schermVolgt` in `scripts/beeldvergelijking.mjs`).

Les: het gereedschap vroeg de weergave telkens zelf om te tekenen (`stil()`, `beeld()`), en zag dus nooit wat een
gebruiker ziet na een klik. Test ook de gewone weg: klikken, wachten, kijken wat er op het scherm staat.

**Tweede vondst (11/11, later): een melding van de grafische kaart.** De toestelcontrole luistert nu op elke rekenweg
naar meldingen van de grafische kaart terwijl ze de gewone handelingen één voor één doet (ander model, ander formaat,
decor, licht, kwaliteit). Op de WebGPU-weg gaf precies één handeling een melding: wisselen tussen *Snel* en *Mooi*
("Destroyed texture used in a submit"). De schaduwkaart kreeg dan een andere maat; three.js gooit de oude kaart en haar
twee vervaagstappen meteen weg, terwijl het lopende beeld ze nog gebruikt. In Chrome kost dat één beeld; hoe Safari
daarop reageert, weten we niet. Opgelost: de zetelweergave houdt haar schaduwkaart altijd op 2048 (de schaduw wordt
alleen bij een wijziging opnieuw getekend, dus dat kost in de snelle stand geen tijd per beeld). Wie op de MacBook ooit
*Snel* koos, kreeg die wissel bij elke start van de pagina: dat kan meegespeeld hebben in de melding van Jonas, maar
ook dit is niet bewezen.

Les: een melding van de grafische kaart is geen ruis. Laat het gereedschap ze tellen als een fout, per handeling.

