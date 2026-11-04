# Ontruiser voor de fotomodus op WebGPU

| Bestand | Wat | Bron | Licentie |
|---|---|---|---|
| `rt_hdr_alb_nrm_small.tza` | Gewichten van Open Image Denoise (HDR-kleur met albedo en normaal, kleine versie, 641 kB) | https://github.com/pissang/oidn-webgpu/tree/main/weights (uit https://github.com/RenderKit/oidn-weights) | Apache 2.0, zie `LICENSE.txt` |

Ingesloten in de HTML door `bouw.mjs` (`window.__ONTRUISER`, base64) en gelezen zonder fetch in
`src/fotomodus-webgpu.ts`. De code van `oidn-webgpu` is MIT. Grotere gewichten (`rt_hdr_alb_nrm.tza`) geven een
iets beter beeld, maar maken de pagina groter.
