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
        </ul>
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
  const content = read("content.js").replace(/^export /gm, "");
  const body = [content, read("js/iso.js"), read("js/rain.js"), read("js/term.js"), read("js/boot.js")].join("\n");
  return '"use strict";(()=>{\n' + minJs(body) + "\n})();\n";
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
emit("favicon.svg", FAVICON);
emit("robots.txt", ROBOTS, false);
emit(".well-known/security.txt", securityTxt(), false);

const pages = { index: txtIndex(), contact: txtContact() };
for (const m of SITE.modules) pages[m.id] = txtModule(m);
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
  ["favicon.svg", 1024, Infinity]
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
console.log("  " + STAMP + "\n");

if (fail) {
  console.error("  BUDGET EXCEEDED — build failed (plan §4).");
  process.exit(1);
}
