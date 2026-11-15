# Funz Online

Explore a big world, build anything, and hang out with your friends, right in the browser.

## What's in it
- **One shared world**: everyone who taps **Play** lands in the same big peaceful island, with their own avatar (color + hat) and name. No codes, no rooms.
- **Chat**: messages show in the chat box and as bubbles over players' heads. There are emotes too.
- **Building**: place wood, stone, brick, glass, floor, path, bushes, lamps and water, or break things with the pickaxe.
- **Big world**: a 256×256 island with forests, meadows, beaches and lakes, a day and night cycle (lamps glow at night), and a minimap.
- **Device detection**: it knows if you're on a phone, tablet or computer (and which kind), shows it next to your name, and gives you the right controls.
- **Installable**: it works as an app on phones and computers, with its own icon.
- **Admin**: the owner gets a ★ name tag and admin tools.

## Controls
| | Computer | Phone / tablet |
|---|---|---|
| Move | WASD or arrow keys (Shift to run) | Joystick |
| Build | Left click (1–0 or the mouse wheel picks a block) | Tap "Build", then tap the ground |
| Break | Right click, or Shift + click | Pick ⛏️, then tap |
| Chat | Enter | 💬 button |

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
- On the menu, tap **Admin**, paste your admin key, and tap **Save key**. Keep the key secret and never put it in this repo!
- In the game you get a ★ name tag, unlimited build reach, Go/Mute/Kick buttons in the player list, and chat commands: `/announce text`, `/kick name`, `/mute name`, `/unmute name`, `/tp name`, `/bring name`, `/players`, `/help`.
- The key is checked with a digital signature, so nobody can fake being the admin even though the code is public.

## Files
- `index.html`, `style.css`: the page and the look
- `js/device.js`: device detection
- `js/world.js`: world generation and blocks
- `js/render.js`: drawing (terrain, players, chat bubbles, night lighting, minimap)
- `js/net.js`: multiplayer
- `js/app.js`: menus, controls, game loop, host rules
- `manifest.webmanifest`, `sw.js`, `icons/`: the installable app parts
