// Alle tijdperken, in volgorde. Elk tijdperk staat in een eigen bestand.
import { registreer } from '../tijdperk';
import { FRANKEN } from './franken';
import { BOURGONDIERS, HOGE_MIDDELEEUWEN, VROEGE_MIDDELEEUWEN } from './middeleeuwen';
import { BELGIE_TIJD, NA_DE_OORLOG, WERELDOORLOGEN } from './modern';
import { FRANSE_TIJD, HABSBURGERS, OOSTENRIJK } from './nieuwetijd';
import { ROMEINEN } from './romeinen';

export const ALLE = [ROMEINEN, FRANKEN, VROEGE_MIDDELEEUWEN, HOGE_MIDDELEEUWEN, BOURGONDIERS, HABSBURGERS, OOSTENRIJK, FRANSE_TIJD, BELGIE_TIJD, WERELDOORLOGEN, NA_DE_OORLOG];
for (const tp of ALLE) registreer(tp);
