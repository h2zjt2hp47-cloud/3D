# Plan: de app voor techniekers (iPhone en Android)

Opgesteld 06-11-2026 voor Jonas en voor de sessie die Missing Link op de mini bouwt.
Volgt het plan-formaat van `REGELS.md` §1: gemeten, vorm, grens, omvang.
Bronnen: `cloud/analyse/ANALYSE-APP-TECHNIEKERS.md` (07-10), het overzicht
“Wat Missing Link vandaag biedt voor onderweg” (06-11, `proef/samen` 3201f953a),
en de tekeningen `docs/tekeningen/app-missing-link.html` in de repo `3d`.

## Beslist

- **Jonas, 06-11:** de app komt als **aparte app in deze repo** (map `app/`), die met
  de API van Missing Link praat. De sessie op de mini sluit Missing Link aan op de
  afspraken in `API-AFSPRAKEN.md`.
- **Jonas, 06-11:** de app neemt de **huisstijl van de firma** over: de twee kleuren
  uit `firmahuisstijl` en het logo uit `firmalogo`. De kleuren met een betekenis
  blijven vast (regel 20).
- **Eén gedeelde app** “Missing Link” in de stores; het logo van de firma staat in de app.

## Gemeten

| Wat | Stand | Hoe gemeten |
|---|---|---|
| API met sleutel per toestel, rechten nooit breder dan de gebruiker, Idempotency-Key, If-Match | bestaat | `toepassing/src/lib/api/metSleutel.ts`, `herhaalsleutel.ts` op `main`; overzicht 06-11 |
| Routes mijn-week, mijn-week/klaar, werkbonnen, werkbonnen/{id} met regels, afwerken, teller, fotos | bestaan op `proef/samen` | overzicht 06-11, **vorm van de antwoorden niet gezien** |
| Toestel koppelen, werkbon aanmaken via de API, bestanden opladen, mijn wagen, huisstijl via de API | **bestaan niet** | techniekersanalyse §6; overzicht 06-11 |
| Werkbon zonder bereik in de browser | **bestaat niet**; op 25-10 ging een ingave verloren terwijl het scherm “niets verloren” zei | overzicht 06-11, M2 |
| Huisstijl van de firma | twee kleuren plus logo, afgeleide kleuren berekend in `lib/huisstijl.ts` | tak `claude/huisstijl`, migratie 141 |

**Wat deze meting niet ziet:** de code van `proef/samen` staat niet op GitHub. De
juiste vorm van de bestaande antwoorden (veldnamen) is dus niet gezien. Daarom staat
alle vertaling tussen API en app in **één bestand** (`src/lib/api.ts`), zodat de
aansluiting op één plaats gebeurt.

## Vorm

**Gekozen:** een eigen app met webtechniek (React en TypeScript, zoals Missing Link),
in een schil voor de stores (Capacitor). Offline is de kern: alles wat de technieker
doet, komt eerst op het toestel en in een wachtrij, en gaat naar de server zodra er
bereik is. Elke handeling draagt een eigen Idempotency-Key; een werkbon die op het
toestel ontstaat, krijgt een uuid en pas bij binnenkomst een nummer.

**Verworpen, met hun prijs:**

| Vorm | Waarom niet |
|---|---|
| Het app-deel binnen de Next-toepassing (PWA) met een schil erom (voorstel J1 van de analyse) | De beste vorm op lange termijn (één codebasis), maar de code staat op de mini en niet hier. Jonas koos op 06-11 voor een aparte app. Prijs van de gekozen vorm: de schermen bestaan twee keer (website en app). |
| Volledig eigen app per platform (Swift en Kotlin) | Twee codebases, twee talen die niemand in het project gebruikt. |
| De website in een schil laden (alleen een adres) | Werkt niet zonder bereik, en Apple weigert een app die alleen een website toont. |

## Grens

- **Niet aangeraakt:** `toepassing/`, `db/`, en alles buiten `app/`. De app praat
  enkel via de API. Wat er in Missing Link bij moet, staat in `API-AFSPRAKEN.md`
  en wordt gebouwd door de sessie op de mini.
- **Nooit een bedrag** op het scherm of op het toestel. De app vraagt artikels enkel
  met `fields=id,nummer,omschrijving,eenheid`.
- **Nooit gps bijhouden.** Navigeren opent de kaarten-app van de telefoon.
- **Enkel verzonnen gegevens** in de proefserver en de proeven.
- **Afmelden of een ingetrokken toestel wist alles** op het toestel.

## Omvang (eenheden)

| Stap | Wat | Eenheden |
|---|---|---|
| 1 | Plan, API-afspraken, proefserver met verzonnen gegevens | 3 |
| 2 | Opslag op het toestel en wachtrij, met proeven die bijten | 3 |
| 3 | Schermen: koppelen, Mijn dag, werkbon (uren, materiaal, foto, notitie), laten tekenen, afwerken | 6 |
| 4 | Huisstijl van de firma | 1 |
| 5 | Doorloop van begin tot einde met bereik weg en terug (Playwright, 390 breed) | 2 |
| 6 | Schil voor iPhone en Android (Capacitor), bouwen op de mini | 2 |
| Later | Scannen, NFC, Bluetooth-meter, push, “ben je op de werf?”, vergrendelscherm | per functie 1 à 2 |

## Wat deze eerste versie niet doet

- Geen echte koppeling met Missing Link zolang de routes uit `API-AFSPRAKEN.md`
  er niet zijn. Tot dan draait alles tegen de proefserver.
- Geen iPhone-bouw in de cloud: Xcode draait enkel op de mini.
- Scannen met de camera enkel waar de browser het kan (Android); de scanner van
  het toestel komt met de eerste plugin.
- Geen controle door iemand anders: “af” vraagt een gebruiksronde door een andere
  sessie of door Jonas (regel 6).
