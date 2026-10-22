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
        Gfx.text(this.id.toString(), x + 22, y + 45, { align: "left", weight: 700, size: 9, color: COLORS.select, mono: true });
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
            return `<tr${p.activity() ? ' class="hl"' : ""}><td class="m">${i + 1}</td>
                <td>${p.linkUp() ? '<span class="pill on">link</span>' : '<span class="pill off">empty</span>'}</td>
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
class Switch extends Hub {
    static AGING_MS = 300000; // Linux bridge / most switches: 300 s

    constructor(x, y, n = 4) {
        super(x, y, n, 'Switch');
        this.style = { face: ["#2f4d68", "#253e55", "#1c3044"], brand: "NW-SW " + n, sub: "LEARNING SWITCH", badge: "SW" };
        this.macTable = []; // {mac, vlan, port, t}
        this.vlanAware = true;
        this.stats = { forwarded: 0, flooded: 0, filtered: 0, learned: 0 };
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
            Sim.event("sw", `<b>${this}</b> learns: ${mac} lives behind port ${this.portNo(port)}${this.vtxt(vid)} (new MAC table entry)`, { frame, obj: this });
        } else {
            if (e.port != port) {
                Sim.event("sw", `<b>${this}</b> ${mac} moved from port ${this.portNo(e.port)} to port ${this.portNo(port)}`, { frame, obj: this });
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
        if (!sourcePort.trunk && frame.vlan) {
            Sim.event("sw", `<b>${this}</b> port ${inP} is an access port — a tagged frame is not allowed there, dropped`, { frame, obj: this });
            frame.dispose("dropped");
            return;
        }
        const vid = sourcePort.trunk ? (frame.vlan || 1) : sourcePort.vlan;
        this.learn(src, sourcePort, frame, vid);
        // only ports of the same VLAN (and trunks) take part
        const others = this.ports.filter(p => p.connected && p != sourcePort && (p.trunk || p.vlan == vid));
        const vt = this.vtxt(vid);
        if (frame.vlan && sourcePort.trunk) frame.log(`${this} read the 802.1Q tag: VLAN ${vid}`);

        if (dst == LLDP.MULTICAST) {
            frame.log(`${this} kept it: bridges never forward LLDP frames`);
            Sim.event("sw", `<b>${this}</b> port ${inP}: LLDP frame stops here — switches never forward 01:80:c2:00:00:0e, so LLDP only shows direct neighbours`, { frame, obj: this });
            frame.dispose("dropped");
            return;
        }
        if (parseInt(dst.slice(0, 2), 16) & 1) { // broadcast / multicast
            this.stats.flooded++;
            frame.log(`${this} flooded it (broadcast) out of ${this.portList(others)}`);
            if (!others.length) {
                Sim.event("sw", `<b>${this}</b> port ${inP}: broadcast${vt}, but no other port is in that VLAN — nobody else hears it`, { frame, obj: this });
                frame.dispose("dropped");
                return;
            }
            Sim.event("sw", `<b>${this}</b> port ${inP}: ${dst == ARP.BROADCAST ? "broadcast" : "multicast"}${vt} → floods it to ${this.portList(others)}`, { frame, obj: this });
            this.emitVlan(frame, others, vid);
        } else {
            const e = this.entry(dst, vid);
            if (e && e.port == sourcePort) {
                this.stats.filtered++;
                frame.log(`${this} filtered it: destination is on the same port`);
                Sim.event("sw", `<b>${this}</b> ${dst} is on port ${inP}, where the frame came from — filtered (not forwarded)`, { frame, obj: this });
                frame.dispose("dropped");
                return;
            }
            if (e && e.port.connected) {
                this.stats.forwarded++;
                frame.log(`${this} forwarded it to port ${this.portNo(e.port)} only (MAC table hit)`);
                Sim.event("sw", `<b>${this}</b> MAC table: ${dst}${vt} → port ${this.portNo(e.port)}, forwards it there only`, { frame, obj: this });
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

    // a VLAN select in the popup changed
    onInput(act, value, el) {
        if (act != "vlan") return;
        const p = this.ports[+el.dataset.port];
        if (!p) return;
        if (value == "trunk") { p.trunk = true; }
        else { p.trunk = false; p.vlan = parseInt(value); }
        this.macTable = this.macTable.filter(e => e.port != p);
        Sim.event("info", `<b>${this}</b> port ${this.portNo(p)} is now ${p.trunk ? "a trunk (all VLANs, tagged)" : "in VLAN " + p.vlan}`, { obj: this });
        if (typeof Editor != "undefined") Editor.changed();
    }

    tooltipLines() {
        return [
            `${this.id} · ${this.ports.length}-port learning switch` + (this.showVlans ? ` · VLANs ${this.vlans().join(", ")}` : ""),
            `MAC table ${this.macTable.length} entries`,
            `forwarded ${this.stats.forwarded} · flooded ${this.stats.flooded} · filtered ${this.stats.filtered}`,
            `Layer 2 device: sends frames only where the MAC lives`,
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
            sub: `${this.ports.length}-port Ethernet switch (learning bridge)`,
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
                {
                    h: "VLANs (802.1Q)", html: `<table class="t"><tr><th>Port</th><th>VLAN</th><th>Connected to</th></tr>${vrows}</table>
                    <p class="note">An <b>access port</b> belongs to one VLAN: frames stay inside it, as if the switch were cut into separate switches. A <b>trunk</b> carries every VLAN to another switch, each frame marked with a 4-byte 802.1Q tag.</p>`
                },
                {
                    h: "Counters", html: `<table class="t kv"><tr><td>Forwarded to one port</td><td class="m">${this.stats.forwarded}</td></tr>
                    <tr><td>Flooded</td><td class="m">${this.stats.flooded}</td></tr><tr><td>Filtered</td><td class="m">${this.stats.filtered}</td></tr>
                    <tr><td>MACs learned</td><td class="m">${this.stats.learned}</td></tr></table>`
                },
            ],
        };
    }
}
