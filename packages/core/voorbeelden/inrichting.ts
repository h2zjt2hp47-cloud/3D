/**
 * Catalogus voor de plattegrond: vloeren, wandafwerking, binnendeuren en meubels,
 * met demoprijzen (verkoop en kost per eenheid, excl. btw, plaatsing inbegrepen).
 * En de omzetting van een plattegrond naar offerteregels (vloeren, wanden, deuren, ruwbouw, inrichting).
 */
import { gevelOppervlaktes, murenVan, niveauPlan, niveauVan, ruimteMaten, verdiepingenVan, type GevelMateriaal, type GevelOntwerp, type Muur, type OfferteRegel, type PlanCatalogus, type Plattegrond } from '../src/index.js';

const VOEGEN = { grijs: { label: 'Grijs', hex: '#bdb8ad' }, wit: { label: 'Wit', hex: '#e8e4da' }, antraciet: { label: 'Antraciet', hex: '#4a4846' }, zand: { label: 'Zand', hex: '#cbbd9d' } };

/**
 * Gevelmaterialen met kleurstalen (demo: kleuren benaderd, prijzen verzonnen, per m² geplaatst excl. btw).
 * In een echte implementatie komt dit uit de catalogus van de aannemer of leverancier.
 */
export const gevelCatalogus: Record<string, GevelMateriaal> = {
  gevelsteen: {
    label: 'Gevelsteen (handvorm)', groep: 'Baksteen', soort: 'steen', prijs: 145, kost: 96, artikel: 'GEV-STEEN',
    uitleg: 'Klassieke spouwmuur met handvormsteen; de voegkleur bepaalt mee het uitzicht.',
    kleuren: {
      rood: { label: 'Rood', hex: '#9c4a34' }, rood_bruin: { label: 'Rood-bruin genuanceerd', hex: '#7e4a3a' }, oranje: { label: 'Oranjerood', hex: '#b5603f' },
      geel: { label: 'Geel-zand', hex: '#cdb48a' }, wit: { label: 'Wit-grijs', hex: '#d9d4cb' }, grijs: { label: 'Grijs genuanceerd', hex: '#8d8a86' }, antraciet: { label: 'Antraciet', hex: '#45423f' },
    },
    voegen: VOEGEN,
  },
  steenstrips: {
    label: 'Steenstrips op buitenisolatie', groep: 'Baksteen', soort: 'steen', prijs: 168, kost: 112, artikel: 'GEV-STRIPS',
    uitleg: 'Dunne stenen op isolatie: het uitzicht van baksteen, ook bij renovatie van een bestaande gevel.',
    kleuren: { rood: { label: 'Rood', hex: '#9c4a34' }, wit: { label: 'Wit-grijs', hex: '#d9d4cb' }, grijs: { label: 'Grijs', hex: '#8d8a86' }, antraciet: { label: 'Antraciet', hex: '#45423f' } },
    voegen: VOEGEN,
  },
  crepi: {
    label: 'Sierpleister (crepi) op isolatie', groep: 'Pleister', soort: 'pleister', prijs: 98, kost: 62, artikel: 'GEV-CREPI',
    uitleg: 'Buitenisolatie met een fijne pleisterlaag in kleur.',
    kleuren: {
      wit: { label: 'Wit', hex: '#f1efe9' }, gebroken_wit: { label: 'Gebroken wit', hex: '#e8e2d4' }, zand: { label: 'Zand', hex: '#d8ccb3' },
      lichtgrijs: { label: 'Lichtgrijs', hex: '#c9c8c3' }, grijs: { label: 'Grijs', hex: '#8f8f8b' }, antraciet: { label: 'Antraciet', hex: '#4b4b4a' },
    },
  },
  hout_staand: {
    label: 'Houten bekleding, staand', groep: 'Hout', soort: 'planken', prijs: 122, kost: 78, artikel: 'GEV-HOUT-S',
    uitleg: 'Staande planken (bv. thermisch gemodificeerd hout); vergrijst vanzelf of wordt gebeitst.',
    kleuren: { naturel: { label: 'Naturel', hex: '#b0835a' }, vergrijsd: { label: 'Vergrijsd', hex: '#9c968c' }, zwart: { label: 'Zwart gebeitst', hex: '#2f2d2b' } },
  },
  hout_liggend: {
    label: 'Houten bekleding, liggend (rabat)', groep: 'Hout', soort: 'planken_h', prijs: 128, kost: 82, artikel: 'GEV-HOUT-L',
    uitleg: 'Liggende planken met schaduwnaad, bv. ceder.',
    kleuren: { ceder: { label: 'Ceder', hex: '#a86f4c' }, naturel: { label: 'Naturel', hex: '#b48a5e' }, vergrijsd: { label: 'Vergrijsd', hex: '#a39d93' }, zwart: { label: 'Zwart gebeitst', hex: '#2f2d2b' } },
  },
  leien: {
    label: 'Gevelleien (vezelcement)', groep: 'Leien en platen', soort: 'leien', prijs: 112, kost: 72, artikel: 'GEV-LEI',
    uitleg: 'Kleine leien op een houten onderstructuur; vaak op een verdieping of een topgevel.',
    kleuren: { antraciet: { label: 'Antraciet', hex: '#3b3f45' }, blauwgrijs: { label: 'Blauwgrijs', hex: '#59636b' }, grijs: { label: 'Grijs', hex: '#7d8186' } },
  },
  zink: {
    label: 'Zink met staande naad', groep: 'Metaal', soort: 'zink', prijs: 168, kost: 112, artikel: 'GEV-ZINK',
    uitleg: 'Zinken banen met een opstaande naad om de 43 cm.',
    kleuren: { kwarts: { label: 'Kwartsgrijs', hex: '#8a8f92' }, antraciet: { label: 'Antraciet', hex: '#4a4d50' }, naturel: { label: 'Naturel', hex: '#a9adb0' } },
  },
  natuursteen: {
    label: 'Blauwe hardsteen (gezaagd)', groep: 'Natuursteen', soort: 'natuursteen', prijs: 212, kost: 140, artikel: 'GEV-ARDUIN',
    uitleg: 'Natuursteen in platen; vaak als sokkel onderaan de gevel.',
    kleuren: { blauwgrijs: { label: 'Blauwgrijs', hex: '#5d6366' }, gezoet: { label: 'Gezoet (lichter)', hex: '#727a7d' } },
  },
};

/** Gevelontwerp dat overeenkomt met de eenvoudige gevelkeuze (plan.gevel) van een ouder project. */
export function gevelOntwerpVan(plan: Plattegrond): GevelOntwerp {
  const k = plan.gevel.kleur.toLowerCase();
  if (k === '#77736d') return { standaard: { materiaal: 'gevelsteen', kleur: 'grijs', voeg: 'grijs' } };
  if (k === '#ece9e2') return { standaard: { materiaal: 'crepi', kleur: 'wit' } };
  if (k === '#b0764d') return { standaard: { materiaal: 'hout_liggend', kleur: 'ceder' } };
  return { standaard: { materiaal: 'gevelsteen', kleur: 'rood', voeg: 'grijs' } };
}

export const planCatalogus: PlanCatalogus = {
  vloeren: {
    tegel_grijs: { label: 'Keramische tegel 60 × 60 grijs', soort: 'tegel', kleur: '#b8b5ae' },
    tegel_wit: { label: 'Keramische tegel 60 × 60 wit', soort: 'tegel', kleur: '#e8e6e0' },
    parket_eik: { label: 'Parket eik naturel', soort: 'parket', kleur: '#c49a6c' },
    parket_donker: { label: 'Parket gerookte eik', soort: 'parket', kleur: '#86664a' },
    pvc_grijs: { label: 'PVC-vloer eik grijs', soort: 'parket', kleur: '#a8a299' },
    gietvloer: { label: 'Gietvloer beton', soort: 'gevel', kleur: '#a9aaa6' },
    tapijt: { label: 'Tapijt', soort: 'stof', kleur: '#9d9286' },
  },
  wanden: {
    wit: { label: 'Verf wit', soort: 'gevel', kleur: '#f2f1ec' },
    gebroken_wit: { label: 'Verf gebroken wit', soort: 'gevel', kleur: '#ebe5d8' },
    zachtgrijs: { label: 'Verf zachtgrijs', soort: 'gevel', kleur: '#d5d6d1' },
    salie: { label: 'Verf saliegroen', soort: 'gevel', kleur: '#b8c3ad' },
    terracotta: { label: 'Verf terracotta', soort: 'gevel', kleur: '#d39c7e' },
    blauwgrijs: { label: 'Verf blauwgrijs', soort: 'gevel', kleur: '#aab6bf' },
    tegels_wit: { label: 'Wandtegels wit 30 × 60', soort: 'tegel', kleur: '#efeee9' },
    tegels_groen: { label: 'Wandtegels zellige groen', soort: 'tegel', kleur: '#6f8f7a' },
  },
  binnendeuren: {
    schilder: { label: 'Schilderdeur wit', soort: 'kunststof', kleur: '#f3f2ee' },
    eik: { label: 'Deur fineer eik', soort: 'hout', kleur: '#b48a5a' },
    glas: { label: 'Glazen deur', soort: 'glas', kleur: '#c5d5da' },
    staal: { label: 'Stalen deur zwart', soort: 'metaal', kleur: '#2a2a2a' },
    schuif: { label: 'Schuifdeur in de wand', soort: 'kunststof', kleur: '#f3f2ee' },
  },
  meubels: {
    bank3: { label: 'Sofa 3-zit', vorm: 'bank', b: 230, d: 95, h: 85, kleur: '#6f7f86', prijs: 1890, groep: 'Zitten' },
    bank2: { label: 'Sofa 2-zit', vorm: 'bank', b: 180, d: 92, h: 85, kleur: '#b8ad9c', prijs: 1490, groep: 'Zitten' },
    fauteuil: { label: 'Fauteuil', vorm: 'fauteuil', b: 85, d: 85, h: 85, kleur: '#b07a54', prijs: 790, groep: 'Zitten' },
    salontafel: { label: 'Salontafel', vorm: 'tafel', b: 110, d: 60, h: 40, kleur: '#b48a5a', prijs: 420, groep: 'Zitten' },
    tv: { label: 'Tv-meubel', vorm: 'tv', b: 180, d: 45, h: 45, kleur: '#86664a', prijs: 690, groep: 'Zitten' },
    eettafel: { label: 'Eettafel 6 personen', vorm: 'tafel', b: 200, d: 95, h: 75, kleur: '#b48a5a', prijs: 1290, groep: 'Eten' },
    eettafel4: { label: 'Eettafel 4 personen', vorm: 'tafel', b: 140, d: 90, h: 75, kleur: '#b48a5a', prijs: 890, groep: 'Eten' },
    stoel: { label: 'Stoel', vorm: 'stoel', b: 45, d: 50, h: 85, kleur: '#2f2f2d', prijs: 189, groep: 'Eten' },
    keuken: { label: 'Keuken, rechte opstelling', vorm: 'keuken', b: 360, d: 62, h: 220, kleur: '#3f4b4f', prijs: 12500, groep: 'Keuken' },
    eiland: { label: 'Keukeneiland', vorm: 'eiland', b: 240, d: 100, h: 90, kleur: '#3f4b4f', prijs: 4800, groep: 'Keuken' },
    koelkast: { label: 'Koelkast (kolom)', vorm: 'koelkast', b: 60, d: 62, h: 215, kleur: '#3f4b4f', prijs: 1450, groep: 'Keuken' },
    bed2: { label: 'Bed 160 × 200', vorm: 'bed', b: 165, d: 215, h: 100, kleur: '#9aa3a8', prijs: 1690, groep: 'Slapen' },
    bed1: { label: 'Bed 90 × 200', vorm: 'bed', b: 95, d: 210, h: 90, kleur: '#c6b59b', prijs: 690, groep: 'Slapen' },
    nachtkast: { label: 'Nachtkastje', vorm: 'nachtkast', b: 45, d: 40, h: 50, kleur: '#b48a5a', prijs: 180, groep: 'Slapen' },
    kleerkast: { label: 'Kleerkast', vorm: 'kast', b: 200, d: 60, h: 220, kleur: '#f1f0ec', prijs: 1350, groep: 'Slapen' },
    dressoir: { label: 'Dressoir', vorm: 'kast', b: 200, d: 45, h: 80, kleur: '#86664a', prijs: 990, groep: 'Zitten' },
    bureau: { label: 'Bureau', vorm: 'tafel', b: 120, d: 60, h: 75, kleur: '#f1f0ec', prijs: 450, groep: 'Werken' },
    bad: { label: 'Ligbad', vorm: 'bad', b: 170, d: 75, h: 58, kleur: '#f4f4f1', prijs: 1150, groep: 'Badkamer' },
    douche: { label: 'Inloopdouche', vorm: 'douche', b: 120, d: 90, h: 210, kleur: '#f4f4f1', prijs: 1650, groep: 'Badkamer' },
    lavabo: { label: 'Badmeubel met lavabo', vorm: 'lavabo', b: 120, d: 50, h: 180, kleur: '#b48a5a', prijs: 1390, groep: 'Badkamer' },
    wc: { label: 'Hangtoilet', vorm: 'wc', b: 40, d: 55, h: 80, kleur: '#f4f4f1', prijs: 690, groep: 'Badkamer' },
    plant: { label: 'Plant', vorm: 'plant', b: 50, d: 50, h: 120, kleur: '#5f7f55', prijs: 85, groep: 'Decoratie' },
    tapijt: { label: 'Tapijt', vorm: 'tapijt', b: 240, d: 170, h: 1, kleur: '#b8ad9c', prijs: 390, groep: 'Decoratie' },
    trap: { label: 'Trap (recht, naar de verdieping)', vorm: 'trap', b: 100, d: 300, h: 300, kleur: '#b48a5a', prijs: 3900, groep: 'Trappen' },
  },
  gevels: gevelCatalogus,
};

/** Demoprijzen per eenheid: [verkoop, kost]. */
const PRIJZEN: Record<string, [number, number]> = {
  'vloer:tegel_grijs': [72, 46], 'vloer:tegel_wit': [78, 50], 'vloer:parket_eik': [96, 62], 'vloer:parket_donker': [108, 70],
  'vloer:pvc_grijs': [48, 29], 'vloer:gietvloer': [88, 56], 'vloer:tapijt': [38, 22],
  'wand:wit': [17, 9], 'wand:gebroken_wit': [18, 9.5], 'wand:zachtgrijs': [18, 9.5], 'wand:salie': [19, 10], 'wand:terracotta': [19, 10],
  'wand:blauwgrijs': [19, 10], 'wand:tegels_wit': [79, 48], 'wand:tegels_groen': [118, 74],
  'deur:schilder': [420, 260], 'deur:eik': [560, 350], 'deur:glas': [690, 430], 'deur:staal': [1450, 920], 'deur:schuif': [890, 560],
  doorgang: [180, 95], buitenmuur: [185, 120], binnenmuur: [68, 42],
  // Buitenmuur zonder gevelafwerking (als de gevel apart in de offerte staat).
  buitenmuur_kaal: [118, 76],
};

export interface PlanRegelOpties {
  vloeren: boolean;
  wanden: boolean;
  binnendeuren: boolean;
  ruwbouw: boolean;
  inrichting: boolean;
  /** Gevelafwerking per materiaal (m², netto) en sokkel; alleen met een gevelontwerp. Ontbreekt = uit. */
  gevel?: boolean;
}

/** Zet de plattegrond om naar offerteregels (vloeren, wandafwerking, binnendeuren, ruwbouw, inrichting). */
export function planNaarRegels(plan: Plattegrond, opties: PlanRegelOpties, cat: PlanCatalogus = planCatalogus): OfferteRegel[] {
  const regels: OfferteRegel[] = [];
  // Muren per verdieping (een muur hoort altijd bij één verdieping).
  const murenPerNiveau = verdiepingenVan(plan).map((_, n) => murenVan(niveauPlan(plan, n)));
  const muren: (Muur & { niveau: number })[] = murenPerNiveau.flatMap((ms, n) => ms.map((m) => ({ ...m, niveau: n })));
  const prijs = (sleutel: string) => PRIJZEN[sleutel] ?? [0, 0];
  const som = new Map<string, number>();
  const tel = (k: string, x: number) => som.set(k, (som.get(k) ?? 0) + x);
  for (const r of plan.ruimtes) {
    const m = ruimteMaten(plan, r, murenPerNiveau[niveauVan(r)]);
    tel(`vloer:${r.vloer}`, m.netto);
    tel(`wand:${r.wand}`, m.wand);
  }
  const rond1 = (x: number) => Math.round(x * 10) / 10;
  if (opties.vloeren) {
    for (const [k, m2] of som) if (k.startsWith('vloer:') && m2 > 0) {
      const code = k.slice(6);
      // 7 % snijverlies op de vloer.
      regels.push({ code: k, groep: 'Vloeren', omschrijving: cat.vloeren[code]?.label ?? code, eenheid: 'm²', hoeveelheid: rond1(m2 * 1.07), eenheidsprijs: prijs(k)[0], kostprijs: prijs(k)[1] });
    }
  }
  if (opties.wanden) {
    for (const [k, m2] of som) if (k.startsWith('wand:') && m2 > 0) {
      const code = k.slice(5);
      regels.push({ code: k, groep: 'Wanden', omschrijving: cat.wanden[code]?.label ?? code, eenheid: 'm²', hoeveelheid: rond1(m2), eenheidsprijs: prijs(k)[0], kostprijs: prijs(k)[1] });
    }
  }
  if (opties.binnendeuren) {
    const deuren = new Map<string, number>();
    for (const o of plan.openingen) {
      if (o.soort === 'binnendeur') deuren.set(`deur:${o.deurtype ?? 'schilder'}`, (deuren.get(`deur:${o.deurtype ?? 'schilder'}`) ?? 0) + 1);
      if (o.soort === 'doorgang') deuren.set('doorgang', (deuren.get('doorgang') ?? 0) + 1);
    }
    for (const [k, aantal] of deuren) {
      const label = k === 'doorgang' ? 'Doorgang afwerken (pleister en hoekprofielen)' : `${cat.binnendeuren[k.slice(5)]?.label ?? k} met kader en klink`;
      regels.push({ code: k, groep: 'Binnendeuren', omschrijving: label, eenheid: 'stuk', hoeveelheid: aantal, eenheidsprijs: prijs(k)[0], kostprijs: prijs(k)[1] });
    }
  }
  // Gevelafwerking apart: dan zit de gevelsteen niet meer in de ruwbouw van de buitenmuur.
  const gevelApart = opties.gevel === true && !!plan.gevelOntwerp && !!cat.gevels;
  if (gevelApart) {
    const som = new Map<string, { m2: number; omschrijving: string; prijs: number; kost: number }>();
    const zet = (k: string, m2: number, omschrijving: string, prijs: number, kost: number) => {
      const x = som.get(k);
      if (x) x.m2 += m2; else som.set(k, { m2, omschrijving, prijs, kost });
    };
    const beschrijf = (keuze: { materiaal: string; kleur: string; voeg?: string }) => {
      const mat = cat.gevels![keuze.materiaal];
      if (!mat) return undefined;
      const kleur = mat.kleuren[keuze.kleur]?.label ?? keuze.kleur;
      const voeg = mat.voegen ? mat.voegen[keuze.voeg ?? ''] ?? Object.values(mat.voegen)[0] : undefined;
      return { mat, tekst: `${mat.label}, ${kleur.toLowerCase()}${voeg ? `, voeg ${voeg.label.toLowerCase()}` : ''}` };
    };
    const sokkel = plan.gevelOntwerp!.sokkel;
    for (const v of gevelOppervlaktes(plan)) {
      const b = v.keuze ? beschrijf(v.keuze) : undefined;
      if (b && v.netto > 0) zet(`gevel:${v.keuze!.materiaal}:${v.keuze!.kleur}:${v.keuze!.voeg ?? ''}`, v.netto, b.tekst, b.mat.prijs, b.mat.kost);
      const bs = sokkel ? beschrijf(sokkel) : undefined;
      if (sokkel && bs && v.sokkel > 0) zet(`sokkel:${sokkel.materiaal}:${sokkel.kleur}`, v.sokkel, `Sokkel ${sokkel.hoogte} cm: ${bs.tekst}`, bs.mat.prijs, bs.mat.kost);
    }
    for (const [k, x] of som) {
      regels.push({ code: k, groep: 'Gevel', omschrijving: `${x.omschrijving} (netto, zonder ramen en deuren)`, eenheid: 'm²', hoeveelheid: rond1(x.m2), eenheidsprijs: x.prijs, kostprijs: x.kost });
    }
  }
  if (opties.ruwbouw) {
    for (const soort of ['buiten', 'binnen'] as const) {
      const lengte = muren.filter((m) => m.soort === soort).reduce((t, m) => t + (m.tot - m.van), 0) / 100;
      const open = plan.openingen.filter((o) => muren.find((m) => m.niveau === niveauVan(o) && m.soort === soort && m.as === o.as && Math.abs(m.lijn - o.lijn) < 0.5 && m.van <= o.midden && m.tot >= o.midden))
        .reduce((t, o) => t + (o.breedte * o.hoogte) / 10000, 0);
      const m2 = rond1(lengte * (plan.muurhoogte / 100) - open);
      const k = soort === 'buiten' && gevelApart ? 'buitenmuur_kaal' : `${soort}muur`;
      if (m2 > 0) regels.push({
        code: k, groep: 'Ruwbouw',
        omschrijving: soort === 'binnen' ? `Binnenmuur ${plan.binnenmuur} cm (snelbouw, bepleisterd)`
          : gevelApart ? `Buitenmuur ${plan.buitenmuur} cm (snelbouw binnenblad, spouwisolatie; gevelafwerking apart)` : `Buitenmuur ${plan.buitenmuur} cm (snelbouw, isolatie, gevelsteen)`,
        eenheid: 'm²', hoeveelheid: m2, eenheidsprijs: prijs(k)[0], kostprijs: prijs(k)[1],
      });
    }
  }
  if (opties.inrichting) {
    const aantal = new Map<string, number>();
    for (const m of plan.meubels) aantal.set(m.type, (aantal.get(m.type) ?? 0) + 1);
    for (const [type, n] of aantal) {
      const t = cat.meubels[type];
      if (!t?.prijs) continue;
      regels.push({ code: `meubel:${type}`, groep: 'Inrichting (richtprijs)', omschrijving: t.label, eenheid: 'stuk', hoeveelheid: n, eenheidsprijs: t.prijs, kostprijs: Math.round(t.prijs * 0.62) });
    }
  }
  return regels;
}
