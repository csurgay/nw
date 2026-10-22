// A server: a host without a screen that runs services for the others (dhcpd, named).
class Server extends Host {
    constructor(x, y, terminal, opts = {}) {
        super(x, y, terminal, Object.assign({}, opts, { idType: "Server" }));
        this.dhcpd = null;
        this.named = null;
    }

    placeNic(nic) {
        if (this.nicSide == "up") { nic.x = this.x + 39; nic.y = this.y + 2; }
        else if (this.nicSide == "left") { nic.x = this.x + 19; nic.y = this.y + 44; }
        else { nic.x = this.x + 59; nic.y = this.y + 44; }
    }

    startServices(cfg) {
        if (cfg.dhcp) this.dhcpd = new Dhcpd(this, cfg.dhcp);
        if (cfg.dns) this.named = new Named(this, cfg.dns);
    }

    draw() {
        const x = this.x + 19, y = this.y + 2, w = 40, h = 58;
        const session = this.hasSession();
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,.45)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        Gfx.rrect(x, y, w, h, 4);
        ctx.fillStyle = Gfx.vgrad(y, y + h, ["#4a505a", "#30353c", "#22262b"]);
        ctx.fill();
        ctx.restore();
        Gfx.rrect(x, y, w, h, 4);
        ctx.strokeStyle = session ? "rgba(74,222,128,.8)" : "#121518";
        ctx.lineWidth = session ? 1.5 : 1;
        ctx.stroke();
        // drive bays with activity LEDs
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = "#1a1d21";
            ctx.fillRect(x + 4, y + 5 + i * 7, w - 8, 5);
            ctx.fillStyle = "#565d66";
            ctx.fillRect(x + 6, y + 6.5 + i * 7, 14, 1.2);
            Gfx.led(x + w - 7, y + 7.5 + i * 7, 1.3, COLORS.ledGreen, !this.activity() || (Math.floor(Sim.time / 50) + i) % 3 != 0, 0.4);
        }
        // service labels
        const svc = [];
        if (this.dhcpd) svc.push(["DHCP", COLORS.DHCP]);
        if (this.named) svc.push(["DNS", COLORS.DNS]);
        svc.forEach(([t, c], i) => {
            Gfx.rrect(x + 5, y + 28 + i * 11, w - 10, 9, 4.5);
            ctx.fillStyle = "rgba(10,12,16,.85)";
            ctx.fill();
            ctx.strokeStyle = c;
            ctx.lineWidth = 0.8;
            ctx.stroke();
            Gfx.text(t, x + w / 2, y + 35 + i * 11, { size: 6.5, weight: 800, color: c, mono: true });
        });
        Gfx.led(x + 7, y + h - 6, 1.6, COLORS.ledGreen, true, 0.5);
        Gfx.text("SRV", x + w / 2 + 4, y + h - 3.5, { size: 6.5, weight: 800, color: "#9aa6b2" });

        this.nics.forEach(nic => {
            const off = nic.dir == "up" ? [{ x: -6, y: 9 }, { x: 6, y: 9 }] : [{ x: nic.dir == "left" ? 7 : -7, y: -10 }, { x: nic.dir == "left" ? 7 : -7, y: 9 }];
            nic.drawJack(off);
        });
        const cx = this.x + this.w / 2;
        Gfx.text(this.id.toString(), cx, this.y + 75, { size: 12, weight: 700, color: session ? "#86efac" : COLORS.label });
        Gfx.text(this.ipLabel(), cx, this.y + 88, { size: 10, mono: true, color: COLORS.labelDim });
    }

    tooltipLines() {
        const n = this.nics[0];
        return [
            `${this.id} · server`,
            `IP   ${n && n.ip ? n.ip.toString() : "—"}`,
            `services: ${[this.dhcpd ? "dhcpd" : "", this.named ? "named (DNS)" : ""].filter(x => x).join(", ") || "none"}`,
            "click for leases and DNS records",
        ];
    }

    inspect() {
        const base = super.inspect();
        const secs = [];
        if (this.dhcpd) {
            const d = this.dhcpd;
            const rows = d.leases.map(l => `<tr><td class="m">${l.ip}</td><td class="m">${l.mac}</td><td>${l.state == "bound" ? '<span class="pill on">bound</span>' : '<span class="pill warn">offered</span>'}</td></tr>`).join("");
            secs.push({
                h: "DHCP server (dhcpd)", html: `<p>Hands out addresses <b>${d.first} – ${d.last}</b>` +
                    (d.router ? `, gateway ${d.router}` : "") + (d.dns ? `, DNS ${d.dns}` : "") + `, lease ${d.lease} s.</p>` +
                    (rows ? `<table class="t"><tr><th>IP</th><th>Client MAC</th><th>State</th></tr>${rows}</table>` : `<p class="note">No leases yet. Run <code>dhclient</code> on a client.</p>`)
            });
        }
        if (this.named) {
            const rows = Object.entries(this.named.records).map(([n, ip]) => `<tr><td class="m">${n}</td><td class="m">A</td><td class="m">${ip}</td></tr>`).join("");
            secs.push({ h: "DNS server (named) — zone " + this.named.domain, html: `<table class="t"><tr><th>Name</th><th>Type</th><th>Address</th></tr>${rows}</table>` });
        }
        base.title = `${this.id}`;
        base.sub = "Linux server" + (this.hasSession() ? " · shell open" : "");
        base.badge = "SRV";
        base.sections = [base.sections[0], ...secs, ...base.sections.slice(1).filter(s => !/^LLDP|^Same/.test(s.h))];
        return base;
    }

    actions() {
        const id = this.id.toString();
        return [
            { label: "Open shell", cmd: `ssh ${id}` },
            ...(this.dhcpd ? [{ label: "leases", cmd: `ssh ${id} cat /var/lib/dhcpd/dhcpd.leases` }] : []),
            ...(this.named ? [{ label: "zone file", cmd: `ssh ${id} cat /var/named/${this.named.domain}.zone` }] : []),
            { label: "ip neigh", cmd: `ssh ${id} ip neigh` },
            ...this.nameActions(),
        ];
    }
}
