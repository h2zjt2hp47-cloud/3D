# Analyse: van demo naar bruikbare zonnepanelen-configurator

*Stand 3 november 2026 · hoort bij `packages/zon-web` en `packages/core/src/zon.ts` en `ligging.ts`*

## 1. Samenvatting

De demo toont de volledige verkoopflow: **adres → dak → legplan → installatie → opbrengst → offerte**, met 3D, controles en een bestellijst. Als gespreksstof bij een installateur is dat sterk. Om er **echte offertes** mee te maken, ontbreken vooral vijf dingen:

1. **Echte gegevens van de installateur.** Catalogus met datasheets, inkoop- en verkoopprijzen, arbeidstijden, standaardpakketten en marges. Nu is alles verzonnen.
2. **Betrouwbare opbrengst.** Ons model zit voor een zuiddak ongeveer **11 % onder PVGIS** (de Europese referentie) en is voor noorddaken **te optimistisch**; zie §4.1. Daarnaast moet het zelfverbruik uit het echte verbruiksprofiel komen (kwartierwaarden van de digitale meter) in plaats van een vuistregel.
3. **Een offerte die de klant kan tekenen.** PDF in de huisstijl, **varianten naast elkaar** (met en zonder batterij), btw-attest, voorwaarden, akkoord online.
4. **Wat na het akkoord komt.** Technische opmeting, bestelling, planning, **eendraadschema en situatieschema** voor de AREI-keuring, gegevens voor de aanmelding bij Fluvius.
5. **Een server.** Projecten delen tussen kantoor en tablet, gebruikers en rechten, PDF maken, PVGIS opvragen (dat kan niet rechtstreeks vanuit de browser) en de koppeling met het ERP.

Advies: niet proberen een volledig ontwerppakket als Solar Monkey of PV*SOL na te bouwen. Positioneer de configurator als **verkoop- en werflaag bovenop het ERP**, met Belgische regels ingebouwd. Laat de technische diepte waar die al goed bestaat: het stringplan bij de tools van de omvormerfabrikant, de ballastberekening bij de montageleverancier. Zie §6.

---

## 2. Voor wie en waarvoor

**Gebruiker:** een KMO-installateur (vaak ook elektricien) met 1 à 3 verkopers/projectleiders en een paar plaatsingsploegen. Typisch residentieel: 3–15 kWp, soms een batterij of laadpaal, af en toe een KMO-dak.

**Klantreis en wie wat doet:**

| Stap | Wie | Wat de configurator moet doen | Nu in de demo |
|---|---|---|---|
| 1. Aanvraag | kantoor | Adres en verbruik vastleggen, dak al bekijken op de luchtfoto | Adres → ligging en maten (alleen Vlaanderen) |
| 2. Huisbezoek of offerte op afstand | verkoper | Snel een legplan, opbrengst en prijs; varianten tonen; klantweergave | Ja, één variant |
| 3. Offerte versturen | verkoper | PDF in de huisstijl, voorwaarden, btw-attest, online akkoord | Afdruk via de browser, geen huisstijl, geen akkoord |
| 4. Technische opmeting | technieker | Dak, zekeringkast, kabelweg, foto's, definitief legplan, meerwerk | Ontbreekt (bestaat al in de bouwdemo: stap Werf) |
| 5. Bestellen en plannen | kantoor | Bestellijst per leverancier, ploeg en datum | Bestellijst als benadering |
| 6. Plaatsen | ploeg | Legplan, stringplan, werfbon, serienummers, foto's | Ontbreekt |
| 7. Keuring en aanmelding | kantoor / keurder | Eendraad- en situatieschema, gegevens voor de AREI-keuring en de aanmelding bij Fluvius | Ontbreekt |
| 8. Factuur en nazorg | kantoor | Voorschot- en eindfactuur in het ERP, garantiedossier, monitoring | Ontbreekt (ERP) |

---

## 3. Wat de demo nu kan (en hoe goed)

| Onderdeel | Wat er is | Belangrijkste beperking |
|---|---|---|
| Ligging | Kompas, oriëntatie in graden, **opzoeken via het adres** (Geopunt + GRB + luchtfoto) | Alleen Vlaanderen; dakvorm, goothoogte en helling niet uit de kaart; diepte = hele gebouw met aanbouw |
| Gebouwen en daken | Zadeldak, lessenaarsdak, plat dak; meerdere gebouwen | Geen schilddak, wolfseind, mansarde, L-vorm of dakkapel als dakvlak; alle gebouwen in dezelfde richting |
| Legplan | Automatisch, gecentreerd, vrije rand, obstakels, panelen aan/uit klikken; plat dak zuid of oost-west met rijafstand | Geen gemengd staand/liggend, geen rij verschuiven of slepen, vaste marge rond obstakels (15 cm), geen legplan óp de luchtfoto |
| Elektrisch | Stringgrenzen (Voc bij −10 °C, Vmp bij 70 °C), MPPT-ingangen, DC/AC-verhouding, 5 kVA monofasig, batterij vraagt een hybride omvormer, micro-omvormers, optimizers | Benadering; geen homologatielijst (C10/26), geen fasebalans, geen kabelsectie of spanningsval, geen compatibiliteit omvormer ↔ batterij per merk |
| Opbrengst | 950 kWh/kWp × stand (helling, richting) × schaduw; per maand | Zie §4.1: te laag voor zuid, te hoog voor noord; geen horizon of schaduw van buren |
| Zelfverbruik en financieel | Vuistregel zelfverbruik, batterij 250 cycli, terugverdientijd en 25 jaar | Geen kwartierprofiel, geen capaciteitstarief, geen dynamisch contract, geen vervanging van de omvormer of onderhoud |
| Offerte | Regels per groep, korting, btw 6/21 %, marge, prijs per Wp, bestellijst | Eén btw-tarief voor alles; verzonnen prijzen; geen varianten, huisstijl of akkoord |
| 3D | Gebouwen, daken, obstakels, panelen, windroos | Schematisch; geen schaduwsimulatie |
| Opslag | Eén project in de browser, bewaren als bestand | Geen server, niet te delen |
| Tests | 20 tests (`zon.test.ts`, `ligging.test.ts`), o.a. met echte GRB-gegevens | — |

---

## 4. Wat nodig is, per thema

Prioriteit: **M** = nodig voor een pilot met echte offertes · **S** = nodig om te verkopen aan meerdere installateurs · **C** = later of als onderscheid.

### 4.1 Opbrengst (rekenen)

**Bevinding.** Vergelijking met PVGIS 5.3 voor Harelbeke (1 kWp, 14 % systeemverlies, de standaardinstelling van PVGIS), uitgevoerd op 3/11/2026:

| Helling · richting | PVGIS (kWh/kWp) | Demo (kWh/kWp) | Verschil |
|---|---|---|---|
| 35° · zuid | 1068 | 950 | −11 % |
| 40° · zuidoost | 1007 | 895 | −11 % |
| 0° · plat | 891 | 834 | −6 % |
| 10° · oost | 887 | 842 | −5 % |
| 35° · oost | 850 | 789 | −7 % |
| 35° · west | 841 | 789 | −6 % |
| 90° · zuid (gevel) | 767 | 663 | −14 % |
| 35° · noord | 560 | 627 | **+12 %** |

De verhoudingen kloppen grotendeels. Het basisgetal is wel aan de lage kant: 950 tegenover 1068. Dat is verdedigbaar als "voorzichtig", maar dan moet je het bewust kiezen en vermelden. Voor noorddaken is het model te gunstig.

| Wat | Prio | Hoe |
|---|---|---|
| Opbrengst per stand afstemmen op PVGIS | M | Ofwel PVGIS live opvragen via de server (de browser mag PVGIS niet rechtstreeks aanspreken), ofwel een **vooraf berekende tabel** per helling (0–90°, stappen van 5°) en richting (stappen van 15°) voor 3–4 zones in België. Dat werkt offline en is snel. |
| Systeemverlies en vermindering van de opbrengst per jaar instelbaar | M | Per installateur: verlies (nu impliciet), degradatie volgens de datasheet. |
| Horizon en schaduw | S | PVGIS geeft een horizonprofiel (bergen, ver weg). Schaduw van buren en bomen vraagt een **hoogtemodel**: DHMV II DSM (1 m, metingen 2013–2015, open data, WCS). DHMV III (nieuwe vlucht) komt pas rond 2028. Tot dan: schaduw per dakvlak manueel, zoals nu. |
| Opbrengst per maand | M | Uit PVGIS in plaats van een vaste verdeling. |

### 4.2 Zelfverbruik, batterij en terugverdientijd

De terugverdientijd is wat de klant onthoudt, dus die moet verdedigbaar zijn.

| Wat | Prio | Hoe |
|---|---|---|
| **Verbruiksprofiel per kwartier** | M | De klant downloadt zijn kwartierwaarden (CSV) uit *Mijn Fluvius*; de configurator leest die in. Zonder profiel: standaardprofielen (gezin met of zonder thuiswerk, met warmtepomp, met elektrische wagen). |
| Simulatie per kwartier | M | Productie per kwartier (PVGIS-uurwaarden, verdeeld) tegenover het verbruik; batterij met laad- en ontlaadvermogen, rendement en bruikbare capaciteit. Daaruit: zelfverbruik, injectie, afname. Het rekenwerk kan in `core` en is goed te testen. |
| **Capaciteitstarief** | S | Sinds 2023 betaal je in Vlaanderen ook op je gemiddelde maandpiek: ongeveer € 52 tot € 61 per kW per jaar (2026, volgens het netgebied). Een batterij kan pieken afvlakken; dat is een verkoopargument, maar alleen met een kwartierprofiel aan te tonen. |
| Injectievergoeding en dynamisch contract | S | Per leverancier zeer verschillend; dynamisch contract alleen met een digitale meter. Instelbaar per project, met realistische standaardwaarden. |
| Kosten in de looptijd | M | Vervanging van de omvormer (meestal na 12–15 jaar), eventueel onderhoud of reiniging, verzekering. Nu ontbreekt dat, waardoor de 25-jarenwinst te mooi is. |
| Meertjes | C | Prosumententarief (voor wie nog een analoge meter heeft), een warmtepomp of wagen die later komt (scenario's). |

### 4.3 Dak, legplan en ligging

| Wat | Prio | Hoe |
|---|---|---|
| Meer dakvormen | M | Schilddak (trapezium- en driehoeksvlakken), wolfseind, L-vormige woning (twee gebouwen in een hoek), dakkapel met eigen dakvlak, bijgebouw in een andere richting (eigen oriëntatie per gebouw). Het legplan moet dan met niet-rechthoekige vlakken overweg kunnen. |
| Legplan bewerken | M | Rij verschuiven, paneel slepen, gemengd staand en liggend, minimale afstand tot nok en goot volgens het montagesysteem, marge rond obstakels instelbaar. |
| Legplan op de luchtfoto | S | De luchtfoto en de GRB-contour hebben we al; het legplan in Lambert 72 plaatsen. Dat geeft vertrouwen bij de klant en voorkomt fouten. |
| **Helling en hoogte uit het hoogtemodel** *(eerste versie gebouwd 3/11: dakvorm, helling, goot, nok, aanbouw, buren)* | S | Uit de DHMV II DSM (1 m) per dakvlak de helling, de richting en de goothoogte schatten. Dezelfde bron als de Zonnekaart; voor de Zonnekaart zelf vonden we geen open dienst per dakvlak. Opgelet: metingen van 2013–2015, dus nieuwbouw ontbreekt. |
| Wallonië en Brussel | C | Andere kaartdiensten (WalOnMap / UrbIS) en andere regels; pas als er klanten zijn. |
| Hoekhuis en meerdere straten | S | Nu kies je met een knop de andere zijde; beter: alle zijden met hun straat tonen. |

### 4.4 Montage en statiek

Hier niet zelf rekenen, maar koppelen of overnemen.

| Wat | Prio | Hoe |
|---|---|---|
| Montagemateriaal volgens de leverancier | M | Montagesystemen hebben eigen rekentools (windzone, sneeuw, gebouwhoogte, ruwheid van het terrein volgens Eurocode). Per installateur zijn vaste merk(en) instellen, met de regels voor haken per m, railstukken en klemmen. Voor platte daken komt de **ballast** uit de tool van de leverancier. |
| Vragen bij de opmeting | M | Draagkracht en staat van het dak, **asbest** (golfplaten!), type pan of lei, toegang en stelling, dakisolatie of nog te vervangen dak. Sommige antwoorden veranderen de offerte (meerwerk). |
| Uitzonderingen | S | Hoge gebouwen, kustzone (wind), monumenten of vergunning. |

### 4.5 Elektrisch ontwerp en regelgeving

| Wat | Prio | Hoe |
|---|---|---|
| Volledige datasheets | M | Per paneel en omvormer alle elektrische waarden (nu benaderd); idealiter ingelezen van de groothandel of de fabrikant. |
| **Homologatielijst C10/26** (Synergrid) | M | Omvormer en batterij moeten op de lijst staan, anders weigert Fluvius de aanmelding. Lijst bijhouden (download) en controleren. |
| Netaansluiting | M | Monofasig: max. 5 kVA (C10/11). Driefasig: fasebalans. **Boven 10 kVA** gelden andere regels (meetregime, studie door Fluvius). Hoofdzekering en type aansluiting (3 × 230 V of 3 × 400 V) vragen. |
| Stringplan | S | Ons plan blijft een **voorontwerp**. Het definitieve plan maak je met de tool van de fabrikant (SMA Sunny Design, Huawei FusionSolar, SolarEdge Designer, Fronius Solar.creator…). Wij geven het plan mee in een vorm die je daar snel overtypt. |
| Kabel en beveiliging | S | DC- en AC-kabelsectie volgens de lengte (spanningsval), differentieel (type A of B volgens de omvormer), DC-scheiding, overspanningsbeveiliging, aarding. |
| **Eendraadschema en situatieschema** | M | De AREI-keuring vraagt ze, en ze moeten met de werkelijkheid overeenstemmen. Uit de configuratie kunnen we een eerste versie tekenen: panelen per string → omvormer → beveiliging → verdeelbord → meter, plus waar alles hangt. Dat bespaart de installateur tijd en is een sterk verkoopargument. |
| Gegevens voor de aanmelding bij Fluvius | M | EAN, vermogen van de omvormer, merk en type, datum van de keuring, attesten. Bronnen spreken elkaar tegen over de termijn (30 dagen of 3 maanden na de keuring): op te volgen in het dossier. |

### 4.6 Catalogus, prijzen en marges

| Wat | Prio | Hoe |
|---|---|---|
| Echte catalogus van de installateur | M | Panelen, omvormers, batterijen, optimizers, laadpalen, montage, kabel; inkoopprijs; levertijd en voorraad. Liefst **uit het ERP** (één bron voor artikels en prijzen) of als import van de prijslijst van de groothandel. |
| Prijsopbouw zoals de installateur rekent | M | Arbeid in uren × uurtarief (per paneel, per omvormer, per batterij, per dakvlak, extra voor leien of een steil dak), verplaatsing, stelling of hoogwerker, marge per groep, afronding. Vaak werken installateurs ook met **pakketten** ("10 panelen + omvormer X"); allebei mogelijk maken. |
| Btw per regel | M | Nu één tarief voor de hele offerte. 6 % geldt voor een privéwoning van minstens 10 jaar oud, voor plaatsing door een erkende aannemer, en met een verklaring van de klant op de factuur. Voor de batterij en vooral de laadpaal: bevestigen met een boekhouder. |
| Varianten | M | Twee of drie varianten naast elkaar (bv. "basis", "met batterij", "full black"), met de verschillen in prijs en terugverdientijd. Dit is in de zonnepanelenverkoop standaard. |

### 4.7 Offerte en akkoord

| Wat | Prio | Hoe |
|---|---|---|
| PDF in de huisstijl | M | Logo, kleuren, voorblad, legplan (en luchtfoto), 3D-beeld, opbrengst- en terugverdientabel, regels, voorwaarden, **btw-verklaring** van de klant, handtekening. Op de server te maken, zodat het resultaat altijd gelijk is. |
| Online akkoord | S | Link naar de klant, akkoord met handtekening op het scherm. Dat bestaat al in de bouwdemo (werf: akkoord en meerwerkbon). |
| Versies | S | Offerte v1, v2… bewaren; wat is er veranderd. |
| Voorschot | S | Voorschotpercentage, betalingsvoorwaarden, overgedragen aan het ERP. |

### 4.8 Na het akkoord: opmeting, werf en dossier

Grotendeels hergebruik van de bouwdemo (stap *Werf*).

| Wat | Prio | Hoe |
|---|---|---|
| Technische opmeting op een tablet | M | Dak (maten, staat, asbest), zekeringkast (foto, hoofdzekering, ruimte), kabelweg en plaats van de omvormer, internet, meterkast. Meerwerk automatisch t.o.v. de offerte. |
| Bestellen en plannen | S | Bestellijst per leverancier naar het ERP; planning van de ploeg (ERP of agenda). |
| Werfbon voor de ploeg | S | Legplan met maten, stringplan, materiaal, foto's, serienummers van panelen en omvormer scannen. |
| Opleverdossier | S | Schema's, keuringsattest, garanties, handleiding, monitoring-account. |

### 4.9 Koppeling met het ERP

In dit project is dat **Missing Link** (REST API met etag/If-Match en idempotency keys). Bij installateurs die met een ander pakket werken, zoals Admin2Win bij elektriciens, geldt hetzelfde principe.

| Wat | Prio | Richting |
|---|---|---|
| Klant en adres | M | ERP ↔ configurator |
| Artikels en prijzen | M | ERP → configurator (het ERP is de baas) |
| Offerte (regels, groepen, btw, varianten) | M | configurator → ERP |
| Akkoord, bestelling, project, planning | S | configurator → ERP |
| Facturatie, voorschot | — | in het ERP zelf |

Eerst te bevestigen bij Missing Link: hoe varianten en optiegroepen in een offerte staan (velden `keuzegroep`, `optie_sleutel`, `vereist_sleutel`; dezelfde open vraag als bij de zetels).

### 4.10 Platform, beveiliging en privacy

| Wat | Prio | Hoe |
|---|---|---|
| **Server met opslag** | M | Projecten, gebruikers, rechten (verkoper, technieker, kantoor), meerdere toestellen. Nu staat alles alleen in de browser. |
| PVGIS en PDF via de server | M | PVGIS weigert rechtstreekse aanvragen uit de browser; PDF moet overal gelijk zijn. |
| Privacy (GDPR) | M | Adres, verbruiksprofiel, foto's en handtekening zijn persoonsgegevens: verwerkersovereenkomst, bewaartermijn, inzage en verwijderen. |
| Werken zonder internet | S | Bij de klant is er soms geen bereik: laatste projecten, catalogus en kaartbeeld vooraf bewaren. |
| Bronvermelding open data | M | GRB en luchtfoto: Modellicentie Gratis Hergebruik (vermelding al aanwezig). PVGIS: bronvermelding JRC. |

### 4.11 Gebruiksgemak

- **Huisbezoek in 15 minuten:** adres → dak bevestigen → pakket kiezen → klantweergave → offerte. Standaardwaarden per installateur (vaste panelen en omvormers, marge), zodat er weinig in te vullen valt.
- **Tablet eerst:** grote knoppen; legplan met de vinger bewerken. De lessen uit `analyse-gebruiksgemak.md` van de bouwdemo gelden ook hier.
- **Uitleg voor de klant:** begrijpelijke cijfers ("± 75 % van je verbruik komt van je dak"), geen jargon in de klantweergave.

---

## 5. Regels en cijfers die te controleren zijn

De demo gebruikt deze waarden. Ze komen uit secundaire bronnen en moeten bij een officiële bron of een installateur bevestigd worden.

| Regel / cijfer | In de demo | Status |
|---|---|---|
| Btw 6 % voor een privéwoning ≥ 10 jaar (panelen; batterij onder voorwaarden) | 6 % of 21 % op de hele offerte | Bronnen eensgezind voor panelen; voor batterij en laadpaal te bevestigen |
| Monofasig max. 5 kVA (C10/11) | Fout boven 5 kVA | Bevestigd door meerdere bronnen |
| Andere regels boven 10 kVA (meetregime, studie) | Niet opgenomen | Toe te voegen |
| Omvormer en batterij op de lijst C10/26 | Niet opgenomen | Toe te voegen (de lijst werd in augustus 2026 gecorrigeerd) |
| Geen premie meer voor zonnepanelen; batterijpremie afgeschaft | Geen premie | Bronnen spreken elkaar deels tegen (premie bij renovatie?): navragen |
| RESCert | Niet opgenomen | Niet verplicht om te plaatsen; wel gevraagd bij premies: nummer op de offerte zetten |
| Aanmelding bij Fluvius na de keuring | Niet opgenomen | Termijn onduidelijk (30 dagen of 3 maanden) |
| Capaciteitstarief ± € 52–61 per kW per jaar | Niet opgenomen | Tariefkaart Fluvius per netgebied |
| Opbrengst 950 kWh/kWp (zuid 35°) | Ja | PVGIS geeft 1068 met 14 % verlies: bewust kiezen |
| Afnameprijs € 0,30 en injectie € 0,04 per kWh | Standaardwaarden | Per klant en leverancier aanpassen |

---

## 6. Concurrentie en positionering

| Pakket | Wat | Opmerking |
|---|---|---|
| **Solar Monkey** (NL, actief in België) | Ontwerp op luchtfoto en 3D-model, offerte, monitoring; > 250 000 systemen | Marktleider in de Benelux; fusie met **Eturnity** (Zwitserland) aangekondigd in maart 2026. Prijs volgens een concurrent vanaf ± € 85 per maand |
| Eturnity, Pylon, OpenSolar, Aurora | Ontwerp en offerte in de browser | OpenSolar is gratis (verdienmodel via partners) |
| PV*SOL | Technisch rekenpakket (simulatie, schaduw) | Voor engineering, niet voor verkoop |
| Tools van de fabrikanten | Stringplan en compatibiliteit | Gratis, per merk |

**Waar wij beter kunnen zijn:** koppeling met het ERP (één keer invoeren), Belgische regels en documenten ingebouwd (btw-attest, eendraadschema, gegevens voor Fluvius), werf en meerwerk in dezelfde app, en één platform voor installateurs die ook laadpalen, warmtepompen of ramen verkopen (dezelfde motor als de bouwdemo).

**Waar we niet moeten concurreren:** het fijnste 3D-dakmodel en de schaduwsimulatie. Daar hebben de gespecialiseerde pakketten jaren voorsprong.

**Te beslissen:** zelf bouwen, of een ontwerppakket koppelen (bv. via API) en zelf de verkoop-, werf- en ERP-laag leveren?

---

## 7. Voorstel van fasering

De omvang is grof ingeschat: S = dagen, M = 1–3 weken, L = meer dan een maand.

**Fase 1 – Pilot bij één installateur (echte offertes)**

| Onderdeel | Omvang |
|---|---|
| Echte catalogus en prijsopbouw van de pilootklant (import) | M |
| Opbrengst afgestemd op PVGIS (tabel of server) en kosten in de looptijd | S |
| Varianten naast elkaar | M |
| Btw per regel en btw-verklaring | S |
| Offerte-PDF in de huisstijl, met legplan en cijfers | M |
| Server met opslag, gebruikers en rechten | L |
| Controle op de lijst C10/26 en de regels boven 10 kVA | S |
| Meer dakvormen (schilddak, L-vorm, eigen richting per gebouw) | M |

**Fase 2 – Van offerte tot plaatsing**

| Onderdeel | Omvang |
|---|---|
| Verbruiksprofiel per kwartier (Mijn Fluvius), batterijsimulatie, capaciteitstarief | M |
| Technische opmeting en meerwerk (uit de bouwdemo) | M |
| Eendraadschema en situatieschema (eerste versie) | M |
| Koppeling met het ERP: klant, artikels, offerte, akkoord | L |
| Online akkoord met handtekening | S |
| Legplan op de luchtfoto, legplan bewerken | M |

**Fase 3 – Breder verkopen**

| Onderdeel | Omvang |
|---|---|
| Helling en hoogte uit het hoogtemodel; schaduw van de omgeving | L |
| Montage via de tools van de leverancier | M |
| Werfbon, serienummers, opleverdossier | M |
| Wallonië en Brussel | M |
| Offline werken op de tablet | M |

---

## 8. Nodig van een pilootklant (vragenlijst)

1. Welke merken en types panelen, omvormers, batterijen, optimizers, laadpalen en montagesystemen? Prijslijst van de groothandel, eigen marges.
2. Hoe wordt een prijs opgebouwd: pakketten of per onderdeel? Uurtarief, uren per paneel en per omvormer, toeslagen (leien, steil dak, plat dak, stelling, afstand)?
3. Twee of drie **echte offertes** als voorbeeld (wat staat erop, in welke volgorde, welke voorwaarden).
4. Werkwijze: wie doet het huisbezoek, wanneer volgt de technische opmeting, wie maakt de schema's, wie meldt aan bij Fluvius?
5. Welk ERP of boekhoudpakket, en wat moet daarin terechtkomen?
6. Welke opbrengstberekening gebruiken ze nu (PVGIS, Zonnekaart, de tool van de fabrikant), en welke terugverdientijd vertellen ze aan de klant?
7. Hoeveel offertes per maand, en welk aandeel wordt een order? (Dat bepaalt wat de tool waard is.)
8. Alleen residentieel of ook KMO-daken (> 10 kVA, andere regels)?

---

## 9. Variant: alleen een snelle offerte bij de klant

Als de configurator alleen dient om **aan de keukentafel een prijs en een terugverdientijd** te geven, en de technische uitwerking daarna gebeurt zoals nu (opmeting, tools van de fabrikant en leverancier, ERP), dan wordt de lijst veel korter.

**Uitgangspunt:** *de prijs moet juist zijn, de opbrengst voorzichtig, de rest mag grof.* Een snelle offerte blijft een prijsbelofte; daarom altijd "onder voorbehoud van technische opmeting" erop.

**Blijft nodig**

| Wat | Waarom | Omvang |
|---|---|---|
| Echte prijzen en **pakketten** van de installateur, met een minimummarge | De prijs is het enige wat bindend is | M |
| Opbrengst licht bijsturen: noorddaken lager, basisgetal bewust kiezen (± 1000 kWh/kWp of een PVGIS-tabel) | Niet te veel beloven; ± 10 % volstaat | S |
| Snelle flow: adres → overnemen → **aantal panelen** (schuif, met het maximum op het dak als controle) → pakket → klantweergave | Het gesprek duurt 15 minuten | S–M |
| **2 à 3 varianten** naast elkaar (bv. basis / met batterij) | Zo wordt zonne-energie verkocht | M |
| Offerte als PDF in de huisstijl, meteen te mailen, met de voorbehouden en de btw-verklaring | De klant wil iets mee | M |
| Grenzen bewaken: max. korting, monofasig 5 kVA, alleen omvormers uit de eigen (goedgekeurde) catalogus | Fouten die later geld kosten | S (bestaat grotendeels) |
| Werken op een tablet, ook zonder internet (zonder adresopzoeking) | Bereik bij de klant | S |

**Valt weg of mag grof blijven**
- Stringplan, kabelsectie, eendraad- en situatieschema, aanmelding bij Fluvius: dat doet de installateur na het akkoord met zijn eigen tools.
- Montage, statiek en ballast: een vaste prijs per paneel per daktype volstaat.
- Kwartierprofielen, simulatie en capaciteitstarief: de vuistregel volstaat, als die voorzichtig is en de klant ziet dat het een schatting is.
- Hoogtemodel, schaduw, legplan op de luchtfoto: niet nodig; het legplan dient alleen als controle "past het op het dak".
- Opmeting, werf en opleverdossier.
- Server: niet nodig voor één verkoper (bewaren als bestand en de offerte mailen). Wel nodig zodra meerdere verkopers met dezelfde prijzen werken, of als de offerte automatisch in het ERP moet komen.

**Al gedaan (3/11):** opbrengst uit een PVGIS-tabel met voorzichtigheidsmarge, schuifknop voor het aantal panelen, varianten naast elkaar (ook op de afdruk). **Nog te doen:** echte prijzen en pakketten, PDF in de huisstijl met mailen, toeslaglijst en voorbehouden, tablet zonder internet.

**Grootte:** ongeveer een vijfde van de volledige fasering in §7. Grotendeels werk aan de catalogus, de varianten en de PDF; het rekenwerk bestaat al.

**Risico's:** een te optimistische terugverdientijd (bewust voorzichtig rekenen) en een prijs die na de opmeting stijgt (voorbehouden en een vaste toeslaglijst: asbest, extra kabel, nieuwe zekeringkast).

## 10. Bekende technische beperkingen in de code

Kort, voor wie verder bouwt:

- `standFactor` is een eigen benadering; vervangen door een PVGIS-tabel (§4.1).
- `zelfverbruikZonder` en `extraDoorBatterij` zijn vuistregels; vervangen door een simulatie per kwartier (§4.2).
- `legVlak`: alleen rechthoekige vlakken, vaste voeg (2 cm) en vaste obstakelmarge (15 cm); plat dak oost-west met een vaste looppad-afstand (30 cm).
- `kiesOmvormer` kijkt niet naar merkcompatibiliteit met de batterij en niet naar de homologatielijst.
- De micro-omvormer werkt per paneel (in werkelijkheid vaak 2 of 4 panelen per micro).
- Er is één btw-tarief per offerte (`berekenOfferte`).
- `ligging.ts`: kleinste rechthoek rond het gebouw. Bij een L-vorm of aanbouw is die groter dan het hoofdvolume.
- Panelen die je uitzet, onthoudt de demo met de sleutel "rij-kolom". Na een andere ligging of een ander paneel moet je ze opnieuw uitzetten.

---

## Bronnen

- PVGIS API (JRC): [niet-interactieve dienst](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/getting-started-pvgis/api-non-interactive-service_en). Opvragen vanuit de browser is uitdrukkelijk niet toegelaten.
- Zonnekaart Vlaanderen: [vlaanderen.be/zonnekaart](https://www.vlaanderen.be/zonnekaart) · Digitaal Hoogtemodel: [vernieuwing DHMV](https://www.vlaanderen.be/digitaal-vlaanderen/nieuws/dit-jaar-start-de-vernieuwing-van-het-digitaal-hoogtemodel) · [WCS DHMV](https://metadata.vlaanderen.be/css/api/records/ede4735c-2df1-4e70-950a-9bc7e4d9dcda)
- AREI-keuring: [vlaanderen.be](https://www.vlaanderen.be/arei-keuring-van-uw-zonnepanelen) · RESCert: [vlaanderen.be](https://www.vlaanderen.be/bouwen-wonen-en-energie/groene-energie/groene-energie-installateurs-met-certificaat-van-bekwaamheid-rescert)
- Monofasig 5 kVA en lijst C10/26: [Wattuneed (overzicht Synergrid)](https://www.wattuneed.com/nl/content/279-synergrid-c10-26-c10-11-goedgekeurde-omvormers-belgie) · [Solar Magazine over de correctie van de lijst](https://solarmagazine.nl/nieuws-zonne-energie/i44642/synergrid-corrigeert-goedkeuringslijst-voor-omvormers-batterijen-en-zonnepanelen-na-klachten) · [aanmelden bij Fluvius (Selectra)](https://selectra.be/nl/energie/netbeheerder/fluvius/zonnepanelen-aanmelden)
- Btw: [Bobex – btw thuisbatterij](https://www.bobex.be/nl-be/thuisbatterij/premie-thuisbatterij/btw/) · [Callmepower – premies 2026](https://callmepower.be/nl/energie/gids/duurzaamheid/zonnepanelen/premie)
- Capaciteitstarief: [Callmepower](https://callmepower.be/nl/energie/gids/tarief/capaciteitstarief)
- Concurrentie: [Solar Monkey fuseert met Eturnity (Solar Magazine)](https://solarmagazine.nl/nieuws-zonne-energie/i43300/solar-monkey-fuseert-met-zwitsers-softwarebedrijf-eturnity) · [Pylon vs Solar Monkey](https://getpylon.com/nl/compare/solar-monkey-alternative/)
- Open data Vlaanderen in de demo: Geopunt geolocatie, GRB (WFS) en orthofoto (WMS) van Digitaal Vlaanderen.

*Commerciële bronnen (vergelijkingssites, concurrenten) zijn als zodanig gemarkeerd. Alle regels in §5 moeten vóór gebruik bij een officiële bron of een installateur bevestigd worden.*
