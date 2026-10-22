// Draggable, live-updating popup windows that show the inner state of any
// object that implements inspect() (and optionally actions()).
class Inspector {
    static wins = new Map(); // object -> window record
    static z = 100;
    static root = null;
    static lastRefresh = 0;

    static target(obj) {
        // a hub port opens its hub
        if (obj instanceof Port && !(obj instanceof NIC) && obj.hub) return obj.hub;
        return obj;
    }

    static isOpen(obj) {
        return Inspector.wins.has(obj);
    }

    static open(obj, at) {
        obj = Inspector.target(obj);
        if (!obj || !obj.inspect) return;
        Inspector.root = Inspector.root || document.getElementById("popups");
        let w = Inspector.wins.get(obj);
        if (w) {
            Inspector.front(w);
            w.el.classList.remove("flash");
            void w.el.offsetWidth;
            w.el.classList.add("flash");
            return w;
        }
        const data = obj.inspect();
        const el = document.createElement("div");
        el.className = "pop" + (data.wide ? " wide" : "");
        el.style.setProperty("--c", data.color || "#38bdf8");
        el.innerHTML = `<div class="pop-h"><div class="pop-badge"${(data.badge || "").length > 3 ? ' style="font-size:9px"' : ""}>${esc(data.badge || "")}</div>
            <div><div class="pop-title">${esc(data.title)}</div><div class="pop-sub"></div></div>
            <button class="pop-x" title="Close">×</button></div>
            <div class="pop-b"></div>`;
        w = { obj, el, secs: {}, body: el.querySelector(".pop-b"), sub: el.querySelector(".pop-sub") };
        Inspector.root.appendChild(el);
        Inspector.wins.set(obj, w);

        // position: near the click, staggered, kept on screen
        const n = Inspector.wins.size - 1;
        const width = data.wide ? 560 : 400;
        let x = at ? at.x : 80 + n * 26, y = at ? at.y : 70 + n * 26;
        x = Math.max(8, Math.min(x, window.innerWidth - width - 8));
        y = Math.max(58, Math.min(y, window.innerHeight - 260));
        el.style.left = x + "px";
        el.style.top = y + "px";

        el.querySelector(".pop-x").addEventListener("click", () => Inspector.close(obj));
        el.addEventListener("pointerdown", () => Inspector.front(w));
        Inspector.drag(w, el.querySelector(".pop-h"));
        Inspector.bindHover(w);
        el.addEventListener("click", ev => {
            const t = ev.target.closest("[data-open],[data-host]");
            if (!t) return;
            if (t.dataset.open) Inspector.open(Frame.registry.get(parseInt(t.dataset.open)), { x: ev.clientX + 20, y: ev.clientY - 40 });
            if (t.dataset.host) Inspector.open(Id.find(t.dataset.host), { x: ev.clientX + 20, y: ev.clientY - 40 });
        });

        el.addEventListener("change", ev => {
            const t = ev.target.closest("[data-act]");
            if (t && obj.onInput) { obj.onInput(t.dataset.act, t.value, t); Inspector.render(w); }
        });
        if (obj.actions) Inspector.buildActions(w, obj.actions());
        Inspector.render(w, data);
        Inspector.front(w);
        // keep the whole window on screen
        const h = el.offsetHeight;
        if (y + h > window.innerHeight - 8) el.style.top = Math.max(58, window.innerHeight - 8 - h) + "px";
        return w;
    }

    static close(obj) {
        const w = Inspector.wins.get(obj);
        if (!w) return;
        w.el.remove();
        Inspector.wins.delete(obj);
    }

    static front(w) {
        w.el.style.zIndex = ++Inspector.z;
    }

    static render(w, data) {
        data = data || w.obj.inspect();
        w.sub.textContent = data.sub || "";
        data.sections.forEach((s, i) => {
            const key = s.key || s.h || i;
            let rec = w.secs[key];
            if (!rec) {
                const sec = document.createElement("div");
                sec.className = "sec";
                sec.innerHTML = `<div class="sec-h">${esc(s.h)}</div><div class="sec-b"></div>`;
                w.body.appendChild(sec);
                rec = w.secs[key] = { el: sec, b: sec.querySelector(".sec-b"), html: null, once: s.once };
            }
            if (rec.once && rec.html != null) return;
            if (rec.html !== s.html) {
                rec.b.innerHTML = s.html;
                rec.html = s.html;
                if (typeof Lexicon != "undefined") Lexicon.linkify(rec.b);
            }
        });
    }

    static buildActions(w, acts) {
        if (!acts || !acts.length) return;
        const f = document.createElement("div");
        f.className = "pop-f";
        let input = null;
        acts.forEach(a => {
            if (a.sep) {
                const s = document.createElement("div");
                s.className = "sep";
                f.appendChild(s);
            } else if (a.input != null) {
                input = document.createElement("input");
                input.value = a.input;
                input.spellcheck = false;
                input.title = a.title || "Destination IP address";
                f.appendChild(input);
            } else {
                const b = document.createElement("button");
                const myInput = input; // each button uses the input box before it
                b.className = "act";
                const val = v => typeof v == "function" ? v() : v;
                const label = () => {
                    b.textContent = val(a.label);
                    b.title = (val(a.cmd) || a.tpl || "").replace("{}", "<…>");
                };
                label();
                if (typeof a.label == "function") (w.live = w.live || []).push(label);
                if (myInput) b.dataset.forInput = "1";
                b.addEventListener("click", () => {
                    const cmd = val(a.cmd) || a.tpl.replace("{}", (myInput ? myInput.value.trim() : ""));
                    terminal.runCommand(cmd);
                    label();
                });
                f.appendChild(b);
            }
        });
        f.querySelectorAll("input").forEach(inp => {
            inp.addEventListener("keydown", ev => {
                ev.stopPropagation();
                if (ev.key != "Enter") return;
                // Enter runs the first button that belongs to this input
                let n = inp.nextElementSibling;
                while (n && !n.classList.contains("act")) n = n.nextElementSibling;
                if (n) n.click();
            });
        });
        w.el.appendChild(f);
    }

    static drag(w, handle) {
        let sx, sy, ox, oy;
        const move = ev => {
            w.el.style.left = Math.max(0, Math.min(window.innerWidth - 60, ox + ev.clientX - sx)) + "px";
            w.el.style.top = Math.max(0, Math.min(window.innerHeight - 30, oy + ev.clientY - sy)) + "px";
        };
        const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
        handle.addEventListener("pointerdown", ev => {
            if (ev.target.closest(".pop-x")) return;
            sx = ev.clientX; sy = ev.clientY;
            ox = parseFloat(w.el.style.left); oy = parseFloat(w.el.style.top);
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
            ev.preventDefault();
        });
    }

    // hex dump / field tree cross-highlighting for frames
    static bindHover(w) {
        if (!(w.obj instanceof Frame)) return;
        const fr = w.obj;
        const clear = () => w.el.querySelectorAll(".hl").forEach(e => e.classList.remove("hl"));
        const mark = (s, l, fieldIdx) => {
            clear();
            w.el.querySelectorAll("[data-b]").forEach(e => {
                const b = +e.dataset.b;
                if (b >= s && b < s + l) e.classList.add("hl");
            });
            w.el.querySelectorAll(".layers > div").forEach(e => {
                const ls = +e.dataset.s, ll = +e.dataset.l;
                if (s >= ls && s < ls + ll) e.classList.add("hl");
            });
            const ex = w.el.querySelector(".explain");
            const wire = fr.wire();
            if (fieldIdx != null) {
                const f = wire.fields[fieldIdx];
                w.el.querySelector(`.F[data-d="${fieldIdx}"]`)?.classList.add("hl");
                if (ex) { ex.innerHTML = `${f.desc}<div class="note mono" style="margin-top:5px">bytes ${f.start}–${f.start + f.len - 1} · ${f.len} byte${f.len > 1 ? "s" : ""} · ${esc(f.layer.name)}</div>`; Lexicon.linkify(ex); }
            } else if (ex) {
                const L = wire.layers.find(L => L.start == s);
                if (L) { ex.innerHTML = `<b>${esc(L.name)}</b> — ${L.desc}<div class="note mono" style="margin-top:5px">bytes ${s}–${s + l - 1} · ${l} bytes</div>`; Lexicon.linkify(ex); }
            }
        };
        w.el.addEventListener("mouseover", ev => {
            const fEl = ev.target.closest(".F");
            if (fEl) return mark(+fEl.dataset.s, +fEl.dataset.l, +fEl.dataset.d);
            const lEl = ev.target.closest(".Lh, .layers > div");
            if (lEl) return mark(+lEl.dataset.s, +lEl.dataset.l, null);
            const bEl = ev.target.closest("[data-b]");
            if (bEl) {
                const b = +bEl.dataset.b;
                const wire = fr.wire();
                const idx = wire.fields.findIndex(f => b >= f.start && b < f.start + f.len);
                if (idx >= 0) mark(wire.fields[idx].start, wire.fields[idx].len, idx);
            }
        });
    }

    // refresh every open window a few times a second
    static tick(now) {
        if (now - Inspector.lastRefresh < 250) return;
        Inspector.lastRefresh = now;
        Inspector.wins.forEach(w => {
            Inspector.render(w);
            if (w.live) w.live.forEach(f => f());
        });
    }
}
