# De 3D van de bouw in Missing Link, en meer afwerkingen — analyse (15 november 2026)

Vraag van Jonas (15/11): *"latere fase, kunnen we de 3D voor de bouw klaar maken om in te bouwen in missing link? Graag nog wat extra mogelijkheden in bouwen qua afwerkingen enzo eerst analyse maken"*.

Dit is alleen een analyse. Er is niets aan de bouwdemo gewijzigd.

> **Hoe lees je de labels?**
> - **[code]**: vandaag vastgesteld in de code of gemeten op de bundel.
> - **[Missing Link]**: vandaag vastgesteld in de API van Missing Link (alleen gelezen; in dit document staan alleen veldnamen, geen gegevens van klanten).
> - **[inschatting]**: mijn redenering, geen feit.
> - **[te bevestigen]**: moet de ontwikkelaar van Missing Link of een leverancier bevestigen.
>
> Werk: **S** = enkele dagen, **M** = één à twee weken, **L** = meer (zoals in `docs/analyse-bouw-woning-demo.md`).

## In het kort

1. **Ja, het kan, en de 3D staat er dichter bij dan je zou denken.** De 3D bestaat nu al uit drie lagen die elkaar weinig nodig hebben: de motor rekent uit wat er staat, geeft dat door als gewone gegevens, en een kijker tekent het. Die kijker kent de bouw niet; hij tekent wat hij krijgt.
2. **Wat nog niet klaar is om in te bouwen**, zijn vijf zaken: de kijker woont in de map van de zeteldemo, alles wordt in de browser bewaard, de catalogus en de prijzen staan vast in de code, de fotomodus van de zetels weegt nutteloos mee, en er is geen vaste afspraak over wat erin en eruit gaat.
3. **Advies voor het inbouwen:** begin met een *ingesloten pagina* die met Missing Link praat via berichten. Dat werkt los van de techniek waarin Missing Link gebouwd is, en hetzelfde pakket blijft ook op zichzelf draaien (de beslissing van 31/10).
4. **Afwerkingen:** de demo kent nu 8 gevelmaterialen, 7 vloeren, 8 wandafwerkingen, 5 binnendeuren en een vrij volledig raam. Er ontbreekt vooral: het dak, de volledige kleurwaaier voor schrijnwerk, afwerking per wand, plinten en plafonds, buitenaanleg. Hieronder staan 24 uitbreidingen met mijn top 5.
5. **De belangrijkste stap voor beide vragen is dezelfde:** van elke afwerking gegevens maken (code, naam, kleur, eenheid, artikel) in plaats van programmacode. Dan is een afwerking toevoegen in Missing Link een artikel toevoegen, geen programmeerwerk.

Onderaan staan vijf beslissingen voor jou.

---

## 1. Wat is "de 3D van de bouw" vandaag? [code]

Er zijn drie 3D-beelden: **de woning** (alle verdiepingen, gevels, ramen, vloeren, wanden, meubels), **één raam of deur** in een stuk gevel, en **de aanbouw** (het eerste bouwmodel: een aanbouw met raampartij, gevel en plat dak).

| Laag | Waar | Wat ze doet | Klaar om in te bouwen? |
|---|---|---|---|
| **Motor** | `packages/core` (`plattegrond3D`, `raamScene`, `bouwAanbouw3D`) | Rekent uit het plan en de keuzes een lijst *blokken* uit: plaats, maat, materiaal, kleur. Gewone gegevens, geen 3D-bibliotheek. | Ja. Weet niets van schermen of van Missing Link. |
| **Kijker** | `packages/demo-web/src/drie-d.ts` (2 548 regels) | `maak3D(plaats)` geeft een kijker met `toon(scène)`, standpunten, kwaliteit, een beeld als PNG, een element aanduiden. Dezelfde kijker als bij de zetels. | Bijna. Hij staat in de map van de zeteldemo en sleept de fotomodus mee. |
| **Schermen** | `packages/bouw-web/src` | Plattegrond, configurator, offerte, werf. Bewaren in de browser. | Nee. Gebouwd als demo in één bestand. |

**Gewicht, gemeten op de bundel van vandaag:**

| Onderdeel | Grootte |
|---|---|
| Hele bouwdemo (programma) | 2 484 kB, verpakt verstuurd 699 kB |
| waarvan de 3D-bibliotheek three.js | 1 490 kB |
| waarvan de fotomodus van de zetels (path tracer en ontruiser) | 615 kB |
| waarvan de kijker zelf | 67 kB |
| waarvan de motor en de modellen | 156 kB |
| waarvan alle schermen van de bouw samen | ± 110 kB |
| **Enkel de kijker met de opbouw van woning en raam** | 2 276 kB, verpakt 630 kB |

Wat dit zegt: three.js is 60 % van het programma, en samen met de fotomodus 85 %. Alle schermen van de bouw samen zijn nog geen 5 %. Wie alleen de 3D wil inbouwen, haalt dus bijna de hele demo binnen (92 %). De fotomodus (615 kB) wordt in de bouwdemo nergens opgeroepen; ze kan eruit of pas geladen worden als iemand erop klikt. Dan blijft er ± 1,7 MB over.

**Wat de 3D toont:** muren met een ander materiaal buiten en binnen, sokkel, dakrand, vloerplaten met trapgat, plat dak, ramen en deuren met kader, vleugels, glas, afstandhouder, greep, zonwering, vensterbank en dorpel, binnendeuren (open), vloeren en wanden per ruimte, meubels, trap. "Muren laag" en "tot verdieping" om binnen te kijken.

**Wat ze niet toont** (bekende grenzen): hellende daken, schuine of ronde muren, plafonds, buitenaanleg. De 3D is schematisch (blokken met een getekende structuur), geen fotorealistisch huis. Raamprofielen zijn rechte balken (zie het advies van 4/11 in `docs/3d-technieken.md`).

**Bewaking:** de vaste controlebeelden bewaken de bouw met twee beelden (woning en raam). Voor een verbouwing van de kijker is dat te weinig.

---

## 2. Wat Missing Link vandaag heeft [Missing Link]

Opnieuw nagekeken op 15/11 (de vorige keer was 31/10). Nieuw of nu pas gezien:

| Onderdeel | Wat ik zag | Nut voor het inbouwen |
|---|---|---|
| **Modules** | Projecten, planning, kansen, calculaties, offertes, orders, backorders, leveringsbonnen, werkbonnen, bestellingen, aankoopfacturen, facturen, creditnota's, betalingen, artikels, uurtarieven, samengestelde artikels, machines, voorraad | De hele ketting na de offerte bestaat: order, bestelling, planning, werkbon. |
| **Project** | werfadres en werfcontact, fase, hoofdproject en deelprojecten, btw-regime, projectleider, eerste planning, cijfers (geofferteerd, aanvaard, besteld, geleverd, gefactureerd) | Een woning of een ramenproject **is** een project. Meerwerk past als deelproject. |
| **Offerte** | `toestand`, versies (`versie_van_id`), `fotos_bij_regels`, `prijzen_tonen`, `subtotaal_per_titel`, `verkoopwijze`, voorschrijver, `kans_id`, `standaard_project_id`, voorschotschema, `etag` | Alles wat onze offerte doet (versies, voorschot, beelden bij de regels) heeft een plaats. |
| **Offerteregel** | `kop`, `niveaunummer`, `tekst`, `tekst_opmaak`, `beeld_id`, `optioneel`, `keuzegroep`, `optie_sleutel`, `vereist_sleutel`, `berekening`, `maat`, `stuks`, `lengte`, `breedte`, `hoogte`, `afrondingsstap`, `minimum_aangerekend`, `project_id`, `herkomst_prijsberekening_id`, `onderdelen_tonen`, `klantprijs`, `nieuwe_bladzijde` | Een positie (raam P1) wordt een kop met regels eronder; het beeld gaat in `beeld_id`; een variant wordt een optionele regel in een keuzegroep. |
| **Wie ben ik** | geeft ook de huisstijl van de firma (kleuren voor actie en zijbalk) en het logo | De ingebouwde 3D kan de kleuren van de firma overnemen zonder instelwerk. |
| **Samengestelde artikels en calculaties** | bestaan, maar zijn nog leeg | Hier zou de catalogus van afwerkingen en de stuklijst terechtkomen. |

**Niet gevonden, dus een vraag** [te bevestigen]:
- een plaats om de configuratie zelf te bewaren (het plan en de keuzes, als gegevens);
- hoe je een beeld oplaadt om het aan `beeld_id` te hangen;
- de betekenis van `keuzegroep`, `optie_sleutel`, `vereist_sleutel` (actiepunt 0.3 uit het stappenplan staat nog open).

**Wat ik niet kan zien:** de voorkant van Missing Link (in welke techniek de schermen gebouwd zijn, waar de pagina's staan, hoe je aanmeldt). Dat bepaalt mee hoe we inbouwen; zie de vragenlijst in hoofdstuk 8.

---

## 3. Wat betekent "inbouwen"? Drie niveaus

| Niveau | Wat de gebruiker ziet | Wat ervoor nodig is | Werk |
|---|---|---|---|
| **A. Kijken** | In een project of offerte in Missing Link staat de 3D van de woning of van het raam. Draaien, zoomen, verdieping kiezen. Niets wijzigen. | De kijker als los pakket, de configuratie ergens bewaard, een scherm in Missing Link dat ze toont. | S–M |
| **B. Configureren** | Vanuit een project opent de hele configurator (plattegrond, raam, gevels) binnen Missing Link. "Klaar" zet de posities als regels in de offerte, met beeld. | A + bewaren in Missing Link in plaats van in de browser + offerteregels wegschrijven. | M–L |
| **C. Volledig** | Artikels, prijzen en klantkorting komen uit Missing Link. Vanuit de configuratie volgen bestelbon per leverancier, planning en werkbon. | B + catalogus en prijzen van buiten + de stuklijst doorgeven. | L |

**Spanning met de beslissing van 31/10.** Toen is beslist: *een aparte applicatie, koppelbaar met Missing Link*, die ook zonder Missing Link verkocht kan worden. "Inbouwen" lijkt daar tegenin te gaan, maar dat hoeft niet: één pakket kan op zichzelf draaien én in een scherm van Missing Link getoond worden. Dat is mijn advies. Wil je dat de configurator alleen nog binnen Missing Link bestaat (zelfde databank, geen eigen opslag), dan is dat een andere weg met minder werk aan koppelen en meer werk in Missing Link zelf. Dat is jouw keuze (beslissing 2).

---

## 4. Hoe inbouwen: drie technieken

| | **Ingesloten pagina** | **Eigen HTML-element** | **Programmapakket** |
|---|---|---|---|
| Wat | Missing Link toont onze pagina in een kader in zijn scherm. De twee praten via berichten. | Missing Link zet `<bouw-3d>` in zijn eigen pagina; ons programma tekent daarbinnen. | De ontwikkelaar van Missing Link haalt ons pakket binnen en roept `maak3D` zelf aan. |
| Voordeel | Werkt met elke techniek. De 3D kan Missing Link niet storen (en omgekeerd). Wij kunnen een nieuwe versie uitrollen zonder dat Missing Link opnieuw gebouwd wordt. Dezelfde pagina dient voor de losse app en voor de website van een klant. | Voelt als één pagina (geen kader). Missing Link kan er zelf knoppen rond zetten. | Meeste vrijheid voor Missing Link; één programma, één bundel. |
| Nadeel | Een kader voelt soms als een eiland (eigen scrollen, eigen venster voor afdrukken). Aanmelden moet doorgegeven worden. | De 3D-bibliotheek komt in de pagina van Missing Link terecht; opmaak en versies kunnen botsen. | Missing Link en de configurator moeten samen gebouwd en uitgerold worden. Dat botst met "aparte app". |
| Past bij | Niveau A, B en C | Niveau A | Alleen als de configurator in Missing Link opgaat |

**Advies** [inschatting]: de ingesloten pagina. De binnenkant bouwen we zo dat het eigen HTML-element later een dunne schil erboven is (zelfde afspraken). Zo hoeven we nu niet te weten in welke techniek Missing Link gebouwd is.

**De afspraken (wat gaat erin, wat komt eruit):**

| Richting | Bericht | Inhoud |
|---|---|---|
| Missing Link → 3D | `open` | Welk project, de bewaarde configuratie, de modus (*kijken* of *configureren*), de catalogus met prijzen, de klantkorting, de huisstijl, de taal, of kostprijzen getoond mogen worden |
| 3D → Missing Link | `klaar` | De pagina is geladen en kan tekenen |
| 3D → Missing Link | `gewijzigd` | De nieuwe configuratie (met versienummer), om te bewaren |
| 3D → Missing Link | `offerte` | De regels: per positie een kop, omschrijving, aantal, maten, eenheidsprijs, kostprijs, stuklijst, en de beelden |
| 3D → Missing Link | `beeld` | Een PNG van de 3D of een tekening, op vraag |
| 3D → Missing Link | `fout` | Wat misliep, in gewone taal |

Elk bericht draagt een versienummer. De 3D aanvaardt alleen berichten van het adres van Missing Link.

Het huidige "Export voor het ERP" in de offerte van de bouwdemo bevat al het grootste deel van het bericht `offerte` (positie, omschrijving, aantal, prijs, kostprijs, de configuratie met model en versie, de stuklijst) [code].

---

## 5. Wat moet er klaargemaakt worden?

Dit is het antwoord op "klaar maken om in te bouwen". De eerste negen punten kunnen zonder dat er iets aan Missing Link moet gebeuren.

| # | Wat | Waarom | Werk | Heeft Missing Link nodig? |
|---|---|---|---|---|
| 1 | **De kijker een eigen pakket geven.** Nu haalt de bouwdemo de kijker, het zoomen en het bewaren uit `demo-web/src`. | Anders sleept elke inbouw de zeteldemo mee. | S | Nee |
| 2 | **De fotomodus pas laden als je ze vraagt.** | 615 kB minder; sneller open in een scherm van Missing Link. | S | Nee |
| 3 | **Meer vaste controlebeelden voor de bouw** (woning per verdieping, gevels, elk raamtype) vóór we verbouwen. | Nu zijn er twee. Zonder bewaking zie je niet wat een verbouwing stukmaakt. | S | Nee |
| 4 | **Bewaren losmaken van de browser.** `staat.ts` schrijft rechtstreeks in de opslag van de browser. Er komt één tussenlaag "opslag" met drie uitvoeringen: browser (zoals nu), bestand, Missing Link. | Zonder dit ziet een collega of een ander toestel het project niet. | M | Nee (de uitvoering voor Missing Link later) |
| 5 | **Het formaat van de configuratie vastleggen.** Een bewaard bestand heeft al een soort en een versie (`woningconfigurator-project`, versie 1). Erbij: wat er bij een nieuwe versie met oude projecten gebeurt, en een test dat oude bestanden blijven openen. | Een offerte van vorig jaar moet over twee jaar nog openen. | S | Nee |
| 6 | **Een modus "alleen kijken".** Zonder paletten en knoppen om te wijzigen. | Voor niveau A, voor de werkbon en voor de klant. | S | Nee |
| 7 | **Kleuren van buiten.** De schermen gebruiken al vaste kleurnamen; die laten we invullen door wie de pagina opent. | De ingebouwde pagina ziet eruit als Missing Link, of als de huisstijl van de klant. | S | Nee |
| 8 | **Beelden leveren op vraag.** `beeld()` bestaat in de kijker, maar de bouwdemo gebruikt ze nog niet. Erbij: een beeld per positie en van de woning, en de tekeningen als PNG. | Voor `beeld_id` op de offerteregel en voor de werkbon. | S | Nee |
| 9 | **De ingesloten pagina met de afspraken** uit hoofdstuk 4, met een voorbeeldpagina die Missing Link naspeelt. | Zo kan de ontwikkelaar van Missing Link ertegen bouwen en testen. | M | Nee (wel zijn antwoorden op de vragen) |
| 10 | **Catalogus en prijzen van buiten.** Nu staan materialen, artikelcodes en prijzen vast in `inrichting.ts` en `raam.ts`. Ze worden gegevens die bij `open` meekomen. | Verzonnen prijzen mogen nooit in een echte offerte belanden. Een afwerking toevoegen wordt een artikel toevoegen. | M–L | Ja: artikels, samengestelde artikels |
| 11 | **Offerte wegschrijven:** van de export naar echte offerteregels, met een unieke sleutel per poging (geen dubbele offertes) en de controle op "intussen gewijzigd" (`etag`). | Niveau B. | M | Ja: betekenis van de velden |
| 12 | **Aanmelden en rechten.** De ingesloten pagina draagt zelf geen sleutel van de API; alles loopt via Missing Link. Kostprijs en marge alleen voor wie dat recht heeft. | Veiligheid. | S–M | Ja |
| 13 | **Werf en toestellen:** tablet op de werf, slechte verbinding, oudere toestellen. De terugval zonder WebGPU bestaat al [code]. | De inmeting gebeurt buiten. | M | Deels |

**Licenties** [code]: three.js, de path tracer, de rekenhulp voor botsingen en de ontruiser zijn MIT; ze mogen in een commercieel product. De gewichten van de ontruiser zijn Apache 2.0 (zie `packages/demo-web/ontruiser/BRON.md`).

---

## 6. Extra mogelijkheden: afwerkingen

### 6.1 Wat er vandaag is [code]

| Waar | Keuzes vandaag |
|---|---|
| **Gevel** (per muurvlak, per gevel, per verdieping of de hele woning; aparte sokkel) | Gevelsteen (7 kleuren), steenstrips (4), sierpleister (6), hout staand (3), hout liggend (4), gevelleien (3), zink (3), blauwe hardsteen (2). Bij baksteen 4 voegkleuren. |
| **Vloer** (per ruimte) | 2 tegels, 2 parketten, PVC, gietvloer, tapijt |
| **Wand** (per ruimte, niet per wand) | 6 verfkleuren, 2 wandtegels |
| **Binnendeur** | Schilderdeur, eik, glas, staal zwart, schuifdeur in de wand |
| **Raam en deur** | 5 profielen (PVC, alu, alu hoog geïsoleerd, hout, hout-alu), 6 kleuren buiten, 3 binnen, 6 glassoorten, 3 afstandhouders, 2 roeden, 3 deurpanelen, 3 grepen, dorpel, 3 vensterbanken, 2 dorpels buiten; bij renovatie "dagkanten binnen afwerken" (ja of nee) |
| **Zonwering en opties** | Screen (4 doekkleuren), rolluik, buitenjaloezie; bediening; vliegenraam; rooster; inbraakwerend beslag |
| **Dak** (woning) | Alleen plat, één donkere kleur, met een donkere dakrand |
| **Aanbouw** (eerste bouwmodel, los van de woning) | 7 raampartijen (schuif, hef-schuif, vouwdeur, deur met zijpanelen), 3 aluminium profielen, 5 kleuren (met brons geanodiseerd en bicolor), 5 glassoorten, 3 gevels voor de zijmuren, 4 bekledingen boven de raampartij, plat dak met EPDM, lichtstraat of lichtkoepel |

### 6.2 Wat erbij kan

De kolom **Offerte** zegt of de keuze ook een regel met een hoeveelheid geeft (m², lopende meter, stuk).

**A. Buitenkant**

| # | Uitbreiding | Nut | Offerte | Werk |
|---|---|---|---|---|
| 1 | **Dakafwerking plat dak:** EPDM, roofing, grind, groendak; dakrand in aluminium in een kleur; lichtkoepel en lichtstraat (bestaan nu alleen in het aanbouwmodel) | Nu is het dak van de woning één zwart vlak | m², lm, stuk | S |
| 2 | **Hellend dak:** zadeldak en lessenaarsdak, met pannen (model en kleur), leien of zink; dakoversteek; dakramen | Grootste gat in het beeld van een woning. Stond al in de lijst van 1/11. | m², stuk | M–L |
| 3 | **Goten en afvoeren:** hanggoot of bakgoot, regenpijp, in zink, koper of aluminium in een kleur | Klein in beeld, vast op de offerte | lm, stuk | S |
| 4 | **Metselwerk verfijnen:** metselverband (halfsteens, wild, tegelverband), voegtype (verdiept, platvol, dunbed), steenformaat | Bepaalt sterk hoe een bakstenen gevel oogt | m² (meerprijs) | S–M |
| 5 | **Accenten in de gevel:** rollaag of latei boven ramen, band, omkadering van een raam in aluminium, kleur van de dagkanten | Wat een gevel "af" maakt | lm, stuk | S–M |
| 6 | **Meer gevelmaterialen:** grote gevelpanelen (vezelcement, HPL), aluminium of stalen gevelbekleding, composiet, gekaleide baksteen | Renovatie en moderne nieuwbouw | m² | S per materiaal |
| 7 | **Garagepoort** (sectionaal: kleur, belijning, vensters) | Hoort bij buitenschrijnwerk; bijna elke woning | stuk | M |
| 8 | **Buitenaanleg:** terras (tegels, hout, composiet), oprit (klinkers, grind), omheining, gras | Mooier beeld; tegels per m². Stond al in de lijst van 1/11. | m², lm | S–M |
| 9 | **Zonnepanelen** op het dak, als aantal en legplan | Vaak samen verkocht met het dak | stuk | S (na 1 of 2) |

**B. Ramen en deuren**

| # | Uitbreiding | Nut | Offerte | Werk |
|---|---|---|---|---|
| 10 | **Volledige kleurwaaier:** de gangbare RAL-kleuren plus een vrije RAL-code, met afwerking (mat, structuur, glans, anodisatie); houtsoorten met beits | Nu 6 kleuren. Kleur is de meest gestelde vraag bij schrijnwerk. | meerprijs | S |
| 11 | **Echte profieldoorsnede** per systeem, met verstek in de hoeken (advies van 4/11) | Het grootste verschil voor het beeld van één raam | – | M per systeem; doorsnedes van de leverancier nodig |
| 12 | **Beslag als echt 3D-bestand:** krukken, trekbeugels, brievenbus, huisnummer, in inox, zwart of messing | Voordeuren worden op uitzicht gekocht | stuk | M |
| 13 | **Meer voordeuren:** panelen met inleg, zijlicht, glas in de deur (mat, figuurglas) | Nu 3 panelen. Het zijlicht stond al in de lijst van 1/11. | stuk | S–M |
| 14 | **Glas en roeden:** figuurglas, getint zonwerend glas, Wiener sprossen, glasdelende roeden | Renovatie van oudere woningen | m², lm | S |
| 15 | **Zonwering verder:** meer doekkleuren, kleur van kast en geleiders, kleur van de rolluiklamel; in 3D op en neer | Verkoopargument. Op en neer stond al in de lijst van 1/11. | meerprijs | S |
| 16 | **Afwerking binnen rond het raam:** omlijsting, gordijnkast; de dagkant als keuze van afwerking in plaats van ja of nee | Vaak vergeten op de offerte | lm | S |

**C. Binnen**

| # | Uitbreiding | Nut | Offerte | Werk |
|---|---|---|---|---|
| 17 | **Afwerking per wand** in plaats van per ruimte: accentmuur, tegels tot een hoogte, behang, houten latten | Nu één afwerking per ruimte. Het tegelplan per wand stond al in de lijst van 1/11. | m² per wand | M |
| 18 | **Vloeren verfijnen:** legpatroon (recht, halfsteens, visgraat), tegelformaat, plankbreedte, voegkleur, met het juiste snijverlies per patroon | Correcte hoeveelheden; visgraat vraagt meer. Legpatroon en snijverlies stonden al in de lijst van 1/11 (badkamer). | m² | M |
| 19 | **Plinten** (hoogte, materiaal, kleur) | Staat op elke offerte van een vloerder | lm | S |
| 20 | **Plafonds:** kleur, verlaagd plafond, spots; hoogte per ruimte | Nu geen plafond in beeld. Plafonds stonden al in de lijst van 1/11 (verflijst). | m², stuk | S–M |
| 21 | **Binnendeuren verfijnen:** meer modellen (paneeldeur, staallook met verdeling), kruk, omlijsting of blokkader, schuifdeur voor de wand | Nu 5 deuren zonder beslag | stuk | S–M |
| 22 | **Trap:** model (open, dicht, kwartdraai), materiaal, leuning (glas, staal, hout) | Nu één rechte trap | stuk | S–M |

**D. Het beeld zelf**

| # | Uitbreiding | Nut | Werk |
|---|---|---|---|
| 23 | **Varianten naast elkaar:** twee voorstellen (bv. gevelsteen tegenover crepi) vergelijken en als keuze in de offerte zetten. Missing Link heeft daar al velden voor (`optioneel`, `keuzegroep`). | De klant kiest op de offerte; minder heen-en-weer | S–M |
| 24 | **Omgeving en zon:** tuin en lucht, de zon op een uur en een seizoen (schaduw op gevel en terras), binnen rondkijken op ooghoogte, vóór en na bij renovatie | Verkoop; toont het nut van zonwering | S–M per onderdeel |

Niet herhaald: keuken, badkamer, elektriciteit en verwarming staan in de lijst van 1/11 (`docs/analyse-bouw-woning-demo.md`, deel C) en blijven daar gelden.

### 6.3 Het principe: een afwerking is gegevens, geen programma

De gevel doet het al goed [code]: elk materiaal is een rij met een naam, een groep, een soort voor de 3D, kleuren, een prijs, een kostprijs en een artikelcode. De editor, de 3D, het gevelaanzicht en de offerte lezen alle vier dezelfde rij.

Voorstel: **datzelfde patroon voor alle afwerkingen** (dak, goot, plint, plafond, vloer, wand, deur). Een afwerking is dan:

| Veld | Voorbeeld |
|---|---|
| Waar ze past | dak, gevel, vloer, wand, plint … |
| Naam en groep | "Keramische pan, antraciet", groep "Pannen" |
| Hoe de 3D ze tekent | één van de bestaande structuren (steen, planken, leien, zink, pleister, tegel, parket …) plus kleur en maat van het patroon |
| Eenheid | m², lopende meter, stuk |
| Snijverlies | bv. 7 % recht, 12 % visgraat |
| Artikel | de koppeling met een artikel in Missing Link (prijs, kostprijs, leverancier) |

Dan komt een nieuwe afwerking erbij door een rij toe te voegen: eerst in ons eigen beheerscherm, later door een artikel in Missing Link een afwerking te noemen. Alleen een **nieuwe structuur** in 3D (bv. dakpannen) vraagt nog programmeerwerk, één keer.

### 6.4 Mijn top 5 voor een eerste ronde [inschatting]

| Volgorde | Wat | Waarom eerst | Werk |
|---|---|---|---|
| 1 | Afwerkingen als gegevens (6.3) | Maakt al de rest goedkoper, en is ook stap 10 van het inbouwen | M |
| 2 | Dak: afwerking plat dak, goten, daarna een eenvoudig zadeldak met pannen of leien (1, 2, 3) | Het grootste gat in het beeld | M–L |
| 3 | Volledige kleurwaaier voor schrijnwerk (10) | Klein werk, meest gevraagd | S |
| 4 | Afwerking per wand, plinten, legpatroon (17, 18, 19) | Juiste hoeveelheden voor vloerder en schilder | M |
| 5 | Varianten als keuze in de offerte (23) | Sluit rechtstreeks aan op velden die Missing Link al heeft | S–M |

De echte profieldoorsnede (11) is voor het beeld van één raam de grootste winst, maar wacht best op een leverancier die zijn doorsnedes geeft.

---

## 7. Voorstel van volgorde

| Stap | Wat | Resultaat | Werk [inschatting] |
|---|---|---|---|
| 0 | Jouw beslissingen (hoofdstuk 10) en de antwoorden van de ontwikkelaar van Missing Link (hoofdstuk 8) | We weten wat "inbouwen" is | – |
| 1 | **Klaarmaken** zonder Missing Link: punten 1 tot 9 uit hoofdstuk 5 | Een los pakket "3D van de bouw" en een voorbeeldpagina die toont hoe het ingesloten werkt, in de kleuren van Missing Link | 3–4 weken |
| 2 | **Afwerkingen, ronde 1:** de top 5 | Een rijkere demo; afwerkingen zijn gegevens | 4–6 weken |
| 3 | **Inbouwen, niveau A en B**, samen met de ontwikkelaar van Missing Link: scherm in project en offerte, bewaren, regels en beelden wegschrijven | Een project in Missing Link opent de configurator; "klaar" vult de offerte | 3–5 weken, plus het werk in Missing Link |
| 4 | **Niveau C:** catalogus en prijzen uit artikels, bestelbon per leverancier, planning, werkbon | De hele ketting | L, per onderdeel te bekijken |

Stap 1 en 2 hangen niet van elkaar af en kunnen in de omgekeerde volgorde. Punt 10 (catalogus van buiten) en de top 1 (afwerkingen als gegevens) zijn hetzelfde werk; dat doen we één keer.

---

## 8. Vragen voor de ontwikkelaar van Missing Link [te bevestigen]

1. In welke techniek zijn de schermen gebouwd, en mag een scherm een ingesloten pagina tonen (staat het beveiligingsbeleid van de pagina's dat toe)?
2. Waar zou de ingesloten pagina staan: op hetzelfde adres als Missing Link, of op een eigen adres?
3. Hoe meldt de ingesloten pagina zich aan: de sessie van de gebruiker, of een sleutel die kort geldig is?
4. Waar bewaren we de configuratie (plan en keuzes; enkele honderden kB, met werffoto's meer): een veld op het project, een bijlage, of eigen tabellen zoals in §7.4 van het stappenplan?
5. Hoe laad je een beeld op voor `beeld_id` (formaat, grootte)? Kan een regel twee beelden dragen (tekening en 3D)?
6. Wat betekenen `keuzegroep`, `optie_sleutel`, `vereist_sleutel`, `kop`, `niveaunummer`? Welke waarden kent `berekening` (stuk, m², lopende meter …)? (Actiepunt 0.3, nog open.)
7. Hoe zien samengestelde artikels eruit (ze zijn nu leeg)? Kan een artikel een kleur, een beeld of vrije velden dragen, zodat een afwerking een artikel is?
8. Kan de stuklijst van een regel mee naar order en bestelling per leverancier?
9. Meerwerk op de werf: is dat een deelproject, een nieuwe versie van de offerte of een aparte order?
10. Kunnen de montage-uren uit de configuratie naar de planning en de werkbon?
11. Offertes hebben een taal van de klant: moet de configurator ook in het Frans?
12. Mag de ingesloten pagina kostprijzen krijgen, en hoe weet ze of de gebruiker dat recht heeft?

Volgens de afspraak spreek ik geen andere sessie of ontwikkelaar aan: deze lijst is voor jou om door te geven.

---

## 9. Risico's

| Risico | Wat we eraan doen |
|---|---|
| **Twee waarheden:** iemand wijzigt in Missing Link een regel die uit de configurator kwam. | Regels uit de configurator dragen hun herkomst. Bij heropenen vergelijken we en tonen we het verschil; een aanvaarde offerte heropent alleen als nieuwe versie (spelregel 6 uit het stappenplan). |
| **Verzonnen prijzen en technische waarden** uit de demo belanden in een echte offerte. | Catalogus en prijzen komen van buiten (punt 10). Zonder catalogus toont de pagina geen prijzen. |
| **Verwachting van het beeld:** de klant verwacht een foto van zijn huis; de 3D is schematisch. | Eerlijk benoemen. Het dak, de kleuren en de profielen brengen het dichter; fotorealisme is geen doel van deze stap. |
| **Laadtijd** in een scherm van Missing Link. | De 3D pas laden als het tabblad opent; de fotomodus apart (punt 2). |
| **Oude projecten openen niet meer** na een nieuwe versie. | Versie in het formaat en een test met oude bestanden (punt 5). |
| **Toestellen op de werf** (oude tablet, geen verbinding). | Terugval bestaat; werken zonder verbinding is een eigen stap (punt 13). |
| **Publieke broncode:** de repo is publiek. | Geen klantgegevens, geen sleutels, geen adressen van Missing Link in de code. |

---

## 10. Beslissingen (antwoorden van Jonas op 15/11)

> **Beslist op 15/11/2026:**
> - **Aparte app, met de mogelijkheid om de 3D door te sturen naar Missing Link.** De beslissing van 31/10 blijft dus
>   gelden; Missing Link ontvangt de 3D, het hoeft de configurator niet zelf te draaien. Gebouwd: zie hoofdstuk 11.
> - **De bouwconfigurator mag een stuk uitgebreid worden**, "bvb ook met dak en zonnekoepels" (gelezen als
>   lichtkoepels) en "ook lichtinval simuleren enzo". De bouw krijgt voorrang op de fauteuils.
> - Nog open: wat Missing Link precies ontvangt (een beeld bij de offerteregel, een draaibare 3D in het project, of
>   beide) en de vragenlijst van hoofdstuk 8.

De oorspronkelijke vragen:

1. **Wat bedoel je met inbouwen als eerste doel:** kijken (A), configureren (B) of de hele ketting (C)? Mijn advies: A en B, via een ingesloten pagina; C daarna.
2. **Blijft "aparte app, koppelbaar" (31/10) gelden?** Mijn advies: ja, één pakket dat op zichzelf draait én in Missing Link getoond wordt.
3. **Welke afwerkingen eerst?** Mijn advies: de top 5 uit 6.4. Zeg gerust welke sector of klant je voor ogen hebt; dat verschuift de volgorde (een dakwerker wil het dak, een schrijnwerker de kleuren en profielen).
4. **De vragenlijst van hoofdstuk 8:** geef jij ze door aan de ontwikkelaar van Missing Link? Een andere weg: je geeft deze sessie leestoegang tot de broncode van Missing Link. Dan haal ik een deel van de antwoorden (techniek van de schermen, velden, opladen van beelden) uit de code zelf. Ik koppel niets aan zonder jouw vraag.
5. **Mag stap 1 (klaarmaken) beginnen na de fauteuils**, zonder te wachten op Missing Link?

---

## 11. Gebouwd op 15/11: de 3D doorsturen (pakket en kijker)

Wat er staat, zonder dat er iets aan Missing Link moest gebeuren:

| Onderdeel | Waar | Wat |
|---|---|---|
| **3D-pakket** | `packages/core/src/pakket3d.ts` | De 3D van een project als gewone gegevens (JSON): de woning per verdieping (met volle en met lage muren) en elke positie van de offerte. Met een soort en een versienummer; **zonder prijzen**. `leesPakket3D` controleert een pakket en weigert met een uitleg in gewone taal. |
| **Knop "3D doorsturen (pakket)"** | Offerte van de bouwdemo (`bouw-web/src/doorsturen.ts`) | Maakt het pakket van het huidige project en bewaart het als bestand. Staat bij de interne knoppen: in de klantweergave is ze verborgen. |
| **Losse kijker** | `bouw-web/src/kijker.ts` → `dist/bouw-kijker.html` | Eén pagina die een pakket toont en niets kan wijzigen: de woning, tot en met een verdieping, muren laag, elke positie, drie standpunten, beeld bewaren. 1,5 MB (de fotomodus van de zetels zit er niet in). |

**Hoe een ander systeem de kijker gebruikt** (dit is de afspraak uit hoofdstuk 4, in het klein):

| Richting | Bericht | Inhoud |
|---|---|---|
| kijker → pagina | `{ soort: 'bouw-kijker', bericht: 'klaar', versie }` | de kijker is geladen |
| pagina → kijker | het pakket zelf (`soort: 'bouw-3d-pakket'`) | toon dit project |
| pagina → kijker | `{ soort: 'bouw-kijker', huisstijl: { accent, achtergrond } }` | de kleuren van de pagina eromheen |
| kijker → pagina | `{ soort: 'bouw-kijker', bericht: 'getoond', project }` | het pakket staat in beeld |
| pagina → kijker | `{ soort: 'bouw-kijker', vraag: 'beeld' }` | geef het beeld zoals het nu staat |
| kijker → pagina | `{ soort: 'bouw-kijker', bericht: 'beeld', png }` | het beeld als PNG, bv. voor `beeld_id` op een offerteregel |
| kijker → pagina | `{ soort: 'bouw-kijker', bericht: 'fout', tekst }` | wat misliep, in gewone taal |

Een pakket kan ook via het adres van de kijker (`?pakket=<adres>`), of door een bestand te kiezen of te slepen. Met
`?oorsprong=<adres>` luistert en antwoordt de kijker alleen naar dat adres.

**Getest in een echte browser** (15/11): pakket van de voorbeeldwoning 396 kB (2 verdiepingen, 14 posities); de kijker
toont woning, gelijkvloers met lage muren en een positie; een fout bestand geeft een uitleg en laat de vorige 3D staan;
ingesloten in een nagespeelde pagina komen de berichten *klaar*, *getoond* en *beeld* aan; geen fouten, geen verkeer naar
buiten.

**Wat nog niet bestaat:** het versturen zelf. Het pakket wordt nu een bestand; waar Missing Link het bewaart en hoe
het een beeld ontvangt, hangt af van de antwoorden op hoofdstuk 8 (vragen 4 en 5). Er is niets naar Missing Link
geschreven.

