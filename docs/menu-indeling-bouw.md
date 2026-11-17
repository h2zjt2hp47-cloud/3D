# Menu-indeling van de bouwdemo (ronde 16, 17/11/2026)

Vraag van Jonas (17/11): *"graag ook alle mogelijkheden mooi groeperen in de menu's zodat dit duidelijk is"*. In een paar
dagen kwam er veel bij (stroken, nacht en verlichting, techniek, binnenafwerking, constructie, doorsnede, werken). Een
verkoper bij de klant moet in één oogopslag zien waar iets staat.

**De regel van deze ronde: geen functie veranderd.** Alleen groeperen, ordenen, koppen, namen gelijktrekken en wat open of
dicht staat. Alle `data-…`-kenmerken, id's en sneltoetsen zijn gebleven (er kwamen er een paar bij). De tekening en de 3D
staan op exact dezelfde plaats en maat (de kolommen van het scherm zijn niet aangeraakt): alle beelden van de 3D en van de
tekeningen blijven gelijk.

## Uitgangspunten (dezelfde logica op elk scherm)

1. **Groepen in de volgorde van het werk**, elk met een korte kop in gewone woorden. Overal **één soort kop**: klein, in
   hoofdletters, in de zachte kleur (`.groepkop` in de CSS), zodat je een kop niet voor een knop houdt. Bij de rijen onder de
   3D staat de kop links (`.rijkop`), alle even breed.
2. **Wat het meest gebruikt wordt, staat bovenaan en open.** Wat zelden nodig is, mag dicht onder een kop (dat bestond al:
   *Opbouw voor de constructie*, de posten, *Hoeveelheden voor de aannemer*, *Per dakraam*). Nieuw: de kaarten naast de
   tekening klappen dicht tot hun kop, maar **standaard staat alles open** (geen tik extra).
3. **Hoogstens zes à zeven knoppen per groep.**
4. **Hetzelfde ding heet overal hetzelfde** (zie *Namen*).
5. **Geen tik meer** voor wat er al was, en op de tablet staand de hoofdgroepen in het eerste beeld.

## Inventaris vóór deze ronde (wat er in elk menu stond)

Uit echte schermafdrukken op een tablet staand (820 × 1180, aanraking) en een laptop (1440 × 900), van de voorbeeldwoning.

- **Bovenbalk**: + Nieuw ontwerp · Projecten · 1 · Plattegrond (of 1 · Ramenlijst zonder woning) · 2 · Configurator · 3 · Overzicht (met het aantal) · Klantweergave.
- **Plattegrond, boven de tekening**: de verdiepingen en *+ Verdieping*; Plattegrond, Gevels, 3D, Doorsnede; *Ongedaan* en het zoomen (−, %, +, Passend, Selectie, Groot scherm).
- **Plattegrond, gereedschap** (één lijst): Selecteren, Ruimte tekenen, Ruimte met maten, Wand (indelen), Losse wand, Indelen │, Indelen ─, Raam, Buitendeur, Schuifraam, Garagepoort, Binnendeur, Doorgang, Meubel, Daklicht, Techniek (installateur); eronder *Nieuw project …*, *Plattegrond wissen* en de sneltoetsen.
- **Palet Meubel**: ← Terug, Selecteren; de groepen als chips (Zitten, Eten, Keuken, Slapen, Werken, Badkamer, Decoratie, Trappen); de meubels als tegels. **Palet Daklicht**: Lichtkoepels, Lichtstraten, Platte dakramen.
- **Techniekpalet**: ← Terug, Selecteren; *In één tik, op een ruimte* (Technische ruimte, Vloerverwarming); vier vakken; de leidingen en dan alle toestellen van het vak zonder kop (Elektriciteit: kabel, ledstrip en 16 toestellen, van tellerkast tot thuisbatterij); Tonen per vak; het voorbehoud; *Voorbeeld openen*.
- **Kaarten rechts** (plattegrond en 3D): de keuze (Woning met muurhoogte, muren, noord, gevel, opbouw; of de ruimte, het raam …) · Dak (vorm, bedekking, teller *Lichtkoepels*, maten) · Binnenafwerking (vier sferen) · Controles · Ruimtes (tabel, *Naar overzicht*). Drie soorten koppen.
- **Gevels**: palet *Gevel ontwerpen* (Verven, Pipet, Ramen verschuiven, Raam toevoegen, Strook; *Ongedaan maken*; Muurvlak … Hele woning of de soort strook; de materialen per groep met hun kleuren; Sokkel); de gevels als tabs boven het aanzicht; rechts een tweede kaart *Gevel ontwerpen* (de kwast) of de eigenschappen van een raam of strook.
- **3D**: op de 3D *Ongedaan*, *Dag / Nacht*, *Verlichting*; eronder Afgewerkt / Constructie (/ Techniek), de uitleg, Stijl (vier stijlen, Variant maken), Binnen (vier sferen), Schuin, Voorgevel, Achtergevel, Zij, Boven, Groot scherm, dan Maten tonen, Muren laag, Meubels tonen, Alle verdiepingen, Dak tonen, Kwaliteit en de bediening door elkaar, en Lichtinval.
- **Keuzepaneel in de 3D** (een tik op het ding): dak (vorm, bedekking, kleur, teller), gevel (ledstrip onder de dakrand; dit muurvlak / deze gevel / hele woning; materiaal, kleur; tegen de buren; aanbouw met maten), raam of deur (buitenlamp bij een deur; zes kleuren; zonwering; alle keuzes), ruimte (ledstrip rondom; vloer, wanden, plafond, plint, accentmuur; bekijk van binnen), strook, toestel, meubel, losse wand; telkens de posten dicht onderaan.
- **Doorsnede**: Dwars / Langs, de schuifbalk, de tekening en het voorbehoud.
- **Configurator**: positie kiezen, naam, aantal, *Toon in plattegrond*; de genummerde stappen (Soort, Maten, …); rechts het vooraanzicht of de 3D en de controles.
- **Overzicht**: Het ontwerp · Klant en project · Meegeven en doorsturen (twee rijen knoppen) · Ramen, deuren en poorten · Werken · Afwerking uit de plattegrond · Techniek · Constructie · Controles.
- **Klantweergave**: dezelfde schermen om te kijken (zonder gereedschap, paletten, wijzigknoppen, prijzen en interne kaarten).
- **Projecten**: Huidig project, Nieuw project, Huidig project als sjabloon · Mijn projecten, Sjablonen, Bibliotheek.
- **Snelstart**: Wat, Hoe groot, Stijl. **Bestand voor de klant**: De woning / Techniek, Dag / Nacht, standpunten, Maten, de lijst van het werk.

## Overzichtsblad: vóór en na

| Scherm / menu | Vóór | Na |
|---|---|---|
| Plattegrond, gereedschap | 16 knoppen en *Techniek (installateur)* in één lijst | Selecteren · **Ruimtes** (tekenen, met maten) · **Muren** (wand, losse wand, indelen │ en ─) · **Ramen en deuren** (raam, buitendeur, schuifraam, garagepoort, binnendeur, doorgang) · **Dak** (daklicht) · **Inrichting** (meubel, **trap**) · **Techniek** |
| Techniekpalet | per vak een lange rij tegels zonder koppen (Elektriciteit: 2 leidingen en 16 toestellen door elkaar) | per vak groepen met een kop. Elektriciteit: **Stopcontacten** · **Verlichting** (ledstrip en zes lampen) · **Kasten en aansluitingen**. Koeling en verwarming: **Leidingen** · **Airco** · **Warmtepomp en ketel** · **In de ruimtes**. Ventilatie: **Kanalen** · **Toestellen**. Sanitair: **Leidingen** · **Toestellen**. Daarboven *In één tik, op een ruimte*, onderaan **Tonen** |
| Gevelpalet | Verven, Pipet, Ramen verschuiven, Raam toevoegen, Strook; *Ongedaan maken*; bereik zonder kop | **Kleur en materiaal** (verven, pipet, strook) · **Ramen** (verschuiven, toevoegen) · *Ongedaan* · **Met één tik verf je** / **Soort strook** · **Materiaal en kleur** · **Sokkel** |
| Knoppen bij de 3D | Afgewerkt / Constructie; Stijl; Binnen; vijf standpunten met Groot scherm; zeven schakelaars en de kwaliteit door elkaar; Lichtinval | rijen met een kop links: **Weergave** (Afgewerkt, Constructie, Techniek; rechts de kwaliteit) · **Stijl** · **Binnen** · **Bekijk** (standpunten, Groot scherm) · **Tonen** (Maten, Muren laag, Meubels, Alle verdiepingen, Dak) · **Zon**. Op de 3D zelf: Ongedaan (links), Dag / Nacht en Verlichting (rechts) |
| Kaarten rechts | Woning of de keuze · Dak · Binnenafwerking · Controles · Ruimtes, met drie soorten koppen | dezelfde vaste volgorde, één soort kop, elke kaart klapt dicht tot haar kop (pijltje rechts); Binnenafwerking niet in de 3D en de doorsnede (de rij *Binnen* onder de 3D doet hetzelfde) |
| Gevels, kaart rechts | *Gevel ontwerpen* (net als het palet links) | **Kwast** (wat ze toont) |
| Keuzepaneel van een gevel | "Gevel · Slaapkamer 3 (onderkant van het plan)" | "Achtergevel · Slaapkamer 3 (onderkant)", zoals in de gevel-editor en bij de standpunten |
| Kaart Dak en keuzepaneel van het dak | teller *Lichtkoepels* (ook voor een lichtstraat) | teller **Daklichten**, met eronder welk daklicht |
| Overzicht, Meegeven en doorsturen | twee rijen knoppen met een streep ertussen | **Voor de klant** · **Afdrukken en doorsturen** |

## Per scherm

### Bovenbalk
*+ Nieuw ontwerp*, *Projecten*, *1 · Plattegrond*, *2 · Configurator*, *3 · Overzicht*, *Klantweergave*. **Niet veranderd**: de
drie genummerde stappen zijn al de werkstanden in de volgorde van het werk (ontwerpen, uitwerken, bekijken en meegeven). Een
bredere balk (een kop of een tussenruimte) zou op een laptop van 1400 beeldpunten naar een tweede rij lopen, en dan schuift
de tekening (zie *Grenzen*).

### Plattegrond
- **Gereedschap** (links): de groepen hierboven. Selecteren staat bovenaan zonder kop (de kaart heet al *Gereedschap*). Met
  een muis in één kolom met de sneltoetsen; *Indelen │* en *Indelen ─* en *Meubel* en *Trap* staan per twee naast elkaar, en
  de knoppen zijn 2 beeldpunten lager, zodat ook *Techniek* op een laptop naast de tekening blijft (onderkant 876 van 900;
  vóór 835). Op een tablet in twee kolommen, zoals vroeger; een groep van één knop over de hele breedte.
- **Trap** (nieuw bij *Inrichting*, `[data-gereedschap-trap]`): dezelfde weg als *Meubel → Trappen → trap* (het palet
  opent op Trappen met de trap klaar). Geen nieuwe functie: een trap is voor een verkoper geen meubel, en hij zocht ze.
  De melding na *+ Verdieping* zegt nu "Plaats beneden een trap (Inrichting → Trap)".
- **Paletten** Meubel en Daklicht: niet veranderd (al in groepen: de meubels als chips Zitten … Trappen, de daklichten met
  de koppen Lichtkoepels, Lichtstraten, Platte dakramen).
- **Boven de tekening**: verdiepingen links, de vier weergaven rechts, Ongedaan en het zoomen eronder. Niet veranderd (een
  andere hoogte verschuift de tekening).
- **Kaarten rechts**, vaste volgorde: *de keuze* (Woning, of wat je aantikte) · *Dak* · *Binnenafwerking* · *Controles* ·
  *Ruimtes* (met *Naar overzicht*). Eerst wat je aantikte, dan de kaarten voor de hele woning in de volgorde van het werk,
  dan de controle en de lijst. Elke kaart behalve de keuze klapt dicht tot haar kop (`vouw-ui.ts`, de keuze blijft in de
  browser zoals de kwaliteit van de 3D, niet in het project).

### Gevels
Palet links: **Kleur en materiaal** (Verven, Pipet, Strook) en **Ramen** (Ramen verschuiven, Raam toevoegen), dan
*Ongedaan* (dezelfde knop als in de plattegrond), en daaronder wat bij het gekozen gereedschap hoort, elk met een kop:
**Met één tik verf je** (muurvlak … hele woning) of **Soort strook** (band, naast raam, kader, vrij), **Materiaal en kleur**
(met Strook: **Materiaal van de strook**) en **Sokkel**. Op een tablet staan de gereedschappen en het bereik in twee
kolommen (de gevel staat ernaast). Rechts heet de kaart **Kwast**; *Gevel ontwerpen* is het palet.

### 3D
Onder de 3D, in rijen met een kop links (zie het overzichtsblad). Eerst wat je aan het ontwerp verandert (*Stijl*,
*Binnen*: fase 1, bij de klant), dan hoe je kijkt (*Bekijk*, *Tonen*) en de zon. *Weergave* staat bovenaan, omdat het
bepaalt wat je ziet; de kwaliteit staat in die rij rechts (geen eigen rij). De uitleg van de bediening staat op een tablet
naast "Tik op het dak …" en met een muis onder *Tonen*. In *Tonen* heten de schakelaars kort (*Maten*, *Meubels*, *Dak*;
de kop zegt al "tonen"). Met de techniek aan komt onder *Weergave* de rij **Techniek** (In de woning / Uitgezet, de vakken).

Op de 3D zelf, zoals in ronde 15 en 15b: links *Ongedaan*, rechts *Dag / Nacht* met eronder *Verlichting* (de drie
voorstellen). Dat is de groep **Licht**: daar zie je het effect meteen.

### Doorsnede
Dwars / Langs en de schuifbalk boven de tekening: niet veranderd. Rechts de kaarten van de plattegrond, zonder
Binnenafwerking (die zie je in een doorsnede niet).

### Techniek (palet van de installateur)
Bovenaan *← Terug* en *Selecteren*, dan **In één tik, op een ruimte** (technische ruimte, vloerverwarming), dan de vakken als
tabs (twee op twee), dan de groepen van het open vak (zie het overzichtsblad), en onderaan **Tonen**, het voorbehoud en het
voorbeeld. De verlichting is een eigen groep **binnen** Elektriciteit, geen vijfde vak: als vak kostte de ledstrip een tik
meer (*Techniek, Verlichting, Ledstrip*), en de 3D en de telling kennen geen vak verlichting. De groepen zijn gegevens
(`VAK_GROEPEN` in `techniek-ui.ts`): een nieuw toestel of een nieuwe soort leiding in de catalogus komt vanzelf onderaan bij
*Leidingen* of *Andere toestellen*.

### Keuzepaneel in de 3D
Al per ding (gevel, raam of deur, ruimte, dak, strook, toestel, meubel, losse wand), met de verlichting in één tik
bovenaan onder de titel, de posten dicht onderaan. Alleen de naam van een gevel is gelijkgetrokken (*Achtergevel ·
Slaapkamer 3 (onderkant)*), en de teller van het dak heet *Daklichten*. Geen koppen erbij: elke keuze heeft al haar eigen
regel ("Vloer: …", "Kleur: …"), en een langer paneel kost op een laptop meer scrollen.

### Configurator
Niet veranderd: de keuzes staan al in genummerde stappen (1 Soort, 2 Maten, …) die het model zelf meebrengt, met de
tekening en de 3D ernaast.

### Overzicht
Niet veranderd behalve de kaart *Meegeven en doorsturen*: twee koppen, **Voor de klant** (*Meegeven aan de klant*, *Blad
met beelden*) en **Afdrukken en doorsturen** (*Doorsturen naar Missing Link*, *Afdrukken / PDF*, *Kopieer tekst*, *3D
doorsturen*, *Export*). De kaarten staan al in de volgorde van het werk: het ontwerp, klant en project, meegeven, de
ramen en deuren, de werken, de afwerking uit de plattegrond, techniek en constructie.

### Klantweergave
Dezelfde schermen om te kijken: het gereedschap, de paletten en de kaarten om te wijzigen blijven weg. De nieuwe koppen
volgen vanzelf: een kop van een verborgen groep is ook verborgen (de koppen van de stijlen en van het keuzepaneel), de
rijen *Bekijk* en *Tonen* blijven.

### Projecten, snelstart, bestand voor de klant
Niet veranderd. Projecten staat al in twee kolommen (huidig, nieuw, sjabloon · mijn projecten, sjablonen, bibliotheek), de
snelstart in drie stappen (Wat, Hoe groot, Stijl). Het bestand voor de klant (de kijker) is bewust niet aangeraakt: zijn 3D
past zich aan de hoogte van de balken eromheen aan (`pasMaatAan`), dus een andere balk verandert de beelden van de kijker.

## Namen gelijkgetrokken

| Wat | Vóór | Na |
|---|---|---|
| Teller op het platte dak (kaart Dak en keuzepaneel) | *Lichtkoepels* (ook bij lichtstraten), *Dakramen* | **Daklichten**, met eronder het daklicht ("Lichtkoepel 100 × 100, gelijk verdeeld …") — zoals het gereedschap en het palet *Daklicht* |
| Een gevel in het keuzepaneel | "Gevel · … (onderkant van het plan)" | "**Achtergevel** · … (onderkant)", zoals de gevel-editor en de standpunten |
| Ongedaan maken in de gevel-editor | *Ongedaan maken* (tekst) | **↶ Ongedaan**, dezelfde knop als in de plattegrond en de 3D |
| Kaart rechts in de gevel-editor | *Gevel ontwerpen* (twee kaarten met dezelfde naam) | **Kwast** |
| Schakelaars in de 3D | *Maten tonen*, *Meubels tonen*, *Dak tonen* | *Maten*, *Meubels*, *Dak* onder de kop **Tonen** |
| De trap | *Meubel → Trappen* | ook **Inrichting → Trap** |

Niet gelijkgetrokken (bewust): *Koeling en verwarming* en *Sanitair* (de installateur: palet, telling, posten; vastgelegd in
de tests) naast *Verwarming en koeling* en *Water en afvoer* voor de klant (ronde 10c).

## Ideeën uit het openbare project (een huisbouwer in de stijl van een simulatiespel)

Alleen ideeën, geen code, namen of uitzicht.

| Idee | Overgenomen? | Waarom |
|---|---|---|
| Panelen die **dichtklappen tot hun kop** | **ja**, voor de kaarten naast de tekening | Op een tablet staan ze allemaal onder de tekening; wie ze niet nodig heeft, klapt ze dicht. Standaard open: geen tik extra. |
| De catalogus in **categorieën als chips** | was er al | Het meubelpalet heeft sinds 16/11 de groepen als chips (Zitten … Trappen). Het techniekpalet kreeg nu groepen met een kop binnen elk vak. |
| Alle weergave-instellingen in **één menu met een oog** | **deels**: samen in rijen met een kop (*Bekijk*, *Tonen*, *Weergave*), niet achter een knop | Achter een knop kostte *Muren laag* een tik meer (het plafond in hout: 3 → 4). Zichtbaar in groepjes is even duidelijk. |
| **Drie werkstanden** bovenaan met *Ongedaan* en *Opnieuw* ernaast | nee | Onze bovenbalk heeft al drie genummerde stappen; een andere navigatie verandert hoe de app werkt (en de hoogte van de balk, dus de plaats van de tekening). *Opnieuw* bestaat niet: dat is een nieuwe functie. |
| Het keuzepaneel als **blad dat van onder opschuift** | nee | Ander gedrag; op onze tablet (820 breed) staat het paneel al vlak onder de 3D, zonder het beeld te bedekken. |
| Een kaart **Eerste stappen** | nee | Nieuwe inhoud. Er is al de kaart "Begin met de eerste ruimte" bij een leeg plan, en de snelstart. |

## Gemeten

*(Playwright, Chromium zonder grafische kaart, tablet staand 820 × 1180 met aanraking en laptop 1440 × 900; elke taak op een
verse pagina met de voorbeeldwoning; een tik = een knop, tegel, tik in de tekening of de 3D, of een keuze in een lijst;
scrollen apart geteld. Scripts `tikken.cjs` en `tikken2.cjs` in de scratchpad van ronde 16.)*

| Taak (vanaf de plattegrond, tenzij anders) | Tablet vóór → na | Laptop vóór → na |
|---|---|---|
| Een raam in de leefruimte (Raam, tik op de muur) | 2 → 2 | 2 → 2 |
| Een binnendeur (Binnendeur, tik op de muur) | 2 → 2 | 2 → 2 |
| Een meubel: een bed in slaapkamer 1 (Meubel, Slapen, bed, tik) | 4 → 4 | 4 → 4 |
| Een trap in de inkom: via Meubel → Trappen | 4 → 4 | 4 → 4 |
| Een trap in de inkom: via **Inrichting → Trap** (nieuw) | — → **2** | — → **2** |
| Een daklicht (Daklicht, koepel 100 × 100, tik) | 3 → 3 | 3 → 3 |
| Een strook op de gevel (Gevels, Strook, tik: een band) | 3 → 3 | 3 → 3 |
| Een stopcontact (Techniek, Stopcontact, tik) | 3 → 3 | 3 → 3 |
| Een ledstrip over de hele tuingevel (Techniek, Ledstrip, tik) | 3 → 3 | 3 → 3 |
| Een buitenlamp aan de tuingevel (Techniek, Buitenlamp, tik) | 3 → 3 | 3 → 3 |
| De nacht met een ledstrip onder de dakrand (vanaf de 3D: Verlichting, Ledstrip onder de dakrand) | 2 → 2 | 2 → 2 |
| Een plafond in hout in de leefruimte, vanaf de 3D (Muren laag, tik op de vloer, Hout) | 3 → 3 | 3 → 3 (2 keer scrollen, vóór en na) |
| Een plafond in hout, via de plattegrond (tik op de ruimte, keuzelijst Plafond) | 2 → 2 (1 keer scrollen, vóór en na) | 2 → 2 |
| Een sfeer voor de hele woning (vanaf de 3D) | 1 → 1 | 1 → 1 |
| Een andere stijl (vanaf de 3D) | 1 → 1 | 1 → 1 |
| Een gevel in hout via het keuzepaneel (vanaf de 3D: tik op de gevel, Houten bekleding) | 2 → 2 | 2 → 2 |

Alle taken gelukt (nagekeken op het bewaarde plan), zonder scrollen behalve waar vermeld, op beide toestellen hetzelfde.
**Geen taak kost een tik meer**; de trap kan nu in 2 in plaats van 4. Op de tablet is geen knop, tegel, veld of schakelaar in
de plattegrond, de techniek, de gevels en de 3D kleiner dan 44 beeldpunten (vóór en na 0). Geen fout in de pagina. De
tekening, het gevelaanzicht, de 3D en de doorsnede staan bij 1400 × 950 op exact dezelfde plaats en maat als vóór deze
ronde; de beeldvergelijking van de bouw (`--alleen bouw-`): alle 45 beelden 0,00 %, geen enkel beeld vernieuwd.

Op de tablet staand in het eerste beeld (zonder scrollen): alle groepen van het gereedschap (tot 890 van 1180, vóór 706),
van het gevelpalet en van het techniekpalet (de kop *Kasten en aansluitingen* op 1009), en onder de 3D alle rijen tot en met
*Zon* (vóór viel *Lichtinval* eronder). Op de laptop: het hele gereedschap (tot 876 van 900, vóór 835), en onder de 3D
*Stijl* en *Binnen* zoals vóór (tot 893).

## Grenzen en wat open blijft

- **De kolommen bleven**: het gereedschap past op een laptop net naast de tekening (onderkant 876 van 900). Een groep of
  een knop erbij past daar niet meer zonder de knoppen nog kleiner te maken.
- In het techniekpalet staan de *Kasten en aansluitingen* van de elektriciteit op een laptop onder de vouw (de kop net
  erboven), en op een tablet staand de tellerkast en het verdeelbord net op de rand. Vroeger stonden ze bovenaan maar liep
  de rest van de lijst onder de vouw.
- Op een tablet staand staat de rij *Zon* (lichtinval) onder de 3D net op de rand: de schakelaar is te zien, de onderkant
  van haar vak valt 9 beeldpunten eronder (vóór viel de hele rij onder de rand).
- De groep *Dak* in het gereedschap heeft alleen *Daklicht*. De vorm en de bedekking van het dak kies je in de kaart *Dak*
  (op een laptop rechts, op een tablet staand onder de tekening) of met een tik op het dak in de 3D. Een knop "Dak" erbij
  die naar de kaart springt, zou een tweede weg zijn en past op een laptop niet meer naast de tekening.
- De bovenbalk, de configurator, de snelstart, Projecten en het bestand voor de klant zijn bekeken en niet veranderd (zie
  hierboven).
- Een kaart dichtklappen geldt voor alle projecten in die browser.
- Niet getest op een echte tablet, iPad of Safari.
