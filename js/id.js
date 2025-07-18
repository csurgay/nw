class Id {
    static types = {
        'ARP': 0,
        'ARPentry': 0,
        'LLDP': 0,
        'NIC': 0,
        'Port': 0,
        'Patch': 0,
        'Hub': 0,
        'Switch': 0,
        'Router': 0,
        'Host': 0,
        'Frame': 0,
        'Packet': 0,
        'MAC': 0,
        'IP': 0,
        'TLV': 0,
        'FrameType': 0,
        'PacketType': 0,
        'Drawable': 0,
        'Network': 0,
        'Device': 0
    };
    static list = {};
    constructor(type, object) {
        if (!Id.types[type] && Id.types[type] != 0) {
            error("Type", "Invalid type", type);
        }
        this.type = type;
        Id.types[type] += 1;
        this.seq = Id.types[type];
        if (!Id.list[type]) {
            Id.list[type] = [];
        }
        Id.list[type].push(object);
    }
}
