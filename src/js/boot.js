/* boot.js — entry point (plan §5, §6.1). Runs last in the app.js concat:
   wires the kill switch, reduced-motion gate, typed line, terminal toggle,
   footer status, then initializes iso + rain. */

const GN = {
  calm: false,
  reduced: matchMedia("(prefers-reduced-motion: reduce)"),
  still() { return GN.calm || GN.reduced.matches; },
  // email is assembled from halves at runtime (courtesy obfuscation, §2);
  // a plain mailto: is also baked into the HTML for no-JS users.
  email() {
    const e = SITE.org.email;
    if (e.indexOf("@") < 0) return e;        // still TODO:LUKAS
    const p = e.split("@");
    return [p[0], p[1]].join("@");
  }
};

(() => {
  try { GN.calm = localStorage.getItem("gn-calm") === "1"; } catch (e) { /* private mode */ }
  const root = document.documentElement;
  if (GN.calm) root.classList.add("calm");

  function refreshMotion() {
    Iso.refresh();
    Rain.refresh();
  }

  /* ▮ kill switch — stops all ambient motion, persists (plan §5.4) */
  const calmBtn = document.getElementById("btn-calm") || document.createElement("button");
  calmBtn.hidden = false;
  calmBtn.setAttribute("aria-pressed", String(GN.calm));
  calmBtn.textContent = GN.calm ? "▯" : "▮";
  calmBtn.addEventListener("click", () => {
    GN.calm = !GN.calm;
    root.classList.toggle("calm", GN.calm);
    calmBtn.setAttribute("aria-pressed", String(GN.calm));
    calmBtn.textContent = GN.calm ? "▯" : "▮";
    try { localStorage.setItem("gn-calm", GN.calm ? "1" : "0"); } catch (e) { /* ignore */ }
    refreshMotion();
  });
  if (GN.reduced.addEventListener) GN.reduced.addEventListener("change", refreshMotion);

  /* terminal toggles: TERM button, hero button, `/~ key, /term route */
  ["btn-term", "btn-term2"].forEach(id => {
    const b = document.getElementById(id);
    if (!b) return;                            // secondary pages have no hero button
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

  /* typed hero line — one line, once, skipped when still (plan §1.3) */
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

  /* footer status: TLS from the actual connection, session uptime */
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

  /* effects: iso now, rain after first paint (never critical path, §5.4) */
  Iso.init();
  requestAnimationFrame(() => setTimeout(() => Rain.init(), 0));
})();
