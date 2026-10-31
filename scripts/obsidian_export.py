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

NOTITIES = {
    'docs/overdracht.md': ('Overdracht en stand van zaken', ['configurator', 'status']),
    'docs/configurator-analyse-en-stappenplan.md': ('Analyse en stappenplan', ['configurator', 'analyse', 'stappenplan']),
    'docs/onderzoek-zetelconfigurators.md': ('Onderzoek zetelconfigurators', ['configurator', 'onderzoek']),
    'docs/fase0-productkennis-meubels.md': ('Fase 0 - productkennis meubels', ['configurator', 'klant', 'sjabloon']),
    'README.md': ('Technische opbouw (README)', ['configurator', 'techniek']),
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


def frontmatter(titel, tags):
    return f'---\ntitle: "{titel}"\ntags: [{", ".join(tags)}]\nklant: Corneille & Silence\nbijgewerkt: {VANDAAG}\n---\n\n'


def main():
    if os.path.exists(UIT):
        shutil.rmtree(UIT)
    os.makedirs(os.path.join(UIT, 'afbeeldingen'))
    for bron, (titel, tags) in NOTITIES.items():
        with open(os.path.join(ROOT, bron), encoding='utf-8') as f:
            tekst = omzetten(f.read())
        with open(os.path.join(UIT, f'{titel}.md'), 'w', encoding='utf-8') as f:
            f.write(frontmatter(titel, tags) + tekst)
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

    # Startnotitie (Map of Content).
    with open(os.path.join(UIT, '00 Configurator - overzicht.md'), 'w', encoding='utf-8') as f:
        f.write(frontmatter('Configurator - overzicht', ['configurator', 'moc']) + f"""# Configurator Corneille & Silence

Productconfigurator (configureren → prijzen → offerte) voor zitmeubelen op maat, als aparte app **koppelbaar met Missing Link**.

## Snel naar
- **Demo:** [Configurator demo]({DEMO}): Modellen · Sofa op maat · Vrij ontwerp (tekenen, vooraanzicht, 3D, ontwerpmodus) · Kast · Materialen
- [[Overdracht en stand van zaken]]: waar staan we, open punten
- [[Collectie Corneille & Silence]]: de 42 modellen
- [[Analyse en stappenplan]]: Hive CPQ, andere pakketten, architectuur, fasen
- [[Onderzoek zetelconfigurators]]: prijsopbouw, stofverbruik, tekenen
- [[Fase 0 - productkennis meubels]]: invulsjabloon voor het gesprek met de klant
- [[Technische opbouw (README)]]: voor de ontwikkelaar

## Volgende acties
- [ ] Pilot formeel bevestigen met Corneille & Silence
- [ ] Fase 0 invullen met de klant: prijslijst per model × maat × stofgroep, stoffen, opties per model
- [ ] Toegelaten opties per model vastleggen
- [ ] Bedden (Bedding & Beyond) toevoegen
- [ ] Betekenis offerteregelvelden Missing Link laten bevestigen (keuzegroep, optie_sleutel, vereist_sleutel, berekening)

![[modellen-3d.png]]
""")
    zip_pad = shutil.make_archive(os.path.join(ROOT, 'obsidian-export', 'Configurator'), 'zip', os.path.join(ROOT, 'obsidian-export'), 'Configurator')
    print(zip_pad)


if __name__ == '__main__':
    main()
