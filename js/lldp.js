class LLDP {  // Link Layer Discovery Protocol
    static MULTICAST = "01:80:c2:00:00:0e"; // LLDP multicast address
    constructor(host) {
        this.id = new Id('LLDP', this); // Unique identifier for LLDP
        this.host = host;
        this.enabled = false; // LLDP is disabled by default
        this.neighbors = [];
        Debug.log(this.id, "Create", this.host.id);
    }

    processFrame(frame) {
        const [mac, portID] = [frame.payload.data["ChassisID"], frame.payload.data["PortID"]];
        let found = false;
        this.neighbors.forEach(neighbor => {
            if (neighbor[0] == mac) {
                found = true;
                neighbor[1] = portID; // Update PortID
                neighbor[2] = Date.now(); // Update timestamp
                Debug.log(this.id, "Update", mac + " " + portID);
            }
        });
        if (!found) {
            this.neighbors.push([mac, portID, Date.now()]);
            Debug.log(this.id, "Add", mac + " " + portID);
        }
        frame.removeFromDrawlist();
        Id.remove(frame);
    }

    remove(port, mac) {
        this.neighbors.forEach((neighbor, index) => {
            if (neighbor[0] == port && neighbor[1] == mac) {
                this.neighbors.splice(index, 1);
            }
        });
        Debug.log(this.id, "Remove", port + " " + mac);
    }

    sendLldpDu(nic) {
        if (this.enabled) {
            Debug.log(this.id, "Send", nic);
            const frame = new Frame(
                nic.x, nic.y,
                LLDP.MULTICAST,
                nic.mac,
                'lldp',
                nic.tlvs
            );
            nic.sendFrame(frame, nic);
        }
    }

    showNeighbors() {
        Debug.log(this.id, "ShowNeighbors");
        this.neighbors.forEach(neighbor => {
            const [port, mac, timestamp] = neighbor;
            Debug.log(this.id, "Neighbor", port + " " + mac.toString() + "(" + (Date.now()-timestamp) + ")");
        })
    }

    start() {
        setTimeout(this.tick.bind(this), Math.floor(8000+Math.random()*2000));
    }

    tick() {
        if (this.enabled) {
            this.neighbors.forEach(neighbor => {
                const [port, mac, timestamp] = neighbor;
                if (Date.now() - timestamp > 120000) { // 2 minutes timeout
                    this.remove(port, mac);
                    Debug.log(this.id, "Timeout", port + " " + mac);
                }
            });
            this.showNeighbors();
            setTimeout(this.tick.bind(this), 8000 + Math.random() * 2000);
        }
    }
}
