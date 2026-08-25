# GAMERNATION INC. — Corporate Site Build Plan

**Target runtime:** Raspberry Pi (4/5), nginx, static files only, no database, no CMS, no runtime code execution.
**Audience for this document:** Claude Code. Build the site exactly to this spec. Where a value is given, use that value.

---

## 0. Non-negotiable constraints

| # | Constraint | Rule |
|---|---|---|
| C1 | **Byte budget** | First paint ≤ **45 KB brotli** / ≤ 120 KB uncompressed. Whole site on disk ≤ 1 MB. |
| C2 | **Zero third-party requests** | No CDNs, no Google Fonts, no analytics, no trackers, no npm runtime deps. Every byte is served from the Pi. |
| C3 | **Zero JS frameworks** | Vanilla ES2020. No React, no three.js, no GSAP, no jQuery. |
| C4 | **Strict CSP with no `unsafe-inline`** | Therefore: **no inline `<style>`, no inline `<script>`, no `onclick=` attributes.** All CSS/JS in external files. |
| C5 | **Content works with JS disabled** | JS adds atmosphere and the terminal. It never gates content. `lynx` must render a complete, readable site. |
| C6 | **Static only** | No PHP, no Node server, no forms posting to the Pi. Contact = `mailto:` + link out. Attack surface stays near zero. |
| C7 | **Mobile is the primary target** | Design mobile-first. Effects degrade, never break, on a 360px phone. |
| C8 | **Honest copy** | Do not invent certifications, client names, testimonials, or numbers. Placeholders are marked `TODO:LUKAS`. |

**Pi-specific:** ARM CPU has no discrete GPU worth counting on. Avoid `backdrop-filter` and large `filter: blur()` on scrolling elements — they tank Pi-rendered *and* mobile-rendered frame rates. Prefer pre-baked gradients, `box-shadow`, and `transform`/`opacity`-only animation.

---

## 1. Design direction

The brief pins the direction (1990s matrix / CRT / retro-arcade / cyberpunk), so follow it — but execute it as a *deliberate* version, not the default "black page + acid green" AI look. The differentiator: this is a **phosphor terminal that happens to be a corporate site**, running an aesthetic of a late-90s ground control station rather than a Hollywood hacker screen.

### 1.1 Tokens

```
--void        #05070A   page base (near-black, blue-cold not pure #000)
--phos        #39FF6A   primary phosphor green (P1 CRT)
--phos-dim    #1B7F38   dimmed phosphor, body text at rest
--amber       #FFB000   secondary — an amber CRT channel, used for warnings/labels only
--magenta     #FF3CA0   the "phantom glare" ghost channel
--cyan        #22D3EE   the second glare channel + link hover
--paper       #C8FFD4   highest-contrast text (not pure white — a green-cast phosphor white)
```

**Rule:** green is structure, amber is data/labels, magenta+cyan appear **only** in the glare and glitch layers. Nothing else is colored. That restraint is what stops it reading as generic neon soup.

### 1.2 Type

Zero-byte first: system monospace stack, which on every target device already looks like a terminal.

```css
--font-ui: ui-monospace, "SFMono-Regular", "Cascadia Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace;
```

**Display face:** one subsetted `woff2` only if it stays under 12 KB — subset to `A-Z a-z 0-9 . , : / - _ [ ] < > | ▓ ░ █`. Recommended: a chunky pixel/VT-style face. Load with `font-display: swap` and a `@supports`-free fallback so nothing shifts on Pi. **If it exceeds 12 KB, ship without it** — the system stack is the safe default and C1 wins.

Type scale (mobile → desktop, clamp): `0.75 / 0.875 / 1 / 1.25 / 1.75 / 2.75rem`. Uppercase + `letter-spacing: 0.12em` for headings and labels only; body stays lowercase-normal for readability.

### 1.3 Layout concept

A single-page vertical stack framed as a **boot sequence**. The page is one long CRT scroll; each service is a "module" that reports in.

```
┌──────────────────────────────────────────┐
│ [GAMERNATION INC.]        [ TERM ] [ ▮ ] │  ← sticky 40px status bar
├──────────────────────────────────────────┤
│                                          │
│   ██████ boot glyph / wordmark           │
│   > we build the drone, the software,    │  ← typed line (1 line, once)
│     and the page you found this on.      │
│   [ ENTER ]   [ ~ FOR TERMINAL ]         │
│                                          │
├──── MOD.01 ─────────────────────── AIR ──┤
│  ╱▔▔╲   heading w/ phantom glare         │
│ ╱ iso ╲  ← 3D isometric canvas, rotating │
│ ╲_____╱                                  │
│  body copy · 3 capability rows           │
├──── MOD.02 ─────────────────────── NET ──┤
│  (same rhythm, different model)          │
├──── MOD.03 ────────────────────── CTRL ──┤
│  (same rhythm, different model)          │
├──────────────────────────────────────────┤
│  contact block / mailto / status footer  │
└──────────────────────────────────────────┘
```

On desktop (≥900px) each module becomes two columns: isometric canvas left, copy right, alternating sides per module. On mobile it is one column, canvas first at 100vw-2rem, capped 320px tall.

### 1.4 Signature element

**The phantom glare.** Every major section heading is rendered three times in the same box: the real green text, plus a magenta ghost offset `-2px` and a cyan ghost offset `+2px`, both at low opacity with a slow independent drift (±1px over 6s). Reads as misconverged CRT guns. On hover/`:focus-within` the ghosts pull apart briefly then snap back — a 180ms "snappy arcade" reaction, not a slow fade.

That is where the boldness is spent. Everything else — spacing, dividers, the module labels — stays disciplined and quiet.

---

## 2. Information architecture & copy

Content lives in **one file**, `src/content.js`, exporting a single object. `index.html` is generated from it at build time, and the terminal + `curl` renderers read the same object. One source of truth — never hand-edit three copies.

```js
export const SITE = {
  org: { name: "GamerNation Inc.", tag: "…", jurisdiction: "Federal corporation, Canada", email: "TODO:LUKAS" },
  modules: [ { id:"air", num:"01", chan:"AIR", title:"…", lede:"…", rows:[…], model:"quad" }, … ]
};
```

### MOD.01 — AIR · Drones & drone services
Three capability rows:
1. **Build** — airframe design, fabrication, integration, and bring-up of purpose-built small UAS.
2. **Fly** — survey and inspection flights flown to a plan, with data delivered, not just imagery dumped.
3. **Train** — three tiers: **Basic**, **Advanced**, and **Complex**, the last built around a 4-inch, single-cell (1S) recon platform for emergency services.

> **Copy accuracy gate:** RPAS training/flight-review claims are regulated by Transport Canada. Write the training tier copy generically (what the course covers) and leave any statement about certification, flight reviews, or approved-provider status as `TODO:LUKAS` for him to word. Do **not** infer his credentials into marketing claims.

### MOD.02 — NET · Websites & social for small businesses
Sites built to load on bad rural connections and cheap phones, plus ongoing social updates so a small operator isn't posting at 11pm. Angle the copy at the fact that *this very page* is the demo — it's a hand-built site running on a single-board computer. That's the proof, so say it once, plainly, and move on.

### MOD.03 — CTRL · Custom drone software
Ground-station and fleet-management software: mission planning, live asset monitoring, telemetry capture, and post-flight data handling — written to fit an operator's actual workflow instead of forcing them into someone else's dashboard.

### Footer
Corporate line, contact `mailto:` (build the address from two JS-joined halves *and* include a plain `<a href="mailto:">` in the HTML for no-JS users — obfuscation is courtesy, not security), `/security.txt` link, and a live status readout: `UPTIME · NODE: rpi · TLS: OK`.

---

## 3. File tree

```
gamernation-site/
├── src/
│   ├── content.js          # single source of truth (§2)
│   ├── index.template.html
│   ├── css/
│   │   ├── base.css        # reset, tokens, type scale
│   │   ├── crt.css         # scanlines, vignette, flicker, glare
│   │   └── layout.css      # modules, grid, footer, responsive
│   └── js/
│       ├── boot.js         # entry: init, prefers-reduced-motion gate, term toggle
│       ├── iso.js          # isometric software renderer + models
│       ├── rain.js         # matrix rain (deferred, optional)
│       └── term.js         # in-browser TUI
├── build.js                # zero-dependency Node build script
├── dist/                   # generated — do not hand-edit
│   ├── index.html  + .br + .gz
│   ├── app.css     + .br + .gz
│   ├── app.js      + .br + .gz
│   ├── favicon.svg
│   ├── robots.txt
│   ├── .well-known/security.txt
│   └── txt/                # pre-rendered ANSI for curl (§6.2)
│       ├── index.txt  air.txt  net.txt  ctrl.txt  contact.txt
├── deploy/
│   ├── nginx.conf
│   ├── headers.conf
│   └── harden.sh
└── README.md
```

`build.js` uses **only** Node built-ins (`fs`, `zlib`, `path`). No `npm install` on the Pi, ever.

---

## 4. Performance budget (enforce in `build.js` — fail the build if exceeded)

| Asset | Uncompressed | Brotli target |
|---|---|---|
| `index.html` | ≤ 20 KB | ≤ 6 KB |
| `app.css` | ≤ 16 KB | ≤ 4 KB |
| `app.js` (all JS concatenated) | ≤ 24 KB | ≤ 8 KB |
| `favicon.svg` | ≤ 1 KB | — |
| Optional webfont | ≤ 12 KB | (already compressed) |
| **First-paint total** | **≤ 120 KB** | **≤ 45 KB** |

No raster images in the critical path. The isometric models are code, not files — a quadcopter is ~60 vertices, which is ~600 bytes of source. That is the whole reason we hand-roll the renderer instead of shipping three.js (≈600 KB) or GLB models.

One `og.png` (≤ 30 KB, 1200×630) may exist for link previews; it is never fetched by a normal visitor.

---

## 5. Component specs

### 5.1 CRT layer (`crt.css`)

Three fixed, `pointer-events:none` overlay layers on `<body>::before/::after` and one `.crt-vignette` element:

- **Scanlines** — `repeating-linear-gradient(rgba(0,0,0,.28) 0 1px, transparent 1px 3px)`. Fixed position, no animation.
- **Vignette** — single radial gradient, baked, static.
- **Flicker** — animate `opacity` between `0.97` and `1.0` on a 6s `steps()` loop. Opacity only — never `filter`, never `backdrop-filter`.
- **Bloom on phosphor text** — `text-shadow: 0 0 2px currentColor, 0 0 8px rgba(57,255,106,.35)`. Cheap. Do not use `filter: blur()`.
- **Screen curvature** — do *not* attempt SVG displacement filters or `border-radius` warping. It costs frames on Pi and looks worse on phones. A subtle inset `box-shadow` on the viewport edge sells the same idea for free.

### 5.2 Phantom glare (`.glare`, the signature)

Structure, no inline styles:

```html
<h2 class="glare" data-text="AIR">AIR</h2>
```

`::before` and `::after` both use `content: attr(data-text)`, absolutely positioned, `color: var(--magenta)` / `var(--cyan)`, `mix-blend-mode: screen`, `opacity: .45`, translated `-2px/0` and `2px/0`. Animate `transform` only, 6s ease-in-out alternate, different durations per pseudo-element so they never sync.

`:hover`/`:focus-within` → ghosts jump to `±6px` over 90ms, return over 180ms `cubic-bezier(.2,.9,.2,1)`. Snappy. Arcade.

**Reduced motion:** ghosts stay static at ±2px, no drift, no hover jump.

### 5.3 Isometric 3D renderer (`iso.js`)

Hand-rolled canvas-2D software renderer. ~150 lines. No WebGL (Pi/mobile driver roulette) and no three.js (budget).

**Model format** — plain arrays, defined in `iso.js`:
```js
const QUAD = {
  v: [[x,y,z], …],           // vertices, unit-ish scale
  e: [[0,1],[1,2], …],       // edges for wireframe mode
  f: [[0,1,2,3, shade], …]   // quads/tris + shade index 0-3
};
```
Three models: `quad` (4-arm multirotor with prop discs), `crt` (a CRT monitor + keyboard for NET), `rack` (a ground-station case with antenna mast for CTRL).

**Pipeline per frame:** rotate Y by `t`, project isometric (`sx = (x-z)*cos30`, `sy = (x+z)*sin30 - y`), painter's-algorithm depth sort by face centroid `z`, fill with 4 flat phosphor shades, stroke edges 1px.

**Auto-rotate:** continuous Y rotation, one revolution per ~14s.

**Glitch-to-wireframe:** a scheduler picks a random interval in **[7s, 15s]**; on fire, enter wireframe for **180–420ms**, during which:
- faces are not filled, only edges stroked in `--phos`
- a 1-in-3 chance the whole canvas is offset by `±3px` on X for one frame, and 2–4 horizontal slice rows are shifted (classic tear)
- magenta/cyan edge copies are drawn at ±1px for the glare tie-in
Then snap back with no transition. The snap is the point.

**Performance guards (mandatory):**
- Cap to **30 fps** via a `lastTime` delta check — 60fps buys nothing here and doubles Pi/phone battery cost.
- `IntersectionObserver`: only animate canvases currently on screen.
- `document.hidden` → stop the loop entirely.
- `prefers-reduced-motion: reduce` → render **one static frame** at a flattering angle, no rotation, no glitch. Still looks good; costs nothing.
- Canvas backing store capped at `min(devicePixelRatio, 2)`.
- Each `<canvas>` carries a real `aria-label` and a `<noscript>`-safe styled fallback block so no-JS users see a labelled placeholder, not a hole.

### 5.4 Matrix rain (`rain.js`)

Ambient, behind the hero only — **not** the full page.

- Katakana + `0-9` + `A-Z`, drawn as text on one canvas, column width 14px.
- Density scales with viewport: `columns = min(floor(w/14), 60)`.
- 20 fps cap, `document.hidden` aware, disabled entirely under `prefers-reduced-motion` and on viewports < 380px.
- Loaded with `defer` and initialized *after* first paint. It must never be in the critical path.
- Kill switch in the status bar (`▮` button) that stops all ambient motion and persists via `localStorage` — this is also the accessibility escape hatch.

---

## 6. The three terminal surfaces

The site must be usable from a command prompt. Deliver that three ways.

### 6.1 In-browser TUI (`term.js`)

Toggle: the `TERM` button in the status bar, or pressing `` ` ``/`~`, or visiting `/term`. Full-screen phosphor pane with a blinking block cursor and a fake prompt `gn@rpi:~$`.

Commands (all reading `SITE` from `content.js`):
```
help            list commands
ls              list modules
cd <mod>        select module (air | net | ctrl)
cat <mod>       print module in full
whoami          org identity block
contact         email + how to reach
banner          ASCII wordmark
clear           clear screen
exit            return to graphical site
```
Behaviours: command history on ↑/↓, tab-completion on module names, unknown command → `gn: command not found: <x>  (try 'help')`. Errors state what happened and what to try — never apologize, never go vague.

Accessibility: the output pane is `role="log"` + `aria-live="polite"`; the input is a real focusable `<input>`, so screen readers and mobile keyboards both work. On mobile, tapping anywhere in the pane focuses the input and a compact button row (`ls` `air` `net` `ctrl` `exit`) sits above the keyboard — nobody is typing `cd ctrl` on a phone.

### 6.2 Real command-prompt access via `curl`

nginx content-negotiates on `User-Agent` and serves pre-rendered ANSI text. **Static files, no server-side execution.**

`build.js` generates `dist/txt/*.txt` from `content.js` with real ANSI escapes (256-colour green/amber), a box-drawn frame at **72 columns**, and an ASCII wordmark.

```nginx
map $http_user_agent $is_cli {
    default            0;
    "~*curl|wget|httpie|powershell|python-requests|lynx-cli" 1;
}

location = / {
    if ($is_cli) { rewrite ^ /txt/index.txt last; }
    try_files /index.html =404;
}
location /txt/ {
    default_type "text/plain; charset=utf-8";
    add_header Content-Disposition "inline";
}
```
So `curl gamernation.ca`, `curl gamernation.ca/txt/air.txt`, and PowerShell's `curl` all print a formatted corporate page in the console. Windows `cmd.exe` needs `curl -s` plus VT processing; also emit `*.plain.txt` variants with ANSI stripped and select those when the UA is bare `curl` on Windows or when `?plain` is present.

Print the invitation on the site itself, once, in the footer: `$ curl gamernation.ca`.

### 6.3 Text-browser fidelity

`lynx https://gamernation.ca` and `w3m` must render the complete site: semantic `<h1>/<h2>/<section>/<ul>`, meaningful link text, alt/aria on every canvas, logical source order matching visual order. This is free if C5 is respected, and it is the real test that the site isn't a JS castle.

> **Deferred (Phase 7, optional):** an `ssh guest@gamernation.ca` kiosk serving the same TUI. It is a genuinely great trick and a genuinely real attack surface. Only build it as a `nologin`-shell forced-command running a restricted script, in its own unprivileged account, with `PermitTTY yes`, no port forwarding, no agent forwarding, `ForceCommand` locked, on a non-standard port, rate-limited. Do not build it in v1.

---

## 7. Security specification

This is a corporate site with no user data and no backend, so the entire security posture is: **remove attack surface, then prove it's removed.**

### 7.1 Response headers (`deploy/headers.conf`)

```nginx
add_header Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "no-referrer" always;
add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=(), interest-cohort=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;
add_header Cross-Origin-Embedder-Policy "require-corp" always;
```

Note the CSP has **no `unsafe-inline` and no `unsafe-eval`** — which is exactly why C4 forbids inline styles/scripts. If Claude Code finds itself wanting to add an inline handler, the answer is `addEventListener` in `app.js`, not a CSP exception. `connect-src 'none'` means the site makes zero network calls after load; keep it that way.

Because `add_header` directives are *not* inherited into a `location` block that declares its own, include `headers.conf` in **every** location block that sets headers.

### 7.2 TLS

- Certbot / Let's Encrypt with auto-renew (`systemd` timer), deploy hook reloading nginx.
- `ssl_protocols TLSv1.2 TLSv1.3;` — Mozilla **Intermediate** cipher list, `ssl_prefer_server_ciphers off`.
- OCSP stapling on, `ssl_session_tickets off`, `ssl_session_cache shared:SSL:2m`.
- HTTP :80 does nothing but `return 301 https://$host$request_uri;`.
- Only add HSTS `preload` submission once the domain is confirmed permanently HTTPS.

### 7.3 nginx hardening

```nginx
server_tokens off;
autoindex off;
client_max_body_size 1k;          # nothing is ever uploaded
client_body_timeout 5s;
client_header_timeout 5s;
limit_req_zone $binary_remote_addr zone=gn:10m rate=20r/s;
limit_conn_zone $binary_remote_addr zone=gnconn:10m;
```
Apply `limit_req zone=gn burst=40 nodelay;` and `limit_conn gnconn 20;` in the server block. Deny dotfiles except `/.well-known/`. Return `444` on unknown `Host` via a `default_server` catch-all. `gzip_static on; brotli_static on;` — serve the precompressed files, never compress at request time on a Pi.

### 7.4 Host hardening (`deploy/harden.sh`, idempotent)

- `unattended-upgrades` enabled for security updates.
- `ufw`: default deny incoming, allow 80/443, allow SSH **from LAN only** (or nothing, if using a tunnel).
- SSH: key-only (`PasswordAuthentication no`), `PermitRootLogin no`, non-default port, `AllowUsers` explicit.
- `fail2ban` with `sshd` and an `nginx-limit-req` jail.
- Web root owned by a non-`www-data` user, `chmod 0555` directories / `0444` files — nginx only ever needs read. A compromised worker can't write to disk.
- Systemd unit hardening for nginx via drop-in: `ProtectSystem=strict`, `ProtectHome=yes`, `PrivateTmp=yes`, `NoNewPrivileges=yes`, `ReadWritePaths=/var/log/nginx /var/lib/nginx`.
- **Never expose port 22 to the internet.** Prefer **Cloudflare Tunnel** (or Tailscale Funnel) over port-forwarding: it keeps the home IP off DNS, terminates scans upstream, and means the router has zero inbound holes. If Lukas port-forwards instead, document the DDNS setup and accept that his residential IP is public.
- Log privacy: anonymize the last octet in the nginx log format, or set `access_log off;` entirely — there's nothing to analyze on a brochure site, and the SD card thanks you. Route logs to `tmpfs` if kept, to reduce card wear.
- `/.well-known/security.txt` with contact + expiry, per RFC 9116.
- `robots.txt`: allow all, no `Disallow` leaking paths.

### 7.5 Supply chain

Zero runtime dependencies is the control. If a webfont is used, it is downloaded once, checked in, and served locally — never linked. `build.js` must not fetch anything at build time.

---

## 8. Build & deploy

`build.js` (Node built-ins only):
1. Read `content.js`, render `index.template.html` → `dist/index.html` (escape all interpolated content).
2. Concatenate + minify CSS and JS (simple regex minifier: strip comments/whitespace — do not attempt a real mangler).
3. Render `dist/txt/*.txt` ANSI + `.plain.txt` variants.
4. Pre-compress every text asset with `zlib.brotliCompressSync` (quality 11) and `gzipSync` (level 9).
5. **Assert the §4 budget. `process.exit(1)` if over.** Print a size table.
6. Emit a build stamp used by the footer status line.

Deploy: `rsync -a --delete dist/ pi:/srv/gamernation/` then `sudo nginx -t && sudo systemctl reload nginx`. One command in `README.md`.

---

## 9. Accessibility & mobile floor

- Contrast: body text `--paper` on `--void` must clear WCAG AA. Test *through* the scanline overlay — the overlay reduces effective contrast, so raise text luminance until it passes with it on.
- Every animation respects `prefers-reduced-motion`, plus the manual `▮` kill switch.
- Visible keyboard focus everywhere: `:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; }`. Never `outline: none`.
- Touch targets ≥ 44px. No hover-only information.
- `env(safe-area-inset-*)` padding on the status bar and footer for notched phones.
- `prefers-contrast: more` → drop scanlines and glare ghosts to near-zero opacity.
- One `<h1>`. Landmarks: `header`/`main`/`footer`/`nav`.
- Skip link to `#main` as the first focusable element.

---

## 10. Phase plan for Claude Code

Work in order. Each phase ends with its acceptance check passing before the next begins.

**P1 — Skeleton & content.** `content.js`, template, semantic HTML, base tokens/type, no effects.
✅ *Accept:* `lynx dist/index.html` reads as a complete, sensible corporate page. Budget check passes with room to spare.

**P2 — Layout & responsive.** Modules, grid, footer, status bar, mobile-first breakpoints at 600/900/1200.
✅ *Accept:* No horizontal scroll at 320px. Looks intentional at 360, 390, 768, 1440.

**P3 — CRT + phantom glare.** `crt.css`, the signature heading treatment, focus states.
✅ *Accept:* Steady 60fps scroll on a mid-range phone; ≥30fps on the Pi's own Chromium. Reduced-motion path verified.

**P4 — Isometric renderer.** `iso.js`, three models, auto-rotate, wireframe glitch, all performance guards.
✅ *Accept:* Three canvases animating; CPU on a phone stays cool over 2 minutes; static single frame under reduced motion; JS-off shows labelled fallbacks.

**P5 — Terminal mode.** `term.js`, all commands, history, mobile button row, `/term` route.
✅ *Accept:* Every content item in `SITE` reachable via `cat`. Keyboard-only usable. `exit` restores scroll position.

**P6 — Security, ANSI, deploy.** `nginx.conf`, `headers.conf`, `harden.sh`, `dist/txt/*`, Certbot notes, README.
✅ *Accept:* `curl -I` shows the full header set; `curl gamernation.ca` prints the ANSI page; securityheaders.com and Mozilla Observatory both grade **A+**.

**P7 — Optional.** SSH kiosk (§6.2 caveats), `og.png`, webfont subset — only if budget allows.

---

## 11. Test checklist

```
[ ] node build.js            → budget table under limits, exit 0
[ ] lynx / w3m               → full content, sensible order
[ ] curl -s https://…        → ANSI page renders in cmd.exe + bash
[ ] curl -I https://…        → all §7.1 headers, no Server version
[ ] JS disabled              → complete site, labelled canvas fallbacks
[ ] prefers-reduced-motion   → zero motion anywhere
[ ] 360px viewport           → no h-scroll, no clipped glare
[ ] Lighthouse mobile        → Perf ≥ 98, A11y 100, Best Practices 100
[ ] securityheaders.com      → A+
[ ] Mozilla Observatory      → A+
[ ] testssl.sh               → no TLS < 1.2, stapling OK
[ ] nmap from outside        → only 80/443 (or nothing, if tunnelled)
[ ] 2 min soak on phone      → no heat, no jank, no memory growth
```

---

## 12. Kickoff prompt for Claude Code

> Read `gamernation-site-plan.md` in full before writing any code. Build Phase 1 only, then stop and show me the size table and the `lynx` render. Follow every constraint in §0 literally — especially: no third-party requests, no inline styles or scripts, no JS frameworks, and the byte budget in §4 enforced by `build.js`. Do not invent client names, testimonials, certifications, or metrics; leave those as `TODO:LUKAS`.

---

## 13. Open items for Lukas

1. **Domain + hosting path** — Cloudflare Tunnel (recommended) or port-forward with DDNS?
2. **Contact address** — which address goes in `mailto:` and `security.txt`?
3. **Training tier wording** — the regulated copy in MOD.01 needs your exact language.
4. **Drone imagery** — the isometric models are generic by default; if you want the quad model to match the 4″ 1S recon airframe's actual geometry, send arm length / stack height / prop size and the model gets hand-tuned to it.
5. **Webfont** — ship the system monospace stack (0 KB) or spend ~12 KB on a pixel display face?
