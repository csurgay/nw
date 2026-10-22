// Simulation clock: everything that moves or waits uses Sim time, so
// pausing freezes cables, ping intervals, ARP waits and LLDP timers alike.
class Sim {
    static time = 0;
    static total = 0;         // simulated ms since the page opened — never reset (tests wait on it)          // simulated milliseconds since load
    static running = true;
    static stepping = false;  // run until the next network event, then pause
    static pauseAfterTick = false;
    static speed = 1;
    static SPEEDS = [0.25, 0.5, 1, 2, 4, 8];
    static HOP_MS = 1000;     // base time for a frame to cross a cable
    static timers = [];
    static listeners = [];

    static STEP = 20;         // the simulation moves in steps of at most this many ms

    // one animation frame: at high speed the time is cut into small steps, so a frame that
    // arrives can go on at once — the network behaves the same at 0.25× and at 8×
    static update(realDt) {
        if (!Sim.running) return;
        let left = Math.min(realDt, 100) * Sim.speed;
        while (left > 0 && Sim.running) {
            const dt = Math.min(left, Sim.STEP);
            left -= dt;
            Sim.time += dt;
            Sim.total += dt;
            Sim.timers.sort((a, b) => a.t - b.t);
            while (Sim.timers.length && Sim.timers[0].t <= Sim.time) {
                const tm = Sim.timers.shift();
                if (!tm.cancelled) tm.fn();
            }
            (Id.list["Patch"] || []).forEach(p => p.update(dt));
            if (Sim.pauseAfterTick) {
                Sim.pauseAfterTick = false;
                Sim.pause();
            }
        }
    }

    // wait ms of simulated time, even across lab loads (Sim.time and its timers are reset there):
    // faster with the speed slider, slower when slowed down, not at all while paused
    static wait(ms, fn) {
        const end = Sim.total + ms;
        const h = { cancelled: false, cancel() { this.cancelled = true; } };
        const poll = () => {
            if (h.cancelled) return;
            if (Sim.total >= end) fn(); else setTimeout(poll, 15);
        };
        setTimeout(poll, 15);
        return h;
    }

    static after(ms, fn) {
        const tm = { t: Sim.time + ms, fn, cancelled: false, cancel() { this.cancelled = true; } };
        Sim.timers.push(tm);
        return tm;
    }

    static play() { Sim.running = true; Sim.stepping = false; Sim.notify(); }
    static pause() { Sim.running = false; Sim.stepping = false; Sim.notify(); }
    static toggle() { Sim.running && !Sim.stepping ? Sim.pause() : Sim.play(); }
    static step() { Sim.stepping = true; Sim.running = true; Sim.notify(); }
    static setSpeed(s) { Sim.speed = s; Sim.notify(); }
    static onChange(fn) { Sim.listeners.push(fn); }
    static notify() { Sim.listeners.forEach(fn => fn()); }

    // Report something that happened in the network.
    // kind: cmd | tx | rx | drop | hub | l3 | info
    static event(kind, text, opts = {}) {
        const e = Object.assign({ t: Sim.time, kind, text }, opts);
        EventLog.add(e);
        if (Sim.stepping && kind != "cmd") Sim.pauseAfterTick = true;
        return e;
    }

    static fmt(t = Sim.time) {
        return (t / 1000).toFixed(2) + "s";
    }
}

class EventLog {
    static el = null;
    static entries = [];
    static MAX = 500;

    static init(el) {
        EventLog.el = el;
        EventLog.renderEmpty();
    }

    static renderEmpty() {
        if (!EventLog.el) return;
        EventLog.el.innerHTML = '<div class="empty">Nothing has happened on the wire yet. ' +
            'Try a command below the terminal — every frame sent, repeated, accepted or ' +
            'dropped will be listed here. Click a line to inspect that frame.</div>';
    }

    static clear() {
        EventLog.entries = [];
        EventLog.renderEmpty();
        EventLog.count();
    }

    static protoColor(proto) {
        return { ARP: "var(--arp)", ICMP: "var(--icmp)", LLDP: "var(--lldp)", IPv4: "var(--ipv4)", DHCP: "var(--dhcp)", DNS: "var(--dns)", UDP: "var(--udp)", CMD: "var(--ok)", INFO: "var(--muted)" }[proto] || "var(--muted)";
    }

    static add(e) {
        EventLog.entries.push(e);
        if (!EventLog.el) return;
        if (EventLog.entries.length == 1) EventLog.el.innerHTML = "";
        const atBottom = EventLog.el.scrollTop + EventLog.el.clientHeight >= EventLog.el.scrollHeight - 30;
        const proto = e.proto || (e.frame ? e.frame.proto() : (e.kind == "cmd" ? "CMD" : "INFO"));
        const label = { cmd: "$", tx: "TX", rx: "RX", drop: "DROP", hub: "HUB", sw: "SW", rt: "RTR", l3: proto, info: "i" }[e.kind] || e.kind;
        const row = document.createElement("div");
        row.className = "ev new " + e.kind + ((e.frame || e.obj) ? " link" : "");
        row.innerHTML = `<span class="t">${Sim.fmt(e.t)}</span>` +
            `<span class="k" style="--c:${e.kind == "drop" ? "var(--drop)" : EventLog.protoColor(proto)}">${label}</span>` +
            `<span class="x">${e.text}</span>`;
        if (e.frame || e.obj) {
            row.addEventListener("click", ev => Inspector.open(e.frame || e.obj, { x: ev.clientX - 420, y: ev.clientY - 60 }));
        }
        if (typeof Lexicon != "undefined") Lexicon.linkify(row.querySelector(".x"));
        EventLog.el.appendChild(row);
        while (EventLog.el.children.length > EventLog.MAX) EventLog.el.removeChild(EventLog.el.firstChild);
        if (atBottom) EventLog.el.scrollTop = EventLog.el.scrollHeight;
        EventLog.count();
    }

    static count() {
        const c = document.getElementById("logCount");
        if (c) c.textContent = EventLog.entries.length ? EventLog.entries.length + " events" : "";
    }
}

// Escape text for HTML output in the log and in popups
function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
