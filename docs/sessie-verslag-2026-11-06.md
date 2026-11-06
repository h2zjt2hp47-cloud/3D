# Sessieverslag 6 november 2026: marktonderzoek, app-analyses en start van de app voor Missing Link

Een volledige stand van wat er in deze sessie gebeurde, om op een andere plaats
(bv. op de Mac mini) verder te werken. Alles wat hieronder als “gepusht” staat, staat
op GitHub. Wat “niet gepusht” is, staat alleen in deze cloudsessie, plus als kopie in
`docs/sessie-verslag-bijlagen/`.

## 1. Waar alles staat

| Wat | Waar | Stand |
|---|---|---|
| Marktonderzoek: de configurator verkopen | `docs/marktonderzoek-verkoopbare-app.md` (repo `3d`) | gepusht |
| Marktonderzoek: eigen App Store-app, los van Missing Link | `docs/marktonderzoek-appstore.md` (repo `3d`) | gepusht |
| Analyse: wat een app toevoegt aan Missing Link (incl. §12: wat een app toevoegt bovenop offline in de browser) | `docs/analyse-app-missing-link.md` (repo `3d`) | gepusht |
| Tekeningen van de app, 10 schermen, met huisstijl van de firma | `docs/tekeningen/app-missing-link.html` en twee PNG's (repo `3d`) | gepusht |
| Pull request met al het bovenstaande | [h2zjt2hp47-cloud/3D#4](https://github.com/h2zjt2hp47-cloud/3D/pull/4), branch `claude/eager-ramanujan-irc7go`, als concept | open |
| Plan voor de app (REGELS-formaat) | `app/PLAN.md` op branch `claude/app-techniekers` in repo `missing-link` | **niet gepusht**; kopie in `docs/sessie-verslag-bijlagen/PLAN.md` |
| API-afspraken tussen app en Missing Link | `app/API-AFSPRAKEN.md`, idem | **niet gepusht**; kopie in `docs/sessie-verslag-bijlagen/API-AFSPRAKEN.md` |
| Begin van `app/package.json` | idem | **niet gepusht**; kopie in `docs/sessie-verslag-bijlagen/app-package.json` |

De zes commits van deze sessie in repo `3d` (branch `claude/eager-ramanujan-irc7go`):
`37c0b27` marktonderzoek configurator · `dad2517` App Store-app · `3329478` tweede ronde
opties · `88dab55` analyse app Missing Link · `c31dda3` §12 app bovenop offline ·
`ca6bdc7` tekeningen. Elke commit: `npm test` (249 tests) en `npm run typecheck` groen;
geen codewijziging, dus geen beeldvergelijking.

## 2. Verloop, vraag per vraag

### 2.1 “Analyse voor een app die verkoopbaar is, eventueel een game. Grondig marktonderzoek van wat er ontbreekt.”
Eerst gelezen als: de configurator verkopen. Uitkomst (`marktonderzoek-verkoopbare-app.md`):
- Gat: een betaalbare, Nederlandstalige configurator voor KMO's die met offertes werken
  (regels in Excel-taal, 3D zonder dure modellen, ERP-koppeling). Concurrenten zitten
  ofwel bij webshops (Zakeke) ofwel bij dure projecten (Expivi vanaf ± $500/maand, Threekit).
- Tweede poot: ramen en deuren met de Vlaamse renovatieplicht en premies.
- Belgische markt alleen is klein (ruwe schatting ± € 90 000/jaar voor één sector).
- Game: geen game over stofferen of meubels op maat; alleen als klein experiment.

### 2.2 “Ik bedoel een app voor de App Store” en “los van Missing Link of wat we nu doen”
Uitkomst (`marktonderzoek-appstore.md`), 15 ideeën in twee rondes met een score:
- App Store: ± 600 000 nieuwe apps in 2025, downloads groeien nauwelijks; niche wint.
- Koplopers: **Oplevering** (score 20: een Belgische particulier helpt zijn nieuwbouw of
  verbouwing correct opleveren) en **Past het?** (17: met LiDAR nagaan of een meubel door
  deur, gang en trap kan). Ook **Huisboekje** (17) en **Verhuis** (15): samen een familie
  van woon-apps voor hetzelfde publiek.
- Afgeraden: offerte-check (SCOPR.ai bestaat al), tuinplanner, stadsspel, werkbon-Peppol-app,
  losse mobiele game.

### 2.3 “Kunnen we een app maken voor Missing Link? Analyse wat een app kan toevoegen.”
Vastgesteld: Missing Link is het eigen ERP (koppeling `ik`: Jonas zaakvoerder van
Missing Link AI). Repo `missing-link` gekoppeld (eerst lezen). Er bestond al
`cloud/analyse/ANALYSE-APP-TECHNIEKERS.md` (07-10) met 12 schermen, bouwstappen A1–A9
(± 18 bouwdagen, MVP ± 8,5) en open beslissingen J1–J10. Uitkomst
(`analyse-app-missing-link.md`):
- Een app telt vooral buiten het kantoor: technieker eerst, dan werfleider en uren,
  dan verkoper en magazijn, dan zaakvoerder.
- Concurrenten (Robaws/Wappy, Teamleader, Simpro, Simple-Simon, Outsmart, Odoo) hebben
  allemaal een app; Odoo's field service werkt niet offline.
- Verplichtingen: Checkin@Work (werven vanaf € 500 000) en wellicht verplichte
  tijdsregistratie vanaf 1 januari 2027 (nog niet definitief).
- Advies: app ná de start van de pilots, J1–J10 nu beslissen; mijn kijk: eens met alle
  voorstellen, plus vooraf vastleggen wanneer de schil komt, en push in versie 2.

### 2.4 “We hebben al offline in de browser, wat voegt een app toe?” (met het overzicht van 6/11)
Uit het overzicht van `proef/samen` 3201f953a: offline in de browser = alleen Mijn week
lezen en “Klaar”, standaard uit; de werkbon werkt niet zonder bereik; op 25-10 ging een
ingave verloren terwijl het scherm “niets verloren” zei. Uitkomst (§12 van de analyse):
- De werkbon zonder bereik moet sowieso gebouwd worden; een app bespaart dat niet.
- Alleen een app (of schil) geeft: opslag die iOS niet wist, versturen op de achtergrond,
  Bluetooth (laserafstandsmeter voor ramen en deuren), NFC (machines), betrouwbaar
  scannen, meldingen, “ben je op de werf?” zonder gps te bewaren, widget en
  vergrendelscherm, sleutel veilig op het toestel, makkelijke installatie.

### 2.5 “Graag eerst tekeningen. Kan de huisstijl van de firma overgenomen worden?”
Ja: Missing Link heeft `firmahuisstijl` (twee kleuren: actie en zijbalk; afgeleide
kleuren in `lib/huisstijl.ts`, leesbaarheid gecontroleerd bij het kiezen) en `firmalogo`
(branch `claude/huisstijl`, migratie 141). Lettertypes Newsreader en Karla. Tekeningen:
10 schermen (koppelen, Mijn dag iPhone en Android, werkbon, materiaal, laten tekenen,
afwerken zonder bereik, vergrendelscherm, machine via NFC, opmeten met laser), met een
knop om te wisselen tussen de standaardstijl en een verzonnen voorbeeldfirma.
Voorstel: één gedeelde app “Missing Link” met het logo van de firma in de app.

### 2.6 “Ok go” en de start van de bouw
- De actuele code (`proef/samen`) staat **niet** op GitHub; GitHub heeft `main` van 07-10
  en enkele oudere branches. Vraag aan Jonas; **beslist: aparte app in de repo
  `missing-link`, map `app/`, die via de API werkt.**
- Schrijfrechten op `missing-link` aangevraagd; branch `claude/app-techniekers` gemaakt.
- `app/PLAN.md` geschreven volgens REGELS (gemeten, vorm met verworpen vormen en hun prijs,
  grens, omvang in eenheden).
- `app/API-AFSPRAKEN.md` geschreven: welke routes de app verwacht, met vorm, en wat
  **bestaat** (mijn-week, mijn-week/klaar, werkbonnen, regels, afwerken, fotos, artikels,
  ik) en wat **nieuw** moet (toestellen/koppelen, ik.huisstijl en ik.logo, ik/wagen,
  POST werkbonnen, PUT bestanden, CORS voor `capacitor://localhost` en `https://localhost`).
- `npm install` van de pakketten: react 19.1.0, react-dom en `@capacitor/core` 8.6.0 gelukt;
  de tweede installatie (devDependencies) **liep mis op een versieconflict**
  (waarschijnlijk `@vitejs/plugin-react` tegenover vite 6). Niet opgelost; de bouw is daar
  op vraag van Jonas gestopt.

## 3. Beslissingen van Jonas in deze sessie

| Wanneer | Beslissing |
|---|---|
| 6/11 | Het onderzoek gaat ook over een eigen App Store-app, los van Missing Link en de configurator |
| 6/11 | De app voor Missing Link komt als aparte app in de repo `missing-link`, map `app/`, via de API |
| 6/11 | De app neemt de huisstijl van de firma over (twee kleuren en logo uit Missing Link) |
| 6/11 | “Ok go” op de tekeningen; voorstel één gedeelde app niet tegengesproken |

## 4. Het bouwplan voor de app (verder te zetten)

Gekozen vorm: React en TypeScript (zoals Missing Link) in een Capacitor-schil voor iPhone
en Android, offline als kern. Opbouw die gepland was in `app/`:

```
app/
  PLAN.md, API-AFSPRAKEN.md, LEESMIJ.md
  package.json, tsconfig.json, vite.config.ts, capacitor.config.ts (appId one.missinglink.app), index.html
  src/
    lib/api.ts        alle vertaling tussen API en app op één plaats; Idempotency-Key, If-Match, foutzin
    lib/opslag.ts     IndexedDB: instellingen, werkbonnen, wachtrij, bestanden
    lib/wachtrij.ts   in volgorde versturen; geen bereik = stoppen en later opnieuw;
                      422/409 = zin bij de werkbon en doorgaan; 401 = alles wissen en opnieuw koppelen
    lib/werkbon.ts    werkbon op het toestel: start, uren, verplaatsing, materiaal, notitie, foto,
                      afwerken met handtekening (momentopname) of reden; nieuwe werkbon met uuid
    lib/huisstijl.ts  kleuren uit /ik op de pagina zetten
    schermen/         Koppelen, MijnDag, Werkbon, Uren, Materiaal, Notitie, Tekenen, Afgewerkt, Meer
  proefserver/server.mjs   volgt API-AFSPRAKEN letterlijk, verzonnen gegevens, CORS
  test/                    vitest (wachtrij, werkbon, api) + doorloop met Playwright op 390 breed,
                           bereik weg en terug, en controle dat er nergens een bedrag staat
```

Stappen en omvang (uit `PLAN.md`): plan en proefserver 3 · opslag en wachtrij 3 ·
schermen 6 · huisstijl 1 · doorloop 2 · schil 2 eenheden. Later: scannen, NFC,
Bluetooth-meter, push, “ben je op de werf?”, vergrendelscherm.

## 5. Open punten

1. **Plan en API-afspraken vastleggen en pushen** op `claude/app-techniekers` in
   `missing-link` (nu alleen lokaal; kopie in de bijlagen van dit verslag).
2. **Versieconflict bij `npm install`** oplossen (vite 6 tegenover `@vitejs/plugin-react`;
   of vite 7 gebruiken als Missing Link dat toelaat).
3. **De sessie op de mini** moet de vorm van de bestaande antwoorden (mijn-week, werkbonnen)
   naast `API-AFSPRAKEN.md` leggen, en de nieuwe routes bouwen.
4. **Beslissingen J1–J10** uit de techniekersanalyse staan nog open; J1 is in feite
   beantwoord door de keuze voor een aparte app.
5. **J5: waar foto's en handtekeningen bewaard worden** (nodig voor `PUT /bestanden`).
6. Uit het marktonderzoek: datum “Checkin@Work vanaf 1 april 2027” in `PROJECTEN.md`
   nakijken; stand van de wet op tijdsregistratie volgen.
7. PR [h2zjt2hp47-cloud/3D#4](https://github.com/h2zjt2hp47-cloud/3D/pull/4) staat als
   concept; deze sessie volgt hem op.

## 6. Verder werken op de Mac

- **Deze sessie naar de Mac halen:** in de Claude Code-app bij deze sessie “Open in CLI”,
  en het `claude --teleport …`-commando uitvoeren op de Mac in een map met de repo.
- **Of Remote Control:** Claude Desktop › Instellingen › Claude Code › Remote Control, of
  `claude remote-control` in een terminal in de werkmap.
- Uitleg: [code.claude.com/docs/en/claude-code-on-the-web](https://code.claude.com/docs/en/claude-code-on-the-web).
- De iPhone-app bouwen kan alleen op de Mac (Xcode). Volgens het overzicht van 6/11 wordt
  er niets gebouwd op de MacBook; bouwen en testen gebeurt op de mini.
