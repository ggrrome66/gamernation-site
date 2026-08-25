/* rain.js — ambient matrix rain behind the hero only (plan §5.4).
   Initialized after first paint by boot.js; never in the critical path. */

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
