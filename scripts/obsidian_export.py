"""
Maakt een Obsidian-map van de projectdocumentatie: notities met frontmatter,
[[wikilinks]] tussen de notities en de afbeeldingen. Resultaat (in obsidian-export/ en een kopie in doorsturen/):

  Obsidian - Configurator.zip                 alle notities en afbeeldingen
  Obsidian - Configurator - werkwijze 3D.zip  alleen de 3D-werkwijze (werkwijze, kennisbank, skills, beeldvergelijking)

Elk pakket bevat bovenaan `PLAATSEN - lees eerst.md`: de opdracht voor wie (of welke Claude) de notities in de kluis zet.
Zo kan een ander account, dat de kluis wel kan bereiken, het pakket plaatsen zonder deze repo te kennen.

Gebruik: npm run obsidian   (of: python3 -I scripts/obsidian_export.py)
"""
import datetime
import os
import re
import shutil
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
UIT = os.path.join(ROOT, 'obsidian-export', 'Configurator')
VANDAAG = datetime.date.today().isoformat()
# Privépagina's (stand 11/11/2026). Alleen te openen met het account waarmee ze gepubliceerd zijn.
DEMO = 'https://claude.ai/artifact/DMGw1PmYktTga5o3BPH8s5'
BOUWDEMO = 'https://claude.ai/artifact/SJMpxDgunUur7a32wBZVQi'
CONTROLEBLAD = 'https://claude.ai/artifact/A18tr89L8FGDrVHV382JQu'
WERKBANK = 'https://claude.ai/artifact/6xDBh9rwWbSa2FJqijqRzd'
ZETELS, BOUW = 'Corneille & Silence', 'bouwsector (demo)'

# bron → (titel, tags, klant)
NOTITIES = {
    'docs/overdracht.md': ('Overdracht en stand van zaken', ['configurator', 'status'], 'alle'),
    'docs/configurator-analyse-en-stappenplan.md': ('Analyse en stappenplan', ['configurator', 'analyse', 'stappenplan'], 'alle'),
    'docs/analyse-unieke-module-missing-link.md': ('Analyse - unieke module voor Missing Link', ['configurator', 'missing-link', 'analyse', 'strategie'], 'alle'),
    'docs/analyse-machines-missing-link.md': ('Analyse - machinehandel en -verhuur (Missing Link)', ['missing-link', 'machines', 'analyse', 'strategie'], 'alle'),
    'README.md': ('Technische opbouw (README)', ['configurator', 'techniek'], 'alle'),
    'docs/onderzoek-zetelconfigurators.md': ('Onderzoek zetelconfigurators', ['configurator', 'zetels', 'onderzoek'], ZETELS),
    'docs/fase0-productkennis-meubels.md': ('Fase 0 - productkennis meubels', ['configurator', 'zetels', 'klant', 'sjabloon'], ZETELS),
    '.claude/skills/zetel-3d/SKILL.md': ('Skill - 3D-logica zetels', ['configurator', 'zetels', 'skill', '3d'], ZETELS),
    'docs/3d-technieken.md': ('3D-technieken - kennisbank', ['configurator', '3d', 'kennis', 'zetels', 'bouw'], 'alle'),
    'docs/vergelijking-website-1011.md': ('Zetels naast de productfoto\'s (10-11)', ['configurator', 'zetels', '3d', 'klant'], ZETELS),
    'docs/werkwijze-3d.md': ('3D-werkwijze - heranalyse en nieuwe aanpak', ['configurator', '3d', 'werkwijze'], 'alle'),
    '.claude/skills/3d-werkbank/SKILL.md': ('Skill - 3D-werkbank', ['configurator', 'skill', '3d', 'werkwijze'], 'alle'),
    'docs/zachte-vormen.md': ('Zachte vormen - zetels in 3D', ['configurator', 'zetels', '3d'], ZETELS),
    'docs/echte-3d-modellen.md': ('Echte 3D-modellen - proef', ['configurator', 'zetels', '3d', 'onderzoek'], ZETELS),
    'docs/proeven/3d-motor-proeven-0411.md': ('Proeven 3D-motor (WebGPU, glas, weefsel)', ['configurator', '3d', 'proef', 'webgpu'], 'alle'),
    'beeldtest/LEESMIJ.md': ('Beeldvergelijking 3D', ['configurator', '3d', 'kwaliteit', 'test'], 'alle'),
    'docs/onderzoek-bouw-ramen-deuren.md': ('Onderzoek bouw - pijnpunten ramen en deuren', ['configurator', 'bouw', 'onderzoek'], BOUW),
    'docs/analyse-bouw-woning-demo.md': ('Analyse bouw - woningconfigurator', ['configurator', 'bouw', 'analyse'], BOUW),
    'docs/begrippen-bouw.md': ('Begrippenlijst bouw', ['configurator', 'bouw', 'begrippen'], BOUW),
    'docs/onderzoek-raamsoftware.md': ('Onderzoek raamsoftware - LogiKal, ReynaPro, Chacal', ['configurator', 'bouw', 'onderzoek', 'concurrentie'], BOUW),
    'docs/analyse-gebruiksgemak.md': ('Analyse gebruiksgemak', ['configurator', 'bouw', 'analyse', 'gebruiksgemak'], BOUW),
    '.claude/skills/bouw-woning/SKILL.md': ('Skill - woningconfigurator bouw', ['configurator', 'bouw', 'skill', '3d'], BOUW),
}
TITEL_VAN = {os.path.basename(k): v[0] for k, v in NOTITIES.items()}
# De skills heten allemaal SKILL.md: een vermelding van hun pad wordt een link naar de juiste notitie.
SKILLS = {
    '.claude/skills/zetel-3d/SKILL.md': 'Skill - 3D-logica zetels', '.claude/skills/bouw-woning/SKILL.md': 'Skill - woningconfigurator bouw',
    '.claude/skills/3d-werkbank/SKILL.md': 'Skill - 3D-werkbank',
}
# Het kleine pakket: alleen de manier van werken voor de 3D.
WERKWIJZE = ['docs/werkwijze-3d.md', 'docs/3d-technieken.md', '.claude/skills/3d-werkbank/SKILL.md', '.claude/skills/zetel-3d/SKILL.md', 'beeldtest/LEESMIJ.md']


def omzetten(tekst: str) -> str:
    for pad, titel in SKILLS.items():
        tekst = tekst.replace(f'`{pad}`', f'[[{titel}]]')
    # Een vermelding van een document dat zelf een notitie is (`docs/werkwijze-3d.md`) wordt een link naar die notitie.
    # Niet binnen een gewone link ([`docs/x.md`](docs/x.md)): die wordt verderop in haar geheel een link.
    for pad, (titel, _tags, _klant) in NOTITIES.items():
        tekst = re.sub(r'(?<!\[)`' + re.escape(pad) + r'`(?!\])', lambda _m, t=titel: f'[[{t}]]', tekst)
    # Afbeeldingen → ![[bestand]]
    tekst = re.sub(r'!\[[^\]]*\]\((?:docs/)?afbeeldingen/([^)]+)\)', r'![[\1]]', tekst)
    # Links naar andere notities → [[Titel]]
    def link(m):
        doel = os.path.basename(m.group(2))
        return f'[[{TITEL_VAN[doel]}]]' if doel in TITEL_VAN else m.group(0)
    return re.sub(r'\[([^\]]+)\]\(((?:\.\./)?(?:[A-Za-z0-9_\-]+/)*[A-Za-z0-9_.\-]+\.md)\)', link, tekst)


def frontmatter(titel, tags, klant=ZETELS, bijgewerkt=None):
    return f'---\ntitle: "{titel}"\ntags: [{", ".join(tags)}]\nklant: {klant}\nbijgewerkt: {bijgewerkt or VANDAAG}\n---\n\n'


def laatst_gewijzigd(bron: str) -> str:
    """Datum van de laatste wijziging van een bronbestand in git (zo verandert een notitie alleen als haar bron verandert)."""
    try:
        uit = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', bron], cwd=ROOT, capture_output=True, text=True, timeout=20).stdout.strip()
        return uit or VANDAAG
    except Exception:
        return VANDAAG


def plaatsen(titel: str, notities: list, overzicht: bool) -> str:
    """De opdracht bovenaan een pakket: waar de notities horen en wat er wel en niet mag gebeuren."""
    recent = (datetime.date.today() - datetime.timedelta(days=3)).isoformat()
    rijen = '\n'.join(f'| {naam} | `{bron}` | {datum}{" · nieuw of gewijzigd" if datum >= recent else ""} |' for naam, bron, datum in notities)
    return f"""# Plaatsen in Obsidian: lees eerst

Pakket: **{titel}**, gemaakt op {VANDAAG} uit de repo van de configurator. Deze opdracht is geschreven voor wie de
notities in de Obsidian-kluis van Jonas zet: een mens of een Claude met toegang tot de kluis. Dit bestand zelf hoort niet
in de kluis.

## Wat je doet

1. **Zoek de map.** Zoek in de kluis de map `Configurator` (de notitie `00 Configurator - overzicht` staat erin). Bestaat
   ze niet, maak dan een map `Configurator` in de hoofdmap van de kluis, of op de plaats die Jonas aanwijst.
2. **Zet de notities erin.** Elke notitie uit de map `Configurator/` van dit pakket komt in die map, onder dezelfde
   bestandsnaam. Bestaat een notitie met die naam al, vervang haar dan volledig door deze versie: de repo is de bron,
   wijzigingen horen daar te gebeuren.
3. **Zet de afbeeldingen erbij.** Alles uit `Configurator/afbeeldingen/` komt in de submap `afbeeldingen` van die map
   (een bestaande afbeelding met dezelfde naam vervangen).
4. **Blijf van de rest af.** Wijzig of verwijder niets anders in de kluis. Notities in de map `Configurator` die niet in
   dit pakket zitten, blijven staan.
5. **Meld wat je deed:** hoeveel notities nieuw zijn en hoeveel vervangen, en of er een link (`[[…]]`) of een afbeelding
   (`![[…]]`) naar iets wijst dat in de kluis ontbreekt.

Kun je alleen tekst plaatsen (geen afbeeldingen)? Plaats dan de notities; de verwijzingen `![[…]]` blijven staan en
werken zodra de map `afbeeldingen` uit dit pakket in de kluis gesleept is. Zeg dat erbij in je melding.

## Wat erin zit ({len(notities)} notities)

| Notitie | Bron in de repo | Laatst gewijzigd |
|---|---|---|
{rijen}

{'Begin bij de notitie `00 Configurator - overzicht`: die verwijst naar alle andere.' if overzicht else 'Begin bij de notitie `3D-werkwijze - heranalyse en nieuwe aanpak`: dat is de ingang. De links naar notities buiten dit pakket werken als het volledige pakket (Obsidian - Configurator.zip) al in de kluis staat.'}

## Goed om te weten

- De links naar online pagina's (demo, controleblad, werkbank) zijn privé: ze openen alleen met het account waarmee ze
  gepubliceerd zijn, niet met een ander account.
- Alle prijzen in de notities zijn verzonnen demowaarden. De zetels zijn benaderingen uit foto's van de website.
- Een volgende versie maak je in de repo met `npm run obsidian`; daarna plaats je het nieuwe pakket op dezelfde manier.
"""


def maak_zip(pad: str, opdracht: str, bestanden: list):
    """Zip met de opdracht bovenaan en de gekozen bestanden uit de exportmap onder Configurator/."""
    with zipfile.ZipFile(pad, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('PLAATSEN - lees eerst.md', opdracht)
        for rel in bestanden:
            z.write(os.path.join(UIT, rel), os.path.join('Configurator', rel))


def zonder_frontmatter(tekst: str) -> str:
    # Een skill heeft al YAML-frontmatter; die tonen we als codeblok zodat Obsidian één frontmatter heeft.
    if tekst.startswith('---\n'):
        einde = tekst.find('\n---\n', 4)
        if einde > 0:
            return '```yaml\n' + tekst[4:einde] + '\n```\n' + tekst[einde + 5:]
    return tekst


def main():
    if os.path.exists(UIT):
        shutil.rmtree(UIT)
    os.makedirs(os.path.join(UIT, 'afbeeldingen'))
    inhoud = []  # (bestandsnaam zonder .md, bron, laatst gewijzigd)
    for bron, (titel, tags, klant) in NOTITIES.items():
        with open(os.path.join(ROOT, bron), encoding='utf-8') as f:
            tekst = omzetten(zonder_frontmatter(f.read()))
        datum = laatst_gewijzigd(bron)
        inhoud.append((titel, bron, datum))
        with open(os.path.join(UIT, f'{titel}.md'), 'w', encoding='utf-8') as f:
            f.write(frontmatter(titel, tags, klant, datum) + tekst)
    for b in os.listdir(os.path.join(ROOT, 'docs', 'afbeeldingen')):
        shutil.copy(os.path.join(ROOT, 'docs', 'afbeeldingen', b), os.path.join(UIT, 'afbeeldingen', b))

    # Collectie: één notitie per familie met alle modellen (uit de modellenlijst van de motor).
    modellen = os.path.join(ROOT, 'packages', 'core', 'voorbeelden', 'modellen.ts')
    bron = open(modellen, encoding='utf-8').read()
    rijen = re.findall(r"model\('([^']+)', '([^']+)', (SOFA|FAUTEUIL|ZETELBED|POEF), '((?:[^'\\]|\\.)*)'", bron)
    families = {'SOFA': "Sofa's", 'FAUTEUIL': 'Fauteuils', 'ZETELBED': 'Zetelbedden', 'POEF': 'Poufs & hockers'}
    regels = [frontmatter('Collectie Corneille & Silence', ['configurator', 'klant', 'collectie']),
              '# Collectie Corneille & Silence\n',
              'Bron: www.corneille-silence.be (gelezen op 31/10/2026). De site toont per model alleen naam en foto. '
              'In de configurator is elk model een **benadering op basis van de foto**; maten, opties en prijzen nog te bevestigen.\n',
              f'Bekijk en configureer: [Configurator demo]({DEMO}) → tabblad **Modellen**.\n']
    for sleutel, familie in families.items():
        lijst = [r for r in rijen if r[2] == sleutel]
        regels.append(f'\n## {familie} ({len(lijst)})\n\n| Model | Benadering in de configurator | Te bevestigen met de klant |\n|---|---|---|')
        for _, naam, _, omschr in lijst:
            regels.append(f"| **{naam}** | {omschr.replace(chr(92), '')} | maten, opties, stoffen, prijs |")
    regels.append('\n![[collectie-3d.png]]\n')
    with open(os.path.join(UIT, 'Collectie Corneille & Silence.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(regels))

    # Overzicht zetels (beelden en functies).
    with open(os.path.join(UIT, 'Zetels - configurator.md'), 'w', encoding='utf-8') as f:
        f.write(frontmatter('Zetels - configurator', ['configurator', 'zetels', 'demo', '3d'], ZETELS) + f"""# Zetelconfigurator (Corneille & Silence)

Eerste case: zitmeubelen. Drie stappen: **1 · Modellen → 2 · Ontwerpen → 3 · Offerte**, met daarnaast *Sofa op maat*,
*Kast op maat* en *Beheer* (stoffen, elementen, opties, modellen). Demo (privé): [Configurator demo]({DEMO}).
Alle prijzen zijn verzonnen; de modellen zijn benaderingen uit de foto's van de website.

## Modellen en collectie
42 modellen in vier families (sofa's, fauteuils, zetelbedden, poufs), elk met hun maten van de productpagina en een
eigen opbouw. Zie [[Collectie Corneille & Silence]].

![[zetels-website-vergelijking.jpg]]

## Details per model
Zachtheid geeft karakter (strakke of bolle kussens), eigen armstijlen, nekrol, naden en bies.

![[zetels-details.jpg]]

## Ontwerpen: boven- en vooraanzicht, 3D
Tekenen in het bovenaanzicht, maten slepen in het vooraanzicht, alles meteen in 3D.

![[ontwerp-vooraanzicht.png]]

## Decors, licht en fotomodus
Echte kamers als decor (met raam, licht en meubels), dag- en avondlicht, en een fotomodus die het licht natuurgetrouw
narekent.

![[zetel-decors-kamers.png]]
![[zetel-avond-decors.png]]

## Fauteuils en ronde vormen
![[fauteuils-vergelijking.png]]

## Proef: echt 3D-model
Een afgewerkt 3D-bestand in plaats van onze blokken, met onze stoffen. Zie [[Echte 3D-modellen - proef]].

![[echt-3d-model-proef.jpg]]

## Zachte vormen en eigen armvormen
De gestoffeerde delen smelten samen tot één zachte vorm; de strakke en de uitlopende arm hebben een eigen doorsnede.
Zie [[Zachte vormen - zetels in 3D]].

![[zachte-vormen-wallace.jpg]]
![[strakke-arm.jpg]]

## Doorlopende zetel: Doha en Montego
Een rij elementen als één zetel in 3D, ook in een boog: Doha met twee ronde banden en korte armleuningen, Montego met
een vaste zitting en een kortere rug.

![[doorlopende-zetel.jpg]]

## Meer lezen
- [[3D-technieken - kennisbank]]: welke 3D-techniek waarvoor, de lessen en een werkwijze voor een nieuw model
- [[Skill - 3D-logica zetels]]: hoe de 3D technisch werkt (skill voor Claude)
- [[Onderzoek zetelconfigurators]]: prijsopbouw, stofverbruik, tekenen
- [[Fase 0 - productkennis meubels]]: invulsjabloon voor het gesprek met de klant
- [[Overdracht en stand van zaken]]: alle rondes en beslissingen
""")

    # Overzicht bouw (beelden en functies).
    with open(os.path.join(UIT, 'Bouw - woningconfigurator.md'), 'w', encoding='utf-8') as f:
        f.write(frontmatter('Bouw - woningconfigurator', ['configurator', 'bouw', 'demo'], BOUW) + f"""# Woningconfigurator (bouwsector)

Tweede case op dezelfde motor: ramen, deuren, aanbouw en de hele woning. Vier stappen: **Plattegrond → Configurator → Offerte → Werf**.
Demo (privé): [Woningconfigurator]({BOUWDEMO}). Alle prijzen en technische waarden zijn verzonnen.

## Plattegrond met verdiepingen
Ruimtes tekenen (ook ruimte in ruimte), wanden tekenen om in te delen, ramen en deuren in de muren, trap, meubels, vloeren en wanden. Muren volgen automatisch uit de ruimtes.

![[bouw-plattegrond.png]]

## 3D van de hele woning
![[bouw-woning-3d.png]]

## Gevelaanzichten met kettingmaten
![[bouw-voorgevel.png]]

## Gevel ontwerpen: materialen en kleuren
Zoals de verfborstel in de bouwmodus van een bouwspel: kies baksteen, steenstrips, crepi, hout (staand of liggend), leien, zink of blauwe hardsteen, met kleurstalen en voegkleur. Klik op een muurvlak, met Shift+klik verf je de hele gevel; je kunt ook een verdieping of de hele woning in één keer verven. Je ziet een voorbeeld vóór je klikt. Verder: pipet, sokkel, ramen verschuiven of toevoegen in het aanzicht, en ongedaan maken. 3D en offerte (m² per materiaal) volgen meteen.

![[bouw-gevel-editor.png]]
![[bouw-gevel-3d.png]]

## Enkel ramen, zonder woning
Projectsoort zonder plattegrond: een ramenlijst met snelle invoer, en een maatlijst plakken uit Excel of een mail ("Keuken 1200 x 1400 draai-kip links 2 st"). Kies daarna vervanging (renovatie) of nieuwbouw.

![[bouw-ramenlijst.png]]

## Raam of deur configureren
Vakken met draairichting (punt van de driehoek = scharnieren, zicht van binnen), bovenlicht, roeden, zonwering, rooster, RC2.

![[bouw-raam-symbolen.png]]
![[bouw-raam-3d.png]]

## Raamberekening: statiek, afstandhouder, glasbestelling
Een te slappe stijl wordt rood in 3D (hier de ontmoetingsstijlen van een schuifraam bij hoge winddruk).

![[bouw-statiek-3d.png]]

## Projecten, sjablonen en bibliotheek
Meerdere projecten, automatisch bewaard in de browser; bewaren als bestand (.woning.json); sjablonen en standaardramen herbruikbaar.

![[bouw-projecten.png]]

## Werf: inmeting en meerwerkbon
![[bouw-inmeting.png]]
![[bouw-meerwerkbon.png]]

## Eerste versie: aanbouw met schuifraam
![[bouw-aanbouw-3d.png]]

## Meer lezen
- [[Onderzoek bouw - pijnpunten ramen en deuren]]
- [[Onderzoek raamsoftware - LogiKal, ReynaPro, Chacal]]
- [[Analyse bouw - woningconfigurator]]: wat er is en wat nog kan
- [[Analyse gebruiksgemak]]: taken, bevindingen, klantreis en aanbevelingen
- [[Begrippenlijst bouw]]
- [[Skill - woningconfigurator bouw]]: hoe het technisch werkt (skill voor Claude)
- [[3D-technieken - kennisbank]]: welke 3D-technieken van de zetels ook voor ramen en deuren bruikbaar zijn (advies 4/11)
""")

    # Startnotitie (Map of Content).
    with open(os.path.join(UIT, '00 Configurator - overzicht.md'), 'w', encoding='utf-8') as f:
        f.write(frontmatter('Configurator - overzicht', ['configurator', 'moc'], 'alle') + f"""# Configurator (CPQ): configureren → prijzen → offerte

Eigen productconfigurator, als aparte app **koppelbaar met Missing Link**. Eén motor (TypeScript), twee cases.

## Algemeen
- [[Overdracht en stand van zaken]]: waar staan we, beslissingen, open punten
- [[Analyse en stappenplan]]: Hive CPQ, andere pakketten, architectuur, fasen
- [[Technische opbouw (README)]]: voor de ontwikkelaar

## 3D: de manier van werken (voor elk 3D-onderdeel)
- [[3D-werkwijze - heranalyse en nieuwe aanpak]]: **de ingang.** Zes vaste stappen voor een model, bouwstijlen, het gereedschap (controleblad, vergelijkblad, modelbeelden, lichtmeting, toestelcontrole), de werkbank en haar bronnen, de pijnpunten met metingen, de ronde vormen
- [[Skill - 3D-werkbank]]: waar de code zit; een nieuw 3D-onderdeel toevoegen is één bron bijschrijven
- [[Beeldvergelijking 3D]]: de vaste beelden die een achteruitgang opvangen
- Privépagina's (openen alleen met het account waarmee ze gepubliceerd zijn): [Controleblad 3D]({CONTROLEBLAD}) · [3D-werkbank]({WERKBANK})

## 3D-kennis (voor beide cases)
- [[3D-technieken - kennisbank]]: welke techniek waarvoor (blokken, eigen doorsnede, zachte vormen, doorlopende opbouw, boog, echt 3D-bestand, weergave), de lessen, een werkwijze voor een nieuw model en het advies voor ramen en deuren
- [[Proeven 3D-motor (WebGPU, glas, weefsel)]]: de proeven van 4/11 en de overstap naar WebGPU

## Case 1: zitmeubelen (Corneille & Silence)
- **Demo:** [Configurator demo]({DEMO}): 1 · Modellen · 2 · Ontwerpen (boven- en vooraanzicht, 3D) · 3 · Offerte · Sofa en Kast op maat · Beheer
- [[Zetels - configurator]]: overzicht met beelden
- [[Collectie Corneille & Silence]]: de 42 modellen
- [[Zachte vormen - zetels in 3D]]: zachte vormen, eigen armvormen, doorlopende zetel (Doha, Montego)
- [[Echte 3D-modellen - proef]]: een echt 3D-bestand in plaats van blokken
- [[Onderzoek zetelconfigurators]]: prijsopbouw, stofverbruik, tekenen
- [[Fase 0 - productkennis meubels]]: invulsjabloon voor het gesprek met de klant
- [[Skill - 3D-logica zetels]]: hoe de 3D-weergave werkt

## Case 2: bouwsector (ramen, deuren, woning)
- **Demo:** [Woningconfigurator]({BOUWDEMO}): Plattegrond met verdiepingen · Gevels ontwerpen (materialen, kleuren) · Configurator per raam/deur · Offerte · Werf (inmeting, meerwerkbon) · Enkel ramen zonder woning · Klantweergave
- [[Bouw - woningconfigurator]]: overzicht met beelden
- [[Onderzoek bouw - pijnpunten ramen en deuren]]
- [[Onderzoek raamsoftware - LogiKal, ReynaPro, Chacal]]: hoe de grote pakketten rekenen en waar wij passen
- [[Analyse bouw - woningconfigurator]]: wat er is en wat nog kan
- [[Analyse gebruiksgemak]]: voor de klant en de verkoper op tablet
- [[Begrippenlijst bouw]]
- [[Skill - woningconfigurator bouw]]

## Volgende acties
- [ ] Pilot zetels formeel bevestigen met Corneille & Silence; fase 0 invullen (prijslijst, stoffen, opties per model)
- [ ] Bouw: eerste klant kiezen; echte systeemdata en prijzen van één leverancier
- [ ] Bouw: regels laten bevestigen (veiligheidsglas NBN S 23-002, EPB Uw, daglicht, ventilatie, valbeveiliging, btw 6 %)
- [ ] Koppeling met Missing Link uitwerken (offerte, akkoord, meerwerk als order, bestelbon per leverancier)
- [ ] Betekenis offerteregelvelden Missing Link laten bevestigen (keuzegroep, optie_sleutel, vereist_sleutel, berekening)
- [ ] Gebruikstest met 5 klanten en 5 verkopers (taken en SUS-vragenlijst, zie [[Analyse gebruiksgemak]])
- [ ] Echte gevelmaterialen en kleurstalen (foto's) van een leverancier
- [ ] Zetels: echte maten van Doha en Montego bevestigen (diepte loungedeel, zittingdikte, boog, waar de rug stopt)
- [ ] Zetels: de doorlopende zetel en de boog ook in het boven- en vooraanzicht (offerte als één geheel)
- [ ] Zetels: *Zacht* testen op een tablet, daarna beslissen of het standaard aan mag
- [ ] Ramen en deuren: doorsnedes (DXF) van één profielsysteem en 3D-bestanden van krukken en trekbeugels opvragen (zie [[3D-technieken - kennisbank]])

![[modellen-3d.png]]
![[bouw-gevel-3d.png]]
""")
    # Controle: elke link naar een notitie en elke afbeelding moet in de export bestaan.
    bestaat = {f[:-3] for f in os.listdir(UIT) if f.endswith('.md')} | set(os.listdir(os.path.join(UIT, 'afbeeldingen')))
    for f in sorted(os.listdir(UIT)):
        if not f.endswith('.md'):
            continue
        with open(os.path.join(UIT, f), encoding='utf-8') as h:
            tekst = re.sub(r'```.*?```', '', h.read(), flags=re.S)
        mist = sorted({m.split('|')[0].split('#')[0] for m in re.findall(r'\[\[([^\]]+)\]\]', tekst)} - bestaat - {''})
        if mist:
            print(f'Let op: {f} verwijst naar wat niet in de export zit: {", ".join(mist)}')

    # De skills ook apart als zip (om te installeren in Claude).
    for skill in ('zetel-3d', 'bouw-woning', '3d-werkbank'):
        shutil.make_archive(os.path.join(ROOT, 'obsidian-export', f'{skill}-skill'), 'zip', os.path.join(ROOT, '.claude', 'skills'), skill)

    # Twee pakketten, elk met de plaatsingsopdracht bovenaan: alles, en alleen de manier van werken voor de 3D.
    uit_map = os.path.join(ROOT, 'obsidian-export')
    notities = sorted(f for f in os.listdir(UIT) if f.endswith('.md'))
    beelden = sorted(os.path.join('afbeeldingen', b) for b in os.listdir(os.path.join(UIT, 'afbeeldingen')))
    bron_van = {titel: (bron, datum) for titel, bron, datum in inhoud}
    rij = lambda naam: (naam, *bron_van.get(naam, ('gemaakt door scripts/obsidian_export.py', VANDAAG)))
    alles = os.path.join(uit_map, 'Obsidian - Configurator.zip')
    maak_zip(alles, plaatsen('Configurator, alle notities', [rij(n[:-3]) for n in notities], True), notities + beelden)

    klein_notities = [f'{NOTITIES[b][0]}.md' for b in WERKWIJZE]
    gebruikt = set()
    for n in klein_notities:
        with open(os.path.join(UIT, n), encoding='utf-8') as f:
            gebruikt.update(re.findall(r'!\[\[([^\]|]+)', f.read()))
    klein_beelden = [b for b in beelden if os.path.basename(b) in gebruikt]
    klein = os.path.join(uit_map, 'Obsidian - Configurator - werkwijze 3D.zip')
    maak_zip(klein, plaatsen('Configurator, de 3D-werkwijze', [rij(n[:-3]) for n in klein_notities], False), klein_notities + klein_beelden)

    # Het oude pakket zonder opdracht niet laten staan (verwarrend), en een kopie in de map om door te sturen.
    oud = os.path.join(uit_map, 'Configurator.zip')
    if os.path.exists(oud):
        os.remove(oud)
    doorsturen = os.path.join(ROOT, 'doorsturen')
    os.makedirs(doorsturen, exist_ok=True)
    for pad in (alles, klein):
        shutil.copy(pad, doorsturen)
        print(f'{os.path.relpath(pad, ROOT)} ({os.path.getsize(pad) // 1024} kB)')
    print(f'{len(notities)} notities en {len(beelden)} afbeeldingen; klein pakket: {len(klein_notities)} notities en {len(klein_beelden)} afbeeldingen. Kopie in doorsturen/.')


if __name__ == '__main__':
    main()
