# Onderzoek geschiedenis — feiten per tijdperk

Versie 1, 17/11/2026. Bronnenonderzoek voor Belgica: per tijdperk de machten bij de start, hun heersers, gebieden en relaties, de belangrijkste gebeurtenissen, versterkingen en namen. Dezelfde gegevens staan als JSON in `docs/geschiedenis-tijdperken.json`.

## Hoe betrouwbaar is dit?

- **Werkwijze.** Alle feiten zijn opgezocht met een zoekmachine. Webpagina's zelf openen was in deze sessie geblokkeerd (Wikipedia, livius.org en andere sites waren niet bereikbaar). De controle steunt dus op wat de zoekresultaten over die pagina's zeiden, niet op het volledig lezen van de bron. Voor het spel is dat goed genoeg als eerste ronde; wie een feit écht hard wil maken, opent de bron-URL.
- **ONZEKER** betekent: bronnen spreken elkaar tegen, of het jaar of de plaats wordt betwist.
- **NIET NAGEKEKEN** betekent: dit komt uit algemene kennis en kwam in deze ronde niet in een zoekresultaat terug. Het staat erin omdat het spel het nodig heeft, maar moet nog gecontroleerd worden. In de JSON staan zulke gebeurtenissen op `"onzeker": true` en begint het veld `bron` met "NIET NAGEKEKEN".
- **Bronnen.** Veel URL's verwijzen naar Wikipedia of een kopie ervan (wikiwand, wikipedia.com, kiwix, ipfs). Die kopieën bevatten dezelfde tekst als Wikipedia; vervang ze later gerust door de gewone `en.wikipedia.org`-link. Door AI geschreven sites (llmpedia, cavac) zijn niet als bron gebruikt.
- **Coördinaten** van zetels en versterkingen zijn benaderend (op enkele km) en uit eigen kennis, niet uit een bron. Bij het maken van de kaart nakijken in OpenStreetMap.
- **Gebieden** gebruiken de lijst: West-Vlaanderen, Oost-Vlaanderen, Antwerpen, Vlaams-Brabant, Brussel, Waals-Brabant, Henegouwen, Namen, Luik, Limburg (B), Luxemburg (B), Frans-Vlaanderen, Artesië (Pas-de-Calais), Aisne, Franse Ardennen, Zeeuws-Vlaanderen, Nederlands-Limburg, Groothertogdom Luxemburg. Een macht "houdt" een gebied als ze er het grootste deel van bezit; grenzen liepen zelden netjes langs de huidige provincies. Voor de vroege tijdperken zijn deze toewijzingen bij benadering.
- **Bevolking.** Voor de Romeinse tijd tot ±1400 bestaat geen bruikbare schatting voor dit gebied; die tijdperken staan op ONZEKER. Vanaf ±1500 komen de cijfers uit de reeks voor het huidige België (randgebieden niet inbegrepen).
- **Datums in de JSON.** Formaat `YYYY-MM-DD`, jaren vóór Christus negatief (`-0057-...`). Het extra veld `precisie` zegt of dag, maand of alleen jaar gekend is; bij "jaar" of "maand" zijn maand en dag slechts een plaatshouder (vaak 01, soms een traditionele maar niet nagekeken dag).

## Voorstellen voor de grenzen tussen tijdperken

| # | tijdperk | van | tot | opmerking |
|---|---|---|---|---|
| 1 | Romeinen | 57 v.Chr. | 481 | einde bij 481 i.p.v. ±430, zodat tijdperk 2 met Clovis begint |
| 2 | Franken | 481 | 843 (augustus) | |
| 3 | Vroege middeleeuwen | 843 | 1100 | 1106 kan ook (Leuven krijgt Neder-Lotharingen) |
| 4 | Hoge middeleeuwen | 1100 | 30/1/1384 | |
| 5 | Bourgondiërs | 30/1/1384 | 27/3/1482 | |
| 6 | Habsburgers en Spanje | 27/3/1482 | 6/3/1714 | Rastatt |
| 7 | Oostenrijk | 6/3/1714 | 1/10/1795 | Fleurus (1794) valt nog in dit tijdperk |
| 8 | Frankrijk en VK | 1/10/1795 | 4/10/1830 | |
| 9 | België | 4/10/1830 | 4/8/1914 | opstand begon 25/8/1830 |
| 10 | Wereldoorlogen | 4/8/1914 | 8/5/1945 | |
| 11 | Na de oorlog | 8/5/1945 | nu | |


## 1. Romeinen (57 v.Chr. - 481)

**Grens:** Voorstel: einde bij 481 (Clovis koning) in plaats van ±430, zodat tijdperk 2 met een duidelijke toestand begint. Chlodio's opmars (±430-450) valt dan nog in dit tijdperk.  
**Toestand bij de start:** voorjaar 57 v.Chr., vlak voor Caesars veldtocht tegen de Belgen  
**Bevolking bij de start:** geen betrouwbare schatting; grootte-orde enkele honderdduizenden (ONZEKER). Caesar noemt in BG 2.4 aantallen strijders per volk (bv. 19.000 Aduatuci), maar die cijfers gelden als overdreven. (bron: https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Gallic_War/2*.html ; https://en.wikipedia.org/wiki/Siege_of_the_Atuatuci)

### Machten bij de start

| id | naam | soort | heerser | gebieden | zetel (lat, lon) | relaties | bron |
|---|---|---|---|---|---|---|---|
| `rome` | Romeinse Republiek | rijk | Gaius Julius Caesar, proconsul van Gallië 58-50 v.Chr. (Rome zelf: consuls; geen alleenheerser) | (buiten de kaart) | Rome (41.89, 12.49) | oorlog: suessiones, nerviers, atrebaten, viromandui, morini, menapiers, aduatuci, eburonen, condrusen; bond: remi, treveri | https://en.wikipedia.org/wiki/Battle_of_the_Axona |
| `remi` | Remi | staat | Iccius en Andecomborius (leiders/gezanten; of zij koningen waren is ONZEKER) | Aisne, Franse Ardennen | Durocortorum (Reims) (49.26, 4.03) | oorlog: suessiones, nerviers, atrebaten, viromandui, morini, menapiers, aduatuci, eburonen, condrusen; bond: rome | https://en.wikipedia.org/wiki/Battle_of_the_Axona *Reims ligt net buiten de kaart; Bibrax (Remi) ligt in Aisne.* |
| `suessiones` | Suessiones | staat | Galba, koning (57 v.Chr.), aanvoerder van de Belgische coalitie | Aisne | Noviodunum (bij Soissons; ligging ONZEKER) (49.4, 3.3) | oorlog: rome, remi; bond: nerviers, atrebaten, viromandui, morini, menapiers, aduatuci, eburonen, condrusen | https://en.wikipedia.org/wiki/Battle_of_the_Axona |
| `nerviers` | Nerviers | staat | Boduognatus, legeraanvoerder (57 v.Chr.) | Henegouwen, Frans-Vlaanderen, Waals-Brabant, Vlaams-Brabant | geen gekende hoofdplaats; later Bagacum (Bavay) (50.3, 3.79) | oorlog: rome, remi; bond: suessiones, atrebaten, viromandui, aduatuci | https://en.wikipedia.org/wiki/Battle_of_the_Sabis *Grenzen van het Nervisch gebied bij benadering.* |
| `atrebaten` | Atrebaten | staat | onbekend; Commius pas na de nederlaag door Caesar als koning aangesteld (ONZEKER wanneer precies) | Artesië (Pas-de-Calais) | Nemetocenna (Arras) (50.29, 2.78) | oorlog: rome, remi; bond: nerviers, suessiones, viromandui | https://en.wikipedia.org/wiki/Battle_of_the_Sabis |
| `viromandui` | Viromandui | staat | onbekend | Aisne | later Augusta Viromanduorum (Saint-Quentin) (49.85, 3.29) | oorlog: rome, remi; bond: nerviers, atrebaten, suessiones | https://en.wikipedia.org/wiki/Battle_of_the_Sabis |
| `morini` | Morini | staat | onbekend | Artesië (Pas-de-Calais), Frans-Vlaanderen | later Tarvenna (Thérouanne) (50.64, 2.26) | oorlog: rome, remi; bond: suessiones, menapiers | https://en.wikipedia.org/wiki/Battle_of_the_Axona *Deelname aan de coalitie volgens Caesar BG 2.4.* |
| `menapiers` | Menapiers | staat | onbekend | West-Vlaanderen, Oost-Vlaanderen, Zeeuws-Vlaanderen, Antwerpen, Frans-Vlaanderen | later Castellum Menapiorum (Kassel) (50.8, 2.49) | oorlog: rome, remi; bond: suessiones, morini | https://en.wikipedia.org/wiki/Battle_of_the_Axona |
| `aduatuci` | Aduatuci | staat | onbekend | Namen, Luik | versterkte burcht (oppidum Aduatucorum; ligging ONZEKER: Namen, Thuin of elders) (50.46, 4.87) | oorlog: rome, remi; bond: nerviers, suessiones | https://en.wikipedia.org/wiki/Siege_of_the_Atuatuci |
| `eburonen` | Eburonen | staat | Ambiorix en Catuvolcus, samen koning | Limburg (B), Luik, Nederlands-Limburg, Antwerpen | Atuatuca (ligging ONZEKER; vaak met Tongeren verbonden) (50.78, 5.46) | oorlog: rome, remi; bond: suessiones, condrusen; heer: aduatuci | https://en.wikipedia.org/wiki/Ambiorix%27s_revolt *Volgens Caesar (BG 5.27) betaalden de Eburonen schatting aan de Aduatuci; als 'heer' ingevuld, ONZEKER.* |
| `treveri` | Treveri | staat | rivaliteit tussen Indutiomarus en zijn schoonzoon Cingetorix (bekend uit 54 v.Chr.) | Groothertogdom Luxemburg, Luxemburg (B), Franse Ardennen | oppidum Titelberg (49.54, 5.86) | bond: rome | https://en.wikipedia.org/wiki/Indutiomarus *In 57 v.Chr. reden Treverische ruiters nog met Caesar mee; later opstandig.* |
| `condrusen` | Condrusen en andere 'Germani cisrhenani' (Caerosi, Paemani, Segni) | staat | onbekend | Namen, Luik, Luxemburg (B) | onbekend (Condroz) (50.29, 5.1) | oorlog: rome, remi; bond: suessiones, eburonen | https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Gallic_War/2*.html *Samengevoegd tot één factie voor het spel.* |

### Gebeurtenissen

| datum | gebeurtenis | gevolg | bron |
|---|---|---|---|
| 57 v.Chr. | **ONZEKER** **Beleg van Bibrax en slag aan de Axona**: De Belgische coalitie onder Galba belegert het Remische Bibrax; Caesar stuurt hulp en slaat een aanval op zijn kamp aan de Aisne af. | De coalitie valt uiteen; de Suessiones en daarna andere volken onderwerpen zich. | https://en.wikipedia.org/wiki/Battle_of_the_Axona |
| 57 v.Chr. | **ONZEKER** **Slag aan de Sabis**: Nerviers onder Boduognatus, met Atrebaten en Viromandui, overvallen Caesars leger aan de rivier (meestal de Selle, vroeger de Samber). | Romeinse overwinning; de Nerviers zijn gebroken, de Aduatuci komen te laat. | https://en.wikipedia.org/wiki/Battle_of_the_Sabis |
| 9/57 v.Chr. | **ONZEKER** **Beleg van de Aduatuci**: Caesar neemt de burcht van de Aduatuci in na een verraderlijke uitval. | Volgens Caesar worden 53.000 overlevenden als slaaf verkocht; de Aduatuci verdwijnen als macht. | https://en.wikipedia.org/wiki/Siege_of_the_Atuatuci |
| 10/54 v.Chr. | **ONZEKER** **Hinderlaag bij Atuatuca**: Ambiorix en Catuvolcus lokken het winterkamp van Sabinus en Cotta naar buiten en vernietigen anderhalf legioen. | Opstand in het noorden van Gallië; Romeins gezag wankelt. | https://www.historyofwar.org/articles/battles_atuatuca.html ; https://en.wikipedia.org/wiki/Ambiorix%27s_revolt |
| 54 v.Chr. | **ONZEKER** **Dood van Indutiomarus**: De Treverische leider Indutiomarus sneuvelt bij een ruiteraanval van Labienus; Cingetorix krijgt de macht. | Treveri tijdelijk onder een Rome-gezinde leider (jaar 54 of 53 v.Chr. betwist). | https://en.wikipedia.org/wiki/Indutiomarus |
| 53 v.Chr. | **ONZEKER** **Vernietiging van de Eburonen**: Caesar laat het land van de Eburonen plunderen; Catuvolcus pleegt zelfmoord, Ambiorix ontsnapt. | Eburonen verdwijnen; later wonen hier de Tungri. | https://en.wikipedia.org/wiki/Ambiorix%27s_revolt |
| 22 v.Chr. | **ONZEKER** **Provincie Gallia Belgica**: Agrippa deelt Gallië in drie delen, waaronder Belgica (jaar volgens Britannica/Wikipedia; andere bronnen noemen 27 of 16-13 v.Chr.). | Het hele gebied wordt Romeinse provincie, ingedeeld in civitates. | https://britannica.com/place/Belgica-ancient-province-Europe |
| 69 | **Bataafse opstand**: Julius Civilis komt in opstand; Treveri en Lingones (Classicus, Tutor) roepen een 'Gallisch rijk' uit; Cerialis herstelt het gezag in 70. | Tijdelijk verlies van Romeins gezag in het noorden; daarna herstel. | https://en.wikipedia.org/wiki/Revolt_of_the_Batavi |
| 83 | **ONZEKER** **Germania Inferior**: Onder Domitianus wordt de Rijnzone een eigen provincie; de civitas Tungrorum (Tongeren) komt erbij (rond 83-85; sommige bronnen pas onder Diocletianus). | Grens tussen provincies loopt dwars door het latere België. | https://www.taylorfrancis.com/chapters/oa-edit/10.5117/9789462983601_CH06/late-roman-town-tongeren-alain-vanderhoeven |
| 260 | **Gallisch keizerrijk**: Postumus, landvoogd van Neder-Germanië, komt in de herfst van 260 in opstand en sticht een eigen rijk (hoofdstad Keulen, later Trier). | Het gebied hoort 260-274 bij een afgescheurd rijk; Aurelianus wint in 274 bij Châlons. | https://en.wikipedia.org/wiki/Gallic_Empire |
| 358 | **ONZEKER** **Salische Franken in Toxandrië**: Julianus aanvaardt de onderwerping van de Salische Franken en laat hen in Toxandrië (Kempen) wonen. | Eerste erkende Frankische vestiging binnen het rijk. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Toxandria |
| 31/12/406 | **ONZEKER** **Rijnoversteek**: Vandalen, Alanen en Sueben steken de Rijn over, traditioneel op 31 december 406 (datum betwist). | Rijnverdediging stort in; Noord-Gallië wordt geplunderd. | https://en.wikipedia.org/wiki/Crossing_of_the_Rhine |
| 440 | **ONZEKER** **Chlodio neemt Doornik en Kamerijk**: Volgens Gregorius van Tours trekt Chlodio door het Kolenwoud, neemt Doornik en Kamerijk en rukt op tot de Somme (jaar ONZEKER, ±430-450). | Frankisch koninkrijk rond Doornik. | https://Www.Wikipedia.org/wiki/Childeric_I |

### Versterkingen

Atuatuca Tungrorum (Tongeren) (50.78, 5.46), Bagacum (Bavay) (50.3, 3.79), Bibrax (Vieux-Laon, ONZEKER) (49.47, 3.83), Augusta Suessionum (Soissons) (49.38, 3.32), Nemetacum (Arras) (50.29, 2.78), Castellum Menapiorum (Kassel) (50.8, 2.49), Tarvenna (Thérouanne) (50.64, 2.26), Turnacum (Doornik) (50.61, 3.39), Oudenburg (kustfort) (51.18, 3.0), Aardenburg (kustfort) (51.27, 3.45), Traiectum (Maastricht) (50.85, 5.69), Orolaunum (Aarlen) (49.68, 5.81), Titelberg (oppidum) (49.54, 5.86), Augusta Treverorum (Trier, net buiten kaart) (49.75, 6.64)

### Namen en dynastieën

**Voornamen:** Ambiorix, Catuvolcus, Boduognatus, Galba, Iccius, Andecomborius, Commius, Indutiomarus, Cingetorix, Civilis, Classicus, Tutor, Postumus, Tetricus, Chlodio, Merovech  
**Dynastieën:** Juliers-Claudiers (Rome), Gallische keizers (Postumus tot Tetricus), vroege Merovingen (Chlodio, Merovech)


## 2. Franken (481 - 843)

**Grens:** Start 481 (Childerik sterft, Clovis koning; jaar afgeleid, niet gedocumenteerd).  
**Toestand bij de start:** 481, troonsbestijging van Clovis in Doornik  
**Bevolking bij de start:** geen betrouwbare schatting (ONZEKER) (bron: -)

### Machten bij de start

| id | naam | soort | heerser | gebieden | zetel (lat, lon) | relaties | bron |
|---|---|---|---|---|---|---|---|
| `salfranken` | Salische Franken van Doornik | staat | Clovis I, koning 481-511 | Henegouwen, West-Vlaanderen, Oost-Vlaanderen | Doornik (50.61, 3.39) | bond: kamerijk | https://Www.Wikipedia.org/wiki/Childeric_I *Omvang van het rijk in 481 ONZEKER.* |
| `kamerijk` | Franken van Kamerijk | staat | Ragnachar, koning (gestorven ±509, ONZEKER) | Frans-Vlaanderen, Artesië (Pas-de-Calais) | Kamerijk (50.18, 3.23) | bond: salfranken | https://Www.Wikipedia.org/wiki/Childeric_I |
| `rijnfranken` | Rijnfranken (Ripuariers) | staat | Sigibert de Lamme, koning in Keulen (jaren ONZEKER) | Nederlands-Limburg, Luik, Limburg (B), Groothertogdom Luxemburg | Keulen (50.94, 6.96) | - | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Sigebert_the_Lame *Omvang naar het westen ONZEKER.* |
| `syagrius` | Rijk van Syagrius (Soissons) | staat | Syagrius, 'koning der Romeinen' (±464-486) | Aisne, Franse Ardennen, Namen, Luxemburg (B) | Soissons (49.38, 3.32) | - | https://ipfs.ssi.eecc.de/ipns/en.wikipedia-on-ipfs.org/wiki/Clovis_I *Noordgrens en omvang ONZEKER.* |
| `byzantium` | Oost-Romeinse rijk | rijk | keizer Zeno (474-491) | (buiten de kaart) | Constantinopel (41.01, 28.98) | - | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Zeno_(emperor) |
| `visigoten` | Visigoten | rijk | Eurik (466-484) | (buiten de kaart) | Toulouse (43.6, 1.44) | - | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Euric *Syagrius vlucht in 486 naar Alarik II.* |
| `alamannen` | Alamannen | rijk | onbekend | (buiten de kaart) | geen vaste zetel (Boven-Rijn, ONZEKER) (48.58, 7.75) | - | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Battle_of_Tolbiac |

### Gebeurtenissen

| datum | gebeurtenis | gevolg | bron |
|---|---|---|---|
| 486 | **Slag bij Soissons**: Clovis verslaat Syagrius, die vlucht naar de Visigoten. | Het laatste Romeinse gebied in Noord-Gallië komt onder de Franken. | https://Www.Wikipedia.org/wiki/Childeric_I |
| 496 | **ONZEKER** **Slag bij Tolbiac en doop van Clovis**: Clovis verslaat de Alamannen en laat zich dopen in Reims (jaar betwist: 496, 498 of 508). | Frankisch rijk katholiek; steun van de Gallo-Romeinse bisschoppen. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Battle_of_Tolbiac |
| 27/11/511 | **ONZEKER** **Dood van Clovis, eerste deling**: Clovis sterft; het rijk wordt verdeeld onder zijn vier zonen. | Begin van de herhaalde rijksdelingen (later Austrasië en Neustrië). | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Clovis_I |
| 640 | **ONZEKER** **Dood van Pepijn van Landen**: De hofmeier van Austrasië, stamvader van de Pippiniden, sterft. | Pippiniden blijven machtig in het Maasland. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Pepin_of_Landen |
| 687 | **Slag bij Tertry**: Pepijn van Herstal verslaat Neustrië en Bourgondië. | Pippiniden worden de werkelijke heersers van het hele Frankische rijk. | https://en.wikipedia.com/wiki/Battle_of_Tertry |
| 16/12/714 | **ONZEKER** **Dood van Pepijn van Herstal**: Pepijn van Herstal sterft; opvolgingsstrijd tot Karel Martel wint (719). | Machtsstrijd, daarna Karel Martel hofmeier. | https://familypedia.fandom.com/wiki/Pepin_of_Herstal |
| 732 | **ONZEKER** **Slag bij Poitiers/Tours**: Karel Martel verslaat het leger van Abd al-Rahman (dag traditioneel 10 oktober, ONZEKER). | Groot prestige voor de Pippiniden. | https://www.Britannica.Com/biography/Charles-Martel |
| 751 | **Pepijn de Korte koning**: Pepijn zet de laatste Merovingische koning af en wordt met pauselijke steun koning. | Begin van de Karolingische dynastie. | https://www.Britannica.Com/biography/Charles-Martel |
| 25/12/800 | **ONZEKER** **Karel de Grote keizer**: Paus Leo III kroont Karel de Grote in Rome tot keizer. | Aken wordt hart van een keizerrijk; het hele kaartgebied ligt erin. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Charlemagne |
| 8/843 | **ONZEKER** **Verdrag van Verdun**: De kleinzonen van Karel de Grote verdelen het rijk; Lotharius krijgt het Middenrijk (dag ONZEKER, augustus 843). | De Schelde wordt grens: westelijk West-Francië, oostelijk het Middenrijk. | https://en.Wikipedia.com/wiki/Middle_Francia |

### Versterkingen

Doornik (50.61, 3.39), Kamerijk (50.18, 3.23), Soissons (49.38, 3.32), Laon (49.56, 3.62), Herstal (palts) (50.66, 5.63), Jupille (palts) (50.64, 5.63), Landen (50.75, 5.08), Maastricht (50.85, 5.69), Aken (palts, net buiten kaart) (50.78, 6.08), Keulen (buiten kaart) (50.94, 6.96)

### Namen en dynastieën

**Voornamen:** Chlodovech (Clovis), Childerik, Chlotarius, Theuderik, Sigebert, Dagobert, Pepijn, Grimoald, Karel, Karloman, Lodewijk, Lotharius, Ragnachar, Ansegisel, Begga, Gertrudis, Plectrudis  
**Dynastieën:** Merovingen, Pippiniden / Karolingen (Landen, Herstal)


## 3. Vroege middeleeuwen (843 - 1100)

**Grens:** Start: Verdrag van Verdun (augustus 843). Einde 1100 (dood Godfried van Bouillon); 1106 (Godfried van Leuven hertog van Neder-Lotharingen) is ook verdedigbaar.  
**Toestand bij de start:** augustus 843, na Verdun  
**Bevolking bij de start:** geen betrouwbare schatting (ONZEKER) (bron: -)

### Machten bij de start

| id | naam | soort | heerser | gebieden | zetel (lat, lon) | relaties | bron |
|---|---|---|---|---|---|---|---|
| `middenrijk` | Middenrijk (Lotharius) | rijk | keizer Lotharius I (keizer 840-855) | Antwerpen, Vlaams-Brabant, Brussel, Waals-Brabant, Henegouwen, Namen, Luik, Limburg (B), Luxemburg (B), Nederlands-Limburg, Groothertogdom Luxemburg, Franse Ardennen | Aken (50.78, 6.08) | oorlog: vikingen | https://en.Wikipedia.com/wiki/Middle_Francia *Grens langs de Schelde; zuidwestgrens in Henegouwen en Ardennen ONZEKER.* |
| `westfrankenrijk` | West-Francië | rijk | Karel de Kale (koning 843-877) | West-Vlaanderen, Oost-Vlaanderen, Zeeuws-Vlaanderen, Frans-Vlaanderen, Artesië (Pas-de-Calais), Aisne | Compiegne/Laon (rondreizend hof, ONZEKER) (49.42, 2.83) | oorlog: vikingen | https://en.Wikipedia.com/wiki/Middle_Francia |
| `oostfrankenrijk` | Oost-Francië | rijk | Lodewijk de Duitser (koning 843-876) | (buiten de kaart) | Regensburg (49.01, 12.1) | - | https://en.Wikipedia.com/wiki/Middle_Francia |
| `vikingen` | Vikingen | rijk | geen vaste leider (o.a. Rorik in Friesland, ONZEKER) | (buiten de kaart) | Dorestad (ONZEKER) (51.97, 5.34) | oorlog: middenrijk, westfrankenrijk | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Rorik_of_Dorestad *Plunderende groepen, geen staat.* |

### Gebeurtenissen

| datum | gebeurtenis | gevolg | bron |
|---|---|---|---|
| 855 | **Verdrag van Prüm**: Lotharius I verdeelt op zijn sterfbed het Middenrijk; het noorden gaat naar Lotharius II. | Ontstaan van Lotharingen. | https://en.Wikipedia.com/wiki/Middle_Francia |
| 862 | **ONZEKER** **Boudewijn en Judith**: Boudewijn schaakt Judith, dochter van Karel de Kale (Kerstmis 861 of 862); na verzoening wordt hij graaf in Vlaanderen. | Begin van het graafschap Vlaanderen onder Boudewijn I. | https://en.wikipedia.org/wiki/Judith_of_Flanders |
| 8/8/870 | **Verdrag van Meerssen**: Lodewijk de Duitser en Karel de Kale verdelen Lotharingen, ruwweg langs Maas, Ourthe en Moezel. | Westelijk Lotharingen naar West-Francië, oostelijk naar Oost-Francië. | https://en.wikipedia.org/wiki/Treaty_of_Meerssen |
| 880 | **ONZEKER** **Verdrag van Ribemont**: Heel Lotharingen gaat naar Oost-Francië. | Schelde weer grens tussen west en oost. | https://en.wikipedia.org/wiki/Treaty_of_Meerssen |
| 9/891 | **ONZEKER** **Slag bij Leuven**: Arnulf van Karinthie verslaat de Vikingen aan de Dijle; hun leiders Sigfried en Godfried sneuvelen (september of november). | Einde van het grote Vikingkamp bij Leuven; invallen gaan beperkt door. | https://en.wikipedia.org/wiki/Battle_of_Leuven_(891) |
| 925 | **Lotharingen bij Oost-Francië**: De Lotharingers onder Giselbert erkennen Hendrik de Vogelaar als koning. | Lotharingen hoort voortaan bij het Duitse Rijk. | https://wikiwand.com/en/articles/Dukes_of_Lotharingia |
| 959 | **Splitsing van Lotharingen**: Bruno van Keulen splitst Lotharingen in Neder- en Opper-Lotharingen. | Neder-Lotharingen omvat het grootste deel van het latere België ten oosten van de Schelde. | https://Www.Wikipedia.org/wiki/Lower_Lorraine |
| 12/4/963 | **ONZEKER** **Stichting van Luxemburg**: Graaf Siegfried ruilt met de abdij van Sint-Maximinus de burcht Lucilinburhuc (oorkonde gedateerd 17 april, vermoedelijk fout; Palmzondag viel op 12 april). | Kern van het latere graafschap Luxemburg. | https://en.wikipedia.org/wiki/County_of_Luxembourg |
| 7/7/985 | **ONZEKER** **Prinsbisdom Luik**: Bisschop Notger krijgt het graafschap Hoei met wereldlijke macht (980 of 985 volgens bron). | Luik wordt een vorstendom binnen het Rijk. | https://en.wikipedia.org/wiki/Prince-Bishopric_of_Li%C3%A8ge |
| 3/7/987 | **ONZEKER** **Hugo Capet koning**: Hugo Capet wordt koning van West-Francië; Karel van Neder-Lotharingen (Karolinger) mist de troon. | Capetingers in Frankrijk, leenheren van Vlaanderen. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Hugh_Capet |
| 1003 | **ONZEKER** **Graafschap Leuven**: Lambert I de Gebaarde wordt rond 1003 graaf van Leuven genoemd. | Kern van het latere hertogdom Brabant. | https://Www.wikipedia.org/wiki/Count_of_Leuven |
| 1096 | **ONZEKER** **Godfried van Bouillon op kruistocht**: Godfried, hertog van Neder-Lotharingen, verkoopt/verpandt Bouillon aan Luik en vertrekt op kruistocht. | Bouillon naar Luik; hertogstitel komt vrij na zijn dood in 1100. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Godfrey_of_Bouillon |

### Versterkingen

Gent (Gravensteen-plaats) (51.06, 3.72), Brugge (burg) (51.21, 3.22), Leuven (50.88, 4.7), Namen (50.46, 4.87), Bergen (Mons) (50.45, 3.95), Luxemburg (Bock) (49.61, 6.13), Luik (50.64, 5.57), Hoei (50.52, 5.24), Bouillon (49.79, 5.07), Valenciennes (50.36, 3.52), Antwerpen (51.22, 4.4), Limbourg (50.61, 5.94), Borgloon (50.8, 5.34), Atrecht (Arras) (50.29, 2.78), Sint-Omaars (50.75, 2.25)

### Namen en dynastieën

**Voornamen:** Boudewijn, Arnulf, Robrecht, Reinier, Lambert, Godfried, Hendrik, Gozelo, Albert, Siegfried, Notger, Giselbert, Everhard, Judith, Gerberga, Ermengarde  
**Dynastieën:** Karolingen, Ottonen/Saliers (Duitse Rijk), Capetingers, Vlaamse gravenhuis (Boudewijn), Reiniers (Henegouwen, Leuven), Ardense huis (Luxemburg, Verdun)


## 4. Hoge middeleeuwen (1100 - 1384)

**Grens:** Start 1100; einde bij dood van Lodewijk van Male (30 januari 1384).  
**Toestand bij de start:** begin 1100  
**Bevolking bij de start:** geen betrouwbare schatting (ONZEKER) (bron: -)

### Machten bij de start

| id | naam | soort | heerser | gebieden | zetel (lat, lon) | relaties | bron |
|---|---|---|---|---|---|---|---|
| `vlaanderen` | Graafschap Vlaanderen | staat | Robrecht II 'van Jeruzalem' (graaf 1093-1111; jaren niet bevestigd in bron) | West-Vlaanderen, Oost-Vlaanderen, Zeeuws-Vlaanderen, Frans-Vlaanderen, Artesië (Pas-de-Calais) | Brugge (51.21, 3.22) | heer: frankrijk | https://en.wikipedia.org/wiki/Godfrey_I,_Count_of_Louvain *Rijks-Vlaanderen (o.a. Aalst, Zeeuws-Vlaanderen) was leen van de Duitse keizer; hier vereenvoudigd.* |
| `henegouwen` | Graafschap Henegouwen | staat | Boudewijn III (1098-1120) | Henegouwen | Bergen (50.45, 3.95) | heer: duitserijk | https://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.4everland.io/wiki/Counts_of_Hainaut.html |
| `namen` | Graafschap Namen | staat | Albert III (±1063/1067-1102) | Namen | Namen (50.46, 4.87) | heer: duitserijk | https://en.wikipedia.org/wiki/Albert_III,_Count_of_Namur |
| `leuven` | Graafschap Leuven (later hertogdom Brabant) | staat | Godfried I (graaf 1095-1139) | Vlaams-Brabant, Brussel, Waals-Brabant, Antwerpen | Leuven (50.88, 4.7) | heer: duitserijk | https://en.wikipedia.org/wiki/Godfrey_I,_Count_of_Louvain |
| `limburg` | Graafschap Limburg | staat | Hendrik I (1082-1119) | Luik, Nederlands-Limburg | Limbourg (50.61, 5.94) | heer: duitserijk | https://Www.Wikipedia.org/wiki/Henry,_Duke_of_Lower_Lorraine |
| `luik` | Prinsbisdom Luik | staat | Otbert (bisschop; 1091-1119 niet bevestigd) | Luik, Namen, Limburg (B) | Luik (50.64, 5.57) | heer: duitserijk | https://en.wikipedia.org/wiki/Arnold_I,_Count_of_Loon *Gebied versnipperd; Bouillon sinds 1096 Luiks.* |
| `loon` | Graafschap Loon | staat | Arnold I (1078-1135) | Limburg (B) | Borgloon (50.8, 5.34) | heer: duitserijk | https://en.wikipedia.org/wiki/Arnold_I,_Count_of_Loon |
| `luxemburg` | Graafschap Luxemburg | staat | Willem I (1096-1131; niet bevestigd) | Groothertogdom Luxemburg, Luxemburg (B) | Luxemburg (49.61, 6.13) | heer: duitserijk | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/County_of_Luxembourg |
| `boulogne` | Graafschap Boulogne | staat | Eustatius III (1087-1125; niet bevestigd) | Artesië (Pas-de-Calais) | Boulogne (50.73, 1.61) | heer: frankrijk | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Eustace_III,_Count_of_Boulogne |
| `duitserijk` | Heilig Roomse Rijk | rijk | keizer Hendrik IV (koning 1056, keizer 1084-1105) | (buiten de kaart) | Aken (kroningsstad; geen vaste hoofdstad) (50.78, 6.08) | - | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Henry_IV,_Holy_Roman_Emperor |
| `frankrijk` | Koninkrijk Frankrijk | rijk | Filips I (1060-1108) | Aisne | Parijs (48.86, 2.35) | - | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Philip_I_of_France |

### Gebeurtenissen

| datum | gebeurtenis | gevolg | bron |
|---|---|---|---|
| 1106 | **Godfried van Leuven hertog**: Na de dood van keizer Hendrik IV verliest Hendrik van Limburg de hertogstitel van Neder-Lotharingen aan Godfried I van Leuven. | Leuven/Brabant stijgt boven de andere vorsten uit; rivaliteit met Limburg. | https://en.wikipedia.org/wiki/Godfrey_I,_Count_of_Louvain |
| 2/3/1127 | **Moord op Karel de Goede**: Graaf Karel de Goede wordt in de Sint-Donaaskerk in Brugge vermoord door de Erembalden. | Opvolgingscrisis in Vlaanderen; Diederik van de Elzas wordt graaf (1128). | https://en.wikipedia.org/wiki/Charles_the_Good |
| 1183 | **ONZEKER** **Hertogdom Brabant**: Hendrik I voert de titel hertog van Brabant (1183 of 1190, ONZEKER). | Brabant als hertogdom. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Duchy_of_Brabant |
| 27/7/1214 | **Slag bij Bouvines**: Filips II August van Frankrijk verslaat een coalitie; graaf Ferrand van Vlaanderen wordt gevangen genomen. | Franse greep op Vlaanderen versterkt; Ferrand blijft tot 1227 gevangen. | https://www.britannica.com/event/Battle-of-Bouvines |
| 5/6/1288 | **ONZEKER** **Slag bij Woeringen**: Jan I van Brabant wint de Limburgse Successieoorlog. | Limburg komt bij Brabant. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Battle_of_Worringen |
| 11/7/1302 | **Guldensporenslag**: Vlaamse milities verslaan het Franse ridderleger bij Kortrijk. | Vlaanderen blijft vrij van rechtstreeks Frans bestuur. | https://warhistory.org/article/courtrai-1302?amp=0 |
| 23/6/1305 | **ONZEKER** **Verdrag van Athis-sur-Orge**: Na Pevelenberg sluiten Filips IV en Robrecht III vrede; Rijsel, Dowaai (en Orchies of Bethune) gaan naar de Franse kroon (definitief 1312/1320). | Waals-Vlaanderen (rond Rijsel) Frans. | https://en.wikipedia.org/wiki/Treaty_of_Athis-sur-Orge |
| 1345 | **ONZEKER** **Moord op Jacob van Artevelde**: De Gentse leider die Vlaanderen sinds 1338 aan Engeland bond, wordt vermoord (1345; een bron zegt 1346; dag ONZEKER). | Einde van de Gentse overmacht; graaf herstelt gezag. | https://www.the-low-countries.com/article/the-rise-and-fall-of-brewer-of-ghent-jacob-van-artevelde/ |
| 3/1/1356 | **Blijde Inkomst**: Johanna en Wenceslas van Brabant verlenen het voorrechtencharter. | Grondwet-achtig charter; kort daarna valt Lodewijk van Male Brabant binnen. | https://www.britannica.com/biography/Johanna |
| 1366 | **Loon bij Luik**: Na de Loonse Successieoorlogen wordt het graafschap Loon definitief bij het prinsbisdom gevoegd. | Loon verdwijnt als zelfstandige macht. | https://en.wikipedia.org/wiki/Battle_of_Baesweiler |
| 19/6/1369 | **Huwelijk Margaretha van Male en Filips de Stoute**: Huwelijk in de Sint-Baafsabdij in Gent. | Vlaanderen en Artesië zullen naar Bourgondië gaan. | https://mdwiki.org/wiki/Louis_de_Male |
| 22/8/1371 | **Slag bij Baesweiler**: Hertog Wenceslas van Brabant wordt verslagen en gevangen door Gulik en Gelre. | Brabant verzwakt. | https://en.wikipedia.org/wiki/Battle_of_Baesweiler |
| 27/11/1382 | **Slag bij Westrozebeke**: Een Frans leger verslaat de Gentenaars; Filips van Artevelde sneuvelt. | Gentse opstand gebroken in het veld, duurt nog tot 1385. | https://en.wikipedia.org/wiki/Philip_van_Artevelde |

### Versterkingen

Gravensteen (Gent) (51.06, 3.72), Brugge (51.21, 3.22), Ieper (50.85, 2.88), Kortrijk (50.83, 3.26), Rijsel (50.63, 3.06), Brussel (50.85, 4.35), Leuven (50.88, 4.7), Limbourg (50.61, 5.94), Luxemburg (49.61, 6.13), Namen (50.46, 4.87), Bergen (50.45, 3.95), Luik (50.64, 5.57), Hoei (50.52, 5.24), Bouillon (49.79, 5.07), Calais (Engels vanaf 1347) (50.95, 1.86)

### Namen en dynastieën

**Voornamen:** Boudewijn, Diederik, Filips, Gwijde, Robrecht, Lodewijk, Ferrand, Johanna, Margaretha, Godfried, Hendrik, Jan, Walram, Willem, Arnold, Wenceslas, Hugo, Adolf  
**Dynastieën:** Elzas (Vlaanderen), Dampierre (Vlaanderen, Namen), Leuven/Brabant (Reiniers), Avesnes (Henegouwen, Holland), Luxemburg (later keizers), Limburg, Loon


## 5. Bourgondiërs (1384 - 1482)

**Grens:** 30 januari 1384 (dood Lodewijk van Male) tot 27 maart 1482 (dood Maria van Bourgondië).  
**Toestand bij de start:** 30 januari 1384  
**Bevolking bij de start:** geen betrouwbare schatting voor 1384 (ONZEKER); rond 1500 ±2,3 miljoen in de hele Nederlanden (bron: https://encyclopedia.com/international/encyclopedias-almanacs-transcripts-and-maps/low-countries)

### Machten bij de start

| id | naam | soort | heerser | gebieden | zetel (lat, lon) | relaties | bron |
|---|---|---|---|---|---|---|---|
| `bourgondie` | Bourgondische Staat | staat | Filips de Stoute (hertog 1363-1404) met Margaretha van Male (gravin 1384-1405) | West-Vlaanderen, Oost-Vlaanderen, Zeeuws-Vlaanderen, Frans-Vlaanderen, Artesië (Pas-de-Calais) | Rijsel (ONZEKER; het hof reisde) (50.63, 3.06) | oorlog: gent; bond: frankrijk; heer: frankrijk | https://mdwiki.org/wiki/Louis_de_Male *Antwerpen en Mechelen waren toen Vlaams (sinds 1357, NIET NAGEKEKEN).* |
| `gent` | Opstandig Gent | staat | Frans Ackerman (leider; NIET NAGEKEKEN) | Oost-Vlaanderen | Gent (51.05, 3.72) | oorlog: bourgondie, frankrijk; bond: engeland | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Revolt_of_Ghent_(1379%E2%80%931385) *Gentse opstand 1379-1385.* |
| `brabant` | Hertogdom Brabant | staat | Johanna (hertogin 1355-1406) | Vlaams-Brabant, Brussel, Waals-Brabant, Antwerpen, Luik | Brussel (50.85, 4.35) | heer: duitserijk | https://www.britannica.com/biography/Johanna *Inclusief hertogdom Limburg (in provincie Luik).* |
| `henegouwen` | Henegouwen (met Holland en Zeeland) | staat | Albrecht van Beieren (NIET NAGEKEKEN) | Henegouwen | Bergen (50.45, 3.95) | heer: duitserijk | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Albert_I,_Duke_of_Bavaria |
| `namen` | Graafschap Namen | staat | Willem I (NIET NAGEKEKEN) | Namen | Namen (50.46, 4.87) | heer: duitserijk | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/County_of_Namur |
| `luik` | Prinsbisdom Luik | staat | Arnold van Horne (NIET NAGEKEKEN) | Luik, Limburg (B), Namen | Luik (50.64, 5.57) | heer: duitserijk | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://www.wikipedia.org/wiki/Bishop_of_Liege |
| `luxemburg` | Hertogdom Luxemburg | staat | Wenceslas (Rooms-koning, ook hertog van Luxemburg; NIET NAGEKEKEN) | Groothertogdom Luxemburg, Luxemburg (B) | Luxemburg (49.61, 6.13) | heer: duitserijk | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Duchy_of_Luxembourg |
| `frankrijk` | Koninkrijk Frankrijk | rijk | Karel VI (1380-1422) | Aisne, Franse Ardennen | Parijs (48.86, 2.35) | oorlog: engeland, gent; bond: bourgondie | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Charles_VI_of_France |
| `engeland` | Koninkrijk Engeland | rijk | Richard II (1377-1399) | Artesië (Pas-de-Calais) | Londen (51.51, -0.13) | oorlog: frankrijk; bond: gent | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Richard_II_of_England *Bezit Calais (sinds 1347).* |
| `duitserijk` | Heilig Roomse Rijk | rijk | Wenceslas (Rooms-koning 1376-1400) | (buiten de kaart) | Praag (50.09, 14.42) | - | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Wenceslaus_IV_of_Bohemia |

### Gebeurtenissen

| datum | gebeurtenis | gevolg | bron |
|---|---|---|---|
| 1421 | **Aankoop van Namen**: Filips de Goede koopt het graafschap Namen; hij neemt het over in 1429. | Namen Bourgondisch. | https://en.wikipedia.org/wiki/County_of_Namur |
| 1430 | **Brabant en Limburg**: Filips van Saint-Pol sterft kinderloos; Filips de Goede erft Brabant, Limburg en het markgraafschap Antwerpen. | Brabant en Limburg Bourgondisch. | https://WWW.wikipedia.org/wiki/Philip_the_Good |
| 1433 | **ONZEKER** **Henegouwen, Holland en Zeeland**: Jacoba van Beieren moet haar graafschappen afstaan (1432 of 1433). | Henegouwen Bourgondisch. | https://www.wikipedia.com/wiki/Burgundian_Netherlands |
| 1443 | **ONZEKER** **Luxemburg**: Filips de Goede verwerft Luxemburg van Elisabeth van Görlitz (sommige bronnen 1441). | Luxemburg Bourgondisch. | https://thefreelancehistorywriter.com/?p=6083 |
| 25/8/1466 | **ONZEKER** **Verwoesting van Dinant**: Karel (de Stoute) laat het opstandige Dinant verwoesten en burgers in de Maas werpen (een Franse bron zegt 1467). | Luikse opstand afgestraft. | https://en.wikipedia.org/wiki/Wars_of_Li%C3%A8ge |
| 28/10/1467 | **Slag bij Brustem**: Karel de Stoute verslaat de Luikenaars bij Sint-Truiden. | Luik verliest zijn vrijheden. | https://en.wikipedia.org/wiki/Battle_of_Brustem |
| 30/10/1468 | **Plundering van Luik**: Na een nieuwe opstand neemt Karel Luik in en laat de stad in brand steken. | Luik onder Bourgondische voogdij. | https://en.wikipedia.org/wiki/Wars_of_Li%C3%A8ge |
| 5/1/1477 | **Dood van Karel de Stoute**: Karel sneuvelt bij Nancy. | Erfopvolgingscrisis; Frankrijk bezet Bourgondië en delen van Artesië. | https://www.britannica.com/summary/Charles-duke-of-Burgundy |
| 11/2/1477 | **ONZEKER** **Groot Privilege**: Maria van Bourgondië verleent de Staten-Generaal voorrechten (10 of 11 februari). | Gewesten herwinnen rechten tegenover de vorst. | https://en.wikipedia.org/wiki/Flemish_revolts_against_Maximilian_of_Austria |
| 19/8/1477 | **Huwelijk Maria en Maximiliaan**: Maria trouwt in Gent met Maximiliaan van Oostenrijk. | De Nederlanden gaan naar de Habsburgers. | https://www.encyclopedia.com/reference/encyclopedias-almanacs-transcripts-and-maps/mary-burgundy |
| 7/8/1479 | **Slag bij Guinegate**: Een Habsburgs-Vlaams leger verslaat de Fransen. | Franse opmars in Artesië gestuit. | https://en.wikipedia.org/wiki/War_of_the_Burgundian_Succession |
| 27/3/1482 | **Dood van Maria van Bourgondië**: Maria sterft na een val van haar paard. | Haar zoon Filips (3 jaar) erft; strijd over het regentschap van Maximiliaan. | https://en.wikipedia.org/wiki/Mary_of_Burgundy |

### Versterkingen

Gent (51.05, 3.72), Brugge (51.21, 3.22), Rijsel (50.63, 3.06), Brussel (50.85, 4.35), Namen (50.46, 4.87), Luxemburg (49.61, 6.13), Luik (50.64, 5.57), Dinant (50.26, 4.91), Sint-Truiden (50.82, 5.19), Calais (Engels) (50.95, 1.86), Atrecht (Arras) (50.29, 2.78), Mechelen (51.03, 4.48), Oudenaarde (50.85, 3.6), Hoei (50.52, 5.24)

### Namen en dynastieën

**Voornamen:** Filips, Jan, Karel, Antoon, Margaretha, Isabella, Maria, Jacoba, Willem, Albrecht, Lodewijk, Jan van Heinsberg, Anton, Adolf, Cornelis (bastaard)  
**Dynastieën:** Valois-Bourgondië, Wittelsbach (Beieren-Henegouwen), Luxemburg, Habsburg (vanaf 1477), De la Marck


## 6. Habsburgers en Spanje (1482 - 1714)

**Grens:** 27 maart 1482 tot het Verdrag van Rastatt (6 maart 1714).  
**Toestand bij de start:** 27 maart 1482  
**Bevolking bij de start:** ±1,25 miljoen in het huidige België (rond 1500); randgebieden niet inbegrepen (ruwe schatting) (bron: https://wikiwand.com/en/Demographics_of_Belgium)

### Machten bij de start

| id | naam | soort | heerser | gebieden | zetel (lat, lon) | relaties | bron |
|---|---|---|---|---|---|---|---|
| `habsburg` | Habsburgse Nederlanden | staat | Filips de Schone (heer 1482-1506, minderjarig; regent Maximiliaan, betwist) | Oost-Vlaanderen, West-Vlaanderen, Zeeuws-Vlaanderen, Antwerpen, Vlaams-Brabant, Brussel, Waals-Brabant, Henegouwen, Namen, Luxemburg (B), Groothertogdom Luxemburg, Frans-Vlaanderen, Limburg (B), Nederlands-Limburg | Mechelen (51.03, 4.48) | oorlog: frankrijk, vlaamsesteden; bond: duitserijk; heer: duitserijk | https://en.wikipedia.org/wiki/Mary_of_Burgundy *Limburg (B)/Nederlands-Limburg hier bedoeld als hertogdom Limburg en Landen van Overmaas; Luiks gebied apart.* |
| `vlaamsesteden` | Vlaamse Leden (Gent, Brugge, Ieper) | staat | regentschapsraad van de Vlaamse steden (ONZEKER als aparte macht) | Oost-Vlaanderen, West-Vlaanderen | Gent (51.05, 3.72) | oorlog: habsburg; bond: frankrijk | https://en.wikipedia.org/wiki/Flemish_revolts_against_Maximilian_of_Austria *Strijd tegen Maximiliaan 1482-1492.* |
| `frankrijk` | Koninkrijk Frankrijk | rijk | Lodewijk XI (1461-1483) | Aisne, Franse Ardennen, Artesië (Pas-de-Calais) | Parijs (48.86, 2.35) | oorlog: habsburg; bond: vlaamsesteden | https://en.wikipedia.org/wiki/Treaty_of_Arras_(1482) *Bezet sinds 1477 delen van Artesië.* |
| `luik` | Prinsbisdom Luik | staat | Lodewijk van Bourbon (1456-1482, vermoord 30 augustus 1482) | Luik, Limburg (B), Namen, Nederlands-Limburg | Luik (50.64, 5.57) | heer: duitserijk | https://en.wikipedia.org/wiki/Louis_de_Bourbon_(bishop_of_Li%C3%A8ge) |
| `duitserijk` | Heilig Roomse Rijk | rijk | keizer Frederik III (1452-1493) | (buiten de kaart) | Wiener Neustadt (47.81, 16.24) | bond: habsburg | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Frederick_III,_Holy_Roman_Emperor |
| `engeland` | Koninkrijk Engeland | rijk | Edward IV (1461-1483) | Artesië (Pas-de-Calais) | Londen (51.51, -0.13) | - | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Edward_IV_of_England *Calais Engels tot 1558.* |

### Gebeurtenissen

| datum | gebeurtenis | gevolg | bron |
|---|---|---|---|
| 23/12/1482 | **Vrede van Atrecht**: Maximiliaan moet Artesië en Picardie aan Frankrijk laten (Artesië kwam in 1493 grotendeels terug, NIET NAGEKEKEN). | Grens met Frankrijk verschuift tijdelijk naar het noorden. | https://en.wikipedia.org/wiki/Treaty_of_Arras_(1482) |
| 24/2/1500 | **Geboorte van Karel V**: Karel wordt in het Prinsenhof in Gent geboren. | Erfgenaam van Bourgondië, Spanje en Oostenrijk. | https://www.worldhistory.org/wiki/C/Charles-V,-Holy-Roman-Emperor.htm |
| 8/1529 | **ONZEKER** **Damesvrede van Kamerijk**: Frans I erkent Karel als heer van de Nederlanden en ziet af van leenheerschap over Vlaanderen en Artesië (2/3 augustus; Artesië niet bevestigd). | Vlaanderen en Artesië niet langer Frans leen. | https://www.worldhistory.org/wiki/C/Charles-V,-Holy-Roman-Emperor.htm |
| 1549 | **Pragmatieke Sanctie**: Karel V verklaart de Zeventien Provinciën tot een ondeelbaar geheel met dezelfde erfopvolging (dag NIET NAGEKEKEN). | De Nederlanden blijven samen bij een vorst. | https://www.worldhistory.org/wiki/C/Charles-V,-Holy-Roman-Emperor.htm |
| 25/10/1555 | **Troonsafstand in Brussel**: Karel V draagt de Nederlanden over aan zijn zoon Filips II. | De Nederlanden onder de Spaanse tak. | https://www.thecollector.com/charles-v-holy-roman-emperor/ |
| 10/8/1566 | **Beeldenstorm**: In de Westhoek (Steenvoorde) begint de Beeldenstorm (plaats niet bevestigd in bron). | Begin van de Opstand; Alva wordt gestuurd. | https://www.wikipedia.com/wiki/Battles_of_the_Eighty_Years%27_War |
| 17/8/1585 | **Val van Antwerpen**: Farnese neemt Antwerpen in na een lang beleg; protestanten moeten bekeren of vertrekken. | Zuiden blijft Spaans; scheiding met het Noorden. | https://britannica.com/event/Battle-of-Antwerp |
| 9/4/1609 | **Twaalfjarig Bestand**: Wapenstilstand tussen Spanje en de Republiek, getekend in Antwerpen. | Twaalf jaar vrede; grens in Zeeuws-Vlaanderen en Brabant bevriest. | https://www.worldhistory.org/Eighty_Years'_War/ |
| 30/1/1648 | **Vrede van Munster**: Spanje erkent de Republiek; de Schelde blijft gesloten. | Zeeuws-Vlaanderen en Maastricht bij de Republiek; Antwerpen afgesneden. | https://www.worldhistory.org/Eighty_Years'_War/ |
| 1659 | **Vrede van de Pyreneeën**: Frankrijk krijgt het grootste deel van Artesië (dag NIET NAGEKEKEN). | Artesië Frans. | https://courses.lumenlearning.com/suny-worldhistory/chapter/louis-xivs-wars/ |
| 2/5/1668 | **Vrede van Aken**: Frankrijk houdt o.a. Rijsel, Doornik, Kortrijk, Oudenaarde, Veurne en Charleroi. | Grote Franse winst in Vlaanderen en Henegouwen. | https://ipfs.aleph.im/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco/wiki/Treaty_of_Aix-la-Chapelle_(1668).html |
| 17/9/1678 | **Vrede van Nijmegen**: Frankrijk krijgt Sint-Omaars, Kassel, Ieper, Kamerijk en Valenciennes; geeft o.a. Kortrijk, Oudenaarde, Charleroi terug. | Grens begint op de huidige Frans-Belgische grens te lijken. | https://www.wikipedia.com/wiki/Peace_of_Nijmegen |
| 1697 | **ONZEKER** **Vrede van Rijswijk**: Gebieden die Frankrijk in de Negenjarige Oorlog nam, gaan terug naar Spanje (dag en lijst NIET NAGEKEKEN). | Herstel van de grens van 1678 met kleine wijzigingen. | https://webcf.waybackmachine.org/web/20220504161456/https://en.wikipedia.org/wiki/Spanish_Netherlands |
| 23/5/1706 | **Slag bij Ramillies**: Marlborough verslaat de Fransen. | Bondgenoten bezetten de Spaanse Nederlanden. | https://weaponsandwarfare.com/?p=8335 |
| 11/7/1708 | **Slag bij Oudenaarde**: Marlborough en Eugenius verslaan de Fransen; daarna beleg en val van Rijsel. | Franse greep op Vlaanderen verzwakt. | https://www.timewisetraveller.co.uk/warss.html |
| 11/9/1709 | **Slag bij Malplaquet**: Bloedige, weinig beslissende overwinning van de bondgenoten. | Uitputting; weg naar vrede. | https://www.timewisetraveller.co.uk/warss.html |
| 11/4/1713 | **ONZEKER** **Vrede van Utrecht**: Einde van de Spaanse Successieoorlog tussen Frankrijk en de meeste bondgenoten (datum niet bevestigd in de gevonden bron). | Spaanse Nederlanden bestemd voor Oostenrijk. | https://nam.ac.uk/explore/spanish-succession |
| 6/3/1714 | **Vrede van Rastatt**: Oostenrijk sluit vrede met Frankrijk en krijgt de Zuidelijke Nederlanden. | Begin Oostenrijkse Nederlanden. | https://nam.ac.uk/explore/spanish-succession |

### Versterkingen

Citadel van Antwerpen (51.21, 4.39), Spanjaardenkasteel Gent (51.06, 3.74), Citadel van Namen (50.46, 4.86), Charlemont (Givet) (50.14, 4.83), Philippeville (50.2, 4.54), Mariembourg (50.09, 4.52), Oostende (51.23, 2.92), Sluis (51.31, 3.39), Hulst (51.28, 4.05), Maastricht (50.85, 5.69), Citadel van Rijsel (50.64, 3.04), Doornik (50.61, 3.39), Ieper (50.85, 2.88), Luxemburg (49.61, 6.13), Duinkerke (51.03, 2.38), Kamerijk (50.18, 3.23), Charleroi (50.41, 4.44)

### Namen en dynastieën

**Voornamen:** Filips, Karel, Maximiliaan, Margaretha, Maria, Ferdinand, Albrecht, Isabella, Alexander, Fernando, Juan, Jan, Willem, Lamoraal, Filips van Montmorency, Leopold Willem, Maximiliaan Emanuel  
**Dynastieën:** Habsburg (Spaanse tak), Valois en Bourbon (Frankrijk), Oranje-Nassau (Republiek), Egmont, Horne, Croy, Arenberg (adel), Wittelsbach (prins-bisschoppen van Luik)


## 7. Oostenrijk (1714 - 1795)

**Grens:** 6 maart 1714 (Rastatt) tot de annexatie door Frankrijk (1 oktober 1795). Fleurus (26 juni 1794) valt aan het einde van dit tijdperk.  
**Toestand bij de start:** 6 maart 1714  
**Bevolking bij de start:** ±1,75 miljoen in het huidige België (rond 1700); ruwe schatting (bron: https://wikiwand.com/en/Demographics_of_Belgium)

### Machten bij de start

| id | naam | soort | heerser | gebieden | zetel (lat, lon) | relaties | bron |
|---|---|---|---|---|---|---|---|
| `oostenrijk` | Oostenrijkse Nederlanden | staat | keizer Karel VI (1711-1740); landvoogd vanaf 1716 prins Eugenius, waargenomen door markies de Prié (NIET NAGEKEKEN) | West-Vlaanderen, Oost-Vlaanderen, Antwerpen, Vlaams-Brabant, Brussel, Waals-Brabant, Henegouwen, Namen, Luxemburg (B), Groothertogdom Luxemburg | Brussel (50.85, 4.35) | bond: republiek, grootbrittannie | https://nam.ac.uk/explore/spanish-succession *Tot 1716 nog onder Brits-Staatse voogdij (ONZEKER).* |
| `republiek` | Republiek der Verenigde Nederlanden | staat | geen stadhouder (raadpensionaris Heinsius, NIET NAGEKEKEN) | Zeeuws-Vlaanderen, Nederlands-Limburg | Den Haag (52.08, 4.31) | bond: oostenrijk, grootbrittannie | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Barrier_Treaty *Mag barrièrevestingen bezetten; Maastricht gedeeld met Luik.* |
| `frankrijk` | Koninkrijk Frankrijk | rijk | Lodewijk XIV (1643-1715) | Frans-Vlaanderen, Artesië (Pas-de-Calais), Aisne, Franse Ardennen | Versailles (48.8, 2.12) | - | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Louis_XIV |
| `luik` | Prinsbisdom Luik | staat | Jozef Clemens van Beieren (1694-1723) | Luik, Limburg (B), Namen | Luik (bisschop zetelde meestal in Bonn) (50.64, 5.57) | heer: duitserijk | https://en.Wikipedia.com/wiki/Clement_Joseph_of_Bavaria |
| `grootbrittannie` | Groot-Brittannië | rijk | koningin Anna (1702-1714) | (buiten de kaart) | Londen (51.51, -0.13) | bond: oostenrijk, republiek | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Anne,_Queen_of_Great_Britain |
| `duitserijk` | Heilig Roomse Rijk | rijk | keizer Karel VI (zelfde vorst als Oostenrijk) | (buiten de kaart) | Wenen (48.21, 16.37) | - | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Charles_VI,_Holy_Roman_Emperor |

### Gebeurtenissen

| datum | gebeurtenis | gevolg | bron |
|---|---|---|---|
| 1715 | **ONZEKER** **Derde Barrièreverdrag**: De Republiek krijgt garnizoensrecht in een rij vestingen in de Oostenrijkse Nederlanden (dag NIET NAGEKEKEN). | Staatse troepen in o.a. Namen, Doornik, Menen, Ieper, Veurne. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Barrier_Treaty |
| 11/5/1745 | **Slag bij Fontenoy**: Frankrijk verslaat de bondgenoten bij Doornik. | Frankrijk bezet tegen eind 1745 een groot deel van de Oostenrijkse Nederlanden. | https://www.britannica.com/facts/Battle-of-Fontenoy |
| 18/10/1748 | **Vrede van Aken**: Einde Oostenrijkse Successieoorlog; Frankrijk geeft zijn veroveringen terug. | Oostenrijks gezag hersteld. | https://britannica.com/facts/Treaty-of-Aix-la-Chapelle |
| 1780 | **ONZEKER** **Jozef II alleenheerser**: Na de dood van Maria Theresia regeert Jozef II alleen (dag NIET NAGEKEKEN). | Begin van ingrijpende hervormingen. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Joseph_II,_Holy_Roman_Emperor |
| 1787 | **ONZEKER** **Bestuurshervormingen van Jozef II**: Jozef II vervangt oude raden en rechtbanken door een nieuw stelsel (NIET NAGEKEKEN). | Verzet van Staten en Kerk. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Brabant_Revolution |
| 18/8/1789 | **Luikse Revolutie**: Opstand tegen de prins-bisschop van Luik. | Republiek Luik tot herstel van het prinsbisdom (1791). | https://www.wikipedia.com/wiki/Li%C3%A8ge_Revolution |
| 27/10/1789 | **Slag bij Turnhout**: Patriotten verslaan Oostenrijkse troepen; begin van de Brabantse Omwenteling (start ook 24 oktober genoemd). | Oostenrijkers verdreven uit het grootste deel van het land. | https://Wikipedia.com/wiki/Brabant_Revolution |
| 11/1/1790 | **Verenigde Belgische Staten**: De Staten sluiten een verbond met een Soeverein Congres. | Korte onafhankelijkheid tot Oostenrijks herstel eind 1790. | https://www.Wikipedia.org/wiki/United_Belgium_States |
| 6/11/1792 | **Slag bij Jemappes**: Een Frans revolutieleger verslaat de Oostenrijkers. | Eerste Franse bezetting. | https://brusselstimes.com/593353/excuse-my-french-belgium-before-waterloo |
| 18/3/1793 | **Slag bij Neerwinden**: De Oostenrijkers verslaan de Fransen. | Oostenrijks gezag kort hersteld. | https://www.worldhistory.org/Battle_of_Neerwinden/.md |
| 26/6/1794 | **Slag bij Fleurus**: Jourdan verslaat de bondgenoten. | Definitieve Franse verovering. | https://Www.wikipedia.org/wiki/Invasion_of_France_(1794) |

### Versterkingen

Namen (50.46, 4.86), Doornik (50.61, 3.39), Menen (50.8, 3.12), Veurne (51.07, 2.66), Waasten (Warneton) (50.75, 2.95), Ieper (50.85, 2.88), Fort Knokke (bij Lo-Reninge, ONZEKER) (50.95, 2.8), Dendermonde (51.03, 4.1), Luxemburg (49.61, 6.13), Maastricht (50.85, 5.69), Rijsel (Frans) (50.64, 3.04), Bergen (50.45, 3.95), Charleroi (50.41, 4.44), Ath (50.63, 3.78), Oudenaarde (50.85, 3.6), Citadel van Antwerpen (51.21, 4.39)

### Namen en dynastieën

**Voornamen:** Karel, Maria Theresia, Jozef, Leopold, Frans, Maria Elisabeth, Karel Alexander, Albert, Maria Christina, Hendrik van der Noot, Jan Frans Vonck, Frans Karel, Cesar Constantijn, Georges-Louis  
**Dynastieën:** Habsburg-Lotharingen, Bourbon (Frankrijk), Oranje-Nassau, Hannover (Groot-Brittannië), Wittelsbach en De Velbruck/De Hoensbroeck (Luik)


## 8. Frankrijk en Verenigd Koninkrijk (1795 - 1830)

**Grens:** 1 oktober 1795 (annexatie) tot 4 oktober 1830 (onafhankelijkheidsverklaring). Alternatief: start op 26 juni 1794 (Fleurus).  
**Toestand bij de start:** 1 oktober 1795  
**Bevolking bij de start:** ±3 tot 3,5 miljoen in het huidige België (rond 1800; ONZEKER) (bron: https://wikiwand.com/en/Demographics_of_Belgium)

### Machten bij de start

| id | naam | soort | heerser | gebieden | zetel (lat, lon) | relaties | bron |
|---|---|---|---|---|---|---|---|
| `frankrijk` | Franse Republiek | rijk | Nationale Conventie, vanaf eind oktober/november 1795 het Directoire (NIET NAGEKEKEN) | West-Vlaanderen, Oost-Vlaanderen, Antwerpen, Vlaams-Brabant, Brussel, Waals-Brabant, Henegouwen, Namen, Luik, Limburg (B), Luxemburg (B), Frans-Vlaanderen, Artesië (Pas-de-Calais), Aisne, Franse Ardennen, Zeeuws-Vlaanderen, Nederlands-Limburg, Groothertogdom Luxemburg | Parijs (48.86, 2.35) | oorlog: oostenrijk, grootbrittannie; bond: bataafserepubliek | https://brusselstimes.com/593353/excuse-my-french-belgium-before-waterloo *Zeeuws-Vlaanderen en Maastricht via het Verdrag van Den Haag (1795, NIET NAGEKEKEN); Luxemburg-stad gaf zich in 1795 over (NIET NAGEKEKEN).* |
| `bataafserepubliek` | Bataafse Republiek | staat | Nationale Vergadering (NIET NAGEKEKEN) | (buiten de kaart) | Den Haag (52.08, 4.31) | oorlog: grootbrittannie; bond: frankrijk | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Batavian_Republic |
| `oostenrijk` | Oostenrijk (Habsburgse monarchie) | rijk | keizer Frans II (1792-1835) | (buiten de kaart) | Wenen (48.21, 16.37) | oorlog: frankrijk; bond: grootbrittannie | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Francis_II,_Holy_Roman_Emperor |
| `grootbrittannie` | Groot-Brittannië | rijk | George III (1760-1820) | (buiten de kaart) | Londen (51.51, -0.13) | oorlog: frankrijk, bataafserepubliek; bond: oostenrijk | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/George_III |
| `pruisen` | Pruisen | rijk | Frederik Willem II (1786-1797) | (buiten de kaart) | Berlijn (52.52, 13.4) | - | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Peace_of_Basel *Sinds de Vrede van Bazel (1795) neutraal.* |

### Gebeurtenissen

| datum | gebeurtenis | gevolg | bron |
|---|---|---|---|
| 1/10/1795 | **ONZEKER** **Annexatie bij Frankrijk**: De Conventie lijft de Zuidelijke Nederlanden en het prinsbisdom Luik in. | Indeling in departementen (o.a. Leie, Schelde, Twee Neten, Dijle, Jemappes, Samber-en-Maas, Ourthe, Neder-Maas, Wouden); aantal 9 NIET bevestigd. | https://www.dbnl.org/tekst/koss002lage01_01/koss002lage01_01_0007.php |
| 17/10/1797 | **ONZEKER** **Vrede van Campo Formio**: Oostenrijk erkent het verlies van de Nederlanden (NIET NAGEKEKEN). | Franse annexatie internationaal erkend. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Treaty_of_Campo_Formio |
| 12/10/1798 | **Boerenkrijg**: Opstand op het platteland tegen de dienstplicht en het Franse bewind; neergeslagen tot 5 december 1798 (Hasselt). | Harde repressie; geen gebiedswijziging. | https://en.wikipedia.org/wiki/1798_in_Belgium |
| 1814 | **ONZEKER** **Einde Franse bewind**: Bondgenoten verdrijven de Fransen uit de Zuidelijke Nederlanden (NIET NAGEKEKEN). | Voorlopig geallieerd bestuur. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/United_Kingdom_of_the_Netherlands |
| 16/3/1815 | **ONZEKER** **Willem I koning**: Willem I roept zich uit tot koning van het Verenigd Koninkrijk der Nederlanden (datum niet bevestigd in bron). | Noord en Zuid samen in een staat; Luxemburg groothertogdom in personele unie. | https://www.Britannica.Com/event/Napoleonic-Wars/The-Congress-of-Vienna-and-the-Hundred-Days |
| 9/6/1815 | **ONZEKER** **Slotakte van Wenen**: Ondertekening van de slotakte van het Congres (een bron zegt 8 juni). | Grenzen van het nieuwe koninkrijk vastgelegd. | https://www.Britannica.Com/event/Napoleonic-Wars/The-Congress-of-Vienna-and-the-Hundred-Days |
| 16/6/1815 | **Ligny en Quatre-Bras**: Napoleon verslaat de Pruisen bij Ligny; bij Quatre-Bras houdt Wellington stand. | Pruisen trekken terug, Wellington ook. | https://Www.wikipedia.org/wiki/Waterloo_Campaign |
| 18/6/1815 | **Slag bij Waterloo**: Wellington en Blücher verslaan Napoleon. | Einde van Napoleon; Verenigd Koninkrijk der Nederlanden zeker. | https://www.wikipedia.org/wiki/Waterloo_Battle |
| 20/11/1815 | **ONZEKER** **Tweede Vrede van Parijs**: Frankrijk staat o.a. Philippeville, Mariembourg en Bouillon af (NIET NAGEKEKEN). | Huidige zuidgrens bijna bereikt. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Treaty_of_Paris_(1815) |

### Versterkingen

Citadel van Antwerpen (51.21, 4.39), Luxemburg (bondsvesting) (49.61, 6.13), Ieper (50.85, 2.88), Menen (50.8, 3.12), Oudenaarde (50.85, 3.6), Doornik (50.61, 3.39), Ath (50.63, 3.78), Bergen (50.45, 3.95), Charleroi (50.41, 4.44), Namen (50.46, 4.86), Hoei (50.52, 5.24), Citadel van Luik (50.65, 5.57), Dinant (50.26, 4.91), Oostende (51.23, 2.92), Nieuwpoort (51.13, 2.75), Citadel van Gent (51.04, 3.72), Maastricht (50.85, 5.69)

### Namen en dynastieën

**Voornamen:** Napoleon, Lodewijk, Willem, Frederik, Karel, Pieter, Jan, Emmanuel, Hendrik, Lieven Bauwens, Pieter Corbeels, Emmanuel Rollier, Gijsbert Karel, Joseph  
**Dynastieën:** Bonaparte, Oranje-Nassau, Bourbon (restauratie), Habsburg-Lotharingen, Hohenzollern


## 9. België (1830 - 1914)

**Grens:** Start 4 oktober 1830 (Voorlopig Bewind verklaart onafhankelijkheid); de opstand begon op 25 augustus 1830.  
**Toestand bij de start:** 4 oktober 1830  
**Bevolking bij de start:** ±4,1 miljoen (1831) (bron: https://tacitus.nu/historical-atlas/population/benelux.htm)

### Machten bij de start

| id | naam | soort | heerser | gebieden | zetel (lat, lon) | relaties | bron |
|---|---|---|---|---|---|---|---|
| `belgie` | België (Voorlopig Bewind) | staat | Voorlopig Bewind (o.a. Charles Rogier); regent Surlet de Chokier vanaf februari 1831; Leopold I vanaf 21 juli 1831 (NIET NAGEKEKEN behalve Leopold) | West-Vlaanderen, Oost-Vlaanderen, Vlaams-Brabant, Brussel, Waals-Brabant, Henegouwen, Namen, Luik, Limburg (B), Luxemburg (B), Antwerpen, Nederlands-Limburg, Groothertogdom Luxemburg | Brussel (50.85, 4.35) | oorlog: nederland; bond: frankrijk | https://Wikipedia.com/wiki/Belgian_Revolution *Controleert ook het grootste deel van Limburg en Luxemburg tot 1839, maar niet de vestingen.* |
| `nederland` | Verenigd Koninkrijk der Nederlanden | staat | Willem I (1815-1840) | Zeeuws-Vlaanderen, Nederlands-Limburg, Groothertogdom Luxemburg, Antwerpen | Den Haag (52.08, 4.31) | oorlog: belgie; bond: pruisen | https://Wikipedia.com/wiki/Belgian_Revolution *Houdt de citadel van Antwerpen (tot december 1832, NIET NAGEKEKEN), Maastricht en (met Pruisisch garnizoen) de vesting Luxemburg.* |
| `frankrijk` | Frankrijk | rijk | Lodewijk Filips (1830-1848) | Frans-Vlaanderen, Artesië (Pas-de-Calais), Aisne, Franse Ardennen | Parijs (48.86, 2.35) | bond: belgie | https://Wikipedia.com/wiki/Belgian_Revolution |
| `grootbrittannie` | Verenigd Koninkrijk | rijk | Willem IV (1830-1837) | (buiten de kaart) | Londen (51.51, -0.13) | - | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/William_IV |
| `pruisen` | Pruisen | rijk | Frederik Willem III (1797-1840) | (buiten de kaart) | Berlijn (52.52, 13.4) | bond: nederland | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Frederick_William_III_of_Prussia |

### Gebeurtenissen

| datum | gebeurtenis | gevolg | bron |
|---|---|---|---|
| 21/7/1831 | **Eed van Leopold I**: Leopold van Saksen-Coburg legt de eed af als koning der Belgen. | België wordt erfelijke grondwettelijke monarchie. | https://Wikipedia.com/wiki/Belgian_Revolution |
| 2/8/1831 | **Tiendaagse Veldtocht**: Het Nederlandse leger valt België binnen (2-12 augustus) en wint, maar trekt terug voor een Frans leger. | België overleeft dankzij Frankrijk; zwakkere onderhandelingspositie. | https://Wikipedia.com/wiki/Belgian_Revolution |
| 5/5/1835 | **ONZEKER** **Eerste spoorlijn**: Spoorlijn Brussel-Mechelen geopend (NIET NAGEKEKEN). | Begin van een snel groeiend spoornet; industrie in Henegouwen en Luik. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Rail_transport_in_Belgium |
| 19/4/1839 | **Verdrag van Londen**: Nederland erkent België; Limburg en Luxemburg worden gesplitst. | Oost-Limburg (met Maastricht) en het oosten van Luxemburg (Groothertogdom) naar Willem I. | https://Wikipedia.com/wiki/Belgian_Revolution |
| 1/7/1879 | **ONZEKER** **Eerste schoolstrijd**: De liberale wet-Van Humbeeck maakt het lager onderwijs neutraal (1 of 10 juli 1879). | Katholiek verzet; in 1884 draait een katholieke regering de wet terug. | https://wikipedia.com/wiki/First_School_War |
| 1/7/1885 | **Congo-Vrijstaat**: Na de Conferentie van Berlijn wordt Leopold II persoonlijk vorst van de Congo-Vrijstaat (naam 29 mei, start 1 juli 1885). | Persoonlijke kolonie; dwangarbeid en geweld (rubberregime) kosten zeer veel levens. | https://www.britannica.com/place/Congo-Free-State |
| 1893 | **ONZEKER** **Algemeen meervoudig stemrecht**: Alle mannen krijgen stemrecht, sommigen met extra stemmen (dag NIET NAGEKEKEN). | Arbeiderspartij in het parlement. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Elections_in_Belgium |
| 15/11/1908 | **Belgisch-Congo**: België neemt de Congo-Vrijstaat over (Kamer 20 augustus, Senaat 9 september, overdracht 15 november 1908). | Kolonie onder Belgische staat; het bewind blijft uitbuitend. | https://en.wikipedia.org/wiki/Congo_Free_State |
| 17/12/1909 | **ONZEKER** **Albert I koning**: Leopold II sterft; Albert I volgt op (dag NIET NAGEKEKEN). | Nieuwe koning voor de Eerste Wereldoorlog. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Albert_I_of_Belgium |

### Versterkingen

Antwerpen (nationaal reduit, Brialmont) (51.22, 4.4), Forten van Luik (o.a. Loncin) (50.67, 5.5), Forten van Namen (50.46, 4.87), Diest (50.99, 5.05), Dendermonde (51.03, 4.1), Maastricht (Nederlands) (50.85, 5.69), Luxemburg (ontmanteld na 1867) (49.61, 6.13), Rijsel (Frans) (50.64, 3.04), Maubeuge (Frans) (50.28, 3.97), Hoei (50.52, 5.24)

### Namen en dynastieën

**Voornamen:** Leopold, Albert, Filips, Boudewijn, Charles, Jules, Auguste, Walthère, Paul, Louise, Charlotte, Clémentine, Marie-Henriette, Elisabeth, Victor, Emile  
**Dynastieën:** Saksen-Coburg en Gotha (België), Oranje-Nassau (Nederland, Luxemburg tot 1890), Nassau-Weilburg (Luxemburg vanaf 1890), Orléans/Bonaparte (Frankrijk), Hohenzollern


## 10. Wereldoorlogen (1914 - 1945)

**Grens:** 4 augustus 1914 (Duitse inval) tot 8 mei 1945.  
**Toestand bij de start:** 4 augustus 1914  
**Bevolking bij de start:** ±7,4 tot 7,6 miljoen (ruwe schatting; telling 1910 ±7,4 miljoen NIET NAGEKEKEN) (bron: https://wikiwand.com/en/Demographics_of_Belgium)

### Machten bij de start

| id | naam | soort | heerser | gebieden | zetel (lat, lon) | relaties | bron |
|---|---|---|---|---|---|---|---|
| `belgie` | België | staat | Albert I (1909-1934) | West-Vlaanderen, Oost-Vlaanderen, Antwerpen, Vlaams-Brabant, Brussel, Waals-Brabant, Henegouwen, Namen, Luik, Limburg (B), Luxemburg (B) | Brussel (regering later in Sainte-Adresse, koning in De Panne) (50.85, 4.35) | oorlog: duitsland; bond: frankrijk, grootbrittannie | https://encyclopedia.1914-1918-online.net/article/belgium *Neutraal tot de inval; daarna strijdend naast de Entente.* |
| `duitsland` | Duitse Keizerrijk | rijk | keizer Wilhelm II (1888-1918) | (buiten de kaart) | Berlijn (52.52, 13.4) | oorlog: belgie, frankrijk, grootbrittannie | https://encyclopedia.1914-1918-online.net/article/belgium |
| `frankrijk` | Frankrijk | rijk | president Raymond Poincaré (1913-1920) | Frans-Vlaanderen, Artesië (Pas-de-Calais), Aisne, Franse Ardennen | Parijs (48.86, 2.35) | oorlog: duitsland; bond: belgie, grootbrittannie | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Raymond_Poincar%C3%A9 |
| `grootbrittannie` | Verenigd Koninkrijk | rijk | George V (1910-1936) | (buiten de kaart) | Londen (51.51, -0.13) | oorlog: duitsland; bond: belgie, frankrijk | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/George_V |
| `nederland` | Nederland | staat | Wilhelmina (1890-1948) | Zeeuws-Vlaanderen, Nederlands-Limburg | Den Haag (52.08, 4.31) | - | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Wilhelmina_of_the_Netherlands *Neutraal in WO I.* |
| `luxemburg` | Groothertogdom Luxemburg | staat | Marie-Adélaïde (1912-1919) | Groothertogdom Luxemburg | Luxemburg (49.61, 6.13) | heer: duitsland | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Marie-Ad%C3%A9la%C3%AFde,_Grand_Duchess_of_Luxembourg *Door Duitsland bezet sinds 2 augustus 1914 (NIET NAGEKEKEN); als 'heer' ingevuld.* |

### Gebeurtenissen

| datum | gebeurtenis | gevolg | bron |
|---|---|---|---|
| 4/8/1914 | **Duitse inval**: Het Duitse leger valt België binnen. | België in oorlog; Groot-Brittannië verklaart Duitsland de oorlog. | https://encyclopedia.1914-1918-online.net/article/belgium |
| 16/8/1914 | **Laatste fort van Luik valt**: Het laatste fort rond Luik geeft zich over. | Weg naar Brussel en Frankrijk open. | https://encyclopedia.1914-1918-online.net/article/belgium |
| 8/1914 | **ONZEKER** **Geweld tegen burgers**: Duitse troepen doden in augustus 1914 honderden burgers (o.a. Dinant, Leuven met de universiteitsbibliotheek) (data NIET NAGEKEKEN). | Internationale verontwaardiging; geen gebiedswijziging. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Rape_of_Belgium |
| 10/10/1914 | **ONZEKER** **Val van Antwerpen**: Antwerpen valt; het Belgische leger trekt terug naar de IJzer (datum niet bevestigd in bron). | Bijna heel België bezet. | https://www.Wikipedia.org/wiki/Antwerp_expedition |
| 10/1914 | **ONZEKER** **Slag aan de IJzer**: Het Belgische leger houdt stand tussen Nieuwpoort en Diksmuide; onderwaterzetting stopt de Duitsers (dagen NIET NAGEKEKEN). | Klein stukje West-Vlaanderen blijft vrij tot 1918. | https://en.wikipedia.org/wiki/Battle_of_the_Yser |
| 11/11/1918 | **ONZEKER** **Wapenstilstand**: Einde van de gevechten (NIET NAGEKEKEN in deze ronde, algemeen bekend). | België bevrijd; in 1920 Eupen-Malmedy bij België. | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Armistice_of_11_November_1918 |
| 10/5/1940 | **Achttiendaagse Veldtocht**: Duitsland valt België aan; Eben-Emael valt op de eerste dag door een luchtlanding. | Snelle Duitse opmars. | https://www.britannica.com/event/Battle-of-France-World-War-II/The-Battle-of-Belgium-and-the-defense-of-the-Channel-ports-May-10-June-4-1940 |
| 28/5/1940 | **Capitulatie**: Het Belgische leger capituleert, tegen het advies van de regering in. | Bezetting; Eupen-Malmedy door Duitsland ingelijfd; collaboratie en verzet. | https://m.ww2db.com/country/belgium |
| 3/9/1944 | **ONZEKER** **Bevrijding van Brussel**: Geallieerde troepen bevrijden Brussel; Antwerpen volgt op 4 september (Antwerpen niet bevestigd in bron). | Grootste deel van België vrij. | https://m.ww2db.com/country/belgium |
| 16/12/1944 | **Ardennenoffensief**: Duits tegenoffensief in de Ardennen (tot 28 januari 1945). | Tijdelijk verlies van delen van Luxemburg (B) en Luik; Bastogne omsingeld (NIET NAGEKEKEN). | https://m.ww2db.com/country/belgium |

### Versterkingen

Fort van Loncin (Luik) (50.67, 5.5), Forten van Namen (50.46, 4.87), Antwerpen (51.22, 4.4), Eben-Emael (50.8, 5.68), Fort van Battice (50.65, 5.82), Maubeuge (Frans) (50.28, 3.97), IJzerfront Nieuwpoort (51.13, 2.75), Diksmuide (51.03, 2.86), Ieper (50.85, 2.88), Bastogne (50.0, 5.72), KW-linie (Koningshooikt-Waver) (51.0, 4.6)

### Namen en dynastieën

**Voornamen:** Albert, Leopold, Elisabeth, Astrid, Charles, Hubert, Paul-Henri, Achille, Camille, Adolphe, August, Gerard, Wilhelm, Hendrik, Marie-Jose  
**Dynastieën:** Saksen-Coburg (België), Hohenzollern (tot 1918), Windsor, Oranje-Nassau, Nassau-Weilburg (Luxemburg)


## 11. Na de oorlog (1945 - nu)

**Grens:** 8 mei 1945 tot nu.  
**Toestand bij de start:** 8 mei 1945  
**Bevolking bij de start:** ±8,3 miljoen (ruwe schatting, NIET NAGEKEKEN) (bron: https://wikiwand.com/en/Demographics_of_Belgium)

### Machten bij de start

| id | naam | soort | heerser | gebieden | zetel (lat, lon) | relaties | bron |
|---|---|---|---|---|---|---|---|
| `belgie` | België | staat | prins-regent Karel (1944-1950); koning Leopold III net bevrijd uit Duitse gevangenschap (NIET NAGEKEKEN) | West-Vlaanderen, Oost-Vlaanderen, Antwerpen, Vlaams-Brabant, Brussel, Waals-Brabant, Henegouwen, Namen, Luik, Limburg (B), Luxemburg (B) | Brussel (50.85, 4.35) | bond: nederland, luxemburg, frankrijk, grootbrittannie, verenigdestaten | https://en.wikipedia.org/wiki/Royal_question |
| `nederland` | Nederland | staat | Wilhelmina (1890-1948) | Zeeuws-Vlaanderen, Nederlands-Limburg | Den Haag (52.08, 4.31) | bond: belgie, luxemburg | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Wilhelmina_of_the_Netherlands |
| `luxemburg` | Groothertogdom Luxemburg | staat | Charlotte (1919-1964) | Groothertogdom Luxemburg | Luxemburg (49.61, 6.13) | bond: belgie, nederland | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Charlotte,_Grand_Duchess_of_Luxembourg |
| `frankrijk` | Frankrijk | rijk | Charles de Gaulle (voorlopige regering 1944-1946) | Frans-Vlaanderen, Artesië (Pas-de-Calais), Aisne, Franse Ardennen | Parijs (48.86, 2.35) | bond: belgie | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Provisional_Government_of_the_French_Republic |
| `grootbrittannie` | Verenigd Koninkrijk | rijk | George VI (1936-1952) | (buiten de kaart) | Londen (51.51, -0.13) | bond: belgie | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/George_VI |
| `verenigdestaten` | Verenigde Staten | rijk | president Harry Truman (1945-1953) | (buiten de kaart) | Washington (38.9, -77.04) | bond: belgie | NIET NAGEKEKEN in deze ronde (algemene kennis); te controleren via https://en.wikipedia.org/wiki/Harry_S._Truman |

### Gebeurtenissen

| datum | gebeurtenis | gevolg | bron |
|---|---|---|---|
| 12/3/1950 | **Volksraadpleging Koningskwestie**: 57,7% stemt voor de terugkeer van Leopold III, met grote verschillen tussen Vlaanderen en Wallonië. | Onlusten; Leopold draagt zijn macht over aan Boudewijn. | https://en.wikipedia.org/wiki/Royal_question |
| 16/7/1951 | **Troonsafstand Leopold III**: Leopold III doet afstand; Boudewijn legt op 17 juli de eed af. | Einde van de Koningskwestie. | https://www.ebsco.com/research-starters/history/belgiums-disgraced-king-leopold-iii-abdicates |
| 30/6/1960 | **ONZEKER** **Onafhankelijkheid van Congo**: Belgisch-Congo wordt onafhankelijk (dag NIET NAGEKEKEN in deze ronde, algemeen bekend). | Einde van de kolonie. | https://www.universalis.fr/encyclopedie/baudouin-ier-1930-1993-roi-des-belges-1951-1993/ |
| 8/11/1962 | **Vastlegging taalgrens**: Voeren gaat naar Limburg, Komen en Moeskroen naar Henegouwen. | Vaste taalgrens; provinciegrenzen aangepast. | https://www.dekamer.be/FLWB/pdf/digidoc/DPS/K2002/K20023871/K20023871.pdf |
| 1970 | **Eerste staatshervorming**: Cultuurgemeenschappen worden opgericht (dag NIET NAGEKEKEN). | Begin van de federalisering. | https://en.wikipedia.org/wiki/State_reform_in_Belgium |
| 1/1/1977 | **Fusie van gemeenten**: Het aantal gemeenten daalt van 2359 naar 596 (589 na Antwerpen in 1983). | Nieuwe gemeentegrenzen. | https://en.wikipedia.org/wiki/Fusion_of_the_Belgian_municipalities |
| 1980 | **Tweede staatshervorming**: Gewesten worden opgericht (dag NIET NAGEKEKEN; Brussels Gewest pas 1989). | Vlaams en Waals Gewest. | https://en.wikipedia.org/wiki/State_reform_in_Belgium |
| 1993 | **Federale staat**: Na de vierde staatshervorming (Sint-Michielsakkoord) wordt België een federale staat; Brabant wordt gesplitst (1995, NIET NAGEKEKEN). | Rechtstreeks verkozen deelparlementen; nieuwe provincies Vlaams- en Waals-Brabant. | https://en.wikipedia.org/wiki/State_reform_in_Belgium |
| 2001 | **Vijfde staatshervorming**: Lambermont- en Lombardakkoord. | Meer bevoegdheden en geld voor gewesten. | https://en.wikipedia.org/wiki/State_reform_in_Belgium |
| 2011 | **Zesde staatshervorming**: Splitsing van Brussel-Halle-Vilvoorde en meer bevoegdheden voor deelstaten (2011-2014). | Kieskring BHV gesplitst. | https://en.wikipedia.org/wiki/State_reform_in_Belgium |
| 1/1/2019 | **Vlaamse fusies 2019**: Vlaanderen gaat van 308 naar 300 gemeenten. | Nieuwe gemeenten in Vlaanderen. | https://www.vrt.be/vrtnws/nl/2018/09/14/explainer-fusiegemeenten/ |
| 1/1/2025 | **Vlaamse fusies 2025**: Vlaanderen gaat van 300 naar 285 gemeenten; in Wallonië fuseren Bastogne en Bertogne. | Nieuwe gemeenten; Belgisch totaal niet bevestigd. | https://www.vrt.be/vrtnws/nl/2024/12/27/vlaanderen-gemeentefusies/ |

### Versterkingen

SHAPE (Casteau) (50.5, 3.98), NAVO-hoofdkwartier (Evere) (50.88, 4.43), Luchtmachtbasis Kleine-Brogel (51.17, 5.47), Luchtmachtbasis Florennes (50.24, 4.65), Haven van Antwerpen (51.26, 4.4), Haven van Zeebrugge (51.33, 3.2)

### Namen en dynastieën

**Voornamen:** Boudewijn, Albert, Filip, Paola, Fabiola, Mathilde, Elisabeth, Gaston, Paul-Henri, Wilfried, Jean-Luc, Guy, Elio, Charles, Alexander, Bart  
**Dynastieën:** Saksen-Coburg (België), Oranje-Nassau, Nassau-Weilburg (Luxemburg)

