# Missing Link uitbreiden met een unieke module — analyse

*Versie 1 — 10 november 2026*

Vraag: met welke module kan Missing Link zich onderscheiden van de andere pakketten voor KMO's? Dit document vergelijkt zeven kandidaten en doet een voorstel. Het bouwt voort op [`configurator-analyse-en-stappenplan.md`](configurator-analyse-en-stappenplan.md) (de configurator zelf) en [`analyse-bouw-woning-demo.md`](analyse-bouw-woning-demo.md) (de bouwdemo).

> **Hoe betrouwbaar is dit document?**
> Elke bewering heeft een label:
> - **[Missing Link]**: rechtstreeks vastgesteld in de Missing Link API (gegevens van 10/11/2026).
> - **[eigen werk]**: gebouwd en getest in deze repo (de demo's).
> - **[zoekresultaat]**: uit samenvattingen van een zoekmachine. **De websites van de leveranciers konden in deze ronde niet geopend worden** (netwerkinstellingen van de sessie). Kijk prijzen en functies na aan de bron voor je ze tegenover een klant of partner gebruikt.
> - **[inschatting]**: mijn eigen afleiding. Een voorstel, geen bewezen feit.
>
> "Niet gevonden" betekent: niet gevonden in dit onderzoek. Het is geen bewijs dat iets niet bestaat.

---

## 1. Samenvatting

1. **Wat iedereen heeft, is geen onderscheid meer.** CRM, offertes, Peppol-facturen, planning, werkbon-app met handtekening, nacalculatie, een koppeling met Rexel of Cebeo en een klantenportaal zitten bij de directe concurrenten (Robaws, Bouwsoft, Cafca, Teamleader) al in het pakket **[zoekresultaat]**. Missing Link moet die hebben om mee te mogen doen, maar wint er geen klant mee.
2. **De witte vlek is "visueel verkopen".** Een pakket waarin de verkoper het product of de woning *tekent*, de prijs meteen ziet, de offerte met tekening en 3D-beeld krijgt en waar inmeting en meerwerk op de werf in dezelfde ketting zitten, vond ik bij geen enkel KMO-pakket. In de maakindustrie bestaat het alleen als duur apart pakket (Merkato bij Ridder iQ, Elfsquad, Hive) **[zoekresultaat]**.
3. **Dat is precies wat hier al als demo staat.** De zetelconfigurator en de bouwdemo (plattegrond, ramen, gevels, offerte, werf met inmeting en meerwerkbon) werken, met 249 tests **[eigen werk]**. Wat ontbreekt, is de server en de koppeling met Missing Link.
4. **AI is de versneller, niet de module.** Missing Link heeft al een koppeling waarmee een AI-assistent offertes, projecten en facturen leest en schrijft **[Missing Link]**. Bij de Belgische KMO-pakketten vond ik dat nergens als officieel onderdeel **[zoekresultaat]**. Die voorsprong is tijdelijk: Teamleader, Vertuoza en Odoo brachten in 2026 elk een eigen AI-assistent uit. Gebruik AI dus om de unieke module sneller in te richten en te bedienen, niet als verkoopargument op zich.
5. **Voorstel:** één module **"Tekenen tot factuur"** (werknaam), in twee smaken op dezelfde motor: *Product* (meubels, later ramen en deuren, carrosserie) en *Werf* (plattegrond, ramenlijst, inmeting, meerwerkbon). Begin met wat het breedst inzetbaar is en het minst productkennis per klant vraagt: **de werfketting** (§7).

---

## 2. Vertrekpunt: wat Missing Link vandaag heeft [Missing Link]

**Onderdelen** (zoals de API ze opsomt voor de zaakvoerder):

| Groep | Onderdelen |
|---|---|
| Verkoop | Kansen, Calculaties, Offertes, Orders, Backorders, Leveringsbonnen, Contracten |
| Uitvoering | Projecten, Planning, Taken, Werkbonnen, Meldingen, Vorderingsstaten |
| Aankoop en voorraad | Bestellingen, Aankoopfacturen, Voorraad, Voorraad per stuk, Groothandel (Rexel) |
| Financieel | Facturen, Creditnota's, Openstaande posten, te betalen en bank |
| Stamgegevens | Bedrijven, Personen, Artikels, Samengestelde artikels, Uurtarieven, Machines |

**Wat opvalt voor deze vraag:**

- De **offerteregel** is al voorbereid op een configurator: `keuzegroep`, `optie_sleutel`, `vereist_sleutel`, `optioneel`, maten (`lengte`, `breedte`, `hoogte`), afronding, `beeld_id` en een link naar de calculatie (`herkomst_prijsberekening_id`).
- Er zitten al velden in voor **machines**: inruil, huur (van/tot), machinetype en tweedehands onderdelen. Dat wijst op een bestaande sterkte bij machinehandel en -verhuur.
- Offertes kennen **versies**, een **voorschotschema** en Peppol-gegevens van de klant.
- De **API** werkt met etag (geen overschreven wijzigingen), idempotency keys (geen dubbele stukken) en rekent zelf de totalen.
- Er is een **koppeling voor AI-assistenten** (MCP): dit document is ermee opgesteld.
- Calculaties, samengestelde artikels en orders zijn in deze omgeving nog leeg; er staan 3 offertes en 3 projecten in. Het pakket is dus jong.

**Prijzen** (artikels in de eigen administratie):

| Formule | Per gebruiker per maand |
|---|---|
| Basis | € 24 |
| Projecten | € 34 |
| Volledig | € 44 |
| Technieker | € 8 |
| Boekhouder | € 0 |
| Minimum per firma | € 75 per maand |
| Opstart en inrichting | € 490 eenmalig |

---

## 3. Wanneer is een module "uniek"?

Zes toetsstenen, gebruikt in de vergelijking van §6:

| Toetssteen | Vraag |
|---|---|
| **Uniek** | Heeft een concurrent in dit segment het al? |
| **Breed** | Voor hoeveel klanten van Missing Link is het bruikbaar? |
| **Zichtbaar** | Zie je het verschil in een demo van vijf minuten? |
| **Moeilijk na te bouwen** | Kost het een concurrent maanden of weken? |
| **Dichtbij** | Hoeveel staat er al? |
| **Licht in te voeren** | Hoeveel werk is het per nieuwe klant (inrichting, opleiding)? |

De laatste is voor een klein team de belangrijkste rem: een module die per klant weken inrichting vraagt, schaalt niet mee met het aantal klanten.

---

## 4. De markt

### 4.1 Wat de concurrenten naar voren schuiven [zoekresultaat]

| Pakket | Positie | Waarmee ze zich onderscheiden | Prijs (na te kijken) |
|---|---|---|---|
| **Robaws** | Belgisch, bouw en installatie: de meest directe concurrent | Koppelingen met Rexel en Cebeo, nacalculatie per project, werkbon offline met handtekening, klantenportaal, portaal voor onderaannemers | Starter € 29 per maand (1 gebruiker, extra € 24), Go € 59 (extra € 49), Pro € 119 (extra € 89) |
| **Visma Bouwsoft** | Gevestigde Belgische bouwadministratie | Meetstaten, lastenboeken, vorderingsstaten, koppelingen met bouwhandel en met Revit/Archicad | € 69 per maand + € 865 opstart |
| **Vertuoza** | Bouwsoftware uit Wallonië | "VertuoAI": een offerte dicteren op de werf; klantenportaal met betaling; eigen marktplaats | Op aanvraag |
| **Cafca** | Installateurs | Eigen catalogus met prijslijsten van 40 leveranciers | ± € 50 per module per maand |
| **Teamleader Focus** | Brede KMO, niet sectorgebonden | Gebruiksgemak, veel koppelingen, sinds oktober 2026 "Focus AI" (offertes en herinneringen voorbereiden, spraak) | € 37,50 – 67,50 per maand |
| **Odoo** | Breed modulair ERP | Alles in één prijs, AI in versie 19; vraagt een implementatiepartner | ± € 25 – 61 per gebruiker per maand |
| **Exact Online Bouw / Productie** | Boekhouding met sectorlaag | Naam en boekhoudkundige kern | Bouw € 129 – 359, Productie € 419 – 799 per maand |
| **Admin2Win** | ERP voor maakbedrijven in bouw en metaal | Modulair, maatwerk, leest materiaallijsten in uit raamsoftware (LogiKal, ReynaPro, Chacal …) | Op maat |
| **Ridder iQ, MKG** | Nederlandse ERP's voor maakbedrijven | Productconfigurator, maar via een apart pakket (Merkato) of alleen in de grootste versie (MKG5) | Op aanvraag |

### 4.2 Wat (bijna) iedereen heeft

CRM, offertes, facturen via Peppol (verplicht sinds 1/1/2026), projecten, planning, werkbon-app met foto en handtekening, nacalculatie, aankoopfacturen inlezen, een koppeling met elektrogroothandels, en steeds vaker een klantenportaal en een AI-assistent **[zoekresultaat]**.

**Gevolg:** de Rexel-koppeling en de werkbonnen van Missing Link zijn nodig, maar geen onderscheid.

### 4.3 Wat ik bij (bijna) niemand vond [zoekresultaat]

| Functie | Stand bij de concurrenten |
|---|---|
| Visuele productconfigurator met tekening en 3D | Niet in KMO-pakketten. Alleen als apart pakket in de maakindustrie (Merkato, Elfsquad, Hive) |
| Plattegrond of ramenlijst die doorstroomt naar de offerte | Niet gevonden |
| Inmeting op de werf die de bestelmaat en de offerte bijwerkt | Niet gevonden |
| Meerwerkbon als aparte stroom (verschil met de offerte, handtekening, doorrekenen) | Niet gevonden; de gewone werkbon met handtekening wel |
| Dealerportaal (wederverkoper configureert en bestelt zelf) | Niet gevonden |
| Koppeling met raamsoftware | Alleen Admin2Win |
| AI die prijslijsten van leveranciers leest | Niet gevonden; Cafca beheert de lijsten zelf |
| Groothandels sanitair en verwarming (Van Marcke, Facq) | Bij geen enkel pakket bevestigd |
| Officiële AI-koppeling (MCP) | Alleen bij Business Central, Xero en QuickBooks; niet bij de Belgische pakketten |

### 4.4 Wat eraan komt [zoekresultaat]

| Wat | Wanneer | Betekenis |
|---|---|---|
| In- én uitchecken op werven ("Check In and Out at Work") | 1/4/2027 | Raakt elke aannemer met werven vanaf € 500.000; past bij een werf-app |
| Algemene tijdsregistratie voor werkgevers | Gepland 1/1/2027 (voorontwerp; na te kijken of de wet gestemd is) | Past bij werkbonnen en de formule Technieker |
| E-reporting naar de FOD Financiën | Gepland 2028 (nog geen wet) | Verplicht nummer, geen onderscheid |
| Nieuwe bouwproductenverordening: prestatie- en conformiteitsverklaring voor ramen en deuren | Van toepassing sinds 8/1/2026 | Een configurator voor ramen kan de verklaring per raam meegeven |
| Digitaal productpaspoort voor meubelen | Indicatief 2028, daarna minstens 18 maanden overgang | Een configurator kent de samenstelling van elk meubel al: latere troef |

**Les:** wettelijke verplichtingen moet iedereen volgen. Ze zijn zelden uniek, maar wie er vroeg bij is, heeft een reden om nu te bellen. In- en uitchecken en tijdsregistratie in 2027 zijn zulke aanleidingen.

### 4.5 Waar bedrijven tijd en marge verliezen [zoekresultaat]

- Faalkosten in de Nederlandse bouw: gemiddeld 5 % van de omzet, door slechte voorbereiding en communicatie (ABN AMRO, 2019). Belgische cijfers niet gevonden.
- Vlaamse bouw: ± 17.000 vacatures; werfleider en calculator zijn knelpuntberoepen (Embuild, VDAB). Wie een offerte sneller en met minder kennis kan maken, lost dus een personeelsprobleem op.
- Vier op de tien bouwbedrijven werken nog op papier; 41 % verdeelt de administratie over meerdere pakketten (Exact KMO Barometer 2025).
- **Niet gevonden:** cijfers over doorlooptijd van offertes of niet-gefactureerd meerwerk. Dat meerwerk een groot lek is, blijft een **[inschatting]** tot je het bij eigen klanten navraagt.

---

## 5. De kandidaten

### A. Productconfigurator (tekenen → prijs → offerte)

- **Wat:** de verkoper stelt een product samen op maat (zetel per cm, later raam, kast, opbouw), ziet prijs, tekening en 3D, en krijgt een offerte.
- **Staat er al [eigen werk]:** motor met formules, regels, prijstabellen en stuklijst; zetelontwerper met 42 modellen, 60 stoffen, 3D en offertepagina; catalogus-editor.
- **Sterk:** uniek in dit segment, zeer zichtbaar in een demo, moeilijk na te bouwen.
- **Zwak:** elke klant heeft eigen producten en prijsregels. Het inrichten per klant is het zware werk (fase 0 bij de pilootklant is nog niet ingevuld). Bruikbaar voor een deel van de klanten: wie maatwerk in varianten verkoopt.

### B. Werfketting (plattegrond of ramenlijst → offerte → inmeting → meerwerk)

- **Wat:** de woning of de lijst met ramen als vertrekpunt; elke opening wordt een offertepositie; op de werf de inmeting op tablet, het akkoord van de klant en de meerwerkbon met handtekening.
- **Staat er al [eigen werk]:** plattegrond met verdiepingen, ramenlijst met "maatlijst plakken", gevels, offerte met posities en bestellijst per leverancier, inmeting, akkoord, meerwerkbon, klantweergave.
- **Sterk:** breed (elke aannemer, schrijnwerker en ramenplaatser), sluit aan op wat Missing Link al heeft (projecten met werfadres, werkbonnen, vorderingsstaten), weinig inrichting per klant voor inmeting en meerwerk.
- **Zwak:** de plattegrond is het minst nodige deel; een aannemer tekent zelden zelf. Inmeting en meerwerk zijn makkelijker na te bouwen dan een configurator.

### C. AI-assistent in het pakket

- **Wat:** in gewone taal of met spraak: "maak een offerte voor Boone zoals de vorige, met 10 % korting", "welke facturen staan open?".
- **Staat er al [Missing Link]:** de koppeling voor AI-assistenten, met lezen en schrijven.
- **Sterk:** bijna geen bouwwerk meer, zeer zichtbaar, vandaag nog zeldzaam bij Belgische pakketten.
- **Zwak:** tijdelijk. Teamleader, Vertuoza, Odoo en Microsoft zijn er in 2026 mee begonnen **[zoekresultaat]**; over een jaar is het een basisfunctie. Gebruik het nu als voorsprong, bouw er de positionering niet op.

### D. AI die lijsten leest (prijslijsten, materiaallijsten, maatlijsten)

- **Wat:** een prijslijst van een leverancier (PDF of Excel), een materiaallijst uit raamsoftware of een opmeting uit een mail wordt artikels, een calculatie of een offerte.
- **Staat er al [eigen werk]:** de maatlijstlezer (plakken uit Excel of mail) in de bouwdemo.
- **Sterk:** lost het grootste probleem van A op (de inrichting per klant) en het probleem dat Cafca met een eigen catalogus oplost. Niet gevonden bij concurrenten.
- **Zwak:** fouten in prijzen zijn duur; er moet altijd een controlestap zijn. Op zichzelf weinig zichtbaar.

### E. Portaal voor klanten en dealers

- **Wat:** de klant volgt offerte, planning, vorderingen en meerwerk en tekent online; een dealer of interieurinrichter configureert en bestelt zelf.
- **Sterk:** het dealerportaal is niet gevonden bij concurrenten en past bij meubelmakers en ramenfabrikanten met wederverkopers.
- **Zwak:** een gewoon klantenportaal hebben Robaws en Vertuoza al. Het dealerportaal heeft alleen zin mét configurator (A): het is een uitbreiding, geen start.

### F. Wettelijke verplichtingen als aanleiding

- **Wat:** in- en uitchecken op de werf (2027), tijdsregistratie (2027), prestatieverklaring per raam, later het productpaspoort voor meubelen.
- **Sterk:** een concrete reden om nu te kopen.
- **Zwak:** iedereen moet dit volgen; nooit lang uniek.

### G. Machines: handel, verhuur en onderhoud

- **Wat:** uitbouwen wat er al in zit (inruil, huur, tweedehands onderdelen, machinetypes) naar onderhoudscontracten en servicehistoriek per machine.
- **Sterk:** staat deels al in het pakket **[Missing Link]**; de bouw- en installatiepakketten doen dit niet **[inschatting]**.
- **Zwak:** kleine doelgroep; ik heb deze markt niet onderzocht. Te bekijken als aparte vraag.

---

## 6. Vergelijking [inschatting]

Score van 1 (zwak) tot 5 (sterk). De scores zijn mijn inschatting; pas ze aan met wat je van je klanten weet.

| Kandidaat | Uniek | Breed | Zichtbaar | Moeilijk na te bouwen | Dichtbij | Licht in te voeren | Som |
|---|---|---|---|---|---|---|---|
| A. Productconfigurator | 5 | 2 | 5 | 5 | 4 | 1 | 22 |
| **B. Werfketting** | 4 | 4 | 4 | 3 | 4 | 4 | **23** |
| C. AI-assistent | 2 | 5 | 4 | 1 | 5 | 5 | 22 |
| D. AI leest lijsten | 4 | 4 | 2 | 3 | 2 | 4 | 19 |
| E. Portaal klant/dealer | 3 | 3 | 3 | 2 | 1 | 3 | 15 |
| F. Wettelijke aanleiding | 1 | 4 | 2 | 1 | 2 | 4 | 14 |
| G. Machines | 3 | 1 | 2 | 3 | 3 | 3 | 15 |

**Wat de tabel zegt:**

- A, B en C liggen dicht bij elkaar, maar om verschillende redenen. A is het meest uniek maar het zwaarst per klant. C is het lichtst maar het minst houdbaar. B zit ertussen.
- Geen enkele kandidaat wint alleen. De sterkste positie is een **combinatie**: A en B delen dezelfde motor en dezelfde offerte, en C en D halen de zwakte van A weg.

---

## 7. Voorstel

### 7.1 Eén module, twee smaken

**"Tekenen tot factuur"** (werknaam): alles wat de klant koopt, wordt getekend, geprijsd en opgevolgd in één ketting.

| Smaak | Voor wie | Inhoud |
|---|---|---|
| **Werf** | Aannemers, ramenplaatsers, schrijnwerkers, installateurs | Ramenlijst of plattegrond → offerte met posities en tekening → inmeting op tablet → akkoord → meerwerkbon met handtekening → order, bestelbon, vorderingsstaat in Missing Link |
| **Product** | Meubelmakers, later ramen en deuren, carrosserie, machinebouw | Product samenstellen op maat → prijs en stuklijst → offerte met tekening en 3D → order; later website en dealerportaal |

AI loopt door beide: lijsten inlezen bij de inrichting (D) en de assistent voor het dagelijkse werk (C).

Dit past bij de beslissing van 31/10: het blijft een aparte app die met Missing Link koppelt en ook los verkocht kan worden. Voor een klant van Missing Link voelt het als een module.

### 7.2 Volgorde

| Stap | Wat | Waarom eerst |
|---|---|---|
| 1 | **Server en koppeling met Missing Link**: projecten bewaren, offerte wegschrijven als offerteregels (fase 3 uit het stappenplan). Eerst de betekenis van `keuzegroep`, `optie_sleutel`, `vereist_sleutel` en `berekening` bevestigen (actiepunt 0.3). | Zonder dit blijft alles een demo in de browser. Nodig voor elke smaak. |
| 2 | **Werf, smal:** ramenlijst → offerte → inmeting → meerwerkbon, gekoppeld aan project, order en factuur. De plattegrond en de gevels blijven beschikbaar maar zijn geen voorwaarde. | Breed inzetbaar, weinig inrichting per klant, sluit aan op bestaande onderdelen. |
| 3 | **Product, met één pilootklant:** de zetelconfigurator met echte gegevens (fase 0.2: prijslijst, stofgroepen, toegelaten opties). | Het zichtbaarste verkoopargument; één echte klant is het bewijs. |
| 4 | **AI leest lijsten:** prijslijst van een leverancier → artikels en prijstabellen, met controlescherm. | Maakt stap 3 herhaalbaar voor de tweede en derde klant. |
| 5 | **Portaal:** klant tekent offerte en meerwerk online; daarna dealers. | Bouwt op 2 en 3; alleen zinvol als die lopen. |

In- en uitchecken en tijdsregistratie (2027) horen bij de werkbonnen van Missing Link zelf, niet bij deze module. Wel te plannen vóór april 2027.

### 7.3 Prijszetting [inschatting]

- De gewone formules gaan per gebruiker (€ 24 – 44). Een module die per klant ingericht moet worden, past beter **per firma per maand**, met een eenmalige inrichting per productmodel.
- Ter vergelijking: een apart configuratorpakket voor de maakindustrie zou "vanaf € 15.000" kosten (Merkato, niet duidelijk of eenmalig of per jaar) en een bureau rekent € 30.000 – 100.000 voor één raamconfigurator **[zoekresultaat]**. Daar zit ruimte onder.
- De smaak *Werf* vraagt weinig inrichting en kan in de formule Volledig of als kleine toeslag; de smaak *Product* is een apart aanbod.

### 7.4 Risico's

| Risico | Wat eraan doen |
|---|---|
| De inrichting per klant slorpt alle tijd op (A) | Sjablonen per sector, AI leest lijsten (D), en per klant beginnen met één productfamilie |
| Een concurrent bouwt inmeting en meerwerk na (B) | Snelheid, en de koppeling met tekening en configurator, die ze niet hebben |
| De AI-voorsprong verdwijnt (C) | Niet als hoofdargument verkopen |
| Te breed beginnen | Stap 2 en 3 elk met één echte klant, pas daarna verbreden |
| Marktgegevens kloppen niet | Alles in §4 is zoekresultaat: nakijken vóór gebruik in verkoop |

---

## 8. Open vragen voor Jonas

1. **Voor wie is Missing Link eerst bedoeld?** Bouw en installatie (dan weegt *Werf* het zwaarst) of maakbedrijven (dan *Product*)? De scores in §6 hangen daarvan af.
2. **Meerwerk:** herken je bij je klanten dat meerwerk vaak niet of te laat gefactureerd wordt? Ik vond er geen cijfers over.
3. **Machines (G):** is machinehandel en -verhuur een bewuste doelgroep? Dan verdient die een eigen onderzoek.
4. **Koppeling met raamsoftware:** wil je die in Missing Link? Voor ramenplaatsers is het een voorwaarde naast de eigen configurator (zie [`onderzoek-raamsoftware.md`](onderzoek-raamsoftware.md)).
5. **Actiepunt 0.3** staat nog open: de betekenis van de offerteregelvelden bevestigen.

---

## 9. Bronnen

Alle bronnen hieronder zijn **zoekresultaten, niet geopend**.

**Concurrenten**
- Robaws: https://robaws.com/en/pricing · https://robaws.com/nl-BE/integraties · https://support.robaws.com/nl/article/project-nacalculatie-13ium70/
- Visma Bouwsoft: https://www.bouwsoft.be/nl/prijs-visma-bouwsoft
- Vertuoza: https://www.vertuoza.com/nl-nl/functies/artificiele-intelligentie-ai · https://www.vertuoza.com/nl-be/onze-packs
- Cafca: https://cafca.be/prijzen/ · https://cafca.be/koppeling-leveranciers
- Teamleader: https://www.teamleader.eu/pricing · https://www.emerce.nl/?p=7119351 · https://www.g2.com/products/Teamleader/reviews
- Odoo: https://www.odoo.com/nl_BE/pricing
- Exact: https://www.exact.com/benl/producten/bouw/features-en-prijzen · https://www.exact.com/benl/producten/productie/features-en-prijzen
- Admin2Win: https://admin2win.be/
- Ridder iQ, MKG, Merkato: https://ecisolutions.com/en-gb/products/ridder-iq/ridder-iq-essentials · https://www.mkg.eu/en-FR/mkg5-erp-system · https://www.getapp.co.uk/compare/129279/130023/elfsquad-cpq/vs/merkato
- LogiKal, koppeling met ERP: https://www.orgadata.com/en/product/module-overview

**AI in ERP**
- Business Central: https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/whatsnew/whatsnew-update-28-0
- Overzicht boekhoudpakketten met AI-koppeling: https://norman.finance/de/en/blog/mcp-server-accounting-software
- Plancraft: https://www.htgf.de/en/plancraft-series-b/

**Wetgeving**
- E-facturatie en e-reporting: https://www.banqup.com/nl-be/resources/compliance-pulse/belgie
- Check In and Out at Work: https://www.partena-professional.be/nl/onze-inzichten/infoflashes/check-and-out-work-voor-werken-onroerende-staat-uitgesteld-naar-1-april
- Tijdsregistratie: https://www.securex.be/nl/lex4you/werkgever/nieuws/tijdsregistratie-verplicht-vanaf-2027-geen-prikklok-nodig
- Bouwproductenverordening: https://www.buildwise.be/media/gojpkpqp/ce_checklist_nl.pdf
- Productpaspoort: https://oneclicklca.com/en/resources/articles/first-espr-working-plan · https://economie.fgov.be/en/themes/enterprises/specific-sectors/construction/construction-products/regulation-eu-20243110/digital-product-passport

**Markt**
- Faalkosten: https://www.bouwenmetstaal.nl/uploads/nieuws/Verspilde_moeite_©ABNAMRO_2019.pdf
- Exact KMO Barometer 2025, bouw: https://files.exact.com/static/web/pdf/mkb-barometer/2025/BENL-CST-mkb-barometer-sectorrapport.pdf
- Knelpuntberoepen: https://www.vdab.be/trends/knelpuntberoepen

**Missing Link:** vastgesteld via de API op 10/11/2026 (onderdelen, artikels met prijzen, offerte OFF20260005 met regelstructuur, projecten; calculaties, samengestelde artikels en orders zijn leeg).
