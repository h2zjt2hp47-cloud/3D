# Fase 0.2 — Productkennis uitschrijven: meubels (pilot)

*Invulsjabloon voor het gesprek met de pilootklant. Vermoedelijke pilot: Corneille & Silence (zitmeubelen, bedden en bedlinnen op maat, Harelbeke). Nog te bevestigen.*

**Doel:** alles verzamelen wat de configurator moet weten, zodat de ontwikkelaar het productmodel kan opbouwen zonder te gissen. **Klaar wanneer:** de 10 testoffertes onderaan volledig met deze gegevens na te rekenen zijn.

Tip: start met **één productfamilie** (bv. sofa's óf bedden), niet alles tegelijk.

---

## 1. Algemeen

| Vraag | Antwoord |
|---|---|
| Welke productfamilie nemen we als eerste? (sofa's, fauteuils, zetelbedden, bedden/hoofdborden, …) | |
| Hoeveel modellen in die familie? | |
| Wie gaat configureren? (eigen verkoper in showroom / interieurinrichter / particulier via website) | |
| Krijgen interieurinrichters een korting of nettoprijzen? Vast % of per klant? | |
| Prijzen incl. of excl. btw tonen, en aan wie? | |
| Hoe maken jullie nu een offerte? (Excel, prijsboek, ERP …) Graag een voorbeeld. | |
| Taal: alleen Nederlands, of ook Engels/Frans? (website is NL · EN) | |

## 2. Kenmerken per model (wat kiest de klant?)

Vul per model in. Voorbeeld voor een sofa:

| Kenmerk | Soort | Mogelijke waarden / bereik | Standaard | Opmerking |
|---|---|---|---|---|
| Opstelling | keuze | 2-zit, 3-zit, 4-zit, hoek links/rechts, modulair | 3-zit | |
| Breedte | maat (mm) | 1600–3200, per 100 mm? | 2200 | Op maat of vaste maten? |
| Zitdiepte | keuze/maat | | | |
| Zithoogte | keuze/maat | | | |
| Zitcomfort | keuze | schuim, veren, dons … | | |
| Stof | keuze | lijst van stoffen + kleuren | | Zie §3 |
| Poten | keuze | | | |
| Afneembare hoezen | ja/nee | | | |
| Sierkussens | aantal | | | |
| … | | | | |

Voor **bedden** ook: bedmaat (90/140/160/180/200 × 200/210/220), hoofdbord (model, hoogte), bedbodem (type, hoogte), matras (comfort, hardheid per zijde?), dekbed/linnen (maat volgt de bedmaat). Vraag ook: **kies je per onderdeel of altijd als geheel?** (De website zegt: "Kies per onderdeel of laat het volledige bed op maat maken.")

## 3. Stoffen

| Vraag | Antwoord |
|---|---|
| Hoeveel stoffen en kleuren? (Ficelle, Travertin, Brume, Belize, Naturel, …) | |
| Zijn stoffen ingedeeld in **prijsgroepen** (A, B, C …)? Welke stof zit in welke groep? | |
| Kan de klant **eigen stof** aanleveren? Hoe wordt dat aangerekend? | |
| Zijn er stoffen die niet passen bij een model (bv. te stug voor ronde armen)? | |
| Stofverbruik per model en maat: bekend (lopende meter)? | |
| Beschikbaarheid/levertermijn per stof? | |

## 4. Regels (wat mag niet, wat moet?)

Schrijf ze in gewone taal, de ontwikkelaar zet ze om. Voorbeelden:

- "Messing poten alleen bij model X."
- "Hoekelement moet korter zijn dan de totale breedte."
- "Eigen stof niet combineerbaar met afneembare hoezen."
- "Boven 3 m breedte moet de sofa in twee delen geleverd worden."

| # | Regel | Fout (blokkeert) of waarschuwing? |
|---|---|---|
| 1 | | |
| 2 | | |
| … | | |

## 5. Prijsopbouw

| Vraag | Antwoord |
|---|---|
| Is er een **prijslijst per model × maat × stofgroep**? Graag het bestand (Excel). | |
| Tussenmaten: afronden naar de volgende maatklasse? | |
| Toeslagen: welke opties kosten extra, vast bedrag of %? | |
| Minimumprijs of vaste kosten (levering, plaatsing)? | |
| Leveringskosten: vast, per zone, per stuk? | |
| Is de **kostprijs** per model bekend (frame, vulling, stof, uren)? Nodig voor margecontrole, niet verplicht voor de eerste versie. | |

## 6. Na de offerte

| Vraag | Antwoord |
|---|---|
| Wat heeft het atelier nodig bij een bestelling? (werkbon, stofverbruik, snijlijst, maten) | |
| Komt het order in een ERP/boekhouding terecht? Welk? (Missing Link?) | |
| Levertermijn tonen in de configurator? | |

## 7. Visualisatie

| Vraag | Antwoord |
|---|---|
| Zijn er foto's per model en per stof (stalen)? | |
| Volstaat een **foto + stofstaal + maatschets** voor de eerste versie? | |
| Zijn er 3D-modellen of technische tekeningen beschikbaar? | |

## 8. Tien testoffertes

Verzamel 10 echte offertes of bestellingen van de laatste maanden, zo divers mogelijk (verschillende modellen, maten, stoffen, met en zonder korting). Vul per offerte in:

| # | Model | Alle gekozen opties | Klant (particulier/inrichter) | Prijs excl. btw | Korting |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| … | | | | | |
| 10 | | | | | |

Deze 10 worden automatische tests: de configurator moet exact dezelfde prijs geven.
