class Tlv {  // time - length - value for LLDP payload
    constructor(type, value) {
        this.type = type; // Type of TLV
        this.value = value; // Value of TLV
        log("TLV", "Create", this);
    }
    toString() {
        return this.type+":"+this.value;
    }
}

class Lldp {  // Link Layer Discovery Protocol
    static lldpMulticast = "01:80:c2:00:00:0e"; // LLDP multicast address
    constructor(nic) {
        this.nic = nic; // NIC instance
        this.enabled = false;
        this.neighbors = [];
        log("LLDP", "Create", "for: "+nic);
    }

    add(port, mac) {
        let found = false;
        this.neighbors.forEach(neighbor => {
            if (neighbor[0] == port) {
                found = true;
                neighbor[1] = mac; // Update mac
                neighbor[2] = Date.now(); // Update timestamp
                log("LLDP", "Update", port + ":" + mac);
            }
        });
        if (!found) {
            this.neighbors.push([port, mac, Date.now()]);
            log("LLDP", "Add", port + ":" + mac);
        }
    }

    remove(port, mac) {
        this.neighbors.forEach((neighbor, index) => {
            if (neighbor[0] === port && neighbor[1] === mac) {
                this.neighbors.splice(index, 1);
            }
        });
        log("LLDP", "Remove", port + ":" + mac);
    }

    sendLldpDu() {
        if (this.enabled) {
            log("LLDP", "Send", "from "+this.nic);
            const frame = new Frame(Lldp.lldpMulticast, this.nic.mac, 'lldp', new Tlv("PortID", this.nic.id));
            this.nic.sendFrame(frame, this.nic);
            setTimeout(this.sendLldpDu.bind(this), 20000+Math.random()*10000); // Resend every 30 seconds
        }
    }

    showNeighbors() {
        log("LLDP", "ShowNeighbors", "PortID:" + this.nic.id);
        this.neighbors.forEach(neighbor => {
            const [port, mac, timestamp] = neighbor;
            log("LLDP", "Neighbor", port + ":" + mac.toString() + "(" + (Date.now()-timestamp) + ")");
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
                    log("LLDP", "Timeout", port + ":" + mac);
                }
            });
            this.showNeighbors();
            setTimeout(this.tick.bind(this), 8000 + Math.random() * 2000);
        }
    }
}
