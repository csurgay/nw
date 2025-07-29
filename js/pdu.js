class PDU { // Protocol Data Unit
    constructor(name) {
        this.name = name;
        this.headerFields = []; // name of fields
        this.headerValues = {}; // field values
        this.valueLookups = {}; // possible values
        this.payload = null;
        this.color = getRandomColor();
    }

    addHeaderField(field) {
        if (this.headerFields.includes(field)) {
            Debug.error(this.name, "DuplicateHeaderField", field);
        }
        else {
            this.headerFields.push(field);
        }
    }

    addLookup(field, lookup) {
        if (this.headerFields.includes(field)) {
            this.valueLookups[field] = lookup;
        }
        else {
            Debug.error(this.name+".addLookup", "MissingHeaderField", field);
        }
    }

    addValue(field, value) {
        if (this.headerFields.includes(field)) {
            if (!this.valueLookups[field] ||
                this.valueLookups[field].isValue(value)
            ) {
                this.headerValues[field] = value;
            }
            else {
                Debug.error(this.name, "MissingLookupValue", field + ":" + value);
            }
        }
        else {
            Debug.error(this.name+".addValue", "MissingHeaderField", field);
        }
    }

    isValue(field) {
        if (this.headerFields.includes(field)) {
            return true;
        }
        else {
            return false;
        }
    }

    getValue(field) {
        if (this.headerFields.includes(field)) {
            return this.headerValues[field];
        }
        else {
            Debug.error(this.name+".getValue", "MissingHeaderField", field);
        }
    }

    addPayload(payload) {
        this.payload = payload;
    }

    getPayload() {
        return this.payload;
    }

    toString(format="both") { // "textual", "numeric", or "both" 
        let ret = this.name + ":";
        this.headerFields.forEach(field => {
            ret += field + "=";
            let t = this.headerValues[field];
            let n = "";
            if (this.valueLookups[field]) {
                n = "(" + this.valueLookups[field].getValue(t) + ")";
            }
            ret += t + n + ",";
        });
        ret += "Payload=" + this.payload;
        return ret;
    }
}

class EthernetFrame extends PDU {
    constructor() {
        super("EthernetFrame");
        this.addHeaderField("DstMAC");
        this.addHeaderField("SrcMAC");
        this.addHeaderField("EtherType");
        this.addLookup("EtherType", new Lookup("EtherTypes", {
            "IPv4": "0x0800",
            "ARP": "0x0806",
            "Wake-on-LAN": "0x0842",
            "LLDP": "0x88cc",
        }));
    };
}

class TLV extends PDU {
    constructor() {
        super("TLV");
        this.addHeaderField("ChassisID");
        this.addHeaderField("PortID");
        this.addHeaderField("TTL");
        this.addHeaderField("SystemName");
        this.addHeaderField("SystemCapabilities");
        this.addLookup("SystemCapabilities", 
            new Lookup("SystemCapabilities", {
                "Other": 0,
                "Repeater": 1, // ampliflies network signal (Layer1)
                "Bridge": 2, // can forward based on MAC addresses (Layer2)
                "WlanAP": 3, // Wireless LAN Access Point
                "Router": 4, // can forward network traffic
                "Telephone": 5, // telephone
                "DocsysCable": 6, // data transmission over cable TV systems
                "Station": 7, //end-station or endpoint
            })
        );
    }
}

class ArpPacket extends PDU {
    static MACNULL = "00:00:00:00:00:00";
    constructor(opCode) {
        super("ArpPacket");
        this.addHeaderField("OpCode");
        this.addLookup("OpCode", new Lookup("ArpOpCode", {
            "ArpRequest": "0x01",
            "ArpReply": "0x02"
        }));
        this.addValue("OpCode", opCode);
        this.addHeaderField("SrcMAC");
        this.addHeaderField("SrcIP");
        this.addHeaderField("DstMAC");
        this.addHeaderField("DstIP");
    }
}

class IpPacket extends PDU {
    constructor(protocol, srcIP, dstIP, payload) {
        super("IpPacket");
        this.addHeaderField("Version");
        this.addLookup("Version", new Lookup("IpVersion", {
            "IPv4": "0x0800"
        }));
        this.addValue("Version", "IPv4");
        this.addHeaderField("TTL");
        this.addValue("TTL", 64);
        this.addHeaderField("Protocol");
        this.addValue("Protocol", protocol);
        this.addLookup("Protocol", new Lookup("IpProtocol", {
            "ICMP": "0x01",
            "TCP": "0x06",
            "UDP": "0x11",
            "IPv6": "0x29",
        }));
        this.addHeaderField("SrcIP");
        this.addValue("SrcIP", srcIP);
        this.addHeaderField("DstIP");
        this.addValue("DstIP", dstIP);
        this.addPayload(payload);
    }
}

class IcmpPacket extends PDU {
    constructor(type, seq) {
        super("IcmpPacket");
        this.addHeaderField("Type");
        this.addLookup("Type", new Lookup("IcmpTypes", {
            "EchoRequest": 0x08,
            "EchoReply": 0x00,
        }));
        this.addValue("Type", type);
        this.addHeaderField("Seq");
        this.addValue("Seq", seq);
    }
}
