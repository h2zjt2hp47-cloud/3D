# Marktonderzoek: een eigen app voor de App Store (los van Missing Link en de configurator)

*Opgesteld op 6 november 2026. Dit document staat los van het configuratorproject; het vorige document (`marktonderzoek-verkoopbare-app.md`) ging over het verkopen van de configurator zelf. Labels: **[bron]** = gevonden in een bron (§9), **[inschatting]** = eigen redenering, nog te toetsen, **[te controleren]** = algemeen bekend maar niet opnieuw opgezocht.*

## 1. Kort antwoord

- **De App Store is overvol, maar niet voor elke niche.** In 2025 kwamen er ± 600 000 nieuwe apps bij (+30 %), in 2026 nog sneller door apps die met AI gebouwd worden, terwijl het aantal downloads amper groeit (+2 à 3 %) [bron]. Brede apps (nog een AI-chat, nog een fotobewerker) zijn kansloos. Wie wint, maakt een **diepe tool voor één concreet probleem** [bron: Sensor Tower].
- **Twee ideeën springen eruit**, allebei met een duidelijk gat en een link met wat jij kent:
  1. **“Past het?”** — met de iPhone (LiDAR) deur, gang en trap opmeten en in 3D laten zien of een zetel, kast of bed erdoor kan, inclusief de draaibeweging. Bijna de helft van de online kopers bestelde ooit iets dat niet door de deur of de trap kon [bron, enquête van een AR-bedrijf]; winkels leggen de schuld bij de klant en rekenen 10–30 % terugnamekosten aan [bron]. Er bestaan een paar jonge apps, maar geen in het Nederlands en geen die de draai door een trap in 3D toont [bron].
  2. **“Huisboekje”** — alle verplichtingen en het onderhoud van je Belgische woning op één plek, met herinneringen (ketelonderhoud, keuringen, rookmelders, EPC, renovatieplicht, garanties) en facturen die automatisch gelezen worden. De Vlaamse Woningpas bewaart documenten maar stuurt geen herinneringen [bron]; de bekende buitenlandse apps (HomeZada, Centriq) kennen de Belgische regels niet [bron].
- **Game:** puzzelspellen rond meubels verschuiven bestaan al bij de vleet (PIVOT! PIVOT!, Move Masters, Pack It Up) [bron], en de mobiele gamesmarkt groeit niet meer (omzet +0,2 %, downloads −7 %) [bron]. Een game alleen als **extra modus in “Past het?”** (een verhuispuzzel met dezelfde 3D), niet als apart product.
- **Advies:** begin met **“Past het?”**: klein te bouwen, makkelijk te tonen in een filmpje (gratis reclame via TikTok/Reels), één duidelijk moment waarop mensen het nodig hebben, en later ook te verkopen aan meubelwinkels.

## 2. Hoe de App Store er nu bij staat

| Feit | Wat het betekent |
|---|---|
| ± 600 000 nieuwe apps in 2025 (+30 %); Apple kreeg in Q1 2026 84 % meer inzendingen; downloads +3 % (2025) en +2 % (2026) [bron] | Veel meer aanbod, niet meer vraag: zichtbaar worden is de echte uitdaging |
| Veel van die nieuwe apps zijn snel met AI in elkaar gezet en van lage kwaliteit [bron] | Een verzorgde, betrouwbare app valt net op |
| Apps met een harde betaalmuur zetten 11 % van de gebruikers om in betalers, gratis-met-extra's maar 2 % [bron: RevenueCat] | Durf meteen te vragen om te betalen als het nut duidelijk is |
| AI-apps verdienen meer per gebruiker maar verliezen hun abonnees 30 % sneller [bron] | AI als hulpmiddel in de app, niet als hele app |
| Ongeveer de helft van de betalingen gebeurt op de eerste dag [bron] | De eerste minuut van de app moet het nut tonen |
| De “middenklasse” van apps krimpt: de omzet concentreert zich bij de top [bron] | Reken op een bijverdienste, niet op een loon, tenzij er ook een zakelijk kanaal is |
| Mobiele games: omzet ± +0,2 %, downloads −7,2 % in 2025 [bron]; spelers aanvaarden reclame, betaalde games zijn een niche [bron] | Een mobiele game is de moeilijkste weg |
| Apple Intelligence werkt sinds iOS 26.1 ook in het Nederlands [bron]; apps kunnen het taalmodel op het toestel gratis gebruiken, zonder server en privé [bron] | Nieuw voordeel: slimme functies (factuur lezen, brief samenvatten) zonder kosten per gebruik. Alleen op recente iPhones (15 Pro en nieuwer) [bron]; of het Nederlands ook voor ontwikkelaars werkt: [te controleren] |

**Kosten om te verkopen** [te controleren]: ontwikkelaarsaccount ± € 99/jaar; Apple houdt 15 % in voor kleine ontwikkelaars (Small Business Program, < $1 mln omzet); Apple draagt de btw af op verkopen in de EU.

## 3. Waar een kansrijke app aan voldoet (voor jou)

1. **Eén duidelijk probleem** op één moment (“ik koop een zetel”, “de ketel moet nagekeken worden”).
2. **Iets wat een website niet kan**: LiDAR-scan, camera, slimme functies op het toestel, meldingen.
3. **Nederlandstalig/Belgisch voordeel**: buitenlandse apps kennen onze regels en taal niet.
4. **Jouw kennis telt**: meubels, bouw, renovatie, uitleg in gewone taal, KMO's.
5. **Klein te beginnen**: een eerste versie in weken, niet in maanden.
6. **Iemand wil betalen**: de gebruiker zelf, of een bedrijf dat er belang bij heeft (winkel, verzekeraar, makelaar).

## 4. De kandidaten

### 4.1 “Past het?” — meubels door deur, gang en trap ★ aanbevolen
- **Probleem:** 49 % van 1 500 ondervraagde online kopers bestelde ooit iets dat niet door de deur of de trap kon (enquête in opdracht van een AR-bedrijf, dus voorzichtig lezen) [bron]. Winkels leveren soms “tot de eerste drempel” en laten de klant met het probleem zitten, of rekenen 10–30 % terugnamekosten aan [bron].
- **Wat er al is:** *Smart Moving* (meet kamers en deuren, zegt past/past niet), *ItemFits* (rekenhulp op de website, sinds mei 2026 ook als Shopify-app voor winkels), *Will It Fit? AR* (visuele hulp met LiDAR, geen exacte berekening), gratis online rekentools [bron]. Geen enkele met veel reviews of downloads gevonden; geen in het Nederlands [bron].
- **Het gat:** de moeilijkste gevallen zijn de **bocht in de gang en de draaitrap**. Bestaande tools rekenen met een paar maten; niemand toont in 3D hoe het meubel moet draaien en kantelen. Plus tips die het verschil maken: poten eraf, deur uit de scharnieren, via het raam [inschatting].
- **Opgelet:** LiDAR meet muren tot op ± 1–3 cm, maar deuren en ramen zijn het zwakke punt (glas, verwarring tussen deur en raam) [bron]. De app moet dus vragen om de krappe plekken na te meten met een meetlint, en eerlijk zeggen wanneer het “krap” is.
- **Verdienen:** gratis 1 controle, daarna eenmalig ± € 4,99 of per verhuis [inschatting]. Later een zakelijke versie: een “Past het?”-knop voor meubelwinkels en verhuizers, die minder mislukte leveringen hebben (zoals ItemFits nu probeert) [inschatting].
- **Bouwen:** Apple RoomPlan (scan) + eigen 3D-berekening. Middelzwaar. Je 3D-ervaring uit het zetelproject helpt bij het ontwerp, niet bij de code (iOS-app = Swift).

### 4.2 “Huisboekje” — onderhoud en verplichtingen van je woning
- **Probleem:** een Belgische eigenaar moet veel onthouden: ketelonderhoud, keuring van een stookolietank, rookmelders, EPC, asbestattest en elektrische keuring bij verkoop, renovatieplicht na aankoop [te controleren per regio], garanties, facturen voor premies en belastingen.
- **Wat er al is:** de **Woningpas** (Vlaanderen) bewaart attesten en documenten, aanmelden met eID/itsme, maar **zonder herinneringen** [bron]; Wallonië heeft sinds eind 2025 een Passeport Bâtiment [bron]. Buitenlandse apps HomeZada ($79–99/jaar) en Centriq bestaan, maar zijn Engelstalig en kennen de Belgische regels niet [bron].
- **Het gat:** een Nederlandstalige app die per woning weet *wat wanneer moet*, je eraan herinnert, en een factuur fotografeert en zelf de datum, het bedrag en de vakman eruit haalt (met het taalmodel op het toestel, dus privé) [inschatting].
- **Opgelet:** gewone eigenaars betalen weinig voor dit soort apps; HomeZada zegt zelf dat klanten het liefst gratis willen [bron]. Centriq verdient niet aan de gebruiker maar aan makelaars, keurders en partners die de app weggeven [bron].
- **Verdienen:** klein abonnement (± € 1–2/maand) of eenmalig, plus een zakelijk kanaal: makelaars, notarissen, verzekeraars of aannemers die de app weggeven met hun logo [inschatting].
- **Bouwen:** eenvoudiger dan 4.1 (lijsten, herinneringen, foto's), maar regels per regio actueel houden is werk.

### 4.3 “Brief simpel” — moeilijke brieven uitleggen in gewone taal
- **Probleem:** 18 % van de Vlaamse volwassenen is laaggeletterd (PIAAC 2023) [bron].
- **Wat er al is:** *Lees Simpel* (Nederland, gratis, zonder winstoogmerk): foto van een brief, AI vat samen [bron]. In Vlaanderen vonden we niets specifiek [bron].
- **Het gat:** Belgische afzenders (FOD Financiën, mutualiteit, Fluvius, notaris), Frans ↔ Nederlands (Brussel), en een lijstje “wat moet ik doen en tegen wanneer” in de agenda [inschatting].
- **Opgelet:** een gratis concurrent, een doelgroep die niet betaalt en vaak een ouder toestel heeft (het taalmodel op het toestel werkt alleen op recente iPhones). Eerder een maatschappelijk project met subsidie of een partner (OCMW, CAW, mutualiteit) dan een commerciële app.

### 4.4 Verhuispuzzel (game)
- **Wat er al is:** veel eenvoudige puzzelspellen rond meubels schuiven (PIVOT! PIVOT!, Move Masters, Pack It Up, Out-rush) [bron]; *Moving Out* (meubels gooien, met trappen) bestaat alleen op pc en console [bron].
- **Het gat:** klein — hooguit een verzorgde 3D-puzzel met echte trappen en bochten.
- **Advies:** als **extra spelmodus in “Past het?”** (zelfde 3D-berekening, filmpjes die gedeeld worden), niet als aparte game.

### 4.5 Gezellige game over stofferen/meubelmaken (iPad)
Uit het vorige document: op pc een lege plek, maar dat is een grote bouw (spelontwerp, geluid, animaties), en de mobiele gamesmarkt groeit niet [bron]. Alleen als hobbyproject.

### 4.6 Werkbon + e-factuur (Peppol) voor zelfstandige vakmensen
De e-factuur via Peppol is sinds 2026 verplicht [bron], maar de markt is al druk en goedkoop: Accountable vanaf € 1,50–9,90/maand, Billit vanaf € 7,50/maand [bron]. Een werkbon met handtekening zou het verschil kunnen maken, maar dat bestaat ook al (Robaws, Tradify…). **Niet aanbevolen** als eerste app.

### 4.7 Nederlandstalige educatieve kinderapps zonder reclame
Kinderapps zitten vol reclame (100 % van de gratis apps voor kinderen onder 5 jaar in een Amerikaans onderzoek) [bron], maar we vonden geen cijfers over een tekort aan Nederlandstalig aanbod. **Te weinig bewijs**; buiten jouw domein.

## 5. Scorebord

Score 1 (zwak) tot 5 (sterk); totaal = som van de vijf.

| Idee | Probleem/vraag | Gat (weinig concurrentie) | Haalbaar te bouwen | Iemand betaalt | Jouw voordeel | Totaal |
|---|---|---|---|---|---|---|
| 4.1 Past het? | 4 | 3 | 3 | 3 | 4 | **17** |
| 4.2 Huisboekje | 3 | 4 | 4 | 2 | 4 | **17** |
| 4.5 Stoffeer-game | 3 | 4 | 1 | 3 | 3 | 14 |
| 4.6 Werkbon + Peppol | 4 | 1 | 2 | 3 | 4 | 14 |
| 4.3 Brief simpel | 4 | 2 | 3 | 1 | 3 | 13 |
| 4.4 Verhuispuzzel | 3 | 2 | 3 | 2 | 3 | 13 |
| 4.7 Kinderapps | ? | ? | 3 | 2 | 1 | — |

**Waarom 4.1 vóór 4.2, bij gelijke score:** “Past het?” is beter te tonen (een filmpje van een zetel die door een trap draait verkoopt zichzelf), het nut is meteen duidelijk op één moment, en mensen betalen eerder voor een probleem van nu dan voor een herinnering voor later. “Huisboekje” is een goede tweede app, liefst met een partner die betaalt.

## 6. Plan voor “Past het?”

**Eerste versie (zo klein mogelijk):**
1. Meubel invoeren: breedte, diepte, hoogte (en of de poten eraf kunnen), met tekeningetjes; later ook een link naar een productpagina.
2. Doorgang opmeten: deur, gang, trap — met LiDAR-scan of stap voor stap met het meetlint, met foto's als geheugensteun.
3. Uitkomst: **past / krap / past niet**, met een 3D-animatie van de beste draaibeweging en tips (poten eraf, deur uit de scharnieren, via het raam).
4. Delen: beeld of pdf naar de winkel of de verhuizer.

**Eerst toetsen, dan bouwen** [inschatting]:
- Een eenvoudige webpagina met een filmpje (een animatie volstaat) en “zet me op de wachtlijst”. Verspreiden via verhuisgroepen, Reddit, TikTok.
- Stopregel: minder dan ± 200 inschrijvingen na 4–6 weken → idee bijsturen of stoppen.
- 5 meubelwinkels of verhuizers bellen: hoe vaak mislukt een levering omdat iets niet past, en wat kost dat?

**Daarna:** zakelijke versie voor winkels en verhuizers; de verhuispuzzel als speelse extra; Android als de iPhone-versie werkt (LiDAR zit alleen in de Pro-modellen van iPhone en iPad, dus ook de meetlintroute moet goed zijn).

## 7. Praktisch: wat heb je nodig

| Wat | Waarom |
|---|---|
| Een Mac met Xcode | Een iPhone-app bouwen en testen gaat alleen op een Mac. Deze cloudsessie draait op Linux: hier kan ik onderzoeken, ontwerpen en een webversie maken, maar de iPhone-app moet gebouwd worden met Claude Code op een Mac. |
| iPhone of iPad **Pro** (met LiDAR) | Om de scan te testen |
| Apple Developer-account (± € 99/jaar) [te controleren] | Om te publiceren |
| Privacyverklaring, eenvoudige website | Verplicht in de App Store |
| Statuut: zelfstandige in bijberoep, btw [te controleren] | Inkomsten uit verkoop; Apple regelt de btw op verkopen |
| Werkgever | Ook al staat dit los van het werk: kijk na wat je contract zegt over nevenactiviteiten |

## 8. Nog te verifiëren

- Downloads en reviews van Smart Moving, Will It Fit? AR en ItemFits (via Appfigures of Sensor Tower).
- Of het taalmodel op het toestel (Foundation Models) het Nederlands ook voor ontwikkelaars ondersteunt.
- Hoe vaak leveringen mislukken bij Belgische meubelwinkels (zelf vragen).
- De Belgische woonverplichtingen per regio (lijst voor “Huisboekje”).
- Of KBC MyHome of een bank- of verzekeringsapp al herinneringen voor woningonderhoud heeft.

## 9. Bronnen

**App Store en abonnementen**
- [RevenueCat — State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/) · [ContentGrip — samenvatting](https://www.contentgrip.com/subscription-app-market-2026-growth/) · [PPC Land — AI-apps verliezen sneller abonnees](https://ppc.land/ai-apps-earn-41-more-per-user-but-churn-30-faster-revenuecat-finds/) · [PPC Land — de middenklasse krimpt](https://ppc.land/the-app-middle-class-is-dying-and-revenuecats-data-shows-exactly-how-fast/)
- [TechSpot — vloed van snel gemaakte apps](https://www.techspot.com/news/113213-apple-app-store-inundated-low-quality-vibecoded-apps.html) · [Startup Fortune — nieuwe apps +104 %](https://startupfortune.com/app-store-launches-are-up-104-year-on-year-as-ai-tools-ignite-a-mobile-software-boom/) · [Sensor Tower State of AI 2026 (samenvatting)](https://appsops.store/news/sensor-tower-state-of-ai-2026-mobile-revenue-app-builders) · [Sensor Tower — prognose 2026](https://sensortower.com/blog/sensor-tower-app-market-forecast-2026)
- [MacRumors — Foundation Models](https://www.macrumors.com/2025/06/09/foundation-models-framework/) · [9to5Mac — Apple Intelligence in nieuwe talen (iOS 26.1)](https://9to5mac.com/2025/11/11/ios-26-1-brings-apple-intelligence-to-these-eight-new-languages/) · [DEV — Foundation Models-handleiding](https://dev.to/arshtechpro/apples-foundation-models-framework-run-ai-on-device-with-just-a-few-lines-of-swift-lbp)

**Games**
- [Tech Insider — mobiele games 2025](https://tech-insider.org/mobile-gaming/) · [Games.gg — trends februari 2026](https://games.gg/news/mobile-game-revenue-and-download-trends-february-2026/) · [eMarketer — spelers en reclame](https://www.emarketer.com/content/gamers-embrace-mobile-play-split-on-in-game-ads-ai)
- [PIVOT! PIVOT!](https://apps.apple.com/us/app/-/id6741114880) · [Move Masters](https://apps.apple.com/app/id6471990968) · [Pack It Up](https://apps.apple.com/be/app/pack-it-up/id6572302032) · [Out-rush](https://apps.apple.com/us/app/id6470482206)

**Past het?**
- [Smart Moving (App Store)](https://apps.apple.com/app/id1666262699) · [Will It Fit? AR (App Store)](https://apps.apple.com/us/app/id6768062410) · [ItemFits](https://itemfits.com/fit/calculator) · [ItemFits voor Shopify](https://apps.shopify.com/itemfits) · [MiniWebtool rekenhulp](https://miniwebtool.com/couch-fit-calculator/)
- [Interiors Monthly — enquête Fixtuur (1 500 kopers)](https://interiorsmonthly.co.uk/shoppers-expect-furniture-stores-to-pay-for-buy-try-return/) · [Money.com — terugnamekosten meubels](https://money.com/restocking-fee-furniture-problem-solved) · [ABC7 — zetel past niet door de deur](https://abc7ny.com/archive/8266734/) · [Claimlane — retouren van grote stukken](https://www.claimlane.com/resources/blog/furniture-returns-management) · [Furniture Choice — als het niet past](https://help.furniturechoice.co.uk/hc/en-gb/articles/5141275461009-What-happens-if-my-furniture-doesn-t-fit) · [De Machinekamer — levering tot eerste drempel](https://www.demachinekamer.nl/en/service/shipping-returns)
- [lidar3d.io — nauwkeurigheid RoomPlan](https://www.lidar3d.io/post/testing-the-precision-of-apple-s-ios-roomplan-api-a-polycam-lidar-3d-scanning-app-feature-review) · [Apple-forum — nauwkeurigheid RoomPlan](https://developer.apple.com/forums/thread/712500) · [MagicPlan met LiDAR](https://mavricresearch.com/2020/11/10/magicplan-now-with-added-lidar-%F0%9F%A7%82/) · [RoomScan Pro review](https://illustrarch.com/articles/design-softwares/110334-roomscan-pro-review.html)

**Huisboekje**
- [Test-Aankoop — Woningpas](https://www.test-aankoop.be/woning-energie/kopen/dossier/wat-is-de-vlaamse-woningpas) · [Solar Magazine — uitbreiding Woningpas](https://solarmagazine.nl/nieuws-zonne-energie/i42570/vlaanderen-breidt-woningpas-en-gebouwenpas-uit) · [HomeZada prijsmodel](https://zen.homezada.com/2022/03/31/understanding-homezadas-pricing-model/) · [Centriq — hoe ze verdienen](https://intercom.help/centriq/articles/1226043-how-do-you-guys-make-money)

**Brief simpel**
- [SIDN — Lees Simpel](https://sidn.nl/en/news-and-blogs/new-app-explains-hard-to-follow-letters-in-easy-language) · [Binnenlands Bestuur — Lees Simpel](https://www.binnenlandsbestuur.nl/digitaal/lees-simpel-app-beschikbaar-voor-alle-smartphonegebruikers) · [PIAAC 2023 Vlaanderen](https://data-onderwijs.vlaanderen.be/documenten/bestanden/PIAAC2023-Vlaanderen-samenvatting.pdf)

**Werkbon/Peppol en kinderapps**
- [Accountable — beste Peppol-software](https://www.accountable.eu/nl-be/blog/beste-peppol-e-facturatiesoftware/) · [Partena — e-facturatie verplicht](https://www.partena-professional.be/nl/nieuws/gestructureerde-elektronische-facturatie-verplicht-vanaf-01-01-2026)
- [iCulture — reclame in kinderapps](https://www.iculture.nl/nieuws/kinderapps-vol-met-advertenties/) · [Kennisnet — leerzame apps](https://www.kennisnet.nl/mijnkindonline/files/125_leerzame_apps_en_websites.pdf)
