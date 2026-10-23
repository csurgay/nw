// Builds a network from a TOPOLOGIES entry, and resets the simulator between labs.
const Topology = {
    current: null,

    // forget every device, frame, timer and log entry
    reset() {
        Array.from(Inspector.wins.keys()).forEach(o => Inspector.close(o));
        if (shell.job) { shell.job.cancel(false); shell.job = null; }
        shell.host = null;
        shell.jobs = [];
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

    // "host3" -> first NIC, "router1:2" -> 2nd interface, "hub1:4" -> port 4
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

    // static routes of a router, "192.168.2.0/24 via 10.0.0.2" or "default via ..."
    applyRoutes(r, routes) {
        (routes || []).forEach(rt => {
            const m = rt.match(/^(\S+)\s+via\s+(\S+)$/);
            if (!m) return;
            if (m[1] == "default") r.l3.routing.addDefault(m[2]);
            else {
                const [net, cidr] = m[1].split("/");
                r.l3.routing.addStatic(net, parseInt(cidr), m[2]);
            }
        });
    },

    build(spec) {
        const names = [];
        spec.devices.forEach(d => {
            if (d.type == "host" || d.type == "server") {
                const nic = d.ip && d.ip != "dhcp" ? this.makeNic(d.ip) : new NIC(0, 0, new MAC("same"));
                const C = d.type == "server" ? Server : Host;
                const h = new C(d.x, d.y, terminal, { nicSide: d.nic || "right", mirror: d.mirror });
                h.addNic(nic);
                h.useDhcp = d.ip == "dhcp";
                if (d.gw) h.l3.routing.addDefault(d.gw);
                if (d.dns) h.dnsServer = d.dns;
                if (d.domain) h.domain = d.domain;
                if (d.type == "server") h.startServices({ dhcp: d.dhcp, dns: d.zone });
                h.spec = d; // what a reboot goes back to
                if (d.name) names.push([h, d.name]);
            }
            else if (d.type == "hub") new Hub(d.x, d.y, d.ports || 4);
            else if (d.type == "switch") {
                const sw = new Switch(d.x, d.y, d.ports || 4, d.managed);
                // VLANs need a managed switch: an unmanaged one keeps every port in one network
                if (sw.managed) Object.entries(d.vlans || {}).forEach(([n, v]) => {
                    const p = sw.ports[parseInt(n) - 1];
                    if (p) sw.setPortVlan(p, v, true);
                });
                if (sw.managed) Object.entries(d.descs || {}).forEach(([n, t]) => { const p = sw.ports[parseInt(n) - 1]; if (p) p.desc = t; });
                sw.spec = d;
                if (d.name) names.push([sw, d.name]);
                sw.ready = true;
            }
            else if (d.type == "router") {
                const r = new Router(d.x, d.y, terminal, { w: d.w });
                d.ifs.forEach(f => r.addNic(this.makeNic(f.ip), f.side || "left"));
                this.applyRoutes(r, d.routes);
                r.spec = d;
                if (d.name) names.push([r, d.name]);
            }
        });
        spec.links.forEach(([a, b, opts]) => new Patch(this.endpoint(a), this.endpoint(b), opts || {}));
        // own names last: the links above use the standard names
        names.forEach(([h, n]) => h.rename(n, true));
        // what a managed switch has saved: its configuration right now
        (Id.list.Switch || []).forEach(sw => { if (sw.ready) { sw.saveStartup(); sw.ready = false; } });
    },

    all() {
        return TOPOLOGIES.concat(typeof Editor != "undefined" ? Editor.mine() : []);
    },

    // "6 · A router joins two networks"
    // localized: the menu and lab bar; not localized: shell messages (the tests read them)
    title(spec, localized) {
        const i = this.all().indexOf(spec);
        return (i >= 0 && !spec.mine ? (i + 1) + " · " : "") + (localized ? Lang.t(spec, "title") : spec.title);
    },

    load(id, opts = {}) {
        const spec = this.all().find(t => t.id == id) || this.all()[0];
        this.loadSpec(spec, opts);
    },

    loadSpec(spec, opts = {}) {
        this.reset();
        Vfs.BOOT = new Date(); // the lab machines "boot" now
        if (typeof Editor != "undefined") Editor.edited = false;
        this.build(spec);
        this.current = spec;
        App.zones = spec.zones || [];
        App.fit();
        App.setTries(spec.tries || []);
        this.syncUI();
        if (spec.id != "new") try { history.replaceState(null, "", "#lab=" + spec.id); } catch (e) { /* file:// may refuse */ }
        Sim.event("info", `Lab loaded: <b>${esc(this.title(spec))}</b>`);
        if (opts.fromShell && !terminal.booting) {
            terminal.println("Loaded lab: " + this.title(spec));
        }
    },

    fromHash() {
        const m = (location.hash || "").match(/lab=([\w-]+)/);
        return m && this.all().some(t => t.id == m[1]) ? m[1] : null;
    },

    initUI() {
        const sel = document.getElementById("labSelect");
        this.fillSelect();
        const go = id => { if (id && (!this.current || id != this.current.id)) terminal.runCommand("lab " + id); };
        sel.addEventListener("change", () => go(sel.value));
        const step = d => {
            const all = this.all(), i = all.findIndex(t => t.id == this.current.id);
            const t = all[i + d];
            if (t) go(t.id);
        };
        document.getElementById("labPrev").addEventListener("click", () => step(-1));
        document.getElementById("labNext").addEventListener("click", () => step(1));
    },

    fillSelect() {
        const sel = document.getElementById("labSelect");
        const mine = typeof Editor != "undefined" ? Editor.mine() : [];
        const hu = Lang.cur == "hu";
        sel.innerHTML = `<optgroup label="${hu ? "Leckék" : "Lessons"}">` + TOPOLOGIES.map(t => `<option value="${t.id}">${esc(this.title(t, true))}</option>`).join("") + `</optgroup>` +
            (mine.length ? `<optgroup label="${hu ? "Saját hálózataim" : "My networks"}">` + mine.map(t => `<option value="${t.id}">${esc(t.title)}</option>`).join("") + `</optgroup>` : "") +
            (this.current && this.current.id == "new" ? `<option value="new">New network</option>` : "");
    },

    syncUI() {
        const sel = document.getElementById("labSelect");
        if (!sel || !this.current) return;
        if (this.current.id == "new" && !sel.querySelector('option[value="new"]')) this.fillSelect();
        sel.value = this.current.id;
        const g = document.getElementById("labGoal");
        g.textContent = Lang.t(this.current, "goal") || "";
        Lexicon.linkify(g);
        const all = this.all(), i = all.findIndex(t => t.id == this.current.id);
        document.getElementById("labPrev").disabled = i <= 0;
        document.getElementById("labNext").disabled = i < 0 || i >= all.length - 1;
    },
};
