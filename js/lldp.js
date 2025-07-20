class TLV {  // time - length - value for LLDP payload
    constructor(type, value) {
        this.id = new Id('TLV', this); // Unique identifier for TLV
        this.type = type; // Type of TLV
        this.value = value; // Value of TLV
        Debug.log(this.id, "Create", this);
    }
    toString() {
        return ""+this.type+":"+this.value;
    }
}

class LLDP {  // Link Layer Discovery Protocol
    static MULTICAST = "01:80:c2:00:00:0e"; // LLDP multicast address
    constructor(nic) {
        this.id = new Id('LLDP', this); // Unique identifier for LLDP
        this.nic = nic; // NIC instance
        this.enabled = false; // LLDP is disabled by default
        this.neighbors = [];
        Debug.log(this.id, "Create", "for: "+nic);
    }

    processFrame(frame) {
        const [port, mac] = [frame.payload.value, frame.macSrc.toString()];
        let found = false;
        this.neighbors.forEach(neighbor => {
            if (neighbor[0] == port) {
                found = true;
                neighbor[1] = mac; // Update mac
                neighbor[2] = Date.now(); // Update timestamp
                Debug.log(this.id, "Update", port + " " + mac);
            }
        });
        if (!found) {
            this.neighbors.push([port, mac, Date.now()]);
            Debug.log(this.id, "Add", port + " " + mac);
        }
        frame.removeFromDrawlist();
    }

    remove(port, mac) {
        this.neighbors.forEach((neighbor, index) => {
            if (neighbor[0] == port && neighbor[1] == mac) {
                this.neighbors.splice(index, 1);
            }
        });
        Debug.log(this.id, "Remove", port + " " + mac);
    }

    sendLldpDu() {
        if (this.enabled) {
            Debug.log(this.id, "Send", "from "+this.nic);
            const frame = new Frame(
                this.nic.x, this.nic.y,
                LLDP.MULTICAST, 
                this.nic.mac, 
                'lldp', 
                new TLV("PortID", this.nic.id)
            );
            this.nic.sendFrame(frame, this.nic);
            setTimeout(this.sendLldpDu.bind(this), 20000+Math.random()*10000); // Resend every 30 seconds
        }
    }

    showNeighbors() {
        Debug.log(this.id, "ShowNeighbors", "PortID:" + this.nic.id);
        this.neighbors.forEach(neighbor => {
            const [port, mac, timestamp] = neighbor;
            Debug.log(this.id, "Neighbor", port + " " + mac.toString() + "(" + (Date.now()-timestamp) + ")");
        })
    }

    start() {
        setTimeout(this.sendLldpDu.bind(this), Math.floor(500+Math.random()*1000));
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
