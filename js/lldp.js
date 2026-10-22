class LLDP {  // Link Layer Discovery Protocol
    static MULTICAST = "01:80:c2:00:00:0e"; // LLDP multicast address
    constructor(host) {
        this.host = host;
        this.enabled = false; // LLDP is disabled by default
        this.neighbors = [];
        Debug.log(this.host.id, "Create", "LLDP");
    }

    processFrame(frame, nic) {
        const [mac, portID, tlv] = [
            frame.payload.getValue("ChassisID"),
            frame.payload.getValue("PortID"),
            frame.payload
        ];
        const name = tlv.getValue("SystemName");
        const via = nic ? nic.id.toString() : "";
        const known = this.neighbors.find(n => n[0] == mac);
        if (known) {
            known[1] = portID; // Update PortID
            known[2] = Sim.time; // Update timestamp
            known[3] = tlv; // Update tlv data
            known[4] = via;
            Debug.log(this.host.id, "Update", mac + " " + portID);
            Sim.event("l3", `<b>${this.host}</b> lldpd refreshes neighbour <b>${name}</b> (${portID})`, { frame, obj: this.host });
        }
        else {
            this.neighbors.push([mac, portID, Sim.time, tlv, via]);
            Debug.log(this.host.id, "Add", mac + " " + portID);
            Sim.event("l3", `<b>${this.host}</b> lldpd learns a new neighbour: <b>${name}</b> port ${portID} on ${via}`, { frame, obj: this.host });
        }
    }

    remove(mac, port) {
        this.neighbors = this.neighbors.filter(n => !(n[0] == mac && n[1] == port));
        Debug.log(this.host.id, "Remove", port + " " + mac);
    }

    showDetails() {
        let ret = "";
        ret += "-------------------------------------------------------------------------------";
        ret += "\n";
        ret += "Local chassis: (" + this.host.id + ")";
        ret += "\n";
        ret += "-------------------------------------------------------------------------------";
        for (let k in this.host.nics[0].tlv.headerValues) {
            ret += "\n" + k + ": " + this.host.nics[0].tlv.headerValues[k];
        }
        return ret;
    }

    showNeighbors() {
        let ret = "";
        ret += this.host.id + " LLDP neighbors:";
        this.neighbors.forEach(neighbor => {
            const [mac, port, timestamp, tlv] = neighbor;
            ret += "\n" + port + " [" + mac.toString() + "]"
                // + " " + tlv
                ;
        })
        return ret;
    }

    start() {
        Sim.after(Math.floor(8000 + Math.random() * 2000), this.tick.bind(this));
    }

    tick() {
        if (this.enabled) {
            this.neighbors.slice().forEach(neighbor => {
                const [mac, port, timestamp, tlv] = neighbor;
                const ttl = (tlv && tlv.getValue("TTL") || 120) * 1000;
                if (Sim.time - timestamp > ttl) { // TTL expired
                    Debug.log(this.host.id, "Timeout", port + " " + mac);
                    Sim.event("info", `<b>${this.host}</b> lldpd forgets neighbour ${port}: TTL expired`, { proto: "LLDP", obj: this.host });
                    this.remove(mac, port);
                }
            });
            Sim.after(8000 + Math.random() * 2000, this.tick.bind(this));
        }
    }
}
