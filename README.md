# GamerNation Inc. — corporate site

A phosphor-terminal corporate site for a Raspberry Pi: static files only,
zero third-party requests, zero JS frameworks, strict CSP with no inline
code, fully readable with JS disabled and from `curl`/`lynx`.

Full specification: [`gamernation-site-plan.md`](gamernation-site-plan.md).
The build currently ships **~10 KB brotli** first paint against the plan's
45 KB budget.

## Build

```sh
node build.js
```

Node ≥ 18, built-ins only (`fs`, `zlib`, `path`). There are **no
dependencies — never run `npm install`** (`package.json` exists only to mark
the repo as ES modules). The script renders `dist/` from `src/`,
pre-compresses every text asset (`.br` + `.gz`), prints the size table, and
**exits 1 if the plan §4 byte budget is exceeded**.

All copy lives in `src/content.js` — one object feeds the HTML, the
in-browser terminal, and the ANSI text pages. Edit content there, nowhere else.

```
src/content.js          single source of truth (copy, banner, modules)
src/index.template.html page shell; build.js fills it from content.js
src/css/                base (tokens/type) · crt (scanlines/glare) · layout
src/js/                 boot · iso (3D renderer) · rain · term (TUI)
build.js                zero-dependency build + budget gate
dist/                   generated — do not hand-edit
deploy/                 nginx.conf · headers.conf · harden.sh
```

## Deploy (Raspberry Pi)

```sh
node build.js && rsync -a --delete dist/ pi:/srv/gamernation/ && ssh pi 'sudo nginx -t && sudo systemctl reload nginx'
```

One-time setup on the Pi:

1. `deploy/nginx.conf` → `/etc/nginx/conf.d/gamernation.conf`
2. `deploy/headers.conf` → `/etc/nginx/snippets/gn-headers.conf`
3. `sudo apt install libnginx-mod-http-brotli-static` (or comment out `brotli_static`)
4. `sudo certbot --nginx -d gamernation.ca -d www.gamernation.ca` (auto-renew via systemd timer)
5. `sudo bash deploy/harden.sh` — read it first; the sshd section is
   deliberately commented until key-only login is confirmed.

## The three terminal surfaces

- **In-browser TUI** — `TERM` button, the `` ` ``/`~` key, or `/term`.
  Commands: `help ls cd cat whoami contact banner clear exit`, with history
  and tab-completion.
- **curl** — nginx serves pre-rendered ANSI from `dist/txt/` to CLI
  user-agents: `curl gamernation.ca`, `curl gamernation.ca/txt/air.txt`.
  No colours (cmd.exe): append `?plain` or fetch `/txt/index.plain.txt`.
- **Text browsers** — `lynx https://gamernation.ca` renders the complete
  semantic page; JS only adds atmosphere.

## Test checklist (plan §11)

```
[ ] node build.js            → budget table under limits, exit 0
[ ] lynx / w3m               → full content, sensible order
[ ] curl -s https://…        → ANSI page renders in cmd.exe + bash
[ ] curl -I https://…        → all §7.1 headers, no Server version
[ ] JS disabled              → complete site, labelled canvas fallbacks
[ ] prefers-reduced-motion   → zero motion anywhere (plus the ▮ kill switch)
[ ] 360px viewport           → no h-scroll, no clipped glare
[ ] securityheaders.com / Mozilla Observatory → A+
[ ] testssl.sh               → no TLS < 1.2, stapling OK
[ ] nmap from outside        → only 80/443 (or nothing, if tunnelled)
```

## Open items — TODO:LUKAS

1. **Contact address** — set `email` in `src/content.js`; it feeds the
   footer `mailto:`, the terminal `contact` command, and `security.txt`.
2. **Training tier wording** — the Transport Canada–regulated copy in
   MOD.01 (`TRAIN` row) needs your exact language; the build renders the
   placeholder visibly until then.
3. **Hosting path** — Cloudflare Tunnel (recommended) or port-forward +
   DDNS. See notes in `deploy/harden.sh`.
4. **LAN subnet** — `LAN_CIDR` in `deploy/harden.sh` before running it.
5. **Optional (plan P7)** — `og.png`, ≤12 KB pixel webfont, SSH kiosk.
