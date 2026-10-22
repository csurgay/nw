// The movable borders between canvas, terminal and event log, and the font
// size of the terminal and the log (Ctrl + mouse wheel over them).
// Everything is remembered in the browser for the next visit.
const Layout = {
    KEY: "nw.layout",
    DEF: { side: 460, term: 54, termFont: 12.5, logFont: 11.5 },
    s: null,

    init() {
        this.s = Object.assign({}, this.DEF, this.load());
        this.side = document.getElementById("side");
        this.term = document.querySelector(".panel-term");
        this.apply();
        this.dragger(document.getElementById("splitV"), "col", ev => {
            this.s.side = Math.round(Math.min(window.innerWidth - 320, Math.max(260, window.innerWidth - ev.clientX)));
        }, () => { this.s.side = this.DEF.side; });
        this.dragger(document.getElementById("splitH"), "row", ev => {
            const r = this.side.getBoundingClientRect();
            this.s.term = Math.round(Math.min(88, Math.max(12, (ev.clientY - r.top) / r.height * 100)) * 10) / 10;
        }, () => { this.s.term = this.DEF.term; });
        this.fontWheel(document.getElementById("nwConsole"), "termFont", 8, 30);
        this.fontWheel(document.getElementById("eventLog"), "logFont", 8, 26);
        window.addEventListener("resize", () => {
            // keep the canvas usable when the window gets narrower
            if (this.s.side > window.innerWidth - 320) { this.apply(); }
        });
    },

    load() {
        try { return JSON.parse(localStorage.getItem(this.KEY) || "{}"); } catch (e) { return {}; }
    },
    save() {
        try { localStorage.setItem(this.KEY, JSON.stringify(this.s)); } catch (e) { /* private window */ }
    },

    apply() {
        const w = Math.min(this.s.side, Math.max(260, window.innerWidth - 320));
        this.side.style.width = w + "px";
        this.term.style.flex = `0 0 ${this.s.term}%`;
        document.getElementById("nwConsole").style.fontSize = this.s.termFont + "px";
        document.getElementById("eventLog").style.fontSize = this.s.logFont + "px";
        if (typeof App != "undefined" && App.stage) App.resize();
        terminal.showBottom();
    },

    dragger(el, kind, onMove, onReset) {
        el.addEventListener("pointerdown", ev => {
            if (ev.button != 0) return;
            ev.preventDefault();
            try { el.setPointerCapture(ev.pointerId); } catch (e) { /* synthetic events (UI tests) have no real pointer */ }
            el.classList.add("drag");
            document.body.classList.add("resizing", kind);
            const move = e => { onMove(e); this.apply(); };
            const up = () => {
                el.removeEventListener("pointermove", move);
                el.removeEventListener("pointerup", up);
                el.classList.remove("drag");
                document.body.classList.remove("resizing", kind);
                this.save();
            };
            el.addEventListener("pointermove", move);
            el.addEventListener("pointerup", up);
        });
        el.addEventListener("dblclick", () => { onReset(); this.apply(); this.save(); });
    },

    fontWheel(el, key, min, max) {
        const badge = document.createElement("div");
        badge.className = "fontbadge";
        el.parentElement.appendChild(badge);
        let timer = null;
        el.addEventListener("wheel", ev => {
            if (!ev.ctrlKey && !ev.metaKey) return;
            ev.preventDefault();
            const step = ev.deltaY < 0 ? 0.5 : -0.5;
            this.s[key] = Math.min(max, Math.max(min, Math.round((this.s[key] + step) * 2) / 2));
            this.apply();
            this.save();
            badge.textContent = this.s[key] + " px";
            badge.classList.add("show");
            clearTimeout(timer);
            timer = setTimeout(() => badge.classList.remove("show"), 700);
        }, { passive: false });
    },
};
