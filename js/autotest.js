// ⚙ Settings ▸ Autotest: runs the whole test suite and shows every case in a window,
// a green tick when it passed, the expected and the real line when it did not.
// The text can be selected and copied (or use the Copy button).
const AutoTest = {
    el: null,
    lines: [], // plain text of the report, for copying
    running: false,

    open() {
        if (!this.el) this.build();
        this.el.hidden = false;
        if (!this.running) this.run();
    },

    close() {
        this.el.hidden = true;
        this.watchMode(false);
    },

    // a small screen (phone): picture on top, terminal and report below, no page scrolling
    small() { return matchMedia("(max-width: 820px), (pointer: coarse) and (max-height: 520px)").matches; },

    watchMode(on) {
        if (document.body.classList.contains("at-watch") == on) return;
        document.body.classList.toggle("at-watch", on);
        window.scrollTo(0, 0);
        window.dispatchEvent(new Event("resize"));
        terminal.showBottom();
    },

    // the camera follows the frames, zoomed in so that a phone shows readable pictures
    follow(on) {
        this.following = on;
        document.body.classList.toggle("at-follow", on);
        if (!on) { App.resetView(); return; }
        if (this.camRaf) return;
        let last = performance.now(), tx = null, ty = null;
        const step = (now) => {
            if (!this.following) { this.camRaf = null; return; }
            this.camRaf = requestAnimationFrame(step);
            const dt = Math.min(100, now - last); last = now;
            // where the action is: the frames on the cables, else the network's middle
            let n = 0, sx = 0, sy = 0;
            (Id.list.Patch || []).forEach(p => p.inFlight().forEach(f => {
                const q = p.pointAt(f.dir, f.progress); sx += q.x; sy += q.y; n++;
            }));
            if (n) { tx = sx / n; ty = sy / n; }
            else if (tx == null) { const v = App.view || { x: 0, y: 0, w: App.W, h: App.H }; tx = v.x + v.w / 2; ty = v.y + v.h / 2; }
            const uz = Math.max(1, Math.min(2.2, 0.85 / App.bs));
            const k = 1 - Math.exp(-dt / 450);
            const wantPx = App.cw / 2 - (App.bx * uz + tx * App.bs * uz);
            const wantPy = (App.ch - 24) / 2 - (App.by * uz + ty * App.bs * uz);
            App.uz += (uz - App.uz) * k;
            // the pan follows the zoom so that the picture does not jump
            App.px += (wantPx - App.px) * k;
            App.py += (wantPy - App.py) * k;
            App.applyView();
        };
        this.camRaf = requestAnimationFrame(step);
    },

    build() {
        const el = document.createElement("div");
        el.className = "autotest";
        el.hidden = true;
        el.innerHTML = `<div class="at-h"><span class="at-logo">✔</span><b>Autotest</b><span class="at-status"></span><span class="at-note">🖱 in use by the test</span>
                <button class="mini at-run">Run again</button><button class="mini at-copy">Copy</button>
                <button class="pop-x at-x" title="Close">×</button></div>
            <div class="at-bar"><span></span></div>
            <pre class="at-out" tabindex="0"></pre>`;
        document.body.appendChild(el);
        this.el = el;
        this.out = el.querySelector(".at-out");
        this.status = el.querySelector(".at-status");
        this.bar = el.querySelector(".at-bar span");
        this.btnRun = el.querySelector(".at-run");
        el.querySelector(".at-x").addEventListener("click", () => this.close());
        el.querySelector(".at-copy").addEventListener("click", () => this.copy());
        this.btnRun.addEventListener("click", () => {
            if (!this.running) return this.run();
            UiTest.stopped = true;
            test.stop();
        });
        // move it by its title bar
        const h = el.querySelector(".at-h");
        h.addEventListener("pointerdown", ev => {
            if (ev.target.closest("button")) return;
            const r = el.getBoundingClientRect(), sx = ev.clientX, sy = ev.clientY;
            const move = e => { el.style.left = (r.left + e.clientX - sx) + "px"; el.style.top = Math.max(0, r.top + e.clientY - sy) + "px"; };
            const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
        });
        window.addEventListener("keydown", ev => { if (ev.key == "Escape" && !this.el.hidden && !this.running) this.close(); });
    },

    run() {
        if (terminal.booting) return setTimeout(() => this.run(), 300);
        this.lines = [];
        this.out.innerHTML = "";
        this.passed = 0;
        this.failedN = 0;
        this.t0 = Date.now();
        this.total = Test.case.length + UiTest.count();
        this.saved = this.snapshot(); // the network you were working on comes back at the end
        this.savedAccess = Access.mode;
        Access.set("simple", true); // the tests log in the short way (the console-access tests switch by themselves)
        this.watchMode(this.small());
        this.running = true;
        this.btnRun.textContent = "Stop";
        Access.sync();
        this.add("head", `NetLab autotest · ${new Date().toLocaleString()} · ${this.total} cases`);
        this.add("head", "Your network is put aside and comes back at the end. This takes a few minutes in real time.\n");
        this.tick();
        this.timer = setInterval(() => this.tick(), 500);
        if (shell.job) { shell.job.cancel(false); shell.job = null; }
        if (!Sim.running) Sim.play();
        this.uiFirst();
    },

    // 1. the UI tests build a network with the pointer, 2. the terminal tests check the protocols
    async uiFirst() {
        this.add("head", `1. UI tests (${UiTest.count()}) — watch the pointer build a network`);
        // out of the way while the pointer works on the canvas and the terminal
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // no phone keyboard
        const st = this.el.getAttribute("style") || "";
        this.el.setAttribute("style", "left:auto; right:12px; top:auto; bottom:12px; width:440px; height:300px");
        this.el.classList.add("docked");
        test.stopped = false;
        try { await UiTest.run(this); }
        finally { this.el.setAttribute("style", st); this.el.classList.remove("docked"); }
        if (UiTest.stopped) return this.onDone(false, true);
        this.add("head", `\n2. Terminal tests (${Test.case.length}) — the terminal shows what is typed`);
        test.listener = this;
        if (document.body.classList.contains("at-watch")) this.follow(true);
        test.test();
    },

    // the command a case belongs to ("" = more output of the command before)
    command(i) {
        for (let k = i; k >= 0; k--) if (Test.case[k][0] != "") return k == i ? Test.case[k][0] : Test.case[k][0] + "   (later output)";
        return "";
    },

    onCase(i, fails) {
        const n = String(i + 1).padStart(3);
        const cmd = this.command(i);
        if (!fails.length) {
            this.passed++;
            this.add("ok", `✔ ${n}  ${cmd}`);
        } else {
            this.failedN++;
            this.add("bad", `✘ ${n}  ${cmd}`);
            fails.forEach(f => {
                this.add("bad dim", `        expected: ${f.want instanceof RegExp ? String(f.want) : JSON.stringify(f.want)}`);
                this.add("bad dim", `        got:      ${JSON.stringify(f.got == null ? "" : f.got)}`);
            });
        }
        this.tick(UiTest.count() + i + 1);
    },

    // the terminal tests are over (or the run was stopped): the network comes back
    onDone(ok, stopped) {
        test.listener = null;
        if (this.savedAccess) Access.set(this.savedAccess, true);
        if (this.following) this.follow(false);
        try { this.restore(this.saved); }
        catch (e) { this.add("bad", "Could not bring your network back: " + e.message); }
        this.finish(this.failedN == 0 && !stopped, stopped);
    },

    onUiCase(i, name, err) {
        const n = ("UI" + (i + 1)).padStart(5);
        if (err && err.startsWith("skip:")) { this.passed++; this.add("ok dim", `– ${n}  ${name}  (${err.slice(5).trim()})`); }
        else if (!err) { this.passed++; this.add("ok", `✔ ${n}  ${name}`); }
        else { this.failedN++; this.add("bad", `✘ ${n}  ${name}`); this.add("bad dim", `        ${err}`); }
        this.tick(i + 1);
    },

    snapshot() {
        const cur = Topology.current || { id: "new", title: "New network", mine: true };
        return {
            cur, spec: Editor.serialize(cur.title), edited: Editor.edited, editorOn: Editor.on,
            view: { uz: App.uz, px: App.px, py: App.py }, layout: Object.assign({}, Layout.s), lang: Lang.cur,
            speed: Sim.speed, running: Sim.running && !Sim.stepping,
        };
    },

    // load the network back as it was (devices, addresses, routes, VLANs, names, cables)
    restore(s) {
        const c = s.cur;
        const spec = Object.assign({}, s.spec, { id: c.id, title: c.title, title_hu: c.title_hu, goal: c.goal, goal_hu: c.goal_hu, tries: c.tries, mine: c.mine });
        spec.zones = s.edited ? [] : (c.zones || []);
        Topology.loadSpec(spec);
        Editor.edited = s.edited;
        Editor.toggle(s.editorOn);
        App.uz = s.view.uz; App.px = s.view.px; App.py = s.view.py;
        App.applyView();
        Layout.s = s.layout; Layout.apply(); Layout.save();
        if (Lang.cur != s.lang) Lang.set(s.lang);
        Sim.setSpeed(s.speed);
        if (s.running) Sim.play(); else Sim.pause();
        Sim.event("info", `Autotest finished — <b>${esc(c.title)}</b> is back`);
        this.add("head", `\nYour network “${c.title}” is back.`);
    },

    finish(ok, stopped) {
        clearInterval(this.timer);
        this.running = false;
        Access.sync();
        this.btnRun.textContent = "Run again";
        const secs = Math.round((Date.now() - this.t0) / 1000);
        const time = Math.floor(secs / 60) + ":" + String(secs % 60).padStart(2, "0");
        this.add("head", "");
        if (stopped) this.add("bad", `■ Stopped after ${this.passed + this.failedN} of ${this.total} cases · ${this.passed} passed, ${this.failedN} failed · ${time}`);
        else if (ok) this.add("ok big", `✔ ALL TESTS OK · ${this.passed} passed · ${time}`);
        else this.add("bad big", `✘ SOME TESTS FAILED · ${this.passed} passed, ${this.failedN} failed · ${time}`);
        this.status.textContent = stopped ? "stopped" : ok ? "all passed" : `${this.failedN} failed`;
        this.status.className = "at-status " + (ok && !stopped ? "ok" : "bad");
        this.bar.style.width = "100%";
        this.bar.className = ok && !stopped ? "ok" : "bad";
    },

    tick(done) {
        if (done != null) this.done = done;
        const d = this.done || 0;
        const secs = Math.round((Date.now() - this.t0) / 1000);
        if (this.running) {
            this.status.textContent = `${d} / ${this.total} · ${secs} s` + (this.failedN ? ` · ${this.failedN} failed` : "");
            this.status.className = "at-status" + (this.failedN ? " bad" : "");
            this.bar.style.width = (d / this.total * 100) + "%";
            this.bar.className = this.failedN ? "bad" : "";
        }
    },

    add(cls, text) {
        this.lines.push(text);
        const div = document.createElement("div");
        div.className = cls;
        div.textContent = text;
        this.out.appendChild(div);
        this.out.scrollTop = this.out.scrollHeight;
    },

    copy() {
        const txt = this.lines.join("\n");
        const done = () => {
            const b = this.el.querySelector(".at-copy");
            b.textContent = "Copied ✔";
            setTimeout(() => { b.textContent = "Copy"; }, 1200);
        };
        try {
            navigator.clipboard.writeText(txt).then(done, () => this.copyOld(txt, done));
        } catch (e) { this.copyOld(txt, done); }
    },

    // older browsers, or file:// pages without clipboard permission
    copyOld(txt, done) {
        const ta = document.createElement("textarea");
        ta.value = txt;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { /* the text can still be selected by hand */ }
        ta.remove();
    },
};
