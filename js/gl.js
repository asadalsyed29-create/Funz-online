// A tiny WebGL engine: matrices, a lit+fogged shader, meshes.
const M4 = {
  ident() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  },
  persp(fov, asp, n, f) {
    const t = 1 / Math.tan(fov / 2), o = new Float32Array(16);
    o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o;
  },
  lookAt(e, c, u) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
  },
  // model matrix from position, 3x3 rotation (column-major array of 9) and uniform scale
  model(p, R, s) {
    R = R || [1, 0, 0, 0, 1, 0, 0, 0, 1]; s = s || 1;
    return new Float32Array([R[0] * s, R[1] * s, R[2] * s, 0, R[3] * s, R[4] * s, R[5] * s, 0, R[6] * s, R[7] * s, R[8] * s, 0, p[0], p[1], p[2], 1]);
  },
  rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 1, 0, s, 0, c]; },
  // multiply 3x3 rotations (column-major)
  mul3(a, b) {
    const o = new Array(9);
    for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2];
    return o;
  },
  axisAngle(x, y, z, a) {
    const c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    return [t * x * x + c, t * x * y + s * z, t * x * z - s * y, t * x * y - s * z, t * y * y + c, t * y * z + s * x, t * x * z + s * y, t * y * z - s * x, t * z * z + c];
  },
  ortho3(R) { // keep a rotation clean after many small steps
    let [ax, ay, az] = [R[0], R[1], R[2]]; let l = Math.hypot(ax, ay, az); ax /= l; ay /= l; az /= l;
    let [bx, by, bz] = [R[3], R[4], R[5]]; const d = ax * bx + ay * by + az * bz; bx -= d * ax; by -= d * ay; bz -= d * az; l = Math.hypot(bx, by, bz); bx /= l; by /= l; bz /= l;
    return [ax, ay, az, bx, by, bz, ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
  },
};

class GL {
  constructor(canvas) {
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false }) || canvas.getContext('experimental-webgl');
    if (!gl) throw new Error('webgl');
    this.gl = gl; this.canvas = canvas;
    gl.getExtension('OES_element_index_uint');
    const vs = `attribute vec3 aP;attribute vec3 aN;attribute vec4 aC;
      uniform mat4 uVP;uniform mat4 uM;varying vec3 vN;varying vec4 vC;varying vec3 vW;
      void main(){vec4 w=uM*vec4(aP,1.0);vW=w.xyz;vN=mat3(uM)*aN;vC=aC;gl_Position=uVP*w;}`;
    const fs = `precision mediump float;varying vec3 vN;varying vec4 vC;varying vec3 vW;
      uniform vec3 uSun;uniform vec3 uSunC;uniform vec3 uAmb;uniform vec3 uFog;uniform float uFogD;uniform vec3 uEye;uniform float uAlpha;uniform vec3 uTint;
      uniform vec4 uL[8];uniform vec3 uLC[8];
      void main(){vec3 n=normalize(vN);float d=max(dot(n,uSun),0.0);
        vec3 light=uAmb+uSunC*d;
        for(int i=0;i<8;i++){vec3 dv=uL[i].xyz-vW;float r=uL[i].w;if(r>0.0){float k=max(0.0,1.0-length(dv)/r);light+=uLC[i]*k*k*(0.4+0.6*max(dot(n,normalize(dv)),0.0));}}
        vec3 c=vC.rgb*uTint;
        // vertex alpha > 0.99 normal, between .5-.99 = glowing (emissive)
        if(vC.a<0.99&&vC.a>0.5){light=max(light,vec3(1.0));}
        c*=light;
        float f=1.0-exp(-pow(length(vW-uEye)*uFogD,2.0));
        gl_FragColor=vec4(mix(c,uFog,clamp(f,0.0,1.0)),(vC.a<0.5?vC.a*2.0:1.0)*uAlpha);}`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    gl.useProgram(p); this.p = p;
    this.a = { P: gl.getAttribLocation(p, 'aP'), N: gl.getAttribLocation(p, 'aN'), C: gl.getAttribLocation(p, 'aC') };
    this.u = {}; for (const n of ['uVP', 'uM', 'uSun', 'uSunC', 'uAmb', 'uFog', 'uFogD', 'uEye', 'uAlpha', 'uTint', 'uL', 'uLC']) this.u[n] = gl.getUniformLocation(p, n);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.tint = [1, 1, 1];
  }
  // data: Float32Array interleaved [x,y,z, nx,ny,nz, r,g,b,a] per vertex, indices Uint32Array
  mesh(data, idx) {
    const gl = this.gl, vb = gl.createBuffer(), ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    return { vb, ib, n: idx.length };
  }
  free(m) { if (!m) return; this.gl.deleteBuffer(m.vb); this.gl.deleteBuffer(m.ib); }
  draw(m, model, alpha = 1, tint) {
    if (!m || !m.n) return;
    const gl = this.gl, a = this.a;
    gl.bindBuffer(gl.ARRAY_BUFFER, m.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
    gl.enableVertexAttribArray(a.P); gl.vertexAttribPointer(a.P, 3, gl.FLOAT, false, 40, 0);
    gl.enableVertexAttribArray(a.N); gl.vertexAttribPointer(a.N, 3, gl.FLOAT, false, 40, 12);
    gl.enableVertexAttribArray(a.C); gl.vertexAttribPointer(a.C, 4, gl.FLOAT, false, 40, 24);
    gl.uniformMatrix4fv(this.u.uM, false, model || M4.ident());
    gl.uniform1f(this.u.uAlpha, alpha);
    gl.uniform3fv(this.u.uTint, tint || this.tint);
    gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_INT, 0);
  }
}

// Builds meshes from boxes, quads and spheres.
class MeshBuilder {
  constructor() { this.v = []; this.i = []; }
  quad(p0, p1, p2, p3, n, c) {
    const b = this.v.length / 10;
    for (const p of [p0, p1, p2, p3]) this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], c[3] ?? 1);
    this.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  // axis-aligned box from (x0,y0,z0) to (x1,y1,z1); col = [r,g,b,a] or per-face function
  box(x0, y0, z0, x1, y1, z1, col) {
    const c = f => typeof col === 'function' ? col(f) : col;
    const sh = (k, a) => [a[0] * k, a[1] * k, a[2] * k, a[3] ?? 1];
    this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], c('top'));
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], sh(0.7, c('bottom')));
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], sh(0.9, c('side')));
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], sh(0.9, c('side')));
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], sh(0.85, c('side')));
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], sh(0.85, c('side')));
  }
  sphere(cx, cy, cz, r, seg, colFn) {
    const b = this.v.length / 10, rings = seg, segs = seg * 2;
    for (let i = 0; i <= rings; i++) {
      const th = i / rings * Math.PI;
      for (let j = 0; j <= segs; j++) {
        const ph = j / segs * Math.PI * 2;
        const nx = Math.sin(th) * Math.cos(ph), ny = Math.cos(th), nz = Math.sin(th) * Math.sin(ph);
        const c = colFn(nx, ny, nz, i, j);
        this.v.push(cx + nx * r, cy + ny * r, cz + nz * r, nx, ny, nz, c[0], c[1], c[2], c[3] ?? 1);
      }
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
      const a = b + i * (segs + 1) + j, d = a + segs + 1;
      this.i.push(a, d, a + 1, a + 1, d, d + 1);
    }
  }
  // flat ring (torus-ish band) facing +z
  ring(R, w, seg, col) {
    for (let j = 0; j < seg; j++) {
      const a0 = j / seg * Math.PI * 2, a1 = (j + 1) / seg * Math.PI * 2;
      const o0 = [Math.cos(a0) * R, Math.sin(a0) * R], o1 = [Math.cos(a1) * R, Math.sin(a1) * R];
      const i0 = [Math.cos(a0) * (R - w), Math.sin(a0) * (R - w)], i1 = [Math.cos(a1) * (R - w), Math.sin(a1) * (R - w)];
      for (const z of [w / 2, -w / 2]) {
        const n = [0, 0, Math.sign(z)];
        if (z > 0) this.quad([i0[0], i0[1], z], [o0[0], o0[1], z], [o1[0], o1[1], z], [i1[0], i1[1], z], n, col);
        else this.quad([i1[0], i1[1], z], [o1[0], o1[1], z], [o0[0], o0[1], z], [i0[0], i0[1], z], n, col);
      }
      this.quad([o0[0], o0[1], -w / 2], [o0[0], o0[1], w / 2], [o1[0], o1[1], w / 2], [o1[0], o1[1], -w / 2], [Math.cos(a0), Math.sin(a0), 0], col);
    }
  }
  build(gl) { return gl.mesh(new Float32Array(this.v), new Uint32Array(this.i)); }
}
const hex = (h, a = 1) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, a]; };
