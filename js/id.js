class Id {
    static types = {
        'Id': 0,
        'Debug': 0,
        'ARP': 0,
        'ICMP': 0,
        'ARPentry': 0,
        'LLDP': 0,
        'NIC': 0,
        'Port': 0,
        'Patch': 0,
        'Hub': 0,
        'Switch': 0,
        'Router': 0,
        'Server': 0,
        'Host': 0,
        'Frame': 0,
        'MAC': 0,
        'IP': 0,
        'TLVs': 0,
        'FrameType': 0,
        'PacketType': 0,
        'Drawable': 0,
        'Clickable': 0,
        'Draggable': 0,
        'Canvas': 0,
        'Network': 0,
        'Device': 0,
        "Test": 0,
    };
    static list = {};
    constructor(type, object) {
        if (!Id.types[type] && Id.types[type] != 0) {
            Debug.error(new Id("Id",0), "Invalid type", type);
        }
        this.type = type;
        Id.types[type] += 1;
        this.seq = Id.types[type];
        if (!Id.list[type]) {
            Id.list[type] = [];
        }
        Id.list[type].push(object);
    }

    toString() {
        return this.name || this.defaultName(); // name: set by hostname / hostnamectl
    }

    // machines and network boxes are called like on a real network: host1, router2, switch1
    static LOWER = ["Host", "Router", "Server", "Switch", "Hub"];

    defaultName() {
        return (Id.LOWER.includes(this.type) ? this.type.toLowerCase() : this.type) + this.seq;
    }

    // host names are not case sensitive (ssh HOST1 reaches host1), an exact match wins
    static find(name) {
        let ret, loose;
        const low = String(name).toLowerCase();
        for (let k in Id.list) {
            Id.list[k].forEach(item => {
                if (!item || !item.id) return;
                const n = item.id.toString();
                if (name == n) ret = item;
                else if (low == n.toLowerCase()) loose = loose || item;
            })    
        }
        return ret || loose;
    }

    static remove(object) {
        let found = false;
        for (let k in Id.list) {
            const index = Id.list[k].indexOf(object);
            if (index > -1) {
                Id.list[k].splice(index, 1);
                Debug.log(object.id, "RemoveFromIdlist", object.id);
                found = true;
            }
        }
        if (!found) {
            Debug.error(object.id,"not found in Idlist", object.id);
        }
    }
}

