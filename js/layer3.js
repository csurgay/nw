class Layer3 {
    constructor(host) {
        this.host = host;
        this.arp = new ARP(this.host);
        this.icmp = new ICMP(this.host);
        this.routing = new Routing(this.host);
        this.arping = null; // running arping job
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

    sendIpPacket(nic, ipPacket) {
        this.host.l2.sendFrame(nic, 'IPv4', ipPacket);
    }

    processIpPayload(payload, nic, frame) {
        if (!nic.ip || payload.getValue("DstIP") != nic.ip.ip) {
            Sim.event("drop", `<b>${this.host}</b> IP packet for ${payload.getValue("DstIP")} is not for me and I am not a router — dropped`, { frame });
            return;
        }
        let protocol = payload.getValue("Protocol");
        if (protocol == 'ICMP') {
            this.icmp.processIcmpPayload(payload, nic, frame);
        }
    }

    // arping: send one ARP request and wait for the reply
    startArping(shell, ip) {
        const nic = this.routing.route(ip);
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
