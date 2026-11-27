// Works out what kind of device the player is on.
const Device = (() => {
  const ua = navigator.userAgent || '';
  const uad = navigator.userAgentData;
  const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const minSide = Math.min(screen.width, screen.height);

  let os = 'Unknown';
  if (/android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPod/.test(ua)) os = 'iPhone';
  else if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touch)) os = 'iPad'; // iPadOS pretends to be a Mac
  else if (/CrOS/.test(ua)) os = 'Chromebook';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS X/.test(ua)) os = 'Mac';
  else if (/Linux/.test(ua)) os = 'Linux';

  let type;
  if (os === 'iPhone') type = 'phone';
  else if (os === 'iPad') type = 'tablet';
  else if (os === 'Android') type = (uad && uad.mobile) || /Mobile/.test(ua) ? 'phone' : 'tablet';
  else if (touch && minSide < 600) type = 'phone';
  else if (touch && !matchMedia('(pointer:fine)').matches) type = 'tablet';
  else type = 'computer';

  const icon = type;
  const label = { phone: 'Phone', tablet: 'Tablet', computer: 'Computer' }[type];
  // the installed app opens full screen, so any app display mode counts (not just "standalone")
  const appFlag = (() => { try { if (/[?&]app=1/.test(location.search)) sessionStorage.setItem('funz.app', '1'); return sessionStorage.getItem('funz.app') === '1'; } catch (e) { return /[?&]app=1/.test(location.search); } })();
  const standalone = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some(m => matchMedia('(display-mode: ' + m + ')').matches) ||
    navigator.standalone === true || document.referrer.startsWith('android-app://') || appFlag;
  const useTouch = type !== 'computer' || (touch && !matchMedia('(pointer:fine)').matches);

  return { type, os, icon, label, touch, useTouch, standalone,
    short: `${label}${os !== 'Unknown' ? ' · ' + os : ''}` };
})();

// New things being tried out first: only the Outernautica account sees them until they are released.
window.NAUTIC_BETA = (() => { try { const a = JSON.parse(localStorage.getItem('ultranautic.account') || 'null'); return !!a && String(a.name || '').toLowerCase() === 'outernautica'; } catch (e) { return false; } })();
