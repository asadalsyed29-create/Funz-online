// Hand-drawn two-tone icons (24×24): a soft filled shape plus crisp lines.
const F = d => `<path d="${d}" fill="currentColor" fill-opacity=".22" stroke="none"/>`;
const ICON_PATHS = {
  chat: F('M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z') + '<path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><circle cx="8" cy="10.5" r=".9" fill="currentColor"/><circle cx="12" cy="10.5" r=".9" fill="currentColor"/><circle cx="16" cy="10.5" r=".9" fill="currentColor"/>',
  bag: F('M5 8h14l1.2 12.5a1.5 1.5 0 0 1-1.5 1.5H5.3a1.5 1.5 0 0 1-1.5-1.5z') + '<path d="M5 8h14l1.2 12.5a1.5 1.5 0 0 1-1.5 1.5H5.3a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10"/><path d="M9 14.5h6"/>',
  spawn: F('M6 4h11l-2.5 4.5L17 13H6z') + '<path d="M6 21V3"/><path d="M6 4h11l-2.5 4.5L17 13H6"/><path d="M3.5 21h5"/>',
  build: F('M12 2.5l8.5 4.8v9.4L12 21.5l-8.5-4.8V7.3z') + '<path d="M12 2.5l8.5 4.8v9.4L12 21.5l-8.5-4.8V7.3z"/><path d="M3.5 7.3L12 12l8.5-4.7M12 12v9.5"/>',
  gear: F('M12 5.4a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2z') + '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.9 1.9M16.8 16.8l1.9 1.9M5.3 18.7l1.9-1.9M16.8 7.2l1.9-1.9"/><circle cx="12" cy="12" r="6.6"/>',
  chip: F('M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z') + '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/><path d="M9.5 9.5h5v5h-5z"/>',
  wire: F('M2.5 18a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0zM16.5 6a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0z') + '<circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="6" r="2.5"/><path d="M7.2 16.8C11 15 9 9.5 12.5 8.2c2.2-.8 3.3.3 4.3-.6"/>',
  cut: F('M3 18a3 3 0 1 0 6 0 3 3 0 0 0-6 0zM15 18a3 3 0 1 0 6 0 3 3 0 0 0-6 0z') + '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.2 16L19 3M15.8 16L5 3"/>',
  pick: F('M4 9.5C8 4.5 15 3.5 20.5 7.5c-3.5-.5-7 0-10 2z') + '<path d="M4 9.5C8 4.5 15 3.5 20.5 7.5"/><path d="M4 9.5c3-1.8 6.5-2.4 10-1.6"/><path d="M13.2 7.6L5 21"/>',
  star: F('M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z') + '<path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/>',
  fly: F('M2 13c3.5-.5 6.5-3.5 10-3.5s6.5 3 10 3.5c-3 2.5-6.5 3.5-10 3.5S5 15.5 2 13z') + '<path d="M2 13c3.5-.5 6.5-3.5 10-3.5s6.5 3 10 3.5"/><path d="M5 15c2.5 1 4.5 1.5 7 1.5s4.5-.5 7-1.5"/><path d="M12 9.5V4M9.5 6.5L12 4l2.5 2.5"/>',
  sun: F('M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z') + '<circle cx="12" cy="12" r="4.5"/><path d="M12 1.8v2.4M12 19.8v2.4M1.8 12h2.4M19.8 12h2.4M4.8 4.8l1.7 1.7M17.5 17.5l1.7 1.7M4.8 19.2l1.7-1.7M17.5 6.5l1.7-1.7"/>',
  moon: F('M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z') + '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/><path d="M16 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" fill="currentColor"/>',
  phone: F('M8 2.5h8a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2z') + '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  tablet: F('M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z') + '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M10.5 18h3"/>',
  computer: F('M4 4h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 16H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 4z') + '<rect x="2.5" y="4" width="19" height="12" rx="1.5"/><path d="M8.5 20.5h7M12 16v4.5"/>',
  leave: F('M13 3h6a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 19 21h-6z') + '<path d="M13 3h6a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 19 21h-6"/><path d="M9.5 8L5.5 12l4 4M5.5 12H16"/>',
  check: F('M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19z') + '<circle cx="12" cy="12" r="9.5"/><path d="M7.5 12.5l3 3 6-6.5"/>',
  up: F('M12 3l8 8h-5v9H9v-9H4z') + '<path d="M12 3l8 8h-5v9H9v-9H4z"/>',
  down: F('M12 21l8-8h-5V4H9v9H4z') + '<path d="M12 21l8-8h-5V4H9v9H4z"/>',
  users: F('M9 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM2.5 20a6.5 6.5 0 0 1 13 0z') + '<circle cx="9" cy="7.5" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="8.5" r="2.7"/><path d="M16 13.6a5.2 5.2 0 0 1 5.5 5.4"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  clear: F('M6 7h12l-1 13a1.5 1.5 0 0 1-1.5 1.4h-7A1.5 1.5 0 0 1 7 20z') + '<path d="M4 7h16M9 7V4.5h6V7"/><path d="M6 7l1 13a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 20l1-13M10 11v6M14 11v6"/>',
  announce: F('M3.5 9.5v5h3.5l9 5.5V4L7 9.5z') + '<path d="M3.5 9.5v5h3.5l9 5.5V4L7 9.5z"/><path d="M19 9a4 4 0 0 1 0 6"/>',
  go: F('M12 2.5a7.5 7.5 0 0 0-7.5 7.5c0 5.5 7.5 12 7.5 12s7.5-6.5 7.5-12A7.5 7.5 0 0 0 12 2.5z') + '<path d="M12 22s-7.5-6.5-7.5-12a7.5 7.5 0 0 1 15 0c0 5.5-7.5 12-7.5 12z"/><circle cx="12" cy="10" r="2.8"/>',
  bring: F('M3 9h10V5l7 7-7 7v-4H3z') + '<path d="M3 9h10V5l7 7-7 7v-4H3z"/>',
  freeze: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5M3.5 11l3.7.9L6 15.5M20.5 13l-3.7-.9L18 8.5"/>',
  thaw: F('M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z') + '<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>',
  mute: F('M3 9h4l5-4.5v15L7 15H3z') + '<path d="M3 9h4l5-4.5v15L7 15H3z"/><path d="M16 9l5 6M21 9l-5 6"/>',
  unmute: F('M3 9h4l5-4.5v15L7 15H3z') + '<path d="M3 9h4l5-4.5v15L7 15H3z"/><path d="M16 9a4 4 0 0 1 0 6M18.8 6.5a8 8 0 0 1 0 11"/>',
  say: F('M3 4h18v12H11l-5 4v-4H3z') + '<path d="M3 4h18v12H11l-5 4v-4H3z"/><path d="M8 8l2.5 2-2.5 2M12.5 12h3.5"/>',
  kick: F('M14 6l6 6-6 6z') + '<path d="M3 12h15M14 6l6 6-6 6"/><path d="M5 5v14"/>',
  ban: F('M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19z') + '<circle cx="12" cy="12" r="9.5"/><path d="M5.3 5.3l13.4 13.4"/>',
  speed: F('M13 2L4 14h7l-1 8 9-12h-7z') + '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
};
function icon(name, size = 20) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
}
// The same device icons, drawn on the game canvas next to names.
function drawDeviceIcon(g, type, x, y, color) {
  g.save(); g.strokeStyle = color; g.lineWidth = 1.3; g.lineJoin = 'round';
  const rr = (x0, y0, w, h, r) => { g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x0 + w, y0, x0 + w, y0 + h, r); g.arcTo(x0 + w, y0 + h, x0, y0 + h, r); g.arcTo(x0, y0 + h, x0, y0, r); g.arcTo(x0, y0, x0 + w, y0, r); g.closePath(); g.stroke(); };
  if (type === 'phone') rr(x - 2.8, y - 5, 5.6, 10, 1.4);
  else if (type === 'tablet') rr(x - 4.5, y - 5, 9, 10, 1.4);
  else { rr(x - 5.5, y - 4.5, 11, 7, 1); g.beginPath(); g.moveTo(x - 2.5, y + 4.8); g.lineTo(x + 2.5, y + 4.8); g.moveTo(x, y + 2.5); g.lineTo(x, y + 4.8); g.stroke(); }
  g.restore();
}
