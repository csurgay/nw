// A router is a host with several interfaces and IP forwarding switched on.
class Router extends Host {
    constructor(x, y, terminal, opts = {}) {
        super(x, y, terminal, { idType: "Router" });
        this.forwarding = true;
        this.w = opts.w || 150;
        this.h = 56;
        this.fwdStats = { fwd: 0, ttl: 0, noroute: 0 };
    }

    // side: "left" | "right" | "up" | "down"
    addNic(nic, side = "left") {
        nic.host = this;
        this.nics.push(nic);
        nic.dir = side;
        nic.scale = 0.85;
        nic.tlv.addValue("SystemName", this.id.toString());
        nic.tlv.addValue("SystemCapabilities", "Router");
        this.l3.routing.addRoute(nic);
        this.layoutNics();
    }

    // spread the sockets evenly along each side of the box
    layoutNics() {
        ["left", "right", "up", "down"].forEach(side => {
            const list = this.nics.filter(n => n.dir == side);
            list.forEach((n, k) => {
                const f = (k + 1) / (list.length + 1);
                if (side == "left") { n.x = this.x; n.y = this.y + this.h * f; }
                if (side == "right") { n.x = this.x + this.w; n.y = this.y + this.h * f; }
                if (side == "up") { n.x = this.x + this.w * f; n.y = this.y; }
                if (side == "down") { n.x = this.x + this.w * f; n.y = this.y + this.h; }
            });
        });
    }

    bounds() {
        return { x: this.x, y: this.y, w: this.w, h: this.h + 22 };
    }

    draw() {
        const { x, y, w, h } = this;
        const session = this.hasSession();
        // chassis
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,.45)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        Gfx.rrect(x, y, w, h, 7);
        ctx.fillStyle = Gfx.vgrad(y, y + h, ["#3d4a42", "#2c3731", "#222b26"]);
        ctx.fill();
        ctx.restore();
        Gfx.rrect(x, y, w, h, 7);
        ctx.strokeStyle = session ? "rgba(74,222,128,.8)" : "#141a16";
        ctx.lineWidth = session ? 1.5 : 1;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.10)";
        ctx.fillRect(x + 6, y + 1.5, w - 12, 1.2);
        // router symbol: a disc with four arrows
        const cx = x + w / 2, cy = y + 22;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 15, 9, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#5b8f74";
        ctx.fill();
        ctx.strokeStyle = "#a7d7bd";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.strokeStyle = "#eafff2";
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        [[-1, -1], [1, 1], [-1, 1], [1, -1]].forEach(([dx, dy], i) => {
            const inward = i % 2 == 1;
            const x1 = cx + dx * 4, y1 = cy + dy * 2.5, x2 = cx + dx * 11, y2 = cy + dy * 6;
            const [ax, ay, bx, by] = inward ? [x2, y2, x1, y1] : [x1, y1, x2, y2];
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
            const ang = Math.atan2(by - ay, bx - ax);
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx - 3.5 * Math.cos(ang - 0.6), by - 3.5 * Math.sin(ang - 0.6));
            ctx.moveTo(bx, by);
            ctx.lineTo(bx - 3.5 * Math.cos(ang + 0.6), by - 3.5 * Math.sin(ang + 0.6));
            ctx.stroke();
        });
        Gfx.text("NW-RTR", cx, y + h - 9, { size: 8.5, weight: 800, color: "#cfe9db" });
        // status LEDs
        Gfx.led(x + 12, y + 12, 2.2, COLORS.ledGreen, true, 0.6);
        Gfx.led(x + 12, y + 20, 2.2, COLORS.ledAmber, this.activity() && Math.floor(Sim.time / 70) % 2 == 0, 0.6);

        // interface sockets with their addresses
        this.nics.forEach(nic => {
            const off = { left: [{ x: 10, y: -5 }, { x: 10, y: 5 }], right: [{ x: -10, y: -5 }, { x: -10, y: 5 }],
                up: [{ x: -6, y: 10 }, { x: 6, y: 10 }], down: [{ x: -6, y: -10 }, { x: 6, y: -10 }] }[nic.dir];
            nic.drawJack(off);
            const ip = nic.ip ? nic.ip.toString() : nic.id + ": no IP";
            if (nic.dir == "left") Gfx.text(ip, nic.x - 4, nic.y - 13, { size: 9, mono: true, align: "right", color: "#9fd8b5" });
            if (nic.dir == "right") Gfx.text(ip, nic.x + 4, nic.y - 13, { size: 9, mono: true, align: "left", color: "#9fd8b5" });
            if (nic.dir == "up") Gfx.text(ip, nic.x + 12, nic.y - 6, { size: 9, mono: true, align: "left", color: "#9fd8b5" });
            if (nic.dir == "down") Gfx.text(ip, nic.x + 12, nic.y + 14, { size: 9, mono: true, align: "left", color: "#9fd8b5" });
        });
        Gfx.text(this.id.toString(), cx, y + h + 16, { size: 12, weight: 700, color: session ? "#86efac" : COLORS.label });
    }

    tooltipLines() {
        return [
            `${this.id} · IP router (${this.nics.length} interfaces)`,
            ...this.nics.map(n => `${n.id}  ${n.ip ? n.ip.toString() : "—"}`),
            `forwarded ${this.fwdStats.fwd} · TTL expired ${this.fwdStats.ttl} · no route ${this.fwdStats.noroute}`,
        ];
    }

    inspect() {
        const base = super.inspect();
        const ifRows = this.nics.map(n => `<tr><td class="m">${n.id}</td><td class="m">${n.ip ? n.ip.toString() : "—"}</td>
            <td class="m">${n.ip ? n.ip.subnet + "/" + n.ip.cidr : ""}</td><td class="m">${n.mac}</td>
            <td>${n.linkUp() ? '<span class="pill on">UP</span>' : '<span class="pill off">DOWN</span>'}</td></tr>`).join("");
        const keep = base.sections.filter(s => /^(Routing|ARP|Waiting)/.test(s.h));
        return {
            title: `${this.id}`,
            sub: "IP router · net.ipv4.ip_forward = 1" + (this.hasSession() ? " · shell open" : ""),
            badge: "RTR",
            color: "#5fbf8f",
            wide: true,
            sections: [
                {
                    h: "How a router works", html: `<p>A router connects <b>different IP networks</b>; each interface sits in another one. When a frame arrives for the router's MAC but the IP packet inside is for someone else, the router:</p>
                    <p>1) throws away the Ethernet header, 2) lowers the <b>TTL</b> by one (at 0: drop + ICMP “time exceeded”), 3) looks up the destination in its <b>routing table</b>, 4) finds the next hop's MAC with ARP and 5) sends the packet in a <b>brand-new Ethernet frame</b>. The IP addresses never change on the way — the MAC addresses change at every hop.</p>`
                },
                { h: "Interfaces", html: `<table class="t"><tr><th>Dev</th><th>Address</th><th>Network</th><th>MAC</th><th>Link</th></tr>${ifRows}</table>` },
                ...keep,
                {
                    h: "Counters", html: `<table class="t kv"><tr><td>Packets forwarded</td><td class="m">${this.fwdStats.fwd}</td></tr>
                    <tr><td>TTL expired (time exceeded sent)</td><td class="m">${this.fwdStats.ttl}</td></tr>
                    <tr><td>No route (unreachable sent)</td><td class="m">${this.fwdStats.noroute}</td></tr></table>`
                },
            ],
        };
    }

    actions() {
        const id = this.id.toString();
        return [
            { label: "Open shell", cmd: `ssh ${id}` },
            { label: "ip route", cmd: `ssh ${id} ip route` },
            { label: "ip neigh", cmd: `ssh ${id} ip neigh` },
            { sep: true },
            { input: this.nics[0] && this.nics[0].ip ? this.nics[0].ip.ip.replace(/\.\d+$/, ".10") : "" },
            { label: "ping", tpl: `ssh ${id} ping -c 3 {}` },
            { label: "traceroute", tpl: `ssh ${id} traceroute {}` },
            ...this.nics.flatMap(n => [{ sep: true }, { input: n.ip ? n.ip.toString() : "", title: "address/prefix for " + n.id },
                { label: "Set " + n.id, tpl: `ssh ${id} ip addr replace {} dev ${n.id}` }]),
        ];
    }
}
