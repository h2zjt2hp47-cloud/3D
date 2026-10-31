# Productconfigurator voor Missing Link — analyse en stappenplan

*Versie 1 — 31 oktober 2026*

Doel: een configurator in de stijl van Hive CPQ (configureren → prijzen → offerte), ingebouwd in Missing Link, voor KMO-maakbedrijven (ramen en deuren, schrijnwerkerij, carrosserie, machinebouw, bouw). Eenvoudig te bouwen, eenvoudig te beheren, eenvoudig te gebruiken.

> **Hoe betrouwbaar is dit document?**
> Elke bewering heeft een label:
> - **[geverifieerd]**: in de primaire bron nagekeken (onderzoeksronde met 3-voudige controle).
> - **[bron, niet geverifieerd]**: komt uit zoekresultaten en samenvattingen. De pagina's zelf konden niet altijd geopend worden (vooral de websites van leveranciers).
> - **[inschatting]**: mijn eigen vakkennis of afleiding. Dit is dus een voorstel en geen bewezen feit.
> - **[Missing Link]**: rechtstreeks vastgesteld in de Missing Link API (gegevens van 31/10/2026).

---

## 1. Samenvatting

1. **Het is haalbaar met een klein team.** Begin wel met één productfamilie en zonder 3D. De moeilijkheid zit niet in de techniek maar in het **vastleggen van productkennis** als regels: welke combinaties mogen, welke maten kunnen, hoe de prijs ontstaat. De meeste CPQ-projecten lopen daarop vast **[bron, niet geverifieerd: Experlogix "7 traps"]**.
2. **Missing Link heeft al veel bouwstenen [Missing Link].** Een offerteregel kent nu al `keuzegroep`, `optie_sleutel`, `vereist_sleutel`, `optioneel`, `berekening`, `lengte`/`breedte`/`hoogte`, `afrondingsstap`, `minimum_aangerekend`, `beeld_id` en een link naar een prijsberekening (`herkomst_prijsberekening_id`). De configurator kan zijn resultaat dus als gewone offerteregels wegschrijven, zonder nieuwe offertestructuur.
3. **Regels als data, niet als code.** Met een open-source regelformaat zoals **JsonLogic** bewaar je regels als JSON in de databank. Dezelfde regels draaien dan in de browser (directe feedback) en op de server (controle voor de offerte) **[geverifieerd]**.
4. **Beslistabellen en formules volstaan voor de meeste KMO-sectoren.** Denk aan "optie A sluit B uit", "B vereist C", "breedte tussen 400 en 2400 mm", "prijs = m² × tarief". Een echte constraint-solver is pas nodig bij complexe machinebouw **[geverifieerd: de gekozen bibliotheken zijn géén solver] [inschatting: dat dit volstaat]**.
5. **Visualisatie gaat in stappen: eerst 2D, dan 3D.** Begin met een 2D-tekening (SVG) die met de maten meeschaalt; die past ook meteen in de offerte-PDF. 3D komt later als extra weergave van hetzelfde productmodel **[inschatting]**.
6. **Budgetindicatie.** Een op maat gebouwde raamconfigurator laten maken kost volgens een Nederlands bureau **€ 30.000–100.000**, met 8–18 weken tot livegang **[bron, niet geverifieerd: Kolonell]**. Commerciële pakketten werken met prijzen op aanvraag. Voor Hive circuleert een "vanaf ± € 1.500" waarvan niet duidelijk is waarop het slaat **[bron, niet geverifieerd]**.

---

## 2. Wat doet Hive CPQ?

| Onderdeel | Wat Hive aanbiedt | Label |
|---|---|---|
| Regelengine | Regelgebaseerde configurator die ongeldige configuraties blokkeert. Alleen foutloze configuraties kunnen besteld worden. | bron, niet geverifieerd |
| Prijzen | Prijzen uit eigen prijslijsten of prijslijsten van leveranciers. Prijzen per regio, klantengroep en volumekorting. | bron, niet geverifieerd |
| Visualisatie | Interactieve 3D-visualisatie. Het 3D-beeld komt mee in offertes en orderbevestigingen. Ook AR (augmented reality). | bron, niet geverifieerd |
| Documenten | Offertes, geavanceerde stuklijst (BOM), technische fiches en garantiedocumenten per product. | bron, niet geverifieerd |
| Website/dealers | "Experience Configurator" om in te bouwen op de website van de klant (bv. Dynaco-deuren). | bron, niet geverifieerd |
| Beheer | "Hive Design Studio": producten en regels modelleren zonder programmeren (low-code). | bron, niet geverifieerd |
| Integraties | Kant-en-klare koppelingen met Salesforce, Dynamics 365 (Sales, Finance/SCM, Business Central), Zoho CRM en PTC Windchill. Voor andere ERP's levert Hive "blueprints" en bouwt de IT van de klant de koppeling. Productdata gaat van ERP naar CPQ; configuraties, offertes en orders gaan terug naar het ERP, met statussynchronisatie in beide richtingen. | bron, niet geverifieerd |
| Sector ramen/deuren | Gegevens van leveranciers zoals Renson, Duco, Harol, Brustor, Roto, Suys en Nauta. ISO 27001-certificaat. | bron, niet geverifieerd |
| Prijsmodel | Geen publieke prijslijst. Per gebruiker en per maand, afhankelijk van modules en complexiteit, met implementatiekost erbovenop. | bron, niet geverifieerd |

**Wat we daarvan overnemen:** blokkeren van ongeldige combinaties, prijs uit prijslijsten plus regels, beeld in de offerte, een beheeromgeving zonder programmeren, en de flow ERP-data → configurator → offerte → order.
**Wat we (voorlopig) niet nodig hebben:** AR, koppelingen met externe CRM's en kant-en-klare leverancierscatalogi.

---

## 3. Andere pakketten

| Pakket | Positie | Sterk in | Prijs | Label |
|---|---|---|---|---|
| **Elfsquad** (NL) | Cloud-CPQ voor maakbedrijven, de dichtste Benelux-concurrent van Hive | Eén abonnement met onbeperkt aantal gebruikers. Koppelingen met Exact Online, Ridder iQ, HubSpot en Power Automate. Lichter dan Tacton, geschikt voor KMO's. | Op aanvraag, gratis proefperiode | bron, niet geverifieerd |
| **Tacton** | Enterprise, engineer-to-order | Constraint-gebaseerde engine voor zeer complexe producten | Op aanvraag; reviewers vooral grote bedrijven | bron, niet geverifieerd |
| **Epicor CPQ** (ex-KBMax) | Maatwerkproducenten | 3D-visualisatie | Vanaf ± USD 150 per gebruiker per maand (Software Advice) | bron, niet geverifieerd |
| **Configure One** (nu Experlogix) | Enterprise ETO, fabrikanten en distributeurs | Diepe ERP-koppeling | Op aanvraag | bron, niet geverifieerd |
| **Experlogix** | CPQ op Dynamics | Regels en berekeningen met formules zoals in Excel, door de beheerder zelf in te stellen | Op aanvraag | bron, niet geverifieerd |
| **DriveWorks** | Gebaseerd op SolidWorks | Automatisch CAD-modellen en tekeningen genereren (machinebouw) | — | bron, niet geverifieerd |
| Salesforce CPQ, Logik.ai, Threekit, Zakeke, Expivi, Perfion, Cincom | — | Niet onderzocht in deze ronde | — | — |

**Les uit de markt [inschatting]:** de dure pakketten (Tacton, Epicor, Configure One) zijn gebouwd voor grote bedrijven met engineer-to-order. KMO's zitten eerder bij Elfsquad en Hive: snel op te zetten, beheer zonder programmeren, en een koppeling met het ERP dat ze al hebben. Daar ligt de kans voor Missing Link: **geen aparte koppeling nodig, want de configurator zit in hetzelfde pakket** als artikels, calculaties en offertes.

---

## 4. Wat Missing Link al heeft [Missing Link]

Vastgesteld via de API:

| Onderdeel | Relevante velden | Nut voor de configurator |
|---|---|---|
| **Artikels** | `soort`, `eenheid`, `verkoopprijs`, `aankoopprijs`, `btw_tarief`, `berekening` (bv. `stuk`) | Het configureerbare hoofdproduct en de onderdelen of opties |
| **Catalogus/onderdelen** | `kostprijs_totaal` (alleen met kostrecht) | Onderdelen voor de stuklijst |
| **Prijsberekeningen** | Per klant/project, `kostprijs_totaal` | Tussenstap: de "calculatie" achter een configuratie |
| **Offertes** | `toestand` (ontwerp → verstuurd → aanvaard), `versie_van_id`, `fotos_bij_regels`, `prijzen_tonen`, `etag` | Eindresultaat; versies voor aangepaste configuraties |
| **Offerteregels** | `keuzegroep`, `optie_sleutel`, `vereist_sleutel`, `optioneel`, `berekening`, `maat` (mm), `lengte`, `breedte`, `hoogte`, `stuks`, `afrondingsstap`, `afronding_richting`, `minimum_aangerekend`, `beeld_id`, `kop`, `niveaunummer`, `herkomst_prijsberekening_id`, `machinetype_id`, `onderdelen_tonen` | **Opties, keuzegroepen, maatberekening, afbeelding en herkomst: allemaal al aanwezig** |
| **API** | REST/OpenAPI, `etag` met If-Match, `idempotency_key`, rekent zelf de totalen (de client niet) | Veilig wegschrijven zonder dubbele offertes of overschreven wijzigingen |

**Belangrijk:** de betekenis van de velden heb ik afgeleid uit hun namen. Laat de ontwikkelaar van Missing Link bevestigen hoe `keuzegroep`/`optie_sleutel`/`vereist_sleutel` en `berekening` (welke waarden bestaan er: stuk, m², lm, …?) precies werken. Dat is **actiepunt 0.3** in het stappenplan.

---

## 5. Hoe een configurator werkt — de bouwstenen

Een configurator heeft vijf lagen. Elke laag kan je eenvoudig beginnen en later uitbreiden.

### 5.1 Productmodel (wat kan de klant kiezen?)

| Begrip | Uitleg | Voorbeeld (raam) |
|---|---|---|
| **Configureerbaar product** | Hangt aan een artikel in Missing Link | "PVC-raam draai-kip" |
| **Kenmerk** | Een vraag aan de gebruiker: getal, keuzelijst of ja/nee. Met eenheid, min, max, standaard en stap. | Breedte (mm, 400–2400, stap 1), Kleur (keuze), Rolluik (ja/nee) |
| **Keuzewaarde** | Een antwoord op een keuzevraag, met label, afbeelding en eventueel gekoppeld artikel of onderdeel | Kleur = "Antraciet RAL 7016" → artikel "Kleurtoeslag foliering" |
| **Stap** | Groepering van kenmerken in de wizard | 1. Type → 2. Maten → 3. Afwerking → 4. Opties |

### 5.2 Regels (wat mag, wat moet?)

Vijf regeltypes dekken het overgrote deel van de praktijk **[inschatting]**:

| Regeltype | Betekenis | Voorbeeld |
|---|---|---|
| **Zichtbaar als** | Vraag tonen of verbergen | "Kleur rolluikkast" alleen als Rolluik = ja |
| **Vereist** | Keuze A vereist keuze B | Driedubbel glas vereist profiel 82 mm |
| **Sluit uit** | A en B kunnen niet samen | Schuifraam sluit "draai-kip-beslag" uit |
| **Bereik** | Toegelaten min/max, eventueel afhankelijk van andere keuzes | Max. breedte 1600 mm bij draai-kip, 2400 mm bij vast raam |
| **Melding** | Waarschuwing of blokkerende fout met uitleg | "Boven 2,5 m² is veiligheidsglas verplicht" |

De types "vereist" en "sluit uit" zijn eenvoudige **beslistabellen**. Zo modelleren ook constraint-gebaseerde configurators ze: een tabel "implies" (gericht) en een tabel "excludes" (wederzijds) **[bron, niet geverifieerd: RelationalAI-template]**.

**Techniek:** bewaar elke regel als **JsonLogic** (JSON).
- JsonLogic is gemaakt om dezelfde regels in de front-end en de back-end te draaien en samen met een record in een databank op te slaan **[geverifieerd]**.
- Regels verwijzen naar de keuzes via `var`, bv. `{"var":"breedte"}` **[geverifieerd]**.
- Het is één bestand zonder afhankelijkheden, onder de MIT-licentie, en uit te breiden met eigen functies (`add_operation`), bv. `m2(breedte, hoogte)` **[geverifieerd]**.
- Het alternatief is **json-rules-engine**: ook regels als JSON, met geneste EN/OF-condities, en het kan gegevens tijdens het rekenen asynchroon ophalen (bv. een prijs via de API) **[geverifieerd]**.

Voorbeeld van een regel zoals hij in de databank staat:

```json
{ "if": [
    { "and": [ { "==": [ { "var": "opening" }, "draai-kip" ] },
               { ">":  [ { "var": "breedte" }, 1600 ] } ] },
    "Draai-kip kan maximaal 1600 mm breed zijn.",
    null
] }
```

**Let op:** JsonLogic en json-rules-engine zijn **geen constraint-solvers** **[geverifieerd]**. Ze controleren keuzes, maar rekenen niet zelf uit welke resterende opties nog kunnen. Voor KMO-producten los je dat op door ongeldige keuzewaarden grijs te tonen: je evalueert de regels voor elke mogelijke waarde. Dat is snel genoeg zolang het aantal keuzes beperkt blijft **[inschatting]**.

### 5.3 Prijs (wat kost het?)

Drie prijsmethodes. In de praktijk combineer je ze:

| Methode | Wanneer | Voorbeeld |
|---|---|---|
| **Formule** | Prijs volgt uit maten | `m² × 185 €`, `lopende meter × 42 €`, met minimum 1 m² |
| **Prijsmatrix** | Leverancierslijsten per maat (typisch ramen, zonwering, rolluiken) | Tabel breedte × hoogte → prijs; afronden naar de volgende maatklasse |
| **Stuklijst (BOM)** | Prijs = som van onderdelen × (1 + marge) | Profielen (lm), glas (m²), beslag (stuk), arbeid (uren) |

Daarna komen marge, kortingen per klantengroep en afronding. Missing Link heeft afronding (`afrondingsstap`, `afronding_richting`) en `minimum_aangerekend` al op regelniveau **[Missing Link]**. Houd de **berekening van de configuratie** (stuklijst, kost) gescheiden van de **prijslaag** (toeslagen, staffels, minimummarge) **[bron, niet geverifieerd: ecosire]**.

### 5.4 Stuklijst en werkvoorbereiding

Elke stuklijstregel heeft drie delen:
- een **onderdeel/artikel**;
- een **hoeveelheidsformule**, bv. profiel = `2 × (breedte + hoogte) / 1000` lm;
- een **voorwaarde** (alleen als Rolluik = ja).

Zo komen prijs, offerte en later de zaaglijst of het productieorder uit **dezelfde bron**. Een praktijkvoorbeeld uit plaatbewerking: 124 productkenmerken gaan in beide richtingen tussen configurator en ERP, met kostramingen, stuklijsten, bewerkingsvolgordes en artikelstamdata als resultaat **[bron, niet geverifieerd: Experlogix/States Industries]**.

### 5.5 Visualisatie

Zie hoofdstuk 8 (2D en 3D).

---

## 6. Gebruiksgemak

### 6.1 Voor wie configureert

Uit onderzoek van UNamur (België): gebruikers waarderen **gebruiksgemak en visualisatie** het meest. Ze ergeren zich vooral aan het **ontbreken van een voortgangs- of statusindicator** en het **ontbreken van visualisatie** **[bron, niet geverifieerd]**. Een experiment toont dat **tussentotalen of prijzen per onderdeel** het gevoel van controle verhogen **[bron, niet geverifieerd: Sustainability 2022]**.

Daaruit volgen de **ontwerpregels voor de MVP** (eerste werkende versie):

1. **Stappen met voortgangsbalk** (Type → Maten → Afwerking → Opties → Overzicht). Je kunt altijd terug naar een vorige stap zonder keuzes te verliezen.
2. **Live prijs en samenvatting** altijd zichtbaar: zijpaneel op pc, onderbalk op gsm/tablet.
3. **Fouten voorkomen in plaats van melden.** Ongeldige opties zijn grijs en tonen bij aanraken *waarom* ("niet mogelijk bij schuifraam"). Maatvelden tonen het toegelaten bereik.
4. **Slimme standaardwaarden.** Een nieuwe configuratie is meteen geldig; de gebruiker past alleen aan wat afwijkt.
5. **Visuele keuzes.** Kleurstalen en foto's van grepen in plaats van codes.
6. **Tekening die meebeweegt** met elke keuze (2D-SVG in de MVP).
7. **Bewaren, kopiëren, aanpassen.** "Zelfde raam, maar 200 mm breder" is één klik. Meerdere configuraties komen samen in één offerte (raam 1, raam 2, deur…).

**Twee modi [bron, niet geverifieerd: AR-Range]:**
- **Wizard** (stap voor stap): voor eindklanten, dealers en nieuwe verkopers.
- **Snelinvoer** (alles op één scherm, sneltoetsen, kopiëren uit een vorige regel): voor ervaren binnendienst die 30 ramen voor één werf ingeeft. Dit is in de praktijk de grootste tijdwinst bij ramen en deuren **[inschatting]**.

### 6.2 Voor de beheerder (de klant van Missing Link)

Dit bepaalt of het product verkoopt. Elke klant moet zijn eigen producten kunnen onderhouden zonder programmeur.

- **Regels in gewone taal opbouwen** met keuzelijsten ("ALS [Opening] [is] [Schuifraam] DAN [verberg] [Beslag draai-kip]"). Onderliggend wordt dat JsonLogic. Geen JSON tonen aan de gebruiker.
- **Formules zoals in Excel** voor prijs en hoeveelheden (`=breedte*hoogte/1000000`). Experlogix doet het ook zo **[bron, niet geverifieerd]**.
- **Prijsmatrices importeren uit Excel/CSV.** Zo leveren de leveranciers ze nu al aan.
- **Testmodus:** de beheerder doorloopt de configurator als klant en ziet welke regel welk effect heeft.
- **Versies van het productmodel:** een oude offerte blijft rekenen met de regels van toen.
- **Sjablonen per sector**, bv. een standaard raammodel, als startpunt bij een nieuwe implementatie. Dat sluit aan bij hoe je nu per sector gelijkaardige flows hebt **[inschatting]**.

---

## 7. Integratie met Missing Link

### 7.1 Ingebouwd of apart?

**Advies [inschatting]:** bouw de configurator als **module binnen Missing Link**: zelfde databank, zelfde gebruikers en rechten, zelfde artikels. Voeg later een **inbouwbare webcomponent** toe voor de website of het dealerportaal, die via de API werkt. Zo vermijd je wat Hive en Elfsquad wel moeten doen: synchroniseren tussen twee systemen.

### 7.2 De flow

```
Artikels / catalogusonderdelen / prijsmatrices      (bestaande data in Missing Link)
        │
        ▼
Productmodel (kenmerken, keuzes, regels, formules)  (nieuw: beheerd door de klant)
        │
        ▼
Configuratie (gekozen waarden + versie productmodel) (nieuw: per offertelijn bewaard)
        │   regels opnieuw controleren op de server
        ▼
Prijsberekening (stuklijst + kost + marge)          (bestaand: herkomst_prijsberekening_id)
        │
        ▼
Offerte(regels) in toestand "ontwerp"               (bestaand: keuzegroep, optie_sleutel,
        │                                             lengte/breedte/hoogte, beeld_id …)
        ▼
Verstuurd → Aanvaard → Order → Factuur              (bestaand)
```

### 7.3 Spelregels voor het wegschrijven

1. **Altijd opnieuw controleren op de server.** De browser kan gemanipuleerd zijn of verouderde prijzen tonen. Dezelfde JsonLogic-regels draaien op de server **[geverifieerd: dat dit kan]**.
2. **Idempotency key per configuratie.** Als de verbinding wegvalt en de verkoper opnieuw klikt, ontstaat er geen tweede offerte **[Missing Link: de API ondersteunt dit]**.
3. **Etag bij aanpassingen.** Een offerte die intussen door iemand anders gewijzigd is, wordt niet overschreven (409-conflict → opnieuw laden) **[Missing Link]**.
4. **Totalen laat je Missing Link berekenen.** De API rekent zelf de totalen **[Missing Link]**. De configurator levert aantallen, maten en eenheidsprijzen.
5. **De configuratie bewaren bij de offerteregel**, als JSON plus versie van het productmodel. Zo kun je de configuratie altijd heropenen, aanpassen en als nieuwe offerteversie opslaan (`versie_van_id`).
6. **Statusovergangen alleen in één richting.** Een aanvaarde offerte heropent de configuratie alleen als nieuwe versie. Het risico dat "niemand weet welke versie de klant kreeg" is een bekende valkuil **[bron, niet geverifieerd: Marini Systems]**.

### 7.4 Voorstel: nieuwe tabellen in Missing Link [inschatting]

| Tabel | Belangrijkste velden |
|---|---|
| `config_product` | id, artikel_id, naam, versie, status (concept/actief/archief) |
| `config_kenmerk` | product_id, stap, code, label, type (getal/keuze/janee/tekst), eenheid, min, max, stap, standaard, volgorde |
| `config_keuze` | kenmerk_id, code, label, beeld, artikel_id/onderdeel_id, volgorde |
| `config_regel` | product_id, type (zichtbaar/vereist/sluit_uit/bereik/melding), jsonlogic, foutboodschap, ernst |
| `config_stuklijst` | product_id, artikel_id/onderdeel_id, hoeveelheid_formule, voorwaarde (jsonlogic), eenheid |
| `config_prijsmatrix` | product_id, naam, as_x, as_y, cellen (CSV-import) |
| `configuratie` | product_id, productversie, waarden (json), resultaat (stuklijst, prijs), offerteregel_id, prijsberekening_id |

---

## 8. 2D- en 3D-tekeningen

| Niveau | Wat | Techniek | Inspanning | Geschikt voor |
|---|---|---|---|---|
| **2D parametrisch** | Vooraanzicht met maatlijnen dat meeschaalt met breedte, hoogte en vakverdeling | SVG, gegenereerd uit dezelfde kenmerken | Laag | Ramen, deuren, kasten, poorten. **Gaat ook rechtstreeks in de offerte-PDF.** |
| **3D met varianten** | Vast 3D-model; onderdelen tonen/verbergen, materialen/kleuren wisselen | Google **model-viewer** (webcomponent) met glTF-modellen en de standaard `KHR_materials_variants` | Middel (vooral modelleerwerk per product) | Carrosserie-opbouw, machines met opties, producten met vaste maten |
| **3D parametrisch** | Het model wordt opgebouwd uit de maten (profielen langs een contour) | **three.js**, bv. profielvormen langs een omtrek | Hoog | Ramen en deuren, schrijnwerk, trappen |
| **CAD-koppeling** | Echte CAD-modellen en productietekeningen genereren | SolidWorks/DriveWorks, Inventor, Onshape | Zeer hoog | Machinebouw (werkvoorbereiding) |

Bevindingen:
- **model-viewer** kan varianten wisselen met één eigenschap (`variantName`). De varianten zitten in het glTF-bestand via `KHR_materials_variants`, en de huidige weergave kan je exporteren **[bron, niet geverifieerd: broncode en docs van model-viewer]**.
- Een **kant-en-klare open-source three.js-configurator voor ramen en deuren met live maten vond ik niet**. Er bestaan wel bouwblokken: profielgeometrie langs een contour, en voorbeelden van vouwdeur-configurators zonder vrijgegeven code **[bron, niet geverifieerd]**. Parametrisch 3D wordt dus eigen ontwikkeling.
- Hive gebruikt het 3D-beeld ook in offertes en orderbevestigingen **[bron, niet geverifieerd]**. Voor ons: een schermafbeelding van de 3D-weergave opslaan als `beeld_id` op de offerteregel **[inschatting]**.

**Advies:** 2D in de MVP, 3D met varianten in een latere fase, parametrisch 3D alleen als een sector er echt om vraagt. **De grootste kost van 3D is het maken van de modellen per product, niet de software.**

---

## 9. Stappenplan

Elke fase levert iets bruikbaars op en heeft een duidelijk **klaar-criterium**. De inspanning is een grove **[inschatting]** in werkdagen voor één ervaren ontwikkelaar, plus jouw analysewerk. Bespreek die schatting met de ontwikkelaar.

### Fase 0 — Voorbereiding en afbakening (± 1–2 weken, vooral analyse)

| # | Taak | Wie | Resultaat |
|---|---|---|---|
| 0.1 | **Pilootklant en productfamilie kiezen.** Eén klant, één product (bv. PVC-raam of standaard sectionale poort). | Jonas | Gekozen piloot |
| 0.2 | **Productkennis uitschrijven met de pilootklant:** alle kenmerken, keuzes, toegelaten maten, combinaties die niet mogen, prijsopbouw (matrix/formule/stuklijst) en 10 echte offertes als testgevallen | Jonas + klant | Functionele specificatie + Excel met testgevallen |
| 0.3 | **API-velden laten bevestigen:** betekenis van `keuzegroep`, `optie_sleutel`, `vereist_sleutel`, `berekening`-waarden en `herkomst_prijsberekening_id`. Kan je een offerte met regels in één call aanmaken? | Ontwikkelaar | Integratienota |
| 0.4 | **Keuzes vastleggen:** module in Missing Link (advies) of aparte app, en JsonLogic als regelformaat | Samen | Beslissing |

**Klaar wanneer:** de 10 testoffertes van de pilootklant volledig met kenmerken + regels + prijsformules te beschrijven zijn. Lukt dat niet, dan is het product te complex voor een eerste piloot: kies een eenvoudiger product.

### Fase 1 — Productmodel en regels (± 10–15 dagen)

| # | Taak | Resultaat |
|---|---|---|
| 1.1 | Tabellen uit §7.4 aanmaken | Datamodel |
| 1.2 | Regelmotor: JsonLogic + eigen functies (`m2`, `lm`, `omtrek`, `afronden`, `matrix`) | Servercomponent |
| 1.3 | Pilootproduct invoeren (eerst rechtstreeks, nog zonder beheerscherm) | Pilootmodel |
| 1.4 | **Automatische tests** met de 10 testgevallen: keuzes in → geldig/ongeldig + prijs uit | Testset die bij elke wijziging draait |

**Klaar wanneer:** alle 10 testgevallen dezelfde prijs geven als de echte offertes (± afronding).

### Fase 2 — Configurator-scherm voor de verkoper (± 10–15 dagen)

| # | Taak | Resultaat |
|---|---|---|
| 2.1 | Wizard met stappen, voortgangsbalk, live prijs en samenvatting | Scherm |
| 2.2 | Ongeldige opties grijs met uitleg; maatvelden met bereik | Foutpreventie |
| 2.3 | Standaardwaarden zodat een nieuwe configuratie meteen geldig is | — |
| 2.4 | Werkt ook op tablet (verkoper bij de klant) | Responsief |

**Klaar wanneer:** een verkoper van de pilootklant zonder uitleg een configuratie maakt in minder dan 3 minuten.

### Fase 3 — Koppeling met offerte (± 5–10 dagen) → **MVP**

| # | Taak | Resultaat |
|---|---|---|
| 3.1 | Knop "Toevoegen aan offerte": servercontrole → prijsberekening → offerteregel(s), met idempotency key | Koppeling |
| 3.2 | Configuratie bewaren bij de offerteregel; heropenen en aanpassen (met etag) | Bewerken |
| 3.3 | Meerdere configuraties in één offerte; "kopieer en pas aan" | — |
| 3.4 | Offerte-PDF: per regel een samenvatting van de gekozen opties | Document |

**Klaar wanneer:** de pilootklant een volledige offerte voor een echte klant maakt, verstuurt en laat omzetten naar order **zonder Excel ernaast**. **Dit is het moment om te evalueren met de klant.**

### Fase 4 — 2D-tekening en beheerscherm (± 15–20 dagen)

| # | Taak | Resultaat |
|---|---|---|
| 4.1 | Parametrische SVG-tekening (vooraanzicht + maatlijnen) in de configurator én op de offerte-PDF (`beeld_id`) | 2D |
| 4.2 | **Beheerscherm zonder programmeren:** kenmerken, keuzes met afbeeldingen, regels via keuzelijsten, formules zoals in Excel | Beheer |
| 4.3 | Import van prijsmatrices uit Excel/CSV | Import |
| 4.4 | Testmodus en versies van het productmodel | Veilig beheer |

**Klaar wanneer:** de pilootklant zelf een tweede product toevoegt en een prijswijziging doorvoert, met hooguit telefonische ondersteuning.

### Fase 5 — Stuklijst en werkvoorbereiding (± 10–15 dagen)

| # | Taak | Resultaat |
|---|---|---|
| 5.1 | Stuklijst uit de configuratie bij omzetting naar order (onderdelen + hoeveelheden) | Stuklijst |
| 5.2 | Zaaglijst / productiefiche per configuratie (PDF) | Werkvoorbereiding |
| 5.3 | Snelinvoer-modus (rasterweergave) voor grote werven | Snelheid binnendienst |

### Fase 6 — Uitbreidingen (per fase te beslissen)

| Optie | Inspanning | Wanneer zinvol |
|---|---|---|
| Inbouwbare configurator voor website/dealers (via API, met eigen prijzen per dealer) | ± 15–25 dagen | Klanten die via dealers of de website verkopen |
| 3D met varianten (model-viewer) | ± 10 dagen software + modelleerwerk per product | Carrosserie, machines, showroom |
| Parametrisch 3D (three.js) | ± 30+ dagen | Alleen als 2D echt niet volstaat |
| Sectorsjablonen (ramen, poorten, schrijnwerk) | ± 5 dagen per sector | Na 2–3 klanten in dezelfde sector |
| Constraint-solver voor complexe machinebouw | Groot | Pas als beslistabellen echt tekortschieten |

**Totaal tot en met MVP (fase 0–3): ± 6–9 weken** voor één ontwikkelaar plus jouw analyse. **Tot en met fase 5: ± 3–4 maanden [inschatting].** Ter vergelijking: een bureau rekent voor één raamconfigurator € 30.000–100.000 en 8–18 weken **[bron, niet geverifieerd]**. Missing Link bespaart vooral op de ERP-koppeling, die zit er al in.

---

## 10. Valkuilen

1. **De productkennis wordt onderschat.** Dé reden waarom CPQ-projecten mislukken: impliciete kennis (wat mag samen, welke kortingen) is niet uitgeschreven voor de bouw begint **[bron, niet geverifieerd: Experlogix]**. → Fase 0 serieus nemen; testgevallen eerst.
2. **Te breed beginnen.** Alle productfamilies tegelijk. → Eén product, één klant.
3. **3D te vroeg.** Kost veel modelleerwerk en vertraagt de piloot. → 2D eerst.
4. **Regels verspreid in code.** Elke klant wordt maatwerk voor de programmeur. → Regels als data (JsonLogic), beheerd door de klant **[geverifieerd: dat dit kan]**.
5. **Prijs alleen in de browser berekend.** Manipuleerbaar en kan verouderd zijn. → Altijd opnieuw op de server.
6. **Geen versies van het productmodel.** Een prijswijziging verandert ongemerkt oude offertes. → Versie bewaren bij elke configuratie.
7. **Zelf bouwen = zelf onderhouden.** Wie zelf een configurator bouwt, zit met doorlopend onderhoud en technische schuld **[bron, niet geverifieerd: Cincom; let op, deze leverancier verkoopt zelf CPQ]**. → Houd de motor generiek: geen klantspecifieke code, alles via configuratie.
8. **Verschillen tussen regelmotoren in browser en server**, bv. hoe getallen en lege waarden behandeld worden **[geverifieerd: aandachtspunt bij JsonLogic-implementaties]**. → Gebruik dezelfde taal (JavaScript) aan beide kanten, of laat de gedeelde testset op beide draaien.

---

## 11. Beslissingen die nog nodig zijn

1. Welke **pilootklant en welk product**?
2. Configurator **in Missing Link** (advies) of als aparte app?
3. Wie bouwt het: eigen ontwikkelaar of extern? En in welke taal/stack draait de back-end van Missing Link? Daarvan hangt af of JsonLogic in JavaScript aan beide kanten kan draaien.
4. Komt **verkoop via dealers/website** binnen 12 maanden? Zo ja, dan moeten dealerprijzen in het ontwerp van fase 1.

---

## 12. Bronnen

**Geverifieerd (primaire bron, 3-voudig gecontroleerd):**
- [json-logic-js (JsonLogic)](https://github.com/jwadhams/json-logic-js)
- [json-rules-engine (CacheControl)](https://github.com/CacheControl/json-rules-engine) · [GitHub-topic json-rules-engine](https://github.com/topics/json-rules-engine)
- Weerlegd: dat json-rules-engine "17 kb, zonder eval(), ISC-licentie" is, kon niet bevestigd worden.

**Uit zoekresultaten, niet geverifieerd (pagina's konden niet altijd geopend worden):**
- Hive CPQ: [functies](https://hivecpq.com/features), [integraties](https://hivecpq.com/en/integrations), [Business Central-connector](https://hivecpq.com/en/integrations/business-central-connector), [ramen en deuren](https://hivecpq.com/en/industries/cpq-for-doors-and-windows), [configurator](https://hivecpq.com/configurator), [Experience Configurator](https://hivecpq.com/en/resources/updates/experience-configurator), [Capterra-prijzen](https://www.capterra.com/p/175344/Hive-CPQ-Online-Product-Configurator/pricing/), [G2](https://g2.com/products/hive-cpq/features), [Capterra BE-alternatieven](https://www.capterra.be/alternatives/175344/hive-cpq-online-product-configurator)
- Vergelijkingen: [Epicor CPQ vs Tacton](https://erpresearch.com/erp-add-ons/cpq/epicor-cpq-vs-tacton-cpq), [Elfsquad-prijzen](https://www.elfsquad.io/pricing), [Elfsquad vs Tacton](https://www.softwareadvice.com.au/compare/220816/295007/elfsquad/vs/tacton-cpq), [Configure One vs Elfsquad](https://www.cbinsights.com/compare/configure-one-vs-elfsquad)
- Architectuur: [RelationalAI productconfigurator](https://docs.relational.ai/build/templates/product_configurator/), [FdConfig (paper)](https://www.deepai.org/publication/fdconfig-a-constraint-based-interactive-product-configurator), [Odoo-configurator voor maatmeubelen](https://ecosire.com/apps/odoo/odoo-furniture-mto-configurator), [patent US8160990](https://patents.google.com/patent/US8160990)
- UX: [Smashing Magazine](https://smashingmagazine.com/2018/02/designing-a-perfect-responsive-configurator), [DriveWorks](https://www.driveworks.co.uk/blog/our-top-tips-for-optimizing-configurator-user-experience/), [UNamur-studie](https://researchportal.unamur.be/en/publications/essential-expectations-of-users-of-web-configurators-an-empirical/), [AR-Range wizard vs vrij](https://www.ar-range.app/solutions/knowledge-base/whats-the-difference-between-a-wizard-style-ui-and-a-free-explore-ui), [Experlogix-formules](https://experlogix.com/nl/wp-json/wp/v2/posts/1173), [Navigatiepatronen (Sustainability 2022)](https://ideas.repec.org/a/gam/jsusta/v14y2022i23p15903-d987798.html)
- Integratie en valkuilen: [Marini Systems](https://marini.systems/en/blog/cpq-integration-crm-erp-machinery-manufacturing/), [Cincom: zelf bouwen vs kopen](https://www.cincom.com/blog/cpq/in-house-configurator-vs-buying-cpq-software/), [Cincom: ERP vs CPQ](https://www.cincom.com/blog/cpq/erp-vs-cpq-why-your-erp-product-configurator-fails-complex-b2b-sales/), [Experlogix 7 traps](https://experlogix.com/?p=1117), [Experlogix States Industries](https://experlogix.com/case-studies/states-industries/), [Kolonell kostprijs 2026](https://kolonell.com/en/blog/online-cpq-configurator-cost-amsterdam-2026)
- 3D: [tweedegolf wall_configurator](https://github.com/tweedegolf/wall_configurator), [three.js parametrische families](https://discourse.threejs.org/t/how-do-i-create-parametric-families-with-an-option-to-change-sizes/54275), [three.js vouwdeur-configurator](https://discourse.threejs.org/t/bifold-door-configurator-tool-built-using-vanilla-three-js-in-ssr-react-next-js-app/13737), [model-viewer scene graph](https://tessl.io/registry/tessl/npm-google--model-viewer/4.1.0/files/docs/scene-graph.md), [model-viewer VariantMaterialExporterPlugin](https://app.unpkg.com/@google/model-viewer@3.5.0/files/src/three-components/gltf-instance/VariantMaterialExporterPlugin.ts)

**Missing Link:** vastgesteld via de API (artikels, offerte OFF20260002 met regelstructuur, catalogus/onderdelen en prijsberekeningen zijn nog leeg).

**Niet onderzocht in deze ronde:** Salesforce CPQ, Logik.ai, Threekit, Zakeke, Expivi, Perfion/inRiver, Cincom als product.
