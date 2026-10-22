class Host extends Clickable {
    static BOOT_MS = 4000; // how long a reboot takes (simulated time)
    // opts.nicSide: where the network socket is: "right", "left" or "up"
    constructor(x,y, terminal, opts = {}) {
        super(x,y);
        this.terminal = terminal;
        this.id = new Id(opts.idType || "Host", this);
        this.forwarding = false; // ip_forward: only routers pass packets on
        this.nics = [];
        this.nicSide = opts.nicSide || "right";
        this.mirrored = opts.mirror != null ? opts.mirror : this.nicSide == "left"; // tower on the left side
        this.w = 78;
        this.h = 62;
        this.l2 = new Layer2(this);
        this.l3 = new Layer3(this);
        this.udp = new Udp(this);
        this.dhcpc = new DhcpClient(this);
        this.resolver = new Resolver(this);
        this.dnsServer = null; // nameserver from /etc/resolv.conf
        this.domain = null; // search domain
        this.useDhcp = false;
        this.info.push(["LLDP",function(o){return o.l2.lldp?o.l2.lldp.enabled:"false";}]);
    }

    towerX() { return this.mirrored ? this.x : this.x + this.w - 20; }
    monitorX() { return this.mirrored ? this.x + 24 : this.x; }

    // where the RJ45 socket sits on the tower
    placeNic(nic) {
        const tx = this.towerX();
        if (this.nicSide == "up") { nic.x = tx + 10; nic.y = this.y + 4; }
        else if (this.nicSide == "left") { nic.x = tx; nic.y = this.y + 44; }
        else { nic.x = tx + 20; nic.y = this.y + 44; }
    }

    ipLabel() {
        const n = this.nics[0];
        if (n && n.ip) return n.ip.ip;
        return this.dhcpPending ? "DHCP…" : "no IP";
    }

    addNic(nic) {
        nic.host = this;
        this.nics.push(nic);
        this.placeNic(nic);
        nic.dir = this.nicSide;
        nic.scale = 0.78;
        nic.tlv.addValue("SystemName", this.id.toString());
        nic.tlv.addValue("SystemCapabilities", "Station");
        // 192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.10
        this.l3.routing.addRoute(nic);
    }

    hasSession() {
        return shell.host == this && this.terminal.prompt.indexOf("@" + this.id + " ") > 0;
    }

    activity() {
        return this.nics.some(n => n.activity());
    }

    bounds() {
        return { x: this.x, y: this.y, w: this.w, h: 92 };
    }

    hit(x, y) {
        const b = this.bounds();
        return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    }

    draw() {
        const y = this.y;
        const tx = this.towerX(), mx = this.monitorX();
        const session = this.hasSession();
        const act = this.activity();

        // --- tower ---
        Gfx.rrect(tx, y + 6, 20, 52, 3);
        ctx.fillStyle = Gfx.vgrad(y + 6, y + 58, ["#e2e5e9", "#c4c9cf", "#a8aeb5"]);
        ctx.fill();
        ctx.strokeStyle = "#5d646c";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        // drive bays
        ctx.fillStyle = "#3c424a";
        ctx.fillRect(tx + 3, y + 11, 14, 4);
        ctx.fillRect(tx + 3, y + 17, 14, 4);
        ctx.fillStyle = "#6c737b";
        ctx.fillRect(tx + 12, y + 12.5, 3, 1);
        // vents
        ctx.fillStyle = "rgba(60,66,74,.55)";
        for (let i = 0; i < 4; i++) ctx.fillRect(tx + 4, y + 36 + i * 3, 12, 1);
        // power button & LEDs
        ctx.beginPath();
        ctx.arc(tx + 10, y + 28, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = "#8b9198";
        ctx.fill();
        Gfx.led(tx + 5, y + 52, 1.4, COLORS.ledGreen, true, 0.5);
        Gfx.led(tx + 9, y + 52, 1.4, COLORS.ledAmber, act && Math.floor(Sim.time / 60) % 2 == 0, 0.6);

        // --- monitor ---
        Gfx.rrect(mx + 23, y + 41, 8, 7, 1);
        ctx.fillStyle = "#3a4048";
        ctx.fill();
        Gfx.rrect(mx + 13, y + 47, 28, 4, 2);
        ctx.fillStyle = Gfx.vgrad(y + 47, y + 51, ["#4b525b", "#2b3036"]);
        ctx.fill();
        Gfx.rrect(mx, y + 2, 54, 40, 4);
        ctx.fillStyle = Gfx.vgrad(y + 2, y + 42, ["#3b4149", "#24282e"]);
        ctx.fill();
        ctx.strokeStyle = "#15181c";
        ctx.lineWidth = 1;
        ctx.stroke();
        // screen
        const sx = mx + 4, sy = y + 6, sw = 46, sh = 31;
        ctx.fillStyle = session ? Gfx.vgrad(sy, sy + sh, ["#0e2a22", "#071812"]) : Gfx.vgrad(sy, sy + sh, ["#0d1a2a", "#060d16"]);
        ctx.fillRect(sx, sy, sw, sh);
        // a few lines of terminal text
        const txt = session ? "rgba(74,222,128,.95)" : "rgba(120,170,210,.45)";
        ctx.fillStyle = txt;
        const widths = [30, 22, 36, 16];
        widths.forEach((lw, i) => ctx.fillRect(sx + 3, sy + 4 + i * 6, lw, 2));
        if (session && Math.floor(performance.now() / 500) % 2 == 0) ctx.fillRect(sx + 21, sy + 22, 4, 4);
        // screen glare
        ctx.fillStyle = "rgba(255,255,255,.05)";
        ctx.beginPath();
        ctx.moveTo(sx, sy); ctx.lineTo(sx + 22, sy); ctx.lineTo(sx, sy + 20); ctx.closePath();
        ctx.fill();
        if (session) {
            ctx.save();
            ctx.shadowColor = "#4ade80";
            ctx.shadowBlur = 12;
            ctx.strokeStyle = "rgba(74,222,128,.7)";
            ctx.strokeRect(sx - 0.5, sy - 0.5, sw + 1, sh + 1);
            ctx.restore();
        }
        // keyboard
        Gfx.rrect(mx + 6, y + 54, 42, 5, 1.5);
        ctx.fillStyle = Gfx.vgrad(y + 54, y + 59, ["#d4d8dd", "#a3a9b0"]);
        ctx.fill();
        ctx.fillStyle = "rgba(60,66,74,.45)";
        for (let k = 0; k < 9; k++) ctx.fillRect(mx + 8 + k * 4.4, y + 55.5, 3, 1);

        // LLDP daemon badge
        if (this.l2.lldp && this.l2.lldp.enabled) {
            Gfx.rrect(mx + 31, y - 4, 26, 11, 5.5);
            ctx.fillStyle = "rgba(20,14,36,.92)";
            ctx.fill();
            ctx.strokeStyle = COLORS.LLDP;
            ctx.lineWidth = 1;
            ctx.stroke();
            Gfx.text("lldpd", mx + 44, y + 4.5, { size: 7.5, weight: 700, color: COLORS.LLDP, mono: true });
        }

        // --- network socket(s) with link/activity LEDs ---
        this.nics.forEach(nic => {
            const off = nic.dir == "up" ? [{ x: -6, y: 9 }, { x: 6, y: 9 }]
                : [{ x: 0, y: -10 }, { x: 0, y: 9 }];
            nic.drawJack(off);
        });

        // --- labels ---
        const cx = this.x + this.w / 2;
        Gfx.text(this.id.toString(), cx, y + 75, { size: 12, weight: 700, color: session ? "#86efac" : COLORS.label });
        const ip = this.ipLabel();
        Gfx.text(ip, cx, y + 88, { size: 10, mono: true, color: this.nics[0] && this.nics[0].ip ? COLORS.labelDim : COLORS.ARP });
    }

    // other hosts on the same Ethernet segment (through cables and hubs)
    peers() {
        const res = [];
        const seenHub = new Set();
        const walk = port => {
            const o = port.peer();
            if (!o) return;
            if (o.hub) {
                if (seenHub.has(o.hub)) return;
                seenHub.add(o.hub);
                o.hub.ports.forEach(hp => { if (hp != o) walk(hp); });
            } else if (o.host && o.host != this) {
                res.push(o);
            }
        };
        this.nics.forEach(walk);
        return res;
    }

    tooltipLines() {
        const n = this.nics[0];
        return [
            `${this.id} · Linux workstation`,
            `IP   ${n && n.ip ? n.ip.toString() : "—"}`,
            `MAC  ${n ? n.mac : "—"}`,
            `ARP cache ${this.l3.arp.cache.length} · LLDP ${this.l2.lldp && this.l2.lldp.enabled ? "running" : "stopped"}`,
            this.hasSession() ? "shell open in the terminal" : "click for details",
        ];
    }

    inspect() {
        const ifRows = this.nics.map(n => `<tr><td class="m">${n.id}</td><td class="m">${n.mac}</td>
            <td class="m">${n.ip ? n.ip.toString() : "—"}</td>
            <td>${n.linkUp() ? '<span class="pill on">UP</span>' : '<span class="pill off">DOWN</span>'}</td>
            <td class="m">${n.stats.tx}/${n.stats.rx}/${n.stats.drop}</td></tr>`).join("");
        const arp = this.l3.arp;
        const arpRows = arp.cache.map(e => `<tr><td class="m">${e.ip}</td><td class="m">${e.mac}</td><td class="m">${e.port}</td>
            <td>${arp.state(e) == "REACHABLE" ? '<span class="pill on">REACHABLE</span>' : '<span class="pill warn">STALE</span>'}</td>
            <td class="m">${Math.round((Sim.time - e.timestamp) / 1000)}s</td></tr>`).join("");
        const lldp = this.l2.lldp;
        const nbRows = lldp ? lldp.neighbors.map(nb => `<tr><td>${esc(nb[3] ? nb[3].getValue("SystemName") : "?")}</td>
            <td class="m">${nb[1]}</td><td class="m">${nb[0]}</td><td class="m">${nb[4] || ""}</td></tr>`).join("") : "";
        const pend = arp.pending.map(p => `<tr><td class="m">${p.ip}</td><td>${p.packet.getValue("Protocol")} to ${p.packet.getValue("DstIP")}</td></tr>`).join("");
        const peers = this.peers().map(n => `<span class="lnk" data-host="${n.host}">${n.host}</span> <span class="mono note">${n.ip ? n.ip.ip : ""}</span>`).join(" · ");
        return {
            title: `${this.id}`,
            sub: "Linux workstation · end station" + (this.hasSession() ? " · shell open" : ""),
            badge: "PC",
            color: COLORS.ETH,
            sections: [
                {
                    h: "Network interfaces (ip addr)", html: `<table class="t"><tr><th>Dev</th><th>MAC</th><th>IPv4</th><th>Link</th><th>TX/RX/ign</th></tr>${ifRows}</table>`
                },
                {
                    h: "Routing table (ip route)", html: `<pre>${esc(this.l3.routing.lines().join("\n") || "(empty)")}</pre>
                    <p class="note">${this.forwarding ? "Connected networks plus static routes. For every packet the router picks the most specific matching route (longest prefix match)." : this.l3.routing.gateway ? `Local network: send directly. Anything else goes to the default gateway <b>${this.l3.routing.gateway}</b>, a router.` : "One route per connected network: “to reach 192.168.1.x, just send it out of this card”. No gateway → only the local network is reachable."}</p>`
                },
                {
                    h: "ARP cache (ip neigh)", html: arp.cache.length ?
                        `<table class="t"><tr><th>IP</th><th>MAC</th><th>Dev</th><th>State</th><th>Age</th></tr>${arpRows}</table>` :
                        `<p class="note">Empty. Before this host can send an IP packet to a neighbour, it has to learn the neighbour's MAC address with ARP.</p>`
                },
                ...(pend ? [{ h: "Waiting for ARP", html: `<table class="t"><tr><th>For IP</th><th>Held packet</th></tr>${pend}</table>` }] : []),
                {
                    h: "LLDP daemon (lldpcli show neighbors)", html: `<p>${lldp && lldp.enabled ? '<span class="pill on">lldpd running</span>' : '<span class="pill off">lldpd stopped</span>'}</p>` +
                        (nbRows ? `<table class="t"><tr><th>Neighbour</th><th>Port</th><th>Chassis MAC</th><th>Via</th></tr>${nbRows}</table>` :
                            `<p class="note">No neighbours known. A neighbour appears when it sends an LLDP frame (<code>lldpcli update</code>) and our lldpd is running.</p>`)
                },
                {
                    h: "Name service (/etc/resolv.conf)", html: this.dnsServer ?
                        `<pre>${this.domain ? "search " + esc(this.domain) + "\n" : ""}nameserver ${esc(this.dnsServer)}</pre>` +
                        (this.lease ? `<p class="note">Address leased from DHCP server ${this.lease.server} for ${this.lease.time} s.</p>` : "") :
                        `<p class="note">No DNS server set — this computer only understands IP addresses, not names.${this.useDhcp && !(this.nics[0] && this.nics[0].ip) ? " Run <code>dhclient</code> to get an address, gateway and DNS server automatically." : ""}</p>`
                },
                { h: "Same Ethernet segment", html: peers ? `<p>${peers}</p>` : `<p class="note">nobody</p>` },
            ],
        };
    }

    lldpOn() { return !!(this.l2.lldp && this.l2.lldp.enabled); }

    // ---- names: `hostname X` lasts until the next reboot, `hostnamectl set-hostname X`
    // is written to /etc/hostname and stays. Returns an error text or null.
    rename(name, persistent) {
        if (!/^[A-Za-z][A-Za-z0-9-]{0,23}$/.test(name)) return "hostname: the name must start with a letter and contain only letters, digits and '-' (at most 24)";
        const other = Id.find(name);
        if (other && other !== this) return `hostname: “${name}” is already the name of another device`;
        const old = this.id.toString();
        this.id.name = name == this.id.defaultName() ? null : name;
        if (persistent) this.persistName = this.id.name;
        this.nics.forEach(n => n.tlv.addValue("SystemName", this.id.toString()));
        if (old != name) {
            Sim.event("info", `<b>${old}</b> is now called <b>${esc(name)}</b>` + (persistent ? " (saved in /etc/hostname)" : " (until the next reboot)"), { obj: this });
            // popups and the shell prompt show the new name
            const w = Inspector.wins.get(this);
            if (w) {
                const at = { x: parseInt(w.el.style.left) || 100, y: parseInt(w.el.style.top) || 100 };
                Inspector.close(this);
                Inspector.open(this, at);
            }
            if (shell.host == this && !shell.oneShot) shell.updatePrompt();
        }
        return null;
    }

    // ---- reboot: the machine is gone for a few seconds, then starts with the
    // settings it has on disk (the lab's start settings), everything learned is forgotten
    reboot() {
        if (this.down) return;
        const name = this.id.toString();
        if (shell.host == this) {
            if (shell.job) { shell.job.cancel(false); shell.job = null; }
            terminal.println(`Connection to ${name} closed by remote host.\nConnection to ${name} closed.`);
            if (!shell.oneShot) shell.toConsole();
        }
        Sim.event("info", `<b>${name}</b> reboots: every program stops, the network card goes quiet. Learned things (ARP cache, DHCP address, routes added by hand, LLDP neighbours) are forgotten.`, { obj: this });
        this.down = true;
        this.downSince = Sim.time;
        this.resetState();
        Sim.after(Host.BOOT_MS, () => {
            this.down = false;
            this.bootTime = new Date();
            Sim.event("info", `<b>${this}</b> is up again with its start settings` +
                (this.nics.some(n => n.ip) ? ": " + this.nics.filter(n => n.ip).map(n => n.ip.toString()).join(", ") : this.useDhcp ? " — no address yet, run dhclient" : ""), { obj: this });
        });
    }

    resetState() {
        const s = this.spec;
        const oldStatic = this.l3.routing.table.filter(r => r.proto == "static").map(r => (r.cidr == 0 ? "default" : r.net + "/" + r.cidr) + " via " + r.via);
        const oldIps = this.nics.map(n => n.ip);
        const svc = {
            dhcp: this.dhcpd ? { range: this.dhcpd.first + "-" + this.dhcpd.last, router: this.dhcpd.router, dns: this.dhcpd.dns, domain: this.dhcpd.domain, lease: this.dhcpd.lease } : null,
            dns: this.named ? { domain: this.named.domain, records: Object.assign({}, this.named.records) } : null,
        };
        const leases = this.dhcpd ? this.dhcpd.leases : null; // dhcpd keeps its lease file on disk
        this.l2 = new Layer2(this);
        this.l3 = new Layer3(this);
        this.udp = new Udp(this);
        this.dhcpc = new DhcpClient(this);
        this.resolver = new Resolver(this);
        this.lease = null;
        this.dhcpPending = false;
        const parse = v => { if (!v || v == "dhcp") return null; const [ip, c] = v.split("/"); return new IP(ip, parseInt(c || 24)); };
        if (s) {
            const ips = s.ifs ? s.ifs.map(f => f.ip) : [s.ip];
            this.nics.forEach((n, i) => { n.ip = parse(ips[i]); });
            this.useDhcp = s.ip == "dhcp";
            this.dnsServer = s.dns || null;
            this.domain = s.domain || null;
        } else {
            // made in the editor: what it had is what it has on disk, except DHCP addresses
            this.nics.forEach((n, i) => { n.ip = this.useDhcp ? null : oldIps[i]; });
            if (this.useDhcp) { this.dnsServer = null; this.domain = null; }
        }
        this.nics.forEach(n => {
            if (n.ip) n.tlv.addValue("MgmtIP", n.ip.ip);
            this.l3.routing.addRoute(n);
        });
        if (s && s.gw) this.l3.routing.addDefault(s.gw);
        if (s && s.routes) Topology.applyRoutes(this, s.routes);
        if (!s) Topology.applyRoutes(this, oldStatic);
        if (svc.dhcp || svc.dns) {
            this.dhcpd = this.named = null;
            this.startServices(svc);
            if (leases && this.dhcpd) this.dhcpd.leases = leases.filter(l => l.state == "bound");
        }
        // the name from /etc/hostname
        this.id.name = this.persistName || null;
        this.nics.forEach(n => n.tlv.addValue("SystemName", this.id.toString()));
        // /tmp is emptied at boot, the home folder stays
        const f = this.userFiles || {};
        Object.keys(f).forEach(k => { if (k.startsWith("/tmp/")) delete f[k]; });
    }

    actions() {
        const peer = this.peers()[0];
        const target = peer && peer.ip ? peer.ip.ip : "192.168.1.2";
        const id = this.id.toString();
        const n = this.nics[0];
        return [
            { label: "Open shell", cmd: `ssh ${id}` },
            ...(this.useDhcp || !(n && n.ip) ? [{ label: "dhclient", cmd: `ssh ${id} dhclient` }] : []),
            {   // one button that follows the state of the daemon
                label: () => this.lldpOn() ? "Stop lldpd" : "Start lldpd",
                cmd: () => `ssh ${id} systemctl ${this.lldpOn() ? "stop" : "start"} lldpd`,
            },
            { label: "Send LLDP", cmd: `ssh ${id} lldpcli update` },
            { sep: true },
            { input: target, title: "IP address or name" },
            { label: "arping", tpl: `ssh ${id} arping {}` },
            { label: "ping", tpl: `ssh ${id} ping -c 3 {}` },
            { label: "traceroute", tpl: `ssh ${id} traceroute {}` },
            ...(n ? [{ sep: true }, { input: n.ip ? n.ip.toString() : "192.168.1.50/24", title: "address/prefix for " + n.id },
                { label: "Set IP", tpl: `ssh ${id} ip addr replace {} dev ${n.id}` }] : []),
            ...this.nameActions(),
        ];
    }

    // buttons every machine has: reboot it, give it a new name
    nameActions() {
        const id = this.id.toString();
        return [{ sep: true }, { input: id, title: "a new name for this machine" },
            { label: "Rename", tpl: `ssh ${id} hostnamectl set-hostname {}` },
            { label: "Reboot", cmd: `ssh ${id} reboot` }];
    }

    toString() {
        return super.toString();
    }
}
