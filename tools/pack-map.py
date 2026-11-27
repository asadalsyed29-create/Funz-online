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
