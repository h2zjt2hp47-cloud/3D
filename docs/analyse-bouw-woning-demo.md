# Analyse: van raamconfigurator naar woningconfigurator (bouwsector)

*1 november 2026, bijgewerkt dezelfde dag (tweede ronde). Vervolg op `docs/onderzoek-bouw-ramen-deuren.md`. Demo: `packages/bouw-web` → `dist/bouw-configurator.html`.*

## 1. De vraag

Jonas vroeg om de volgende zaken toe te voegen:
- meerdere ramen en deuren in één offerte (punt 4 van het vorige voorstel);
- ruimtes tekenen, indelen en deuren toevoegen;
- andere materialen en inrichting;
- draairichting van ramen;
- screens;
- een analyse van wat we nog kunnen toevoegen.

En: "ga maar helemaal los".

## 2. Wat er nu in de demo zit

De demo werkt in vier stappen, met de knoppen bovenaan: **Plattegrond → Configurator → Offerte → Werf**.

### Zoomen in de tekenvlakken
- **Zoomen:** muiswiel (rond de muisaanwijzer), knijpen met twee vingers of de knoppen − en +.
- **Verschuiven:** sleep op een leeg stuk (of houd de middelste muisknop ingedrukt).
- **"Passend"** toont alles; **"Selectie"** zoomt in op het gekozen raam, de gekozen ruimte of het gekozen meubel.
- **Raster:** bij inzoomen wordt het fijner (10 → 5 → 1 cm), zodat je op de centimeter tekent.
- **Leesbaarheid:** tekst, labels en lijnen blijven even groot op het scherm.
- Ook in de zetelontwerper (boven- en vooraanzicht).

### Projecten bewaren en hergebruiken (vierde ronde)
| Functie | Hoe het werkt |
|---|---|
| **Projecten** | Nieuwe knop "Projecten" bovenaan. Hier maak je een nieuw project: geef een naam en eventueel een klant, en kies waarmee je start (leeg, voorbeeldwoning of een eigen sjabloon). Je kunt een project ook openen, dupliceren of verwijderen. Elk nieuw project krijgt het volgende offertenummer. |
| **Automatisch bewaren** | Elke wijziging wordt meteen in de browser van het toestel bewaard. De kop toont de projectnaam en "automatisch bewaard om …". Is de opslag vol, dan meldt de kop dat. |
| **Bewaren als bestand** | "Bewaar als bestand" geeft een `.woning.json`-bestand om te archiveren, te mailen of op een ander toestel te openen ("Project openen uit bestand" maakt er een nieuw project van). |
| **Sjablonen** | "Bewaar als sjabloon" maakt van het huidige project een herbruikbaar startpunt, bv. een woningtype of een vaste set ramen. Klantgegevens, akkoord, meerwerk en inmetingen gaan er niet mee. |
| **Bibliotheek** | In de configurator: "Bewaar in bibliotheek" voor een standaardraam of -deur. In elk project voeg je het toe via Offerte → "Uit bibliotheek". |
| **Plattegrond wissen** | Wist alleen de plattegrond van het huidige project, na bevestiging en met ongedaan maken. De oude knoppen "Voorbeeldwoning" en "Leeg plan" overschreven het hele project; nu start je daarvoor een nieuw project. |

Beperking: alles staat in de browser van één toestel. Om kantoor en werf **tegelijk** met dezelfde gegevens te laten werken is een server nodig. Dat is ook de plaats waar de koppeling met Missing Link komt.

### Nieuw in de derde ronde (na het onderzoek naar LogiKal, ReynaPro en Chacal)
| Functie | Hoe het werkt |
|---|---|
| **Statische voordimensionering** | Stap "Statiek" per raam: winddruk, doorbuigingseis (L/300 of L/200), tussenstijl standaard, versterkt of koppelprofiel. De demo berekent het nodige traagheidsmoment (5 · q · L³ · k / 384 · E) en vergelijkt het met wat het profiel heeft. In 3D wordt een te slappe stijl rood. Winddruk voor alle ramen in te stellen vanuit de offerte. |
| **Afstandhouder** | Aluminium, rvs of warm edge (ψ 0,08 / 0,06 / 0,04): de Uw verandert mee; in 3D een rand rond het glas. |
| **Glasbestelling per ruit** | Dagmaat, falsmaat en glasmaat per ruit, met samenstelling en gewicht; voor de hele offerte te kopiëren of als CSV te downloaden. |

### Nieuw in de tweede ronde
| Functie | Hoe het werkt |
|---|---|
| **Verdiepingen** | Knoppen boven de plattegrond: Gelijkvloers, Verdieping 1 … en "+ Verdieping". Een nieuwe verdieping start als één ruimte boven de verdieping eronder; die deel je daarna in. De verdieping eronder staat er gestippeld onder (onderlegger), met het trapgat. |
| **Trap** | Meubel → Trappen. De trap verbindt de ruimte beneden met de ruimte erboven; de controle "niet bereikbaar" houdt daar rekening mee. In 3D loopt de trap tot de vloer erboven en zit er een gat in de vloerplaat. |
| **Wand tekenen** | Sleep een rechte wand door een of meer ruimtes: elke ruimte die de wand echt kruist, wordt in twee gedeeld (minstens 60 cm aan elke kant). |
| **Ruimte in ruimte** | Teken een ruimte binnen een bestaande ruimte (bv. een berging in de garage): het stuk wordt uit de grote ruimte gesneden, die zo een L- of U-vorm krijgt. Tussen de delen van één ruimte staat geen muur. Teken je over meerdere ruimtes, dan wordt het stuk uit elk ervan gesneden. |
| **Gevelaanzichten** | Tabblad "Gevels": de 4 gevels automatisch uit de plattegrond, met alle verdiepingen, dakranden, ramen en deuren **gezien van buiten** (symbolen gespiegeld), zonweringskasten, P-labels en **kettingmaten** (maten tussen de ramen) per verdieping, de totale breedte en de hoogtes. Ook in de offerte-afdruk. |
| **3D met verdiepingen** | Verdiepingen op elkaar, vloerplaten, plat dak op de delen zonder verdieping erboven. Optie "Alle verdiepingen" of alleen tot de gekozen verdieping. |
| **Valbeveiliging** | Alleen nog op een verdieping (het raam weet op welke verdieping het zit). |
| **Inmeting (Werf)** | Per raam of deur grote invoervelden voor tablet: 3 breedtes, 2 hoogtes, 2 diagonalen en de speling. De demo berekent:<br>• de bestelmaat (kleinste maat min de speling);<br>• het verschil met de offerte;<br>• of de opening haaks en recht is.<br>Je kunt ook een foto nemen (wordt verkleind) en een opmerking noteren. Met **"Bestelmaat overnemen"** gaat de maat naar de positie en naar de plattegrond. Er is ook een **lege werfbon** om op papier te meten. |
| **Akkoord en meerwerkbon** | In de offerte: "Klant gaat akkoord" legt de offerte vast. Daarna toont het tabblad Meerwerk automatisch alles wat veranderde: een andere maat na de inmeting, ander glas, een extra of vervallen raam, meer of minder m² vloer. Telkens zie je wat er precies veranderde en het bedrag. Je kunt vrije regels toevoegen (bv. 3 uur extra uitbraak). De klant **tekent op het scherm** (vinger of muis). De bon kun je afdrukken en daarna afsluiten, waarna een volgende bon start. |

### Plattegrond
| Functie | Hoe het werkt |
|---|---|
| Ruimtes tekenen | Sleep een rechthoek. Hij kleeft aan bestaande muren (marge 18 cm, raster 10 cm). |
| Muren | Die teken je niet zelf: elke rand van een ruimte is een muur. Grenst de rand aan een andere ruimte, dan wordt het een binnenmuur (10 cm), anders een buitenmuur (30 cm). Hoeken sluiten vanzelf. |
| Ruimtes indelen | Met het gereedschap "Indelen │" of "Indelen ─" klik je in een ruimte; die wordt in twee gedeeld met een nieuwe binnenmuur. |
| Wand verschuiven | Selecteer een ruimte en sleep een blauw bolletje. De buurruimte en de ramen of deuren in die wand schuiven mee. |
| Ruimte verplaatsen | Sleep de ruimte. Meubels erin en ramen op de randen gaan mee. |
| Ramen, buitendeuren, schuiframen | Klik op een buitenmuur. Er komt meteen een **positie in de offerte** bij, met een logische standaard:<br>• hal: voordeur;<br>• badkamer of wc: klein kipraam met mat glas;<br>• keuken: hoger raam boven het aanrecht;<br>• droge ruimte: met ventilatierooster. |
| Binnendeuren en doorgangen | Klik op een binnenmuur. Kies de deur: schilderdeur, eik, glas, staal of schuifdeur in de wand. |
| Draairichting | **Deuren:** de deurboog in de plattegrond; met knoppen wissel je de scharnierkant of laat je de deur naar de andere kant opendraaien.<br>**Ramen:** per vak gestippelde bogen naar binnen. |
| Meubels en inrichting | 23 meubels in 7 groepen: zitten, eten, keuken, slapen, badkamer, werken, decoratie. Je kunt ze slepen, draaien (Q), een andere maat en kleur geven en verwijderen. |
| Afwerking per ruimte | Vloer (tegel, parket, pvc, gietvloer, tapijt) en wanden (6 verfkleuren, wandtegels). |
| Woning | Muurhoogte, dikte van de muren en gevel (rode of grijze steen, crepi, hout). |
| Controles | • overlappende ruimtes;<br>• raam in een binnenmuur of deur in een buitenmuur;<br>• opening tegen een hoek;<br>• opening te hoog voor de muur;<br>• openingen over elkaar;<br>• **niet bereikbare ruimtes** (vanaf de voordeur via deuren en doorgangen);<br>• geen voordeur;<br>• **daglicht** (geen raam, of minder glas dan 1/10 van de vloer);<br>• badkamer of wc zonder raam (afzuiging nodig);<br>• fouten in de gekoppelde ramen. |
| Overzicht | Netto en bruto oppervlakte per ruimte (netto = rekening houdend met de muurdikte), wandoppervlakte en glasoppervlakte. |
| 3D | Hele woning met baksteen buiten en de gekozen verf of tegels binnen, vloeren met tegel- of parketpatroon, ramen en deuren met de juiste kleur, verdeling en zonwering, binnendeuren open, meubels.<br>Zichten: schuin, voorgevel, achtergevel, zij en boven.<br>Met **"Muren laag"** kijk je binnen in de woning. |
| Ongedaan maken | Ctrl+Z of de knop. Alles wordt in de browser bewaard. |

### Configurator per positie (raam, terrasdeur, voordeur, schuifraam of aanbouw)
| Onderdeel | Inhoud |
|---|---|
| Soort | raam, terrasdeur, voordeur, schuifraam of schuifdeur (plus de aanbouw uit de vorige stap) |
| Indeling en draairichting | 1 tot 3 vakken. Per vak kies je: vast, draaiend (scharnieren links of rechts), draai-kip links of rechts, of kip. Verder:<br>• bovenlicht (vast of kip);<br>• roeden;<br>• bij een voordeur: scharnierkant en naar binnen of buiten draaiend;<br>• bij een schuifraam: welke vleugel schuift. |
| Tekening | Zicht van binnen met de **openingssymbolen**:<br>• de punt van de driehoek wijst naar de scharnieren;<br>• kip wordt gestippeld getekend;<br>• schuiven toont een pijl. |
| Profiel en kleur | PVC, aluminium, aluminium hoog geïsoleerd, hout of hout-aluminium. Kleur binnen en buiten apart (bicolor). |
| Glas | dubbel, driedubbel, gelaagd, mat, zonwerend |
| Voordeur | paneel (vlak, glasstrook of groeven) en greep (klink, trekbeugel of **vingerscan**) |
| Zonwering | **screen (zip)** met doekkleur, **rolluik** of buitenjaloezie. Bediening: manueel, motor, of motor met app en zonnesensor. |
| Opties | vliegenraam (inzethor of plissé), **ventilatierooster**, inbraakwerend beslag (RC2), vensterbank binnen, dorpel buiten, drempelloos |
| Plaatsing | nieuwbouw of renovatie (uitbraak en dagkanten), montage |
| Controles | • maat per vak binnen de grens van het beslag;<br>• gewicht van de vleugel;<br>• veiligheidsglas;<br>• valbeveiliging;<br>• Uw (EPB);<br>• ventilatie in droge ruimtes;<br>• privacy in badkamer en wc;<br>• RC2 vraagt gelaagd glas. |
| 3D | Raam in een stukje gevel, binnen en buiten te bekijken. Het screendoek hangt half neer. |
| Koppeling met de plattegrond | Maten, ruimte en draairichting blijven **in beide richtingen gelijk**. Pas je in de plattegrond de breedte aan, dan past de positie zich aan, en omgekeerd. |

### Offerte
- Alle posities met een kleine tekening, aantal, stukprijs, status, en knoppen om te bewerken, dupliceren of in de plattegrond te tonen.
- Er kunnen ook posities bij die niet in de plattegrond staan (raam, deur, schuifraam, aanbouw).
- **Regels uit de plattegrond** (aan of uit te zetten):
  - vloeren per materiaal (met 7 % snijverlies);
  - wandafwerking per kleur of tegel;
  - binnendeuren en doorgangen;
  - ruwbouw van de muren;
  - inrichting (richtprijs).
- Btw 6 % of 21 % voor de hele offerte. Particulier of aannemer, met korting.
- Totaal, plus een intern deel:
  - kostprijs en marge;
  - voorschot 30 %;
  - levertermijn (de langste);
  - **plaatsingsduur** in uren en dagen met 2 plaatsers.
- Alle controles samen. Klik op een melding en je springt naar de positie.
- **Bestellijst per leverancier**: profielen, glas, zonwering en horren, beslag, natuursteen, deurpanelen, eigen uren.
- **Afdrukken of PDF**:
  - kop met klant en project;
  - plattegrond;
  - per positie de tekening, details en wat niet inbegrepen is;
  - afwerking en totalen;
  - voorwaarden;
  - handtekeningvakken.
- **Export voor het ERP (JSON)**:
  - per regel de configuratie (model, versie en keuzes) en de stuklijst;
  - dat is de basis voor de koppeling met Missing Link.

## 3. Wat we nog kunnen toevoegen

Telkens met het nut voor de klant en een ruwe inschatting van het werk: **S** = enkele dagen, **M** = één à twee weken, **L** = meer.

### A. Plattegrond en woning
| Idee | Nut | Werk |
|---|---|---|
| ~~Verdiepingen (meerdere niveaus en een trap)~~ | **Gedaan** (ronde 2) | – |
| ~~L-vormige ruimtes~~ | **Gedaan** via "ruimte in ruimte" (samengestelde ruimtes) | – |
| Schuine muren en ronde vormen | Nu alleen rechte hoeken | M–L |
| ~~Kettingmaten langs elke gevel~~ en ~~gevelaanzichten~~ | **Gedaan** (ronde 2) | – |
| Kettingmaten ook in de plattegrond (binnenmaten per ruimte, maten tussen ramen) | Uitvoeringsplan | S |
| Trap met kwartdraai of spiltrap | Nu alleen een rechte trap | S |
| Plan als onderlegger (foto of PDF van de architect) en daarop natekenen | Sneller dan opnieuw tekenen | M |
| Dak: plat, zadeldak of lessenaarsdak, met dakramen | Nu alleen muren | M |
| Buitenaanleg: terras, oprit, tuin | Mooier beeld; tegels per m² | S |

### B. Ramen, deuren en zonwering
| Idee | Nut | Werk |
|---|---|---|
| Combinaties: zijlicht naast een deur, onderpaneel, stolp zonder middenstijl, hef-schuif 4-delig | Komt veel voor | S–M |
| Screen op de plattegrond als lijn met bedieningskant; screens in de 3D op en neer zetten | Verkoopargument | S |
| Echte systeemdata per leverancier (maximale maten, gewichten, Uf, prijzen): Reynaers, Schüco, Aluprof, Deceuninck … | Nu zijn het voorbeeldwaarden | M per leverancier |
| **Zaaglijst per staaf** en **glasbestelling per ruit** (met etiketten) | Rechtstreeks naar productie of leverancier | M |
| ~~Inmeetmodule op tablet~~ | **Gedaan** (ronde 2): metingen, foto, bestelmaat overnemen. Nog toe te voegen: schets op de foto, synchroniseren tussen toestellen (vraagt een server) | S–M |
| Laserafstandsmeter via Bluetooth (bv. Leica Disto) | Maten zonder overtypen | M |

### C. Inrichting en afwerking
| Idee | Nut | Werk |
|---|---|---|
| **Keukenconfigurator** (kasten van 30 tot 90 cm, kolommen, toestellen, werkblad op maat) | Grote omzet, sterke visuele verkoop | L |
| Badkamer: tegelplan per wand, legpatroon en snijverlies per tegelformaat | Correcte hoeveelheden | M |
| Verflijst per ruimte en wand, plafonds | Schilders | S |
| **Elektriciteit**: stopcontacten, schakelaars en lichtpunten met de symbolen van het AREI-schema | Vaste vraag van elektriciens | M |
| Verwarming en ventilatie: vloerverwarming per m², radiatoren, kanalen voor systeem D | Installateurs | M |
| Meubelcatalogus van de klant (eigen modellen, prijzen, kleuren) en dezelfde koppeling als bij de zetels | Interieurzaken | S–M |

### D. Proces en verkoop
| Idee | Nut | Werk |
|---|---|---|
| Offerteversies (v1, v2 …) en verschillen tonen | Deels gedaan: het akkoord is een vaste versie en het meerwerk toont de verschillen | S |
| ~~Meerwerkbon~~ | **Gedaan** (ronde 2), met handtekening op het scherm | – |
| Handtekening ook op de offerte zelf, voorschotfactuur | Sneller akkoord | S–M |
| Klantportaal: de klant kiest zelf kleur, glas en screen binnen de grenzen die de verkoper zet | Minder heen-en-weer | M |
| Planning: plaatsingsdagen in de agenda, levertermijnen per leverancier | Planning (pijnpunt 9) | M |
| **Koppeling met Missing Link**: offerte, order, bestelbon per leverancier, planning, factuur | De kern van het verhaal | L |

### E. Techniek en regelgeving (Vlaanderen/België)
| Idee | Nut | Werk |
|---|---|---|
| EPB: U-waarden per raam exporteren voor de EPB-software | De verslaggever hoeft niets over te typen | M |
| Daglicht en ventilatie volgens de officiële regels (in plaats van richtwaarden) | Juridisch sterker | M (eerst de regels uitzoeken) |
| BIM/IFC-export | Architecten | L |
| AR: raam via de smartphone op de echte gevel tonen | Wow-effect bij de klant | L |

**Voorstel voor de volgende stap (na ronde 2):**
1. **Koppeling met Missing Link**: offerte, akkoord, meerwerk als aparte order, bestelbon per leverancier.
2. Een server, zodat werf (tablet) en kantoor dezelfde gegevens zien.
3. Echte systeemdata van één leverancier, om de controles en prijzen te ijken.
4. Keukenconfigurator of elektriciteitsplan, afhankelijk van de eerste klant.

## 4. Te verifiëren (niet blind gebruiken)

- **Daglicht ≥ 1/10 van de vloer:** dit is een richtwaarde. De echte normen (Vlaamse Wooncode, gemeentelijke stedenbouwkundige verordening) moeten nagekeken worden.
- **Veiligheidsglas onder 85 cm** en in deuren: afgeleid van NBN S 23-002, te bevestigen in de norm.
- **Ventilatierooster in droge ruimtes** (systeem C): EPB-ventilatie-eisen nakijken, ook de debieten.
- **Valbeveiliging bij een lage borstwering:** de demo waarschuwt alleen op een verdieping, bij een borstwering lager dan 85 cm of bij een deur. De juiste hoogtes en regels moeten nog nagekeken worden.
- **Maximale maten en gewichten per beslag:** voorbeeldwaarden.
- **Btw 6 %:** voorwaarden bij FOD Financiën.

## 5. Bekende beperkingen van de demo

- Ruimtes zijn rechthoeken of samenstellingen van rechthoeken (L, U); geen schuine muren.
- Een getekende wand deelt altijd de hele ruimte; een losse muur die halverwege stopt, kan nog niet.
- Alleen platte daken en rechte trappen.
- De inmeting en de handtekening worden alleen in de browser van het toestel bewaard.
- Buitendeuren staan in 3D dicht; binnendeuren tonen we open (90°).
- De 3D is schematisch (blokken), geen fotorealistische weergave.
- Alle prijzen, gewichten en U-waarden zijn **verzonnen**.
- De offerte bewaart alleen in de browser (geen server, geen gebruikers).
