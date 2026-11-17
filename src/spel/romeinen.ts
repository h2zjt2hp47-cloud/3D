// Het eerste tijdperk: Caesar tegen de Belgische stammen, vanaf 1 maart 57 v.Chr.
//
// BENADERING: de gebieden van de stammen, de plaats van hun versterkingen en de
// sterkte van de legers zijn ruwe schattingen. Jaartallen en namen komen uit
// algemene kennis (Caesar, De Bello Gallico) en zijn nog na te kijken.
import { kaart as standaardKaart, naarKaart, vakBij, TERREIN, type Kaart } from '../kaart/kaart';
import type { Factie, Toestand, VakToestand } from './toestand';
import { paar } from './toestand';

interface StamGegevens {
  naam: string;
  kleur: string;
  kwaliteit: number;
  soort: 'rijk' | 'stam';
  heerser: string;
  beschrijving: string;
  /** [breedte, lengte]; het eerste punt is de hoofdplaats */
  kernen: [number, number][];
  bond: 'rome' | 'belgen' | 'geen';
}

export const STAMMEN: Record<string, StamGegevens> = {
  rome: {
    naam: 'Rome', kleur: '#a3262a', kwaliteit: 1.8, soort: 'rijk', heerser: 'Gaius Julius Caesar', bond: 'rome', kernen: [],
    beschrijving: 'Caesar trekt met zijn legioenen vanuit het land van de Remi naar het noorden. Weinig mannen, maar de best getrainde troepen van hun tijd. Elk voorjaar komen er versterkingen.',
  },
  remi: {
    naam: 'Remi', kleur: '#d98a8a', kwaliteit: 0.9, soort: 'stam', heerser: 'Iccius', bond: 'rome', kernen: [[49.5, 3.82], [49.5, 4.4], [49.75, 4.6], [49.4, 4.7]],
    beschrijving: 'Bondgenoten van Rome in het zuiden. Hun versterking Bibrax ligt op de weg van de Belgen naar Caesar.',
  },
  suessiones: {
    naam: 'Suessiones', kleur: '#5f6b8a', kwaliteit: 1, soort: 'stam', heerser: 'Galba', bond: 'belgen', kernen: [[49.38, 3.32], [49.15, 3.4], [49.6, 3.2]],
    beschrijving: 'Hun koning Galba leidt de bond van de Belgen. Rijk landbouwgebied rond Noviodunum, dicht bij de Romeinen.',
  },
  viromandui: {
    naam: 'Viromandui', kleur: '#8b5a8b', kwaliteit: 1, soort: 'stam', heerser: '(naam onbekend)', bond: 'belgen', kernen: [[49.85, 3.29], [49.95, 3.6]],
    beschrijving: 'Kleine stam rond Saint-Quentin, in de bond met de Nerviërs en de Atrebaten.',
  },
  atrebaten: {
    naam: 'Atrebaten', kleur: '#b5651d', kwaliteit: 1, soort: 'stam', heerser: '(naam onbekend)', bond: 'belgen', kernen: [[50.29, 2.78], [50.45, 2.6], [50.15, 3.0]],
    beschrijving: 'Rond Nemetocenna (Atrecht). Vruchtbare grond en een versterkte hoofdplaats.',
  },
  morinen: {
    naam: 'Morinen', kleur: '#6b8e23', kwaliteit: 1, soort: 'stam', heerser: '(naam onbekend)', bond: 'belgen', kernen: [[50.64, 2.25], [50.85, 2.3], [50.45, 1.8], [50.95, 1.95]],
    beschrijving: 'Aan de kust, ver van Rome. Moeilijk te bereiken door moerassen en bossen.',
  },
  menapiers: {
    naam: 'Menapiërs', kleur: '#4aa3a3', kwaliteit: 0.95, soort: 'stam', heerser: '(naam onbekend)', bond: 'belgen', kernen: [[51.1, 3.4], [51.2, 4.0], [51.25, 4.7], [51.0, 2.7]],
    beschrijving: 'In de kustvlakte en de moerassen van het noorden. Weinig volk, maar wie hen aanvalt, verdrinkt bijna in het slijk.',
  },
  nerviers: {
    naam: 'Nerviërs', kleur: '#3b6ea5', kwaliteit: 1.15, soort: 'stam', heerser: 'Boduognatus', bond: 'belgen', kernen: [[50.3, 3.8], [50.55, 3.9], [50.8, 4.15], [50.85, 3.75]],
    beschrijving: 'De dapperste van de Belgen, volgens Caesar zelf. Groot gebied tussen Schelde en Zenne, met het Kolenwoud als schuilplaats.',
  },
  aduatuci: {
    naam: 'Aduatuken', kleur: '#8e6bb5', kwaliteit: 1, soort: 'stam', heerser: '(naam onbekend)', bond: 'belgen', kernen: [[50.465, 4.87], [50.62, 4.75], [50.4, 4.5]],
    beschrijving: 'Rond de samenvloeiing van Samber en Maas. Hun sterke versterking (benadering: bij Namen) is moeilijk in te nemen.',
  },
  eburonen: {
    naam: 'Eburonen', kleur: '#2e8b57', kwaliteit: 1, soort: 'stam', heerser: 'Ambiorix en Catuvolcus', bond: 'belgen', kernen: [[50.78, 5.46], [51.0, 5.35], [50.65, 5.75], [51.2, 5.9]],
    beschrijving: 'Tussen Maas en Rijn, met Atuatuca als versterking (benadering: bij Tongeren). Onder Ambiorix later de hardnekkigste tegenstander van Rome.',
  },
  condrusi: {
    naam: 'Condrusen', kleur: '#b5a642', kwaliteit: 0.95, soort: 'stam', heerser: '(naam onbekend)', bond: 'belgen', kernen: [[50.3, 5.2], [50.15, 4.95]],
    beschrijving: 'Kleine stam in de heuvels van de Condroz, klem tussen grote buren.',
  },
  treveri: {
    naam: 'Treveri', kleur: '#c97b2a', kwaliteit: 1.05, soort: 'stam', heerser: 'Indutiomarus', bond: 'geen', kernen: [[49.54, 5.86], [49.9, 6.1], [50.1, 5.6], [49.75, 5.3], [50.35, 6.0]],
    beschrijving: 'Grote stam in de Ardennen en langs de Moezel, bekend om hun ruiters. Ze houden zich voorlopig afzijdig.',
  },
};

/** versterkingen (oppida); BENADERING van de ligging */
const VERSTERKINGEN: { naam: string; ligging: [number, number]; bezetting: number }[] = [
  { naam: 'Bibrax', ligging: [49.5, 3.82], bezetting: 2500 },
  { naam: 'Noviodunum', ligging: [49.38, 3.32], bezetting: 3000 },
  { naam: 'Nemetocenna', ligging: [50.29, 2.78], bezetting: 2500 },
  { naam: 'Versterking van de Aduatuken', ligging: [50.465, 4.87], bezetting: 4000 },
  { naam: 'Atuatuca', ligging: [50.78, 5.46], bezetting: 2500 },
  { naam: 'Titelberg', ligging: [49.54, 5.86], bezetting: 3500 },
];

export function nieuwSpel(speler: string, zaad = 57, k: Kaart = standaardKaart): Toestand {
  const ids = Object.keys(STAMMEN);
  // elk vak gaat naar de stam met de dichtstbijzijnde kern
  const kernen = ids.flatMap((id) => STAMMEN[id].kernen.map((p) => ({ id, p: naarKaart(k, p[0], p[1]) })));
  const vakken: VakToestand[] = k.vakken.map((v) => {
    let beste = kernen[0], min = Infinity;
    for (const kern of kernen) {
      const d = Math.hypot(kern.p[0] - v.midden[0], kern.p[1] - v.midden[1]);
      if (d < min) { min = d; beste = kern; }
    }
    const t = TERREIN[v.terrein];
    const bevolking = Math.round((t.bevolking * (v.oppervlakte / 235) * (v.rivier ? 1.15 : 1)) / 100) * 100;
    return {
      eigenaar: beste.id, oorsprong: beste.id, bevolking, fort: 0, fortNaam: null, garnizoen: 0, bezetting: 0, bezetter: null,
      tevredenheid: 65, sindsVerovering: 0, landbouw: 0, markt: 0, weg: 0, bouw: null,
    };
  });
  for (const f of VERSTERKINGEN) {
    const v = vakBij(k, f.ligging[0], f.ligging[1]);
    Object.assign(vakken[v], { fort: f.bezetting, fortNaam: f.naam, garnizoen: f.bezetting });
  }

  const facties: Record<string, Factie> = {};
  for (const id of ids) {
    const s = STAMMEN[id];
    const eigen = vakken.filter((v) => v.eigenaar === id);
    const hoofdstad = s.kernen.length ? vakBij(k, s.kernen[0][0], s.kernen[0][1]) : null;
    const volk = eigen.reduce((som, v) => som + v.bevolking, 0);
    facties[id] = {
      id, naam: s.naam, kleur: s.kleur, kwaliteit: s.kwaliteit, soort: s.soort, heerser: s.heerser, beschrijving: s.beschrijving,
      hoofdstad, mankracht: id === 'rome' ? 6000 : Math.round(volk * 0.02), heer: null, bestaat: true, vakkenBijStart: eigen.length,
      schat: id === 'rome' ? 250 : Math.round(volk / 1000 * 0.5 * 3), belasting: 'gewoon', inkomenVorigeMaand: 0,
    };
  }

  const t: Toestand = {
    versie: 2, dag: 0, zaad, speler, facties, vakken, legers: [], volgendLeger: 1,
    oorlog: [], bond: [], berichten: [], gedaan: [], wachtend: [], onderwerpVraagNa: 0,
  };

  // bonden en oorlog: Rome en de Remi tegen de Belgische bond; de Treveri blijven erbuiten
  const kamp = (b: StamGegevens['bond']) => ids.filter((id) => STAMMEN[id].bond === b);
  for (const groep of [kamp('rome'), kamp('belgen')]) {
    for (const a of groep) for (const b of groep) if (a < b) t.bond.push(paar(a, b));
  }
  for (const a of kamp('rome')) for (const b of kamp('belgen')) t.oorlog.push(paar(a, b));

  // legers
  for (const id of ids) {
    if (id === 'rome') continue;
    const f = facties[id];
    const volk = vakken.filter((v) => v.eigenaar === id).reduce((som, v) => som + v.bevolking, 0);
    const sterkte = Math.round((volk * (STAMMEN[id].bond === 'belgen' ? 0.07 : 0.04)) / 100) * 100;
    if (f.hoofdstad === null || sterkte < 500) continue;
    if (sterkte > 9000) {
      nieuwLeger(t, id, f.hoofdstad, Math.round(sterkte * 0.6 / 100) * 100, `Heer van de ${f.naam}`);
      const tweede = k.vakken[f.hoofdstad].buren.find((b) => vakken[b].eigenaar === id) ?? f.hoofdstad;
      nieuwLeger(t, id, tweede, Math.round(sterkte * 0.4 / 100) * 100, `Tweede heer van de ${f.naam}`);
    } else {
      nieuwLeger(t, id, f.hoofdstad, sterkte, `Heer van de ${f.naam}`);
    }
  }
  // Caesar met acht legioenen, in drie groepen, bij Bibrax (benadering van de echte aantallen)
  const intocht = ingangVanRome(t, k);
  nieuwLeger(t, 'rome', intocht, 14000, 'Caesar met vier legioenen');
  nieuwLeger(t, 'rome', intocht, 10000, 'Labienus met drie legioenen');
  const buur = k.vakken[intocht].buren.find((b) => vakken[b].eigenaar === 'remi') ?? intocht;
  nieuwLeger(t, 'rome', buur, 5000, 'Hulptroepen');
  return t;
}

export function nieuwLeger(t: Toestand, factie: string, vak: number, sterkte: number, naam?: string) {
  const id = t.volgendLeger++;
  t.legers.push({
    id, naam: naam ?? `${t.facties[factie].naam}, leger ${id}`, factie, vak, sterkte, moraal: 1,
    pad: [], voortgang: 0, overgestoken: 0, inStrijd: false,
  });
  return t.legers[t.legers.length - 1];
}

/** waar de Romeinse versterkingen binnenkomen: zuidelijk grensvak bij Rome of een bondgenoot */
export function ingangVanRome(t: Toestand, k: Kaart = standaardKaart): number {
  const kandidaten = k.vakken
    .filter((v) => v.grens && v.lonlat[1] < 49.6)
    .filter((v) => ['rome', 'remi'].includes(t.vakken[v.id].eigenaar) || t.facties[t.vakken[v.id].eigenaar].heer === 'rome')
    .sort((a, b) => a.lonlat[1] - b.lonlat[1]);
  if (kandidaten.length) {
    // liefst dicht bij Bibrax
    const bibrax = naarKaart(k, 49.5, 3.82);
    kandidaten.sort((a, b) => Math.hypot(a.midden[0] - bibrax[0], a.midden[1] - bibrax[1]) - Math.hypot(b.midden[0] - bibrax[0], b.midden[1] - bibrax[1]));
    return kandidaten[0].id;
  }
  return k.vakken.filter((v) => v.grens).sort((a, b) => a.lonlat[1] - b.lonlat[1])[0].id;
}
