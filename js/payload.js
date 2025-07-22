class Payload {
    static MACNULL = "00:00:00:00:00:00";
    static TYPES = [
        "opCode",
        "macSender",
        "ipSender",
        "macTarget",
        "ipTarget",
    ];

    constructor() {
        this.data = {};
    }

    addData(type, value) {
        if (Payload.TYPES.indexOf(type) == -1) {
            Debug.error("Payload", "Invalid type", type);
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
