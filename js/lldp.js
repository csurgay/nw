class TLV {  // time - length - value for LLDP payload
    constructor(tlvType, value) {
        this.type = new Id('TLV', this); // Unique identifier for TLV
        this.tlvType = tlvType; // Type of TLV
        this.value = value; // Value of TLV
        log("TLV", "Create", this);
    }
    toString() {
        return this.tlvType+":"+this.value;
    }
}

class LLDP {  // Link Layer Discovery Protocol
    static MULTICAST = "01:80:c2:00:00:0e"; // LLDP multicast address
    constructor(nic) {
        this.type = new Id('LLDP', this); // Unique identifier for LLDP
        this.nic = nic; // NIC instance
        this.enabled = false; // LLDP is disabled by default
        this.neighbors = [];
        log("LLDP", "Create", "for: "+nic);
    }

    processFrame(frame) {
        const [port, mac] = [frame.payload.value, frame.macSrc.toString()];
        let found = false;
        this.neighbors.forEach(neighbor => {
            if (neighbor[0] == port) {
                found = true;
                neighbor[1] = mac; // Update mac
                neighbor[2] = Date.now(); // Update timestamp
                log("LLDP", "Update", port + " " + mac);
            }
        });
        if (!found) {
            this.neighbors.push([port, mac, Date.now()]);
            log("LLDP", "Add", port + " " + mac);
        }
    }

    remove(port, mac) {
        this.neighbors.forEach((neighbor, index) => {
            if (neighbor[0] === port && neighbor[1] === mac) {
                this.neighbors.splice(index, 1);
            }
        });
        log("LLDP", "Remove", port + " " + mac);
    }

    sendLldpDu() {
        if (this.enabled) {
            log("LLDP", "Send", "from "+this.nic);
            const frame = new Frame(
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
        log("LLDP", "ShowNeighbors", "PortID:" + this.nic.id);
        this.neighbors.forEach(neighbor => {
            const [port, mac, timestamp] = neighbor;
            log("LLDP", "Neighbor", port + " " + mac.toString() + "(" + (Date.now()-timestamp) + ")");
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
                    log("LLDP", "Timeout", port + " " + mac);
                }
            });
            this.showNeighbors();
            setTimeout(this.tick.bind(this), 8000 + Math.random() * 2000);
        }
    }
}
