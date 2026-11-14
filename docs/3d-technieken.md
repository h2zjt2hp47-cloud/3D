# 3D-technieken: wat werkt waarvoor (kennisbank)

*Stand 13/11/2026.* Wat we bij de zetels leerden over 3D, en hoe je het hergebruikt: voor een nieuw zetelmodel, een ander
meubel of de ramen en deuren van de bouwdemo. De uitwerking per onderwerp staat in de notities onderaan.

## De opvatting sinds 13/11: eerst het echte product, dan de techniek

Tot 13/11 vertrokken we van onze bouwstenen: een model kreeg de vorm die er het dichtst bij lag, en we schaafden bij
tot het "ongeveer" klopte. Bij de fauteuils gaf dat zetels die "er totaal niet op leken" (Jonas). Sindsdien werken we
omgekeerd. De zeven regels:

1. **Vertrek van het echte product.** Haal eerst álle foto's en de maten van de productpagina op, en leg elk model in
   3D naast zijn foto's. Kijk naar de hele familie tegelijk: zo zie je de bouwwijze van de maker. Bij de fauteuils: een
   dikke, vaste, ronde zitting; een dunne schaal erachter; een eigen onderstel.
2. **Beschrijf de opbouw zoals de maker ze bouwt**, in onderdelen (zitting, schaal, onderstel), en bouw dát in de motor.
   Lijkt een model er niet op, dan ligt het bijna altijd aan de opbouw of de maten, zelden aan de afwerking.
3. **De vorm van een model is gegevens, geen code.** De motor kent de opbouw; het modelbestand zegt hoe dik de schaal
   is, hoe ver ze rondloopt, hoe de bovenrand verloopt, welk onderstel. Een nieuw model in dezelfde familie vraagt dan
   geen programmeerwerk. De 3D en de tekeningen lezen dezelfde gegevens.
4. **Eerst meten, dan sleutelen.** Reken na wat de site geeft (dikte van de schaal = diepte − zitdiepte) en meet of de
   motor juist rekent voor je iets verfijnt. Een fijner raster loste de bobbelige naad van Pebble niet op; de fout zat
   in de berekening.
5. **Eén model als proef, vóór de hele familie.** Toon het voorstel als losse scène, zonder het model of de prijs te
   wijzigen, naast de foto's uit dezelfde standpunten. Pas na het oordeel ombouwen. Bij Mabel kwam zo aan het licht dat
   de leuning te ver naar voren liep: één model bijsturen in plaats van veertien.
6. **Bewakers bij elke stap.** Een momentopname van prijs, offertegegevens en tekeningen van alle modellen; de
   beeldvergelijking met close-ups; één wijziging per commit. Zo is elke verandering bewust, en valt een onbedoelde
   meteen op (de zitting van Pebble die meekromp).
7. **Prijs en tekening volgen wat je ziet.** Wat de 3D toont, staat als echte keuze in de catalogus en in de offerte.
   Wat de prijs raakt, gaat eerst naar Jonas, regel per regel, met oud en nieuw bedrag. Zeg bij elk getal waar het
   vandaan komt: van de site, of geschat uit de foto.

Uitwerking en beelden: [Modellen nalopen tegen de productfoto's](nalopen-modellen.md) en
[Analyse ronde vormen](analyse-ronde-vormen.md).

## De technieken op een rij

| Techniek | Wat het doet | Goed voor | Niet voor | Rekentijd |
|---|---|---|---|---|
| **Blokken** | Elk onderdeel apart: afgeronde balken, cilinders, kegels, een vrije omtrek of een gebogen wand. | Een snelle eerste indruk; alles wat recht en eenvoudig is (poten, houten delen, kasten, de huidige ramen). | Vormen die "uit één stuk" moeten lijken. | Meteen |
| **Eigen doorsnede** (profiel) | Eén doorsnede in 2D die langs een lijn loopt. Dezelfde doorsnede tekent ook het vooraanzicht. | Een vorm die per stijl terugkomt: de strakke en de uitlopende arm. Later ook raamprofielen. | Vrije, organische vormen. | ±40 ms per arm, daarna onthouden |
| **Zachte vormen** | De delen smelten samen tot één vorm, met een afronding in de hoeken en schaduw in de plooien. | Gestoffeerde, ronde vormen: zetels. | Harde, precieze producten met details van millimeters (ramen, deuren, kasten). | 0,2 à 0,7 s per zetel, 20.000 à 110.000 driehoeken; in de achtergrond |
| **Vorm als gegevens** (sinds 13/11) | De opbouw van een model in onderdelen (zitting, schaal, onderstel), met de vorm als getallen in het modelbestand: dikte, omloop, verloop van de bovenrand, soort zitting, onderstel. | Modellen met een eigen vorm binnen één familie: de fauteuils van de klant (Milton, Mabel …). Later ook raamtypes binnen één profielsysteem. | Een vorm die buiten de familie valt: dan eerst een nieuwe bouwsteen in de motor. | Meteen |
| **Doorlopende opbouw** | Een rij elementen wordt in 3D één product. Prijs en tekeningen blijven per element. | Modulaire zetels die als één geheel ogen (Doha, Montego). | Hoeksofa's (nog niet uitgewerkt). | Zoals de zachte vormen |
| **Boog** | De hele vorm buigt in een boog; wat erop staat (kussens) draait mee. | Gebogen sofa's (Montego); later rondboogramen. | – | Meteen |
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
WebGPU), niet meer met eigen WebGL-shaders. In de cloudsessie is er geen WebGPU: daar is alleen de WebGL2-weg te testen.

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
10. **Lijkt het niet, kijk dan naar de opbouw en de maten.** De fauteuils hadden de verkeerde opbouw (dikke wand,
    boogrug, los kussen) en nooit de maten van de site gekregen (Milton 92 cm hoog in plaats van 72). Geen enkele
    afwerking had dat goedgemaakt.
11. **Vergelijk de familie, niet het model.** Veertien fauteuils naast elkaar toonden één bouwwijze. Model per model
    hadden we veertien keer een uitzondering gebouwd.
12. **Een proef op één model spaart de rest.** Zie regel 5 van de opvatting.
13. **Bekijk de tekeningen, vergelijk ze niet alleen.** De bewaker zei "veranderd, zoals bedoeld"; pas in beeld bleek
    dat de uiteinden van de schaal in het vooraanzicht als twee palen vóór de zitting stonden.
14. **Een mooiere 3D mag de prijs niet stil verschuiven.** De bies en een geschatte poothoogte gaven +32 tot +43 en
    +40 euro. Splits de prijs uit en leg voor wat niet gevraagd was.
15. **Lees de foto groot voor je een vorm een naam geeft.** Manon stond in de lijst als "scheve kuip" en Fraser als
    "schaal op de zitting". Op de grote foto's bleek Manon symmetrisch en liep de schaal van Fraser tot onderaan. Een
    verkeerd woord in de lijst wordt anders een verkeerde bouwsteen in de motor.
16. **Bekijk elk model ook van achter en van opzij.** Het losse rugkussen van Satie stak door de schaal heen; dat was
    alleen van achter te zien. De rug van Tumble hing als een rol boven de zitting; dat zag je pas van voor.
17. **De maten van de site als tabel in een test.** Voor elk omgebouwd model: het kader van de 3D, de bovenkant van de
    zitting en geen fout in de prijsberekening. Die tabel groeit mee met elke stap en vangt wat een beeld niet toont
    (een los sierkussen dat de hoogte opdreef, een maat die stil begrensd werd).
18. **Tests over een keuze hangen niet aan een model van de klant.** De tests over *Vorm fauteuil* gebruikten Tumble,
    Manon en Satie; toen die hun eigen opbouw kregen, braken ze om de verkeerde reden. Ze gebruiken nu een gewone
    fauteuil uit de catalogus.
19. **Lees de tekst van de productpagina, niet alleen de maten.** Quin kreeg drie kussens (geteld op de foto); de pagina
    zegt "4 kussens inbegrepen". Ook de zitdiepte stond erbij en was bij de tweede ronde niet nagerekend: bij zes
    modellen bleek de zitting 3 tot 13 cm te diep.
20. **Als de maten niet in elkaar passen, klopt de opbouw niet.** Sullivan: 72 breed, 80 diep, zitdiepte 60, hocker 62
    rond. Met een rechte schaal paste dat nooit. Met een ronde zitting van 62 en een rug die 13 cm achterover helt klopt
    alles tegelijk. De rekensom wees de weg, de foto van opzij bevestigde ze. (Later dezelfde dag verfijnd: de schaal
    is een tulp, zie les 25. De rekensom klopte toen nog beter.)
21. **Een helling is geen afschuiving van het geheel.** De eerste versie liet de hele schaal mee hellen; bij Manon stond
    toen ook de voorrand schuin, terwijl die op de foto recht naar beneden loopt. De rug helt waar ze naar achteren
    kijkt en dooft uit naar de zijkanten.
22. **Wat dikker wordt, groeit naar de kant die niet gemeten is.** De armen van Ross en Sullivan zijn dikker dan de
    rug. De breedte van de site is over de armen gemeten, dus het extra komt naar binnen en de buitenkant blijft staan.
    Kijk op de foto waar de naad of bies loopt: die toont welke kant de vaste kant is.
23. **Meet een dikte als verhouding, niet op het oog.** De armen kregen eerst 11,5 en 14,5 cm, omdat ze op de schuine
    foto's dikke rollen leken. Gemeten op de foto van voren en op ons beeld van voren (de vrije breedte tussen de armen
    tegenover de hele breedte) bleek dat te dik: Ross 9 cm, en bij Sullivan was niet de arm dikker maar de rug ernaast
    dunner. Een verhouding heeft geen schaal in cm nodig en vergelijkt foto en beeld op dezelfde manier.
24. **Twee foto's die elkaar tegenspreken, tonen een vorm die de motor niet heeft.** De rug van Sullivan was van voren
    te smal, en het verloop van de bovenrand kon de foto van voren en die van opzij niet allebei volgen. De schaal is
    bovenaan breder dan onderaan: een tulp. Niet verder schuiven met de getallen, maar de ontbrekende bouwsteen bouwen
    (`waaier`). **Wel eerst goed meten:** de eerste meting (±23 cm schuine schouder) kwam van een verkleinde foto; op de
    volle foto met een raster was het ±17 cm, en het conflict was kleiner dan het leek.
25. **De juiste vorm doet de maten van de site in elkaar passen.** Manon: een ronde zitting van ±62 cm met een schaal
    die 5,7° uitwaaiert, geeft bovenaan precies 75 × 70. Sullivan: zitting 62 (zoals de hocker), 5,6° waaier en 7,9°
    helling geven 72 × 80. Past het niet, zoek dan verder naar de vorm (zie ook les 20).
26. **Een schaal die van de zitting wegwijkt, laat een spleet.** De rug van Manon helde 9,5° en lag op zithoogte 6 cm
    achter de rand van de zitting; van voren zag je het niet, van boven wel. Reken voor elke schaal die helt of
    uitwaaiert na of haar binnenkant op zithoogte nog binnen de zitting ligt, op elk punt van de schaal (test in
    `modellen.test.ts`), en bekijk het model ook van boven.
27. **Klik door wat de gebruiker kan kiezen.** Manon en Sullivan klopten zoals ze zijn, maar met de vorm *Organisch*
    stak de schaal achteraan 1,5 cm buiten de zetel: de scheve schaal heeft haar hoogste punt naast het midden, en de
    variant op een verdekte voet begon 5 cm lager. Een test loopt nu voor die twee modellen elke vorm, de kleinste en
    grootste maten, losse kussens en elke draaiing af: gewone getallen, binnen de zetel, zonder spleet.

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

1. **Bronnen:** alle foto's en de maten van de productpagina, in een eigen map buiten de repo. Voor de bouw:
   doorsnedes en gegevens van de systeemleverancier.
2. **Vergelijkingsblad:** het model (of de hele familie) in 3D naast de foto's, met de maten van de site erbij.
3. **Opbouw in woorden:** welke onderdelen, wat is één stuk, waar stopt wat (zie les 2). Reken na wat de site toelaat
   (bv. dikte van de schaal = diepte − zitdiepte).
4. **Kan de motor die opbouw al?** Ja: alleen gegevens in het modelbestand. Nee: eerst de bouwsteen in de motor, als
   optionele uitbreiding. Bewijs dat de bestaande modellen identiek blijven (momentopname, beeldvergelijking 0,00 %).
5. **Proef op één model:** het voorstel als losse scène naast de foto's, uit dezelfde standpunten. Geen model en geen
   prijs gewijzigd.
6. **Voorleggen:** het proefbeeld, en wat de prijs of de catalogus raakt, regel per regel met oud en nieuw bedrag.
7. **Ombouwen**, met tests:
   - de vorm is dicht en de schaduw klopt;
   - de maten van de opbouw kloppen;
   - alleen de bedoelde modellen veranderen (momentopname vergelijken).
8. **Nakijken in beeld:** de 3D uit de standpunten van de foto, én het boven- en vooraanzicht. Daarna
   `npm run beelden` (zie [Beeldvergelijking](../beeldtest/LEESMIJ.md)); wat verandert moet bewust zijn, dan
   `npm run beelden -- --vernieuw`. Zet het model in de vaste reeks als het een nieuwe opbouw is.
9. **Benaderingen markeren:** wat van de site komt en wat uit de foto geschat is; open afwijkingen noteren.
10. **Documenteren** (overdracht, uitleg, skill). Publiceren en het doorstuurpakket vernieuwen pas na goedkeuring.

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

- **Een omtrek mag niet plooien.** Schuift een kant naar binnen, maak de hoeken dan kleiner. De test op snijdende
  zijden staat in `doorlopend.test.ts`.
- **Een wand die oploopt of zakt:** de helling moet meetellen in de richting van het oppervlak, anders kloppen de
  schaduwen niet. Test de richtingen tegen kleine stapjes in het veld (`zachtevorm.test.ts`).
- **Een wand die bovenaan breder is dan aan haar voet (`waaier`):** de maten van het element zijn dan die van de
  bovenrand. Reken eerst de voet uit (`kuipVoet`: één bron voor de opbouw, de zitting, het onderstel en de tekeningen)
  en leid de hoek daaruit af, zodat het breedste punt precies op de rand van het element komt; omgekeerd mist de
  afronding van de voet (0,1 cm) de maten met een millimeter. Het breedste punt is waar de voet staat plus wat de wand
  daar uitsteekt, niet waar ze het meest uitsteekt. Het vooraanzicht tekende een hoogte per plaats en kan zo geen wand
  tekenen die overhangt: daar is een echte omtrek nodig (boven- én onderkant per plaats).
- **Een wand die dikker wordt:** verschuif de middenlijn niet. Alles wat de wand tekent, rekent zijn richtingen uit de
  middenlijn; een verschoven lijn draait in de overgang, en dan draait de buitenkant mee. De middenlijn blijft die van
  de gewone dikte, en `wandDoorsnede` (`kuip.ts`) geeft per punt het midden van de doorsnede en haar halve dikte. Elke
  plek die een kuipwand tekent, gebruikt die functie: de 3D, de zachte vorm, het boven- en vooraanzicht, de schaduw op
  de vloer en het kader van het blok. Een plek die het vergeet, tekent een dunne wand.
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
- **Een gebogen wand die oploopt:** de hoogte van de bovenrand mag niet het dichtste punt van het pad volgen. Dat punt
  verspringt op elk hoekpunt (binnenkant van een bocht: sprong; buitenkant: het staat even stil), wat op een steile rand
  trapjes tot 1 cm gaf. De hoogte volgt de plaats tussen de twee verstekken van een stuk; de afstand wordt gedeeld door
  de lengte van de helling (`wand` in `zachtevorm.ts`, sinds 13/11). Laat een wand niet eindigen op exact de hoogte van
  een ander vlak (flikkeren): liever een paar cm erin. Verdeel de punten op gelijke afstanden en
  laat de hoogte de afstand volgen, niet de hoek: bij een afgeronde rechthoek golfde de bovenkant anders.
- **Geen Math.random in texturen:** dan ziet het parket er bij elke keer laden anders uit, en kan de beeldvergelijking
  niets vergelijken. Gebruik `vasteReeks(sleutel)` in `drie-d.ts`.
- **Een fijner raster lost een rafelige naad niet op** (proef 13/11, Pebble): 1 cm in plaats van 2 cm gaf vier keer
  zoveel driehoeken en rekentijd, en de rand werd eerder rafeliger. De fout zat in de vorm zelf (zie het punt
  hierboven). Meet eerst of het veld klopt: de richting uit `zachteVorm` tegenover kleine stapjes in `zachtVeld`, en of
  het veld 1 cm per cm verandert (test in `zachtevorm.test.ts`). Zie [Analyse ronde vormen](analyse-ronde-vormen.md).
- **De buitenkant van een gebogen wand is niet de omtrek.** De middenlijn van een kuipwand is een kleiner grondvlak,
  geen evenwijdige lijn: bij een afgerond grondvlak ligt de buitenkant in de hoeken tot ±1 cm binnen de omtrek. Een
  onderbouw die "0,8 cm binnen de omtrek" ligt, stak daar door de wand. Meet de speling tegen de wand zelf.
- **Een uiteinde is rond in twee richtingen.** Een wand die in het grondvlak rond eindigt maar tot aan de punt even hoog
  blijft, oogt als een mes. De kop moet bovenaan mee naar beneden lopen (een kwart bol).
- **Vergelijk de 3D eerst met de tekening en de foto.** De "rolarm" van Zora was in 3D een cilinder op een blok, in het
  vooraanzicht een arm met een ronde bovenkant, en op de foto ook. Een uur aan een mooiere rol was verloren werk
  geweest.
- **Een kussen dat helt, draait rond zijn onderkant.** Zet je het onderaan tegen de schaal, dan steekt zijn bovenkant
  erdoor. Zet het onderaan zoveel naar voren als het tot de rand van de schaal achteruit helt (hoogte × tangens van de
  hoek).
- **Losse kussens zijn een lens, geen plak.** Een dunne rand met een bolling tot de volle dikte. Drie plakken naast
  elkaar langs een schaal versmelten tot één gevulde rug; zet ze schuin en laat ze elkaar overlappen.
- **Een schaal op een bolle zitting** begint waar de bolle rand begint, niet op zithoogte. Anders hangt haar buitenrand
  boven de afgeronde schouder van de zitting, met een diepe gleuf eronder.
- **Schuine poten zonder scheve boven- en onderkant:** een afschuiving van de kegel (de voet verschoven, de vlakken
  blijven horizontaal), geen kanteling. De schaduw op de vloer ligt bij de voet.
- **Meer:** de skills `zetel-3d` (`.claude/skills/zetel-3d/SKILL.md`) en `bouw-woning`
  (`.claude/skills/bouw-woning/SKILL.md`).

## Meer lezen

- [Modellen nalopen tegen de productfoto's](nalopen-modellen.md) (13/11): de fauteuils naast hun foto's, de nieuwe
  opbouw (zitting, schaal, onderstel als gegevens), Milton en Mabel voor en na, de prijs regel per regel.
- [Zachte vormen](zachte-vormen.md): zelf zetels opmaken in 3D, de eigen armvormen en de doorlopende zetel.
- [Analyse ronde vormen](analyse-ronde-vormen.md) (13/11): de twee manieren om rond te tekenen, wat er in beeld misgaat,
  en 23 ideeën met hun grond, werk en risico. Vier herstellingen zijn dezelfde dag gebouwd; de rest niet.
- [Echte 3D-modellen](echte-3d-modellen.md): de proef met een echt 3D-bestand, en wat we van de klant nodig hebben.
- [Overdracht](overdracht.md): de stand van zaken per ronde.
- [Onderzoek raamsoftware](onderzoek-raamsoftware.md): hoe LogiKal, ReynaPro en Chacal met profielen en tekeningen
  werken.
- [Onderzoek bouw](onderzoek-bouw-ramen-deuren.md): de pijnpunten bij ramen en deuren.
