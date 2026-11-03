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
5. **Modellen van de klant** (Kotor, Belize, Pula …) hebben een chaise longue zonder rugleuning, zoals afgeleid uit de foto's. Na te vragen of die chaises bij Corneille & Silence een rug hebben; dan zetten we de nieuwe keuze in het model.
6. **Delen:** een link naar de configuratie bestaat nog niet. AR is op 3/11 toegevoegd en op vraag weer weggehaald.
7. **Bestandsgrootte:** door de ingebakken 3D is de demo ±1,8 MB; voor SharePoint blijft handmatig opladen nodig.
