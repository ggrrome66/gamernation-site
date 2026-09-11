/* term.js — in-browser TUI (plan §6.1). DOM is built here so the no-JS
   page stays clean. Reads SITE from content.js (same concat scope). */

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
       ["cd <mod>", "select module (air | net | ctrl | arch)"],
       ["cat <mod>", "print module in full"],
       ["open <mod>", "open a module's page (arch)"],
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
      if (!id) { print("gn: cat needs a module: cat air | net | ctrl | arch", "t-err"); return; }
      const m = findMod(id);
      if (!m) { print("gn: no such module: " + id + "  (try 'ls')", "t-err"); return; }
      catMod(m);
    },
    open(arg) {
      const m = findMod(arg || cwd);
      if (!m) { print("gn: open needs a module: open arch", "t-err"); return; }
      if (!m.link) { print("gn: " + m.id + " has no page of its own — it is on this one (try 'exit')", "t-err"); return; }
      print("opening " + m.link.href + " …", "t-dim");
      location.href = m.link.href;
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
      // preventDefault: if a command closes the pane, focus moves to the
      // TERM button mid-keydown and Enter's default action would re-click it
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
    [["ls", "ls"], ["air", "cat air"], ["net", "cat net"], ["ctrl", "cat ctrl"], ["arch", "open arch"], ["exit", "exit"]]
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
    // tapping anywhere in the pane focuses the input (plan §6.1)
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
