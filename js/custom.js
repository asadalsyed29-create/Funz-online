// Everything you can wear or unlock: colours, ball skins, hats and trails, plus the quests that unlock them.
// lock: nothing = free, { coins: n } = buy it, { quest: id } = finish that quest, { owner: true } = only the owner.
const COLORS = ['#48d6ac', '#5aa9ff', '#ff7a8a', '#ffc45a', '#b48cff', '#ff9f5a', '#e8eef7', '#7be36b',
  '#e0404a', '#2f55d8', '#ff8fd0', '#1fb5b5', '#9a6a42', '#7a3ad6', '#f2e15a', '#8a93a8', '#22262e', '#ffd24a', '#ff3fa8', '#bfeaff'];
COLORS.push('#7a2cff', '#ffe27a', '#a8d8ff', '#cdb4ff');
const COLOR_LOCK = { '#22262e': { coins: 60 }, '#ffd24a': { coins: 60 }, '#ff3fa8': { coins: 60 }, '#bfeaff': { coins: 60 }, '#7a2cff': { coins: 80 }, '#ffe27a': { coins: 80 }, '#a8d8ff': { owner: true }, '#cdb4ff': { owner: true } };

const SKINS = {
  plain: { n: 0, name: 'Plain' }, band: { n: 1, name: 'Band' }, stripes: { n: 2, name: 'Stripes' }, dots: { n: 3, name: 'Dots' },
  split: { n: 4, name: 'Two halves' }, checker: { n: 5, name: 'Checker' },
  swirl: { n: 6, name: 'Swirl', lock: { coins: 30 } }, star: { n: 7, name: 'Star', lock: { coins: 30 } }, zigzag: { n: 16, name: 'Zigzag', lock: { coins: 30 } },
  target: { n: 13, name: 'Target', lock: { coins: 40 } }, candy: { n: 30, name: 'Candy', lock: { coins: 40 } }, flower: { n: 31, name: 'Flower', lock: { coins: 40 } },
  heart: { n: 32, name: 'Heart', lock: { coins: 50 } }, paw: { n: 33, name: 'Paw', lock: { coins: 50 } }, bolt: { n: 34, name: 'Bolt', lock: { coins: 50 } },
  soccer: { n: 9, name: 'Soccer ball', lock: { coins: 80 } }, basketball: { n: 10, name: 'Basketball', lock: { coins: 80 } }, tennis: { n: 11, name: 'Tennis ball', lock: { coins: 80 } },
  marble: { n: 15, name: 'Marble', lock: { coins: 120 } }, storm: { n: 27, name: 'Storm', lock: { coins: 200 } },
  beach: { n: 8, name: 'Beach ball', lock: { quest: 'beach' } }, watermelon: { n: 12, name: 'Watermelon', lock: { quest: 'forest' } },
  sun: { n: 28, name: 'Little sun', lock: { quest: 'desert' } }, ice: { n: 20, name: 'Ice', lock: { quest: 'snow' } },
  galaxy: { n: 22, name: 'Galaxy', lock: { quest: 'crystal' } }, moon: { n: 24, name: 'Moon', lock: { quest: 'caves' } },
  lava: { n: 21, name: 'Lava', lock: { quest: 'volcano' } }, circuit: { n: 26, name: 'Circuit', lock: { quest: 'station' } },
  chrome: { n: 19, name: 'Chrome', lock: { quest: 'stationTop' } }, gold: { n: 18, name: 'Gold', lock: { quest: 'trophy' } },
  disco: { n: 25, name: 'Disco ball', lock: { quest: 'race' } }, pixel: { n: 17, name: 'Pixels', lock: { quest: 'friends' } },
  bubble: { n: 29, name: 'Bubble', lock: { quest: 'sea' } }, planet: { n: 23, name: 'Planet', lock: { quest: 'space' } },
  rainbow: { n: 14, name: 'Rainbow', lock: { quest: 'biomes' } }, flow: { n: 35, name: 'Aurora', lock: { quest: 'explorer' } },
  royal: { n: 36, name: 'Royal', lock: { coins: 300 } }, thunder: { n: 37, name: 'Thunderstorm', lock: { coins: 250 } }, cosmos: { n: 38, name: 'Rainbow cosmos', lock: { coins: 350 } },
  outernautica: { n: 39, name: 'Outernautica dream', lock: { owner: true } },
};
const CLEAR_SKINS = [29]; // drawn with the see-through things

const HATS = {
  none: { name: 'None' }, cap: { name: 'Cap' }, beanie: { name: 'Beanie' }, tophat: { name: 'Top hat' }, flower: { name: 'Flower' }, bow: { name: 'Bow' },
  headphones: { name: 'Headphones', lock: { coins: 40 } }, party: { name: 'Party hat', lock: { coins: 40 } }, chef: { name: 'Chef hat', lock: { coins: 60 } },
  cat: { name: 'Cat ears', lock: { coins: 60 } }, propeller: { name: 'Propeller cap', lock: { quest: 'skyisles' } }, halo: { name: 'Halo', lock: { coins: 100 } },
  wizard: { name: 'Wizard hat', lock: { coins: 120 } }, unicorn: { name: 'Unicorn horn', lock: { coins: 150 } },
  sprout: { name: 'Sprout', lock: { quest: 'forest' } }, cowboy: { name: 'Cowboy hat', lock: { quest: 'desert' } }, winter: { name: 'Winter hat', lock: { quest: 'snow' } },
  viking: { name: 'Viking helmet', lock: { quest: 'mountain' } }, mushroom: { name: 'Mushroom cap', lock: { quest: 'swamp' } }, pirate: { name: 'Pirate hat', lock: { quest: 'chests' } },
  miner: { name: 'Miner helmet', lock: { quest: 'cave' } }, antenna: { name: 'Antenna', lock: { quest: 'station' } }, bunny: { name: 'Bunny ears', lock: { quest: 'friends' } },
  cone: { name: 'Traffic cone', lock: { quest: 'night' } }, grad: { name: 'Scholar cap', lock: { quest: 'ways' } },
  crown: { name: 'Crown', lock: { owner: true } }, stormcloud: { name: 'Storm cloud', lock: { coins: 250 } }, starcrown: { name: 'Star crown', lock: { coins: 300 } },
};

// trail: [shape, colours, size, glow?]  (see Particles for the shapes)
const TRAILS = {
  none: { name: 'None' }, dust: { name: 'Dust' },
  sparkle: { name: 'Sparkles', lock: { coins: 50 } }, hearts: { name: 'Hearts', lock: { coins: 80 } }, notes: { name: 'Confetti', lock: { coins: 100 } }, bolt: { name: 'Lightning', lock: { coins: 150 } },
  bubbles: { name: 'Bubbles', lock: { quest: 'swim' } }, leaves: { name: 'Leaves', lock: { quest: 'forest' } }, snow: { name: 'Snowflakes', lock: { quest: 'snow' } },
  stars: { name: 'Stars', lock: { quest: 'night' } }, fire: { name: 'Fire', lock: { quest: 'volcano' } }, rainbow: { name: 'Rainbow', lock: { quest: 'race' } },
  royal: { name: 'Royal sparkle', lock: { coins: 200 } }, storm: { name: 'Lightning storm', lock: { coins: 250 } },
  pastel: { name: 'Pastel dream', lock: { owner: true } },
};

// Gadgets: things you buy in the shop with coins and things you found, and keep forever. You use one at a time.
const GADGETS = {
  balloon: { name: 'Balloon', desc: 'Jump higher, and hold jump to float down slowly', cost: { coins: 50, feather: 3 } },
  glider: { name: 'Glider', desc: 'Hold jump in the air to glide far', cost: { coins: 80, feather: 5, shell: 2 } },
  spring: { name: 'Pogo spring', desc: 'Super high jumps', cost: { coins: 60, mushroom: 3 } },
  magnet: { name: 'Magnet', desc: 'Grab coins and things from far away', cost: { coins: 70, gem: 2 } },
  lantern: { name: 'Lantern', desc: 'Lights up the night and caves around you', cost: { coins: 40, crystal: 2 } },
  jets: { name: 'Turbo jets', desc: 'Roll much faster', cost: { coins: 90, pepper: 2 } },
  snorkel: { name: 'Snorkel', desc: 'Hold the down button (Shift) in water to dive, and swim faster', cost: { coins: 50, pearl: 2 } },
};

// Owner gadgets: only the owner has these, and can use lots at once
const OWNER_GADGETS = {
  ship: { name: 'Owner ship', desc: 'Press V (or the ship button) to call your ship, jump in and fly it from the cockpit' },
  legs: { name: 'Robo legs', desc: 'Four robot legs and a robot arm' },
};

// Quests: stat is counted by the game; when it reaches goal you get the coins and anything locked behind the quest.
const QUESTS = [
  { id: 'roll', name: 'First roll', desc: 'Roll 300 metres', stat: 'dist', goal: 300, coins: 20 },
  { id: 'far', name: 'World traveller', desc: 'Roll 10 kilometres', stat: 'dist', goal: 10000, coins: 100 },
  { id: 'jump', name: 'Bouncy', desc: 'Jump 50 times', stat: 'jumps', goal: 50, coins: 20 },
  { id: 'swim', name: 'Splash!', desc: 'Swim 200 metres', stat: 'swim', goal: 200, coins: 40 },
  { id: 'items', name: 'Collector', desc: 'Pick up 25 things', stat: 'items', goal: 25, coins: 50 },
  { id: 'chests', name: 'Treasure hunter', desc: 'Open 5 treasure chests', stat: 'chests', goal: 5, coins: 60 },
  { id: 'beach', name: 'Beach day', desc: 'Find a beach', stat: 'b1', goal: 1, coins: 20 },
  { id: 'forest', name: 'Into the woods', desc: 'Find a forest', stat: 'b3', goal: 1, coins: 20 },
  { id: 'desert', name: 'Hot sand', desc: 'Find a desert', stat: 'b4', goal: 1, coins: 30 },
  { id: 'snow', name: 'Brrr!', desc: 'Find a snowland', stat: 'b5', goal: 1, coins: 30 },
  { id: 'mountain', name: 'Mountaineer', desc: 'Find the mountains', stat: 'b6', goal: 1, coins: 30 },
  { id: 'swamp', name: 'Squelch', desc: 'Find a swamp', stat: 'b7', goal: 1, coins: 30 },
  { id: 'glow', name: 'Glow in the dark', desc: 'Find the glow fields', stat: 'b8', goal: 1, coins: 40 },
  { id: 'biomes', name: 'Seen it all', desc: 'Find 8 different kinds of land', stat: 'biomes', goal: 8, coins: 100 },
  { id: 'station', name: 'The giant ball', desc: 'Reach the abandoned station', stat: 'station', goal: 1, coins: 50 },
  { id: 'stationTop', name: 'Top of the station', desc: 'Find the star at the top of the station', stat: 'star', goal: 1, coins: 80 },
  { id: 'cave', name: 'Going down', desc: 'Explore a cave', stat: 'caves', goal: 1, coins: 30 },
  { id: 'caves', name: 'Cave expert', desc: 'Explore 4 different caves', stat: 'caves', goal: 4, coins: 80 },
  { id: 'volcano', name: 'Hot stuff', desc: 'Find the volcano', stat: 'volcano', goal: 1, coins: 80 },
  { id: 'places', name: 'Explorer', desc: 'Discover 10 places', stat: 'places', goal: 10, coins: 60 },
  { id: 'explorer', name: 'Great explorer', desc: 'Discover 40 places', stat: 'places', goal: 40, coins: 200 },
  { id: 'kinds', name: 'Sightseer', desc: 'Discover 12 different kinds of places', stat: 'kinds', goal: 12, coins: 120 },
  { id: 'ways', name: 'Pathfinder', desc: 'Wake up 5 waystones', stat: 'ways', goal: 5, coins: 60 },
  { id: 'trophy', name: 'Parkour champion', desc: 'Get the trophy at the top of the parkour climb', stat: 'trophy', goal: 1, coins: 80 },
  { id: 'race', name: 'Ring racer', desc: 'Finish the ring race', stat: 'races', goal: 1, coins: 60 },
  { id: 'night', name: 'Night owl', desc: 'Stay out for a whole night', stat: 'nights', goal: 1, coins: 30 },
  { id: 'friends', name: 'Animal friend', desc: 'Get close enough to touch 5 creatures', stat: 'touched', goal: 5, coins: 40 },
  { id: 'space', name: 'Into space', desc: 'Ride the space elevator next to the station', stat: 'realm_space', goal: 1, coins: 80 },
  { id: 'sea', name: 'Deep diver', desc: 'Dive into the Coral kingdom', stat: 'realm_sea', goal: 1, coins: 80 },
  { id: 'crystal', name: 'Crystal miner', desc: 'Find the Crystal hollow', stat: 'realm_crystal', goal: 1, coins: 80 },
  { id: 'skyisles', name: 'Cannonball!', desc: 'Get shot out of a cannon', stat: 'cannons', goal: 1, coins: 30 },
  { id: 'skykey', name: 'Key in the clouds', desc: 'Find the sky key on the last sky island', stat: 'skykey', goal: 1, coins: 100 },
  { id: 'hello', name: 'Say hi', desc: 'Use an emote', stat: 'emotes', goal: 1, coins: 10 },
  { id: 'high', name: 'Sky high', desc: 'Get 120 metres above the sea', stat: 'high', goal: 120, coins: 50 },
];

// Keeps your coins, quest progress and unlocked things on this device.
class Progress {
  constructor(store) {
    this.store = store;
    const d = store.json('progress', {});
    this.coins = d.coins | 0; this.stats = d.stats || {}; this.sets = d.sets || {}; this.done = d.done || {}; this.own = d.own || {};
    // coins and bought things carry a check, so editing the saved numbers by hand doesn't work
    if (d.k == null) { if (d.coins != null) { this.coins = Math.max(0, Math.min(this.coins, 3000)); this.dirty = true; } }
    else if (d.k !== Progress.sum(this.coins, this.own, this.done)) { this.coins = 0; this.own = {}; this.dirty = true; }
    this.onQuest = null; if (!this.dirty) this.dirty = false;
    setInterval(() => this.save(), 5000);
  }
  static sum(coins, own, done) {
    const t = 'fz|' + (coins | 0) + '|' + JSON.stringify(own || {}) + '|' + Object.keys(done || {}).sort().join(',');
    let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; h ^= h >>> 13; }
    return h.toString(36);
  }
  save() { if (!this.dirty) return; this.dirty = false; this.store.set('progress', JSON.stringify({ coins: this.coins, stats: this.stats, sets: this.sets, done: this.done, own: this.own, k: Progress.sum(this.coins, this.own, this.done) })); }
  add(stat, n = 1) { this.stats[stat] = (this.stats[stat] || 0) + n; this.dirty = true; }
  max(stat, v) { if (v > (this.stats[stat] || 0)) { this.stats[stat] = v; this.dirty = true; } }
  // remember something found once (a place, a chest...). true if it is new
  mark(set, key) { const s = this.sets[set] || (this.sets[set] = {}); if (s[key]) return false; s[key] = 1; this.dirty = true; return true; }
  has(set, key) { return !!(this.sets[set] && this.sets[set][key]); }
  count(set) { return this.sets[set] ? Object.keys(this.sets[set]).length : 0; }
  give(n) { this.coins += n; this.dirty = true; }
  value(q) { return q.stat === 'biomes' || q.stat === 'places' || q.stat === 'kinds' || q.stat === 'ways' || q.stat === 'chests' ? this.count(q.stat) : (this.stats[q.stat] || 0); }
  // returns the quests that were just finished
  check() {
    const out = [];
    for (const q of QUESTS) if (!this.done[q.id] && this.value(q) >= q.goal) { this.done[q.id] = 1; this.coins += q.coins; this.dirty = true; out.push(q); }
    return out;
  }
  unlocks(questId) { // what a quest unlocks, as words
    const out = [];
    for (const [k, v] of Object.entries(SKINS)) if (v.lock && v.lock.quest === questId) out.push(v.name + ' skin');
    for (const [k, v] of Object.entries(HATS)) if (v.lock && v.lock.quest === questId) out.push(v.name);
    for (const [k, v] of Object.entries(TRAILS)) if (v.lock && v.lock.quest === questId) out.push(v.name + ' trail');
    return out;
  }
  ownsGadget(id, owner) { return !!owner || !!(this.own.gadget || {})[id]; }
  // what's missing to make a gadget (empty list = you can make it)
  missing(id, inv) { const c = GADGETS[id].cost, out = []; for (const [k, n] of Object.entries(c)) { const have = k === 'coins' ? this.coins : (inv[k] || 0); if (have < n) out.push((n - have) + ' more ' + (k === 'coins' ? 'coins' : (ITEMS[k] ? ITEMS[k].name.toLowerCase() + (n - have > 1 ? 's' : '') : k))); } return out; }
  craft(id, inv) { if (this.missing(id, inv).length) return false; for (const [k, n] of Object.entries(GADGETS[id].cost)) { if (k === 'coins') this.coins -= n; else { inv[k] -= n; if (!inv[k]) delete inv[k]; } } (this.own.gadget || (this.own.gadget = {}))[id] = 1; this.dirty = true; this.save(); return true; }
  lockOf(kind, id) { return kind === 'color' || kind === 'color2' ? COLOR_LOCK[id] : ((kind === 'skin' ? SKINS : kind === 'hat' ? HATS : TRAILS)[id] || {}).lock; }
  // can this be worn? owner = has the owner pass
  owns(kind, id, owner) {
    const lock = this.lockOf(kind, id); if (!lock || owner) return true; // the owner has everything
    if (lock.owner) return !!owner;
    if (lock.quest) return !!this.done[lock.quest];
    return !!(this.own[kind === 'color2' ? 'color' : kind] || {})[id];
  }
  buy(kind, id) {
    const lock = this.lockOf(kind, id), k = kind === 'color2' ? 'color' : kind; if (!lock || !lock.coins || this.coins < lock.coins) return false;
    this.coins -= lock.coins; (this.own[k] || (this.own[k] = {}))[id] = 1; this.dirty = true; this.save(); return true;
  }
}

// is this one of the special owner-only things?
const ownerOnly = (kind, id) => { const l = kind === 'color' || kind === 'color2' ? COLOR_LOCK[id] : ((kind === 'skin' ? SKINS : kind === 'hat' ? HATS : TRAILS)[id] || {}).lock; return !!(l && l.owner); };
