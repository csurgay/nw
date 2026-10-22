class NIC extends Port {
    constructor(x, y, mac) {
        super(x, y);
        this.id = new Id('NIC', this); // Unique identifier for NIC
        this.mac = mac;
        this.host = null;
        Debug.log(this.id, "Create", this.toString());
        this.lldpEnabled = true;
        this.ip = null;
        this.gateway = null;
        this.tlv = new TLV();
        this.tlv.addValue("ChassisID", this.mac.toString());
        this.tlv.addValue("PortID", this.id.toString());
        this.tlv.addValue("TTL", 120);
        this.info.push(["MAC", function (o) { return o.mac; }]);
        this.info.push(["IP", function (o) { return o.ip; }]);
    }

    sendFrame(frame) {
        frame.log(`sent by ${this.host} ${this.id}`);
        Sim.event("tx", `<b>${this.host}</b> ${this.id} sends: ${esc(frame.infoText())}`, { frame });
        super.sendFrame(frame);
    }

    rcvFrame(frame) {
        super.rcvFrame(frame);
        this.host.l2.rcvFrame(frame, this);
    }

    toString() {
        return "" + super.toString();
    }

    addIP(ip) {
        this.ip = ip;
        this.tlv.addValue("MgmtIP", ip.ip);
    }

    // change the address later (ip addr add / flush, DHCP); keeps the routing table in step
    setIP(ip) {
        if (this.host) this.host.l3.routing.removeNic(this);
        this.ip = ip;
        if (ip) this.tlv.addValue("MgmtIP", ip.ip);
        else delete this.tlv.headerValues["MgmtIP"];
        if (ip && this.host) this.host.l3.routing.addRoute(this);
    }

    getIP() {
        Debug.log(this.id, "IP", this.ip.toString());
    }

    addGateway(ip) {
        this.gateway = ip;
        this.host.l3.routing.addDefault(ip);
    }

    tooltipLines() {
        const p = this.peer();
        return [
            `${this.host} · ${this.id}  (network card)`,
            `MAC  ${this.mac}`,
            `IP   ${this.ip ? this.ip.toString() : "—"}`,
            `link ${this.linkUp() ? "up → " + p.owner() + " " + (p.hub ? "port " + (p.hub.ports.indexOf(p) + 1) : p.id) : "down"}`,
            `TX ${this.stats.tx}  RX ${this.stats.rx}  dropped ${this.stats.drop}`,
        ];
    }

    inspect() {
        const m = Wire.mac(this.mac);
        const group = m[0] & 1, local = m[0] & 2;
        const p = this.peer();
        const ip = this.ip;
        return {
            title: `${this.host} · ${this.id}`,
            sub: "Network interface card (Ethernet NIC)",
            badge: "NIC",
            color: COLORS.ETH,
            sections: [
                {
                    h: "Addresses", html: `<table class="t kv">
                    <tr><td>MAC address</td><td class="m">${this.mac}</td></tr>
                    <tr><td>IPv4 address</td><td class="m">${ip ? ip.toString() : "—"}</td></tr>
                    ${ip ? `<tr><td>Network</td><td class="m">${ip.subnet}/${ip.cidr}</td></tr>
                    <tr><td>Broadcast</td><td class="m">${IP.broadcastOf(ip.ip, ip.cidr)}</td></tr>
                    <tr><td>Netmask</td><td class="m">${IP.maskOf(ip.cidr)}</td></tr>` : ""}
                    </table>`
                },
                {
                    h: "What the MAC address tells", html: `<p>The first byte is <code>${Wire.hex(m[0])}</code> = <code>${m[0].toString(2).padStart(8, "0")}</code>.
                    The lowest bit <b>${group}</b> → ${group ? "a <b>group</b> (multicast) address" : "an <b>individual</b> (unicast) address"};
                    the next bit <b>${local ? 1 : 0}</b> → ${local ? "<b>locally administered</b> (set by software, like in this lab)" : "<b>globally unique</b>, burnt in by the manufacturer (the first 3 bytes are the vendor's OUI)"}.</p>`
                },
                {
                    h: "Link", html: `<table class="t kv">
                    <tr><td>State</td><td>${this.linkUp() ? '<span class="pill on">UP</span> 10 Mb/s, link LED on' : '<span class="pill off">DOWN</span>'}</td></tr>
                    <tr><td>Cable to</td><td>${p ? `${p.owner()} ${p.hub ? "port " + (p.hub.ports.indexOf(p) + 1) : p.id}` : "—"}</td></tr>
                    <tr><td>Frames sent</td><td class="m">${this.stats.tx}</td></tr>
                    <tr><td>Frames received</td><td class="m">${this.stats.rx}</td></tr>
                    <tr><td>Ignored (not for me)</td><td class="m">${this.stats.drop}</td></tr>
                    </table>`
                },
                {
                    h: "Receive filter", html: `<p class="note">The NIC listens to every frame on the cable but only passes these up to the operating system:</p>
                    <pre>${this.mac}       my own MAC (unicast)\nff:ff:ff:ff:ff:ff       broadcast\n01:80:c2:00:00:0e       LLDP multicast</pre>`
                },
            ],
        };
    }
}
