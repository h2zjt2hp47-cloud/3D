# 3D-werkwijze: heranalyse en nieuwe aanpak (11/11/2026)

Vraag van Jonas (11/11): "Volledige heranalyse van de huidige manier van werken voor de 3D. Maak het mooi,
gebruiksvriendelijk en zeer herbruikbaar."

Vervolg dezelfde dag: "Bekijk de pijnpunten en los ze op, zoek optimalisatie, gebruik alle nodige resources online.
Zorg dat dit ook voor andere 3D-tools kan gebruikt worden, bv. inrichting." Dat is hoofdstuk 9; de hoofdstukken 6 tot 8
zijn ermee herschreven.

Dit document is de **ingang** voor alles rond 3D: zetels, inrichting, ramen en deuren, woning. De andere documenten zijn
naslag (zie onderaan).

## 1. In het kort

**Wat misliep.** Een model ontstond uit één kleine foto en een twintigtal losse getallen. Fouten kwamen pas boven als
Jonas ze zag, één per bericht. Het gereedschap waarmee we vergeleken, bestond alleen tijdens een sessie.

**Wat verandert.**

| | Vroeger | Nu |
|---|---|---|
| **Vertrekpunt** | Eén kleine foto | Alle grote foto's, de maten en de technische tekening van de productpagina |
| **Karakter** | Twintig losse getallen | Eén **bouwstijl**, daarna alleen wat afwijkt |
| **Controle** | Jonas ontdekt fouten in de demo | Een **controleblad**: elk model naast zijn foto, oordeel en opmerking per model |
| **Gereedschap** | Wegwerpscripts per sessie | Vaste commando's in de repo, voor elk 3D-onderdeel |
| **Wachttijd** | Ruim 25 minuten voor een blad met 43 zetels | 49 seconden voor 86 items; daarna alleen wat veranderd is |
| **Licht en kleur** | Op het oog | Gemeten tegenover de staal, voor de zetel en voor de bouwweergave |
| **Opmerkingen** | Kopiëren en plakken | Bewaard bij het controleblad; Claude leest ze rechtstreeks |
| **De weg van de M5** | Niet te testen in de cloud | WebGPU draait mee in de controle; op de M5 zelf één knop |
| **Andere 3D-onderdelen** | Alleen zetels | Eén afspraak (een *bron*) voor zetels, inrichting, ramen, woning en wat volgt |
| **In de demo** | Alleen losse keuzes en schuifbalken | Keuze *Bouwstijl*, knop *Foto ernaast* en *Leg over de 3D* |

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

Zo maak of verbeter je één model. Voor een hele collectie doe je stap 1 en 5 voor alle modellen samen. De stappen gelden
ook voor een meubel van de inrichting, een raam of een ander product: lees dan "bouwstijl" als het karakter van dat
product (bij ramen het profielsysteem) en "foto" als de referentie die je hebt (fiche, tekening, foto).

| Stap | Wat | Gereedschap | Klaar wanneer |
|---|---|---|---|
| **1. Bron** | Alle grote foto's, de maten en de tekening van de productpagina ophalen | `python3 -I scripts/3d/modelfotos.py --paginas kotor` | Je weet welke maten **zeker** zijn (pagina, tekening) en welke je moet afleiden |
| **2. Opbouw** | De zetel in woorden beschrijven (vijf vragen hieronder) en de **bouwstijl** kiezen | Demo: *Bouwstijl* · `core/voorbeelden/bouwstijlen.ts` | Iemand die de foto niet ziet, kan de zetel uit je beschrijving herkennen |
| **3. Maten** | Zekere maten invullen. Ontbreekt er een, leid ze af uit de foto van voren met een maat die je wel kent | Demo: elementen en vormgeving · `modellen.ts` | Elke afgeleide maat staat als benadering in de bron van het model |
| **4. Afwijkingen** | Alleen wat afwijkt van de bouwstijl: kussendikte, armen, sierkussens, stofkleur | Demo: *Foto ernaast*, *Leg over de 3D* en de schuifbalken | Foto en 3D tonen dezelfde lagen, even dik, in dezelfde kleur |
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

Alles staat in `scripts/3d`, draait op de **werkbank** (zie hoofdstuk 8) en schrijft naar de map `werkbank` (niet in
git). Elk commando werkt voor elke bron: `--bron zetels` (standaard), `inrichting`, `ramen`, `woning`, `ijk`, `ijk-bouw`.

| Commando | Wat het doet | Duur (gemeten) |
|---|---|---|
| `npm run controleblad` | Eén pagina met elk item van elke bron: referentiefoto, vorige ronde, 3D nu, maten, bron. Oordeel en opmerking per item | 49 s voor 86 items; daarna alleen wat veranderd is |
| `npm run modelbeelden` | Beelden uit vaste standpunten, of een reeks: elke keuze van een groep, elk decor, elke lichtsfeer | ±1 s per beeld |
| `npm run lichtmeting` | Meet per lichtsfeer de bovenkant en de voorkant van een ijkblok tegenover de staal | 9 s |
| `npm run toestelcontrole` | Meet de weergave zelf op elke rekenweg en vergelijkt de wegen (zie hieronder) | ±5 min |
| `npm run beelden` | Vergelijkt tien vaste beelden van de echte demo's met de referentie | ±2,5 min |
| `python3 -I scripts/3d/modelfotos.py` | Haalt per productpagina de grote foto's en elke zin met een maat op, in `fotos-bron` | ±1 min |
| `npm run werkbank` | Bouwt de werkbankpagina (`packages/werkbank-web/dist/werkbank.html`) om zelf te bladeren | 5 s |

Voorbeelden:

```bash
npm run modelbeelden -- --lijst                       # welke bronnen zijn er
npm run modelbeelden -- --bron inrichting --lijst     # items en reeksen van één bron
npm run controleblad -- --bron zetels --groep Fauteuils
npm run controleblad -- --nieuwe-ronde                # na het akkoord: nu wordt de "vorige ronde"
npm run modelbeelden -- --items kotor --standpunten schuin,voor,links --decor fotodoek
npm run modelbeelden -- --reeks bouwstijl --item attribute   # ook: poten, rug, stof, alles, decors, lichten
npm run modelbeelden -- --bron woning --standpunten hoog
npm run lichtmeting -- --bron ijk-bouw --streng       # afsluitcode 1 als iets buiten de band valt
npm run toestelcontrole -- --weg webgpu
```

**Drie rekenwegen** (`--weg`). Zonder keuze neemt het gereedschap de snelste die werkt.

| Weg | Wat | Waarvoor |
|---|---|---|
| `snel` | WebGL2 met de Mesa-softwarerenderer (llvmpipe) op een virtueel scherm | Dagelijks werk: 3 keer sneller per beeld dan swiftshader |
| `webgl2` | WebGL2 met swiftshader | De weg van `npm run beelden` (de referentiebeelden zijn ermee gemaakt); werkt overal |
| `webgpu` | WebGPU met swiftshader als adapter, op een virtueel scherm | De weg van de M5: nagaan dat ze hetzelfde beeld geeft als de terugval |

**Alleen wat veranderd is.** Elk beeld krijgt een vingerafdruk van zijn scène, zijn instellingen en de weergave. Is die
dezelfde als de vorige keer, dan wordt het beeld hergebruikt (`ongewijzigd` in de uitvoer). Een ronde waarin je drie
modellen bijstuurt, tekent drie beelden. Met `--vers` alles opnieuw.

**Het controleblad gebruiken.** Open de privé gepubliceerde pagina (of `werkbank/controleblad.html`). Bovenaan kies je
de bron; per item staat de referentiefoto naast onze 3D, met de vorige ronde ertussen als het item veranderd is
(*Gewijzigd deze ronde*). Kies *Akkoord* of *Bijsturen* en typ wat anders moet.

- **Gepubliceerd** bewaart het blad elk oordeel bij de pagina zelf (collectie `oordelen`). Claude leest ze rechtstreeks
  terug; kopiëren en plakken hoeft niet. Op een ander toestel staan dezelfde oordelen.
- **Als los bestand** bewaart het in de browser en gebruik je *Kopieer opmerkingen*.
- Verandert een item nadat je het beoordeeld hebt, dan staat er *Aangepast sinds uw oordeel* en telt het weer mee bij
  *Nog te bekijken*. Zo zie je na een ronde meteen wat je opnieuw moet nakijken.

**De toestelcontrole.** Vier dingen, per rekenweg: (1) een rapport van de weergave (tijd per beeld, tekenopdrachten,
driehoeken, of het geheugen stabiel blijft, licht tegenover de staal); (2) of een beeld echt af is zodra de weergave
dat meldt; (3) of WebGL2 en WebGPU hetzelfde beeld geven; (4) of de samengevoegde bouwweergave hetzelfde beeld geeft
als onderdeel per onderdeel. Hetzelfde rapport start je op een echt toestel met de knop *Toestelcontrole* onderaan de
werkbankpagina: open ze op de M5, start de controle en kopieer het rapport in het gesprek.

## 7. In de demo

Voor wie een model samenstelt zonder programmeur:

1. Open een model dat erop lijkt, of een startopstelling.
2. **Bouwstijl** (boven *Aanpassingen voor de hele zetel*): kies het karakter. De samenvatting toont de stijl die nu
   geldt. Wijkt het ontwerp af, dan staat er de dichtste stijl met wat ervan afwijkt, bv. "Bak op lage voetjes + 1
   afwijking (nekrol)". *Ongedaan* werkt zoals altijd.
3. Zet de elementen en de maten goed in het boven- en vooraanzicht.
4. **Foto ernaast** (knop bij de standpunten in de 3D): de productfoto staat in de hoek van de 3D en wordt groot als je
   erover gaat. De knop staat er alleen bij een model met een foto.
5. **Leg over de 3D** (knop onder die foto): de foto ligt doorschijnend over het hele beeld. Draai en zoom de zetel
   eronder tot hij samenvalt met de foto; de schuifregelaar regelt hoe sterk de foto doorweegt. Waar de omtrekken niet
   samenvallen, wijkt de vorm af.
6. Stel bij met de keuzes en met *Ontwerpmodus: vormgeving*.
7. Bewaar het ontwerp, of maak er onder *Beheer → Modellen* een eigen model van.

## 8. Hergebruik: de werkbank en haar bronnen

Alles wat in 3D getoond wordt, gaat langs dezelfde weg:

```
gegevens (model, meubel, raam, plattegrond)  →  scène (blokken)  →  weergave (drie-d.ts)  →  beeld
```

De **werkbank** maakt daar één afspraak van. Een **bron** is een collectie van dingen die elk een scène opleveren. Het
gereedschap kent alleen bronnen, niet de onderdelen zelf.

| Bron | Wat | Aantal |
|---|---|---|
| `zetels` | De modellen van de collectie, met hun productfoto | 43 |
| `inrichting` | De meubels en toestellen van de plattegrond | 24 |
| `ramen` | De ramen en deuren van de voorbeeldwoning, elk in een stukje gevel | 14 |
| `woning` | De voorbeeldwoning (met dak, zonder dak, muren laag, zonder inrichting) en de aanbouw | 5 |
| `ijk`, `ijk-bouw` | Een blok per materiaal, om het licht te meten (zetelweergave en bouwweergave) | 8 |

**Een nieuw 3D-onderdeel toevoegen** (een kast, een keuken, een machine, een nieuwe klant) is één bron bijschrijven in
`packages/core/voorbeelden/werkbank-bronnen.ts`:

```ts
export const kastBron: WerkbankBron = {
  code: 'kasten', titel: 'Kasten', uitleg: 'De maatkasten van de catalogus.',
  weergave: 'bouw',                       // 'zetel' = meubel alleen in beeld, 'bouw' = gebouw of onderdeel ervan
  fotomap: 'packages/demo-web/fotos',     // optioneel: map met <foto>.jpg per item
  items: () => kasten.map((k) => ({ code: k.code, naam: k.naam, groep: k.reeks, foto: k.foto,
    feiten: [['Maten', `${k.b} × ${k.d} × ${k.h} cm`]], bron: k.bron })),
  scene: (code, keuzes) => kastScene(code, keuzes),       // geeft blokken + kader
  reeksen: () => [{ groep: 'front', label: 'Front', keuzes: fronten }],   // optioneel
};
// en in de lijst onderaan: werkbankBronnen = [..., kastBron]
```

Daarmee werken het controleblad, de modelbeelden, de reeksen, de lichtmeting en de werkbankpagina meteen. De test
`core/test/werkbank.test.ts` controleert voor elke bron dat elk item een geldige scène geeft (unieke codes, eindige
maten, geen lege scène).

| Voor | Wat je hergebruikt | Wat je nieuw maakt |
|---|---|---|
| **Een nieuw model** | Bouwstijl, elementen, kussenvormen, poten, het gereedschap | De opstelling, de maten en de afwijkingen |
| **Een nieuwe klant met zetels** | Alles hierboven, de catalogus als vertrekpunt | `modelfotos.py --site … --lijsten …`, de stoffen, de modellen, eventueel een eigen bouwstijl |
| **Een ander product** (kast, raam, keuken, machine) | De zes stappen, de weergave, de werkbank en al het gereedschap | De functie die van de gegevens een scène maakt, en één bron |
| **Een andere pagina met 3D** | `maak3D(houder, opties)` uit `drie-d.ts`: `toon(scene)`, `stil()`, `beeld()`, `info()` | De pagina zelf |

Wat de weergave herbruikbaar maakt, staat in `docs/3d-technieken.md` (welke techniek waarvoor) en in de skill
`3d-werkbank`.

## 9. Pijnpunten gemeten en opgelost (tweede ronde, 11/11)

Elk pijnpunt is eerst gemeten, dan opgelost en daarna opnieuw gemeten.

| Pijnpunt | Oorzaak (gemeten) | Oplossing | Voor → na |
|---|---|---|---|
| Lang wachten op beelden | Niet het rekenen (0,5 s per beeld) maar het wachten: het gereedschap gokte met vaste pauzes wanneer een beeld af was, en bediende de demo met klikken | De weergave meldt zelf wanneer het beeld af is (`stil()`); het gereedschap draait op de werkbank; de snellere Mesa-renderer; ongewijzigde beelden hergebruiken | Controleblad 43 zetels ruim 25 min → 86 items in 49 s · lichtmeting ±3 min → 9 s |
| Opmerkingen kopiëren en plakken | Het blad bewaarde alleen in de browser | Het gepubliceerde blad bewaart elk oordeel bij de pagina; Claude leest de collectie `oordelen` | Geen tussenstap meer |
| Niet weten wat opnieuw na te kijken is | Geen verband tussen oordeel en versie | Elk oordeel onthoudt de vingerafdruk van het item | *Aangepast sinds uw oordeel* |
| De weg van de M5 (WebGPU) niet te testen | Aanname dat de cloud geen WebGPU heeft | WebGPU werkt met een volledige browser op een virtueel scherm | WebGL2 tegenover WebGPU: 0,02 tot 0,5 % van het beeld anders (gelijk) |
| Instelling voor het omgevingslicht zonder effect | Sinds 4/11 las three.js ze niet meer; ze stond op 40 plaatsen | Eén instelling die doet wat ze zegt; de dode waarden zijn weg | Zetelbeelden pixel voor pixel gelijk (0,00 %) |
| Bouwweergave: witte kasten en badkamers één witte vlek | Bovenvlakken 1,84 keer zo helder als de staal | IJking `BOUW_LICHT`, gemeten met de lichtmeting | Bovenkant 1,84 → 1,36 · voorkant 0,98 → 0,88 |
| Woning traag om te draaien op een tablet | Elk blok en elke zijde een aparte tekenopdracht | Onderdelen met hetzelfde materiaal samengevoegd | Woning 3 909 → 153 tekenopdrachten, opbouwen 351 → 137 ms, zelfde beeld |
| Foto alleen naast de 3D | — | *Leg over de 3D* met schuifregelaar | Omtrek vergelijken vanuit hetzelfde standpunt |
| Bestaande modellen zijn losse getallen | — | `dichtsteBouwstijl`: elk model leest als stijl plus afwijkingen | Staat op het controleblad en in de demo |
| Gereedschap alleen voor zetels | Het bediende de zeteldemo | De werkbank met bronnen | Zelfde gereedschap voor inrichting, ramen, woning |
| Geen cijfers over de weergave | — | `info()` en `npm run toestelcontrole` | Tekenopdrachten, driehoeken, geheugen (stabiel: 40 → 40 na 12 keer opbouwen) |

**Wat online gevonden is, en wat we ermee deden.** Vanuit de cloud zijn alleen zoekresultaten bereikbaar (de volledige
pagina's niet: het netwerk van deze omgeving laat alleen de website van de klant toe). Elke vondst is daarom met een
eigen meting nagegaan voor ze gebruikt werd.

| Vondst | Bron | Eigen meting |
|---|---|---|
| Beelden zonder grafische kaart gaan tot 3 keer sneller met Mesa llvmpipe dan met swiftshader | [Microlink: faster WebGL screenshots](https://microlink.io/blog/faster-webgl-screenshots) | 186 → 56 ms per beeld (Kotor, 900 px): 3,3 keer |
| three.js leest de sterkte van het omgevingsbeeld uit `scene.environmentIntensity` (sinds r163); `envMapIntensity` van een materiaal geldt daar niet meer voor | [three.js r163](https://www.github.com/mrdoob/three.js/releases/tag/r163) · [forum three.js](https://discourse.threejs.org/t/release-166-scene-environment-issues-is-this-a-bug-or-is-it-me/68373) | Bevestigd: verwijderen van de materiaalwaarde verandert geen pixel |
| Het aantal tekenopdrachten weegt zwaarder dan het aantal driehoeken; richtwaarde onder de 100 tot enkele honderden per beeld; samenvoegen per materiaal helpt | [100 Three.js tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips) · [MetaDesign](https://metadesignsolutions.com/blog/threejs-performance-optimization-best-practices) | Woning 3 909 → 153; zetels zaten al goed (27 tot 129) |
| Vrije meubelmodellen (CC0) voor een inrichting: Kenney Furniture Kit, Poly Haven | [Kenney](https://opengameart.org/content/furniture-kit) · [vergelijking](https://app.cinevva.com/guides/sketchfab-polyhaven-kenney) | Niet gebruikt: de inrichting blijft uit eigen blokken (zie hoofdstuk 10) |

## 10. Wat nog niet in deze werkwijze zit

1. **De echte meting op de M5.** De weg (WebGPU) is nagegaan, de snelheid en het scherm niet. Eén keer de knop
   *Toestelcontrole* op de werkbankpagina starten op de M5 en het rapport doorgeven.
2. **De kleur automatisch uit de foto halen.** Nu meten we een vlak op de foto en kiezen we de dichtste stof.
3. **De gegevens van bestaande modellen herschrijven** als stijl plus afwijkingen. Ze lezen nu zo (controleblad, demo),
   maar dragen nog hun volledige getallen.
4. **De weergave opsplitsen.** `drie-d.ts` blijft één bestand van ±2 800 regels. Hergebruik loopt nu via `maak3D` en de
   werkbank; opsplitsen is onderhoud, met de beeldvergelijking en de toestelcontrole als vangnet.
5. **Echte modellen voor de inrichting.** De meubels zijn eenvoudige vormen. Een 3D-bestand (van een leverancier, of
   vrij beschikbaar) kan via dezelfde weg als het proefmodel van de zetel (`docs/echte-3d-modellen.md`).
6. **Twee opmerkingen uit de toestelcontrole.** Bij het wisselen van kwaliteit meldt WebGPU één keer dat de oude
   schaduwkaart nog gebruikt werd (gedrag van three.js; het volgende beeld is goed). En zonder grafische kaart is *Snel*
   trager dan *Mooi*; of dat op een echt toestel ook zo is, toont de toestelcontrole.

## 11. Naslag

| Document | Waarvoor |
|---|---|
| `docs/3d-technieken.md` | Welke 3D-techniek waarvoor, lessen, valkuilen, technieken van 3D-tekenaars, testen in de cloud |
| `docs/vergelijking-website-1011.md` | Verslag per model van de rondes van 10 en 11/11 |
| `docs/echte-3d-modellen.md` | Werken met een 3D-bestand van de fabrikant |
| `docs/zachte-vormen.md` | De zachte weergave |
| `beeldtest/LEESMIJ.md` | De beeldvergelijking |
| `.claude/skills/3d-werkbank/SKILL.md` | De werkbank: een bron toevoegen, het gereedschap, de rekenwegen |
| `.claude/skills/zetel-3d/SKILL.md` | Hoe de code van de zetel in elkaar zit en hoe je een vorm toevoegt |
| `.claude/skills/bouw-woning/SKILL.md` | De bouwdemo: plattegrond, gevels, raam, woning in 3D |
