/* arch.js — MOD.04 container configurator (architecture.html only).
   A hand-rolled canvas-2D perspective software renderer: world-space
   polygons in metres, flat Lambert shading, near-plane clipping, painter's
   sort. No WebGL, no libraries — same rules as iso.js (plan §5.3), just a
   bigger scene. build.js prepends `const ARCH = …` (SITE.arch) so copy
   stays single-sourced and wraps this file in its own IIFE. It runs after
   app.js but shares nothing with it: the calm / reduced-motion gate is
   read from the <html class="calm"> flag boot.js maintains.

   Scene conventions: y is up, ground is y = 0, units are metres. A
   container's local frame is x along its length (door end at x = L),
   z across it (the "front" — windows, walkway, deck side — at z = W). */

const Arch = (() => {
  const TAU = Math.PI * 2;
  const L20 = 6.06, L40 = 12.19, W = 2.44, H = 2.90;  // ISO high-cube
  const FLOOR = 0.15;                                  // floor build-up
  const NEAR = 0.4;
  const $ = id => document.getElementById(id);

  /* ── palette ───────────────────────────────────────────────────────── */
  const C = {
    steel: "#7d8590", dark: "#3b4148", rust: "#8a4a22", coat: "#3f6f62",
    stone: "#a89c86", stoneD: "#6f665a", foam: "#d9d2c0", foamL: "#ece7d8",
    earth: "#5b4630", grass: "#4f7f2f", moss: "#2f5a25", gravel: "#9c948a",
    wood: "#a5713f", teak: "#b7803f", cream: "#e6dcc6", brass: "#c9a24a",
    copper: "#b0602a", glass: "#4fb9d6", panel: "#1d2b4a", frame: "#4d5661",
    plant: "#4caf50", plantD: "#2e7d32", leaf: "#6aa84f", leafY: "#c9a227",
    pine: "#2d5a3a", pineD: "#1f4a2e", trunk: "#5c4327", white: "#f0efe8",
    black: "#1c1d20", batt: "#2d3b4a", water: "#3a7fa0", mat: "#4a4f46",
    inner: "#d8c9a8", innerU: "#9aa3ab", led: "#39ff6a", amber: "#ffb000",
    mag: "#ff3ca0", cyan: "#22d3ee", paving: "#8d8579", roof: "#2f3a3f",
    sod: "#5c8a33", iron: "#26282c"
  };

  /* ── tiny seeded PRNG (mulberry32) so forests are stable per layout ── */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ── colour shading with a small cache (no per-frame string churn) ─── */
  const colCache = new Map();
  let tint = [1, 1, 1];
  function shade(c, k) {
    const q = Math.max(0, Math.min(40, Math.round(k * 32)));
    const key = c + q + tint[0];
    let s = colCache.get(key);
    if (s) return s;
    const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
    const f = q / 32;
    s = "rgb(" + Math.min(255, r * f * tint[0] | 0) + "," + Math.min(255, g * f * tint[1] | 0) + "," + Math.min(255, b * f * tint[2] | 0) + ")";
    colCache.set(key, s);
    return s;
  }

  /* ── state ─────────────────────────────────────────────────────────── */
  const state = {
    layout: "s20", ext: "stone", grade: "prem", light: "dusk", view: "cut",
    bays: {}, unit: "A", sel: null
  };
  const MODS = ARCH.modules.map(m => m.id);
  const DEF20 = ["bed", "galley", "head", "store"];
  const DEF40 = ["air", "bench", "bench", "power", "galley", "head", "bed", "store"];

  /* ── geometry sink ─────────────────────────────────────────────────── */
  let items = [], ground = [], dyn = [], flues = [], glows = [], bayPts = [];
  let cur = { x: 0, y: 0, z: 0, r: 0 };
  let sink = null, tagTree = false, tagIn = false;
  const masts = [];
  function onGround(fn) { const s0 = sink; sink = ground; fn(); sink = s0; }
  let scene = { cx: 0, cz: 0, rad: 10, top: H, units: [], detail: 2 };

  function xf(p) {
    const r = cur.r, x = p[0], z = p[2];
    let X = x, Z = z;
    if (r === 1) { X = -z; Z = x; } else if (r === 2) { X = -x; Z = -z; } else if (r === 3) { X = z; Z = -x; }
    return [X + cur.x, p[1] + cur.y, Z + cur.z];
  }

  function setCur(x, y, z, r) { cur = { x, y, z, r: r || 0 }; }

  // push one world polygon. o: shell, inner, two, deco, glow, a, unit
  function poly(pts, c, o) {
    const p = pts.map(xf), n = p.length;
    let cx = 0, cy = 0, cz = 0;
    for (const v of p) { cx += v[0]; cy += v[1]; cz += v[2]; }
    const ax = p[1][0] - p[0][0], ay = p[1][1] - p[0][1], az = p[1][2] - p[0][2];
    const bx = p[2][0] - p[0][0], by = p[2][1] - p[0][1], bz = p[2][2] - p[0][2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    const f = { p, c, cx: cx / n, cy: cy / n, cz: cz / n, nx, ny, nz };
    if (tagTree) f.tree = true;
    if (tagIn) f.lit = true;
    if (o) {
      if (o.shell) { f.shell = true; f.inner = o.inner; f.unit = o.unit; }
      if (o.two) f.two = true;
      if (o.deco) f.deco = o.deco.map(d => ({ c: d.c, f: d.f, w: d.w, glow: d.glow, a: d.a,
        p: d.p ? d.p.map(xf) : null, s: d.s ? d.s.map(sg => [xf(sg[0]), xf(sg[1])]) : null }));
      if (o.glow) f.glow = o.glow;
      if (o.a) f.a = o.a;
    }
    sink.push(f);
    return f;
  }

  // axis-aligned box from its min corner, outward normals. o.skip: face
  // letters (t b n s e w) to omit; o.deco: { letter: [deco…] }; o.cols
  function box(x, y, z, w, h, d, c, o) {
    o = o || {};
    const X0 = x, Y0 = y, Z0 = z, X1 = x + w, Y1 = y + h, Z1 = z + d;
    const F = {
      t: [[X0, Y1, Z0], [X0, Y1, Z1], [X1, Y1, Z1], [X1, Y1, Z0]],
      b: [[X0, Y0, Z0], [X1, Y0, Z0], [X1, Y0, Z1], [X0, Y0, Z1]],
      n: [[X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1]],
      s: [[X1, Y0, Z0], [X0, Y0, Z0], [X0, Y1, Z0], [X1, Y1, Z0]],
      e: [[X1, Y0, Z1], [X1, Y0, Z0], [X1, Y1, Z0], [X1, Y1, Z1]],
      w: [[X0, Y0, Z0], [X0, Y0, Z1], [X0, Y1, Z1], [X0, Y1, Z0]]
    };
    const skip = o.skip || "b";
    for (const k in F) {
      if (skip.indexOf(k) >= 0) continue;
      const fo = { shell: o.shell, inner: o.inner, unit: o.unit, glow: o.glow, a: o.a, two: o.two,
        deco: o.deco && o.deco[k] };
      poly(F[k], (o.cols && o.cols[k]) || c, fo);
    }
  }

  // vertical n-gon prism (r2 = top radius for a frustum); cone when r2 = 0
  function cyl(cx, y, cz, r, h, n, c, o, r2) {
    o = o || {};
    const top = r2 === undefined ? r : r2, ring0 = [], ring1 = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (o.phase || 0);
      ring0.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]);
      ring1.push([cx + Math.cos(a) * top, y + h, cz + Math.sin(a) * top]);
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (top > 0) poly([ring0[j], ring0[i], ring1[i], ring1[j]], c, o);
      else poly([ring0[j], ring0[i], [cx, y + h, cz]], c, o);
    }
    if (top > 0 && !o.noTop) poly(ring1.slice().reverse(), o.topC || c, o);
  }

  // rectangular frustum: bottom rect (x0,z0)-(x1,z1) at y0, top rect at y1
  function rfrus(x0, z0, x1, z1, y0, X0, Z0, X1, Z1, y1, c, o) {
    o = o || {};
    const skip = o.skip || "";
    const B = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]];
    const T = [[X0, y1, Z0], [X1, y1, Z0], [X1, y1, Z1], [X0, y1, Z1]];
    if (skip.indexOf("t") < 0) poly([T[0], T[3], T[2], T[1]], o.topC || c, o);
    const sides = [["s", 0, 1], ["e", 1, 2], ["n", 2, 3], ["w", 3, 0]];
    for (const s of sides) {
      if (skip.indexOf(s[0]) >= 0) continue;
      poly([B[s[2]], B[s[1]], T[s[1]], T[s[2]]], c, o);
    }
  }

  function seg(a, b) { return [a, b]; }

  /* ── wall surface patterns (deco in local wall coordinates) ────────── */
  // map (s, t) on a wall face to local 3D. face: n (z=W) s (z=0) e (x=L) w (x=0) t (roof)
  function onWall(face, L, s, t) {
    if (face === "n") return [s, t, W];
    if (face === "s") return [s, t, 0];
    if (face === "e") return [L, t, s];
    if (face === "w") return [0, t, s];
    return [s, H, t];
  }

  function pattern(face, L, ext, seed) {
    const len = face === "n" || face === "s" || face === "t" ? L : W;
    const hgt = face === "t" ? W : H;
    const d = scene.detail, out = [];
    if (ext === "bare" || (ext === "coated" && face === "t")) {
      const pitch = d === 2 ? 0.28 : d === 1 ? 0.56 : 1.12;
      const segs = [];
      for (let s = pitch; s < len - 0.05; s += pitch)
        segs.push(seg(onWall(face, L, s, 0.05), onWall(face, L, s, hgt - 0.05)));
      out.push({ s: segs, c: ext === "bare" ? "#5c3116" : "#22292c" });
    } else if (ext === "stone" && face !== "t") {
      const r = rng(seed), segs = [], row = 0.36;
      for (let t = row; t < hgt - 0.05; t += row) {
        segs.push(seg(onWall(face, L, 0.02, t), onWall(face, L, len - 0.02, t)));
        if (d === 0) continue;
        for (let s = r() * 0.5 + 0.2; s < len - 0.2; s += 0.45 + r() * 0.5)
          segs.push(seg(onWall(face, L, s, t - row + 0.02), onWall(face, L, s, t - 0.02)));
      }
      out.push({ s: segs, c: C.stoneD });
    } else if (ext === "foam" && face !== "t") {
      const r = rng(seed), n = d === 2 ? 26 : d === 1 ? 12 : 0;
      for (let i = 0; i < n; i++) {
        const s = 0.2 + r() * (len - 0.4), t = 0.2 + r() * (hgt - 0.4), q = 0.08 + r() * 0.12, p = [];
        for (let k = 0; k < 5; k++) p.push(onWall(face, L, s + Math.cos(k / 5 * TAU) * q * 1.4, t + Math.sin(k / 5 * TAU) * q));
        out.push({ p, c: C.foamL, f: true });
      }
    } else if (ext === "coated" && d === 2) {
      out.push({ s: [seg(onWall(face, L, 0.05, hgt * 0.62), onWall(face, L, len - 0.05, hgt * 0.62))], c: "#2f5449" });
    }
    return out;
  }

  function wallColor(ext, face) {
    if (face === "t") return ext === "bare" ? C.rust : ext === "foam" ? C.foam : C.roof;
    return ext === "bare" ? C.rust : ext === "coated" ? C.coat : ext === "stone" || ext === "buried" ? C.stone : C.foam;
  }

  // window (glass fill + frame) on a wall; glows at dusk
  function win(face, L, s, t, w, h, out) {
    const p = [onWall(face, L, s, t), onWall(face, L, s + w, t), onWall(face, L, s + w, t + h), onWall(face, L, s, t + h)];
    const dusk = state.light === "dusk";
    out.push({ p, c: dusk ? C.amber : C.glass, f: true, glow: dusk });
    out.push({ p, c: C.frame, w: 1.5 });
    if (scene.detail === 2)
      out.push({ s: [seg(onWall(face, L, s + w / 2, t), onWall(face, L, s + w / 2, t + h))], c: C.frame });
  }

  function door(face, L, s, t, w, h, out, glassy) {
    const p = [onWall(face, L, s, t), onWall(face, L, s + w, t), onWall(face, L, s + w, t + h), onWall(face, L, s, t + h)];
    const dusk = state.light === "dusk";
    out.push({ p, c: glassy ? (dusk ? C.amber : C.glass) : C.dark, f: true, glow: glassy && dusk });
    out.push({ p, c: glassy ? C.brass : C.black, w: 1.5 });
    out.push({ p: [onWall(face, L, s + w * 0.8, t + h * 0.45), onWall(face, L, s + w * 0.8, t + h * 0.55)], c: C.brass, w: 2 });
  }

  /* ── one container unit ─────────────────────────────────────────────── */
  function drawUnit(u) {
    setCur(u.x, u.y, u.z, u.r);
    const L = u.len, ext = state.ext, prem = state.grade === "prem";
    const cut = state.view === "cut" && u.edit;
    const inner = prem ? C.inner : C.innerU;
    const buried = ext === "buried" && u.berm;
    const n = u.bays.length, bl = (L - 0.16) / n;
    const shell = { shell: true, inner, unit: u };
    const seedBase = (u.x * 7 + u.z * 13 + u.y * 3) | 0;

    // floor slab with bay marks + selection highlight
    const fdeco = [];
    for (let i = 1; i < n; i++) fdeco.push({ s: [seg([0.08 + i * bl, FLOOR, 0.06], [0.08 + i * bl, FLOOR, W - 0.06])], c: C.frame });
    if (cut && state.sel && state.sel.u === u.id) {
      const i = state.sel.i, x0 = 0.08 + i * bl;
      const p = [[x0, FLOOR, 0.06], [x0 + bl, FLOOR, 0.06], [x0 + bl, FLOOR, W - 0.06], [x0, FLOOR, W - 0.06]];
      fdeco.push({ p, c: C.led, f: true, a: 0.22, glow: true });
      fdeco.push({ p, c: C.led, w: 2, glow: true });
    }
    if (cut) box(0.04, 0, 0.04, L - 0.08, FLOOR, W - 0.08, prem ? C.teak : C.mat, { deco: { t: fdeco }, skip: "b" });

    // walls: each is a shell face with an exterior pattern + openings
    const faces = { n: !u.shared.n, s: !u.shared.s, e: !u.shared.e, w: !u.shared.w, t: !u.shared.t };
    for (const k in faces) {
      if (!faces[k]) continue;
      const wallExt = buried && k !== u.open ? "buried" : ext === "buried" ? "stone" : ext;
      const deco = pattern(k, L, wallExt, seedBase + k.charCodeAt(0));
      if (k === "n" && !u.hideWin) {
        if (prem) {
          for (let i = 0; i < n; i++) {
            const m = u.bays[i];
            if (m === "head" || m === "store" || m === "power" || m === "water") continue;
            if (buried && i === 0) continue;
            win("n", L, 0.08 + i * bl + bl * 0.15, 0.95, bl * 0.7, 1.15, deco);
          }
        } else {
          for (let i = 0; i < n; i += 2) win("n", L, 0.08 + i * bl + bl * 0.5, 1.35, 0.6, 0.5, deco);
        }
        if (buried || u.frontDoor) door("n", L, 0.08 + bl * 0.2, FLOOR, 0.9, 2.05, deco, prem);
      }
      if (k === "s" && prem && !buried && scene.detail > 0)
        for (let i = 1; i < n; i += 2) win("s", L, 0.08 + i * bl + bl * 0.25, 1.4, bl * 0.5, 0.6, deco);
      if (k === "e" && u.doorEnd) {
        if (prem && !buried) {
          const p = [onWall("e", L, 0.12, FLOOR), onWall("e", L, W - 0.12, FLOOR), onWall("e", L, W - 0.12, H - 0.15), onWall("e", L, 0.12, H - 0.15)];
          const dusk = state.light === "dusk";
          deco.push({ p, c: dusk ? C.amber : C.glass, f: true, glow: dusk });
          deco.push({ p, c: C.brass, w: 1.5 });
          deco.push({ s: [seg(onWall("e", L, W / 2, FLOOR), onWall("e", L, W / 2, H - 0.15)), seg(onWall("e", L, 0.12, 2.1), onWall("e", L, W - 0.12, 2.1))], c: C.brass });
          deco.push({ p: [onWall("e", L, 1.05, 1.0), onWall("e", L, 1.05, 1.12)], c: C.brass, w: 3 });
        } else {
          // original container doors: two leaves, lock bars, hinges
          const segs = [seg(onWall("e", L, W / 2, 0.05), onWall("e", L, W / 2, H - 0.05))];
          for (const s of [0.35, 0.8, W - 0.8, W - 0.35]) segs.push(seg(onWall("e", L, s, 0.2), onWall("e", L, s, H - 0.2)));
          deco.push({ s: segs, c: C.black, w: 1.5 });
          if (scene.detail) deco.push({ p: [onWall("e", L, 0.35, 1.3), onWall("e", L, 0.35, 1.5)], c: C.brass, w: 3 });
          if (scene.detail) deco.push({ p: [onWall("e", L, W - 0.35, 1.3), onWall("e", L, W - 0.35, 1.5)], c: C.brass, w: 3 });
        }
      }
      const c = wallColor(wallExt, k);
      const o = Object.assign({ deco }, shell);
      if (k === "t") poly([[0, H, 0], [0, H, W], [L, H, W], [L, H, 0]], c, o);
      else if (k === "n") poly([[0, 0, W], [L, 0, W], [L, H, W], [0, H, W]], c, o);
      else if (k === "s") poly([[L, 0, 0], [0, 0, 0], [0, H, 0], [L, H, 0]], c, o);
      else if (k === "e") poly([[L, 0, W], [L, 0, 0], [L, H, 0], [L, H, W]], c, o);
      else poly([[0, 0, 0], [0, 0, W], [0, H, W], [0, H, 0]], c, o);
    }

    // exterior fittings
    if (scene.detail === 2 && !buried)
      for (const cx of [0, L - 0.18]) for (const cy of [0, H - 0.18]) for (const cz of [0, W - 0.18])
        box(cx, cy, cz, 0.18, 0.18, 0.18, C.dark);
    if (!prem && u.level === 0 && !buried) {                 // skid frame + pockets
      box(-0.15, 0, -0.1, L + 0.3, 0.14, 0.2, C.iron);
      box(-0.15, 0, W - 0.1, L + 0.3, 0.14, 0.2, C.iron);
    }
    if (prem && u.level === 0 && !buried && !u.shared.n)     // stone plinth
      box(-0.12, 0, -0.12, L + 0.24, 0.42, W + 0.24, C.stoneD, { skip: "bt" });
    if (u.top && !buried && !cut) solar(L, u);
    // per-module exterior signatures
    for (let i = 0; i < n; i++) {
      const m = u.bays[i], x = 0.08 + i * bl + bl / 2;
      if (!u.top) continue;
      if (m === "stove") flue(x, buried ? H + 0.6 : H, 0.45);
      else if (m === "head") cyl(x, H, 0.4, 0.06, 0.5, 6, C.steel, { noTop: false });
      else if (m === "farm") {
        const dusk = state.light === "dusk";
        box(x - 0.45, buried ? H + 0.36 : H, 0.7, 0.9, 0.35, 1.0, dusk ? C.mag : C.glass, { a: 0.7, glow: dusk, skip: "b" });
      } else if (m === "comms") {
        box(x - 0.05, H, 0.25, 0.1, 2.3, 0.1, C.steel);
        cyl(x, H + 2.3, 0.3, 0.32, 0.05, 6, C.dark);
        sink.push(lineFace([x, H + 2.35, 0.3], [x + 0.5, H + 3.2, 0.3], C.brass));
      } else if (m === "power" && scene.detail) box(x - 0.2, 1.4, -0.14, 0.4, 0.5, 0.14, C.dark);
    }
    if (u.doorEnd && u.level === 0) {
      if (prem && !buried) deck(L);
      else if (!buried) { box(L + 0.05, 0, W / 2 - 0.5, 0.35, 0.3, 1.0, C.steel); box(L + 0.4, 0, W / 2 - 0.5, 0.35, 0.15, 1.0, C.steel); }
    }
    if (u.primary) {
      // copper gutter + downpipe to a brass-banded rain barrel
      sink.push(lineFace([0, H - 0.05, W + 0.08], [L, H - 0.05, W + 0.08], C.copper, 2));
      sink.push(lineFace([L - 0.2, H - 0.05, W + 0.08], [L - 0.2, 0.1, W + 0.55], C.copper, 2));
      cyl(L - 0.2, 0, W + 0.85, 0.42, 1.0, 8, C.dark);
      sink.push(lineFace([L - 0.62, 0.35, W + 0.85], [L + 0.22, 0.35, W + 0.85], C.brass, 2));
      if (!prem && !buried) { box(L + 1.0, 0, -1.4, 1.1, 0.8, 0.7, C.dark); box(L + 1.4, 0.8, -1.2, 0.3, 0.1, 0.3, C.amber); }
    }
    if (buried) berm(L, u);

    // interior modules — only for the unit being edited, only in cutaway
    if (cut) {
      tagIn = true;
      for (let i = 0; i < n; i++) {
        const x0 = 0.08 + i * bl;
        bayPts.push({ u: u.id, i, p: xf([x0 + bl / 2, FLOOR + 0.9, W * 0.45]) });
        (MODULE[u.bays[i]] || MODULE.open)(x0, bl);
      }
      tagIn = false;
    }
  }

  // thin two-sided quad standing in for a pipe / rail / cable
  function lineFace(a, b, c, w) {
    const t = (w || 1.5) * 0.02;
    const pts = [[a[0], a[1] - t, a[2]], [b[0], b[1] - t, b[2]], [b[0], b[1] + t, b[2]], [a[0], a[1] + t, a[2]]];
    const p = pts.map(xf);
    return { p, c, cx: (p[0][0] + p[2][0]) / 2, cy: (p[0][1] + p[2][1]) / 2, cz: (p[0][2] + p[2][2]) / 2, nx: 0, ny: 1, nz: 0, two: true, line: true, lw: w || 1.5 };
  }

  function solar(L, u) {
    const count = Math.max(1, Math.floor((L - 0.4) / 1.1));
    const x0 = (L - count * 1.1) / 2 + 0.05;
    const grid = scene.detail === 2;
    for (let i = 0; i < count; i++) {
      const x = x0 + i * 1.1;
      const p = [[x, H + 0.25, W - 0.35], [x + 1.0, H + 0.25, W - 0.35], [x + 1.0, H + 0.72, 0.35], [x, H + 0.72, 0.35]];
      const deco = grid ? [{ s: [seg([x + 0.5, H + 0.25, W - 0.35], [x + 0.5, H + 0.72, 0.35]), seg([x, H + 0.49, W / 2], [x + 1.0, H + 0.49, W / 2])], c: "#3b4f7a" }] : null;
      poly(p, C.panel, { two: true, deco });
      if (grid) { box(x + 0.1, H, 0.45, 0.05, 0.7, 0.05, C.steel); box(x + 0.85, H, 0.45, 0.05, 0.7, 0.05, C.steel); }
    }
  }

  function flue(x, y, z) {
    cyl(x, y, z, 0.1, 1.3, 6, C.copper);
    cyl(x, y + 1.32, z, 0.22, 0.12, 6, C.brass, {}, 0.05);
    flues.push(xf([x, y + 1.45, z]));
  }

  function deck(L) {
    const slats = [];
    if (scene.detail === 2) for (let x = L + 0.15; x < L + 2.0; x += 0.14) slats.push(seg([x, FLOOR, -0.2], [x, FLOOR, W + 0.2]));
    box(L, 0, -0.2, 2.1, FLOOR, W + 0.4, C.teak, { deco: { t: [{ s: slats, c: "#7a5228" }] } });
    for (const p of [[L + 2.05, -0.2], [L + 2.05, W + 0.15], [L + 0.05, W + 0.15]]) box(p[0], FLOOR, p[1], 0.06, 1.0, 0.06, C.brass);
    sink.push(lineFace([L + 2.08, FLOOR + 1.0, -0.17], [L + 2.08, FLOOR + 1.0, W + 0.18], C.brass, 2));
    sink.push(lineFace([L + 0.08, FLOOR + 1.0, W + 0.18], [L + 2.08, FLOOR + 1.0, W + 0.18], C.brass, 2));
    box(L + 0.15, FLOOR, -0.15, 0.8, 0.35, 0.4, C.copper);
    cyl(L + 0.55, FLOOR + 0.35, 0.05, 0.28, 0.4, 5, C.plant);
    box(L + 2.1, 0, W / 2 - 0.5, 0.3, 0.08, 1.0, C.teak);
  }

  // earth shelter around a level-0 unit: back + ends buried, sod roof,
  // stone wing walls holding the cut open at the exposed face
  function berm(L, u) {
    const top = H + 0.38, o = { shell: true, inner: C.earth, unit: u, topC: C.sod };
    const bermC = "#6b8f3a";
    if (u.open === "n") {
      rfrus(-2.3, -2.3, L + 2.3, W, 0, -0.35, -0.35, L + 0.35, W + 0.25, top, bermC, Object.assign({ skip: "n" }, o));
      box(-0.35, 0, W - 0.1, 0.35, top, 0.55, C.stoneD);
      box(L, 0, W - 0.1, 0.35, top, 0.55, C.stoneD);
    } else {
      rfrus(-2.3, -2.3, L, W + 2.3, 0, -0.35, -0.35, L, W + 0.35, top, bermC, Object.assign({ skip: "e" }, o));
      box(L - 0.1, 0, -0.45, 0.5, top, 0.45, C.stoneD);
      box(L - 0.1, 0, W, 0.5, top, 0.45, C.stoneD);
    }
    box(L * 0.5 - 0.5, top, W * 0.5 - 0.35, 1.0, 0.3, 0.7, C.glass, { a: 0.6, glow: state.light === "dusk" });
    cyl(L - 1.0, top, 0.5, 0.12, 1.1, 6, C.copper);                  // periscope vent
    box(L - 1.35, top + 1.1, 0.38, 0.5, 0.2, 0.24, C.brass);
    const cnt = Math.max(1, Math.floor((L - 1) / 1.1)), x0 = (L - cnt * 1.1) / 2;
    for (let i = 0; i < cnt; i++) {
      const x = x0 + i * 1.1;
      poly([[x, top + 0.2, 1.6], [x + 1.0, top + 0.2, 1.6], [x + 1.0, top + 0.62, 0.6], [x, top + 0.62, 0.6]], C.panel, { two: true });
    }
  }

  /* ── interior modules (bay-local: x0 = bay start, bl = bay length) ─── */
  const CEIL = H - 0.12, Z0 = 0.06, DEP = 1.5;
  function led(x, y, z, c) { box(x, y, z, 0.05, 0.05, 0.03, c, { glow: true, skip: "" }); }

  const MODULE = {
    open(x0, bl) {
      if (scene.detail === 2) box(x0 + bl * 0.2, FLOOR, Z0 + 0.2, bl * 0.6, 0.02, 1.0, C.mat);
    },
    bed(x0, bl) {
      const d = [];
      for (const s of [0.02, bl * 0.5]) d.push({ p: [[x0 + s + 0.04, FLOOR + 0.08, Z0 + 1.05], [x0 + s + bl * 0.5 - 0.06, FLOOR + 0.08, Z0 + 1.05], [x0 + s + bl * 0.5 - 0.06, FLOOR + 0.4, Z0 + 1.05], [x0 + s + 0.04, FLOOR + 0.4, Z0 + 1.05]], c: C.black });
      box(x0 + 0.02, FLOOR, Z0, bl - 0.04, 0.45, 1.05, C.steel, { deco: { n: d } });
      box(x0 + 0.04, FLOOR + 0.45, Z0 + 0.02, bl - 0.08, 0.18, 1.0, C.cream);
      box(x0 + 0.08, FLOOR + 0.63, Z0 + 0.05, bl * 0.28, 0.1, 0.5, C.white);
      box(x0 + bl * 0.4, FLOOR + 0.61, Z0 + 0.02, bl * 0.56, 0.06, 1.0, C.coat);
      box(x0 + 0.02, CEIL - 0.7, Z0, bl - 0.04, 0.7, 0.45, C.cream, { deco: { n: [{ s: [seg([x0 + bl / 2, CEIL - 0.68, Z0 + 0.45], [x0 + bl / 2, CEIL - 0.02, Z0 + 0.45])], c: C.frame }] } });
      cyl(x0 + bl * 0.15, FLOOR + 1.25, Z0 + 0.08, 0.06, 0.08, 6, C.brass);
      led(x0 + bl * 0.15 - 0.02, FLOOR + 1.2, Z0 + 0.08, C.amber);
      sink.push(lineFace([x0, CEIL - 0.05, Z0 + 1.1], [x0 + bl, CEIL - 0.05, Z0 + 1.1], C.brass));
    },
    galley(x0, bl) {
      box(x0 + 0.02, FLOOR, Z0, bl - 0.04, 0.85, 0.62, C.dark);
      box(x0 + 0.02, FLOOR + 0.85, Z0, bl - 0.04, 0.05, 0.64, C.teak);
      box(x0 + 0.08, FLOOR + 0.86, Z0 + 0.12, bl * 0.35, 0.03, 0.4, C.steel);
      sink.push(lineFace([x0 + bl * 0.25, FLOOR + 0.9, Z0 + 0.1], [x0 + bl * 0.25, FLOOR + 1.2, Z0 + 0.1], C.brass, 2));
      box(x0 + bl * 0.55, FLOOR + 0.9, Z0 + 0.1, bl * 0.4, 0.03, 0.45, C.black);
      cyl(x0 + bl * 0.65, FLOOR + 0.93, Z0 + 0.32, 0.12, 0.01, 8, C.rust);
      cyl(x0 + bl * 0.85, FLOOR + 0.93, Z0 + 0.32, 0.12, 0.01, 8, C.rust);
      const d = [];
      for (let i = 1; i < 3; i++) d.push({ s: [seg([x0 + i * bl / 3, CEIL - 0.7, Z0 + 0.4], [x0 + i * bl / 3, CEIL - 0.02, Z0 + 0.4])], c: C.frame });
      box(x0 + 0.02, CEIL - 0.72, Z0, bl - 0.04, 0.72, 0.4, C.cream, { deco: { n: d } });
      box(x0 + 0.06, FLOOR + 0.02, Z0 + 0.62, bl * 0.4, 0.5, 0.02, C.steel);
    },
    head(x0, bl) {
      box(x0 + 0.02, FLOOR, Z0, bl * 0.55, 0.08, 0.9, C.white);
      box(x0 + 0.02, FLOOR, Z0, bl * 0.55, 2.1, 0.03, C.glass, { a: 0.5 });
      box(x0 + bl * 0.55, FLOOR, Z0, 0.03, 2.1, 0.95, C.glass, { a: 0.5 });
      box(x0 + bl * 0.62, FLOOR, Z0 + 0.1, 0.42, 0.45, 0.55, C.white);
      cyl(x0 + bl * 0.62 + 0.21, FLOOR + 0.45, Z0 + 0.37, 0.19, 0.04, 8, C.dark);
      box(x0 + bl * 0.62, FLOOR + 0.8, Z0, 0.42, 0.15, 0.35, C.white);
      sink.push(lineFace([x0 + bl * 0.3, FLOOR + 2.0, Z0 + 0.02], [x0 + bl * 0.3, FLOOR + 1.0, Z0 + 0.02], C.brass, 2));
      box(x0 + bl * 0.66, FLOOR + 1.3, Z0, 0.3, 0.4, 0.03, C.cyan, { a: 0.7 });
    },
    store(x0, bl) {
      const d = [], cols = 2, rows = 5, cw = (bl - 0.04) / cols, rh = (CEIL - FLOOR) / rows;
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        const x = x0 + 0.02 + c * cw, y = FLOOR + r * rh;
        d.push({ p: [[x + 0.03, y + 0.03, Z0 + 0.6], [x + cw - 0.03, y + 0.03, Z0 + 0.6], [x + cw - 0.03, y + rh - 0.03, Z0 + 0.6], [x + 0.03, y + rh - 0.03, Z0 + 0.6]], c: C.frame });
        d.push({ p: [[x + cw - 0.14, y + rh / 2 - 0.02, Z0 + 0.6], [x + cw - 0.14, y + rh / 2 + 0.02, Z0 + 0.6]], c: C.brass, w: 3 });
      }
      box(x0 + 0.02, FLOOR, Z0, bl - 0.04, CEIL - FLOOR, 0.6, C.steel, { deco: { n: d } });
    },
    bench(x0, bl) {
      box(x0 + 0.03, FLOOR + 0.86, Z0, bl - 0.06, 0.07, 0.72, C.wood);
      for (const s of [0.06, bl - 0.14]) for (const z of [0.05, 0.6]) box(x0 + s, FLOOR, Z0 + z, 0.08, 0.86, 0.08, C.dark);
      box(x0 + 0.06, FLOOR + 0.35, Z0 + 0.05, bl - 0.12, 0.03, 0.62, C.dark);
      box(x0 + 0.05, FLOOR + 1.15, Z0, bl - 0.1, 0.95, 0.03, "#7a5a3a");
      const r = rng(x0 * 100 | 0);
      for (let i = 0; i < 7; i++) box(x0 + 0.12 + r() * (bl - 0.4), FLOOR + 1.25 + r() * 0.7, Z0 + 0.03, 0.05 + r() * 0.08, 0.12 + r() * 0.22, 0.04, i % 2 ? C.steel : C.rust);
      box(x0 + bl - 0.42, FLOOR + 0.93, Z0 + 0.25, 0.28, 0.18, 0.22, C.iron);
      box(x0 + 0.05, FLOOR + 2.2, Z0, bl - 0.1, 0.04, 0.4, C.wood);
      sink.push(lineFace([x0 + bl * 0.4, CEIL, Z0 + 0.35], [x0 + bl * 0.4, FLOOR + 1.6, Z0 + 0.35], C.brass));
      cyl(x0 + bl * 0.4, FLOOR + 1.5, Z0 + 0.35, 0.14, 0.1, 6, C.brass, { topC: C.amber, glow: true }, 0.08);
    },
    farm(x0, bl) {
      const dusk = state.light === "dusk";
      for (const s of [0.05, bl - 0.1]) for (const z of [0.08, 0.75]) box(x0 + s, FLOOR, Z0 + z, 0.05, 2.3, 0.05, C.steel);
      for (let t = 0; t < 3; t++) {
        const y = FLOOR + 0.35 + t * 0.7;
        box(x0 + 0.08, y, Z0 + 0.08, bl - 0.16, 0.08, 0.72, C.white);
        for (let i = 0; i < 4; i++)
          cyl(x0 + 0.2 + (i + 0.5) * (bl - 0.4) / 4, y + 0.08, Z0 + 0.25 + (i % 2) * 0.35, 0.1 + (i % 3) * 0.03, 0.22 + (i % 2) * 0.12, 6, i % 2 ? C.plant : C.leaf);
        box(x0 + 0.1, y + 0.6, Z0 + 0.3, bl - 0.2, 0.03, 0.06, dusk ? C.mag : C.white, { glow: dusk });
      }
      sink.push(lineFace([x0 + 0.1, FLOOR + 0.35, Z0 + 0.9], [x0 + 0.1, FLOOR + 2.0, Z0 + 0.9], C.copper));
    },
    power(x0, bl) {
      for (let i = 0; i < 3; i++) {
        box(x0 + 0.06, FLOOR + i * 0.4, Z0 + 0.04, bl * 0.55, 0.36, 0.5, C.batt);
        led(x0 + 0.1, FLOOR + i * 0.4 + 0.28, Z0 + 0.54, C.led);
      }
      box(x0 + bl * 0.66, FLOOR + 0.5, Z0, bl * 0.3, 0.6, 0.18, C.steel);
      box(x0 + bl * 0.7, FLOOR + 0.8, Z0 + 0.18, bl * 0.2, 0.15, 0.01, C.cyan, { glow: true });
      box(x0 + bl * 0.66, FLOOR + 1.3, Z0, bl * 0.3, 0.75, 0.12, C.dark);
      for (let i = 0; i < 6; i++) led(x0 + bl * 0.69 + (i % 3) * 0.1, FLOOR + 1.5 + Math.floor(i / 3) * 0.25, Z0 + 0.12, i === 4 ? C.amber : C.led);
      box(x0 + 0.02, CEIL - 0.15, Z0, bl - 0.04, 0.12, 0.12, C.steel);
      sink.push(lineFace([x0 + bl * 0.8, CEIL - 0.15, Z0 + 0.06], [x0 + bl * 0.8, FLOOR + 2.05, Z0 + 0.06], C.copper, 2));
    },
    water(x0, bl) {
      cyl(x0 + bl * 0.25, FLOOR, Z0 + 0.45, 0.32, 1.9, 8, C.white);
      cyl(x0 + bl * 0.72, FLOOR, Z0 + 0.45, 0.32, 1.9, 8, C.white);
      for (const x of [bl * 0.25, bl * 0.72]) for (const y of [0.4, 1.0, 1.6]) sink.push(lineFace([x0 + x - 0.33, FLOOR + y, Z0 + 0.8], [x0 + x + 0.33, FLOOR + y, Z0 + 0.8], C.brass, 2));
      for (let i = 0; i < 3; i++) cyl(x0 + bl * 0.5, FLOOR + i * 0.45, Z0 + 1.05, 0.11, 0.4, 6, C.steel);
      box(x0 + bl * 0.15, FLOOR, Z0 + 0.95, 0.3, 0.25, 0.3, C.copper);
      sink.push(lineFace([x0 + bl * 0.25, FLOOR + 1.9, Z0 + 0.45], [x0 + bl * 0.72, FLOOR + 1.9, Z0 + 0.45], C.copper, 2));
      sink.push(lineFace([x0 + bl * 0.5, FLOOR + 1.35, Z0 + 1.05], [x0 + bl * 0.5, FLOOR + 2.2, Z0 + 1.05], C.copper, 2));
      cyl(x0 + bl * 0.5, FLOOR + 1.5, Z0 + 1.2, 0.09, 0.03, 8, C.brass);
    },
    comms(x0, bl) {
      box(x0 + 0.04, FLOOR + 0.72, Z0, bl - 0.08, 0.05, 0.7, C.dark);
      for (const s of [0.08, bl - 0.14]) box(x0 + s, FLOOR, Z0 + 0.1, 0.06, 0.72, 0.5, C.steel);
      for (const s of [0.15, bl * 0.52]) {
        box(x0 + s, FLOOR + 0.8, Z0 + 0.08, bl * 0.34, 0.32, 0.03, C.black);
        box(x0 + s + 0.02, FLOOR + 0.82, Z0 + 0.11, bl * 0.34 - 0.04, 0.28, 0.005, C.cyan, { glow: true, a: 0.85 });
      }
      box(x0 + bl * 0.3, FLOOR + 0.77, Z0 + 0.45, bl * 0.4, 0.02, 0.15, C.steel);
      for (let i = 0; i < 3; i++) { box(x0 + 0.06, FLOOR + 1.35 + i * 0.22, Z0, bl * 0.45, 0.18, 0.3, C.dark); led(x0 + 0.1, FLOOR + 1.42 + i * 0.22, Z0 + 0.3, i ? C.led : C.amber); }
      box(x0 + bl * 0.55, FLOOR + 1.35, Z0, bl * 0.4, 0.8, 0.02, C.pineD, { deco: { n: [{ s: [seg([x0 + bl * 0.55, FLOOR + 1.75, Z0 + 0.02], [x0 + bl * 0.95, FLOOR + 1.75, Z0 + 0.02]), seg([x0 + bl * 0.75, FLOOR + 1.35, Z0 + 0.02], [x0 + bl * 0.75, FLOOR + 2.15, Z0 + 0.02])], c: C.led }] } });
      sink.push(lineFace([x0 + 0.3, FLOOR + 1.9, Z0 + 0.15], [x0 + 0.3, CEIL, Z0 + 0.15], C.copper));
    },
    drone(x0, bl) {
      for (const s of [0.05, bl - 0.1]) box(x0 + s, FLOOR, Z0 + 0.05, 0.05, 2.2, 0.05, C.steel);
      for (let t = 0; t < 3; t++) {
        const y = FLOOR + 0.5 + t * 0.6;
        box(x0 + 0.05, y, Z0, bl - 0.1, 0.04, 0.7, C.dark);
        if (t < 2) {
          const cx = x0 + bl / 2, cz = Z0 + 0.35;
          box(cx - 0.09, y + 0.06, cz - 0.09, 0.18, 0.08, 0.18, C.dark);
          box(cx - 0.32, y + 0.08, cz - 0.02, 0.64, 0.03, 0.04, C.steel);
          box(cx - 0.02, y + 0.08, cz - 0.32, 0.04, 0.03, 0.64, C.steel);
          for (const q of [[-0.32, 0], [0.32, 0], [0, -0.32], [0, 0.32]]) cyl(cx + q[0], y + 0.11, cz + q[1], 0.13, 0.01, 6, C.cyan, { a: 0.5 });
          led(cx + 0.35, y + 0.05, cz + 0.3, C.led);
        } else for (let i = 0; i < 4; i++) box(x0 + 0.15 + i * 0.22, y + 0.04, Z0 + 0.15, 0.16, 0.1, 0.3, C.batt);
      }
      box(x0 + 0.05, FLOOR + 2.3, Z0, bl - 0.1, 0.04, 0.3, C.dark);
    },
    stove(x0, bl) {
      box(x0 + bl * 0.3, FLOOR + 0.12, Z0 + 0.3, 0.55, 0.55, 0.5, C.iron, { deco: { n: [{ p: [[x0 + bl * 0.3 + 0.1, FLOOR + 0.2, Z0 + 0.8], [x0 + bl * 0.3 + 0.45, FLOOR + 0.2, Z0 + 0.8], [x0 + bl * 0.3 + 0.45, FLOOR + 0.5, Z0 + 0.8], [x0 + bl * 0.3 + 0.1, FLOOR + 0.5, Z0 + 0.8]], c: C.amber, f: true, glow: true, a: 0.85 }] } });
      for (const s of [0, 0.5]) for (const z of [0, 0.45]) box(x0 + bl * 0.3 + s + 0.02, FLOOR, Z0 + 0.32 + z, 0.05, 0.12, 0.05, C.iron);
      box(x0 + bl * 0.3 - 0.1, FLOOR, Z0 + 0.15, 0.75, 0.02, 0.8, C.stoneD);
      cyl(x0 + bl * 0.3 + 0.27, FLOOR + 0.67, Z0 + 0.55, 0.1, CEIL - FLOOR - 0.67, 6, C.copper);
      for (let i = 0; i < 6; i++) box(x0 + 0.05 + (i % 3) * 0.2, FLOOR + Math.floor(i / 3) * 0.2, Z0 + 0.1, 0.18, 0.18, 0.5, i % 2 ? C.wood : C.trunk);
      box(x0 + 0.02, FLOOR + 0.9, Z0, bl * 0.28, 0.05, 0.5, C.teak);
      box(x0 + bl - 0.4, FLOOR, Z0 + 0.2, 0.36, 0.45, 0.4, C.teak);
    },
    air(x0, bl) {
      box(x0 + bl - 0.08, FLOOR, Z0, 0.08, CEIL - FLOOR, W - 0.12, C.steel, { deco: { e: [{ p: [[x0 + bl, FLOOR + 0.02, Z0 + 0.7], [x0 + bl, FLOOR + 0.02, Z0 + 1.6], [x0 + bl, FLOOR + 2.05, Z0 + 1.6], [x0 + bl, FLOOR + 2.05, Z0 + 0.7]], c: C.dark }, { p: [[x0 + bl, FLOOR + 1.0, Z0 + 1.45], [x0 + bl, FLOOR + 1.12, Z0 + 1.45]], c: C.brass, w: 3 }], w: [{ p: [[x0 + bl - 0.08, FLOOR + 0.02, Z0 + 0.7], [x0 + bl - 0.08, FLOOR + 0.02, Z0 + 1.6], [x0 + bl - 0.08, FLOOR + 2.05, Z0 + 1.6], [x0 + bl - 0.08, FLOOR + 2.05, Z0 + 0.7]], c: C.dark }] } });
      box(x0 + 0.05, FLOOR + 0.42, Z0, bl * 0.5, 0.05, 0.4, C.wood);
      for (let i = 0; i < 3; i++) box(x0 + 0.1 + i * 0.22, FLOOR, Z0 + 0.05, 0.14, 0.3, 0.3, i ? C.dark : C.rust);
      for (let i = 0; i < 4; i++) box(x0 + 0.1 + i * 0.25, FLOOR + 1.7, Z0, 0.04, 0.04, 0.08, C.brass);
      box(x0 + 0.1, FLOOR + 1.2, Z0 + 0.05, bl * 0.5, 0.5, 0.02, C.coat);
      const g = [];
      for (let x = 0.1; x < bl - 0.2; x += 0.12) g.push(seg([x0 + x, FLOOR + 0.01, Z0 + 0.6], [x0 + x, FLOOR + 0.01, W - 0.1]));
      box(x0 + 0.05, FLOOR - 0.005, Z0 + 0.6, bl - 0.2, 0.01, W - 0.7, C.dark, { deco: { t: [{ s: g, c: C.steel }] } });
    }
  };

  /* ── layouts ───────────────────────────────────────────────────────── */
  function unit(id, name, len, x, y, z, r, o) {
    return Object.assign({ id, name, len, x, y, z, r: r || 0, level: Math.round(y / H), shared: {}, top: true,
      doorEnd: true, edit: false, primary: false, berm: false, open: "n", bays: null }, o || {});
  }

  function layoutUnits(id) {
    const U = [], X = [];        // units, extras (functions drawing scenery)
    if (id === "s20" || id === "s40") {
      const L = id === "s20" ? L20 : L40;
      U.push(unit("A", "UNIT A", L, 0, 0, 0, 0, { edit: true, primary: true, berm: true }));
      X.push(() => turbine(-2.6, -2.4));
    } else if (id === "twin") {
      U.push(unit("A", "UNIT A", L20, 0, 0, 0, 0, { edit: true, primary: true, berm: true, shared: { n: 1 }, open: "e" }));
      U.push(unit("B", "UNIT B", L20, L20, 0, 2 * W, 2, { edit: true, berm: true, shared: { n: 1 }, open: "e" }));
      X.push(() => turbine(-2.6, -2.4));
    } else if (id === "stack") {
      U.push(unit("A", "GROUND A", L40, 0, 0, 0, 0, { edit: true, primary: true, shared: { n: 1 }, top: false, open: "e" }));
      U.push(unit("B", "GROUND B", L40, L40, 0, 2 * W, 2, { edit: true, shared: { n: 1 }, open: "e" }));
      U.push(unit("C", "LOFT C", L40, 0, H, 0, 0, { edit: true }));
      X.push(() => {
        setCur(0, 0, 0, 0);
        box(0.1, H, W + 0.05, L40 - 0.2, 0.12, W - 0.1, C.teak);
        for (let x = 0.3; x < L40; x += 3) box(x, H + 0.12, 2 * W - 0.15, 0.06, 1.0, 0.06, C.brass);
        sink.push(lineFace([0.3, H + 1.1, 2 * W - 0.12], [L40 - 0.3, H + 1.1, 2 * W - 0.12], C.brass, 2));
        box(1.0, H + 0.12, W + 0.3, 2.0, 0.35, 0.5, C.copper);
        cyl(2.0, H + 0.47, W + 0.55, 0.4, 0.5, 6, C.plant);
        for (let i = 0; i < 8; i++) box(L40 + 0.1 + i * 0.32, i * H / 8, W + 0.3, 0.34, H / 8 + 0.04, 1.0, C.steel);
        turbine(L40 + 4, -2.5);
      });
    } else if (id === "court") {
      const D = L20;
      U.push(unit("N", "NORTH 40'", L40, 0, 0, 0, 0, { edit: true, primary: true, berm: true }));
      U.push(unit("S", "SOUTH 40'", L40, L40, 0, 2 * W + D, 2, { edit: true, berm: true, doorEnd: true }));
      U.push(unit("E", "EAST 20'", L20, L40, 0, W, 1, { edit: true, berm: true, doorEnd: false }));
      U.push(unit("W", "WEST 20'", L20, 0, 0, W + D, 3, { edit: true, berm: true, doorEnd: false }));
      X.push(() => {
        setCur(0, 0, 0, 0);
        const x0 = W, x1 = L40 - W, z0 = W, z1 = W + D, g = [];
        for (let x = x0 + 1; x < x1; x += 1) g.push(seg([x, 0.03, z0], [x, 0.03, z1]));
        for (let z = z0 + 1; z < z1; z += 1) g.push(seg([x0, 0.03, z], [x1, 0.03, z]));
        onGround(() => poly([[x0, 0.03, z0], [x0, 0.03, z1], [x1, 0.03, z1], [x1, 0.03, z0]], C.paving, { two: true, deco: [{ s: g, c: "#6f685e" }] }));
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        box(cx - 1.3, 0.03, cz - 1.0, 2.6, 0.4, 2.0, C.stoneD, { skip: "b" });
        box(cx - 1.15, 0.3, cz - 0.85, 2.3, 0.15, 1.7, C.water, { a: 0.85, glow: true, skip: "b" });
        for (const p of [[x0 + 0.6, z0 + 0.6], [x1 - 1.6, z0 + 0.6], [x0 + 0.6, z1 - 1.2], [x1 - 1.6, z1 - 1.2]]) {
          box(p[0], 0.03, p[1], 1.0, 0.45, 0.6, C.copper);
          cyl(p[0] + 0.5, 0.48, p[1] + 0.3, 0.4, 0.9, 6, C.leaf);
        }
        for (let x = x0 + 0.3; x < x1; x += 2.9) for (const z of [z0 + 1.3, z1 - 1.3]) box(x, 0, z, 0.08, 2.6, 0.08, C.copper);
        sink.push(lineFace([x0 + 0.34, 2.62, z0 + 1.34], [x1 - 0.3, 2.62, z0 + 1.34], C.copper, 2));
        sink.push(lineFace([x0 + 0.34, 2.62, z1 - 1.26], [x1 - 0.3, 2.62, z1 - 1.26], C.copper, 2));
        turbine(-3.2, W + D / 2);
      });
    } else if (id === "pyramid") {
      let k = 0;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) {
        const front = i === 2 && j === 1, id2 = front ? "GATE" : "p" + k;
        U.push(unit(id2, "GATE 20'", L20, W * (i + 1), 0, j * L20, 1, { edit: front, primary: front, top: i === 0 || i === 4, doorEnd: j === 1, hideWin: !front }));
        k++;
      }
      for (let i = 0; i < 4; i++) U.push(unit("q" + i, "", L20, 6.1 - 3.03, H, 1.18 + i * W, 0, { top: i === 0 || i === 3, doorEnd: i === 3, hideWin: true }));
      for (let i = 0; i < 2; i++) U.push(unit("r" + i, "", L20, 6.1 - W + W * (i + 1), 2 * H, 3.03, 1, { top: false, doorEnd: false, hideWin: true }));
      U.push(unit("APEX", "APEX 20'", L20, 6.1 + W / 2, 3 * H, 3.03, 1, { edit: true, doorEnd: true }));
      X.push(() => {
        setCur(0, 0, 0, 0);
        const tiers = [[0, 12.2, 0, 12.12, 1], [3.07, 9.13, 1.18, 10.94, 2], [3.66, 8.54, 3.03, 9.09, 3]];
        for (const t of tiers) {
          const y = t[4] * H + 0.02;
          for (let x = t[0] + 0.4; x < t[1]; x += 2.4) for (const z of [t[2] + 0.3, t[3] - 0.3]) box(x, y, z, 0.06, 1.0, 0.06, C.brass);
          sink.push(lineFace([t[0] + 0.4, y + 1.0, t[2] + 0.33], [t[1] - 0.4, y + 1.0, t[2] + 0.33], C.brass, 2));
          sink.push(lineFace([t[0] + 0.4, y + 1.0, t[3] - 0.27], [t[1] - 0.4, y + 1.0, t[3] - 0.27], C.brass, 2));
          for (let x = t[0] + 0.9; x < t[1] - 1.2; x += 3.1) {
            box(x, y, t[2] + 0.55, 1.3, 0.4, 0.6, C.copper);
            cyl(x + 0.65, y + 0.4, t[2] + 0.85, 0.42, 0.7, 6, (x * 7 | 0) % 2 ? C.leaf : C.leafY);
          }
        }
        cyl(6.1 + W / 2 + 0, 4 * H, 3.03 + L20 / 2, 1.2, 1.4, 4, C.glass, { a: 0.6, glow: state.light === "dusk", phase: Math.PI / 4 }, 0);
        turbine(-3.5, 14.5);
      });
    } else if (id === "compound") {
      const S = 3 * L40, TX = L20, TZ = 2 * W, X1 = TX + S, Z1 = TZ + S;
      const wall = (n, name, len, x, y, z, r, o) => U.push(unit(n, name, len, x, y, z, r, Object.assign({ hideWin: true, doorEnd: false, top: y > 0 }, o)));
      for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) {
        wall("n" + i + k, "", L40, TX + i * L40, k * H, 0, 0);
        if (!(i === 1 && k === 0)) wall(i === 1 ? "GATE" : "s" + i + k, "GATEHOUSE 40'", L40, TX + (i + 1) * L40, k * H, Z1 + TZ, 2, { edit: i === 1, primary: i === 1 });
        wall("e" + i + k, "", L40, X1 + TX, k * H, TZ + i * L40, 1);
        wall("w" + i + k, "", L40, 0, k * H, TZ + (i + 1) * L40, 3);
      }
      const towerUnits = (name, x, z, levels, editTop) => {
        for (let k = 0; k < levels; k++) for (let j = 0; j < 2; j++) {
          const isTop = k === levels - 1, ed = isTop && j === 0 && editTop;
          U.push(unit(ed ? "TOWER" : name + k + j, "TOWER TOP 20'", L20, x, k * H, z + j * W, 0,
            { hideWin: !ed, doorEnd: false, top: isTop, edit: ed, primary: ed }));
        }
      };
      const crenel = (x, z, y) => {
        setCur(0, 0, 0, 0);
        for (let s = 0; s < L20; s += 1.5) { box(x + s, y, z - 0.1, 0.6, 0.6, 0.35, C.stone); box(x + s, y, z + 2 * W - 0.25, 0.6, 0.6, 0.35, C.stone); }
        for (let s = 0; s < 2 * W; s += 1.5) { box(x - 0.1, y, z + s, 0.35, 0.6, 0.6, C.stone); box(x + L20 - 0.25, y, z + s, 0.35, 0.6, 0.6, C.stone); }
      };
      const corners = [[0, 0], [X1, 0], [0, Z1], [X1, Z1]];
      for (const p of corners) towerUnits("t" + p[0] + p[1], p[0], p[1], 4, false);
      const cx = TX + S / 2, cz = TZ + S / 2, ty = 8 * H;
      towerUnits("c", cx - L20 / 2, cz - W, 8, true);
      X.push(() => {
        for (const p of corners) crenel(p[0], p[1], 4 * H);
        crenel(cx - L20 / 2, cz - W, ty);
        setCur(0, 0, 0, 0);
        box(cx - 0.08, ty, cz - 0.08, 0.16, 4.0, 0.16, C.steel);
        cyl(cx, ty + 4.0, cz, 0.5, 0.05, 6, C.dark);
        for (const p of corners) {
          box(p[0] + L20 / 2, 4 * H + 0.6, p[1] + W, 0.08, 3.0, 0.08, C.steel);
          poly([[p[0] + L20 / 2 + 0.08, 4 * H + 3.6, p[1] + W], [p[0] + L20 / 2 + 1.4, 4 * H + 3.3, p[1] + W], [p[0] + L20 / 2 + 0.08, 4 * H + 2.9, p[1] + W]], C.amber, { two: true });
        }
        onGround(() => poly([[TX + W, 0.02, TZ + W], [TX + W, 0.02, Z1 + TZ - W], [X1 - W, 0.02, Z1 + TZ - W], [X1 - W, 0.02, TZ + W]], C.gravel, { two: true }));
        const gx = TX + L40 + L40 / 2, gz = Z1 + TZ;
        box(gx - 2.2, 0, gz - 0.3, 0.6, H, 3.0, C.stoneD);
        box(gx + 1.6, 0, gz - 0.3, 0.6, H, 3.0, C.stoneD);
        const bars = [];
        for (let x = gx - 1.4; x < gx + 1.6; x += 0.45) bars.push(seg([x, 0.1, gz + 1.3], [x, H - 0.1, gz + 1.3]));
        for (let y = 0.5; y < H; y += 0.6) bars.push(seg([gx - 1.5, y, gz + 1.3], [gx + 1.5, y, gz + 1.3]));
        poly([[gx - 1.6, 0, gz + 1.3], [gx + 1.6, 0, gz + 1.3], [gx + 1.6, H, gz + 1.3], [gx - 1.6, H, gz + 1.3]], C.iron, { two: true, a: 0.25, deco: [{ s: bars, c: C.iron, w: 2 }] });
        turbine(cx - 4, cz - 3, ty);
        turbine(cx + 4, cz + 3, ty);
        const r = rng(9);
        for (let i = 0; i < 6; i++) tree(TX + 4 + r() * (S - 8), TZ + 4 + r() * (S - 8), r, 0.7);
      });
    }
    return { units: U, extras: X };
  }

  /* ── scenery ───────────────────────────────────────────────────────── */
  function turbine(x, z, y) {
    y = y || 0;
    setCur(0, 0, 0, 0);
    box(x - 0.07, y, z - 0.07, 0.14, 5.2, 0.14, C.steel);
    cyl(x, y + 5.2, z, 0.62, 0.06, 6, C.dark);
    cyl(x, y + 3.55, z, 0.62, 0.06, 6, C.dark);
    masts.push([x, y + 3.62, z]);
  }

  function tree(x, z, r, scale) {
    setCur(0, 0, 0, 0);
    const s = scale || 1, det = scene.detail;
    tagTree = true;
    if (r() < 0.55) {
      const h = (7 + r() * 6) * s, rad = (1.5 + r() * 1.0) * s, c = r() < 0.5 ? C.pine : C.pineD;
      box(x - 0.15, 0, z - 0.15, 0.3, h * 0.35, 0.3, C.trunk, { skip: "bt" });
      cyl(x, h * 0.25, z, rad, h * 0.45, det ? 6 : 5, c, { phase: r() * TAU }, 0);
      cyl(x, h * 0.5, z, rad * 0.7, h * 0.5, det ? 6 : 5, c, { phase: r() * TAU }, 0);
    } else {
      const h = (6 + r() * 5) * s, rad = (1.6 + r() * 1.2) * s, q = r(), c = q < 0.45 ? C.leaf : q < 0.85 ? C.plant : C.leafY;
      box(x - 0.18, 0, z - 0.18, 0.36, h * 0.45, 0.36, C.trunk, { skip: "bt" });
      cyl(x, h * 0.38, z, rad, h * 0.32, 6, c, { phase: r() * TAU }, rad * 0.9);
      cyl(x + (r() - 0.5) * rad, h * 0.62, z + (r() - 0.5) * rad, rad * 0.7, h * 0.3, 6, c, { phase: r() * TAU }, rad * 0.3);
    }
    tagTree = false;
  }

  function forest(innerR, cx, cz) {
    const det = scene.detail, count = det === 2 ? 72 : det === 1 ? 58 : 44, r = rng(1234 + innerR | 0);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + (r() - 0.5) * 0.2, d = innerR + 1.5 + r() * 16;
      tree(cx + Math.cos(a) * d, cz + Math.sin(a) * d, r);
    }
  }

  /* ── build the whole static scene for the current state ─────────── */
  function build() {
    items = []; ground = []; flues = []; glows = []; bayPts = []; masts.length = 0;
    const lay = layoutUnits(state.layout);
    scene.units = lay.units;
    scene.detail = lay.units.length <= 4 ? 2 : lay.units.length <= 24 ? 1 : 0;
    ensureBays();
    // bounds
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, top = 0;
    for (const u of lay.units) {
      setCur(u.x, u.y, u.z, u.r);
      for (const p of [[0, 0, 0], [u.len, 0, 0], [u.len, 0, W], [0, 0, W]]) {
        const w = xf(p);
        x0 = Math.min(x0, w[0]); x1 = Math.max(x1, w[0]); z0 = Math.min(z0, w[2]); z1 = Math.max(z1, w[2]);
      }
      top = Math.max(top, u.y + H);
    }
    scene.cx = (x0 + x1) / 2; scene.cz = (z0 + z1) / 2; scene.top = top;
    scene.rad = Math.hypot(x1 - x0, z1 - z0) / 2 + 3;
    cam.tx = scene.cx; cam.tz = scene.cz; cam.ty = Math.min(top * 0.35, 6);
    cam.dist = scene.rad * 1.7 + top * 0.5 + 3;

    // ground layer: moss disc, clearing, path
    sink = ground;
    setCur(0, 0, 0, 0);
    const R = scene.rad + 6, far = cam.dist * 3 + 40;
    const disc = (rad, y, c) => { const p = []; for (let i = 0; i < 28; i++) p.push([scene.cx + Math.cos(i / 28 * TAU) * rad, y, scene.cz + Math.sin(i / 28 * TAU) * rad]); poly(p, c, { two: true }); };
    disc(far, -0.02, C.moss);
    disc(R, 0, C.grass);
    if (state.ext === "buried" && scene.detail < 2) {
      sink = items;
      const y = 1.4;
      rfrus(x0 - 2.2, z0 - 2.2, x1 + 2.2, z0, 0, x0 - 0.3, z0 - 0.5, x1 + 0.3, z0, y, C.grass, { skip: "n" });
      rfrus(x0 - 2.2, z1, x1 + 2.2, z1 + 2.2, 0, x0 - 0.3, z1, x1 + 0.3, z1 + 0.5, y, C.grass, { skip: "s" });
      rfrus(x0 - 2.2, z0, x0, z1, 0, x0 - 0.5, z0, x0, z1, y, C.grass, { skip: "e" });
      rfrus(x1, z0, x1 + 2.2, z1, 0, x1, z0, x1 + 0.5, z1, y, C.grass, { skip: "w" });
      sink = ground;
    }
    const pu = lay.units.find(u => u.primary) || lay.units[0];
    setCur(pu.x, pu.y, pu.z, pu.r);
    const doorSide = state.ext === "buried" && pu.berm && pu.open === "n";
    const a = doorSide ? xf([pu.len * 0.3, 0, W + 0.2]) : xf([pu.len + 2.2, 0, W / 2]);
    const b = doorSide ? xf([pu.len * 0.3, 0, W + R]) : xf([pu.len + R + 8, 0, W / 2]);
    setCur(0, 0, 0, 0);
    const dx = b[0] - a[0], dz = b[2] - a[2], dl = Math.hypot(dx, dz) || 1, px = -dz / dl * 0.7, pz = dx / dl * 0.7;
    poly([[a[0] + px, 0.01, a[2] + pz], [b[0] + px, 0.01, b[2] + pz], [b[0] - px, 0.01, b[2] - pz], [a[0] - px, 0.01, a[2] - pz]], C.gravel, { two: true });

    // solids
    sink = items;
    for (const u of lay.units) drawUnit(u);
    for (const fn of lay.extras) fn();
    forest(R, scene.cx, scene.cz);
    // distant tree line: a sawtooth ring far out, two-sided
    setCur(0, 0, 0, 0);
    const ring = far * 0.72, n = 56, hh = ring / 9;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * TAU, a1 = (i + 1) / n * TAU;
      const p0 = [scene.cx + Math.cos(a0) * ring, 0, scene.cz + Math.sin(a0) * ring];
      const p1 = [scene.cx + Math.cos(a1) * ring, 0, scene.cz + Math.sin(a1) * ring];
      const h0 = hh * (0.8 + ((i * 7) % 5) / 10), h1 = hh * (0.8 + (((i + 1) * 7) % 5) / 10);
      poly([p0, p1, [p1[0], h1, p1[2]], [p0[0], h0, p0[2]]], i % 2 ? C.pineD : "#193d26", { two: true, flat: true });
    }
    sink = null;
    frameCount = 0;
  }

  function ensureBays() {
    const L = state.bays[state.layout] || (state.bays[state.layout] = {});
    for (const u of scene.units) {
      const n = u.len > 7 ? 8 : 4;
      if (!L[u.id] || L[u.id].length !== n) L[u.id] = (u.len > 7 ? DEF40 : DEF20).slice();
      u.bays = L[u.id];
    }
    if (!scene.units.some(u => u.edit && u.id === state.unit)) state.unit = (scene.units.find(u => u.edit) || scene.units[0]).id;
  }

  /* ── camera + renderer ─────────────────────────────────────────────── */
  let cv, ctx, Wpx = 0, Hpx = 0, dpr = 1, frameCount = 0, faceCount = 0;
  const cam = { yaw: 0.85, pitch: 0.55, zoom: 1, auto: true, dist: 20, tx: 0, ty: 1, tz: 0 };
  let cy, sy, cp, sp, D, F, camPos;

  function view(p) {
    const x = p[0] - cam.tx, y = p[1] - cam.ty, z = p[2] - cam.tz;
    const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
    return [x1, y * cp - z1 * sp, D - (y * sp + z1 * cp)];
  }

  // clip a camera-space polygon against depth >= NEAR (Sutherland–Hodgman)
  function clip(pts) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], ain = a[2] >= NEAR, bin = b[2] >= NEAR;
      if (ain) out.push(a);
      if (ain !== bin) {
        const t = (NEAR - a[2]) / (b[2] - a[2]);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
      }
    }
    return out;
  }

  function sun() {
    return state.light === "dusk" ? [-0.55, 0.42, 0.55] : [0.42, 0.8, 0.42];
  }

  function drawFace(f, L, amb, dif, dusk) {
    let nx = f.nx, ny = f.ny, nz = f.nz;
    if (f.flip) { nx = -nx; ny = -ny; nz = -nz; }
    const lam = f.two ? Math.abs(nx * L[0] + ny * L[1] + nz * L[2]) : Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    let k = f.glow && dusk ? 1.25 : amb + dif * lam;
    if (dusk && (f.lit || f.flip)) k = Math.max(k, 0.92);          // the open unit is lit from inside
    let cs = f.p.map(view), clipped = false;
    for (const v of cs) if (v[2] < NEAR) { clipped = true; break; }
    if (clipped) { cs = clip(cs); if (cs.length < 3) return; }
    ctx.beginPath();
    for (let i = 0; i < cs.length; i++) {
      const v = cs[i], sx = Wpx / 2 + F * v[0] / v[2], sy2 = Hpx / 2 - F * v[1] / v[2];
      if (i) ctx.lineTo(sx, sy2); else ctx.moveTo(sx, sy2);
    }
    ctx.closePath();
    const col = shade(f.flip ? f.inner : f.c, k);
    if (f.a) ctx.globalAlpha = f.a;
    if (f.line) {
      ctx.strokeStyle = col; ctx.lineWidth = f.lw * dpr; ctx.stroke();
    } else {
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 0.7; ctx.stroke();   // hides hairline seams
    }
    if (f.a) ctx.globalAlpha = 1;
    faceCount++;
    if (!f.deco || f.flip || clipped) return;
    for (const d of f.deco) {
      const dc = d.glow && dusk ? d.c : shade(d.c, k);
      if (d.a) ctx.globalAlpha = d.a;
      if (d.s) {
        ctx.strokeStyle = dc; ctx.lineWidth = (d.w || 1) * dpr;
        ctx.beginPath();
        for (const s of d.s) {
          const a = view(s[0]), b = view(s[1]);
          if (a[2] < NEAR || b[2] < NEAR) continue;
          ctx.moveTo(Wpx / 2 + F * a[0] / a[2], Hpx / 2 - F * a[1] / a[2]);
          ctx.lineTo(Wpx / 2 + F * b[0] / b[2], Hpx / 2 - F * b[1] / b[2]);
        }
        ctx.stroke();
      } else if (d.p) {
        ctx.beginPath();
        let ok = true;
        for (let i = 0; i < d.p.length; i++) {
          const v = view(d.p[i]);
          if (v[2] < NEAR) { ok = false; break; }
          const sx = Wpx / 2 + F * v[0] / v[2], sy2 = Hpx / 2 - F * v[1] / v[2];
          if (i) ctx.lineTo(sx, sy2); else ctx.moveTo(sx, sy2);
        }
        if (!ok) continue;
        if (d.f) { ctx.closePath(); ctx.fillStyle = dc; ctx.fill(); }
        else { if (d.p.length > 2) ctx.closePath(); ctx.strokeStyle = dc; ctx.lineWidth = (d.w || 1) * dpr; ctx.stroke(); }
      }
      if (d.a) ctx.globalAlpha = 1;
    }
  }

  function sky(dusk) {
    const g = ctx.createLinearGradient(0, 0, 0, Hpx);
    if (dusk) { g.addColorStop(0, "#070d1a"); g.addColorStop(0.55, "#2a2440"); g.addColorStop(0.78, "#7a3d2e"); g.addColorStop(1, "#c98a3a"); }
    else { g.addColorStop(0, "#6fb2d6"); g.addColorStop(0.6, "#b9d9e6"); g.addColorStop(1, "#e7e4c9"); }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, Wpx, Hpx);
    if (dusk) {
      ctx.fillStyle = "#f2e9c9";
      ctx.beginPath(); ctx.arc(Wpx * 0.78, Hpx * 0.18, 9 * dpr, 0, TAU); ctx.fill();
      ctx.fillStyle = "#ffffff";
      const r = rng(7);
      for (let i = 0; i < 40; i++) ctx.fillRect(r() * Wpx, r() * Hpx * 0.45, dpr, dpr);
    }
  }

  function render(now) {
    if (!cv || !Wpx) return;
    const dusk = state.light === "dusk";
    tint = dusk ? [1.06, 0.9, 0.82] : [1, 1, 1];
    cy = Math.cos(cam.yaw); sy = Math.sin(cam.yaw); cp = Math.cos(cam.pitch); sp = Math.sin(cam.pitch);
    D = cam.dist * cam.zoom; F = Hpx * 1.25;
    camPos = [cam.tx + D * sy * cp, cam.ty + D * sp, cam.tz + D * cy * cp];
    const L = sun(), amb = dusk ? 0.42 : 0.52, dif = dusk ? 0.42 : 0.55;
    faceCount = 0;
    sky(dusk);
    for (const f of ground) drawFace(f, L, amb, dif, dusk);

    // dynamic: turbine rotors
    dyn = [];
    sink = dyn;
    setCur(0, 0, 0, 0);
    const spin = anim() ? now / 900 : 0.6;
    for (const m of masts) for (let i = 0; i < 3; i++) {
      const a = spin + i * TAU / 3, bx = m[0] + Math.cos(a) * 0.55, bz = m[2] + Math.sin(a) * 0.55;
      poly([[bx - Math.sin(a) * 0.2, m[1], bz + Math.cos(a) * 0.2], [bx + Math.sin(a) * 0.2, m[1], bz - Math.cos(a) * 0.2],
            [bx + Math.sin(a) * 0.2, m[1] + 1.55, bz - Math.cos(a) * 0.2], [bx - Math.sin(a) * 0.2, m[1] + 1.55, bz + Math.cos(a) * 0.2]], C.cyan, { two: true, a: 0.85 });
    }
    sink = null;

    // visibility + depth for the solids, then painter's sort
    const list = [];
    for (const src of [items, dyn]) for (const f of src) {
      const dxx = camPos[0] - f.cx, dyy = camPos[1] - f.cy, dzz = camPos[2] - f.cz;
      const front = f.nx * dxx + f.ny * dyy + f.nz * dzz > 0;
      if (f.shell) {
        const cut = state.view === "cut" && f.unit.edit;
        if (cut) { if (front) continue; f.flip = true; }
        else { if (!front) continue; f.flip = false; }
      } else if (!f.two && !front) continue;
      f.d = dxx * dxx + dyy * dyy + dzz * dzz;
      if (f.tree && f.d < 64) continue;          // a crown across the lens
      list.push(f);
    }
    list.sort((a, b) => b.d - a.d);
    for (const f of list) drawFace(f, L, amb, dif, dusk);

    // overlays: steam, fireflies, bay hit points
    overlay(now, dusk);
    frameCount++;
    hud();
  }

  function pt(p) { const v = view(p); return v[2] < NEAR ? null : [Wpx / 2 + F * v[0] / v[2], Hpx / 2 - F * v[1] / v[2], v[2]]; }

  function overlay(now, dusk) {
    const live = anim();
    for (const fl of flues) for (let i = 0; i < 5; i++) {
      const t = live ? ((now / 3000) + i / 5) % 1 : i / 5;
      const s = pt([fl[0] + Math.sin(t * 7 + i) * 0.25, fl[1] + t * 2.4, fl[2]]);
      if (!s) continue;
      ctx.globalAlpha = 0.35 * (1 - t);
      ctx.fillStyle = "#e8e6df";
      ctx.beginPath(); ctx.arc(s[0], s[1], (0.12 + t * 0.5) * F / s[2], 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (dusk) {
      const r = rng(42);
      for (let i = 0; i < 16; i++) {
        const a = r() * TAU, d = scene.rad * (0.4 + r() * 0.8), ph = r() * TAU;
        const t = live ? now / 1000 : 0;
        const s = pt([scene.cx + Math.cos(a + t * 0.05) * d, 0.6 + Math.sin(t * 0.9 + ph) * 0.6 + r() * 1.5, scene.cz + Math.sin(a + t * 0.05) * d]);
        if (!s) continue;
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + ph));
        ctx.fillStyle = C.led;
        ctx.beginPath(); ctx.arc(s[0], s[1], 1.6 * dpr, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    for (const b of bayPts) { const s = pt(b.p); b.sx = s ? s[0] : -1e9; b.sy = s ? s[1] : -1e9; }
  }

  /* ── animation loop ────────────────────────────────────────────────── */
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  function still() { return reduced.matches || document.documentElement.classList.contains("calm"); }
  function anim() { return !still(); }
  let raf = 0, last = 0, dirty = true, dragging = false, onScreen = true, hudEl = null;

  function tick(now) {
    raf = 0;
    const live = anim() && !document.hidden && onScreen;
    if (live && cam.auto && !dragging) { cam.yaw += Math.min(now - last, 100) * 0.00012; dirty = true; }
    if (live && (flues.length || masts.length || state.light === "dusk")) dirty = true;
    if (now - last >= 41 && dirty && onScreen) { last = now; dirty = false; render(now); }
    if (live || dirty) raf = requestAnimationFrame(tick);
  }
  function kick() { dirty = true; if (!raf) raf = requestAnimationFrame(tick); }

  /* ── sizing ────────────────────────────────────────────────────────── */
  function size() {
    const r = cv.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, scene.detail === 2 ? 1.5 : 1.25);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    Wpx = cv.width; Hpx = cv.height;
    kick();
  }

  /* ── UI ────────────────────────────────────────────────────────────── */
  const NAMES = {};
  for (const k of ["layouts", "exteriors", "grades", "modules", "lights"]) for (const m of ARCH[k]) NAMES[m.id] = m.name;
  const BLURB = {};
  for (const k of ["layouts", "exteriors", "grades", "modules"]) for (const m of ARCH[k]) BLURB[m.id] = m.blurb;

  function hud() {
    const h = hudEl || (hudEl = $("arch-hud"));
    if (h) h.textContent = "Y " + String(Math.round(((cam.yaw * 180 / Math.PI) % 360 + 360) % 360)).padStart(3, "0") + "° · P " + Math.round(cam.pitch * 180 / Math.PI) + "° · ×" + cam.zoom.toFixed(2) + " · " + faceCount + " F";
  }

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  function buildBays() {
    const us = $("arch-unit"), bays = $("arch-bays");
    if (!us || !bays) return;
    us.textContent = "";
    for (const u of scene.units) {
      if (!u.edit) continue;
      const o = el("option", null, u.name + " · " + (u.len > 7 ? "8" : "4") + " BAYS");
      o.value = u.id;
      if (u.id === state.unit) o.selected = true;
      us.appendChild(o);
    }
    const u = scene.units.find(x => x.id === state.unit);
    bays.textContent = "";
    u.bays.forEach((m, i) => {
      const lab = el("label", "arch-bay" + (state.sel && state.sel.u === u.id && state.sel.i === i ? " sel" : ""));
      lab.appendChild(el("span", "k", "BAY " + (i + 1)));
      const s = el("select");
      s.dataset.bay = i;
      for (const id of MODS) {
        const o = el("option", null, NAMES[id]);
        o.value = id;
        if (id === m) o.selected = true;
        s.appendChild(o);
      }
      s.addEventListener("change", () => { u.bays[i] = s.value; state.sel = { u: u.id, i }; changed(); });
      s.addEventListener("focus", () => { if (!state.sel || state.sel.u !== u.id || state.sel.i !== i) { state.sel = { u: u.id, i }; changed(); } });
      lab.appendChild(s);
      bays.appendChild(lab);
    });
  }

  function spec() {
    const us = scene.units, n = us.length, levels = us.reduce((a, u) => Math.max(a, u.level + 1), 0);
    const area = us.reduce((a, u) => a + u.len * W, 0), bays = us.reduce((a, u) => a + u.bays.length, 0);
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const u of us) {
      setCur(u.x, u.y, u.z, u.r);
      for (const p of [[0, 0, 0], [u.len, 0, W]]) { const w = xf(p); x0 = Math.min(x0, w[0]); x1 = Math.max(x1, w[0]); z0 = Math.min(z0, w[2]); z1 = Math.max(z1, w[2]); }
    }
    const rows = [
      ["UNITS", n + " × ISO high-cube (" + us.filter(u => u.len > 7).length + " × 40', " + us.filter(u => u.len < 7).length + " × 20') · " + levels + (levels > 1 ? " levels" : " level") + " · " + (levels * H).toFixed(1) + " m tall"],
      ["PLAN", (x1 - x0).toFixed(1) + " × " + (z1 - z0).toFixed(1) + " m footprint · " + area.toFixed(0) + " m² gross floor · " + bays + " bays"],
      ["SHELL", NAMES[state.ext] + " — " + BLURB[state.ext]],
      ["GRADE", NAMES[state.grade] + " — " + BLURB[state.grade]],
      ["LAYOUT", NAMES[state.layout] + " — " + BLURB[state.layout]]
    ];
    const sp = $("arch-spec");
    if (sp) {
      sp.textContent = "";
      for (const r of rows) { const li = el("li"); li.appendChild(el("span", "k", r[0])); li.appendChild(el("span", "v", r[1])); sp.appendChild(li); }
    }
    const man = $("arch-manifest");
    if (man) {
      const lines = ["# manifest · " + NAMES[state.layout].toLowerCase() + " · " + NAMES[state.ext].toLowerCase() + " · " + NAMES[state.grade].toLowerCase()];
      for (const u of us) {
        if (!u.edit) continue;
        lines.push(u.name.padEnd(14) + u.bays.map((m, i) => (i + 1) + ":" + NAMES[m].toLowerCase()).join("  "));
      }
      const fill = us.filter(u => !u.edit).length;
      if (fill) lines.push("+ " + fill + " further units, fitted to the same pattern (not shown in cutaway)");
      const sig = [];
      for (const u of us) if (u.edit) for (const m of u.bays) {
        if (m === "stove" && sig.indexOf("copper flue") < 0) sig.push("copper flue");
        if (m === "comms" && sig.indexOf("antenna mast") < 0) sig.push("antenna mast");
        if (m === "farm" && sig.indexOf("roof light") < 0) sig.push("roof light");
        if (m === "head" && sig.indexOf("roof vent") < 0) sig.push("roof vent");
      }
      lines.push("exterior: solar rack · rain barrel · turbine mast" + (sig.length ? " · " + sig.join(" · ") : ""));
      man.textContent = lines.join("\n");
    }
    const cap = $("arch-cap");
    const capText = NAMES[state.layout] + " · " + NAMES[state.ext] + " · " + NAMES[state.grade] + " · " + NAMES[state.light] + " · " + (state.view === "cut" ? "CUTAWAY" : "EXTERIOR");
    if (cap) cap.textContent = capText;
    cv.setAttribute("aria-label", "3D render: " + capText.toLowerCase() + ". " + (man ? man.textContent.replace(/\n/g, ". ") : ""));
  }

  function hash() {
    const p = new URLSearchParams();
    p.set("l", state.layout); p.set("x", state.ext); p.set("g", state.grade); p.set("t", state.light); p.set("v", state.view);
    for (const u of scene.units) if (u.edit) p.set(u.id, u.bays.join(","));
    history.replaceState(null, "", "#" + p.toString());
  }

  function readHash() {
    if (!location.hash || location.hash.length < 3) return;
    const p = new URLSearchParams(location.hash.slice(1));
    const pick = (k, list, cur2) => { const v = p.get(k); return v && list.some(m => m.id === v) ? v : cur2; };
    state.layout = pick("l", ARCH.layouts, state.layout);
    state.ext = pick("x", ARCH.exteriors, state.ext);
    state.grade = pick("g", ARCH.grades, state.grade);
    state.light = pick("t", ARCH.lights, state.light);
    if (p.get("v") === "ext" || p.get("v") === "cut") state.view = p.get("v");
    const lay = layoutUnits(state.layout), L = state.bays[state.layout] = {};
    for (const u of lay.units) {
      const v = p.get(u.id);
      if (!v) continue;
      const arr = v.split(",").map(m => MODS.indexOf(m) >= 0 ? m : "open");
      if (arr.length === (u.len > 7 ? 8 : 4)) L[u.id] = arr;
    }
  }

  function syncForm() {
    const form = $("arch-form");
    if (!form) return;
    for (const k of ["layout", "ext", "grade", "light", "view"]) {
      const r = form.querySelector('input[name="' + k + '"][value="' + state[k] + '"]');
      if (r) r.checked = true;
    }
  }

  function changed(rebuild) {
    if (rebuild !== false) build();
    buildBays();
    spec();
    hash();
    kick();
  }

  function applyPreset(id) {
    const p = ARCH.presets.find(x => x.id === id);
    if (!p) return;
    state.layout = p.layout; state.ext = p.ext; state.grade = p.grade; state.light = p.light; state.view = "cut";
    const lay = layoutUnits(p.layout), L = state.bays[p.layout] = {};
    const pu = lay.units.find(u => u.primary) || lay.units[0];
    const n = pu.len > 7 ? 8 : 4, arr = [];
    for (let i = 0; i < n; i++) arr.push(p.bays[i % p.bays.length]);
    L[pu.id] = arr;
    state.unit = pu.id; state.sel = null;
    syncForm();
    changed();
  }

  function wire() {
    const form = $("arch-form");
    form.addEventListener("change", e => {
      const t = e.target;
      if (t.name && t.type === "radio" && t.name in state) { state[t.name] = t.value; if (t.name === "layout") state.sel = null; changed(); }
    });
    form.addEventListener("submit", e => e.preventDefault());
    $("arch-unit").addEventListener("change", e => { state.unit = e.target.value; state.sel = null; buildBays(); kick(); });
    document.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => applyPreset(b.dataset.preset)));
    document.querySelectorAll("[data-layout]").forEach(b => b.addEventListener("click", () => {
      state.layout = b.dataset.layout; state.sel = null; syncForm(); changed();
      $("arch-cv").scrollIntoView({ behavior: still() ? "auto" : "smooth", block: "center" });
    }));

    // camera controls
    const btn = (id, fn) => { const b = $(id); if (b) b.addEventListener("click", fn); };
    btn("arch-auto", () => { cam.auto = !cam.auto; $("arch-auto").setAttribute("aria-pressed", String(cam.auto)); kick(); });
    btn("arch-zin", () => { cam.zoom = Math.max(0.45, cam.zoom / 1.2); kick(); });
    btn("arch-zout", () => { cam.zoom = Math.min(2.6, cam.zoom * 1.2); kick(); });
    btn("arch-reset", () => { cam.yaw = 0.85; cam.pitch = 0.55; cam.zoom = 1; kick(); });

    let px = 0, py = 0, moved = 0;
    cv.addEventListener("pointerdown", e => {
      dragging = true; moved = 0; px = e.clientX; py = e.clientY;
      cv.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    cv.addEventListener("pointermove", e => {
      if (!dragging) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      moved += Math.abs(dx) + Math.abs(dy);
      px = e.clientX; py = e.clientY;
      cam.yaw += dx * 0.008;
      cam.pitch = Math.max(0.12, Math.min(1.35, cam.pitch + dy * 0.006));
      kick();
    });
    const up = e => {
      if (!dragging) return;
      dragging = false;
      if (moved < 6) pickBay(e);
      kick();
    };
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", e => {
      e.preventDefault();
      cam.zoom = Math.max(0.45, Math.min(2.6, cam.zoom * (e.deltaY > 0 ? 1.12 : 1 / 1.12)));
      kick();
    }, { passive: false });
    cv.addEventListener("keydown", e => {
      const k = e.key;
      if (k === "ArrowLeft") cam.yaw -= 0.12; else if (k === "ArrowRight") cam.yaw += 0.12;
      else if (k === "ArrowUp") cam.pitch = Math.min(1.35, cam.pitch + 0.08); else if (k === "ArrowDown") cam.pitch = Math.max(0.12, cam.pitch - 0.08);
      else if (k === "+" || k === "=") cam.zoom = Math.max(0.45, cam.zoom / 1.15); else if (k === "-" || k === "_") cam.zoom = Math.min(2.6, cam.zoom * 1.15);
      else return;
      e.preventDefault();
      kick();
    });
    addEventListener("resize", size);
    if ("IntersectionObserver" in window)
      new IntersectionObserver(es => { for (const e of es) onScreen = e.isIntersecting; kick(); }, { rootMargin: "80px" }).observe(cv);
    document.addEventListener("visibilitychange", kick);
    new MutationObserver(kick).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    if (reduced.addEventListener) reduced.addEventListener("change", kick);
    addEventListener("hashchange", () => { readHash(); state.sel = null; syncForm(); build(); buildBays(); spec(); size(); kick(); });
  }

  function pickBay(e) {
    if (state.view !== "cut" || !bayPts.length) return;
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr;
    let best = null, bd = (70 * dpr) * (70 * dpr);
    for (const b of bayPts) {
      const d = (b.sx - x) * (b.sx - x) + (b.sy - y) * (b.sy - y);
      if (d < bd) { bd = d; best = b; }
    }
    if (!best) return;
    state.sel = { u: best.u, i: best.i };
    state.unit = best.u;
    changed();
    const s = $("arch-bays").querySelector('select[data-bay="' + best.i + '"]');
    if (s) s.focus({ preventScroll: true });
  }

  function init() {
    cv = $("arch-cv");
    if (!cv) return;
    ctx = cv.getContext("2d");
    cv.hidden = false;
    document.documentElement.classList.add("arch-js");
    readHash();
    syncForm();
    wire();
    build();
    buildBays();
    spec();
    size();
    kick();
  }

  return { init };
})();

Arch.init();
