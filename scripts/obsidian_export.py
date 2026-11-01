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
    'README.md': ('Technische opbouw (README)', ['configurator', 'techniek'], 'alle'),
    'docs/onderzoek-zetelconfigurators.md': ('Onderzoek zetelconfigurators', ['configurator', 'zetels', 'onderzoek'], ZETELS),
    'docs/fase0-productkennis-meubels.md': ('Fase 0 - productkennis meubels', ['configurator', 'zetels', 'klant', 'sjabloon'], ZETELS),
    '.claude/skills/zetel-3d/SKILL.md': ('Skill - 3D-logica zetels', ['configurator', 'zetels', 'skill', '3d'], ZETELS),
    'docs/onderzoek-bouw-ramen-deuren.md': ('Onderzoek bouw - pijnpunten ramen en deuren', ['configurator', 'bouw', 'onderzoek'], BOUW),
    'docs/analyse-bouw-woning-demo.md': ('Analyse bouw - woningconfigurator', ['configurator', 'bouw', 'analyse'], BOUW),
    'docs/begrippen-bouw.md': ('Begrippenlijst bouw', ['configurator', 'bouw', 'begrippen'], BOUW),
    'docs/onderzoek-raamsoftware.md': ('Onderzoek raamsoftware - LogiKal, ReynaPro, Chacal', ['configurator', 'bouw', 'onderzoek', 'concurrentie'], BOUW),
    '.claude/skills/bouw-woning/SKILL.md': ('Skill - woningconfigurator bouw', ['configurator', 'bouw', 'skill', '3d'], BOUW),
}
TITEL_VAN = {os.path.basename(k): v[0] for k, v in NOTITIES.items()}


def omzetten(tekst: str) -> str:
    # Afbeeldingen → ![[bestand]]
    tekst = re.sub(r'!\[[^\]]*\]\((?:docs/)?afbeeldingen/([^)]+)\)', r'![[\1]]', tekst)
    # Links naar andere notities → [[Titel]]
    def link(m):
        doel = os.path.basename(m.group(2))
        return f'[[{TITEL_VAN[doel]}]]' if doel in TITEL_VAN else m.group(0)
    return re.sub(r'\[([^\]]+)\]\(((?:docs/)?[A-Za-z0-9_.\-]+\.md)\)', link, tekst)


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

## Raam of deur configureren
Vakken met draairichting (punt van de driehoek = scharnieren, zicht van binnen), bovenlicht, roeden, zonwering, rooster, RC2.

![[bouw-raam-symbolen.png]]
![[bouw-raam-3d.png]]

## Werf: inmeting en meerwerkbon
![[bouw-inmeting.png]]
![[bouw-meerwerkbon.png]]

## Eerste versie: aanbouw met schuifraam
![[bouw-aanbouw-3d.png]]

## Meer lezen
- [[Onderzoek bouw - pijnpunten ramen en deuren]]
- [[Onderzoek raamsoftware - LogiKal, ReynaPro, Chacal]]
- [[Analyse bouw - woningconfigurator]]: wat er is en wat nog kan
- [[Begrippenlijst bouw]]
- [[Skill - woningconfigurator bouw]]: hoe het technisch werkt (skill voor Claude)
""")

    # Startnotitie (Map of Content).
    with open(os.path.join(UIT, '00 Configurator - overzicht.md'), 'w', encoding='utf-8') as f:
        f.write(frontmatter('Configurator - overzicht', ['configurator', 'moc'], 'alle') + f"""# Configurator (CPQ): configureren → prijzen → offerte

Eigen productconfigurator, als aparte app **koppelbaar met Missing Link**. Eén motor (TypeScript), twee cases.

## Algemeen
- [[Overdracht en stand van zaken]]: waar staan we, beslissingen, open punten
- [[Analyse en stappenplan]]: Hive CPQ, andere pakketten, architectuur, fasen
- [[Technische opbouw (README)]]: voor de ontwikkelaar

## Case 1: zitmeubelen (Corneille & Silence)
- **Demo:** [Configurator demo]({DEMO}): Modellen · Sofa op maat · Vrij ontwerp (tekenen, vooraanzicht, 3D, ontwerpmodus) · Kast · Materialen · Catalogus
- [[Collectie Corneille & Silence]]: de 42 modellen
- [[Onderzoek zetelconfigurators]]: prijsopbouw, stofverbruik, tekenen
- [[Fase 0 - productkennis meubels]]: invulsjabloon voor het gesprek met de klant
- [[Skill - 3D-logica zetels]]: hoe de 3D-weergave werkt

## Case 2: bouwsector (ramen, deuren, woning)
- **Demo:** [Woningconfigurator]({BOUWDEMO}): Plattegrond met verdiepingen · Configurator per raam/deur · Offerte · Werf (inmeting, meerwerkbon)
- [[Bouw - woningconfigurator]]: overzicht met beelden
- [[Onderzoek bouw - pijnpunten ramen en deuren]]
- [[Onderzoek raamsoftware - LogiKal, ReynaPro, Chacal]]: hoe de grote pakketten rekenen en waar wij passen
- [[Analyse bouw - woningconfigurator]]: wat er is en wat nog kan
- [[Begrippenlijst bouw]]
- [[Skill - woningconfigurator bouw]]

## Volgende acties
- [ ] Pilot zetels formeel bevestigen met Corneille & Silence; fase 0 invullen (prijslijst, stoffen, opties per model)
- [ ] Bouw: eerste klant kiezen; echte systeemdata en prijzen van één leverancier
- [ ] Bouw: regels laten bevestigen (veiligheidsglas NBN S 23-002, EPB Uw, daglicht, ventilatie, valbeveiliging, btw 6 %)
- [ ] Koppeling met Missing Link uitwerken (offerte, akkoord, meerwerk als order, bestelbon per leverancier)
- [ ] Betekenis offerteregelvelden Missing Link laten bevestigen (keuzegroep, optie_sleutel, vereist_sleutel, berekening)

![[modellen-3d.png]]
![[bouw-woning-3d.png]]
""")
    # De skill ook apart als zip (om te installeren in Claude).
    shutil.make_archive(os.path.join(ROOT, 'obsidian-export', 'zetel-3d-skill'), 'zip', os.path.join(ROOT, '.claude', 'skills'), 'zetel-3d')
    shutil.make_archive(os.path.join(ROOT, 'obsidian-export', 'bouw-woning-skill'), 'zip', os.path.join(ROOT, '.claude', 'skills'), 'bouw-woning')
    zip_pad = shutil.make_archive(os.path.join(ROOT, 'obsidian-export', 'Configurator'), 'zip', os.path.join(ROOT, 'obsidian-export'), 'Configurator')
    print(zip_pad)


if __name__ == '__main__':
    main()
