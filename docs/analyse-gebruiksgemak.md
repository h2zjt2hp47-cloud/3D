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
| 3 | **Prijzen excl. btw** voor een particulier. | hoog (klant) | Opgelost in de klantweergave: de prijs per positie staat incl. btw. Prijzen voor consumenten tonen we best altijd incl. btw (te verifiëren in de wet). |
| 4 | **Marges en kostprijzen zichtbaar** als de verkoper het scherm aan de klant toont. | hoog | Opgelost: de knop *Klantweergave* verbergt marge, kostprijs, prijs per m², bestellijsten en de werf. |
| 5 | **Kleine knoppen op een tablet** (onder 44 px). | middel | Opgelost: op aanraakschermen zijn knoppen, tabs, kleurstalen en tegels minstens 44 px. |
| 6 | **Tekenen op een klein scherm.** | middel | Verbeterd: zoomen, knijpen, verschuiven en *Groot scherm*. Advies: op een telefoon bekijken en inmeten, tekenen op een tablet of pc. |
| 7 | **Maten bij het plaatsen van een raam** waren niet zichtbaar (hoe ver van de muur?). | middel | Opgelost: tijdens het plaatsen en bij selectie komen de kettingmaten tot de muren, en je kunt de afstand intypen. |
| 8 | **Gebaren en sneltoetsen zijn moeilijk te ontdekken**: zoomen, Shift+klik, Alt+klik. | middel | Deels: er staat een hint onder elk tekenvlak. Nog te doen: een korte rondleiding (3 tips) bij het eerste gebruik. |
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
