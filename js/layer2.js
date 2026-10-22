class Layer2 {
    constructor(host) {
        this.host = host;
        this.lldp = null;
    }

    lldpStart() {
        if (!this.lldp) {
            this.lldp = new LLDP(this.host);
        }
        if (!this.lldp.enabled) {
            this.lldp.enabled = true;
            this.lldp.start();
            Sim.event("info", `<b>${this.host}</b> lldpd started — it will listen for LLDP neighbours`, { proto: "LLDP", obj: this.host });
        }
        Debug.log(this.host.id, "LLDPstarted", "");
        return "lldp.service started";
    }

    lldpStop() {
        if (this.lldp && this.lldp.enabled) {
            this.lldp.enabled = false;
            Sim.event("info", `<b>${this.host}</b> lldpd stopped`, { proto: "LLDP", obj: this.host });
        }
        Debug.log(this.host.id, "LLDPstopped", this);
        return "lldp.service stopped";
    }

    sendLldp() {
        if (this.lldp && this.lldp.enabled) {
            this.host.nics.forEach(nic => {
                this.sendFrame(nic, 'LLDP', nic.tlv);
            });
        }
        else {
            Debug.log(this.host.id, "LLDP disabled");
        }
    }

    showDetails() {
        if (this.lldp && this.lldp.enabled) {
            return this.lldp.showDetails();
        }
    }

    showNeighbors() {
        if (this.lldp && this.lldp.enabled) {
            return this.lldp.showNeighbors();
        }
    }

    // The NIC hardware filter: only own MAC, broadcast and subscribed multicast get through
    acceptReason(frame, nic) {
        const dst = String(frame.macDst).toLowerCase();
        if (dst == String(nic.mac).toLowerCase()) return "it is my MAC";
        if (dst == ARP.BROADCAST) return "broadcast";
        if (dst == LLDP.MULTICAST) return "LLDP multicast";
        return null;
    }

    rcvFrame(frame, port) {
        if (frame.vlan && frame.vlan != 1) { // came in on a trunk: Linux without a VLAN interface drops it
            port.stats.drop++;
            frame.log(`${this.host} ${port.id} dropped it: it carries VLAN tag ${frame.vlan}`);
            Sim.event("drop", `<b>${this.host}</b> ${port.id} drops a frame tagged with VLAN ${frame.vlan} — it has no VLAN interface`, { frame });
            frame.dispose("dropped");
            return;
        }
        const why = this.acceptReason(frame, port);
        if (!why) {
            port.stats.drop++;
            frame.log(`${this.host} ${port.id} ignored it: not addressed to ${port.mac}`);
            Sim.event("drop", `<b>${this.host}</b> ${port.id} ignores it — destination ${frame.macDst} is not its MAC`, { frame });
            frame.dispose("dropped");
            return;
        }
        frame.log(`${this.host} ${port.id} accepted it (${why}) and handed it to ${frame.etherType}`);
        Sim.event("rx", `<b>${this.host}</b> ${port.id} accepts ${frame.label()} (${why}) → passes it to ${frame.etherType}`, { frame });
        if (frame.etherType == 'LLDP') {
            if (this.lldp && this.lldp.enabled) {
                this.lldp.processFrame(frame, port);
            }
            else {
                Sim.event("l3", `<b>${this.host}</b> lldpd is not running, the LLDP frame is discarded`, { frame });
            }
        }
        else if (frame.etherType == 'ARP') {
            this.host.l3.rcvArpPayload(frame.payload, port, frame);
        }
        else if (frame.etherType == 'IPv4') {
            this.host.l3.processIpPayload(frame.payload, port, frame);
        }
        else {
            Debug.log(this.host.id, "UnknownFrameEtherType", frame);
        }
        frame.dispose("delivered");
    }

    // nextHop: for IPv4, the IP whose MAC we need (the gateway or the destination itself)
    sendFrame(nic, etherType, payload, nextHop) {
        let macTarget;
        if (etherType == 'LLDP') {
            macTarget = LLDP.MULTICAST;
        }
        else if (etherType == 'ARP') {
            macTarget = payload.getValue('OpCode') == 'ArpRequest' ?
                ARP.BROADCAST : String(payload.getValue('DstMAC'));
        }
        else if (etherType == 'IPv4') {
            const hop = nextHop || payload.getValue("DstIP");
            macTarget = hop == "255.255.255.255" ? ARP.BROADCAST : this.host.l3.arp.getMAC(hop);
            if (!macTarget) {
                // no MAC known yet: hold the packet and resolve with ARP first
                this.host.l3.arp.resolve(nic, payload, hop);
                return;
            }
        }
        if (macTarget) {
            const frame = new Frame(
                nic.x,nic.y, String(macTarget), nic.mac, etherType, payload
            );
            nic.sendFrame(frame);
        }
        else Debug.error("Layer2", "ARPrequired");
    }
}
