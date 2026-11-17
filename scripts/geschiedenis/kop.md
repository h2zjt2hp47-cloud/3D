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
