/**
 * Een bestand aan de gebruiker geven. In de weergave op claude.ai (artifact) mag een pagina niet zelf downloaden:
 * daar loopt het via de toelating "downloads" (de gebruiker bevestigt). Elders (het HTML-bestand rechtstreeks
 * in de browser) met een gewone downloadlink.
 */
type Downloads = { save(r: { filename: string; data: Blob }): Promise<unknown> };
type ClaudeVenster = { claude?: { use?: (naam: string) => Promise<unknown> } };

/** Draait de pagina in de weergave van claude.ai? */
export const inClaudeWeergave = () => typeof (window as unknown as ClaudeVenster).claude?.use === 'function';

let downloads: Promise<Downloads | null> | null = null;
function haalDownloads(): Promise<Downloads | null> {
  downloads ??= inClaudeWeergave()
    ? ((window as unknown as ClaudeVenster).claude!.use!('downloads') as Promise<Downloads | null>).catch(() => null)
    : Promise.resolve(null);
  return downloads;
}

/** 'bewaard', 'geweigerd' (de gebruiker zei nee) of 'niet' (niet mogelijk hier). */
export async function bewaarBestand(naam: string, data: Blob): Promise<'bewaard' | 'geweigerd' | 'niet'> {
  const d = await haalDownloads();
  if (d) {
    try {
      await d.save({ filename: naam, data });
      return 'bewaard';
    } catch (fout) {
      return (fout as { code?: string })?.code === 'declined' ? 'geweigerd' : 'niet';
    }
  }
  const a = document.createElement('a');
  a.download = naam;
  a.href = URL.createObjectURL(data);
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  return 'bewaard';
}

/** Data-URL (bv. een foto van de 3D) naar een Blob. */
export async function dataUrlNaarBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}
