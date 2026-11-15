# 3D tonen aan klanten in de bouw, los van prijzen — analyse (15 november 2026)

Vraag van Jonas (15/11): *"Graag ook verschillende raamtypes, vloeren, houtconstructies, metaalconstructie etc. Maak een analyse om dit bruikbaar te maken om 3D te tonen aan klanten los van prijzen."* Eerder die dag: *"Ik zou enkel 3D zonder prijzen maken in eerste instantie"* en *"kunnen we de 3D-bouwconfigurator helemaal afwerken en zeer gebruiksvriendelijk maken?"*

Dit is alleen een analyse. Ze bouwt voort op `docs/analyse-bouw-3d-missing-link.md` (de 3D doorsturen, de eerste lijst afwerkingen).

> **Labels:** **[code]** = vandaag vastgesteld in de code. **[beslist]** = antwoord van Jonas op een van de twaalf vragen hieronder. **[inschatting]** = mijn redenering. **[te bevestigen]** = moet iemand anders bevestigen (leverancier, aannemer, Missing Link).
> Werk: **S** = enkele dagen, **M** = één à twee weken, **L** = meer.

## In het kort

1. **Het doel verschuift van "offerte maken" naar "het ontwerp tonen".** De verkoper bouwt het ontwerp op, de klant ziet het in 3D en krijgt het mee. Prijzen verdwijnen uit beeld; de rekenmotor blijft bestaan voor later.
2. **Wat je vraagt, valt uiteen in drie soorten werk:**
   - *meer van hetzelfde* (raamtypes, vloerafwerking): de bouwstenen bestaan, er komen keuzes bij;
   - *nieuwe producten* (carport, tuinhuis, loods, stalen trap): elk een vast model met maten en opties, zoals nu een raam;
   - *een nieuwe blik* (constructie: houtskelet, dakconstructie, vloeropbouw): hetzelfde ontwerp, maar je ziet wat erin zit.
3. **Eén ding maakt alles goedkoper: een bibliotheek van bouwdelen.** Paal, ligger, spant, wandvlak, dakvlak, plaat, poort. Een carport, een loods en een houtskeletwand zijn alle drie een samenstelling daarvan. Vandaag is de 3D van elk model apart geprogrammeerd; dat houdt geen zes productsoorten vol.
4. **Het zwaarste stuk is niet de 3D maar het beheer.** Je koos dat de aannemer zelf zijn modellen, kleuren en materialen beheert. Dat kan voor materialen, kleuren, maten en welke opties hij toont. Een **nieuwe vorm** (een ander soort carport) blijft programmeerwerk. En beheren vraagt bewaren buiten de browser.
5. **Volgorde** (jouw keuze: eerst de constructieweergave): zie hoofdstuk 8. Het zijn een tiental rondes; elke ronde eindigt met een testbestand en een test op tablet en groot scherm.

Wat ik nog van je nodig heb, staat in hoofdstuk 10.

---

## 1. Jouw twaalf antwoorden [beslist]

| # | Vraag | Jouw antwoord |
|---|---|---|
| 1 | Wie bedient de 3D? | De verkoper maakt het ontwerp; de klant krijgt het daarna om zelf te bekijken, zonder te kunnen wijzigen. |
| 2 | Welke constructies? | Alle vier: bijgebouwen in hout, houtskelet en dakconstructie, staalbouw (loods of hal), staal in en rond de woning. |
| 3 | Hoe begint een ontwerp? | Een vast model met maten en opties. De woning zelf blijf je vrij tekenen op de plattegrond. |
| 4 | Vloeren? | Beide: de afwerking (parket, tegels, legpatroon, plinten) en de opbouw (balklaag, chape, isolatie). |
| 5 | Welke raamtypes? | Alle vier de groepen: grote glaspartijen, bijzondere vormen, dakramen en poorten, indelingen en uitzicht. |
| 6 | Afwerking en constructie tonen? | Twee weergaven met één knop: *Afgewerkt* en *Constructie*. |
| 7 | Offerte en Werf? | Offerte wordt *Overzicht* (wat er is en hoeveel, met beelden en doorsturen). Werf verdwijnt uit het menu. Alle prijzen uit beeld. |
| 8 | Wat eerst, na dak, koepels en lichtinval? | De constructieweergave. |
| 9 | Wie beheert het aanbod? | De aannemer zelf. |
| 10 | Wat krijgt de klant mee? | Alles: een link naar de draaibare 3D, beelden of een PDF, varianten naast elkaar, maten op het beeld. |
| 11 | Toestel? | Tablet en groot scherm even belangrijk. |
| 12 | Missing Link? | Aparte app; Missing Link ontvangt een beeld per regel en de draaibare 3D (de *zending*, al gebouwd, zonder prijzen). |

---

## 2. Wat er vandaag is [code]

| Onderdeel | Stand |
|---|---|
| **Woning** | Vrij te tekenen plattegrond met verdiepingen, muren die vanzelf ontstaan, ramen en deuren in de muren, trap, meubels. In 3D als massieve muren met materiaal buiten en binnen, vloerplaten, plat dak. |
| **Raam en deur** | Eén model met vier soorten (raam met 1 tot 3 vakken naast elkaar, terrasdeur, voordeur, schuifraam), bovenlicht, roeden, 5 profielen, 6 kleuren, zonwering. De 3D is een apart programma per model (`raam3d.ts`). |
| **Aanbouw** | Een ouder vast model met maten en opties, met o.a. hef-schuif 2- en 3-delig, schuifraam 4-delig, vouwdeur, lichtstraat en koepel. Bewijst dat "vast model met maten en opties" werkt; zijn onderdelen zijn nog niet herbruikbaar. |
| **Gevel, vloer, wand** | Gevelmaterialen als gegevens (8 materialen, per muurvlak). Vloer en wand per ruimte uit een korte lijst. |
| **In opbouw** (15/11) | Dak (plat met afwerking, lessenaar, zadel), lichtkoepels, lichtinval. |
| **Tonen en doorsturen** | Klantweergave (verbergt interne zaken), afdrukken, het 3D-pakket, de losse kijker en de zending voor Missing Link. |
| **Maten in de 3D** | Bestaan alleen voor de zetels (breedte, diepte, hoogte van het geheel). De gevelaanzichten van de woning hebben wel kettingmaten. |
| **Beheer** | De zeteldemo heeft een beheerscherm (stoffen, elementen, opties, modellen). **De bouwdemo heeft er geen.** |
| **Bewaren** | Alleen in de browser van één toestel, of als bestand. |
| **Techniek van de 3D** | Alles is opgebouwd uit blokken (balk, cilinder, kegel, bol, gebogen wand, profiel langs een lijn; een blok kan kantelen). Elk blok is een apart getekend stuk: er is geen techniek om duizend gelijke stijlen in één keer te tekenen. Gemeten op de voorbeeldwoning: 697 blokken geven ±2 000 tekenopdrachten na één klik (schaduw inbegrepen). |

---

## 3. De kern: van aparte programma's naar bouwdelen

Vandaag heeft elk model zijn eigen 3D-programma. Voor zes productsoorten erbij is dat niet houdbaar, en het botst met "de aannemer beheert zelf".

**Voorstel [inschatting]: een bibliotheek van bouwdelen**, die elk uit maten en een materiaal hun blokken maken:

| Bouwdeel | Dient voor |
|---|---|
| Paal en kolom (hout, staalprofiel) | carport, pergola, loods, luifel |
| Ligger, balk, gording | balklaag, carport, loods, dakconstructie |
| Spant en portaal (driehoek, schaar, stalen portaal) | dakconstructie, loods |
| Wandvlak met opbouw (lagen en skelet) | houtskelet, tuinhuis, gevel van een loods |
| Dakvlak met opbouw | alle daken (komt uit het werk dat nu loopt) |
| Vloervlak met opbouw | vloeropbouw, verdiepingsvloer |
| Beplating en panelen (planken, sandwichpaneel, glas) | wanden en daken van bijgebouwen en loodsen |
| Opening (raam, deur, poort) | overal |
| Trap en balustrade | woning, bordes, loods |

Een **model** is dan een recept: welke bouwdelen, met welke formules voor hun maten. Een carport is "vier of zes palen, twee liggers, een dakvlak, nul tot drie wandvlakken". Dat recept schrijven wij; de aannemer kiest de maten, materialen en opties.

**De opbouw als gegevens.** Een wand, een vloer en een dak krijgen elk een *opbouw*: de lagen van binnen naar buiten (bv. gipsplaat, houtskelet 140 mm met isolatie, plaat, latten, gevelbekleding) en het raster van het skelet (stijlen om de 40 of 60 cm). Uit die ene beschrijving komen drie dingen:

- de **afgewerkte** weergave (alleen de buitenste lagen);
- de **constructie**weergave (het skelet en de lagen ertussen);
- later een **doorsnede**tekening.

Dat is hetzelfde principe als bij de gevel: een afwerking is gegevens, geen programma.

---

## 4. Wat erbij komt, per onderwerp

### 4.1 Raamtypes [beslist: alle vier de groepen]

| Groep | Wat | Wat er technisch voor nodig is | Werk |
|---|---|---|---|
| **Indelingen en uitzicht** | Stolpraam, deur met zijlicht en bovenlicht, vakken boven elkaar, kleinhouten, steellook met fijne verdeling | De indeling van een raam wordt een **raster van vakken** (rijen en kolommen, ook genest) in plaats van "1 tot 3 naast elkaar". De basis voor al de rest. | M |
| **Grote glaspartijen** | Hef-schuif met 3 of 4 delen, vouwwand, vaste glaswand, hoekraam zonder stijl | Hef-schuif en vouwdeur bestaan in het aanbouwmodel en verhuizen naar het raammodel. Het hoekraam is nieuw: één positie over twee muren. | M |
| **Bijzondere vormen** | Schuine bovenkant (onder een dakhelling), rondboog, rond | Een kader dat een lijn volgt in plaats van een rechthoek. De techniek bestaat bij de zetels (een profiel langs een boog). | M |
| **Dakramen en poorten** | Dakraam in een hellend dak, lichtstraat, sectionale garagepoort | Het dakraam hangt af van het dak dat nu gebouwd wordt. De garagepoort is een eigen model (belijning, vensters, kleur). | M |
| **Kleur en beslag** | Volledige RAL-waaier met afwerking, krukken en trekbeugels als echt 3D-bestand | Stond al in de vorige analyse (punten 10 en 12). | S + M |

Niet in deze stap: de echte profieldoorsnede per systeem. Die wacht op doorsnedes van een leverancier **[te bevestigen]**.

### 4.2 Vloeren [beslist: afwerking en opbouw]

| Wat | Hoe | Werk |
|---|---|---|
| **Afwerking** | Legpatroon (recht, halfsteens, visgraat, Hongaarse punt), formaat van tegel of plank, voegkleur; plinten; per ruimte, later per zone | M |
| **Opbouw** | Lagen per vloertype: draagvloer (houten balklaag, welfsels, beton), isolatie, chape, afwerking. Zichtbaar in de constructieweergave en in een doorsnede. | M (samen met 4.4) |

### 4.3 Bijgebouwen in hout [beslist]

Vaste modellen met maten en opties: **carport, tuinhuis, poolhouse, pergola, terrasoverkapping**.

| Keuzes per model [inschatting, te bevestigen met een aannemer] | |
|---|---|
| Maten | breedte, diepte, hoogte, aantal vakken |
| Dak | plat, lessenaar, zadel; bedekking; oversteek |
| Wanden | per zijde open, dicht (planken staand of liggend), glas, schuifwand |
| Hout | soort en kleur (naturel, gebeitst, zwart) |
| Extra's | berging aan een carport, poort, deur, dakgoot, lichtkoepel |
| Plaats | los, of tegen de woning (dan staat het bij de woning in 3D) |

Werk: de bouwdelen eerst (M), daarna ±S per model.

### 4.4 Houtskelet, dakconstructie en de constructieweergave [beslist: eerst]

Dit is de **tweede weergave** van de woning: één knop wisselt tussen *Afgewerkt* en *Constructie*.

| In de constructieweergave zie je | Komt uit |
|---|---|
| Wanden als skelet: onder- en bovenregel, stijlen op raster, extra stijlen en latei rond elke opening | de opbouw van het wandtype en de openingen in het plan |
| Verdiepingsvloer als balklaag, met het trapgat uitgespaard | de opbouw van het vloertype |
| Dak als spanten, gordingen en kepers, of als platte balklaag | de dakvorm (uit het werk dat nu loopt) en de opbouw van het dak |
| De lagen ertussen half doorzichtig of weggelaten, naar keuze | de opbouw |

**Eerlijk over wat dit is:** een **voorstelling**, geen berekening. De afstanden en doorsneden zijn regels van goed vakmanschap (bv. stijlen om de 60 cm), geen stabiliteitsstudie. Dat moet op het scherm en op elk blad staan. **[te bevestigen]**: welke opbouwen een houtskeletbouwer wil tonen.

**Risico:** veel stukken. Een woning in houtskelet heeft al snel duizend stijlen en balken; vandaag tekent de kijker elk stuk apart [code]. Er is een techniek nodig die gelijke stukken in één keer tekent, anders hapert het op een tablet. Dat hoort bij deze stap.

Werk: L (opbouw als gegevens, drie soorten skelet, de knop, de snelheid).

### 4.5 Staalbouw: loods of hal [beslist]

Eén vast model: **breedte, lengte, goothoogte, dakhelling, afstand tussen de portalen**.

| Onderdeel | Keuzes |
|---|---|
| Draagstructuur | portalen (kolommen en spanten), gordingen, windverbanden; zichtbaar in de constructieweergave |
| Dak en gevel | sandwichpanelen of geprofileerde plaat, kleur (RAL), lichtplaten of lichtstraat, betonplint |
| Openingen | sectionale poorten (aantal, maat, plaats), loopdeuren, ramen |
| Extra's | luifel, goten en afvoeren, binnenwand, tussenvloer |

Ook hier: **geen berekening**. De profielen zijn een voorstelling; de staalbouwer rekent zelf. Werk: M–L.

### 4.6 Staal in en rond de woning [beslist]

| Product | Keuzes | Werk |
|---|---|---|
| Trap | rechte steektrap, kwartdraai, met bordes, spiltrap; open of dicht; treden in hout of staal | M |
| Balustrade en leuning | spijlen, glas, kabels; langs trap, vide en terras | S–M |
| Luifel | boven een deur of een terras | S |
| Stalen binnendeuren en ramen | steellook met fijne verdeling (zie raamtypes) | S, na 4.1 |

### 4.7 Tonen en meegeven [beslist: alle vier]

| Wat de klant krijgt | Hoe | Wat het vraagt | Werk |
|---|---|---|---|
| **Draaibare 3D** | De losse kijker bestaat. Eerst als één bestand om te mailen (kijker met het ontwerp erin). Een echte **link** vraagt een plaats waar het ontwerp bewaard staat: Missing Link of een eigen server. | bewaren buiten de browser **[te bevestigen]** | S (bestand), M (link) |
| **Beelden of PDF** | Een blad zonder prijzen: enkele vaste standpunten (voor, achter, schuin, binnen), de keuzes in gewone taal. | het afdrukblad bestaat, maar is een offerte | S–M |
| **Varianten naast elkaar** | Een variant is een kopie van het ontwerp met een andere keuze. Twee kijkers naast elkaar die samen draaien, en eronder wat verschilt. | varianten bestaan nog niet; projecten kopiëren wel | M |
| **Maten op het beeld** | Hoofdmaten in de 3D (breedte, diepte, goot- en nokhoogte) en op de aanzichten. | in de 3D alleen voor zetels [code] | S–M |

### 4.8 Zonder prijzen [beslist]

| Wat | Hoe |
|---|---|
| Stap *Offerte* wordt *Overzicht* | Lijst van wat er in het ontwerp zit en hoeveel, met een beeld per onderdeel, en de knoppen om mee te geven en door te sturen. |
| *Werf* verdwijnt uit het menu | Inmeting, akkoord en meerwerkbon blijven in de code, uit beeld. |
| Alle bedragen uit beeld | Prijs per positie, totalen, korting, kostprijs en marge. In de code staan bedragen op 51 plaatsen in 7 schermbestanden [code]. |
| De rekenmotor blijft | Formules, stuklijst en prijslijsten blijven bestaan en getest; ze worden alleen niet getoond. |
| De zending | Gaat al zonder prijzen, totalen en stuklijst (15/11). |

Werk: M, samen met de eerste ronde gebruiksgemak.

### 4.9 Beheer door de aannemer [beslist]

Wat hij **zelf** kan, zonder ons:

| Zelf te beheren | Voorbeeld |
|---|---|
| Materialen en kleuren | een gevelsteen, een dakpan, een RAL-kleur, een houtsoort erbij, met naam en kleur |
| Maten | standaardmaten en grenzen per model |
| Het aanbod | welke modellen en opties hij toont, onder welke naam |
| Opbouwen | zijn wand-, vloer- en dakopbouwen, uit de lagen die bestaan |
| Uitzicht | logo en huisstijl |

Wat **niet** zelf kan: een nieuwe vorm (een ander soort carport, een ander dak). Dat is een nieuw recept en blijft werk voor ons.

**Voorwaarde:** beheren heeft pas zin als het bewaard blijft en op elk toestel van die firma geldt. Vandaag bewaart de bouwdemo alleen in de browser. Tot er een server of Missing Link achter zit, kan het beheer alleen als *bestand* (een catalogus die je opslaat en inleest). **[te bevestigen]**: waar die catalogus komt te staan.

Werk: L (een nieuw scherm, veilig tegen fouten, met voorbeeld terwijl je wijzigt).

### 4.10 Tablet en groot scherm even goed [beslist]

- Elke nieuwe functie wordt getest op tablet (vinger) en op een groot scherm (muis) vóór ze als klaar geldt.
- De 3D krijgt een vaste plaats; panelen schuiven ernaast (groot scherm) of eronder (tablet).
- Zware scènes (constructie, loods) worden gemeten: hoe lang duurt het tekenen op een toestel zonder sterke grafische kaart.
- De werkwijze staat in `docs/analyse-gebruiksgemak.md`, hoofdstuk 8 (taken met een teller van handelingen, vijf schermformaten).

---

## 5. Hoe het scherm eruit zou zien [inschatting]

Drie stappen in plaats van vier:

| Stap | Wat |
|---|---|
| **1 · Ontwerp** | Kies waarmee je begint: een woning (plattegrond), een raam of deur, of een vast model (carport, tuinhuis, loods, trap …). Links de keuzes, rechts altijd de 3D. |
| **2 · Bekijk** | De 3D groot: *Afgewerkt* of *Constructie*, verdieping, zon en uur, maten aan of uit, varianten naast elkaar. |
| **3 · Overzicht** | Wat er in het ontwerp zit, met beelden. Meegeven (bestand of link, PDF) en doorsturen naar Missing Link. |

De klantweergave blijft: één knop die alles verbergt wat de klant niet hoeft te zien.

---

## 6. Wat dit niet is

- **Geen berekening.** Geen stabiliteit, geen EPB, geen windlast. De bestaande controles (daglicht, veiligheidsglas, de statiek van een raam) blijven richtwaarden en "te verifiëren".
- **Geen foto.** De 3D blijft opgebouwd uit blokken met een getekende structuur. Met dak, kleuren en profielen wordt ze rijker, maar ze wordt geen foto van het huis.
- **Geen uitvoeringsplan.** De constructieweergave toont wat erin zit, niet hoe het gezaagd en gemonteerd wordt.
- **Geen prijzen**, in eerste instantie.

---

## 7. Risico's

| Risico | Wat we eraan doen |
|---|---|
| **Te breed tegelijk.** Zes productsoorten, beheer, varianten en twee toestellen samen is veel. | Vaste volgorde, één ronde tegelijk, elke ronde af vóór de volgende begint. |
| **De klant leest een voorstelling als een belofte** (bv. het aantal stijlen). | Op het scherm en op elk blad: "voorstelling, geen berekening". |
| **De constructieweergave hapert op een tablet.** | Gelijke stukken in één keer tekenen; meten vóór we verder bouwen. |
| **Recepten zonder vakman.** Hoe een carport of loods echt in elkaar zit, weet een aannemer, niet ik. | Per productsoort één aannemer die het recept naleest **[te bevestigen]**. |
| **Beheer zonder opslag.** | Eerst als bestand; het echte beheer na de keuze waar gegevens bewaard worden. |
| **Bestaande projecten breken.** | Elk nieuw veld is optioneel; een test opent oude projecten. |

---

## 8. Volgorde

| Ronde | Wat | Werk [inschatting] |
|---|---|---|
| 1 | *(loopt)* Dak, lichtkoepels, lichtinval; 3D doorsturen | – |
| 2 | **Zonder prijzen en gebruiksgemak:** Overzicht in plaats van Offerte, Werf uit het menu, bedragen uit beeld, de drie stappen; test als nieuwe gebruiker op tablet en groot scherm | M |
| 3 | **Bouwdelen en opbouw als gegevens** (hoofdstuk 3): de basis voor rondes 4, 6, 7 en 8 | M |
| 4 | **Constructieweergave** van de woning (jouw eerste keuze): houtskelet, balklaag, dakconstructie, vloeropbouw, de knop *Afgewerkt / Constructie* | L |
| 5 | **Ramen:** raster van vakken, grote glaspartijen, bijzondere vormen, dakraam en garagepoort, kleurwaaier | L |
| 6 | **Bijgebouwen in hout:** carport eerst, dan tuinhuis, poolhouse, pergola | M–L |
| 7 | **Staalbouw:** loods of hal | M–L |
| 8 | **Staal in en rond de woning:** trap, balustrade, luifel | M |
| 9 | **Meegeven:** kijkbestand, blad zonder prijzen, maten in de 3D, varianten naast elkaar | M |
| 10 | **Vloerafwerking** (legpatronen, plinten) en de rest van de afwerkingen uit de vorige analyse | M |
| 11 | **Beheer door de aannemer**, zodra vaststaat waar het bewaard wordt | L |

Ronde 3 lijkt een omweg vóór jouw eerste keuze, maar de constructieweergave bestáát uit bouwdelen en opbouwen. Wie ze overslaat, programmeert het skelet één keer voor de woning en later opnieuw voor de carport en de loods.

---

## 9. Hoe dit past bij Missing Link

Niets verandert aan de beslissing: een aparte app die de 3D doorstuurt. Elk nieuw product (carport, loods, trap) komt vanzelf mee in het 3D-pakket en in de zending, omdat die de scène doorsturen en niet het soort product. Het beheer van de aannemer en de link voor de klant zijn de twee plaatsen waar Missing Link later de natuurlijke opslag is.

---

## 10. Wat ik nog van je nodig heb

1. **Eén aannemer per productsoort** die een recept wil nalezen (houtbouw, staalbouw). Zonder vakman blijven het benaderingen.
2. **Waar wordt bewaard?** Voor de link naar de klant en voor het beheer: in Missing Link, of op een eigen server van de configurator?
3. **De volgorde wijkt af van jouw keuze.** Jij koos de constructieweergave als eerste na het dak. Ik zet er twee rondes vóór: ronde 2 (prijzen uit beeld en gebruiksgemak) en ronde 3 (bouwdelen en opbouw als gegevens). Akkoord, of wil je de constructieweergave meteen, ook als het skelet dan later opnieuw gemaakt moet worden voor carport en loods?
4. **Welk bijgebouw en welk soort loods eerst?** Een concrete klant of een voorbeeld (foto, folder) helpt meer dan een algemene beschrijving.
