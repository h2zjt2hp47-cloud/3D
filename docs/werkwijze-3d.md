# 3D-werkwijze: heranalyse en nieuwe aanpak (11/11/2026)

Vraag van Jonas (11/11): "Volledige heranalyse van de huidige manier van werken voor de 3D. Maak het mooi,
gebruiksvriendelijk en zeer herbruikbaar."

Dit document is de **ingang** voor alles rond 3D. De andere documenten zijn naslag (zie onderaan).

## 1. In het kort

**Wat misliep.** Een model ontstond uit één kleine foto en een twintigtal losse getallen. Fouten kwamen pas boven als
Jonas ze zag, één per bericht. Het gereedschap waarmee we vergeleken, bestond alleen tijdens een sessie.

**Wat verandert.**

| | Vroeger | Nu |
|---|---|---|
| **Vertrekpunt** | Eén kleine foto | Alle grote foto's, de maten en de technische tekening van de productpagina |
| **Karakter** | Twintig losse getallen | Eén **bouwstijl**, daarna alleen wat afwijkt |
| **Controle** | Jonas ontdekt fouten in de demo | Een **controleblad**: elk model naast zijn foto, oordeel en opmerking per model |
| **Gereedschap** | Wegwerpscripts per sessie | Vier vaste commando's in de repo |
| **Licht en kleur** | Op het oog | Gemeten tegenover de staal |
| **In de demo** | Alleen losse keuzes en schuifbalken | Keuze *Bouwstijl* en knop *Foto ernaast* |

## 2. Hoe we tot nu werkten

1. Een foto bekijken (in de demo 420 px breed).
2. Maten en keuzes schatten en als getallen in `modellen.ts` zetten.
3. De 3D bekijken en bijstellen tot het "ongeveer klopt".
4. Jonas ziet het resultaat en meldt wat niet klopt.
5. Bijsturen, vaak met een wijziging in de motor zelf.

Dat gaf vijf rondes in acht dagen, telkens met dezelfde soort melding:

| Datum | Melding van Jonas |
|---|---|
| 3/11 | "De zetels in de 3D lijken totaal niet op de zetels van de website" |
| 4/11 | "Nu lijken alle zetels op elkaar" · "Montego en Doha zien er in de 3D identiek uit" |
| 5/11 | "Totaal onherkenbaar" (Pebble) |
| 10/11 | "Bovenste deel is hoger op foto en zijkant niet afgerond" (Doha) |
| 11/11 | "Van waar komen die buizen als armleuning?" · "De rechthoekige zetels zijn moeilijk van elkaar te onderscheiden" · "De longchairs hebben geen poten onder het lange deel" · "Fraser heeft geen apart kussen, Manon is in 1 stuk" |

## 3. Wat misliep en waarom

| Wat we zagen | Oorzaak | Oplossing in de nieuwe werkwijze |
|---|---|---|
| Modellen die niet op de foto lijken | Gebouwd op één kleine foto; de productpagina heeft er vaak vijf tot twaalf, plus maten en een tekening | Stap 1: eerst alle bronnen verzamelen |
| Zetels die op elkaar lijken | Eerst details, dan pas de opbouw. Twintig losse getallen zonder samenhang | Stap 2: de opbouw benoemen en een **bouwstijl** kiezen |
| Fouten die Jonas één voor één moet melden | Geen vast moment waarop alles naast de foto ligt | Stap 5: het **controleblad** |
| Een oplossing voor één model breekt een ander | Bijsturen in de motor in plaats van in de gegevens (de poten onder de chaise longue verdwenen zo op 11/11) | Regel: eerst de gegevens; de motor alleen voor een regel die voor meer modellen geldt, met een test |
| Bovenkanten te fel, kleuren te licht | Licht op het oog afgesteld. Sinds 4/11 werkte de instelling voor het omgevingslicht niet meer, en niemand merkte het | Commando `lichtmeting` |
| Elke ronde hetzelfde werk opnieuw | Vergelijkingsbeelden maken met scripts die na de sessie weg zijn | Vast gereedschap in `scripts/3d` |
| Kleur van de stof klopt niet | Kleur gekozen op het oog | Kleur meten op de foto (zie stap 4) |
| Kennis verspreid | Zes documenten, geen ingang | Dit document |

## 4. De nieuwe werkwijze: zes vaste stappen

Zo maak of verbeter je één model. Voor een hele collectie doe je stap 1 en 5 voor alle modellen samen.

| Stap | Wat | Gereedschap | Klaar wanneer |
|---|---|---|---|
| **1. Bron** | Alle grote foto's, de maten en de tekening van de productpagina ophalen | `python3 -I scripts/3d/modelfotos.py --paginas kotor` | Je weet welke maten **zeker** zijn (pagina, tekening) en welke je moet afleiden |
| **2. Opbouw** | De zetel in woorden beschrijven (vijf vragen hieronder) en de **bouwstijl** kiezen | Demo: *Bouwstijl* · `core/voorbeelden/bouwstijlen.ts` | Iemand die de foto niet ziet, kan de zetel uit je beschrijving herkennen |
| **3. Maten** | Zekere maten invullen. Ontbreekt er een, leid ze af uit de foto van voren met een maat die je wel kent | Demo: elementen en vormgeving · `modellen.ts` | Elke afgeleide maat staat als benadering in de bron van het model |
| **4. Afwijkingen** | Alleen wat afwijkt van de bouwstijl: kussendikte, armen, sierkussens, stofkleur | Demo: *Foto ernaast* en de schuifbalken | Foto en 3D tonen dezelfde lagen, even dik, in dezelfde kleur |
| **5. Controle** | Alle modellen naast hun foto leggen en per model oordelen | `npm run controleblad` · `npm run lichtmeting` | Geen model staat nog op *Bijsturen* |
| **6. Vastleggen** | Testen, referentiebeelden, verslag, publiceren | `npm test` · `npm run typecheck` · `npm run beelden` | Gecommit, gepusht, demo bijgewerkt |

**De vijf vragen van stap 2.** Beantwoord ze voor je één getal invult.

1. **Wat staat eronder?** Slanke poten, blokvoetjes, een sokkel, een plateau, een hoes, of loopt de zetel tot op de vloer?
2. **Hoe dik is de onderbouw tegenover het zitkussen?** Dunne onderbouw met een dik kussen, twee even dikke lagen, of één blok?
3. **Wat is de zitting?** Een los kussen per plaats, één lange matras, of een vaste zitting?
4. **Wat is de rug?** Losse rechte kussens, losse donskussens, een vaste rug, of een lage rug met sierkussens?
5. **Hoe zijn de armen?** Smal of breed, even hoog als het karkas of lager, even diep als de zitting of korter?

**Een model is klaar als:**

- de opstelling klopt (aantal zitplaatsen, chaise, hoek, tussenstuk);
- onderbouw, zitkussen en poten even dik en hoog zijn als op de foto;
- de rug en de kussens van het juiste soort zijn;
- de armen de juiste breedte, hoogte en diepte hebben;
- de stofkleur gemeten is op de foto;
- de bron zegt wat zeker is en wat een benadering is;
- het model op het controleblad op *Akkoord* staat.

## 5. Bouwstijlen: het karakter in één keuze

Een bouwstijl zet poten, onderbouw, zitkussens en rug in één keer goed. Elementen, maten, stof en hout blijven. De
stijlen zijn algemeen: ze horen niet bij één klant.

| Bouwstijl | Herkenbaar aan | Lijkt op |
|---|---|---|
| **Dun karkas op slanke poten** | Slanke metalen poten, dunne onderbouw, dikke zitkussens die oversteken, grote donskussens | Kotor |
| **Strak en slank op poten** | Onderbouw en zitkussen even dik, strakke randen, rechte rugkussens | Belize |
| **Bak op lage voetjes** | Rug, armen en onderbouw vormen één bak; kussens liggen erin | Nestor |
| **Lage loungebak met sierkussens** | Tot op de vloer, lage rug even hoog als de armen, sierkussens als rug | Pula |
| **Plateau met dikke donskussens** | Plateau dat onder de kussens uitsteekt, korte blokpootjes | Fréjus |
| **Blokken tot op de vloer** | Vaste zitting, lage dikke rug, bies langs de randen | Gozo, Azar |
| **Hoes tot op de grond** | Hoes over de onderbouw, losse rugkussens, bies | Husk, Wallace |
| **Zacht en rond uit één stuk** | Vaste zitting met ronde voorkant, vaste hellende rug | Amusette |

Een nieuwe stijl toevoegen is één blok gegevens in `packages/core/voorbeelden/bouwstijlen.ts`. De test controleert dat
elke stijl op elke startopstelling een geldig ontwerp geeft en dat de stijlen in 3D van elkaar te onderscheiden zijn.

## 6. Het gereedschap

Alles staat in `scripts/3d` en schrijft naar de map `werkbank` (niet in git).

| Commando | Wat het doet | Duur |
|---|---|---|
| `python3 -I scripts/3d/modelfotos.py` | Haalt per productpagina de grote foto's en elke zin met een maat op, in `fotos-bron` | ±1 min |
| `npm run controleblad` | Maakt één pagina met elk model: foto, vorige ronde, 3D nu, maten, stof, bouwstijl, bron. Je duidt *Akkoord* of *Bijsturen* aan en kopieert alle opmerkingen in één keer | ±12 min voor 42 modellen |
| `npm run modelbeelden` | Beelden van modellen uit vaste standpunten, of een reeks: elke keuze, elk decor of elke lichtsfeer één keer | ±15 s per beeld |
| `npm run lichtmeting` | Meet per lichtsfeer de bovenkant en de voorkant tegenover de staal en zegt wat buiten de band valt | ±3 min |
| `npm run beelden` | Vergelijkt tien vaste beelden met de referentie (bestond al) | ±3 min |

Voorbeelden:

```bash
npm run controleblad -- --familie Fauteuils          # één familie
npm run controleblad -- --modellen kotor,nestor       # enkele modellen
npm run modelbeelden -- --modellen kotor --standpunten schuin,voor,links --decor fotodoek
npm run modelbeelden -- --reeks keuzes --model attribute
npm run lichtmeting -- --streng                       # afsluitcode 1 als een sfeer buiten de band valt
```

**Het controleblad gebruiken.** Open `werkbank/controleblad.html` of de privé gepubliceerde pagina. Per model staat de
foto naast onze 3D, met de vorige ronde ertussen als het beeld veranderd is. Kies *Akkoord* of *Bijsturen* en typ wat
anders moet. *Kopieer opmerkingen* zet alles als tekst klaar om in het gesprek te plakken. Wat je invult, blijft in die
browser staan tot de volgende keer.

## 7. In de demo

Voor wie een model samenstelt zonder programmeur:

1. Open een model dat erop lijkt, of een startopstelling.
2. **Bouwstijl** (boven *Aanpassingen voor de hele zetel*): kies het karakter. De samenvatting toont de stijl die nu
   geldt, of "eigen samenstelling" zodra iets afwijkt. *Ongedaan* werkt zoals altijd.
3. Zet de elementen en de maten goed in het boven- en vooraanzicht.
4. **Foto ernaast** (knop bij de standpunten in de 3D): de productfoto staat in de hoek van de 3D en wordt groot als je
   erover gaat. De knop staat er alleen bij een model met een foto.
5. Stel bij met de keuzes en met *Ontwerpmodus: vormgeving*.
6. Bewaar het ontwerp, of maak er onder *Beheer → Modellen* een eigen model van.

## 8. Hergebruik

| Voor | Wat je hergebruikt | Wat je nieuw maakt |
|---|---|---|
| **Een nieuw model** | Bouwstijl, elementen, kussenvormen, poten, het gereedschap | De opstelling, de maten en de afwijkingen |
| **Een nieuwe klant met zetels** | Alles hierboven, de catalogus als vertrekpunt | `modelfotos.py --site … --lijsten …`, de stoffen, de modellen, eventueel een eigen bouwstijl |
| **Een ander product** (kast, raam, machine) | De zes stappen, `werkbank.mjs`, het controleblad, de lichtmeting en de beeldvergelijking | De bouwstenen van dat product en zijn "stijlen" (bij ramen: het profielsysteem) |

Wat de motor herbruikbaar maakt, staat in `docs/3d-technieken.md` (welke techniek waarvoor) en in de skill `zetel-3d`.

## 9. Wat nog niet in deze werkwijze zit

1. **De foto over de 3D leggen** vanuit hetzelfde standpunt. Nu staat ze ernaast.
2. **Opmerkingen rechtstreeks teruglezen** uit het controleblad. Nu kopieer en plak je ze.
3. **De kleur automatisch uit de foto halen.** Nu meten we een vlak op de foto en kiezen we de dichtste stof.
4. **Bestaande modellen als "bouwstijl plus afwijkingen".** De 42 modellen houden hun volledige getallen; alleen nieuwe
   ontwerpen vertrekken van een stijl.
5. **De weergave opsplitsen.** `drie-d.ts` is één bestand van ±2 700 regels (kussens, materialen, licht, camera). Opsplitsen
   maakt de onderdelen los herbruikbaar, maar raakt alles: een aparte stap met de beeldvergelijking als vangnet.
6. **Het omgevingslicht herijken** voor alle sferen en de bouwdemo (zie `docs/3d-technieken.md`, valkuilen).
7. **Testen op de M5.** Alles is gecontroleerd in de cloud, zonder WebGPU.

## 10. Naslag

| Document | Waarvoor |
|---|---|
| `docs/3d-technieken.md` | Welke 3D-techniek waarvoor, lessen, valkuilen, technieken van 3D-tekenaars |
| `docs/vergelijking-website-1011.md` | Verslag per model van de rondes van 10 en 11/11 |
| `docs/echte-3d-modellen.md` | Werken met een 3D-bestand van de fabrikant |
| `docs/zachte-vormen.md` | De zachte weergave |
| `beeldtest/LEESMIJ.md` | De beeldvergelijking |
| `.claude/skills/zetel-3d/SKILL.md` | Hoe de code in elkaar zit en hoe je een vorm toevoegt |
