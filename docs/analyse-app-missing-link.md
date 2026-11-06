# Analyse: wat kan een app toevoegen aan Missing Link?

*Opgesteld op 6 november 2026. Bouwt verder op de bestaande analyse in de repo van Missing Link: `cloud/analyse/ANALYSE-APP-TECHNIEKERS.md` (7 oktober 2026, verder “de techniekersanalyse”). Die beschrijft de app voor techniekers tot op het scherm en de bouwstap; dit document kijkt breder: **voor wie, waarom, wat de markt doet, en in welke volgorde**. Labels: **[ML]** = nagekeken in de code of documenten van Missing Link, **[bron]** = gevonden op het web (§11), **[inschatting]** = eigen redenering.*

*Let op: de lokale kopie van Missing Link is `main` van 7 oktober. Werkbon, planning, Mijn week, voorraad en machines staan volgens de documenten op de tak `proef/samen` en waren hier niet na te kijken [ML].*

## 1. Kort antwoord

> **Aanvulling 6/11:** de vraag “we kunnen al offline in de browser, wat voegt een app dan toe?” is uitgewerkt in **§12**, op basis van de stand van `proef/samen` (3201f953a) die Jonas aanleverde. Kort: offline in de browser dekt vandaag alleen Mijn week en “Klaar”, en staat standaard uit. De werkbon zelf werkt nog niet zonder bereik. Dat moet sowieso gebouwd worden, of het nu een website of een app wordt. Een app voegt daarbovenop vooral toe: betrouwbare opslag, versturen op de achtergrond, Bluetooth en NFC, meldingen, “ben je op de werf?” zonder gps te bewaren, en de integratie met de telefoon zelf.


- **Ja, een app voegt echt iets toe, maar vooral buiten het kantoor.** Op kantoor volstaat de website. Wie op de baan zit (technieker, monteur, plaatser, werfleider, verkoper bij de klant, zaakvoerder onderweg) heeft dingen nodig die een website op de gsm slecht of niet doet: **werken zonder bereik, de camera, de klant laten tekenen, meldingen, en alles in één of twee tikken**.
- **De grootste winst zit bij de technieker**: de papieren werkbon verdwijnt, uren en materiaal komen dezelfde dag binnen, en kantoor kan sneller factureren. De techniekersanalyse heeft dit al tot op het scherm uitgewerkt (12 schermen, bouwstappen A1–A9, ± 18 bouwdagen, eerste bruikbare versie ± 8,5) [ML].
- **De markt verwacht het.** Alle Belgische en Nederlandse concurrenten hebben een app voor op de baan (Robaws met Wappy, Teamleader, Simpro, Simple-Simon, Outsmart, Odoo) [bron]. Zonder app verlies je verkoopgesprekken bij installateurs, elektriciens en machinebedrijven: precies de sectoren van de drie pilots (ramen en deuren, machines, elektricien) [ML].
- **Twee verplichtingen komen eraan die een app interessant maken**: de aanwezigheidsregistratie op grote werven (Checkin@Work) [bron], en wellicht een **verplichte tijdsregistratie voor werknemers vanaf 1 januari 2027** (nog niet definitief) [bron]. Een app die begin- en einduur vastlegt, lost dat in één beweging op. Het datamodel van Missing Link houdt hier al rekening mee (begin- en einduur plus werf) [ML].
- **Waar Missing Link zich kan onderscheiden:** werken zonder bereik (Odoo zegt zelf dat zijn field service niet offline werkt) [bron], dezelfde rechten als op het scherm zonder tweede lijst, geen gps-tracking, machinehistoriek met garanties, en een app die met elke update meekomt, ook bij klanten met een eigen server [ML].
- **Advies:** blijf bij de beslissing om de app ná de start van de pilots te bouwen [ML], maar **beslis nu al J1–J10** uit de techniekersanalyse, zodat niets van wat nu gebouwd wordt de app in de weg zit. Daarna: eerst de technieker, dan uren en tijdsregistratie, dan pas de andere rollen.

## 2. Waar Missing Link vandaag staat

| Bouwsteen | Stand | Bron |
|---|---|---|
| Website op de gsm | Schermen zijn mee getest op een smal scherm (“Een telefoon telt mee”), maar beslist werd: “de gsm enkel voor wat beslist is” | [ML] `REGELS.md`, `BESLISSINGEN-25-26-09.md` |
| “Mijn week” | Een pagina voor de technieker op zijn gsm: eigen blokken, zonder bedragen, knop “Klaar: 8 u” die begin- en einduur plus werf bewaart. Dit is de terugmelding “zonder app” | [ML] `PAKKETPLAN-PLANNING.md` (op `proef/samen`) |
| Werkbon | Tabel, reeks `WB{jaar}-{nr}`, uren en materiaal, afwerken alleen met handtekening of reden, factuur van één of meer bonnen | [ML] techniekersanalyse §1 |
| Koppeling (API) | REST met sleutel per koppeling, rechten per onderdeel, Idempotency-Key en If-Match. Werkbonnen gedeeltelijk (lezen, regels, afwerken); **planning, uren, voorraad, machines (deels) en bestanden ontbreken** | [ML] `openapi.yaml`; via de live koppeling: “werkbonnen” en “planning” worden geweigerd |
| Toestellen | Tabel `toestel` met intrekken per toestel en spoor per wijziging; **koppelen van een gsm bestaat nog niet** | [ML] |
| Offline | Alleen een kleine wachtrij voor “Klaar” in Mijn week | [ML] |
| Foto's | Waar ze bewaard worden, is nog niet beslist (J5) | [ML] |
| Meldingen | E-mail ja; push en webhooks nee | [ML] |
| Bereikbaarheid van buitenaf | Beslist 27/9: via het portaal van Missing Link, “de klantserver belt uit”, één certificaat op het portaal | [ML] `cloud/analyse/LATER.md` |
| Beslissing over de app | **Later**: niet vóór de pilots; tot dan “Mijn week” | [ML] `BESLISSINGEN-25-26-09.md`, `PAKKETPLAN-PLANNING.md` |

**Belangrijk:** de beslissing van 27/9 over het portaal lost het grootste technische probleem van een app op (een gsm die buiten het kantoor de server moet bereiken, met https). Die keuze is dus ook een keuze vóór de app [inschatting].

## 3. Wat een app toevoegt ten opzichte van de website op de gsm

| Wat | Website op de gsm | Webapp op het beginscherm (PWA) | App in de store (of schil rond de webapp) |
|---|---|---|---|
| Werken zonder bereik (kelder, nieuwbouw, platteland) | nee | ja, maar op iPhone alleen synchroniseren met de app open [bron] | ja, ook op de achtergrond |
| Foto's bij de werkbon of het project | via bestandskeuze | ja (camera) | ja, plus verkleinen en in de wachtrij |
| Handtekening van de klant | moeizaam | ja | ja |
| Meldingen (“nieuw werk op je dag”, “offerte aanvaard”) | nee | ja op iPhone vanaf iOS 16.4, alleen als de app op het beginscherm staat [bron] | ja |
| Barcode of QR scannen (machine, artikel, wagen) | beperkt | beperkt | ja |
| Altijd aangemeld, één tik tot “Mijn dag” | nee | ja | ja |
| Bellen, navigeren, delen (WhatsApp, mail) | ja | ja | ja |
| Updates | vanzelf | vanzelf, mee met de server | via de store (of vanzelf bij een schil) |
| Kost en onderhoud | geen | laag | hoger (stores, tweede uitgave) |

**Conclusie:** de PWA-weg uit de techniekersanalyse (J1) dekt bijna alles. Alleen werken zonder bereik op iPhone en barcodes scannen zijn duidelijk beter in een app-schil. Een schil eromheen kan later zonder de code te herschrijven [ML]. Apple laat een app toe die niet publiek vindbaar is (alleen via een link), of die privé aan één bedrijf gegeven wordt [bron]. Zo blijft de app alleen voor klanten van Missing Link.

## 4. Wat een app per rol oplevert

| Rol | Wat de app doet | Wat het oplevert | Voorrang |
|---|---|---|---|
| **Technieker / monteur / plaatser** | Mijn dag, navigeren, start, uren, materiaal uit de wagen, foto's, handtekening, afwerken, onvoorziene opdracht, machinehistoriek (QR) [ML] | Geen papieren werkbon meer, uren en materiaal dezelfde dag binnen, minder vergeten materiaal op de factuur, sneller factureren [inschatting] | **1** |
| **Werfleider / projectleider** | Projectfiche op zak: werfadres, contactpersoon, wat besteld en geleverd is, wie er vandaag staat; foto's en notities per werf; meerwerk vastleggen en laten aftekenen | Meerwerk niet meer vergeten, discussie achteraf vermijden (foto + handtekening) [inschatting] | **2** |
| **Iedereen met uren** | Begin- en einduur met één tik, ook offline; later “ik ben op de werf” voor Checkin@Work | Klaar voor de tijdsregistratie van 2027 en Checkin@Work [bron, ML] | **2** |
| **Verkoper bij de klant** | Klantfiche, vorige offertes, een snelle offerte of opmeting ter plaatse met foto's (later met de configurator), bezoekverslag inspreken | Offerte dezelfde dag in plaats van na een week [inschatting] | 3 |
| **Magazijn / chauffeur** | Picklijst met scannen, wagen aanvullen, leveringsbon laten tekenen bij levering, telling met de camera | Minder telfouten, getekende leveringsbon als bewijs [inschatting] | 3 |
| **Zaakvoerder** | “Missing Link op zak”: wat vandaag aandacht vraagt, openstaande posten, offertes die wachten, omzet; goedkeuren met één tik; melding als een grote offerte aanvaard wordt | Overzicht zonder laptop, sneller beslissen [inschatting] | 4 |
| **Klant van je klant** | Géén app: een link naar een statuspagina volstaat (staat al als idee “statuspagina eindklant”) [ML] | — | — |

## 5. Wat de markt doet

**Wat concurrenten op de baan bieden** [bron]:
- **Robaws**: een aparte werkbon-app (Wappy) voor uren, materiaal, foto's en handtekening. De algemene Robaws-app is vooral om dingen op te zoeken; offertes maken gebeurt nog in de webversie.
- **Teamleader**: werkbon in de mobiele app met uren, kilometers, materiaal, handtekening en delen via WhatsApp. Er lopen wel twee apps naast elkaar, en sommige functies zitten nog niet in de nieuwe.
- **Simpro, Simple-Simon, Outsmart**: werken offline, handtekening, foto's, uren, materiaal met barcode. Bij Outsmart kan de handtekening verplicht zijn voor een werkbon verstuurd wordt.
- **Odoo**: de field-service-module werkt **niet offline**, en Odoo zegt zelf dat dit grote wijzigingen zou vragen die niet gepland zijn. Partners bouwen er eigen offline-apps omheen.

**Waar de gaten zitten** [inschatting op basis van de bronnen]:
1. **Werken zonder bereik** is bij veel pakketten zwak of een aparte app. Missing Link heeft de bouwstenen al (Idempotency-Key, uuid op het toestel, nummer pas bij binnenkomen).
2. **Eén app voor alles**: concurrenten hebben een aparte werkbon-app of twee generaties apps. Missing Link kan één app bouwen met dezelfde rechten als het scherm.
3. **Machines en service**: weinig KMO-pakketten combineren werkbon, machinefiche, garanties en tellerstanden. Dat past bij de pilot met een machinebedrijf.
4. **Privacy**: concurrenten zoals Simpro nemen een plaatsstempel; Missing Link kiest bewust “nooit gps bijhouden” [ML]. Bij techniekers en vakbonden kan dat een argument zijn.

**Verplichtingen** [bron]:
- **Checkin@Work**: aanwezigheid registreren op werven vanaf € 500.000 (zonder btw), voor iedereen op de werf, elke dag. In Missing Link staat “vanaf 1 april 2027” genoteerd [ML]; dat zou ik nakijken.
- **Tijdsregistratie**: de federale regering wil vanaf 1 januari 2027 een registratie van de arbeidstijd verplichten; de wet ligt nog niet vast, en sommige functies (zoals mobiele werknemers) zouden uitgezonderd worden.

**Hoe ze rekenen:** per gebruiker per maand, met de app inbegrepen [bron]. In Missing Link ligt al het voorstel “volledige gebruikers + goedkope lichte gebruikers voor techniekers” [ML]. Een technieker-app is dan de reden waarom een klant tien lichte gebruikers bijneemt [inschatting].

## 6. Wat er nog moet gebeuren vóór er een app kan zijn

Uit de techniekersanalyse en de stand van de code [ML]:
1. **Een gsm koppelen** (QR-code of aanmelden) en intrekken per toestel.
2. **Ontbrekende routes in de API**: Mijn dag, mijn wagen, werkbon aanmaken (zonder nummer tot hij binnenkomt), start, bestanden (foto's en handtekening), eerder op dit adres, toestel koppelen. Voor de bredere app ook: planning, uren, projectfiche, leveringsbon tekenen.
3. **Beslissing J5: waar foto's en handtekeningen bewaard worden** (voorstel: een map naast de databank, mee in de back-up).
4. **Https overal**: opgelost via het portaal (beslist 27/9), nog na te kijken voor de klant die alleen op het eigen netwerk werkt.
5. **Uren als eigen tabel** (begin, einde, pauze, werkcode, werf), al voorzien voor K4.

## 7. Advies en volgorde

| Fase | Wat | Wanneer [inschatting] |
|---|---|---|
| **0 — nu** | J1–J10 beslissen (zie §8). Niets bouwen dat de app later in de weg zit: uuid's op alle tabellen die een gebruiker vult, begin- en einduur bij uren, bestanden los van de databank. “Mijn week” bij de pilots laten gebruiken en meten (laadtijd op 4G, wat techniekers missen). | tijdens de pilots |
| **1 — technieker (MVP)** | A1 koppelen, A2 Mijn dag en mijn wagen, A3 werkbon aanmaken en starten, A5 de webapp online. ± 8,5 bouwdagen [ML]. | na de pilotstart, met 2 techniekers van de machine- of elektriciteitspilot |
| **2 — op de werf zonder bereik** | A6 offline-wachtrij, A4 foto's en handtekening als bestand, A7 materiaal uit de wagen. | meteen erna; zonder offline geen proef in kelders [ML] |
| **3 — uren en verplichtingen** | Uren voor iedereen, Checkin@Work (“ik ben op de werf”, alleen op een tik), export voor het sociaal secretariaat | vóór 1 januari 2027 als de wet er komt |
| **4 — werfleider en verkoper** | Projectfiche, meerwerk met foto en handtekening, klantfiche, bezoekverslag | na de proef |
| **5 — zaakvoerder en magazijn** | Aandacht, openstaande posten, goedkeuren; picklijst en telling met scanner | later |
| **6 — slim** | Inspreken in plaats van typen (bezoekverslag, werkbonnotitie), aankoopfactuur of leveringsbon fotograferen en laten inlezen. Achter de ene interne AI-laag, uit te schakelen per klant [ML] | later |

**Schil of niet?** Begin als webapp (J1). Ga naar een schil (en een niet-publieke app in de store) zodra de proef toont dat iPhones gegevens verliezen, of als de pilots barcodes willen scannen. Zet dat criterium vooraf vast, zodat het geen gevoelskwestie wordt [inschatting].

## 8. Mijn kijk op de open beslissingen J1–J10

| # | Vraag | Voorstel in de analyse [ML] | Mijn kijk [inschatting] |
|---|---|---|---|
| J1 | Webapp, eigen app of schil? | Webapp, schil later mogelijk | **Eens.** Leg wel vooraf vast wanneer de schil komt (zie §7). |
| J2 | Koppelen via aanmelding of QR van kantoor? | Beide | **Eens.** QR bij de installatie door Jonas zelf: snelste start bij een nieuwe klant. |
| J3 | Https verplicht, ook op eigen server? | Ja | **Eens**, en met het portaal (27/9) is dit grotendeels opgelost. |
| J4 | Mag een technieker zelf een werkbon maken? | Ja, enkel voor zichzelf | **Eens.** Komt in elke sector voor (“als ik hier toch ben…”). |
| J5 | Waar foto's en handtekeningen? | Map naast de databank, mee in de back-up | **Eens.** Ook nodig voor projectfoto's van werfleiders. |
| J6 | Prijzen op het tekenscherm? | Nee, instelbaar | **Eens.** Bij regiewerk vragen sommige klanten het wel. |
| J7 | Wagen afboeken per regel of bij afwerken? | Bij afwerken | **Eens.** |
| J8 | Twee techniekers, één bon? | Ja | **Eens.** |
| J9 | Push in de eerste versie? | Nee | **Eens voor de MVP**, maar plan het voor de tweede versie: “je planning is gewijzigd” is bij concurrenten een basisfunctie. |
| J10 | Proef met wie? | 2 techniekers, 2 weken, iPhone én Android | **Eens.** Kies de machine- of elektriciteitspilot: daar zijn de meeste werkbonnen. |

## 9. Risico's

- **Support**: een app op 20 telefoons geeft andere vragen dan een website (“ik zie mijn dag niet”, “mijn foto is weg”). Reken support mee in de prijs van de lichte gebruiker [inschatting].
- **iPhone en webapps**: Apple heeft in 2024 bijna de webapps op het beginscherm in de EU geschrapt en dat daarna teruggedraaid [bron]. De schil is het reserveplan.
- **Te veel tegelijk**: de app is bewust “later”. Begin pas als de pilots stabiel lopen; anders vertraagt de app de rest [ML].
- **Verplichtingen veranderen**: de tijdsregistratie van 2027 ligt nog niet vast. Bouw uren zo dat ze nu al nut hebben (nacalculatie, facturatie in regie), los van de wet [inschatting].

## 10. Nog te verifiëren

- De stand van werkbon, planning en Mijn week: zie §12 (overzicht van 6/11 op `proef/samen`); een nieuwe meting op echte toestellen ontbreekt nog.
- De datum “Checkin@Work vanaf 1 april 2027” in `PROJECTEN.md`: de bronnen spreken over een regeling die al geldt voor werven vanaf € 500.000.
- De stand van de wet op tijdsregistratie (Kamer, FOD WASO).
- Prijzen van Robaws/Wappy, Teamleader, Simple-Simon en Outsmart per technieker (offerte vragen).
- Hoeveel techniekers de drie pilotklanten hebben, en welke telefoons (iPhone of Android).

## 11. Bronnen

**Concurrenten**
- [Robaws — Wappy](https://support.robaws.com/en/article/wappy-bmkzk0/) · [Robaws — app](https://support.robaws.com/en/article/robaws-app-xq6yqo/) · [Robaws in de App Store](https://apps.apple.com/be/app/robaws/id1559563155)
- [Teamleader Focus — wat kan de app](https://support.focus.teamleader.eu/hc/en-150/articles/25691083613201-What-can-the-Teamleader-Focus-app-do) · [Teamleader — werkbon via de app](https://support.focus.teamleader.eu/hc/en-150/articles/25695975988113-Video-Create-work-orders-via-the-mobile-app) · [Teamleader planning](https://teamleader.eu/lp/planning-lp)
- [Simple-Simon](https://apps.apple.com/nl/app/simple-simon/id897884395) · [Outsmart — handtekeningen](https://knowledge.out-smart.com/outsmart-knowledge-base/outsmart-knowledge-base-nl/mobiele-app/algemene-mobiele-app/handtekeningen-verzamelen) · [Outsmart — offline](https://knowledge.out-smart.com/outsmart-knowledge-base/outsmart-knowledge-base-nl/mobiele-app/algemene-mobiele-app/de-mobiele-app-offline-gebruiken) · [Simpro Mobile](https://apps.apple.com/be/app/simpro-mobile/id1419936837?l=nl) · [yellowQ FSM](https://apps.apple.com/sc/app/yellowq-fsm/id1573949443) · [KRAAN Werkbon](https://apps.apple.com/us/app/kraan-werkbon/id1401853582)
- [Odoo-forum — field service niet offline](https://www.odoo.com/forum/help-1/does-field-services-work-offline-176608) · [Odoo — offline modus](https://www.odoo.com/documentation/19.0/it/applications/general/offline_mode.html) · [Odoo Experience — eigen offline-app van een partner](https://www.odoo.com/event/odoo-experience-2021-2847/track/use-field-service-offline-on-android-and-ios-4254)

**Verplichtingen**
- [FOD WASO — Checkin@Work](https://werk.belgie.be/en/themes/international/posting/concept-and-formalities/formalities/specific-formalities-case) · [Traxxeo — Check in At Work](https://traxxeo.com/en/blog-en/human-resource-en/check-in-at-work-all-you-need-to-know/) · [Suivo — is CIAW verplicht](https://www.suivo.com/?p=39546)
- [Securex — tijdsregistratie verplicht vanaf 2027](https://www.securex.be/nl/lex4you/werkgever/nieuws/tijdsregistratie-verplicht-vanaf-2027) · [Securex — waar staan we vandaag](https://www.securex.be/nl/lex4you/werkgever/nieuws/tijdsregistratie-vanaf-2027-waar-staan-we-vandaag) · [Partena — FAQ](https://www.partena-professional.be/nl/node/22640) · [Deloitte](https://www.deloitte.com/be/en/services/tax/blogs/tax-legal-pulse-nl/verplichte-tijdsregistratie-vanaf-2027-wat-betekent-dit-voor-uw-onderneming.html) · [VRT NWS](https://www.vrt.be/vrtnws/nl/2025/11/28/tijdsregistratie-vanaf-2027-verplicht-advocaat-arbeidsrecht-elis/)

**Techniek en verdeling**
- [MagicBell — beperkingen van webapps op iPhone](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) · [MobiLoud — webapps op iOS](https://www.mobiloud.com/blog/progressive-web-apps-ios)
- [Kandji — app-verdeling door Apple](https://blog.kandji.io/apple-app-distribution) · [ITPro — niet-publieke apps in de App Store](https://itpro.com/software/business-apps/362097/apple-app-store-now-accepts-unlisted-apps) · [GoodBarber — privé-app voor een bedrijf](https://www.goodbarber.com/help/publish-your-ios-app-yourself-solo-r75/distribute-your-ios-app-as-a-custom-app-a355/)

**Missing Link (repo `h2zjt2hp47-cloud/missing-link`, `main` 7/10)**
- `cloud/analyse/ANALYSE-APP-TECHNIEKERS.md` · `cloud/PAKKETPLAN-PLANNING.md` · `cloud/BESLISSINGEN-25-26-09.md` · `cloud/analyse/LATER.md` · `PROJECTEN.md` · `toepassing/api/openapi.yaml` · `db/DOCUMENTOPSLAG.md`

## 12. Aanvulling 6/11: wat voegt een app toe als de browser al offline kan?

*Op basis van het overzicht “Wat Missing Link vandaag biedt voor onderweg (06-11)”, gelezen op `proef/samen` 3201f953a (niet zelf nagekeken; de metingen M1 van 16/10 en M2 van 25/10 zijn ouder).*

### 12.1 Wat de browser vandaag zonder bereik doet

| Zonder bereik | Stand [ML, overzicht 6/11] |
|---|---|
| Schakelaar “Werkbonnen zonder verbinding” | **staat standaard uit** |
| Mijn week lezen, ook bij een koude start | werkt als de schakelaar aan staat (M1) |
| “Klaar” melden, blijft op het toestel tot de server het heeft | werkt als de schakelaar aan staat |
| Werkbon openen, uren, materiaal, foto, handtekening, afwerken | **werkt niet**; op 25/10 ging een ingave verloren terwijl het scherm “niets verloren” meldde (M2) |
| Synchroniseren via de API | niet gevonden |
| Pushberichten | niet gevonden |

**Eerste conclusie:** het grote gat is niet “browser of app”, maar **de werkbon zonder bereik**. Dat werk (wachtrij, uuid op het toestel, nummer pas bij binnenkomst, conflicten, “afmelden wist”, geraamd op 18–27 werkdagen in `ANALYSE-OFFLINE-WERKBON.md`) is nodig voor een website én voor een app. Een app bespaart dat werk niet. De fout uit M2 (ingave weg terwijl het scherm “niets verloren” zegt) moet hoe dan ook eerst opgelost worden: geen enkele app lost dat op.

### 12.2 Wat alleen een app (of een schil rond de webapp) toevoegt

| # | Wat | Browser op iPhone | App of schil | Waarom het telt voor Missing Link |
|---|---|---|---|---|
| 1 | **Opslag die blijft** | Safari mag opgeslagen gegevens wissen; “blijvend bewaren” vragen kan, maar Safari beslist zelf, en het helpt vooral als de site op het beginscherm staat [bron: WebKit] | eigen opslag van de app, wordt niet gewist | een werkbon die uren op de telefoon wacht, mag nooit verdwijnen |
| 2 | **Versturen op de achtergrond** | geen Background Sync op iPhone [bron: firt.dev]: versturen gebeurt alleen met de app open | foto's en bonnen gaan door zodra er bereik is, ook met de app dicht [bron: Capacitor-plugins] | de technieker steekt zijn gsm weg na het afwerken; nu moet hij wachten tot alles verstuurd is |
| 3 | **Bluetooth** | geen Web Bluetooth op iPhone [bron: firt.dev] | ja [bron: Capacitor-plugins] | **ramen en deuren**: maten rechtstreeks uit een laserafstandsmeter (Leica DISTO, Bosch GLM) in de opmeting [bron]; labelprinter in het magazijn |
| 4 | **NFC** | geen Web NFC op iPhone [bron: firt.dev] | ja [bron] | **machines**: tik met de gsm op een sticker op de machine en de fiche gaat open |
| 5 | **Scannen** | QR of barcode via de camera kan met een bibliotheek, maar trager en minder betrouwbaar [inschatting] | live scannen met de scanner van het toestel (ML Kit) [bron] | materiaal met EAN-code, machineplaatjes, picklijsten |
| 6 | **Meldingen** | kan op iPhone vanaf iOS 16.4, alleen als de app op het beginscherm staat [bron]; Missing Link heeft nog geen push | betrouwbaar, met knoppen in de melding | “je planning van morgen is gewijzigd”, “nieuwe dringende interventie” |
| 7 | **“Ben je op de werf?” zonder gps te bewaren** | geen geofence | de telefoon merkt zelf dat hij bij het werfadres is en vraagt “Starten?”; er gaat geen locatie naar de server [inschatting] | past bij “nooit gps bijhouden” én helpt bij Checkin@Work en tijdsregistratie |
| 8 | **Integratie met de telefoon** | beperkt | widget “Mijn dag” op het beginscherm; lopende werkbon met tijd op het vergrendelscherm (Live Activity) [bron]; foto's of pdf's uit een andere app “delen naar” een werkbon of project; Siri/Opdrachten (“start werkbon”) | minder tikken, minder vergeten uren |
| 9 | **Veiligheid en beheer** | sleutel in browseropslag | sleutel in de sleutelhanger van de telefoon, Face ID, en voor grotere klanten beheer via MDM (serveradres en sleutel uitrollen, op afstand wissen) [inschatting] | een verloren gsm, een klant met eigen IT |
| 10 | **Installeren** | op iPhone handmatig “Zet op beginscherm”, zonder voorstel [bron]; offline staat nu standaard uit | uit de store of via een link; offline kan standaard aan | techniekers zijn geen IT'ers: één installatieweg die altijd werkt |

**Wat een app níet toevoegt:** rechten (dezelfde als het scherm), “nooit een bedrag voor de technieker”, de API met sleutels per toestel: die bestaan al [ML]. Ook inspreken via het toetsenbord en de camera werken al in de browser.

### 12.3 Welke soort app

- **Een schil rond de bestaande webapp (bv. Capacitor)**, geen volledig eigen app. Reden: de schermen, de offline-werkbon en de rechten worden één keer gebouwd, en de schil voegt alleen de extra's van §12.2 toe, één voor één [inschatting]. Een volledig eigen app zou de hele API nodig hebben, en daar ontbreken nog routes (uren, verhuur, synchronisatie) [ML].
- **Bouwen op de Mac mini**: daar kan Xcode draaien; op de MacBook wordt niets gebouwd [ML].
- **Verdelen als niet-publieke app** (alleen via een link) of privé per klant via Apple Business Manager [bron, zie §3].

### 12.4 Volgorde

1. **Eerst in de browser, ongeacht de app**:
   - de werkbon zonder bereik (eerste versie volgens `ANALYSE-OFFLINE-WERKBON.md`);
   - de MUST-fouten uit M2, vooral de ingave die verloren ging;
   - offline standaard aan zetten voor de pilots;
   - een nieuwe meting op echte iPhones en Androids.
2. **Dan de schil, zodra één van deze dingen waar is** (vooraf vastleggen):
   - (a) iPhones verliezen bonnen of foto's in de proef;
   - (b) techniekers moeten wachten tot alles verstuurd is;
   - (c) een pilot wil Bluetooth, NFC of scannen;
   - (d) push is nodig en moet betrouwbaar zijn.
3. **Per pilot de eerste extra**:
   - ramen en deuren: de laserafstandsmeter via Bluetooth in de opmeting. Dit is de duidelijkste winst die alleen een app kan geven;
   - machines: NFC of QR op de machine, en een foto van de tellerstand;
   - elektricien: foto's op de achtergrond versturen en materiaal scannen.

### 12.5 Bronnen bij deze aanvulling

- [firt.dev — wat webapps op iOS kunnen](https://firt.dev/notes/pwa-ios/) (Web Bluetooth, Web NFC en Background Sync niet ondersteund)
- [WebKit — opslagbeleid](https://webkit.org/updates) · [WebKit-bug over de 7-dagenlimiet](https://bugs.webkit.org/show_bug.cgi?id=211775) · [OSNews — verduidelijking WebKit over webapps op het beginscherm](https://www.osnews.com/?p=131566)
- [MagicBell — push en beperkingen op iPhone](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [Capawesome — Capacitor-plugins](https://capawesome.io/plugins) · [Capacitor ML Kit (scannen)](https://github.com/capawesome-team/capacitor-mlkit) · [Awesome Capacitor (NFC, Bluetooth LE, uploaden op de achtergrond, Live Activities)](https://www.trackawesomelist.com/riderx/awesome-capacitor)
- [Leica DISTO — apps en verbinding](https://shop.leica-geosystems.com/measurement-tools/disto/blog/leica-disto-apps-connectivity-and-functionality-all-users) · [Leica DISTO — compatibele apps](https://www.contractors-tools.com/leica-disto-apps/) · [SketchUp-forum — Bosch-metingen overzetten](https://forums.sketchup.com/t/transferring-measurements-from-bosch-to-sketchup-in-dwg/144919)
