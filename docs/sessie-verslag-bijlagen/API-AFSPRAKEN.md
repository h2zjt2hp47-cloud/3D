# API-afspraken tussen de app en Missing Link

Wat de app verwacht van `/api/v1`. **Bestaat** = volgens het overzicht van 06-11 op
`proef/samen` (de vorm van het antwoord is daar niet gezien en moet nagekeken worden).
**Nieuw** = moet in Missing Link gebouwd worden.

De app vertaalt alles in **één bestand**: `app/src/lib/api.ts`. Wijkt een bestaand
antwoord af van wat hieronder staat, dan pas je die vertaling aan en niet de schermen.
De proefserver (`app/proefserver/server.mjs`) volgt deze afspraken letterlijk.

## Algemeen

- Elke aanvraag behalve koppelen draagt `Authorization: Bearer <sleutel van het toestel>`.
- Elke POST en PUT draagt `Idempotency-Key: <uuid>`. De app maakt die sleutel aan op
  het ogenblik van de handeling en stuurt hem bij elke nieuwe poging opnieuw mee.
  Komt hetzelfde verzoek twee keer aan, dan gebeurt het één keer (bestaat:
  `herhaalsleutel.ts`).
- Een fout antwoordt zoals de bestaande API: `{ "fout": true, "status": 422, "zin": "…" }`.
  De app toont **de zin**, dus die moet in gewone taal zijn (regel 5).
  - `401`: het toestel is ingetrokken of de sleutel klopt niet. De app wist alles en
    vraagt opnieuw te koppelen.
  - `409`: iemand anders was eerst (bv. de werkbon is al afgewerkt). De app toont de zin.
  - `422`: deze ene handeling kan niet. De app zet ze met de zin bij de werkbon en
    stuurt de volgende handelingen gewoon door.
- **CORS:** de app draait op het toestel onder `capacitor://localhost` (iPhone) en
  `https://localhost` (Android). De server moet die twee herkomsten toelaten voor
  `/api/v1`, met de koppen `Authorization`, `Idempotency-Key`, `If-Match`, `Content-Type`.
- Geen enkel antwoord aan een toestel bevat een bedrag. (De technieker ziet nooit
  een bedrag, ook niet op het toestel.)

## 1. Een toestel koppelen — **nieuw**

`POST /api/v1/toestellen/koppelen` (zonder sleutel)

```json
{ "code": "K7Q4-2M9P", "naam": "GSM Tom", "platform": "ios" }
```

Antwoord `201`:

```json
{ "sleutel": "ml_…", "toestel": { "id": "uuid", "naam": "GSM Tom" } }
```

- De code is eenmalig en kort geldig (voorstel: 10 minuten). Kantoor maakt ze bij de
  gebruiker (Instellingen › Gebruikers › Toestellen › “Gsm koppelen”) en toont ze als
  tekst én als QR-code.
- De QR-code bevat `{"server":"https://…","code":"K7Q4-2M9P"}`. Wie typt, vult het
  serveradres en de code zelf in.
- Een toestel is een `toestel` van soort `toestel`, met rechten nooit breder dan de
  gebruiker (bestaat: `lib/koppelingen.ts:179`).
- Fout: `422` met een zin als “Deze code is niet meer geldig. Vraag kantoor een nieuwe.”

## 2. Wie ben ik — **bestaat**, twee velden **nieuw**

`GET /api/v1/ik`

```json
{
  "gebruiker": { "id": "uuid", "naam": "Tom Claeys" },
  "vennootschap": "Delta Techniek",
  "huisstijl": { "actie": "#1f5fa8", "actie_donker": "#194f8d", "zijbalk": "#1d2b44", "zijbalk_tekst": "#c9d3e3" },
  "logo": "/api/v1/ik/logo"
}
```

- `huisstijl` (**nieuw**): de vier kleuren zoals `lib/huisstijl.ts` ze afleidt. De app
  rekent zelf niets uit, zodat de leesbaarheidsregel op één plaats blijft (regel 9).
  Leeg of `null` = de kleuren van het pakket.
- `logo` (**nieuw**): een adres dat het firmalogo geeft (PNG, JPEG of WebP), of `null`.

## 3. Mijn dag — **bestaat** (`mijn-week`)

`GET /api/v1/mijn-week?van=2026-11-06&tot=2026-11-07`

```json
{
  "blokken": [
    {
      "id": "uuid",
      "datum": "2026-11-06",
      "begin": "08:00",
      "einde": "10:00",
      "soort": "interventie",
      "klant": "Bakkerij Van Hove",
      "adres": { "straat": "Stationsstraat 14", "postcode": "8790", "gemeente": "Waregem" },
      "wat": "Oven 2 valt uit bij opwarmen",
      "collegas": ["Jan"],
      "werkbon_id": "uuid of null",
      "klaar": false
    }
  ]
}
```

`soort` is `werf`, `afspraak` of `interventie`. Een blok met `werkbon_id` opent de
werkbon; een blok zonder werkbon toont de bestaande knop “Klaar”.

`POST /api/v1/mijn-week/klaar` — **bestaat**

```json
{ "planblok_id": "uuid", "datum": "2026-11-06", "begin": "10:30", "einde": "16:00" }
```

## 4. Mijn wagen — **nieuw**

`GET /api/v1/ik/wagen`

```json
{ "artikels": [ { "artikel_id": "uuid", "nummer": "A-1023", "omschrijving": "Zekering 16 A", "eenheid": "st", "aantal": 12 } ] }
```

Enkel de wagen van deze technieker (bestaat in de voorraad: een technieker ziet enkel
zijn eigen wagen).

## 5. Artikels zoeken — **bestaat**

`GET /api/v1/artikels?zoek=thermostaat&fields=id,nummer,omschrijving,eenheid&limit=20`

Antwoord in de vorm van de bestaande lijsten: `{ "rijen": [ … ] }`. De app vraagt
enkel deze vier velden.

## 6. Werkbonnen

`GET /api/v1/werkbonnen?mijn=ja` — **bestaat**: `{ "rijen": [ werkbon zonder regels ] }`

`GET /api/v1/werkbonnen/{id}` — **bestaat**, met de kop `ETag`:

```json
{
  "id": "uuid",
  "nummer": "WB2026-0142",
  "status": "open",
  "werkdatum": "2026-11-06",
  "klant": "Bakkerij Van Hove",
  "adres": { "straat": "Stationsstraat 14", "postcode": "8790", "gemeente": "Waregem" },
  "melding": "Oven 2 valt uit bij opwarmen",
  "planblok_id": "uuid of null",
  "machine": { "id": "uuid", "omschrijving": "Oven Wiesheu E2", "serienummer": "44718", "garantie_tot": "2027-03-31" },
  "regels": [
    { "id": "uuid", "soort": "uur", "medewerker": "Tom", "begin": "2026-11-06T08:12", "einde": "2026-11-06T09:35" },
    { "id": "uuid", "soort": "verplaatsing", "medewerker": "Tom", "begin": "2026-11-06T07:52", "einde": "2026-11-06T08:12" },
    { "id": "uuid", "soort": "materiaal", "artikel_id": "uuid", "omschrijving": "Thermostaat oven type K", "aantal": 1, "eenheid": "st" },
    { "id": "uuid", "soort": "notitie", "tekst": "Thermostaat vervangen, oven getest" }
  ],
  "fotos": [ { "id": "uuid", "bestand_id": "uuid" } ]
}
```

`status`: `open`, `afgewerkt`, `geannuleerd`. `nummer` is `null` zolang de server de
bon nog niet aanvaard heeft.

`POST /api/v1/werkbonnen` — **nieuw** (onvoorziene opdracht, J4)

```json
{ "id": "uuid van het toestel", "werkdatum": "2026-11-06", "klant_naam": "Garage Desmet", "adres": { … }, "melding": "Poort sluit niet", "planblok_id": null }
```

- De `id` komt van het toestel; de server gebruikt die als sleutel.
- Het **nummer** komt pas hier, uit `volgend_nummer()` (beslist 18-09).
- Een technieker mag dit enkel voor zichzelf; kantoor ziet de bon in “Nog te bekijken”.

`POST /api/v1/werkbonnen/{id}/regels` — **bestaat**

```json
{ "id": "uuid van het toestel", "soort": "uur", "begin": "2026-11-06T08:12", "einde": "2026-11-06T09:35" }
{ "id": "…", "soort": "verplaatsing", "begin": "…", "einde": "…" }
{ "id": "…", "soort": "materiaal", "artikel_id": "uuid", "aantal": 1 }
{ "id": "…", "soort": "notitie", "tekst": "…" }
```

## 7. Bestanden (foto's en handtekening) — **nieuw**

`PUT /api/v1/bestanden/{uuid}` met als inhoud het bestand zelf (`Content-Type:
image/jpeg` of `image/png`). Antwoord `201 { "id": "uuid" }`.

- De app verkleint een foto vooraf tot hoogstens 1600 pixels (± 300 kB).
- Waar het bestand bewaard wordt, is beslissing J5 (voorstel: een map naast de databank).

`POST /api/v1/werkbonnen/{id}/fotos` — **bestaat** (als verwijzing)

```json
{ "bestand_id": "uuid", "onderschrift": "Typeplaatje" }
```

## 8. Afwerken — **bestaat**

`POST /api/v1/werkbonnen/{id}/afwerken`, met `If-Match` als de app een ETag kent.

Met handtekening:

```json
{
  "handtekening": {
    "naam": "Lien Van Hove",
    "bestand_id": "uuid",
    "getekend_op": "2026-11-06T09:40",
    "inhoud": { "regels": [ "de regels zoals de klant ze zag, zonder bedragen" ] }
  }
}
```

Zonder handtekening: `{ "reden": "klant_afwezig" }` met een van de redenen die
`werkbon_afwerken` kent (bestaat). De app toont: “Klant niet aanwezig”, “Klant wil niet
tekenen”, “Getekend op papier”.

- `inhoud` is de **momentopname** van wat getekend werd (eis 18-09). Komt er nadien
  nog een regel bij, dan verandert de handtekening niet.
- Was de bon al afgewerkt door een collega: `409` met een zin. De regels die de app
  daarvoor stuurde, staan er al.

## Wat de app nog niet gebruikt

Planning van collega's, machines (`GET /machines/{id}`, teller), taken en meldingen.
Die komen in een volgende stap; de routes bestaan volgens het overzicht.
