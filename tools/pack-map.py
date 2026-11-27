# Turns map/<file>.raw (from bake-map.js) into map/<file>.jpg, the picture the game loads.
# python3 tools/pack-map.py            (Berekor: world)
# python3 tools/pack-map.py dustmaw    (a travel region)
import os
from PIL import Image
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
import json, sys
file = sys.argv[1] if len(sys.argv) > 1 else 'world'
size = json.load(open(os.path.join(root, 'map/' + file + '.json')))['size']
im = Image.frombytes('RGB', (size, size), open(os.path.join(root, 'map/' + file + '.raw'), 'rb').read())
im.save(os.path.join(root, 'map/' + file + '.jpg'), quality=88, optimize=True, progressive=True)
os.remove(os.path.join(root, 'map/' + file + '.raw'))
# the drawn map (half size, saved as png so the ink lines stay sharp)
dp = os.path.join(root, 'map/' + file + '-d.raw')
if os.path.exists(dp):
  im = Image.frombytes('RGB', (size // 2, size // 2), open(dp, 'rb').read())
  im.quantize(colors=96, dither=Image.Dither.NONE).save(os.path.join(root, 'map/' + file + '-d.png'), optimize=True)
  os.remove(dp)
