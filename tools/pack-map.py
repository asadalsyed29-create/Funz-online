# Turns map/world.raw (from bake-map.js) into map/world.jpg, the picture the game loads.
import os
from PIL import Image
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
import json
size = json.load(open(os.path.join(root, 'map/world.json')))['size']
im = Image.frombytes('RGB', (size, size), open(os.path.join(root, 'map/world.raw'), 'rb').read())
im.save(os.path.join(root, 'map/world.jpg'), quality=88, optimize=True, progressive=True)
os.remove(os.path.join(root, 'map/world.raw'))
