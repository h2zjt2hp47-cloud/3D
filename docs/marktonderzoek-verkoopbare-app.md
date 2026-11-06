# Marktonderzoek: welke verkoopbare app (of game) kunnen we maken, en wat ontbreekt er op de markt?

*Voor een eigen app in de App Store, los van dit project: zie [marktonderzoek-appstore.md](marktonderzoek-appstore.md).*

*Opgesteld op 6 november 2026. Labels: **[bron]** = gevonden in een bron (zie §11), **[inschatting]** = eigen redenering, nog te toetsen. Marktcijfers van onderzoeksbureaus verschillen sterk onderling: lees ze als grootte-orde, niet als feit.*

## 1. Kort antwoord

1. **De beste kans is geen nieuwe app, maar wat er al ligt verkoopbaar maken**: een configurator voor kleine maatwerkbedrijven (KMO's) die **offertes** maken, geen webshops. De markt zit vol met configurators voor webshops (Zakeke, Shopify-apps) en dure maatwerkprojecten (Threekit, Salsita, Expivi vanaf ± $500/maand). Daartussen ontbreekt een betaalbaar, Nederlandstalig pakket met **regels in Excel-taal, 3D zonder dure 3D-modellen, en een koppeling met het ERP**. Dat is precies wat de motor nu al doet.
2. **Ramen en deuren is de tweede poot**: tussen zware raamsoftware (LogiKal, ReynaPro, Chacal) en eenvoudige webcalculators (Raamwinkel, Zelfbouwmarkt) vonden we niemand die configureren combineert met de **Vlaamse renovatieplicht** (label E/F → D binnen 6 jaar) en de bijhorende premies. Dat is een duidelijk verkoopargument voor schrijnwerkers.
3. **Een game is mogelijk, maar als zijspoor**: gezellige (*cozy*) bouw- en inrichtingsgames verkopen goed (Tiny Glade, House Flipper 2, Hozy), maar de gemiddelde Steam-game brengt bijna niets op (mediaan ± $249). Er bestaat geen game over **stofferen of meubels op maat maken**; dat is een echte lege plek, en we hebben de 3D-zetels en stoffen al. Advies: alleen een klein proefje met een harde stopregel (§7).
4. **Grootste risico's zitten niet in de techniek**: de Belgische markt alleen is klein (§6), iemand moet hosting, support en onderhoud dragen (Jonas programmeert niet), en de verhouding met de werkgever (ETS Informatics / Admin2Win) moet vooraf duidelijk zijn.

## 2. Wat we al in handen hebben

| Troef | Waarom het telt bij verkoop |
|---|---|
| Motor met formules in Excel-taal, regels, prijstabellen, korting, stuklijst | De beheerder (de klant) kan zelf prijzen en regels aanpassen zonder programmeur. Concurrenten verbergen dit vaak achter een projectteam. |
| 3D die zichzelf opbouwt uit maten (parametrisch) | Grootste drempel bij concurrenten is het maken van 3D-modellen per variant [bron: KILO-case bij Salsita, Intiaro]. Wij hebben die niet nodig. |
| Zetels, kasten, ramen/deuren, plattegrond, gevels, offerte met posities | Werkt al voor twee sectoren; aantonen dat dezelfde motor een derde sector aankan is een sterk verhaal. |
| Koppeling met Missing Link (REST, etag, idempotency) | ERP-koppeling is het stuk dat webshop-configurators missen. |
| Eén HTML-bestand, ook offline | Handig in de toonzaal en op de werf zonder internet. |
| Domeinkennis Jonas | ± 120 KMO-klanten in ramen en deuren, bouw, machinebouw, carrosserie, elektriciens; kent de flow offerte → order → productie. Dat is de beste bron voor interviews en de eerste klanten. |

## 3. De markt in cijfers

### 3.1 Configurators

- Wereldmarkt productconfigurators: schattingen van **$1,3 tot $3,1 miljard** (2025–2026), groei 8 à 20 % per jaar, afhankelijk van het bureau [bron]. Het segment 3D-configurators: ± $1,7–2,4 miljard [bron]. ± 75 % van de nieuwe installaties draait in de cloud [bron].
- Geen enkel bureau splitst de cijfers uit voor KMO's of voor offerte-gedreven bedrijven [bron: niets gevonden].

**Prijzen van concurrenten** (publiek gevonden; leveranciers verbergen prijzen vaak achter een demo):

| Pakket | Richting | Prijs (gevonden) | Opmerking |
|---|---|---|---|
| Zakeke | webshops, personalisatie | € 59 / 110 / 255 per maand + 1,5–1,9 % per verkoop (andere bron: $29,90–149,90) [bron] | Gericht op e-commerce, niet op offertes |
| Roomle | meubels, 3D/AR | vanaf ± $140/maand [bron] | Prijs “op aanvraag” volgens andere bron |
| Expivi | 3D, maakindustrie | vanaf ± $500/maand, verder onderhandeld [bron] | |
| Threekit | groot, merken | niet publiek [bron] | Projectprijzen |
| Elfsquad (NL) | CPQ maakindustrie | één plan, onbeperkt gebruikers, bedrag niet publiek [bron] | Dichtste concurrent qua richting |
| Salsita | maatwerk 3D, meubels/bouw | niet publiek [bron] | Projectbureau |
| Configura CET | meubels/kantoorinrichting, Zweeds | niet publiek [bron] | Zwaar pakket voor dealers |
| Shopify-apps (Mimeeq, Angle 3D, …) | webshops | goede reviews, vooral ‘past niet bij wat we nodig hebben’ als klacht [bron] | Geen offerte- of ERP-flow |

### 3.2 Doelgroep in België

- **Meubelindustrie**: 722 bedrijven, 9 763 werknemers (Fedustria, 2023) [bron]; ruimer geteld (Eurostat/IBISWorld) ± 2 000 [bron]. Het aantal daalt sinds 2020 en de omzet zakte in 2023 met 5,6 % [bron]. Moeilijke markt: verkoop moet tijdwinst of extra omzet aantonen, geen “mooi speelgoed”.
- **Schrijnwerkers ramen en deuren**: geen betrouwbaar aantal gevonden [bron: niets gevonden]. Te halen bij Statbel (NACE-codes) of Bouwunie.
- **Woningen**: 3,4 miljoen in Vlaanderen, waarvan voor ± 1/3 een EPC bestaat [bron]. Renovatieplicht: wie sinds 2023 een woning met label E of F koopt, moet binnen 6 jaar naar minstens label D; de verstrenging naar C/B/A is geschrapt (besluit 12/12/2025, in voege 1/1/2026) [bron]. EPC-labelpremie wordt afgebouwd; vanaf 29/5/2026 nieuwe EPC-berekening [bron]. Premies veranderen dus vaak — dat is tegelijk de kans (klanten snappen het niet) en het risico (onderhoud).

### 3.3 Games

- Steam: ± 20 000 nieuwe games in 2025; **mediaan ± $249 bruto-omzet**; 66 % verdient minder dan $1 000; ± 300 games halen meer dan $1 miljoen [bron]. Indiegames samen ± $4,4 miljard (25 % van Steam) [bron].
- *Cozy* is het sterkst groeiende label: bij games met meer dan $100 000 omzet steeg het gebruik van “cozy” als hoofdomschrijving met 675 % tussen 2022 en 2025 [bron].
- Succesvoorbeelden in ons thema (bouwen/inrichten):

| Game | Resultaat | Les |
|---|---|---|
| Tiny Glade (2 makers) | 616 000 verkocht in de eerste maand [bron] | Een sterke, eenvoudige bouwervaring zonder doel kan volstaan |
| House Flipper 2 | > 1 miljoen verkocht; budget ($2 mln) terugverdiend in 3 dagen [bron] | Opknappen + inrichten werkt bij een breed publiek |
| Hozy (kamer poetsen, herstellen, schikken) | 175 000 verkocht, ± $2,2 mln, uitgegeven door tinyBuild [bron] | Uitgever, bundels met Tiny Glade en House Flipper hielpen |
| Furnish Master (inrichten) | 100 000 verkocht, maar veel terugbetalingen “niet wat ik verwachtte” [bron] | Een eerlijke Steam-pagina is cruciaal |
| Chop Chop Inc. (houtbewerking, grappig) | ± 1 400 reviews, zeer positief [bron] | Ambacht als spel verkoopt, mits er een ‘haakje’ is |
| Furniture: Build & Repair | gemengde reviews (36) [bron] | Zonder afwerking valt het tegen |

- **Merkengames**: Design Home (mobiel) toont echte meubels van 60+ merken die je ook kan kopen [bron]; IKEA opende in 2024 een winkel in Roblox, met betaalde ‘medewerkers’ [bron]. Merken betalen dus voor zichtbaarheid in een spel.

## 4. Wat ontbreekt er op de markt (de gaten)

### Gat 1 — Configurator voor offerte-gedreven maatwerk-KMO's (sterk)
**Wat er is:** webshop-configurators (personalisatie, betalen per verkoop) en dure projectbureaus.
**Wat ontbreekt:**
- Nederlandstalig en met een **offerte → order → ERP**-flow, niet een winkelmandje.
- Beheer door de klant zelf, in **Excel-taal** (wij hebben dit; concurrenten werken met eigen regeleditors of een projectteam) [inschatting op basis van productpagina's].
- **3D zonder 3D-modellen te laten maken**: de duurste stap bij concurrenten [bron]. Onze parametrische opbouw maakt elke maat meteen zichtbaar.
- **Sjablonen per sector** (zetels, kasten, ramen, poorten, carrosserie-opbouw, schakelkasten…), zodat een nieuwe klant start met 80 % klaar in plaats van een leeg scherm [inschatting].
**Waarom het kan werken:** de klanten van Jonas zijn precies dit profiel, en ze hebben al een ERP.

### Gat 2 — Ramen/deuren + renovatieplicht en premies (sterk, Vlaanderen)
**Wat er is:** zware raamsoftware voor het atelier en eenvoudige prijscalculators voor particulieren [bron].
**Wat ontbreekt:** een tool waarmee de schrijnwerker (of de particulier) ziet: *welke ramen, wat kost het, wat helpt het voor mijn EPC-label, welke premie of fiscale steun geldt nog* — in één offerte. Niets gevonden dat dit combineert [bron: niets gevonden].
**Let op:** premie-regels veranderen jaarlijks; dat moet als tabel (zoals onze prijstabellen) en niet in code zitten, anders wordt onderhoud onbetaalbaar [inschatting]. Een EPC precies berekenen mag alleen een erkende energiedeskundige: wij geven een **indicatie**, geen attest.

### Gat 3 — Digitaal productpaspoort voor meubels (later, ± 2029–2030)
De EU-ecodesignverordening (ESPR) zal een digitaal productpaspoort opleggen per productgroep; meubels staan op de lijst, met een uitvoeringshandeling rond 2028 en verplichting ten vroegste 18 maanden later [bron, data onzeker]. Een configurator kent de stuklijst en materialen al, dus het paspoort is bijna een **gratis bijproduct**. Kleine makers zullen dit niet zelf kunnen [inschatting]. Nu nog geen product, wel een verkoopargument (“klaar voor de toekomst”).

### Gat 4 — Toegankelijke 3D-configurators (verkoopargument, geen product)
Sinds 28 juni 2025 geldt de Europese toegankelijkheidswet (EAA) voor online verkoop aan consumenten; zeer kleine ondernemingen (< 10 werknemers en < € 2 mln) zijn voor diensten vrijgesteld [bron]. Geen enkele configurator-leverancier vonden we die toegankelijkheid van de 3D uitspeelt [bron: niets gevonden]. Toetsenbordbediening, tekstbeschrijving van de gekozen variant en voldoende contrast zijn met beperkte moeite in te bouwen [inschatting].

### Gat 5 — ‘Maakbaar’ ontwerp in plaats van AI-plaatjes (te toetsen)
Er zijn meer dan 60 apps die met AI een kamer herontwerpen [bron], maar die tonen beelden, geen product dat een maker kan bouwen. RoomGPT (iOS) verdient naar schatting < $10 000 per maand [bron]: de consumentenmarkt is druk en arm. Een kans ligt eerder bij **AI binnen de regels van de maker** (“toon me drie voorstellen die passen in 320 cm en binnen de collectie”). Dat de AI-apps niet maatvast zijn, hebben we niet met een bron kunnen staven [inschatting].

### Gat 6 — Oefensoftware voor beroepsopleidingen bouw en hout (niche)
In Vlaanderen bestaan VR-oefenspellen voor riolering (VRiool), systeembekisting en veiligheid, betaald via InnoVET-projecten [bron]. Voor **schrijnwerk (ramen opmeten en plaatsen) of meubelmaken/stofferen vonden we niets** [bron: niets gevonden]. Kopers zijn scholen, Constructiv, VDAB — via projectoproepen, dus traag en subsidie-afhankelijk.

### Gat 7 — Een game over stofferen en meubels op maat (lege plek)
Houtbewerking en kamers opknappen bestaan als game; **stofferen, een zetel herbekleden of meubels op maat ontwerpen voor klanten** niet [bron: niets gevonden]. Onze troeven (zachte vormen, stoffen, 3D-zetels) passen hier rechtstreeks.

## 5. Opties naast elkaar

Score 1 (zwak) tot 5 (sterk); het totaal telt de vijf scores op (omzetmodel is uitleg, geen score; bij C telt de score van nu). *Hergebruik* = hoeveel van de bestaande code meteen bruikbaar is. *Toegang* = hoe makkelijk Jonas de eerste kopers bereikt.

| Optie | Vraag | Concurrentie (5 = weinig) | Hergebruik | Toegang | Omzetmodel | Risico (5 = laag) | Totaal |
|---|---|---|---|---|---|---|---|
| A. Configurator voor maatwerk-KMO's (meubels + andere sectoren) | 4 | 3 | 5 | 5 | abonnement + opstart | 3 | **20** |
| B. Ramen/deuren + renovatie-indicatie | 4 | 4 | 4 | 4 | abonnement per schrijnwerker | 3 | **19** |
| C. Digitaal productpaspoort-module | 2 nu / 4 later | 3 | 4 | 3 | optie op A | 3 | 15 |
| D. Oefenspel voor beroepsopleiding | 2 | 4 | 3 | 2 | project/subsidie | 3 | 14 |
| E. Cozy game stofferen/meubelmaken (Steam) | 3 | 4 | 3 | 1 | eenmalige verkoop | 1 | 12 |
| F. Merkengame / ‘speel en koop’ voor meubelmakers | 2 | 3 | 4 | 3 | merken betalen | 2 | 14 |
| G. AI-interieurapp voor consumenten | 2 | 1 | 2 | 1 | abonnement | 2 | 8 |

**Conclusie:** A en B samen als één product (“configurator voor maatwerk, met sjablonen per sector”); C als latere optie; een game alleen als klein experiment (§7).

## 6. Hoe groot kan het worden? [inschatting]

Ruwe rekensom, alleen om de orde van grootte te zien:
- Meubels België: ± 2 000 bedrijven, waarvan misschien 10–15 % maatwerk met offertes én bereid om te betalen → 200–300. Aan € 150/maand gemiddeld en 20 % bereik → ± 50 klanten → **± € 90 000 per jaar**.
- Dat is te klein voor één sector in één land. Het wordt pas interessant met **meerdere sectoren** (ramen/deuren, poorten, keukens, carrosserie-opbouw…) en **Nederland** erbij (zelfde taal, Elfsquad als concurrent).
- Prijsrichting om te toetsen: **opstartpakket € 1 500–5 000** (sjabloon invullen, prijzen overnemen, opleiding) + **€ 99–299 per maand** afhankelijk van gebruikers en modules. Dat zit onder Expivi, rond Roomle/Zakeke, maar met ERP-flow.
- Sterkste verkoopkanaal: **via ERP-leveranciers en hun implementatoren** (Missing Link, eventueel andere), omdat zij de klant al kennen en de koppeling het verschil maakt.

## 7. Als het toch een game wordt

**Idee:** *“Atelier”* — een kleine cozy game waarin je als stoffeerder/meubelmaker opdrachten van klanten krijgt: oude zetel herstellen, stof kiezen, een hoekbank op maat tekenen die in de kamer past. Opbouw: herstellen → ontwerpen → leveren → je atelier groeit.
- **Wat we hergebruiken:** 3D-zetels, zachte vormen, stoffen en materialen, vrij ontwerp met boven- en vooraanzicht, regels (“past het in de kamer?”).
- **Wat ontbreekt en veel werk is:** spelontwerp (doel, voortgang, beloning), geluid en muziek, animaties, verpakking voor Steam (de browserversie moet in een desktopapp), marketing. Dit is het grootste deel van een game, niet de 3D.
- **Mogelijke extra inkomsten:** echte meubelmerken die hun modellen in de game zetten (zoals Design Home) — maar pas als er spelers zijn.
- **Stopregel:** eerst alleen een Steam-pagina + korte video + speelbare demo. Haalt die bij de Steam Next Fest niet enkele duizenden wishlists (vuistregel in de sector: ± 7 000 vóór lancering), dan stoppen [inschatting].
- **Eerlijk risico:** de helft van de Steam-games verdient minder dan $249 [bron]. Reken de game niet als inkomstenbron, hooguit als zichtbaarheid voor de configurator.

## 8. Wat ontbreekt er nog aan ónze app om ze te verkopen

| Nodig voor verkoop | Stand nu | Inspanning [inschatting] |
|---|---|---|
| Online versie voor meerdere klanten (elk eigen catalogus, login, rechten) | Eén HTML-bestand per demo | Groot — eerste echte bouwstap |
| Hosting, back-ups, beveiliging, verwerkersovereenkomst (GDPR) | Niet aanwezig | Middel, maar verplicht |
| Beheer volledig zonder programmeur (catalogus, prijzen, regels, 3D-onderdelen) | Catalogus-editor bestaat | Middel: afwerken en testen met een echte beheerder |
| Sjablonen per sector | Zetels, kast, raam/woning | Middel per sector |
| Koppelingen met andere ERP's/boekhouding (bv. Teamleader, Robaws, Exact, Odoo) | Alleen Missing Link | Middel per koppeling; e-facturatie (Peppol, verplicht sinds 1/1/2026) blijft bij het ERP [bron] |
| Offerte als mooie pdf in huisstijl, met tekening en 3D-beeld | Deels | Klein |
| Toegankelijkheid (toetsenbord, schermlezer-tekst) | Niet bekeken | Klein–middel |
| Support, handleiding, opleidingsformat | Kennis bij Jonas | Middel — Jonas' sterkte |
| Prijsmodel, algemene voorwaarden, contract | Niet aanwezig | Klein, wel juridisch nakijken |
| Wie programmeert en onderhoudt? | Claude + Jonas | **Beslissing nodig**: ontwikkelpartner, vennoot of verkoop aan/met een ERP-leverancier |

## 9. Voorgestelde volgende stappen

1. **Werkgever**: nagaan wat de arbeidsovereenkomst zegt over nevenactiviteiten, concurrentie en eigendom van wat je maakt. Eventueel net daar een kans: aanbieden aan ETS of Missing Link als module.
2. **10 gesprekken** van 30 minuten met klanten (5 meubel/interieur, 5 ramen/deuren): hoe maken ze nu offertes, hoeveel tijd kost het, wat zouden ze betalen? Vragenlijst kan ik opstellen.
3. **Proefklant afwerken**: Corneille & Silence als referentie (met hun toestemming).
4. **Landingspagina** met demo-video en “vraag een demo”: meten of er interesse is buiten het eigen netwerk.
5. Pas daarna: beslissen over online versie en wie bouwt/onderhoudt.
6. Game: alleen als iemand er plezier in heeft; volg de stopregel van §7.

## 10. Nog te verifiëren

- Echte prijzen van Elfsquad, Roomle, Expivi (offerte vragen, als prospect).
- Aantal schrijnwerkers en meubelmakers per NACE-code (Statbel) en in Nederland (KvK/CBS).
- Officiële ESPR-werkplanning 2025–2030 voor meubels (Europese Commissie).
- Actuele renovatiepremies en fiscale steun 2026–2027 (Vlaanderen, Wallonië, Brussel).
- Of AI-interieurapps echt niet maatvast zijn (eigen test met 2–3 apps).
- Wishlist-vuistregels en Steam-cijfers voor cozy simulatiegames (GameDiscoverCo, Gamalytic).

## 11. Bronnen

**Configuratormarkt en concurrenten**
- [Business Research Insights — productconfigurators](https://www.businessresearchinsights.com/market-reports/product-configurator-software-market-105545) · [Dataintelo](https://dataintelo.com/report/global-product-configurator-software-market) · [TrendX Insights](https://trendxinsights.com/syndicated-market-research-reports/product-configurator-market/) · [Wise Guy Reports](https://www.wiseguyreports.com/reports/visual-product-configurator-software-market) · [Growth Market Reports](https://growthmarketreports.com/report/3d-product-configurator-market) · [Verified Market Research](https://www.verifiedmarketresearch.com/product/3d-visual-product-configurator-software-market/)
- [Zakeke prijzen (Capterra)](https://www.capterra.com/p/162400/Zakeke/pricing/) · [Zakeke (Software Advice)](https://www.softwareadvice.com/product-configurator/zakeke-profile/) · [Expivi (G2)](https://www.g2.com/products/expivi-3d-product-configurator/pricing) · [Threekit (Capterra)](https://www.capterra.com/p/181527/3D-Product-Configurator/) · [Roomle (GetApp)](https://www.getapp.com/sales-software/a/3d-configurator/alternatives) · [Prijsgids 3D-configurators](https://www-vsl-dev.pages.dev/3d-product-configurator-cost)
- [Elfsquad prijzen](https://www.elfsquad.io/pricing) · [Elfsquad (Capterra)](https://www.capterra.com/p/198415/Elfsquad-CPQ/) · [Configura CET (SourceForge)](https://sourceforge.net/software/product/Configura-CET) · [Salsita (Capterra)](https://www.capterra.com/p/10005179/Salsita-3D-Configurator/)
- [Mimeeq reviews (Shopify)](https://apps.shopify.com/reviews/2104762) · [Angle 3D reviews (Shopify)](https://apps.shopify.com/angle-3d-configurator/reviews)
- [KILO-case (Salsita)](https://blog.salsitasoft.com/case-study-product-configurator-for-kilo-designer-furniture) · [Intiaro over configureerbare 3D](https://en.intiaro.com/post/why-furniture-brands-are-investing-in-configurable-3d-assets) · [3D Cloud-studie](https://digitalmedianet.com/?p=67873)

**Sector en regelgeving**
- [Leatherbiz — Belgische meubelcijfers (Fedustria)](https://leatherbiz.com/News/166767) · [Statista — meubelbedrijven België](https://statista.com/statistics/384484/number-of-enterprises-in-the-manufacture-of-furniture-in-belgium) · [IBISWorld België](https://www.ibisworld.com/belgium/industry/furniture-manufacturing/200051/)
- [Vlaanderen.be — renovatieverplichting](https://www.vlaanderen.be/bouwen-wonen-en-energie/kopen-en-verkopen/een-huis-of-appartement-kopen/renovatieverplichting-voor-residentiele-gebouwen) · [Test-Aankoop — renovatieverplichting 2026](https://www.test-aankoop.be/woning-energie/isolatie/nieuws/renovatieverplichting-2026) · [Test-Aankoop — premies](https://www.test-aankoop.be/woning-energie/isolatie/nieuws/veranderingen-verbouwpremies-vlaanderen) · [EnergyVille/VITO policy paper](https://energyville.be/wp-content/uploads/2026/03/Policy-paper-renovatieverplichting-EnergyVilleVITO.pdf) · [Legalnews — wijziging renovatieplicht](https://legalnews.be/bouw-vastgoed/recente-wijziging-van-de-renovatieplicht-in-vlaanderen-meer-ademruimte-door-verlenging-termijn-en-afschaffing-verstrengingspad-monard-law/)
- [Raamwinkel](https://www.raamwinkel.be/uploads/ckeditor/attachments/719/Algemene_voorwaarden_van_Raamwinkel_tot_2_juni_2022_NL.pdf) · [Zelfbouwmarkt](https://www.zelfbouwmarkt.be/fr/kunststof-kozijnen)
- [Bluestone PIM — DPP-tijdlijn](https://www.bluestonepim.com/blog/digital-product-passport-timeline) · [Projet Celsius — ESPR en meubels](https://projetcelsius.com/en/blog/espr-dpp-furniture/) · [Renoon — ESPR-tijdlijn](https://www.renoon.com/blog/the-timeline-of-digital-product-passport-regulation-in-eu-espr-from-product-groups-to-rollout-schedule)
- [Sharetribe — EAA voor online verkoop](https://www.sharetribe.com/academy/european-accessibility-act-for-online-marketplaces/) · [Kinsta — EAA](https://kinsta.com/blog/european-accessibility-act/)
- [Deloitte — Belgische e-facturatie](https://www.deloitte.com/be/en/services/tax/blogs/royal-decree-on-the-belgian-e-invoicing-mandate-published.html) · [Loyens & Loeff — e-facturatie 2026](https://www.loyensloeff.com/insights/news--events/news/e-invoicing-in-belgium-as-from-1-january-2026-key-provisions-of-the-long-awaited-royal-decree/)
- [Robaws (GetApp)](https://www.getapp.com/construction-software/a/robaws/alternatives/) · [Tradify (Capterra BE)](https://www.capterra.be/software/152413/tradify) · [magicplan (Capterra)](https://www.capterra.ie/software/210335/magicplan)

**AI, AR en webwinkels**
- [Overzicht AI-interieurtools 2026](https://resources.rework.com/tools/ai-tools/best-ai-interior-design-tools-2026) · [RoomGPT (AppGoblin)](https://appgoblin.info/apps/6446314875) · [Polaris — AI in interieurontwerp](https://www.polarismarketresearch.com/press-releases/ai-in-interior-design-market)
- [Intiaro Arrange 3D (Vision Pro)](https://en.intiaro.com/post/arrange-3d-for-apple-vision-pro-bringing-3d-furniture-into-real-spaces) · [Best Buy Vision Pro (Road to VR)](https://roadtovr.com/?p=172176)
- [Folio3 — Shopify 3D](https://ecommerce.folio3.com/blog/shopify-3d-models/) (het vaak geciteerde “+94 % conversie” is niet bij Shopify zelf teruggevonden)

**Games**
- [Game World Observer — indie 25 % van Steam-omzet 2025](https://gameworldobserver.com/2025/12/22/indie-projects-generated-a-quarter-of-the-total-game-revenue-on-steam-by-the-end-of-2025-analytics) · [80.lv — dalende omzet per game](https://80.lv/articles/analysts-report-drop-in-game-revenue-on-steam-despite-growing-number-of-releases) · [Steam Page Analyzer — mediaan](https://www.steampageanalyzer.com/blog/median-steam-game-2026)
- [Outlook Respawn — cozy op Steam](https://respawn.outlookindia.com/gaming/gaming-news/steam-vibe-shift-why-cozy-is-the-most-dominant-keyword-of-2026) · [GameDiscoverCo — Tiny Glade](https://newsletter.gamediscover.co/p/how-tiny-glade-built-its-way-to-600k) · [Gamereactor — House Flipper 2](https://www.gamereactor.eu/house-flipper-2-has-sold-1-million-copies-1675193/) · [WN Hub — House Flipper 2 budget](https://wnhub.io/news/other/item-42728)
- [80.lv — Hozy](https://80.lv/articles/tinybuild-ceo-discusses-success-of-cozy-room-restoration-game-hozy) · [WN Hub — Hozy](https://wnhub.io/news/other/item-50598) · [WN Hub — Furnish Master](https://wnhub.io/news/finance/item-49063) · [Chop Chop Inc. (Game Developer)](https://www.gamedeveloper.com/press-release/one-of-the-most-absurd-job-simulations-of-the-year-launches-today-on-steam)
- [Business of Home — Design Home](https://businessofhome.com/articles/what-does-the-wild-success-of-this-interior-design-game-have-to-do-with-the-industry) · [IKEA in Roblox](https://ikea.com/gb/en/newsroom/corporate-news/ikea-is-opening-a-new-store-on-roblox-pub8a9272d0)
- [InnoVET SAVR](https://data-onderwijs.vlaanderen.be/documenten/bestanden/InnoVET-SAVR.pdf) · [KlasCement — VRiool](https://www.klascement.net/innovet/downloadbaar-lesmateriaal/160995/vriool-handleiding) · [KlasCement — VR systeembekisting](https://www.klascement.net/downloadable-resources/181575/vr-system-formwork-manual/?hl=en)
