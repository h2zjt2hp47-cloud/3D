# Zachte vormen: zelf zetels opmaken zoals een echt 3D-model (stap 1, 4/11/2026)

## Vraag

Kunnen we het echte 3D-model (de proef met de Glam Velvet Sofa, zie `echte-3d-modellen.md`) als voorbeeld gebruiken om
zelf de zetels op te maken in 3D?

Het antwoord had twee kanten:

- **Het bestand ombouwen tot Kotor of Wallace: nee.** Een afgewerkt 3D-model kun je uitrekken, maar niet omvormen tot
  een andere zetel. En het zou een zetel van Wayfair blijven, met een andere naam erop.
- **Het voorbeeld volgen: ja.** De motor maakt zulke vormen nu zelf, uit onze maten. Dat is stap 1 uit het voorstel;
  stap 2, een 3D-bestand per model via een 3D-programma, is (nog) niet gedaan.

## Wat het echte model ons leerde

Wat het Glam-model echter maakt dan onze blokken:

- **één doorlopende vorm**: zitting, rug en arm lopen in elkaar over;
- **zachte overgangen** in plaats van hoeken;
- **schaduw in de plooien en hoeken**;
- **een eigen vorm per onderdeel**, zoals een arm die naar buiten krult. Die vorm komt niet uit losse balken.

## Wat er nieuw is

![Wallace: foto van de website, vorige versie, nu met blokken, nu zacht, en het echte Glam-model als maatstaf](afbeeldingen/zachte-vormen-wallace.jpg)

1. **Instelling "Vormen" in de 3D:** *Blokken* (zoals altijd) of *Zacht (proef)*.
   - **Zacht:** de motor smelt de gestoffeerde delen van het karkas samen tot één doorlopende vorm. Dat zijn de
     onderbouw, de armen, de rug en de hoes.
   - **In de hoeken:** daar komt een afronding, zoals stof die over de hoek spant. Tussen de delen van één element is
     die afronding ruimer, bv. de arm met zijn krul en de hoes eronder.
   - **Geen richels:** waar twee vlakken in elkaars verlengde liggen, ontstaat geen richel.
   - **Schaduw:** in de hoeken en plooien zit schaduw, ook waar de kussens tegen de vorm liggen.
   - **Wat niet meesmelt:** losse kussens, hout en metaal blijven zoals ze waren.
   - **Wat hetzelfde blijft:** prijs, tekeningen en offerte veranderen niet.
2. **De uitlopende arm (Wallace, Esmee) is opnieuw getekend, ook bij *Blokken*:** één doorsnede die van voor naar
   achter loopt.
   - **Binnenkant:** recht tegen de zitting.
   - **Buitenkant:** onderaan iets naar binnen, bovenaan naar buiten uitlopend tot een opgerolde rand, die over de
     zijkant uitsteekt.
   - **Naar achteren:** de arm loopt op tot de hoogte van het karkas.
   - **Met een hoes tot op de grond:** de arm loopt zelf tot op de vloer, zonder trapje meer eronder.

   De vorm is een benadering uit de foto en de technische tekening (arm 21 cm breed, 63 cm hoog, karkas 86 cm).
3. **Ronde vormen blijven zoals ze waren.** Kuipfauteuils (Pebble, Ross, Karl …) en het afgeronde eindelement (Doha,
   Montego) waren al rond getekend. Samengesmolten gaven ze in de proef foutjes aan de randen, dus die delen smelten niet
   mee.

## Hoe het werkt (kort)

De motor gebruikt dezelfde werkwijze als 3D-programma's (*afstandsvelden* en *surface nets*):

1. **Afstand per deel:** voor elk deel berekent de motor hoe ver een punt ervan ligt, en in welke richting.
2. **Samenvoegen:** de motor voegt die afstanden zacht samen, met een afronding die afhangt van de hoek tussen de delen.
3. **Oppervlak:** uit een raster van 2 cm haalt hij het oppervlak. Hij verdeelt de punten gelijkmatig en legt elk punt er precies op.
4. **Schaduw:** de schaduw in de hoeken komt uit dezelfde afstanden, met de kussens en de vloer erbij.

| Waar | Wat |
|---|---|
| `packages/core/src/zachtevorm.ts` | `zachteVorm(blokken, opties)` geeft posities, normalen, textuurcoördinaten en schaduw. `smeltMee(blok)` zegt welke blokken meesmelten. `zachtVeld()` geeft het veld zelf, voor tests. Vormen: afgeronde balk (ook gekanteld), rol, gebogen wand, vrije omtrek en het nieuwe *profiel*. |
| `packages/core/src/ruimtelijk.ts` | `Blok.vorm = 'profiel'` met `profiel` (doorsnede) en `uit` (richting buitenkant), gebruikt door de uitlopende arm. |
| `packages/demo-web/src/drie-d.ts` | Groepen per stof die elkaar raken, de vormen worden onthouden en pas na het slepen berekend (tot dan de blokken). Klikken en markeren per element. Een *profiel* wordt ook bij *Blokken* zo getekend. |
| Tests | `packages/core/test/zachtevorm.test.ts` (dicht oppervlak, afronding in de hoek, geen richel op een naad, Wallace) en `details.test.ts` (de nieuwe arm). |

## Grenzen van de proef

- **Snelheid:** Wallace rekent ±0,6 s, grote hoeksofa's tot ±0,9 s (gemeten op de server). Op een tablet is dat
  waarschijnlijk 1 à 2 s, waarin het scherm even stilstaat. Daarom staat *Zacht* standaard uit en wordt het pas na het
  slepen berekend.
- **Gewicht:** 45.000 à 110.000 driehoeken per sofa, tegenover enkele duizenden bij *Blokken*.
- **Alleen de uitlopende arm heeft een eigen vorm.** De andere armstijlen (strak, rond, Engels, schuin, met houten blad)
  zijn nog balken die zacht samensmelten. Dat geeft minder winst: het samensmelten alleen verandert weinig, de winst zit
  in een eigen vorm per stijl.
- **Geen plooien of hangende stof:** geen kreukels in de hoes, geen kussens die doorzakken.
- **Benaderingen:** voor modellen zonder technische tekening blijft elke 3D een benadering uit foto's, hoe mooi ze ook
  oogt.
- **Niet getest op een echt toestel:** alleen in Chromium zonder grafische kaart (swiftshader), niet op een tablet of
  telefoon.

## Volgende stappen (als we verder gaan)

1. **Een eigen doorsnede per armstijl:** strak, rond, Engels, schuin, met houten blad. Daarna de rug (recht, hellend,
   rond) en een hoes met een geplooide voorkant. Telkens één vorm in de motor, die voor alle modellen met die stijl
   geldt.
2. **Sneller rekenen:** een grover raster waar het kan, of in de achtergrond rekenen.
3. **Daarna kiezen:** *Zacht* standaard aan, als het op een tablet vlot genoeg is.
4. **Stap 2 voor topmodellen:** een 3D-bestand per model (zie `echte-3d-modellen.md`).
