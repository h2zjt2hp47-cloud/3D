#!/usr/bin/env node
/**
 * Beeldvergelijking van de 3D (zeteldemo en bouwdemo).
 *
 * Maakt een vaste reeks beelden van de gebouwde pagina's (dist/) en vergelijkt ze pixel per pixel met de
 * referentiebeelden in `beeldtest/referentie/`. Zo valt een achteruitgang op (een schaduw die verdwijnt, een onderdeel
 * dat verschuift, een fout bij het tekenen) voor ze bij de klant komt.
 *
 * Wat het NIET doet: fouten vinden die er al waren (de referentie is gewoon het vorige beeld), en beelden van de M5
 * (WebGPU) nabootsen. Het draait in Chromium zonder grafische kaart (swiftshader, de WebGL2-weg), zoals in de cloud.
 *
 * Gebruik (in de root):
 *   npm run beelden                     bouwen, beelden maken en vergelijken
 *   npm run beelden -- --vernieuw       na een bewuste wijziging: de nieuwe beelden worden de referentie
 *   node scripts/beeldvergelijking.mjs --zonder-bouw [--alleen doha,kotor] [--vernieuw]
 *
 * Uitslag in `beeldtest/uitslag/` (niet in git): per beeld het nieuwe beeld en, als het verschilt, een strook
 * referentie | nu | verschil (rood = anders). Afsluitcode 1 als een beeld te veel verschilt of de pagina een fout gaf.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REFERENTIE = join(ROOT, 'beeldtest', 'referentie');
const UITSLAG = join(ROOT, 'beeldtest', 'uitslag');
const ZETEL = join(ROOT, 'packages', 'demo-web', 'dist', 'configurator-demo.html');
const BOUW = join(ROOT, 'packages', 'bouw-web', 'dist', 'bouw-configurator.html');
const KIJKER = join(ROOT, 'packages', 'bouw-web', 'dist', 'bouw-kijker.html');

/**
 * Hoeveel een pixel mag afwijken (kleurverschil, 0–1) en welk deel van het beeld anders mag zijn. Dezelfde versie geeft
 * hier exact hetzelfde beeld (0,00 %), dus de grens mag laag: de vierkante voet onder een ronde poef was 0,21 %.
 * Na een update van Chromium kan alles een klein beetje verschuiven: dan de verschilbeelden nakijken en vernieuwen.
 */
const PIXELDREMPEL = 0.1;
const MAX_ANDERS = 0.0005; // 0,05 %

const args = process.argv.slice(2);
const vernieuw = args.includes('--vernieuw');
const zonderBouw = args.includes('--zonder-bouw');
const alleenIdx = args.indexOf('--alleen');
const alleen = alleenIdx >= 0 ? args[alleenIdx + 1].split(',') : null;

/**
 * De vaste reeks. Zetel: model, familie (filterknop), standpunt, decor, licht en eventueel de zonrichting.
 * `bouwstenen: true` zet in de 3D de keuze Bouwstenen (bij een model met een 3D-bestand uit Blender).
 * Gekozen om de onderdelen te dekken die al eens stuk gingen: doorlopende zetel (Doha, Montego), hoeksofa met chaise
 * (Kotor), kuipfauteuil (Pebble), ronde poef (Stockholm), strakke arm (Husk), slagschaduw (Doha van boven, daglicht),
 * decor met raam en glas (Kotor in de woonkamer), en de woning en het raam in de bouwdemo.
 *
 * Met `uitsnede` [x0, y0, x1, y1] (delen van het beeld) is het een close-up: een stuk uit de foto op hoge resolutie
 * (`foto()`, 2400 px breed). Voor plekken die op het hele beeld te klein zijn om op te vallen (analyse van 13/11): de
 * naad tussen schaal en zitting van Pebble, het wanduiteinde van een kuipfauteuil (Ross), de arm van Zora.
 */
const ZETELBEELDEN = [
  { naam: 'doha-schuin', model: 'Doha', familie: "Sofa's", standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  { naam: 'doha-boven-daglicht', model: 'Doha', familie: "Sofa's", standpunt: 'boven', decor: 'studio', licht: 'daglicht', zon: 30 },
  { naam: 'montego-schuin', model: 'Montego', familie: "Sofa's", standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  { naam: 'kotor-schuin', model: 'Kotor', familie: "Sofa's", standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  { naam: 'kotor-woonkamer', model: 'Kotor', familie: "Sofa's", standpunt: 'schuin', decor: 'kamer', licht: 'daglicht' },
  { naam: 'husk-schuin', model: 'Husk', familie: "Sofa's", standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  { naam: 'pebble-schuin', model: 'Pebble', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  { naam: 'stockholm-schuin', model: 'Stockholm pouf', familie: 'Poufs', standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  // Fauteuils met de opbouw van de klant (vaste ronde zitting, dunne schaal met bies, houten frame), sinds 13/11.
  { naam: 'milton-schuin', model: 'Milton', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio', bouwstenen: true },
  { naam: 'mabel2-schuin', model: 'Mabel 2-zit', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio', bouwstenen: true },
  // Vier schuine poten met een kruis en een zitting in twee lagen (Fraser).
  { naam: 'fraser-schuin', model: 'Fraser', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio', bouwstenen: true },
  // Trommel tot op de vloer, de schaal steekt errond uit, één los rugkussen tegen de rand (Satie).
  { naam: 'satie-schuin', model: 'Satie', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio', bouwstenen: true },
  // Herstel na een weggevallen grafisch toestel (14/11): de 3D start opnieuw en toont dezelfde zetel. Hetzelfde beeld als
  // `satie-schuin`, genomen nadat het toestel (nagebootst) wegviel; vroeger bleef het laatste beeld staan tot je herlaadde.
  { naam: 'satie-na-herstart', model: 'Satie', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio', herstart: true, bouwstenen: true },
  // Vier losse kussens tegen de schaal: twee achteraan, twee schuin ervoor (Quin).
  { naam: 'quin-schuin', model: 'Quin', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio', bouwstenen: true },
  // Zwevende rugschijf boven een vaste zitting, op een houten frame (Karl).
  { naam: 'karl-schuin', model: 'Karl', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio', bouwstenen: true },
  // Dikke rug die op een bolle zitting staat, tot op de vloer (Tumble).
  { naam: 'tumble-schuin', model: 'Tumble', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio', bouwstenen: true },
  // Rug die achterover helt, van opzij (Sullivan).
  { naam: 'sullivan-zij', model: 'Sullivan', familie: 'Fauteuils', standpunt: 'zij', decor: 'studio', licht: 'studio', bouwstenen: true },
  // Schaal die uitwaaiert (14/11): van voren een tulp, smal aan de voet rond de ronde zitting en breed bovenaan (Manon).
  { naam: 'manon-voor', model: 'Manon', familie: 'Fauteuils', standpunt: 'voor', decor: 'studio', licht: 'studio', bouwstenen: true },
  // Armen dikker dan de rug (14/11): de dikke armkussens tegen de dunnere rug, met de plooi ertussen.
  { naam: 'sullivan-schuin', model: 'Sullivan', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio', bouwstenen: true },
  // 3D-bestanden uit Blender (15/11, scripts/blender): het gewone model toont zijn bestand, met onze stof en afwerking.
  // De beelden hierboven met `bouwstenen: true` blijven de opbouw van de motor bewaken (de keuze Bouwstenen in de 3D).
  { naam: 'sullivan-blender-schuin', model: 'Sullivan', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  // Vertrokken van de opbouw van de motor: een schaal tot op de vloer (Manon) en een fauteuil met een los sierkussen dat de
  // configurator zelf op het bestand tekent (Mabel Meridienne).
  { naam: 'manon-blender-schuin', model: 'Manon', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  { naam: 'meridienne-blender-schuin', model: 'Mabel Meridienne', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio' },
  { naam: 'pebble-naad', model: 'Pebble', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio', uitsnede: [0.42, 0.17, 0.57, 0.45] },
  { naam: 'ross-kop', model: 'Ross', familie: 'Fauteuils', standpunt: 'schuin', decor: 'studio', licht: 'studio', uitsnede: [0.3, 0.3, 0.5, 0.82], bouwstenen: true },
  { naam: 'zora-arm', model: 'Zora zetelbed', familie: 'Zetelbedden', standpunt: 'schuin', decor: 'studio', licht: 'studio', uitsnede: [0.04, 0.2, 0.32, 0.8] },
];
// `bouw-dak` komt na de twee oude beelden: het zet een dak in het project, en dat mag `bouw-woning` niet veranderen.
// `bouw-gevel` en `bouw-binnen` (omgeving, 15/11) komen na `bouw-dak` en gebruiken dat dak; `bouw-zon` komt daarna: de
// lichtinval op het project met dak en koepel. De raamtypes en de garagepoort komen als laatste: ze wijzigen een raam van
// de voorbeeldwoning, en dat mag de beelden van de hele woning hierboven niet veranderen.
const BOUWBEELDEN = [
  { naam: 'bouw-woning' }, { naam: 'bouw-raam' }, { naam: 'bouw-dak' }, { naam: 'bouw-gevel' }, { naam: 'bouw-binnen' }, { naam: 'bouw-zon' },
  // Nieuwe raamtypes (15/11): een raam van de voorbeeldwoning krijgt met één tegel een andere indeling; dan de 3D van de positie.
  { naam: 'bouw-stolp', indeling: 'dubbel_stolp', standpunt: 'schuin' },
  { naam: 'bouw-deur-zijlicht', indeling: 'deur_zij_boven', standpunt: 'achter' },
  { naam: 'bouw-hefschuif', indeling: 'hefschuif3', standpunt: 'achter' },
  { naam: 'bouw-vouwwand', indeling: 'vouwwand4', standpunt: 'schuin' },
  { naam: 'bouw-steellook', indeling: 'steel_deur', standpunt: 'achter' },
  // Sectionale garagepoort (eigen model), met cassettes en vensters.
  { naam: 'bouw-garagepoort', poort: true, standpunt: 'achter' },
  // Detail van ramen en dakramen (ronde 11b), elk op een verse pagina (de voorbeeldwoning), zodat het beeld niet afhangt van
  // wat ervoor liep (de raamtypes hierboven laten hun kleur en profiel achter): het schuifraam van 4 m als hef-schuifdeur van
  // 4,00 × 2,35 m met twee screens naast elkaar (van buiten), een raam met een raamventilator (van binnen, dichterbij), en
  // drie platte dakramen van 120 × 120 met een screen op het platte dak (de woning schuin, via de kaart Dak).
  { naam: 'bouw-twee-screens', detail: 'raam', positie: /Schuifraam leefruimte/, tegel: 'hefschuif2', vul: [['#pk-hoogte', '2350']], klik: ['label[for="pk-screens-s2"]'], standpunt: 'achter' },
  { naam: 'bouw-ventilator', detail: 'raam', positie: /Raam leefruimte zijgevel/, klik: ['label[for="pk-ventilatie-ventilator"]'], standpunt: 'schuin', toetsen: 'Z3' },
  { naam: 'bouw-platte-dakramen', detail: 'dakramen', toetsen: 'Z2' },
  // Schuine muren (ronde 2c, 16/11), op een eigen pagina met een vers project: de voorbeeldwoning met een afgeschuinde
  // leefruimte (vijfhoek, schuifraam in de schuine muur) en een aanbouw met een schuine zijmuur (raam erin).
  { naam: 'bouw-schuin-plan', schuin: 'plan' },
  { naam: 'bouw-schuin-3d', schuin: '3d', toetsen: 'L9U2Z3' },
  { naam: 'bouw-schuin-binnen', schuin: 'binnen', toetsen: 'R5U4Z1' },
  // Constructie met schuine muren (ronde 6): de schuine wanden gedraaid mee, de vloer en het dak van een vrije vorm effen.
  { naam: 'bouw-schuin-constructie', schuin: 'constructie', toetsen: 'L9U2Z3' },
  // Losse wanden (ronde 2d, 16/11), op een eigen pagina met een vers project: de voorbeeldwoning met een halfhoog muurtje
  // en een muur die halverwege stopt in de leefruimte, een tuinmuur langs de zijgevel en een lage tuinmuur in natuursteen
  // met een hoek in verstek en een schuin stuk (`LOSSE_WANDEN`). De tekening, en de 3D van het gelijkvloers zonder dak.
  { naam: 'bouw-losse-plan', losse: 'plan' },
  { naam: 'bouw-losse-3d', losse: '3d', toetsen: 'R5U4' },
  // Techniek voor de installateur (ronde 10, 16/11): uit de motor (tsx) in de losse
  // kijker: de uitgeruste voorbeeldwoning in de uitgezette weergave, en de tekening van het gelijkvloers met de tekens.
  { naam: 'bouw-techniek', techniek: '3d', toetsen: 'O1' },
  { naam: 'bouw-techniek-plan', techniek: 'plan' },
  // Techniek op het scherm (ronde 10b, 16/11), op een eigen pagina: *Voorbeeld openen: woning met techniek* in het palet,
  // de tekening met de techniek aan (elektriciteit op de voorgrond, de andere vakken en de meubels lichter), en de 3D
  // *In de woning* met lage muren, het gelijkvloers schuin.
  { naam: 'bouw-techniek-scherm-plan', techniekScherm: 'plan' },
  { naam: 'bouw-techniek-scherm-3d', techniekScherm: '3d' },
  // Vaste modellen (ronde 8b, 16/11), elk via de snelstart in een nieuw project, op een eigen pagina: een carport met
  // berging en zadeldak (de bedekking wordt vanzelf zink), het poolhouse, de hal van 15 × 30 m buiten (helemaal in beeld)
  // en in de constructieweergave, en de rechte trap met haar maten. `klik` = wat er daarna in de configurator gebeurt.
  { naam: 'bouw-model-carport', model: ['overkapping', null, 'carport'], klik: ['label[for="pk-berging-opzij"]', 'label[for="pk-dakvorm-zadel"]'] },
  { naam: 'bouw-model-poolhouse', model: ['tuinhuis', null, 'poolhouse'], klik: [] },
  { naam: 'bouw-model-loods', model: ['loods', null, 'hal'], klik: [] },
  { naam: 'bouw-model-loods-constructie', model: ['loods', null, 'hal'], klik: ['[data-p-bouw="constructie"]'] },
  { naam: 'bouw-model-trap', model: ['staalwerk', 'trap', 'staaltrap'], klik: ['#p-maten-label'] },
  // Constructie (ronde 6, 16/11), op een eigen pagina met een vers project: de voorbeeldwoning met een zadeldak in de
  // constructieweergave (houtskelet, balklagen met trapgat, kepers, topgevels, één staal van de lagen per opbouw; gelijke
  // stukken samen getekend), en de doorsnede dwars door de woning (tekening).
  { naam: 'bouw-constructie', constructie: '3d' },
  { naam: 'bouw-doorsnede', constructie: 'doorsnede' },
  // Het voorbeeldproject van ronde 11 (16/11), op een eigen pagina: *Uitbouw achter een rijwoning* uit Projecten, meteen in
  // 3D. De bestaande woning en de buren neutraal, de uitbouw in kleur, schuin van boven; en de tekening van het gelijkvloers.
  { naam: 'bouw-uitbouw-3d', uitbouw: '3d' },
  { naam: 'bouw-uitbouw-plan', uitbouw: 'plan' },
  // Doorloop A1 (16/11): een hoog, smal huis (7 × 8 m, drie bouwlagen) staat in het standpunt Schuin helemaal in beeld.
  { naam: 'bouw-hoog-schuin', hoog: 'schuin' },
];

/**
 * Het plan van de beelden `bouw-schuin-…` (gemaakt met de motor: `zetOmtrek` en openingen op een schuine muur). De
 * openingen met een positie gebruiken de posities van de voorbeeldwoning (P3 en P9).
 */
const SCHUIN_PLAN = {"ruimtes":[{"id":"hal","naam":"Inkom","type":"hal","x":0,"y":0,"b":260,"d":380,"vloer":"tegel_grijs","wand":"wit"},{"id":"wc","naam":"Wc","type":"wc","x":260,"y":0,"b":160,"d":180,"vloer":"tegel_grijs","wand":"tegels_groen"},{"id":"berging","naam":"Berging","type":"berging","x":260,"y":180,"b":160,"d":200,"vloer":"tegel_grijs","wand":"wit"},{"id":"keuken","naam":"Keuken","type":"keuken","x":420,"y":0,"b":400,"d":380,"vloer":"tegel_grijs","wand":"gebroken_wit"},{"id":"leef","naam":"Leefruimte","type":"leefruimte","x":0,"y":380,"b":820,"d":520,"vloer":"parket_eik","wand":"gebroken_wit","omtrek":[[0,380],[820,380],[820,900],[300,900],[0,600]]},{"id":"nachthal","naam":"Nachthal","type":"hal","x":820,"y":0,"b":140,"d":900,"vloer":"parket_eik","wand":"wit"},{"id":"slk1","naam":"Slaapkamer 1","type":"slaapkamer","x":960,"y":0,"b":440,"d":420,"vloer":"parket_eik","wand":"salie"},{"id":"bad","naam":"Badkamer","type":"badkamer","x":960,"y":420,"b":440,"d":200,"vloer":"tegel_wit","wand":"tegels_wit"},{"id":"slk2","naam":"Slaapkamer 2","type":"slaapkamer","x":960,"y":620,"b":440,"d":280,"vloer":"parket_eik","wand":"blauwgrijs"},{"id":"overloop","naam":"Overloop","type":"hal","x":0,"y":0,"b":260,"d":380,"vloer":"parket_eik","wand":"wit","niveau":1},{"id":"slk3","naam":"Slaapkamer 3","type":"slaapkamer","x":260,"y":0,"b":320,"d":380,"vloer":"parket_eik","wand":"terracotta","niveau":1},{"id":"bad2","naam":"Badkamer 2","type":"badkamer","x":580,"y":0,"b":240,"d":380,"vloer":"tegel_wit","wand":"tegels_wit","niveau":1},{"id":"aanbouw","naam":"Aanbouw","type":"leefruimte","x":380,"y":900,"b":420,"d":360,"vloer":"tegel_grijs","wand":"gebroken_wit","omtrek":[[380,900],[700,900],[800,1260],[380,1260]]}],"openingen":[{"id":"o1","soort":"buitendeur","as":"h","lijn":0,"midden":190,"breedte":100,"hoogte":230,"borstwering":0,"scharnier":"begin","naarPlus":true,"positie":"p1"},{"id":"o2","soort":"raam","as":"h","lijn":0,"midden":340,"breedte":60,"hoogte":70,"borstwering":150,"scharnier":"begin","naarPlus":true,"positie":"p2"},{"id":"o4","soort":"raam","as":"h","lijn":0,"midden":1180,"breedte":180,"hoogte":150,"borstwering":90,"scharnier":"begin","naarPlus":true,"positie":"p4"},{"id":"o5","soort":"raam","as":"v","lijn":1400,"midden":210,"breedte":120,"hoogte":150,"borstwering":90,"scharnier":"begin","naarPlus":true,"positie":"p5"},{"id":"o6","soort":"raam","as":"v","lijn":1400,"midden":520,"breedte":80,"hoogte":80,"borstwering":140,"scharnier":"begin","naarPlus":true,"positie":"p6"},{"id":"o7","soort":"raam","as":"v","lijn":1400,"midden":760,"breedte":140,"hoogte":150,"borstwering":90,"scharnier":"begin","naarPlus":true,"positie":"p7"},{"id":"o8","soort":"buitendeur","as":"h","lijn":900,"midden":1040,"breedte":90,"hoogte":230,"borstwering":0,"scharnier":"einde","naarPlus":false,"positie":"p8"},{"id":"o10","soort":"raam","as":"v","lijn":0,"midden":480,"breedte":140,"hoogte":160,"borstwering":70,"scharnier":"begin","naarPlus":true,"positie":"p10"},{"id":"o11","soort":"raam","as":"h","lijn":0,"midden":150,"breedte":100,"hoogte":120,"borstwering":100,"scharnier":"begin","naarPlus":true,"positie":"p11","niveau":1},{"id":"o12","soort":"raam","as":"h","lijn":0,"midden":420,"breedte":180,"hoogte":150,"borstwering":90,"scharnier":"begin","naarPlus":true,"positie":"p12","niveau":1},{"id":"o13","soort":"raam","as":"h","lijn":0,"midden":700,"breedte":80,"hoogte":80,"borstwering":150,"scharnier":"begin","naarPlus":true,"positie":"p13","niveau":1},{"id":"o14","soort":"raam","as":"h","lijn":380,"midden":130,"breedte":120,"hoogte":180,"borstwering":40,"scharnier":"begin","naarPlus":true,"positie":"p14","niveau":1},{"id":"d1","soort":"binnendeur","as":"h","lijn":380,"midden":130,"breedte":90,"hoogte":211,"borstwering":0,"scharnier":"begin","naarPlus":true,"deurtype":"glas"},{"id":"d2","soort":"binnendeur","as":"v","lijn":260,"midden":90,"breedte":80,"hoogte":211,"borstwering":0,"scharnier":"begin","naarPlus":true,"deurtype":"schilder"},{"id":"d3","soort":"binnendeur","as":"v","lijn":260,"midden":290,"breedte":80,"hoogte":211,"borstwering":0,"scharnier":"einde","naarPlus":true,"deurtype":"schilder"},{"id":"d4","soort":"doorgang","as":"h","lijn":380,"midden":620,"breedte":200,"hoogte":220,"borstwering":0,"scharnier":"begin","naarPlus":true,"deurtype":""},{"id":"d5","soort":"binnendeur","as":"v","lijn":820,"midden":640,"breedte":90,"hoogte":211,"borstwering":0,"scharnier":"begin","naarPlus":false,"deurtype":"eik"},{"id":"d6","soort":"binnendeur","as":"v","lijn":960,"midden":330,"breedte":90,"hoogte":211,"borstwering":0,"scharnier":"einde","naarPlus":true,"deurtype":"schilder"},{"id":"d7","soort":"binnendeur","as":"v","lijn":960,"midden":520,"breedte":80,"hoogte":211,"borstwering":0,"scharnier":"begin","naarPlus":true,"deurtype":"schuif"},{"id":"d8","soort":"binnendeur","as":"v","lijn":960,"midden":700,"breedte":90,"hoogte":211,"borstwering":0,"scharnier":"begin","naarPlus":true,"deurtype":"schilder"},{"id":"d9","soort":"binnendeur","as":"v","lijn":260,"midden":300,"breedte":80,"hoogte":211,"borstwering":0,"scharnier":"einde","naarPlus":true,"deurtype":"schilder","niveau":1},{"id":"d10","soort":"binnendeur","as":"v","lijn":580,"midden":200,"breedte":80,"hoogte":211,"borstwering":0,"scharnier":"begin","naarPlus":true,"deurtype":"schuif","niveau":1},{"id":"o9","soort":"schuifraam","breedte":300,"hoogte":240,"borstwering":0,"scharnier":"begin","naarPlus":true,"positie":"p9","as":"s","richting":[0.707107,0.707107],"lijn":-424.264069,"midden":636.396103},{"borstwering":0,"scharnier":"begin","naarPlus":true,"id":"dg","soort":"doorgang","as":"h","lijn":900,"midden":540,"breedte":240,"hoogte":220},{"id":"o3","soort":"raam","breedte":140,"hoogte":140,"borstwering":90,"scharnier":"begin","naarPlus":true,"positie":"p3","as":"s","richting":[0.267644,0.963518],"lijn":433.583059,"midden":1241.33224}],"meubels":[{"id":"m2","type":"bank3","x":300,"y":625,"b":230,"d":95,"rotatie":90,"niveau":0},{"id":"m5","type":"eettafel","x":470,"y":560,"b":200,"d":95,"rotatie":0,"niveau":0},{"id":"m6","type":"stoel","x":485,"y":505,"b":45,"d":50,"rotatie":0,"niveau":0},{"id":"m7","type":"stoel","x":547,"y":505,"b":45,"d":50,"rotatie":0,"niveau":0},{"id":"m8","type":"stoel","x":610,"y":505,"b":45,"d":50,"rotatie":0,"niveau":0},{"id":"m9","type":"stoel","x":485,"y":660,"b":45,"d":50,"rotatie":180,"niveau":0},{"id":"m10","type":"stoel","x":547,"y":660,"b":45,"d":50,"rotatie":180,"niveau":0},{"id":"m11","type":"stoel","x":610,"y":660,"b":45,"d":50,"rotatie":180,"niveau":0},{"id":"m12","type":"plant","x":755,"y":400,"b":50,"d":50,"rotatie":0,"niveau":0},{"id":"m13","type":"plant","x":680,"y":820,"b":50,"d":50,"rotatie":0,"niveau":0},{"id":"m14","type":"keuken","x":753,"y":15,"b":360,"d":62,"rotatie":90,"niveau":0},{"id":"m15","type":"eiland","x":520,"y":80,"b":240,"d":100,"rotatie":90,"niveau":0},{"id":"m16","type":"koelkast","x":430,"y":15,"b":60,"d":62,"rotatie":0,"niveau":0},{"id":"m17","type":"trap","x":15,"y":60,"b":100,"d":300,"rotatie":0,"niveau":0},{"id":"m18","type":"wc","x":360,"y":110,"b":40,"d":55,"rotatie":90,"niveau":0},{"id":"m19","type":"bed2","x":1100,"y":200,"b":165,"d":215,"rotatie":180,"niveau":0},{"id":"m20","type":"nachtkast","x":1050,"y":375,"b":45,"d":40,"rotatie":180,"niveau":0},{"id":"m21","type":"nachtkast","x":1270,"y":375,"b":45,"d":40,"rotatie":180,"niveau":0},{"id":"m22","type":"kleerkast","x":965,"y":20,"b":200,"d":60,"rotatie":270,"niveau":0},{"id":"m23","type":"bad","x":1030,"y":425,"b":170,"d":75,"rotatie":0,"niveau":0},{"id":"m24","type":"douche","x":1265,"y":425,"b":120,"d":90,"rotatie":0,"niveau":0},{"id":"m25","type":"lavabo","x":1100,"y":565,"b":120,"d":50,"rotatie":180,"niveau":0},{"id":"m26","type":"wc","x":1300,"y":560,"b":40,"d":55,"rotatie":180,"niveau":0},{"id":"m27","type":"bed1","x":1175,"y":700,"b":95,"d":210,"rotatie":90,"niveau":0},{"id":"m28","type":"bureau","x":1055,"y":625,"b":120,"d":60,"rotatie":0,"niveau":0},{"id":"m29","type":"kleerkast","x":1230,"y":625,"b":150,"d":60,"rotatie":0,"niveau":0},{"id":"m30","type":"bed2","x":330,"y":20,"b":165,"d":215,"rotatie":0,"niveau":1},{"id":"m31","type":"nachtkast","x":280,"y":20,"b":45,"d":40,"rotatie":0,"niveau":1},{"id":"m32","type":"nachtkast","x":500,"y":20,"b":45,"d":40,"rotatie":0,"niveau":1},{"id":"m33","type":"kleerkast","x":360,"y":315,"b":200,"d":60,"rotatie":180,"niveau":1},{"id":"m34","type":"douche","x":725,"y":15,"b":90,"d":90,"rotatie":0,"niveau":1},{"id":"m35","type":"lavabo","x":600,"y":325,"b":120,"d":50,"rotatie":180,"niveau":1},{"id":"m36","type":"wc","x":760,"y":200,"b":40,"d":55,"rotatie":90,"niveau":1},{"id":"m37","type":"plant","x":180,"y":300,"b":50,"d":50,"rotatie":0,"niveau":1},{"id":"tv2","type":"tv","x":300,"y":395,"b":180,"d":45,"rotatie":0},{"id":"ma1","type":"eettafel","x":440,"y":1040,"b":200,"d":95,"rotatie":0}],"muurhoogte":270,"buitenmuur":30,"binnenmuur":10,"verdiepingen":[{"naam":"Gelijkvloers"},{"naam":"Verdieping 1"}],"gevel":{"soort":"steen","kleur":"#9c4a34"},"gevelOntwerp":{"standaard":{"materiaal":"gevelsteen","kleur":"rood","voeg":"grijs"},"sokkel":{"materiaal":"natuursteen","kleur":"blauwgrijs","hoogte":30},"vlakken":{"overloop:boven":{"materiaal":"hout_staand","kleur":"zwart"},"slk3:boven":{"materiaal":"hout_staand","kleur":"zwart"},"bad2:boven":{"materiaal":"hout_staand","kleur":"zwart"},"overloop:onder":{"materiaal":"hout_staand","kleur":"zwart"},"slk3:onder":{"materiaal":"hout_staand","kleur":"zwart"},"bad2:onder":{"materiaal":"hout_staand","kleur":"zwart"},"overloop:links":{"materiaal":"hout_staand","kleur":"zwart"},"bad2:rechts":{"materiaal":"hout_staand","kleur":"zwart"}}}};

const nodig = (b) => !alleen || alleen.some((a) => b.naam.startsWith(a));

function laadPlaywright() {
  // Playwright staat in de cloudomgeving al klaar (ook buiten deze map); anders: npm install -D playwright.
  try { return createRequire(import.meta.url)('playwright'); } catch {
    console.error('Playwright niet gevonden. Installeer het met: npm install -D playwright');
    process.exit(2);
  }
}

/** Wacht tot het canvas twee keer na elkaar hetzelfde beeld geeft (de zachte vormen en het mooie beeld komen later). */
/** De losse wanden van de beelden `bouw-losse-…` (ronde 2d), bovenop het plan van de voorbeeldwoning. */
const LOSSE_WANDEN = [
  { id: 'lw1', van: [320, 380], tot: [320, 505], dikte: 10, hoogte: 110 },
  { id: 'lw2', van: [0, 760], tot: [180, 760], dikte: 10 },
  { id: 'lw3', van: [1525, 150], tot: [1525, 750], dikte: 20, hoogte: 180 },
  { id: 'lw4', van: [150, 1300], tot: [650, 1300], dikte: 25, hoogte: 90, gevel: { materiaal: 'natuursteen', kleur: 'blauwgrijs' } },
  { id: 'lw5', van: [650, 1300], tot: [650, 1450], dikte: 25, hoogte: 90, gevel: { materiaal: 'natuursteen', kleur: 'blauwgrijs' } },
  { id: 'lw6', van: [650, 1450], tot: [900, 1350], dikte: 25, hoogte: 90, gevel: { materiaal: 'natuursteen', kleur: 'blauwgrijs' } },
];

async function wachtTotStil(p, selector, maxMs = 40000) {
  const start = Date.now();
  let vorig = '';
  await p.waitForTimeout(1500);
  while (Date.now() - start < maxMs) {
    const nu = await p.evaluate((s) => document.querySelector(s)?.toDataURL('image/png') ?? '', selector);
    if (nu && nu === vorig) return nu;
    vorig = nu;
    await p.waitForTimeout(1500);
  }
  console.warn(`  (niet stil geworden binnen ${maxMs / 1000} s: laatste beeld genomen)`);
  return vorig;
}

async function zetSelect(p, selector, waarde) {
  if ((await p.locator(selector).inputValue()) !== waarde) await p.selectOption(selector, waarde);
}

async function maakBeelden() {
  const { chromium } = laadPlaywright();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const fouten = [];
  const beelden = new Map();
  const nieuwePagina = async (pad) => {
    const p = await browser.newPage({ viewport: { width: 1400, height: 950 }, deviceScaleFactor: 1 });
    p.on('pageerror', (e) => fouten.push(`${pad.split('/').pop()}: ${String(e).slice(0, 200)}`));
    p.on('console', (m) => {
      // Niet de melding van three bij het nagebootste verlies van het toestel (beeld `satie-na-herstart`): die is de proef zelf.
      if (m.type() === 'error' && !/ERR_FAILED|fonts\.g|proef Device Lost/.test(m.text())) fouten.push(`${pad.split('/').pop()}: ${m.text().slice(0, 200)}`);
    });
    await p.route('https://fonts.googleapis.com/**', (r) => r.abort());
    return p;
  };

  const zetel = ZETELBEELDEN.filter(nodig);
  if (zetel.length) {
    const p = await nieuwePagina(ZETEL);
    await p.goto(`file://${ZETEL}#modellen`);
    await p.waitForTimeout(1000);
    let eerste = true;
    for (const b of zetel) {
      process.stdout.write(`  ${b.naam} … `);
      await p.click('[data-weergave="modellen"]');
      await p.locator('#modellen-filter button', { hasText: b.familie }).first().click();
      await p.locator('article').filter({ has: p.locator(`h2:text-is("${b.model}")`) }).first().locator('button:has-text("Kies en pas aan")').click();
      await p.waitForTimeout(800);
      if (await p.locator('#o-3d').isHidden()) await p.click('[data-o-weergave="3d"]');
      if (eerste) { await zetSelect(p, '#o-3d-kwaliteit', 'mooi'); eerste = false; }
      await zetSelect(p, '#o-3d-decor', b.decor);
      await zetSelect(p, '#o-3d-licht', b.licht);
      await p.evaluate((graden) => {
        const s = document.getElementById('o-3d-zon');
        if (!s) return;
        s.value = String(graden ?? s.defaultValue);
        s.dispatchEvent(new Event('input', { bubbles: true }));
        s.dispatchEvent(new Event('change', { bubbles: true }));
      }, b.zon ?? null);
      // Heeft het model een 3D-bestand, dan de keuze vastzetten: `bouwstenen` bewaakt de opbouw van de motor, anders het bestand.
      const keuze = p.locator(`#o-3d-echt-keuze:not([hidden]) [data-echt="${b.bouwstenen ? 'uit' : 'aan'}"]`);
      if (await keuze.count()) { await keuze.click(); await p.waitForTimeout(300); }
      await p.click(`[data-standpunt="${b.standpunt}"]`);
      if (b.herstart) {
        // Eerst het gewone beeld afwachten, dan het toestel laten wegvallen: het canvas wordt vervangen door een nieuw.
        await wachtTotStil(p, '#o-3d canvas');
        await p.evaluate(() => window.__zetel3d.proefVerlies());
        await p.waitForTimeout(1500);
      }
      const stil = await wachtTotStil(p, '#o-3d canvas');
      // Close-up: een stuk uit de foto op hoge resolutie.
      beelden.set(b.naam, b.uitsnede ? uitsnede(png(await p.evaluate(() => window.__zetel3d.foto())), b.uitsnede) : png(stil));
      console.log('klaar');
    }
    await p.close();
  }

  const bouw = BOUWBEELDEN.filter(nodig);
  if (bouw.length) {
    const p = await nieuwePagina(BOUW);
    await p.goto(`file://${BOUW}`);
    await p.waitForTimeout(1500);
    if (bouw.some((b) => b.naam === 'bouw-woning')) {
      process.stdout.write('  bouw-woning … ');
      await p.click('.nav [data-weergave="plan"]');
      await p.click('[data-pl-weergave="3d"]');
      beelden.set('bouw-woning', png(await wachtTotStil(p, '#pl-3d canvas')));
      console.log('klaar');
    }
    if (bouw.some((b) => b.naam === 'bouw-raam')) {
      process.stdout.write('  bouw-raam … ');
      await p.click('.nav [data-weergave="positie"]');
      await p.click('[data-p-weergave="3d"]');
      beelden.set('bouw-raam', png(await wachtTotStil(p, '#p-3d canvas')));
      console.log('klaar');
    }
    if (bouw.some((b) => b.naam === 'bouw-dak')) {
      // Dak en lichtkoepel (15/11): zadeldak met rode pannen op de verdieping, grind op het lage platte dak, en daarin
      // een lichtkoepel boven de leefruimte. Alles via het scherm, zoals een gebruiker.
      process.stdout.write('  bouw-dak … ');
      await p.click('.nav [data-weergave="plan"]');
      await p.click('[data-pl-weergave="plan"]');
      await p.click('[data-dak-vorm="zadel"]');
      await p.click('[data-dak-kleur="rood"]');
      await p.selectOption('#dak-plat', 'grind:grijs');
      await p.click('[data-gereedschap="daklicht"]');
      await p.click('[data-daklicht="koepel_100"]');
      // Klik in de plattegrond op (410, 640) cm: boven de leefruimte, naast de verdieping.
      await p.evaluate(() => document.querySelector('#pl-canvas').scrollIntoView({ block: 'center' }));
      await p.waitForTimeout(200);
      const [x, y] = await p.evaluate(() => {
        const svg = document.querySelector('#pl-canvas svg'), punt = svg.createSVGPoint();
        punt.x = 410; punt.y = 640;
        const s = punt.matrixTransform(svg.getScreenCTM());
        return [s.x, s.y];
      });
      await p.mouse.click(x, y);
      await p.click('[data-pl-weergave="3d"]');
      await p.click('[data-pl-standpunt="schuin"]');
      beelden.set('bouw-dak', png(await wachtTotStil(p, '#pl-3d canvas')));
      console.log('klaar');
    }
    if (bouw.some((b) => b.naam === 'bouw-gevel')) {
      // Omgeving van een gebouw (15/11): de voorgevel van lager bekeken, met de lucht, de wolken, de bomenrij aan de
      // horizon en het gras dat erin wegloopt; glas dat de lucht spiegelt, terras en stoep bij de woning.
      process.stdout.write('  bouw-gevel … ');
      await p.click('.nav [data-weergave="plan"]');
      await p.click('[data-pl-weergave="3d"]');
      await p.click('[data-pl-standpunt="voor"]');
      beelden.set('bouw-gevel', png(await wachtTotStil(p, '#pl-3d canvas')));
      console.log('klaar');
    }
    if (bouw.some((b) => b.naam === 'bouw-binnen')) {
      // Binnenkijken met lage muren (15/11): vloeren met nerf en voeg, schaduw van de zon en schaduw in de hoeken.
      process.stdout.write('  bouw-binnen … ');
      await p.click('.nav [data-weergave="plan"]');
      await p.click('[data-pl-weergave="3d"]');
      await p.check('#pl-laag');
      await p.click('[data-pl-standpunt="schuin"]');
      beelden.set('bouw-binnen', png(await wachtTotStil(p, '#pl-3d canvas')));
      await p.uncheck('#pl-laag');
      console.log('klaar');
    }
    if (bouw.some((b) => b.naam === 'bouw-zon')) {
      // Lichtinval (15/11): 21 juni om 13 u, van boven in het gelijkvloers gekeken. De verdieping en het dak zijn
      // verborgen maar werpen schaduw: de zon valt alleen door de ramen en door de lichtkoepel binnen.
      // Zonder `bouw-dak` ervoor (met --alleen) is er geen koepel: neem beide samen.
      process.stdout.write('  bouw-zon … ');
      await p.click('.nav [data-weergave="plan"]');
      await p.click('[data-pl-weergave="3d"]');
      await p.check('#pl-zon-aan');
      await p.selectOption('#pl-zon-dag', 'zomer');
      await p.evaluate(() => {
        const s = document.getElementById('pl-zon-uur');
        s.value = '13';
        s.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await p.uncheck('#pl-alle-niveaus');
      await p.click('[data-pl-standpunt="boven"]');
      beelden.set('bouw-zon', png(await wachtTotStil(p, '#pl-3d canvas')));
      console.log('klaar');
    }
    // Na de beelden hierboven: die mogen niet veranderen door wat hier aan het voorbeeldproject gewijzigd wordt.
    for (const b of bouw.filter((x) => x.indeling || x.poort)) {
      process.stdout.write(`  ${b.naam} … `);
      if (b.poort) {
        await p.click('.nav [data-weergave="offerte"]:not(.alleen-ramen)');
        await p.click('[data-nieuw="poort"]');
        await p.click('label[for="pk-belijning-cassettes"]');
        await p.click('label[for="pk-vensters"]');
      } else {
        await p.click('.nav [data-weergave="positie"]');
        const namen = await p.locator('#p-kies option').allTextContents();
        await p.selectOption('#p-kies', { index: Math.max(0, namen.findIndex((t) => /leefruimte zijgevel/.test(t))) });
        await p.click('[data-p-weergave="voor"]');
        await p.click(`[data-indeling="${b.indeling}"]`);
      }
      await p.click('[data-p-weergave="3d"]');
      await p.click(`[data-p-standpunt="${b.standpunt}"]`);
      beelden.set(b.naam, png(await wachtTotStil(p, '#p-3d canvas')));
      console.log('klaar');
    }
    await p.close();
  }
  // Detail van ramen en dakramen (ronde 11b): elk beeld op een verse pagina, met een vers project (de voorbeeldwoning).
  for (const b of bouw.filter((x) => x.detail)) {
    process.stdout.write(`  ${b.naam} … `);
    const p = await nieuwePagina(BOUW);
    await p.goto(`file://${BOUW}`);
    await p.waitForTimeout(1500);
    let canvas = '#p-3d canvas';
    if (b.detail === 'dakramen') {
      // De kaart Dak: plat dak, drie daklichten met de teller, de soort "plat dakraam 120 × 120" en een screen op alle.
      await p.click('.nav [data-weergave="plan"]');
      await p.click('[data-pl-weergave="plan"]');
      await p.click('[data-dak-vorm="plat"]');
      for (let i = 0; i < 3; i++) await p.click('#pl-dak [data-koepels="plus"]');
      await p.selectOption('#dak-daklicht-soort', 'dakraam_120');
      await p.click('#pl-dak [data-dakraam-zon="screen"]');
      await p.click('[data-pl-weergave="3d"]');
      await p.click('[data-pl-standpunt="schuin"]');
      canvas = '#pl-3d canvas';
    } else {
      await p.click('.nav [data-weergave="positie"]');
      const namen = await p.locator('#p-kies option').allTextContents();
      await p.selectOption('#p-kies', { index: Math.max(0, namen.findIndex((t) => b.positie.test(t))) });
      await p.click('[data-p-weergave="voor"]');
      if (b.tegel) await p.click(`[data-indeling="${b.tegel}"]`);
      for (const [veld, waarde] of b.vul ?? []) { await p.fill(veld, waarde); await p.press(veld, 'Enter'); }
      for (const k of b.klik ?? []) await p.click(k);
      await p.click('[data-p-weergave="3d"]');
      await p.click(`[data-p-standpunt="${b.standpunt}"]`);
    }
    if (b.toetsen) {
      await p.locator(canvas).focus();
      const toets = { L: 'ArrowLeft', R: 'ArrowRight', U: 'ArrowUp', D: 'ArrowDown', Z: '+', O: '-' };
      for (const [, k, n] of b.toetsen.matchAll(/([LRUDZO])(\d+)/g)) for (let i = 0; i < Number(n); i++) await p.keyboard.press(toets[k]);
    }
    beelden.set(b.naam, png(await wachtTotStil(p, canvas)));
    await p.close();
    console.log('klaar');
  }
  const schuin = bouw.filter((x) => x.schuin);
  if (schuin.length) {
    // Een verse pagina (vers project, de voorbeeldwoning), het plan erin via het bewaarde project, en herladen.
    const p = await nieuwePagina(BOUW);
    await p.goto(`file://${BOUW}`);
    await p.waitForTimeout(1500);
    await p.evaluate((plan) => {
      const index = JSON.parse(localStorage.getItem('bouw-demo.projecten.v1'));
      const sleutel = `bouw-demo.project.${index.actief}`;
      const t = JSON.parse(localStorage.getItem(sleutel));
      t.plan = plan;
      localStorage.setItem(sleutel, JSON.stringify(t));
    }, SCHUIN_PLAN);
    await p.reload();
    await p.waitForTimeout(1500);
    for (const b of schuin) {
      process.stdout.write(`  ${b.naam} … `);
      await p.click('.nav [data-weergave="plan"]');
      if (b.schuin === 'plan') {
        await p.click('[data-pl-weergave="plan"]');
        await p.waitForTimeout(800);
        beelden.set(b.naam, PNG.sync.read(await p.locator('#pl-canvas').screenshot()));
      } else {
        await p.click('[data-pl-weergave="3d"]');
        if (b.schuin === 'constructie') await p.click('[data-3d-weergave="constructie"]');
        if (b.schuin === 'binnen') await p.check('#pl-laag'); else await p.uncheck('#pl-laag');
        await p.click('[data-pl-standpunt="voor"]');
        // Draaien, hoger en dichterbij met de pijltjes en + (zoals een gebruiker met het toetsenbord).
        await p.locator('#pl-3d canvas').focus();
        const toets = { L: 'ArrowLeft', R: 'ArrowRight', U: 'ArrowUp', D: 'ArrowDown', Z: '+', O: '-' };
        for (const [, k, n] of b.toetsen.matchAll(/([LRUDZO])(\d+)/g)) for (let i = 0; i < Number(n); i++) await p.keyboard.press(toets[k]);
        beelden.set(b.naam, png(await wachtTotStil(p, '#pl-3d canvas')));
      }
      console.log('klaar');
    }
    await p.close();
  }
  const losse = bouw.filter((x) => x.losse);
  if (losse.length) {
    // Een verse pagina (vers project, de voorbeeldwoning), de losse wanden erbij via het bewaarde project, en herladen.
    const p = await nieuwePagina(BOUW);
    await p.goto(`file://${BOUW}`);
    await p.waitForTimeout(1500);
    await p.evaluate((wanden) => {
      const index = JSON.parse(localStorage.getItem('bouw-demo.projecten.v1'));
      const sleutel = `bouw-demo.project.${index.actief}`;
      const t = JSON.parse(localStorage.getItem(sleutel));
      t.plan.losseWanden = wanden;
      localStorage.setItem(sleutel, JSON.stringify(t));
    }, LOSSE_WANDEN);
    await p.reload();
    await p.waitForTimeout(1500);
    for (const b of losse) {
      process.stdout.write(`  ${b.naam} … `);
      await p.click('.nav [data-weergave="plan"]');
      if (b.losse === 'plan') {
        await p.click('[data-pl-weergave="plan"]');
        await p.waitForTimeout(800);
        beelden.set(b.naam, PNG.sync.read(await p.locator('#pl-canvas').screenshot()));
      } else {
        // Alleen het gelijkvloers: zonder dak en zonder verdieping erboven, zodat je in de leefruimte kijkt.
        await p.click('[data-pl-weergave="3d"]');
        await p.uncheck('#pl-alle-niveaus');
        await p.click('[data-pl-standpunt="schuin"]');
        await p.locator('#pl-3d canvas').focus();
        const toets = { L: 'ArrowLeft', R: 'ArrowRight', U: 'ArrowUp', D: 'ArrowDown', Z: '+', O: '-' };
        for (const [, k, n] of b.toetsen.matchAll(/([LRUDZO])(\d+)/g)) for (let i = 0; i < Number(n); i++) await p.keyboard.press(toets[k]);
        beelden.set(b.naam, png(await wachtTotStil(p, '#pl-3d canvas')));
      }
      console.log('klaar');
    }
    await p.close();
  }
  const constructie = bouw.filter((x) => x.constructie);
  if (constructie.length) {
    // Een verse pagina (vers project: de voorbeeldwoning), een zadeldak via de kaart Dak, dan Constructie of Doorsnede.
    const p = await nieuwePagina(BOUW);
    await p.goto(`file://${BOUW}`);
    await p.waitForTimeout(1500);
    await p.click('.nav [data-weergave="plan"]');
    await p.click('[data-pl-weergave="plan"]');
    await p.click('[data-dak-vorm="zadel"]');
    await p.click('[data-dak-kleur="rood"]');
    for (const b of constructie) {
      process.stdout.write(`  ${b.naam} … `);
      if (b.constructie === 'doorsnede') {
        await p.click('[data-pl-weergave="doorsnede"]');
        await p.waitForTimeout(800);
        beelden.set(b.naam, PNG.sync.read(await p.locator('#pl-doorsnede-tekening svg').screenshot()));
      } else {
        await p.click('[data-pl-weergave="3d"]');
        await p.click('[data-3d-weergave="constructie"]');
        await p.click('[data-pl-standpunt="schuin"]');
        beelden.set(b.naam, png(await wachtTotStil(p, '#pl-3d canvas')));
      }
      console.log('klaar');
    }
    await p.close();
  }
  const techniek = bouw.filter((x) => x.techniek);
  if (techniek.length) {
    // De gegevens uit de motor (core/voorbeelden/techniekbeeld.ts): het 3D-pakket en de tekening.
    const tsx = join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
    const { pakket, plan } = JSON.parse(execSync(`"${tsx}" packages/core/voorbeelden/techniekbeeld.ts`, { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 }).toString());
    const p = await nieuwePagina(KIJKER);
    await p.goto(`file://${KIJKER}`);
    await p.waitForTimeout(1000);
    for (const b of techniek) {
      process.stdout.write(`  ${b.naam} … `);
      if (b.techniek === 'plan') {
        const t = await browser.newPage({ viewport: { width: 1500, height: 1100 }, deviceScaleFactor: 1 });
        await t.setContent(`<!doctype html><body style="margin:0;background:#fff">${plan}</body>`);
        await t.waitForTimeout(300);
        beelden.set(b.naam, PNG.sync.read(await t.locator('svg').first().screenshot()));
        await t.close();
      } else {
        // Het pakket als bericht aan de kijker (zoals een pagina die hem insluit), dan schuin en een stap verder weg.
        await p.evaluate((x) => window.postMessage(x, '*'), pakket);
        await p.waitForTimeout(1000);
        await p.click('[data-standpunt="schuin"]');
        await p.locator('#drie-d canvas').focus();
        const toets = { L: 'ArrowLeft', R: 'ArrowRight', U: 'ArrowUp', D: 'ArrowDown', Z: '+', O: '-' };
        for (const [, k, n] of (b.toetsen ?? '').matchAll(/([LRUDZO])(\d+)/g)) for (let i = 0; i < Number(n); i++) await p.keyboard.press(toets[k]);
        beelden.set(b.naam, png(await wachtTotStil(p, '#drie-d canvas')));
      }
      console.log('klaar');
    }
    await p.close();
  }
  const techniekScherm = bouw.filter((x) => x.techniekScherm);
  if (techniekScherm.length) {
    // Een verse pagina; de knop Techniek, dan het voorbeeld (een nieuw project met de uitgeruste woning).
    const p = await nieuwePagina(BOUW);
    await p.goto(`file://${BOUW}`);
    await p.waitForTimeout(1500);
    await p.click('.nav [data-weergave="plan"]');
    await p.click('[data-pl-weergave="plan"]');
    await p.click('[data-techniek-aan]');
    await p.click('[data-techniek-voorbeeld]');
    await p.waitForTimeout(800);
    for (const b of techniekScherm) {
      process.stdout.write(`  ${b.naam} … `);
      if (b.techniekScherm === 'plan') {
        await p.click('[data-pl-weergave="plan"]');
        await p.waitForTimeout(800);
        beelden.set(b.naam, PNG.sync.read(await p.locator('#pl-canvas').screenshot()));
      } else {
        await p.click('[data-pl-weergave="3d"]');
        await p.click('[data-techniek-3d="woning"]');
        await p.check('#pl-laag');
        await p.uncheck('#pl-alle-niveaus');
        await p.click('[data-pl-standpunt="schuin"]');
        beelden.set(b.naam, png(await wachtTotStil(p, '#pl-3d canvas')));
      }
      console.log('klaar');
    }
    await p.close();
  }
  const modellen = bouw.filter((x) => x.model);
  if (modellen.length) {
    // Een verse pagina; elk model maakt via de snelstart zijn eigen project (de afgewerkte weergave blijft niet hangen:
    // na de constructie gaat de knop terug naar afgewerkt).
    const p = await nieuwePagina(BOUW);
    await p.goto(`file://${BOUW}`);
    await p.waitForTimeout(1500);
    for (const b of modellen) {
      process.stdout.write(`  ${b.naam} … `);
      const [tegel, soort, vertrekpunt] = b.model;
      await p.click('.nav [data-weergave="start"]');
      await p.click(`[data-snel="${tegel}"]`);
      if (soort) await p.click(`[data-snel-soort="${soort}"]`);
      await p.click('#ss-verder');
      await p.click(`[data-vertrekpunt="${vertrekpunt}"]`);
      for (const k of b.klik) { await p.click(k); await p.waitForTimeout(300); }
      beelden.set(b.naam, png(await wachtTotStil(p, '#p-3d canvas')));
      if (b.klik.includes('[data-p-bouw="constructie"]')) await p.click('[data-p-bouw="afgewerkt"]');
      if (b.klik.includes('#p-maten-label')) await p.click('#p-maten-label');
      console.log('klaar');
    }
    await p.close();
  }
  // Ronde 11: het voorbeeldproject (bestaande woning en buren neutraal, de uitbouw in kleur). Eigen pagina, vers project.
  const uitbouw = BOUWBEELDEN.filter((b) => b.uitbouw && nodig(b));
  if (uitbouw.length) {
    const p = await nieuwePagina(BOUW);
    await p.goto(`file://${BOUW}`);
    await p.waitForTimeout(1500);
    await p.click('.nav [data-weergave="projecten"]');
    await p.click('[data-sjabloon="uitbouw"]');
    for (const b of uitbouw) {
      process.stdout.write(`  ${b.naam} … `);
      if (b.uitbouw === 'plan') {
        await p.click('[data-pl-weergave="plan"]');
        await p.waitForTimeout(800);
        beelden.set(b.naam, PNG.sync.read(await p.locator('#pl-canvas').screenshot()));
      } else {
        await p.click('[data-pl-weergave="3d"]');
        await p.click('[data-pl-standpunt="schuin"]');
        beelden.set(b.naam, png(await wachtTotStil(p, '#pl-3d canvas')));
      }
      console.log('klaar');
    }
    await p.close();
  }
  // Doorloop A1 (16/11): een hoog, smal huis via de snelstart, dan een vast standpunt. Eigen pagina, vers project.
  const hoog = BOUWBEELDEN.filter((b) => b.hoog && nodig(b));
  if (hoog.length) {
    const p = await nieuwePagina(BOUW);
    await p.goto(`file://${BOUW}`);
    await p.waitForTimeout(1500);
    await p.click('.nav [data-weergave="start"]');
    await p.click('[data-snel="woning"]');
    for (const [k, w] of [['breedte', '700'], ['diepte', '800']]) { const e = p.locator(`[data-snel-maat="${k}"]`); await e.fill(w); await e.press('Tab'); }
    await p.click('[data-snel-plus="verdiepingen"]');
    await p.click('#ss-verder');
    await p.click('[data-stijl="klassiek"]');
    for (const b of hoog) {
      process.stdout.write(`  ${b.naam} … `);
      await p.waitForTimeout(1500);
      await p.click(`[data-pl-standpunt="${b.hoog}"]`);
      beelden.set(b.naam, png(await wachtTotStil(p, '#pl-3d canvas')));
      console.log('klaar');
    }
    await p.close();
  }
  await browser.close();
  return { beelden, fouten };
}

function png(dataUrl) { return PNG.sync.read(Buffer.from(dataUrl.split(',')[1], 'base64')); }

/** Het stuk [x0, y0, x1, y1] (delen van breedte en hoogte) uit een beeld. */
function uitsnede(beeld, [x0, y0, x1, y1]) {
  const x = Math.round(x0 * beeld.width), y = Math.round(y0 * beeld.height);
  const w = Math.round(x1 * beeld.width) - x, h = Math.round(y1 * beeld.height) - y;
  const uit = new PNG({ width: w, height: h });
  PNG.bitblt(beeld, uit, x, y, w, h, 0, 0);
  return uit;
}

/** Strook referentie | nu | verschil naast elkaar. */
function strook(a, b, verschil) {
  const w = a.width, h = a.height, uit = new PNG({ width: w * 3 + 20, height: h });
  uit.data.fill(255);
  for (const [i, beeld] of [a, b, verschil].entries()) PNG.bitblt(beeld, uit, 0, 0, w, h, i * (w + 10), 0);
  return PNG.sync.write(uit);
}

// ---------- uitvoeren ----------
if (!zonderBouw) {
  console.log('Bouwen …');
  execSync('npm run build -w @configurator/demo-web && npm run build -w @configurator/bouw-web', { cwd: ROOT, stdio: 'ignore' });
}
for (const pad of [ZETEL, BOUW, KIJKER]) if (!existsSync(pad)) { console.error(`Niet gevonden: ${pad} (eerst bouwen)`); process.exit(2); }

console.log('Beelden maken (Chromium zonder grafische kaart) …');
const { beelden, fouten } = await maakBeelden();
mkdirSync(REFERENTIE, { recursive: true });
rmSync(UITSLAG, { recursive: true, force: true });
mkdirSync(UITSLAG, { recursive: true });

let mis = 0;
const regels = [];
for (const [naam, nu] of beelden) {
  writeFileSync(join(UITSLAG, `${naam}.png`), PNG.sync.write(nu));
  const refPad = join(REFERENTIE, `${naam}.png`);
  if (vernieuw || !existsSync(refPad)) {
    writeFileSync(refPad, PNG.sync.write(nu));
    regels.push([naam, vernieuw ? 'referentie vernieuwd' : 'nieuwe referentie']);
    continue;
  }
  const ref = PNG.sync.read(readFileSync(refPad));
  if (ref.width !== nu.width || ref.height !== nu.height) {
    mis++;
    regels.push([naam, `ANDERE MAAT: ${ref.width}×${ref.height} → ${nu.width}×${nu.height}`]);
    continue;
  }
  const verschil = new PNG({ width: nu.width, height: nu.height });
  const anders = pixelmatch(ref.data, nu.data, verschil.data, nu.width, nu.height, { threshold: PIXELDREMPEL, alpha: 0.3 });
  const deel = anders / (nu.width * nu.height);
  const te = deel > MAX_ANDERS;
  if (te) mis++;
  if (anders) writeFileSync(join(UITSLAG, `${naam}-verschil.png`), strook(ref, nu, verschil));
  regels.push([naam, `${(deel * 100).toFixed(2)} % anders${te ? '  ← TE VEEL' : ''}`]);
}

console.log('\nUitslag:');
for (const [naam, tekst] of regels) console.log(`  ${naam.padEnd(22)} ${tekst}`);
if (fouten.length) {
  console.log('\nFouten in de pagina:');
  for (const f of [...new Set(fouten)].slice(0, 10)) console.log(`  ${f}`);
}
console.log(`\nBeelden en verschillen: ${UITSLAG}`);
if (mis || fouten.length) {
  console.log(mis ? `${mis} beeld(en) anders dan de referentie. Bewust? Dan: npm run beelden -- --vernieuw` : '');
  process.exit(1);
}
console.log('Alles gelijk aan de referentie.');
