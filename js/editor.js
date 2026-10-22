// Topology editor: add, move, cable and delete devices; save your own networks.
const Editor = {
    on: false,
    tool: "move", // move | cable | delete | place:<type>
    drag: null, // {obj, x, y, moved}
    cableFrom: null, // first port while cabling
    mouse: { x: 0, y: 0 },
    edited: false,
    KEY: "nw.mylabs",

    // ---------- saved networks ----------
    mine() {
        try { return JSON.parse(localStorage.getItem(this.KEY) || "[]").map(t => Object.assign(t, { mine: true })); }
        catch (e) { return []; }
    },

    storeMine(list) {
        try { localStorage.setItem(this.KEY, JSON.stringify(list)); return true; }
        catch (e) { alert("Your browser does not allow saving here (" + e.message + "). Use Export instead."); return false; }
    },

    // ---------- UI ----------
    initUI() {
        const bar = document.getElementById("editbar");
        const tools = [
            ["move", "✥ Move", "Drag devices around; click one to configure it"],
            ["cable", "⌇ Cable", "Click a free socket, then another one"],
            ["delete", "✕ Delete", "Click a device or a cable to remove it"],
            null,
            ["place:host", "+ PC", "Add a computer"],
            ["place:server", "+ Server", "Add a server"],
            ["place:hub", "+ Hub", "Add a 4-port hub"],
            ["place:switch", "+ Switch", "Add a 4-port switch"],
            ["place:switch8", "+ Switch 8", "Add an 8-port switch"],
            ["place:router", "+ Router", "Add a router with three interfaces"],
            null,
            ["save", "Save", "Save in this browser (appears under “My networks”)"],
            ["export", "Export", "Download as a .json file"],
            ["import", "Import", "Load a .json file"],
            ["new", "New", "Start an empty network"],
        ];
        bar.innerHTML = tools.map(t => t ? `<button class="etool" data-tool="${t[0]}" title="${t[2]}">${t[1]}</button>` : `<span class="esep"></span>`).join("") +
            `<input type="file" id="importFile" accept=".json,application/json" hidden>`;
        bar.addEventListener("click", ev => {
            const b = ev.target.closest("[data-tool]");
            if (!b) return;
            const t = b.dataset.tool;
            if (t == "save") return this.save();
            if (t == "export") return this.exportFile();
            if (t == "import") return document.getElementById("importFile").click();
            if (t == "new") return this.newNetwork();
            this.setTool(t);
        });
        document.getElementById("importFile").addEventListener("change", ev => this.importFile(ev.target.files[0]));
        document.getElementById("btnEdit").addEventListener("click", () => this.toggle());
        window.addEventListener("keydown", ev => {
            if (!this.on || ev.key != "Escape") return;
            this.cableFrom = null;
            this.setTool("move");
        });
    },

    toggle(on = !this.on) {
        this.on = on;
        document.getElementById("editbar").hidden = !on;
        document.getElementById("btnEdit").classList.toggle("active", on);
        document.getElementById("canvasWrap").classList.toggle("editing", on);
        this.setTool("move");
    },

    setTool(t) {
        this.tool = t;
        this.cableFrom = null;
        document.querySelectorAll("#editbar .etool").forEach(b => b.classList.toggle("active", b.dataset.tool == t));
        const hint = {
            move: "Drag devices · click to configure · Esc = stop",
            cable: "Click a free socket, then a second one",
            delete: "Click a device or a cable to delete it",
        }[t] || "Click on the canvas to place it";
        document.getElementById("editHint").textContent = hint;
    },

    changed() {
        if (!this.edited) {
            this.edited = true;
            App.zones = []; // the dashed boxes no longer match
        }
    },

    // ---------- mouse ----------
    portsOf(d) {
        return d instanceof Host ? d.nics : d.ports || [];
    },

    deviceOf(obj) {
        if (obj instanceof Port) return obj.host || obj.hub;
        return obj;
    },

    isDevice(o) {
        return o instanceof Host || o instanceof Hub;
    },

    // returns true if the editor used the event
    mousedown(p, obj) {
        if (!this.on || this.tool != "move" || !obj) return false;
        const d = this.deviceOf(obj);
        if (!this.isDevice(d)) return false;
        this.drag = { obj: d, x: p.x, y: p.y, moved: false };
        return true;
    },

    mousemove(p) {
        this.mouse = p;
        if (!this.drag) return false;
        const dx = p.x - this.drag.x, dy = p.y - this.drag.y;
        if (!this.drag.moved && Math.hypot(dx, dy) < 3) return true;
        this.drag.moved = true;
        this.moveDevice(this.drag.obj, dx, dy);
        this.drag.x = p.x; this.drag.y = p.y;
        return true;
    },

    mouseup() {
        const d = this.drag;
        this.drag = null;
        return !!(d && d.moved);
    },

    // a click on the canvas in edit mode; returns true if handled
    click(p, obj) {
        if (!this.on) return false;
        if (this.tool.startsWith("place:")) {
            this.place(this.tool.slice(6), p);
            this.setTool("move");
            return true;
        }
        if (this.tool == "cable") {
            const port = obj instanceof Port ? obj : null;
            if (!port) { this.cableFrom = null; return true; }
            if (port.connected) { this.flash("That socket already has a cable"); return true; }
            if (!this.cableFrom) { this.cableFrom = port; return true; }
            if (port == this.cableFrom || this.deviceOf(port) == this.deviceOf(this.cableFrom)) { this.cableFrom = null; return true; }
            const pt = new Patch(this.cableFrom, port, {});
            Sim.event("info", `New cable: ${pt.endName(pt.ports[0])} ⇄ ${pt.endName(pt.ports[1])} — link LEDs go green`, { obj: pt });
            this.cableFrom = null;
            this.changed();
            return true;
        }
        if (this.tool == "delete") {
            if (!obj) return true;
            if (obj instanceof Patch) this.removePatch(obj);
            else if (obj instanceof Frame) return true;
            else this.removeDevice(this.deviceOf(obj));
            this.changed();
            return true;
        }
        return false;
    },

    flash(text) {
        const h = document.getElementById("editHint");
        h.textContent = text;
        h.classList.add("warn");
        setTimeout(() => { h.classList.remove("warn"); this.setTool(this.tool); }, 1600);
    },

    // ---------- changing the network ----------
    moveDevice(d, dx, dy) {
        d.x += dx; d.y += dy;
        this.portsOf(d).forEach(p => { p.x += dx; p.y += dy; });
        (Id.list["Patch"] || []).forEach(pt => { pt._path = null; });
        this.changed();
    },

    nextIp() {
        const used = new Set();
        App.devices().forEach(d => (d.nics || []).forEach(n => { if (n.ip) used.add(n.ip.ip); }));
        for (let i = 10; i < 255; i++) if (!used.has("192.168.1." + i)) return "192.168.1." + i;
        return null;
    },

    place(type, p) {
        let d;
        if (type == "host" || type == "server") {
            const nic = new NIC(0, 0, new MAC("same"));
            const ip = this.nextIp();
            if (ip) nic.addIP(new IP(ip, 24));
            d = new (type == "server" ? Server : Host)(p.x - 39, p.y - 40, terminal, { nicSide: "up" });
            d.addNic(nic);
        }
        else if (type == "hub") d = new Hub(p.x - 135, p.y - 26, 4);
        else if (type == "switch") d = new Switch(p.x - 135, p.y - 26, 4);
        else if (type == "switch8") d = new Switch(p.x - 203, p.y - 26, 8);
        else if (type == "router") {
            d = new Router(p.x - 75, p.y - 28, terminal);
            ["left", "right", "down"].forEach(side => d.addNic(new NIC(0, 0, new MAC("same")), side));
        }
        if (d) Sim.event("info", `<b>${d}</b> added — ${d instanceof Host && !(d instanceof Router) && d.nics[0].ip ? "address " + d.nics[0].ip.toString() + ", " : ""}now connect it with the cable tool`, { obj: d });
        this.changed();
        return d;
    },

    removePatch(pt) {
        [...pt.inFlight(), ...pt.queue[0], ...pt.queue[1]].forEach(f => f.dispose("dropped"));
        pt.flight = [[], []];
        pt.queue = [[], []];
        pt.ports.forEach(p => p.disconnect());
        Inspector.close(pt);
        Id.remove(pt);
        Sim.event("info", `Cable unplugged: ${pt.endName(pt.ports[0])} ⇄ ${pt.endName(pt.ports[1])} — link LEDs go dark`);
    },

    removeDevice(d) {
        if (!this.isDevice(d)) return;
        this.portsOf(d).forEach(p => { if (p.patch) this.removePatch(p.patch); });
        Inspector.close(d);
        if (shell.host == d) { shell.host = null; terminal.quitToConsole(); }
        this.portsOf(d).forEach(p => Id.remove(p));
        Id.remove(d);
        Sim.event("info", `<b>${d}</b> removed`);
    },

    // ---------- drawing ----------
    drawOverlay() {
        if (!this.on) return;
        const m = this.mouse;
        if (this.tool == "cable") {
            // highlight free sockets
            (Id.list["Port"] || []).forEach(p => {
                if (p.connected) return;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 9 * p.scale, 0, Math.PI * 2);
                ctx.strokeStyle = p == this.cableFrom ? "#4ade80" : "rgba(74,222,128,.55)";
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 3]);
                ctx.stroke();
                ctx.setLineDash([]);
            });
            if (this.cableFrom) {
                ctx.beginPath();
                ctx.moveTo(this.cableFrom.x, this.cableFrom.y);
                ctx.lineTo(m.x, m.y);
                ctx.strokeStyle = COLORS.cable;
                ctx.lineWidth = 4;
                ctx.lineCap = "round";
                ctx.stroke();
            }
        }
        if (this.tool.startsWith("place:")) {
            ctx.save();
            ctx.globalAlpha = 0.45;
            const t = this.tool.slice(6);
            const w = { host: 78, server: 78, hub: 270, switch: 270, switch8: 406, router: 150 }[t];
            const h = { host: 92, server: 92, hub: 52, switch: 52, switch8: 52, router: 56 }[t];
            Gfx.rrect(m.x - w / 2, m.y - h / 2, w, h, 6);
            ctx.fillStyle = "rgba(56,189,248,.25)";
            ctx.fill();
            ctx.strokeStyle = COLORS.select;
            ctx.setLineDash([5, 4]);
            ctx.stroke();
            ctx.restore();
        }
    },

    // ---------- save / load ----------
    serialize(title) {
        const typeOf = d => d instanceof Router ? "router" : d instanceof Server ? "server" : d instanceof Host ? "host" : d instanceof Switch ? "switch" : "hub";
        const lists = { host: [], server: [], hub: [], switch: [], router: [] };
        App.devices().forEach(d => lists[typeOf(d)].push(d));
        const nameOf = d => {
            const t = typeOf(d);
            return { host: "Host", server: "Server", hub: "Hub", switch: "Switch", router: "Router" }[t] + (lists[t].indexOf(d) + 1);
        };
        const cidr = n => n.ip ? n.ip.ip + "/" + n.ip.cidr : "";
        const r = v => Math.round(v);
        const devices = [];
        ["host", "server", "hub", "switch", "router"].forEach(t => lists[t].forEach(d => {
            if (t == "host" || t == "server") {
                const n = d.nics[0];
                const o = { type: t, x: r(d.x), y: r(d.y), nic: d.nicSide, ip: n && n.ip ? cidr(n) : (d.useDhcp ? "dhcp" : "") };
                if (d.mirrored != (d.nicSide == "left")) o.mirror = d.mirrored;
                const gw = d.l3.routing.gateway;
                if (gw && !d.lease) o.gw = gw;
                if (d.dnsServer && !d.lease) o.dns = d.dnsServer;
                if (d.domain && !d.lease) o.domain = d.domain;
                if (d.lease) o.ip = "dhcp";
                if (d.dhcpd) o.dhcp = { range: d.dhcpd.first + "-" + d.dhcpd.last, router: d.dhcpd.router, dns: d.dhcpd.dns, domain: d.dhcpd.domain, lease: d.dhcpd.lease };
                if (d.named) o.zone = { domain: d.named.domain, records: Object.assign({}, d.named.records) };
                if (d.persistName) o.name = d.persistName;
                devices.push(o);
            } else if (t == "router") {
                devices.push({
                    type: t, x: r(d.x), y: r(d.y), ifs: d.nics.map(n => ({ ip: cidr(n), side: n.dir })),
                    routes: d.l3.routing.table.filter(x => x.proto == "static").map(x => (x.cidr == 0 ? "default" : x.net + "/" + x.cidr) + " via " + x.via),
                    ...(d.persistName ? { name: d.persistName } : {}),
                });
            } else {
                const o = { type: t, x: r(d.x), y: r(d.y), ports: d.ports.length };
                if (t == "switch") {
                    const v = {};
                    d.ports.forEach((p, i) => { if (p.trunk) v[i + 1] = "trunk"; else if (p.vlan != 1) v[i + 1] = p.vlan; });
                    if (Object.keys(v).length) o.vlans = v;
                }
                devices.push(o);
            }
        }));
        const ref = p => {
            const d = p.host || p.hub;
            const i = (d instanceof Host ? d.nics : d.ports).indexOf(p) + 1;
            return nameOf(d) + ":" + i;
        };
        const links = (Id.list["Patch"] || []).map(pt => {
            const o = {};
            if (pt.color != COLORS.cable) o.color = pt.color;
            if (pt.sag != null) o.sag = pt.sag;
            if (pt.kind != "Cat5e UTP patch cable") o.kind = pt.kind;
            return [ref(pt.ports[0]), ref(pt.ports[1]), o];
        });
        const cur = Topology.current || {};
        return {
            id: cur.mine && cur.id != "new" ? cur.id : "my-" + Date.now().toString(36),
            title: title || cur.title || "My network",
            goal: cur.goal || "",
            devices, links, zones: this.edited ? [] : (cur.zones || []),
            tries: cur.tries || [["help", "help"]],
        };
    },

    save() {
        const cur = Topology.current || {};
        const title = prompt("Name of this network:", cur.mine ? cur.title : (cur.title ? cur.title + " (my copy)" : "My network"));
        if (!title) return;
        const spec = this.serialize(title);
        const list = this.mine().filter(t => t.id != spec.id).map(t => { delete t.mine; return t; });
        list.push(spec);
        if (!this.storeMine(list)) return;
        this.edited = false;
        Topology.fillSelect();
        Topology.load(spec.id);
        this.toggle(true);
        Sim.event("info", `Saved as “${esc(title)}” in this browser`);
    },

    exportFile() {
        const spec = this.serialize();
        delete spec.mine;
        const blob = new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = (spec.title || "network").replace(/[^\w-]+/g, "_") + ".json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },

    importFile(file) {
        if (!file) return;
        file.text().then(txt => {
            let spec;
            try { spec = JSON.parse(txt); } catch (e) { return alert("This is not a valid network file: " + e.message); }
            if (!spec || !Array.isArray(spec.devices) || !Array.isArray(spec.links)) return alert("This file does not describe a network (devices and links are missing).");
            spec.id = "my-" + Date.now().toString(36);
            spec.title = spec.title || file.name.replace(/\.json$/i, "");
            const list = this.mine().map(t => { delete t.mine; return t; });
            list.push(spec);
            if (!this.storeMine(list)) return;
            Topology.fillSelect();
            Topology.load(spec.id);
        });
        document.getElementById("importFile").value = "";
    },

    newNetwork() {
        Topology.loadSpec({ id: "new", mine: true, title: "New network", goal: "An empty canvas: add devices from the toolbar, connect them with cables, then give the computers addresses.", devices: [], links: [], zones: [], tries: [["help", "help"]] });
        this.toggle(true);
    },
};
