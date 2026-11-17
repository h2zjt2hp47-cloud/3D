// Tijdperk 2: de Franken, van Clovis (481) tot het Verdrag van Verdun (843).
// Bron: docs/onderzoek-geschiedenis.md. Gebieden van de machten zijn een benadering.
import { bestaat, deel, geefAlles, hernoem, legerBij, legerVanBuiten, lijfVazallenIn, onderwerp, oorlog, verschijn, vrede, bond, spelerIs } from '../effecten';
import type { Tijdperk } from '../tijdperk';
import { P, RICHTING } from './gemeen';

export const FRANKEN: Tijdperk = {
  id: 'franken',
  naam: 'De Franken',
  van: { dag: 1, maand: 1, jaar: 481 },
  tot: { dag: 10, maand: 8, jaar: 843 },
  beschrijving: 'Het West-Romeinse rijk is voorbij. Rond Doornik wordt Clovis koning van de Salische Franken. In Kamerijk en Keulen zitten andere Frankische koningen, en rond Soissons houdt Syagrius het laatste stuk Romeins bestuur overeind. Wie verenigt het noorden?',
  bevolking: 700_000,
  namen: ['Chlodovech', 'Childerik', 'Chlotarius', 'Theuderik', 'Sigebert', 'Dagobert', 'Pepijn', 'Grimoald', 'Karel', 'Karloman', 'Lodewijk', 'Lotharius', 'Ansegisel'],
  kiOorlog: true,
  huwelijken: true,
  facties: [
    {
      id: 'salfranken', naam: 'Salische Franken', kleur: '#3b6ea5', kwaliteit: 1.1, soort: 'staat', heerser: 'Clovis I', leeftijd: 15, titel: 'koning', dynastie: 'Merovingers', groep: 'Frankische koninkrijken',
      kernen: [P.doornik, P.kortrijk, P.gent, P.brugge, P.bergen], leger: 0.05,
      beschrijving: 'Rond Doornik, waar Clovis zijn vader Childerik opvolgt. Jong en ondernemend: met hem begint het Frankische rijk.',
    },
    {
      id: 'kamerijk', naam: 'Franken van Kamerijk', kleur: '#8b5a8b', soort: 'staat', heerser: 'Ragnachar', leeftijd: 40, titel: 'koning', dynastie: 'Merovingers', groep: 'Frankische koninkrijken',
      kernen: [P.kamerijk, P.atrecht, P.sintomaars, P.rijsel],
      beschrijving: 'Een Frankisch koninkrijk rond Kamerijk en Atrecht, verwant aan Clovis maar met eigen plannen.',
    },
    {
      id: 'rijnfranken', naam: 'Rijnfranken', kleur: '#2e8b57', soort: 'staat', heerser: 'Sigibert de Lamme', leeftijd: 45, titel: 'koning', groep: 'Frankische koninkrijken',
      kernen: [P.maastricht, P.luik, P.tongeren, P.luxemburg, P.limbourg],
      beschrijving: 'De Franken van Keulen, langs Maas en Rijn. Hun koning zetelt net buiten de kaart.',
    },
    {
      id: 'syagrius', naam: 'Rijk van Syagrius', kleur: '#a3262a', kwaliteit: 1.15, soort: 'staat', heerser: 'Syagrius', leeftijd: 50, titel: 'koning der Romeinen', groep: 'Het laatste Rome',
      kernen: [P.soissons, P.laon, P.reims, P.saintquentin, P.charleville, P.namen, P.bastenaken], leger: 0.05,
      beschrijving: 'Het laatste stuk Romeins bestuur in Noord-Gallië, rond Soissons. Goed georganiseerd, maar alleen.',
    },
    {
      id: 'alamannen', naam: 'Alamannen', kleur: '#c97b2a', kwaliteit: 1.05, soort: 'rijk', heerser: '(koning onbekend)', groep: 'Van buiten', geenVorst: true, nietKiesbaar: true,
      kernen: [], buiten: { ingang: RICHTING.zuidoost, steun: 20, doelSterkte: 12000, naam: 'Alamannen over de Rijn' },
      beschrijving: 'Germaanse stammen aan de Boven-Rijn, rivalen van de Franken.',
    },
    {
      id: 'austrasie', naam: 'Austrasië', kleur: '#2e7d6b', kwaliteit: 1.1, soort: 'staat', heerser: 'Theuderik I', leeftijd: 25, titel: 'koning', dynastie: 'Merovingers', groep: 'Na de deling', laat: true,
      kernen: [P.maastricht, P.luik, P.herstal, P.luxemburg],
      beschrijving: 'Het oostelijke Frankische rijk, met het Maasland als hart. Hier komen later de Pippiniden vandaan.',
    },
    {
      id: 'neustrie', naam: 'Neustrië', kleur: '#5f6b8a', soort: 'staat', heerser: 'Chlotarius I', leeftijd: 14, titel: 'koning', dynastie: 'Merovingers', groep: 'Na de deling', laat: true,
      kernen: [P.soissons, P.doornik, P.kamerijk],
      beschrijving: 'Het westelijke Frankische rijk, rond Soissons en Doornik.',
    },
  ],
  bond: [['salfranken', 'kamerijk']],
  versterkingen: [
    { naam: 'Doornik', ligging: P.doornik, bezetting: 2500 },
    { naam: 'Kamerijk', ligging: P.kamerijk, bezetting: 2000 },
    { naam: 'Soissons', ligging: P.soissons, bezetting: 3500 },
    { naam: 'Laon', ligging: P.laon, bezetting: 2500 },
    { naam: 'Maastricht', ligging: P.maastricht, bezetting: 2000 },
  ],
  gebeurtenissen: [
    {
      id: 'soissons', datum: { dag: 1, maand: 6, jaar: 486 },
      titel: 'De slag bij Soissons',
      tekst: 'Clovis trekt op tegen Syagrius, de laatste Romeinse bestuurder in het noorden.',
      voorwaarde: (t) => bestaat(t, 'salfranken') && bestaat(t, 'syagrius'),
      doe: (t, k) => {
        oorlog(t, 'salfranken', 'syagrius');
        if (!spelerIs(t, 'salfranken')) legerBij(t, k, 'salfranken', P.saintquentin, 7000, 'Clovis te velde');
      },
    },
    {
      id: 'tolbiac', datum: { dag: 1, maand: 6, jaar: 496 }, onzeker: true,
      titel: 'Tolbiac en de doop van Clovis',
      tekst: 'De Alamannen vallen het Frankische land aan. Volgens de overlevering belooft Clovis zich te laten dopen als hij wint. Met de doop krijgt hij de steun van de Gallo-Romeinse bisschoppen.',
      doe: (t, k) => {
        verschijn(t, 'alamannen');
        for (const f of ['rijnfranken', 'salfranken']) oorlog(t, 'alamannen', f);
        bond(t, 'salfranken', 'rijnfranken');
        legerVanBuiten(t, k, 'alamannen', 9000, 'Alamannen');
        for (const v of t.vakken) if (v.eigenaar === 'salfranken') v.tevredenheid = Math.min(100, v.tevredenheid + 10);
      },
    },
    {
      id: 'eenmaking', datum: { dag: 1, maand: 1, jaar: 509 }, onzeker: true,
      titel: 'Clovis verenigt de Franken',
      tekst: 'Clovis laat de andere Frankische koningen uit de weg ruimen. Kamerijk en Keulen komen onder zijn gezag.',
      keuzeVoor: ['kamerijk', 'rijnfranken'],
      voorwaarde: (t) => bestaat(t, 'salfranken') && !t.facties.salfranken.heer,
      opties: [
        { tekst: 'Clovis erkennen', uitleg: 'je wordt een deel van zijn rijk', doe: (t) => { for (const f of ['kamerijk', 'rijnfranken']) if (bestaat(t, f) && !t.facties[f].heer) { if (spelerIs(t, f)) onderwerp(t, f, 'salfranken'); else geefAlles(t, f, 'salfranken'); } } },
        { tekst: 'Weerstand bieden', uitleg: 'oorlog met Clovis', doe: (t, k) => { for (const f of ['kamerijk', 'rijnfranken']) if (spelerIs(t, f)) { oorlog(t, f, 'salfranken'); legerBij(t, k, 'salfranken', P.doornik, 8000, 'Leger van Clovis'); } else if (bestaat(t, f)) geefAlles(t, f, 'salfranken'); } },
      ],
    },
    {
      id: 'deling511', datum: { dag: 27, maand: 11, jaar: 511 },
      titel: 'De dood van Clovis en de eerste deling',
      tekst: 'Clovis sterft. Zoals de Franken gewoon zijn, wordt het rijk verdeeld onder zijn zonen: een westelijk en een oostelijk deel.',
      keuzeVoor: ['salfranken'],
      voorwaarde: (t) => bestaat(t, 'salfranken'),
      opties: [
        { tekst: 'Verder als Neustrië (west)', doe: (t, k) => { const speler = t.speler === 'salfranken'; deel(t, k, 'salfranken', ([lon]) => (lon > 4.6 ? 'austrasie' : 'neustrie')); if (speler) t.speler = 'neustrie'; t.facties.salfranken.bestaat = false; } },
        { tekst: 'Verder als Austrasië (oost)', doe: (t, k) => { const speler = t.speler === 'salfranken'; deel(t, k, 'salfranken', ([lon]) => (lon > 4.6 ? 'austrasie' : 'neustrie')); if (speler) t.speler = 'austrasie'; t.facties.salfranken.bestaat = false; } },
      ],
    },
    {
      id: 'tertry', datum: { dag: 1, maand: 6, jaar: 687 },
      titel: 'De slag bij Tertry',
      tekst: 'Pepijn van Herstal, hofmeier van Austrasië en uit een machtige familie van het Maasland, trekt ten strijde tegen Neustrië.',
      voorwaarde: (t) => bestaat(t, 'austrasie') && bestaat(t, 'neustrie'),
      doe: (t, k) => {
        hernoem(t, 'austrasie', 'Austrasië', 'Pepijn van Herstal');
        oorlog(t, 'austrasie', 'neustrie');
        if (!spelerIs(t, 'austrasie')) legerBij(t, k, 'austrasie', P.namen, 9000, 'Leger van Pepijn');
      },
    },
    {
      id: 'poitiers', datum: { dag: 10, maand: 10, jaar: 732 }, onzeker: true, stil: true,
      titel: 'Poitiers', tekst: 'Karel Martel, zoon van Pepijn van Herstal, wint bij Poitiers. Zijn familie krijgt groot aanzien.',
    },
    {
      id: 'karolingers', datum: { dag: 1, maand: 11, jaar: 751 },
      titel: 'Pepijn de Korte wordt koning',
      tekst: 'De hofmeier Pepijn de Korte zet de laatste Merovingische koning af en wordt zelf koning. De Karolingers regeren.',
      keuzeVoor: ['neustrie', 'austrasie'],
      opties: [
        { tekst: 'Het nieuwe koningshuis erkennen', doe: (t) => {
          const winnaar = bestaat(t, 'austrasie') ? 'austrasie' : 'neustrie';
          hernoem(t, winnaar, 'Frankische rijk', 'Pepijn de Korte');
          t.facties[winnaar].dynastie = 'Karolingers';
          const ander = winnaar === 'austrasie' ? 'neustrie' : 'austrasie';
          if (bestaat(t, ander) && !t.facties[ander].heer) { if (spelerIs(t, ander)) onderwerp(t, ander, winnaar); else { vrede(t, ander, winnaar); geefAlles(t, ander, winnaar); } }
        } },
        { tekst: 'Weigeren', uitleg: 'oorlog', doe: (t) => {
          const winnaar = t.speler === 'austrasie' ? 'neustrie' : 'austrasie';
          if (bestaat(t, winnaar)) { hernoem(t, winnaar, 'Frankische rijk', 'Pepijn de Korte'); oorlog(t, t.speler, winnaar); }
        } },
      ],
    },
    {
      id: 'keizer800', datum: { dag: 25, maand: 12, jaar: 800 }, onzeker: true,
      titel: 'Karel de Grote, keizer',
      tekst: 'Paus Leo III kroont Karel de Grote in Rome tot keizer. Aken, net naast de kaart, wordt het hart van een rijk dat heel West-Europa omvat.',
      doe: (t) => {
        for (const f of ['austrasie', 'neustrie']) {
          if (!bestaat(t, f) || t.facties[f].heer || t.facties[f].naam !== 'Frankische rijk') continue;
          hernoem(t, f, 'Frankische rijk', 'Karel de Grote');
          if (!spelerIs(t, f)) lijfVazallenIn(t, f);
        }
      },
    },
  ],
};
