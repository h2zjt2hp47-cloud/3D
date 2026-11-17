// Tijdperk 1: de Romeinen. Caesar tegen de Belgische stammen vanaf 57 v.Chr., daarna Romeins bestuur
// tot de Franken komen.
//
// BENADERING: de gebieden van de stammen, de plaats van hun versterkingen en de sterkte van de legers
// zijn ruwe schattingen. Zie docs/onderzoek-geschiedenis.md voor de nagekeken feiten.
import { bestaat, geefRond, legerVanBuiten, lijfVazallenIn, onderwerp, opstand, oorlog, verschijn, vrede } from '../effecten';
import { kans, paar, sterkteVan, vakkenVan } from '../toestand';
import { datumVan } from '../kalender';
import type { Tijdperk } from '../tijdperk';

const BELG = 'De bond van de Belgen';

export const ROMEINEN: Tijdperk = {
  id: 'romeinen',
  naam: 'De Romeinen',
  van: { dag: 1, maand: 3, jaar: -57 },
  tot: { dag: 1, maand: 1, jaar: 481 },
  beschrijving: 'De Belgische stammen hebben een bond gesloten tegen Rome, onder leiding van Galba, koning van de Suessiones. Caesar staat met zijn legioenen bij Bibrax, in het land van de Remi, die de kant van Rome kozen. Daarna volgen vijf eeuwen Romeins bestuur, tot de Franken het noorden overnemen.',
  bevolking: 1_290_000,
  namen: ['Ambiorix', 'Catuvolcus', 'Indutiomarus', 'Cingetorix', 'Boduognatus', 'Galba', 'Iccius', 'Commius', 'Andecomborius', 'Divico'],
  kiOorlog: false,
  huwelijken: false,
  facties: [
    {
      id: 'rome', naam: 'Rome', kleur: '#a3262a', kwaliteit: 1.8, soort: 'rijk', heerser: 'Gaius Julius Caesar', leeftijd: 43, titel: 'proconsul',
      groep: 'Rome en bondgenoten', kernen: [], geenVorst: true,
      buiten: { ingang: [49.0, 3.9], steun: 75, doelSterkte: 30000, naam: 'Versterking uit Italië' },
      startLegers: [
        { sterkte: 14000, naam: 'Caesar met vier legioenen', bij: [49.45, 3.9] },
        { sterkte: 10000, naam: 'Labienus met drie legioenen', bij: [49.45, 3.9] },
        { sterkte: 5000, naam: 'Hulptroepen', bij: [49.5, 4.1] },
      ],
      beschrijving: 'Caesar trekt met zijn legioenen vanuit het land van de Remi naar het noorden. Weinig mannen, maar de best getrainde troepen van hun tijd. Elk voorjaar komen er versterkingen.',
    },
    {
      id: 'remi', naam: 'Remi', kleur: '#d98a8a', kwaliteit: 0.9, soort: 'stam', heerser: 'Iccius', groep: 'Rome en bondgenoten', geenVorst: true, leger: 0.04,
      kernen: [[49.5, 3.82], [49.5, 4.4], [49.75, 4.6], [49.4, 4.7]],
      beschrijving: 'Bondgenoten van Rome in het zuiden. Hun versterking Bibrax ligt op de weg van de Belgen naar Caesar.',
    },
    {
      id: 'suessiones', naam: 'Suessiones', kleur: '#5f6b8a', soort: 'stam', heerser: 'Galba', groep: BELG, geenVorst: true, leger: 0.07,
      kernen: [[49.38, 3.32], [49.15, 3.4], [49.6, 3.2]],
      beschrijving: 'Hun koning Galba leidt de bond van de Belgen. Rijk landbouwgebied rond Noviodunum, dicht bij de Romeinen.',
    },
    {
      id: 'nerviers', naam: 'Nerviërs', kleur: '#3b6ea5', kwaliteit: 1.15, soort: 'stam', heerser: 'Boduognatus', groep: BELG, geenVorst: true, leger: 0.07,
      kernen: [[50.3, 3.8], [50.55, 3.9], [50.8, 4.15], [50.85, 3.75]],
      beschrijving: 'De dapperste van de Belgen, volgens Caesar zelf. Groot gebied tussen Schelde en Zenne, met het Kolenwoud als schuilplaats.',
    },
    {
      id: 'eburonen', naam: 'Eburonen', kleur: '#2e8b57', soort: 'stam', heerser: 'Ambiorix en Catuvolcus', groep: BELG, geenVorst: true, leger: 0.07,
      kernen: [[50.78, 5.46], [51.0, 5.35], [50.65, 5.75], [51.2, 5.9]],
      beschrijving: 'Tussen Maas en Rijn, met Atuatuca als versterking (benadering: bij Tongeren). Onder Ambiorix later de hardnekkigste tegenstander van Rome.',
    },
    {
      id: 'aduatuci', naam: 'Aduatuken', kleur: '#8e6bb5', soort: 'stam', heerser: '(naam onbekend)', groep: BELG, geenVorst: true, leger: 0.07,
      kernen: [[50.465, 4.87], [50.62, 4.75], [50.4, 4.5]],
      beschrijving: 'Rond de samenvloeiing van Samber en Maas. Hun sterke versterking (benadering: bij Namen) is moeilijk in te nemen.',
    },
    {
      id: 'atrebaten', naam: 'Atrebaten', kleur: '#b5651d', soort: 'stam', heerser: '(naam onbekend)', groep: BELG, geenVorst: true, leger: 0.07,
      kernen: [[50.29, 2.78], [50.45, 2.6], [50.15, 3.0]],
      beschrijving: 'Rond Nemetocenna (Atrecht). Vruchtbare grond en een versterkte hoofdplaats.',
    },
    {
      id: 'menapiers', naam: 'Menapiërs', kleur: '#4aa3a3', kwaliteit: 0.95, soort: 'stam', heerser: '(naam onbekend)', groep: BELG, geenVorst: true, leger: 0.07,
      kernen: [[51.1, 3.4], [51.2, 4.0], [51.25, 4.7], [51.0, 2.7]],
      beschrijving: 'In de kustvlakte en de moerassen van het noorden. Weinig volk, maar wie hen aanvalt, verdrinkt bijna in het slijk.',
    },
    {
      id: 'morinen', naam: 'Morinen', kleur: '#6b8e23', soort: 'stam', heerser: '(naam onbekend)', groep: BELG, geenVorst: true, leger: 0.07,
      kernen: [[50.64, 2.25], [50.85, 2.3], [50.45, 1.8], [50.95, 1.95]],
      beschrijving: 'Aan de kust, ver van Rome. Moeilijk te bereiken door moerassen en bossen.',
    },
    {
      id: 'viromandui', naam: 'Viromandui', kleur: '#8b5a8b', soort: 'stam', heerser: '(naam onbekend)', groep: BELG, geenVorst: true, leger: 0.07,
      kernen: [[49.85, 3.29], [49.95, 3.6]],
      beschrijving: 'Kleine stam rond Saint-Quentin, in de bond met de Nerviërs en de Atrebaten.',
    },
    {
      id: 'condrusi', naam: 'Condrusen', kleur: '#b5a642', kwaliteit: 0.95, soort: 'stam', heerser: '(naam onbekend)', groep: BELG, geenVorst: true, leger: 0.07,
      kernen: [[50.3, 5.2], [50.15, 4.95]],
      beschrijving: 'Kleine stam in de heuvels van de Condroz, klem tussen grote buren.',
    },
    {
      id: 'treveri', naam: 'Treveri', kleur: '#c97b2a', kwaliteit: 1.05, soort: 'stam', heerser: 'Indutiomarus', groep: 'Afzijdig', geenVorst: true, leger: 0.04,
      kernen: [[49.54, 5.86], [49.9, 6.1], [50.1, 5.6], [49.75, 5.3], [50.35, 6.0]],
      beschrijving: 'Grote stam in de Ardennen en langs de Moezel, bekend om hun ruiters. Ze houden zich voorlopig afzijdig.',
    },
    {
      id: 'franken', naam: 'Franken', kleur: '#5b7f3a', kwaliteit: 1.1, soort: 'rijk', heerser: '(stamhoofden)', groep: 'Later', geenVorst: true, laat: true, nietKiesbaar: true,
      kernen: [], buiten: { ingang: [51.6, 6.3], steun: 20, doelSterkte: 12000, naam: 'Frankische krijgers over de Rijn' },
      beschrijving: 'Germaanse stammen van over de Rijn, die vanaf de derde eeuw het Romeinse land binnenvallen.',
    },
  ],
  bond: [
    ['rome', 'remi'],
    ...['suessiones', 'nerviers', 'eburonen', 'aduatuci', 'atrebaten', 'menapiers', 'morinen', 'viromandui', 'condrusi']
      .flatMap((a, i, l) => l.slice(i + 1).map((b) => [a, b] as [string, string])),
  ],
  oorlog: ['rome', 'remi'].flatMap((a) => ['suessiones', 'nerviers', 'eburonen', 'aduatuci', 'atrebaten', 'menapiers', 'morinen', 'viromandui', 'condrusi'].map((b) => [a, b] as [string, string])),
  versterkingen: [
    { naam: 'Bibrax', ligging: [49.5, 3.82], bezetting: 2500 },
    { naam: 'Noviodunum', ligging: [49.38, 3.32], bezetting: 3000 },
    { naam: 'Nemetocenna', ligging: [50.29, 2.78], bezetting: 2500 },
    { naam: 'Versterking van de Aduatuken', ligging: [50.465, 4.87], bezetting: 4000 },
    { naam: 'Atuatuca', ligging: [50.78, 5.46], bezetting: 2500 },
    { naam: 'Titelberg', ligging: [49.54, 5.86], bezetting: 3500 },
  ],
  gebeurtenissen: [
    {
      id: 'ambiorix', datum: { dag: 1, maand: 10, jaar: -54 }, onzeker: true,
      titel: 'De opstand van Ambiorix, herfst 54 v.Chr.',
      tekst: 'Ambiorix, koning van de Eburonen, valt de Romeinen aan in hun winterkamp. De Eburonen en de Treveri grijpen naar de wapens tegen Rome.',
      doe: (t, k) => {
        opstand(t, k, 'eburonen', 7000, 'rome');
        opstand(t, k, 'treveri', 4500, 'rome');
        if (bestaat(t, 'nerviers') && t.facties.nerviers.heer === 'rome' && kans(t) < 0.6) opstand(t, k, 'nerviers', 4000);
      },
    },
    {
      id: 'caesar53', datum: { dag: 1, maand: 3, jaar: -53 }, stil: true,
      titel: 'Nieuwe legioenen', tekst: 'Caesar brengt nieuwe legioenen naar het noorden.',
      doe: (t, k) => { legerVanBuiten(t, k, 'rome', 10000, 'Nieuwe legioenen van Caesar'); },
    },
    {
      id: 'verovering-voorbij', datum: { dag: 1, maand: 1, jaar: -50 },
      titel: 'Het einde van de veroveringstijd, 50 v.Chr.',
      tekst: 'Caesars oorlog in Gallië is zo goed als voorbij. Rome houdt minder troepen in het noorden. Vanaf nu gaan de jaren sneller als er geen oorlog is.',
      doe: (t) => { if (t.facties.rome.buiten) t.facties.rome.buiten.doelSterkte = 15000; },
    },
    {
      id: 'provincie', datum: { dag: 1, maand: 1, jaar: -22 }, onzeker: true,
      titel: 'Gallia Belgica',
      tekst: 'Onder keizer Augustus wordt het noorden van Gallië een Romeinse provincie: Gallia Belgica. De onderworpen stammen worden bestuurlijke gebieden van Rome (civitates). Wegen, villa\'s en steden volgen.',
      doe: (t) => {
        lijfVazallenIn(t, 'rome');
        for (const f of Object.values(t.facties)) {
          if (f.id === 'rome' || f.soort !== 'stam' || !f.bestaat || f.heer) continue;
          if (vakkenVan(t, f.id).length < 6) onderwerp(t, f.id, 'rome');
        }
      },
    },
    {
      id: 'bataven', datum: { dag: 1, maand: 1, jaar: 69 },
      titel: 'De Bataafse opstand',
      tekst: 'In het noorden komen de Bataven in opstand tegen Rome. Ook bij de Treveri grijpen leiders naar de wapens.',
      doe: (t, k) => {
        if (t.vakken.some((v) => v.oorsprong === 'treveri' && v.eigenaar === 'rome')) opstand(t, k, 'treveri', 5000, 'rome');
      },
    },
    {
      id: 'franken-invallen', datum: { dag: 1, maand: 9, jaar: 260 },
      titel: 'Het Gallische keizerrijk',
      tekst: 'Rome zit in een diepe crisis. In Gallië roept Postumus zich uit tot keizer (260-274). Frankische benden steken de Rijn over en plunderen het land.',
      doe: (t, k) => {
        verschijn(t, 'franken');
        oorlog(t, 'franken', 'rome');
        legerVanBuiten(t, k, 'franken', 7000, 'Frankische benden');
        legerVanBuiten(t, k, 'franken', 5000, 'Frankische benden');
        if (t.facties.rome.buiten) t.facties.rome.buiten.doelSterkte = 25000;
      },
    },
    {
      id: 'toxandrie', datum: { dag: 1, maand: 6, jaar: 358 }, onzeker: true,
      titel: 'Franken in Toxandrië',
      tekst: 'De Romeinen laten Salische Franken wonen in Toxandrië (de Kempen), als bondgenoten die de grens moeten bewaken.',
      doe: (t, k) => {
        verschijn(t, 'franken');
        vrede(t, 'franken', 'rome');
        geefRond(t, k, [51.2, 5.2], 38, 'franken');
        t.facties.franken.heer = 'rome';
      },
    },
    {
      id: 'rijnovergang', datum: { dag: 31, maand: 12, jaar: 406 }, onzeker: true,
      titel: 'De Rijnovergang',
      tekst: 'Vandalen, Alanen en Sueven steken de bevroren Rijn over. Het Romeinse gezag in het noorden stort in: er komen geen versterkingen meer uit Italië.',
      doe: (t) => {
        const r = t.facties.rome;
        if (r.buiten) { r.buiten.steun = 10; r.buiten.doelSterkte = 0; }
        if (bestaat(t, 'franken')) t.facties.franken.heer = null;
      },
    },
    {
      id: 'chlodio', datum: { dag: 1, maand: 1, jaar: 440 }, onzeker: true,
      titel: 'Chlodio neemt Doornik',
      tekst: 'De Frankische koning Chlodio neemt Doornik en Kamerijk in. Rond Doornik groeit een Frankisch koninkrijk.',
      keuzeVoor: ['rome'],
      opties: [
        { tekst: 'Laten gebeuren', uitleg: 'Rome geeft het noordwesten op', doe: (t, k) => { verschijn(t, 'franken'); geefRond(t, k, [50.61, 3.39], 45, 'franken'); geefRond(t, k, [50.18, 3.23], 25, 'franken'); vrede(t, 'franken', 'rome'); } },
        { tekst: 'Vechten', uitleg: 'de Franken vallen aan', doe: (t, k) => { verschijn(t, 'franken'); oorlog(t, 'franken', 'rome'); legerVanBuiten(t, k, 'franken', 9000, 'Franken van Chlodio'); } },
      ],
    },
  ],
  // tot Gallia Belgica een provincie is, komt Rome elk voorjaar terug naar de vrije stammen
  maandelijks: (t, k) => {
    const d = datumVan(t.dag);
    if (d.maand !== 4 || d.jaar >= -22 || !bestaat(t, 'rome')) return;
    const vrij = Object.values(t.facties).filter((f) => f.bestaat && f.soort === 'stam' && !f.heer && f.id !== 'remi' && f.id !== 'franken'
      && !t.bond.includes(paar('rome', f.id)) && (t.bestand[paar('rome', f.id)] ?? 0) <= t.dag);
    if (!vrij.length) return;
    const nu = vrij.filter((f) => !t.oorlog.includes(paar('rome', f.id)));
    for (const f of nu) if (kans(t) < 0.6) oorlog(t, 'rome', f.id);
    if (sterkteVan(t, 'rome') < 20000) legerVanBuiten(t, k, 'rome', 15000, 'Nieuwe legioenen');
  },
};
