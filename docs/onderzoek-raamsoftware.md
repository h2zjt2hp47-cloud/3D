# Onderzoek: hoe LogiKal, ReynaPro en Chacal ramen berekenen

*1 november 2026. Bronnen: de websites van de makers (gelezen op 1/11/2026), een case van Hive CPQ en vakbronnen. Wat niet in een bron stond, staat er niet in; regels uit normen zijn **te verifiëren**.*

## 1. Kort antwoord

- **LogiKal** (Orgadata, nu Forterro, Duitsland) en **Chacal** (DSI, Nijvel, België) zijn volledige pakketten voor **raamfabrikanten**: van calculatie en tekening tot zaaglijst, CNC en productieopvolging. Hun kracht is de **systeemdata**: profielen, beslag en glas met alle technische gegevens en prijzen.
- **ReynaPro** is geen apart pakket: het is een **afgeschermde Reynaers-versie van LogiKal**, met alleen de Reynaers-systemen erin.
- Alle drie rekenen in dezelfde stappen. Uit de systeemdata halen ze:
  - zaagmaten van de profielen (buitenmaat min de aftrekken);
  - glasmaten;
  - beslag (volgens de maat en het gewicht van de vleugel);
  - de statiek (welk profiel of welke versterking nodig is bij de windbelasting);
  - de Uw;
  - de prijs (materiaal + arbeidstijden);
  - en daarna de productie (zaagoptimalisatie, bewerkingen, CNC, bestellingen, CE).
- **Voor ons**: Admin2Win leest nu al materiaallijsten in uit SapaLogic, LogiKal, ReynaPro, Chacal, Ramasoft, WinPro en Schücal (zie de pagina van ETS Informatics). Onze configurator moet die pakketten dus **niet nabouwen**. Hij past als **commerciële laag** erboven (zoals ReynaQuote en Chacal Express) en voor de werf (plattegrond, gevels, inmeting, meerwerk). Een paar rekenstappen nemen we wel over (zie §6).

## 2. De drie pakketten

| | **LogiKal** | **ReynaPro** | **Chacal** |
|---|---|---|---|
| Maker | Orgadata (Leer, DE), nu deel van Forterro | Reynaers Aluminium (Duffel, BE), gebouwd op LogiKal | DSI (Nijvel, BE), sinds 1981 |
| Voor wie | Fabrikanten van aluminium-, staal- en PVC-ramen, -deuren en -gevels; meer dan 18 000 gebruikers | Alle Reynaers-fabrikanten ("available to all Reynaers fabricators") | Fabrikanten (aluminium, PVC, staal, hout-alu); "7500 gebruikers", "47 500 ramen per dag" |
| Systeemdata | **Meer dan 450 leveranciers, meer dan 7 miljoen artikelen** (profielen, beslag, glas, componenten), onderhouden door Forterro (± 160 mensen) | Alleen Reynaers: profielen, accessoires, beslag; update via nieuwsbrieven (in 2026 nog maandelijks) | Profieltekeningen van de leverancier, waarop **rekenpunten** worden aangeduid; eigen regels van de fabrikant |
| Controle | "Logic control": controleert bij elke stap of de combinatie technisch klopt en biedt alleen artikelen aan die passen | Idem (LogiKal) | Regels die de fabrikant zelf vastlegt (bv. vanaf welke maat een PVC-profiel versterkt wordt, geschroefde of ingestoken hoeken) |
| Techniek | U-waarden en **statische voordimensionering** in de basismodule; automatische snedes | Thermische rapporten, doorsnedetekeningen | Module B5: **vereiste traagheid van stijlen en regels volgens de winddruk** en thermische coëfficiënt; module B16: Uw |
| Prijs | Actuele leveranciersprijzen, met kortingen, multi's of **kg-prijzen**; arbeidstijden automatisch; varianten vergelijken | Prijsvoorstel voor de klant; Reynaers-prijslijst | P1: gedetailleerde prijs "materiaal en arbeid", kortingen bij leveranciers en klanten; P3: prijstabellen per raam |
| Productie | Zaagoptimalisatie met restlengtes, barcodes, bewerkingen met botsingscontrole, CNC (3-, 4- en 5-assige machines), productiefasen, MES (fabrieksopvolging, FPC en CE) | Bestellijst, productieplanning, montage-instructies, CNC, online bestellen bij Reynaers | F1: optimalisatie met restbeheer, glasbestelling, debietlijst; F3: positie van elke boring; F4: terminals met barcodes; F9: geplande tegenover werkelijke tijd; F11: meerdere glasleveranciers |
| Tekenen en BIM | Eigen CAD (wandaansluitingen, folies, isolatie), DXF/DWG, IFC/RVT, Revit-koppeling (digitale tweeling met U-waarde) | BIM-modellen op basis van ReynaPro-projecten | D1: doorsnedetekeningen met automatische maten |
| Voor verdelers | Configuratoren | **ReynaPro Installer** (bleek te technisch) → **ReynaQuote** (op Hive CPQ, ook op tablet en smartphone) | B6-module voor verdelers (invoeren, alleen verkoopdocumenten afdrukken); **Chacal Express** (webconfigurator) |
| Koppelingen | ERP-interface, EOS (elektronisch bestellen) | Reynaers-ERP en voorraad | XML-import van klanten en technische beschrijvingen (B11/B12); koppelingen met ERP (Navision, SAGE X3 …); CE en CSTB |

**Uit de Hive-case:**
- Fabrikanten wilden dat hun verdelers en plaatsers zelf offertes maken. ReynaPro Installer was daarvoor "te technisch" en draaide alleen op een gekoppelde pc.
- Daarom kwam er ReynaQuote als **commerciële laag bovenop ReynaPro**:
  - met de juiste prijzen;
  - de fabrikant bepaalt welke systemen en opties de verdeler kan kiezen;
  - de plaatser kan plaatsing, afwerking en uitbraak toevoegen;
  - de bestelling is op te volgen;
  - "een complex schuifraam in 20 seconden".

## 3. Hoe de berekening werkt (de stappen die ze gemeen hebben)

1. **Systeemdata.** Per profiel: doorsnede, aanzicht, aftrekken of rekenpunten, gewicht per meter, Uf, traagheidsmoment en prijs (per meter of per kg). Per beslag: de **toepassingsdiagrammen** van de beslagmaker. Per glas: samenstelling, Ug, gewicht en prijs.
2. **Element invoeren.** Verdeling in vakken, openingswijze per vak, bovenlicht, koppelingen. Bij elke stap volgt een controle of het kan ("logic control").
3. **Zaagmaten.** Elk profiel = buitenmaat ± een aftrek die afhangt van de combinatie (kader, vleugel, tussenstijl, verstek of recht gezaagd). Chacal rekent "rechtstreeks met de fabricagematen". In PVC komt er een stalen **versterking** bij vanaf een bepaalde lengte.
4. **Glasmaten.** Glasmaat ≈ falsmaat min de glasspeling. Een vuistregel uit een vakbron: **falsmaat − 8 mm**. Daaruit volgt een **glasbestelling per ruit**, eventueel verdeeld over meerdere glasleveranciers.
5. **Beslag.** Het beslag wordt gekozen met de **vleugelfalsmaat** (breedte × hoogte) en het **vulgewicht**, getoetst aan de toepassingsdiagrammen van de beslagmaker. Daaruit volgen ook het aantal scharnieren en sluitpunten.
6. **Statiek.**
   - De windbelasting (volgens NBN EN 1991-1-4) bepaalt het **vereiste traagheidsmoment** van stijlen, regels en koppelprofielen.
   - De doorbuigingsgrens volgt uit de klasse van EN 12210: A = L/150, B = L/200, C = L/300.
   - Volstaat het profiel niet, dan komt er een versterking, een zwaarder profiel of een koppelprofiel.
   - De **glasdikte** volgt in België uit NBN S 23-002-3. Buildwise heeft daar een rekenprogramma voor: **FENESTRio**.
7. **Uw** volgens EN ISO 10077: uit Uf, Ug en ψ van de afstandhouder.
8. **Prijs.**
   - Materiaal, met verlies en de keuze tussen staaflengtes of verpakkingen ("goedkoopste aankoop").
   - **Arbeidstijden** per bewerking.
   - Toeslagen, bijvoorbeeld voor kleur.
   - Kortingen.
   - Eventueel prijstabellen voor standaardramen.
9. **Productie.**
   - **Zaagoptimalisatie**: profielen verdelen over staven met zo weinig mogelijk afval, met restlengtes uit voorraad.
   - Bewerkingen (boringen, uitfrezingen) en CNC-bestanden.
   - Labels met barcode.
   - Productiefasen of lots.
   - Bestellingen per leverancier.
   - **CE-markering**: een prestatieverklaring volgens EN 14351-1, met een systeem van fabriekscontrole (FPC).

## 4. Vergelijking met onze configurator

| Onderdeel | LogiKal / ReynaPro / Chacal | Onze demo nu | Overnemen? |
|---|---|---|---|
| Systeemdata | Volledig, onderhouden, per leverancier | Een paar voorbeeldprofielen met Uf, aanzicht en kg/m | **Nee, niet zelf onderhouden.** Wel kunnen importeren (prijslijst, systeemgegevens) |
| Plausibiliteit | "Logic control" bij elke stap | Regels per model (vakmaat, gewicht, glas, ventilatie …) | Ja: dezelfde aanpak, al aanwezig |
| Zaagmaten | Aftrekken per profielcombinatie | Alleen een totaal aantal lopende meter | **Ja: een zaaglijst met aftrekken** (zie §6) |
| Glasmaten | Falsmaat − speling, bestelling per ruit | Benadering (vak − profiel) | **Ja: glasbestelling per ruit** |
| Beslag | Toepassingsdiagram (maat × gewicht) | Vaste grenzen per vakkeuze | Later, met data van de beslagmaker |
| Statiek | Traagheidsmoment stijlen en koppelprofielen, versterking | Nog niet | **Ja: eenvoudige voordimensionering** |
| Glasdikte | Volgens norm of tool | Nog niet | Ja, als controle (verwijzen naar FENESTRio) |
| Uw | EN ISO 10077 | Formule met vaste ψ = 0,06 | **Ja: keuze van de afstandhouder (ψ)** |
| Prijs | Materiaal + arbeid per bewerking, kg-prijzen, kortingen | Kostprijs + opslag, montage-uren | Ja: kg-prijs voor aluminium, arbeid per bewerking |
| Productie, CNC, MES | Volledig | Bestellijst per leverancier | Nee (blijft in LogiKal/Chacal) |
| CE / prestatieverklaring | Ja (met testdata van het systeemhuis) | Nog niet | Ja: een ontwerp van de prestatieverklaring per positie |
| Verdelers en plaatsers | ReynaQuote, Chacal Express, B6 | **Plattegrond, gevels, 3D, offerte, werf, meerwerkbon** | Dit is onze sterkte |
| Plattegrond, gevels, inmeting, meerwerk | Zelden (LogiKal: versies en kostenverschil) | Ja | Onze sterkte |

## 5. Wat dit betekent

1. **Niet concurreren op productie.** 450 leveranciers met 7 miljoen artikelen bijhouden, plus CNC en MES, is het werk van een team van honderden mensen. Fabrikanten die LogiKal of Chacal hebben, blijven dat gebruiken.
2. **Wel de laag ervoor en erna.** Wat de hele keten dient:
   - de plattegrond en de gevels;
   - een offerte die een plaatser of verkoper zonder technische kennis maakt;
   - de inmeting op de werf;
   - de meerwerkbon met handtekening;
   - de opvolging.

   Reynaers koos hiervoor zelf een aparte CPQ-laag (ReynaQuote op Hive).
3. **Doelgroepen:**
   - **Plaatsers en renovatiebedrijven** die ramen inkopen bij een fabrikant en zelf geen LogiKal hebben: voor hen is onze demo bijna volledig.
   - **Fabrikanten**: als verkoop- en werflaag die posities doorgeeft aan hun rekenpakket.
4. **Koppeling.**
   - Admin2Win leest nu al per project een **materiaallijst** in uit LogiKal, ReynaPro, Chacal, SapaLogic, Ramasoft, WinPro en Schücal, voor inkoop en voorraad. Naar Reynaers en Aliplast kan het elektronisch bestellen.
   - Dezelfde aanpak past voor Missing Link.
   - Chacal kan **technische beschrijvingen in XML importeren** (module B12) en LogiKal heeft een **ERP-interface**. Onze posities (maten, vakken, openingswijze, kleur, glas) zouden dus naar het rekenpakket van de fabrikant kunnen. De prijs en de materiaallijst komen dan terug.
   - De exacte formaten moeten bij DSI en Forterro opgevraagd worden.

## 6. Voorstel: wat we kunnen inbouwen

| # | Wat | Hoe | Werk |
|---|---|---|---|
| 1 | **Statische voordimensionering** van tussenstijlen en koppelprofielen | Vereist traagheidsmoment I = 5 · q · L³ · k / (384 · E), met q = winddruk × invloedsbreedte, k = 300 (doorbuiging L/300) en E = 70 000 N/mm² (aluminium). Vergelijken met de I van het profiel, anders een versterking of koppelprofiel voorstellen.<br>Voorbeeld: L = 2,5 m, invloedsbreedte 1,2 m, winddruk 0,8 kN/m² (voorbeeld, te bepalen volgens NBN EN 1991-1-4) geeft I ≈ 84 cm⁴. | S |
| 2 | **Afstandhouder** (aluminium of warm edge) | Keuze in het raammodel met ψ ≈ 0,08 tegenover ≈ 0,04 (typische waarden, te bevestigen); Uw verandert mee | S |
| 3 | **Glasbestelling per ruit** | Glasmaat = falsmaat − speling (instelbaar), samenstelling, Ug, gewicht en m² per ruit; lijst per glasleverancier | S |
| 4 | **Zaaglijst met aftrekken** en **zaagoptimalisatie** | Per profielrol (kader, vleugel, tussenstijl) een aftrek en zaaghoek; staven van 6,5 m met zaagsnede; afval in %. Geeft ook een betere kostprijs | M |
| 5 | **Prestatieverklaring (CE)** per positie | Kenmerken volgens EN 14351-1 (lucht, water, wind, Uw, geluid) uit de testgegevens van het systeemhuis, als ontwerp-document | S–M |
| 6 | **Aluminium per kg en arbeid per bewerking** | Profielprijs = kg/m × kg-prijs + lakmeerprijs; arbeidstijd per bewerking (zagen, frezen, assembleren, beglazen) | S |
| 7 | **Beslag via toepassingsdiagram** | Tabel per beslagsysteem: maximale vleugelfalsmaat per vulgewicht | M (data nodig) |
| 8 | **Uitwisseling met Chacal of LogiKal** | Posities exporteren (XML of ERP-interface), materiaallijst en prijs terug inlezen | M (formaten opvragen) |

Mijn voorstel: **1, 2 en 3 eerst** (klein werk, groot effect bij een technische koper), daarna 5 en 6. De punten 4, 7 en 8 pas met een echte klant en echte systeemdata.

## 7. Te verifiëren

- Winddruk per project (zone, ruwheid, hoogte) volgens NBN EN 1991-1-4.
- Of de doorbuigingseis L/300 of L/200 is, volgens de klasse en het bestek.
- Glasdikte volgens NBN S 23-002-3 (bv. met FENESTRio van Buildwise).
- ψ-waarden van afstandhouders: EN ISO 10077-1 of de opgave van de leverancier.
- De glasspeling en de aftrekken per systeem: altijd uit de systeemdocumentatie.
- De importformaten van Chacal (B11/B12) en de ERP-interface van LogiKal: opvragen bij DSI en Forterro.

## 8. Bronnen

**LogiKal (Orgadata/Forterro)**
- [productpagina](https://www.logikal-software.com/en/product/logikal)
- [FAQ](https://www.logikal-software.com/en/faq)
- [moduleoverzicht](https://www.logikal-software.com/en/product/module-overview)
- [ontwerp en calculatie](https://www.logikal-software.com/en/solutions/design-calculation)

**Chacal (DSI)**
- [modules](https://www.dsi.eu/en/chacal/modules/)
- [voorstelling](https://www.dsi.eu/en/chacal/general-presentation/)
- [FAQ](https://www.dsi.eu/en/chacal/faq/)

**ReynaPro**
- [productpagina Reynaers](https://www.reynaers.com/en/software/reynapro) (achter een login)
- [Hive CPQ: case Reynaers (ReynaPro, ReynaPro Installer, ReynaQuote)](https://hivecpq.com/en-us/customer-cases/reynaers-cpq)
- [ReynaPro-nieuwsbrieven 2026](https://www.reynaers.nl/inspiratie/blogs/techblog/reynapro-nieuwsbrieven)
- ["ReynaPro is a closed Reynaers version of Logikal from Orgadata" (presentatie Reynaers)](https://slideplayer.com/slide/14768595/)
- [ReynaPro-opleiding](https://v2.reynaers.com/en-UK/training/r3-reynapro-software)

**Koppelingen Admin2Win**
- [ETS Informatics: ERP-pakket linken met externe software](https://ets-informatics.be/erp-voor-kmos/externe-software)

**Techniek**
- [Siegenia: toepassingsdiagrammen beslag](https://www.siegenia.com/api/service/downloads/file/196505_de)
- [BF-Richtlinie 022 (beglazing)](https://www.bundesverband-flachglas.de/wp-content/uploads/simple-file-list/bf-merkblaetter/BF-Merkblatt_022-2018_AEI1_02-2020_Verglasungsrichtlinie.pdf)
- [Buildwise: FENESTRio (quickstart)](https://www.cstc.be/media/qyaiucv4/quickstart_fenestrio_fr.pdf)
- [Buildwise: NBN S 23-002](https://www.buildwise.be/en/publications/standards-regulations/nbn-s-23-002-fr)
- [VEKA WinDoPlan (statische voordimensionering, U-waarde)](https://www.veka.be/doelgroepen/architect/planning/windoplan/)
- [doorbuigingsklassen](https://kvt-online.nl/het-eindproduct/18-algemene-uitgangspunten-voor/)
