// Tijdperken 3 tot 5: vroege middeleeuwen (843-1100), hoge middeleeuwen (1100-1384) en de Bourgondiërs (1384-1482).
// Bron: docs/onderzoek-geschiedenis.md. Gebieden van de machten zijn een benadering; heersers die daar als
// NIET NAGEKEKEN staan, zijn hier gemarkeerd met (?).
import {
  bestaat, bond, deel, geefAlles, geefRond, heerser, hernoem, legerBij, legerVanBuiten, onderwerp, oorlog, spelerIs, verschijn, vrede,
} from '../effecten';
import { sluitHuwelijk } from '../diplomatie';
import type { Tijdperk } from '../tijdperk';
import type { Toestand } from '../toestand';
import { P, RICHTING } from './gemeen';

/** tevredenheid van alle vakken van een macht veranderen */
function onrust(t: Toestand, f: string, d: number) {
  for (const v of t.vakken) if (v.eigenaar === f) v.tevredenheid = Math.max(0, Math.min(100, v.tevredenheid + d));
}

export const VROEGE_MIDDELEEUWEN: Tijdperk = {
  id: 'vroegemiddeleeuwen',
  naam: 'De vroege middeleeuwen',
  van: { dag: 10, maand: 8, jaar: 843 },
  tot: { dag: 1, maand: 1, jaar: 1100 },
  beschrijving: 'Bij het Verdrag van Verdun wordt het rijk van Karel de Grote verdeeld. De Schelde wordt een grens: ten westen ligt West-Francië, ten oosten het Middenrijk van keizer Lotharius. Vikingen varen de rivieren op. Uit deze verdeelde wereld groeien de graafschappen.',
  bevolking: 900_000,
  namen: ['Boudewijn', 'Arnulf', 'Robrecht', 'Reinier', 'Lambert', 'Godfried', 'Hendrik', 'Gozelo', 'Albert', 'Siegfried', 'Giselbert', 'Everhard'],
  kiOorlog: true,
  huwelijken: true,
  facties: [
    {
      id: 'westfrankenrijk', naam: 'West-Francië', kleur: '#3b5fa5', soort: 'rijk', heerser: 'Karel de Kale', leeftijd: 20, titel: 'koning', dynastie: 'Karolingers', groep: 'De koninkrijken',
      kernen: [P.laon, P.soissons, P.atrecht, P.brugge, P.gent, P.kortrijk], buiten: { ingang: RICHTING.zuid, steun: 40, doelSterkte: 12000, naam: 'Leger van de koning' },
      beschrijving: 'Het westelijke rijk, ten westen van de Schelde. Groot, maar de koning is ver en de edelen zijn sterk.',
    },
    {
      id: 'middenrijk', naam: 'Middenrijk', kleur: '#8e6bb5', soort: 'rijk', heerser: 'Lotharius I', leeftijd: 48, titel: 'keizer', dynastie: 'Karolingers', groep: 'De koninkrijken',
      kernen: [P.maastricht, P.luik, P.namen, P.leuven, P.antwerpen, P.bergen, P.luxemburg, P.sedan], buiten: { ingang: RICHTING.oost, steun: 30, doelSterkte: 10000, naam: 'Leger van de keizer' },
      beschrijving: 'Het smalle middenrijk van keizer Lotharius, van de Noordzee tot Italië, met Aken als hart. Moeilijk samen te houden.',
    },
    {
      id: 'oostfrankenrijk', naam: 'Oost-Francië', kleur: '#c9a227', soort: 'rijk', heerser: 'Lodewijk de Duitser', leeftijd: 37, titel: 'koning', dynastie: 'Karolingers', groep: 'Van buiten', nietKiesbaar: true,
      kernen: [], buiten: { ingang: RICHTING.oost, steun: 40, doelSterkte: 14000, naam: 'Leger uit het oosten' },
      beschrijving: 'Het oostelijke rijk, het latere Duitse Rijk.',
    },
    {
      id: 'vikingen', naam: 'Vikingen', kleur: '#5b5b5b', kwaliteit: 1.2, soort: 'rijk', heerser: '(zeekoningen)', groep: 'Van buiten', geenVorst: true, nietKiesbaar: true,
      kernen: [], buiten: { ingang: RICHTING.zee, steun: 15, doelSterkte: 8000, naam: 'Vikingen van zee' },
      beschrijving: 'Vikingen uit het noorden, die de rivieren opvaren en plunderen.',
    },
    { id: 'vlaanderen', naam: 'Graafschap Vlaanderen', kleur: '#e0b84a', soort: 'staat', heerser: 'Boudewijn I', leeftijd: 25, titel: 'graaf', dynastie: 'huis Vlaanderen', groep: 'Later', laat: true, kernen: [P.brugge, P.gent], beschrijving: 'Het graafschap van Boudewijn met de IJzeren Arm, rond Brugge en Gent.' },
    { id: 'luxemburg', naam: 'Graafschap Luxemburg', kleur: '#c97b2a', soort: 'staat', heerser: 'Siegfried', leeftijd: 40, titel: 'graaf', dynastie: 'Ardennen-huis', groep: 'Later', laat: true, kernen: [P.luxemburg], beschrijving: 'Rond de burcht op de Bock-rots, gekocht door Siegfried in 963.' },
    { id: 'luik', naam: 'Prinsbisdom Luik', kleur: '#b5463f', soort: 'staat', heerser: 'Notger', leeftijd: 45, titel: 'prins-bisschop', groep: 'Later', laat: true, kernen: [P.luik, P.hoei], beschrijving: 'Een bisschop die ook vorst is, met Luik en Hoei.' },
    { id: 'leuven', naam: 'Graafschap Leuven', kleur: '#5f9e55', soort: 'staat', heerser: 'Lambert I', leeftijd: 50, titel: 'graaf', dynastie: 'huis Leuven', groep: 'Later', laat: true, kernen: [P.leuven, P.brussel], beschrijving: 'De kern van het latere Brabant.' },
  ],
  oorlog: [['vikingen', 'westfrankenrijk'], ['vikingen', 'middenrijk']],
  versterkingen: [
    { naam: 'Burg van Brugge', ligging: P.brugge, bezetting: 2000 },
    { naam: 'Burcht van Gent', ligging: P.gent, bezetting: 2000 },
    { naam: 'Namen', ligging: P.namen, bezetting: 2500 },
    { naam: 'Laon', ligging: P.laon, bezetting: 3000 },
    { naam: 'Maastricht', ligging: P.maastricht, bezetting: 2000 },
  ],
  gebeurtenissen: [
    {
      id: 'prum', datum: { dag: 1, maand: 9, jaar: 855 },
      titel: 'Het Verdrag van Prüm',
      tekst: 'Keizer Lotharius sterft. Het noordelijke deel van het Middenrijk gaat naar zijn zoon Lotharius II en krijgt naar hem een naam: Lotharingen.',
      doe: (t) => hernoem(t, 'middenrijk', 'Lotharingen', 'Lotharius II'),
    },
    {
      id: 'vlaanderen862', datum: { dag: 1, maand: 1, jaar: 862 }, onzeker: true,
      titel: 'Boudewijn en Judith',
      tekst: 'Boudewijn schaakt Judith, de dochter van de koning. Na verzoening krijgt hij een groot gebied rond Brugge: het begin van het graafschap Vlaanderen.',
      keuzeVoor: ['westfrankenrijk'],
      opties: [
        { tekst: 'Boudewijn erkennen als graaf', uitleg: 'Vlaanderen wordt jouw leenman', doe: (t, k) => { verschijn(t, 'vlaanderen'); geefRond(t, k, P.brugge, 55, 'vlaanderen', ['westfrankenrijk']); t.facties.vlaanderen.leenheer = 'westfrankenrijk'; } },
        { tekst: 'Weigeren', uitleg: 'Boudewijn grijpt zelf de macht', doe: (t, k) => { verschijn(t, 'vlaanderen'); geefRond(t, k, P.brugge, 40, 'vlaanderen', ['westfrankenrijk']); oorlog(t, 'vlaanderen', 'westfrankenrijk'); legerBij(t, k, 'vlaanderen', P.brugge, 4000, 'Mannen van Boudewijn'); } },
      ],
    },
    {
      id: 'meerssen', datum: { dag: 8, maand: 8, jaar: 870 },
      titel: 'Het Verdrag van Meerssen',
      tekst: 'Lotharius II sterft zonder wettige zoon. Zijn ooms verdelen Lotharingen: het westen naar West-Francië, het oosten naar Oost-Francië.',
      keuzeVoor: ['middenrijk'],
      voorwaarde: (t) => bestaat(t, 'middenrijk'),
      opties: [
        { tekst: 'De verdeling aanvaarden', uitleg: 'je speelt verder als West- of Oost-Francië (naar waar je hoofdplaats ligt)', doe: (t, k) => {
          const speler = t.speler === 'middenrijk';
          const h = t.facties.middenrijk.hoofdstad;
          deel(t, k, 'middenrijk', ([lon]) => (lon < 4.8 ? 'westfrankenrijk' : 'oostfrankenrijk'));
          t.facties.middenrijk.bestaat = false;
          if (speler) t.speler = h !== null && k.vakken[h].lonlat[0] < 4.8 ? 'westfrankenrijk' : 'oostfrankenrijk';
        } },
        { tekst: 'Lotharingen verdedigen', uitleg: 'oorlog met beide koningen', doe: (t) => { oorlog(t, 'middenrijk', 'westfrankenrijk'); oorlog(t, 'middenrijk', 'oostfrankenrijk'); } },
      ],
    },
    {
      id: 'vikingen879', datum: { dag: 1, maand: 11, jaar: 879 }, onzeker: true,
      titel: 'Het grote leger van de Vikingen',
      tekst: 'Een groot Vikingleger slaat zijn winterkamp op in het Scheldeland en plundert jarenlang de steden en abdijen.',
      doe: (t, k) => {
        for (const f of Object.values(t.facties)) if (f.bestaat && f.id !== 'vikingen' && f.soort !== 'rijk' || ['westfrankenrijk', 'middenrijk', 'oostfrankenrijk'].includes(f.id)) oorlog(t, 'vikingen', f.id);
        legerVanBuiten(t, k, 'vikingen', 7000, 'Het grote leger');
        legerBij(t, k, 'vikingen', P.kortrijk, 5000, 'Vikingen in Kortrijk');
      },
    },
    {
      id: 'leuven891', datum: { dag: 1, maand: 9, jaar: 891 }, onzeker: true,
      titel: 'De slag bij Leuven',
      tekst: 'Koning Arnulf van Oost-Francië verslaat de Vikingen bij hun kamp aan de Dijle bij Leuven. Daarna nemen de grote invallen af.',
      doe: (t, k) => {
        const v = t.facties.vikingen;
        if (v.buiten) { v.buiten.doelSterkte = 0; v.buiten.steun = 0; }
        if (t.legers.some((l) => l.factie === 'vikingen')) { oorlog(t, 'oostfrankenrijk', 'vikingen'); legerBij(t, k, 'oostfrankenrijk', P.leuven, 10000, 'Leger van Arnulf'); }
      },
    },
    {
      id: 'lotharingen925', datum: { dag: 1, maand: 1, jaar: 925 },
      titel: 'Lotharingen bij het oosten',
      tekst: 'Lotharingen komt voorgoed bij Oost-Francië, het latere Duitse Rijk. Het land tussen Schelde en Maas hoort voortaan bij het Rijk.',
      keuzeVoor: ['middenrijk'],
      voorwaarde: (t) => bestaat(t, 'middenrijk') && !t.facties.middenrijk.heer,
      opties: [
        { tekst: 'De koning in het oosten erkennen', doe: (t) => { vrede(t, 'middenrijk', 'oostfrankenrijk'); onderwerp(t, 'middenrijk', 'oostfrankenrijk'); } },
        { tekst: 'Weigeren', uitleg: 'oorlog met het oosten', doe: (t) => oorlog(t, 'middenrijk', 'oostfrankenrijk') },
      ],
    },
    {
      id: 'luxemburg963', datum: { dag: 12, maand: 4, jaar: 963 }, onzeker: true,
      titel: 'Siegfried koopt Luxemburg',
      tekst: 'Graaf Siegfried ruilt land voor de burcht Lucilinburhuc op de Bock-rots. Rond die burcht groeit het graafschap Luxemburg.',
      doe: (t, k) => {
        verschijn(t, 'luxemburg');
        geefRond(t, k, P.luxemburg, 30, 'luxemburg', Object.keys(t.facties).filter((f) => f !== t.speler));
        t.facties.luxemburg.leenheer = 'oostfrankenrijk';
      },
    },
    {
      id: 'luik985', datum: { dag: 7, maand: 7, jaar: 985 }, onzeker: true,
      titel: 'Het prinsbisdom Luik',
      tekst: 'De keizer geeft bisschop Notger het graafschap Hoei. Luik wordt een vorstendom binnen het Rijk, geregeerd door een bisschop.',
      doe: (t, k) => {
        verschijn(t, 'luik');
        geefRond(t, k, P.luik, 22, 'luik', Object.keys(t.facties).filter((f) => f !== t.speler));
        geefRond(t, k, P.hoei, 15, 'luik', Object.keys(t.facties).filter((f) => f !== t.speler));
        t.facties.luik.leenheer = 'oostfrankenrijk';
      },
    },
    {
      id: 'capet', datum: { dag: 3, maand: 7, jaar: 987 }, onzeker: true, stil: true,
      titel: 'Hugo Capet', tekst: 'Hugo Capet wordt koning van West-Francië: het begin van de Capetingers, leenheren van Vlaanderen.',
      doe: (t) => hernoem(t, 'westfrankenrijk', 'Koninkrijk Frankrijk', 'Hugo Capet'),
    },
    {
      id: 'leuven1003', datum: { dag: 1, maand: 1, jaar: 1003 }, onzeker: true,
      titel: 'Het graafschap Leuven',
      tekst: 'Rond Leuven en Brussel ontstaat een graafschap dat later uitgroeit tot het hertogdom Brabant.',
      doe: (t, k) => {
        verschijn(t, 'leuven');
        geefRond(t, k, P.leuven, 28, 'leuven', Object.keys(t.facties).filter((f) => f !== t.speler));
        t.facties.leuven.leenheer = 'oostfrankenrijk';
      },
    },
    {
      id: 'kruistocht', datum: { dag: 15, maand: 8, jaar: 1096 }, onzeker: true, stil: true,
      titel: 'De eerste kruistocht', tekst: 'Godfried van Bouillon vertrekt op kruistocht. Om die te betalen verpandt hij Bouillon aan de bisschop van Luik.',
      doe: (t, k) => { if (bestaat(t, 'luik') && !spelerIs(t, 'luik')) geefRond(t, k, P.bouillon, 15, 'luik', Object.keys(t.facties).filter((f) => f !== t.speler)); },
    },
  ],
};

export const HOGE_MIDDELEEUWEN: Tijdperk = {
  id: 'hogemiddeleeuwen',
  naam: 'De hoge middeleeuwen',
  van: { dag: 1, maand: 1, jaar: 1100 },
  tot: { dag: 30, maand: 1, jaar: 1384 },
  beschrijving: 'Graven, hertogen en een prins-bisschop regeren het land, met de Franse koning en de Duitse keizer als verre leenheren. De steden groeien: Brugge, Gent en Ieper worden rijk met laken. Steden en vorsten botsen, en de Franse koning wil Vlaanderen in handen krijgen.',
  bevolking: 1_200_000,
  namen: ['Boudewijn', 'Diederik', 'Filips', 'Gwijde', 'Robrecht', 'Lodewijk', 'Godfried', 'Hendrik', 'Jan', 'Walram', 'Willem', 'Arnold', 'Wenceslas', 'Hugo', 'Adolf', 'Margaretha', 'Johanna'],
  kiOorlog: true,
  huwelijken: true,
  facties: [
    { id: 'vlaanderen', naam: 'Graafschap Vlaanderen', kleur: '#e0b84a', soort: 'staat', heerser: 'Robrecht II', leeftijd: 35, titel: 'graaf', dynastie: 'huis Vlaanderen', groep: 'Onder de Franse koning', kernen: [P.brugge, P.gent, P.ieper, P.rijsel, P.atrecht, P.sintomaars], beschrijving: 'Het rijkste graafschap, met Brugge, Gent en Ieper. Leenman van de Franse koning, maar met eigenzinnige steden.' },
    { id: 'boulogne', naam: 'Graafschap Boulogne', kleur: '#8b5a8b', soort: 'staat', heerser: 'Eustatius III (?)', leeftijd: 40, titel: 'graaf', groep: 'Onder de Franse koning', kernen: [P.boulogne, P.kales], beschrijving: 'Aan de kust, rond Boulogne.' },
    { id: 'henegouwen', naam: 'Graafschap Henegouwen', kleur: '#3b6ea5', soort: 'staat', heerser: 'Boudewijn III', leeftijd: 20, titel: 'graaf', dynastie: 'huis Henegouwen', groep: 'Onder de keizer', kernen: [P.bergen, P.valencijn], beschrijving: 'Rond Bergen en Valencijn.' },
    { id: 'namen', naam: 'Graafschap Namen', kleur: '#2e7d6b', soort: 'staat', heerser: 'Albert III', leeftijd: 60, titel: 'graaf', dynastie: 'huis Namen', groep: 'Onder de keizer', kernen: [P.namen, P.charleroi], beschrijving: 'Klein maar sterk, rond de burcht van Namen.' },
    { id: 'leuven', naam: 'Graafschap Leuven', kleur: '#5f9e55', soort: 'staat', heerser: 'Godfried I', leeftijd: 40, titel: 'graaf', dynastie: 'huis Leuven', groep: 'Onder de keizer', kernen: [P.leuven, P.brussel, P.antwerpen, P.mechelen], beschrijving: 'Rond Leuven, Brussel en Antwerpen: het latere hertogdom Brabant.' },
    { id: 'limburg', naam: 'Graafschap Limburg', kleur: '#7a5c3a', soort: 'staat', heerser: 'Hendrik I', leeftijd: 40, titel: 'graaf', dynastie: 'huis Limburg', groep: 'Onder de keizer', kernen: [P.limbourg, P.maastricht, P.roermond], beschrijving: 'Rond Limbourg aan de Vesder, op de weg van Brugge naar Keulen.' },
    { id: 'luik', naam: 'Prinsbisdom Luik', kleur: '#b5463f', soort: 'staat', heerser: 'Otbert (?)', leeftijd: 50, titel: 'prins-bisschop', groep: 'Onder de keizer', kernen: [P.luik, P.hoei, P.dinant, P.bouillon], beschrijving: 'Een bisschop als vorst, met de rijke Maassteden Luik, Hoei en Dinant.' },
    { id: 'loon', naam: 'Graafschap Loon', kleur: '#b5a642', soort: 'staat', heerser: 'Arnold I', leeftijd: 40, titel: 'graaf', dynastie: 'huis Loon', groep: 'Onder de keizer', kernen: [P.borgloon, P.hasselt, P.turnhout], beschrijving: 'Rond Borgloon en Hasselt, klem tussen Luik en Brabant.' },
    { id: 'luxemburg', naam: 'Graafschap Luxemburg', kleur: '#c97b2a', soort: 'staat', heerser: 'Willem I (?)', leeftijd: 30, titel: 'graaf', dynastie: 'huis Luxemburg', groep: 'Onder de keizer', kernen: [P.luxemburg, P.aarlen, P.bastenaken], beschrijving: 'In de Ardennen. Het huis Luxemburg levert later keizers.' },
    { id: 'frankrijk', naam: 'Koninkrijk Frankrijk', kleur: '#3b5fa5', soort: 'rijk', heerser: 'Filips I', leeftijd: 48, titel: 'koning', dynastie: 'Capetingers', groep: 'De grote rijken', kernen: [P.soissons, P.laon, P.saintquentin, P.reims], buiten: { ingang: RICHTING.zuid, steun: 60, doelSterkte: 20000, naam: 'Leger van de Franse koning' }, beschrijving: 'De Franse koning, leenheer van Vlaanderen. Hij wil zijn gezag in het noorden versterken.' },
    { id: 'duitserijk', naam: 'Heilig Roomse Rijk', kleur: '#c9a227', soort: 'rijk', heerser: 'Hendrik IV', leeftijd: 50, titel: 'keizer', groep: 'De grote rijken', nietKiesbaar: true, kernen: [], buiten: { ingang: RICHTING.oost, steun: 40, doelSterkte: 15000, naam: 'Leger van de keizer' }, beschrijving: 'De keizer, verre leenheer van de vorsten ten oosten van de Schelde.' },
    { id: 'bourgondie', naam: 'Bourgondië', kleur: '#6b2d5c', soort: 'rijk', heerser: 'Filips de Stoute', leeftijd: 27, titel: 'hertog', dynastie: 'Valois-Bourgondië', groep: 'Later', laat: true, nietKiesbaar: true, kernen: [], buiten: { ingang: RICHTING.zuidoost, steun: 30, doelSterkte: 8000, naam: 'Leger van Bourgondië' }, beschrijving: 'Het hertogdom Bourgondië, van een jongere zoon van de Franse koning.' },
  ],
  leen: [['vlaanderen', 'frankrijk'], ['boulogne', 'frankrijk'], ['henegouwen', 'duitserijk'], ['namen', 'duitserijk'], ['leuven', 'duitserijk'], ['limburg', 'duitserijk'], ['luik', 'duitserijk'], ['loon', 'duitserijk'], ['luxemburg', 'duitserijk']],
  versterkingen: [
    { naam: 'Gravensteen', ligging: P.gent, bezetting: 2500 }, { naam: 'Brugge', ligging: P.brugge, bezetting: 2000 }, { naam: 'Ieper', ligging: P.ieper, bezetting: 1500 },
    { naam: 'Rijsel', ligging: P.rijsel, bezetting: 1500 }, { naam: 'Leuven', ligging: P.leuven, bezetting: 1500 }, { naam: 'Limbourg', ligging: P.limbourg, bezetting: 1500 },
    { naam: 'Luxemburg', ligging: P.luxemburg, bezetting: 2500 }, { naam: 'Namen', ligging: P.namen, bezetting: 2500 }, { naam: 'Bergen', ligging: P.bergen, bezetting: 1500 },
    { naam: 'Luik', ligging: P.luik, bezetting: 2000 }, { naam: 'Bouillon', ligging: P.bouillon, bezetting: 2000 },
  ],
  gebeurtenissen: [
    { id: 'hertog1106', datum: { dag: 1, maand: 1, jaar: 1106 }, stil: true, titel: 'Godfried van Leuven, hertog', tekst: 'Godfried van Leuven krijgt van de keizer de titel van hertog van Neder-Lotharingen. Leuven stijgt boven de andere vorsten uit.', doe: (t) => { if (bestaat(t, 'leuven')) t.facties.leuven.titel = 'hertog'; } },
    {
      id: 'karel1127', datum: { dag: 2, maand: 3, jaar: 1127 },
      titel: 'De moord op Karel de Goede',
      tekst: 'Graaf Karel de Goede wordt in de Sint-Donaaskerk in Brugge vermoord. Er volgt een strijd om de opvolging; in 1128 wordt Diederik van de Elzas graaf.',
      doe: (t) => { if (bestaat(t, 'vlaanderen')) { onrust(t, 'vlaanderen', -15); heerser(t, 'vlaanderen', 'Diederik van de Elzas', 28); } },
    },
    { id: 'brabant1183', datum: { dag: 1, maand: 1, jaar: 1183 }, onzeker: true, stil: true, titel: 'Het hertogdom Brabant', tekst: 'Het land van de hertogen van Leuven wordt het hertogdom Brabant.', doe: (t) => { if (bestaat(t, 'leuven')) hernoem(t, 'leuven', 'Hertogdom Brabant'); } },
    {
      id: 'bouvines', datum: { dag: 27, maand: 7, jaar: 1214 },
      titel: 'De slag bij Bouvines',
      tekst: 'De Franse koning Filips II August verslaat bij Bouvines een bondgenootschap van de keizer, de Engelse koning en graaf Ferrand van Vlaanderen. Ferrand blijft jaren gevangen.',
      keuzeVoor: ['vlaanderen'],
      voorwaarde: (t) => bestaat(t, 'vlaanderen'),
      opties: [
        { tekst: 'Ten strijde', uitleg: 'oorlog met de Franse koning', doe: (t, k) => { t.facties.vlaanderen.leenheer = null; oorlog(t, 'frankrijk', 'vlaanderen'); legerBij(t, k, 'frankrijk', P.rijsel, 14000, 'Leger van Filips August'); onrust(t, 'vlaanderen', -5); } },
        { tekst: 'Buigen voor de koning', uitleg: 'vrede, maar je verliest aanzien', doe: (t) => { onrust(t, 'vlaanderen', -10); } },
      ],
    },
    {
      id: 'woeringen', datum: { dag: 5, maand: 6, jaar: 1288 }, onzeker: true,
      titel: 'De slag bij Woeringen',
      tekst: 'In de strijd om de opvolging in Limburg verslaat hertog Jan I van Brabant zijn tegenstanders bij Woeringen, bij Keulen. Limburg komt bij Brabant.',
      keuzeVoor: ['limburg'],
      voorwaarde: (t) => bestaat(t, 'leuven') && bestaat(t, 'limburg'),
      opties: [
        { tekst: 'Limburg gaat naar Brabant', doe: (t) => { heerser(t, 'leuven', 'Jan I', 36); if (spelerIs(t, 'limburg')) onderwerp(t, 'limburg', 'leuven'); else geefAlles(t, 'limburg', 'leuven'); } },
        { tekst: 'Vechten voor Limburg', uitleg: 'oorlog met Brabant', doe: (t, k) => { oorlog(t, 'limburg', 'leuven'); legerBij(t, k, 'leuven', P.maastricht, 8000, 'Leger van Jan I'); } },
      ],
    },
    {
      id: 'guldensporen', datum: { dag: 11, maand: 7, jaar: 1302 },
      titel: 'De Guldensporenslag',
      tekst: 'De Franse koning heeft Vlaanderen bezet. Na de Brugse Metten trekken de milities van de Vlaamse steden naar Kortrijk. Op de Groeningekouter staan ze tegenover het Franse ridderleger.',
      doe: (t, k) => {
        if (!bestaat(t, 'vlaanderen')) return;
        t.facties.vlaanderen.leenheer = null;
        oorlog(t, 'frankrijk', 'vlaanderen');
        legerBij(t, k, 'vlaanderen', P.kortrijk, 9000, 'Milities van de Vlaamse steden');
        legerBij(t, k, 'frankrijk', P.kortrijk, 8000, 'Franse ridders');
      },
    },
    {
      id: 'athis', datum: { dag: 23, maand: 6, jaar: 1305 }, onzeker: true,
      titel: 'Het Verdrag van Athis-sur-Orge',
      tekst: 'Vlaanderen sluit vrede met Frankrijk, tegen een zware boete. Rijsel, Douai en Orchies (Waals-Vlaanderen) komen onder de Franse koning.',
      keuzeVoor: ['vlaanderen'],
      voorwaarde: (t) => bestaat(t, 'vlaanderen') && bestaat(t, 'frankrijk'),
      opties: [
        { tekst: 'Vrede tekenen', uitleg: 'Waals-Vlaanderen naar Frankrijk', doe: (t, k) => { vrede(t, 'vlaanderen', 'frankrijk'); geefRond(t, k, P.rijsel, 28, 'frankrijk', ['vlaanderen']); t.facties.vlaanderen.schat -= 100; } },
        { tekst: 'Doorvechten', doe: () => {} },
      ],
    },
    { id: 'artevelde', datum: { dag: 17, maand: 7, jaar: 1345 }, onzeker: true, stil: true, titel: 'Jacob van Artevelde', tekst: 'Jacob van Artevelde, die Gent jaren leidde in het belang van de lakenhandel met Engeland, wordt vermoord.', doe: (t) => onrust(t, 'vlaanderen', -5) },
    {
      id: 'blijdeinkomst', datum: { dag: 3, maand: 1, jaar: 1356 },
      titel: 'De Blijde Inkomst',
      tekst: 'Hertogin Johanna van Brabant belooft bij haar intrede de rechten van haar onderdanen te eerbiedigen. Kort daarna valt graaf Lodewijk van Male Brabant binnen.',
      doe: (t) => { onrust(t, 'leuven', 10); if (bestaat(t, 'vlaanderen') && bestaat(t, 'leuven') && !spelerIs(t, 'leuven', 'vlaanderen')) oorlog(t, 'vlaanderen', 'leuven'); },
    },
    {
      id: 'loon1366', datum: { dag: 1, maand: 1, jaar: 1366 },
      titel: 'Loon bij Luik',
      tekst: 'Het graafschap Loon wordt ingelijfd bij het prinsbisdom Luik.',
      keuzeVoor: ['loon'],
      voorwaarde: (t) => bestaat(t, 'loon') && bestaat(t, 'luik'),
      opties: [
        { tekst: 'Aanvaarden', doe: (t) => { if (spelerIs(t, 'loon')) onderwerp(t, 'loon', 'luik'); else geefAlles(t, 'loon', 'luik'); } },
        { tekst: 'Weigeren', uitleg: 'oorlog met Luik', doe: (t) => oorlog(t, 'loon', 'luik') },
      ],
    },
    {
      id: 'huwelijk1369', datum: { dag: 19, maand: 6, jaar: 1369 },
      titel: 'Margaretha van Male en Filips de Stoute',
      tekst: 'Margaretha, de erfdochter van Vlaanderen, trouwt met Filips de Stoute, hertog van Bourgondië. Vlaanderen en Artesië zullen naar Bourgondië gaan.',
      doe: (t) => { verschijn(t, 'bourgondie'); if (bestaat(t, 'vlaanderen')) { sluitHuwelijk(t, 'vlaanderen', 'bourgondie'); bond(t, 'vlaanderen', 'bourgondie'); } },
    },
    { id: 'baesweiler', datum: { dag: 22, maand: 8, jaar: 1371 }, stil: true, titel: 'Baesweiler', tekst: 'Brabant verliest de slag bij Baesweiler; de hertog wordt gevangen genomen.', doe: (t) => onrust(t, 'leuven', -8) },
    { id: 'westrozebeke', datum: { dag: 27, maand: 11, jaar: 1382 }, titel: 'De slag bij Westrozebeke', tekst: 'Een Frans leger verslaat de opstandige Gentenaars onder Filips van Artevelde bij Westrozebeke. De Gentse opstand gaat nog door tot 1385.', doe: (t) => onrust(t, 'vlaanderen', -10) },
  ],
};

export const BOURGONDIERS: Tijdperk = {
  id: 'bourgondiers',
  naam: 'De Bourgondiërs',
  van: { dag: 30, maand: 1, jaar: 1384 },
  tot: { dag: 27, maand: 3, jaar: 1482 },
  beschrijving: 'Na de dood van Lodewijk van Male erven Filips de Stoute en Margaretha Vlaanderen en Artesië. Met huwelijken, erfenissen, aankopen en oorlogen brengen de Bourgondische hertogen de gewesten van de Nederlanden één voor één samen. Alleen Luik verzet zich hardnekkig.',
  bevolking: 2_000_000,
  namen: ['Filips', 'Jan', 'Karel', 'Antoon', 'Margaretha', 'Isabella', 'Maria', 'Jacoba', 'Willem', 'Albrecht', 'Lodewijk', 'Anton', 'Adolf'],
  kiOorlog: true,
  huwelijken: true,
  facties: [
    { id: 'bourgondie', naam: 'Bourgondische staat', kleur: '#6b2d5c', soort: 'staat', heerser: 'Filips de Stoute', leeftijd: 42, titel: 'hertog', dynastie: 'Valois-Bourgondië', groep: 'De Bourgondiërs', kernen: [P.rijsel, P.brugge, P.ieper, P.atrecht, P.sintomaars], buiten: { ingang: RICHTING.zuidoost, steun: 50, doelSterkte: 10000, naam: 'Troepen uit Bourgondië' }, beschrijving: 'Vlaanderen en Artesië, met het hertogdom Bourgondië in het zuiden erbij. Rijk en eerzuchtig.' },
    { id: 'gent', naam: 'Opstandig Gent', kleur: '#e0b84a', soort: 'staat', heerser: 'Frans Ackerman (?)', leeftijd: 40, groep: 'De Bourgondiërs', geenVorst: true, kernen: [P.gent], beschrijving: 'De stad Gent, nog in opstand tegen de graaf, met hulp van Engeland.' },
    { id: 'brabant', naam: 'Hertogdom Brabant', kleur: '#5f9e55', soort: 'staat', heerser: 'Johanna', leeftijd: 62, titel: 'hertogin', dynastie: 'huis Leuven', groep: 'De andere vorsten', kernen: [P.brussel, P.leuven, P.antwerpen, P.mechelen, P.limbourg, P.maastricht], beschrijving: 'Brabant en Limburg, met Brussel en Antwerpen. De oude hertogin heeft geen kinderen.' },
    { id: 'henegouwen', naam: 'Henegouwen', kleur: '#3b6ea5', soort: 'staat', heerser: 'Albrecht van Beieren (?)', leeftijd: 48, titel: 'graaf', dynastie: 'Wittelsbach', groep: 'De andere vorsten', kernen: [P.bergen, P.valencijn], beschrijving: 'Henegouwen, met Holland en Zeeland in het noorden.' },
    { id: 'namen', naam: 'Graafschap Namen', kleur: '#2e7d6b', soort: 'staat', heerser: 'Willem I (?)', leeftijd: 60, titel: 'graaf', groep: 'De andere vorsten', kernen: [P.namen, P.charleroi], beschrijving: 'Klein graafschap rond Namen, met een kinderloze graaf.' },
    { id: 'luik', naam: 'Prinsbisdom Luik', kleur: '#b5463f', soort: 'staat', heerser: 'Arnold van Horne (?)', leeftijd: 45, titel: 'prins-bisschop', groep: 'De andere vorsten', geenVorst: true, kernen: [P.luik, P.hoei, P.dinant, P.hasselt, P.borgloon], beschrijving: 'Luik, met trotse steden die hun vrijheden verdedigen.' },
    { id: 'luxemburg', naam: 'Hertogdom Luxemburg', kleur: '#c97b2a', soort: 'staat', heerser: 'Wenceslas (?)', leeftijd: 23, titel: 'hertog', dynastie: 'huis Luxemburg', groep: 'De andere vorsten', kernen: [P.luxemburg, P.aarlen, P.bastenaken], beschrijving: 'Het hertogdom in de Ardennen, van het huis Luxemburg.' },
    { id: 'frankrijk', naam: 'Koninkrijk Frankrijk', kleur: '#3b5fa5', soort: 'rijk', heerser: 'Karel VI', leeftijd: 15, titel: 'koning', dynastie: 'Valois', groep: 'De grote rijken', kernen: [P.soissons, P.laon, P.reims, P.charleville], buiten: { ingang: RICHTING.zuid, steun: 80, doelSterkte: 25000, naam: 'Leger van de Franse koning' }, beschrijving: 'De Franse koning, in oorlog met Engeland.' },
    { id: 'engeland', naam: 'Koninkrijk Engeland', kleur: '#c0533f', soort: 'rijk', heerser: 'Richard II', leeftijd: 17, titel: 'koning', dynastie: 'Plantagenet', groep: 'De grote rijken', kernen: [P.kales], buiten: { ingang: RICHTING.zee, steun: 50, doelSterkte: 10000, naam: 'Engelse troepen' }, beschrijving: 'Engeland houdt Calais en steunt Gent.' },
  ],
  oorlog: [['bourgondie', 'gent'], ['frankrijk', 'engeland'], ['frankrijk', 'gent']],
  leen: [['bourgondie', 'frankrijk']],
  bond: [['bourgondie', 'frankrijk'], ['gent', 'engeland']],
  versterkingen: [
    { naam: 'Gent', ligging: P.gent, bezetting: 3000 }, { naam: 'Brugge', ligging: P.brugge, bezetting: 2000 }, { naam: 'Rijsel', ligging: P.rijsel, bezetting: 2000 },
    { naam: 'Calais', ligging: P.kales, bezetting: 3000 }, { naam: 'Namen', ligging: P.namen, bezetting: 2500 }, { naam: 'Luxemburg', ligging: P.luxemburg, bezetting: 3000 },
    { naam: 'Luik', ligging: P.luik, bezetting: 2500 }, { naam: 'Dinant', ligging: P.dinant, bezetting: 1500 }, { naam: 'Brussel', ligging: P.brussel, bezetting: 2000 },
  ],
  gebeurtenissen: [
    { id: 'namen1421', datum: { dag: 1, maand: 1, jaar: 1421 }, titel: 'Bourgondië koopt Namen', tekst: 'De kinderloze graaf van Namen verkoopt zijn graafschap aan Filips de Goede van Bourgondië.', keuzeVoor: ['namen'], voorwaarde: (t) => bestaat(t, 'namen') && bestaat(t, 'bourgondie'),
      opties: [
        { tekst: 'Verkopen', uitleg: 'je speelt verder als Bourgondië', doe: (t) => { t.facties.bourgondie.schat -= 150; geefAlles(t, 'namen', 'bourgondie'); heerser(t, 'bourgondie', 'Filips de Goede', 25); } },
        { tekst: 'Niet verkopen', doe: (t) => { heerser(t, 'bourgondie', 'Filips de Goede', 25); } },
      ] },
    { id: 'brabant1430', datum: { dag: 4, maand: 8, jaar: 1430 }, titel: 'Brabant en Limburg erfelijk Bourgondisch', tekst: 'De laatste hertog van de Brabantse tak sterft. Filips de Goede erft Brabant en Limburg.', keuzeVoor: ['brabant'], voorwaarde: (t) => bestaat(t, 'brabant') && bestaat(t, 'bourgondie'),
      opties: [
        { tekst: 'De erfenis aanvaarden', uitleg: 'je speelt verder als Bourgondië', doe: (t) => geefAlles(t, 'brabant', 'bourgondie') },
        { tekst: 'De Staten van Brabant kiezen een eigen vorst', uitleg: 'oorlog met Bourgondië', doe: (t) => oorlog(t, 'brabant', 'bourgondie') },
      ] },
    { id: 'henegouwen1433', datum: { dag: 12, maand: 4, jaar: 1433 }, onzeker: true, titel: 'Henegouwen, Holland en Zeeland', tekst: 'Na een lange strijd met Jacoba van Beieren krijgt Filips de Goede Henegouwen, Holland en Zeeland.', keuzeVoor: ['henegouwen'], voorwaarde: (t) => bestaat(t, 'henegouwen') && bestaat(t, 'bourgondie'),
      opties: [
        { tekst: 'Afstand doen', uitleg: 'je speelt verder als Bourgondië', doe: (t) => geefAlles(t, 'henegouwen', 'bourgondie') },
        { tekst: 'Weigeren', uitleg: 'oorlog met Bourgondië', doe: (t) => oorlog(t, 'henegouwen', 'bourgondie') },
      ] },
    { id: 'luxemburg1443', datum: { dag: 1, maand: 1, jaar: 1443 }, onzeker: true, titel: 'Luxemburg', tekst: 'Filips de Goede neemt Luxemburg in en krijgt het hertogdom in handen.', keuzeVoor: ['luxemburg'], voorwaarde: (t) => bestaat(t, 'luxemburg') && bestaat(t, 'bourgondie'),
      opties: [
        { tekst: 'Aanvaarden', uitleg: 'je speelt verder als Bourgondië', doe: (t) => geefAlles(t, 'luxemburg', 'bourgondie') },
        { tekst: 'Verdedigen', uitleg: 'oorlog met Bourgondië', doe: (t, k) => { oorlog(t, 'luxemburg', 'bourgondie'); legerBij(t, k, 'bourgondie', P.aarlen, 9000, 'Leger van Filips de Goede'); } },
      ] },
    { id: 'dinant', datum: { dag: 25, maand: 8, jaar: 1466 }, onzeker: true, titel: 'De verwoesting van Dinant', tekst: 'De Luikse steden komen in opstand tegen hun Bourgondisch gezinde bisschop. Karel, de zoon van Filips de Goede, verwoest Dinant.',
      voorwaarde: (t) => bestaat(t, 'luik') && bestaat(t, 'bourgondie'),
      doe: (t, k) => { heerser(t, 'bourgondie', 'Karel de Stoute', 33); oorlog(t, 'bourgondie', 'luik'); legerBij(t, k, 'bourgondie', P.dinant, 14000, 'Leger van Karel de Stoute'); } },
    { id: 'brustem', datum: { dag: 28, maand: 10, jaar: 1467 }, titel: 'De slag bij Brustem', tekst: 'Karel de Stoute verslaat de Luikenaars bij Brustem, bij Sint-Truiden.', voorwaarde: (t) => bestaat(t, 'luik') && bestaat(t, 'bourgondie'), doe: (t, k) => { oorlog(t, 'bourgondie', 'luik'); legerBij(t, k, 'bourgondie', P.hasselt, 12000, 'Leger van Karel de Stoute'); } },
    { id: 'luik1468', datum: { dag: 30, maand: 10, jaar: 1468 }, titel: 'De plundering van Luik', tekst: 'Na een nieuwe opstand laat Karel de Stoute Luik plunderen en in brand steken. Het prinsbisdom komt onder Bourgondische voogdij.', keuzeVoor: ['luik'], voorwaarde: (t) => bestaat(t, 'luik') && bestaat(t, 'bourgondie'),
      opties: [
        { tekst: 'Buigen', uitleg: 'Luik komt onder Bourgondië', doe: (t) => { vrede(t, 'luik', 'bourgondie'); onderwerp(t, 'luik', 'bourgondie'); for (const v of t.vakken) if (v.eigenaar === 'luik') v.bevolking *= 0.8; } },
        { tekst: 'Verzet', doe: (t) => oorlog(t, 'luik', 'bourgondie') },
      ] },
    { id: 'nancy', datum: { dag: 5, maand: 1, jaar: 1477 }, titel: 'Karel de Stoute sneuvelt bij Nancy', tekst: 'Karel de Stoute sneuvelt bij Nancy. Zijn dochter Maria van Bourgondië erft alles. De Franse koning valt Artesië en Bourgondië binnen; de gewesten eisen hun rechten terug.',
      voorwaarde: (t) => bestaat(t, 'bourgondie'),
      doe: (t, k) => {
        heerser(t, 'bourgondie', 'Maria van Bourgondië', 19);
        oorlog(t, 'frankrijk', 'bourgondie');
        legerBij(t, k, 'frankrijk', P.atrecht, 16000, 'Leger van Lodewijk XI');
        onrust(t, 'bourgondie', -15);
        if (t.facties.luik.heer === 'bourgondie') t.facties.luik.heer = null;
      } },
    { id: 'maximiliaan', datum: { dag: 19, maand: 8, jaar: 1477 }, titel: 'Maria trouwt met Maximiliaan', tekst: 'Maria van Bourgondië trouwt met Maximiliaan van Oostenrijk. De Nederlanden komen in handen van de Habsburgers.', voorwaarde: (t) => bestaat(t, 'bourgondie'), doe: (t) => { t.facties.bourgondie.dynastie = 'Habsburg'; onrust(t, 'bourgondie', 10); } },
    { id: 'guinegate', datum: { dag: 7, maand: 8, jaar: 1479 }, titel: 'De slag bij Guinegate', tekst: 'Maximiliaan houdt de Franse opmars in Artesië tegen bij Guinegate.', voorwaarde: (t) => bestaat(t, 'bourgondie') && !spelerIs(t, 'bourgondie'), doe: (t, k) => { legerBij(t, k, 'bourgondie', P.sintomaars, 12000, 'Leger van Maximiliaan'); } },
  ],
  maandelijks: (t) => {
    // de oude hertogin van Brabant heeft geen kinderen: Bourgondië is verwant
    if (bestaat(t, 'brabant') && bestaat(t, 'bourgondie') && !t.huwelijk.includes('bourgondie|brabant')) t.huwelijk.push('bourgondie|brabant');
  },
};
