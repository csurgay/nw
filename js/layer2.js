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
    }

    lldpStop() {
        if (this.lldp) this.lldp.enabled = false;
        Debug.log(this.host.id, "LLDPstopped", this);
    }

    sendLldpDu() {
        if (this.lldp && this.lldp.enabled) {
            this.host.nics.forEach(nic => {
                this.lldp.sendLldpDu(nic);
            });
        }
        else {
            Debug.log(this.host.id, "LLDP disabled");
        }
    }

    showNeighbors() {
        if (this.lldp && this.lldp.enabled) {
            return this.lldp.showNeighbors();
        }
    }

    rcvFrame(frame, port) {
        if (frame.etherType == Frame.EtherTypes.getValue('LLDP')) {
            if (this.lldp && this.lldp.enabled) {
                this.lldp.processFrame(frame);
            }
        }
        else if (frame.etherType == Frame.EtherTypes.getValue('ARP')) {
            this.host.l3.rcvArpPayload(frame.payload, port);
        } 
        else if (frame.etherType == Frame.EtherTypes.getValue('IPv4')) {
            this.host.l3.processIpPayload(
                frame.payload, port);
        } 
        else {
            Debug.log(this.host.id, "UnknownFrameEtherType", frame);
        }
        frame.removeFromDrawlist();
        Id.remove(frame);
    }

    sendPayload(nic, etherType, payload) {
        let macTarget = payload.data['macTarget'];
        if (!macTarget) {
            macTarget = this.host.l3.arp.getMAC(payload.data["ipTarget"]);
        }
        if (macTarget) {
            const frame = new Frame(
                nic.x,nic.y, macTarget, nic.mac, etherType, payload
            );
            let color = payload.data["payloadColor"];
            if (color) frame.frameColor = color;
            nic.sendFrame(frame);
        }
        else Debug.error("Layer2", "ARPrequired");
    }
}
