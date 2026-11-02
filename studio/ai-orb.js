/*!
 * AIOrb — glowing twisting-ribbon AI voice orb (WebGL, no dependencies)
 *
 * Usage:
 *   <canvas id="orb" style="width:240px;height:240px"></canvas>
 *   <script src="ai-orb.js"></script>
 *   <script>
 *     const orb = new AIOrb(document.getElementById('orb'));
 *     orb.setState('thinking');      // 'idle' | 'listening' | 'thinking' | 'speaking'
 *     orb.setLevel(0.7);             // optional: drive with real audio volume 0..1
 *   </script>
 *
 * Options: new AIOrb(canvas, {
 *   state: 'idle',
 *   colors: ['#19f5e0', '#2f6bff', '#a83cff'],  // left (cyan), mid (blue), accent (violet)
 *   glow: 1,                                     // 0..2
 *   speed: 1,                                    // global animation speed
 *   radius: 0.34                                 // orb radius as fraction of the canvas' short side
 * })
 * Methods: setState(name), setLevel(v | null), setColors([a,b,c]), destroy()
 * The canvas is transparent; looks best on dark backgrounds.
 */
(function (global) {
  'use strict';

  var STATES = {
    idle:      { twist: 0.0, spin: 0.0, a1: 0.035, f1: 1.0, s1: 0.8, a2: 0.0,  f2: 2.0, s2: 0.0,  breath: 1.0,  glow: 0.85 },
    listening: { twist: 1.3, spin: 0.7, a1: 0.24,  f1: 1.0, s1: 1.8, a2: 0.07, f2: 2.6, s2: -2.4, breath: 1.0,  glow: 1.0 },
    thinking:  { twist: 2.8, spin: 2.4, a1: 0.10,  f1: 0.8, s1: 1.1, a2: 0.0,  f2: 2.0, s2: 0.0,  breath: 0.96, glow: 1.0 },
    speaking:  { twist: 1.7, spin: 1.3, a1: 0.40,  f1: 1.7, s1: 5.2, a2: 0.24, f2: 3.6, s2: -7.5, breath: 1.0,  glow: 1.2 }
  };
  var KEYS = ['twist', 'a1', 'f1', 'a2', 'f2', 'breath', 'glow'];

  var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  var FRAG = [
    '#extension GL_OES_standard_derivatives : enable',
    'precision highp float;',
    'uniform vec2 uRes;uniform float uScale;',
    'uniform float uTwist,uSpin,uA1,uF1,uP1,uA2,uF2,uP2,uBreath,uGlow;',
    'uniform vec3 uC1,uC2,uC3;',
    'const float PI=3.14159265;',
    // returns (centre, half-height, cos(theta)) of the ribbon slice at x
    'vec3 slice(float x){',
    '  float r=sqrt(max(0.,1.-x*x));',
    '  float ct=cos(uTwist*x+uSpin);',
    '  float amp=abs(uA1)+abs(uA2);',
    '  float h=r*abs(ct)*(1.-0.75*amp);',
    '  float c=r*(uA1*sin(uF1*x*PI+uP1)+uA2*sin(uF2*x*PI+uP2));',
    '  return vec3(c,h,ct);',
    '}',
    'void main(){',
    '  vec2 p=(gl_FragCoord.xy-0.5*uRes)/uScale/uBreath;',
    '  float x=p.x, ax=abs(x);',
    '  vec3 s0=slice(clamp(x,-1.,1.));',
    '  float c=s0.x, h=s0.y, ct=s0.z;',
    '  float d=max(abs(p.y-c)-h, ax-1.);',
    '  float fw=max(fwidth(d),1e-4);',
    '  float fill=clamp(0.5-d/fw,0.,1.);',
    // shading
    '  float v=clamp((p.y-c)/max(h,1e-3),-1.,1.);',
    '  float front=step(0.,ct);',
    '  float t=smoothstep(-0.95,0.95,x);',
    '  vec3 col=mix(uC1,uC2,t*0.85);',
    '  float vio=smoothstep(0.05,0.95,x)*smoothstep(-0.8,0.6,mix(-v,v,front));',
    '  col=mix(col,uC3,vio*0.9);',
    '  col=mix(mix(col,uC2,0.2)*0.93,col,front);',
    '  col*=0.62+0.38*pow(abs(ct),0.5);',
    '  col*=0.8+0.2*(v*0.5+0.5);',
    '  float sp=exp(-pow((x+0.36)/0.045,2.))*0.6+exp(-pow((x+0.3)/0.17,2.))*0.18;',
    '  col+=vec3(0.7,1.,1.)*sp*front*(0.4+0.6*abs(ct))*(1.-0.5*abs(v));',
    '  col=min(col,vec3(1.));',
    // glow: distance to the shape, sampled across slices
    '  float md=1e3;',
    '  if(fill<1.){',
    '    for(int i=0;i<28;i++){',
    '      float xs=-1.+2.*(float(i)+0.5)/28.;',
    '      vec3 e=slice(xs);',
    '      md=min(md,length(vec2(x-xs,max(abs(p.y-e.x)-e.y,0.))));',
    '    }',
    '    if(ax<1.) md=min(md,max(d,0.));',
    '  } else md=0.;',
    '  float g=(exp(-md*5.5)*0.45+exp(-length(p)*2.4)*0.08)*uGlow;',
    '  vec3 gc=mix(uC1,uC3,t*0.9)*1.1;',
    '  float a=fill+g*(1.-fill);',
    '  gl_FragColor=vec4(col*fill+gc*g*(1.-fill),a);',
    '}'
  ].join('\n');

  function hex(c) {
    c = c.replace('#', '');
    if (c.length === 3) c = c.split('').map(function (k) { return k + k; }).join('');
    var n = parseInt(c, 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  function AIOrb(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.opts = {
      colors: opts.colors || ['#19f5e0', '#2f6bff', '#a83cff'],
      glow: opts.glow == null ? 1 : opts.glow,
      speed: opts.speed == null ? 1 : opts.speed,
      radius: opts.radius || 0.34
    };
    this.state = STATES[opts.state] ? opts.state : 'idle';
    this.cur = {};
    var base = STATES[this.state];
    for (var i = 0; i < KEYS.length; i++) this.cur[KEYS[i]] = base[KEYS[i]];
    this.cur.spinSpeed = base.spin; this.cur.s1 = base.s1; this.cur.s2 = base.s2;
    this.spin = 0; this.p1 = 0; this.p2 = 0; this.time = 0;
    this.level = null; this.simLevel = 0.5;
    this.visible = true;
    this.reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._init();
  }

  AIOrb.STATES = STATES;

  AIOrb.prototype._init = function () {
    var cv = this.canvas, self = this;
    var gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl || !gl.getExtension('OES_standard_derivatives')) { this._fallback(); return; }
    this.gl = gl;
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(pr); gl.useProgram(pr);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    var names = ['uRes', 'uScale', 'uTwist', 'uSpin', 'uA1', 'uF1', 'uP1', 'uA2', 'uF2', 'uP2', 'uBreath', 'uGlow', 'uC1', 'uC2', 'uC3'];
    for (var i = 0; i < names.length; i++) this.u[names[i]] = gl.getUniformLocation(pr, names[i]);
    this.setColors(this.opts.colors);

    this._resize = function () {
      var dpr = Math.min(global.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(cv.clientWidth * dpr)), h = Math.max(1, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    };
    this._resize();
    if (global.ResizeObserver) { this._ro = new ResizeObserver(this._resize); this._ro.observe(cv); }
    else global.addEventListener('resize', this._resize);
    if (global.IntersectionObserver) {
      this._io = new IntersectionObserver(function (e) { self.visible = e[0].isIntersecting; });
      this._io.observe(cv);
    }
    this._last = performance.now();
    this._loop = function (now) {
      self._raf = requestAnimationFrame(self._loop);
      var dt = Math.min(0.05, (now - self._last) / 1000); self._last = now;
      if (self.visible) self._frame(dt);
    };
    this._raf = requestAnimationFrame(this._loop);
  };

  AIOrb.prototype._frame = function (dt) {
    var gl = this.gl, cur = this.cur, tgt = STATES[this.state];
    var sp = this.opts.speed * (this.reduced ? 0.35 : 1);
    this.time += dt * sp;
    var k = 1 - Math.exp(-dt * 3.2);

    // audio level: external or simulated speech rhythm
    var lvl;
    if (this.level != null) lvl = this.level;
    else {
      var t = this.time;
      var target = 0.5 + 0.28 * Math.sin(t * 7.3) + 0.18 * Math.sin(t * 13.1 + 1.3) + 0.12 * Math.sin(t * 2.1);
      if (Math.sin(t * 0.9) > 0.75) target *= 0.25; // short pauses between "words"
      this.simLevel += (target - this.simLevel) * (1 - Math.exp(-dt * 10));
      lvl = this.simLevel;
    }
    lvl = Math.max(0, Math.min(1, lvl));
    var gain = this.state === 'speaking' ? 0.45 + 0.8 * lvl : 1;

    for (var i = 0; i < KEYS.length; i++) {
      var key = KEYS[i], goal = tgt[key];
      if (key === 'a1' || key === 'a2') goal *= gain;
      cur[key] += (goal - cur[key]) * k;
    }
    cur.spinSpeed += (tgt.spin - cur.spinSpeed) * k;
    cur.s1 += (tgt.s1 - cur.s1) * k; cur.s2 += (tgt.s2 - cur.s2) * k;

    this.spin += cur.spinSpeed * dt * sp;
    if (tgt.spin === 0) { // settle to a flat (circle-facing) angle
      var rest = Math.round(this.spin / Math.PI) * Math.PI;
      this.spin += (rest - this.spin) * k;
    }
    this.p1 += cur.s1 * dt * sp; this.p2 += cur.s2 * dt * sp;
    var breath = cur.breath * (1 + (this.state === 'idle' ? 0.025 : 0.012) * Math.sin(this.time * 1.6));

    var w = this.canvas.width, h = this.canvas.height, u = this.u;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u.uRes, w, h);
    gl.uniform1f(u.uScale, Math.min(w, h) * this.opts.radius);
    gl.uniform1f(u.uTwist, cur.twist); gl.uniform1f(u.uSpin, this.spin);
    gl.uniform1f(u.uA1, cur.a1); gl.uniform1f(u.uF1, cur.f1); gl.uniform1f(u.uP1, this.p1);
    gl.uniform1f(u.uA2, cur.a2); gl.uniform1f(u.uF2, cur.f2); gl.uniform1f(u.uP2, this.p2);
    gl.uniform1f(u.uBreath, breath); gl.uniform1f(u.uGlow, cur.glow * this.opts.glow);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  AIOrb.prototype._fallback = function () {
    var cv = this.canvas, ctx = cv.getContext('2d'); if (!ctx) return;
    var c = this.opts.colors, s = Math.min(cv.clientWidth, cv.clientHeight) || 100;
    cv.width = cv.height = s * 2;
    var g = ctx.createLinearGradient(0, 0, s * 2, 0);
    g.addColorStop(0.2, c[0]); g.addColorStop(0.65, c[1]); g.addColorStop(1, c[2]);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s, s, s * this.opts.radius * 2, 0, Math.PI * 2); ctx.fill();
  };

  AIOrb.prototype.setState = function (name) { if (STATES[name]) this.state = name; return this; };
  AIOrb.prototype.setLevel = function (v) { this.level = v == null ? null : +v; return this; };
  AIOrb.prototype.setColors = function (cols) {
    this.opts.colors = cols;
    if (!this.gl) return this;
    var gl = this.gl, a = hex(cols[0]), b = hex(cols[1]), c = hex(cols[2]);
    gl.uniform3f(this.u.uC1, a[0], a[1], a[2]);
    gl.uniform3f(this.u.uC2, b[0], b[1], b[2]);
    gl.uniform3f(this.u.uC3, c[0], c[1], c[2]);
    return this;
  };
  AIOrb.prototype.destroy = function () {
    cancelAnimationFrame(this._raf);
    if (this._ro) this._ro.disconnect(); else global.removeEventListener('resize', this._resize);
    if (this._io) this._io.disconnect();
    var ext = this.gl && this.gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AIOrb;
  else global.AIOrb = AIOrb;
})(typeof window !== 'undefined' ? window : this);
