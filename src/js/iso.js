/* iso.js — hand-rolled canvas-2D isometric software renderer (plan §5.3).
   Concatenated into app.js after content.js; shares scope with boot.js,
   which provides GN.still() (reduced-motion / calm-mode gate).

   Each unit draws a solid, slowly-rotating isometric model of what the
   section is about (drone, workstation, ground station) and then paints an
   Aperture/Portal-flavoured FX layer on top: spinning rotors, orbiting
   telemetry nodes, a radar sweep, pulsing power cores, and a rotating
   orange/blue "test-platform" ring. Every accent phases off `now` (ms), so
   the calm / reduced-motion path (now = 0) renders a frozen pose for free. */

const Iso = (() => {
  const C30 = Math.cos(Math.PI / 6);
  const S30 = 0.5;
  const REV = (2 * Math.PI) / 14000;        // one revolution per ~14s
  const FILL = ["#07240f", "#124f23", "#1b7f38", "#27b04f"]; // 4 flat shades
  const PHOS = "#39ff6a", MAG = "#ff3ca0", CYN = "#22d3ee", EDGE = "#0a2f16";
  const ORN = "#ffb000";                     // portal-orange accent (amber)
  const TAU = 2 * Math.PI;

  /* ── model builders: plain vertex/edge/face arrays ─────────────────── */
  function M() { return { v: [], e: [], f: [] }; }

  // axis-aligned box centred on (cx,cy,cz); faces carry a shade index 0-3
  function box(m, cx, cy, cz, w, h, d, sh) {
    const s = m.v.length, X = w / 2, Y = h / 2, Z = d / 2;
    [[-X, -Y, -Z], [X, -Y, -Z], [X, -Y, Z], [-X, -Y, Z],
     [-X, Y, -Z], [X, Y, -Z], [X, Y, Z], [-X, Y, Z]]
      .forEach(p => m.v.push([p[0] + cx, p[1] + cy, p[2] + cz]));
    [[4, 5, 6, 7, Math.min(sh + 1, 3)], [0, 1, 2, 3, Math.max(sh - 1, 0)],
     [0, 1, 5, 4, sh], [1, 2, 6, 5, Math.max(sh - 1, 0)],
     [2, 3, 7, 6, sh], [3, 0, 4, 7, Math.max(sh - 1, 0)]]
      .forEach(f => m.f.push([f[0] + s, f[1] + s, f[2] + s, f[3] + s, f[4]]));
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4],
     [0, 4], [1, 5], [2, 6], [3, 7]]
      .forEach(e => m.e.push([e[0] + s, e[1] + s]));
  }

  // horizontal n-gon disc at height cy (prop discs, antenna caps)
  function disc(m, cx, cy, cz, r, n, sh) {
    const s = m.v.length, face = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      m.v.push([cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r]);
      m.e.push([s + i, s + ((i + 1) % n)]);
      face.push(s + i);
    }
    face.push(sh);
    m.f.push(face);
  }

  // fill in the ground radius + base height the FX ring needs, once per build
  function finalize(m) {
    let baseY = 1e9, rad = 0;
    for (const v of m.v) {
      baseY = Math.min(baseY, v[1]);
      rad = Math.max(rad, Math.hypot(v[0], v[2]));
    }
    m.baseY = baseY;
    m.rad = rad;
    return m;
  }

  function quad() {                          // MOD.01 — 4-arm multirotor
    const m = M();
    box(m, 0, 0, 0, 1.1, 0.42, 1.1, 2);
    box(m, 0, 0.32, 0, 0.55, 0.24, 0.55, 1); // stack
    box(m, 0, 0.0, 0.72, 0.34, 0.2, 0.3, 3); // front camera pod
    box(m, 1.5, 0, 0, 1.5, 0.14, 0.18, 1);   // arms (+ frame)
    box(m, -1.5, 0, 0, 1.5, 0.14, 0.18, 1);
    box(m, 0, 0, 1.5, 0.18, 0.14, 1.5, 1);
    box(m, 0, 0, -1.5, 0.18, 0.14, 1.5, 1);
    box(m, 0.85, -0.34, 0, 0.12, 0.3, 1.7, 1);
    box(m, -0.85, -0.34, 0, 0.12, 0.3, 1.7, 1);
    [[2.1, 0], [-2.1, 0], [0, 2.1], [0, -2.1]].forEach(p =>
      box(m, p[0], 0.16, p[1], 0.3, 0.3, 0.3, 3)); 
    m.core = [0, 0.5, 0];
    // motor plane centre + spin direction (alternating, like a real quad)
    m.motors = [[2.1, 0.4, 0, 1], [-2.1, 0.4, 0, -1],
                [0, 0.4, 2.1, -1], [0, 0.4, -2.1, 1]];
    return finalize(m);
  }

  function crt() {                           // MOD.02 — CRT + keyboard
    const m = M();
    box(m, 0, 0.55, -0.2, 2.2, 1.7, 1.8, 2); // tube
    box(m, 0, 0.62, 0.78, 1.7, 1.2, 0.14, 3);// screen
    box(m, 0, -0.42, -0.2, 1.4, 0.28, 1.2, 1);// stand
    box(m, 0, -0.66, 1.0, 2.5, 0.16, 1.0, 2); // keyboard
    box(m, 0, -0.54, 1.0, 2.3, 0.1, 0.8, 3);  // keycaps
    m.core = [0, 0.62, 0.9];                   // screen glow / signal source
    return finalize(m);
  }

  function rack() {                          // MOD.03 — ground station
    const m = M();
    box(m, 0, -0.2, 0, 2.5, 1.4, 1.6, 2);      // case
    box(m, 0, 0.15, 0.84, 2.0, 0.4, 0.14, 3);  // display strip
    box(m, -0.6, -0.62, 0.84, 0.8, 0.35, 0.1, 1); // panels
    box(m, 0.65, -0.62, 0.84, 0.6, 0.35, 0.1, 1);
    box(m, 0.95, 1.15, -0.5, 0.08, 1.5, 0.08, 1); // antenna mast
    disc(m, 0.95, 1.92, -0.5, 0.3, 6, 3);         // antenna cap
    m.core = [0, 0.15, 0.92];                      // display strip glow
    m.radar = [0.95, 1.9, -0.5];                   // sweep origin (mast top)
    return finalize(m);
  }


  function sim() {                           // TRAIN — console + trainee quad
    const m = M();
    box(m, 0, -0.7, 0.2, 3.0, 0.26, 1.7, 1);
    box(m, 0, 0.2, -0.45, 2.4, 1.5, 0.16, 2);
    box(m, 0, 0.28, -0.32, 2.05, 1.15, 0.06, 3); // map face
    box(m, -0.95, -0.35, 0.95, 0.42, 0.4, 0.42, 2);
    box(m, 0.95, -0.35, 0.95, 0.42, 0.4, 0.42, 2);
    box(m, -0.95, 0.05, 0.95, 0.14, 0.42, 0.14, 3);
    box(m, 0.95, 0.05, 0.95, 0.14, 0.42, 0.14, 3);

    const dy = 1.85, dz = 0.55;
    box(m, 0, dy, dz, 0.85, 0.32, 0.85, 2);
    box(m, 0, dy + 0.26, dz, 0.42, 0.18, 0.42, 1);
    box(m, 0, dy, dz + 0.55, 0.26, 0.16, 0.24, 3);
    box(m, 1.15, dy, dz, 1.15, 0.11, 0.14, 1);    box(m, -1.15, dy, dz, 1.15, 0.11, 0.14, 1);
    box(m, 0, dy, dz + 1.15, 0.14, 0.11, 1.15, 1);
    box(m, 0, dy, dz - 1.15, 0.14, 0.11, 1.15, 1);
    box(m, 0.65, dy - 0.26, dz, 0.1, 0.24, 1.3, 1);
    box(m, -0.65, dy - 0.26, dz, 0.1, 0.24, 1.3, 1);
    [[1.6, dz], [-1.6, dz], [0, dz + 1.6], [0, dz - 1.6]].forEach(p =>
      box(m, p[0], dy + 0.12, p[1], 0.24, 0.24, 0.24, 3));

    m.core = [0, 0.28, -0.25];
    m.map = { cx: 0, cy: 0.28, cz: -0.25, hw: 0.95, hh: 0.5 };
    m.drone = [0, dy + 0.4, dz];
    m.motors = [
      [1.6, dy + 0.28, dz, 1], [-1.6, dy + 0.28, dz, -1],
      [0, dy + 0.28, dz + 1.6, -1], [0, dy + 0.28, dz - 1.6, 1]
    ];
    return finalize(m);
  }

  const MODELS = { quad, crt, rack, sim };

  /* ── renderer ──────────────────────────────────────────────────────── */
  const units = [];
  let raf = 0, last = 0;

  function project(v, rot) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const x = v[0] * c + v[2] * s;
    const z = -v[0] * s + v[2] * c;
    return [(x - z) * C30, (x + z) * S30 - v[1], x + z];
  }

  // fixed scale/centre from sampled rotations so the model never "breathes"
  function measure(u) {
    let mx = 0, top = 1e9, bot = -1e9;
    for (let i = 0; i < 24; i++) {
      const rot = (i / 24) * TAU;
      for (const v of u.model.v) {
        const p = project(v, rot);
        mx = Math.max(mx, Math.abs(p[0]));
        top = Math.min(top, p[1]); bot = Math.max(bot, p[1]);
      }
    }
    // leave headroom for the FX ring, which sits a little outside the mesh
    u.scale = Math.min(u.w / (2.3 * mx), u.h / (bot - top)) * 0.82;
    u.midY = (top + bot) / 2;
  }

  function strokeEdges(ctx, u, P, dx, dy, color, alpha) {
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const e of u.model.e) {
      const a = P[e[0]], b = P[e[1]];
      ctx.moveTo(dx + a[0] * u.scale, dy + a[1] * u.scale);
      ctx.lineTo(dx + b[0] * u.scale, dy + b[1] * u.scale);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* ── FX overlay primitives (Aperture accents) ──────────────────────── */
  function dot(ctx, x, y, r, color, glow) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function ray(ctx, a, b, color, w, alpha, glow) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = w;
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.restore();
  }

  // a glowing arc segment swept around a horizontal circle (portal ring)
  function portalArc(ctx, put, r, y, phase, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let a = 0; a <= 0.75; a += 0.09) {
      const p = put([Math.cos(phase + a) * r, y, Math.sin(phase + a) * r]);
      a ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.stroke();
    ctx.restore();
  }

  // dim full circle at ground level, with two counter-rotating portal arcs
  function ring(ctx, u, put, now) {
    const m = u.model, y = m.baseY - 0.1, r = m.rad * 1.14;
    ctx.save();
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const p = put([Math.cos(i / 40 * TAU) * r, y, Math.sin(i / 40 * TAU) * r]);
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.stroke();
    ctx.restore();
    portalArc(ctx, put, r, y, now / 1500, ORN);
    portalArc(ctx, put, r, y, Math.PI - now / 1500, CYN);
  }

  // pulsing power core, common to every model
  function core(ctx, u, now, put) {
    if (!u.model.core) return;
    const c = put(u.model.core);
    dot(ctx, c[0], c[1], 2.4 + (Math.sin(now / 500) * 0.5 + 0.5) * 2.6, ORN, 12);
  }

  // MOD.01 — spinning rotors + prop-wash discs
  function fxQuad(ctx, u, now, put) {
    for (const mo of u.model.motors) {
      const y = mo[1], r = 0.85, spin = now / 90 * mo[3];
      const c = put([mo[0], y, mo[2]]);
      ctx.save();                              // faint prop-wash disc
      ctx.strokeStyle = CYN;
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const a = i / 16 * TAU;
        const p = put([mo[0] + Math.cos(a) * r, y, mo[2] + Math.sin(a) * r]);
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
      ctx.restore();
      for (let b = 0; b < 2; b++) {             // two blades
        const a = spin + b * Math.PI;
        const e = put([mo[0] + Math.cos(a) * r, y, mo[2] + Math.sin(a) * r]);
        ray(ctx, c, e, CYN, 2, 0.9, 6);
      }
    }
  }

  // MOD.02 — telemetry nodes orbiting the screen (sites · social · host)
  function fxCrt(ctx, u, now, put) {
    const c = put(u.model.core), cols = [CYN, ORN, MAG];
    for (let i = 0; i < 3; i++) {
      const a = now / 1500 + (i / 3) * TAU;
      const y = 0.25 + Math.sin(now / 700 + i * 2) * 0.55;
      const p = put([Math.cos(a) * 2.5, y, Math.sin(a) * 2.5]);
      ray(ctx, c, p, cols[i], 1, 0.22, 0);
      dot(ctx, p[0], p[1], 2.6, cols[i], 8);
    }
  }

  // MOD.03 — radar sweep from the mast + a patrolling drone glyph
  function fxRack(ctx, u, now, put) {
    const o = put(u.model.radar), a = now / 900;
    const tip = put([u.model.radar[0] + Math.cos(a) * 2.1, u.model.radar[1] - 0.6,
                     u.model.radar[2] + Math.sin(a) * 2.1]);
    ray(ctx, o, tip, CYN, 1.5, 0.5, 8);
    dot(ctx, tip[0], tip[1], 2.4, CYN, 8);
    const a2 = now / 2200, r2 = 2.7, y2 = 1.0;
    const cx = Math.cos(a2) * r2, cz = Math.sin(a2) * r2;
    const d = put([cx, y2, cz]);
    for (const off of [[0.36, 0], [-0.36, 0], [0, 0.36], [0, -0.36]])
      ray(ctx, d, put([cx + off[0], y2, cz + off[1]]), ORN, 1, 0.75, 0);
    dot(ctx, d[0], d[1], 2, ORN, 8);
  }


  // TRAIN — map grid/corridor + prop discs
  function fxSim(ctx, u, now, put) {
    const mp = u.model.map || { cx: 0, cy: 0.28, cz: -0.25, hw: 0.95, hh: 0.5 };
    const c = put(u.model.core);
    // map grid (survey chart)
    ctx.save();
    ctx.strokeStyle = CYN;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      const x = i * mp.hw;
      const a = put([mp.cx + x, mp.cy, mp.cz - mp.hh]);
      const b = put([mp.cx + x, mp.cy, mp.cz + mp.hh]);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      const z = i * mp.hh;
      const c0 = put([mp.cx - mp.hw, mp.cy, mp.cz + z]);
      const c1 = put([mp.cx + mp.hw, mp.cy, mp.cz + z]);
      ctx.beginPath(); ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]); ctx.stroke();
    }
    ctx.restore();
    // survey corridor (two parallel rails + moving tick)
    const railL = put([mp.cx - 0.28, mp.cy + 0.02, mp.cz - mp.hh]);
    const railL2 = put([mp.cx - 0.28, mp.cy + 0.02, mp.cz + mp.hh]);
    const railR = put([mp.cx + 0.28, mp.cy + 0.02, mp.cz - mp.hh]);
    const railR2 = put([mp.cx + 0.28, mp.cy + 0.02, mp.cz + mp.hh]);
    ray(ctx, railL, railL2, ORN, 1.5, 0.55, 0);
    ray(ctx, railR, railR2, ORN, 1.5, 0.55, 0);
    const t = (now / 2200) % 1;
    const tickZ = mp.cz - mp.hh + t * (mp.hh * 2);
    const t0 = put([mp.cx - 0.28, mp.cy + 0.04, tickZ]);
    const t1 = put([mp.cx + 0.28, mp.cy + 0.04, tickZ]);
    ray(ctx, t0, t1, CYN, 2, 0.85, 8);
    // waypoint pins along the corridor
    const pins = [[-0.55, -0.35], [0.5, 0.1], [-0.15, 0.45]];
    pins.forEach((p, i) => {
      const col = [ORN, CYN, MAG][i];
      const base = put([mp.cx + p[0], mp.cy, mp.cz + p[1]]);
      const tip = put([mp.cx + p[0], mp.cy + 0.35, mp.cz + p[1]]);
      ray(ctx, base, tip, col, 1.2, 0.7, 0);
      dot(ctx, tip[0], tip[1], 2.4, col, 8);
    });
    if (u.model.drone) {
      const d = put(u.model.drone);
      dot(ctx, d[0], d[1], 2.2, ORN, 10);
    }
    // realistic prop wash + blades (same idiom as AIR)
    if (u.model.motors) {
      for (const mo of u.model.motors) {
        const y = mo[1], r = 0.55, spin = now / 85 * mo[3];
        const ctr = put([mo[0], y, mo[2]]);
        ctx.save();
        ctx.strokeStyle = CYN;
        ctx.globalAlpha = 0.16;
        ctx.beginPath();
        for (let i = 0; i <= 12; i++) {
          const a = i / 12 * TAU;
          const p = put([mo[0] + Math.cos(a) * r, y, mo[2] + Math.sin(a) * r]);
          i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
        }
        ctx.stroke();
        ctx.restore();
        for (let bl = 0; bl < 2; bl++) {
          const a2 = spin + bl * Math.PI;
          const e = put([mo[0] + Math.cos(a2) * r, y, mo[2] + Math.sin(a2) * r]);
          ray(ctx, ctr, e, CYN, 2, 0.9, 6);
        }
      }
    }
  }

  const FX = { quad: fxQuad, crt: fxCrt, rack: fxRack, sim: fxSim };

  function draw(u, now) {
    const ctx = u.ctx, w = u.w, h = u.h;
    const glitch = u.glitchUntil > now;
    const jolt = glitch && u.jolt ? u.jolt : 0;
    const bob = glitch ? 0 : Math.sin(now / 900) * h * 0.012;
    const ox = w / 2 + jolt, oy = h / 2 - u.midY * u.scale + bob;
    ctx.clearRect(0, 0, w, h);
    const P = u.model.v.map(v => project(v, u.rot));

    if (!glitch) {
      const put = v => {
        const p = project(v, u.rot);
        return [ox + p[0] * u.scale, oy + p[1] * u.scale];
      };
      ring(ctx, u, put, now);                  // platform ring, behind model
      // painter's algorithm: sort faces far → near by centroid depth
      const faces = u.model.f
        .map(f => {
          let d = 0;
          for (let i = 0; i < f.length - 1; i++) d += P[f[i]][2];
          return [d / (f.length - 1), f];
        })
        .sort((a, b) => a[0] - b[0]);
      ctx.lineWidth = 1;
      for (const q of faces) {
        const f = q[1];
        ctx.fillStyle = FILL[f[f.length - 1]];
        ctx.beginPath();
        for (let i = 0; i < f.length - 1; i++) {
          const p = P[f[i]];
          if (i) ctx.lineTo(ox + p[0] * u.scale, oy + p[1] * u.scale);
          else ctx.moveTo(ox + p[0] * u.scale, oy + p[1] * u.scale);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = EDGE;
        ctx.stroke();
      }
      (FX[u.kind] || fxQuad)(ctx, u, now, put); // model-specific accents
      core(ctx, u, now, put);                   // pulsing power core, on top
    } else {
      // wireframe glitch: ghost channels at ±1px, phosphor edges on top
      strokeEdges(ctx, u, P, ox - 1, oy, MAG, 0.6);
      strokeEdges(ctx, u, P, ox + 1, oy, CYN, 0.6);
      strokeEdges(ctx, u, P, ox, oy, PHOS, 1);
      // classic tear: shift a few horizontal slices of the finished frame
      for (let i = 0; i < u.slices; i++) {
        const sy = ((i + 1) * h) / (u.slices + 1) + ((i * 13) % 9) - 4;
        const sh = 4 + ((i * 7) % 8);
        const dx = (i % 2 ? -1 : 1) * (6 + ((i * 11) % 10));
        ctx.drawImage(u.canvas, 0, sy, w, sh, dx, sy, w, sh);
      }
    }
  }

  function anyActive() {
    return units.some(u => u.on);
  }

  function tick(now) {
    raf = anyActive() && !document.hidden ? requestAnimationFrame(tick) : 0;
    if (now - last < 33) return;             // 30 fps cap
    const dt = Math.min(now - last, 100);
    last = now;
    for (const u of units) {
      if (!u.on) continue;
      u.rot += dt * REV;
      if (now >= u.nextGlitch) {
        u.glitchUntil = now + 180 + Math.random() * 240;
        u.jolt = Math.random() < 1 / 3 ? (Math.random() < 0.5 ? -3 : 3) : 0;
        u.slices = 2 + Math.floor(Math.random() * 3);
        u.nextGlitch = now + 7000 + Math.random() * 8000;
      }
      draw(u, now);
    }
  }

  function loop() {
    if (!raf && anyActive() && !document.hidden && !GN.still()) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  }

  function still(u) {                        // one static frame, no loop
    u.rot = 0.7;
    u.glitchUntil = 0;
    draw(u, 0);
  }

  function size(u) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = u.canvas.getBoundingClientRect();
    if (!r.width) return;
    u.canvas.width = Math.round(r.width * dpr);
    u.canvas.height = Math.round(r.height * dpr);
    u.w = u.canvas.width;
    u.h = u.canvas.height;
    measure(u);
    if (GN.still()) still(u); else draw(u, performance.now());
  }

  function init() {
    const list = document.querySelectorAll("canvas.iso");
    if (!list.length) return;
    const io = "IntersectionObserver" in window
      ? new IntersectionObserver(es => {
          for (const e of es) {
            const u = units.find(x => x.canvas === e.target);
            if (u) u.on = e.isIntersecting;
          }
          loop();
        }, { rootMargin: "60px" })
      : null;
    list.forEach(cv => {
      cv.hidden = false;
      const kind = cv.dataset.model || "quad";
      const u = {
        canvas: cv, ctx: cv.getContext("2d"), kind,
        model: (MODELS[kind] || quad)(),
        rot: 0.7, on: !io,
        glitchUntil: 0, nextGlitch: 7000 + Math.random() * 8000,
        jolt: 0, slices: 2, w: 0, h: 0, scale: 1, midY: 0
      };
      units.push(u);
      size(u);
      if (io) io.observe(cv);
    });
    addEventListener("resize", () => units.forEach(size));
    document.addEventListener("visibilitychange", loop);
    refresh();
  }

  // re-evaluate after the calm toggle or a reduced-motion change
  function refresh() {
    if (GN.still()) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      units.forEach(still);
    } else {
      loop();
    }
  }

  return { init, refresh };
})();
