class Switching {
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
        if (frame.etherType === 'lldp') {
            if (this.lldp && this.lldp.enabled) {
                this.lldp.processFrame(frame);
            }
        }
        else if (frame.etherType === 'arp') {
            this.host.l3.arp.processArpPayload(frame.payload.data, port, frame.color);
        } else {
            Debug.log(this.host.id, "UnknownFrameType", frame);
        }
        frame.removeFromDrawlist();
        Id.remove(frame);
    }
}
