"""Marigold IID Appearance (offline, CPU): basiskleur (albedo) zonder ingebakken licht uit een productfoto.
Gebruik: python -I marigold_iid.py <invoer.png> <uitmap>"""
import sys, time, torch
from PIL import Image
from diffusers import MarigoldIntrinsicsPipeline
invoer, uit = sys.argv[1], sys.argv[2]
torch.set_num_threads(4)
pipe = MarigoldIntrinsicsPipeline.from_pretrained('prs-eth/marigold-iid-appearance-v1-1', torch_dtype=torch.float32, use_safetensors=True)
beeld = Image.open(invoer).convert('RGB')
t = time.time()
r = pipe(beeld, num_inference_steps=4, processing_resolution=512, ensemble_size=1)
vis = pipe.image_processor.visualize_intrinsics(r.prediction, pipe.target_properties)
naam = invoer.rsplit('/', 1)[-1].rsplit('.', 1)[0]
for k, im in vis[0].items():
    im.save(f'{uit}/{naam}-{k}.png')
print(naam, 'klaar in', round(time.time() - t), 's, kaarten:', list(vis[0].keys()))
