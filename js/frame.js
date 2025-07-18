class Frame {
    constructor(macDst, macSrc, etherType, payload) {
        this.type = new Id('Frame', this);
        this.macDst = macDst; // Destination MAC address
        this.macSrc = macSrc; // Source MAC address
        this.etherType = etherType; // EtherType field: "ipv4", "ipv6", "arp", "vlan", "lldp"
        this.payload = payload; // Data being sent
        this.timestamp = Date.now(); // Timestamp for the frame
        this.color=getRandomColor(); // Random color for visualization
        log("Frame", "Create", this);
    }
    toString() {
        return "Dst:"+this.macDst+" Src:"+this.macSrc+" EtherType:"+this.etherType+" Payload:"+this.payload;
    }
}
