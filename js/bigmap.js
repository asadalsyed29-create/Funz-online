// The big map of the Berekor region: the whole world as one picture (baked by tools/bake-map.js),
// with you, other players, places you've found, the names of the islands and lands, and a waypoint.
// Tap an island to see its own map. Drag to move, pinch or scroll to zoom.
const BigMap = (() => {
  const $ = id => document.getElementById(id);
  let data = null, img = null, dimg = null, viewR = null, mask = null, loading = null, isOpen = false, host = null, loadedFor = null;
  let view = { cx: 0, cz: 0, k: 0.05 }, isle = -1, placing = false, raf = 0, shade = new Map();
  const ptrs = new Map(); let pinch = null, tapStart = null;
  let mode = 'region', farWay = null; // mode: 'region' or 'planets'; farWay = a waypoint put in a region you're not in yet
  const BUILT = () => Object.keys(REGIONS).filter(k => REGIONS[k].built);
  // the regions you can flip through: only the built ones on the planet you are on
  const SAME = () => { const pl = (REGIONS[regionNow()] || {}).planet || 'Nautara'; return BUILT().filter(k => (REGIONS[k].planet || 'Nautara') === pl); };
  const TAGS = { berekor: 'Where every journey starts', dustmaw: 'Hot sand, old bones and one very big cactus' };
  const tagOf = id => TAGS[id] || (regionTheme(id) || {}).tag || '';

  const regionNow = () => (host && host.region && host.region()) || 'berekor';
  const viewing = () => viewR || regionNow(), here = () => viewing() === regionNow();
  // the waypoint shown on this map: the game's one where you are, or one waiting in another region
  const getWay = () => { if (here()) { const g = host.game(); return g && g.waypoint; } return farWay && farWay.region === viewing() ? farWay : null; };
  const setWay = w => { if (here()) { const g = host.game(); if (g) g.waypoint = w; farWay = null; } else farWay = w ? { region: viewing(), x: w.x, z: w.z } : null; };
  function load() {
    const want = viewing();
    if (loading && loadedFor === want) return loading;
    loadedFor = want; data = null; img = null; dimg = null; shade.clear(); isle = -1;
    const v = window.FUNZ_VERSION || '1', file = want === 'berekor' ? 'world' : want;
    loading = Promise.all([
      fetch('map/' + file + '.json?v=' + v).then(r => r.json()),
      new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = 'map/' + file + '.jpg?v=' + v; }),
      new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = 'map/' + file + '-d.png?v=' + v; }),
    ]).then(([d, im, dm]) => {
      if (loadedFor !== want) return;
      data = d; img = im; dimg = dm;
      const raw = atob(d.mask); mask = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) mask[i] = raw.charCodeAt(i);
    }).catch(e => { loading = null; throw e; });
    return loading;
  }
  // which island is at a spot (-1 = sea)
  function isleAt(x, z) {
    if (!data) return -1; const L = data.grid, i = Math.floor((x + data.span / 2) / data.span * L), j = Math.floor((z + data.span / 2) / data.span * L);
    if (i < 0 || j < 0 || i >= L || j >= L) return -1; return mask[j * L + i] - 1;
  }
  // a dark cover over everything except one island (made once per island)
  function shadeFor(k) {
    if (shade.has(k)) return shade.get(k);
    const L = data.grid, c = document.createElement('canvas'); c.width = c.height = L; const g = c.getContext('2d'), im = g.createImageData(L, L);
    for (let i = 0; i < L * L; i++) { const on = mask[i] - 1 === k; im.data[i * 4] = 6; im.data[i * 4 + 1] = 10; im.data[i * 4 + 2] = 24; im.data[i * 4 + 3] = on ? 0 : 165; }
    g.putImageData(im, 0, 0); shade.set(k, c); return c;
  }

  function build() {
    if ($('mapScreen')) return;
    const el = document.createElement('div'); el.id = 'mapScreen'; el.className = 'hidden';
    el.innerHTML = `<div class="mapBox">
      <div class="mapHead"><button id="mapBack" class="mBtn hidden"></button><b id="mapTitle"></b>
        <button id="mapWay" class="mBtn"></button><button id="mapGo" class="mBtn hidden"></button><button id="mapTravel" class="mBtn hidden"></button><button id="mapPlanets" class="mBtn"></button><button id="mapMe" class="mBtn"></button><button id="mapOut" class="mBtn"></button><button id="mapIn" class="mBtn"></button><button id="mapClose" class="mBtn"></button></div>
      <div class="mapWrap"><canvas id="mapGl" class="hidden"></canvas><canvas id="mapCv"></canvas><div id="mapMsg"></div><button id="mapPrev" class="mArrow">‹</button><button id="mapNext" class="mArrow">›</button></div>
      <div id="mapInfo"></div></div>`;
    document.body.appendChild(el);
    $('mapWay').innerHTML = icon('go', 16) + ' Waypoint';
    $('mapMe').innerHTML = icon('spawn', 16) + ' Me'; $('mapOut').textContent = '−'; $('mapIn').textContent = '+'; $('mapClose').innerHTML = icon('close', 18);
    $('mapBack').innerHTML = '<span class="flip">' + icon('bring', 16) + '</span> Whole map';
    $('mapGo').innerHTML = icon('bring', 16) + ' Go there';
    $('mapGo').onclick = () => { const w = getWay(); if (!w) return; if (here()) { if (host.teleport(w.x, w.z)) close(); } else if (host.travel(viewing(), w)) { farWay = null; close(); } };
    $('mapTravel').innerHTML = icon('planet', 16) + ' Travel here'; $('mapTravel').onclick = () => { if (mode === 'planets') { if (!window.NAUTIC_GC) travelPlanet(); return; } if (host.travel(viewing(), null)) close(); };
    $('mapPlanets').innerHTML = icon('planet', 16) + ' Planets'; $('mapPlanets').onclick = () => { mode === 'planets' ? showRegion(viewing()) : showPlanets(); };
    const flip = d => { const L = SAME(), i = L.indexOf(viewing()); if (L.length < 2) return; showRegion(L[(i + d + L.length) % L.length]); };
    for (const [id, d] of [['mapPrev', -1], ['mapNext', 1]]) $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); flip(d); });
    $('mapClose').onclick = close; $('mapBack').onclick = () => showWorld(true);
    $('mapIn').onclick = () => zoomAt(1.6); $('mapOut').onclick = () => zoomAt(1 / 1.6);
    $('mapMe').onclick = () => { const me = host.me(); if (!here()) { viewR = null; data = null; load().then(() => { if (isOpen) { showWorld(); $('mapMe').click(); } }); return; } if (me) { view.cx = me.x; view.cz = me.z; view.k = Math.max(view.k, 0.12); clampView(); } };
    $('mapWay').onclick = () => {
      if (getWay() && !placing) { setWay(null); updateWayBtn(); info(); return; }
      placing = !placing; updateWayBtn(); info();
    };
    const cv = $('mapCv');
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); if (ptrs.size === 1) tapStart = [e.clientX, e.clientY, 0]; else { tapStart = null; pinch = pinchState(); } });
    cv.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      if (ptrs.size === 1 && mode === 'planets') { const dx = e.clientX - p[0], dy = e.clientY - p[1]; pcam.yaw -= dx * 0.008; pcam.pitch = Math.max(0.08, Math.min(1.2, pcam.pitch + dy * 0.006)); if (tapStart) tapStart[2] += Math.abs(dx) + Math.abs(dy); ptrs.set(e.pointerId, [e.clientX, e.clientY]); return; }
      if (ptrs.size === 1) { const dx = e.clientX - p[0], dy = e.clientY - p[1]; view.cx -= dx / view.k; view.cz -= dy / view.k; if (tapStart) tapStart[2] += Math.abs(dx) + Math.abs(dy); }
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 2 && pinch && mode === 'planets') { const n = pinchState(); pcam.dist = Math.max(22, Math.min(80, pcam.dist * pinch.d / n.d)); pinch = n; return; }
      if (ptrs.size === 2 && pinch) { const n = pinchState(), r = cv.getBoundingClientRect(); const before = toWorld(pinch.mx - r.left, pinch.my - r.top); view.k = clampK(view.k * n.d / pinch.d); const after = toWorld(n.mx - r.left, n.my - r.top); view.cx += before[0] - after[0]; view.cz += before[1] - after[1]; pinch = n; }
      clampView();
    });
    const up = e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (tapStart && ptrs.size === 0 && tapStart[2] < 10) { const r = cv.getBoundingClientRect(); tap(e.clientX - r.left, e.clientY - r.top); }
      if (ptrs.size === 0) tapStart = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); if (mode === 'planets') { pcam.dist = Math.max(22, Math.min(80, pcam.dist * (e.deltaY < 0 ? 0.9 : 1.1))); return; } const r = cv.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    addEventListener('keydown', e => { if (isOpen && (e.key === 'Escape' || e.key.toLowerCase() === 'g')) { e.stopImmediatePropagation(); close(); } }, true);
    addEventListener('resize', () => { if (isOpen) fit(); });
  }
  function pinchState() { const [a, b] = [...ptrs.values()]; return { d: Math.max(20, Math.hypot(a[0] - b[0], a[1] - b[1])), mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 }; }
  function size() { const cv = $('mapCv'), r = cv.parentNode.getBoundingClientRect(); return [r.width, r.height]; }
  function toWorld(px, py) { const [w, h] = size(); return [view.cx + (px - w / 2) / view.k, view.cz + (py - h / 2) / view.k]; }
  function toScreen(x, z) { const [w, h] = size(); return [w / 2 + (x - view.cx) * view.k, h / 2 + (z - view.cz) * view.k]; }
  function minK() { const [w, h] = size(); return Math.min(w, h) / (data ? data.span : 16000) * 0.98; }
  function clampK(k) { return Math.max(minK(), Math.min(1.6, k)); }
  function clampView() { view.k = clampK(view.k); const half = (data ? data.span : 16000) / 2; view.cx = Math.max(-half, Math.min(half, view.cx)); view.cz = Math.max(-half, Math.min(half, view.cz)); }
  function zoomAt(f, px, py) { const [w, h] = size(); if (px === undefined) { px = w / 2; py = h / 2; } const before = toWorld(px, py); view.k = clampK(view.k * f); const after = toWorld(px, py); view.cx += before[0] - after[0]; view.cz += before[1] - after[1]; clampView(); }
  function fit() { if (isle >= 0) showIsle(isle); else { view.k = minK(); clampView(); } }

  function tap(px, py) {
    if (mode === 'planets') { tapPlanet(px, py); return; }
    const [x, z] = toWorld(px, py);
    if (placing) {
      setWay({ x, z }); host.toast(here() ? 'Waypoint set. Follow the yellow marker on your compass!' : 'Waypoint set in ' + regionName() + '. Tap Go there to travel straight to it.');
      placing = false; updateWayBtn(); info(); return;
    }
    // a landmark or place picture: go there
    for (let i = hits.length - 1; i >= 0; i--) { const q = hits[i].b; if (px >= q[0] - 4 && px <= q[2] + 4 && py >= q[1] - 4 && py <= q[3] + 4) { hits[i].act(); return; } }
    if (isle < 0) { const k = isleAt(x, z); if (k >= 0) showIsle(k); }
  }
  // ---------- the planets map: a real 3D solar system, drawn by a shader ----------
  // The sun sits in the middle and every planet goes round it on its own orbit. Drag to turn the view.
  // Only the planet you are on shows its regions. Other planets are only reached by flying a ship through space.
  const PLANET_TYPE = { Nautara: 0, Kelar: 1, Vyrnox: 2, Oskarr: 3, Artex: 4 };
  const PLANET_ORBIT = [8.5, 13, 17.5, 22, 26.5], PLANET_SIZE = [2.5, 2.2, 2.35, 2.6, 2.25];
  let planetHits = [], pcam = { yaw: 0.5, pitch: 0.42, dist: 40 }, pSel = null, pgl = null, pT0 = performance.now();
  function planetList() { const out = []; for (const [id, r] of Object.entries(REGIONS)) { let p = out.find(q => q.name === r.planet); if (!p) out.push(p = { name: r.planet, regions: [] }); p.regions.push({ id, ...r }); } return out; }
  const planetAng = (k, t) => k * 2.1 + 0.6 + t * 0.03 / Math.sqrt(PLANET_ORBIT[k] / 7);
  const planetNow = () => (REGIONS[regionNow()] || {}).planet || 'Nautara';
  function showPlanets() { const k = PLANET_TYPE[planetNow()] ?? 0, a = planetAng(k, (performance.now() - pT0) / 1000); pcam.yaw = Math.atan2(Math.cos(a), Math.sin(a)) + 2.2; pcam.dist = 40 + k * 3; pcam.pitch = 0.42; mode = 'planets'; placing = false; isle = -1; pSel = null; $('mapTitle').textContent = 'Planets'; $('mapBack').classList.add('hidden'); updateWayBtn(); info(); }
  function showRegion(id) {
    mode = 'region'; viewR = id === regionNow() ? null : id; placing = false; updateWayBtn(); if (loadedFor !== viewing()) data = null; info();
    load().then(() => { if (isOpen && mode === 'region') showWorld(); }).catch(() => { $('mapMsg').textContent = 'Could not load the map. Check your connection and try again.'; });
  }
  function tapPlanet(px, py) {
    const hit = planetHits.filter(q => Math.hypot(px - q.x, py - q.y) < q.r + 16).sort((a, b) => a.z - b.z)[0];
    if (!hit) { pSel = null; updateWayBtn(); info(); return; }
    if (hit.p.name === planetNow()) { showRegion(regionNow()); return; }
    pSel = hit.p.name; updateWayBtn(); info();
  }
  function travelPlanet() { const id = planetTarget(pSel); if (!id) { host.toast('Planet ' + pSel + ' is not built yet.'); return; } if (host.travel(id, null)) close(); }
  const planetTarget = name => { const p = planetList().find(q => q.name === name); const b = p && p.regions.filter(r => r.built); return b && b.length ? b[0].id : null; };
  const PVS = 'attribute vec2 aP;void main(){gl_Position=vec4(aP,0.0,1.0);}';
  const PFS = `precision highp float;
uniform vec2 uRes;uniform vec3 uEye,uR,uU,uF;uniform float uT,uTan;uniform vec4 uP[5];uniform float uSpin[5];uniform float uCur;
float h3(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);
 return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=0.5,s=0.0;for(int i=0;i<5;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=0.5;}return s;}
vec3 rotY(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z);}
vec3 rotZ(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x-s*v.y,s*v.x+c*v.y,v.z);}
// the ground of each planet: colour, glow (lights that show in the dark) and shine (water)
void surf(float k,vec3 n,float t,out vec3 col,out vec3 emi,out float spec){
 emi=vec3(0.0);spec=0.0;float e=fbm(n*2.6),d=fbm(n*7.0+3.0);
 if(k<0.5){ // Nautara: blue sea, green and brown land, white poles
  if(e>0.53){col=mix(vec3(0.26,0.5,0.2),vec3(0.55,0.45,0.28),smoothstep(0.58,0.72,e+d*0.15));col*=0.85+d*0.3;}
  else{col=mix(vec3(0.03,0.12,0.38),vec3(0.1,0.35,0.6),smoothstep(0.4,0.53,e));spec=1.0;}
  col=mix(col,vec3(0.95),smoothstep(0.78,0.86,abs(n.y)+d*0.1));
 }else if(k<1.5){ // Kelar: bright shallow seas and small sandy islands
  col=mix(vec3(0.02,0.3,0.45),vec3(0.15,0.75,0.78),smoothstep(0.45,0.62,e));spec=1.0;
  if(e>0.62){col=mix(vec3(0.93,0.85,0.6),vec3(0.3,0.6,0.25),smoothstep(0.65,0.72,e+d*0.08));spec=0.0;}
 }else if(k<2.5){ // Vyrnox: black rock split by glowing lava
  col=mix(vec3(0.09,0.07,0.07),vec3(0.3,0.2,0.16),e)*(0.7+d*0.6);
  float c=abs(fbm(n*4.0+1.3)-0.5);emi=vec3(1.0,0.35,0.05)*(smoothstep(0.035,0.0,c)*1.6+smoothstep(0.7,0.8,e)*0.6);
 }else if(k<3.5){ // Oskarr: ice, blue cracks, frozen bands
  col=mix(vec3(0.72,0.82,0.92),vec3(0.97,0.98,1.0),e);col=mix(col,vec3(0.5,0.68,0.88),0.35*smoothstep(0.3,0.0,abs(sin(n.y*9.0+e*4.0))));
  float c=abs(fbm(n*5.0)-0.5);col=mix(col,vec3(0.25,0.45,0.75),smoothstep(0.025,0.0,c));spec=0.5;
 }else{ // Artex: metal plates and city lights
  float la=atan(n.z,n.x)*6.0,lo=asin(clamp(n.y,-1.0,1.0))*8.0;vec2 g=abs(fract(vec2(la,lo))-0.5);
  col=mix(vec3(0.42,0.44,0.48),vec3(0.62,0.6,0.56),step(0.5,h3(floor(vec3(la,lo,1.0)))))*(0.8+d*0.3);
  col*=0.75+0.25*smoothstep(0.42,0.5,max(g.x,g.y))*0.0+0.25*step(max(g.x,g.y),0.46);
  emi=vec3(1.0,0.78,0.35)*step(0.82,h3(floor(n*40.0)))*smoothstep(0.4,0.6,e);spec=0.35;
 }}
float hitS(vec3 ro,vec3 rd,vec3 c,float r){vec3 o=ro-c;float b=dot(o,rd),q=dot(o,o)-r*r,h=b*b-q;if(h<0.0)return -1.0;return -b-sqrt(h);}
void main(){
 vec2 uv=(gl_FragCoord.xy-0.5*uRes)/(0.5*uRes.y);vec3 rd=normalize(uF+uR*uv.x*uTan+uU*uv.y*uTan),ro=uEye;
 // space: stars and a faint nebula
 vec3 col=vec3(0.01,0.012,0.03);float nb=fbm(rd*2.2);col+=mix(vec3(0.16,0.05,0.22),vec3(0.03,0.16,0.2),fbm(rd*3.0+5.0))*smoothstep(0.45,0.8,nb)*0.8;
 vec3 sc=floor(rd*220.0);float st=h3(sc);col+=vec3(0.9,0.92,1.0)*step(0.996,st)*(0.5+0.5*sin(uT*2.0+st*80.0));
 float best=1e9;
 // the sun
 float ts=hitS(ro,rd,vec3(0.0),3.4);
 if(ts>0.0){vec3 n=normalize(ro+rd*ts);float g=fbm(n*6.0+vec3(uT*0.08,0.0,uT*0.05));col=mix(vec3(1.0,0.55,0.12),vec3(1.0,0.95,0.7),g)*(0.75+0.5*pow(max(dot(n,-rd),0.0),0.6))*1.25;best=ts;}
 // the orbits (lines on the flat plane the planets go round in)
 if(rd.y*ro.y<0.0){float tp=-ro.y/rd.y;if(tp<best){vec3 p=ro+rd*tp;float r=length(p.xz),w=tp*0.0022;
  for(int i=0;i<5;i++){float R=length(uP[i].xz);float on=float(abs(float(i)-uCur)<0.5);col+=mix(vec3(0.35,0.42,0.6),vec3(1.0,0.86,0.3),on)*smoothstep(w*(1.0+on),0.0,abs(r-R))*(0.35+on*0.45);}}}
 // the planets
 for(int i=0;i<5;i++){vec3 c=uP[i].xyz;float R=uP[i].w;float t=hitS(ro,rd,c,R);
  // Artex has a ring of old wreckage
  if(i==4){vec3 nr=normalize(vec3(0.25,1.0,0.15));float dn=dot(rd,nr);if(abs(dn)>1e-4){float tr=dot(c-ro,nr)/dn;if(tr>0.0&&tr<best&&(t<0.0||tr<t)){vec3 q=ro+rd*tr-c;float rr=length(q)/R;
   if(rr>1.5&&rr<2.4){float band=0.55+0.45*sin(rr*38.0)*sin(rr*11.0);vec3 rc=vec3(0.7,0.62,0.5)*band;float a=0.75*smoothstep(1.5,1.6,rr)*smoothstep(2.4,2.3,rr);
    vec3 L=normalize(-(c+q));rc*=0.35+0.65*max(0.2,dot(L,L));col=mix(col,rc,a);}}}}
  if(t>0.0&&t<best){best=t;vec3 p=ro+rd*t,n=normalize(p-c),L=normalize(-p);
   vec3 ln=rotY(rotZ(n,0.35),uSpin[i]);vec3 sc,em;float sp;surf(float(i),ln,uT,sc,em,sp);
   float dif=max(dot(n,L),0.0),amb=0.1;
   // clouds on the planets with air
   if(i<2||i==3){float cl=smoothstep(0.55,0.75,fbm(rotY(ln,uT*0.02)*4.0+7.0));sc=mix(sc,vec3(1.0),cl*(i==3?0.4:0.75));sp*=1.0-cl;}
   vec3 hv=normalize(L-rd);vec3 c2=sc*(amb+dif*1.1)+vec3(1.0,0.95,0.85)*pow(max(dot(n,hv),0.0),40.0)*sp*dif*0.8;
   c2+=em*smoothstep(0.25,-0.1,dot(n,L))+em*0.25;
   float fr=pow(1.0-max(dot(n,-rd),0.0),3.0);vec3 air=i==0?vec3(0.35,0.6,1.0):i==1?vec3(0.3,0.95,0.95):i==2?vec3(1.0,0.4,0.15):i==3?vec3(0.75,0.88,1.0):vec3(0.6,0.6,0.7);
   c2+=air*fr*(0.25+0.9*max(dot(n,L)+0.3,0.0));
   col=c2;}
  // a soft glow of air around each planet
  vec3 oc=c-ro;float tc=dot(oc,rd);if(tc>0.0&&tc<best+R){float dd=length(oc-rd*tc)/R;if(dd>1.0)col+=vec3(0.3,0.45,0.8)*0.12*exp(-(dd-1.0)*9.0);}}
 // the sun's glow
 {float tc=dot(-ro,rd);if(tc>0.0&&tc<=best+3.0){float dd=length(-ro-rd*tc);col+=vec3(1.0,0.6,0.25)*(0.9*exp(-(dd-3.0)*0.9)*step(3.0,dd)+0.08/(1.0+dd*dd*0.02));}}
 col=1.0-exp(-col*1.35);gl_FragColor=vec4(pow(col,vec3(0.92)),1.0);}`;
  function planetGL(cv) {
    if (pgl) return pgl;
    const gl = cv.getContext('webgl', { antialias: false, alpha: false }); if (!gl) return null;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, PVS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, PFS)); gl.linkProgram(pr); gl.useProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(pr, 'aP'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const u = {}; for (const n of ['uRes', 'uEye', 'uR', 'uU', 'uF', 'uT', 'uTan', 'uP', 'uSpin', 'uCur']) u[n] = gl.getUniformLocation(pr, n);
    return (pgl = { gl, u });
  }
  function drawPlanets(g, w, h) {
    const cv = $('mapGl'), t = (performance.now() - pT0) / 1000, ps = planetList(), cur = planetNow(), scale = 0.75;
    const W = Math.max(1, Math.round(w * scale)), H = Math.max(1, Math.round(h * scale));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    // the camera
    const cy = Math.cos(pcam.yaw), sy = Math.sin(pcam.yaw), cp = Math.cos(pcam.pitch), sp = Math.sin(pcam.pitch);
    const eye = [sy * cp * pcam.dist, sp * pcam.dist, cy * cp * pcam.dist], F = eye.map(v => -v / pcam.dist);
    const Rr = [F[2], 0, -F[0]], rl = Math.hypot(Rr[0], Rr[2]); Rr[0] /= rl; Rr[2] /= rl; const U = [Rr[1] * F[2] - Rr[2] * F[1], Rr[2] * F[0] - Rr[0] * F[2], Rr[0] * F[1] - Rr[1] * F[0]];
    const tanH = Math.tan(0.42) * Math.max(1, 1.1 * (h / w) * 1.9);
    // where each planet is now
    const P = [], spin = [], pos = {};
    for (let k = 0; k < 5; k++) { const R = PLANET_ORBIT[k], a = planetAng(k, t); P.push(Math.cos(a) * R, 0, Math.sin(a) * R, PLANET_SIZE[k]); spin.push(t * 0.12 + k); }
    const P3 = k => [P[k * 4], P[k * 4 + 1], P[k * 4 + 2]];
    const project = p => { const v = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]], z = v[0] * F[0] + v[1] * F[1] + v[2] * F[2]; return [w / 2 + (v[0] * Rr[0] + v[2] * Rr[2]) / (z * tanH) * h / 2, h / 2 - (v[0] * U[0] + v[1] * U[1] + v[2] * U[2]) / (z * tanH) * h / 2, z]; };
    const G = planetGL(cv);
    if (G) { const { gl, u } = G; gl.viewport(0, 0, W, H);
      gl.uniform2f(u.uRes, W, H); gl.uniform3fv(u.uEye, eye); gl.uniform3fv(u.uR, Rr); gl.uniform3fv(u.uU, U); gl.uniform3fv(u.uF, F); gl.uniform1f(u.uT, t); gl.uniform1f(u.uTan, tanH);
      gl.uniform4fv(u.uP, P); gl.uniform1fv(u.uSpin, spin); gl.uniform1f(u.uCur, PLANET_TYPE[cur] ?? 0); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    // names on top
    g.clearRect(0, 0, w, h); planetHits = [];
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const tx = (s, x, y, font, fill) => { g.font = font; g.lineJoin = 'round'; g.lineWidth = 3.5; g.strokeStyle = 'rgba(6,8,16,.9)'; g.strokeText(s, x, y); g.fillStyle = fill; g.fillText(s, x, y); };
    const order = ps.map(p => ({ p, k: PLANET_TYPE[p.name] ?? 0 })).map(o => ({ ...o, z: project(P3(o.k))[2] })).sort((a, b) => b.z - a.z).map(o => o.p);
    for (const p of order) {
      const k = PLANET_TYPE[p.name] ?? 0, [x, y, z] = project(P3(k)), r = PLANET_SIZE[k] / (z * tanH) * h / 2, built = p.regions.some(q => q.built), here = p.name === cur;
      planetHits.push({ x, y, r, z, p });
      if (here || p.name === pSel) { g.strokeStyle = here ? '#ffe14a' : '#7fe0ff'; g.lineWidth = 2; g.setLineDash([5, 5]); g.lineDashOffset = -t * 12; g.beginPath(); g.arc(x, y, r + 8, 0, 7); g.stroke(); g.setLineDash([]); }
      tx(p.name, x, y + r + 16, '700 15px Georgia, serif', here ? '#ffe14a' : '#fff4dc');
      if (here) tx('You are here', x, y - r - 16, '700 12px system-ui', '#ffe14a');
      else if (!built) tx('Not built yet', x, y - r - 14, 'italic 600 11px system-ui', 'rgba(220,220,230,.75)');
    }
    // the regions of the planet you are on (other planets keep theirs hidden until you go there)
    const mine = (ps.find(p => p.name === cur) || { regions: [] }).regions, bw = 170, bh = 26 + mine.length * 17;
    g.fillStyle = 'rgba(244,234,210,.94)'; g.strokeStyle = INK; g.lineWidth = 1.5; g.fillRect(10, 10, bw, bh); g.strokeRect(10, 10, bw, bh);
    g.textAlign = 'left'; g.fillStyle = INK; g.font = '700 13px Georgia, serif'; g.fillText('Planet ' + cur, 20, 24);
    mine.forEach((q, i) => { const yy = 42 + i * 17, me = q.id === regionNow(); g.fillStyle = me ? '#a0700a' : q.built ? INK : 'rgba(42,46,56,.45)'; g.font = (me ? '700 ' : q.built ? '500 ' : 'italic 500 ') + '12px Georgia, serif'; g.fillText((me ? '● ' : '○ ') + q.name, 20, yy); });
  }
  const regionName = () => (REGIONS[viewing()] || {}).name || 'Berekor';
  function showWorld() { isle = -1; $('mapBack').classList.add('hidden'); $('mapTitle').textContent = (viewing() === 'berekor' ? 'Berekor region' : regionName()) + ', planet ' + ((REGIONS[viewing()] || {}).planet || 'Nautara'); view.cx = 0; view.cz = 0; view.k = minK(); const LL = landsHere(); if (LL) { const [w, h] = size(); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const I of LL) { x0 = Math.min(x0, I.x - I.R); x1 = Math.max(x1, I.x + I.R); z0 = Math.min(z0, I.z - I.R); z1 = Math.max(z1, I.z + I.R); } view.cx = (x0 + x1) / 2; view.cz = (z0 + z1) / 2; view.k = Math.min(w / ((x1 - x0) * 1.08), h / ((z1 - z0) * 1.15 + 40 / minK())); view.cz -= 18 / view.k; } clampView(); info(); }
  function showIsle(k) {
    const it = data.isles[k]; isle = k; const [w, h] = size(), pad = 1.12;
    view.cx = (it.x0 + it.x1) / 2; view.cz = (it.z0 + it.z1) / 2; view.k = clampK(Math.min(w / ((it.x1 - it.x0) * pad), h / ((it.z1 - it.z0) * pad)));
    $('mapBack').classList.remove('hidden'); $('mapTitle').textContent = it.name; info();
  }
  function updateWayBtn() {
    const w = host && getWay(), pl = mode === 'planets';
    $('mapGo').classList.toggle('hidden', !w || placing || pl); $('mapTravel').classList.toggle('hidden', pl ? (window.NAUTIC_GC || !pSel) : here() || !!w);
    $('mapTravel').innerHTML = icon('planet', 16) + (pl && pSel ? ' Travel to ' + pSel : ' Travel here'); $('mapGl').classList.toggle('hidden', !pl);
    $('mapWay').classList.toggle('hidden', pl); $('mapMe').classList.toggle('hidden', pl); $('mapIn').classList.toggle('hidden', pl); $('mapOut').classList.toggle('hidden', pl);
    const one = SAME().length < 2; $('mapPrev').classList.toggle('hidden', pl || one); $('mapNext').classList.toggle('hidden', pl || one);
    $('mapPlanets').innerHTML = icon('planet', 16) + (pl ? ' Back to map' : ' Planets');
    $('mapWay').classList.toggle('on', placing); $('mapWay').innerHTML = icon('go', 16) + (placing ? ' Tap the map' : w ? ' Clear waypoint' : ' Waypoint');
  }
  function info() {
    const el = $('mapInfo');
    if (mode === 'planets') { el.textContent = pSel ? 'Planet ' + pSel + (planetTarget(pSel) ? (window.NAUTIC_GC ? '. To go there, call a ship, fly straight up into space and land on ' + pSel + '.' : '. Tap Travel to ' + pSel + ' to go there.') : ' is not built yet.') : 'You are on planet ' + planetNow() + (window.NAUTIC_GC ? '. Tap it to see its map. To reach another planet, fly a ship up into space. Drag to turn the view.' : '. Tap it to see its map, or tap another planet to travel there. Drag to turn the view.'); return; }
    if (!data) { el.textContent = ''; return; }
    if (placing) { el.textContent = 'Tap anywhere on the map to put your waypoint there.'; return; }
    const LL = landsHere();
    if (LL && isle >= 0) { const I = LL.find(q => isleAt(q.x, q.z) === isle); if (I) { el.textContent = I.name + ': ' + LAND_TXT[I.kind] + (I.place ? ', with ' + PLACE_TXT[I.place] + (I.kind === 'floating' ? ' on the middle isle' : ' half way up') + '. Shooting elevators take you up' : '') + '. Tap a picture to teleport there.'; return; } }
    if (LL && isle < 0) { el.textContent = LL.length + ' landmark islands in ' + regionName() + '. Tap one to teleport there and see its map.'; return; }
    if (isle >= 0) { const it = data.isles[isle], names = it.lands.map(b => ({ 1: 'beaches', 2: 'grassland', 3: 'forest', 4: 'desert', 5: 'snow', 6: 'mountains', 7: 'swamp', 8: 'glow fields', 11: 'the volcano', 12: 'red mesas', 13: 'dust flats', 14: 'oases', 16: 'autumn woods', 17: 'elder forest', 18: 'frostglow', 19: 'salt flats', 20: 'hoodoo badlands' }[b] || (b >= 21 && BIOMES[b] ? BIOMES[b].name.toLowerCase() : null))).filter(Boolean); const IS = viewing() === 'berekor' ? (typeof BEREKOR_ISLES !== 'undefined' ? BEREKOR_ISLES : null) : viewing() === 'dustmaw' && typeof DUST_ISLES !== 'undefined' ? DUST_ISLES : null, mk = IS ? IS.marks.find(m => m.isle === isle) : null, th = IS ? THEME_TXT[IS.themes[isle]] : '';
      el.textContent = it.name + ': ' + (th || names.join(', ')) + (mk ? '. Landmark: ' + STRUCT_TYPES[mk.type] : '') + '.'; return; }
    el.textContent = data.isles.filter(q => !q.gone).length + ' islands in ' + regionName() + '. Tap an island to see its map.' + (here() ? '' : ' Tap Travel here to go, or put a waypoint and tap Go there.');
  }

  // ---------- drawing ----------
  const THEME_TXT = { snow: 'a snowy island', frost: 'ice spikes and glowing crystals', elder: 'a forest of giant old trees', autumn: 'orange and red autumn woods', peaks: 'tall rocky mountains', desert: 'dunes and hot sand', swamp: 'a misty swamp', meadow: 'flower meadows', glow: 'glowing mushroom fields', mesa: 'huge stepped red mesas', dunes: 'a sea of tall dunes', hoodoo: 'striped rock spires and badlands', oasis: 'palm groves and ponds', salt: 'white salt flats' };
  const BIOME_COL = { 16: '#ffe0b0', 17: '#d8ffd0', 18: '#e8e8ff', 19: '#ffffff', 20: '#ffe0c8', 12: '#ffd8c0', 13: '#fff0d8', 14: '#e0ffd0', 3: '#e8ffe0', 4: '#fff2d0', 5: '#ffffff', 6: '#eef0f4', 7: '#e0f0c8', 8: '#f0e4ff', 11: '#ffd0b0', 2: '#f0ffe0' };
  // little drawn pictures for landmarks (cream with dark ink), with a flag: green = found, grey = not found yet
  const INK = '#2a2e38', CREAM = '#f4ead2';
  const PICS = {
    tower: g => { g.rect(-4, -12, 8, 14); g.rect(-5, -14, 2, 3); g.rect(-1, -14, 2, 3); g.rect(3, -14, 2, 3); },
    ruins: g => { g.rect(-8, -6, 4, 8); g.rect(-3, -10, 5, 12); g.rect(3, -4, 5, 6); },
    lighthouse: g => { g.moveTo(-4, 2); g.lineTo(-2, -12); g.lineTo(2, -12); g.lineTo(4, 2); g.closePath(); },
    pyramid: g => { g.moveTo(-10, 2); g.lineTo(0, -11); g.lineTo(10, 2); g.closePath(); },
    pod: g => { g.ellipse(0, -3, 10, 4, -0.3, 0, 7); },
    wreck: g => { g.moveTo(-10, -4); g.lineTo(10, -4); g.lineTo(6, 2); g.lineTo(-6, 2); g.closePath(); g.rect(-1, -13, 2, 9); },
    igloo: g => { g.arc(0, 2, 8, Math.PI, 0); g.closePath(); },
    frozen: g => { g.moveTo(-8, 2); g.lineTo(-6, -8); g.lineTo(-3, -2); g.lineTo(0, -13); g.lineTo(3, -2); g.lineTo(6, -8); g.lineTo(8, 2); g.closePath(); },
    cabin: g => { g.moveTo(-8, 2); g.lineTo(0, -10); g.lineTo(8, 2); g.closePath(); },
    village: g => { g.rect(-7, -5, 9, 7); g.moveTo(-8, -5); g.lineTo(-2.5, -10); g.lineTo(3, -5); g.rect(4, -12, 2, 14); },
    stilts: g => { g.rect(-6, -10, 12, 7); g.rect(-5, -3, 1.5, 5); g.rect(3.5, -3, 1.5, 5); },
    shroomring: g => { g.arc(0, -4, 8, Math.PI, 0); g.closePath(); g.rect(-2, -4, 4, 6); },
    bigtree: g => { g.arc(0, -7, 7, 0, 7); g.rect(-1.5, -1, 3, 4); },
    circle: g => { g.rect(-8, -7, 3, 9); g.rect(-1.5, -10, 3, 12); g.rect(5, -7, 3, 9); },
    arch: g => { g.moveTo(-8, 2); g.lineTo(-8, -6); g.arc(0, -6, 8, Math.PI, 0); g.lineTo(8, 2); g.lineTo(4, 2); g.lineTo(4, -6); g.arc(0, -6, 4, 0, Math.PI, true); g.lineTo(-4, 2); g.closePath(); },
    cave: g => { g.moveTo(-10, 2); g.lineTo(-4, -9); g.lineTo(2, -5); g.lineTo(5, -10); g.lineTo(10, 2); g.closePath(); },
    volcano: g => { g.moveTo(-12, 3); g.lineTo(-4, -10); g.lineTo(4, -10); g.lineTo(12, 3); g.closePath(); },
    landing: g => { g.moveTo(-8, 2); g.lineTo(0, -9); g.lineTo(8, 2); g.closePath(); },
    cactus: g => { g.rect(-2, -14, 4, 16); g.rect(-7, -9, 3, 6); g.rect(-7, -4, 6, 2); g.rect(4, -11, 3, 6); g.rect(1, -6, 6, 2); },
    bonewash: g => { g.rect(-9, -2, 18, 2); for (let k = -6; k <= 6; k += 4) g.rect(k - 0.7, -9, 1.4, 7); },
    plaza: g => { g.arc(0, -3, 6, 0, 7); },
    greatshroom: g => { g.moveTo(-12, -6); g.quadraticCurveTo(0, -20, 12, -6); g.closePath(); g.rect(-2.5, -6, 5, 8); },
    shell: g => { g.moveTo(-10, 2); g.quadraticCurveTo(-10, -12, 2, -10); g.quadraticCurveTo(10, -8, 10, 2); g.closePath(); },
    lightrock: g => { g.rect(-6, -3, 12, 5); g.moveTo(-3, -3); g.lineTo(-2, -15); g.lineTo(2, -15); g.lineTo(3, -3); g.closePath(); },
    bridge: g => { g.rect(-12, -6, 24, 3); g.rect(-9, -16, 2, 13); g.rect(7, -16, 2, 13); },
    station: g => { g.rect(-9, -8, 18, 10); g.moveTo(-6, -8); g.lineTo(0, -13); g.lineTo(6, -8); },
    turtle: g => { g.ellipse(0, -4, 11, 6, 0, Math.PI, 0); g.closePath(); g.rect(10, -5, 4, 3); },
    anvil: g => { g.moveTo(-12, -10); g.lineTo(10, -10); g.lineTo(6, -6); g.lineTo(3, -6); g.lineTo(5, 2); g.lineTo(-5, 2); g.lineTo(-3, -6); g.lineTo(-8, -6); g.closePath(); },
    throne: g => { g.rect(-6, -14, 12, 9); g.rect(-8, -5, 16, 7); },
    burnttree: g => { g.rect(-1.5, -14, 3, 16); g.moveTo(0, -8); g.lineTo(-8, -14); g.lineTo(-7, -15); g.lineTo(0, -10); g.moveTo(0, -11); g.lineTo(7, -16); g.lineTo(8, -15); g.lineTo(1, -9); },
    whale: g => { g.ellipse(-1, -5, 11, 5, 0, 0, 7); g.moveTo(9, -5); g.lineTo(14, -10); g.lineTo(14, 0); g.closePath(); },
    spire: g => { g.moveTo(-5, 2); g.lineTo(0, -18); g.lineTo(5, 2); g.closePath(); },
    antenna: g => { g.moveTo(-6, 2); g.lineTo(0, -18); g.lineTo(6, 2); g.closePath(); g.rect(-0.7, -22, 1.4, 4); },
    station: g => { g.arc(0, -4, 7, 0, 7); g.moveTo(4, -4); g.arc(0, -4, 3, 0, 7, true); },
    hollowoak: g => { g.arc(0, -10, 9, 0, 7); g.rect(-3, -3, 6, 6); },
    coralarch: g => { g.moveTo(-12, 2); g.quadraticCurveTo(0, -24, 12, 2); g.lineTo(8, 2); g.quadraticCurveTo(0, -16, -8, 2); g.closePath(); },
    crab: g => { g.ellipse(0, -4, 9, 5, 0, 0, 7); g.moveTo(9, -6); g.arc(12, -8, 3, 0, 7); g.moveTo(-6, -6); g.arc(-12, -8, 3, 0, 7); },
    firebridge: g => { g.moveTo(-13, 0); g.quadraticCurveTo(0, -18, 13, 0); g.lineTo(13, -3); g.quadraticCurveTo(0, -21, -13, -3); g.closePath(); },
    blade: g => { g.moveTo(-4, 2); g.lineTo(-1, -20); g.lineTo(2, -18); g.lineTo(4, 2); g.closePath(); },
    icecastle: g => { g.rect(-11, -8, 22, 10); g.rect(-12, -12, 4, 14); g.rect(8, -12, 4, 14); g.rect(-3, -16, 6, 8); },
    snowman: g => { g.arc(0, -3, 6, 0, 7); g.moveTo(4, -12); g.arc(0, -12, 4, 0, 7); g.moveTo(3, -18.5); g.arc(0, -18.5, 3, 0, 7); },
    gear: g => { for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283, a2 = a + 0.26; g.lineTo(Math.cos(a) * 10, -6 + Math.sin(a) * 10); g.lineTo(Math.cos(a) * 12, -6 + Math.sin(a) * 12); g.lineTo(Math.cos(a2) * 12, -6 + Math.sin(a2) * 12); g.lineTo(Math.cos(a2) * 10, -6 + Math.sin(a2) * 10); } g.closePath(); g.moveTo(3, -6); g.arc(0, -6, 3, 0, 7, true); },
    skytower: g => { g.rect(-2.5, -16, 5, 18); g.rect(-9, -19, 18, 3); },
  };
  function drawPic(g, k, x, y, flag) {
    g.save(); g.translate(x, y); g.beginPath(); PICS[k](g);
    g.fillStyle = ({ volcano: '#8e7c72', cactus: '#6aa252', greatshroom: '#c05ae0', shell: '#f4c8b0', turtle: '#5a9a5a', whale: '#9ac0e0', spire: '#9ff0ff', anvil: '#5a5a62', throne: '#6a3a2a', burnttree: '#3a3432', antenna: '#8a6a5a', bridge: '#a8603a', hollowoak: '#5a9a3a', coralarch: '#ff8a7a', crab: '#d8623a', firebridge: '#7a6a62', blade: '#3a2a4a', icecastle: '#bfe0f4', snowman: '#f6fafc', gear: '#b8904a', skytower: '#c8ccd4' })[k] || CREAM; g.strokeStyle = INK; g.lineWidth = 1.6; g.lineJoin = 'round'; g.fill('evenodd'); g.stroke();
    if (k === 'volcano') { g.fillStyle = '#ff6a2a'; g.beginPath(); g.moveTo(-4, -10); g.lineTo(4, -10); g.lineTo(2, -6); g.lineTo(-2, -6); g.closePath(); g.fill(); }
    if (flag) { g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(4, -6); g.lineTo(9, -18); g.stroke(); g.fillStyle = flag === 'found' ? '#3ee04a' : '#a8acb4'; g.beginPath(); g.moveTo(9, -18); g.lineTo(17, -15); g.lineTo(11, -11); g.closePath(); g.fill(); g.lineWidth = 1; g.stroke(); }
    g.restore();
  }
  // ---------- the pixel look: a tiny pixel font, and pixel-art icons made from the drawings ----------
  const FONT = { A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
    G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31], M: [17, 27, 21, 21, 17, 17, 17],
    N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17], Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
    0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14], 4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
    ' ': [0, 0, 0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], "'": [4, 4, 8, 0, 0, 0, 0], '-': [0, 0, 0, 14, 0, 0, 0], ':': [0, 12, 12, 0, 12, 12, 0], '&': [12, 18, 20, 8, 21, 18, 13], '"': [10, 10, 0, 0, 0, 0, 0], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8] };
  const textCache = new Map();
  const pixText = (t, fill) => {
    t = t.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); const key = t + '|' + fill; if (textCache.has(key)) return textCache.get(key);
    const c = document.createElement('canvas'); c.width = t.length * 6 + 2; c.height = 9; const g = c.getContext('2d');
    const glyphs = col => { g.fillStyle = col; return (ox, oy) => { [...t].forEach((ch, i) => { const F = FONT[ch] || FONT['?']; for (let r = 0; r < 7; r++) for (let b = 0; b < 5; b++) if (F[r] >> (4 - b) & 1) g.fillRect(1 + i * 6 + b + ox, 1 + r + oy, 1, 1); }); }; };
    const dark = glyphs('#14100c'); for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) dark(ox, oy);
    glyphs(fill)(0, 0); if (textCache.size > 400) textCache.clear(); textCache.set(key, c); return c;
  };
  // draw pixel text: S = how big each pixel is, align 'center' or 'left'
  const ptext = (g, t, x, y, S, fill, align = 'center') => { const c = pixText(t, fill), w = c.width * S, h = c.height * S; g.imageSmoothingEnabled = false; g.drawImage(c, Math.round(align === 'center' ? x - w / 2 : x), Math.round(y - h / 2), w, h); };
  const ptextW = (t, S) => (t.length * 6 + 2) * S;
  // new drawings for the landmark islands and their places (several colours each)
  const fillP = (g, col, f) => { g.fillStyle = col; g.beginPath(); f(); g.fill(); };
  const SPR = {
    volcano: g => { fillP(g, '#7a5a4a', () => { g.moveTo(-15, 2); g.lineTo(-5, -14); g.lineTo(5, -14); g.lineTo(15, 2); }); fillP(g, '#5a4034', () => { g.moveTo(2, -14); g.lineTo(5, -14); g.lineTo(15, 2); g.lineTo(6, 2); }); fillP(g, '#ff6a1a', () => { g.moveTo(-5, -14); g.lineTo(5, -14); g.lineTo(3, -11); g.lineTo(-3, -11); }); fillP(g, '#ffb347', () => { g.moveTo(-1, -11); g.lineTo(1, -11); g.lineTo(-2, -2); g.lineTo(-4, -2); }); fillP(g, '#8a8a8a', () => { g.arc(-2, -20, 4, 0, 7); g.arc(3, -26, 3, 0, 7); }); },
    cloudspire: g => { fillP(g, '#8a8a96', () => { g.moveTo(-7, 2); g.lineTo(-3, -30); g.lineTo(3, -30); g.lineTo(7, 2); }); fillP(g, '#6a6a76', () => { g.moveTo(1, -30); g.lineTo(3, -30); g.lineTo(7, 2); g.lineTo(2, 2); }); fillP(g, '#ffffff', () => { g.moveTo(-3, -30); g.lineTo(3, -30); g.lineTo(2, -26); g.lineTo(-2, -26); g.ellipse(-6, -17, 8, 3, 0, 0, 7); g.ellipse(6, -16, 9, 3.4, 0, 0, 7); }); },
    mesa: g => { fillP(g, '#b8643a', () => { g.moveTo(-15, 2); g.lineTo(-11, -14); g.lineTo(11, -14); g.lineTo(15, 2); }); fillP(g, '#8a4a2a', () => { g.rect(-13, -6, 26, 2); g.rect(-12, -10, 24, 2); }); fillP(g, '#6aa24a', () => { g.rect(-11, -16, 22, 3); }); },
    floating: g => { const isle = (x, y, r) => { fillP(g, '#7a6a5a', () => { g.moveTo(x - r, y); g.lineTo(x + r, y); g.lineTo(x, y + r * 1.4); }); fillP(g, '#6ac24a', () => { g.rect(x - r, y - 2, r * 2, 3); }); }; isle(-8, -4, 6); isle(6, -14, 7); isle(-4, -24, 4); },
    hangout: g => { fillP(g, '#4a6ab0', () => { g.rect(-12, -6, 10, 6); g.rect(-12, -10, 3, 4); }); fillP(g, '#ff7a2a', () => { g.moveTo(3, 0); g.lineTo(7, -10); g.lineTo(11, 0); }); fillP(g, '#ffd23a', () => { g.moveTo(5, 0); g.lineTo(7, -5); g.lineTo(9, 0); }); fillP(g, '#6a4a2e', () => g.rect(2, 0, 10, 2)); },
    observatory: g => { fillP(g, '#e8ecf4', () => { g.arc(0, -4, 10, Math.PI, 0); }); fillP(g, '#c8ccd8', () => g.rect(-10, -4, 20, 6)); fillP(g, '#1a1e2a', () => g.rect(-1.5, -14, 3, 10)); fillP(g, '#3a4a6a', () => { g.moveTo(1, -10); g.lineTo(12, -20); g.lineTo(14, -18); g.lineTo(3, -8); }); },
    hotspring: g => { fillP(g, '#8a8478', () => g.ellipse(0, -2, 13, 5, 0, 0, 7)); fillP(g, '#5ad0f0', () => g.ellipse(0, -2, 10, 3.4, 0, 0, 7)); fillP(g, '#ffffff', () => { g.arc(-4, -10, 2.5, 0, 7); g.arc(2, -14, 3, 0, 7); g.arc(5, -9, 2, 0, 7); }); },
    cafe: g => { fillP(g, '#ffffff', () => { g.rect(-8, -12, 12, 13); }); fillP(g, '#ffffff', () => { g.arc(6, -7, 4, 0, 7); }); fillP(g, '#6a3a1a', () => g.rect(-7, -11, 10, 3)); fillP(g, '#cfcfcf', () => { g.arc(-6, -18, 2, 0, 7); g.arc(-1, -21, 2, 0, 7); }); },
    library: g => { fillP(g, '#a83a3a', () => g.rect(-12, -14, 5, 16)); fillP(g, '#3a6aa8', () => g.rect(-6, -18, 5, 20)); fillP(g, '#3a8a4a', () => g.rect(0, -12, 5, 14)); fillP(g, '#d8a83a', () => { g.moveTo(6, 2); g.lineTo(9, -14); g.lineTo(13, -13); g.lineTo(10, 2); }); },
    garden: g => { fillP(g, '#3a8a3a', () => { g.rect(-1, -10, 2, 12); g.ellipse(-5, -4, 4, 2, 0.4, 0, 7); }); fillP(g, '#ff5a8a', () => { for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; g.moveTo(Math.cos(a) * 5, -14 + Math.sin(a) * 5); g.arc(Math.cos(a) * 5, -14 + Math.sin(a) * 5, 3.4, 0, 7); } }); fillP(g, '#ffd23a', () => g.arc(0, -14, 3, 0, 7)); },
    arcade: g => { fillP(g, '#2a2a8a', () => { g.rect(-8, -20, 16, 22); }); fillP(g, '#5aff8a', () => g.rect(-5, -17, 10, 7)); fillP(g, '#ff5a5a', () => { g.arc(-3, -5, 2, 0, 7); }); fillP(g, '#ffd23a', () => { g.arc(3, -5, 2, 0, 7); }); },
    campsite: g => { fillP(g, '#e8a03a', () => { g.moveTo(-14, 2); g.lineTo(-5, -14); g.lineTo(4, 2); }); fillP(g, '#2a2a2a', () => { g.moveTo(-7, 2); g.lineTo(-5, -6); g.lineTo(-3, 2); }); fillP(g, '#ff7a2a', () => { g.moveTo(6, 2); g.lineTo(10, -8); g.lineTo(14, 2); }); },
    museum: g => { fillP(g, '#e8e4dc', () => { g.moveTo(-14, -12); g.lineTo(0, -20); g.lineTo(14, -12); g.rect(-13, 0, 26, 2); for (let k = -11; k <= 9; k += 5) g.rect(k, -11, 3, 11); }); },
    summit: g => { fillP(g, '#8a8a96', () => { g.moveTo(-13, 2); g.lineTo(0, -12); g.lineTo(13, 2); }); fillP(g, '#ffffff', () => { g.moveTo(-4, -8); g.lineTo(0, -12); g.lineTo(4, -8); }); fillP(g, '#d8d8d0', () => g.rect(-0.8, -24, 1.6, 12)); fillP(g, '#ff4a4a', () => { g.moveTo(0.8, -24); g.lineTo(10, -21); g.lineTo(0.8, -18); }); },
    lift: g => { fillP(g, '#4a4e58', () => g.rect(-7, -2, 14, 4)); fillP(g, '#9fe8ff', () => g.rect(-4, -26, 8, 24)); fillP(g, '#ffffff', () => { g.moveTo(-5, -14); g.lineTo(0, -22); g.lineTo(5, -14); g.rect(-1.5, -14, 3, 9); }); },
  };
  const sprCache = new Map();
  // a drawing turned into pixel art: drawn small with hard edges, then a dark outline round it
  function sprite(k, flag) {
    const key = k + '|' + (flag || ''); if (sprCache.has(key)) return sprCache.get(key);
    const N = 40, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); g.translate(N / 2, N - 7); g.scale(0.62, 0.62);
    if (SPR[k]) SPR[k](g); else if (PICS[k]) drawPic(g, k, 0, 0, flag);
    else { fillP(g, '#ffd27a', () => g.arc(0, -6, 6, 0, 7)); }
    if (SPR[k] && flag) { g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(4, -6); g.lineTo(9, -18); g.stroke(); fillP(g, flag === 'found' ? '#3ee04a' : '#a8acb4', () => { g.moveTo(9, -18); g.lineTo(17, -15); g.lineTo(11, -11); }); }
    const im = g.getImageData(0, 0, N, N), d = im.data, on = new Uint8Array(N * N);
    for (let i = 0; i < N * N; i++) { on[i] = d[i * 4 + 3] > 110 ? 1 : 0; d[i * 4 + 3] = on[i] ? 255 : 0; }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (on[i]) continue; if ((x > 0 && on[i - 1]) || (x < N - 1 && on[i + 1]) || (y > 0 && on[i - N]) || (y < N - 1 && on[i + N])) { d[i * 4] = 20; d[i * 4 + 1] = 16; d[i * 4 + 2] = 12; d[i * 4 + 3] = 255; } }
    g.setTransform(1, 0, 0, 1, 0, 0); g.putImageData(im, 0, 0); sprCache.set(key, c); return c;
  }
  // draw a sprite with its bottom middle at x, y; returns the box it covers (for taps)
  const drawSprite = (g, k, x, y, S, flag) => { const c = sprite(k, flag), w = c.width * S, h = c.height * S, x0 = Math.round(x - w / 2), y0 = Math.round(y - h + 7 * S); g.imageSmoothingEnabled = false; g.drawImage(c, x0, y0, w, h); return [x0 + 8 * S, y0 + 8 * S, x0 + w - 8 * S, y0 + h - 4 * S]; };
  // the land itself, drawn at a low resolution and blown up, so it looks like pixel art
  let lo = null; const seaCols = new WeakMap();
  // the colour of the sea in the map picture (its corner), so the sea around the picture matches
  const seaOf = src => { if (seaCols.has(src)) return seaCols.get(src); let c = '#6487b0'; try { const t = document.createElement('canvas'); t.width = t.height = 1; const tg = t.getContext('2d'); tg.drawImage(src, 0, 0, 4, 4, 0, 0, 1, 1); const d = tg.getImageData(0, 0, 1, 1).data; c = 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')'; } catch (e) {} seaCols.set(src, c); return c; };
  function pixBase(g, w, h, src, ax, az, s, P) {
    const lw = Math.ceil(w / P), lh = Math.ceil(h / P); if (!lo) lo = document.createElement('canvas'); if (lo.width !== lw || lo.height !== lh) { lo.width = lw; lo.height = lh; }
    const q = lo.getContext('2d'); q.imageSmoothingEnabled = true; q.imageSmoothingQuality = 'high'; q.fillStyle = seaOf(src); q.fillRect(0, 0, lw, lh); q.drawImage(src, ax / P, az / P, s / P, s / P);
    if (isle >= 0) q.drawImage(shadeFor(isle), ax / P, az / P, s / P, s / P);
    g.imageSmoothingEnabled = false; g.drawImage(lo, 0, 0, lw * P, lh * P);
  }
  // the landmark islands of a themed region, and the places on each one
  const landsHere = () => { const th = (REGIONS[viewing()] || {}).theme; return th && th !== 'dust' && typeof landsOf === 'function' ? landsOf(th) : null; };
  const landIcon = I => I.kind === 'landing' ? 'landing' : I.kind === 'special' ? I.id : I.kind;
  function landSpots(I) {
    if (here()) { const gm = host.game(), s = gm && gm.landmarks && gm.landmarks.find(q => q.key === 'L:' + I.id); if (s && s.spots) return s.spots; }
    if (!I.H && I.kind !== 'floating') return [];
    const [dx, dz] = LAND_DIRS[I.dir], LR = I.LR || 40;
    return [{ kind: I.place, name: I.placeName, x: I.x + dx * LR * 0.45, z: I.z + dz * LR * 0.45 }, { kind: 'summit', name: I.kind === 'floating' ? 'Highest isle' : 'Top of ' + I.name, x: I.x - dx * 20, z: I.z - dz * 20 }, { kind: 'lift', name: 'Elevator', x: I.x + dx * (LR + 12), z: I.z + dz * (LR + 12) }];
  }
  // tap an island: go there and open its map. Tap a place: go straight to it.
  function goLand(I) {
    const k = isleAt(I.x, I.z);
    if (!here()) { if (host.travel(viewing(), { x: I.x, z: I.z })) close(); return; }
    const sp = landSpots(I).find(q => q.kind === 'lift'), p = sp && sp.p;
    if (p ? host.teleportTo(p[0], p[2], p[1], I.name) : host.teleportTo(I.x + 14, I.z + 6, undefined, I.name)) { if (k >= 0) showIsle(k); }
  }
  function goSpot(sp) {
    if (!here()) { if (host.travel(viewing(), { x: sp.x ?? sp.p[0], z: sp.z ?? sp.p[2] })) close(); return; }
    if (sp.p ? host.teleportTo(sp.p[0], sp.p[2], sp.p[1], sp.name) : host.teleportTo(sp.x, sp.z, undefined, sp.name)) close();
  }
  let hits = [];
  function frame() {
    raf = isOpen ? requestAnimationFrame(frame) : 0; if (!isOpen) return;
    const cv = $('mapCv'), [w, h] = size(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px'; }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (mode === 'planets') { $('mapMsg').textContent = ''; drawPlanets(g, w, h); return; }
    const drawn = !!dimg;
    g.fillStyle = drawn ? '#6487b0' : '#132f5c'; g.fillRect(0, 0, w, h);
    if (!data) { $('mapMsg').textContent = 'Drawing the map…'; return; }
    $('mapMsg').textContent = '';
    const half = data.span / 2, [ax, az] = toScreen(-half, -half), s = data.span * view.k;
    pixBase(g, w, h, drawn ? dimg : img, ax, az, s, 4); hits = [];
    // a thin frame around the edge of the world
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.strokeRect(ax, az, s, s);
    const inView = (x, z, m = 40) => { const [px, py] = toScreen(x, z); return px > -m && py > -m && px < w + m && py < h + m; };
    const pxS = font => parseInt(font.match(/(\d+)px/)[1]) >= 19 ? 3 : 2, text = (t, x, y, font, fill) => ptext(g, t, x, y, pxS(font), fill, g.textAlign === 'left' ? 'left' : 'center');
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // markers first, then names: the most important names are placed first and others skip spots that are taken
    const labels = [], lab = (t, x, y, font, fill, pri, stroke, lw) => labels.push({ t, x, y, font, fill, pri, stroke, lw });
    const zoomed = view.k > minK() * 2.2 || isle >= 0;
    if (zoomed) for (const lb of data.labels) {
      if (isle >= 0 && lb.isle !== isle) continue; if (!inView(lb.x, lb.z)) continue;
      if ((lb.b === 2 && view.k < minK() * 4) || lb.b === 11) continue;
      const [px, py] = toScreen(lb.x, lb.z); lab(lb.name, px, py, 'italic 600 12px Georgia, serif', BIOME_COL[lb.b] || '#fff', 1 + lb.size / 1e5, 'rgba(10,16,34,.7)', 3);
    }
    data.isles.forEach((it, k) => {
      if (it.gone || (isle >= 0 && k !== isle)) return; if (!inView(it.lx, it.lz, 200)) return;
      if (isle < 0 && it.size < 300 && view.k < minK() * 1.8) return;
      const [px, py] = toScreen(it.lx, it.lz), big = k === 0 ? 19 : it.size > 1000 ? 16 : 13;
      lab(it.name.toUpperCase(), px, py, '700 ' + big + 'px Georgia, serif', '#fff4dc', 5 + it.size / 1e4, 'rgba(20,14,6,.8)', 4); if (k === 0) labels[labels.length - 1].pri = 12;
    });
    // places: always-known ones, each island's landmark (a flag shows if you've found it), and the structures you've discovered
    const gm = host.game(), me = here() ? host.me() : null, vr = viewing();
    {
      const known = (gm && gm.known) || new Set(), list = [];
      if (gm && here()) { for (const q of gm.places(0, 0, 0)) if (q.always) list.push(q); }
      else if (vr !== 'berekor' && landsHere()) { /* landmark islands, below */ }
      else if (vr !== 'berekor') { list.push({ x: 0, z: 0, kind: 'landing', name: (regionTheme(vr) || {}).landing || 'Dustmaw Landing', col: '#ffc45a', always: true }); for (const sp of themeSpecials((REGIONS[vr] || {}).theme)) list.push({ x: sp.x, z: sp.z, kind: sp.id, name: sp.name, col: '#ffd890', always: true }); }
      else if (vr === 'berekor' && VOLCANO.on) list.push({ x: VOLCANO.x, z: VOLCANO.z, kind: 'volcano', name: 'Volcano', col: '#ff7a2a', always: true });
      const MK = vr === 'dustmaw' ? (typeof DUST_ISLES !== 'undefined' ? DUST_ISLES.marks : []) : vr === 'berekor' && typeof BEREKOR_ISLES !== 'undefined' && VOLCANO.on ? BEREKOR_ISLES.marks : [];
      const markKeys = new Set();
      for (const m of MK) { const key = 's:' + Math.floor(m.x / REG) + ',' + Math.floor(m.z / REG); markKeys.add(key); list.push({ x: m.x, z: m.z, name: STRUCT_TYPES[m.type], type: m.type, col: '#fff4dc', mark: true, flag: here() && known.has(key) ? 'found' : 'not' }); }
      if (gm && here()) for (const key of known) { if (!key.startsWith('s:') || markKeys.has(key)) continue; const [rx, rz] = key.slice(2).split(',').map(Number); const p = gm.St.plan(rx, rz); if (p) list.push({ x: p.x, z: p.z, name: STRUCT_TYPES[p.type], type: p.type, col: p.type === 'cave' ? '#b8a8ff' : '#ffffff', found: true, flag: 'found' }); }
      // the landmark islands: each one is a pixel picture of its landmark; on an island's own map, its places too
      const LL = landsHere();
      if (LL) for (const I of LL) {
        if (isle < 0) { list.push({ x: I.x, z: I.z, kind: landIcon(I), name: I.name, col: '#fff4dc', big: true, act: () => goLand(I), S: 2 }); continue; }
        if (isleAt(I.x, I.z) !== isle) continue;
        list.push({ x: I.x, z: I.z, kind: landIcon(I), name: I.name, col: '#fff4dc', big: true, S: 3, pri: 11, act: () => goLand(I) });
        // its places sit round the landmark's picture, with a dotted line to where each one really is
        const [lx, lz] = toScreen(I.x, I.z), OFF = { summit: [0, -100], lift: [150, 70] };
        for (const sp of landSpots(I)) { const x = sp.x ?? sp.p[0], z = sp.z ?? sp.p[2], o = OFF[sp.kind] || [-150, 70]; list.push({ x, z, scr: [lx + o[0], lz + o[1]], kind: sp.kind, name: sp.name, col: sp.kind === 'lift' ? '#9fe8ff' : '#ffd27a', S: 2, pri: 10, act: () => goSpot(sp) }); }
      }
      if (vr === 'berekor') list.push({ x: 0, z: 0, name: 'Plaza', kind: 'plaza', col: '#ffc45a', big: true }, { x: STATION.x, z: STATION.z, name: 'Station', kind: 'station', col: '#5ff0e0', big: true });
      for (const q of list) if (q.always && vr !== 'berekor') q.big = true;
      for (const q of list) {
        if (isle >= 0 && isleAt(q.x, q.z) !== isle) continue; if (!inView(q.x, q.z)) continue;
        const [rx, ry] = toScreen(q.x, q.z), [px, py] = q.scr || [rx, ry], pic = q.type || q.kind;
        if (q.scr) { g.save(); g.strokeStyle = 'rgba(255,244,220,.85)'; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(px, py - 6); g.lineTo(rx, ry); g.stroke(); g.restore(); g.fillStyle = '#fff4dc'; g.fillRect(Math.round(rx) - 3, Math.round(ry) - 3, 6, 6); g.fillStyle = INK; g.fillRect(Math.round(rx) - 1, Math.round(ry) - 1, 2, 2); }
        if (PICS[pic] || SPR[pic]) { const S = q.S || 2, bx = drawSprite(g, pic, px, py, S, q.flag); hits.push({ b: bx, act: q.act || (() => goSpot({ x: q.x, z: q.z, name: q.name })) }); lab(q.name, px, bx[3] + 9,  '700 11px Georgia, serif', q.col === '#ffffff' ? '#fff4dc' : q.col, q.pri || (q.kind === 'volcano' ? 9 : q.big ? 8 : 3), 'rgba(30,26,20,.85)', 3); continue; }
        const r = q.big ? 5.5 : 4;
        g.fillStyle = q.col; g.strokeStyle = '#0a1124'; g.lineWidth = 1.5; g.beginPath(); g.arc(px, py, r, 0, 7); g.fill(); g.stroke();
        lab(q.name, px, py + r + 9, '700 11px system-ui', q.col, q.big ? 8 : 3);
      }
    }
    const wpt = getWay();
    if (wpt) { const [px, py] = toScreen(wpt.x, wpt.z); g.fillStyle = '#ffe14a'; g.strokeStyle = '#0a1124'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px, py); g.lineTo(px - 6, py - 12); g.arc(px, py - 15, 7, Math.PI * 0.8, Math.PI * 2.2); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#0a1124'; g.beginPath(); g.arc(px, py - 15, 2.5, 0, 7); g.fill(); }
    if (gm && here()) {
      // other players
      for (const p of gm.lastPlayers || []) { if (!p || !p.p || p === gm.lastMe) continue; const [px, py] = toScreen(p.p[0], p.p[2]); if (px < -20 || py < -20 || px > w + 20 || py > h + 20) continue; g.fillStyle = p.color || '#fff'; g.strokeStyle = '#0a1124'; g.lineWidth = 1.5; g.beginPath(); g.arc(px, py, 4.5, 0, 7); g.fill(); g.stroke(); if (p.name) lab(p.name, px, py - 11, '700 11px system-ui', '#fff', 7); }
    }
    // you: an arrow pointing the way the camera looks
    if (me) {
      const [px, py] = toScreen(me.x, me.z), a = Math.atan2(me.fz, me.fx) + Math.PI / 2;
      g.save(); g.translate(px, py); g.rotate(a);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(0, 0, 15, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; g.strokeStyle = '#0a1124'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 7); g.lineTo(0, 3); g.lineTo(-7, 7); g.closePath(); g.fill(); g.stroke();
      g.restore();
      lab('You', px, py + 22, '700 11px system-ui', '#fff', 20);
    }
    labels.sort((a, b) => b.pri - a.pri); const taken = [];
    // the region's name and saying in the top left corner
    if (isle < 0) {
      g.textAlign = 'left'; const t1 = regionName(), t2 = tagOf(viewing()) ? '"' + tagOf(viewing()) + '"' : '';
      text(t1, 12, 22, '700 24px Georgia, serif', '#fff4dc', 'rgba(30,26,20,.9)', 4);
      if (t2) text(t2, 14, 44, 'italic 600 12px Georgia, serif', '#fff4dc', 'rgba(30,26,20,.9)', 3);
      const tw = Math.max(ptextW(t1, 3), ptextW(t2, 2)); taken.push([0, 0, tw + 30, 56]); g.textAlign = 'center';
    }
    for (const L of labels) {
      const S = pxS(L.font), tw = ptextW(L.t, S) + 4, th = 9 * S + 2, r = [L.x - tw / 2, L.y - th / 2, L.x + tw / 2, L.y + th / 2];
      if (taken.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) continue;
      taken.push(r); text(L.t, L.x, L.y, L.font, L.fill, L.stroke || 'rgba(10,16,34,.85)', L.lw || 3);
    }
    // scale bar
    const steps = [50, 100, 250, 500, 1000, 2000, 5000]; let m = steps[0]; for (const st of steps) if (st * view.k < 120) m = st;
    const bx = 12, by = h - 16; g.fillStyle = 'rgba(10,16,34,.75)'; g.fillRect(bx - 6, by - 16, m * view.k + 12, 24);
    g.fillStyle = '#fff'; g.fillRect(bx, by, m * view.k, 3); g.fillRect(bx, by - 4, 2, 7); g.fillRect(bx + m * view.k - 2, by - 4, 2, 7);
    g.textAlign = 'left'; g.font = '700 10px system-ui'; g.fillText(m >= 1000 ? m / 1000 + ' km' : m + ' m', bx, by - 9);
  }

  function open() {
    build(); if (isOpen) return; isOpen = true; $('mapScreen').classList.remove('hidden'); placing = false; mode = 'region'; viewR = null; updateWayBtn();
    const ready = () => { const me = host.me(); showWorld(); if (me) { const k = isleAt(me.x, me.z); if (k >= 0) showIsle(k); } };
    viewR = null; if (loadedFor !== viewing()) data = null;
    if (data) ready(); else { info(); load().then(() => { if (isOpen) ready(); }).catch(() => { $('mapMsg').textContent = 'Could not load the map. Check your connection and try again.'; }); }
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function close() { if (!isOpen) return; isOpen = false; placing = false; $('mapScreen').classList.add('hidden'); ptrs.clear(); }
  return { init(h) { host = h; build(); }, open, close, toggle() { isOpen ? close() : open(); }, get isOpen() { return isOpen; }, preload: () => load().catch(() => {}) };
})();
