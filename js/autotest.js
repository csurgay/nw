// File ▸ Autotest: runs the whole test suite and shows every case in a window,
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
    },

    build() {
        const el = document.createElement("div");
        el.className = "autotest";
        el.hidden = true;
        el.innerHTML = `<div class="at-h"><span class="at-logo">✔</span><b>Autotest</b><span class="at-status"></span>
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
        this.btnRun.addEventListener("click", () => this.running ? test.stop() : this.run());
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
        this.total = Test.case.length;
        this.running = true;
        this.btnRun.textContent = "Stop";
        this.add("head", `NetLab autotest · ${new Date().toLocaleString()} · ${this.total} cases`);
        this.add("head", "The terminal shows what is typed; this takes a few minutes in real time.\n");
        this.tick();
        this.timer = setInterval(() => this.tick(), 500);
        test.listener = this;
        if (shell.job) { shell.job.cancel(false); shell.job = null; }
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
                this.add("bad dim", `        expected: ${JSON.stringify(f.want)}`);
                this.add("bad dim", `        got:      ${JSON.stringify(f.got == null ? "" : f.got)}`);
            });
        }
        this.tick(i + 1);
    },

    onDone(ok, stopped) {
        clearInterval(this.timer);
        this.running = false;
        this.btnRun.textContent = "Run again";
        test.listener = null;
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
