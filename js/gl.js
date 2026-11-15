// A small WebGL engine for Funz Online: matrices, shaders (world, balls, particles,
// sky, water) and a mesh builder for low-poly and smooth cartoon models.
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
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
  // model matrix from a position, a 3x3 rotation and a scale (one number, or [x,y,z])
  model(p, R, s) {
    R = R || I3; const sx = s === undefined ? 1 : s.length ? s[0] : s, sy = s === undefined ? 1 : s.length ? s[1] : s, sz = s === undefined ? 1 : s.length ? s[2] : s;
    return new Float32Array([R[0] * sx, R[1] * sx, R[2] * sx, 0, R[3] * sy, R[4] * sy, R[5] * sy, 0, R[6] * sz, R[7] * sz, R[8] * sz, 0, p[0], p[1], p[2], 1]);
  },
  rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 1, 0, s, 0, c]; },
  rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, s, 0, -s, c]; },
  rotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, -s, c, 0, 0, 0, 1]; },
  mul3(a, b) { const o = new Array(9); for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) o[c * 3 + r] = a[r] * b[c * 3] + a[3 + r] * b[c * 3 + 1] + a[6 + r] * b[c * 3 + 2]; return o; },
  apply3(R, v) { return [R[0] * v[0] + R[3] * v[1] + R[6] * v[2], R[1] * v[0] + R[4] * v[1] + R[7] * v[2], R[2] * v[0] + R[5] * v[1] + R[8] * v[2]]; },
  scaled(R, s) { if (s === undefined || s === 1) return R; const a = s.length ? s : [s, s, s]; return [R[0] * a[0], R[1] * a[0], R[2] * a[0], R[3] * a[1], R[4] * a[1], R[5] * a[1], R[6] * a[2], R[7] * a[2], R[8] * a[2]]; },
  invT3(m) { // inverse transpose (for turning normals)
    const a = m[0], b = m[3], c = m[6], d = m[1], e = m[4], f = m[7], g = m[2], h = m[5], i = m[8];
    const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g, det = a * A + b * B + c * C || 1;
    const D = c * h - b * i, E = a * i - c * g, F = b * g - a * h, G = b * f - c * e, H = c * d - a * f, I = a * e - b * d;
    return [A / det, D / det, G / det, B / det, E / det, H / det, C / det, F / det, I / det];
  },
  axisAngle(x, y, z, a) { const c = Math.cos(a), s = Math.sin(a), t = 1 - c; return [t * x * x + c, t * x * y + s * z, t * x * z - s * y, t * x * y - s * z, t * y * y + c, t * y * z + s * x, t * x * z + s * y, t * y * z - s * x, t * z * z + c]; },
  ortho3(R) {
    let [ax, ay, az] = [R[0], R[1], R[2]]; let l = Math.hypot(ax, ay, az); ax /= l; ay /= l; az /= l;
    let [bx, by, bz] = [R[3], R[4], R[5]]; const d = ax * bx + ay * by + az * bz; bx -= d * ax; by -= d * ay; bz -= d * az; l = Math.hypot(bx, by, bz); bx /= l; by /= l; bz /= l;
    return [ax, ay, az, bx, by, bz, ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
  },
  // a rotation whose Y axis points along d
  aim(d) {
    const l = Math.hypot(d[0], d[1], d[2]) || 1, y = [d[0] / l, d[1] / l, d[2] / l], h = Math.abs(y[1]) > 0.99 ? [1, 0, 0] : [0, 1, 0];
    let x = [h[1] * y[2] - h[2] * y[1], h[2] * y[0] - h[0] * y[2], h[0] * y[1] - h[1] * y[0]]; const xl = Math.hypot(...x); x = x.map(v => v / xl);
    const z = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
    return [x[0], x[1], x[2], y[0], y[1], y[2], z[0], z[1], z[2]];
  },
};
const IDENT = M4.ident(), ONE3 = new Float32Array([1, 1, 1]), OUTLINE = new Float32Array([0.1, 0.1, 0.16]);

const PREC = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
// Everything in the world. Vertex colour alpha: 1 = normal, 0.5..0.99 = glowing, below 0.5 = see-through.
const WORLD_VS = `attribute vec3 aP;attribute vec3 aN;attribute vec4 aC;
uniform mat4 uVP;uniform mat4 uM;uniform vec3 uEye;uniform float uOutline;
varying vec3 vN;varying vec4 vC;varying vec3 vR;
void main(){vec4 w=uM*vec4(aP+aN*uOutline,1.0);vR=w.xyz-uEye;vN=mat3(uM)*aN;vC=aC;gl_Position=uVP*w;}`;
const WORLD_FS = PREC + `varying vec3 vN;varying vec4 vC;varying vec3 vR;
uniform vec3 uSun;uniform vec3 uSunC;uniform vec3 uSky;uniform vec3 uGround;uniform vec3 uFog;uniform float uFogD;
uniform float uAlpha;uniform vec3 uTint;uniform float uGlow;uniform float uToon;uniform float uRim;uniform float uSpec;uniform float uOutline;uniform vec3 uOutCol;
uniform vec4 uL[8];uniform vec3 uLC[8];
void main(){
  float f=clamp(1.0-exp(-pow(length(vR)*uFogD,2.0)),0.0,1.0);
  if(uOutline>0.0){gl_FragColor=vec4(mix(uOutCol,uFog,f),1.0);return;}
  vec3 n=normalize(vN);float d=max(dot(n,uSun),0.0);
  if(uToon>0.5)d=smoothstep(0.02,0.12,d)*0.55+smoothstep(0.48,0.6,d)*0.45;
  vec3 light=mix(uGround,uSky,n.y*0.5+0.5)+uSunC*d;
  for(int i=0;i<8;i++){vec3 dv=uL[i].xyz-vR;float r=uL[i].w;if(r>0.0){float k=max(0.0,1.0-length(dv)/r);light+=uLC[i]*k*k*(0.35+0.65*max(dot(n,normalize(dv)),0.0));}}
  vec3 c=vC.rgb*uTint;vec3 vd=normalize(-vR);
  float sp=pow(max(dot(reflect(-uSun,n),vd),0.0),24.0)*uSpec*length(uSunC);
  float rim=pow(1.0-max(dot(n,vd),0.0),3.0)*uRim;
  float glow=(vC.a<0.99&&vC.a>0.5)?1.0:uGlow;
  c=c*mix(light,vec3(1.15),glow)+sp+rim*(uSky+uSunC*0.4);
  gl_FragColor=vec4(mix(c,uFog,f),(vC.a<0.5?vC.a*2.0:1.0)*uAlpha);}`;

// Player balls: the pattern ("skin") is painted by the shader so it stays crisp while the ball rolls.
const BALL_VS = `attribute vec3 aP;uniform mat4 uVP;uniform mat4 uM;uniform vec3 uEye;uniform float uOutline;
varying vec3 vL;varying vec3 vN;varying vec3 vR;
void main(){vL=aP;vec4 w=uM*vec4(aP*(1.0+uOutline),1.0);vR=w.xyz-uEye;vN=mat3(uM)*aP;gl_Position=uVP*w;}`;
const BALL_FS = PREC + `varying vec3 vL;varying vec3 vN;varying vec3 vR;
uniform vec3 uSun;uniform vec3 uSunC;uniform vec3 uSky;uniform vec3 uGround;uniform vec3 uFog;uniform float uFogD;
uniform vec3 uA;uniform vec3 uB;uniform float uSkin;uniform float uTime;uniform float uOutline;uniform vec3 uOutCol;uniform float uAlpha;uniform mat3 uR3;
float h3(vec3 q){return fract(sin(dot(q,vec3(12.9898,78.233,37.719)))*43758.5453);}
float n3(vec3 q){vec3 i=floor(q),f=fract(q);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 q){return n3(q)*0.5+n3(q*2.1+3.1)*0.3+n3(q*4.3+7.7)*0.2;}
float ico(vec3 p){vec3 q=abs(p);return max(max(dot(q,vec3(0.0,0.525731,0.850651)),dot(q,vec3(0.525731,0.850651,0.0))),dot(q,vec3(0.850651,0.0,0.525731)));}
float dod(vec3 p){vec3 q=abs(p);float a=dot(q,vec3(0.57735));a=max(a,dot(q,vec3(0.0,0.356822,0.934172)));a=max(a,dot(q,vec3(0.356822,0.934172,0.0)));return max(a,dot(q,vec3(0.934172,0.0,0.356822)));}
vec3 hsv(float h){return clamp(abs(fract(h+vec3(0.0,0.6667,0.3333))*6.0-3.0)-1.0,0.0,1.0);}
float star5(vec2 p,float r,float rf){const vec2 k1=vec2(0.809017,-0.587785);const vec2 k2=vec2(-0.809017,-0.587785);
  p.x=abs(p.x);p-=2.0*max(dot(k1,p),0.0)*k1;p-=2.0*max(dot(k2,p),0.0)*k2;p.x=abs(p.x);p.y-=r;
  vec2 ba=rf*vec2(0.587785,0.809017)-vec2(0.0,1.0);float h=clamp(dot(p,ba)/dot(ba,ba),0.0,r);return length(p-ba*h)*sign(p.y*ba.x-p.x*ba.y);}
void main(){
  float fog=clamp(1.0-exp(-pow(length(vR)*uFogD,2.0)),0.0,1.0);
  if(uOutline>0.0){gl_FragColor=vec4(mix(uOutCol,uFog,fog),1.0);return;}
  vec3 p=normalize(vL),n=normalize(vN),vd=normalize(-vR);
  vec3 A=uA,B=uB,col=A;float glow=0.0,gloss=0.45,metal=0.0,alpha=1.0;
  float lon=atan(p.z,p.x),lat=asin(clamp(p.y,-1.0,1.0)),s=uSkin;
  vec2 pz=p.xy/(1.0+abs(p.z));   // flat picture of each side of the ball (for emblems)
  if(s<0.5){}
  else if(s<1.5){col=abs(p.z)<0.24?B:A;}
  else if(s<2.5){col=sin(p.y*12.0)>0.0?A:B;}
  else if(s<3.5){col=max(ico(p),dod(p))>0.957?B:A;}
  else if(s<4.5){col=p.y>0.04?A:(p.y<-0.04?B:vec3(1.0));}
  else if(s<5.5){col=p.x*p.y*p.z>0.0?A:B;}
  else if(s<6.5){col=sin(lon*3.0+p.y*5.0)>0.0?A:B;}
  else if(s<7.5){col=star5(pz,0.5,0.45)<0.0?B:A;}
  else if(s<8.5){float w=floor((lon+3.14159)/6.28318*6.0);float m=mod(w,2.0);col=m>0.5?vec3(1.0):(w<1.5?A:(w<3.5?B:vec3(1.0,0.82,0.2)));if(abs(p.y)>0.93)col=vec3(1.0);}
  else if(s<9.5){col=ico(p)>0.937?A*0.25:vec3(0.96);if(abs(dod(p)-0.9)<0.006)col*=0.8;}
  else if(s<10.5){float w=0.035;col=(abs(p.x)<w||abs(p.y)<w||abs(length(p.xy)-0.8)<w)?vec3(0.1):A;}
  else if(s<11.5){col=abs(p.y-0.42*sin(2.0*lon))<0.05?vec3(1.0):A;}
  else if(s<12.5){col=mix(vec3(0.1,0.4,0.15),vec3(0.45,0.78,0.3),step(0.0,sin(lon*9.0+sin(lat*5.0)*0.7)));}
  else if(s<13.5){float a=acos(abs(p.z));col=a<0.26?B:(a<0.52?A:(a<0.78?B:A));}
  else if(s<14.5){col=hsv(lat/3.14159+0.5);gloss=0.6;}
  else if(s<15.5){float m=fbm(p*3.0+fbm(p*2.0)*2.0);col=mix(A,B,smoothstep(0.38,0.62,m));col=mix(col,vec3(1.0),smoothstep(0.02,0.0,abs(m-0.5))*0.6);gloss=0.8;}
  else if(s<16.5){float z=abs(fract(lon*1.2732)*2.0-1.0);col=sin((p.y+0.22*z)*13.0)>0.0?A:B;}
  else if(s<17.5){float h=h3(floor(p*4.0+0.5));col=h<0.45?A:(h<0.8?B:A*0.6);}
  else if(s<18.5){vec3 r=reflect(-vd,n);float e=smoothstep(-0.2,0.3,r.y);col=mix(vec3(0.45,0.25,0.05),vec3(1.0,0.93,0.6),e)*vec3(1.0,0.84,0.35)*1.15;col*=1.0-0.35*exp(-pow(r.y*7.0,2.0));metal=1.0;gloss=1.4;}
  else if(s<19.5){vec3 r=reflect(-vd,n);float e=smoothstep(-0.15,0.25,r.y);col=mix(uGround*1.6+vec3(0.12),uSky*1.5+vec3(0.35),e);col*=1.0-0.5*exp(-pow(r.y*8.0,2.0));metal=1.0;gloss=1.6;}
  else if(s<20.5){col=mix(vec3(0.7,0.9,1.0),vec3(1.0),fbm(p*5.0)*0.9);col=mix(col,A,0.15);gloss=1.3;}
  else if(s<21.5){float m=abs(fbm(p*3.5+vec3(0.0,uTime*0.03,0.0))-0.5);float g=smoothstep(0.07,0.0,m);col=mix(vec3(0.13,0.09,0.09),vec3(1.0,0.5,0.08),g);glow=g;}
  else if(s<22.5){float nb=fbm(p*2.5+7.0);col=mix(vec3(0.05,0.02,0.16),mix(vec3(0.5,0.15,0.7),vec3(0.1,0.45,0.95),fbm(p*1.7)),nb*nb*1.5);float st=step(0.986,h3(floor(p*38.0)))*(0.6+0.4*sin(uTime*3.0+h3(floor(p*38.0))*40.0));col+=st;glow=clamp(st+nb*0.25,0.0,1.0);}
  else if(s<23.5){float c=fbm(p*2.2+3.0);vec3 land=mix(vec3(0.2,0.62,0.26),vec3(0.78,0.72,0.42),smoothstep(0.56,0.7,c));col=c>0.5?land:mix(vec3(0.05,0.25,0.62),vec3(0.12,0.5,0.85),c*2.0);if(abs(p.y)>0.87)col=vec3(0.97);col=mix(col,vec3(1.0),smoothstep(0.6,0.7,fbm(p*4.0+vec3(uTime*0.02,0.0,0.0)))*0.75);}
  else if(s<24.5){float c=fbm(p*3.0);col=vec3(0.6)+c*0.22;float d=max(ico(p),dod(p));col*=d>0.975?0.72:(d>0.962?1.1:1.0);}
  else if(s<25.5){vec3 t=floor(p*5.0)+0.5;vec3 wn=normalize(uR3*normalize(t));float sp=pow(max(dot(reflect(-uSun,wn),vd),0.0),18.0);col=mix(vec3(0.62,0.66,0.76),A,0.35)*(0.65+0.5*h3(t))+sp*2.0;glow=clamp(sp,0.0,1.0);gloss=0.0;}
  else if(s<26.5){vec3 g=abs(fract(p*4.0)-0.5);float ln=step(0.455,max(g.x,max(g.y,g.z)));col=mix(vec3(0.1,0.13,0.18),vec3(0.3,1.0,0.9),ln);glow=ln*(0.55+0.45*sin(uTime*3.0+p.y*9.0));}
  else if(s<27.5){float c=fbm(p*2.5+vec3(uTime*0.08,0.0,uTime*0.05));col=mix(vec3(0.14,0.16,0.22),vec3(0.58,0.63,0.72),c);float fl=step(1.55,sin(uTime*1.7)+sin(uTime*2.9+1.0));float bolt=step(abs(fbm(p*5.0+4.0)-0.5),0.014);col=mix(col,vec3(1.0,1.0,0.75),bolt*(0.35+0.65*fl));glow=bolt*(0.3+0.7*fl);}
  else if(s<28.5){float c=fbm(p*4.0+uTime*0.1);col=mix(vec3(1.0,0.5,0.05),vec3(1.0,0.95,0.45),c);glow=1.0;}
  else if(s<29.5){float rm=pow(1.0-max(dot(n,vd),0.0),2.0);col=mix(A,vec3(1.0),0.55)+hsv(rm*1.3+lon*0.08)*0.25;alpha=0.2+rm*0.75;gloss=1.5;}
  else if(s<30.5){col=sin(lon*4.0+lat*3.0)>0.0?A:vec3(1.0);gloss=0.9;}
  else if(s<31.5){float a=acos(abs(p.z)),l2=atan(p.y,p.x);col=a<0.2?vec3(1.0,0.85,0.25):(a<0.62+0.2*cos(l2*6.0)?B:A);}
  else if(s<32.5){vec2 q=pz*2.3;q.y+=0.25;float x=abs(q.x),y=q.y;float h=pow(x*x+y*y-0.5,3.0)-x*x*y*y*y;col=h<0.0?B:A;}
  else if(s<33.5){vec2 q=pz;float d=min(length(q-vec2(0.0,-0.12))-0.2,min(min(length(q-vec2(-0.26,0.12))-0.1,length(q-vec2(0.26,0.12))-0.1),min(length(q-vec2(-0.1,0.28))-0.1,length(q-vec2(0.1,0.28))-0.1)));col=d<0.0?B:A;}
  else if(s<34.5){vec2 q=pz;float z=abs(q.x-0.16*sign(q.y)+q.y*0.5);col=(z<0.11&&abs(q.y)<0.44)?B:A;}
  else{float t=fbm(p*3.0+vec3(0.0,uTime*0.2,0.0));col=mix(A,B,smoothstep(0.3,0.7,t+p.y*0.4));glow=0.35;}
  float d=max(dot(n,uSun),0.0);float td=smoothstep(0.0,0.12,d)*0.5+smoothstep(0.45,0.6,d)*0.5;
  vec3 light=mix(uGround,uSky,n.y*0.5+0.5)*1.15+uSunC*td;
  vec3 c=metal>0.5?col*(0.5+0.65*td*length(uSunC)+0.25*length(uSky)):col*light;
  float sp=pow(max(dot(reflect(-uSun,n),vd),0.0),42.0)*gloss*(0.25+length(uSunC));
  float rim=pow(1.0-max(dot(n,vd),0.0),3.0);
  c+=sp+rim*(uSky*0.55+uSunC*0.2);
  c=mix(c,col*1.25,glow);
  gl_FragColor=vec4(mix(c,uFog,fog),alpha*uAlpha);}`;

// Particles: little flat shapes that always face the camera.
const PART_VS = `attribute vec3 aP;attribute vec3 aO;attribute vec4 aC;attribute float aS;
uniform mat4 uVP;uniform vec3 uRight;uniform vec3 uUp;uniform vec3 uEye;uniform float uFogD;
varying vec2 vUV;varying vec4 vC;varying float vS;varying float vF;
void main(){vec3 w=aP+(uRight*aO.x+uUp*aO.y)*aO.z;vUV=aO.xy;vC=aC;vS=aS;vF=clamp(1.0-exp(-pow(length(w-uEye)*uFogD,2.0)),0.0,1.0);gl_Position=uVP*vec4(w,1.0);}`;
const PART_FS = PREC + `varying vec2 vUV;varying vec4 vC;varying float vS;varying float vF;uniform vec3 uFog;
void main(){vec2 p=vUV;float r=length(p),a=0.0,s=vS,add=0.0;
  if(s>19.5){add=1.0;s-=20.0;}
  if(s<0.5)a=smoothstep(1.0,0.0,r);
  else if(s<1.5)a=step(r,0.9);
  else if(s<2.5){float an=atan(p.y,p.x);a=step(r,0.42+0.5*pow(abs(cos(an*2.5)),6.0));}
  else if(s<3.5){vec2 q=p*1.25;q.y+=0.25;float x=abs(q.x),y=q.y;a=step(pow(x*x+y*y-0.5,3.0)-x*x*y*y*y,0.0);}
  else if(s<4.5)a=step(max(abs(p.x),abs(p.y)),0.8);
  else if(s<5.5)a=step(abs(r-0.75),0.14);
  else if(s<6.5)a=smoothstep(1.0,0.2,pow(abs(p.x),0.6)+pow(abs(p.y),0.6));
  else if(s<7.5){float an=atan(p.y,p.x);a=step(r,0.3+0.65*pow(abs(cos(an*3.0)),10.0));}
  else if(s<8.5)a=step(p.x*p.x*2.6+p.y*p.y,0.8);
  else if(s<9.5)a=step(abs(p.x),0.13)*smoothstep(1.0,0.4,abs(p.y));
  else a=smoothstep(1.0,0.5,r)*0.5+step(abs(r-0.8),0.1)*0.5;
  a*=vC.a*(1.0-vF);if(a<0.01)discard;
  gl_FragColor=vec4(vC.rgb*a,a*(1.0-add));}`;

// The sky: a soft gradient, the sun, the moon and stars at night.
const SKY_VS = `attribute vec3 aP;varying vec2 vP;void main(){vP=aP.xy;gl_Position=vec4(aP.xy,0.9999,1.0);}`;
const SKY_FS = PREC + `varying vec2 vP;uniform vec3 uRight;uniform vec3 uUp;uniform vec3 uFwd;uniform vec2 uTan;uniform vec3 uSun;uniform vec3 uZen;uniform vec3 uHor;uniform vec3 uSunC;uniform float uNight;uniform float uTime;
float h3(vec3 q){return fract(sin(dot(q,vec3(12.9898,78.233,37.719)))*43758.5453);}
void main(){vec3 d=normalize(uFwd+uRight*vP.x*uTan.x+uUp*vP.y*uTan.y);
  float t=pow(1.0-max(d.y,0.0),3.2);vec3 c=mix(uZen,uHor,t);
  float s=max(dot(d,uSun),0.0);
  c+=uSunC*(pow(s,90.0)*0.5+pow(s,10.0)*0.14);
  c=mix(c,uSunC*1.15+vec3(0.1),smoothstep(0.9991,0.9995,s)*step(0.0,d.y+0.02));
  if(uNight>0.02&&d.y>0.0){vec3 q=d*90.0;vec3 cl=floor(q);float h=h3(cl);float st=step(0.9955,h)*smoothstep(0.6,0.0,length(fract(q)-0.5));
    c+=st*uNight*(0.6+0.4*sin(uTime*2.0+h*60.0))*smoothstep(0.0,0.25,d.y);
    vec3 m=normalize(vec3(-uSun.x,max(0.35,-uSun.y+0.5),-uSun.z));float ms=dot(d,m);
    c=mix(c,vec3(0.93,0.95,1.0),smoothstep(0.9985,0.9989,ms)*uNight);c+=vec3(0.5,0.6,0.8)*pow(max(ms,0.0),60.0)*0.25*uNight;}
  gl_FragColor=vec4(c,1.0);}`;

// Water: gentle moving waves with flat low-poly facets.
const WATER_VS = `attribute vec3 aP;attribute vec4 aC;uniform mat4 uVP;uniform vec3 uEye;uniform float uTime;
varying vec3 vR;varying vec4 vC;varying vec3 vW;
void main(){vec3 w=aP;w.y+=sin(w.x*0.31+uTime*1.3)*0.11+sin(w.z*0.27+uTime*1.05)*0.1+sin((w.x+w.z)*0.13+uTime*0.7)*0.12;vW=w;vR=w-uEye;vC=aC;gl_Position=uVP*vec4(w,1.0);}`;
const WATER_FS = (deriv) => (deriv ? '#extension GL_OES_standard_derivatives : enable\n' : '') + PREC + `varying vec3 vR;varying vec4 vC;varying vec3 vW;
uniform vec3 uSun;uniform vec3 uSunC;uniform vec3 uSky;uniform vec3 uFog;uniform float uFogD;uniform vec3 uHor;
void main(){
  ${deriv ? 'vec3 n=normalize(cross(dFdx(vR),dFdy(vR)));if(n.y<0.0)n=-n;' : 'vec3 n=vec3(0.0,1.0,0.0);'}
  vec3 vd=normalize(-vR);float fr=pow(1.0-max(dot(n,vd),0.0),3.0);
  float d=max(dot(n,uSun),0.0);
  vec3 c=vC.rgb*(uSky*1.3+uSunC*d*0.7);
  c=mix(c,uHor,fr*0.55);
  c+=uSunC*pow(max(dot(reflect(-uSun,n),vd),0.0),60.0)*0.9;
  float f=clamp(1.0-exp(-pow(length(vR)*uFogD,2.0)),0.0,1.0);
  gl_FragColor=vec4(mix(c,uFog,f),min(1.0,vC.a+fr*0.3));}`;

class GL {
  constructor(canvas) {
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false, powerPreference: 'high-performance' }) || canvas.getContext('experimental-webgl');
    if (!gl || !gl.getExtension('OES_element_index_uint')) throw new Error('webgl');
    this.gl = gl; this.canvas = canvas;
    this.deriv = !!gl.getExtension('OES_standard_derivatives');
    const scene = ['uVP', 'uEye', 'uSun', 'uSunC', 'uSky', 'uGround', 'uFog', 'uFogD'];
    this.pw = this.program(WORLD_VS, WORLD_FS, ['aP', 'aN', 'aC'], [...scene, 'uM', 'uAlpha', 'uTint', 'uGlow', 'uToon', 'uRim', 'uSpec', 'uOutline', 'uOutCol', 'uL', 'uLC']);
    this.pb = this.program(BALL_VS, BALL_FS, ['aP'], [...scene, 'uM', 'uA', 'uB', 'uSkin', 'uTime', 'uOutline', 'uOutCol', 'uAlpha', 'uR3']);
    this.pp = this.program(PART_VS, PART_FS, ['aP', 'aO', 'aC', 'aS'], ['uVP', 'uRight', 'uUp', 'uEye', 'uFogD', 'uFog']);
    this.ps = this.program(SKY_VS, SKY_FS, ['aP'], ['uRight', 'uUp', 'uFwd', 'uTan', 'uSun', 'uZen', 'uHor', 'uSunC', 'uNight', 'uTime']);
    this.pwt = this.program(WATER_VS, WATER_FS(this.deriv), ['aP', 'aN', 'aC'], ['uVP', 'uEye', 'uTime', 'uSun', 'uSunC', 'uSky', 'uFog', 'uFogD', 'uHor']);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
    // a smooth ball, a full-screen triangle for the sky, and a buffer for particles
    const sv = [], si = [], rings = 20, segs = 32;
    for (let i = 0; i <= rings; i++) { const th = i / rings * Math.PI; for (let j = 0; j <= segs; j++) { const ph = j / segs * Math.PI * 2; sv.push(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)); } }
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) { const a = i * (segs + 1) + j, d = a + segs + 1; si.push(a, a + 1, d, a + 1, d + 1, d); }
    this.sphere = { vb: this.buf(gl.ARRAY_BUFFER, new Float32Array(sv)), ib: this.buf(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(si)), n: si.length };
    this.tri = this.buf(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]));
    this.MAXP = 1600; this.pdata = new Float32Array(this.MAXP * 4 * 11);
    this.pvb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.pvb); gl.bufferData(gl.ARRAY_BUFFER, this.pdata.byteLength, gl.DYNAMIC_DRAW);
    const pi = new Uint16Array(this.MAXP * 6); for (let k = 0; k < this.MAXP; k++) pi.set([k * 4, k * 4 + 1, k * 4 + 2, k * 4, k * 4 + 2, k * 4 + 3], k * 6);
    this.pib = this.buf(gl.ELEMENT_ARRAY_BUFFER, pi);
    this.cur = null; this.frameId = 0; this.S = null; this.matState = '';
  }
  buf(target, data) { const gl = this.gl, b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; }
  program(vs, fs, attrs, uniforms) {
    const gl = this.gl, sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    attrs.forEach((a, i) => gl.bindAttribLocation(p, i, a)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    const u = {}; for (const n of uniforms) u[n] = gl.getUniformLocation(p, n);
    return { p, n: attrs.length, u, frame: -1 };
  }
  // start a frame: S holds the camera and the light for everything drawn this frame
  begin(S) { this.S = S; this.frameId++; this.cur = null; this.matState = ''; }
  use(pr) {
    const gl = this.gl;
    if (this.cur !== pr) { gl.useProgram(pr.p); for (let i = 0; i < 4; i++) { if (i < pr.n) gl.enableVertexAttribArray(i); else gl.disableVertexAttribArray(i); } this.cur = pr; }
    if (pr.frame !== this.frameId) {
      pr.frame = this.frameId; const S = this.S, u = pr.u;
      if (u.uVP) gl.uniformMatrix4fv(u.uVP, false, S.vp);
      if (u.uEye) gl.uniform3fv(u.uEye, S.eye);
      if (u.uSun) gl.uniform3fv(u.uSun, S.sun);
      if (u.uSunC) gl.uniform3fv(u.uSunC, S.sunC);
      if (u.uSky) gl.uniform3fv(u.uSky, S.sky);
      if (u.uGround) gl.uniform3fv(u.uGround, S.ground);
      if (u.uFog) gl.uniform3fv(u.uFog, S.fog);
      if (u.uFogD) gl.uniform1f(u.uFogD, S.fogD);
      if (u.uTime) gl.uniform1f(u.uTime, S.time % 10000);
      if (u.uHor) gl.uniform3fv(u.uHor, S.horizon);
      if (u.uRight) { gl.uniform3fv(u.uRight, S.right); gl.uniform3fv(u.uUp, S.up); }
      if (pr === this.pw) {
        gl.uniform4fv(u.uL, S.lp); gl.uniform3fv(u.uLC, S.lc);
        gl.uniform1f(u.uToon, 0); gl.uniform1f(u.uRim, 0); gl.uniform1f(u.uSpec, 0.18); gl.uniform1f(u.uOutline, 0); gl.uniform3f(u.uOutCol, 0.1, 0.1, 0.16);
        this.matState = '0|0|0.18';
      }
      if (pr === this.pb) { gl.uniform1f(u.uOutline, 0); gl.uniform3f(u.uOutCol, 0.1, 0.1, 0.16); }
    }
  }
  mesh(data, idx) { const gl = this.gl; return { vb: this.buf(gl.ARRAY_BUFFER, data), ib: this.buf(gl.ELEMENT_ARRAY_BUFFER, idx), n: idx.length }; }
  free(m) { if (!m || !m.vb) return; this.gl.deleteBuffer(m.vb); this.gl.deleteBuffer(m.ib); m.vb = null; }
  bind(m) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, m.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 40, 0); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 40, 12); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 40, 24);
  }
  // look of the next things drawn with draw(): cartoon shading, edge light, shine
  mat(toon, rim, spec) {
    const k = toon + '|' + rim + '|' + spec; this.use(this.pw); if (k === this.matState) return; this.matState = k;
    const gl = this.gl, u = this.pw.u; gl.uniform1f(u.uToon, toon); gl.uniform1f(u.uRim, rim); gl.uniform1f(u.uSpec, spec);
  }
  fog(d) { this.use(this.pw); this.gl.uniform1f(this.pw.u.uFogD, d === undefined ? this.S.fogD : d); }
  draw(m, model, alpha = 1, tint, glow = 0) {
    if (!m || !m.n || !m.vb) return;
    const gl = this.gl, u = this.pw.u; this.use(this.pw); this.bind(m);
    gl.uniformMatrix4fv(u.uM, false, model || IDENT);
    gl.uniform1f(u.uAlpha, alpha); gl.uniform3fv(u.uTint, tint || ONE3); gl.uniform1f(u.uGlow, glow);
    gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_INT, 0);
  }
  // a dark edge around a smooth model (draw after the model itself)
  outline(m, model, w = 0.03, col) {
    if (!m || !m.n || !m.vb) return;
    const gl = this.gl, u = this.pw.u; this.use(this.pw); this.bind(m);
    gl.cullFace(gl.FRONT); gl.uniform1f(u.uOutline, w); gl.uniform3fv(u.uOutCol, col || OUTLINE);
    gl.uniformMatrix4fv(u.uM, false, model || IDENT);
    gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_INT, 0);
    gl.uniform1f(u.uOutline, 0); gl.cullFace(gl.BACK);
  }
  // a player ball: model = position + roll + size; skin is the pattern number, A and B its two colours
  ball(model, skin, A, B, alpha = 1, outline = 0) {
    const gl = this.gl, u = this.pb.u; this.use(this.pb);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sphere.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.sphere.ib);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
    gl.uniformMatrix4fv(u.uM, false, model);
    gl.uniformMatrix3fv(u.uR3, false, [model[0], model[1], model[2], model[4], model[5], model[6], model[8], model[9], model[10]]);
    if (outline) { gl.cullFace(gl.FRONT); gl.uniform1f(u.uOutline, outline); gl.drawElements(gl.TRIANGLES, this.sphere.n, gl.UNSIGNED_SHORT, 0); gl.uniform1f(u.uOutline, 0); gl.cullFace(gl.BACK); return; }
    gl.uniform1f(u.uSkin, skin); gl.uniform3fv(u.uA, A); gl.uniform3fv(u.uB, B); gl.uniform1f(u.uAlpha, alpha);
    gl.drawElements(gl.TRIANGLES, this.sphere.n, gl.UNSIGNED_SHORT, 0);
  }
  sky() {
    const gl = this.gl, u = this.ps.u, S = this.S; this.use(this.ps);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tri); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
    gl.uniform3fv(u.uFwd, S.fwd); gl.uniform2f(u.uTan, S.tanX, S.tanY); gl.uniform3fv(u.uZen, S.zenith); gl.uniform3fv(u.uHor, S.horizon);
    gl.uniform3fv(u.uSun, S.sunDisc || S.sun); gl.uniform3fv(u.uSunC, S.sunCol || S.sunC); gl.uniform1f(u.uNight, S.night);
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.depthMask(true); gl.enable(gl.DEPTH_TEST);
  }
  water(m, model) {
    if (!m || !m.n || !m.vb) return;
    const gl = this.gl; this.use(this.pwt); this.bind(m);
    gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_INT, 0);
  }
  // data: 11 numbers per corner, 4 corners per particle (see Particles in fx.js)
  particles(data, count) {
    if (!count) return;
    const gl = this.gl; this.use(this.pp);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pvb); gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, count * 44)); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.pib);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 44, 0); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 44, 12); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 44, 24); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 44, 40);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.drawElements(gl.TRIANGLES, count * 6, gl.UNSIGNED_SHORT, 0);
    gl.depthMask(true); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
}

// Builds meshes. Flat pieces (tri, quad, box, cyl, ico) give the low-poly look;
// smooth pieces (sph, lathe, caps, tor, rbox) are for characters, hats and items.
class MeshBuilder {
  constructor() { this.v = []; this.i = []; this.A = null; this.NA = null; this.P = null; this.stack = []; this.tris = null; }
  _set(A, p) { this.A = A; this.P = p; this.NA = A ? M4.invT3(A) : null; }
  at(p, R, s) { this.stack.length = 0; this._set(M4.scaled(R || I3, s), p); return this; }
  push(p, R, s) {
    this.stack.push([this.A, this.P]); const A = M4.scaled(R || I3, s);
    if (this.A) { const q = M4.apply3(this.A, p); this._set(M4.mul3(this.A, A), [q[0] + this.P[0], q[1] + this.P[1], q[2] + this.P[2]]); } else this._set(A, p);
    return this;
  }
  pop() { const t = this.stack.pop(); if (t && t[0]) this._set(t[0], t[1]); else this._set(null, null); return this; }
  reset() { this.stack.length = 0; this._set(null, null); return this; }
  collect() { this.tris = []; return this; }
  tf(q) { if (!this.A) return q; const r = M4.apply3(this.A, q); return [r[0] + this.P[0], r[1] + this.P[1], r[2] + this.P[2]]; }
  tn(n) { if (!this.A) return n; const r = M4.apply3(this.NA, n), l = Math.hypot(r[0], r[1], r[2]) || 1; return [r[0] / l, r[1] / l, r[2] / l]; }
  // ----- flat (low-poly) pieces -----
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
  // two-sided flat shape (leaves, flags, wings)
  tri2(a, b, c, col) { this.tri(a, b, c, col, true); this.tri(a, c, b, shadeC(col, 0.85), true); }
  box(x0, y0, z0, x1, y1, z1, col, shade = true, nc) {
    const s = (k) => shade ? [col[0] * k, col[1] * k, col[2] * k, col[3] ?? 1] : col;
    this.quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], col, nc);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], s(0.72), nc);
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], s(0.93), nc);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], s(0.93), nc);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], s(0.86), nc);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], s(0.86), nc);
  }
  // box with cut top edges for a softer low-poly look
  bevel(x0, y0, z0, x1, y1, z1, col, b = 0.06) {
    const s = k => [col[0] * k, col[1] * k, col[2] * k, col[3] ?? 1], yb = y1 - b;
    this.quad([x0 + b, y1, z0 + b], [x0 + b, y1, z1 - b], [x1 - b, y1, z1 - b], [x1 - b, y1, z0 + b], col);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], s(0.72));
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, yb, z1], [x0, yb, z1], s(0.93)); this.quad([x0, yb, z1], [x1, yb, z1], [x1 - b, y1, z1 - b], [x0 + b, y1, z1 - b], s(0.98));
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, yb, z0], [x1, yb, z0], s(0.93)); this.quad([x1, yb, z0], [x0, yb, z0], [x0 + b, y1, z0 + b], [x1 - b, y1, z0 + b], s(0.98));
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, yb, z0], [x1, yb, z1], s(0.86)); this.quad([x1, yb, z1], [x1, yb, z0], [x1 - b, y1, z0 + b], [x1 - b, y1, z1 - b], s(0.92));
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, yb, z1], [x0, yb, z0], s(0.86)); this.quad([x0, yb, z0], [x0, yb, z1], [x0 + b, y1, z1 - b], [x0 + b, y1, z0 + b], s(0.92));
  }
  cyl(x, y, z, r0, r1, h, seg, col, caps = true, rot = 0) {
    for (let j = 0; j < seg; j++) {
      const a0 = rot + j / seg * Math.PI * 2, a1 = rot + (j + 1) / seg * Math.PI * 2;
      const p = (r, a, yy) => [x + Math.cos(a) * r, yy, z + Math.sin(a) * r];
      const k = 0.85 + 0.15 * Math.cos(a0 - 0.8);
      this.quad(p(r0, a1, y), p(r0, a0, y), p(r1, a0, y + h), p(r1, a1, y + h), [col[0] * k, col[1] * k, col[2] * k, col[3] ?? 1]);
      if (caps) { if (r1 > 0) this.tri([x, y + h, z], p(r1, a1, y + h), p(r1, a0, y + h), col); if (r0 > 0) this.tri([x, y, z], p(r0, a0, y), p(r0, a1, y), shadeC(col, 0.75)); }
    }
  }
  cone(x, y, z, r, h, seg, col) { this.cyl(x, y, z, r, 0, h, seg, col, true); }
  // low-poly ball (icosphere). colFn(nx,ny,nz) per face; inward flips it; keep(m) can skip faces; wob bends it out of shape
  ico(cx, cy, cz, r, sub, colFn, inward, keep, wob) {
    const t = (1 + Math.sqrt(5)) / 2;
    let V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(v => { const l = Math.hypot(...v); return v.map(x => x / l); });
    let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    for (let s = 0; s < sub; s++) {
      const cache = new Map(), nf = [];
      const mid = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; if (cache.has(k)) return cache.get(k); const m = V[a].map((v, i) => (v + V[b][i]) / 2), l = Math.hypot(...m); V.push(m.map(x => x / l)); cache.set(k, V.length - 1); return V.length - 1; };
      for (const [a, b, c] of F) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
      F = nf;
    }
    const rr = r.length ? r : [r, r, r];
    const P = i => { const k = wob ? 1 + wob(V[i][0], V[i][1], V[i][2]) : 1; return [cx + V[i][0] * rr[0] * k, cy + V[i][1] * rr[1] * k, cz + V[i][2] * rr[2] * k]; };
    for (const [a, b, c] of F) {
      const m = [0, 1, 2].map(i => (V[a][i] + V[b][i] + V[c][i]) / 3);
      if (keep && !keep(m)) continue;
      const col = colFn(m[0], m[1], m[2]);
      if (inward) this.tri(P(a), P(c), P(b), col); else this.tri(P(a), P(b), P(c), col);
    }
  }
  // ----- smooth (cartoon) pieces -----
  vert(p, n, c) { p = this.tf(p); n = this.tn(n); this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], c[3] ?? 1); return this.v.length / 10 - 1; }
  // smooth ball or egg. r: one number or [x,y,z]. col: colour or fn(nx,ny,nz). grad darkens the underside a little
  sph(c, r, seg, col, grad = 0.2) {
    const rx = r.length ? r[0] : r, ry = r.length ? r[1] : r, rz = r.length ? r[2] : r, rings = seg, segs = seg * 2, base = this.v.length / 10;
    for (let i = 0; i <= rings; i++) {
      const th = i / rings * Math.PI, st = Math.sin(th), y = Math.cos(th);
      for (let j = 0; j <= segs; j++) {
        const ph = j / segs * Math.PI * 2, x = st * Math.cos(ph), z = st * Math.sin(ph);
        const cc = typeof col === 'function' ? col(x, y, z) : col, k = 1 - grad * (0.5 - y * 0.5);
        this.vert([c[0] + x * rx, c[1] + y * ry, c[2] + z * rz], [x / rx, y / ry, z / rz], [cc[0] * k, cc[1] * k, cc[2] * k, cc[3] ?? 1]);
      }
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) { const a = base + i * (segs + 1) + j, d = a + segs + 1; this.i.push(a, a + 1, d, a + 1, d + 1, d); }
  }
  // a shape spun around the Y axis. profile: [[radius, y], ...] from the bottom up
  lathe(profile, seg, col, grad = 0) {
    const base = this.v.length / 10, n = profile.length, y0 = profile[0][1], y1 = profile[n - 1][1];
    for (let k = 0; k < n; k++) {
      const a = profile[Math.max(0, k - 1)], b = profile[Math.min(n - 1, k + 1)];
      let nr = b[1] - a[1], ny = -(b[0] - a[0]); const l = Math.hypot(nr, ny) || 1; nr /= l; ny /= l;
      if (profile[k][0] === 0) { nr = 0; ny = k === 0 ? -1 : 1; }
      const t = (profile[k][1] - y0) / ((y1 - y0) || 1);
      for (let j = 0; j <= seg; j++) {
        const ph = j / seg * Math.PI * 2, cx = Math.cos(ph), cz = Math.sin(ph);
        const cc = typeof col === 'function' ? col(t, ph, k) : col, g = 1 - grad * (1 - t);
        this.vert([profile[k][0] * cx, profile[k][1], profile[k][0] * cz], [nr * cx, ny, nr * cz], [cc[0] * g, cc[1] * g, cc[2] * g, cc[3] ?? 1]);
      }
    }
    for (let k = 0; k < n - 1; k++) for (let j = 0; j < seg; j++) { const a = base + k * (seg + 1) + j, d = a + seg + 1; this.i.push(a, d, a + 1, a + 1, d, d + 1); }
  }
  // a rounded stick between two points (legs, ears, horns, branches)
  caps(a, b, ra, rb, seg, col, grad = 0) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(d[0], d[1], d[2]) || 0.001, q = 0.7071;
    this.push(a, M4.aim(d));
    this.lathe([[0, -ra], [ra * q, -ra * q], [ra, 0], [rb, len], [rb * q, len + rb * q], [0, len + rb]], seg, col, grad);
    this.pop();
  }
  // a ring (halo, life ring, hoop) lying flat around the Y axis
  tor(c, R, r, segR, segr, col) {
    const base = this.v.length / 10;
    for (let i = 0; i <= segR; i++) {
      const a = i / segR * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      for (let j = 0; j <= segr; j++) {
        const b = j / segr * Math.PI * 2, cb = Math.cos(b), sb = Math.sin(b);
        const cc = typeof col === 'function' ? col(a, b) : col;
        this.vert([c[0] + (R + r * cb) * ca, c[1] + r * sb, c[2] + (R + r * cb) * sa], [cb * ca, sb, cb * sa], cc);
      }
    }
    for (let i = 0; i < segR; i++) for (let j = 0; j < segr; j++) { const a = base + i * (segr + 1) + j, d = a + segr + 1; this.i.push(a, a + 1, d, a + 1, d + 1, d); }
  }
  // a soft box (pillowy shading, joins up nicely for outlines)
  rbox(x0, y0, z0, x1, y1, z1, col) {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2, hx = (x1 - x0) / 2, hy = (y1 - y0) / 2, hz = (z1 - z0) / 2;
    const V = (x, y, z, k) => { const n = [(x - cx) / hx, (y - cy) / hy, (z - cz) / hz], l = Math.hypot(...n); return this.vert([x, y, z], n.map(v => v / l), [col[0] * k, col[1] * k, col[2] * k, col[3] ?? 1]); };
    const Q = (a, b, c, d, k) => { const i0 = V(...a, k), i1 = V(...b, k), i2 = V(...c, k), i3 = V(...d, k); this.i.push(i0, i1, i2, i0, i2, i3); };
    Q([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], 1); Q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], 0.8);
    Q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], 0.95); Q([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], 0.95);
    Q([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], 0.9); Q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], 0.9);
  }
  build(gl) { return gl.mesh(new Float32Array(this.v), new Uint32Array(this.i)); }
}
const hex = (h, a = 1) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, a]; };
const shadeC = (c, k) => [c[0] * k, c[1] * k, c[2] * k, c[3] ?? 1];
const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] ?? 1];
const glowC = c => [c[0], c[1], c[2], 0.9];
