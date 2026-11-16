# Funz Online

Explore a big world, build anything, and hang out with your friends, right in the browser.

## What's in it
- **A massive world**: 16 km across, made from a seed, with oceans, beaches, grasslands, forests, deserts, snowlands, mountains, swamps and glowing fields. Smooth hills, soft blends between lands, and painted-on textures (grass, sand ripples, sparkly snow, rock layers). Fluffy cartoon trees, cherry blossoms, birches, willows, palms, cacti, glowing mushrooms, crystals, coral and seaweed under the sea.
- **A real sky**: day, sunsets and starry nights, plus weather that changes from place to place, with real kinds of clouds (cumulus, congestus, cumulonimbus with anvils, stratus, stratocumulus, altocumulus, cirrus, nimbostratus and lenticular clouds over mountains). Rain, lightning and thunder in stormy places.
- **You're a rolling ball**: dress it up in the **wardrobe** with skins (stripes, soccer ball, galaxy, lava, disco ball, planet...), two colors, 25 hats and 12 trails. Some are free, some cost coins, and some unlock by finishing quests.
- **Quests and coins**: 30 quests (explore every land, reach the station, swim, build, race...). Finishing one gives coins and can unlock new things to wear. Find coins all over the world.
- **Your name is yours**: once someone takes a name, nobody else can use it (each device has its own secret key that proves the name is theirs).
- **Music and sounds**: calm music made in the browser that changes with where you are (meadow, forest, beach, desert, snow, caves, the station, night) and fun sound effects. The music button turns it off.
- **The abandoned station**: one giant ball half buried in the ground. Roll in through the door, climb the spiral ramp around the glowing core, and find relics on every deck. Nobody can build on it, in it, or break it.
- **Caves**: roll into a cave entrance to drop into an underground level with crystals, gems and glowing beetles. The gold ring takes you back up.
- **Structures to discover**: ruins, stone circles, villages, watchtowers, giant trees, cabins, pyramids, crashed pods, igloos, frozen towers, swamp huts, crystal arches, mushroom rings, shipwrecks and lighthouses.
- **Creatures**: animated hoppers, antlerbucks, foxes, sand crabs, beach turtles, sun lizards, snowpuffs, bog blobs, frogs, cliff goats, glowmoths, butterflies, fish and birds. They walk, hop, flap, wag their tails, blink and run off if you come close.
- **Things to do**: collect items for your inventory (and use them for powers), race through 12 rings, and beat the parkour climb with checkpoints.
- **Build tab**: blocks, ramps and slabs; **machines** (jump pads, speed pads, teleporters, spawn points, bouncy blocks, fans); and **circuits** for making your own machines: buttons, levers, pressure plates, sensors, clocks, inverters, delays, lamps, doors, lifts and sliders, all joined with the **wire tool**. Link two teleporters by wiring them together.
- **Protected spawn**: only the admin can build or break at the spawn plaza and the parkour.
- **Chat and emotes**, with bubbles over players' heads.
- **Device detection**: phones and tablets get a joystick and buttons (landscape mode only), and computers get WASD and the mouse.
- **Installable**: it works as an app with its own icon.
- **Special items**: the crown and the name Outernautica belong only to the owner (the admin).

## Controls
| | Computer | Phone / tablet |
|---|---|---|
| Roll | WASD or arrow keys | Joystick |
| Jump | Space | Jump button |
| Look around | Drag the mouse, Q and E, wheel to zoom | Drag the screen |
| Build | Left click (1–0 or - and = pick, Tab switches Blocks/Machines/Circuits) | Tap "Build", then tap |
| Break | Right click, or Shift + click | Pick the pickaxe, then tap |
| Wire | Pick the wire tool, click one part, then another | Same, with taps |
| Inventory and quests | I | Bag button |
| Wardrobe | O | Shirt button |
| Music on or off | M | Music button |
| Back to spawn | R | Flag button |
| Chat | Enter | Chat button |

## Putting it online (GitHub Pages)
1. Open the repo **Settings → Pages**.
2. Under "Branch", pick `main` and `/ (root)`, then click **Save**.
3. After a minute the game is live at `https://asadalsyed29-create.github.io/Funz-online/`.

It needs to be on `https://` to be installable.

## How the world stays online
There's no paid server. The first person online quietly runs the world for everyone (they're the "keeper"), and everyone else connects to them using [PeerJS](https://peerjs.com/) (WebRTC).
- If the keeper leaves, another player takes over automatically within a few seconds.
- Builds are saved in every player's browser, so when someone comes back, the world comes back with their builds.
- If nobody is online, the world is "asleep" until the next person taps Play.

## Admin
The owner unlocks the crown and the name **Outernautica** once with a secret link. They stay in the owner's wardrobe forever and nobody else can pick them. Whoever owns them is the admin: a ★ name tag, flying (F), unlimited build reach, and an admin panel with Go to, Bring, Freeze, Mute, Make them say, Kick and Ban, and chat commands: `/announce text`, `/kick name`, `/mute name`, `/unmute name`, `/tp name`, `/bring name`, `/players`, `/help`. The unlock is checked with a digital signature, so nobody can fake it even though the code is public.

## Files
- `index.html`, `style.css`: the page and the look
- `js/gl.js`: a small WebGL 3D engine
- `js/terrain.js`: the world's height, biomes, chunks, trees and plants
- `js/structures.js`: the plaza, parkour, ring race, structures, caves and the station
- `js/parts.js`: blocks, machines, circuits and wires
- `js/models.js`: balls, hats, items and creatures
- `js/game.js`: physics, camera, creatures, building and drawing
- `js/net.js`: multiplayer
- `js/app.js`: menus, controls, game loop, items, race and admin
- `js/icons.js`, `js/device.js`: drawn icons and device detection
- `manifest.webmanifest`, `sw.js`, `icons/`: the installable app parts
