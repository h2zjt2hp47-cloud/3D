# Analyse: van raamconfigurator naar woningconfigurator (bouwsector)

*1 november 2026. Vervolg op `docs/onderzoek-bouw-ramen-deuren.md`. Demo: `packages/bouw-web` → `dist/bouw-configurator.html`.*

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

De demo werkt in drie stappen, met de knoppen bovenaan: **Plattegrond → Configurator → Offerte**.

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
| Verdiepingen (meerdere niveaus en een trap) | De meeste woningen hebben een verdieping; de valbeveiliging wordt dan echt nuttig | M |
| L-vormige en schuine ruimtes | Nu kan alleen een rechthoek; een L kan je wel maken met twee ruimtes en een doorgang | M |
| Kettingmaten langs elke gevel (maten tussen de ramen) | Plaatsers en architecten werken zo | S |
| **Gevelaanzichten** (4 gevels automatisch, met de ramen erin) | Klanten beslissen op het zicht van de gevel | S–M |
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
| Inmeetmodule op tablet per positie (3 breedtes, 2 hoogtes, foto, schets), terug in dezelfde configuratie | Minder meetfouten (pijnpunt 3 uit het onderzoek) | M |
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
| Offerteversies (v1, v2 …) en verschillen tonen | "Wat is er veranderd?" | S |
| **Meerwerkbon**: wijziging na akkoord als aparte regel, ondertekend | Minder discussie (pijnpunt 7) | S |
| Digitale handtekening en voorschotfactuur | Sneller akkoord | M |
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

**Voorstel voor de volgende stap:**
1. Gevelaanzichten en kettingmaten (snel, groot effect).
2. Inmeetmodule en meerwerkbon (lost echte pijnpunten op).
3. Verdiepingen.
4. Koppeling met Missing Link.

## 4. Te verifiëren (niet blind gebruiken)

- **Daglicht ≥ 1/10 van de vloer:** dit is een richtwaarde. De echte normen (Vlaamse Wooncode, gemeentelijke stedenbouwkundige verordening) moeten nagekeken worden.
- **Veiligheidsglas onder 85 cm** en in deuren: afgeleid van NBN S 23-002, te bevestigen in de norm.
- **Ventilatierooster in droge ruimtes** (systeem C): EPB-ventilatie-eisen nakijken, ook de debieten.
- **Valbeveiliging bij een lage borstwering:** geldt op de verdieping. De demo kent nog geen verdiepingen en geeft dus altijd een waarschuwing.
- **Maximale maten en gewichten per beslag:** voorbeeldwaarden.
- **Btw 6 %:** voorwaarden bij FOD Financiën.

## 5. Bekende beperkingen van de demo

- Alleen rechthoekige ruimtes en één verdieping.
- Buitendeuren staan in 3D dicht; binnendeuren tonen we open (90°).
- De 3D is schematisch (blokken), geen fotorealistische weergave.
- Alle prijzen, gewichten en U-waarden zijn **verzonnen**.
- De offerte bewaart alleen in de browser (geen server, geen gebruikers).
