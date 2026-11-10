# Machinehandel en -verhuur — unieke module voor Missing Link

*Versie 1 — 10 november 2026*

Vervolg op [`analyse-unieke-module-missing-link.md`](analyse-unieke-module-missing-link.md) (kandidaat G). Jonas bevestigde op 10/11 dat machinehandel en -verhuur een **bewuste doelgroep** is. Dit document zoekt uit waarmee Missing Link zich daar kan onderscheiden.

> **Hoe betrouwbaar is dit document?**
> - **[Jonas]**: beschrijving van Missing Link door Jonas (stand 10/11/2026).
> - **[Missing Link]**: zelf vastgesteld in de API.
> - **[zoekresultaat]**: uit samenvattingen van een zoekmachine. **Geen enkele pagina kon geopend worden** (netwerkinstellingen van de sessie). Kijk alles na aan de bron, zeker de wetgeving en de prijzen.
> - **[inschatting]**: mijn eigen afleiding.
>
> "Niet gevonden" is geen bewijs dat iets niet bestaat. Nog niet bekend: welk soort machines (landbouw, bouw, heftrucks, tuin en park). Het onderzoek is daarom breed gehouden.

---

## 1. Samenvatting

1. **Missing Link heeft de basis voor dit segment al**: machinefiche per serienummer, handel met opties, tweedehands met margeregeling, inruil, verhuur met kalender en terugname, werkbonnen met tellerstand en keuring, contracten **[Jonas]**. Dat is ongeveer wat de gespecialiseerde pakketten ook als kern hebben **[zoekresultaat]**.
2. **De gespecialiseerde pakketten zijn groot of buitenlands.** Aptean (op Microsoft Business Central), Annata en Infor mikken op grote dealers; Bever is Nederlands; de verhuurpakketten (MCS, inspHire, Point of Rental) zijn verhuur alleen. Een betaalbaar pakket voor de kleine Belgische dealer die verkoopt, verhuurt én herstelt, vond ik niet als duidelijk aanbod **[zoekresultaat]**.
3. **Drie dingen vond ik bij (bijna) niemand** **[zoekresultaat]**:
   - een **keuringsdossier volgens de Belgische regels** (hefwerktuigen, spuittoestellen, technische keuring), met herinneringen en attesten;
   - een **merkonafhankelijke configurator** voor de offerte van een machine met opties;
   - **draaiuren uit telematica** die vanzelf het onderhoud inplannen (alleen bij de duurdere verhuurpakketten).
4. **Wat Missing Link al kan, is op zich een verkoopargument.** De scherpste Nederlandstalige vragen online gaan over inruil en de margeregeling op één factuur. Dat zit er al in **[Jonas]**.
5. **Voorstel:** een **"Machinedossier"** als unieke module: per machine één levend dossier (keuringen, onderhoud op draaiuren, attesten, historiek), dat de klant kan inzien. Daarna de **machineconfigurator** op dezelfde motor als de zetelconfigurator. Zie §7.

---

## 2. Wat Missing Link vandaag kan [Jonas]

| Onderdeel | Wat |
|---|---|
| **Machinefiche** | Merk, model, machinetype, serienummer, tellerstand, magazijn, en de klant bij wie de machine staat. Per klant zie je zijn machines. |
| **Handel** | Verkopen via offerte, order, leveringsbon en factuur. Vaste onderdelen worden samen geleverd, opties apart. Voorraad per stuk (per serienummer). |
| **Tweedehands** | Aankoopwaarde en waardevermindering per machine; margeregister voor de btw-margeregeling. |
| **Inruil** | Inruilregel op offerte en factuur. |
| **Verhuur** | Huurprijzen per machine, waarborg, huurregels op offerte en order. Verhuurkalender in de planning. Meegeven en terugnemen, met de toestand bij terugname. |
| **Onderhoud en service** | Werkbonnen op een machine, met tellerstand, garantie, keuring en de datum van het volgende onderhoud. Contracten. |
| **Eromheen** | Planning, Peppol-facturatie, Exact Online, app voor techniekers, AI-koppeling. |

Op de offerteregel zag ik de bijhorende velden: `machinetype_id`, `machine_sleutel`, `inruil_machine_id`, `inruil_vorm`, `btw_marge`, `huur_machine_id`, `huur_van`, `huur_tot`, `tweedehands_onderdelen`, `onderdelen_tonen` **[Missing Link]**. Machines, machinetypes en contracten zelf zijn via de AI-koppeling nog niet te lezen.

---

## 3. De markt [zoekresultaat]

### 3.1 Pakketten voor machinedealers

| Pakket | Positie | Opvallend |
|---|---|---|
| **Aptean Equipment DMS** (vroeger TRASER, JMA) | Op Microsoft Business Central; verkoop, verhuur, service en onderdelen | In 2026 gelanceerd in acht Europese markten, met AI-agenten; adverteren op marktplaatsen met één klik; koppeling met fabrikanten en garantieclaims; schade schatten uit overdrachtsfoto's. Prijs niet publiek. |
| **Bever Powerall Connect** (NL) | Landbouwmechanisatie | Werkplaats, magazijn, werkbon-app, Peppol |
| **XPOWER XDMS** (België, Beervelde) | Trucks, bouw, material handling | Landbouw niet vermeld |
| **Carfac** (België) | Auto, landbouw, bouw, industrie | Modules niet bevestigd |
| **Ibcos Gold** (VK) | Landbouw- en tuindealers | Meer dan 500 bedrijven; in de Benelux niet gevonden |
| **Irium** (FR) | Dealers, herstellers, verhuurders | — |
| **Autologica**, **Annata 365**, **Infor M3** | Grote, internationale dealers | Koppelingen met fabrikanten (bv. de offertetool van John Deere) |

### 3.2 Pakketten voor verhuur

| Pakket | Positie | Prijs (na te kijken) |
|---|---|---|
| **MCS** | Verhuur van machines; telematica, app met foto's en handtekening, klantenportaal, attesten | Op aanvraag |
| **DynaRent / STAEDEAN** (NL) | Op Dynamics 365; portaal met schademelding | Op aanvraag |
| **RentMagic** (NL) | Verhuur, koppeling met AFAS | Vanaf € 92 per gebruiker |
| **inspHire**, **Point of Rental**, **Baseplan** | Internationale verhuurpakketten | Op aanvraag |
| **Rentman** | Evenementen en productie | € 39 + € 14–19 per gebruiker |
| **Booqable**, **HireHop** | Kleine verhuurders, online boeken | Vanaf ± $ 22–35 per maand |
| **Odoo** (België) | Algemeen ERP met verhuur-app | Per gebruiker |

### 3.3 Wat bijna iedereen heeft

Offerte tot factuur, voorraad per serienummer, werkplaats en werkbon, onderdelen, verhuurplanning en een mobiele app. In verhuurpakketten ook: foto's en handtekening bij uitgifte en terugname, een klantenportaal en opvolging van attesten.

**Gevolg:** foto's en handtekening bij uitgifte en terugname zijn in verhuur een verwachting, geen onderscheid. Als Missing Link de toestand bij terugname nu zonder foto's noteert, is dat een gat om te dichten.

### 3.4 Wat weinigen hebben

| Functie | Stand |
|---|---|
| **Keuringen volgens de Belgische regels** (cyclus per soort machine, herinneringen, attesten) | Niet gevonden. MCS volgt attesten volgens de Britse regels; Centix doet hijsmiddelen. |
| **Merkonafhankelijke machineconfigurator** op de offerte | Niet gevonden in Benelux-pakketten. Alleen tools van fabrikanten, gekoppeld aan Amerikaanse pakketten. |
| **Draaiuren uit telematica** die onderhoud inplannen | Trackunit koppelt met enkele verhuurpakketten; John Deere, Cat en Volvo bieden de gegevens aan. Koppeling met een Benelux-dealerpakket niet gevonden. |
| **Waardebepaling** van inruil en tweedehands | Losse diensten (LECTURA, Ritchie Bros met Mascus-gegevens); koppeling met dealersoftware niet gevonden. |
| **Adverteren** van tweedehands op portalen | Alleen bij Aptean gevonden. |
| **AI** | Alleen bij Aptean gevonden. |
| **Klantenportaal** met het machinepark | Bij de grotere verhuurpakketten; met Belgische keuringsattesten niet gevonden. |

### 3.5 Marktcijfers

- Landbouwdealers in België: ± 290 dealers, ± 2.100 werknemers in 2024 (Fedagrim, via CLIMMAR en Agribex).
- Verhuur: de Belgische vereniging BERA bestaat sinds juli 2023 en telt meer dan 40 leden. Europese verhuurmarkt: € 34 miljard in 2026 (ERA).
- Niet gevonden: aantallen voor bouwmachines, heftrucks en tuin en park in België.

---

## 4. Wat eraan komt [zoekresultaat]

Alles hieronder komt uit zoekresultaten en **moet nagekeken worden bij de bron** voor het in een verkoopgesprek of in het pakket komt.

| Wat | Wanneer | Betekenis voor een dealer of verhuurder |
|---|---|---|
| **Machineverordening** (EU) 2023/1230 | Van toepassing vanaf 20/1/2027 | Wie een machine wezenlijk wijzigt, wordt zelf fabrikant. Een dossier per machine met wat eraan veranderd is, wordt belangrijker. |
| **Hefwerktuigen** (hoogwerkers; heftruck met werkbak of bij hijsen) | Bestaand: driemaandelijkse keuring door een erkende keuringsdienst | Elke verhuurder van hoogwerkers moet per machine vier keer per jaar een keuring opvolgen en het attest kunnen tonen. |
| **Spuittoestellen** | Driejaarlijkse keuring; nieuwe cyclus en strengere eisen vanaf 1/1/2026 | Landbouwdealers kunnen hun klanten verwittigen en het onderhoud ervoor inplannen. |
| **Technische keuring landbouwvoertuigen** (Vlaanderen) | Tweejaarlijks vanaf 1/9/2026 | Idem: een nieuwe, terugkerende termijn per machine. |
| **Mobiele machines op de weg** (EU) 2025/14 | Verplicht vanaf 29/1/2028 | Goedkeuring voor de weg wordt een gegeven op de machinefiche. |
| **Data Act** | Van toepassing sinds 12/9/2025; toegang tot gegevens "bij ontwerp" vanaf 12/9/2026 | De eigenaar krijgt recht op de gegevens van zijn machine (draaiuren, meldingen). Dat maakt een telematicakoppeling haalbaarder. |

**Les:** de keuringen zijn terugkerend, per machine en per land verschillend. Dat is precies wat een buitenlands pakket slecht doet en wat op de bestaande machinefiche van Missing Link past (keuring en volgend onderhoud staan al op de werkbon **[Jonas]**).

---

## 5. Concrete vragen die dealers en verhuurders online stellen [zoekresultaat]

Titels zijn letterlijk; de inhoud komt uit de samenvatting van de zoekmachine. Reddit en Tweakers waren niet doorzoekbaar.

**Verhuur: de meeste en scherpste vragen**

| Vraag (titel van de draad) | Waar |
|---|---|
| "How to avoid duplicate booking and payment in odoo rental?" | [Odoo-forum](https://www.odoo.com/forum/help-1/how-to-avoid-duplicate-booking-and-payment-in-odoo-rental-272517) |
| "Why the price of rent a product for 8 days is $330? If my prices are 1 week $200, 1 day $50, and 3 days $110" | [Odoo-forum](https://www.odoo.com/forum/rental-25/why-the-price-of-rent-a-product-for-8-days-is-330-if-my-prices-are-1-week-200-1-day-50-and-3-days-110-162642) |
| "Help Please!! Manage Security Deposits in Odoo for a Camera Rental Business" | [Odoo-forum](https://www.odoo.com/forum/help-1/help-please-manage-security-deposits-in-odoo-for-a-camera-rental-business-269906) |
| "Equipment Abuse/Damage", "Ever charge a customer for breaking equipment?" (schade aanrekenen, foto's als bewijs) | [Heavy Equipment Forums](https://www.heavyequipmentforums.com/threads/equipment-abuse-damage.30094/) · [Lawnsite](https://www.lawnsite.com/threads/ever-charge-a-customer-for-breaking-equipment.44926/) |
| "Whats your Overtime charge", "Weekend rates?" (draaiuren boven de norm, weekendtarief) | [Heavy Equipment Forums](https://www.heavyequipmentforums.com/threads/whats-your-overtime-charge.41928/) |
| "voorraadbeheer verhuurbedrijf" (de boekingsagenda liet maar één boeking tegelijk toe) | [Higherlevel](https://www.higherlevel.nl/forums/topic/52647-voorraadbeheer-verhuurbedrijf/) |

**Inruil en margeregeling: de scherpste Nederlandstalige vragen**

| Vraag | Waar |
|---|---|
| "Verkoop margegoed met inruil: hoe factuur opstellen en btw-aangifte doen?" | [Higherlevel](https://www.higherlevel.nl/forums/topic/59340-verkoop-margegoed-met-inruil-hoe-factuur-opstellen-en-btw-aangifte-doen/) |
| "Verwerken van inruil op een verkooporder in het journaal" | [Higherlevel](https://www.higherlevel.nl/forums/topic/54336-verwerken-van-inruil-op-een-verkooporder-in-het-journaal/) |
| "Marge tweedehands goederen, naast nieuwe producten verkopen in administratie" | [Higherlevel](https://www.higherlevel.nl/forums/topic/54343-marge-tweedehands-goederen-naast-nieuwe-producten-verkopen-in-administratie/) |
| "Mixed margin scheme (taxation on margin) and normal VAT on the same invoice" | [Odoo-forum](https://www.odoo.com/forum/help-1/mixed-margin-scheme-taxation-on-margin-and-normal-vat-on-the-same-invoice-how-to-handle-in-odoo-17-297036) |
| "How does Odoo handle a trade in?" | [Odoo-forum](https://www.odoo.com/forum/help-1/how-does-odoo-handle-a-trade-in-like-when-a-used-car-is-received-and-a-new-car-is-delivered-207806) |

**Onderhoud en historiek per machine**

| Vraag | Waar |
|---|---|
| "Software For Tracking Customer Equipment Maintenance?" | [Heavy Equipment Forums](https://www.heavyequipmentforums.com/threads/software-for-tracking-customer-equipment-maintenance.65180/) |
| "Scheduled / Recurring Maintenance on Equipments" (het antwoord: alleen een interval in dagen, niet in draaiuren) | [Odoo-forum](https://www.odoo.com/forum/help-1/scheduled-recurring-maintenance-on-equipments-101757) |
| "Service and Repair Industry" (een dealer met werkplaats wil het serienummer volgen van verkoop tot terugkerend onderhoud) | [ERPNext-forum](https://discuss.frappe.io/t/service-and-repair-industry/29278) |
| "how do I pull a report of serial numbers and what repairs have been done over years?" (citaat) | [ERPNext-forum](https://discuss.frappe.io/t/mark-serial-number-to-repair/64716) |

**Opties op de offerte en prijslijsten**

| Vraag | Waar |
|---|---|
| "Feature Request: BOM and Component Selection in Sales Quotations for Manufacturing and Kits" | [Odoo-forum](https://www.odoo.com/forum/help-1/feature-request-bom-and-component-selection-in-sales-quotations-for-manufacturing-and-kits-348183) |
| "Updating, not importing pricelist for products" (± 10.000 producten, opnieuw inlezen gaf dubbels) | [Odoo-forum](https://www.odoo.com/forum/help-1/updating-not-importing-pricelist-for-products-248954) |

**Klachten over bestaande pakketten** (reviews)

- inspHire: "service levels have just dropped through the floor"; "needs a bit of modernising now" ([Capterra](https://www.capterra.co.uk/reviews/86964/insphire)).
- MCS: "increased our monthly price by 4% each year and this year increased by 10%" ([Capterra](https://www.capterra.com/p/33074/MCS-rm-rental-software/)).
- Point of Rental: "the interface and UI for online is antiquated" ([Software Advice](https://www.softwareadvice.com/retail/rental-essentials-profile/reviews/)).

**Niets gevonden als vraag van een gebruiker:** adverteren op Mascus of TractorPool vanuit het pakket, prijslijsten van Kramp, herinneringen voor keuringen, telematica automatisch inlezen, AI.

**Wat dit zegt:**

- De vragen over verhuur (dubbele boeking, prijs per dag en week, waarborg, schade) en over inruil met margeregeling gaan over dingen die Missing Link al heeft **[Jonas]**. Dat is een verkoopargument dat vandaag al klopt: "een algemeen pakket kan dit niet, wij wel".
- Onderhoud op draaiuren ontbreekt in een algemeen pakket (Odoo rekent in dagen). Missing Link houdt de tellerstand al bij.
- Voor keuringen vond ik geen vragen online. De verplichting bestaat wel (§4); het bewijs van de vraag moet dus van eigen klanten komen.

---

## 6. De kandidaten

| Kandidaat | Wat | Sterk | Zwak |
|---|---|---|---|
| **M1. Keuringsdossier België** | Per machine de keuringen volgens haar soort (hefwerktuig, spuittoestel, voertuig), met vervaldatum, herinnering aan dealer en klant, het attest als bijlage, en een werkbon of afspraak die vanzelf klaarstaat | Niet gevonden bij concurrenten; wettelijk verplicht en terugkerend; bouwt op wat er al is (keuring en volgend onderhoud op de werkbon); brengt de dealer werk op | De regels moeten juist zijn en bijgehouden worden; verschilt per soort machine |
| **M2. Machineconfigurator** | Een machine samenstellen op de offerte: machinetype, vaste onderdelen, opties en aanbouwdelen met regels ("deze lader past niet op dat model"), prijs en beeld | Niet gevonden in Benelux-pakketten; dezelfde motor als de zetelconfigurator; machinetype met vaste onderdelen en opties bestaat al | Productkennis per merk moet ingevoerd worden; fabrikanten hebben eigen tools |
| **M3. Onderhoud op draaiuren** | Tellerstand (met de hand, via de technieker-app of uit telematica) bepaalt wanneer het volgende onderhoud valt; planning en klant worden verwittigd | Ontbreekt in algemene pakketten; tellerstand zit er al in | Telematica per merk is veel koppelwerk; met de hand ingegeven standen zijn snel verouderd |
| **M4. Uitgifte en terugname op tablet** | Foto's, schade aanduiden, tellerstand, handtekening van de klant; schade meteen op de factuur | Lost de discussies over schade op; de techniek bestaat al in de bouwdemo (inmeting en meerwerkbon met handtekening) | In verhuurpakketten al gangbaar: nodig, niet uniek |
| **M5. Klantenportaal machinepark** | De klant ziet zijn machines, keuringen, attesten en werkbonnen, en vraagt onderhoud of huur aan | Maakt M1 en M3 zichtbaar voor de klant; bindt de klant aan de dealer | Alleen zinvol met M1 of M3 erachter |
| **M6. Tweedehands: waarde en advertentie** | Richtprijs voor inruil; de machine met foto's doorsturen naar verkoopportalen | Spaart dubbel werk | Afhankelijk van externe diensten; geen vraag online gevonden |
| **M7. AI leest prijslijsten** | Onderdelenprijslijsten bijwerken zonder dubbels | Zelfde bouwsteen als in de hoofdanalyse (kandidaat D) | Op zich weinig zichtbaar |

### Vergelijking [inschatting]

Zelfde toetsstenen als in de hoofdanalyse (1 = zwak, 5 = sterk).

| Kandidaat | Uniek | Breed | Zichtbaar | Moeilijk na te bouwen | Dichtbij | Licht in te voeren | Som |
|---|---|---|---|---|---|---|---|
| **M1. Keuringsdossier België** | 5 | 4 | 3 | 3 | 4 | 4 | **23** |
| M2. Machineconfigurator | 4 | 3 | 5 | 4 | 3 | 2 | 21 |
| M3. Onderhoud op draaiuren | 3 | 4 | 3 | 2 | 4 | 4 | 20 |
| M4. Uitgifte en terugname op tablet | 2 | 3 | 4 | 2 | 4 | 5 | 20 |
| M5. Klantenportaal machinepark | 3 | 4 | 4 | 2 | 2 | 3 | 18 |
| M6. Waarde en advertentie | 3 | 3 | 3 | 2 | 1 | 3 | 15 |
| M7. AI leest prijslijsten | 3 | 3 | 2 | 3 | 2 | 4 | 17 |

---

## 7. Voorstel

### 7.1 De positie

**"Alles voor de dealer die verkoopt, verhuurt en herstelt, in één betaalbaar pakket."** Handel, tweedehands met margeregeling, inruil, verhuur en service zitten al in Missing Link **[Jonas]**. De gespecialiseerde pakketten zijn groot en duur of doen maar één van de drie **[zoekresultaat]**. Dat is de basis; de unieke module komt erbovenop.

### 7.2 De unieke module: het Machinedossier

Per machine één levend dossier, opgebouwd uit wat er al is en aangevuld met M1, M3 en M5:

| Deel | Inhoud |
|---|---|
| **Keuringen** (M1) | Per soort machine de verplichte keuringen met hun termijn; vervaldatum, herinnering, attest als bijlage; een machine met een vervallen keuring kan niet verhuurd worden zonder waarschuwing |
| **Onderhoud** (M3) | Volgend onderhoud op datum óf op tellerstand, wat eerst komt; de technieker-app vraagt de tellerstand bij elke werkbon |
| **Historiek** | Alle werkbonnen, verhuringen, schade en wijzigingen aan de machine op één tijdlijn (ook nuttig voor de Machineverordening van 2027) |
| **Voor de klant** (M5, later) | De klant ziet zijn machines, wat er vervalt en de attesten, en vraagt een afspraak aan |

**Waarom dit eerst:** niet gevonden bij concurrenten, wettelijk verplicht, terugkerend, en het brengt de dealer zelf omzet op (elke herinnering is een werkbon). Het bouwt bijna helemaal op bestaande onderdelen.

### 7.3 Volgorde

| Stap | Wat | Opmerking |
|---|---|---|
| 1 | **Keuringen per soort machine** met termijn, vervaldatum, herinnering en attest | Eerst met één of twee klanten nagaan welke keuringen voor hun machines gelden en hoe ze die nu opvolgen |
| 2 | **Onderhoud op tellerstand** naast datum | Tellerstand komt van de werkbon en van de terugname bij verhuur |
| 3 | **Uitgifte en terugname op tablet** met foto's, schade en handtekening | Geen onderscheid, wel verwacht in verhuur; de techniek uit de bouwdemo is herbruikbaar |
| 4 | **Machineconfigurator** op de offerte | Na de zetelconfigurator bij de meubelmaker: zelfde motor, zelfde koppeling met de offerte |
| 5 | **Klantenportaal** met machinepark en attesten | Samen met het portaal uit de hoofdanalyse |
| 6 | **Telematica** voor draaiuren, per merk | Pas als een klant erom vraagt en het merk de gegevens aanbiedt |

### 7.4 Samenhang met "Tekenen tot factuur"

- De **machineconfigurator** is de smaak *Product* voor machines: machinetype in plaats van zetelmodel, opties en aanbouwdelen in plaats van stof en poten.
- **Uitgifte en terugname** gebruikt dezelfde bouwstenen als de smaak *Werf*: opname op tablet, foto, verschil met de vorige toestand, handtekening.
- Het **Machinedossier** is nieuw en hoort bij Missing Link zelf, niet bij de configurator.

De volgorde uit de hoofdanalyse blijft: eerst de meubelmaker met de zetelconfigurator. Stap 1 en 2 hierboven zijn werk in Missing Link zelf en kunnen daar los van lopen.

---

## 8. Open vragen voor Jonas

1. **Welk soort machines eerst?** Landbouw (spuitkeuring, technische keuring), bouw en hoogwerkers (driemaandelijkse keuring), heftrucks, tuin en park? De keuringen en de concurrenten verschillen per soort.
2. **Keuringen:** hoe volgen je (toekomstige) klanten die nu op: in een lijst, op papier, via de keuringsdienst? Ik vond er online geen vragen over; het bewijs moet van klanten komen.
3. **Terugname bij verhuur:** worden er nu foto's en een handtekening bewaard, of alleen een beschrijving van de toestand?
4. **Machinetypes en opties:** hoeveel productkennis zit er nu in (welke optie op welk type past)? Dat bepaalt hoe ver de stap naar een configurator is.
5. **AI-koppeling:** machines, machinetypes en contracten zijn er nog niet mee te lezen. Toevoegen, zodat ook dit deel met de assistent werkt?

---

## 9. Bronnen

Alle bronnen zijn **zoekresultaten, niet geopend**.

**Pakketten**
- Aptean: https://www.aptean.com/en-US/resources/pressroom/press-release/aptean-ai-powered-equipment-dealer-management-system · https://www.aptean.com/en-AU/industries/software-for-equipment-dealers/agriculture-equipment
- Bever: https://beversoftware.nl/wp-content/uploads/2023/11/Bever-Bulletin-2023_01-7_12-Web.pdf
- XPOWER: https://www.hexon.eu/services/dv/providers/details/237/XPOWER.html
- Carfac: https://companyweb.be/en/integrations/35/carfac
- Ibcos Gold: https://goldlite.myzen.co.uk/gold.php
- MCS: https://www.mcsrentalsoftware.com/en/rental-software/solutions/rental-software/customer-portal
- STAEDEAN (DynaRent): https://docs.staedean.com/rental/Rental%20Customer%20Portal/en-us/BpmBusinessProcess_5637156291.html
- RentMagic: https://www.capterra.com/p/220095/RentMagic/
- Rentman: https://www.capterra.com/p/144616/Rentman/pricing/
- Offertetool John Deere: https://help.intellidealer.com/intellidealer/Content/Ref/About_JD_Quote_II.htm
- Telematica: https://trackunit.com/?p=10169 · https://developer.deere.com/dev-docs/equipment · https://volvoce.com/europe/en/volvo-services/uptime-services/aemp-2-0-api
- Waardebepaling: https://lectura.press/en/article/lectura-valuation-3-0-the-new-generation-of-machinery-pricing/3807
- Hijsmiddelen (Centix): https://www.centix.com/en/solution/lifting-and-hoisting-software/

**Wetgeving**
- Machineverordening: https://www.wolterskluwer.com/nl-be/expert-insights/machinery-regulation · https://www.khl.com/news/eu-machinery-regulation-to-impact-rental/8022670.article
- Hefwerktuigen: https://www.prebes.be/sites/default/files/activiteiten/1989/1441093127/pres_20150903.pdf · https://www.prevent.be/system/files/2023-09/preventmemo_heftrucks.pdf
- Spuittoestellen: https://news.belgium.be/nl/node/42370/pdf
- Technische keuring Vlaanderen: https://www.vlaanderen.be/mobiliteit-en-openbare-werken/auto-en-motor/technische-keuring-van-voertuigen/nieuwe-regels-voor-de-technische-keuring-vanaf-1-september-2026
- Mobiele machines op de weg: https://www.cece.eu/news/new-regulation-on-non-road-mobile-machinery-published-in-eu-official-journal
- Data Act: https://www.taylorwessing.com/de/insights-and-events/insights/2024/09/data-act-step-plan

**Markt**
- Fedagrim: https://www.climmar.com/members/belgium · https://press.agribex.be/nl/download/doc/26/het-economisch-dossier-van-fedagrim.pdf
- Verhuur België (BERA): https://www.khl.com/news/interview-bill-olivier-on-the-belgian-equipment-rental-market/8031523.article
- Verhuur Europa (ERA): https://erarental.org/wp-content/uploads/2026/04/20260601_ERA-x-KPMG_Convention-2026-vERA.pdf
