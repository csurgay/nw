class Switching {
    constructor(host) {
        this.host = host;
        this.lldp = null;
        //this.lldpStart();
    }

    lldpStart() {
        if (!this.lldp) {
            this.lldp = new LLDP(this.host);
            this.lldp.enabled = true;
            this.lldp.start();
            Debug.log(this.host.id, "LLDPstarted", "");
        }
        else {
            Debug.log(this.host.id, "LLDP alerady started", "");
        }
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

    lldpStop() {
        if (this.lldp) this.lldp.enabled = false;
        Debug.log(this.host.id, "LLDPstopped", this);
    }

    showNeighbors() {
        if (this.lldp && this.lldp.enabled) {
            this.lldp.showNeighbors();
        }
    }

    rcvFrame(frame, port) {
        if (frame.etherType === 'lldp') {
            if (this.lldp && this.lldp.enabled) {
                this.lldp.processFrame(frame);
            }
        }
        else if (frame.etherType === 'arp') {
            this.host.l3.arp.processFrame(frame.payload, port);
        } else {
            Debug.log(this.host.id, "UnknownFrameType", frame);
        }
        frame.removeFromDrawlist();
        Id.remove(frame);
    }
}
