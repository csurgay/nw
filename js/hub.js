// Rack-mounted multiport devices. Hub = Layer 1 repeater, Switch = Layer 2 learning bridge.
class Hub extends Clickable {
    constructor(x, y, n = 4, type = 'Hub') {
        super(x, y);
        this.id = new Id(type, this);
        this.ports = [];
        this.repeated = 0;
        this.w = 134 + 34 * n;
        this.h = 52;
        this.style = { face: ["#4a525c", "#363c44", "#2b3037"], brand: "NW-HUB " + n, sub: "10BASE-T REPEATER", badge: "HUB" };
        for (let i = 0; i < n; i++) {
            const port = new Port(x + 136 + i * 34, y + 33);
            port.dir = "down";
            this.addPort(port);
        }
        Debug.log(this.id, "Create", this);
    }

    addPort(port) {
        this.ports.push(port);
        port.attachHub(this);
    }

    portNo(port) {
        return this.ports.indexOf(port) + 1;
    }

    portList(ports) {
        return `port${ports.length > 1 ? "s" : ""} ${ports.map(p => this.portNo(p)).join(", ")}`;
    }

    // send a copy of the frame out of each of the given ports
    emit(frame, outs) {
        outs.forEach(port => port.sendFrame(frame.copy()));
    }

    // A hub is a multi-port repeater (Layer 1): whatever comes in on one
    // port is copied bit by bit to every other port. No MAC addresses involved.
    processFrame(frame, sourcePort) {
        const outs = this.ports.filter(port => port.connected && port != sourcePort);
        this.repeated++;
        frame.log(`${this} repeated it out of ${this.portList(outs)}`);
        Sim.event("hub", `<b>${this}</b> got it on port ${this.portNo(sourcePort)} and repeats it to ${this.portList(outs)}` +
            ` — a hub doesn't look at addresses`, { frame, obj: this });
        this.emit(frame, outs);
        frame.dispose("repeated");
    }

    bounds() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    hit(x, y) {
        return x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h;
    }

    draw() {
        const { x, y, w, h } = this;
        // rack ears
        [x, x + w - 12].forEach(ex => {
            Gfx.rrect(ex, y + 2, 12, h - 4, 2);
            ctx.fillStyle = Gfx.vgrad(y, y + h, ["#b4bbc3", "#7d858e"]);
            ctx.fill();
            [y + 12, y + h - 12].forEach(sy => {
                ctx.beginPath();
                ctx.ellipse(ex + 6, sy, 3, 2.2, 0, 0, Math.PI * 2);
                ctx.fillStyle = "#3b4148";
                ctx.fill();
            });
        });
        // chassis front panel
        Gfx.rrect(x + 11, y, w - 22, h, 3);
        ctx.fillStyle = Gfx.vgrad(y, y + h, this.style.face);
        ctx.fill();
        ctx.strokeStyle = "#1a1e23";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.12)";
        ctx.fillRect(x + 12, y + 1, w - 24, 1.5);
        // brand area
        Gfx.text(this.style.brand, x + 22, y + 21, { align: "left", weight: 800, size: 12, color: "#e8edf2" });
        Gfx.text(this.style.sub, x + 22, y + 33, { align: "left", weight: 600, size: 7.5, color: "#9aa6b2" });
        Gfx.text(this.id.toString(), x + 22, y + 45, { align: "left", weight: 700, size: 9, color: this.hasSession && this.hasSession() ? "#86efac" : COLORS.select, mono: true });
        // power LED
        Gfx.led(x + 112, y + 14, 2.6, COLORS.ledGreen, true, 0.7);
        Gfx.text("PWR", x + 112, y + 27, { size: 6.5, weight: 700, color: "#9aa6b2" });
        // activity LED: lights when frames pass through
        const busy = this.ports.some(p => p.activity());
        Gfx.led(x + 112, y + 37, 2.6, COLORS.ledAmber, busy && Math.floor(Sim.time / 90) % 2 == 0, 0.7);
        // ports
        this.ports.forEach((port, i) => {
            port.drawJack([{ x: -5, y: -15 }, { x: 5, y: -15 }]);
            Gfx.text(String(i + 1), port.x + 12, port.y + 4, { size: 8, weight: 700, color: "#9aa6b2" });
            if (this.vlanAware && (port.trunk || port.vlan != 1 || this.showVlans)) {
                // VLAN marker above the port: colour = VLAN, striped = trunk
                const bx = port.x - 9, by = this.y + 3, bw = 18, bh = 7;
                if (port.trunk) {
                    const vs = this.vlans();
                    vs.forEach((v, k) => { ctx.fillStyle = vlanColor(v); ctx.fillRect(bx + k * bw / vs.length, by, bw / vs.length, bh); });
                    Gfx.text("T", port.x, by + 6.3, { size: 6.5, weight: 900, color: "#111" });
                } else {
                    ctx.fillStyle = vlanColor(port.vlan);
                    ctx.fillRect(bx, by, bw, bh);
                    Gfx.text(String(port.vlan), port.x, by + 6.3, { size: 6.5, weight: 900, color: "#111" });
                }
            }
        });
    }

    toString() {
        return super.toString();
    }

    portRows() {
        return this.ports.map((p, i) => {
            const peer = p.peer();
            return `<tr${p.activity() ? ' class="hl"' : ""}><td class="m">${this.portName ? this.portName(p) : i + 1}</td>
                <td>${p.adminDown ? '<span class="pill off">off</span>' : p.linkUp() ? '<span class="pill on">link</span>' : '<span class="pill off">empty</span>'}</td>
                <td>${peer ? (peer.hub ? `${peer.hub} port ${peer.hub.portNo(peer)}` : `${peer.host} ${peer.id}`) : "—"}</td>
                <td class="m">${p.stats.rx}</td><td class="m">${p.stats.tx}</td></tr>`;
        }).join("");
    }

    tooltipLines() {
        return [
            `${this.id} · ${this.ports.length}-port Ethernet hub`,
            `ports in use ${this.ports.filter(p => p.connected).length}/${this.ports.length}`,
            `frames repeated ${this.repeated}`,
            `Layer 1 device: copies every frame to all ports`,
        ];
    }

    inspect() {
        return {
            title: `${this.id}`,
            sub: `${this.ports.length}-port Ethernet hub (multiport repeater)`,
            badge: "HUB",
            color: "#9aa6b2",
            sections: [
                {
                    h: "How a hub works", html: `<p>A hub works on <b>Layer 1</b>: it does not understand MAC or IP addresses. Every frame that arrives on one port is repeated, bit by bit, out of <b>all other ports</b>.</p>
                    <p>So every computer on the hub sees every frame, and each NIC has to decide for itself whether the frame is meant for it. All ports share one <b>collision domain</b>; a switch would instead learn MAC addresses and send each frame only where it belongs.</p>`
                },
                { h: "Ports", html: `<table class="t"><tr><th>#</th><th>Link</th><th>Connected to</th><th>In</th><th>Out</th></tr>${this.portRows()}</table>` },
                { h: "Counters", html: `<table class="t kv"><tr><td>Frames repeated</td><td class="m">${this.repeated}</td></tr></table>` },
            ],
        };
    }
}

// kept for the original lab code
class Hub4 extends Hub {
    constructor(x, y) {
        super(x, y, 4);
    }
}

// A learning switch (transparent bridge, IEEE 802.1D):
// it remembers on which port each source MAC was seen and forwards
// unicast frames only to that port.
// managed: null = unmanaged (plug and play, nothing to configure, no VLANs),
// "linux" = a Linux switch OS (ssh in, bridge / ip link commands),
// "cisco" = an IOS-style command line (enable, configure terminal, show ...).
class Switch extends Hub {
    static AGING_MS = 300000; // Linux bridge / most switches: 300 s
    static KINDS = {
        null: { face: ["#3d4f60", "#324252", "#283644"], brand: "NW-SW", sub: "UNMANAGED SWITCH", what: "unmanaged switch" },
        linux: { face: ["#24524a", "#1d433c", "#163530"], brand: "NW-LX", sub: "MANAGED · LINUX", what: "managed switch, Linux" },
        cisco: { face: ["#27466e", "#1f3a5c", "#182e4a"], brand: "NW-IOS", sub: "MANAGED · IOS CLI", what: "managed switch, IOS-style CLI" },
    };

    constructor(x, y, n = 4, managed = null) {
        super(x, y, n, 'Switch');
        this.managed = managed || null;
        const k = Switch.KINDS[this.managed];
        this.style = { face: k.face, brand: k.brand + " " + n, sub: k.sub, badge: "SW" };
        this.macTable = []; // {mac, vlan, port, t}
        this.vlanAware = !!this.managed; // only a managed switch can do VLANs
        this.vlanNames = { 1: "default" };
        this.stats = { forwarded: 0, flooded: 0, filtered: 0, learned: 0 };
        this.cli = this.managed == "cisco" ? new IosCli(this) : null;
    }

    get nics() { return []; } // no IP stack: it is managed from the console (out of band)

    // swp1 on Linux, Gi0/1 on the IOS-style switch, "port 1" otherwise
    portName(p, long) {
        const n = this.portNo(p);
        if (this.managed == "linux") return "swp" + n;
        if (this.managed == "cisco") return (long ? "GigabitEthernet0/" : "Gi0/") + n;
        return "port " + n;
    }

    findPort(name) {
        const m = String(name || "").match(/(\d+)$/);
        return m ? this.ports[parseInt(m[1]) - 1] || null : null;
    }

    // ---- configuration that a reboot goes back to
    snapshot() {
        return {
            name: this.id.name || null,
            ports: this.ports.map(p => ({ vlan: p.vlan, trunk: p.trunk, down: !!p.adminDown, desc: p.desc || "" })),
            vlanNames: Object.assign({}, this.vlanNames),
        };
    }

    applySnapshot(s) {
        s.ports.forEach((c, i) => {
            const p = this.ports[i];
            if (!p) return;
            p.vlan = c.vlan; p.trunk = c.trunk; p.adminDown = c.down; p.desc = c.desc;
        });
        this.vlanNames = Object.assign({}, s.vlanNames);
        this.id.name = s.name || null;
    }

    saveStartup() {
        this.startup = this.snapshot();
        this.persistName = this.id.name || null;
    }

    modified() {
        return JSON.stringify(this.snapshot()) != JSON.stringify(this.startup);
    }

    // one place that changes a port: popup, bridge vlan, switchport ...
    setPortVlan(p, value, quiet) {
        if (value == "trunk") p.trunk = true;
        else { p.trunk = false; p.vlan = parseInt(value); }
        if (!p.trunk && !this.vlanNames[p.vlan]) this.vlanNames[p.vlan] = "VLAN" + String(p.vlan).padStart(4, "0");
        this.macTable = this.macTable.filter(e => e.port != p);
        if (quiet) return;
        Sim.event("info", `<b>${this}</b> ${this.portName(p)} is now ${p.trunk ? "a trunk (all VLANs, tagged)" : "in VLAN " + p.vlan}`, { obj: this });
        if (typeof Editor != "undefined") Editor.changed();
    }

    setPortDown(p, down) {
        p.adminDown = down;
        if (down) this.macTable = this.macTable.filter(e => e.port != p);
        Sim.event("info", `<b>${this}</b> ${this.portName(p)} ${down ? "is switched off (administratively down) — its link LED goes dark" : "is switched on again"}`, { obj: this });
    }

    // ---- reboot: the MAC table is forgotten, the saved configuration comes back
    reboot() {
        if (this.down) return;
        const name = this.id.toString();
        if (typeof Access != "undefined" && Access.onReboot(this)) { /* its console took care */ }
        else if (shell.host == this) {
            terminal.println(`Connection to ${name} closed by remote host.\nConnection to ${name} closed.`);
            if (!shell.oneShot) shell.toConsole();
        }
        Sim.event("info", `<b>${name}</b> reboots: no frames pass for a few seconds, and the MAC table is empty afterwards — the switch has to learn again (flooding!)`, { obj: this });
        this.down = true;
        this.downSince = Sim.time;
        this.macTable = [];
        if (this.managed == "cisco") this.applySnapshot(this.startup);
        else if (this.startup) this.applySnapshot(Object.assign({}, this.startup, { name: this.persistName }));
        if (this.cli) this.cli.reset();
        Sim.after(Host.BOOT_MS, () => {
            this.down = false;
            this.bootTime = new Date();
            Sim.event("info", `<b>${this}</b> is up again` + (this.managed == "cisco" ? " with its startup-config" : ""), { obj: this });
        });
    }

    // VLAN numbers in use on this switch
    vlans() {
        const s = new Set(this.ports.filter(p => !p.trunk).map(p => p.vlan));
        if (!s.size) s.add(1);
        return [...s].sort((a, b) => a - b);
    }

    get showVlans() {
        return this.vlans().length > 1 || this.ports.some(p => p.trunk);
    }

    vtxt(vid) {
        return this.showVlans ? ` in VLAN ${vid}` : "";
    }

    entry(mac, vid = 1) {
        const e = this.macTable.find(e => e.mac == mac && e.vlan == vid);
        if (e && Sim.time - e.t > Switch.AGING_MS) {
            this.macTable = this.macTable.filter(x => x != e);
            return null;
        }
        return e;
    }

    learn(mac, port, frame, vid = 1) {
        if (parseInt(mac.slice(0, 2), 16) & 1) return; // never learn group addresses
        const e = this.entry(mac, vid);
        if (!e) {
            this.macTable.push({ mac, vlan: vid, port, t: Sim.time });
            this.stats.learned++;
            Sim.event("sw", `<b>${this}</b> learns: ${mac} lives behind ${this.portName(port)}${this.vtxt(vid)} (new MAC table entry)`, { frame, obj: this });
        } else {
            if (e.port != port) {
                Sim.event("sw", `<b>${this}</b> ${mac} moved from ${this.portName(e.port)} to ${this.portName(port)}`, { frame, obj: this });
                e.port = port;
            }
            e.t = Sim.time;
        }
    }

    // copy the frame out of each port; trunks get an 802.1Q tag, access ports get it untagged
    emitVlan(frame, outs, vid) {
        outs.forEach(port => {
            const c = frame.copy();
            c.vlan = port.trunk && vid != 1 ? vid : null;
            if (c.vlan != frame.vlan) c._wire = null;
            port.sendFrame(c);
        });
    }

    processFrame(frame, sourcePort) {
        const src = String(frame.macSrc).toLowerCase(), dst = String(frame.macDst).toLowerCase();
        const inP = this.portNo(sourcePort);
        if (this.down || sourcePort.adminDown) {
            Sim.event("drop", `<b>${this}</b> ${this.down ? "is rebooting" : this.portName(sourcePort) + " is switched off"} — the frame is lost`, { frame, obj: this });
            frame.dispose("dropped");
            return;
        }
        if (!sourcePort.trunk && frame.vlan) {
            Sim.event("sw", `<b>${this}</b> ${this.portName(sourcePort)} is an access port — a tagged frame is not allowed there, dropped`, { frame, obj: this });
            frame.dispose("dropped");
            return;
        }
        const vid = sourcePort.trunk ? (frame.vlan || 1) : sourcePort.vlan;
        this.learn(src, sourcePort, frame, vid);
        // only ports of the same VLAN (and trunks) take part
        const others = this.ports.filter(p => p.connected && !p.adminDown && p != sourcePort && (p.trunk || p.vlan == vid));
        const vt = this.vtxt(vid);
        if (frame.vlan && sourcePort.trunk) frame.log(`${this} read the 802.1Q tag: VLAN ${vid}`);

        if (dst == LLDP.MULTICAST) {
            frame.log(`${this} kept it: bridges never forward LLDP frames`);
            Sim.event("sw", `<b>${this}</b> ${this.portName(sourcePort)}: LLDP frame stops here — switches never forward 01:80:c2:00:00:0e, so LLDP only shows direct neighbours`, { frame, obj: this });
            frame.dispose("dropped");
            return;
        }
        if (parseInt(dst.slice(0, 2), 16) & 1) { // broadcast / multicast
            this.stats.flooded++;
            frame.log(`${this} flooded it (broadcast) out of ${this.portList(others)}`);
            if (!others.length) {
                Sim.event("sw", `<b>${this}</b> ${this.portName(sourcePort)}: broadcast${vt}, but no other port is in that VLAN — nobody else hears it`, { frame, obj: this });
                frame.dispose("dropped");
                return;
            }
            Sim.event("sw", `<b>${this}</b> ${this.portName(sourcePort)}: ${dst == ARP.BROADCAST ? "broadcast" : "multicast"}${vt} → floods it to ${this.portList(others)}`, { frame, obj: this });
            this.emitVlan(frame, others, vid);
        } else {
            const e = this.entry(dst, vid);
            if (e && e.port == sourcePort) {
                this.stats.filtered++;
                frame.log(`${this} filtered it: destination is on the same port`);
                Sim.event("sw", `<b>${this}</b> ${dst} is on ${this.portName(sourcePort)}, where the frame came from — filtered (not forwarded)`, { frame, obj: this });
                frame.dispose("dropped");
                return;
            }
            if (e && e.port.connected && !e.port.adminDown) {
                this.stats.forwarded++;
                frame.log(`${this} forwarded it to ${this.portName(e.port)} only (MAC table hit)`);
                Sim.event("sw", `<b>${this}</b> MAC table: ${dst}${vt} → ${this.portName(e.port)}, forwards it there only`, { frame, obj: this });
                this.emitVlan(frame, [e.port], vid);
            } else {
                this.stats.flooded++;
                frame.log(`${this} flooded it: ${dst} not in its MAC table yet`);
                if (!others.length) {
                    Sim.event("sw", `<b>${this}</b> ${dst} unknown${vt}, and no other port is in that VLAN — dropped`, { frame, obj: this });
                    frame.dispose("dropped");
                    return;
                }
                Sim.event("sw", `<b>${this}</b> doesn't know where ${dst} is yet${vt} (unknown unicast) → floods it to ${this.portList(others)}`, { frame, obj: this });
                this.emitVlan(frame, others, vid);
            }
        }
        frame.dispose("repeated");
    }

    // a VLAN select in the popup changed (like the web page of a managed switch)
    onInput(act, value, el) {
        if (act != "vlan" || !this.managed) return;
        const p = this.ports[+el.dataset.port];
        if (p) this.setPortVlan(p, value);
    }

    hasSession() { return shell.host == this; }

    actions() {
        if (!this.managed) return [];
        const id = this.id.toString();
        if (this.managed == "linux") return [
            { label: "Console", console: true, title: "Log in on its console — the terminal opens here, in this window" },
            { label: "MAC table", cmd: `ssh ${id} bridge fdb show` },
            { label: "VLANs", cmd: `ssh ${id} bridge vlan show` },
            { label: "Ports", cmd: `ssh ${id} ip link` },
            { sep: true }, { input: id, title: "a new name for this switch" },
            { label: "Rename", tpl: `ssh ${id} hostnamectl set-hostname {}` },
            { label: "Reboot", cmd: `ssh ${id} reboot` },
        ];
        return [
            { label: "Console", console: true, title: "Log in on its console — the terminal opens here, in this window" },
            { label: "MAC table", cmd: `ssh ${id} show mac address-table` },
            { label: "VLANs", cmd: `ssh ${id} show vlan brief` },
            { label: "Ports", cmd: `ssh ${id} show interfaces status` },
            { sep: true }, { input: id, title: "a new name for this switch" },
            // the real steps, one after the other, so they can be seen in the terminal
            { label: "Rename", tpl: [`ssh ${id}`, "enable", "configure terminal", "hostname {}", "end", "write memory", "exit"] },
            { label: "Reload", cmd: [`ssh ${id}`, "enable", "reload"] },
        ];
    }

    tooltipLines() {
        return [
            `${this.id} · ${this.ports.length}-port ${Switch.KINDS[this.managed].what}` + (this.showVlans ? ` · VLANs ${this.vlans().join(", ")}` : ""),
            `MAC table ${this.macTable.length} entries`,
            `forwarded ${this.stats.forwarded} · flooded ${this.stats.flooded} · filtered ${this.stats.filtered}`,
            `Layer 2 device: sends frames only where the MAC lives`,
            this.managed ? `managed: ssh ${this.id} to look inside` : `unmanaged: nothing to log in to`,
        ];
    }

    inspect() {
        const rows = this.macTable.filter(e => Sim.time - e.t <= Switch.AGING_MS).map(e =>
            `<tr><td class="m">${e.mac}</td><td class="m"><span style="color:${vlanColor(e.vlan)}">${e.vlan}</span></td><td class="m">${this.portNo(e.port)}</td><td class="m">${Math.round((Sim.time - e.t) / 1000)}s</td></tr>`).join("");
        const opts = p => [1, 10, 20, 30, 40].map(v => `<option value="${v}"${!p.trunk && p.vlan == v ? " selected" : ""}>VLAN ${v}</option>`).join("") +
            `<option value="trunk"${p.trunk ? " selected" : ""}>trunk (all, tagged)</option>`;
        const vrows = this.ports.map((p, i) => {
            const peer = p.peer();
            return `<tr><td class="m">${i + 1}</td><td><select class="vsel" data-act="vlan" data-port="${i}" style="--c:${p.trunk ? "#ccc" : vlanColor(p.vlan)}">${opts(p)}</select></td>
                <td>${peer ? (peer.hub ? `${peer.hub} port ${peer.hub.portNo(peer)}` : `${peer.host} ${peer.id}`) : "—"}</td></tr>`;
        }).join("");
        return {
            title: `${this.id}`,
            sub: `${this.ports.length}-port ${Switch.KINDS[this.managed].what}`,
            badge: "SW",
            color: "#5aa7e0",
            sections: [
                {
                    h: "How a switch works", html: `<p>A switch works on <b>Layer 2</b>. For every frame it reads the <b>source MAC</b> and remembers the port it came from — that is how it fills its <b>MAC table</b>.</p>
                    <p>Then it looks up the <b>destination MAC</b>: if it knows the port, the frame goes <b>only there</b>; if not (or for broadcasts), it <b>floods</b> the frame to all other ports, just like a hub. Each port is its own collision domain, but all ports share one <b>broadcast domain</b>.</p>`
                },
                {
                    h: "MAC table (bridge fdb)", html: rows ? `<table class="t"><tr><th>MAC address</th><th>VLAN</th><th>Port</th><th>Age</th></tr>${rows}</table>
                    <p class="note">Entries are forgotten after ${Switch.AGING_MS / 1000} s without traffic (aging).</p>` :
                        `<p class="note">Empty — the switch has not seen any frames yet. Send something!</p>`
                },
                { h: "Ports", html: `<table class="t"><tr><th>#</th><th>Link</th><th>Connected to</th><th>In</th><th>Out</th></tr>${this.portRows()}</table>` },
                this.managed ? {
                    h: "VLANs (802.1Q)", html: `<table class="t"><tr><th>Port</th><th>VLAN</th><th>Connected to</th></tr>${vrows}</table>
                    <p class="note">An <b>access port</b> belongs to one VLAN: frames stay inside it, as if the switch were cut into separate switches. A <b>trunk</b> carries every VLAN to another switch, each frame marked with a 4-byte 802.1Q tag.</p>`
                } : {
                    h: "Unmanaged", html: `<p>This is an <b>unmanaged switch</b>: plug it in and it works, but there is nothing to set. No VLANs, no name, no login — all ports are in one network.</p>
                    <p class="note">A <b>managed switch</b> (Linux or IOS-style) can be logged in to with <code>ssh</code>, renamed, and its ports can be put into VLANs or switched off.</p>`
                },
                ...(this.managed ? [{
                    h: this.managed == "linux" ? "Log in (Linux switch OS)" : "Log in (IOS-style command line)",
                    html: this.managed == "linux"
                        ? `<p><code>ssh ${this.id}</code>, then <code>bridge fdb show</code> (MAC table), <code>bridge vlan show</code>, <code>bridge vlan add dev swp3 vid 20 pvid untagged</code>, <code>ip link set swp2 down</code>.</p>`
                        : `<p><code>ssh ${this.id}</code> → <code>enable</code> → <code>configure terminal</code> → <code>interface gi0/3</code> → <code>switchport access vlan 20</code> → <code>end</code> → <code>write memory</code>. Type <code>?</code> anywhere for help.</p>` +
                        (this.modified() ? `<p class="note">The running-config has changes that are not saved yet: a reload would lose them.</p>` : ""),
                }] : []),
                {
                    h: "Counters", html: `<table class="t kv"><tr><td>Forwarded to one port</td><td class="m">${this.stats.forwarded}</td></tr>
                    <tr><td>Flooded</td><td class="m">${this.stats.flooded}</td></tr><tr><td>Filtered</td><td class="m">${this.stats.filtered}</td></tr>
                    <tr><td>MACs learned</td><td class="m">${this.stats.learned}</td></tr></table>`
                },
            ],
        };
    }
}

// managed switches can be renamed with the same rules as computers
Switch.prototype.rename = Host.prototype.rename;
