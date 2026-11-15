// A small WebGL engine: matrices, a lit + fogged low-poly shader, and a mesh builder.
const M4 = {
  ident() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
  },
  persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; },
  lookAt(e, c, u) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
  },
  model(p, R, s) { R = R || [1, 0, 0, 0, 1, 0, 0, 0, 1]; s = s || 1; return new Float32Array([R[0] * s, R[1] * s, R[2] * s, 0, R[3] * s, R[4] * s, R[5] * s, 0, R[6] * s, R[7] * s, R[8] * s, 0, p[0], p[1], p[2], 1]); },
  rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 1, 0, s, 0, c]; },
  rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, s, 0, -s, c]; },
  rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, -s, c, 0, 0, 0, 1]; },
  mul3(a, b) { const o = new Array(9); for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2]; return o; },
  apply3(R, v) { return [R[0] * v[0] + R[3] * v[1] + R[6] * v[2], R[1] * v[0] + R[4] * v[1] + R[7] * v[2], R[2] * v[0] + R[5] * v[1] + R[8] * v[2]]; },
  axisAngle(x, y, z, a) { const c = Math.cos(a), s = Math.sin(a), t = 1 - c; return [t * x * x + c, t * x * y + s * z, t * x * z - s * y, t * x * y - s * z, t * y * y + c, t * y * z + s * x, t * x * z + s * y, t * y * z - s * x, t * z * z + c]; },
  ortho3(R) {
    let [ax, ay, az] = [R[0], R[1], R[2]]; let l = Math.hypot(ax, ay, az); ax /= l; ay /= l; az /= l;
    let [bx, by, bz] = [R[3], R[4], R[5]]; const d = ax * bx + ay * by + az * bz; bx -= d * ax; by -= d * ay; bz -= d * az; l = Math.hypot(bx, by, bz); bx /= l; by /= l; bz /= l;
    return [ax, ay, az, bx, by, bz, ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
  },
};

class GL {
  constructor(canvas) {
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' }) || canvas.getContext('experimental-webgl');
    if (!gl) throw new Error('webgl');
    this.gl = gl; this.canvas = canvas;
    if (!gl.getExtension('OES_element_index_uint')) throw new Error('webgl');
    const vs = `attribute vec3 aP;attribute vec3 aN;attribute vec4 aC;
      uniform mat4 uVP;uniform mat4 uM;varying vec3 vN;varying vec4 vC;varying vec3 vW;
      void main(){vec4 w=uM*vec4(aP,1.0);vW=w.xyz;vN=mat3(uM)*aN;vC=aC;gl_Position=uVP*w;}`;
    // alpha channel codes: 1 = normal, 0.5..0.99 = glowing, below 0.5 = see-through (alpha*2)
    const fs = `precision mediump float;varying vec3 vN;varying vec4 vC;varying vec3 vW;
      uniform vec3 uSun;uniform vec3 uSunC;uniform vec3 uSky;uniform vec3 uGround;uniform vec3 uFog;uniform float uFogD;uniform vec3 uEye;
      uniform float uAlpha;uniform vec3 uTint;uniform float uGlow;
      uniform vec4 uL[8];uniform vec3 uLC[8];
      void main(){vec3 n=normalize(vN);float d=max(dot(n,uSun),0.0);
        vec3 light=mix(uGround,uSky,n.y*0.5+0.5)+uSunC*d;
        for(int i=0;i<8;i++){vec3 dv=uL[i].xyz-vW;float r=uL[i].w;if(r>0.0){float k=max(0.0,1.0-length(dv)/r);light+=uLC[i]*k*k*(0.35+0.65*max(dot(n,normalize(dv)),0.0));}}
        vec3 c=vC.rgb*uTint;
        vec3 vd=normalize(uEye-vW);float sp=pow(max(dot(reflect(-uSun,n),vd),0.0),24.0)*0.18*length(uSunC);
        float glow=(vC.a<0.99&&vC.a>0.5)?1.0:uGlow;
        c=c*mix(light,vec3(1.15),glow)+sp;
        float f=1.0-exp(-pow(length(vW-uEye)*uFogD,2.0));
        gl_FragColor=vec4(mix(c,uFog,clamp(f,0.0,1.0)),(vC.a<0.5?vC.a*2.0:1.0)*uAlpha);}`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    gl.useProgram(p); this.p = p;
    this.a = { P: gl.getAttribLocation(p, 'aP'), N: gl.getAttribLocation(p, 'aN'), C: gl.getAttribLocation(p, 'aC') };
    this.u = {}; for (const n of ['uVP', 'uM', 'uSun', 'uSunC', 'uSky', 'uGround', 'uFog', 'uFogD', 'uEye', 'uAlpha', 'uTint', 'uGlow', 'uL', 'uLC']) this.u[n] = gl.getUniformLocation(p, n);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
  scene(o) {
    const gl = this.gl, u = this.u;
    gl.uniformMatrix4fv(u.uVP, false, o.vp); gl.uniform3fv(u.uSun, o.sun); gl.uniform3fv(u.uSunC, o.sunC);
    gl.uniform3fv(u.uSky, o.sky); gl.uniform3fv(u.uGround, o.ground); gl.uniform3fv(u.uFog, o.fog); gl.uniform1f(u.uFogD, o.fogD); gl.uniform3fv(u.uEye, o.eye);
    gl.uniform4fv(u.uL, o.lp || new Float32Array(32)); gl.uniform3fv(u.uLC, o.lc || new Float32Array(24));
  }
  mesh(data, idx) {
    const gl = this.gl, vb = gl.createBuffer(), ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    return { vb, ib, n: idx.length };
  }
  free(m) { if (!m || !m.vb) return; this.gl.deleteBuffer(m.vb); this.gl.deleteBuffer(m.ib); m.vb = null; }
  draw(m, model, alpha = 1, tint, glow = 0) {
    if (!m || !m.n || !m.vb) return;
    const gl = this.gl, a = this.a;
    gl.bindBuffer(gl.ARRAY_BUFFER, m.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
    gl.enableVertexAttribArray(a.P); gl.vertexAttribPointer(a.P, 3, gl.FLOAT, false, 40, 0);
    gl.enableVertexAttribArray(a.N); gl.vertexAttribPointer(a.N, 3, gl.FLOAT, false, 40, 12);
    gl.enableVertexAttribArray(a.C); gl.vertexAttribPointer(a.C, 4, gl.FLOAT, false, 40, 24);
    gl.uniformMatrix4fv(this.u.uM, false, model || IDENT);
    gl.uniform1f(this.u.uAlpha, alpha); gl.uniform3fv(this.u.uTint, tint || ONE3); gl.uniform1f(this.u.uGlow, glow);
    gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_INT, 0);
  }
}
const IDENT = M4.ident(), ONE3 = new Float32Array([1, 1, 1]);

// Builds flat-shaded low-poly meshes. Everything added goes through the current transform.
class MeshBuilder {
  constructor() { this.v = []; this.i = []; this.T = null; this.tris = null; }
  // transform: rotation (3x3) + offset; collect=true also keeps triangles for collisions
  at(p, R) { this.T = { p, R: R || [1, 0, 0, 0, 1, 0, 0, 0, 1] }; return this; }
  reset() { this.T = null; return this; }
  collect() { this.tris = []; return this; }
  tf(q) { if (!this.T) return q; const r = M4.apply3(this.T.R, q); return [r[0] + this.T.p[0], r[1] + this.T.p[1], r[2] + this.T.p[2]]; }
  tri(a, b, c, col, noCollide) {
    a = this.tf(a); b = this.tf(b); c = this.tf(c);
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const base = this.v.length / 10;
    for (const p of [a, b, c]) this.v.push(p[0], p[1], p[2], nx, ny, nz, col[0], col[1], col[2], col[3] ?? 1);
    this.i.push(base, base + 1, base + 2);
    if (this.tris && !noCollide) this.tris.push([a, b, c]);
  }
  quad(a, b, c, d, col, nc) { this.tri(a, b, c, col, nc); this.tri(a, c, d, col, nc); }
  box(x0, y0, z0, x1, y1, z1, col, shade = true) {
    const s = (k) => shade ? [col[0] * k, col[1] * k, col[2] * k, col[3] ?? 1] : col;
    this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], col);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], s(0.75));
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], s(0.93));
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], s(0.93));
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], s(0.87));
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], s(0.87));
  }
  // box with cut corners for a softer low-poly look
  bevel(x0, y0, z0, x1, y1, z1, col, b = 0.06) {
    this.box(x0 + b, y0, z0 + b, x1 - b, y1, z1 - b, col);
    const s = k => [col[0] * k, col[1] * k, col[2] * k, col[3] ?? 1];
    this.quad([x0, y0, z0 + b], [x0, y0, z1 - b], [x0, y1 - b, z1 - b], [x0, y1 - b, z0 + b], s(0.87));
    this.quad([x1, y0, z1 - b], [x1, y0, z0 + b], [x1, y1 - b, z0 + b], [x1, y1 - b, z1 - b], s(0.87));
    this.quad([x0 + b, y0, z0], [x1 - b, y0, z0], [x1 - b, y1 - b, z0], [x0 + b, y1 - b, z0].map((v, i) => v), s(0.93));
    this.quad([x1 - b, y0, z1], [x0 + b, y0, z1], [x0 + b, y1 - b, z1], [x1 - b, y1 - b, z1], s(0.93));
  }
  cyl(x, y, z, r0, r1, h, seg, col, caps = true, rot = 0) {
    for (let j = 0; j < seg; j++) {
      const a0 = rot + j / seg * Math.PI * 2, a1 = rot + (j + 1) / seg * Math.PI * 2;
      const p = (r, a, yy) => [x + Math.cos(a) * r, yy, z + Math.sin(a) * r];
      const k = 0.85 + 0.15 * Math.cos(a0 - 0.8);
      this.quad(p(r0, a1, y), p(r0, a0, y), p(r1, a0, y + h), p(r1, a1, y + h), [col[0] * k, col[1] * k, col[2] * k, col[3] ?? 1]);
      if (caps) { if (r1 > 0) this.tri([x, y + h, z], p(r1, a1, y + h), p(r1, a0, y + h), col); if (r0 > 0) this.tri([x, y, z], p(r0, a0, y), p(r0, a1, y), col); }
    }
  }
  // low-poly sphere (icosphere); colFn(nx,ny,nz) per face; inward=true flips it (for insides)
  ico(cx, cy, cz, r, sub, colFn, inward, keep) {
    const t = (1 + Math.sqrt(5)) / 2;
    let V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(v => { const l = Math.hypot(...v); return v.map(x => x / l); });
    let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    for (let s = 0; s < sub; s++) {
      const cache = new Map(), nf = [];
      const mid = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (cache.has(k)) return cache.get(k); const m = V[a].map((v, i) => (v + V[b][i]) / 2), l = Math.hypot(...m); V.push(m.map(x => x / l)); cache.set(k, V.length - 1); return V.length - 1; };
      for (const [a, b, c] of F) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
      F = nf;
    }
    for (const [a, b, c] of F) {
      const m = [0, 1, 2].map(i => (V[a][i] + V[b][i] + V[c][i]) / 3);
      if (keep && !keep(m)) continue;
      const P = i => [cx + V[i][0] * r, cy + V[i][1] * r, cz + V[i][2] * r];
      const col = colFn(m[0], m[1], m[2]);
      if (inward) this.tri(P(a), P(c), P(b), col); else this.tri(P(a), P(b), P(c), col);
    }
  }
  cone(x, y, z, r, h, seg, col) { this.cyl(x, y, z, r, 0, h, seg, col, true); }
  build(gl) { return gl.mesh(new Float32Array(this.v), new Uint32Array(this.i)); }
}
const hex = (h, a = 1) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, a]; };
const shadeC = (c, k) => [c[0] * k, c[1] * k, c[2] * k, c[3] ?? 1];
const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] ?? 1];
const glowC = c => [c[0], c[1], c[2], 0.9];
