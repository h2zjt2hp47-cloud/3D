// Tijdperken 9 tot 11: België (1830-1914), de wereldoorlogen (1914-1945) en na de oorlog (1945-nu).
// Bron: docs/onderzoek-geschiedenis.md. Gevoelige stukken (Congo, bezetting, collaboratie) zijn speelbaar,
// met hun gevolgen; de teksten blijven bij de feiten.
import {
  bestaat, bond, geefGebieden, geefRond, geefTerug, heerser, hernoem, legerBij, legerVanBuiten, onderwerp, oorlog, vrede,
} from '../effecten';
import type { Tijdperk } from '../tijdperk';
import { wijzigOpinie, type Toestand } from '../toestand';
import { prijsfactor } from '../volgorde';
import { BELGIE, FRANS, GROOTHERTOGDOM, NEDERLANDS, P, RICHTING } from './gemeen';

function onrust(t: Toestand, f: string, d: number) {
  for (const v of t.vakken) if (v.eigenaar === f) v.tevredenheid = Math.max(0, Math.min(100, v.tevredenheid + d));
}

const heeft = (t: Toestand, vlag: string) => t.gedaan.includes(vlag);

export const BELGIE_TIJD: Tijdperk = {
  id: 'belgie',
  naam: 'België',
  van: { dag: 4, maand: 10, jaar: 1830 },
  tot: { dag: 4, maand: 8, jaar: 1914 },
  beschrijving: 'Na de Septemberdagen in Brussel verklaart een Voorlopig Bewind België onafhankelijk. Willem I aanvaardt dat niet. De grote mogendheden beslissen mee over de grenzen. Daarna volgen spoorwegen, steenkool, staal en fabrieken: België wordt een van de eerste nijverheidslanden ter wereld.',
  bevolking: 6_500_000,
  namen: ['Leopold', 'Albert', 'Filips', 'Boudewijn', 'Charles', 'Jules', 'Auguste', 'Paul'],
  kiOorlog: false,
  huwelijken: false,
  facties: [
    { id: 'belgie', naam: 'België', kleur: '#e8c547', soort: 'staat', heerser: 'Voorlopig Bewind', groep: 'België en Nederland', gebieden: [...BELGIE, 'Nederlands-Limburg', ...GROOTHERTOGDOM], kernen: [P.brussel, P.gent, P.luik, P.antwerpen, P.luxemburg, P.maastricht], leger: 0.01,
      beschrijving: 'Het jonge België. Het claimt ook Limburg en Luxemburg, maar Maastricht, Luxemburg en de citadel van Antwerpen blijven in Nederlandse handen.' },
    { id: 'nederland', naam: 'Verenigd Koninkrijk der Nederlanden', kleur: '#e07b39', soort: 'staat', heerser: 'Willem I', leeftijd: 58, titel: 'koning', dynastie: 'Oranje-Nassau', groep: 'België en Nederland', gebieden: ['Zeeuws-Vlaanderen'], kernen: [P.terneuzen], leger: 0.01,
      buiten: { ingang: RICHTING.noord, steun: 150, doelSterkte: 50000, naam: 'Nederlandse troepen' },
      beschrijving: 'Koning Willem I aanvaardt de afscheiding niet en wil het Zuiden terug.' },
    { id: 'frankrijk', naam: 'Frankrijk', kleur: '#3b5fa5', soort: 'rijk', heerser: 'Lodewijk Filips', leeftijd: 57, titel: 'koning', groep: 'De grote mogendheden', gebieden: FRANS, kernen: [P.rijsel, P.atrecht, P.soissons, P.charleville], leger: 0.005,
      buiten: { ingang: RICHTING.zuid, steun: 200, doelSterkte: 50000, naam: 'Frans leger' }, beschrijving: 'Frankrijk steunt België tegen Nederland.' },
    { id: 'pruisen', naam: 'Pruisen', kleur: '#4a4a4a', soort: 'rijk', heerser: 'Frederik Willem III', leeftijd: 60, titel: 'koning', groep: 'De grote mogendheden', nietKiesbaar: true, kernen: [],
      buiten: { ingang: RICHTING.oost, steun: 150, doelSterkte: 60000, naam: 'Pruisisch leger' }, beschrijving: 'Pruisen, bondgenoot van Willem I, met het oog op Luxemburg.' },
  ],
  oorlog: [['belgie', 'nederland']],
  bond: [['belgie', 'frankrijk'], ['nederland', 'pruisen']],
  versterkingen: [
    { naam: 'Citadel van Antwerpen', ligging: P.antwerpen, bezetting: 5000 }, { naam: 'Vesting Luxemburg', ligging: P.luxemburg, bezetting: 6000 },
    { naam: 'Vesting Maastricht', ligging: P.maastricht, bezetting: 5000 }, { naam: 'Citadel van Namen', ligging: P.namen, bezetting: 3000 },
  ],
  bijStart: (t) => {
    // Maastricht en Luxemburg blijven in Nederlandse handen (vestingen)
    for (const [i, v] of t.vakken.entries()) if (v.fortNaam === 'Vesting Maastricht' || v.fortNaam === 'Vesting Luxemburg') { v.eigenaar = 'nederland'; void i; }
  },
  gebeurtenissen: [
    { id: 'leopold', datum: { dag: 21, maand: 7, jaar: 1831 }, titel: 'Leopold I legt de eed af', tekst: 'Leopold van Saksen-Coburg legt de grondwettelijke eed af en wordt de eerste koning der Belgen.', doe: (t) => { if (bestaat(t, 'belgie')) { heerser(t, 'belgie', 'Leopold I', 40); t.facties.belgie.titel = 'koning'; t.facties.belgie.dynastie = 'Saksen-Coburg'; } } },
    { id: 'tiendaagse', datum: { dag: 2, maand: 8, jaar: 1831 }, titel: 'De Tiendaagse Veldtocht', tekst: 'Het Nederlandse leger valt België binnen en verslaat de Belgische troepen bij Hasselt en Leuven. Een Frans leger komt België te hulp.',
      doe: (t, k) => { oorlog(t, 'nederland', 'belgie'); legerVanBuiten(t, k, 'nederland', 45000, 'Nederlands leger'); legerBij(t, k, 'frankrijk', P.bergen, 50000, 'Frans Noorderleger'); oorlog(t, 'frankrijk', 'nederland'); } },
    { id: 'spoorweg', datum: { dag: 5, maand: 5, jaar: 1835 }, onzeker: true, titel: 'De eerste spoorlijn', tekst: 'Tussen Brussel en Mechelen rijdt de eerste trein van het Europese vasteland. Het spoornet groeit snel; in Henegouwen en Luik bloeit de nijverheid.',
      doe: (t, k) => { for (const [i, v] of t.vakken.entries()) { const [lon, lat] = k.vakken[i].lonlat; if (v.eigenaar === 'belgie' && Math.abs(lon - 4.42) < 0.12 && lat > 50.8 && lat < 51.1) v.weg = Math.max(v.weg, 2); } } },
    { id: 'londen1839', datum: { dag: 19, maand: 4, jaar: 1839 }, titel: 'Het Verdrag van Londen', tekst: 'Willem I erkent België. Oost-Limburg met Maastricht en het oosten van Luxemburg (het Groothertogdom) gaan naar hem. De grote mogendheden waarborgen de neutraliteit van België.',
      keuzeVoor: ['belgie', 'nederland'],
      opties: [
        { tekst: 'Tekenen', uitleg: 'vrede en erkende neutraliteit', doe: (t, k) => { vrede(t, 'belgie', 'nederland'); vrede(t, 'frankrijk', 'nederland'); geefGebieden(t, k, ['Nederlands-Limburg', ...GROOTHERTOGDOM], 'nederland'); hernoem(t, 'nederland', 'Nederland'); t.gedaan.push('neutraliteit'); } },
        { tekst: 'Weigeren', uitleg: 'oorlog met Nederland en Pruisen', doe: (t) => { oorlog(t, 'belgie', 'nederland'); oorlog(t, 'belgie', 'pruisen'); } },
      ] },
    { id: 'schoolstrijd', datum: { dag: 1, maand: 7, jaar: 1879 }, onzeker: true, stil: true, titel: 'De eerste schoolstrijd', tekst: 'Een liberale schoolwet zet de katholieken in verzet; in 1884 draait een katholieke regering de wet terug.', doe: (t) => onrust(t, 'belgie', -8) },
    { id: 'congo', datum: { dag: 1, maand: 7, jaar: 1885 }, titel: 'De Congo-Vrijstaat',
      tekst: 'Koning Leopold II krijgt de Congo als persoonlijk bezit. Hij laat het land uitbuiten voor ivoor en rubber, met dwangarbeid, gijzelingen en verminkingen. Zeer veel Congolezen sterven door geweld, honger en ziekte; de schattingen lopen sterk uiteen. In het spel kies je hoe België zich opstelt.',
      keuzeVoor: ['belgie'],
      opties: [
        { tekst: 'De Vrijstaat laten begaan', uitleg: 'veel geld voor koning en land; elders in de wereld daalt je aanzien, en later volgt een schandaal', doe: (t) => { t.gedaan.push('congo:rubber'); } },
        { tekst: 'Afstand nemen', uitleg: 'geen koloniale opbrengst; je behoudt je aanzien', doe: (t) => { t.gedaan.push('congo:geen'); } },
      ] },
    { id: 'stemrecht', datum: { dag: 18, maand: 4, jaar: 1893 }, onzeker: true, titel: 'Algemeen meervoudig stemrecht', tekst: 'Na stakingen en betogingen krijgt elke man stemrecht, al hebben sommigen meer stemmen. De Belgische Werkliedenpartij komt in het parlement.', doe: (t) => onrust(t, 'belgie', 8) },
    { id: 'belgischcongo', datum: { dag: 15, maand: 11, jaar: 1908 }, titel: 'Belgisch-Congo', tekst: 'Na internationale verontwaardiging over de misdaden in de Vrijstaat neemt de Belgische staat de Congo over van Leopold II. Het bewind blijft uitbuitend.',
      voorwaarde: (t) => heeft(t, 'congo:rubber'),
      doe: (t) => { t.gedaan.push('congo:kolonie'); onrust(t, 'belgie', -5); for (const f of Object.keys(t.facties)) wijzigOpinie(t, 'belgie', f, -10); } },
    { id: 'albert', datum: { dag: 17, maand: 12, jaar: 1909 }, onzeker: true, stil: true, titel: 'Albert I', tekst: 'Albert I wordt koning.', doe: (t) => heerser(t, 'belgie', 'Albert I', 34) },
  ],
  maandelijks: (t) => {
    if (!bestaat(t, 'belgie')) return;
    const p = prijsfactor(t.tijdperk);
    if (heeft(t, 'congo:rubber') && !heeft(t, 'congo:kolonie')) {
      t.facties.belgie.schat += 40 * p;
      for (const f of Object.keys(t.facties)) if (f !== 'belgie') wijzigOpinie(t, 'belgie', f, -0.3);
    } else if (heeft(t, 'congo:kolonie')) t.facties.belgie.schat += 20 * p;
  },
};

export const WERELDOORLOGEN: Tijdperk = {
  id: 'wereldoorlogen',
  naam: 'De wereldoorlogen',
  van: { dag: 4, maand: 8, jaar: 1914 },
  tot: { dag: 8, maand: 5, jaar: 1945 },
  beschrijving: 'Op 4 augustus 1914 valt het Duitse leger het neutrale België binnen, op weg naar Frankrijk. Luik, Namen en Antwerpen moeten de opmars ophouden. Twintig jaar na het einde van die oorlog volgt een tweede inval, in mei 1940, en vier jaar bezetting.',
  bevolking: 12_000_000,
  namen: ['Albert', 'Leopold', 'Karel', 'Hubert', 'Paul-Henri', 'Achille', 'Camille'],
  kiOorlog: false,
  geenVredeTussenComputers: true,
  huwelijken: false,
  facties: [
    { id: 'belgie', naam: 'België', kleur: '#e8c547', kwaliteit: 0.9, soort: 'staat', heerser: 'Albert I', leeftijd: 39, titel: 'koning', dynastie: 'Saksen-Coburg', groep: 'De Geallieerden', gebieden: BELGIE, kernen: [P.brussel, P.antwerpen, P.luik, P.namen, P.gent], leger: 0.025,
      beschrijving: 'Neutraal, maar aangevallen. Het leger is klein; de vestingen van Luik, Namen en Antwerpen moeten tijd winnen.' },
    { id: 'frankrijk', naam: 'Frankrijk', kleur: '#3b5fa5', soort: 'rijk', heerser: 'Raymond Poincaré', leeftijd: 53, titel: 'president', groep: 'De Geallieerden', geenVorst: true, gebieden: FRANS, kernen: [P.rijsel, P.atrecht, P.soissons, P.charleville], leger: 0.02,
      buiten: { ingang: RICHTING.zuid, steun: 400, doelSterkte: 400000, naam: 'Frans leger' }, beschrijving: 'Frankrijk, het eigenlijke doel van de Duitse aanval.' },
    { id: 'duitsland', naam: 'Duitse Keizerrijk', kleur: '#4a4a4a', kwaliteit: 1.15, soort: 'rijk', heerser: 'Wilhelm II', leeftijd: 55, titel: 'keizer', groep: 'De Centralen', kernen: [],
      buiten: { ingang: RICHTING.oost, steun: 600, doelSterkte: 600000, naam: 'Duitse legers' },
      startLegers: [
        { sterkte: 320000, naam: 'Duitse Eerste Leger', bij: [50.75, 6.0] },
        { sterkte: 260000, naam: 'Duitse Tweede Leger', bij: [50.45, 6.05] },
        { sterkte: 180000, naam: 'Duitse Derde Leger', bij: [50.0, 6.1] },
      ],
      beschrijving: 'Het Duitse Keizerrijk wil Frankrijk snel verslaan, via België.' },
    { id: 'grootbrittannie', naam: 'Verenigd Koninkrijk', kleur: '#c0533f', kwaliteit: 1.05, soort: 'rijk', heerser: 'George V', leeftijd: 49, titel: 'koning', groep: 'De Geallieerden', nietKiesbaar: true, kernen: [],
      buiten: { ingang: RICHTING.zee, steun: 400, doelSterkte: 250000, naam: 'Brits leger' }, startLegers: [{ sterkte: 90000, naam: 'Brits Expeditieleger', bij: [50.45, 3.95] }],
      beschrijving: 'Groot-Brittannië verklaart Duitsland de oorlog om de Belgische neutraliteit.' },
    { id: 'nederland', naam: 'Nederland', kleur: '#e07b39', soort: 'staat', heerser: 'Wilhelmina', leeftijd: 33, titel: 'koningin', groep: 'Neutraal', gebieden: NEDERLANDS, kernen: [P.terneuzen, P.maastricht], leger: 0.01,
      beschrijving: 'Nederland blijft in de Eerste Wereldoorlog neutraal.' },
    { id: 'luxemburg', naam: 'Groothertogdom Luxemburg', kleur: '#7fb3d5', soort: 'staat', heerser: 'Marie-Adélaïde', leeftijd: 20, titel: 'groothertogin', groep: 'Neutraal', gebieden: GROOTHERTOGDOM, kernen: [P.luxemburg], leger: 0.002,
      beschrijving: 'Neutraal en weerloos; op 2 augustus 1914 trekken Duitse troepen erdoor.' },
  ],
  oorlog: [['duitsland', 'belgie'], ['duitsland', 'frankrijk'], ['duitsland', 'grootbrittannie']],
  bond: [['belgie', 'frankrijk'], ['belgie', 'grootbrittannie'], ['frankrijk', 'grootbrittannie']],
  versterkingen: [
    { naam: 'Forten van Luik', ligging: P.luik, bezetting: 30000 }, { naam: 'Forten van Namen', ligging: P.namen, bezetting: 25000 },
    { naam: 'Nationaal Reduit Antwerpen', ligging: P.antwerpen, bezetting: 60000 }, { naam: 'Rijsel', ligging: P.rijsel, bezetting: 10000 },
  ],
  gebeurtenissen: [
    { id: 'luik1914', datum: { dag: 16, maand: 8, jaar: 1914 }, stil: true, titel: 'Luik', tekst: 'Het laatste fort van Luik valt. De weg naar Brussel en Frankrijk ligt open.' },
    { id: 'geweld1914', datum: { dag: 25, maand: 8, jaar: 1914 }, onzeker: true, titel: 'Geweld tegen burgers', tekst: 'In Dinant, Andenne, Tamines, Aarschot, Leuven en elders doden Duitse troepen honderden burgers en steken steden in brand. In Leuven brandt de universiteitsbibliotheek. De wereld is verontwaardigd.',
      doe: (t) => { for (const f of Object.keys(t.facties)) wijzigOpinie(t, 'duitsland', f, -25); } },
    { id: 'ijzer', datum: { dag: 18, maand: 10, jaar: 1914 }, onzeker: true, titel: 'De IJzer', tekst: 'Het Belgische leger trekt zich terug achter de IJzer. Door de sluizen in Nieuwpoort open te zetten, zetten de Belgen de vlakte onder water. Een klein stukje West-Vlaanderen blijft vier jaar vrij.',
      doe: (t, k) => { if (bestaat(t, 'belgie')) legerBij(t, k, 'belgie', P.ieperfront, 60000, 'Belgisch leger aan de IJzer'); legerBij(t, k, 'grootbrittannie', P.ieper, 120000, 'Brits leger bij Ieper'); legerBij(t, k, 'frankrijk', P.ieperfront, 80000, 'Frans leger in Vlaanderen'); } },
    { id: 'wapenstilstand', datum: { dag: 11, maand: 11, jaar: 1918 }, onzeker: true, titel: 'De wapenstilstand', tekst: 'Duitsland tekent de wapenstilstand. België is bevrijd; bij de vrede van Versailles krijgt het Eupen en Malmedy.',
      keuzeVoor: ['duitsland'],
      opties: [{ tekst: 'Tekenen', doe: (t, k) => {
        for (const f of ['belgie', 'frankrijk', 'grootbrittannie']) { vrede(t, 'duitsland', f); geefTerug(t, 'duitsland', f); }
        if (bestaat(t, 'luxemburg')) t.facties.luxemburg.heer = null;
        t.legers = t.legers.filter((l) => l.factie !== 'duitsland');
        if (bestaat(t, 'belgie')) { geefRond(t, k, P.eupen, 12, 'belgie'); geefRond(t, k, P.malmedy, 12, 'belgie'); }
        for (const f of Object.values(t.facties)) f.moeheid = 0;
      } }, { tekst: 'Doorvechten', doe: () => {} }] },
    { id: 'nazi', datum: { dag: 1, maand: 9, jaar: 1939 }, stil: true, titel: 'Een nieuwe oorlog', tekst: 'Nazi-Duitsland valt Polen binnen; Frankrijk en Groot-Brittannië verklaren Duitsland de oorlog. België blijft voorlopig neutraal.',
      doe: (t) => { hernoem(t, 'duitsland', 'Nazi-Duitsland', 'Adolf Hitler'); t.facties.duitsland.vorst = null; t.facties.duitsland.kwaliteit = 1.35; heerser(t, 'belgie', 'Leopold III', 37); oorlog(t, 'duitsland', 'frankrijk'); oorlog(t, 'duitsland', 'grootbrittannie'); } },
    { id: 'mei1940', datum: { dag: 10, maand: 5, jaar: 1940 }, titel: 'De Achttiendaagse Veldtocht', tekst: 'Zonder oorlogsverklaring vallen Duitse troepen Nederland, België en Luxemburg binnen. Valschermjagers nemen het fort Eben-Emael in; pantserdivisies breken door in de Ardennen.',
      doe: (t, k) => {
        for (const f of ['belgie', 'nederland', 'luxemburg', 'frankrijk', 'grootbrittannie']) oorlog(t, 'duitsland', f);
        legerVanBuiten(t, k, 'duitsland', 300000, 'Legergroep B');
        legerBij(t, k, 'duitsland', [50.0, 6.0], 350000, 'Legergroep A (pantser)');
        legerBij(t, k, 'duitsland', P.maastricht, 150000, 'Duitse troepen bij Maastricht');
        legerBij(t, k, 'grootbrittannie', P.leuven, 150000, 'Brits Expeditieleger');
        legerBij(t, k, 'frankrijk', P.namen, 200000, 'Frans Eerste Leger');
      } },
    { id: 'capitulatie', datum: { dag: 28, maand: 5, jaar: 1940 }, titel: 'De capitulatie',
      tekst: 'Na achttien dagen capituleert het Belgische leger. Koning Leopold III blijft als krijgsgevangene in het land; de regering gaat naar Londen. België is bezet. Eupen-Malmedy wordt bij Duitsland ingelijfd. Een deel van de bevolking werkt met de bezetter samen, een deel gaat in het verzet; de meesten proberen te overleven. Joodse inwoners worden opgepakt en weggevoerd.',
      keuzeVoor: ['belgie'],
      voorwaarde: (t) => bestaat(t, 'belgie') && inBezet(t),
      opties: [
        { tekst: 'Capituleren', uitleg: 'België wordt bezet gebied onder Duitse heerschappij; verzet blijft mogelijk (opstand)', doe: (t, k) => { vrede(t, 'duitsland', 'belgie'); onderwerp(t, 'belgie', 'duitsland'); geefRond(t, k, P.eupen, 12, 'duitsland', ['belgie']); geefRond(t, k, P.malmedy, 12, 'duitsland', ['belgie']); onrust(t, 'belgie', -25); } },
        { tekst: 'Doorvechten', uitleg: 'het leger vecht verder, vanuit wat overblijft', doe: () => {} },
      ] },
    { id: 'bevrijding', datum: { dag: 3, maand: 9, jaar: 1944 }, onzeker: true, titel: 'De bevrijding', tekst: 'Britse tanks rijden Brussel binnen. Op enkele dagen is het grootste deel van België bevrijd.',
      doe: (t, k) => {
        legerVanBuiten(t, k, 'grootbrittannie', 300000, 'Geallieerde legers');
        legerBij(t, k, 'grootbrittannie', P.rijsel, 200000, 'Brits Tweede Leger');
        oorlog(t, 'grootbrittannie', 'duitsland');
        if (bestaat(t, 'belgie') && t.facties.belgie.heer === 'duitsland') { t.facties.belgie.heer = null; oorlog(t, 'belgie', 'duitsland'); geefTerug(t, 'duitsland', 'belgie'); bond(t, 'belgie', 'grootbrittannie'); }
        if (bestaat(t, 'nederland') && t.facties.nederland.heer === 'duitsland') t.facties.nederland.heer = null;
        if (bestaat(t, 'luxemburg') && t.facties.luxemburg.heer === 'duitsland') t.facties.luxemburg.heer = null;
      } },
    { id: 'ardennen', datum: { dag: 16, maand: 12, jaar: 1944 }, titel: 'Het Ardennenoffensief', tekst: 'In de winter valt het Duitse leger onverwacht aan in de Ardennen, richting Antwerpen. Bastenaken wordt omsingeld.',
      doe: (t, k) => { legerBij(t, k, 'duitsland', [50.3, 6.15], 250000, 'Duitse aanval in de Ardennen'); legerBij(t, k, 'grootbrittannie', P.bastenaken, 60000, 'Amerikanen in Bastenaken'); } },
  ],
};

function inBezet(t: Toestand): boolean {
  const h = t.facties.belgie?.hoofdstad;
  return h === null || h === undefined ? true : t.vakken[h].eigenaar !== 'belgie' || t.legers.some((l) => l.factie === 'duitsland' && l.vak === h);
}

export const NA_DE_OORLOG: Tijdperk = {
  id: 'naoorlog',
  naam: 'Na de oorlog',
  van: { dag: 8, maand: 5, jaar: 1945 },
  tot: { dag: 31, maand: 12, jaar: 2026 },
  beschrijving: 'De oorlog is voorbij. België bouwt zich opnieuw op, sluit zich aan bij de NAVO en bij Europa, en Brussel wordt een hoofdstad van Europa. Binnen het land groeien Vlaanderen en Wallonië uit elkaar: van een eenheidsstaat naar een federale staat. Oorlogen tussen de buren zijn voorbij; welvaart en eensgezindheid zijn nu de opdracht.',
  bevolking: 14_000_000,
  namen: ['Boudewijn', 'Albert', 'Filip', 'Elisabeth', 'Gaston', 'Wilfried', 'Jean-Luc', 'Guy', 'Elio', 'Charles'],
  kiOorlog: false,
  huwelijken: false,
  facties: [
    { id: 'belgie', naam: 'België', kleur: '#e8c547', soort: 'staat', heerser: 'prins-regent Karel', leeftijd: 41, titel: 'regent', groep: 'De Benelux', gebieden: BELGIE, kernen: [P.brussel, P.gent, P.luik, P.antwerpen], leger: 0.005,
      beschrijving: 'België na de bevrijding, met een koningskwestie, een kolonie en een land dat zich moet heropbouwen.' },
    { id: 'nederland', naam: 'Nederland', kleur: '#e07b39', soort: 'staat', heerser: 'Wilhelmina', leeftijd: 64, titel: 'koningin', groep: 'De Benelux', gebieden: NEDERLANDS, kernen: [P.terneuzen, P.maastricht], leger: 0.005, beschrijving: 'Nederland, partner in de Benelux.' },
    { id: 'luxemburg', naam: 'Groothertogdom Luxemburg', kleur: '#7fb3d5', soort: 'staat', heerser: 'Charlotte', leeftijd: 49, titel: 'groothertogin', groep: 'De Benelux', gebieden: GROOTHERTOGDOM, kernen: [P.luxemburg], leger: 0.003, beschrijving: 'Luxemburg, klein en welvarend.' },
    { id: 'frankrijk', naam: 'Frankrijk', kleur: '#3b5fa5', soort: 'rijk', heerser: 'Charles de Gaulle', leeftijd: 54, titel: 'leider van de voorlopige regering', groep: 'De buren', geenVorst: true, gebieden: FRANS, kernen: [P.rijsel, P.atrecht, P.soissons, P.charleville], leger: 0.005, beschrijving: 'Frankrijk, partner in Europa.' },
  ],
  bond: [['belgie', 'nederland'], ['belgie', 'luxemburg'], ['nederland', 'luxemburg'], ['belgie', 'frankrijk'], ['frankrijk', 'nederland'], ['frankrijk', 'luxemburg']],
  versterkingen: [],
  gebeurtenissen: [
    { id: 'koningskwestie', datum: { dag: 12, maand: 3, jaar: 1950 }, titel: 'De Koningskwestie',
      tekst: 'In een volksraadpleging stemt een meerderheid voor de terugkeer van Leopold III, maar vooral in Wallonië is het verzet groot. Na stakingen en onlusten draagt Leopold zijn macht over aan zijn zoon Boudewijn.',
      keuzeVoor: ['belgie'],
      opties: [
        { tekst: 'Leopold laat de macht aan Boudewijn', uitleg: 'rust, maar een verdeeld land', doe: (t, k) => { heerser(t, 'belgie', 'Boudewijn', 20); for (const [i, v] of t.vakken.entries()) if (v.eigenaar === 'belgie' && k.vakken[i].lonlat[1] < 50.75) v.tevredenheid = Math.max(0, v.tevredenheid - 8); } },
        { tekst: 'Leopold blijft koning', uitleg: 'grote onrust in Wallonië', doe: (t, k) => { heerser(t, 'belgie', 'Leopold III', 48); for (const [i, v] of t.vakken.entries()) if (v.eigenaar === 'belgie' && k.vakken[i].lonlat[1] < 50.75) v.tevredenheid = Math.max(0, v.tevredenheid - 35); } },
      ] },
    { id: 'europa', datum: { dag: 25, maand: 3, jaar: 1957 }, onzeker: true, titel: 'Europa', tekst: 'Met de Verdragen van Rome ontstaat de Europese Economische Gemeenschap, met België, Nederland, Luxemburg, Frankrijk, West-Duitsland en Italië. Brussel wordt de zetel van de Europese instellingen.',
      doe: (t) => { for (const f of Object.values(t.facties)) { f.schat += 200 * prijsfactor(t.tijdperk); } } },
    { id: 'congo1960', datum: { dag: 30, maand: 6, jaar: 1960 }, onzeker: true, titel: 'De onafhankelijkheid van Congo', tekst: 'Congo wordt onafhankelijk. De overgang is slecht voorbereid en loopt uit op een crisis.', doe: (t) => { t.gedaan = t.gedaan.filter((x) => !x.startsWith('congo:')); onrust(t, 'belgie', -3); } },
    { id: 'taalgrens', datum: { dag: 8, maand: 11, jaar: 1962 }, titel: 'De taalgrens', tekst: 'Het parlement legt de taalgrens vast. Gemeenten verhuizen van provincie, zoals de Voerstreek naar Limburg en Komen-Waasten naar Henegouwen.', doe: (t) => onrust(t, 'belgie', -3) },
    { id: 'staatshervorming1970', datum: { dag: 24, maand: 12, jaar: 1970 }, titel: 'De eerste staatshervorming', tekst: 'De grondwet erkent cultuurgemeenschappen en gewesten: het begin van de federalisering.',
      keuzeVoor: ['belgie'],
      opties: [
        { tekst: 'Meer zelfbestuur voor de gemeenschappen', uitleg: 'meer rust, wat minder eenheid', doe: (t) => onrust(t, 'belgie', 8) },
        { tekst: 'De eenheidsstaat verdedigen', uitleg: 'spanningen lopen op', doe: (t) => onrust(t, 'belgie', -12) },
      ] },
    { id: 'fusies1977', datum: { dag: 1, maand: 1, jaar: 1977 }, stil: true, titel: 'De fusie van de gemeenten', tekst: 'Het aantal gemeenten daalt van 2359 naar 596.', doe: (t) => { if (bestaat(t, 'belgie')) t.facties.belgie.schat += 100 * prijsfactor(t.tijdperk); } },
    { id: 'gewesten1980', datum: { dag: 8, maand: 8, jaar: 1980 }, stil: true, titel: 'De tweede staatshervorming', tekst: 'Het Vlaams en het Waals Gewest krijgen eigen instellingen.', doe: (t) => onrust(t, 'belgie', 4) },
    { id: 'federaal', datum: { dag: 1, maand: 1, jaar: 1993 }, titel: 'Een federale staat', tekst: 'België wordt een federale staat. De provincie Brabant wordt gesplitst in Vlaams-Brabant en Waals-Brabant.', doe: (t) => onrust(t, 'belgie', 6) },
    { id: 'zesde', datum: { dag: 11, maand: 10, jaar: 2011 }, stil: true, titel: 'De zesde staatshervorming', tekst: 'Na de langste regeringsvorming ooit wordt de kieskring Brussel-Halle-Vilvoorde gesplitst en krijgen de deelstaten meer bevoegdheden.', doe: (t) => onrust(t, 'belgie', 3) },
    { id: 'fusies2025', datum: { dag: 1, maand: 1, jaar: 2025 }, stil: true, titel: 'Nieuwe fusies', tekst: 'In Vlaanderen fusioneren opnieuw gemeenten; er blijven er 285.' },
  ],
};

