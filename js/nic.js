class NIC extends Port {
    constructor(x,y, mac) {
        super(x,y);
        this.id = new Id('NIC', this); // Unique identifier for NIC
        this.mac = mac;
        Debug.log(this.id, "Create", this.toString());
        this.arp = new ARP(this);
        this.lldp = null;
        this.lldpStart(); // Start LLDP by default
        this.ip = null;
    }

    rcvFrame(frame) {
        super.rcvFrame(frame);
        if (frame.etherType === 'lldp' && this.lldp && this.lldp.enabled) {
            this.lldp.processFrame(frame);
        }
        else if (frame.etherType === 'arp') {
            this.arp.processFrame(frame);
        } else {
            Debug.log(this.id, "UnknownFrameType", frame);
        }
    }

    toString() {
        return ""+super.toString();
    }

    lldpStart() {
        if (!this.lldp) this.lldp = new LLDP(this);
        this.lldp.enabled = true;
        this.lldp.start();
        Debug.log(this.id, "LLDPstarted", this);
    }

    lldpStop() {
        if (this.lldp) this.lldp.enabled = false;
        Debug.log(this.id, "LLDPstopped", this);
    }

}
