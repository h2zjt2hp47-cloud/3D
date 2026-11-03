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

/**
 * Data-URL (bv. een foto van de 3D) naar een Blob, zelf gedecodeerd: `fetch(dataUrl)` mag niet in de
 * weergave op claude.ai ("Failed to fetch").
 */
export function dataUrlNaarBlob(url: string): Blob {
  const komma = url.indexOf(',');
  const kop = url.slice(0, komma);
  const type = /^data:([^;,]+)/.exec(kop)?.[1] ?? 'application/octet-stream';
  const ruw = kop.includes(';base64') ? atob(url.slice(komma + 1)) : decodeURIComponent(url.slice(komma + 1));
  const bytes = new Uint8Array(ruw.length);
  for (let i = 0; i < ruw.length; i++) bytes[i] = ruw.charCodeAt(i);
  return new Blob([bytes], { type });
}
