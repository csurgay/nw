class LLDP {  // Link Layer Discovery Protocol
    static MULTICAST = "01:80:c2:00:00:0e"; // LLDP multicast address
    constructor(host) {
        this.host = host;
        this.enabled = false; // LLDP is disabled by default
        this.neighbors = [];
        Debug.log(this.host.id, "Create", "LLDP");
    }

    processFrame(frame) {
        const [mac, portID, tlv] = [
            frame.payload.getValue("ChassisID"), 
            frame.payload.getValue("PortID"),
            frame.payload.getPayload()
        ];
        let found = false;
        this.neighbors.forEach(neighbor => {
            if (neighbor[0] == mac) {
                found = true;
                neighbor[1] = portID; // Update PortID
                neighbor[2] = Date.now(); // Update timestamp
                neighbor[3] = tlv; // Update tlv data
                Debug.log(this.host.id, "Update", mac + " " + portID);
            }
        });
        if (!found) {
            this.neighbors.push([mac, portID, Date.now(), tlv]);
            Debug.log(this.host.id, "Add", mac + " " + portID);
        }
    }

    remove(port, mac) {
        this.neighbors.forEach((neighbor, index) => {
            if (neighbor[0] == port && neighbor[1] == mac) {
                this.neighbors.splice(index, 1);
            }
        });
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
        setTimeout(this.tick.bind(this), Math.floor(8000+Math.random()*2000));
    }

    tick() {
        if (this.enabled) {
            this.neighbors.forEach(neighbor => {
                const [port, mac, timestamp] = neighbor;
                if (Date.now() - timestamp > 120000) { // 2 minutes timeout
                    Debug.log(this.host.id, "Timeout", port + " " + mac);
                    this.remove(port, mac);
                }
            });
            this.showNeighbors();
            setTimeout(this.tick.bind(this), 8000 + Math.random() * 2000);
        }
    }
}
