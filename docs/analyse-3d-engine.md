# Analyse: één 3D-engine voor games én voor Missing Link

*Stand 6/11/2026.* Vraag van Jonas: *"Graag een analyse voor een 3D-engine die kan gebruikt worden voor games maar ook
voor zaken binnen Missing Link."*

Labels zoals in de andere analyses: **[repo]** = vastgesteld in deze code, **[Missing Link]** = vastgesteld via de API
van Missing Link (6/11), **[inschatting]** = mijn inschatting, na te kijken.

---

## 1. Kort antwoord

1. **Geen eigen engine van nul bouwen.** Een engine die tekent, licht berekent, botsingen narekent en geluid afspeelt is
   jaren werk voor een team. Dat werk bestaat al gratis (three.js, Rapier). **[inschatting]**
2. **Wel een eigen 3D-laag bovenop three.js**, in lagen opgebouwd: een gemeenschappelijke kern (tekenen, licht,
   materialen, camera, aanklikken), daarbovenop **zakelijke onderdelen** voor Missing Link en **spelonderdelen** voor
   games. Wie alleen de zakelijke kant nodig heeft, laadt de spelonderdelen niet.
3. **Een groot deel van die kern hebben we al** **[repo]**:
   - de 3D-weergave van de zeteldemo (`demo-web/src/drie-d.ts`, ±2.300 lijnen);
   - de decors, de lichtsferen en de fotomodus;
   - de omschakeling tussen WebGPU en WebGL2;
   - de beeldvergelijking (`npm run beelden`);
   - de scène als gegevens (`Scene3D` in `core/src/ruimtelijk.ts`).

   De bouwdemo leent die weergave nu al via een omweg (`import … from '../../demo-web/src/drie-d.js'`). Dat is het
   eerste teken dat ze een eigen pakket moet worden.
4. **Voorgestelde eerste stap:** de 3D-weergave losmaken tot een eigen pakket, zonder zichtbare wijziging (± 2 à 3
   weken **[inschatting]**). Daarna één proef binnen Missing Link (machine in 3D of werf in 3D) en één klein proefspel
   dat gegevens uit Missing Link gebruikt (*laad de bestelwagen*, zie §9). Zo test je de twee doelen tegelijk.
5. **Eerst te beslissen:** wat "games" precies moet zijn (§5). Voor spellen in de browser en spelelementen in Missing
   Link volstaat deze aanpak. Voor "echte" games (Steam, console, grote werelden) is een andere engine nodig, zoals
   Godot of Unity. Dan deel je wel de 3D-bestanden en de gegevens, maar niet de code.

---

## 2. Wat is een 3D-engine?

In gewone taal: alles wat nodig is om een 3D-wereld op het scherm te tonen en ermee te werken.

| Onderdeel | Wat het doet | Hebben we het al? |
|---|---|---|
| **Tekenen** (renderer) | Driehoeken, licht en schaduw omzetten in pixels, via de grafische kaart | Ja: three.js 0.187, WebGPU met WebGL2 als terugval **[repo]** |
| **Scène** | Wat er staat, waar, en hoe het samenhangt | Ja, als gegevens: `Scene3D` met blokken **[repo]** |
| **Materialen** | Hoe iets eruitziet: stof, hout, glas, metaal, baksteen | Ja: stoffen met weefsel, glas, gevelmaterialen **[repo]** |
| **Licht en omgeving** | Zon, lampen, reflecties, schaduw in de hoeken | Ja: 6 lichtsferen, HDRI, GTAO, fotomodus **[repo]** |
| **Camera** | Draaien, zoomen, vaste standpunten | Ja: standpunten, toetsenbord, groot scherm **[repo]** |
| **Aanklikken** | Weten waarop de gebruiker klikt | Ja: klikken op een deel kiest het element **[repo]** |
| **Bestanden laden** | 3D-modellen van buiten (glTF/GLB) | Ja, als proef: `echt3d.ts` **[repo]** |
| **Spellus** | Een vast ritme (bv. 60 keer per seconde): invoer lezen, wereld bijwerken, tekenen | Nee. De weergave tekent nu alleen als er iets verandert |
| **Invoer** | Toetsenbord, muis, aanraking, gamepad | Deels: muis, aanraking, toetsenbord; geen gamepad |
| **Physics** | Zwaartekracht, botsen, stapelen, duwen | Nee |
| **Animatie** | Bewegende onderdelen, personages | Nee (alleen camera-overgangen) |
| **Geluid** | Geluiden in de ruimte | Nee |
| **Editor** | Een scherm om werelden of producten samen te stellen zonder code | Deels: de ontwerper, de plattegrond en de gevel-editor zijn al kleine editors **[repo]** |
| **Netwerk** | Met meerdere spelers of gebruikers tegelijk | Nee |

**Conclusie:** de kern van een engine (tekenen, materialen, licht, camera, aanklikken, laden) staat er. Wat ontbreekt,
is wat vooral games vragen: spellus, physics, animatie, geluid en netwerk.

---

## 3. Wat vraagt een game, wat vraagt Missing Link?

| Eis | Game | Missing Link (zakelijk) | Gevolg voor de engine |
|---|---|---|---|
| **Beelden per seconde** | 60, de hele tijd | Alleen tekenen als er iets verandert (spaart de batterij van een tablet op de werf) | Twee standen in de lus: *altijd* en *bij wijziging* |
| **Nauwkeurigheid** | "Ziet er goed uit" | Op de mm, en gelijk aan prijs, offerte en tekening | Maten komen uit de motor (`core`), nooit uit de 3D |
| **Inhoud** | Met de hand gemaakt (levels, personages) | Opgebouwd uit maten en keuzes, of het bestand van de fabrikant | Beide wegen: procedureel uit gegevens én bestanden laden |
| **Gegevens** | Spelvoortgang, score | Artikels, machines, projecten, statussen, rechten | De engine kent Missing Link niet; een koppeling geeft de gegevens door |
| **Toestellen** | Computer of console met goede grafische kaart | Tablet in de toonzaal of op de werf, laptop op kantoor | Kwaliteitstrappen (*Snel* / *Mooi*) blijven nodig |
| **Laadtijd** | Mag een halve minuut | Enkele seconden, het zit in een ERP-scherm | Klein houden, spelonderdelen apart laden |
| **Beeld voor papier** | Niet nodig | Foto voor de offerte, tekening, PDF | `beeld()` en `foto()` bestaan al **[repo]** |
| **Offline** | Soms | Werf zonder netwerk | Alles in de bundel, niets van internet (zoals nu) **[repo]** |
| **Physics** | Vaak | Zelden (laadplan, stapelen, botsingscontrole) | Optioneel onderdeel |
| **Geluid, animatie** | Altijd | Zelden (machine die opengaat, deur die draait) | Optioneel onderdeel |
| **Meerdere gebruikers** | Bij multiplayer | Samen naar een ontwerp kijken (later) | Pas als er vraag is |

**Wat ze delen is groot:** tekenen, materialen, licht, camera, aanklikken, bestanden laden en beelden nemen.
**Wat verschilt,** is vooral het ritme (de lus) en het soort inhoud. Daarom een opbouw in lagen (§7).

---

## 4. Toepassingen binnen Missing Link

Missing Link heeft onder meer de onderdelen Projecten (met werfadres), Planning, Offertes, Orders, Leveringsbonnen,
Werkbonnen, Bestellingen, Artikels, Samengestelde artikels, Machines en Voorraad (per stuk) **[Missing Link]**.
Niet alles wordt beter in 3D. Een planning of een voorraadlijst is in 2D vaak duidelijker. Hieronder wat wel waarde
heeft, in volgorde van voorrang **[inschatting]**.

| # | Onderdeel Missing Link | Toepassing in 3D | Waarde | Wat er nodig is | Moeilijkheid |
|---|---|---|---|---|---|
| 1 | **Offertes** | De configurator (bestaat): 3D-beeld van het product bij de offerteregel | Hoog: verkoopt, minder misverstanden | Bestaat; beeld naar `beeld_id` van de offerteregel **[Missing Link]** | Klaar als proef |
| 2 | **Machines** + **Samengestelde artikels** | Machine in 3D: klik op een onderdeel → artikel, voorraad, laatste werkbon. Opengewerkte weergave (onderdelen uit elkaar). | Hoog voor machinebouw en onderhoud | 3D-bestand per machinetype (uit CAD, zie §8.3), koppeling onderdeel ↔ artikel | Middel |
| 3 | **Projecten** (werf) | De woning of het project in 3D, gekleurd per status: besteld, geleverd, geplaatst, probleem | Hoog voor bouw, ramen en deuren | Status per positie uit orders, leveringsbonnen en werkbonnen; de bouwdemo heeft al woning-3D en werf **[repo]** | Middel |
| 4 | **Werkbonnen** | De technieker duidt in 3D aan *waar* het probleem zit (een speld op het model), met foto | Middel: duidelijkere meldingen naar binnendienst en helpdesk | Punt op het model bewaren bij de werkbon | Laag tot middel |
| 5 | **Leveringsbonnen** | Laadplan: hoe gaat de levering in de bestelwagen of op de aanhangwagen (stapelen, gewicht, volgorde van lossen) | Middel | Maten en gewicht per artikel, physics light | Middel (hier raakt het aan games) |
| 6 | **Opleiding** | Oefenomgeving als spel: een nieuwe gebruiker maakt in een veilige proefomgeving een project, offerte en werkbon | Middel, sluit aan bij de opleidingen die Jonas geeft | Spelelementen (opdrachten, punten), geen echte gegevens | Middel |
| 7 | **Voorraad** | Magazijn in 3D: rekken en locaties, "waar ligt dit?" | Laag tot middel: een 2D-plan volstaat vaak | Locaties per artikel, plan van het magazijn | Middel |
| 8 | **Planning** | Atelier in 3D met machines, gekleurd per bezetting | Laag: de planning zelf blijft beter in 2D | Machines en jobs uit de planning | Middel |

**Voor de klant van de klant** (website, toonzaal) blijft de configurator de toepassing met de meeste waarde. De
gevel-editor werkt al als de bouwmodus van een bouwspel **[repo]**: spelelementen maken het ontwerpen leuk, zonder dat
het een spel hoeft te zijn.

---

## 5. Wat kan "games" betekenen?

Dit bepaalt de keuze het meest. Drie smaken:

| Smaak | Voorbeeld | Past bij deze aanpak? |
|---|---|---|
| **A. Spelelementen in Missing Link** (gamification) | Ontwerpen als in een bouwspel, opdrachten tijdens de opleiding, een badge bij de eerste offerte | Ja, volledig. Dezelfde engine. |
| **B. Kleine spellen in de browser of op een tablet** | *Richt je kamer in*, *bouw je veranda*, *laad de bestelwagen*; als marketing voor een klant of als apart product | Ja. Met spellus, physics, invoer en geluid erbij (§7, laag 3b). |
| **C. "Echte" games** | Een spel voor Steam of een console, grote open werelden, personages, online met veel spelers | Nee. Daarvoor is een volledige game-engine met editor nodig (Godot, Unity, Unreal). Wat je wel deelt: de 3D-bestanden (glTF), de stoffen als afbeeldingen, en de gegevens via de API. |

**Mijn advies:** begin met A en B. Die versterken Missing Link en de configurator. C is een ander vak, met een ander
team en een andere markt. Kies dat alleen als er een concreet spel en een budget is.

---

## 6. De mogelijke keuzes vergeleken

| Optie | Wat het is | Licentie | Sterk | Zwak |
|---|---|---|---|---|
| **1. Eigen engine van nul** | Zelf rechtstreeks op WebGPU tekenen | Eigen | Volledige controle | Jaren werk; alles wat three.js al kan, opnieuw maken. **Afgeraden.** |
| **2. three.js + eigen lagen** (nu) | Tekenbibliotheek; de engine bouwen we er in lagen omheen | MIT | Al ons werk hergebruikt (zachte vormen, TSL, fotomodus, beeldtest); klein; past in een ERP-scherm; grootste gemeenschap op het web | Spelonderdelen moeten we zelf samenstellen (wel met bestaande bibliotheken) |
| **3. Babylon.js** | Volledige web-engine (physics met Havok, GUI, inspector, editor) | Apache-2.0 (Havok-plugin MIT) **[inschatting, nakijken]** | Meer ingebouwd voor games; goed onderhouden (Microsoft) | Overstap: de hele weergave en de proeven opnieuw; groter |
| **4. PlayCanvas** | Web-engine met een online editor | Engine MIT; editor is een betalende clouddienst **[inschatting]** | Snel samenwerken in de editor; licht | Editor in de cloud (afhankelijkheid); overstap |
| **5. Godot 4** | Volledige game-engine met editor | MIT | Gratis, sterke editor, ook voor computer en mobiel | De webversie is zwaar (lange laadtijd) en past slecht in een ERP-scherm; C# niet op het web **[inschatting, nakijken]** |
| **6. Unity / Unreal** | De grote game-engines | Commercieel, met voorwaarden die al wijzigden **[inschatting]** | Beste voor "echte" games (smaak C) | Webversie groot (Unity) of niet meer aanwezig (Unreal); licentie en afhankelijkheid; niet in te bouwen in Missing Link |

**Beoordeling** (++ = zeer goed, − = slecht) **[inschatting]**:

| Criterium | 1. Eigen | 2. three.js + lagen | 3. Babylon | 4. PlayCanvas | 5. Godot | 6. Unity/Unreal |
|---|---|---|---|---|---|---|
| Inbouwen in Missing Link (webscherm) | + | ++ | + | + | − | − |
| Bestaand werk hergebruiken | − | ++ | − | − | − | − |
| Smaak A en B (spelelementen, kleine spellen) | − | + | ++ | + | + | + |
| Smaak C ("echte" games) | − | − | 0 | 0 | ++ | ++ |
| Licentie en afhankelijkheid | ++ | ++ | ++ | + | ++ | − |
| Laadtijd en grootte | + | ++ | + | + | − | − |
| Onderhoud door een kleine ploeg (met AI) | − | ++ | + | + | + | 0 |

**Aanbeveling: optie 2.** Babylon.js is het reserveplan als games later zwaarder doorwegen dan Missing Link. Godot is
de keuze voor smaak C, als apart spoor.

---

## 7. Voorstel: de engine in lagen

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │ Laag 4  Koppelingen        Missing Link (API) · los (eigen opslag) · website │
 ├───────────────────────────────────────┬──────────────────────────────────────┤
 │ Laag 3a Zakelijk                      │ Laag 3b Spel (apart te laden)        │
 │ status-kleuren · labels · speld       │ spellus · invoer en gamepad          │
 │ opengewerkt · doorsnede · meten       │ physics (Rapier) · geluid            │
 │ tekening en foto voor de offerte      │ animatie · spelregels · voortgang    │
 ├───────────────────────────────────────┴──────────────────────────────────────┤
 │ Laag 2  Interactie         camera · aanklikken · slepen · raster · ongedaan  │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │ Laag 1  Weergave           WebGPU/WebGL2 · licht · materialen · decor        │
 │                            fotomodus · beeld() · kwaliteit Snel/Mooi         │
 ├──────────────────────────────────────────────────────────────────────────────┤
 │ Laag 0  Scène als gegevens (geen three.js): objecten, maten, materialen,      │
 │         sleutel naar Missing Link, status, gedrag                            │
 └──────────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Spelregels voor de opbouw

1. **De engine weet niets van Missing Link**, net zoals de motor (`core`) nu. Een koppeling geeft de gegevens door.
   Zo kan de engine ook los verkocht worden of in een spel zitten.
2. **De scène is gegevens** (laag 0), zoals `Scene3D` nu. Dat heeft vier voordelen:
   - testbaar zonder scherm (de 249 tests van vandaag werken zo **[repo]**);
   - te bewaren in Missing Link als JSON;
   - op meer manieren te tonen: 3D, bovenaanzicht, offertetekening;
   - wisselen van tekenbibliotheek blijft mogelijk.
3. **Alleen open formaten:** glTF/GLB voor 3D-bestanden, PNG/JPG voor texturen, HDR voor de omgeving.
4. **Spelonderdelen apart laden.** Wie in Missing Link een machine bekijkt, laadt geen physics of geluid.
5. **Alles in de bundel, niets van internet** (zoals nu): werkt offline en op de werf.
6. **Alleen licenties zoals MIT, Apache of BSD in de bundel**, geen GPL. Hulpmiddelen buiten de app mogen wel
   (DeepBump, zie `docs/3d-technieken.md`).
7. **Elke laag krijgt tests, de weergave een beeldvergelijking** (`npm run beelden`).

### 7.2 Laag 0: de scène uitbreiden

Nu kent een `Blok` vorm, maten, materiaal en een `code` **[repo]**. Voor Missing Link en games komt erbij **[voorstel]**:

| Veld | Waarvoor | Voorbeeld |
|---|---|---|
| `sleutel` | Verwijzing naar Missing Link (de engine kijkt er niet in) | `{ soort: 'artikel', id: '…' }`, `{ soort: 'positie', id: 'P3' }` |
| `status` | Kleur of markering per status | `geplaatst`, `besteld`, `probleem` |
| `label` | Tekst of speld in de 3D | "Lager vervangen 12/10" |
| `bestand` | Een echt 3D-bestand (GLB) in plaats van blokken | kruk, machine, personage |
| `groep` | Onderdelen die samen bewegen of uit elkaar gaan | de deur van een kast, een module van een machine |
| `gedrag` (spel) | Wat het object doet in een spel | `vast`, `beweegbaar`, `oppakbaar`, met gewicht in kg |

### 7.3 Wat er al is en waar het naartoe gaat

| Nu **[repo]** | Wordt |
|---|---|
| `core/src/ruimtelijk.ts` (`Blok`, `Scene3D`) | Laag 0, uitgebreid zoals in §7.2 |
| `demo-web/src/drie-d.ts` (`maak3D`, `Viewer3D`) | Laag 1, als eigen pakket (voorstel: `packages/ruimte`) |
| `demo-web/src/decor3d.ts`, `fotomodus-webgpu.ts`, `weefsel.ts` | Laag 1 |
| Klikken, standpunten, `markeer()`, `zoom.ts` | Laag 2 |
| `core/src/echt3d.ts` (GLB-proef) | Laag 1 (laden) en laag 0 (`bestand`) |
| Ontwerper, plattegrond, gevel-editor | Gebruiken laag 2 (slepen, raster, ongedaan maken) |
| Beeldvergelijking `scripts/beeldvergelijking.mjs` | Blijft, met een paar beelden van elke laag erbij |

---

## 8. De koppeling met Missing Link

### 8.1 Gegevens lezen en schrijven

- **Lezen:** artikels, samengestelde artikels, machines, projecten, orders, leveringsbonnen, werkbonnen en voorraad via
  de API **[Missing Link]**. De koppeling zet ze om naar laag 0 (bv. werkbonstatus → `status` per positie).
- **Schrijven:** alleen via de API, met **etag/If-Match** (geen wijziging van iemand anders overschrijven) en een
  **idempotency key** (geen dubbele documenten bij opnieuw klikken) **[Missing Link]**, zoals al beslist voor de
  configurator (`docs/configurator-analyse-en-stappenplan.md` §7.3).
- **Klikken in 3D** opent de fiche in Missing Link (artikel, machine, werkbon) via een link.

### 8.2 Wat Missing Link erbij zou moeten krijgen **[voorstel, te bespreken met de ontwikkelaar]**

| Wat | Waar | Waarom |
|---|---|---|
| 3D-bestand (GLB) per artikel of machinetype | Artikel, machine | Machine in 3D, beslag van een raam |
| Koppeling onderdeel in het bestand ↔ artikel | Samengesteld artikel | Klik op een onderdeel → artikel en voorraad |
| Scène als JSON bij een configuratie | Tabel `configuratie` (voorstel §7.4 van de analyse) | Een ontwerp later opnieuw openen |
| Beeld uit de 3D | Offerteregel `beeld_id` (bestaat **[Missing Link]**), bijlage bij project of werkbon | Offerte, werfdossier |
| Punt op het model | Werkbon | "Hier zit het probleem" |

De velden op offerteregels zijn afgeleid uit hun namen. Ze moeten nog bevestigd worden door de ontwikkelaar van Missing
Link (actiepunt 0.3).

### 8.3 Waar komen de 3D-bestanden vandaan?

- **Machinebouw:** de klant heeft CAD (SolidWorks, Inventor …) en kan STEP-bestanden geven. Die moeten omgezet worden
  naar een lichte GLB: minder driehoeken, onderdelen bij naam. Dat gebeurt best op de server of met een hulpmiddel
  (bv. FreeCAD), niet in de browser **[inschatting]**. Dit is waarschijnlijk het meeste werk per klant.
- **Ramen en deuren:** doorsnedes van de systeemleverancier (DXF), langs het kader getrokken (advies in
  `docs/3d-technieken.md`).
- **Meubels:** uit de maten opgebouwd (zoals nu), of een bestand per model van de maker (`docs/echte-3d-modellen.md`).
- **Games:** met de hand gemaakt in Blender (gratis) of gekocht; licentie per bestand nakijken.

Regel uit de kennisbank: **modellen van klanten niet verzinnen**. Wat uit foto's komt, is een benadering.

---

## 9. Stappenplan **[inschatting: één ontwikkelaar met Claude, zonder het modelleerwerk]**

| Fase | Wat | Resultaat | Duur |
|---|---|---|---|
| **A. Losmaken** | De weergave (laag 1) en de interactie (laag 2) worden een eigen pakket met een nette, beschreven ingang. Zetel- en bouwdemo gebruiken dat pakket. | Niets zichtbaar anders; de beeldvergelijking blijft gelijk. Basis voor alles wat volgt. | 2–3 weken |
| **B. Eerste zakelijke proef** | *Machine in 3D*: een gratis GLB van een machine, klikken op een onderdeel toont het samengesteld artikel uit Missing Link (alleen lezen), opengewerkte weergave. Of *werf in 3D*: posities gekleurd per status. | Een demo om aan klanten in de machinebouw of de bouw te tonen | 2–4 weken |
| **C. Eerste spelproef** | Spellus, invoer (ook gamepad), physics (Rapier: open source, Apache-2.0), geluid. Proefspel ***Laad de bestelwagen***: de artikels van een echte leveringsbon (maten, gewicht) stapel je in een bestelwagen; physics controleert of het past en stabiel staat. | Bewijs dat dezelfde engine games kan, met een brug naar Missing Link (een laadplan). | 3–4 weken |
| **D. Uitbreiden op vraag** | Editor om scènes samen te stellen, animatie (deuren, machines), samen kijken met meerdere gebruikers, AR op vraag | Alleen wat een klant of spel echt vraagt | Per onderdeel |

**Waarom *Laad de bestelwagen* als proefspel?** Het gebruikt beide kanten van de engine: gegevens uit Missing Link
(leveringsbon, artikelmaten, gewicht) en spelonderdelen (slepen, physics, punten). Werkt het, dan is het tegelijk een
spel en een nuttig hulpmiddel voor het magazijn.

---

## 10. Risico's en valkuilen

1. **Een engine is een bodemloze put.** Er is altijd nog een effect of een onderdeel bij te maken. Bouw alleen wat een
   concrete toepassing of een concreet spel vraagt.
2. **Twee doelen trekken aan elkaar.** Een game wil 60 beelden per seconde en mooie effecten. Missing Link wil snel
   laden, de batterij sparen en exacte maten. Daarom de twee standen in de lus en de aparte spelonderdelen.
3. **De 3D-inhoud is het echte werk**, niet de engine: machines uit CAD omzetten, doorsnedes van profielen, modellen van
   meubels. Reken per klant tijd voor de modellen.
4. **Toestellen:** WebGPU is er nog niet overal. De terugval op WebGL2 blijft nodig; tablets rekenen 2 à 3 keer trager
   (`docs/3d-technieken.md`, les 8).
5. **Grootte:** de zeteldemo is nu ±6,4 MB **[repo]**. Physics komt daar ±1 à 2 MB bij **[inschatting]**. Daarom de
   spelonderdelen apart laden.
6. **three.js verandert vaak.** Vaste versie, en de beeldvergelijking bij elke update.
7. **Licenties:** in de bundel alleen MIT, Apache of BSD. Bij 3D-bestanden van derden de licentie per bestand nakijken.
   De voorwaarden van Unity zijn de laatste jaren een paar keer gewijzigd **[inschatting]**: een reden te meer om de
   kern open te houden.
8. **Precisie:** de 3D mag nooit de bron van een maat of prijs zijn. Maten en prijzen komen uit de motor; de 3D toont
   ze alleen. Lopen 3D en tekening uiteen, dan melden (zie de doorlopende zetel in de kennisbank).

---

## 11. Open vragen voor Jonas

1. **Wat bedoel je met games:** A (spelelementen in Missing Link), B (kleine spellen in de browser) of C ("echte"
   games)? En voor wie: klanten van Missing Link, hun klanten, of een eigen product?
2. **Welke toepassing in Missing Link eerst:** machine in 3D, werf in 3D, of iets anders uit §4?
3. **Moet de engine ook apart verkocht worden**, zoals de configurator?
4. **Op welke toestellen:** tablets op de werf, telefoons, computers in de toonzaal?
5. **Hebben klanten in de machinebouw CAD-bestanden** die ze willen delen (STEP)? Wie zet die om?
6. **Mag Missing Link er velden bij krijgen** (3D-bestand per artikel of machine, punt op een werkbon)? Dat is af te
   spreken met de ontwikkelaar van Missing Link.

---

## 12. Advies in één zin

Bouw geen eigen engine van nul. Maak van de 3D die er al is een eigen pakket in lagen op three.js, met de zakelijke en
de spelonderdelen als aparte uitbreidingen. Bewijs de aanpak met één proef in Missing Link en één klein spel dat
gegevens uit Missing Link gebruikt.

## Meer lezen

- [3D-technieken](3d-technieken.md): welke 3D-techniek waarvoor, lessen en valkuilen.
- [Echte 3D-modellen](echte-3d-modellen.md): de proef met een GLB-bestand.
- [Analyse en stappenplan](configurator-analyse-en-stappenplan.md): de configurator en de koppeling met Missing Link.
- [Overdracht](overdracht.md): de stand van zaken.
