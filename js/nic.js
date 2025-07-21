class NIC extends Port {
    constructor(x,y, mac) {
        super(x,y);
        this.id = new Id('NIC', this); // Unique identifier for NIC
        this.mac = mac;
        this.host = null;
        Debug.log(this.id, "Create", this.toString());
        this.lldpEnabled = true;
        this.ip = null;
        this.tlvs = new TLVs();
        this.tlvs.addData("ChassisID", this.mac.toString());
        this.tlvs.addData("PortID", this.id.toString());
    }

    rcvFrame(frame) {
        super.rcvFrame(frame);
        this.host.l2.rcvFrame(frame, this);
    }

    toString() {
        return ""+super.toString();
    }

    getIP() {
        Debug.log(this.id, "IP", this.ip.toString());
    }
}
