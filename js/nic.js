class NIC extends Port {
    constructor(x, y, mac) {
        super(x, y);
        this.id = new Id('NIC', this); // Unique identifier for NIC
        this.mac = mac;
        this.host = null;
        Debug.log(this.id, "Create", this.toString());
        this.lldpEnabled = true;
        this.ip = null;
        this.gateway = null;
        this.tlv = new TLV();
        this.tlv.addValue("ChassisID", this.mac.toString());
        this.tlv.addValue("PortID", this.id.toString());
        this.info.push(["MAC", function (o) { return o.mac; }]);
        this.info.push(["IP", function (o) { return o.ip; }]);
    }

    rcvFrame(frame) {
        super.rcvFrame(frame);
        this.host.l2.rcvFrame(frame, this);
    }

    toString() {
        return "" + super.toString();
    }

    getIP() {
        Debug.log(this.id, "IP", this.ip.toString());
    }

    addGateway(ip) {
        this.gateway = ip;
        this.host.l3.reouting.addDefault(ip);
    }
}
