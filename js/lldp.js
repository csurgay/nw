class Lldp {
    constructor(nic) {
        this.nic = nic; // NIC instance
        this.neighbors = [];
        log("LLDP", "Create", "for: "+nic);
        setTimeout(this.sendLldpDu.bind(this), 1000);
        setTimeout(this.tick.bind(this), 10000);
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
        log("LLDP", "Send", "from "+this.nic);
        const frame = new Frame(lldpMulticast, this.nic.mac, 'lldp', "PortID:" + this.nic.id);        
        this.nic.sendFrame(frame, this.nic);
        setTimeout(this.sendLldpDu.bind(this), 30000); // Resend every 30 seconds
    }

    showNeighbors() {
        this.neighbors.forEach(neighbor => {
            const [port, mac, timestamp] = neighbor;
            log("LLDP", "Neighbor", port + ":" + mac.toString() + "(" + (Date.now()-timestamp) + ")");
        })
    }

    tick() {
        this.neighbors.forEach(neighbor => {
            const [port, mac, timestamp] = neighbor;
            if (Date.now() - timestamp > 120000) { // 2 minutes timeout
                this.remove(port, mac);
                log("LLDP", "Timeout", port + ":" + mac);
            }
        });
        setTimeout(this.tick.bind(this), 10000);
    }
}
