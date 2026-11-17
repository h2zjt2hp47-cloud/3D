# Belgica — ontwerpdocument (versie 1, 17/11/2026)

Een eigen strategiespel in de stijl van de grote strategiespellen (doorlopende klok, kaart met vakken), over het gebied van België en de randen, van de Romeinen tot vandaag. Geen kopie van een bestaand spel: eigen regels, eigen kaart, eigen beeld.

Jaartallen en feiten hieronder komen uit algemene kennis en zijn **nog na te kijken** voor ze in het spel komen.

## 1. Keuzes van Jonas

| Onderwerp | Keuze |
|---|---|
| Omvang | Volledig spel, voor zichzelf, uit plezier |
| Tijd | Eén doorlopende campagne, Romeinen tot nu |
| Klok | Doorlopend met pauze (en snelheden) |
| Speler | Je kiest één heerser; de computer speelt de anderen; valt jouw macht weg, dan neem je de opvolger over |
| Geschiedenis | Mix: grote gebeurtenissen komen altijd, hoe je ze doorkomt hangt van jou af |
| Kaart | Historische gebieden, ±250 vakken, België plus de randen (Frans-Vlaanderen, Zeeuws-Vlaanderen, Nederlands-Limburg, Luxemburg) |
| Zwaartepunten | Oorlog, economie, diplomatie en huwelijken, bestuur en opstanden |
| Speelduur | Lang: 50 uur of meer voor een volledige campagne |
| Doel | Geen winst; score per tijdperk en een eindrapport in het heden |
| Eerst speelbaar | De Romeinen |
| Gevoelige delen | Volledig speelbaar, met echte gevolgen; wreedheid is nooit de slimste weg naar een hoge score |
| Plaats | Aparte repo, browser, TypeScript, één HTML-bestand om te openen |

## 2. Hoe het spel werkt

### Kaart
- ±250 **vakken**: vaste stukjes land, gemaakt uit vrije kaartgegevens (gemeentegrenzen samengevoegd tot streken).
- Elk vak heeft: terrein (polder, zandgrond, leem, Ardennen, rivier, kust), bevolking, welvaart, eventueel een stad of burcht.
- **Gebieden** (graafschap Vlaanderen, hertogdom Brabant, prinsbisdom Luik, ...) zijn groepen vakken. Welke vakken bij welk gebied horen, verandert per tijdperk.
- Buren buiten de kaart (Frankrijk, het Duitse Rijk, Engeland, de Republiek) bestaan als machten aan de rand, zonder eigen vakken op de kaart.

### Klok
- Loopt per dag, met pauze en vijf snelheden.
- In rustige eeuwen kan je de klok sneller zetten; bij oorlog of een grote gebeurtenis pauzeert het spel vanzelf (instelbaar).

### Heersers en opvolging
- Een **macht** bezit vakken en heeft een heerser.
- Jij speelt één macht. Verdwijnt ze (veroverd, geërfd, opgegaan in een groter rijk), dan kies je de opvolger die het grootste deel van je vakken overneemt.
- Voorbeeld van een keten: Nerviërs → Romeins bestuur → Franken → graaf van Vlaanderen → Bourgondiërs → Habsburgers → Oostenrijk → Frankrijk → Verenigd Koninkrijk der Nederlanden → België.

### De vier zwaartepunten
1. **Oorlog**: legers bewegen van vak naar vak, veldslagen, belegeringen van steden en burchten, terrein en seizoen tellen mee, bevoorrading.
2. **Economie**: wat een vak voortbrengt (graan, wol, laken, ijzer, steenkool, staal), handel via rivieren en havens (Brugge, Antwerpen), belastingen.
3. **Diplomatie**: verdragen, bondgenoten, leenheren en leenmannen, huwelijken en erfenissen; zo verschuiven gebieden zonder oorlog.
4. **Bestuur**: tevredenheid per vak, steden en gilden met eigen rechten, opstanden.

### Gebeurtenissen
- **Vaste gebeurtenissen** komen altijd (bv. Caesar trekt Gallië binnen, de Franken vestigen zich, 1830, de wereldoorlogen). De gevolgen hangen af van hoe jij ervoor staat.
- **Losse gebeurtenissen** komen soms (pest, overstroming, slechte oogst, opstand).

### Score
- Per tijdperk een score op drie assen: **welvaart**, **macht**, **vrijheid** (hoeveel je volk zelf beslist).
- Eindrapport in het heden: hoe jouw keten van heersers het gebied gevormd heeft, naast de echte geschiedenis.

## 3. Tijdperken (ruw, na te kijken)

1. **Romeinen** (57 v.Chr. – ±400): Caesar tegen de Belgische stammen (Nerviërs, Eburonen, Menapiërs, Atrebaten, Treveri, ...), de opstand van Ambiorix, daarna Romeins bestuur (Tongeren, wegen, villa's).
2. **Franken** (±400 – 843): Frankische koningen, Doornik, kerstening, Karel de Grote.
3. **Vroege middeleeuwen** (843 – ±1100): verdeling van Verdun, ontstaan van Vlaanderen, Luik, Lotharingen, Noormannen.
4. **Hoge middeleeuwen** (±1100 – 1384): lakensteden, Brabant, 1302, gilden en opstanden.
5. **Bourgondiërs** (1384 – 1482): samenvoeging door huwelijk en erfenis.
6. **Habsburgers en Spanje** (1482 – 1713): Karel V, Beeldenstorm, scheiding Noord en Zuid, val van Antwerpen.
7. **Oostenrijk** (1713 – 1794): Brabantse Omwenteling.
8. **Frankrijk en Verenigd Koninkrijk** (1794 – 1830).
9. **België** (1830 – 1914): onafhankelijkheid, nijverheid, Congo.
10. **Wereldoorlogen** (1914 – 1945): bezetting, verzet, collaboratie.
11. **Na de oorlog** (1945 – nu): koningskwestie, Europa, staatshervormingen.

## 4. Volgorde van bouwen

1. **Kaart, klok, oorlog bij de Romeinen**: de vakken, de klok met pauze, legers, veldslagen, belegeringen. Vanaf hier speelbaar.
2. **Economie en bestuur**: opbrengst per vak, belastingen, tevredenheid, opstanden.
3. **Opvolging en diplomatie**: overgang naar de Franken, verdragen, huwelijken, erfenissen.
4. **Elk volgend tijdperk**, één voor één, tot vandaag.

Elke stap eindigt met een bestand dat je kan openen en spelen.

### Stand (17/11/2026)
- **Stap 1 is gebouwd**: `dist/belgica.html`. Kaart met 250 vakken, klok met pauze en vijf snelheden, twaalf volken (Rome, Remi, tien Belgische stammen en de Treveri), legers met moraal, veldslagen met terrein en rivieren, bezetting en belegering van versterkingen, uitputting, computerspelers, onderwerping en opstand, opvolging, drie vaste gebeurtenissen (de bond van 57, de opstand van Ambiorix in 54, nieuwe legioenen in 53) en een score.
- Zelfde start, verschillende afloop: in vier proefoorlogen won Rome twee keer veel terrein, één keer half en één keer bleven de Belgen overeind.
- **Stap 2 is gebouwd** (economie en bestuur): schatkist in zilver (een spelmunt), belastingdruk laag/gewoon/hoog, soldij per maand, oproepen kost geld, bouwen per vak (akkers, markt, versterking, en voor Rome de Romeinse weg), bevolkingsgroei en plundering, tevredenheid per vak met opstanden in veroverd land, schatting van onderworpen volken aan hun heer, een kaart van de tevredenheid. De bedragen zijn spelverhoudingen, geen historische waarden.
- Nog niet: diplomatie en vrede, huwelijken en erfenis, de tijd na 50 v.Chr.

## 5. Opgelet

- Met de Romeinen eerst testen we vooral oorlog; huwelijken, erven en handel komen later. Problemen met die regels zie je dus pas in latere tijdperken.
- 250 vakken en 2000 jaar: de computerspelers moeten slim genoeg zijn om een lange campagne interessant te houden. Dat is het moeilijkste stuk.
- Kaartgegevens enkel uit vrije bronnen, met vermelding van de bron.

## 6. Open punten

- Naam van het spel en van de repo (voorstel: `belgica`).
- Uitzicht van de kaart: oude getekende kaart, of strak en modern?
- Hoeveel computerspelers tegelijk, en hoe slim op het begin?
- Opslaan: één opgeslagen spel of meerdere?
