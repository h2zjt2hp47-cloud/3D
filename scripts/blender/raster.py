# python3 -I raster.py <foto> <uit.jpg> x0,y0,x1,y1 [zoom] : uitsnede met een raster in fotopixels (lijn per 10 px, getal per 50 px).
import sys
from PIL import Image, ImageDraw
im = Image.open(sys.argv[1]).convert('RGB'); x0, y0, x1, y1 = [int(v) for v in sys.argv[3].split(',')]
z = float(sys.argv[4]) if len(sys.argv) > 4 else 3
c = im.crop((x0, y0, x1, y1)); c = c.resize((int(c.size[0] * z), int(c.size[1] * z)), Image.LANCZOS)
d = ImageDraw.Draw(c, 'RGBA')
for x in range((x0 // 10 + 1) * 10, x1, 10):
    d.line([((x - x0) * z, 0), ((x - x0) * z, c.size[1])], fill=(255, 255, 0, 150 if x % 50 == 0 else 55), width=1)
    if x % 50 == 0: d.text(((x - x0) * z + 2, 2), str(x), fill=(255, 255, 0, 255))
for y in range((y0 // 10 + 1) * 10, y1, 10):
    d.line([(0, (y - y0) * z), (c.size[0], (y - y0) * z)], fill=(0, 255, 255, 150 if y % 50 == 0 else 55), width=1)
    if y % 50 == 0: d.text((2, (y - y0) * z + 2), str(y), fill=(0, 255, 255, 255))
c.save(sys.argv[2], quality=88); print(sys.argv[2], c.size)
