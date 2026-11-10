# Analyse gebruiksgemak (woningconfigurator, bouwdemo)

*Stand 1/11/2026. Gaat over de bouwdemo (`packages/bouw-web`): plattegrond, gevels, configurator, offerte en werf. Prijzen en technische waarden zijn voorbeelden; wat "te verifiëren" is, moet nog bevestigd worden.*

## 1. Doel en voor wie

De configurator wordt door drie soorten mensen gebruikt, met elk een ander doel:

| Doelgroep | Waar | Wil | Grootste drempel |
|---|---|---|---|
| **Eindklant (particulier)** | thuis of in de toonzaal, vaak samen met de verkoper | zien hoe het eruitziet en wat het kost | vaktaal, te veel keuzes, prijzen zonder btw |
| **Verkoper of plaatser** | bij de klant, op een tablet; op de werf | snel een offerte, inmeten, meerwerk laten tekenen | tekenen met de vinger, kleine knoppen, geen toetsenbord |
| **Kantoor (calculatie, werkvoorbereiding)** | pc | juiste maten, bestellijsten, glasbestelling, marge | weinig: zij kennen de begrippen |

Twee vragen sturen de analyse:
- Kan een **klant** zonder uitleg begrijpen wat hij ziet?
- Kan een **verkoper** op een tablet vlot werken?

## 2. Werkwijze

- **Taken doorlopen.** De belangrijkste taken zijn stap voor stap uitgevoerd in de demo, met het aantal handelingen per taak (klikken, slepen of typen).
- **Heuristieken van Nielsen** (tien vuistregels voor gebruiksgemak). Gebruikt zijn onder meer:
  - zichtbaarheid van de toestand;
  - taal van de gebruiker;
  - ongedaan maken;
  - fouten voorkomen;
  - herkennen in plaats van onthouden.
- **Snelle toegankelijkheidscontrole:**
  - grootte van aanraakdoelen (richtwaarde 44 × 44 px);
  - bediening met het toetsenbord;
  - labels voor schermlezers;
  - contrast.
- **Browsertests** (Playwright) op pc-formaat en op tabletformaat met aanraakscherm. Daarmee is ook gecontroleerd dat er geen knoppen kleiner dan 44 px meer zijn.

Wat nog ontbreekt: een test met echte gebruikers. Zie hoofdstuk 7.

## 3. Taken en aantal handelingen

| Taak | Handelingen | Opmerking |
|---|---|---|
| Nieuw project, één ruimte, één raam, offerte als PDF | ± 9 | Projecten → sjabloon → naam → ruimte slepen → raam klikken → offerte → afdrukken |
| **Enkel ramen** (geen woning): 5 ramen uit een maatlijst | ± 6 + plakken | sjabloon "Enkel ramen" → maatlijst plakken → toevoegen → afdrukken |
| Draairichting van een raam wisselen | 3 | raam aanklikken → draairichting kiezen |
| Afstand van een raam tot de muur aanpassen | 3 | raam aanklikken → "Muur links" intypen |
| Verdieping in zwart hout, gelijkvloers in rode steen | 5 | Gevels → hout → kleur → bereik "Verdieping" → klik |
| Woning in 3D tonen aan de klant | 2 | tab 3D → standpunt |
| Inmeting van één raam overnemen | ± 9 | 7 maten typen → overnemen (bestelmaat volgt) |
| Meerwerkbon laten tekenen | ± 6 | regel toevoegen → klant tekent → afsluiten |

De gewone taken lukken in minder dan 10 handelingen. De gevel-editor en "enkel ramen" maken twee veelgevraagde taken korter: een gevel kiezen en een offerte zonder plattegrond.

## 4. Bevindingen

Ernst: **hoog** = de klant of verkoper loopt vast of maakt een dure fout; **middel** = het werk vertraagt of geeft twijfel; **laag** = een detail.

| # | Bevinding | Ernst | Stand |
|---|---|---|---|
| 1 | **Vaktaal voor de eindklant**: draai-kip, borstwering, Uw, afstandhouder, statiek, glasmaat. | middel | Deels opgelost: de *klantweergave* verbergt statiek, afstandhouder, glasbestelling en bestellijsten. Nog te doen: een ⓘ met uitleg bij vaktermen (de tekst staat al in `docs/begrippen-bouw.md`). |
| 2 | **Te veel keuzes tegelijk** in de configurator (7 stappen, tientallen keuzes). | hoog (klant) | Nog te doen: "Meer opties" inklappen, of in de klantweergave één stap per scherm. |
| 3 | **Prijzen excl. btw** voor een particulier. | hoog (klant) | Opgelost in de klantweergave: in de configurator, de ramenlijst, de posities en de afwerkingsregels staan de prijzen incl. btw, met "incl. btw" erbij. Het totaal toont zoals op elke offerte excl. btw, btw en incl. btw. Prijzen voor consumenten tonen we best altijd incl. btw (te verifiëren in de wet). |
| 3b | **Knijpen om te zoomen verfde een muur** op een tablet: de eerste vinger verfde al bij het neerzetten. | hoog (tablet) | Opgelost: verven, pipet en raam toevoegen gebeuren pas bij het loslaten, en niet als er een tweede vinger bijkwam of de vinger verschoof. |
| 3c | **Een ruimte indelen veranderde de gevel**: de nieuwe ruimte viel terug op het standaardmateriaal. | middel | Opgelost: na indelen of "ruimte in ruimte" neemt de nieuwe ruimte het gevelmateriaal per kant over. |
| 4 | **Marges en kostprijzen zichtbaar** als de verkoper het scherm aan de klant toont. | hoog | Opgelost: de knop *Klantweergave* verbergt marge, kostprijs, prijs per m², bestellijsten en de werf. |
| 5 | **Kleine knoppen op een tablet** (onder 44 px). | middel | Opgelost: op aanraakschermen zijn knoppen, tabs, kleurstalen en tegels minstens 44 px. |
| 6 | **Tekenen op een klein scherm.** | middel | Verbeterd: zoomen, knijpen, verschuiven en *Groot scherm*. Advies: op een telefoon bekijken en inmeten, tekenen op een tablet of pc. |
| 7 | **Maten bij het plaatsen van een raam** waren niet zichtbaar (hoe ver van de muur?). | middel | Opgelost: tijdens het plaatsen en bij selectie komen de kettingmaten tot de muren, en je kunt de afstand intypen. |
| 8 | **Gebaren en sneltoetsen zijn moeilijk te ontdekken**: zoomen, Shift+klik, Alt+klik. | middel | Deels: er staat een hint onder elk tekenvlak, en als je boven een tekening scrolt, verschijnt kort hoe je zoomt (Ctrl/⌘ + scrollen). Nog te doen: een korte rondleiding (3 tips) bij het eerste gebruik. |
| 9 | **Ongedaan maken op een tablet**: in de gevel-editor kon dat alleen met Ctrl+Z. | middel | Opgelost: knop *Ongedaan maken* in de gevel-editor. In de plattegrond stond die er al. |
| 10 | **Technische foutmeldingen**, bv. "de tussenstijl buigt te ver door". | middel | Nog te doen: in de klantweergave een klantvriendelijke zin, bv. "Dit raam is te groot voor dit profiel; uw verkoper stelt een sterker profiel voor." |
| 11 | **Opslag alleen in deze browser.** Wordt de browser gewist, dan is het project weg. Een ander toestel ziet het project niet. | hoog (in productie) | Voor de demo aanvaardbaar, en *Bewaar als bestand* bestaat. In productie bewaren op de server of in Missing Link (project = offerte in het ERP). |
| 12 | **Kleuren op het scherm zijn niet de echte stalen.** | laag | Er staat een melding in de editor. Advies: foto's van echte stalen per materiaal, en de stalenkoffer blijft de referentie. |
| 13 | **Lege start** (leeg project): wat eerst? | laag | Er staat een hint. Advies: een kaart "Begin hier" met 3 stappen. |
| 14 | **Twee soorten statuslabels** (controle van het plan en status van een positie), met ongeveer dezelfde woorden. | laag | Advies: overal dezelfde drie woorden: *in orde*, *let op*, *fout*. |

**Wat goed werkt:**
- **Direct manipuleren**: slepen, klikken op een muur, en je ziet meteen het resultaat in plan, gevel, 3D en prijs.
- **Een voorbeeld vóór je klikt** in de gevel-editor (zoals de verfborstel in de bouwmodus van een bouwspel), en overal *ongedaan maken*.
- **Herkennen in plaats van onthouden**:
  - kleurstalen en tegels met een stukje textuur;
  - symbolen in de tekening, "gezien van binnen" erbij vermeld.
- **Fouten voorkomen**: controles op veiligheidsglas, valbeveiliging, maten, statiek en ventilatie. Ze tonen waar het probleem zit en je kunt erop klikken.

## 5. De klantreis

| Fase | Wat de demo nu doet | Wat ontbreekt |
|---|---|---|
| 1. Oriëntatie (website, toonzaal) | — | een eenvoudige versie voor de website (alleen kiezen, geen tekenen) |
| 2. Eerste gesprek met de verkoper | plattegrond, gevel-editor, 3D, klantweergave | varianten naast elkaar (bv. PVC tegenover aluminium) |
| 3. Offerte | PDF met plannen, gevels en posities; prijzen incl. btw | een deelbare link: de klant bekijkt de offerte thuis in 3D |
| 4. Bedenktijd | — | de klant kiest zelf tussen varianten; vragen stellen in de offerte |
| 5. Akkoord | momentopname "akkoord" | elektronische handtekening op de offerte zelf |
| 6. Inmeting | werfscherm op tablet, bestelmaat, foto | — |
| 7. Levering en plaatsing | planning in de offerte | statusberichten naar de klant (mail of sms) |
| 8. Meerwerk | meerwerkbon met handtekening | — |
| 9. Nazorg | — | onderhoudstips en garantie per positie; premie-indicatie (bv. Mijn VerbouwPremie in Vlaanderen, te verifiëren) |

## 6. Aanbevelingen, op volgorde

**Al gedaan in deze ronde:**
- klantweergave (geen marges of kostprijzen, prijzen incl. btw, technische kaarten verborgen);
- grotere knoppen op aanraakschermen;
- zoomen en groot scherm;
- maten tot de muren;
- gevel-editor met kleurstalen, voorbeeld en ongedaan maken;
- "Enkel ramen" met maatlijst plakken.

**Snel (elk ± 1 dag):**
1. ⓘ-uitleg bij vaktermen, met de tekst uit de begrippenlijst.
2. "Meer opties" inklappen in de configurator; in de klantweergave standaard ingeklapt.
3. Klantvriendelijke teksten voor fouten in de klantweergave.
4. Een kaart "Begin hier" bij een leeg project, en 3 tips bij het eerste gebruik.
5. Een herinnering om het project als bestand te bewaren, zolang er geen serveropslag is.

**Middel (1 à 2 weken):**
- varianten naast elkaar vergelijken;
- een deelbare link (alleen lezen) voor de klant;
- foto's van echte stalen;
- één stap per scherm in de klantweergave.

**Groot:**
- bewaren in Missing Link: project, offerte en akkoord;
- klantportaal met login;
- elektronische handtekening;
- premie-indicatie;
- een eenvoudige versie voor de website.

## 7. Hoe we het met echte gebruikers testen

- **Wie:** per doelgroep 5 mensen. Met 5 personen vind je de meeste grote problemen.
  - eindklanten: bv. mensen die net verbouwd hebben;
  - verkopers of plaatsers van de pilootklant;
  - mensen van kantoor.
- **Taken:** de taken uit hoofdstuk 3, zonder uitleg vooraf. De begeleider zegt niets en noteert waar iemand twijfelt.
- **Meten:**
  - lukt de taak (ja / met hulp / nee);
  - tijd per taak;
  - aantal fouten;
  - na afloop de vragenlijst *System Usability Scale* (10 vragen, score 0–100; boven 70 is goed).
- **Waar:** bij de klant thuis of in de toonzaal, op de tablet die de verkoper echt gebruikt.

## 8. Testrun in de browser (1/11/2026)

Aanleiding: "er kan niet gescrold worden in de configurator fullscreen". Daarna heb ik de hele bouwdemo als nieuwe gebruiker doorlopen in een echte browser (Chromium, via Playwright). Het script staat niet in de repository; de bevindingen en wat ik ermee deed staan hieronder.

**Methode**
- **Taken** (hoofdstuk 3) uitgevoerd op een desktop van 1440 × 900, met een teller voor het aantal handelingen (klikken, slepen, intypen) en meting van trage momenten (langer dan 50 ms).
- **Audit van elk scherm** (projecten, plattegrond, gevels, 3D, offerte, configurator, werf, ramenlijst) op vijf formaten: desktop 1440 × 900, laptop 1280 × 720, tablet landschap 1024 × 768, tablet portret 768 × 1024 en telefoon 390 × 844. Gecontroleerd op:
  - te kleine aanraakdoelen (onder 44 px; op desktop onder 24 px);
  - knoppen of velden zonder naam;
  - elementen die over elkaar liggen of buiten beeld vallen;
  - afgekapte tekst;
  - een pagina die breder is dan het scherm;
  - tekst onder 12 px en te weinig contrast (onder 4,5 : 1).
- **Toetsenbord:** 60 keer Tab, met controle op een zichtbare focusrand, plus de sneltoetsen.
- **Aanraking op een tablet** met echte aanraakgebeurtenissen: een ruimte tekenen met de vinger, een raam plaatsen met een tik, een raam met de vinger verschuiven, en het scrollen van de pagina.
- **Scrollen met het muiswiel** boven elk onderdeel, in het gewone scherm en in het groot scherm.

**Resultaat van de taken** (aantal handelingen)

| Taak | Handelingen | Gelukt |
|---|---|---|
| Nieuw leeg project, ruimte tekenen, raam plaatsen, breedte aanpassen, naar de offerte en afdrukken | 13 (5 + 2 + 2 + 2 + 2) | ja |
| Gevel verven (muurvlak, daarna hele gevel), sokkel, 3D bekijken, raam in het aanzicht verschuiven | 14 (4 + 5 + 2 + 3) | ja |
| Enkel ramen: maatlijst plakken, aanpassen, btw 6 %, klantprijs, één raam configureren | 13 (6 + 4 + 2 + 1) | ja |
| Werf: akkoord, 7 maten inmeten en overnemen, meerwerk met handtekening, klantweergave, ongedaan maken | 26 (6 + 8 + 6 + 2 + 4) | ja |

- Alle taken lukten zonder foutmelding.
- Er waren geen trage momenten, behalve het eerste opbouwen van de 3D (± 0,3 seconde, eenmalig).
- Een nieuwe gebruiker komt in ongeveer 13 handelingen van niets tot een afdrukbare offerte met één raam.

**Bevindingen en wat ik eraan deed**

| # | Bevinding | Ernst | Stand |
|---|---|---|---|
| 8.1 | **Scrolval:** het muiswiel (en twee vingers op een trackpad) boven een tekening of de 3D zoomde in plaats van de pagina te scrollen. In het groot scherm beslaat de tekening het grootste deel van het scherm, dus scrollen leek te "hangen". | hoog | **Opgelost:** gewoon scrollen scrolt de pagina; zoomen met Ctrl (⌘) + scrollen, knijpen of de knoppen. Als je toch scrolt, staat er kort een uitleg onder in de tekening. In het groot scherm zoomt het wiel wel. Geldt ook voor de zeteldemo en de 3D. |
| 8.2 | **Groot scherm paste niet op het scherm:** de kolommen (gereedschap, eigenschappen, controles) waren hoger dan het scherm en alleen met de pagina mee te scrollen. | middel | **Opgelost:** de drie kolommen scrollen zelf en de tekening vult de rest. Ook op een tablet in landschap staan er drie kolommen naast elkaar; op een smal scherm blijft er onder de tekening ruimte om te scrollen. De 3D heeft nu ook een knop *Groot scherm*. |
| 8.3 | **De hoofdknop "1 · Plattegrond" toonde soms de gevels of de 3D** (de laatst geopende weergave). | middel | **Opgelost:** hij toont altijd de plattegrond. |
| 8.4 | **Lege plattegrond zonder wegwijzer:** de hulpregel zei "klik om te selecteren" terwijl er niets te selecteren valt. | middel | **Opgelost:** het gereedschap *Ruimte tekenen* staat meteen aan, en een kaart legt uit wat je eerst doet, met een knop naar de voorbeeldwoning. |
| 8.5 | **Telefoon:** de plattegrond was 27 px breder dan het scherm (de zoomknoppen pasten niet), waardoor de hele pagina zijwaarts schoof. | hoog (telefoon) | **Opgelost:** de zoomknoppen springen naar een volgende regel. |
| 8.6 | **Aanraakdoelen onder 44 px** op tablet en telefoon: invoervelden, keuzelijsten, schuifregelaars, kleurstalen (30 px), icoonknoppen in de ramenlijst, knoppen in de werf (42 px). | middel | **Opgelost** voor aanraakschermen. Op een desktop zijn nog 9 inklapkoppen van 22 px en de schuifregelaars (16 px) kleiner dan 24 px; dat laat ik zo. |
| 8.7 | **Ramenlijst met 11 kolommen:** op een laptop, tablet en telefoon vielen *Aantal*, *Configureren*, *Dupliceren* en *Verwijderen* buiten beeld; omschrijvingen werden afgekapt. | hoog (tablet) | **Opgelost:** onder 1500 px staat elke positie als een kaartje met de velden onder elkaar; breder veld voor de omschrijving; kortere teksten bij het schuifraam. |
| 8.8 | **Projectenlijst op een telefoon:** de knoppen *Dupliceren*, *Bewaar als bestand* en *Verwijderen* stonden buiten beeld. | middel | **Opgelost:** kaartjes onder 900 px. |
| 8.9 | **Contrast:** het label "open" in de projectenlijst had 4,2 : 1 (minimaal 4,5 : 1). | laag | **Opgelost.** Alle andere tekst haalt het. |
| 8.10 | **Sneltoets-aanduidingen** (V, T, W …) waren 11,2 px. | laag | **Opgelost** (12 px). |
| 8.11 | **Toetsenbord:** de volgorde van Tab is logisch (menu, gereedschap, tekening, eigenschappen) en alle 59 geteste elementen tonen een focusrand. De tekening was niet bereikbaar met Tab. | middel | Tekening nu bereikbaar. **Nog open:** een ruimte of raam kiezen met het toetsenbord kan niet; dat kan alleen via de lijsten ernaast. |
| 8.12 | **Configurator:** 7 stappen en 39 velden tegelijk (zie bevinding 2). | hoog (klant) | **Nog open.** |

**Wat de aanraaktest liet zien:** op een tablet lukt tekenen, een raam plaatsen met een tik en een raam met de vinger verschuiven. Een vinger op de tekening verschuift de tekening en scrolt de pagina niet; dat is nodig om te kunnen tekenen. Scrollen kan op de kolommen ernaast.

**Wat deze test niet kan zeggen**
- **Echt volledig scherm:** de headless browser ondersteunt dat niet betrouwbaar (een eenvoudige testpagina scrolt er al niet overal). Ik heb daarom dezelfde opmaak getest zonder de browserfunctie. Controleer in Chrome of Safari op een echt toestel of scrollen daar nu wel goed gaat.
- **Safari en echte aanraakschermen:** niet getest. Knijpen is alleen getest zoals de code het afhandelt.
- **Begrip, smaak en vertrouwen:** een script weet niet of een klant de woorden begrijpt of het mooi vindt. Daarvoor blijft de gebruikstest met mensen (hoofdstuk 7) nodig.


## 9. Zetel-3D: controle op ontbrekende zaken en gebruiksgemak (3/11/2026)

*Testrun in de browser (computer 1440 px, groot scherm, telefoon 390 px) met de voorbeeldsofa met chaise longue en poef. Alles zonder foutmeldingen.*

### Opgelost in deze ronde
| Wat ontbrak of stoorde | Nu |
|---|---|
| In de 3D kon je niets aanklikken; een element kiezen kon alleen in het bovenaanzicht. | Klik op een deel van de zetel: dat element wordt gekozen (kader in de 3D), de eigenschappen staan eronder, ook in groot scherm. |
| In groot scherm verdwenen de prijs en de eigenschappen. | Prijs in de 3D-balk; eigenschappen blijven zichtbaar onder de 3D. |
| Geen standpunt van achteren of op ooghoogte (de knop *Achter* bestond in de code, niet op het scherm). | Knoppen *Achter* en *Ooghoogte* (zoals een staande klant de zetel ziet). |
| Geen bediening met het toetsenbord. | Pijltjes draaien, + en − zoomen, 0 = standaardbeeld; het 3D-vak is met Tab bereikbaar en heeft een uitleg voor schermlezers. |
| Geen maten in de 3D. | *Maten tonen*: breedte, diepte en hoogte met labels in cm. |
| Voor de toonzaal: de zetel stond stil. | *Automatisch draaien*, pauzeert 3 s na elke bediening. |
| Foto alleen als schermafdruk. | *Fotorealistische foto* met echte lichtberekening, voortgangsbalk en *Annuleren*. |
| Kleur in 3D week af van de staal. | Gemeten en bijgesteld (Neutral-tonemapping). |
| Chaise longue: rugleuning kon alleen als los opzet-element, zonder duidelijke prijs. | Keuze *Rugleuning* (zonder, achteraan, lange zijde links of rechts) met meerprijs; de losse knoppen *+ Rugleuning* bij de chaise zijn weg, met een verwijzing naar de keuze. |
| Selecties en knoppen onder de 3D waren op een tablet 36 px hoog. | 44 px op aanraakschermen. |

### Nog open
1. **Niet getest op echte toestellen.** *Mooi* (ambient occlusion en zachte schaduwen) en de fotomodus vragen een grafische kaart; in de testomgeving zonder grafische kaart duurt een *Mooi*-beeld ±7 s en een klein fotoproefbeeld ±2 min. Op een tablet staat standaard *Snel*. Graag testen op de toonzaaltablet en een gewone laptop.
2. **Fotomodus toont geen stofreliëf** (de lichtberekening negeert de reliëfkaarten); kleur en glans kloppen wel. Mogelijke verbetering: het reliëf omzetten naar een normal map.
3. **Stof per element in de 3D wisselen** kan via het eigenschappenvak onder de 3D; een snelle stalenstrook rechtstreeks in de 3D (zoals bij de stofkeuze bovenaan) zou nog sneller zijn.
4. **Sofa op maat** (de configurator per cm) heeft nog geen 3D, alleen de tekening; de vrije ontwerper wel.
5. ~~**Modellen van de klant** (Kotor, Belize, Pula …) hebben een chaise longue zonder rugleuning, zoals afgeleid uit de foto's.~~ Op 3/11 opgelost: op de foto's loopt de rug door achter de chaise; de chaise heeft nu standaard een rugleuning (zie 10.28).
6. **Delen:** een link naar de configuratie bestaat nog niet. AR is op 3/11 toegevoegd en op vraag weer weggehaald.
7. **Bestandsgrootte:** door de ingebakken 3D is de demo ±1,8 MB; voor SharePoint blijft handmatig opladen nodig.

## 10. Zetelconfigurator: volledige doorlichting op gebruiksgemak en logica (3/11/2026)

Aanleiding: "losse rugleuning hoogte is niet aanpasbaar" en daarna "graag de volledige configurator doorlopen op gebruiksgemak en logica". De bouwdemo had haar volledige testrun al op 1/11 (hoofdstuk 8); deze ronde gaat over de zeteldemo: **Modellen, Sofa op maat, Vrij ontwerp (boven, voor, 3D), Kast op maat, Materialen en Catalogus**.

**Methode**
- **Gebruiksgemak:** dezelfde aanpak als hoofdstuk 8. Taken uitgevoerd in een echte browser (Chromium via Playwright), met het aantal handelingen geteld. Daarnaast een audit van elk scherm op vijf formaten: computer 1440 en laptop 1280, tablet liggend en staand, telefoon 390. Gecontroleerd op aanraakdoelen, overlap, afgekapte tekst, contrast, pagina breder dan het scherm, toetsenbord (70 keer Tab) en focusrand.
- **Logica:** apart controlescripts die ontwerpen opbouwen en doorrekenen, met de vraag: "zou een verkoper of klant dit verwachten?". Doorgerekend zijn:
  - opzet-elementen en hun drager;
  - elke optiegroep (`voorTypen`, `alleenMet`, per element);
  - vrije hoogtes;
  - stofverbruik en korting;
  - maten en draaiing;
  - alle 42 modellen;
  - de grenzen van Sofa en Kast op maat.
- **3D:** de vlekken op de onderbouw van de kuipfauteuils uit de schermafbeelding van Jonas.

**Taken** (aantal handelingen, na de aanpassingen)

| Taak | Handelingen | Gelukt |
|---|---|---|
| Model kiezen, stof wisselen in de 3D, foto bewaren, offertetekst kopiëren | 4 | ja |
| Losse rugleuning op een poef zetten en 95 cm hoog maken | 4 (was 5, met een verborgen greep in het vooraanzicht) | ja |
| Sofa op maat: breedte, opstelling, offertetekst | 3 | ja |
| Eigen stof toevoegen en gebruiken in het vrij ontwerp | 4 | ja |
| Huidig ontwerp bewaren als model en terugvinden bij Modellen | 3 | ja |

Er waren geen foutmeldingen in de pagina. Herladen bewaart het ontwerp. *Alles wissen* en *Verwijder* vragen een tweede klik.

### Bevindingen gebruiksgemak en wat ermee gebeurde

| # | Bevinding (wat je ziet) | Ernst | Stand |
|---|---|---|---|
| 10.1 | **Kast op maat opende met fouten.** Na de sofa (breedte 230 cm) toonde de kast een breedte van 230 mm en meteen "2 fouten op te lossen". Beide producten hebben een veld "breedte", in cm en in mm. | hoog | **Opgelost:** elk product onthoudt zijn eigen keuzes. Wie heen en weer gaat, vindt beide terug zoals hij ze liet. |
| 10.2 | **Kostprijs en marge altijd zichtbaar**, ook als je het scherm naar de klant draait. Hetzelfde geldt voor het stofverbruik, de stuklijst en de schermen *Materialen* en *Catalogus* (met kostprijzen per meter). | hoog | **Opgelost:** knop **Klantweergave** in de kop, zoals in de bouwdemo, onthouden in de browser. Die verbergt alles wat intern is; de prijzen blijven. |
| 10.3 | **Offertetekst onvolledig.** Er stonden geen modelnaam, geen keuzes per element (armstijl, rugleuning van de chaise, vorm van de poef), geen getekende hoogtes, geen vormgeving en geen korting in. Wie de tekst in een offerte plakt, mist wat er gemaakt moet worden. | hoog | **Opgelost:** volledige omschrijving per element, plus de keuzes voor de hele zetel, de vormgeving, de korting en de prijs. Waarop een kussen ligt, staat erbij ("op element 5"). Code: `core/src/ontwerptekst.ts`, met tests. |
| 10.4 | **Losse rugleuning: hoogte niet in te vullen.** Het kon alleen met een greep in het vooraanzicht, die bijna niemand vindt. | middel | **Opgelost:** veld *Hoogte (cm)* bij het element. Het geldige bereik staat erbij: minstens 20 cm boven waar ze op rust, hoogstens 110 cm. Vooraanzicht, 3D en prijs volgen dezelfde berekening (`draagHoogteVan`, `rugleuningTop`). |
| 10.5 | **Het menu verspringt.** Naargelang de lengte van de titel ("Modellen" of "Zetel vrij ontwerpen") stond het menu op één of twee regels. Je klikt dan naast de knop die je zocht. | middel | **Opgelost:** het menu staat altijd op dezelfde plaats; titel en klantkeuze staan erboven. De huisstijlversie blijft gecentreerd. |
| 10.6 | **Dupliceren:** de rugleuning en kussens op een element gingen niet mee. De kopie kwam vaak over een ander element te liggen, met een fout. | middel | **Opgelost:** wat erop ligt gaat mee, en de kopie zoekt een vrije plaats (rechts, links, eronder, erboven, anders naast de zetel). |
| 10.7 | **Verwijderen van een poef of zitting:** de rugleuning en kussens bleven zweven, met de fout "ligt niet op een zitting". | middel | **Opgelost:** ze gaan mee weg. *Ongedaan maken* zet alles terug. |
| 10.8 | **"(per element)"** achter *Poten*, *Zitcomfort*, *Rug*, *Rughoogte* en *Naden* las als "per element te kiezen". In werkelijkheid is het één keuze voor de hele zetel, per element aangerekend. | middel | **Opgelost:** de toevoeging is weg en de meerprijs toont "+€12 per element". |
| 10.9 | **Een stof verwijderen die in je ontwerp zit:** die werd zonder melding vervangen door de eerste stof van de lijst, en de prijs veranderde mee. | middel | **Opgelost:** de knop vraagt "In gebruik: toch weg?". Elementen met die stof volgen daarna weer het hoofdmateriaal. |
| 10.10 | **Elemententabel:** de prijs per element viel buiten de kolom. Bovendien stond de prijs in de tabel vóór korting, en bij het gekozen element na korting. | middel | **Opgelost:** de stof staat onder de naam, de prijs is zichtbaar, en overal geldt dezelfde prijs (na korting). |
| 10.11 | **Tablet:** 117 knoppen, keuzes en velden waren 27–39 px hoog (*Bewerk* 27 px, menu 39 px). Op een aanraakscherm moet dat minstens 44 px zijn. | middel | **Opgelost** voor aanraakschermen: alle knoppen, keuzes, velden, stalen, inklapkoppen en zoomknoppen. Bij de laatste audit waren er op tablet en telefoon nog 0 te kleine doelen. |
| 10.12 | **Telefoon:** *Vrij ontwerp* was 31 px breder dan het scherm. De zoomknoppen pasten niet, dus de hele pagina schoof zijwaarts. | middel | **Opgelost:** de zoomknoppen lopen door naar een volgende regel. |
| 10.13 | **Kussens toevoegen:** het 2e en 3e sierkussen kwamen op dezelfde plaats. Een rol- of rugkussen kreeg op een smal element meteen een maatfout. | middel | **Opgelost:** kussens van dezelfde soort liggen naast elkaar en zijn even breed. Past er geen meer bij, dan staat de knop uit ("past niet meer"). |
| 10.14 | **Kuipfauteuils:** vlekken en strepen op de onderbouw. De buitenkant van de wand en de zijkant van de onderbouw lagen op exact dezelfde plaats. | middel | **Opgelost:** de onderbouw ligt 0,8 cm binnen de wand. |
| 10.15 | **Materialenlijst:** de knoppen *Bewerk* en *Verwijder* vielen buiten beeld, ook op een computer. | laag | **Opgelost:** ze blijven rechts in beeld, ook als de tabel zijwaarts schuift. |
| 10.16 | **Particulier** zag "korting 20 %" staan (grijs) zonder die te krijgen. | laag | **Opgelost:** het veld staat er alleen bij een interieurinrichter. |
| 10.17 | **Sofa op maat breder dan 340 cm:** naast de fout bij het veld kwam ook "geen prijs gevonden in de prijstabel". | laag | **Opgelost:** alleen nog de fout bij het veld. |
| 10.18 | **Catalogus:** "gebruikt in een model" zonder aantal, en zonder uitleg waarom het element niet weg kan. | laag | **Opgelost:** bv. "gebruikt in 22 modellen (daarom niet te verwijderen)" bij het zitelement. |
| 10.19 | **Kleine tekst** "foto website" en "onze benadering" (10,9 px) op de modelkaarten. | laag | **Opgelost** (12 px, donkerder). |

### Bevindingen logica (rekenmotor) en wat ermee gebeurde

| # | Bevinding | Ernst | Stand |
|---|---|---|---|
| 10.20 | **Rughoogte dubbel aangerekend.** Wie in het vooraanzicht een rug van 92 cm tekende én de keuze *Hoog* had, betaalde twee keer: +98 € in plaats van +49 €, en ook dubbel stof. | hoog | **Opgelost:** een getekende rughoogte vervangt de keuze en wordt per cm aangerekend. |
| 10.21 | **Getekende zit-, poot- en armhoogte veranderden de prijs niet.** Een getekende zithoogte van 55 cm kostte niets, de keuze *Hoog (48 cm)* +60 €. | middel | **Opgelost:** een getekende hoogte telt als de keuze met de dichtstbijzijnde hoogte, in de prijsopbouw als "55 cm (op maat)". |
| 10.22 | **Rugopties op een chaise longue zonder rugleuning.** *Losse rugkussens*, *dons*, *capitonnage* en *rughoogte* werden aangerekend op een chaise die geen rug heeft (geen rug in de tekening, wel in de prijs). Dit raakte de modellen Kotor, Belize, Fréjus en Pula. | hoog | **Opgelost:** geen rugopties zonder rug. Sinds 10.28 hebben Kotor, Belize, Fréjus en Pula wel een rug achter de chaise, dus daar tellen de rugopties terecht. |
| 10.23 | **Vormgeving aangerekend zonder zichtbaar effect, en omgekeerd.** <br>• Zonder effect: een houten frame op een hoekelement, afgerond eindelement of fauteuil; 3 zitkussens op een afgerond eindelement; een ronde rug op een fauteuil. Je betaalde, maar de 3D toonde niets. <br>• Omgekeerd: een chaise met rug kreeg rugvorm, rugdikte en rughoogte gratis. | middel | **Opgelost:** prijs en 3D volgen dezelfde tabel (`vormEffect`). De *Ontwerpmodus* toont per element alleen wat bij dat element zichtbaar is. |
| 10.24 | **Kussens en rugleuningen "lagen" overal op.** <br>• Elke overlap telde: een rugleuning die 1 cm op een zitting lag, zweefde in de 3D. <br>• Een rugleuning op een houten tussenstuk of armleuning werd aanvaard. <br>• Twee rugleuningen op elkaar gaven geen melding. | middel | **Opgelost:** een opzet-element moet voor meer dan de helft op een zitting liggen (niet op een arm of tussenstuk). Twee dezelfde op elkaar geven een fout. Een losse rugleuning op een element dat al een rug heeft, geeft een waarschuwing. |
| 10.25 | **Korting zonder bewaking.** Bij 25 % korting op het startontwerp was de marge −3,7 %, zonder melding. De motor aanvaardde ook 150 % (een negatieve prijs). | middel | **Opgelost:** onder de kostprijs verschijnt een **interne** waarschuwing, die verborgen is in de klantweergave. De korting ligt altijd tussen 0 en 100 %. |
| 10.26 | **Keuzes voor de hele zetel** rekenden ook op elementen waarvoor ze niet gelden. Zo telde *Vaste zitting* (−3 %) ook op een poef en een houten tussenstuk. | middel | **Opgelost:** alleen op de elementen waarvoor de keuze geldt. |
| 10.27 | **Onmogelijke hoogtes aanvaard:** <br>• een rug van 55 cm bij een zithoogte van 55 cm; <br>• een arm onder de zitting; <br>• poten en zitkussen die geen plaats laten voor de onderbouw (de 3D liet die gewoon weg). | middel | **Opgelost:** duidelijke foutmelding, bv. "de rug (55 cm) moet minstens 20 cm boven de zitting (55 cm) uitkomen". |
| 10.28 | **"De chaise longue heeft nog steeds geen rugleuning"** (melding van Jonas na deze ronde). De keuze *Rugleuning* bestond wel bij het element, maar de standaard was *Zonder rugleuning*. Dat gold ook in de modellen en het startontwerp. Op de productfoto's van Kotor, Belize, Pula en Fréjus loopt de rug (met rugkussens) gewoon door achter de chaise, en *Sofa op maat* tekende ze ook zo. | hoog | **Opgelost:** <br>• De chaise longue heeft standaard een rugleuning achteraan, in de basisprijs. <br>• *Zonder rugleuning (open)* is een keuze met minprijs (−210 €); *lange zijde links/rechts* (méridienne) kost +80 €. <br>• Kotor, Belize, Pula en Fréjus hebben een rug achter de chaise. Azar blijft open, want op de foto is de chaise daar een open uiteinde (benadering). <br>• Een catalogus die al in de browser bewaard was met de oude standaard, wordt bijgewerkt. |

In orde bevonden:
- alle 42 modellen zijn geldig, met een prijs groter dan nul;
- draaiing (0/90/180/270) geeft dezelfde prijs, kost en stof;
- min/max van de elementen, de 10 cm-klassen en de dieptetoeslag kloppen;
- de stofberekening klopt: patroonrapport, rolbreedte, eigen stof, afronding op 0,1 m;
- de `alleenMet`-combinaties kloppen;
- de grenzen en regels van Sofa en Kast op maat kloppen;
- korting 0–100 %: excl. + btw = incl.

Nieuwe tests: `test/omschrijving.test.ts` (6) en `test/logica.test.ts` (13), plus 1 in `test/motor.test.ts`, 1 in `test/chaise.test.ts` en 1 in `test/modellen.test.ts` (chaise met of zonder rug per model). In totaal **199 tests groen**.

### Nog open (met voorstel)
1. **Studio-decor: harde horizon** waar de vloer overgaat in de achtergrond (schermafbeelding van Jonas). Voorstel: de vloer naar de rand toe laten overlopen in de achtergrondkleur.
2. **Afgeronde kuipfauteuil: de rug staat als een bult op de armen.** Voorstel: een vlak stuk bovenaan de rug en een zachtere overgang naar de armen. Eerst naast de productfoto's leggen: het blijft een benadering.
3. **Logica die een keuze of gegevens van de klant vraagt:**
   - *Sofa op maat:* linnen met een contrast in leder is goedkoper dan volledig leder, want de ledertoeslag van 15 % valt weg. Een contrast in dezelfde stof kost toch +5 %. Na te kijken met de echte prijslijst.
   - *Kast op maat:* 400 mm hoog met 12 legplanken is geldig (±4 mm tussen de planken). 1201 mm breed geeft 3 draaideuren op 2 vakken. Regels toe te voegen.
   - Leder wordt geteld in lopende meter, zoals stof: geen m², huiden of snijverlies.
   - Kleinere punten:
     - plint of verdekte poten met een getekende poothoogte;
     - notelaar aangerekend bij een metalen slede, waar geen hout te zien is;
     - de btw is soms 1 cent lager door afronding per regel;
     - de leveringswaarschuwing telt een losse poef mee in de breedte;
     - de Martindale-waarschuwing verschijnt ook als de stof alleen op een sierkussen zit.
4. **Stalenkaart met het toetsenbord:** 60 stalen betekent 60 keer Tab. Een schermlezer hoort "Mosterd" twee keer, zonder de collectie. Voorstel: pijltjestoetsen binnen de stalenkaart, en de volledige naam.
5. **Geen "opnieuw"** naast *Ongedaan maken*.
6. **Stalenkaart in de smalle linkerkolom:** de namen onder de stalen zijn 11 px en soms afgekapt. De volledige naam staat wel in de keuzelijst erboven en in de tooltip.
7. **Eigenschappen** van het gekozen element staan onder de tekening: op een laptop moet je scrollen.
8. **Niet getest op echte toestellen** (de toonzaaltablet, een iPhone) **en niet met echte gebruikers** (zie hoofdstuk 7).


## 11. Zeteldemo: menustructuur gestroomlijnd (3/11/2026)

Aanleiding: "kunnen we de menustructuur even kritisch bekijken naar overzicht? graag stroomlijnen". Uitgangspunt: alles herschikken voor overzicht en volgorde, niets weglaten. Elke vroegere bestemming blijft bereikbaar in hoogstens twee klikken, en oude adressen (`#materialen`, `#catalogus`, …) werken nog.

**Kritische blik op de oude structuur**
- Zes gelijke knoppen bovenaan die drie soorten dingen mengden, zonder volgorde en zonder eindpunt:
  - de verkoop: *Modellen*, *Vrij ontwerp*;
  - andere configurators: *Sofa op maat*, *Kast op maat* (een ander product);
  - beheer: *Materialen*, *Catalogus*.
- *Vrij ontwerp*, linkerkolom:
  - 14 tekenknoppen zonder groepering;
  - altijd 5 startopstellingen, ook als je van een model vertrok;
  - *Ongedaan maken* helemaal onderaan, onder 60 stalen;
  - *Alles wissen* deed hetzelfde als de startopstelling *Leeg tekenvlak*.
- Onder de tekening twee aparte kaarten (*Vormgeving van het model* en *Aanpassingen voor de hele zetel*). De ontwerpmodus stond even prominent als de gewone keuzes.
- De groep "Particulier / Interieurinrichter" had geen titel: niet duidelijk dat ze over de prijs gaat.

**Nieuwe structuur**

| Waar | Vroeger | Nu |
|---|---|---|
| Hoofdmenu | Modellen · Sofa op maat · Vrij ontwerp · Kast op maat · Materialen · Catalogus | **1 · Modellen · 2 · Ontwerpen · 3 · Offerte** │ *Andere configurators:* Sofa op maat · Kast op maat │ **Beheer** |
| Prijs | Particulier / Interieurinrichter | **Prijs voor:** Particulier / Interieurinrichter (korting) · *Klantweergave* |
| Beheer | twee knoppen in het hoofdmenu | één knop met tabbladen **Stoffen · Elementen · Opties · Modellen · Delen**; onthoudt het laatste tabblad; verborgen in de klantweergave |
| Ontwerpen, links | Teken (14 knoppen) · Start van (5) · Hoofdmateriaal · Stalenkaart · Ongedaan maken · Alles wissen · Sneltoetsen | modelnaam met **↶ Ongedaan maken** bovenaan · **Elementen** in groepen (*Zittingen*, *Armen en tussenstukken*, *Op een zitting*) · **Stof** (hoofdmateriaal en stalenkaart) · **Opnieuw beginnen met …** (ingeklapt, open bij een leeg tekenvlak, vraagt een tweede klik als er een ontwerp is) · Sneltoetsen |
| Ontwerpen, onder de tekening | twee kaarten | één kaart *Aanpassingen voor de hele zetel*, met de **ontwerpmodus** ingeklapt onderaan |
| Ontwerpen, rechts | Prijs · Kopieer offertetekst · Elementen | Prijs · **Naar offerte →** · Kopieer offertetekst · Elementen (een houten tussenstuk toont de houtafwerking) |
| **3 · Offerte** (nieuw) | — | bovenaanzicht, vooraanzicht en het 3D-beeld; hoofdstof; elementen; afwerking voor de hele zetel; prijs (excl., btw, totaal; kostprijs en marge alleen intern); meldingen; *Afdrukken of bewaren als PDF*, *Kopieer offertetekst*, *← Terug naar ontwerpen*. Op papier staan nooit kostprijs of marge; in de huisstijlversie staat de merknaam bovenaan. |

De groepering van de elementknoppen volgt de soort element (`tekenstijl`). Een zelf toegevoegd element uit de catalogus komt dus vanzelf in de juiste groep, of onder *Overige*.

**Gecontroleerd**
- Alle weergaven en oude adressen openen het juiste scherm.
- *Beheer* onthoudt het laatste tabblad.
- De klantweergave verbergt *Beheer*; `#catalogus` in de klantweergave gaat naar *Modellen*.
- Audit op vijf formaten: geen pagina breder dan het scherm, geen te kleine aanraakdoelen op tablet en telefoon, alle knoppen met een naam, geen paginafouten.
- Op de telefoon staan de drie stappen op één rij en de andere knoppen op een tweede rij (ook in de huisstijl).
- 199 tests groen.

**Beslissingen voor Jonas**
1. ***Kast op maat*** is geen zetel. Verbergen in de versie in de huisstijl van Corneille & Silence? En *Sofa op maat*, nu het model-gebaseerde ontwerpen het hoofdpad is?
2. **Offerte:** is dit overzicht wat je bij de klant wil tonen en afdrukken? Volgende stap zou een offertenummer en klantgegevens zijn, en later het doorsturen naar Missing Link.


## 12. Zetelconfigurator onder handen genomen (10/11/2026)

Aanleiding: "Neem je onze zetelconfigurator nog eens volledig onder handen? Graag stroomlijnen, 3D-engine verbeteren, meer functies toevoegen." De meubelmaker met de zetelconfigurator is de eerste opstart (beslist 10/11), dus de keuzes mikken op de toonzaal: sneller zien wat je doet, een offerte op naam van een klant, en een ontwerp kunnen terugvinden.

**Stroomlijnen**

| Vroeger | Nu |
|---|---|
| De 3D zat achter een tabblad: tijdens het tekenen zag je ze niet. | **3D-voorbeeld naast de tekening**: op een breed scherm staat de 3D klein in de rechterkolom, boven de prijs, en volgt wat je tekent. *Vergroten* opent het tabblad 3D, *Verbergen* zet het voorbeeld uit (onthouden). Op een tablet of smal scherm staat het niet aan (de rechterkolom staat daar onderaan). |
| Alleen *Ongedaan maken* (open punt 10.5). | **Opnieuw** ernaast, Ctrl+Y of Ctrl+Shift+Z. |
| Een andere kleur van dezelfde stof: terug naar de stalenkaart links (open punt 9.3). | **Stalenstrook onder de 3D**: de kleuren van de collectie die nu op de zetel ligt. Eén klik wisselt de kleur, voor de hele zetel of voor het gekozen element; *Hele zetel* laat het element los. |
| De rechterkolom kon langer worden dan het scherm. | De kolom schuift zelf, zodat de prijs en de elementenlijst bereikbaar blijven. |

**3D-engine**

| Vroeger | Nu |
|---|---|
| Een standpunt kiezen was een sprong; draaien stopte abrupt. | De camera **glijdt** in ±0,4 s naar het standpunt en **loopt zacht uit** als je met een zwaai loslaat. Wie in het besturingssysteem "minder beweging" kiest, krijgt geen animatie. |
| Je kon alleen draaien en zoomen. | **Verschuiven**: rechtermuisknop, Shift + slepen of twee vingers. **Dubbelklik** op een deel zoomt erop in; nog eens (of naast de zetel) gaat terug naar het geheel. Een standpunt kiezen zet het beeld weer in het midden. |
| Alleen linnen en velours hadden een echte reliëf- en glanskaart; de andere weefsels een eenvoudiger reliëf dat de fotomodus niet toont. | **Alle negen weefsels** (ook effen, bouclé, chenille, wol, rib, jacquard, leder) hebben een reliëf- en glanskaart, vier keer fijner getekend. In het gewone beeld is de winst klein: het weefsel is scherper van dichtbij, van op afstand zie je geen verschil. De fotomodus kan het reliëf van elke stof nu lezen (het oude reliëf negeerde ze); of dat zichtbaar beter is, moet op de M5 blijken (zie *Getest*). |
| Het 3D-beeld in de offerte was zo groot als het vak op het scherm. | Een eigen opname van 1400 px breed: scherp op papier, ook als de 3D klein naast de tekening stond. |

Gecontroleerd: de beeldvergelijking gaf 0,00 % verschil op alle tien beelden, zowel na de camerawijziging als na de weefselkaarten. Op de afstand van die testbeelden is het weefsel dus niet te onderscheiden van vroeger; het verschil zit alleen in het beeld van dichtbij. De referentiebeelden zijn niet gewijzigd.

**Meer functies**

| Functie | Wat |
|---|---|
| **Mijn ontwerpen** | *Bewaren* bij 2 · Ontwerpen bewaart het ontwerp onder een naam (voorstel: model en klant). Zelfde naam = bijwerken, andere naam = als nieuw ontwerp. De status toont of er sinds het bewaren iets veranderd is. Bij 1 · Modellen staat het tabblad *Mijn ontwerpen* met tekening, klant, prijs en datum: openen, dupliceren, verwijderen. Hoogstens 60 ontwerpen. |
| **Als bestand** | Een ontwerp bewaren als `.zetel.json` en op een ander toestel openen (*Open uit bestand*). Het bestand wordt nagekeken tegen de catalogus en de stoffen van dat toestel: een onbekend element wordt geweigerd met de reden, een onbekende stof wordt vervangen en gemeld. Dit vervangt voorlopig "een link naar de configuratie" (open punt 9.6). |
| **Klant en offerte** | Op 3 · Offerte: naam, adres, e-mail en telefoon van de klant, een eigen referentie (bv. Z-261110-01), geldigheid in dagen met de einddatum, levertermijn en een opmerking. Alles staat op de afdruk en in *Kopieer offertetekst*, en gaat mee bij het bewaren. *Nieuwe klant* maakt de velden leeg. Antwoord op beslissing 11.2. |

**Wat je moet weten**

- Bewaarde ontwerpen en klantgegevens staan **in de browser van dat toestel**, zoals de stoffen en de catalogus. Wordt de browser gewist, dan zijn ze weg; een ander toestel ziet ze niet. *Als bestand* is de reservekopie. Delen tussen toestellen vraagt de server (stap 2 van het stappenplan).
- De **referentie** is een eigen kenmerk van de demo. Het echte offertenummer komt later uit Missing Link.
- Kiest de verkoper voor dezelfde klant een ander model, dan blijven de klantgegevens staan en krijgt de offerte een nieuwe referentie.

**Getest**

- In de browser (1440 px, zonder grafische kaart): tekenen met het 3D-voorbeeld, ongedaan en opnieuw, standpunten, dubbelklik, verschuiven, uitloop, stalenstrook, bewaren, bijwerken, als nieuw bewaren, dupliceren, verwijderen, bestand bewaren en weer openen, een fout bestand, de offerte op het scherm en als afdruk. Geen foutmeldingen.
- Elk weefsel van dichtbij, vóór en na naast elkaar. Bouclé is na de eerste proef bijgesteld (dieper reliëf).
- De fotomodus met een ribstof, korte proef (8 stappen, 640 px): de foto komt er zonder fouten of zwarte vlakken, maar is bij zo weinig stappen te korrelig om het reliëf te beoordelen.
- **Niet getest:** op de M5 in de toonzaal (WebGPU, en een volledige fotorealistische foto met de nieuwe weefselkaarten), op een tablet (twee vingers verschuiven), en met echte gebruikers.

**Nog open, als voorstel voor een volgende ronde**

1. **Opties per model beperken** (open punt 3 in de overdracht): nodig voor de echte collectie; wacht op de gegevens van de klant.
2. **Aanpassingen voor de hele zetel** blijft een lange lijst keuzes. Voorstel: per groep alleen de gekozen waarde tonen en openklappen bij een klik.
3. **Eigenschappen van het gekozen element** staan nog onder de tekening (open punt 10.7).
4. **Twee ontwerpen vergelijken** (prijs en beeld naast elkaar) vanuit Mijn ontwerpen.
5. **Meerdere zetels in één offerte** (sofa en fauteuil voor dezelfde klant): de motor voor offertes met posities bestaat al in de bouwdemo.
6. **Armen en rug met een eigen vorm**: rolarm, Engelse en schuine arm zijn nog balken (zie `docs/zachte-vormen.md`).

