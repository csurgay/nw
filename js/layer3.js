class Layer3 {
    constructor(host) {
        this.host = host;
        this.arp = new ARP(this.host);
        this.icmp = new ICMP(this.host);
        this.routing = new Routing(this.host);
        this.arping = null; // running arping job
    }

    isLocal(ip) {
        return this.host.nics.some(n => n.ip && n.ip.ip == ip);
    }

    sendArpRequest(ip, nic) {
        nic = nic || this.routing.route(ip) || this.host.nics[0];
        let payload = this.arp.getQueryPayload(ip, nic);
        this.host.l2.sendFrame(nic,
            'ARP',
            payload
        );
    }

    rcvArpPayload(payload, nic, frame) {
        this.arp.processArpPayload(payload, nic, frame);
    }

    // Send an IP packet the way the kernel does: look up the routing table,
    // pick the interface and the next hop (gateway or the destination itself).
    sendIp(packet) {
        const dst = packet.getValue("DstIP");
        const r = this.routing.lookup(dst);
        if (!r) {
            Sim.event("drop", `<b>${this.host}</b> has no route to ${dst} — packet dropped`, { proto: "IPv4", obj: this.host });
            return false;
        }
        this.host.l2.sendFrame(r.nic, 'IPv4', packet, r.via || dst);
        return true;
    }

    sendIpPacket(nic, ipPacket) {
        return this.sendIp(ipPacket);
    }

    processIpPayload(payload, nic, frame) {
        const dst = payload.getValue("DstIP");
        if (!this.isLocal(dst)) {
            if (this.host.forwarding) return this.forward(payload, nic, frame);
            Sim.event("drop", `<b>${this.host}</b> IP packet for ${dst} is not for me and I am not a router — dropped`, { frame });
            return;
        }
        let protocol = payload.getValue("Protocol");
        if (protocol == 'ICMP') {
            this.icmp.processIcmpPayload(payload, nic, frame);
        }
    }

    // Router: decrement TTL, look up the next hop, build a new frame
    forward(p, inNic, frame) {
        const dst = p.getValue("DstIP"), src = p.getValue("SrcIP");
        const st = this.host.fwdStats || {};
        const ttl = (p.getValue("TTL") || 64) - 1;
        const h = `<b>${this.host}</b>`;
        if (ttl <= 0) {
            st.ttl = (st.ttl || 0) + 1;
            Sim.event("rt", `${h} packet ${src} → ${dst} arrived with TTL 1 — TTL would reach 0, so it is dropped and an ICMP “time exceeded” goes back to ${src}`, { frame, obj: this.host });
            this.icmpError(p, "TimeExceeded", 0, inNic);
            return;
        }
        const r = this.routing.lookup(dst);
        if (!r) {
            st.noroute = (st.noroute || 0) + 1;
            Sim.event("rt", `${h} has no route to ${dst} → drops the packet and sends ICMP “network unreachable” to ${src}`, { frame, obj: this.host });
            this.icmpError(p, "DestUnreachable", 0, inNic);
            return;
        }
        const fwd = new IpPacket(p.getValue("Protocol"), src, dst, p.getPayload());
        fwd.addValue("TTL", ttl);
        fwd.ident = p.ident;
        st.fwd = (st.fwd || 0) + 1;
        if (frame) frame.log(`${this.host} routed the IP packet on: TTL ${ttl + 1} → ${ttl}`);
        Sim.event("rt", `${h} routes ${src} → ${dst}: TTL ${ttl + 1} → ${ttl}, out of ${r.nic.id} ` +
            (r.via ? `to the next router ${r.via}` : `(network directly connected)`) + ` in a brand-new Ethernet frame`, { frame, obj: this.host });
        this.host.l2.sendFrame(r.nic, 'IPv4', fwd, r.via || dst);
    }

    // send an ICMP error about packet `orig` back to its sender
    icmpError(orig, type, code, inNic) {
        const op = orig.getPayload();
        if (orig.getValue("Protocol") == "ICMP" && op && ["TimeExceeded", "DestUnreachable"].includes(op.getValue("Type"))) return; // never an error about an error
        const icmp = new IcmpPacket(type, 0, 0);
        icmp.code = code;
        icmp.orig = orig;
        const nic = inNic || this.routing.route(orig.getValue("SrcIP")) || this.host.nics[0];
        const pkt = new IpPacket("ICMP", nic.ip.ip, orig.getValue("SrcIP"), icmp);
        this.sendIp(pkt);
    }

    // arping: send one ARP request and wait for the reply
    startArping(shell, ip) {
        const nic = this.routing.directNic(ip);
        if (!nic) {
            shell.t.println("arping: connect: Network is unreachable");
            return true;
        }
        shell.t.println("ARPING " + ip + " from " + nic.ip.ip + " " + nic.id);
        const job = { ip, active: true, host: this.host };
        job.cancel = () => { job.active = false; if (this.arping == job) this.arping = null; };
        this.arping = job;
        shell.job = job;
        this.sendArpRequest(ip, nic);
        return false;
    }

    arpReply(ip, mac) {
        const job = this.arping;
        if (job && job.active && job.ip == ip) {
            this.host.terminal.println("Unicast reply from " + ip + " [" + mac + "]");
            this.host.terminal.showPrompt();
            job.cancel();
            if (shell.job == job) shell.job = null;
        }
    }
}
