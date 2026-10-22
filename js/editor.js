// Topology editor: add, move, cable and delete devices; save, export, import and delete your own networks.
const Editor = {
    on: false,
    tool: null, // null, or "place:<type>" while a new device is being put down
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
    // No tool modes: drag a device to move it, drag the empty canvas to pan,
    // click (or drag from) a socket to lay a cable, D over something deletes it,
    // and so does dragging a device back onto this bar.
    PALETTE: [
        ["host", "+ PC", "Add a computer — click here, then on the canvas (or drag it there)"],
        ["server", "+ Server", "Add a server"],
        ["hub", "+ Hub", "Add a 4-port hub"],
        ["switch", "+ Switch", "Add an unmanaged 4-port switch (plug and play, nothing to set)"],
        ["lswitch", "+ Linux switch", "Add a managed switch that runs Linux (ssh, bridge, VLANs)"],
        ["cswitch", "+ IOS switch", "Add a managed switch with an IOS-style command line"],
        ["router", "+ Router", "Add a router with three interfaces"],
    ],

    initUI() {
        const bar = document.getElementById("editbar");
        bar.innerHTML = this.PALETTE.map(t => `<button class="etool" data-place="${t[0]}" title="${t[2]}">${t[1]}</button>`).join("") +
            `<span class="esep"></span>
            <div class="efile"><button class="etool" data-file title="New, save, export, import, delete">File ▾</button>
                <div class="emenu" hidden>
                    <button data-cmd="new">New network</button>
                    <button data-cmd="save">Save in this browser…</button>
                    <button data-cmd="export">Export to a file (.json)</button>
                    <button data-cmd="import">Import a file…</button>
                    <hr><button data-cmd="delete" class="danger">Delete this network…</button>
                </div></div>
            <span class="ebin" title="Drag a device here to delete it">🗑</span>
            <input type="file" id="importFile" accept=".json,application/json" hidden>`;
        const menu = bar.querySelector(".emenu");
        bar.addEventListener("mousedown", ev => {
            const b = ev.target.closest("[data-place]");
            if (!b || ev.button != 0) return;
            ev.preventDefault();
            this.setTool("place:" + b.dataset.place);
            this.paletteDrag = { moved: false, x: ev.clientX, y: ev.clientY };
        });
        bar.addEventListener("click", ev => {
            if (ev.target.closest("[data-file]")) {
                menu.hidden = !menu.hidden;
                if (!menu.hidden) menu.querySelector('[data-cmd="delete"]').disabled = !this.canDelete();
                return;
            }
            const c = ev.target.closest("[data-cmd]");
            if (!c) return;
            menu.hidden = true;
            ({ new: () => this.newNetwork(), save: () => this.save(), export: () => this.exportFile(),
                import: () => document.getElementById("importFile").click(), delete: () => this.deleteMine() })[c.dataset.cmd]();
        });
        document.addEventListener("click", ev => { if (!ev.target.closest(".efile")) menu.hidden = true; });
        window.addEventListener("mousemove", ev => {
            if (this.paletteDrag && Math.hypot(ev.clientX - this.paletteDrag.x, ev.clientY - this.paletteDrag.y) > 6) this.paletteDrag.moved = true;
        });
        window.addEventListener("mouseup", ev => {
            const pd = this.paletteDrag;
            this.paletteDrag = null;
            if (!pd || !pd.moved || !this.tool) return;
            // dragged from the bar and dropped on the canvas: put it there
            const r = nwCanvas.getBoundingClientRect();
            const inside = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom && !this.overBar(ev);
            if (inside) { this.place(this.tool.slice(6), App.eventPoint(ev)); App.suppressClick = true; }
            this.setTool(null);
        });
        document.getElementById("importFile").addEventListener("change", ev => this.importFile(ev.target.files[0]));
        document.getElementById("btnEdit").addEventListener("click", () => this.toggle());
        window.addEventListener("keydown", ev => {
            if (!this.on) return;
            if (ev.target.closest && ev.target.closest("input, textarea, select")) return;
            if (ev.key == "Escape") { this.cableFrom = null; this.setTool(null); menu.hidden = true; return; }
            if (ev.key == "d" || ev.key == "D" || ev.key == "Delete" || ev.key == "Backspace") {
                const o = App.hover;
                if (!o || o instanceof Frame) return;
                ev.preventDefault();
                this.remove(o);
            }
        });
    },

    toggle(on = !this.on) {
        this.on = on;
        document.getElementById("editbar").hidden = !on;
        document.getElementById("btnEdit").classList.toggle("active", on);
        document.getElementById("canvasWrap").classList.toggle("editing", on);
        this.cableFrom = null;
        this.setTool(null);
    },

    HINT: "Drag a device to move it · click a socket, then another one: cable · D over a device or cable deletes it (or drag the device onto this bar) · Esc cancels",

    setTool(t) {
        this.tool = t;
        document.querySelectorAll("#editbar [data-place]").forEach(b => b.classList.toggle("active", "place:" + b.dataset.place == t));
        document.getElementById("editHint").textContent = t ? "Click on the canvas to put it there (or drag it there) · Esc cancels" : this.HINT;
    },

    changed() {
        if (!this.edited) {
            this.edited = true;
            App.zones = []; // the dashed boxes no longer match
        }
    },

    canDelete() {
        const cur = Topology.current;
        return !!(cur && cur.mine && this.mine().some(t => t.id == cur.id));
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

    overBar(ev) {
        const bar = document.getElementById("editbar");
        if (bar.hidden) return false;
        const r = bar.getBoundingClientRect();
        return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
    },

    // returns true if the editor used the event (then the canvas does not pan)
    mousedown(p, obj) {
        if (!this.on || this.tool) return false;
        if (obj instanceof Port) {
            if (this.cableFrom && this.cableFrom != obj) { this.connect(this.cableFrom, obj); this.cableFrom = null; return true; }
            if (obj.connected) { this.flash("That socket already has a cable — D over the cable unplugs it"); return true; }
            this.cableFrom = obj;
            this.cableDrag = { moved: false, x: p.x, y: p.y };
            return true;
        }
        this.cableFrom = null;
        const d = obj ? this.deviceOf(obj) : null;
        if (!this.isDevice(d)) return false;
        this.drag = { obj: d, x: p.x, y: p.y, moved: false };
        return true;
    },

    mousemove(p, ev) {
        this.mouse = p;
        if (this.cableDrag && Math.hypot(p.x - this.cableDrag.x, p.y - this.cableDrag.y) > 6) this.cableDrag.moved = true;
        if (!this.drag) return false;
        const dx = p.x - this.drag.x, dy = p.y - this.drag.y;
        if (!this.drag.moved && Math.hypot(dx, dy) < 3) return true;
        this.drag.moved = true;
        this.moveDevice(this.drag.obj, dx, dy);
        this.drag.x = p.x; this.drag.y = p.y;
        const bin = ev && this.overBar(ev);
        document.getElementById("editbar").classList.toggle("bin", !!bin);
        return true;
    },

    mouseup(ev) {
        const d = this.drag, c = this.cableDrag;
        this.drag = null;
        this.cableDrag = null;
        document.getElementById("editbar").classList.remove("bin");
        if (d && d.moved && ev && this.overBar(ev)) { this.removeDevice(d.obj); this.changed(); return true; }
        if (c && c.moved && this.cableFrom) {
            // dragged from one socket and let go over another one
            const o = App.pick(this.mouse.x, this.mouse.y);
            if (o instanceof Port && o != this.cableFrom) this.connect(this.cableFrom, o);
            this.cableFrom = null;
            return true;
        }
        return !!(d && d.moved);
    },

    // a click on the canvas in edit mode; returns true if handled
    click(p, obj) {
        if (!this.on) return false;
        if (this.tool && this.tool.startsWith("place:")) {
            this.place(this.tool.slice(6), p);
            this.setTool(null);
            return true;
        }
        return obj instanceof Port; // sockets are for cables here, not for popups
    },

    connect(a, b) {
        if (a.connected || b.connected) return this.flash("That socket already has a cable");
        if (this.deviceOf(a) == this.deviceOf(b)) return this.flash("A cable from a device back into itself would do nothing");
        const pt = new Patch(a, b, {});
        Sim.event("info", `New cable: ${pt.endName(pt.ports[0])} ⇄ ${pt.endName(pt.ports[1])} — link LEDs go green`, { obj: pt });
        this.changed();
    },

    remove(o) {
        if (o instanceof Patch) this.removePatch(o);
        else this.removeDevice(this.deviceOf(o));
        this.changed();
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
        else if (type == "switch" || type == "lswitch" || type == "cswitch") {
            d = new Switch(p.x - 135, p.y - 26, 4, { switch: null, lswitch: "linux", cswitch: "cisco" }[type]);
            d.saveStartup();
        }
        else if (type == "router") {
            d = new Router(p.x - 75, p.y - 28, terminal);
            ["left", "right", "down"].forEach(side => d.addNic(new NIC(0, 0, new MAC("same")), side));
        }
        if (d) d.bootTime = new Date(); // its uptime starts now
        if (d) Sim.event("info", `<b>${d}</b> added — ${d instanceof Host && !(d instanceof Router) && d.nics[0].ip ? "address " + d.nics[0].ip.toString() + ", " : ""}now click one of its sockets, then a socket of another device: that is a cable`, { obj: d });
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
        // free sockets: where a cable can go
        (Id.list["Port"] || []).forEach(p => {
            if (p.connected) return;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 9 * p.scale, 0, Math.PI * 2);
            ctx.strokeStyle = p == this.cableFrom ? "#4ade80" : this.cableFrom ? "rgba(74,222,128,.75)" : "rgba(74,222,128,.3)";
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
        });
        if (this.cableFrom) {
            const a = this.cableFrom.anchor();
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(m.x, m.y);
            ctx.strokeStyle = COLORS.cable;
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.stroke();
        }
        if (this.tool && this.tool.startsWith("place:")) {
            ctx.save();
            ctx.globalAlpha = 0.45;
            const t = this.tool.slice(6);
            const big = t.endsWith("switch") || t == "hub";
            const w = big ? 270 : t == "router" ? 150 : 78;
            const h = big ? 52 : t == "router" ? 56 : 92;
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
            return t + (lists[t].indexOf(d) + 1);
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
                if (t == "switch" && d.managed) {
                    o.managed = d.managed;
                    if (d.persistName) o.name = d.persistName;
                    const ds = {};
                    d.ports.forEach((p, i) => { if (p.desc) ds[i + 1] = p.desc; });
                    if (Object.keys(ds).length) o.descs = ds;
                }
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

    deleteMine() {
        const cur = Topology.current;
        if (!this.canDelete()) return this.flash("Only your own saved networks (under “My networks”) can be deleted — the lessons stay");
        if (!confirm(`Delete “${cur.title}” from this browser? This cannot be undone (an exported .json file stays).`)) return;
        const list = this.mine().filter(t => t.id != cur.id).map(t => { delete t.mine; return t; });
        if (!this.storeMine(list)) return;
        Topology.fillSelect();
        Topology.load(TOPOLOGIES[0].id);
        Sim.event("info", `Deleted “${esc(cur.title)}” from this browser`);
    },

    newNetwork() {
        Topology.loadSpec({ id: "new", mine: true, title: "New network", goal: "An empty canvas: add devices from the toolbar, click a socket and then another one to lay a cable, then give the computers addresses.", devices: [], links: [], zones: [], tries: [["help", "help"]] });
        this.toggle(true);
    },
};
