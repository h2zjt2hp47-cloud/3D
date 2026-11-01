# Onderzoek: configurator voor de bouwsector (ramen, deuren, aanbouw)

*1 november 2026. Tweede case naast de zitmeubelen. Dezelfde motor (`packages/core`), een eigen demo (`packages/bouw-web`).*

Voorbeeld waarmee we vertrokken: een aanbouw met bakstenen zijmuren, een gevelbekleding in ceder boven het raam, een zwart aluminium schuifraam met twee vleugels en een plat dak. De maten zijn 4650 mm breed, 3000 mm hoog en een raamhoogte van 2500 mm. De demo start met precies deze maten.

## 1. Pijnpunten in de sector (online onderzoek)

| # | Pijnpunt | Wat er misloopt | Bron |
|---|---|---|---|
| 1 | **Fouten in offertes** | Er wordt een optie vergeten, een oude prijs gebruikt of een configuratie aangeboden die technisch niet kan. Dat leidt tot opnieuw maken, marge die verdwijnt en een ontevreden klant. Eén fout in de offerte loopt door tot in productie en plaatsing. | Paradigm: *quoting errors cause problems for window and door manufacturers* |
| 2 | **Trage offertes** | De verkoper moet bij de technische dienst of werkvoorbereiding navragen of iets kan. Elke vraag kost dagen, en intussen kiest de klant een concurrent. | Paradigm, Hive CPQ (doors & windows), Kolonell |
| 3 | **Meetfouten** | De opening is niet haaks of niet recht. Het raam wordt besteld op één maat en past niet. | Werkspot (offerte aannemer uitgelegd), praktijk bij plaatsers |
| 4 | **Systeemgrenzen** | De vleugel is te breed, te hoog of te zwaar voor het beslag. Dat merkt men vaak pas bij de leverancier. Voorbeelden van maximale vleugelgewichten bij hef-schuif: Schüco ASS 70.HI tot 400 kg, Rehau Geneo tot 400 kg (300 × 270 cm), Aluprof tot 4 m hoog en 500 à 700 kg. | Fabrikantdocumentatie (Rehau, Aluprof, Reynaers via derden) |
| 5 | **Veiligheidsglas** | Bij glas tot op de vloer is gelaagd glas nodig. Wordt dat vergeten, dan volgt na de keuring een dure vervanging. | Buildwise (NBN S 23-002), forums |
| 6 | **EPB / isolatie** | De Uw-waarde van de hele raampartij (glas + profiel + randverbinding) haalt de eis niet, terwijl de verkoper alleen naar de Ug van het glas keek. | EPB-pedia Vlaanderen, Test-Aankoop |
| 7 | **Meerwerk en discussies** | "Dat zat er toch in?" gaat over afbraak, afwerking binnen, ligger of stabiliteit. Op Juridisch Forum en in de klachten bij Test-Aankoop zijn dit de meest voorkomende geschillen. | Juridisch Forum, Test-Aankoop (publieke klachten) |
| 8 | **Btw 6 % of 21 %** | Het verlaagde tarief wordt verkeerd toegepast (woning jonger dan 10 jaar) of het attest van de klant ontbreekt. | FOD Financiën-regels (praktijk) |
| 9 | **Levertermijn** | Het speciale glas of de speciale kleur verlengt de levertermijn, maar de verkoper belooft een standaardtermijn. | Praktijk |
| 10 | **Ruwbouw rond het raam** | Bij een opening breder dan ongeveer 3 m is een stalen ligger en een stabiliteitsstudie nodig. Bij een grotere aanbouw moet de vergunning nagegaan worden. | Praktijk, gemeentelijke regels |

## 2. Wat de demo hiermee doet (gebouwd)

| Pijnpunt | Oplossing in de configurator |
|---|---|
| 1 Fouten | Het formulier laat alleen geldige keuzes toe. Regels geven meteen een fout of een waarschuwing. De bestellijst wordt automatisch opgemaakt uit dezelfde configuratie. |
| 2 Traag | Prijs, controles, vooraanzicht en 3D verschijnen meteen, zonder de technische dienst te moeten vragen. |
| 3 Meten | Stap **Inmeting**: 3 breedtes en 2 hoogtes, met de montagespeling. De bestelmaat is de kleinste maat min de speling. Verschillen de metingen meer dan 10 mm, dan volgt een waarschuwing. Zolang er niet ingemeten is, staat er in de offerte "onder voorbehoud van inmeting". |
| 4 Systeemgrenzen | Per raamtype geldt een maximale breedte, hoogte en gewicht per vleugel. De configurator berekent het vleugelgewicht uit het glas (kg/m²) en het profiel (kg/m). Vanaf 85 % van de grens krijg je al een waarschuwing. |
| 5 Veiligheidsglas | Kies je glas dat niet gelaagd is, dan krijg je een fout. |
| 6 EPB | De Uw van de raampartij wordt berekend als (Ag·Ug + Af·Uf + lg·ψ) / A. Is die hoger dan 1,5, dan volgt een waarschuwing. |
| 7 Meerwerk | Een kaart **Inbegrepen / Niet inbegrepen** wordt automatisch opgebouwd uit de keuzes en komt mee in de offertetekst. |
| 8 Btw | De keuze 6 % / 21 % rekent de btw mee in de prijs. Bij 6 % herinnert de configurator aan het attest. |
| 9 Levertermijn | De levertermijn hangt af van het profiel. Speciaal glas voegt 2 weken toe. |
| 10 Ruwbouw | Bij een opening breder dan 3 m komt er een stalen ligger in de stuklijst, met een waarschuwing over de stabiliteit. Is de aanbouw groter dan 40 m², dan volgt een waarschuwing over de vergunning. |

Andere onderdelen van de demo:
- **Twee soorten projecten:** een volledige aanbouw (muren, dak, raampartij) of enkel de raampartij in een bestaande opening.
- **Particulier of aannemer:** voor de aannemer kan een korting ingesteld worden.
- **Bestellijst** met artikelcodes en een **kopieerbare offertetekst**.
- **3D:**
  - baksteen, ceder of thermowood in verticale planken, glas en een plat dak met lichtstraat of koepel;
  - zichten schuin, voor, zij en boven.

## 3. Wat we nog moeten toevoegen (voorstel, in volgorde)

1. **Echte systeemgegevens** per leverancier (Reynaers, Schüco, Aluprof en anderen): maximale maten en gewichten, Uf, aanzichten, kostprijzen en levertermijnen. De waarden in de demo zijn **voorbeelden**.
2. **Glasleverancier:** de echte samenstellingen (Ug, gewicht, gelaagd, zonwerend) en prijzen per m², met een minimumoppervlakte per ruit.
3. **Werkbon inmeting** voor op de tablet, met foto's en schetsen, die terugkomt in dezelfde configuratie.
4. **Offerte-PDF** met het vooraanzicht, de lijsten "inbegrepen" en "niet inbegrepen" en een handtekening. Daarna de **koppeling met Missing Link**: offerte, order, bestelbon naar de leverancier en planning van de plaatsing.
5. **Meer producttypes:**
   - draairamen en kipramen, voordeuren met panelen, vaste ramen en combinaties (bovenlicht, zijlicht);
   - rolluiken;
   - vliegenramen;
   - vensterbanken.
6. **Productiegegevens:**
   - zaaglijst van de profielen (lengtes per stuk, optimalisatie per staaf);
   - glasbestelling per ruit;
   - beslag per vleugel.
7. **Meerdere posities per offerte** (raam 1, raam 2, deur …), met een totaal en een korting per offerte.
8. **Meerwerkbon:** wijzigingen na de offerte als aparte, door de klant goedgekeurde regel.

## 4. Te verifiëren (niet blind overnemen)

- **Veiligheidsglas (NBN S 23-002):** de regel "gelaagd glas bij glas tot op de vloer" komt uit forums en uit de beschrijving van de norm bij Buildwise. De exacte voorwaarden (hoogte boven de vloer, valhoogte, zijde) moeten nagekeken worden in de norm zelf.
- **Uw ≤ 1,5 W/m²K:** dit is een richtwaarde voor nieuwbouw (Test-Aankoop, EPB-pedia). De eis verschilt per jaar van de aanvraag en per soort werk. De EPB-verslaggever beslist.
- **Ug 1,0 / 0,6 en ψ 0,06:** dit zijn typische waarden, geen certificaatwaarden.
- **Btw 6 %:** voorwaarden zoals woning ouder dan 10 jaar, privéwoning en attest. Te controleren bij FOD Financiën en door de boekhouder.
- **Vergunning:** de vrijstellingen verschillen per gemeente en per situatie. De grens van 40 m² is alleen een signaal.
- **Systeemgrenzen van de fabrikanten:** deels uit documentatie van derden (bv. Reynaers CP 130: 300 kg, ventilatiehoogte tot 2784 mm). Vraag de technische fiches op bij de leverancier.

## 5. Bronnen

- Paradigm: [quoting errors bij ramen en deuren](https://myparadigm.com/blog/solutions-quoting-errors-cause-problems-window-and-door-manufacturers/)
- Hive CPQ: [doors and windows](https://hivecpq.com/en/industries/cpq-for-doors-and-windows)
- Kolonell: [CPQ product configurator cost](https://kolonell.com/en/blog/cpq-product-configurator-cost-manufacturer-toronto-2026)
- Werkspot: [offerte van een aannemer uitgelegd](https://www.werkspot.nl/uitbouw-renovatie/artikelen/offerte-van-een-aannemer-uitgelegd)
- Buildwise: [NBN S 23-002](https://www.buildwise.be/en/publications/standards-regulations/nbn-s-23-002-fr)
- EPB-pedia:
  - [U-waarde bij verbouwen](https://www.vlaanderen.be/epb-pedia/epb-plichtig-toepassing-en-eisen/epb-eisen/u-en-r-waarde/u-waarde-bij-vernieuwen-verbouwen-of-na-isoleren)
  - [EPB-eisen vanaf 2025](https://www.vlaanderen.be/epb-pedia/epb-plichtig-toepassing-en-eisen/epb-eisentabellen-per-aanvraagjaar/epb-eisen-bij-bouwaanvraag-melding-vanaf-2025)
- Test-Aankoop:
  - [dossier EPB](https://www.test-aankoop.be/woning-energie/kopen/dossier/epb)
  - [publieke klachten](https://www.test-aankoop.be/klagen/publieke-klachten?page=2279)
- Juridisch Forum: discussies over meerwerk en aannemers (bv. [topic](https://juridischforum.be/viewtopic.php?p=188189))
- Rehau: [Geneo hef-schuifdeuren (pdf)](https://www.rehau.com/downloads/258752/geneo-hefschuifdeuren.pdf)
- Reynaers CP 130 via [jidipi](https://construction.jidipi.com/d00088687/en/reynaers-conceptpatio-130-sliding-door)
