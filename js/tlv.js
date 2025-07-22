class TLVs {
    static TYPES = [
        "ChassisID",
        "PortID",
        "TTL",
        "EOF",
        "PortDescription",
        "SystemName",
        "SystemCapabilities",
        "MTU",
    ];

    constructor() {
        this.data = {};
        this.id = new Id("TLVs", this);
    }

    addData(type, value) {
        if (TLVs.TYPES.indexOf(type) == -1) {
            Debug.error(new Id("TLVs", 0), "Invalid type", type);
        }
        else this.data[type] = value;
    }

    toString() {
        let ret = "";
        for (let k in this.data) {
            ret += k + ":" + this.data[k] + " ";
        }
        return ret;
    }
}
