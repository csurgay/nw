class ArpEntry {
    constructor(ip, mac, port, timestamp = Sim.time) {
        this.ip = ip; // IP address as a string
        this.mac = mac; // MAC address as a string
        this.port = port; // NIC name as a string
        this.timestamp = timestamp; // Sim time of last confirmation
    }
}

class ARP {
    static BROADCAST = "ff:ff:ff:ff:ff:ff"; // Ethernet broadcast address
    static REACHABLE_MS = 30000; // after this an entry becomes STALE
    static TIMEOUT_MS = 8000; // give up resolving after this (sim time, the animation is slowed down)

    constructor(host) {
        this.id = new Id('ARP', this);
        this.host = host;
        this.cache = [];
        this.pending = []; // IP packets waiting for a MAC: {ip, nic, packet}
        this.resolving = {}; // ip -> timeout timer
        Debug.log(this.id, "Create", this.host.id);
    }

    processArpPayload(payload, nic, frame) {
        const spa = payload.getValue("SrcIP");
        const sha = String(payload.getValue("SrcMAC"));
        const tpa = payload.getValue("DstIP");
        const op = payload.getValue("OpCode");
        const forMe = nic.ip && tpa == nic.ip.ip;
        const h = `<b>${this.host}</b>`;

        // Linux: update an existing entry from any ARP, create one only if the ARP was meant for us
        if (this.entry(spa)) {
            this.cacheIP(spa, sha, nic.id);
        } else if (forMe) {
            this.cacheIP(spa, sha, nic.id);
            Sim.event("l3", `${h} learns ${spa} is at ${sha} and stores it in its ARP cache`, { frame, obj: this.host });
        }

        if (op == "ArpRequest") {
            if (forMe) {
                Debug.log(this.id, "Hit", tpa + "(" + nic.id + ")");
                Sim.event("l3", `${h} “${tpa} — that's me!” → answers with an ARP reply sent straight to ${sha}`, { frame, obj: this.host });
                let arpPacket = new ArpPacket("ArpReply");
                arpPacket.addValue("SrcMAC", nic.mac);
                arpPacket.addValue("SrcIP", nic.ip.ip);
                arpPacket.addValue("DstMAC", payload.getValue("SrcMAC"));
                arpPacket.addValue("DstIP", payload.getValue("SrcIP"));
                this.host.l2.sendFrame(nic, 'ARP', arpPacket);
            }
            else {
                Sim.event("l3", `${h} ARP asks for ${tpa}, not my IP — ignored`, { frame });
            }
        }
        else if (op == "ArpReply" && forMe) {
            Debug.log(this.id, "Reply", tpa + "(" + nic.id + ")");
            this.host.l3.arpReply(spa, sha);
        }
        this.flush(spa);
    }

    entry(ip) {
        return this.cache.find(e => e.ip == ip);
    }

    state(entry) {
        return Sim.time - entry.timestamp < ARP.REACHABLE_MS ? "REACHABLE" : "STALE";
    }

    remove(ip) {
        this.cache = this.cache.filter(entry => entry.ip !== ip);
        Debug.log(this.id, "Remove", ip);
    }

    cacheIP(ip, mac, port) {
        const e = this.entry(ip);
        if (e) {
            e.mac = mac; // Update mac
            e.port = port; // Update port
            e.timestamp = Sim.time;
            Debug.log(this.id, "Update", port + ":" + ip + " " + mac);
        }
        else {
            this.cache.push(new ArpEntry(ip, mac, port));
            Debug.log(this.id, "Add", port + ":" + ip + " " + mac);
        }
    }

    getMAC(ip) {
        const e = this.entry(ip);
        if (e) Debug.log(this.id, "Found", ip + " " + e.mac);
        return e ? e.mac : null;
    }

    getQueryPayload(ip, nic) {
        Debug.log(this.id, "Query "+nic+" -> "+ip);
        let payload = new ArpPacket("ArpRequest");
        payload.addValue("SrcMAC", nic.mac);
        payload.addValue("SrcIP", nic.ip.ip);
        payload.addValue("DstMAC", ArpPacket.MACNULL);
        payload.addValue("DstIP", ip);
        return payload;
    }

    // An IP packet needs the MAC of `ip` (next hop) that we don't know yet
    resolve(nic, packet, ip) {
        ip = ip || packet.getValue("DstIP");
        const dst = packet.getValue("DstIP");
        this.pending.push({ ip, nic, packet });
        if (this.resolving[ip]) return;
        Sim.event("l3", `<b>${this.host}</b> doesn't know the MAC of ${ip}${ip != dst ? " (the gateway toward " + dst + ")" : ""} yet → holds the IP packet and asks with ARP first`, { proto: "ARP", obj: this.host });
        this.resolving[ip] = Sim.after(ARP.TIMEOUT_MS, () => {
            delete this.resolving[ip];
            const lost = this.pending.filter(p => p.ip == ip);
            this.pending = this.pending.filter(p => p.ip != ip);
            if (!lost.length) return;
            Sim.event("drop", `<b>${this.host}</b> no ARP answer for ${ip} — ${lost.length} waiting packet(s) discarded`, { proto: "ARP", obj: this.host });
            lost.forEach(p => {
                if (this.host.l3.isLocal(p.packet.getValue("SrcIP"))) this.host.l3.icmp.localUnreachable(p.packet);
                else if (this.host.forwarding) this.host.l3.icmpError(p.packet, "DestUnreachable", 1, null);
            });
        });
        this.host.l3.sendArpRequest(ip, nic);
    }

    flush(ip) {
        const mac = this.getMAC(ip);
        if (!mac) return;
        const ready = this.pending.filter(p => p.ip == ip);
        if (!ready.length) return;
        this.pending = this.pending.filter(p => p.ip != ip);
        if (this.resolving[ip]) { this.resolving[ip].cancel(); delete this.resolving[ip]; }
        ready.forEach(p => this.host.l2.sendFrame(p.nic, 'IPv4', p.packet, ip));
    }

    showCache() {
        return this.cache.map(entry =>
            "? (" + entry.ip + ") at " + entry.mac.toString() + " [ether] on " + entry.port
        ).join("\n");
    }

    neighLines() {
        return this.cache.map(e => `${e.ip} dev ${e.port} lladdr ${e.mac} ${this.state(e)}`);
    }
}
