// Tijdperken 6 tot 8: Habsburgers en Spanje (1482-1714), Oostenrijk (1714-1795), Frankrijk en het
// Verenigd Koninkrijk (1795-1830). Bron: docs/onderzoek-geschiedenis.md. Gebieden zijn een benadering.
import {
  bestaat, geefAlles, geefGebieden, geefRond, geefTerug, heerser, hernoem, legerBij, legerVanBuiten, lijfVazallenIn, oorlog, spelerIs,
  verschijn, vrede, bond,
} from '../effecten';
import type { Tijdperk } from '../tijdperk';
import type { Toestand } from '../toestand';
import { BELGIE, FRANS, GROOTHERTOGDOM, NEDERLANDS, P, RICHTING } from './gemeen';

function onrust(t: Toestand, f: string, d: number) {
  for (const v of t.vakken) if (v.eigenaar === f) v.tevredenheid = Math.max(0, Math.min(100, v.tevredenheid + d));
}

export const HABSBURGERS: Tijdperk = {
  id: 'habsburgers',
  naam: 'Habsburgers en Spanje',
  van: { dag: 27, maand: 3, jaar: 1482 },
  tot: { dag: 6, maand: 3, jaar: 1714 },
  beschrijving: 'Maria van Bourgondië is dood; haar zoontje Filips de Schone erft de Nederlanden en zijn vader Maximiliaan regeert in zijn naam. De Vlaamse steden verzetten zich, de Franse koning loert. Onder Karel V worden de Nederlanden één geheel. Daarna volgen godsdienstoorlogen, de scheiding van Noord en Zuid, en twee eeuwen Franse aanvallen.',
  bevolking: 2_200_000,
  namen: ['Filips', 'Karel', 'Maximiliaan', 'Margaretha', 'Maria', 'Ferdinand', 'Albrecht', 'Isabella', 'Alexander', 'Juan', 'Lodewijk'],
  kiOorlog: true,
  huwelijken: true,
  facties: [
    { id: 'habsburg', naam: 'Habsburgse Nederlanden', kleur: '#c9a227', soort: 'staat', heerser: 'Filips de Schone (regent Maximiliaan)', leeftijd: 4, titel: 'heer der Nederlanden', dynastie: 'Habsburg', groep: 'De Nederlanden',
      kernen: [P.mechelen, P.brussel, P.antwerpen, P.leuven, P.bergen, P.namen, P.luxemburg, P.rijsel, P.valencijn, P.maastricht, P.terneuzen],
      buiten: { ingang: RICHTING.zuidoost, steun: 60, doelSterkte: 20000, naam: 'Troepen van de Habsburgers' },
      beschrijving: 'De erfenis van Bourgondië, vanuit Mechelen bestuurd voor het kind Filips. Sterk, maar verdeeld.' },
    { id: 'vlaamsesteden', naam: 'Vlaamse Leden', kleur: '#e0b84a', soort: 'staat', heerser: 'regentschapsraad van Gent, Brugge en Ieper', groep: 'De Nederlanden', geenVorst: true, kernen: [P.gent, P.brugge, P.ieper, P.kortrijk],
      beschrijving: 'De grote Vlaamse steden weigeren Maximiliaan als regent en zoeken steun bij Frankrijk.' },
    { id: 'luik', naam: 'Prinsbisdom Luik', kleur: '#b5463f', soort: 'staat', heerser: 'Jan van Horne', leeftijd: 32, titel: 'prins-bisschop', groep: 'De Nederlanden', geenVorst: true, kernen: [P.luik, P.hoei, P.dinant, P.hasselt, P.borgloon],
      beschrijving: 'Het prinsbisdom, neutraal tussen de grote machten.' },
    { id: 'frankrijk', naam: 'Koninkrijk Frankrijk', kleur: '#3b5fa5', soort: 'rijk', heerser: 'Lodewijk XI', leeftijd: 58, titel: 'koning', dynastie: 'Valois', groep: 'De grote rijken', kernen: [P.soissons, P.laon, P.reims, P.charleville, P.atrecht, P.sintomaars],
      buiten: { ingang: RICHTING.zuid, steun: 100, doelSterkte: 30000, naam: 'Leger van de Franse koning' },
      beschrijving: 'Frankrijk, de grote buur in het zuiden, die de Nederlanden wil.' },
    { id: 'engeland', naam: 'Koninkrijk Engeland', kleur: '#c0533f', soort: 'rijk', heerser: 'Edward IV', leeftijd: 40, titel: 'koning', groep: 'De grote rijken', kernen: [P.kales], nietKiesbaar: true,
      buiten: { ingang: RICHTING.zee, steun: 40, doelSterkte: 8000, naam: 'Engelse troepen' }, beschrijving: 'Engeland, met Calais op het vasteland.' },
    { id: 'staten', naam: 'Opstandige Staten', kleur: '#e07b39', soort: 'staat', heerser: 'Willem van Oranje', leeftijd: 35, titel: 'prins', dynastie: 'Oranje-Nassau', groep: 'Later', laat: true, kernen: [P.antwerpen, P.gent, P.terneuzen],
      buiten: { ingang: RICHTING.noord, steun: 40, doelSterkte: 15000, naam: 'Troepen uit Holland en Zeeland' },
      beschrijving: 'De gewesten die in opstand komen tegen de Spaanse koning; later de Republiek der Verenigde Nederlanden.' },
    { id: 'bondgenoten', naam: 'Grote Alliantie', kleur: '#7a7a9a', soort: 'rijk', heerser: 'Marlborough en Eugenius', groep: 'Later', laat: true, nietKiesbaar: true, geenVorst: true, kernen: [],
      buiten: { ingang: RICHTING.noord, steun: 80, doelSterkte: 50000, naam: 'Troepen van de Alliantie' }, beschrijving: 'Engeland, de Republiek en Oostenrijk samen tegen Frankrijk.' },
  ],
  oorlog: [['habsburg', 'vlaamsesteden'], ['habsburg', 'frankrijk']],
  bond: [['vlaamsesteden', 'frankrijk']],
  versterkingen: [
    { naam: 'Gent', ligging: P.gent, bezetting: 3000 }, { naam: 'Antwerpen', ligging: P.antwerpen, bezetting: 3000 }, { naam: 'Namen', ligging: P.namen, bezetting: 3000 },
    { naam: 'Luxemburg', ligging: P.luxemburg, bezetting: 3500 }, { naam: 'Rijsel', ligging: P.rijsel, bezetting: 3000 }, { naam: 'Calais', ligging: P.kales, bezetting: 3000 },
    { naam: 'Atrecht', ligging: P.atrecht, bezetting: 2500 }, { naam: 'Maastricht', ligging: P.maastricht, bezetting: 2500 }, { naam: 'Luik', ligging: P.luik, bezetting: 2000 },
  ],
  gebeurtenissen: [
    { id: 'atrecht1482', datum: { dag: 23, maand: 12, jaar: 1482 }, titel: 'De Vrede van Atrecht', tekst: 'Onder druk van de Vlaamse steden sluit Maximiliaan vrede met Frankrijk. Artesië gaat voorlopig naar de Franse kroon.',
      keuzeVoor: ['habsburg'], voorwaarde: (t) => bestaat(t, 'habsburg') && bestaat(t, 'frankrijk'),
      opties: [
        { tekst: 'Vrede tekenen', uitleg: 'Artesië naar Frankrijk', doe: (t, k) => { vrede(t, 'habsburg', 'frankrijk'); geefGebieden(t, k, ['Artesië'], 'frankrijk'); } },
        { tekst: 'Doorvechten', doe: () => {} },
      ] },
    { id: 'karelv', datum: { dag: 24, maand: 2, jaar: 1500 }, stil: true, titel: 'Karel V geboren', tekst: 'In Gent wordt Karel geboren, de latere keizer Karel V: erfgenaam van Bourgondië, Spanje en Oostenrijk.' },
    { id: 'karel1515', datum: { dag: 5, maand: 1, jaar: 1515 }, onzeker: true, stil: true, titel: 'Karel regeert', tekst: 'Karel van Gent wordt meerderjarig verklaard en regeert zelf over de Nederlanden.',
      doe: (t) => { if (bestaat(t, 'habsburg')) { heerser(t, 'habsburg', 'Karel V', 15); t.facties.habsburg.buiten!.steun = 120; t.facties.habsburg.buiten!.doelSterkte = 30000; } } },
    { id: 'damesvrede', datum: { dag: 3, maand: 8, jaar: 1529 }, onzeker: true, titel: 'De Damesvrede van Kamerijk', tekst: 'Margaretha van Oostenrijk en Louise van Savoye sluiten vrede. Vlaanderen en Artesië zijn niet langer leen van de Franse koning.',
      keuzeVoor: ['frankrijk'], voorwaarde: (t) => bestaat(t, 'habsburg') && bestaat(t, 'frankrijk'),
      opties: [
        { tekst: 'Vrede', uitleg: 'Artesië naar de Habsburgers', doe: (t, k) => { vrede(t, 'habsburg', 'frankrijk'); geefGebieden(t, k, ['Artesië'], 'habsburg'); } },
        { tekst: 'Geen vrede', doe: (t) => oorlog(t, 'frankrijk', 'habsburg') },
      ] },
    { id: 'pragmatieke', datum: { dag: 4, maand: 11, jaar: 1549 }, titel: 'De Pragmatieke Sanctie', tekst: 'Karel V bepaalt dat de Zeventien Provinciën samen één erfenis vormen, die altijd naar één vorst gaat.', doe: (t) => { if (bestaat(t, 'habsburg')) { lijfVazallenIn(t, 'habsburg'); if (bestaat(t, 'vlaamsesteden') && !spelerIs(t, 'vlaamsesteden')) geefAlles(t, 'vlaamsesteden', 'habsburg'); } } },
    { id: 'troonsafstand', datum: { dag: 25, maand: 10, jaar: 1555 }, titel: 'Troonsafstand in Brussel', tekst: 'In het paleis op de Koudenberg doet Karel V afstand van de Nederlanden ten voordele van zijn zoon Filips II, koning van Spanje.',
      doe: (t) => { if (bestaat(t, 'habsburg')) { hernoem(t, 'habsburg', 'Spaanse Nederlanden', 'Filips II'); t.facties.habsburg.dynastie = 'Spaanse Habsburgers'; t.facties.habsburg.buiten!.steun = 150; } } },
    { id: 'beeldenstorm', datum: { dag: 10, maand: 8, jaar: 1566 }, titel: 'De Beeldenstorm', tekst: 'In Steenvoorde begint de Beeldenstorm; kerken in de hele Nederlanden worden geplunderd. Filips II stuurt de hertog van Alva. Twee jaar later begint de Opstand.',
      doe: (t) => onrust(t, 'habsburg', -15) },
    { id: 'opstand', datum: { dag: 23, maand: 5, jaar: 1568 }, onzeker: true, titel: 'De Opstand', tekst: 'Willem van Oranje en de opstandelingen grijpen naar de wapens tegen het Spaanse bewind. In het noorden en in de grote steden van Vlaanderen en Brabant krijgen ze steun.',
      doe: (t, k) => {
        verschijn(t, 'staten');
        const van = ['habsburg'].filter((f) => !spelerIs(t, f));
        geefRond(t, k, P.antwerpen, 25, 'staten', van);
        geefRond(t, k, P.terneuzen, 25, 'staten', van);
        geefRond(t, k, P.gent, 22, 'staten', van);
        oorlog(t, 'staten', 'habsburg');
        legerVanBuiten(t, k, 'staten', 12000, 'Leger van Oranje');
      } },
    { id: 'antwerpen1585', datum: { dag: 17, maand: 8, jaar: 1585 }, titel: 'De val van Antwerpen', tekst: 'Na een lang beleg geeft Antwerpen zich over aan Alexander Farnese. Duizenden protestanten trekken naar het noorden; de Schelde wordt afgesloten.',
      doe: (t, k) => {
        for (const [i, v] of t.vakken.entries()) if (Math.hypot(k.vakken[i].lonlat[0] - 4.4, k.vakken[i].lonlat[1] - 51.22) < 0.25) v.bevolking = Math.round(v.bevolking * 0.6);
        if (bestaat(t, 'staten') && !spelerIs(t, 'staten')) geefRond(t, k, P.antwerpen, 20, 'habsburg', ['staten']);
      } },
    { id: 'bestand', datum: { dag: 9, maand: 4, jaar: 1609 }, titel: 'Het Twaalfjarig Bestand', tekst: 'Spanje en de Republiek sluiten een bestand van twaalf jaar.', keuzeVoor: ['habsburg', 'staten'], voorwaarde: (t) => bestaat(t, 'staten') && bestaat(t, 'habsburg'),
      opties: [{ tekst: 'Bestand sluiten', doe: (t) => { vrede(t, 'staten', 'habsburg'); hernoem(t, 'staten', 'Republiek der Verenigde Nederlanden'); t.bestand['habsburg|staten'] = t.dag + 12 * 365; } }, { tekst: 'Doorvechten', doe: () => {} }] },
    { id: 'bestandvoorbij', datum: { dag: 9, maand: 4, jaar: 1621 }, stil: true, titel: 'Het bestand loopt af', tekst: 'Het bestand loopt af; de oorlog tussen Spanje en de Republiek begint opnieuw.', voorwaarde: (t) => bestaat(t, 'staten') && bestaat(t, 'habsburg'), doe: (t) => oorlog(t, 'staten', 'habsburg') },
    { id: 'munster', datum: { dag: 30, maand: 1, jaar: 1648 }, titel: 'De Vrede van Munster', tekst: 'Spanje erkent de Republiek. Zeeuws-Vlaanderen en Maastricht gaan naar de Republiek; de Schelde blijft dicht en Antwerpen kwijnt weg.',
      keuzeVoor: ['habsburg', 'staten'], voorwaarde: (t) => bestaat(t, 'staten') && bestaat(t, 'habsburg'),
      opties: [
        { tekst: 'Vrede tekenen', doe: (t, k) => { vrede(t, 'staten', 'habsburg'); geefGebieden(t, k, ['Zeeuws-Vlaanderen'], 'staten'); geefRond(t, k, P.maastricht, 12, 'staten'); geefRond(t, k, P.antwerpen, 28, 'habsburg', ['staten']); geefRond(t, k, P.gent, 28, 'habsburg', ['staten']); hernoem(t, 'staten', 'Republiek der Verenigde Nederlanden'); } },
        { tekst: 'Doorvechten', doe: () => {} },
      ] },
    { id: 'pyreneeen', datum: { dag: 7, maand: 11, jaar: 1659 }, titel: 'De Vrede van de Pyreneeën', tekst: 'Spanje staat Artesië af aan Frankrijk.', keuzeVoor: ['habsburg'], voorwaarde: (t) => bestaat(t, 'habsburg') && bestaat(t, 'frankrijk'),
      opties: [{ tekst: 'Aanvaarden', doe: (t, k) => { vrede(t, 'habsburg', 'frankrijk'); geefGebieden(t, k, ['Artesië'], 'frankrijk'); } }, { tekst: 'Weigeren', uitleg: 'oorlog met Frankrijk', doe: (t) => oorlog(t, 'frankrijk', 'habsburg') }] },
    { id: 'devolutie', datum: { dag: 24, maand: 5, jaar: 1667 }, onzeker: true, titel: 'De Devolutieoorlog', tekst: 'Lodewijk XIV eist de Spaanse Nederlanden op als erfenis van zijn vrouw en valt binnen.',
      voorwaarde: (t) => bestaat(t, 'habsburg') && bestaat(t, 'frankrijk'),
      doe: (t, k) => { heerser(t, 'frankrijk', 'Lodewijk XIV', 28); oorlog(t, 'frankrijk', 'habsburg'); legerVanBuiten(t, k, 'frankrijk', 35000, 'Leger van Lodewijk XIV'); } },
    { id: 'aken1668', datum: { dag: 2, maand: 5, jaar: 1668 }, titel: 'De Vrede van Aken', tekst: 'Frankrijk houdt een reeks steden in Vlaanderen en Henegouwen, waaronder Rijsel, Doornik en Kortrijk.', keuzeVoor: ['habsburg'], voorwaarde: (t) => bestaat(t, 'habsburg') && bestaat(t, 'frankrijk'),
      opties: [{ tekst: 'Vrede tekenen', doe: (t, k) => { vrede(t, 'habsburg', 'frankrijk'); geefRond(t, k, P.rijsel, 30, 'frankrijk', ['habsburg']); } }, { tekst: 'Doorvechten', doe: () => {} }] },
    { id: 'nijmegen', datum: { dag: 17, maand: 9, jaar: 1678 }, titel: 'De Vrede van Nijmegen', tekst: 'Frankrijk krijgt Valencijn, Kamerijk en het zuiden van Vlaanderen. De grens begint op de Frans-Belgische grens van nu te lijken.', keuzeVoor: ['habsburg'], voorwaarde: (t) => bestaat(t, 'habsburg') && bestaat(t, 'frankrijk'),
      opties: [{ tekst: 'Vrede tekenen', doe: (t, k) => { vrede(t, 'habsburg', 'frankrijk'); geefGebieden(t, k, ['Frans-Vlaanderen en Henegouwen'], 'frankrijk'); } }, { tekst: 'Doorvechten', doe: (t) => oorlog(t, 'frankrijk', 'habsburg') }] },
    { id: 'successie', datum: { dag: 1, maand: 5, jaar: 1702 }, onzeker: true, titel: 'De Spaanse Successieoorlog', tekst: 'De laatste Spaanse Habsburger is dood en de kleinzoon van Lodewijk XIV wordt koning van Spanje. Engeland, de Republiek en Oostenrijk vormen een Grote Alliantie tegen Frankrijk. De Spaanse Nederlanden worden opnieuw het slagveld van Europa.',
      doe: (t) => {
        if (bestaat(t, 'habsburg')) { heerser(t, 'habsburg', 'Filips V (Bourbon)', 18); if (!spelerIs(t, 'habsburg')) { vrede(t, 'habsburg', 'frankrijk'); bond(t, 'habsburg', 'frankrijk'); } }
        verschijn(t, 'bondgenoten');
        oorlog(t, 'bondgenoten', 'frankrijk');
        if (t.bond.includes('frankrijk|habsburg')) oorlog(t, 'bondgenoten', 'habsburg');
      } },
    { id: 'ramillies', datum: { dag: 23, maand: 5, jaar: 1706 }, titel: 'De slag bij Ramillies', tekst: 'Marlborough verslaat het Frans-Beierse leger bij Ramillies. De bondgenoten bezetten het grootste deel van de Spaanse Nederlanden.',
      doe: (t, k) => { verschijn(t, 'bondgenoten'); oorlog(t, 'bondgenoten', 'frankrijk'); legerBij(t, k, 'bondgenoten', P.ramillies, 60000, 'Leger van Marlborough'); } },
    { id: 'malplaquet', datum: { dag: 11, maand: 9, jaar: 1709 }, stil: true, titel: 'Malplaquet', tekst: 'De bloedigste slag van de oorlog, bij Malplaquet: een dure overwinning voor de bondgenoten. Iedereen is uitgeput.',
      doe: (t) => { for (const f of ['frankrijk', 'bondgenoten', 'habsburg']) if (t.facties[f]) t.facties[f].moeheid = Math.min(100, t.facties[f].moeheid + 30); } },
  ],
};

export const OOSTENRIJK: Tijdperk = {
  id: 'oostenrijk',
  naam: 'De Oostenrijkse tijd',
  van: { dag: 6, maand: 3, jaar: 1714 },
  tot: { dag: 1, maand: 10, jaar: 1795 },
  beschrijving: 'Na de Spaanse Successieoorlog komen de Zuidelijke Nederlanden aan de Oostenrijkse Habsburgers. Staatse troepen bewaken een rij grensvestingen tegen Frankrijk. Een eeuw van herstel, maar ook van nieuwe oorlogen, en aan het einde van verzet tegen de hervormingen van Jozef II.',
  bevolking: 3_000_000,
  namen: ['Karel', 'Maria Theresia', 'Jozef', 'Leopold', 'Frans', 'Maria Elisabeth', 'Karel Alexander', 'Albert', 'Maria Christina'],
  kiOorlog: true,
  huwelijken: true,
  facties: [
    { id: 'oostenrijk', naam: 'Oostenrijkse Nederlanden', kleur: '#c9a227', soort: 'staat', heerser: 'Karel VI', leeftijd: 29, titel: 'keizer', dynastie: 'Habsburg', groep: 'De Zuidelijke Nederlanden',
      kernen: [P.brussel, P.gent, P.brugge, P.antwerpen, P.leuven, P.bergen, P.namen, P.luxemburg, P.ieper, P.doornik],
      buiten: { ingang: RICHTING.zuidoost, steun: 80, doelSterkte: 30000, naam: 'Keizerlijke troepen' },
      beschrijving: 'De Zuidelijke Nederlanden onder de keizer in Wenen, bestuurd door een landvoogd in Brussel.' },
    { id: 'luik', naam: 'Prinsbisdom Luik', kleur: '#b5463f', soort: 'staat', heerser: 'Jozef Clemens van Beieren', leeftijd: 43, titel: 'prins-bisschop', groep: 'De Zuidelijke Nederlanden', geenVorst: true, kernen: [P.luik, P.hoei, P.dinant, P.hasselt, P.borgloon],
      beschrijving: 'Het prinsbisdom Luik, met een vroege nijverheid in steenkool en ijzer.' },
    { id: 'republiek', naam: 'Republiek der Verenigde Nederlanden', kleur: '#e07b39', soort: 'staat', heerser: 'Staten-Generaal', groep: 'De buren', geenVorst: true, gebieden: NEDERLANDS, kernen: [P.terneuzen, P.maastricht, P.roermond],
      buiten: { ingang: RICHTING.noord, steun: 60, doelSterkte: 15000, naam: 'Staatse troepen' }, beschrijving: 'De Republiek, met Zeeuws-Vlaanderen, Maastricht en de Barrièrevestingen.' },
    { id: 'frankrijk', naam: 'Koninkrijk Frankrijk', kleur: '#3b5fa5', soort: 'rijk', heerser: 'Lodewijk XIV', leeftijd: 75, titel: 'koning', dynastie: 'Bourbon', groep: 'De buren', gebieden: FRANS, kernen: [P.rijsel, P.atrecht, P.kamerijk, P.soissons, P.charleville],
      buiten: { ingang: RICHTING.zuid, steun: 150, doelSterkte: 40000, naam: 'Leger van de Franse koning' }, beschrijving: 'Frankrijk, nu met Rijsel, Atrecht en Kamerijk.' },
    { id: 'grootbrittannie', naam: 'Groot-Brittannië', kleur: '#c0533f', soort: 'rijk', heerser: 'Anna', leeftijd: 49, titel: 'koningin', groep: 'De buren', nietKiesbaar: true, kernen: [],
      buiten: { ingang: RICHTING.zee, steun: 60, doelSterkte: 20000, naam: 'Britse troepen' }, beschrijving: 'Groot-Brittannië, bondgenoot van Oostenrijk tegen Frankrijk.' },
    { id: 'belgischestaten', naam: 'Verenigde Belgische Staten', kleur: '#d0403a', soort: 'staat', heerser: 'Hendrik van der Noot', leeftijd: 58, groep: 'Later', laat: true, geenVorst: true, kernen: [P.brussel, P.gent, P.antwerpen],
      beschrijving: 'De opstandige provinciën die zich in 1790 onafhankelijk verklaren.' },
  ],
  bond: [['oostenrijk', 'republiek'], ['oostenrijk', 'grootbrittannie'], ['republiek', 'grootbrittannie']],
  versterkingen: [
    { naam: 'Namen', ligging: P.namen, bezetting: 5000 }, { naam: 'Doornik', ligging: P.doornik, bezetting: 4000 }, { naam: 'Ieper', ligging: P.ieper, bezetting: 3000 },
    { naam: 'Luxemburg', ligging: P.luxemburg, bezetting: 6000 }, { naam: 'Rijsel', ligging: P.rijsel, bezetting: 5000 }, { naam: 'Maastricht', ligging: P.maastricht, bezetting: 4000 },
    { naam: 'Antwerpen', ligging: P.antwerpen, bezetting: 4000 }, { naam: 'Bergen', ligging: P.bergen, bezetting: 3000 },
  ],
  gebeurtenissen: [
    { id: 'barriere', datum: { dag: 15, maand: 11, jaar: 1715 }, onzeker: true, stil: true, titel: 'Het Derde Barrièreverdrag', tekst: 'Staatse troepen mogen in een rij vestingen liggen (o.a. Namen, Doornik, Menen, Ieper, Veurne), betaald door de Zuidelijke Nederlanden.', doe: (t) => { if (t.facties.oostenrijk) t.facties.oostenrijk.schat -= 60; } },
    { id: 'fontenoy', datum: { dag: 11, maand: 5, jaar: 1745 }, titel: 'De slag bij Fontenoy', tekst: 'In de Oostenrijkse Successieoorlog valt Frankrijk de Oostenrijkse Nederlanden binnen. Maarschalk van Saksen verslaat de bondgenoten bij Fontenoy.',
      doe: (t, k) => {
        heerser(t, 'frankrijk', 'Lodewijk XV', 35);
        if (bestaat(t, 'oostenrijk')) heerser(t, 'oostenrijk', 'Maria Theresia', 28);
        for (const f of ['oostenrijk', 'republiek', 'grootbrittannie']) oorlog(t, 'frankrijk', f);
        legerBij(t, k, 'frankrijk', P.fontenoy, 60000, 'Leger van Maurits van Saksen');
      } },
    { id: 'aken1748', datum: { dag: 18, maand: 10, jaar: 1748 }, titel: 'De Vrede van Aken', tekst: 'Frankrijk geeft de bezette Oostenrijkse Nederlanden terug.', keuzeVoor: ['frankrijk', 'oostenrijk'], voorwaarde: (t) => bestaat(t, 'frankrijk') && bestaat(t, 'oostenrijk'),
      opties: [
        { tekst: 'Vrede tekenen', doe: (t) => { for (const f of ['oostenrijk', 'republiek', 'grootbrittannie']) vrede(t, 'frankrijk', f); geefTerug(t, 'frankrijk', 'oostenrijk'); } },
        { tekst: 'Doorvechten', doe: () => {} },
      ] },
    { id: 'jozef', datum: { dag: 29, maand: 11, jaar: 1780 }, onzeker: true, stil: true, titel: 'Jozef II', tekst: 'Jozef II wordt alleenheerser en begint aan ingrijpende hervormingen.', doe: (t) => heerser(t, 'oostenrijk', 'Jozef II', 39) },
    { id: 'hervormingen', datum: { dag: 1, maand: 1, jaar: 1787 }, onzeker: true, titel: 'De hervormingen van Jozef II', tekst: 'Jozef II wil het bestuur, het gerecht en de kerk ingrijpend hervormen. De Staten en de kerk verzetten zich.', doe: (t) => onrust(t, 'oostenrijk', -20) },
    { id: 'luiksrevolutie', datum: { dag: 18, maand: 8, jaar: 1789 }, titel: 'De Luikse Revolutie', tekst: 'In Luik verjagen de burgers de prins-bisschop en roepen een republiek uit.', doe: (t) => { if (bestaat(t, 'luik')) hernoem(t, 'luik', 'Republiek Luik', 'burgemeesters van Luik'); } },
    { id: 'turnhout', datum: { dag: 27, maand: 10, jaar: 1789 }, titel: 'De slag bij Turnhout', tekst: 'Patriotten onder Van der Mersch verslaan de Oostenrijkse troepen bij Turnhout. De Brabantse Omwenteling verjaagt de Oostenrijkers uit bijna het hele land.',
      keuzeVoor: ['oostenrijk'],
      opties: [
        { tekst: 'Vechten voor de keizer', doe: (t, k) => {
          verschijn(t, 'belgischestaten');
          const van = spelerIs(t, 'oostenrijk') ? [] : ['oostenrijk'];
          if (van.length) for (const p of [P.brussel, P.gent, P.antwerpen, P.brugge, P.leuven, P.bergen, P.namen]) geefRond(t, k, p, 35, 'belgischestaten', van);
          oorlog(t, 'belgischestaten', 'oostenrijk');
          legerBij(t, k, 'belgischestaten', P.turnhout, 15000, 'Patriotten van Van der Mersch');
          legerBij(t, k, 'belgischestaten', P.gent, 10000, 'Patriotten');
        } },
        { tekst: 'Toegeven aan de Staten', uitleg: 'hervormingen terugdraaien', doe: (t) => onrust(t, 'oostenrijk', 30) },
      ] },
    { id: 'herstel1790', datum: { dag: 2, maand: 12, jaar: 1790 }, onzeker: true, stil: true, titel: 'De Oostenrijkers keren terug', tekst: 'Keizer Leopold II stuurt een leger en herstelt het Oostenrijkse gezag.',
      voorwaarde: (t) => bestaat(t, 'belgischestaten') && bestaat(t, 'oostenrijk'), doe: (t, k) => { heerser(t, 'oostenrijk', 'Leopold II', 43); legerVanBuiten(t, k, 'oostenrijk', 30000, 'Leger van Leopold II'); } },
    { id: 'jemappes', datum: { dag: 6, maand: 11, jaar: 1792 }, titel: 'De slag bij Jemappes', tekst: 'Het Franse revolutionaire leger verslaat de Oostenrijkers bij Jemappes en bezet de Zuidelijke Nederlanden.',
      doe: (t, k) => { hernoem(t, 'frankrijk', 'Franse Republiek', 'Nationale Conventie'); t.facties.frankrijk.vorst = null; oorlog(t, 'frankrijk', 'oostenrijk'); oorlog(t, 'frankrijk', 'luik'); legerBij(t, k, 'frankrijk', P.jemappes, 45000, 'Leger van Dumouriez'); } },
    { id: 'neerwinden', datum: { dag: 18, maand: 3, jaar: 1793 }, stil: true, titel: 'Neerwinden', tekst: 'De Oostenrijkers verslaan de Fransen bij Neerwinden en keren terug.', doe: (t, k) => { if (bestaat(t, 'oostenrijk')) legerBij(t, k, 'oostenrijk', P.neerwinden, 40000, 'Leger van Coburg'); } },
    { id: 'fleurus', datum: { dag: 26, maand: 6, jaar: 1794 }, titel: 'De slag bij Fleurus', tekst: 'Bij Fleurus winnen de Fransen beslissend. De Oostenrijkse tijd is voorbij.', doe: (t, k) => { oorlog(t, 'frankrijk', 'oostenrijk'); legerBij(t, k, 'frankrijk', P.fleurus, 75000, 'Leger van Jourdan'); } },
  ],
};

export const FRANSE_TIJD: Tijdperk = {
  id: 'frankrijk',
  naam: 'De Franse tijd en het Verenigd Koninkrijk',
  van: { dag: 1, maand: 10, jaar: 1795 },
  tot: { dag: 4, maand: 10, jaar: 1830 },
  beschrijving: 'De Zuidelijke Nederlanden en Luik worden bij Frankrijk gevoegd en in departementen ingedeeld. Twintig jaar Franse wetten, Franse dienstplicht en Franse oorlogen. Na Napoleon worden Noord en Zuid samengevoegd onder koning Willem I.',
  bevolking: 4_500_000,
  namen: ['Napoleon', 'Lodewijk', 'Willem', 'Frederik', 'Karel', 'Jozef'],
  kiOorlog: false,
  huwelijken: false,
  facties: [
    { id: 'frankrijk', naam: 'Franse Republiek', kleur: '#3b5fa5', kwaliteit: 1.25, soort: 'rijk', heerser: 'Nationale Conventie', groep: 'Frankrijk', geenVorst: true, gebieden: [...BELGIE, ...FRANS, ...NEDERLANDS, ...GROOTHERTOGDOM], kernen: [P.brussel, P.gent, P.luik, P.rijsel, P.soissons, P.luxemburg],
      buiten: { ingang: RICHTING.zuid, steun: 200, doelSterkte: 60000, naam: 'Frans leger' }, beschrijving: 'De Franse Republiek, en vanaf 1804 het keizerrijk van Napoleon. Het hele gebied is Frans.' },
    { id: 'oostenrijk', naam: 'Oostenrijk', kleur: '#c9a227', soort: 'rijk', heerser: 'Frans II', leeftijd: 27, titel: 'keizer', groep: 'De tegenstanders', nietKiesbaar: true, kernen: [],
      buiten: { ingang: RICHTING.oost, steun: 100, doelSterkte: 50000, naam: 'Oostenrijkse troepen' }, beschrijving: 'Oostenrijk, dat de Nederlanden verloor.' },
    { id: 'grootbrittannie', naam: 'Groot-Brittannië', kleur: '#c0533f', soort: 'rijk', heerser: 'George III', leeftijd: 57, titel: 'koning', groep: 'De tegenstanders', nietKiesbaar: true, kernen: [],
      buiten: { ingang: RICHTING.zee, steun: 100, doelSterkte: 40000, naam: 'Britse troepen' }, beschrijving: 'Groot-Brittannië, de vaste tegenstander van Frankrijk.' },
    { id: 'pruisen', naam: 'Pruisen', kleur: '#4a4a4a', soort: 'rijk', heerser: 'Frederik Willem II', leeftijd: 51, titel: 'koning', groep: 'De tegenstanders', nietKiesbaar: true, kernen: [],
      buiten: { ingang: RICHTING.oost, steun: 80, doelSterkte: 50000, naam: 'Pruisische troepen' }, beschrijving: 'Pruisen, in het oosten.' },
    { id: 'boeren', naam: 'Opstandige boeren', kleur: '#7a5c3a', soort: 'stam', heerser: 'Pieter Corbeels', groep: 'Later', laat: true, geenVorst: true, kernen: [P.turnhout, P.mechelen],
      beschrijving: 'Boeren die in opstand komen tegen de Franse dienstplicht en de vervolging van de kerk.' },
    { id: 'nederlanden', naam: 'Verenigd Koninkrijk der Nederlanden', kleur: '#e07b39', soort: 'staat', heerser: 'Willem I', leeftijd: 43, titel: 'koning', dynastie: 'Oranje-Nassau', groep: 'Later', laat: true, kernen: [P.brussel, P.antwerpen, P.gent, P.luik],
      buiten: { ingang: RICHTING.noord, steun: 80, doelSterkte: 30000, naam: 'Troepen uit het noorden' }, beschrijving: 'Het nieuwe koninkrijk van Willem I: Noord en Zuid samen.' },
  ],
  oorlog: [['frankrijk', 'oostenrijk'], ['frankrijk', 'grootbrittannie']],
  versterkingen: [
    { naam: 'Antwerpen', ligging: P.antwerpen, bezetting: 6000 }, { naam: 'Luxemburg', ligging: P.luxemburg, bezetting: 6000 },
    { naam: 'Namen', ligging: P.namen, bezetting: 4000 }, { naam: 'Rijsel', ligging: P.rijsel, bezetting: 5000 },
  ],
  gebeurtenissen: [
    { id: 'campoformio', datum: { dag: 17, maand: 10, jaar: 1797 }, onzeker: true, stil: true, titel: 'Campo Formio', tekst: 'Oostenrijk erkent bij de Vrede van Campo Formio de Franse annexatie.', doe: (t) => vrede(t, 'frankrijk', 'oostenrijk') },
    { id: 'boerenkrijg', datum: { dag: 12, maand: 10, jaar: 1798 }, titel: 'De Boerenkrijg', tekst: 'Tegen de dienstplicht en de vervolging van priesters komen boeren in de Kempen, het Waasland en Brabant in opstand. Het Franse leger slaat de opstand hard neer.',
      keuzeVoor: ['frankrijk'],
      opties: [
        { tekst: 'De opstand neerslaan', doe: (t, k) => { verschijn(t, 'boeren'); for (const p of [P.turnhout, P.mechelen]) geefRond(t, k, p, 25, 'boeren', spelerIs(t, 'frankrijk') ? [] : ['frankrijk']); oorlog(t, 'boeren', 'frankrijk'); legerBij(t, k, 'boeren', P.turnhout, 10000, 'Boerenleger'); legerBij(t, k, 'boeren', P.mechelen, 6000, 'Boeren van Brabant'); } },
        { tekst: 'Toegevingen doen', uitleg: 'minder dienstplicht, meer rust, minder mankracht', doe: (t) => { onrust(t, 'frankrijk', 15); t.facties.frankrijk.mankracht *= 0.6; } },
      ] },
    { id: 'keizer', datum: { dag: 2, maand: 12, jaar: 1804 }, stil: true, titel: 'Keizer Napoleon', tekst: 'Napoleon Bonaparte kroont zichzelf tot keizer.', doe: (t) => { hernoem(t, 'frankrijk', 'Frans Keizerrijk', 'Napoleon I'); t.facties.frankrijk.kwaliteit = 1.4; oorlog(t, 'frankrijk', 'grootbrittannie'); } },
    { id: 'einde1814', datum: { dag: 1, maand: 2, jaar: 1814 }, onzeker: true, titel: 'Het einde van het Franse bewind', tekst: 'Na de nederlagen in Rusland en bij Leipzig trekken geallieerde legers het land binnen.',
      doe: (t, k) => { for (const f of ['oostenrijk', 'pruisen', 'grootbrittannie']) oorlog(t, 'frankrijk', f); legerVanBuiten(t, k, 'pruisen', 40000, 'Pruisisch leger'); legerVanBuiten(t, k, 'grootbrittannie', 25000, 'Brits leger'); } },
    { id: 'willemi', datum: { dag: 16, maand: 3, jaar: 1815 }, onzeker: true, titel: 'Het Verenigd Koninkrijk der Nederlanden', tekst: 'Willem I wordt koning van de Nederlanden, Noord en Zuid samen. Luxemburg wordt een groothertogdom met dezelfde vorst.',
      keuzeVoor: ['frankrijk'],
      opties: [
        { tekst: 'Aanvaarden', uitleg: 'de Nederlanden en Luxemburg gaan naar Willem I', doe: (t, k) => { verschijn(t, 'nederlanden'); geefGebieden(t, k, [...BELGIE, ...NEDERLANDS, ...GROOTHERTOGDOM], 'nederlanden'); for (const f of ['oostenrijk', 'pruisen', 'grootbrittannie']) vrede(t, 'frankrijk', f); bond(t, 'nederlanden', 'grootbrittannie'); bond(t, 'nederlanden', 'pruisen'); } },
        { tekst: 'Weigeren', uitleg: 'de oorlog gaat verder', doe: (t) => { verschijn(t, 'nederlanden'); } },
      ] },
    { id: 'waterloo', datum: { dag: 16, maand: 6, jaar: 1815 }, titel: 'De Honderd Dagen: Ligny en Waterloo', tekst: 'Napoleon is teruggekeerd uit Elba en trekt met zijn leger naar Brussel. Bij Ligny en Quatre-Bras wordt gevochten; twee dagen later volgt de beslissende slag bij Waterloo, tegen Wellington en Blücher.',
      doe: (t, k) => {
        hernoem(t, 'frankrijk', 'Frans Keizerrijk', 'Napoleon I');
        for (const f of ['nederlanden', 'pruisen', 'grootbrittannie']) oorlog(t, 'frankrijk', f);
        legerBij(t, k, 'frankrijk', P.charleroi, 70000, 'Armée du Nord');
        legerBij(t, k, 'grootbrittannie', P.waterloo, 50000, 'Leger van Wellington');
        legerBij(t, k, 'pruisen', P.ligny, 60000, 'Leger van Blücher');
      } },
    { id: 'parijs1815', datum: { dag: 20, maand: 11, jaar: 1815 }, onzeker: true, titel: 'De Tweede Vrede van Parijs', tekst: 'Frankrijk tekent de vrede. De zuidgrens van het Verenigd Koninkrijk komt bijna overeen met de grens van nu.',
      keuzeVoor: ['frankrijk'],
      opties: [
        { tekst: 'Vrede tekenen', doe: (t, k) => { verschijn(t, 'nederlanden'); for (const f of ['nederlanden', 'pruisen', 'grootbrittannie', 'oostenrijk']) vrede(t, 'frankrijk', f); if (!spelerIs(t, 'frankrijk')) geefGebieden(t, k, [...BELGIE, ...NEDERLANDS, ...GROOTHERTOGDOM], 'nederlanden'); hernoem(t, 'frankrijk', 'Koninkrijk Frankrijk', 'Lodewijk XVIII'); } },
        { tekst: 'Doorvechten', doe: () => {} },
      ] },
  ],
};

export { RICHTING };
