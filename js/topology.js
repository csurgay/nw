// Builds a network from a TOPOLOGIES entry, and resets the simulator between labs.
const Topology = {
    current: null,

    // forget every device, frame, timer and log entry
    reset() {
        Array.from(Inspector.wins.keys()).forEach(o => Inspector.close(o));
        if (shell.job) { shell.job.cancel(false); shell.job = null; }
        shell.host = null;
        terminal.quitToConsole();
        for (const k in Id.types) {
            if (k == "Test") continue;
            Id.types[k] = 0;
            Id.list[k] = [];
        }
        MAC.macs = [LLDP.MULTICAST];
        Frame.registry.clear();
        Frame.counter = 0;
        Sim.timers = [];
        Sim.time = 0;
        Sim.pauseAfterTick = false;
        EventLog.clear();
        App.hover = null;
    },

    // "Host3" -> first NIC, "Router1:2" -> 2nd interface, "Hub1:4" -> port 4
    endpoint(ref) {
        const [name, num] = ref.split(":");
        const o = Id.find(name);
        if (!o) throw new Error("Topology: unknown device " + name);
        const i = (num ? parseInt(num) : 1) - 1;
        const p = o instanceof Host ? o.nics[i] : o.ports[i];
        if (!p) throw new Error("Topology: " + ref + " does not exist");
        return p;
    },

    makeNic(cidrIp) {
        const [ip, cidr] = cidrIp.split("/");
        const nic = new NIC(0, 0, new MAC("same"));
        nic.addIP(new IP(ip, parseInt(cidr || 24)));
        return nic;
    },

    build(spec) {
        spec.devices.forEach(d => {
            if (d.type == "host") {
                const nic = this.makeNic(d.ip);
                const h = new Host(d.x, d.y, terminal, { nicSide: d.nic || "right", mirror: d.mirror });
                h.addNic(nic);
                if (d.gw) h.l3.routing.addDefault(d.gw);
            }
            else if (d.type == "hub") new Hub(d.x, d.y, d.ports || 4);
            else if (d.type == "switch") new Switch(d.x, d.y, d.ports || 4);
            else if (d.type == "router") {
                const r = new Router(d.x, d.y, terminal, { w: d.w });
                d.ifs.forEach(f => r.addNic(this.makeNic(f.ip), f.side || "left"));
                (d.routes || []).forEach(rt => {
                    const m = rt.match(/^(\S+)\s+via\s+(\S+)$/);
                    if (!m) return;
                    if (m[1] == "default") r.l3.routing.addDefault(m[2]);
                    else {
                        const [net, cidr] = m[1].split("/");
                        r.l3.routing.addStatic(net, parseInt(cidr), m[2]);
                    }
                });
            }
        });
        spec.links.forEach(([a, b, opts]) => new Patch(this.endpoint(a), this.endpoint(b), opts || {}));
    },

    load(id, opts = {}) {
        const spec = TOPOLOGIES.find(t => t.id == id) || TOPOLOGIES[0];
        this.reset();
        this.build(spec);
        this.current = spec;
        App.zones = spec.zones || [];
        App.fit();
        App.setTries(spec.tries || []);
        this.syncUI();
        try { history.replaceState(null, "", "#lab=" + spec.id); } catch (e) { /* file:// may refuse */ }
        Sim.event("info", `Lab loaded: <b>${esc(spec.title)}</b>`);
        if (opts.fromShell && !terminal.booting) {
            terminal.println("Loaded lab: " + spec.title);
        }
    },

    fromHash() {
        const m = (location.hash || "").match(/lab=([\w-]+)/);
        return m && TOPOLOGIES.some(t => t.id == m[1]) ? m[1] : null;
    },

    initUI() {
        const sel = document.getElementById("labSelect");
        sel.innerHTML = TOPOLOGIES.map(t => `<option value="${t.id}">${esc(t.title)}</option>`).join("");
        const go = id => { if (id && (!this.current || id != this.current.id)) terminal.runCommand("lab " + id); };
        sel.addEventListener("change", () => go(sel.value));
        const step = d => {
            const i = TOPOLOGIES.findIndex(t => t == this.current);
            const t = TOPOLOGIES[i + d];
            if (t) go(t.id);
        };
        document.getElementById("labPrev").addEventListener("click", () => step(-1));
        document.getElementById("labNext").addEventListener("click", () => step(1));
    },

    syncUI() {
        const sel = document.getElementById("labSelect");
        if (!sel || !this.current) return;
        sel.value = this.current.id;
        document.getElementById("labGoal").textContent = this.current.goal || "";
        const i = TOPOLOGIES.indexOf(this.current);
        document.getElementById("labPrev").disabled = i <= 0;
        document.getElementById("labNext").disabled = i >= TOPOLOGIES.length - 1;
    },
};
