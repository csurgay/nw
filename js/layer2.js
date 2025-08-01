class Layer2 {
    constructor(host) {
        this.host = host;
        this.lldp = null;
        //this.lldpStart();
    }

    lldpStart() {
        if (!this.lldp) {
            this.lldp = new LLDP(this.host);
            this.lldp.start();
        }
        else {
            if (!this.lldp.enabled) {
                this.lldp.start();
            }
        }
        this.lldp.enabled = true;
        Debug.log(this.host.id, "LLDPstarted", "");
        return "lldp.service started";
    }

    lldpStop() {
        if (this.lldp) this.lldp.enabled = false;
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

    rcvFrame(frame, port) {
        if (frame.etherType == 'LLDP') {
            if (this.lldp && this.lldp.enabled) {
                this.lldp.processFrame(frame);
            }
        }
        else if (frame.etherType == 'ARP') {
            this.host.l3.rcvArpPayload(frame.payload, port);
        } 
        else if (frame.etherType == 'IPv4') {
            this.host.l3.processIpPayload(
                frame.payload, port);
        } 
        else {
            Debug.log(this.host.id, "UnknownFrameEtherType", frame);
        }
        frame.removeFromDrawlist();
        Id.remove(frame);
    }

    sendFrame(nic, etherType, payload) {
        let macTarget;
        if (etherType == 'LLDP') {
            macTarget = LLDP.MULTICAST;
        }
        else if (etherType == 'ARP') {
            macTarget = payload.getValue('DstMAC');
        }
        else if (etherType == 'IPv4') {
            macTarget = this.host.l3.arp.getMAC(payload.getValue("DstIP"));
        }
        if (macTarget) {
            const frame = new Frame(
                nic.x,nic.y, macTarget, nic.mac, etherType, payload
            );
            let color = payload.color;
            if (color) frame.frameColor = color;
            nic.sendFrame(frame);
        }
        else Debug.error("Layer2", "ARPrequired");
    }
}
