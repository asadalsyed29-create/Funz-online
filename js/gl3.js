// The Three.js engine. Same drawing calls as GL in gl.js (begin, mat, draw, outline, ball, sky,
// water, particles...), so the game code barely changes, but now the sun casts real shadows
// and glowing things really glow (bloom). Our own shaders keep the Funz look.
const GL3_STRIP = s => s.replace(PREC, '').replace('#extension GL_OES_standard_derivatives : enable\n', '');
const GL3_WORLD_VS = `#include <common>
#include <shadowmap_pars_vertex>
uniform float uOutline;varying vec3 vN;varying vec4 vC;varying vec3 vR;varying vec3 vW;
void main(){vec4 worldPosition=modelMatrix*vec4(position+normal*uOutline,1.0);vW=worldPosition.xyz;vR=vW-cameraPosition;vN=mat3(modelMatrix)*normal;vC=color;
  vec3 transformedNormal=normalMatrix*normal;gl_Position=projectionMatrix*viewMatrix*worldPosition;
  #include <shadowmap_vertex>
}`;
const GL3_HEAD = `#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
uniform float uMask;
`;
function gl3WorldFS() {
  let s = GL3_STRIP(WORLD_FS(true)).replace('#define FLAT 1\n', '');
  s = '#define FLAT 1\n' + GL3_HEAD + s;
  const rep = (a, b) => { if (!s.includes(a)) throw new Error('gl3 world shader: ' + a.slice(0, 40)); s = s.replace(a, b); };
  rep('if(uOutline>0.0){gl_FragColor=vec4(mix(uOutCol,uFog,f),1.0);return;}', 'if(uOutline>0.0){gl_FragColor=vec4(mix(uOutCol,uFog,f),uMask>0.5?0.0:uAlpha);return;}');
  rep('vec3 light=mix(uGround,uSky,n.y*0.5+0.5)+uSunC*d;', 'float shd=getShadowMask();vec3 light=mix(uGround,uSky,n.y*0.5+0.5)*(0.8+0.2*shd)+uSunC*d*shd;');
  rep('*uSpec*length(uSunC);', '*uSpec*length(uSunC)*shd;');
  rep('gl_FragColor=vec4(mix(c,uFog,f),(vC.a<0.5?vC.a*2.0:1.0)*uAlpha);}', 'gl_FragColor=vec4(mix(c,uFog,f),uMask>0.5?clamp(glow,0.0,1.0)*(1.0-f):(vC.a<0.5?vC.a*2.0:1.0)*uAlpha);}');
  return s;
}
const GL3_BALL_VS = `uniform float uOutline;varying vec3 vL;varying vec3 vN;varying vec3 vR;
void main(){vL=position;vec4 w=modelMatrix*vec4(position*(1.0+uOutline),1.0);vR=w.xyz-cameraPosition;vN=mat3(modelMatrix)*position;gl_Position=projectionMatrix*viewMatrix*w;}`;
function gl3BallFS() {
  let s = 'uniform float uMask;\n' + GL3_STRIP(BALL_FS);
  const rep = (a, b) => { if (!s.includes(a)) throw new Error('gl3 ball shader: ' + a.slice(0, 40)); s = s.replace(a, b); };
  rep('if(uOutline>0.0){gl_FragColor=vec4(mix(uOutCol,uFog,fog),1.0);return;}', 'if(uOutline>0.0){gl_FragColor=vec4(mix(uOutCol,uFog,fog),uMask>0.5?0.0:1.0);return;}');
  rep('gl_FragColor=vec4(mix(c,uFog,fog),alpha*uAlpha);}', 'gl_FragColor=vec4(mix(c,uFog,fog),uMask>0.5?clamp(glow,0.0,1.0)*(1.0-fog):alpha*uAlpha);}');
  return s;
}
const GL3_SKY_VS = `varying vec2 vP;void main(){vP=position.xy;gl_Position=vec4(position.xy,0.9999,1.0);}`;
function gl3SkyFS() {
  let s = GL3_STRIP(SKY_FS);
  const a = 'gl_FragColor=vec4(c,1.0);}';
  if (!s.includes(a)) throw new Error('gl3 sky shader');
  return s.replace(a, 'gl_FragColor=vec4(c,clamp(pow(s,300.0),0.0,1.0)*0.85*step(0.0,d.y));}');
}
const GL3_WATER_VS = `uniform float uTime;uniform vec3 uOff;varying vec3 vR;varying vec4 vC;varying vec3 vW;
void main(){vec3 w=position+uOff;w.y+=sin(w.x*0.31+uTime*1.3)*0.11+sin(w.z*0.27+uTime*1.05)*0.1+sin((w.x+w.z)*0.13+uTime*0.7)*0.12;vW=w;vR=w-cameraPosition;vC=color;gl_Position=projectionMatrix*viewMatrix*vec4(w,1.0);}`;
const GL3_PART_VS = `attribute vec3 aP;attribute vec3 aO;attribute vec4 aC;attribute float aS;
uniform vec3 uRight;uniform vec3 uUp;uniform float uFogD;
varying vec2 vUV;varying vec4 vC;varying float vS;varying float vF;
void main(){vec3 w=aP+(uRight*aO.x+uUp*aO.y)*aO.z;vUV=aO.xy;vC=aC;vS=aS;vF=clamp(1.0-exp(-pow(length(w-cameraPosition)*uFogD,2.0)),0.0,1.0);gl_Position=projectionMatrix*viewMatrix*vec4(w,1.0);}`;

class GL3 {
  constructor(canvas, opt = {}) {
    if (!window.THREE) throw new Error('no three');
    const T = THREE;
    this.q = opt.quality || 'high';
    const R = new T.WebGLRenderer({ canvas, antialias: this.q === 'low', powerPreference: 'high-performance', stencil: false });
    if (!R.capabilities.isWebGL2) { R.dispose(); throw new Error('webgl2'); }
    R.autoClear = false; R.setPixelRatio(1); R.outputEncoding = T.LinearEncoding; R.toneMapping = T.NoToneMapping;
    R.shadowMap.enabled = this.q !== 'low'; R.shadowMap.type = T.PCFSoftShadowMap; R.shadowMap.autoUpdate = true;
    this.R = R; this.gl = R.getContext(); this.canvas = canvas; this.isThree = true; this.deriv = true;
    this.scenes = [new T.Scene(), new T.Scene()];
    for (const sc of this.scenes) { sc.matrixAutoUpdate = false; }
    this.cam = new T.Camera(); this.cam.matrixAutoUpdate = false;
    // the sun: our shader does the lighting, the light is only here for its shadow
    const sun = this.sun = new T.DirectionalLight(0xffffff, 0);
    sun.castShadow = R.shadowMap.enabled;
    const sz = this.q === 'high' ? 2048 : 1024; sun.shadow.mapSize.set(sz, sz);
    this.shR = this.q === 'high' ? 70 : 48;
    const sc = sun.shadow.camera; sc.left = -this.shR; sc.right = this.shR; sc.top = this.shR; sc.bottom = -this.shR; sc.near = 1; sc.far = 600;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05; sun.shadow.radius = 2;
    this.scenes[0].add(sun, sun.target);
    // shared values for every material (set once per frame)
    const v3 = () => ({ value: new T.Vector3() });
    this.U = { uSun: v3(), uSunC: v3(), uSky: v3(), uGround: v3(), uFog: v3(), uHor: v3(), uRight: v3(), uUp: v3(), uTime: { value: 0 },
      uL: { value: Array.from({ length: 8 }, () => new T.Vector4()) }, uLC: { value: Array.from({ length: 8 }, () => new T.Vector3()) } };
    this.lightsU = T.UniformsUtils.clone(T.UniformsLib.lights);
    this.src = { wvs: GL3_WORLD_VS, wfs: gl3WorldFS(), bvs: GL3_BALL_VS, bfs: gl3BallFS() };
    // the sphere for balls, a big triangle for the sky
    this.sphereGeo = new T.SphereGeometry(1, 32, 20);
    const tg = new T.BufferGeometry(); tg.setAttribute('position', new T.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.skyMat = new T.ShaderMaterial({ vertexShader: GL3_SKY_VS, fragmentShader: gl3SkyFS(), depthTest: false, depthWrite: false,
      uniforms: { uSun: v3(), uSunC: v3(), uZen: v3(), uHor: v3(), uRight: this.U.uRight, uUp: this.U.uUp, uFwd: v3(), uTan: { value: new T.Vector2() }, uNight: { value: 0 }, uTime: this.U.uTime } });
    this.skyMesh = new T.Mesh(tg, this.skyMat); this.skyMesh.frustumCulled = false; this.skyMesh.renderOrder = -1e9; this.skyMesh.matrixAutoUpdate = false;
    this.scenes[0].add(this.skyMesh);
    this.waterMat = new T.ShaderMaterial({ vertexShader: GL3_WATER_VS, fragmentShader: GL3_STRIP(WATER_FS(true)), vertexColors: true, transparent: true,
      blending: T.CustomBlending, blendSrc: T.SrcAlphaFactor, blendDst: T.OneMinusSrcAlphaFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor,
      uniforms: { uTime: this.U.uTime, uSun: this.U.uSun, uSunC: this.U.uSunC, uSky: this.U.uSky, uFog: this.U.uFog, uFogD: { value: 0 }, uHor: this.U.uHor, uOff: v3() } });
    this.waterMesh = null;
    // particle buffers (one per particles() call in a frame)
    this.MAXP = 6000; this.pIdx = new Uint16Array(this.MAXP * 6);
    for (let k = 0; k < this.MAXP; k++) this.pIdx.set([k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3], k * 6);
    this.pSlots = [];
    // pools of meshes and materials, reused every frame (so drawing stays "draw this now")
    this.meshPool = [[], []]; this.used = [0, 0];
    this.wMats = []; this.wUsed = 0; this.bMats = []; this.bUsed = 0;
    this.S = null; this.layer = 0; this.order = 0; this.blendOn = false; this.depthOn = true; this.fogOver = null;
    this.st = { toon: 0, rim: 0, spec: 0.18, tex: 0, flat: 1 };
    this.tris = 0; this.calls = 0; this.lastTris = 0; this.frames = 0;
    this.pv = new T.Matrix4(); this.tmpM = new T.Matrix4();
    // glow: bright parts bloom (only on stronger devices)
    this.composer = null; this.w = canvas.width; this.h = canvas.height;
    if (this.q === 'high' && T.EffectComposer && T.UnrealBloomPass) {
      try {
        const rt = new T.WebGLRenderTarget(canvas.width, canvas.height, { type: T.HalfFloatType, samples: 4 });
        const C = this.composer = new T.EffectComposer(R, rt);
        this.pass0 = new T.RenderPass(this.scenes[0], this.cam); this.pass0.clearAlpha = 0;
        this.pass1 = new T.RenderPass(this.scenes[1], this.cam); this.pass1.clear = false; this.pass1.clearDepth = true;
        this.bloom = new T.UnrealBloomPass(new T.Vector2(canvas.width, canvas.height), 0.55, 0.35, 0);
        // our glow mask lives in the alpha channel, so bloom what is marked as glowing (not just what is bright)
        this.bloom.materialHighPassFilter.fragmentShader = 'uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec4 t=texture2D(tDiffuse,vUv);gl_FragColor=vec4(t.rgb*t.a,1.0);}';
        this.bloom.materialHighPassFilter.needsUpdate = true;
        C.addPass(this.pass0); C.addPass(this.pass1); C.addPass(this.bloom);
      } catch (e) { console.warn('no bloom', e); this.composer = null; }
    }
  }
  setSize(w, h) { this.w = w; this.h = h; this.R.setSize(w, h, false); if (this.composer) { this.composer.setPixelRatio(1); this.composer.setSize(w, h); } }
  // ---- per frame ----
  begin(S) {
    this.S = S; this.order = 0; this.layer = 0; this.blendOn = false; this.depthOn = true; this.fogOver = null;
    this.used[0] = this.used[1] = 0; this.wUsed = 0; this.bUsed = 0; this.pUsed = 0; this.skyOn = false;
    this.st = { toon: 0, rim: 0, spec: 0.18, tex: 0, flat: 1 };
    this.lastTris = this.tris; this.tris = 0; this.calls = 0;
    const U = this.U;
    U.uSun.value.fromArray(S.sun); U.uSunC.value.fromArray(S.sunC); U.uSky.value.fromArray(S.sky); U.uGround.value.fromArray(S.ground);
    U.uFog.value.fromArray(S.fog); U.uHor.value.fromArray(S.horizon); U.uRight.value.fromArray(S.right); U.uUp.value.fromArray(S.up); U.uTime.value = S.time % 10000;
    for (let i = 0; i < 8; i++) { U.uL.value[i].fromArray(S.lp, i * 4); U.uLC.value[i].fromArray(S.lc, i * 3); }
    // the camera
    const cam = this.cam; cam.projectionMatrix.fromArray(S.proj); cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    cam.matrixWorldInverse.fromArray(S.view); cam.matrix.copy(cam.matrixWorldInverse).invert(); cam.matrixWorld.copy(cam.matrix);
    // the sun's shadow follows the player, snapped to its texels so edges don't shimmer
    const sun = this.sun, tg = S.focus || S.eye, d = S.sun;
    const texel = (this.shR * 2) / sun.shadow.mapSize.x;
    const fx = Math.round(tg[0] / texel) * texel, fy = Math.round(tg[1] / texel) * texel, fz = Math.round(tg[2] / texel) * texel;
    sun.position.set(fx + d[0] * 250, fy + d[1] * 250, fz + d[2] * 250); sun.target.position.set(fx, fy, fz);
    sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
    sun.castShadow = this.R.shadowMap.enabled && (S.shadows !== false) && (S.sunC[0] + S.sunC[1] + S.sunC[2]) > 0.15;
  }
  clear(col) { this.clearCol = col; }
  clearDepth() { this.layer = 1; }
  blend(on) { this.blendOn = !!on; }
  depthWrite(on) { this.depthOn = !!on; }
  end() {
    for (let L = 0; L < 2; L++) { const pool = this.meshPool[L]; for (let i = this.used[L]; i < pool.length; i++) pool[i].visible = false; }
    for (let i = this.pUsed; i < this.pSlots.length; i++) this.pSlots[i].mesh.visible = false;
    this.skyMesh.visible = !!this.skyOn;
    const c = this.clearCol || [0, 0, 0], R = this.R;
    R.setClearColor(new THREE.Color(c[0], c[1], c[2]), 0);
    if (this.composer) {
      this.pass1.enabled = this.used[1] > 0;
      this.composer.render();
    } else {
      R.setRenderTarget(null); R.setClearColor(new THREE.Color(c[0], c[1], c[2]), 1); R.clear();
      R.render(this.scenes[0], this.cam);
      if (this.used[1] > 0) { R.clearDepth(); R.render(this.scenes[1], this.cam); }
    }
    // safety net: if this device can't run our shaders, switch to the old engine for good
    if (++this.frames === 4 || this.frames === 60) {
      const bad = (R.info.programs || []).some(p => p.diagnostics && p.diagnostics.runnable === false);
      if (bad) { try { localStorage.setItem('funz.engine', 'old'); } catch (e) {} location.reload(); }
    }
  }
  // ---- meshes ----
  mesh(data, idx) {
    const T = THREE, g = new T.BufferGeometry(), ib = new T.InterleavedBuffer(data, 10);
    g.setAttribute('position', new T.InterleavedBufferAttribute(ib, 3, 0));
    g.setAttribute('normal', new T.InterleavedBufferAttribute(ib, 3, 3));
    g.setAttribute('color', new T.InterleavedBufferAttribute(ib, 4, 6));
    g.setIndex(new T.BufferAttribute(idx, 1));
    return { geo: g, n: idx.length, vb: true };
  }
  free(m) { if (!m || !m.geo) return; m.geo.dispose(); m.geo = null; m.vb = null; }
  // ---- look of the next things drawn ----
  mat(toon, rim, spec) { this.st.toon = toon; this.st.rim = rim; this.st.spec = spec; }
  flat(on) { this.st.flat = on ? 1 : 0; }
  tex(t) { this.st.tex = t; }
  fog(d) { this.fogOver = d === undefined ? null : d; }
  _mesh(geo, mat) {
    const L = this.layer, pool = this.meshPool[L];
    let o = pool[this.used[L]];
    if (!o) { o = new THREE.Mesh(geo, mat); o.matrixAutoUpdate = false; pool.push(o); this.scenes[L].add(o); }
    this.used[L]++;
    o.geometry = geo; o.material = mat; o.visible = true; o.renderOrder = this.order++;
    return o;
  }
  _setM(o, model) {
    if (model) o.matrix.fromArray(model); else o.matrix.identity();
    o.matrixWorld.copy(o.matrix);
  }
  _blending(mat, transparent) {
    const T = THREE;
    mat.transparent = transparent; mat.depthWrite = this.depthOn;
    if (transparent) { mat.blending = T.CustomBlending; mat.blendSrc = T.SrcAlphaFactor; mat.blendDst = T.OneMinusSrcAlphaFactor; mat.blendSrcAlpha = T.ZeroFactor; mat.blendDstAlpha = T.OneFactor; }
    else mat.blending = T.NormalBlending;
  }
  _wMat() {
    let m = this.wMats[this.wUsed++];
    if (!m) {
      const T = THREE, U = this.U;
      m = new T.ShaderMaterial({ vertexShader: this.src.wvs, fragmentShader: this.src.wfs, lights: true, vertexColors: true, extensions: { derivatives: true },
        uniforms: Object.assign({}, this.lightsU, { uSun: U.uSun, uSunC: U.uSunC, uSky: U.uSky, uGround: U.uGround, uFog: U.uFog, uL: U.uL, uLC: U.uLC,
          uFogD: { value: 0 }, uAlpha: { value: 1 }, uTint: { value: new T.Vector3(1, 1, 1) }, uGlow: { value: 0 }, uToon: { value: 0 }, uRim: { value: 0 }, uSpec: { value: 0 },
          uOutline: { value: 0 }, uOutCol: { value: new T.Vector3(0.1, 0.1, 0.16) }, uTex: { value: 0 }, uFlat: { value: 1 }, uMask: { value: 1 } }) });
      this.wMats.push(m);
    }
    const u = m.uniforms, st = this.st;
    u.uToon.value = st.toon; u.uRim.value = st.rim; u.uSpec.value = st.spec; u.uTex.value = st.tex; u.uFlat.value = st.flat;
    u.uFogD.value = this.fogOver == null ? this.S.fogD : this.fogOver;
    return m;
  }
  draw(m, model, alpha = 1, tint, glow = 0) {
    if (!m || !m.n || !m.geo) return;
    const mat = this._wMat(), u = mat.uniforms, tr = this.blendOn;
    u.uAlpha.value = alpha; if (tint) u.uTint.value.fromArray(tint); else u.uTint.value.set(1, 1, 1); u.uGlow.value = glow; u.uOutline.value = 0;
    u.uMask.value = tr ? 0 : 1; mat.side = THREE.FrontSide; this._blending(mat, tr);
    const o = this._mesh(m.geo, mat); this._setM(o, model);
    o.castShadow = !tr && this.layer === 0; o.receiveShadow = true;
    this.tris += m.n / 3; this.calls++;
  }
  outline(m, model, w = 0.03, col) {
    if (!m || !m.n || !m.geo) return;
    const mat = this._wMat(), u = mat.uniforms;
    u.uAlpha.value = 1; u.uTint.value.set(1, 1, 1); u.uGlow.value = 0; u.uOutline.value = w;
    if (col) u.uOutCol.value.fromArray(col); else u.uOutCol.value.set(0.1, 0.1, 0.16);
    u.uMask.value = this.blendOn ? 0 : 1; mat.side = THREE.BackSide; this._blending(mat, this.blendOn);
    const o = this._mesh(m.geo, mat); this._setM(o, model); o.castShadow = false; o.receiveShadow = false;
    this.calls++;
  }
  ball(model, skin, A, B, alpha = 1, outline = 0) {
    let m = this.bMats[this.bUsed++];
    if (!m) {
      const T = THREE, U = this.U;
      m = new T.ShaderMaterial({ vertexShader: this.src.bvs, fragmentShader: this.src.bfs,
        uniforms: { uSun: U.uSun, uSunC: U.uSunC, uSky: U.uSky, uGround: U.uGround, uFog: U.uFog, uTime: U.uTime, uFogD: { value: 0 },
          uA: { value: new T.Vector3() }, uB: { value: new T.Vector3() }, uSkin: { value: 0 }, uOutline: { value: 0 }, uOutCol: { value: new T.Vector3(0.1, 0.1, 0.16) },
          uAlpha: { value: 1 }, uR3: { value: new T.Matrix3() }, uMask: { value: 1 } } });
      this.bMats.push(m);
    }
    const u = m.uniforms, tr = this.blendOn || alpha < 1 || skin === 29;
    u.uFogD.value = this.fogOver == null ? this.S.fogD : this.fogOver;
    u.uOutline.value = outline; u.uSkin.value = skin; u.uA.value.fromArray(A); u.uB.value.fromArray(B); u.uAlpha.value = alpha;
    u.uR3.value.set(model[0], model[4], model[8], model[1], model[5], model[9], model[2], model[6], model[10]);
    u.uMask.value = tr ? 0 : 1; m.side = outline ? THREE.BackSide : THREE.FrontSide; this._blending(m, tr);
    const o = this._mesh(this.sphereGeo, m); this._setM(o, model);
    o.castShadow = !outline && !tr && this.layer === 0; o.receiveShadow = false;
    this.calls++;
  }
  sky() {
    const S = this.S, u = this.skyMat.uniforms;
    u.uFwd.value.fromArray(S.fwd); u.uTan.value.set(S.tanX, S.tanY); u.uZen.value.fromArray(S.zenith); u.uHor.value.fromArray(S.horizon);
    u.uSun.value.fromArray(S.sunDisc || S.sun); u.uSunC.value.fromArray(S.sunCol || S.sunC); u.uNight.value = S.night;
    this.skyOn = true;
  }
  water(m, off) {
    if (!m || !m.n || !m.geo) return;
    this.waterMat.uniforms.uOff.value.fromArray(off); this.waterMat.uniforms.uFogD.value = this.S.fogD;
    this.waterMat.depthWrite = this.depthOn;
    const o = this._mesh(m.geo, this.waterMat); o.matrix.identity(); o.matrixWorld.identity(); o.frustumCulled = false; o.castShadow = false; o.receiveShadow = false;
  }
  particles(data, count, fogD) {
    if (!count) return;
    const T = THREE; count = Math.min(count, this.MAXP);
    let s = this.pSlots[this.pUsed++];
    if (!s) {
      const g = new T.BufferGeometry(), ib = new T.InterleavedBuffer(new Float32Array(this.MAXP * 4 * 11), 11);
      ib.setUsage(T.DynamicDrawUsage);
      g.setAttribute('aP', new T.InterleavedBufferAttribute(ib, 3, 0)); g.setAttribute('aO', new T.InterleavedBufferAttribute(ib, 3, 3));
      g.setAttribute('aC', new T.InterleavedBufferAttribute(ib, 4, 6)); g.setAttribute('aS', new T.InterleavedBufferAttribute(ib, 1, 10));
      g.setIndex(new T.BufferAttribute(this.pIdx, 1));
      const mat = new T.ShaderMaterial({ vertexShader: GL3_PART_VS, fragmentShader: GL3_STRIP(PART_FS), transparent: true, depthWrite: false,
        blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor, blendSrcAlpha: T.ZeroFactor, blendDstAlpha: T.OneFactor,
        uniforms: { uRight: this.U.uRight, uUp: this.U.uUp, uFogD: { value: 0 }, uFog: this.U.uFog } });
      const mesh = new T.Mesh(g, mat); mesh.frustumCulled = false; mesh.matrixAutoUpdate = false;
      this.scenes[0].add(mesh);
      s = { g, ib, mat, mesh }; this.pSlots.push(s);
    }
    s.ib.array.set(data.subarray(0, count * 44)); s.ib.updateRange.offset = 0; s.ib.updateRange.count = count * 44; s.ib.needsUpdate = true;
    s.g.setDrawRange(0, count * 6);
    s.mat.uniforms.uFogD.value = fogD === undefined ? this.S.fogD : fogD;
    s.mesh.visible = true; s.mesh.renderOrder = this.order++;
  }
}
// pick the engine: Three.js when it works, the old one otherwise (or with ?engine=old)
function makeGfx(canvas, quality) {
  let old = /[?&]engine=old/.test(location.search); try { old = old || localStorage.getItem('funz.engine') === 'old'; } catch (e) {}
  if (window.THREE && !old) {
    try { return new GL3(canvas, { quality }); } catch (e) { console.warn('Three.js engine failed, using the old one', e); }
  }
  return new GL(canvas);
}
