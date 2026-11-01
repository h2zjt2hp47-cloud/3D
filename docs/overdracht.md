# Overdracht — stand van zaken (1 november 2026)

## Waar staan we

| Onderdeel | Status |
|---|---|
| Analyse en stappenplan | `docs/configurator-analyse-en-stappenplan.md` (incl. beslissingen en voortgangstabel) |
| Onderzoek zetelconfigurators | `docs/onderzoek-zetelconfigurators.md` |
| Fase 0-sjabloon (productkennis klant) | `docs/fase0-productkennis-meubels.md`, nog in te vullen met de klant |
| Motor (`packages/core`) | Klaar voor demo: formules, regels, prijstabellen, korting, stuklijst, materialen, vrij ontwerp met opties, vormgeving (ontwerpmodus), vooraanzicht, 3D-opbouw, collectie van 42 modellen, opzet-elementen, catalogus-controle, vrije hoogtes. **111 tests groen.** |
| Klikbare demo (`packages/demo-web`) | Tabbladen: Modellen · Sofa op maat · Vrij ontwerp (tekenen in boven- én vooraanzicht, verplaatsen, vrije hoogtes, 3D, ontwerpmodus, rugleuningen en kussens) · Kast op maat · Materialen · **Catalogus** (editor: elementen, opties, modellen, delen) |
| Huisstijl klant | `npm run build -w @configurator/demo-web` maakt ook `dist/configurator-corneille-silence.html` (stijl van hun website). **Niet publiek publiceren**: alleen als bestand aan de gebruiker. |
| Doorsturen (offline) | De build maakt ook `dist/*-offline.html`: één bestand met 3D-bibliotheek, lettertypes en foto's ingebakken, werkt zonder internet. Eerst `python3 -I packages/demo-web/scripts/haal_lettertypes.py` en `haal_fotos.py` (niet in git). Zip met LEES MIJ: `obsidian-export/Configurator Corneille & Silence.zip`. |
| **Bouwsector (tweede case)** | Aparte demo `packages/bouw-web` → `dist/bouw-configurator.html` (+ `-offline.html`). Model `core/voorbeelden/aanbouw.ts`: aanbouw of enkel raampartij, inmeting (kleinste maat − speling), systeemgrenzen en vleugelgewicht, veiligheidsglas, Uw-berekening, btw 6/21 %, ligger, vergunning, bestellijst. 3D in `aanbouw3d.ts` (baksteen, planken, glas). Onderzoek en wat nog moet: `docs/onderzoek-bouw-ramen-deuren.md`. Alle waarden zijn voorbeelden. |
| Skill | `.claude/skills/zetel-3d/SKILL.md`: hoe de 3D-logica werkt en hoe je een nieuwe vorm toevoegt |
| Obsidian | `python3 -I scripts/obsidian_export.py` → `obsidian-export/Configurator.zip` (+ `zetel-3d-skill.zip`) |

**Demo online (privé artifact):** https://claude.ai/artifact/BtVKYeQKC7szR1ZwW97VB1
- slug `582bc583-72e1-4309-953b-520181a53044`, laatste versie: zie publicatie van 31/10 (catalogus-editor)
- Productfoto's: eerst `python3 -I packages/demo-web/scripts/haal_fotos.py` (vraagt netwerktoegang tot corneille-silence.be), dan bouwen. De foto's staan in `packages/demo-web/fotos/` en worden niet in git bewaard.
- Opnieuw publiceren: `npm run build -w @configurator/demo-web`, dan `publish_files` met `dist/configurator-demo.html` als `index.html`, met slug + base_version.

## Beslissingen
1. Eerste case: **meubels/zitmeubelen**. Vermoedelijke pilot: Corneille & Silence (nog formeel te bevestigen).
2. **Aparte app**, verkoopbaar op zichzelf, **koppelbaar met Missing Link**.
3. **TypeScript**.
4. Sofa's worden **per cm** gemaakt.

## Collectie van de klant (website gelezen op 31/10)
De website (www.corneille-silence.be) toont per model alleen **naam + foto**: geen maten, opties of prijzen. Alle 42 modellen staan in `packages/core/voorbeelden/modellen.ts` als **benadering op basis van de foto**:
- **Sofa's (14):** Kotor, Doha, Montego, Nestor, Belize, Pula, Fréjus, Gozo, Azar, Amusette, Attribute, Husk, Wallace, Esmee
- **Fauteuils (14):** Pebble, Karl, Tumble, Ross, Amusette, Quin, Satie, Mabel 1-zit, Sullivan, Fraser, Milton, Manon, Mabel 2-zit, Mabel Meridienne
- **Zetelbedden (6):** Ziggy, Aurora, Zora, Phoenix, Daizy Classic, Daizy Slim
- **Poufs & hockers (8):** Sullivan Hocker, Tumble, Stockholm, Kanto, Fez, Pebble, Mabel Hocker, Fraser Hocker (de laatste twee hebben geen foto op de site)

Citaat van de site (pagina Zitten): *"Kies éen van de zitmeubelen uit het bestaande gamma of pas ieder model aan aan uw eigen wens en interieur."* Dat sluit aan bij de ontwerpmodus.

Nieuwe onderdelen voor de collectie: fauteuil-element (kuip: rond/afgerond/hoekig), poefvormen (rond/vierkant/kiezel), draaivoet, hoes tot op de grond (housse), slaapfunctie, zitelement tot 240 cm (één lang zitkussen), extra demostoffen (velours petrol/bosgroen/oudroze, wol grijs, leder cognac).

De demostof "Belize" heet nu **Bouclé Écru** (Belize is een model); de interne code is nog `boucle_belize`.

Niet opgenomen: Stoelen/Barstoelen, Tafels en de bedden (Bedding & Beyond).

## Open punten / volgende stappen
1. **Website gelezen** (netwerktoegang staat nu open). De echte maten, opties en stoffen per model moeten van de klant komen, want de site toont ze niet.
2. **Echte gegevens van de klant** (fase 0.2): prijslijst per model × maat × stofgroep, stofgroepen, stofverbruik, toegelaten opties per model, levertermijnen.
3. **Opties per model beperken:** een model kan nu alle opties kiezen. Volgende stap: per model een lijst met toegelaten keuzes.
4. **Bedden ("Bedding & Beyond"):** hoofdborden, bedbodems, matrassen en linnen zijn nog niet opgenomen.
5. **Fase 3:** server met opslag (gedeelde materialen en ontwerpen), offerte-PDF met tekening en koppeling met Missing Link (eerst de betekenis van de offerteregelvelden `keuzegroep`/`optie_sleutel`/`vereist_sleutel`/`berekening` laten bevestigen).
6. Vraag aan de gebruiker die nog openstaat: ontwerpt een interieurinrichter later zelf vrij, of alleen de verkoper in de showroom?

## Bekende beperkingen
- 3D is schematisch (eenvoudige vormen), geen fotorealistisch model.
- Eigen materialen en het laatste ontwerp worden alleen in de browser bewaard (localStorage).
- Het afgeronde eindelement is een benadering (halve ronding) van de organische vormen van Doha/Montego.
