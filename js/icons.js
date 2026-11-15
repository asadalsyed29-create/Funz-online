// Hand-drawn line icons (24×24) used across the game.
const ICON_PATHS = {
  chat: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13h5"/>',
  pick: '<path d="M7 6c5-2 10 0 13 5"/><path d="M14 8L4 20"/>',
  leave: '<path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
  build: '<path d="M4 9l8-5 8 5-8 5z"/><path d="M4 9v6l8 5 8-5V9M12 14v6"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  fly: '<path d="M3 14c3-1 5-4 9-4s6 3 9 4"/><path d="M7 12c1-3 3-5 5-5s4 2 5 5"/><path d="M12 14v6M9 18l3 2 3-2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  tablet: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M11 17h2"/>',
  computer: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/>',
  go: '<circle cx="12" cy="10" r="3"/><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/>',
  bring: '<path d="M4 12h12M12 8l4 4-4 4"/><path d="M20 5v14"/>',
  freeze: '<path d="M12 2v20M3.5 7l17 10M3.5 17l17-10"/><path d="M9 4l3 2 3-2M9 20l3-2 3 2"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l4 6M21 9l-4 6"/>',
  say: '<path d="M4 5h16v11H11l-5 4v-4H4z"/><path d="M9 9l2 2-2 2M13 13h3"/>',
  kick: '<path d="M6 4l3 8-3 8"/><path d="M9 12h11M16 8l4 4-4 4"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  announce: '<path d="M4 10v4h3l9 5V5L7 10z"/><path d="M19 9a4 4 0 0 1 0 6"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14a5 5 0 0 1 5 5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  clear: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  unmute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9a4 4 0 0 1 0 6M19.5 6.5a8 8 0 0 1 0 11"/>',
  thaw: '<circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  speed: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  bag: '<path d="M6 8h12l1 12H5z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  up: '<path d="M12 19V6M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v13M6 13l6 6 6-6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  spawn: '<path d="M5 21V4M5 4h12l-3 4 3 4H5"/>',
};
function icon(name, size = 20) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
}
// The same device icons, drawn on the game canvas next to names.
function drawDeviceIcon(g, type, x, y, color) {
  g.save(); g.strokeStyle = color; g.lineWidth = 1.3; g.lineJoin = 'round';
  if (type === 'phone') { g.strokeRect(x - 2.5, y - 4.5, 5, 9); }
  else if (type === 'tablet') { g.strokeRect(x - 4, y - 4.5, 8, 9); }
  else if (type === 'computer') { g.strokeRect(x - 5, y - 4.5, 10, 6.5); g.beginPath(); g.moveTo(x - 2.5, y + 4.5); g.lineTo(x + 2.5, y + 4.5); g.moveTo(x, y + 2); g.lineTo(x, y + 4.5); g.stroke(); }
  g.restore();
}
