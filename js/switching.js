class Switching {
    constructor(host) {
        this.host = host;
        this.lldp = null;
        this.lldpStart();
    }

    lldpStart() {
        if (!this.lldp) this.lldp = new LLDP(this.host);
        this.lldp.enabled = true;
        this.lldp.start();
        Debug.log(this.host.id, "LLDPstarted", "");
    }

    lldpSendDU() {
        if (this.lldp.enabled) this.host.nics.forEach(nic => {
            this.lldp.sendLldpDu(nic);
        });
    }

    lldpStop() {
        if (this.lldp) this.lldp.enabled = false;
        Debug.log(this.id, "LLDPstopped", this);
    }

    rcvFrame(frame) {
        if (frame.etherType === 'lldp' && this.lldp && 
            this.lldp.enabled) 
        {
            this.lldp.processFrame(frame);
        }
        else if (frame.etherType === 'arp') {
            this.arp.processFrame(frame);
        } else {
            Debug.log(this.id, "UnknownFrameType", frame);
        }
    }
}
