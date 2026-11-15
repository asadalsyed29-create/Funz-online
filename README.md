# Funz Online

Explore a big world, build anything, and hang out with your friends, right in the browser.

## What's in it
- **One big 3D world**: everyone who taps **Play** rolls into the same peaceful voxel island with forests, beaches, lakes, mountains, a day and night cycle, and a minimap.
- **You're a rolling ball**: pick a color and a hat, and your hat rolls along with you. Jump, splash around in the water, and drag to look around.
- **Things to do**: find items (shells on beaches, mushrooms in forests, feathers in meadows, crystals on mountains, coins anywhere), race through 12 rings for the record board, and climb the parkour tower for a trophy.
- **Inventory**: use items for powers like speed, growing big, super jumps and glowing in the dark.
- **Build tab**: blocks (wood, stone, brick, glass, leaves, lamps, planks, white, dark) and **machines**: jump pads, speed pads, teleporters in 4 colors (place two of the same color to link them), spawn points and bouncy blocks.
- **Chat and emotes**, with bubbles over players' heads.
- **Device detection**: phones and tablets get a joystick and a jump button, and computers get WASD and the mouse.
- **Installable**: it works as an app with its own icon.
- **Special items**: the crown and the name Outernautica belong only to the owner (the admin).

## Controls
| | Computer | Phone / tablet |
|---|---|---|
| Roll | WASD or arrow keys | Joystick |
| Jump | Space | Jump button |
| Look around | Drag the mouse, Q and E, wheel to zoom | Drag the screen |
| Build | Left click (1–0 picks, Tab switches Blocks/Machines) | Tap "Build", then tap |
| Break | Right click, or Shift + click | Pick the pickaxe, then tap |
| Inventory | I | Bag button |
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
- `js/gl.js`: a tiny WebGL 3D engine
- `js/world3d.js`: the island, blocks, machines, items, rings and tower
- `js/mesher.js`: turns the world into 3D meshes, plus ball, hat and item models
- `js/game3d.js`: rolling-ball physics, camera, building and drawing
- `js/net.js`: multiplayer
- `js/app.js`: menus, controls, game loop, items, race and admin
- `js/icons.js`, `js/device.js`: drawn icons and device detection
- `manifest.webmanifest`, `sw.js`, `icons/`: the installable app parts
