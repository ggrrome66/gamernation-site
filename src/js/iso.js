/* iso.js — hand-rolled canvas-2D isometric software renderer (plan §5.3).
   Concatenated into app.js after content.js; shares scope with boot.js,
   which provides GN.still() (reduced-motion / calm-mode gate). */

const Iso = (() => {
  const C30 = Math.cos(Math.PI / 6);
  const S30 = 0.5;
  const REV = (2 * Math.PI) / 14000;        // one revolution per ~14s
  const FILL = ["#07240f", "#124f23", "#1b7f38", "#27b04f"]; // 4 flat shades
  const PHOS = "#39ff6a", MAG = "#ff3ca0", CYN = "#22d3ee", EDGE = "#0a2f16";

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
      const a = (i / n) * 2 * Math.PI;
      m.v.push([cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r]);
      m.e.push([s + i, s + ((i + 1) % n)]);
      face.push(s + i);
    }
    face.push(sh);
    m.f.push(face);
  }

  function quad() {                          // MOD.01 — 4-arm multirotor
    const m = M();
    box(m, 0, 0, 0, 1.1, 0.42, 1.1, 2);      // fuselage
    box(m, 0, 0.32, 0, 0.55, 0.24, 0.55, 1); // stack
    box(m, 1.5, 0, 0, 1.5, 0.14, 0.18, 1);   // arms (+ frame)
    box(m, -1.5, 0, 0, 1.5, 0.14, 0.18, 1);
    box(m, 0, 0, 1.5, 0.18, 0.14, 1.5, 1);
    box(m, 0, 0, -1.5, 0.18, 0.14, 1.5, 1);
    [[2.1, 0], [-2.1, 0], [0, 2.1], [0, -2.1]].forEach(p => {
      box(m, p[0], 0.16, p[1], 0.3, 0.3, 0.3, 3);   // motors
      disc(m, p[0], 0.4, p[1], 0.8, 8, 0);          // prop discs
    });
    return m;
  }

  function crt() {                           // MOD.02 — CRT + keyboard
    const m = M();
    box(m, 0, 0.55, -0.2, 2.2, 1.7, 1.8, 2); // tube
    box(m, 0, 0.62, 0.78, 1.7, 1.2, 0.14, 3);// screen
    box(m, 0, -0.42, -0.2, 1.4, 0.28, 1.2, 1);// stand
    box(m, 0, -0.66, 1.0, 2.5, 0.16, 1.0, 2); // keyboard
    box(m, 0, -0.54, 1.0, 2.3, 0.1, 0.8, 3);  // keycaps
    return m;
  }

  function rack() {                          // MOD.03 — ground station
    const m = M();
    box(m, 0, -0.2, 0, 2.5, 1.4, 1.6, 2);      // case
    box(m, 0, 0.15, 0.84, 2.0, 0.4, 0.14, 3);  // display strip
    box(m, -0.6, -0.62, 0.84, 0.8, 0.35, 0.1, 1); // panels
    box(m, 0.65, -0.62, 0.84, 0.6, 0.35, 0.1, 1);
    box(m, 0.95, 1.15, -0.5, 0.08, 1.5, 0.08, 1); // antenna mast
    disc(m, 0.95, 1.92, -0.5, 0.3, 6, 3);         // antenna cap
    return m;
  }

  const MODELS = { quad, crt, rack };

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
      const rot = (i / 24) * 2 * Math.PI;
      for (const v of u.model.v) {
        const p = project(v, rot);
        mx = Math.max(mx, Math.abs(p[0]));
        top = Math.min(top, p[1]); bot = Math.max(bot, p[1]);
      }
    }
    u.scale = Math.min(u.w / (2 * mx), u.h / (bot - top)) * 0.86;
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

  function draw(u, now) {
    const ctx = u.ctx, w = u.w, h = u.h;
    const glitch = u.glitchUntil > now;
    const jolt = glitch && u.jolt ? u.jolt : 0;
    const ox = w / 2 + jolt, oy = h / 2 - u.midY * u.scale;
    ctx.clearRect(0, 0, w, h);
    const P = u.model.v.map(v => project(v, u.rot));

    if (!glitch) {
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
      const u = {
        canvas: cv, ctx: cv.getContext("2d"),
        model: (MODELS[cv.dataset.model] || quad)(),
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
