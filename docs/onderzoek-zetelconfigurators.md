# Onderzoek: hoe andere configurators werken, en hoe zetels berekend en getekend worden

*31 oktober 2026 — onderzoek met meerdere zoekagenten en controle van de beweringen*

> **Hoe betrouwbaar is dit document?**
> De meeste websites (merken, softwareleveranciers) konden niet automatisch geopend worden. Daardoor haalden maar **3 beweringen** de strenge controle, alle drie uit één GitHub-project. De rest van dit document komt uit **zoekresultaten en hun samenvattingen**. Die zijn bruikbaar als richting, maar niet nagekeken in de bron zelf. Labels:
> - **[geverifieerd]**: in de bron nagekeken en 3-0 bevestigd.
> - **[bron]**: uit zoekresultaten, niet nagekeken. Cijfers van leveranciers zijn reclame.
> - **[inschatting]**: mijn afleiding voor ons project.

---

## 1. Samenvatting voor ons project

1. **Bijna alle zetelmerken volgen dezelfde flow:** model → opstelling/elementen → maat → stof (met gratis stalen) → poten → comfort/kussens → overzicht met prijs en levertermijn **[bron: Bolia, BoConcept, Joybird, Interior Define]**.
2. **Bij modulaire en hoekbanken voeg je elementen toe met een "+"-knop.** Die verschijnt alleen waar een element mag aansluiten **[geverifieerd: GitHub-voorbeeld] [bron: Fixtuur, Roomle]**. Links en rechts worden benoemd volgens de kant van de armleuning zoals je ervoor staat (Engels: LAF/RAF, *left/right arm facing*) **[bron]**.
3. **Fabrikanten rekenen met prijslijsten: element × stofgroep** (A, B, C, … plus kolommen voor eigen stof of eigen leder, COM/COL), met vaste toeslagen erbovenop **[bron: openbare prijslijsten van Darran, JSI, Vanguard, Grand Rapids Chair]**. Onze motor doet dit al met prijstabellen.
4. **Stofverbruik = basisverbruik per model of element × factor voor patroon en looprichting.** Bv. +10% tot +25% afhankelijk van het patroonrapport **[bron: Kovi Fabrics, COM-gids]**.
5. **Tekenen kan zonder 3D.** Een gelaagd 2D-beeld of een bovenaanzicht dekt volgens één leverancier ±90% van wat voorschrijvers nodig hebben. 3D loont vooral voor topcollecties en beurzen **[bron: Kolonell, leveranciersblog]**. Wie toch 3D wil: één glTF-model met stofvarianten (`KHR_materials_variants`) en Googles gratis `<model-viewer>` **[bron: Khronos, modelviewer.dev]**.
6. **Een Belgisch voorbeeld met hetzelfde model als onze pilot:** **Copahome** (Belgische maker van zitmeubelen) laat meer dan 1.000 dealers in de Benelux en Frankrijk configureren en bestellen in één portaal met hun huisstijl. Orders gaan als productiegegevens naar het ERP **[bron: case van Experlogix, cijfers van de leverancier zelf]**.

---

## 2. Voorbeelden van configurators

### 2.1 Merken (zetels)

| Merk | Werkwijze | Wat we kunnen overnemen | Label |
|---|---|---|---|
| **Bolia** (DK) | Model → modulaire opstelling (hoekelement met/zonder arm, element zonder arm, chaise longue, poef) → gratis stofstalen (±165 stoffen en leders) → poten (eik, staal). Chaise links of rechts. Prijs hangt af van aantal elementen, stof en extra's. | Elementtypes; stalen als vaste stap; links/rechts als keuze | bron |
| **BoConcept** (Indivi) | Meer dan 120 stoffen, rust- en hoekelementen. Levertermijn **per productcategorie** (stofferen: 10–14 weken in de VS), niet per configuratie. | Levertermijn per categorie is eenvoudig en volstaat | bron |
| **Ferm Living** (Rico) | Start van een **voorgedefinieerde opstelling** of een leeg canvas, daarna elementen aanpassen. AR "in je kamer", opslaan of bestellen. Levering binnen 8 weken. | **Begin met voorbeeldopstellingen**: minder keuzestress | bron |
| **Onehouse** (DE) | Eén scherm met live 3D, draaien, stof en elementen wisselen, **eindmaten zichtbaar**, gratis stalen. | Totale maten altijd tonen | bron |
| **Burrow** (VS) | Start met element met linker- of rechterarm, voeg armloze zitelementen toe, dan hoekstukken voor L- of U-vorm, optioneel poef. | Bouwlogica per element | bron |
| **Joybird / Interior Define** (VS) | Op bestelling; stof, kleur, poten. Lengte, diepte, poten en vulling zijn aparte meerprijzen. Gratis stalenset. | Diepte en vulling als meerprijs | bron |
| **Jori** (BE) | Configurator met een **"vanaf"-adviesprijs** (LAGOM vanaf ±€ 1.700 incl. btw). Verkoop via dealers: de configurator dient als **inspiratie en leadgeneratie**, niet om direct te kopen. Eigen stof (COM) en maatwerk mogelijk. | Past bij een showroom die op afspraak werkt | bron |
| **Copahome** (BE) | Dealerportaal (Experlogix) in eigen huisstijl. Interne verkoop en dealers gebruiken hetzelfde configuratiemodel. Orders gaan naar Dynamics NAV. Volgens de leverancier 66% van de orders online en 99,9% foutloos. | Het model voor interieurinrichters | bron |

### 2.2 Software

| Software | Werkwijze | Label |
|---|---|---|
| **Roomle** | Publieke documentatie over het "docken" van modulaire elementen. Elk element hangt aan precies één ouder in een boomstructuur. Een voorwaarde bepaalt of aankoppelen mag, en er lopen acties bij aankoppelen, wijzigen en loskoppelen. Elementen naast elkaar worden gekoppeld via "sibling points". | bron |
| **Cylindo** | Geen 3D in de browser. Alle beelden van een 360°-weergave worden **vooraf gerenderd** (fotokwaliteit). Stof of poten wisselen = andere foto's laden. Dezelfde beelden gaan naar productpagina, winkelmandje, e-mails en Google Shopping. | bron |
| **Emersya, Threekit, Expivi** | 3D-configurators met modulaire demo's | bron |
| **Hive CPQ** (BE) | Regelgebaseerd, realtime prijs, 3D, toegang voor dealers, koppeling met ERP. Gericht op fabrikanten vanaf ±€ 30 miljoen omzet; geen meubelcase gevonden. | bron |
| **Elfsquad** (NL) | Dealerportaal; offerte → werkorder met stuklijst via koppeling met het ERP (Exact Online, Dynamics, Ridder iQ). | bron |
| **Combeenation** | B2B-meubelcase: offerte met één klik, stuklijst automatisch, configuraties opslaan en heropenen, 3D-export voor architecten. | bron |

### 2.3 Open-source voorbeeld (het enige dat geverifieerd is)

**[CodeHole7/3D-sofa-configurator](https://github.com/CodeHole7/3D-sofa-configurator/blob/master/README.md)** (three.js, klein demoproject, oud 3DS-formaat):
- Elk element heeft **aansluitgegevens** (`combineInfo`): de rugzijde en vier hoekposities, met per positie ja/nee. Daaruit volgen de "+"-knoppen **[geverifieerd]**.
- **Stof en materiaal wisselen via namen van de 3D-onderdelen**: `CG-1` = hoofdstof, `CG-2` = tweede stof, `metal`/`glass` voor poten en accenten **[geverifieerd]**. Spreek zulke namen vooraf af met wie de 3D-modellen maakt. Moderne glTF-modellen gebruiken eerder benoemde materialen.
- **Datamodel:** model → lijst elementen (elk met foto, 3D-bestand en aansluitgegevens) + een aparte kleurenlijst per materiaalkwaliteit **[geverifieerd]**. Dat lijkt op onze stofgroepen, maar het project heeft geen prijzen.
- Weerlegd: dat elk element verplicht op de oorsprong moet staan met vaste rugrichting en UV-indeling.

---

## 3. Werkwijzen en gebruiksgemak

| Patroon | Wat | Label |
|---|---|---|
| **Wizard of één scherm** | Een wizard is rustiger maar vraagt meer klikken. Eén scherm is sneller maar kan overweldigen. Advies: **wizard voor particulieren, één scherm voor experts** (dealers, interieurinrichters). | bron: AR-Range |
| **Eén pagina met ankers** | Eén pagina met voorbeeld naast de optieblokken, in plaats van aparte pagina's per stap. Halve configuraties bewaren en later afwerken. | bron: Cloudflight |
| **Voorbeeldopstellingen eerst** | Start van een bestaande opstelling, daarna aanpassen | bron: Ferm Living |
| **Stalen bestellen** | Gratis stofstalen zijn standaard bij bijna alle merken | bron |
| **Prijs** | Live totaalprijs; bij verkoop via dealers een "vanaf"-adviesprijs | bron |
| **Levertermijn** | Per productcategorie (bv. 8–14 weken), niet per configuratie | bron |
| **Offerte in plaats van kopen** | Bij merken die via dealers of showrooms verkopen, eindigt de flow met een afspraak of offerte-aanvraag | bron: Jori |
| **Fouten voorkomen** | Onmogelijke combinaties blokkeren, onbeschikbare opties tonen met reden, niet te veel keuzes tegelijk | bron: AR-Range |
| **Klein beginnen** | Start met de ±10 bestsellers, niet het hele gamma. Zorg dat het werkt op gsm. | bron: AR-Range |

---

## 4. Hoe zetels berekend worden

### 4.1 Prijsopbouw (uit openbare prijslijsten van fabrikanten)

```
verkoopprijs = prijs[element of model × breedte][stofgroep]
             + toeslagen (vast bedrag of %)
             − klant- of dealerkorting
```

- **Stofgroepen (graded fabrics):** de fabrikant deelt stoffen van verschillende leveranciers in **eigen prijsgroepen** in (A–J). De prijs volgt uit model + groep **[bron: Grand Rapids Chair, JSI]**.
- **Modulaire banken:** elk element heeft een eigen prijsregel per stofgroep. Het totaal is de som van de elementen **[bron: JSI Sosa-prijslijst]**.
- **Eigen stof (COM) en eigen leder (COL)** zijn aparte kolommen. Voorbeelden van regels:
  - COL = COM-prijs + 10% **[bron: Grand Rapids Chair]**;
  - COM/COL = COM- of COL-tarief + 5% **[bron: Darran]**;
  - bij **twee stoffen** op één zetel geldt de **hoogste groep + 5%** **[bron: Darran]**.
- **Toeslagen:** vaste bedragen per optie, bv. contrasterende biesnaad $300 per sofa, of een vaste COM-toeslag per opstelling **[bron: Vanguard]**. Soms ook procentuele toeslagen (invoerheffingen, brandstof) **[bron: Darran]**.

### 4.2 Stofverbruik

```
stofverbruik (m) = basisverbruik per model of element (bij stofbreedte ±140 cm)
                 × factor patroonrapport
                 × factor looprichting
```

- **Basisverbruik** staat per model of element in een tabel. Fabrikanten publiceren dit voor eigen stof van de klant.
- **Patroonrapport** (een herhalend motief) vraagt extra stof. Vuistregel van één stoffenleverancier: rapport 5–35 cm → +10%, 38–60 cm → +15%, 63–68 cm → +20%, 71–96 cm → +25% **[bron: Kovi Fabrics, omgerekend van inches]**. Een COM-gids rekent met een vermenigvuldiger: 15 yd × 1,2 = 18 yd bij een rapport van 25 cm **[bron]**.
- **Looprichting:** stof die 90° gedraaid verwerkt wordt (*railroaded*) geeft minder naden. Stof die op de rol verwerkt wordt (*up the roll*) kan extra naden en meer stof vragen **[bron]**.
- **In de productie** wordt het snijplan gemaakt met *marker making*, dat rekening houdt met draadrichting, poolrichting, strepen en patroon. Dat verschilt van vrije *nesting*. Software: Fraunhofer AutoNester-T, CutPlanner, Optitex **[bron]**. Dat is pas voor later; voor de offerte volstaat de formule hierboven.

**Voor onze motor [inschatting]:**
- `stof` krijgt de eigenschappen `groep`, `rapport_cm` en `breedte_cm`.
- Elk element krijgt een eigenschap `stof_m` (basisverbruik).
- Formule: `stofverbruik = som(stof_m) × als(rapport_cm = 0; 1; als(rapport_cm <= 35; 1.10; als(rapport_cm <= 60; 1.15; ...)))`.

### 4.3 Kostprijs en marge

Geen bruikbare openbare cijfers gevonden. Onze motor rekent de kostprijs wel al uit (frame, vulling, stof, uren) naast de lijstprijs en toont de marge. De echte cijfers moeten van de pilootklant komen (zie het fase 0-sjabloon).

---

## 5. Hoe zetels getekend worden

| Methode | Hoe | Kost | Voor wie | Label |
|---|---|---|---|---|
| **Foto + stofstaal** | Productfoto per model, staal van de gekozen stof ernaast | Laagst | Start | inschatting |
| **Gelaagd 2D-beeld** | Afbeeldingslagen per optie (stof, poten) die over elkaar liggen | Laag–middel | ±90% van de nood volgens één leverancier | bron |
| **2D-bovenaanzicht (SVG)** | Plattegrond van de elementen met maatlijnen en "+"-knoppen | Laag | **Modulaire en hoekbanken; interieurinrichters** | inschatting |
| **Vooraf gerenderde 360° (2.5D)** | Alle combinaties vooraf renderen, als foto's laden (Cylindo) | Hoog (renderen) | Grote merken met veel combinaties | bron |
| **3D met stofvarianten** | Eén glTF/GLB-bestand met meerdere materialen (`KHR_materials_variants`). Textuur wordt pas geladen als die stof gekozen wordt (bv. 4 MB vorm + ±1 MB per stof). Weergave met `<model-viewer>`, incl. AR. Alleen voor materialen, niet voor andere maten. | Middel (modelleren per element) | Topcollectie, website | bron: Khronos, modelviewer.dev |
| **Modulair 3D** | Eén 3D-model per element, aan elkaar gekoppeld via aansluitpunten | Hoog | Later | geverifieerd (patroon) |

**Belangrijk bij 3D [bron]:** stofvarianten wisselen alleen het uitzicht, niet de maat. Voor een sofa op maat (andere breedte) zijn aparte elementen of vervormbare modellen nodig. Daarom past **3D beter bij modulaire banken met vaste elementmaten** dan bij sofa's die per 10 cm op maat gemaakt worden.

---

## 6. Lessen en valkuilen

1. **Begin met ±10 bestsellers**, niet het hele gamma **[bron: AR-Range]**.
2. **Configuratieprojecten mislukken vooral door organisatie en onderhoud** van regels en data, niet door de techniek **[bron: onderzoek DTU]**. Spreek af wie prijzen en stoffen bijhoudt.
3. **Handmatig overtikken veroorzaakt fouten** (maten, afwerking). Laat de configuratie rechtstreeks naar offerte en order gaan **[bron]**.
4. **Standaard B2B-software kan slecht om met meubelspecifieke regels** **[bron: Kolonell, leveranciersblog]**. Dat is een argument voor onze eigen motor.
5. **Levertermijnen zijn vaak langer dan beloofd** (een reviewer kreeg 10–12 weken in plaats van "enkele weken") **[bron]**. Toon een eerlijke termijn per categorie.
6. **3D is geen voorwaarde:** begin met foto, staal en 2D-bovenaanzicht **[bron + inschatting]**.

---

## 7. Wat dit betekent voor onze configurator [inschatting]

| # | Aanpassing | Waarom | Fase |
|---|---|---|---|
| 1 | **Modulaire elementen in de motor:** een configuratie bevat een lijst elementen (bv. arm links, zit zonder arm, hoek, chaise rechts), elk met eigen prijsregel per stofgroep en aansluitregels | Hoekbanken en modulaire banken zoals bij Bolia en Burrow; prijs = som van de elementen | 1 (uitbreiding) |
| 2 | **Stof als keuze met eigenschappen** `groep`, `rapport_cm`, `prijs_m`; **stofverbruik** per element × factor patroonrapport | Juiste prijs bij eigen stof en correcte stofbestelling | 1 |
| 3 | **Regels voor eigen stof (COM/COL)** als kolom in de prijstabel + toeslag%; **twee stoffen** = hoogste groep + toeslag | Gangbaar in de branche | 1 |
| 4 | **2D-bovenaanzicht (SVG)** met maatlijnen en "+"-knoppen op toegelaten aansluitpunten | Zonder 3D toch duidelijk; ideaal voor interieurinrichters | 2 / 4 |
| 5 | **Voorbeeldopstellingen** als startpunt | Minder keuzestress | 2 |
| 6 | **Twee modi:** wizard voor particulieren op de website, één scherm voor showroom en inrichters | Volgens AR-Range | 2 |
| 7 | **Stalen aanvragen** en **afspraak/offerte aanvragen** als eindstap op de website; inrichters zien hun nettoprijs | Past bij "showroom op afspraak" | 2 / 6 |
| 8 | **Levertermijn per productcategorie** | Eenvoudig en gangbaar | 3 |
| 9 | 3D (model-viewer + glTF met stofvarianten) **pas later**, eventueel alleen voor modulaire elementen met vaste maat | Kost-baten | 6 |

---

## 8. Bronnen

**Geverifieerd:** [CodeHole7/3D-sofa-configurator (README)](https://github.com/CodeHole7/3D-sofa-configurator/blob/master/README.md)

**Configurators en merken (niet geverifieerd):**
[Bolia: maatwerk](https://www.bolia.com/en/this-is-us/our-design-collection/customised-just-for-you/) ·
[BoConcept: levering](https://www.boconcept.com/en-us/customer-service/delivery) ·
[Ferm Living Rico](https://fermliving.com/pages/rico) ·
[Moebe Sofa Builder](https://moebe.dk/pages/modular-sofa-configurator) ·
[Onehouse](https://onehouse.de/en/pages/sofa-configurator) ·
[Burrow (review)](https://www.apartmenttherapy.com/burrow-nomad-sofa-review-37431042) ·
[Joybird (review)](https://www.apartmenttherapy.com/joybird-lewis-sectional-review-37477801) ·
[Interior Define (review)](https://www.apartmenttherapy.com/best-interior-define-sofas-37472657) ·
[Jori LAGOM](https://www.jori.com/en/content/100-lagom) ·
[Copahome-case (Experlogix)](https://experlogix.com/case-studies/copahome-nv/) ·
[Fixtuur: modulaire sofa bouwen](https://www.fixtuur.com/how-to-guides/building-a-sofa-in-3d-modular-configurator) ·
[Emersya modulaire sofa](https://www.emersya.com/modular-sofa/) ·
[Site3D modulaire sofa](https://configurator.site3d.site/posts/modular-sofa-designer/en)

**Software en techniek (niet geverifieerd):**
[Roomle docking](https://docs.roomle.com/rubens/content-creation/scripting-resources/200_80_dockingbasics) ·
[Roomle configurator-concepten](https://docs.roomle.com/rubens/rubens-sdk/rubens-configurator/configurator-concepts) ·
[Khronos: KHR_materials_variants](https://www.khronos.org/blog/streamlining-3d-commerce-with-material-variant-support-in-gltf-assets) ·
[glTF-specificatie](https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_materials_variants) ·
[model-viewer voorbeelden](https://modelviewer.dev/examples/scenegraph) ·
[Cylindo via Chaos Cloud](https://blog-sbx.enscape3d.com/chaos-blog-migration/leveraging-chaos-cloud-for-undecillions-of-product-variations) ·
[Hive CPQ](https://hivecpq.com/configurator) ·
[Elfsquad + Exact Online](https://elfsquad.io/integrations/erp/exact-online) ·
[Combeenation-case](https://www.combeenation.com/en/case-studies/system-shelf-configurator)

**Prijsopbouw en stofverbruik (niet geverifieerd):**
[Darran Milner-prijslijst (PDF)](https://www.darran.com/wp-content/uploads/2024/08/pricelist_milner.pdf) ·
[JSI Sosa-prijslijst](https://res.cloudinary.com/jasper-jsi-furniture/image/upload/jsi_sosa_pricelist) ·
[Grand Rapids Chair stofgroepen 2026 (PDF)](https://grandrapidschair.com/wp-content/uploads/2024/04/GRC-Graded-Fabric-Program-2026.pdf) ·
[COM-gids (PDF)](https://api.onetimepim.com/v1/media/203/fabrication_guide.pdf) ·
[Kovi Fabrics: stof meten](https://www.kovifabrics.com/blog/?p=5462) ·
[Vanguard sofa-opties (PDF)](https://vanguardfurniture.com/vdir/LocalDocs/UPHStyleOptions/SOFA%20-%20Style%20Options.pdf) ·
[Racklify: marker making vs nesting](https://racklify.com/encyclopedia/marker-making-versus-nesting-which-approach-fits-your-cut-room/) ·
[Fraunhofer AutoNester-T](https://www.scai.fraunhofer.de/en/products/software-autonester-t.html)

**UX en lessen (niet geverifieerd):**
[AR-Range: wizard vs vrij](https://www.ar-range.app/solutions/knowledge-base/whats-the-difference-between-a-wizard-style-ui-and-a-free-explore-ui) ·
[AR-Range: modulaire sofa's](https://www.ar-range.app/blog-posts/selling-modular-sofas-with-3d-sofa-configurators) ·
[AR-Range: fouten bij personalisatie](https://www.ar-range.app/solutions/knowledge-base/what-mistakes-do-most-furniture-brands-make-with-personalization) ·
[Cloudflight: best practices](https://www.cloudflight.io/en/blog/best-product-configurators-ecommerce/) ·
[DTU: oorzaken van mislukte configuratorprojecten](https://orbit.dtu.dk/en/publications/the-causes-of-product-configuration-project-failure/) ·
[Kolonell: B2B-meubelcatalogus](https://kolonell.com/en/blog/office-furniture-manufacturer-b2b-catalog-website-amsterdam-2026)
