class NIC extends Port {
    constructor(id, x, y ,mac) {
        super(id, x, y);
        this.mac = mac; // Instance of MacAddress
        log("NIC", "Create", this);
        this.arp = new Arp(this);
        this.lldp = null;
        //this.lldpStart(); // Start LLDP by default
        this.ip = new IPaddress();
    }

    rcvFrame(frame) {
        super.rcvFrame(frame);
        if (frame.etherType === 'lldp' && this.lldp && this.lldp.enabled) {
            this.lldp.processFrame(frame);
        }
        else if (frame.etherType === 'arp') {
            this.arp.processFrame(frame);
        } else {
            log("NIC", "UnknownFrame", frame);
        }
    }

    toString() {
        return super.toString() + " " + this.mac;
    }

    lldpStart() {
        if (!this.lldp) this.lldp = new Lldp(this);
        this.lldp.enabled = true;
        this.lldp.start();
        log("NIC", "LLDPstarted", this);
    }

    lldpStop() {
        if (this.lldp) this.lldp.enabled = false;
        log("NIC", "LLDPstopped", this);
    }

}
