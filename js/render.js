// Drawing: terrain chunks (cached), blocks, players, chat bubbles, day/night, minimap.
const GROUND_COLORS = ['#1d4f8a', '#2c74b8', '#e2cf95', '#5fb35a', '#3f8a46', '#7cc46a'];
const CHUNK = 16;

class Renderer {
  constructor(canvas, world) {
    this.c = canvas; this.g = canvas.getContext('2d');
    this.world = world;
    this.chunks = new Map(); this.order = [];
    this.light = document.createElement('canvas');
    this.mini = document.createElement('canvas'); this.mini.width = this.mini.height = WORLD;
    this.drawMinimapBase();
    this.cam = { x: 0, y: 0, z: 1 };
    this.resize();
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr; this.w = innerWidth; this.h = innerHeight;
    this.c.width = this.w * dpr; this.c.height = this.h * dpr;
    this.light.width = this.c.width; this.light.height = this.c.height;
    this.cam.z = Math.max(0.75, Math.min(1.4, Math.min(this.w, this.h) / 640));
  }

  // ---------- terrain ----------
  tileNoise(x, y) { return this.world.hash(x, y, 7); }
  drawTile(g, x, y, px, py) {
    const W = this.world, gr = W.groundAt(x, y), n = this.tileNoise(x, y);
    g.fillStyle = GROUND_COLORS[gr]; g.fillRect(px, py, TILE, TILE);
    if (gr >= 3) { // grass texture
      g.fillStyle = 'rgba(0,0,0,.06)';
      for (let i = 0; i < 3; i++) { const a = this.world.hash(x, y, 30 + i); g.fillRect(px + a * 28, py + ((a * 97) % 1) * 28, 2, 4); }
    } else if (gr <= 1) {
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(px + n * 20, py + 10 + n * 10, 10, 2);
    }
    // soft shore edges
    if (gr >= 2) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (W.groundAt(x + dx, y + dy) <= 1) {
        g.fillStyle = 'rgba(255,255,255,.25)';
        if (dx === 1) g.fillRect(px + TILE - 3, py, 3, TILE); if (dx === -1) g.fillRect(px, py, 3, TILE);
        if (dy === 1) g.fillRect(px, py + TILE - 3, TILE, 3); if (dy === -1) g.fillRect(px, py, TILE, 3);
      }
    }
    const o = W.objAt(x, y);
    if (o) this.drawObj(g, o, px, py, x, y);
  }
  drawObj(g, o, px, py, x, y) {
    const n = this.tileNoise(x, y), T = TILE;
    if (o === 20) { // tree
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(px + 17, py + 24, 13, 6, 0, 0, 7); g.fill();
      g.fillStyle = '#6b4a2b'; g.fillRect(px + 13, py + 16, 6, 12);
      g.fillStyle = n > .5 ? '#2f7a3a' : '#2a6d35'; g.beginPath(); g.arc(px + 16, py + 13, 13, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(px + 12, py + 9, 6, 0, 7); g.fill();
    } else if (o === 21) {
      g.fillStyle = '#7d828c'; g.beginPath(); g.ellipse(px + 16, py + 19, 12, 9, 0, 0, 7); g.fill();
      g.fillStyle = '#a3a8b1'; g.beginPath(); g.ellipse(px + 13, py + 16, 6, 4, 0, 0, 7); g.fill();
    } else if (o === 22) {
      const cols = ['#ff8fb1', '#ffe066', '#ffffff', '#b28dff'];
      for (let i = 0; i < 3; i++) { const a = this.world.hash(x, y, 40 + i); g.fillStyle = cols[Math.floor(a * 4)]; g.beginPath(); g.arc(px + 6 + a * 20, py + 6 + ((a * 53) % 1) * 20, 3, 0, 7); g.fill(); }
    } else {
      const b = BLOCKS[o]; if (!b) return;
      if (o === 7 || o === 9) { g.fillStyle = b.color; g.fillRect(px, py, T, T); g.fillStyle = 'rgba(0,0,0,.08)';
        if (o === 9) { g.fillRect(px, py + 10, T, 1); g.fillRect(px, py + 21, T, 1); } else g.fillRect(px + n * 20, py + n * 24, 6, 3); return; }
      g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(px + 3, py + 5, T, T - 2);
      g.fillStyle = b.color; g.fillRect(px, py, T, T);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(px, py, T, 4);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(px, py + T - 4, T, 4);
      if (o === 1) { g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(px, py + 10, T, 1); g.fillRect(px, py + 20, T, 1); }
      if (o === 3) { g.fillStyle = 'rgba(255,255,255,.18)'; for (let r = 0; r < 4; r++) g.fillRect(px, py + r * 8, T, 1); g.fillRect(px + 15, py, 1, 8); g.fillRect(px + 7, py + 8, 1, 8); g.fillRect(px + 23, py + 16, 1, 8); }
      if (o === 4) { g.strokeStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.moveTo(px + 6, py + 20); g.lineTo(px + 14, py + 8); g.stroke(); }
      if (o === 6) { g.fillStyle = '#fff6cf'; g.beginPath(); g.arc(px + 16, py + 16, 7, 0, 7); g.fill(); }
      if (o === 8) { g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(px + 6, py + 12, 12, 2); }
    }
  }
  chunk(cx, cy) {
    const key = cx + ',' + cy;
    let ch = this.chunks.get(key);
    if (ch) return ch;
    ch = document.createElement('canvas'); ch.width = ch.height = CHUNK * TILE;
    const g = ch.getContext('2d');
    for (let y = 0; y < CHUNK; y++) for (let x = 0; x < CHUNK; x++) this.drawTile(g, cx * CHUNK + x, cy * CHUNK + y, x * TILE, y * TILE);
    this.chunks.set(key, ch); this.order.push(key);
    if (this.order.length > 48) this.chunks.delete(this.order.shift());
    return ch;
  }
  invalidate(x, y) {
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = Math.floor((x + dx) / CHUNK) + ',' + Math.floor((y + dy) / CHUNK);
      if (this.chunks.delete(key)) this.order.splice(this.order.indexOf(key), 1);
    }
    this.miniPixel(x, y);
  }

  // ---------- minimap ----------
  drawMinimapBase() {
    const g = this.mini.getContext('2d'), img = g.createImageData(WORLD, WORLD);
    const rgb = GROUND_COLORS.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
    for (let i = 0; i < WORLD * WORLD; i++) {
      let c = rgb[this.world.ground[i]]; const o = this.world.natural[i];
      if (o === 20) c = [42, 100, 52]; else if (o === 21) c = [125, 130, 140];
      img.data.set([c[0], c[1], c[2], 255], i * 4);
    }
    g.putImageData(img, 0, 0);
    for (const [x, y] of this.world.editList()) this.miniPixel(x, y);
  }
  miniPixel(x, y) {
    const g = this.mini.getContext('2d'), o = this.world.objAt(x, y);
    g.fillStyle = o === 20 ? '#2a6434' : o === 21 ? '#7d828c' : o && BLOCKS[o] && BLOCKS[o].color ? BLOCKS[o].color : GROUND_COLORS[this.world.groundAt(x, y)];
    g.clearRect(x, y, 1, 1); g.fillRect(x, y, 1, 1);
  }

  // ---------- frame ----------
  frame(players, me, opts) {
    const g = this.g, z = this.cam.z * this.dpr;
    this.cam.x = me.x; this.cam.y = me.y;
    const vw = this.w / this.cam.z, vh = this.h / this.cam.z;
    const left = this.cam.x - vw / 2, top = this.cam.y - vh / 2;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = GROUND_COLORS[0]; g.fillRect(0, 0, this.c.width, this.c.height);
    g.setTransform(z, 0, 0, z, -left * z, -top * z);
    g.imageSmoothingEnabled = false;
    const S = CHUNK * TILE;
    for (let cy = Math.floor(top / S); cy <= Math.floor((top + vh) / S); cy++)
      for (let cx = Math.floor(left / S); cx <= Math.floor((left + vw) / S); cx++) {
        if (cx < 0 || cy < 0 || cx >= WORLD / CHUNK || cy >= WORLD / CHUNK) continue;
        g.drawImage(this.chunk(cx, cy), cx * S, cy * S);
      }
    // build cursor
    if (opts.cursor) {
      const { x, y, ok } = opts.cursor;
      g.strokeStyle = ok ? 'rgba(255,255,255,.9)' : 'rgba(255,90,90,.9)'; g.lineWidth = 2;
      g.strokeRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2);
    }
    // players (sorted so lower ones draw in front)
    const list = [...players].sort((a, b) => a.y - b.y);
    for (const p of list) this.drawPlayer(g, p, p === me, opts.now);

    // night
    const dark = opts.dark;
    if (dark > 0.02) {
      const L = this.light.getContext('2d');
      L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = 'source-over';
      L.clearRect(0, 0, this.light.width, this.light.height);
      L.fillStyle = `rgba(8,12,40,${dark})`; L.fillRect(0, 0, this.light.width, this.light.height);
      L.setTransform(z, 0, 0, z, -left * z, -top * z); L.globalCompositeOperation = 'destination-out';
      const glow = (x, y, r) => { const gr = L.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); L.fillStyle = gr; L.fillRect(x - r, y - r, r * 2, r * 2); };
      for (const p of list) glow(p.x, p.y, 110);
      for (const [k, v] of this.world.edits) if (v === 6) {
        const [x, y] = k.split(',').map(Number), px = x * TILE + 16, py = y * TILE + 16;
        if (px > left - 200 && px < left + vw + 200 && py > top - 200 && py < top + vh + 200) glow(px, py, BLOCKS[6].light);
      }
      g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(this.light, 0, 0);
    }
    // chat bubbles + names on top of the night layer
    g.setTransform(z, 0, 0, z, -left * z, -top * z);
    for (const p of list) this.drawLabel(g, p, opts.now);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawMinimap(g, players, me);
  }

  drawPlayer(g, p, isMe, now) {
    const bob = p.moving ? Math.sin(now / 90) * 1.5 : 0;
    if (isMe) { g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(p.x, p.y + 12, 16, 7, 0, 0, 7); g.stroke(); }
    drawAvatar(g, p.x, p.y, p.color, p.hat, bob, p.dir || 0);
    if (p.emote && now - p.emoteAt < 2500) {
      const t = (now - p.emoteAt) / 2500; g.globalAlpha = 1 - t * t;
      g.font = '22px system-ui'; g.textAlign = 'center'; g.fillText(p.emote, p.x, p.y - 40 - t * 20); g.globalAlpha = 1;
    }
  }
  drawLabel(g, p, now) {
    g.textAlign = 'center'; g.font = '600 11px system-ui';
    const tag = (p.admin ? '★ ' : '') + p.name + '  ' + (p.icon || '');
    const w = g.measureText(tag).width + 10, ly = p.y - (p.hat ? 42 : 34);
    g.fillStyle = p.admin ? 'rgba(120,80,0,.7)' : 'rgba(0,0,0,.45)'; this.rr(g, p.x - w / 2, ly, w, 15, 6); g.fill();
    g.fillStyle = p.admin ? '#ffd27a' : '#fff'; g.fillText(tag, p.x, ly + 11);
    if (p.say && now - p.sayAt < 6000) {
      g.font = '13px system-ui';
      const lines = this.wrap(g, p.say, 170), lh = 16, bw = Math.min(180, Math.max(...lines.map(l => g.measureText(l).width)) + 16), bh = lines.length * lh + 10;
      const bx = p.x - bw / 2, by = p.y - (p.hat ? 52 : 44) - bh;
      g.fillStyle = 'rgba(255,255,255,.95)'; this.rr(g, bx, by, bw, bh, 8); g.fill();
      g.beginPath(); g.moveTo(p.x - 5, by + bh); g.lineTo(p.x + 5, by + bh); g.lineTo(p.x, by + bh + 6); g.fill();
      g.fillStyle = '#1b1b2b'; lines.forEach((l, i) => g.fillText(l, p.x, by + 18 + i * lh));
    }
  }
  wrap(g, text, max) {
    const words = text.split(/\s+/), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > max && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    return lines.slice(0, 4);
  }
  rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  drawMinimap(g, players, me) {
    if (this.hideMini) return;
    const size = this.w < 600 ? 96 : 140, x = this.w - size - 10, y = this.miniY || 10;
    g.globalAlpha = .9; g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - 3, y - 3, size + 6, size + 6);
    g.imageSmoothingEnabled = false; g.drawImage(this.mini, x, y, size, size); g.globalAlpha = 1;
    const s = size / (WORLD * TILE);
    for (const p of players) { g.fillStyle = p === me ? '#fff' : p.color; g.beginPath(); g.arc(x + p.x * s, y + p.y * s, p === me ? 3 : 2.5, 0, 7); g.fill(); }
  }
}

// Avatar: a soft round body with a direction marker and an optional hat.
const HATS = { none: 'None', cap: 'Cap', beanie: 'Beanie', crown: 'Crown', flower: 'Flower', headphones: 'Headphones', tophat: 'Top hat' };
function drawAvatar(g, x, y, color, hat, bob, dir) {
  const cy = y - 2 + bob;
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y + 12, 12, 5, 0, 0, 7); g.fill();
  g.fillStyle = color; g.beginPath(); g.arc(x, cy, 13, 0, 7); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(x - 4, cy - 5, 5, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x + Math.cos(dir) * 9, cy + Math.sin(dir) * 9, 3, 0, 7); g.fill();
  const top = cy - 12;
  g.lineWidth = 2;
  if (hat === 'cap') {
    g.fillStyle = '#e8eef7'; g.beginPath(); g.arc(x, top + 4, 9, Math.PI, 0); g.fill();
    g.fillStyle = '#c9d3e2'; g.fillRect(x - 2, top + 2, 15, 3);
  } else if (hat === 'beanie') {
    g.fillStyle = '#3d4b7a'; g.beginPath(); g.arc(x, top + 5, 10, Math.PI, 0); g.fill();
    g.fillStyle = '#5b6ba3'; g.fillRect(x - 10, top + 3, 20, 4);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, top - 6, 3, 0, 7); g.fill();
  } else if (hat === 'crown') {
    g.fillStyle = '#ffcf4a'; g.beginPath();
    g.moveTo(x - 9, top + 4); g.lineTo(x - 9, top - 5); g.lineTo(x - 4, top); g.lineTo(x, top - 7); g.lineTo(x + 4, top); g.lineTo(x + 9, top - 5); g.lineTo(x + 9, top + 4); g.closePath(); g.fill();
  } else if (hat === 'flower') {
    for (let i = 0; i < 5; i++) { const a = i * 1.2566; g.fillStyle = '#ff9fc0'; g.beginPath(); g.arc(x + 6 + Math.cos(a) * 4, top + Math.sin(a) * 4, 3, 0, 7); g.fill(); }
    g.fillStyle = '#ffe066'; g.beginPath(); g.arc(x + 6, top, 2.5, 0, 7); g.fill();
  } else if (hat === 'headphones') {
    g.strokeStyle = '#2a2f3a'; g.lineWidth = 3; g.beginPath(); g.arc(x, cy, 14, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.fillStyle = '#2a2f3a'; g.fillRect(x - 16, cy - 5, 5, 9); g.fillRect(x + 11, cy - 5, 5, 9);
  } else if (hat === 'tophat') {
    g.fillStyle = '#1e2130'; g.fillRect(x - 11, top + 2, 22, 3); g.fillRect(x - 7, top - 11, 14, 14);
    g.fillStyle = '#b0503c'; g.fillRect(x - 7, top - 1, 14, 3);
  }
}
