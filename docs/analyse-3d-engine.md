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
   weken **[inschatting]**). Daarna één proef binnen Missing Link (machine in 3D of werf in 3D) en één speelbaar
   prototype voor Steam (zie §5a en §9). Zo test je de twee doelen tegelijk.
5. **Games = Steam** (antwoord van Jonas, 6/11; uitwerking in §5a). Dat kan op twee manieren:
   - **Met dezelfde engine**, verpakt als programma voor de computer (Electron) met de Steam-functies erbij. Dat past
     bij een spel dat dicht bij de wereld van Missing Link ligt (bouwen, inrichten, beheren, puzzelen) met verzorgde,
     maar geen topgrafiek, voor pc en Steam Deck.
   - **Met Godot**, als apart spoor, voor een groot 3D-spel met personages of later consoles. Dan deel je met Missing
     Link alleen de 3D-bestanden en de gegevens, niet de code.

   Voorstel: eerst een speelbaar prototype op de eigen engine (4 à 6 weken), dan een beslismoment.

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
| **C. "Echte" games** | Een spel voor Steam of een console, grote open werelden, personages, online met veel spelers | Deels. Een bescheiden spel voor pc en Steam Deck kan met onze engine in een schil (Electron). Voor een groot 3D-spel of consoles is een volledige game-engine met editor nodig (Godot, Unity). Dan deel je alleen de 3D-bestanden (glTF), de stoffen als afbeeldingen en de gegevens. Zie §5a. |

**Oorspronkelijk advies:** begin met A en B. Die versterken Missing Link en de configurator. C is een ander vak, met een
ander team en een andere markt. Kies dat alleen als er een concreet spel en een budget is.

**Antwoord van Jonas (6/11): Steam.** Dat is smaak C. Hieronder wat dat betekent.

---

## 5a. Games voor Steam

### Wat Steam vraagt

| Eis | Uitleg | Gevolg |
|---|---|---|
| **Een programma, geen webpagina** | Steam installeert een programma op Windows (en eventueel Mac, Linux en Steam Deck) | Een webspel moet verpakt worden in een "schil" (Electron), of je gebruikt een game-engine die zelf een programma maakt |
| **Steam-functies** | Prestaties (achievements), opslaan in de cloud, vrienden, de Steam-overlay | Koppeling met Steamworks (de gratis set van Valve); voor Electron bestaat `steamworks.js` **[inschatting, licentie nakijken]** |
| **Controller** | Op de Steam Deck en voor het label *Deck Verified* moet het spel met een controller werken en moet de tekst leesbaar zijn **[inschatting]** | Invoer met gamepad vanaf het begin, niet achteraf |
| **Altijd vlot** | Constant ±60 beelden per seconde, ook op een gewone laptop en de Steam Deck | Prestatiebudget per scène en meten op echte toestellen |
| **Instellingen** | Resolutie, grafische kwaliteit, geluid, toetsen | Onze kwaliteitstrappen *Snel* / *Mooi* worden een volwaardig menu |
| **Kosten** | ±100 dollar per spel om het op Steam te zetten (*Steam Direct*); Valve houdt ±30 % van de verkoop **[inschatting, nakijken]** | Weinig drempel; de echte kost zit in maken, testen en verkopen |
| **Een product op zich** | Winkelpagina, trailer, marketing, updates, vragen van spelers | Iemand moet dit trekken: een ander vak dan een ERP verkopen |

### Drie wegen

| Weg | Wat | Sterk | Zwak |
|---|---|---|---|
| **W1. Eigen engine in een schil** | Onze engine op three.js (§7), verpakt met Electron, met `steamworks.js` voor de Steam-functies | Echt **één engine** voor Missing Link én het spel: elke verbetering helpt beide. Al het 3D-werk hergebruikt. Claude kan het bouwen en testen in deze omgeving (zoals de beeldvergelijking). Snel een eerste speelbare versie. Er bestaan spellen op Steam die zo gemaakt zijn (bv. CrossCode met HTML5) **[inschatting]**. | Minder rekenkracht dan een echte game-engine: grote werelden en veel personages lopen sneller vast. **Geen consoles** langs deze weg. Geen editor voor tekenaars of leveldesigners: die moeten we zelf maken. Het programma is ±100 MB (op Steam geen probleem). |
| **W2. Godot voor het spel** | Een volwaardige game-engine met editor (MIT, geen afdracht op de verkoop) | Gemaakt voor games: physics, animatie, personages, editor voor tekenaars. Maakt zelf programma's voor Windows, Mac, Linux. Consoles via gespecialiseerde partners **[inschatting]**. | Een tweede engine naast die van Missing Link: de code wordt niet gedeeld, alleen de 3D-bestanden (glTF), de texturen en de gegevens. Andere programmeertaal (GDScript of C#). Minder goed te testen in de cloud. |
| **W3. Unity** | De bekendste engine voor kleine en middelgrote spellen | Grootste aanbod aan kennis, uitbreidingen en mensen; consoles rechtstreeks | Licentievoorwaarden die al wijzigden; C#; zwaar; geen gedeelde code met Missing Link |

Unreal laten we weg: sterk voor topgrafiek, maar te zwaar voor een kleine ploeg en het spel dat hier past.

### Beoordeling voor Steam **[inschatting]**

| Criterium | W1. Eigen engine + schil | W2. Godot | W3. Unity |
|---|---|---|---|
| Gedeeld met Missing Link | ++ | − | − |
| Eerste speelbare versie | ++ | + | + |
| Groot 3D-spel (personages, open wereld) | − | + | ++ |
| Consoles later | − | + | ++ |
| Editor voor tekenaars en leveldesign | − | ++ | ++ |
| Licentie en kosten | ++ | ++ | 0 |
| Te bouwen en testen door Claude in de cloud | ++ | + | 0 |

### Advies

De keuze hangt af van **het soort spel**:

- **Een spel dicht bij de wereld van Missing Link** (bouwen, inrichten, renoveren, een werf of atelier beheren,
  puzzelen zoals *Laad de bestelwagen*), met een verzorgde stijl en geen topgrafiek, voor pc en Steam Deck → **W1**.
  Dan heb je echt één engine voor beide, en dat is net de vraag.
- **Een groot 3D-spel** met personages, een open wereld of consoles vanaf het begin → **W2 (Godot)**, als apart spoor.
  Missing Link houdt de engine op three.js; je deelt de 3D-bestanden en de gegevens.
- **W3 (Unity)** alleen als er een team bijkomt dat Unity al kent, of als consoles van bij de start moeten.

**Voorstel:** begin met een **speelbaar prototype op W1** (4 à 6 weken **[inschatting]**): één spelidee, controller,
opslaan, één prestatie, als testversie op Steam. Daarna een **beslismoment**: is het leuk, en blijft het vlot op een
Steam Deck? Ja → verder op W1. Wordt het spel te groot voor de webtechniek → overstappen naar Godot. Je verliest dan
weinig: de 3D-bestanden zijn glTF, en de spelregels staan als gegevens (laag 0), niet in de tekencode.

### Gevolgen voor de lagen (§7)

- **Laag 3b (spel) wordt groter:** controller (Gamepad API), instellingenmenu, opslaan (lokaal en Steam Cloud),
  prestaties, een vast ritme van 60 beelden per seconde, menu's en pauze.
- **Laag 4 krijgt een Steam-koppeling** naast de koppeling met Missing Link. De engine weet niets van Steam, net zoals
  ze niets weet van Missing Link.
- **WebGPU en WebGL2 blijven allebei nodig.** Op Linux en de Steam Deck is WebGPU in Electron nog niet overal
  beschikbaar **[inschatting, nakijken]**: de terugval op WebGL2 die we nu al hebben, is daar net nuttig.

### Extra risico's bij Steam

1. **Een spel verkopen is een vak op zich:** winkelpagina, trailer, community, updates. Reken dat mee, los van de
   techniek.
2. **Tekenwerk:** een spel vraagt veel meer 3D-inhoud dan een configurator (omgevingen, voorwerpen, eventueel
   personages). Kopen, laten maken of zelf maken in Blender, en de licentie per bestand nakijken.
3. **Prestaties pas laat zien:** daarom meten op een Steam Deck of een gewone laptop vanaf het prototype.
4. **Consoles** (PlayStation, Xbox, Switch) zijn langs W1 niet mogelijk. Wil je die zeker later, kies dan nu al W2.

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
de keuze voor smaak C, als apart spoor. Voor Steam (de keuze van Jonas) staat de afweging in §5a: optie 2 in een
schil (W1) voor een prototype, met Godot (W2) als overstap als het spel daarvoor te groot wordt.

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
| **C. Steam-prototype** (W1, §5a) | Spellus, controller, physics (Rapier: open source, Apache-2.0), geluid, opslaan, instellingenmenu. Verpakt met Electron, met één prestatie via Steamworks, als testversie op Steam (niet publiek). Spelidee te kiezen met Jonas; voorbeeld ***Laad de bestelwagen***: voorwerpen met echte maten en gewicht stapel je in een bestelwagen, physics controleert of het past en stabiel staat. | Een speelbare versie op pc en Steam Deck, en een eerlijke meting van de prestaties | 4–6 weken |
| **C'. Beslismoment** | Is het leuk? Blijft het vlot op de Steam Deck? Moeten er ooit consoles komen? | Verder op W1, of overstappen naar Godot (W2) met dezelfde 3D-bestanden | – |
| **D. Uitbreiden op vraag** | Editor om scènes samen te stellen, animatie (deuren, machines), samen kijken met meerdere gebruikers, AR op vraag; voor het spel: levels, menu's, winkelpagina | Alleen wat een klant of spel echt vraagt | Per onderdeel |

**Waarom *Laad de bestelwagen* als voorbeeld?** Het gebruikt beide kanten van de engine: spelonderdelen (slepen,
physics, punten) en dezelfde soort gegevens als Missing Link (maten, gewicht). In het spel zijn het verzonnen
voorwerpen; binnen Missing Link wordt dezelfde code een laadplan voor een echte leveringsbon. Het spel op Steam heeft
geen verbinding met Missing Link nodig.

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

1. ~~Wat bedoel je met games?~~ **Steam** (6/11). Nieuwe vragen daarbij:
   - **Welk soort spel?** Bouwen, inrichten, beheren of puzzelen (past bij W1), of een groot 3D-spel met personages
     (eerder Godot)? Heb je al een idee?
   - **Consoles ooit?** Zo ja, dan nu al Godot of Unity.
   - **Alleen spelen of met meerdere spelers online?**
   - **Wie maakt de tekeningen en 3D-modellen,** en wie trekt de verkoop op Steam (winkelpagina, community)?
   - **Moet het spel iets met Missing Link te maken hebben** (bv. een spel over een maakbedrijf, als reclame), of
     deelt het alleen de techniek?
2. **Welke toepassing in Missing Link eerst:** machine in 3D, werf in 3D, of iets anders uit §4?
3. **Moet de engine ook apart verkocht worden**, zoals de configurator?
4. **Op welke toestellen:** tablets op de werf, telefoons, computers in de toonzaal?
5. **Hebben klanten in de machinebouw CAD-bestanden** die ze willen delen (STEP)? Wie zet die om?
6. **Mag Missing Link er velden bij krijgen** (3D-bestand per artikel of machine, punt op een werkbon)? Dat is af te
   spreken met de ontwikkelaar van Missing Link.

---

## 12. Advies in één zin

Bouw geen eigen engine van nul. Maak van de 3D die er al is een eigen pakket in lagen op three.js, met de zakelijke en
de spelonderdelen als aparte uitbreidingen. Bewijs de aanpak met één proef in Missing Link en één speelbaar
Steam-prototype in een Electron-schil, en kies na dat prototype bewust tussen verder op de eigen engine of Godot.

## Meer lezen

- [3D-technieken](3d-technieken.md): welke 3D-techniek waarvoor, lessen en valkuilen.
- [Echte 3D-modellen](echte-3d-modellen.md): de proef met een GLB-bestand.
- [Analyse en stappenplan](configurator-analyse-en-stappenplan.md): de configurator en de koppeling met Missing Link.
- [Overdracht](overdracht.md): de stand van zaken.
