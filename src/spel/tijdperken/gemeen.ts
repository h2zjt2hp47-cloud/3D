// Gedeeld door de tijdperken: de gebieden van nu en de richtingen waar machten van buiten binnenkomen.
export const BELGIE = ['West-Vlaanderen', 'Oost-Vlaanderen', 'Antwerpen', 'Vlaams-Brabant', 'Brussel', 'Waals-Brabant', 'Henegouwen', 'Namen', 'Luik', 'Limburg', 'Luxemburg'];
export const FRANS = ['Frans-Vlaanderen en Henegouwen', 'Artesië', 'Aisne', 'Franse Ardennen'];
export const NEDERLANDS = ['Zeeuws-Vlaanderen', 'Nederlands-Limburg'];
export const GROOTHERTOGDOM = ['Groothertogdom Luxemburg'];

/** [breedte, lengte] van waar legers van buiten komen */
export const RICHTING = {
  oost: [50.8, 6.5] as [number, number],
  zuidoost: [49.5, 6.4] as [number, number],
  zuid: [49.0, 3.6] as [number, number],
  zuidwest: [50.2, 1.6] as [number, number],
  zee: [51.2, 2.6] as [number, number],
  noord: [51.5, 4.6] as [number, number],
};

/** plaatsen, om kernen en legers te leggen [breedte, lengte] (benadering) */
export const P = {
  doornik: [50.61, 3.39], kamerijk: [50.18, 3.23], soissons: [49.38, 3.32], laon: [49.56, 3.62], reims: [49.3, 4.03],
  keulen: [50.94, 6.96], maastricht: [50.85, 5.69], luik: [50.64, 5.57], hoei: [50.52, 5.24], namen: [50.46, 4.87],
  luxemburg: [49.61, 6.13], aarlen: [49.68, 5.82], bastenaken: [50.0, 5.72], brugge: [51.21, 3.22], gent: [51.05, 3.72],
  ieper: [50.85, 2.89], kortrijk: [50.83, 3.27], rijsel: [50.63, 3.06], atrecht: [50.29, 2.78], sintomaars: [50.75, 2.25],
  boulogne: [50.73, 1.61], kales: [50.95, 1.86], bergen: [50.45, 3.95], valencijn: [50.36, 3.52], leuven: [50.88, 4.7],
  brussel: [50.85, 4.35], antwerpen: [51.22, 4.4], mechelen: [51.03, 4.48], tongeren: [50.78, 5.46], hasselt: [50.93, 5.34],
  borgloon: [50.8, 5.34], limbourg: [50.61, 5.94], herstal: [50.66, 5.62], bouillon: [49.79, 5.07], dinant: [50.26, 4.91],
  charleroi: [50.41, 4.44], sedan: [49.7, 4.94], charleville: [49.76, 4.73], saintquentin: [49.85, 3.29], turnhout: [51.32, 4.95],
  venlo: [51.37, 6.17], roermond: [51.19, 5.99], terneuzen: [51.34, 3.83], duinkerke: [51.03, 2.38], oostende: [51.22, 2.93],
  ieperfront: [50.95, 2.75], waterloo: [50.68, 4.41], ligny: [50.51, 4.58], fleurus: [50.48, 4.55], ramillies: [50.64, 4.91],
  fontenoy: [50.57, 3.47], turnhoutslag: [51.32, 4.95], jemappes: [50.45, 3.88], neerwinden: [50.76, 5.03], oudenaarde: [50.85, 3.6],
  malplaquet: [50.33, 3.86], kortrijkslag: [50.83, 3.27], tertry: [49.87, 3.07], eupen: [50.63, 6.03], malmedy: [50.43, 6.03],
} satisfies Record<string, [number, number]> as Record<string, [number, number]>;
