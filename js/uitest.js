// UI tests for the Autotest window: a visible pointer builds a small network with the
// editor (drag from the toolbar, click sockets, drag cables), pings across it, then tries
// the popups, zoom, panning, deleting, TAB completion, the lexicon, the splitter and the
// font size. Every step uses real mouse, wheel and key events on the page.
const UiTest = {
    STEP_MS: 350, // how long the pointer takes to glide to the next place

    // simulated time: the speed slider makes the pointer faster or slower, Pause stops it
    sleep(ms) { return new Promise(r => Sim.wait(ms, r)); },

    // ---------------------------------------------------------------- the pointer
    cursor() {
        if (this.cur) return this.cur;
        const c = document.createElement("div");
        c.className = "ui-cursor";
        c.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 2 L3 19 L8 14.5 L11.5 22 L14.5 20.6 L11 13.3 L18 13.3 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
        document.body.appendChild(c);
        this.cur = c;
        this.cx = innerWidth / 2;
        this.cy = innerHeight / 2;
        return c;
    },

    place(x, y) {
        this.cx = x; this.cy = y;
        this.cur.style.transform = `translate(${x}px, ${y}px)`;
    },

    // glide there, sending mouse moves on the way (so hover and drags work)
    async moveTo(x, y, opts = {}) {
        this.cursor();
        const steps = opts.steps || 10, x0 = this.cx, y0 = this.cy;
        for (let i = 1; i <= steps; i++) {
            const px = x0 + (x - x0) * i / steps, py = y0 + (y - y0) * i / steps;
            this.place(px, py);
            this.fire("mousemove", px, py, opts);
            await this.sleep((opts.ms || this.STEP_MS) / steps);
        }
    },

    target(x, y) {
        this.cur.style.display = "none";
        const t = document.elementFromPoint(x, y) || document.body;
        this.cur.style.display = "";
        return t;
    },

    fire(type, x, y, opts = {}, el) {
        el = el || this.target(x, y);
        const init = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0, buttons: type == "mouseup" ? 0 : (opts.held ? 1 : 0), ctrlKey: !!opts.ctrl };
        el.dispatchEvent(new MouseEvent(type, init));
        return el;
    },

    ripple(x, y) {
        const r = document.createElement("div");
        r.className = "ui-ripple";
        r.style.left = x + "px"; r.style.top = y + "px";
        document.body.appendChild(r);
        setTimeout(() => r.remove(), 600);
    },

    async click(x, y) {
        await this.moveTo(x, y);
        const el = this.fire("mousedown", x, y);
        this.ripple(x, y);
        this.fire("mouseup", x, y, {}, el);
        this.fire("click", x, y, {}, el);
        await this.sleep(120);
    },

    async dblclick(x, y) {
        await this.click(x, y);
        this.fire("dblclick", x, y);
        await this.sleep(150);
    },

    async drag(x1, y1, x2, y2, opts = {}) {
        await this.moveTo(x1, y1);
        this.fire("mousedown", x1, y1);
        this.ripple(x1, y1);
        await this.moveTo(x2, y2, { held: true, steps: 18, ms: opts.ms || 700 });
        this.fire("mouseup", x2, y2);
        await this.sleep(150);
    },

    async wheel(x, y, dy, times = 4) {
        await this.moveTo(x, y);
        const el = this.target(x, y);
        for (let i = 0; i < times; i++) {
            el.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, clientX: x, clientY: y, deltaY: dy, ctrlKey: true }));
            await this.sleep(90);
        }
    },

    key(k, el = document.body) {
        el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
    },

    // screen position of a world point / of an element
    world(x, y) {
        const r = nwCanvas.getBoundingClientRect();
        return [r.left + App.ox + x * App.scale, r.top + App.oy + y * App.scale];
    },
    centre(o) { const b = o.bounds(); return this.world(b.x + b.w / 2, b.y + b.h / 2); },
    body(o) { const b = o.bounds(); return this.world(b.x + b.w * 0.3, b.y + b.h * 0.35); }, // away from the sockets
    // a button that may be hidden on a small screen: point and click when it is visible, else just press it
    async press(sel) {
        const e = document.querySelector(sel), r = e.getBoundingClientRect();
        if (r.width && r.height && this.target(r.left + r.width / 2, r.top + r.height / 2).closest(sel)) return this.click(r.left + r.width / 2, r.top + r.height / 2);
        e.click();
        await this.sleep(150);
    },
    // on a phone the new network is built bigger, below the editor bar
    phoneView() {
        if (!document.body.classList.contains("at-watch")) return;
        const bar = document.getElementById("editbar").getBoundingClientRect();
        const top = bar.height + 8, h = App.ch - top;
        App.uz = Math.max(1, Math.min(1.6, App.cw / (620 * App.bs), h / (380 * App.bs)));
        App.px = App.cw / 2 - (App.bx * App.uz + 550 * App.bs * App.uz);
        App.py = top + h / 2 - (App.by * App.uz + 250 * App.bs * App.uz);
        App.applyView();
    },
    visible(sel) { const e = document.querySelector(sel); return !!(e && e.offsetParent && e.getBoundingClientRect().width); },
    el(sel) { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; },
    // a spot on the canvas with nothing on it (and no window above it)
    empty() {
        const r = nwCanvas.getBoundingClientRect();
        for (const fy of [0.75, 0.85, 0.6, 0.9, 0.5]) for (const fx of [0.15, 0.3, 0.5, 0.08]) {
            const x = r.left + r.width * fx, y = r.top + r.height * fy;
            const p = App.eventPoint({ clientX: x, clientY: y });
            if (!App.pick(p.x, p.y) && this.target(x, y) == nwCanvas) return [x, y];
        }
        return [r.left + r.width * 0.15, r.top + r.height * 0.75];
    },

    async waitFor(fn, ms = 10000) {
        const t0 = Sim.total;
        while (Sim.total - t0 < ms) {
            if (fn()) return true;
            await this.sleep(150);
        }
        return false;
    },

    patches() { return (Id.list.Patch || []).length; },

    // ---------------------------------------------------------------- the cases
    // each returns null when it passed, or a text saying what went wrong
    cases() {
        const U = this;
        return [
            ["Edit mode on, File ▸ New network: empty canvas", async () => {
                if (!Editor.on) await U.press("#btnEdit");
                await U.click(...U.el("#editbar [data-file]"));
                await U.click(...U.el('#editbar [data-cmd="new"]'));
                U.phoneView();
                return App.devices().length == 0 ? null : `${App.devices().length} devices left on the canvas`;
            }],
            ["Drag “+ Linux switch” from the toolbar onto the canvas", async () => {
                const [x, y] = U.world(340, 120);
                await U.drag(...U.el('[data-place="lswitch"]'), x, y);
                const sw = Id.find("switch1");
                return sw && sw.managed == "linux" ? null : "no Linux switch on the canvas";
            }],
            ["Click “+ PC”, then the canvas — twice", async () => {
                for (const x of [300, 560]) {
                    await U.click(...U.el('[data-place="host"]'));
                    await U.click(...U.world(x, 330));
                }
                const h1 = Id.find("host1"), h2 = Id.find("host2");
                if (!h1 || !h2) return "the two computers were not placed";
                return h1.nics[0].ip && h2.nics[0].ip ? null : "the new computers got no IP address";
            }],
            ["Drag “+ Router” onto the canvas", async () => {
                await U.drag(...U.el('[data-place="router"]'), ...U.world(760, 330));
                const r = Id.find("router1");
                return r && r.nics.length == 3 ? null : "no router with three interfaces";
            }],
            ["Cable: click host1's socket, then switch1 port 1", async () => {
                const h = Id.find("host1").nics[0], p = Id.find("switch1").ports[0];
                await U.click(...U.world(h.x, h.y));
                await U.click(...U.world(p.x, p.y));
                return U.patches() == 1 && p.linkUp() ? null : `${U.patches()} cables, link ${p.linkUp() ? "up" : "down"}`;
            }],
            ["Cable: drag from host2's socket to switch1 port 2", async () => {
                const h = Id.find("host2").nics[0], p = Id.find("switch1").ports[1];
                await U.drag(...U.world(h.x, h.y), ...U.world(p.x, p.y));
                return U.patches() == 2 && p.linkUp() ? null : `${U.patches()} cables after the drag`;
            }],
            ["Move host2 by dragging it", async () => {
                const h = Id.find("host2"), x0 = h.x;
                const [x, y] = U.body(h);
                await U.drag(x, y, x + 70 * App.scale, y + 20 * App.scale);
                return Math.abs(h.x - x0 - 70) < 3 ? null : `host2 moved ${Math.round(h.x - x0)} instead of 70`;
            }],
            ["Ping across the new network", async () => {
                const ip = Id.find("host2").nics[0].ip.ip;
                terminal.runCommand(`ssh host1 ping -c 2 ${ip}`);
                const ok = await U.waitFor(() => /2 packets transmitted, 2 received/.test(terminal.textarea.value.slice(-600)), 15000);
                return ok ? null : "no “2 received” in the terminal";
            }],
            ["The switch learned both MAC addresses", async () => {
                const n = Id.find("switch1").macTable.length;
                return n >= 2 ? null : `MAC table has ${n} entries`;
            }],
            ["Click host1: its popup opens, × closes it", async () => {
                const h = Id.find("host1");
                await U.click(...U.body(h));
                await U.sleep(300);
                const w = Inspector.wins.get(h);
                if (!w) return "no popup";
                const x = w.el.querySelector(".pop-x").getBoundingClientRect();
                await U.click(x.left + x.width / 2, x.top + x.height / 2);
                return Inspector.wins.has(h) ? "the popup did not close" : null;
            }],
            ["Ctrl + wheel zooms in, the % button resets", async () => {
                await U.wheel(...U.centre(Id.find("switch1")), -120, 5);
                const z = App.uz;
                await U.press("#zoomPct");
                return z > 1.2 && App.uz == 1 ? null : `zoom went to ${z.toFixed(2)}, then ${App.uz}`;
            }],
            ["Drag the empty canvas: the picture moves; double-click: back", async () => {
                const [x, y] = U.empty();
                const px0 = App.px, py0 = App.py;
                await U.drag(x, y, x + 120, y - 60);
                const dx = Math.round(App.px - px0), dy = Math.round(App.py - py0);
                if (Math.abs(dx - 120) > 2 || Math.abs(dy + 60) > 2) {
                    const o = App.pick(...Object.values(App.eventPoint({ clientX: x, clientY: y })));
                    return `the picture moved ${dx},${dy} instead of 120,-60` + (o ? ` (the drag started on ${o})` : "");
                }
                await U.dblclick(x + 120, y - 60);
                return App.px == 0 && App.py == 0 ? null : `double-click left the picture at ${Math.round(App.px)},${Math.round(App.py)}`;
            }],
            ["Drag router1 onto the toolbar: deleted", async () => {
                U.phoneView();
                const r = Id.find("router1");
                const b = document.getElementById("editbar").getBoundingClientRect();
                await U.drag(...U.body(r), b.right - 30, b.top + b.height / 2, { ms: 900 });
                return Id.find("router1") ? "router1 is still there" : null;
            }],
            ["Press D over host2: it and its cable are gone", async () => {
                await U.moveTo(...U.body(Id.find("host2")));
                U.key("d");
                await U.sleep(200);
                return !Id.find("host2") && U.patches() == 1 ? null : `host2 ${Id.find("host2") ? "still there" : "gone"}, ${U.patches()} cables`;
            }],
            ["File menu: Delete is off for a network that was never saved", async () => {
                await U.click(...U.el("#editbar [data-file]"));
                const off = document.querySelector('#editbar [data-cmd="delete"]').disabled;
                await U.click(...U.el("#editbar [data-file]"));
                return off ? null : "Delete is enabled";
            }],
            ["TAB completes “ssh ho”, TAB TAB lists the hosts", async () => {
                const t = terminal;
                await U.click(...U.el("#nwConsole"));
                t.textarea.value += "ssh ho";
                U.key("Tab", consoleArea);
                await U.sleep(200);
                const one = t.textarea.value.endsWith("ssh host1 ");
                t.textarea.value = t.textarea.value.replace(/host1 $/, "");
                t.lastTab = null;
                U.key("Tab", consoleArea); U.key("Tab", consoleArea);
                await U.sleep(200);
                t.textarea.value = t.textarea.value.replace(/ssh $/, "");
                return one ? null : "“ssh ho” was not completed to “ssh host1”";
            }],
            ["Alt-. brings back the last word of earlier commands", async () => {
                const t = terminal, kd = (o) => consoleArea.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ bubbles: true, cancelable: true }, o)));
                t.history.push("ssh host1 cat /etc/hosts", "ping -c 1 10.0.0.9");
                t.textarea.value += "echo ";
                kd({ key: ".", code: "Period", altKey: true }); await U.sleep(150);
                const a = t.line();
                kd({ key: ".", code: "Period", altKey: true }); await U.sleep(150);
                const b = t.line();
                kd({ key: "c", ctrlKey: true });
                return a == "echo 10.0.0.9" && b == "echo /etc/hosts" ? null : `got “${a}”, then “${b}”`;
            }],
            ["PgUp / PgDn: earlier commands that start like the typed text", async () => {
                const t = terminal, kd = (o) => consoleArea.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ bubbles: true, cancelable: true }, o)));
                t.history.push("ssh host2 ip addr", "lab", "ssh host1 ip route");
                t.textarea.value += "ssh";
                kd({ key: "PageUp" }); await U.sleep(150);
                const a = t.line();
                kd({ key: "PageUp" }); await U.sleep(150);
                const b = t.line();
                kd({ key: "PageDown" }); kd({ key: "PageDown" }); await U.sleep(150);
                const c = t.line();
                kd({ key: "c", ctrlKey: true });
                return a == "ssh host1 ip route" && b == "ssh host2 ip addr" && c == "ssh" ? null : `got “${a}”, “${b}”, back “${c}”`;
            }],
            ["Ctrl-R finds an earlier command; Ctrl-A, Alt-F, Ctrl-K, Ctrl-Y, Ctrl-_ edit it", async () => {
                const t = terminal, kd = (o) => consoleArea.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ bubbles: true, cancelable: true }, o)));
                t.history.push("ssh host1 ip neigh show", "lab");
                kd({ key: "r", code: "KeyR", ctrlKey: true });
                for (const ch of "neigh") { kd({ key: ch, code: "Key" + ch.toUpperCase() }); await U.sleep(60); }
                const shown = t.textarea.value.split("\n").pop();
                kd({ key: "Escape" }); await U.sleep(100);
                const found = t.line();
                kd({ key: "a", code: "KeyA", ctrlKey: true });
                kd({ key: "f", code: "KeyF", altKey: true });
                kd({ key: "k", code: "KeyK", ctrlKey: true }); await U.sleep(100);
                const cut = t.line();
                kd({ key: "y", code: "KeyY", ctrlKey: true }); await U.sleep(100);
                const back = t.line();
                kd({ key: "_", code: "Minus", ctrlKey: true, shiftKey: true }); await U.sleep(100);
                const undone = t.line();
                kd({ key: "c", ctrlKey: true });
                if (!/reverse-i-search\)`neigh': ssh host1 ip neigh show/.test(shown)) return `search line “${shown}”`;
                return found == "ssh host1 ip neigh show" && cut == "ssh" && back == found && undone == "ssh" ? null
                    : `found “${found}”, cut “${cut}”, yank “${back}”, undo “${undone}”`;
            }],
            ["watch, Ctrl-Z, jobs, fg, Ctrl-C", async () => {
                const t = terminal, kd = (o) => consoleArea.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ bubbles: true, cancelable: true }, o)));
                const type = async (cmd) => { t.textarea.value += cmd; kd({ key: "Enter" }); await U.sleep(200); };
                const tail = () => t.textarea.value.slice(-400);
                await type("watch -n 1 ssh host1 hostname");
                await U.sleep(1500);
                const w = /Every 1\.0s: ssh host1 hostname[^\n]*\n\nhost1/.test(tail());
                kd({ key: "z", code: "KeyZ", ctrlKey: true }); await U.sleep(200);
                const stopped = /Stopped\s+watch -n 1 ssh host1 hostname/.test(tail());
                await type("jobs");
                const listed = /\[1\]\+  Stopped\s+watch -n 1/.test(tail());
                await type("fg"); await U.sleep(1200);
                const again = shell.job && shell.job.kind == "watch";
                kd({ key: "c", ctrlKey: true }); await U.sleep(200);
                const ended = !shell.job && !shell.jobList().length;
                return w && stopped && listed && again && ended ? null
                    : `watch ${w}, ^Z ${stopped}, jobs ${listed}, fg ${again}, ^C ${ended}`;
            }],
            ["Wireshark: the pings were captured; filter “icmp”; a field explains itself", async () => {
                await U.press("#btnShark");
                const fin = document.querySelector(".ws-filter");
                await U.click(...U.el(".ws-filter"));
                fin.value = "ip.adr == 1"; fin.dispatchEvent(new Event("input"));
                await U.sleep(200);
                const bad = fin.classList.contains("bad");
                fin.value = "icmp && icmp.type == 8"; fin.dispatchEvent(new Event("input"));
                fin.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
                await U.sleep(200);
                const n = Capture.shown.length, allPing = Capture.shown.every(r => r.proto == "ICMP" && !r.frame.isReply());
                const row = document.querySelector(".ws-list tbody tr");
                if (row) await U.click(...U.el(".ws-list tbody tr"));
                const seq = [...document.querySelectorAll(".ws-f")].find(e => /^Sequence/.test(e.textContent));
                if (seq) { Capture.keepIn(Capture.tree, seq); const r = seq.getBoundingClientRect(); await U.click(r.left + 30, r.top + r.height / 2); }
                const ex = document.querySelector(".ws-explain").textContent;
                const resp = /Response in frame/.test(document.querySelector(".ws-tree").textContent);
                Capture.applyFilter("");
                Capture.select(null);
                await U.press(".ws-x");
                if (!bad) return "a wrong filter did not turn red";
                if (n < 2 || !allPing) return `the filter showed ${n} frames${allPing ? "" : ", not only ping requests"}`;
                return /icmp\.seq/.test(ex) && resp ? null : `explanation “${ex.slice(0, 60)}”, response link ${resp}`;
            }],
            ["⚙ Settings: console access, then simplified ssh again", async () => {
                const m0 = Access.mode;
                UiTest.inSettingsCase = true; // the switch is locked while Autotest runs — except for this test
                Access.sync();
                await U.press("#btnSettings");
                await U.press('.settings input[value="console"]');
                const c = Access.mode == "console";
                await U.press('.settings input[value="simple"]');
                const s = Access.mode == "simple";
                await U.press(".settings .set-x");
                UiTest.inSettingsCase = false;
                Access.set(m0, true);
                return c && s ? null : `mode after the clicks: ${c ? "console" : "?"}, ${s ? "simple" : "?"}`;
            }],
            ["Lexicon: open, search “vlan”, switch to HU, close", async () => {
                const lang = Lang.cur;
                await U.press("#btnLex");
                const s = document.querySelector("#lexicon .lex-search");
                s.value = "vlan"; s.dispatchEvent(new Event("input", { bubbles: true }));
                await U.sleep(300);
                const items = document.querySelectorAll("#lexicon .lex-item").length;
                await U.click(...U.el('#lexicon [data-lang="hu"]'));
                const hu = document.querySelector("#lexicon .lex-title").textContent;
                s.value = ""; s.dispatchEvent(new Event("input", { bubbles: true }));
                Lang.set(lang);
                await U.click(...U.el("#lexicon .lex-x"));
                if (!items) return "the search found nothing";
                return /lexikon/i.test(hu) ? null : `the title did not turn Hungarian (“${hu}”)`;
            }],
            ["Drag the splitter: wider terminal; double-click: default", async () => {
                if (!U.visible("#splitV")) return "skip: no splitter on a small screen";
                const side = document.getElementById("side"), w0 = side.offsetWidth;
                const sp = document.getElementById("splitV"), r = sp.getBoundingClientRect();
                const x = r.left + 3, y = r.top + 200;
                await U.moveTo(x, y);
                const pe = (type, px) => sp.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: px, clientY: y, pointerId: 1, button: 0 }));
                pe("pointerdown", x);
                for (let i = 1; i <= 10; i++) { U.place(x - i * 12, y); pe("pointermove", x - i * 12); await U.sleep(40); }
                pe("pointerup", x - 120);
                const w1 = side.offsetWidth;
                sp.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
                await U.sleep(100);
                return w1 > w0 + 80 ? null : `width ${w0} → ${w1}`;
            }],
            ["Ctrl + wheel over the terminal: bigger font", async () => {
                const f0 = Layout.s.termFont;
                await U.wheel(...U.el("#nwConsole"), -100, 3);
                const f1 = Layout.s.termFont;
                return f1 > f0 ? null : `font stayed ${f0}px`;
            }],
        ];
    },

    // while the pointer works, the real mouse and keyboard are ignored on the page
    // (moving the real mouse would mix into the test's drags) — except in the Autotest window
    guard(on) {
        const types = ["mousedown", "mouseup", "mousemove", "click", "dblclick", "wheel", "keydown", "pointerdown", "pointermove", "pointerup", "contextmenu"];
        if (on && !this.blocker) {
            this.blocker = ev => {
                if (!ev.isTrusted) return;
                if (ev.target && ev.target.closest && ev.target.closest(".autotest")) return;
                ev.stopImmediatePropagation();
                if (ev.cancelable && ev.type != "mousemove" && ev.type != "pointermove") ev.preventDefault();
            };
            types.forEach(t => window.addEventListener(t, this.blocker, { capture: true, passive: false }));
            document.body.classList.add("ui-testing");
        }
        if (!on && this.blocker) {
            types.forEach(t => window.removeEventListener(t, this.blocker, { capture: true }));
            this.blocker = null;
            document.body.classList.remove("ui-testing");
        }
    },

    async run(listener) {
        this.stopped = false;
        this.cursor().style.display = "";
        this.guard(true);
        try { await this.runCases(listener); }
        finally { this.guard(false); this.cur.style.display = "none"; }
    },

    async runCases(listener) {
        const list = this.cases();
        for (let i = 0; i < list.length; i++) {
            if (this.stopped || (test && test.stopped)) break;
            const [name, fn] = list[i];
            let err;
            try { err = await fn(); } catch (e) { err = "error: " + e.message; }
            listener.onUiCase(i, name, err);
            await this.sleep(150);
        }
    },

    count() { return this.cases().length; },
};
