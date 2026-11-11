"""
Maakt een Obsidian-map van de projectdocumentatie: notities met frontmatter,
[[wikilinks]] tussen de notities en de afbeeldingen. Resultaat:
  obsidian-export/Configurator/   en   obsidian-export/Configurator.zip
Gebruik: python3 -I scripts/obsidian_export.py
"""
import datetime
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
UIT = os.path.join(ROOT, 'obsidian-export', 'Configurator')
VANDAAG = datetime.date.today().isoformat()
DEMO = 'https://claude.ai/artifact/BtVKYeQKC7szR1ZwW97VB1'
BOUWDEMO = 'https://claude.ai/artifact/FaTp1zVvy9YePyarithjyh'
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
    'docs/werkwijze-3d.md': ('3D-werkwijze - heranalyse en nieuwe aanpak', ['configurator', '3d', 'werkwijze'], ZETELS),
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
# De twee skills heten allebei SKILL.md: een vermelding van hun pad wordt een link naar de juiste notitie.
SKILLS = {'.claude/skills/zetel-3d/SKILL.md': 'Skill - 3D-logica zetels', '.claude/skills/bouw-woning/SKILL.md': 'Skill - woningconfigurator bouw'}


def omzetten(tekst: str) -> str:
    for pad, titel in SKILLS.items():
        tekst = tekst.replace(f'`{pad}`', f'[[{titel}]]')
    # Afbeeldingen → ![[bestand]]
    tekst = re.sub(r'!\[[^\]]*\]\((?:docs/)?afbeeldingen/([^)]+)\)', r'![[\1]]', tekst)
    # Links naar andere notities → [[Titel]]
    def link(m):
        doel = os.path.basename(m.group(2))
        return f'[[{TITEL_VAN[doel]}]]' if doel in TITEL_VAN else m.group(0)
    return re.sub(r'\[([^\]]+)\]\(((?:\.\./)?(?:[A-Za-z0-9_\-]+/)*[A-Za-z0-9_.\-]+\.md)\)', link, tekst)


def frontmatter(titel, tags, klant=ZETELS):
    return f'---\ntitle: "{titel}"\ntags: [{", ".join(tags)}]\nklant: {klant}\nbijgewerkt: {VANDAAG}\n---\n\n'


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
    for bron, (titel, tags, klant) in NOTITIES.items():
        with open(os.path.join(ROOT, bron), encoding='utf-8') as f:
            tekst = omzetten(zonder_frontmatter(f.read()))
        with open(os.path.join(UIT, f'{titel}.md'), 'w', encoding='utf-8') as f:
            f.write(frontmatter(titel, tags, klant) + tekst)
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
    # De skill ook apart als zip (om te installeren in Claude).
    shutil.make_archive(os.path.join(ROOT, 'obsidian-export', 'zetel-3d-skill'), 'zip', os.path.join(ROOT, '.claude', 'skills'), 'zetel-3d')
    shutil.make_archive(os.path.join(ROOT, 'obsidian-export', 'bouw-woning-skill'), 'zip', os.path.join(ROOT, '.claude', 'skills'), 'bouw-woning')
    zip_pad = shutil.make_archive(os.path.join(ROOT, 'obsidian-export', 'Configurator'), 'zip', os.path.join(ROOT, 'obsidian-export'), 'Configurator')
    print(zip_pad)


if __name__ == '__main__':
    main()
