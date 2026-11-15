"""
Legt een 3D-bestand (GLB) over de productfoto's: de omtrek van het model als lijn op de foto, plus het model in grijs
vanuit hetzelfde standpunt. Zo zie je in één oogopslag waar de vorm afwijkt, in plaats van op het oog te schatten.

Gebruik:
    python overlay.py <model.glb> <map met foto's> <cameras.json> <uitmap> [naam ...]

cameras.json (zie cameras-sullivan.json):
    { "hart_achter_voorkant": 31,          afstand in cm van de voorkant van het model tot het punt waar de camera's om draaien
      "fotos": { "<naam>": { "bestand": "foto.jpg", "F": 1600, "D": 312, "h": 85, "az": -5.5, "doel": [x, y, z] } } }
  F     brandpunt in fotopixels (1600 px op een foto van 1100 px breed = een lens van ±52 mm);
  D, h  afstand tot het draaipunt en hoogte van de camera in cm;
  az    richting in graden: 0 = recht van voren, -90 = van opzij met de rug links, -135 = schuin van achter;
  doel  het punt in het midden van de foto, in cm in de assen van het model (x = breedte, y = naar achter, z = hoogte).

De camera vind je uit het onderstel (zie LEESMIJ.md): de poten staan op een bekend vierkant, dus uit hoe ver de voorste
en de achterste poten uit elkaar staan volgt de afstand, en uit hun hoogteverschil in beeld de hoogte van de camera.

Vraagt naast Blender (bpy) ook opencv-python-headless.
"""
import json
import math
import os
import sys

import bpy
import cv2
import numpy as np
from mathutils import Vector

glb, fotomap, camerabestand, uit = sys.argv[1:5]
instelling = json.load(open(camerabestand))
kies = sys.argv[5:] or list(instelling['fotos'])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
delen = [o for o in bpy.data.objects if o.type == 'MESH']
voorkant = min((o.matrix_world @ Vector(c)).y for o in delen for c in o.bound_box)
hart_y = voorkant + instelling.get('hart_achter_voorkant', 0) / 100


def materiaal(naam, kleur):
    m = bpy.data.materials.new(naam)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*kleur, 1)
    b.inputs['Roughness'].default_value = 1.0
    return m


KLEUR = {True: materiaal('hout_kleur', (0.1, 0.25, 0.9)), False: materiaal('stof_kleur', (0.9, 0.75, 0.1))}
GRIJS = {True: materiaal('hout_grijs', (0.02, 0.02, 0.02)), False: materiaal('stof_grijs', (0.22, 0.24, 0.21))}
is_hout = {o.name: 'poot' in o.name for o in delen}
for o in delen:
    o.data.materials.clear()
    o.data.materials.append(KLEUR[is_hout[o.name]])

sc = bpy.context.scene
sc.world = bpy.data.worlds.new('wereld')
sc.world.use_nodes = True
sc.world.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 1, 1, 1)
sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
zon = bpy.data.lights.new('zon', 'SUN')
zon.energy, zon.angle = 2.2, math.radians(50)
zon_ob = bpy.data.objects.new('zon', zon)
sc.collection.objects.link(zon_ob)
cam_d = bpy.data.cameras.new('camera')
cam = bpy.data.objects.new('camera', cam_d)
sc.collection.objects.link(cam)
sc.camera = cam
cam_d.sensor_fit, cam_d.sensor_width = 'HORIZONTAL', 36
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.use_denoising = False
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
os.makedirs(uit, exist_ok=True)

for naam in kies:
    c = instelling['fotos'][naam]
    foto = cv2.imread(os.path.join(fotomap, c['bestand']))
    hoog, breed = foto.shape[:2]
    sc.render.resolution_x, sc.render.resolution_y = breed, hoog
    a = math.radians(c['az'])
    cam_d.lens = c['F'] / breed * 36
    cam.location = Vector((c['D'] / 100 * math.sin(a), hart_y - c['D'] / 100 * math.cos(a), c['h'] / 100))
    doel = Vector((c['doel'][0] / 100, hart_y + c['doel'][1] / 100, c['doel'][2] / 100))
    cam.rotation_euler = (doel - cam.location).to_track_quat('-Z', 'Y').to_euler()

    # 1. Egale kleuren, om de omtrek van bekleding en onderstel te vinden.
    zon_ob.rotation_euler = cam.rotation_euler
    sc.cycles.samples = 6
    pad = os.path.join(uit, f'kleur-{naam}.png')
    sc.render.filepath = pad
    bpy.ops.render.render(write_still=True)
    r = cv2.imread(pad, cv2.IMREAD_UNCHANGED)
    alles = (r[..., 3] > 127).astype(np.uint8)
    stof = ((r[..., 3] > 127) & (r[..., 2] > r[..., 0])).astype(np.uint8)      # BGR: geel = bekleding
    lijn = foto.copy()
    for masker, kleur in ((alles, (255, 200, 0)), (stof, (0, 255, 255))):
        omtrek, _ = cv2.findContours(masker, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
        cv2.drawContours(lijn, omtrek, -1, kleur, 1)
    cv2.imwrite(os.path.join(uit, f'lijn-{naam}.jpg'), lijn, [cv2.IMWRITE_JPEG_QUALITY, 88])

    # 2. Grijs met zacht zijlicht, om de vorm naast de foto te beoordelen.
    for o in delen:
        o.data.materials[0] = GRIJS[is_hout[o.name]]
    zon_ob.rotation_euler = (math.radians(55), 0, a + math.radians(-60))
    sc.cycles.samples = 24
    sc.render.filepath = os.path.join(uit, f'grijs-{naam}.png')
    bpy.ops.render.render(write_still=True)
    for o in delen:
        o.data.materials[0] = KLEUR[is_hout[o.name]]
    print('klaar', naam)
