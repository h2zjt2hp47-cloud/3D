/**
 * Zet Excel-achtige formules om naar JsonLogic.
 *
 * Ondersteund:
 *   getallen        12   1.5        (decimaalpunt)
 *   tekst           "eik"
 *   waar / onwaar
 *   variabelen      breedte   materiaal_dikte
 *   rekenen         + - * /  en haakjes
 *   vergelijken     =  <>  <  <=  >  >=
 *   logisch         en  of  niet
 *   functies        als(voorwaarde; dan; anders)
 *                   min(a; b; ...)  max(a; b; ...)
 *                   naarboven(x; stap)  naarbeneden(x; stap)  afronden(x; decimalen)
 *                   in(x; "a"; "b"; ...)
 *                   tabel("naam"; rij; kolom)   opzoeking in een prijstabel van het model
 *                   rest(a; b)                  rest na deling (zoals REST/MOD in Excel)
 *
 * Argumenten scheid je met `;` (zoals in Nederlandstalige Excel) of `,`.
 */

export type JsonLogic = unknown;

export class FormuleFout extends Error {
  constructor(
    message: string,
    public readonly formule: string,
    public readonly positie: number,
  ) {
    super(`${message} (positie ${positie + 1} in "${formule}")`);
    this.name = 'FormuleFout';
  }
}

type TokenSoort = 'getal' | 'tekst' | 'naam' | 'op' | '(' | ')' | 'sep' | 'einde';
interface Token {
  soort: TokenSoort;
  waarde: string;
  pos: number;
}

const OPERATOREN = ['<=', '>=', '<>', '!=', '==', '=', '<', '>', '+', '-', '*', '/'];

function tokens(bron: string): Token[] {
  const uit: Token[] = [];
  let i = 0;
  while (i < bron.length) {
    const c = bron[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(bron[i + 1] ?? ''))) {
      const m = /^[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/.exec(bron.slice(i))!;
      uit.push({ soort: 'getal', waarde: m[0], pos: i });
      i += m[0].length;
      continue;
    }
    if (c === '"' || c === "'") {
      const einde = bron.indexOf(c, i + 1);
      if (einde < 0) throw new FormuleFout('Tekst niet afgesloten', bron, i);
      uit.push({ soort: 'tekst', waarde: bron.slice(i + 1, einde), pos: i });
      i = einde + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(bron.slice(i))!;
      uit.push({ soort: 'naam', waarde: m[0], pos: i });
      i += m[0].length;
      continue;
    }
    if (c === '(' || c === ')') {
      uit.push({ soort: c, waarde: c, pos: i });
      i++;
      continue;
    }
    if (c === ';' || c === ',') {
      uit.push({ soort: 'sep', waarde: c, pos: i });
      i++;
      continue;
    }
    const op = OPERATOREN.find((o) => bron.startsWith(o, i));
    if (op) {
      uit.push({ soort: 'op', waarde: op, pos: i });
      i += op.length;
      continue;
    }
    throw new FormuleFout(`Onbekend teken '${c}'`, bron, i);
  }
  uit.push({ soort: 'einde', waarde: '', pos: bron.length });
  return uit;
}

const SLEUTELWOORDEN = new Set(['en', 'of', 'niet', 'waar', 'onwaar']);

/** Functies: naam → [JsonLogic-operator, min. aantal argumenten, max. aantal argumenten]. */
const FUNCTIES: Record<string, [string, number, number]> = {
  als: ['if', 3, 3],
  min: ['min', 1, Infinity],
  max: ['max', 1, Infinity],
  naarboven: ['naarboven', 2, 2],
  naarbeneden: ['naarbeneden', 2, 2],
  afronden: ['afronden', 1, 2],
  in: ['in_lijst', 2, Infinity],
  tabel: ['tabel', 3, 3],
  rest: ['%', 2, 2],
};

/** Sleutel in het gegevensobject waaronder de prijstabellen van het model zitten. */
export const TABELLEN_SLEUTEL = '__tabellen';

const VERGELIJKING: Record<string, string> = {
  '=': '==',
  '==': '==',
  '<>': '!=',
  '!=': '!=',
  '<': '<',
  '<=': '<=',
  '>': '>',
  '>=': '>=',
};

export interface GeparseerdeFormule {
  logica: JsonLogic;
  /** Alle variabelen die de formule gebruikt. */
  variabelen: string[];
  /** Alle prijstabellen die de formule gebruikt. */
  tabellen: string[];
}

class Parser {
  private t: Token[];
  private i = 0;
  readonly variabelen = new Set<string>();
  readonly tabellen = new Set<string>();

  constructor(private readonly bron: string) {
    this.t = tokens(bron);
  }

  parse(): JsonLogic {
    if (this.kijk().soort === 'einde') throw this.fout('Formule is leeg');
    const r = this.of();
    if (this.kijk().soort !== 'einde') throw this.fout(`Onverwacht '${this.kijk().waarde}'`);
    return r;
  }

  private kijk(): Token {
    return this.t[this.i]!;
  }
  private neem(): Token {
    return this.t[this.i++]!;
  }
  private fout(msg: string): FormuleFout {
    return new FormuleFout(msg, this.bron, this.kijk().pos);
  }
  private isNaam(w: string): boolean {
    const k = this.kijk();
    return k.soort === 'naam' && k.waarde.toLowerCase() === w;
  }

  private of(): JsonLogic {
    const delen = [this.en()];
    while (this.isNaam('of')) {
      this.neem();
      delen.push(this.en());
    }
    return delen.length === 1 ? delen[0] : { or: delen };
  }

  private en(): JsonLogic {
    const delen = [this.niet()];
    while (this.isNaam('en')) {
      this.neem();
      delen.push(this.niet());
    }
    return delen.length === 1 ? delen[0] : { and: delen };
  }

  private niet(): JsonLogic {
    if (this.isNaam('niet')) {
      this.neem();
      return { '!': [this.niet()] };
    }
    return this.vergelijk();
  }

  private vergelijk(): JsonLogic {
    const links = this.som();
    const k = this.kijk();
    if (k.soort === 'op' && VERGELIJKING[k.waarde]) {
      this.neem();
      const rechts = this.som();
      return { [VERGELIJKING[k.waarde]!]: [links, rechts] };
    }
    return links;
  }

  private som(): JsonLogic {
    let r = this.product();
    while (this.kijk().soort === 'op' && (this.kijk().waarde === '+' || this.kijk().waarde === '-')) {
      const op = this.neem().waarde;
      r = { [op]: [r, this.product()] };
    }
    return r;
  }

  private product(): JsonLogic {
    let r = this.unair();
    while (this.kijk().soort === 'op' && (this.kijk().waarde === '*' || this.kijk().waarde === '/')) {
      const op = this.neem().waarde;
      r = { [op]: [r, this.unair()] };
    }
    return r;
  }

  private unair(): JsonLogic {
    const k = this.kijk();
    if (k.soort === 'op' && k.waarde === '-') {
      this.neem();
      return { '-': [this.unair()] };
    }
    if (k.soort === 'op' && k.waarde === '+') {
      this.neem();
      return this.unair();
    }
    return this.primair();
  }

  private primair(): JsonLogic {
    const k = this.neem();
    switch (k.soort) {
      case 'getal':
        return Number(k.waarde);
      case 'tekst':
        return k.waarde;
      case '(': {
        const r = this.of();
        if (this.kijk().soort !== ')') throw this.fout("')' verwacht");
        this.neem();
        return r;
      }
      case 'naam': {
        const naam = k.waarde;
        const klein = naam.toLowerCase();
        if (klein === 'waar') return true;
        if (klein === 'onwaar') return false;
        if (this.kijk().soort === '(') return this.functie(naam, k);
        if (SLEUTELWOORDEN.has(klein)) {
          this.i--;
          throw this.fout(`'${naam}' is een gereserveerd woord`);
        }
        this.variabelen.add(naam);
        return { var: naam };
      }
      default:
        this.i--;
        throw this.fout(k.soort === 'einde' ? 'Formule is onvolledig' : `Onverwacht '${k.waarde}'`);
    }
  }

  private functie(naam: string, k: Token): JsonLogic {
    const def = FUNCTIES[naam.toLowerCase()];
    if (!def) {
      this.i--;
      throw new FormuleFout(`Onbekende functie '${naam}'`, this.bron, k.pos);
    }
    this.neem(); // (
    const args: JsonLogic[] = [];
    const eersteArg = this.kijk();
    if (this.kijk().soort !== ')') {
      args.push(this.of());
      while (this.kijk().soort === 'sep') {
        this.neem();
        args.push(this.of());
      }
    }
    if (this.kijk().soort !== ')') throw this.fout("')' of ';' verwacht");
    this.neem();
    const [op, min, max] = def;
    if (args.length < min || args.length > max) {
      const verwacht = min === max ? `${min}` : max === Infinity ? `minstens ${min}` : `${min} tot ${max}`;
      throw new FormuleFout(`${naam}() verwacht ${verwacht} argument(en), kreeg ${args.length}`, this.bron, k.pos);
    }
    if (op === 'in_lijst') return { in_lijst: [args[0], args.slice(1)] };
    if (op === 'tabel') {
      if (typeof args[0] !== 'string' || !/^[A-Za-z0-9_-]+$/.test(args[0]))
        throw new FormuleFout('tabel() verwacht als eerste argument de tabelnaam tussen aanhalingstekens', this.bron, eersteArg.pos);
      this.tabellen.add(args[0]);
      return { tabel: [{ var: `${TABELLEN_SLEUTEL}.${args[0]}` }, args[1], args[2]] };
    }
    return { [op]: args };
  }
}

const cache = new Map<string, GeparseerdeFormule>();

/** Parse een formule (met cache). Gooit `FormuleFout` bij een fout. */
export function parseFormule(bron: string): GeparseerdeFormule {
  const bekend = cache.get(bron);
  if (bekend) return bekend;
  const p = new Parser(bron);
  const logica = p.parse();
  const r = { logica, variabelen: [...p.variabelen], tabellen: [...p.tabellen] };
  cache.set(bron, r);
  return r;
}
