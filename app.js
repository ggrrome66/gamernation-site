"use strict";(()=>{
const SITE = {
org: {
name: "GamerNation Inc.",
tag: "drones · websites · ground-control software",
jurisdiction: "Federal corporation, Canada",
email: "TODO:LUKAS",
domain: "gamernation.ca",
node: "rpi"
},
hero: {
boot: "> we build the drone, the software, and the page you found this on."
},
banner: [
"╔═╗ ╔═╗ ╔╦╗ ╔═╗ ╦═╗ ╔╗╔ ╔═╗ ╔╦╗ ╦ ╔═╗ ╔╗╔",
"║ ╦ ╠═╣ ║║║ ║╣  ╠╦╝ ║║║ ╠═╣  ║  ║ ║ ║ ║║║",
"╚═╝ ╩ ╩ ╩ ╩ ╚═╝ ╩╚═ ╝╚╝ ╩ ╩  ╩  ╩ ╚═╝ ╝╚╝",
"                                     INC."
],
modules: [
{
id: "air", num: "01", chan: "AIR", model: "quad",
title: "Drones & drone services",
lede: "Purpose-built small UAS — designed, built, flown, and taught, end to end.",
rows: [
{ k: "BUILD", v: "Airframe design, fabrication, integration, and bring-up of purpose-built small UAS." },
{ k: "FLY", v: "Survey and inspection flights flown to a plan, with data delivered — not just imagery dumped." },
{ k: "TRAIN", v: "Three tiers — Basic, Advanced, and Complex — the last built around a 4-inch, single-cell (1S) recon platform for emergency services. Certification and flight-review wording: TODO:LUKAS." }
],
alt: "Rotating isometric render of a four-arm quadcopter drone",
fallback: "[ MODEL: QUAD — 4-arm multirotor schematic. Enable JS to see it rotate. ]"
},
{
id: "net", num: "02", chan: "NET", model: "crt",
title: "Websites & social for small businesses",
lede: "Hand-built sites that load on bad rural connections and cheap phones — this very page is the demo, running on a single-board computer.",
rows: [
{ k: "SITES", v: "Small, fast, hand-built pages. No bloated themes, no third-party trackers, no surprise invoices for plugins." },
{ k: "SOCIAL", v: "Ongoing social updates handled on a schedule, so a small operator isn't drafting posts at 11pm." },
{ k: "HOST", v: "Set up to run cheap and keep running — the same way this site runs on a Raspberry Pi." }
],
alt: "Rotating isometric render of a CRT monitor and keyboard",
fallback: "[ MODEL: CRT — terminal workstation schematic. Enable JS to see it rotate. ]"
},
{
id: "ctrl", num: "03", chan: "CTRL", model: "rack",
title: "Custom drone software",
lede: "Ground-station and fleet-management software written to fit an operator's actual workflow — not someone else's dashboard.",
rows: [
{ k: "PLAN", v: "Mission planning built around how your crews actually fly." },
{ k: "WATCH", v: "Live asset monitoring and telemetry capture at the ground station." },
{ k: "KEEP", v: "Post-flight data handling — capture, organize, and hand back the record that matters." }
],
alt: "Rotating isometric render of a ground-station case with antenna mast",
fallback: "[ MODEL: RACK — ground-station schematic. Enable JS to see it rotate. ]"
}
]
};
const Iso = (() => {
const C30 = Math.cos(Math.PI / 6);
const S30 = 0.5;
const REV = (2 * Math.PI) / 14000;        // one revolution per ~14s
const FILL = ["#07240f", "#124f23", "#1b7f38", "#27b04f"]; // 4 flat shades
const PHOS = "#39ff6a", MAG = "#ff3ca0", CYN = "#22d3ee", EDGE = "#0a2f16";
const ORN = "#ffb000";                     // portal-orange accent (amber)
const TAU = 2 * Math.PI;
function M() { return { v: [], e: [], f: [] }; }
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
box(m, 0, 0, 0, 1.1, 0.42, 1.1, 2);      // fuselage
box(m, 0, 0.32, 0, 0.55, 0.24, 0.55, 1); // stack
box(m, 0, 0.0, 0.72, 0.34, 0.2, 0.3, 3); // front camera pod
box(m, 1.5, 0, 0, 1.5, 0.14, 0.18, 1);   // arms (+ frame)
box(m, -1.5, 0, 0, 1.5, 0.14, 0.18, 1);
box(m, 0, 0, 1.5, 0.18, 0.14, 1.5, 1);
box(m, 0, 0, -1.5, 0.18, 0.14, 1.5, 1);
box(m, 0.85, -0.34, 0, 0.12, 0.3, 1.7, 1); // landing skids
box(m, -0.85, -0.34, 0, 0.12, 0.3, 1.7, 1);
[[2.1, 0], [-2.1, 0], [0, 2.1], [0, -2.1]].forEach(p =>
box(m, p[0], 0.16, p[1], 0.3, 0.3, 0.3, 3));  // motors
m.core = [0, 0.5, 0];
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
const MODELS = { quad, crt, rack };
const units = [];
let raf = 0, last = 0;
function project(v, rot) {
const c = Math.cos(rot), s = Math.sin(rot);
const x = v[0] * c + v[2] * s;
const z = -v[0] * s + v[2] * c;
return [(x - z) * C30, (x + z) * S30 - v[1], x + z];
}
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
function core(ctx, u, now, put) {
if (!u.model.core) return;
const c = put(u.model.core);
dot(ctx, c[0], c[1], 2.4 + (Math.sin(now / 500) * 0.5 + 0.5) * 2.6, ORN, 12);
}
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
const FX = { quad: fxQuad, crt: fxCrt, rack: fxRack };
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
strokeEdges(ctx, u, P, ox - 1, oy, MAG, 0.6);
strokeEdges(ctx, u, P, ox + 1, oy, CYN, 0.6);
strokeEdges(ctx, u, P, ox, oy, PHOS, 1);
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
const Rain = (() => {
const GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const COL_W = 14, FPS = 50;               // 50ms ≈ 20 fps cap
let cv = null, ctx = null, drops = [], cols = 0, raf = 0, last = 0;
function resize() {
const hero = cv.parentElement;
cv.width = hero.clientWidth;
cv.height = hero.clientHeight;
cols = Math.min(Math.floor(cv.width / COL_W), 60);
drops = Array.from({ length: cols }, () => Math.random() * -40);
ctx.fillStyle = "#05070A";
ctx.fillRect(0, 0, cv.width, cv.height);
}
function tick(now) {
raf = requestAnimationFrame(tick);
if (now - last < FPS) return;
last = now;
ctx.fillStyle = "rgba(5,7,10,0.12)";    // trail fade
ctx.fillRect(0, 0, cv.width, cv.height);
ctx.font = "12px monospace";
for (let i = 0; i < cols; i++) {
const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
ctx.fillStyle = Math.random() < 0.06 ? "#39ff6a" : "#1b7f38";
ctx.fillText(ch, i * COL_W, drops[i] * 14);
drops[i] = drops[i] * 14 > cv.height && Math.random() > 0.97 ? 0 : drops[i] + 1;
}
}
function allowed() {
return !GN.still() && innerWidth >= 380 && !document.hidden;
}
function refresh() {
if (!cv) return;
if (allowed() && !raf) {
last = 0;
raf = requestAnimationFrame(tick);
} else if (!allowed() && raf) {
cancelAnimationFrame(raf);
raf = 0;
ctx.clearRect(0, 0, cv.width, cv.height);
}
}
function init() {
const hero = document.querySelector(".hero");
if (!hero) return;
cv = document.createElement("canvas");
cv.className = "rain";
cv.setAttribute("aria-hidden", "true");
ctx = cv.getContext("2d");
hero.prepend(cv);
resize();
addEventListener("resize", () => { resize(); refresh(); });
document.addEventListener("visibilitychange", refresh);
refresh();
}
return { init, refresh };
})();
const Term = (() => {
let el = null, out = null, input = null, ps1 = null;
let open = false, scrollPos = 0, hist = [], hi = 0, cwd = null, lastFocus = null;
const MODS = () => SITE.modules.map(m => m.id);
function print(text, cls) {
const d = document.createElement("div");
if (cls) d.className = cls;
d.textContent = text;
out.appendChild(d);
out.scrollTop = out.scrollHeight;
}
function prompt() {
return "gn@" + SITE.org.node + ":~" + (cwd ? "/" + cwd : "") + "$";
}
function findMod(id) {
return SITE.modules.find(m => m.id === id);
}
function catMod(m) {
print("MOD." + m.num + " · " + m.chan + " — " + m.title, "t-amber");
print(m.lede, "t-paper");
m.rows.forEach(r => print("  " + r.k.padEnd(7) + " " + r.v));
print("");
}
const CMDS = {
help() {
print("commands:", "t-amber");
[["help", "list commands"],
["ls", "list modules"],
["cd <mod>", "select module (air | net | ctrl)"],
["cat <mod>", "print module in full"],
["whoami", "org identity block"],
["contact", "email + how to reach"],
["banner", "ASCII wordmark"],
["clear", "clear screen"],
["exit", "return to graphical site"]]
.forEach(c => print("  " + c[0].padEnd(11) + " " + c[1]));
},
ls() {
SITE.modules.forEach(m =>
print("  " + m.id.padEnd(6) + "MOD." + m.num + " · " + m.chan + " — " + m.title));
},
cd(arg) {
if (!arg || arg === "~" || arg === "/" || arg === "..") { cwd = null; ps1.textContent = prompt(); return; }
const m = findMod(arg);
if (!m) { print("gn: no such module: " + arg + "  (try 'ls')", "t-err"); return; }
cwd = m.id;
ps1.textContent = prompt();
},
cat(arg) {
const id = arg || cwd;
if (!id) { print("gn: cat needs a module: cat air | net | ctrl", "t-err"); return; }
const m = findMod(id);
if (!m) { print("gn: no such module: " + id + "  (try 'ls')", "t-err"); return; }
catMod(m);
},
whoami() {
print(SITE.org.name, "t-amber");
print("  " + SITE.org.tag);
print("  " + SITE.org.jurisdiction);
print("  node: " + SITE.org.node + " · " + SITE.org.domain);
},
contact() {
print("  email : " + GN.email(), GN.email().indexOf("TODO") === 0 ? "t-err" : "t-paper");
print("  web   : https://" + SITE.org.domain);
print("  cli   : curl " + SITE.org.domain);
},
banner() {
SITE.banner.forEach(l => print(l, "t-amber"));
print("");
},
clear() { out.textContent = ""; },
exit() { close(); }
};
function run(line) {
const t = line.trim();
print(prompt() + " " + t, "t-dim");
if (!t) return;
hist.push(t);
hi = hist.length;
const sp = t.indexOf(" ");
const cmd = sp < 0 ? t : t.slice(0, sp);
const arg = sp < 0 ? "" : t.slice(sp + 1).trim();
if (CMDS[cmd]) CMDS[cmd](arg);
else print("gn: command not found: " + cmd + "  (try 'help')", "t-err");
}
function complete(v) {
const words = v.split(" ");
const w = words[words.length - 1];
if (!w) return v;
const pool = words.length === 1 ? Object.keys(CMDS).concat(MODS()) : MODS();
const hits = pool.filter(x => x.indexOf(w) === 0);
if (hits.length === 1) {
words[words.length - 1] = hits[0];
return words.join(" ") + (words.length === 1 ? " " : "");
}
if (hits.length > 1) print(hits.join("  "), "t-dim");
return v;
}
function key(e) {
if (e.key === "Enter") {
e.preventDefault();
run(input.value);
input.value = "";
} else if (e.key === "ArrowUp") {
e.preventDefault();
if (hi > 0) input.value = hist[--hi] || "";
} else if (e.key === "ArrowDown") {
e.preventDefault();
input.value = hi < hist.length - 1 ? hist[++hi] : ((hi = hist.length), "");
} else if (e.key === "Tab") {
e.preventDefault();
input.value = complete(input.value);
} else if (e.key === "Escape") {
close();
}
}
function build() {
el = document.createElement("div");
el.className = "term";
el.hidden = true;
el.setAttribute("role", "dialog");
el.setAttribute("aria-label", "terminal");
out = document.createElement("div");
out.className = "term-out";
out.setAttribute("role", "log");
out.setAttribute("aria-live", "polite");
const quick = document.createElement("div");
quick.className = "term-quick";
[["ls", "ls"], ["air", "cat air"], ["net", "cat net"], ["ctrl", "cat ctrl"], ["exit", "exit"]]
.forEach(b => {
const btn = document.createElement("button");
btn.textContent = b[0];
btn.addEventListener("click", () => { run(b[1]); input.focus(); });
quick.appendChild(btn);
});
const row = document.createElement("div");
row.className = "term-in-row";
ps1 = document.createElement("span");
ps1.className = "term-ps1";
ps1.setAttribute("aria-hidden", "true");
ps1.textContent = prompt();
input = document.createElement("input");
input.className = "term-in";
input.type = "text";
input.autocapitalize = "off";
input.autocomplete = "off";
input.spellcheck = false;
input.setAttribute("aria-label", "terminal command input");
input.addEventListener("keydown", key);
row.append(ps1, input);
el.append(out, quick, row);
el.addEventListener("click", e => { if (e.target === el || e.target === out) input.focus(); });
document.body.appendChild(el);
}
function openTerm() {
if (open) return;
if (!el) build();
open = true;
scrollPos = scrollY;
lastFocus = document.activeElement;
el.hidden = false;
document.body.classList.add("term-open");
if (!out.childNodes.length) {
CMDS.banner();
print(SITE.org.tag, "t-dim");
print("type 'help' to get started.", "t-dim");
}
input.focus();
}
function close() {
if (!open) return;
open = false;
el.hidden = true;
document.body.classList.remove("term-open");
scrollTo(0, scrollPos);                  // exit restores scroll position
if (lastFocus && lastFocus.focus) lastFocus.focus();
if (location.hash === "#term") history.replaceState(null, "", location.pathname === "/term" ? "/" : location.pathname);
if (location.pathname === "/term") history.replaceState(null, "", "/");
}
function toggle() { open ? close() : openTerm(); }
return { open: openTerm, close, toggle, isOpen: () => open };
})();
const GN = {
calm: false,
reduced: matchMedia("(prefers-reduced-motion: reduce)"),
still() { return GN.calm || GN.reduced.matches; },
email() {
const e = SITE.org.email;
if (e.indexOf("@") < 0) return e;        // still TODO:LUKAS
const p = e.split("@");
return [p[0], p[1]].join("@");
}
};
(() => {
try { GN.calm = localStorage.getItem("gn-calm") === "1"; } catch (e) {  }
const root = document.documentElement;
if (GN.calm) root.classList.add("calm");
function refreshMotion() {
Iso.refresh();
Rain.refresh();
}
const calmBtn = document.getElementById("btn-calm");
calmBtn.hidden = false;
calmBtn.setAttribute("aria-pressed", String(GN.calm));
calmBtn.textContent = GN.calm ? "▯" : "▮";
calmBtn.addEventListener("click", () => {
GN.calm = !GN.calm;
root.classList.toggle("calm", GN.calm);
calmBtn.setAttribute("aria-pressed", String(GN.calm));
calmBtn.textContent = GN.calm ? "▯" : "▮";
try { localStorage.setItem("gn-calm", GN.calm ? "1" : "0"); } catch (e) {  }
refreshMotion();
});
if (GN.reduced.addEventListener) GN.reduced.addEventListener("change", refreshMotion);
["btn-term", "btn-term2"].forEach(id => {
const b = document.getElementById(id);
b.hidden = false;
b.addEventListener("click", () => {
Term.toggle();
if (id === "btn-term") b.setAttribute("aria-pressed", String(Term.isOpen()));
});
});
document.addEventListener("keydown", e => {
if ((e.key === "`" || e.key === "~") && !e.ctrlKey && !e.metaKey && !e.altKey) {
const t = e.target;
const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA") && !Term.isOpen();
if (typing) return;
e.preventDefault();
Term.toggle();
}
});
if (location.pathname === "/term" || location.hash === "#term") Term.open();
const typed = document.getElementById("typed");
if (typed && !GN.still()) {
const full = typed.textContent;
typed.setAttribute("aria-label", full);
typed.textContent = "";
let i = 0;
const step = () => {
typed.textContent = full.slice(0, ++i);
if (i < full.length) setTimeout(step, 24 + Math.random() * 40);
else typed.removeAttribute("aria-label");
};
setTimeout(step, 350);
}
const tls = document.getElementById("tls");
if (tls) tls.textContent = location.protocol === "https:" ? "OK" : "OFF";
const up = document.getElementById("up");
if (up) {
const t0 = Date.now();
const fmt = () => {
const s = Math.floor((Date.now() - t0) / 1000);
const m = String(Math.floor(s / 60)).padStart(2, "0");
return m + ":" + String(s % 60).padStart(2, "0");
};
up.textContent = fmt();
setInterval(() => { up.textContent = fmt(); }, 1000);
}
Iso.init();
requestAnimationFrame(() => setTimeout(() => Rain.init(), 0));
})();
})();
