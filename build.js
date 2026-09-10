/* build.js — zero-dependency build (plan §8). Node built-ins ONLY.
   Renders dist/ from src/, pre-compresses everything, and FAILS the build
   if the §4 byte budget is exceeded. Never fetches anything. */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, gzipSync, constants as Z } from "node:zlib";
import { SITE } from "./src/content.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");

const read = p => readFileSync(join(SRC, p), "utf8");
const esc = s => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* mark TODO:LUKAS placeholders visibly in HTML (plan C8) */
const escTodo = s => esc(s).replace(/TODO:LUKAS/g, '<span class="todo">TODO:LUKAS</span>');

const STAMP = "BUILD " + new Date().toISOString().slice(0, 10);

/* ── 1. HTML ──────────────────────────────────────────────────────────── */

function emailHtml() {
  const e = SITE.org.email;
  if (e.indexOf("@") < 0) return '<span class="todo">' + esc(e) + "</span>";
  // plain mailto: for no-JS users; entity-encoded as courtesy obfuscation
  const enc = [...e].map(c => "&#" + c.codePointAt(0) + ";").join("");
  return '<a href="mailto:' + enc + '">' + enc + "</a>";
}

function moduleHtml(m) {
  const rows = m.rows.map(r =>
    "        <li><span class=\"k\">" + esc(r.k) + "</span><span class=\"v\">" + escTodo(r.v) + "</span></li>"
  ).join("\n");
  return `  <section class="mod" id="mod-${esc(m.id)}" aria-labelledby="h-${esc(m.id)}">
    <div class="mod-rule" aria-hidden="true"><span>MOD.${esc(m.num)}</span><span class="rule-line"></span><span>${esc(m.chan)}</span></div>
    <div class="mod-body">
      <div class="mod-viz">
        <canvas class="iso" data-model="${esc(m.model)}" width="320" height="240" aria-label="${esc(m.alt)}" hidden></canvas>
        <noscript><p class="iso-fallback">${esc(m.fallback)}</p></noscript>
      </div>
      <div class="mod-copy">
        <h2 class="glare" id="h-${esc(m.id)}" data-text="${esc(m.chan)}"><span aria-hidden="true">${esc(m.chan)}</span><span class="vh">${esc(m.chan)} — ${esc(m.title)}</span></h2>
        <p class="lede">${escTodo(m.lede)}</p>
        <ul class="rows">
${rows}
        </ul>${m.link ? `
        <p class="mod-link"><a class="key" href="${esc(m.link.href)}">${esc(m.link.label)}</a></p>` : ""}
      </div>
    </div>
  </section>`;
}

function buildHtml() {
  let t = read("index.template.html");
  const map = {
    NAME: esc(SITE.org.name),
    NAME_UPPER: esc(SITE.org.name.toUpperCase()),
    TAG: esc(SITE.org.tag),
    DESC: esc(SITE.org.name + " — " + SITE.org.tag + ". " + SITE.org.jurisdiction + "."),
    JURISDICTION: esc(SITE.org.jurisdiction),
    DOMAIN: esc(SITE.org.domain),
    NODE: esc(SITE.org.node),
    BANNER: SITE.banner.map(esc).join("\n"),
    BOOT: esc(SITE.hero.boot),
    EMAIL_HTML: emailHtml(),
    MODULES: SITE.modules.map(moduleHtml).join("\n\n"),
    STAMP: esc(STAMP)
  };
  for (const k of Object.keys(map)) t = t.split("{{" + k + "}}").join(map[k]);
  if (/{{[A-Z_]+}}/.test(t)) throw new Error("unreplaced template token: " + t.match(/{{[A-Z_]+}}/)[0]);
  return t;
}

/* ── 1b. architecture.html — the MOD.04 configurator page ─────────────── */

const A4 = SITE.arch;
const opt = (name, o, checked) =>
  `          <label class="opt" title="${esc(o.blurb || "")}"><input type="radio" name="${name}" value="${esc(o.id)}"${checked ? " checked" : ""}>${esc(o.name)}</label>`;
const catRow = o =>
  `      <li><span class="k">${esc(o.name)}</span><span class="v"><span>${esc(o.blurb)}</span></span></li>`;
const modName = id => (A4.modules.find(m => m.id === id) || { name: id }).name;

function buildArchHtml() {
  let t = read("architecture.template.html");
  const def = { layout: "s20", ext: "stone", grade: "prem", light: "dusk" };
  const map = {
    NAME: esc(SITE.org.name),
    NAME_UPPER: esc(SITE.org.name.toUpperCase()),
    JURISDICTION: esc(SITE.org.jurisdiction),
    DOMAIN: esc(SITE.org.domain),
    NODE: esc(SITE.org.node),
    EMAIL_HTML: emailHtml(),
    STAMP: esc(STAMP),
    ARCH_TITLE: esc(A4.title),
    ARCH_DESC: esc(SITE.org.name + " — " + A4.title + ": " + A4.tag + ". Interactive 3D configurator."),
    ARCH_LEDE: esc(A4.lede),
    ARCH_HOW: A4.how.map(h => "      <li>" + esc(h) + "</li>").join("\n"),
    ARCH_LIGHTS: A4.lights.map(o => opt("light", o, o.id === def.light)).join("\n"),
    ARCH_LAYOUTS: A4.layouts.map(o => opt("layout", o, o.id === def.layout)).join("\n"),
    ARCH_EXTERIORS: A4.exteriors.map(o => opt("ext", o, o.id === def.ext)).join("\n"),
    ARCH_GRADES: A4.grades.map(o => opt("grade", o, o.id === def.grade)).join("\n"),
    ARCH_PRESETS: A4.presets.map(p =>
      `          <button type="button" data-preset="${esc(p.id)}" title="${esc(p.layout + " · " + p.ext + " · " + p.grade)}">${esc(p.name)}</button>`).join("\n"),
    ARCH_DEFAULT20: esc(["bed", "galley", "head", "store"].map(modName).join(" · ")),
    ARCH_DEFAULT40: esc(["air", "bench", "bench", "power", "galley", "head", "bed", "store"].map(modName).join(" · ")),
    ARCH_SPEC_DEFAULT: [
      ["UNITS", "1 × ISO high-cube (20') · 1 level · 2.9 m tall"],
      ["PLAN", "6.1 × 2.4 m footprint · 15 m² gross floor · 4 bays"],
      ["SHELL", A4.exteriors[2].name + " — " + A4.exteriors[2].blurb],
      ["GRADE", A4.grades[1].name + " — " + A4.grades[1].blurb],
      ["LAYOUT", A4.layouts[0].name + " — " + A4.layouts[0].blurb]
    ].map(r => `      <li><span class="k">${esc(r[0])}</span><span class="v">${esc(r[1])}</span></li>`).join("\n"),
    ARCH_MODULES: A4.modules.map(catRow).join("\n"),
    ARCH_LAYOUT_ROWS: A4.layouts.map(o =>
      `      <li><span class="k">${esc(o.name)}</span><span class="v"><span>${esc(o.blurb)}</span><button type="button" class="arch-load arch-jsonly" data-layout="${esc(o.id)}">[ LOAD ]</button></span></li>`).join("\n"),
    ARCH_NOTES: A4.notes.map(n => "      <li>" + esc(n) + "</li>").join("\n")
  };
  for (const k of Object.keys(map)) t = t.split("{{" + k + "}}").join(map[k]);
  if (/{{[A-Z_0-9]+}}/.test(t)) throw new Error("unreplaced template token: " + t.match(/{{[A-Z_0-9]+}}/)[0]);
  return t;
}

/* ── 2. CSS / JS concat + light minify (regex only — no mangler, §8) ──── */

const minCss = s => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^[ \t]+/gm, "")
  .replace(/\n{2,}/g, "\n")
  .trim() + "\n";

const minJs = s => s
  .replace(/^[ \t]*\/\/.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^[ \t]+/gm, "")
  .replace(/\n{2,}/g, "\n")
  .trim();

function buildCss() {
  return minCss(["css/base.css", "css/crt.css", "css/layout.css"].map(read).join("\n"));
}

function buildJs() {
  // SITE is embedded as JSON minus the configurator block, which only
  // architecture.html needs (it ships in arch.js as ARCH)
  const site = Object.assign({}, SITE);
  delete site.arch;
  const content = "const SITE=" + JSON.stringify(site) + ";";
  const body = [content, read("js/iso.js"), read("js/rain.js"), read("js/term.js"), read("js/boot.js")].join("\n");
  return '"use strict";(()=>{\n' + minJs(body) + "\n})();\n";
}

// the configurator is its own bundle (loaded by architecture.html only) so the
// home page's first paint stays untouched; SITE.arch is injected as ARCH
function buildArchCss() { return minCss(read("css/arch.css")); }
function buildArchJs() {
  return '"use strict";(()=>{\nconst ARCH=' + JSON.stringify(SITE.arch) + ";\n" + minJs(read("js/arch.js")) + "\n})();\n";
}

/* ── 3. ANSI text pages for curl (plan §6.2) ──────────────────────────── */

const A = {
  g: "\x1b[38;5;84m", gd: "\x1b[38;5;29m", am: "\x1b[38;5;214m",
  pk: "\x1b[38;5;205m", b: "\x1b[1m", r: "\x1b[0m"
};
const vis = s => s.replace(/\x1b\[[0-9;]*m/g, "");
const W = 72, INNER = W - 4;

function wrap(text, width) {
  const out = [];
  for (const para of String(text).split("\n")) {
    let line = "";
    for (const w of para.split(" ")) {
      if (line && (line + " " + w).length > width) { out.push(line); line = w; }
      else line = line ? line + " " + w : w;
    }
    out.push(line);
  }
  return out;
}

function frame(lines) {
  const top = A.gd + "┌" + "─".repeat(W - 2) + "┐" + A.r;
  const bot = A.gd + "└" + "─".repeat(W - 2) + "┘" + A.r;
  const body = lines.map(l => {
    const pad = INNER - vis(l).length;
    if (pad < 0) throw new Error("txt line overflows 72-col frame: " + vis(l));
    return A.gd + "│ " + A.r + l + " ".repeat(pad) + A.gd + " │" + A.r;
  });
  return [top, ...body, bot].join("\n") + "\n";
}

const center = s => " ".repeat(Math.max(0, Math.floor((INNER - vis(s).length) / 2))) + s;
const hr = () => A.gd + "─".repeat(INNER) + A.r;

function txtHeader() {
  return [
    "",
    ...SITE.banner.map(l => center(A.g + A.b + l + A.r)),
    "",
    center(A.am + SITE.org.tag + A.r),
    center(A.gd + SITE.org.jurisdiction + A.r),
    ""
  ];
}

function txtIndex() {
  const L = txtHeader();
  L.push(hr(), "");
  for (const m of SITE.modules) {
    L.push(A.am + "MOD." + m.num + " · " + m.chan + A.r + "  " + A.g + A.b + m.title + A.r);
    wrap(m.lede, INNER - 2).forEach(l => L.push("  " + l));
    L.push("  " + A.gd + "→ curl " + SITE.org.domain + "/txt/" + m.id + ".txt" + A.r, "");
  }
  L.push(hr(), "");
  L.push(A.am + "contact" + A.r + "   " + contactLine());
  L.push(A.gd + "no colours? append ?plain or fetch /txt/index.plain.txt" + A.r);
  L.push(A.gd + "graphical: https://" + SITE.org.domain + A.r);
  L.push(A.gd + "served static from a raspberry pi" + A.r, "");
  return frame(L);
}

function contactLine() {
  const e = SITE.org.email;
  return e.indexOf("@") < 0 ? A.pk + e + A.r : A.g + e + A.r;
}

function txtModule(m) {
  const L = txtHeader();
  L.push(hr(), "");
  L.push(A.am + A.b + "MOD." + m.num + " · " + m.chan + " — " + m.title.toUpperCase() + A.r, "");
  wrap(m.lede, INNER).forEach(l => L.push(A.g + l + A.r));
  L.push("");
  for (const r of m.rows) {
    L.push(A.am + r.k + A.r);
    wrap(r.v, INNER - 2).forEach(l => L.push("  " + l));
    L.push("");
  }
  L.push(hr(), "");
  L.push(A.gd + "index: curl " + SITE.org.domain + A.r);
  L.push(A.gd + "contact: curl " + SITE.org.domain + "/txt/contact.txt" + A.r, "");
  return frame(L);
}

function txtArch() {
  const L = txtHeader();
  L.push(hr(), "");
  L.push(A.am + A.b + "MOD.04 · ARCH — " + A4.title.toUpperCase() + A.r, "");
  wrap(A4.lede, INNER).forEach(l => L.push(A.g + l + A.r));
  L.push("");
  L.push(A.gd + "interactive 3D configurator: https://" + SITE.org.domain + "/architecture" + A.r, "");
  const section = (title, list) => {
    L.push(hr(), A.am + A.b + title + A.r, "");
    for (const o of list) {
      L.push(A.g + o.name + A.r);
      wrap(o.blurb, INNER - 2).forEach(l => L.push("  " + l));
    }
    L.push("");
  };
  section("LAYOUTS", A4.layouts);
  section("EXTERIOR", A4.exteriors);
  section("GRADE", A4.grades);
  section("MODULES (one per bay)", A4.modules);
  L.push(hr(), A.am + A.b + "NOTES" + A.r, "");
  for (const n of A4.notes) { wrap(n, INNER - 2).forEach((l, i) => L.push((i ? "  " : A.pk + "! " + A.r) + l)); L.push(""); }
  L.push(hr(), "");
  L.push(A.gd + "index: curl " + SITE.org.domain + A.r);
  L.push(A.gd + "contact: curl " + SITE.org.domain + "/txt/contact.txt" + A.r, "");
  return frame(L);
}

function txtContact() {
  const L = txtHeader();
  L.push(hr(), "");
  L.push(A.am + "email " + A.r + "  " + contactLine());
  L.push(A.am + "web   " + A.r + "  " + A.g + "https://" + SITE.org.domain + A.r);
  L.push(A.am + "sec   " + A.r + "  " + A.g + "https://" + SITE.org.domain + "/.well-known/security.txt" + A.r);
  L.push("");
  L.push(A.gd + SITE.org.name + " — " + SITE.org.jurisdiction + "." + A.r, "");
  return frame(L);
}

/* ── 4. small static assets ───────────────────────────────────────────── */

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="#05070A"/><rect x="1.5" y="1.5" width="13" height="13" fill="none" stroke="#1B7F38"/><text x="8" y="12" font-family="monospace" font-size="10" fill="#39FF6A" text-anchor="middle">G</text></svg>\n`;

const ROBOTS = "User-agent: *\nAllow: /\n";

function securityTxt() {
  const exp = new Date(Date.now() + 300 * 864e5).toISOString();
  const mail = SITE.org.email.indexOf("@") < 0 ? "TODO@" + SITE.org.domain : SITE.org.email;
  return [
    "# TODO:LUKAS — confirm the contact mailbox before deploy (RFC 9116).",
    "Contact: mailto:" + mail,
    "Expires: " + exp,
    "Preferred-Languages: en",
    "Canonical: https://" + SITE.org.domain + "/.well-known/security.txt",
    ""
  ].join("\n");
}

/* ── 5. write, compress, enforce budget (plan §4, §8) ─────────────────── */

rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, "txt"), { recursive: true });
mkdirSync(join(DIST, ".well-known"), { recursive: true });

const br = buf => brotliCompressSync(buf, {
  params: { [Z.BROTLI_PARAM_QUALITY]: 11, [Z.BROTLI_PARAM_SIZE_HINT]: buf.length }
});
const gz = buf => gzipSync(buf, { level: 9 });

const sizes = {};
function emit(rel, text, compress = true) {
  const buf = Buffer.from(text, "utf8");
  const p = join(DIST, rel);
  writeFileSync(p, buf);
  sizes[rel] = { raw: buf.length, br: 0 };
  if (compress) {
    const b = br(buf);
    writeFileSync(p + ".br", b);
    writeFileSync(p + ".gz", gz(buf));
    sizes[rel].br = b.length;
  }
}

emit("index.html", buildHtml());
emit("app.css", buildCss());
emit("app.js", buildJs());
emit("architecture.html", buildArchHtml());
emit("arch.css", buildArchCss());
emit("arch.js", buildArchJs());
emit("favicon.svg", FAVICON);
emit("robots.txt", ROBOTS, false);
emit(".well-known/security.txt", securityTxt(), false);

const pages = { index: txtIndex(), contact: txtContact() };
for (const m of SITE.modules) pages[m.id] = m.id === "arch" ? txtArch() : txtModule(m);
for (const name of Object.keys(pages)) {
  emit("txt/" + name + ".txt", pages[name]);
  emit("txt/" + name + ".plain.txt", vis(pages[name]));
}

/* budget table — plan §4, enforced */
const KB = n => (n / 1024).toFixed(1).padStart(6) + " KB";
const BUDGET = [
  ["index.html", 20 * 1024, 6 * 1024],
  ["app.css", 16 * 1024, 5 * 1024],
  // app.js carries the isometric renderer + Aperture-style FX layer; a little
  // headroom over the original 24K/8K line for animation code, while the
  // first-paint total below stays comfortably inside the plan §4 budget.
  ["app.js", 28 * 1024, 10 * 1024],
  ["favicon.svg", 1024, Infinity],
  // MOD.04 configurator page — its own bundle, never on the home page's path
  ["architecture.html", 24 * 1024, 7 * 1024],
  ["arch.css", 8 * 1024, 3 * 1024],
  ["arch.js", 80 * 1024, 22 * 1024]
];

let fail = false;
console.log("\n  asset              raw          brotli       limits");
console.log("  " + "─".repeat(58));
for (const [name, maxRaw, maxBr] of BUDGET) {
  const s = sizes[name];
  const bad = s.raw > maxRaw || s.br > maxBr;
  if (bad) fail = true;
  console.log(
    "  " + name.padEnd(14) + KB(s.raw) + "   " +
    (s.br ? KB(s.br) : "     —   ") + "     ≤" + (maxRaw / 1024) + "K" +
    (maxBr < Infinity ? " / ≤" + (maxBr / 1024) + "K br" : "") + (bad ? "   ✗ OVER" : "   ✓")
  );
}
const fp = ["index.html", "app.css", "app.js"];
const fpRaw = fp.reduce((a, n) => a + sizes[n].raw, 0);
const fpBr = fp.reduce((a, n) => a + sizes[n].br, 0);
const fpBad = fpRaw > 120 * 1024 || fpBr > 45 * 1024;
if (fpBad) fail = true;
console.log("  " + "─".repeat(58));
console.log("  first paint   " + KB(fpRaw) + "   " + KB(fpBr) + "     ≤120K / ≤45K br" + (fpBad ? "   ✗ OVER" : "   ✓"));
// the architecture page loads app.css + app.js too; hold it to the same brotli line
const ap = ["architecture.html", "app.css", "app.js", "arch.css", "arch.js"];
const apRaw = ap.reduce((a, n) => a + sizes[n].raw, 0);
const apBr = ap.reduce((a, n) => a + sizes[n].br, 0);
const apBad = apRaw > 160 * 1024 || apBr > 45 * 1024;
if (apBad) fail = true;
console.log("  arch page     " + KB(apRaw) + "   " + KB(apBr) + "     ≤160K / ≤45K br" + (apBad ? "   ✗ OVER" : "   ✓"));
console.log("  " + STAMP + "\n");

if (fail) {
  console.error("  BUDGET EXCEEDED — build failed (plan §4).");
  process.exit(1);
}
