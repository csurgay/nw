// Layer 4 (UDP) and two application protocols that ride on it: DHCP and DNS.

class UdpDatagram extends PDU {
    constructor(srcPort, dstPort, payload) {
        super("UdpDatagram");
        this.addHeaderField("SrcPort");
        this.addValue("SrcPort", srcPort);
        this.addHeaderField("DstPort");
        this.addValue("DstPort", dstPort);
        this.addPayload(payload);
    }
}

// DHCP message (RFC 2131). type: DISCOVER OFFER REQUEST ACK NAK
class DhcpMessage {
    static TYPES = { DISCOVER: 1, OFFER: 2, REQUEST: 3, DECLINE: 4, ACK: 5, NAK: 6, RELEASE: 7 };
    constructor(type, xid, chaddr) {
        this.kind = "DHCP";
        this.type = type;
        this.xid = xid;
        this.chaddr = String(chaddr);
        this.ciaddr = "0.0.0.0"; // client's current IP (renewals only)
        this.yiaddr = "0.0.0.0"; // "your" IP: what the server gives
        this.siaddr = "0.0.0.0"; // server IP
        this.opts = {}; // requested, serverId, lease, mask, router, dns, domain
    }
    get op() { return ["DISCOVER", "REQUEST", "DECLINE", "RELEASE"].includes(this.type) ? 1 : 2; }
    toString() { return "DHCP " + this.type; }
}

// DNS message (RFC 1035), only A records
class DnsMessage {
    constructor(id, qname) {
        this.kind = "DNS";
        this.id = id;
        this.qname = qname;
        this.qtype = "A";
        this.qr = false; // false = query, true = response
        this.rcode = 0; // 0 = no error, 3 = NXDOMAIN
        this.answers = []; // {name, ip, ttl}
    }
    toString() { return "DNS " + (this.qr ? "response" : "query") + " " + this.qname; }
}

// The UDP part of a host's network stack: "sockets" are port -> handler
class Udp {
    constructor(host) {
        this.host = host;
        this.sockets = {};
    }

    bind(port, handler) { this.sockets[port] = handler; }
    unbind(port) { delete this.sockets[port]; }

    ephemeral() {
        let p;
        do { p = 32768 + Math.floor(Math.random() * 28000); } while (this.sockets[p]);
        return p;
    }

    // dstIp 255.255.255.255 needs the card to send on (no routing for broadcasts)
    send(srcIp, dstIp, srcPort, dstPort, app, nic) {
        const pkt = new IpPacket("UDP", srcIp, dstIp, new UdpDatagram(srcPort, dstPort, app));
        if (dstIp == "255.255.255.255") this.host.l3.sendBroadcast(nic, pkt);
        else this.host.l3.sendIp(pkt);
    }

    receive(ipPacket, nic, frame) {
        const d = ipPacket.getPayload();
        const port = d.getValue("DstPort");
        const h = this.sockets[port];
        if (h) return h(ipPacket, d.getPayload(), nic, frame);
        if (ipPacket.getValue("DstIP") == "255.255.255.255") {
            Sim.event("l3", `<b>${this.host}</b> nobody listens on UDP port ${port} here — broadcast ignored`, { frame });
            return;
        }
        Sim.event("drop", `<b>${this.host}</b> nobody listens on UDP port ${port} → ICMP “port unreachable”`, { frame });
        this.host.l3.icmpError(ipPacket, "DestUnreachable", 3, nic);
    }
}

// dhclient: Discover, Offer, Request, Ack ("DORA")
class DhcpClient {
    constructor(host) {
        this.host = host;
        this.job = null;
    }

    start(shell, nic) {
        const t = this.host.terminal;
        const job = { active: true, nic, xid: (Math.random() * 0xffffffff) >>> 0, state: "selecting", timer: null };
        job.cancel = (printPrompt) => { this.stop(job); if (printPrompt) t.showPrompt(); };
        this.job = job;
        shell.job = job;
        this.host.udp.bind(68, (pkt, msg, inNic, frame) => this.receive(job, pkt, msg, frame));
        this.host.dhcpPending = true;
        this.discover(job, 1);
        return false;
    }

    discover(job, attempt) {
        if (!job.active) return;
        const t = this.host.terminal;
        t.println(`DHCPDISCOVER on ${job.nic.id} to 255.255.255.255 port 67 interval 3`);
        Sim.event("l3", `<b>${this.host}</b> has no IP address yet → shouts to everybody: “Is there a DHCP server? I need an address!” (DHCPDISCOVER)`, { proto: "DHCP", obj: this.host });
        const m = new DhcpMessage("DISCOVER", job.xid, job.nic.mac);
        this.host.udp.send("0.0.0.0", "255.255.255.255", 68, 67, m, job.nic);
        job.timer = Sim.after(15000, () => {
            if (!job.active || job.state != "selecting") return;
            if (attempt < 2) return this.discover(job, attempt + 1);
            t.println("No DHCPOFFERS received.");
            this.stop(job);
            t.showPrompt();
        });
    }

    receive(job, pkt, msg, frame) {
        if (!job.active || !msg || msg.kind != "DHCP" || msg.xid != job.xid) return;
        const t = this.host.terminal;
        const from = msg.opts.serverId || pkt.getValue("SrcIP");
        if (msg.type == "OFFER" && job.state == "selecting") {
            if (job.timer) job.timer.cancel();
            job.state = "requesting";
            t.println(`DHCPOFFER of ${msg.yiaddr} from ${from}`);
            Sim.event("l3", `<b>${this.host}</b> got an offer: ${msg.yiaddr} from ${from} → asks for it officially (DHCPREQUEST, still broadcast so other servers hear it too)`, { frame, obj: this.host });
            const r = new DhcpMessage("REQUEST", job.xid, job.nic.mac);
            r.opts.requested = msg.yiaddr;
            r.opts.serverId = from;
            t.println(`DHCPREQUEST for ${msg.yiaddr} on ${job.nic.id} to 255.255.255.255 port 67`);
            this.host.udp.send("0.0.0.0", "255.255.255.255", 68, 67, r, job.nic);
            job.timer = Sim.after(15000, () => {
                if (!job.active) return;
                t.println("No DHCPACK received.");
                this.stop(job);
                t.showPrompt();
            });
        }
        else if (msg.type == "ACK" && job.state == "requesting") {
            if (job.timer) job.timer.cancel();
            t.println(`DHCPACK of ${msg.yiaddr} from ${from}`);
            const cidr = msg.opts.mask ? IP.cidrOf(msg.opts.mask) : 24;
            job.nic.setIP(new IP(msg.yiaddr, cidr));
            if (msg.opts.router) this.host.l3.routing.addDefault(msg.opts.router);
            if (msg.opts.dns) this.host.dnsServer = msg.opts.dns;
            if (msg.opts.domain) this.host.domain = msg.opts.domain;
            this.host.lease = { ip: msg.yiaddr, server: from, time: msg.opts.lease, got: Sim.time };
            Sim.event("l3", `<b>${this.host}</b> is now ${msg.yiaddr}/${cidr}` +
                (msg.opts.router ? `, gateway ${msg.opts.router}` : "") + (msg.opts.dns ? `, DNS server ${msg.opts.dns}` : "") + ` — the lease is valid for ${msg.opts.lease} s`, { frame, obj: this.host });
            t.println(`bound to ${msg.yiaddr} -- renewal in ${Math.round((msg.opts.lease || 3600) / 2)} seconds.`);
            this.stop(job);
            t.showPrompt();
        }
        else if (msg.type == "NAK") {
            t.println(`DHCPNAK from ${from}`);
            this.stop(job);
            t.showPrompt();
        }
    }

    stop(job) {
        job.active = false;
        if (job.timer) job.timer.cancel();
        this.host.udp.unbind(68);
        this.host.dhcpPending = false;
        if (this.job == job) this.job = null;
        if (shell.job == job) shell.job = null;
    }
}

// dhcpd on a server: hands out addresses from a pool
class Dhcpd {
    constructor(host, cfg) {
        this.host = host;
        const [a, b] = cfg.range.split("-");
        this.first = a.trim();
        this.last = b.trim();
        this.router = cfg.router || null;
        this.dns = cfg.dns || null;
        this.domain = cfg.domain || null;
        this.lease = cfg.lease || 3600;
        this.leases = []; // {ip, mac, state: offered|bound, t}
        host.udp.bind(67, (pkt, msg, nic, frame) => this.receive(pkt, msg, nic, frame));
    }

    toNum(ip) { return Wire.ip(ip).reduce((a, b) => a * 256 + b, 0); }
    toIp(n) { return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join("."); }

    pick(mac) {
        const own = this.leases.find(l => l.mac == mac);
        if (own) return own.ip;
        for (let n = this.toNum(this.first); n <= this.toNum(this.last); n++) {
            const ip = this.toIp(n);
            if (!this.leases.some(l => l.ip == ip)) return ip;
        }
        return null;
    }

    reply(type, req, ip, nic) {
        const m = new DhcpMessage(type, req.xid, req.chaddr);
        m.yiaddr = ip || "0.0.0.0";
        m.siaddr = nic.ip.ip;
        m.opts.serverId = nic.ip.ip;
        if (type != "NAK") {
            m.opts.lease = this.lease;
            m.opts.mask = IP.maskOf(nic.ip.cidr);
            if (this.router) m.opts.router = this.router;
            if (this.dns) m.opts.dns = this.dns;
            if (this.domain) m.opts.domain = this.domain;
        }
        // the client has no address yet, so the answer is broadcast too
        this.host.udp.send(nic.ip.ip, "255.255.255.255", 67, 68, m, nic);
    }

    receive(pkt, msg, nic, frame) {
        if (!msg || msg.kind != "DHCP" || !nic.ip) return;
        const h = `<b>${this.host}</b> dhcpd`;
        if (msg.type == "DISCOVER") {
            const ip = this.pick(msg.chaddr);
            if (!ip) {
                Sim.event("l3", `${h}: the address pool is empty, no offer for ${msg.chaddr}`, { frame, obj: this.host });
                return;
            }
            const l = this.leases.find(l => l.mac == msg.chaddr);
            if (!l) this.leases.push({ ip, mac: msg.chaddr, state: "offered", t: Sim.time });
            Sim.event("l3", `${h}: a new computer (${msg.chaddr}) asks for an address → offers ${ip} (DHCPOFFER)`, { frame, obj: this.host });
            this.reply("OFFER", msg, ip, nic);
        }
        else if (msg.type == "REQUEST") {
            if (msg.opts.serverId && msg.opts.serverId != nic.ip.ip) {
                this.leases = this.leases.filter(l => !(l.mac == msg.chaddr && l.state == "offered"));
                Sim.event("l3", `${h}: ${msg.chaddr} chose another server's offer — fine, the address goes back to the pool`, { frame, obj: this.host });
                return;
            }
            const want = msg.opts.requested || msg.ciaddr;
            const l = this.leases.find(l => l.mac == msg.chaddr);
            if (l && l.ip == want) {
                l.state = "bound";
                l.t = Sim.time;
                Sim.event("l3", `${h}: confirms ${want} for ${msg.chaddr} for ${this.lease} s (DHCPACK)`, { frame, obj: this.host });
                this.reply("ACK", msg, want, nic);
            } else {
                Sim.event("l3", `${h}: ${want} is not available for ${msg.chaddr} (DHCPNAK)`, { frame, obj: this.host });
                this.reply("NAK", msg, null, nic);
            }
        }
    }

    leaseText() {
        return this.leases.filter(l => l.state == "bound").map(l =>
            `lease ${l.ip} {\n  starts ${this.when(l.t)};\n  ends ${this.when(l.t + this.lease * 1000)};\n  hardware ethernet ${l.mac};\n  binding state active;\n}`).join("\n");
    }

    // dhcpd writes times like "4 2026/10/22 18:51:48" (weekday, UTC)
    when(simMs) {
        const d = new Date((typeof Vfs != "undefined" ? Vfs.BOOT.getTime() : Date.now()) + simMs);
        const p = n => String(n).padStart(2, "0");
        return `${d.getUTCDay()} ${d.getUTCFullYear()}/${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
    }
}

// The stub resolver every host has: asks the DNS server from /etc/resolv.conf
class Resolver {
    constructor(host) {
        this.host = host;
    }

    fqdn(name) {
        name = name.toLowerCase().replace(/\.$/, "");
        if (name.indexOf(".") < 0 && this.host.domain) name += "." + this.host.domain;
        return name;
    }

    // cb(ip, errorText)
    resolve(name, cb) {
        if (IP.isValid(name)) return cb(name, null);
        const server = this.host.dnsServer;
        if (!server) return cb(null, "Name or service not known");
        const q = this.fqdn(name);
        const id = Math.floor(Math.random() * 65535);
        const port = this.host.udp.ephemeral();
        const src = this.host.l3.routing.route(server);
        if (!src) return cb(null, "Temporary failure in name resolution");
        let done = false;
        const finish = (ip, err) => {
            if (done) return;
            done = true;
            this.host.udp.unbind(port);
            timer.cancel();
            cb(ip, err);
        };
        this.host.udp.bind(port, (pkt, msg) => {
            if (!msg || msg.kind != "DNS" || msg.id != id || !msg.qr) return;
            if (msg.rcode == 3 || !msg.answers.length) finish(null, "Name or service not known");
            else finish(msg.answers[0].ip, null);
        });
        const timer = Sim.after(20000, () => finish(null, "Temporary failure in name resolution"));
        Sim.event("info", `<b>${this.host}</b> needs the IP address of “${q}” → asks the DNS server ${server}`, { proto: "DNS", obj: this.host });
        this.host.udp.send(src.ip.ip, server, port, 53, new DnsMessage(id, q));
        return { cancel: () => finish(null, null) };
    }
}

// named on a server: answers questions about its zone
class Named {
    constructor(host, cfg) {
        this.host = host;
        this.domain = cfg.domain || "lab";
        this.records = {}; // fqdn -> ip
        Object.entries(cfg.records || {}).forEach(([n, ip]) => {
            this.records[(n.indexOf(".") < 0 ? n + "." + this.domain : n).toLowerCase()] = ip;
        });
        host.udp.bind(53, (pkt, msg, nic, frame) => this.receive(pkt, msg, nic, frame));
    }

    receive(pkt, msg, nic, frame) {
        if (!msg || msg.kind != "DNS" || msg.qr) return;
        const r = new DnsMessage(msg.id, msg.qname);
        r.qr = true;
        const ip = this.records[msg.qname];
        if (ip) {
            r.answers.push({ name: msg.qname, ip, ttl: 3600 });
            Sim.event("l3", `<b>${this.host}</b> named: “${msg.qname}” is ${ip} → answers`, { frame, obj: this.host });
        } else {
            r.rcode = 3;
            Sim.event("l3", `<b>${this.host}</b> named: no such name “${msg.qname}” → answers NXDOMAIN`, { frame, obj: this.host });
        }
        const d = pkt.getPayload();
        this.host.udp.send(pkt.getValue("DstIP"), pkt.getValue("SrcIP"), 53, d.getValue("SrcPort"), r);
    }

    zoneText() {
        return `$ORIGIN ${this.domain}.\n` + Object.entries(this.records).map(([n, ip]) =>
            `${n.replace("." + this.domain, "").padEnd(12)} IN  A   ${ip}`).join("\n");
    }
}
