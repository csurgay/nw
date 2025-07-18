class ArpEntry {
    constructor(ip, mac, port) {
        this.ip = ip; // IP address as a string
        this.mac = mac; // MAC address as a string
        this.port = port; // Port number as a string
        this.timestamp = Date.now(); // Timestamp for the entry
    }
}

class Arp {
    static MULTICAST = new MAC("ff:ff:ff:ff:ff:ff"); // ARP multicast address
    constructor(nic) {
        this.nic = nic;
        this.cache = [];
        log("ARP", "Create", "for: " + nic);
    }

    processFrame(frame) {
        const [ip, mac, port, timestamp] = [
            frame.payload.value.toString(), 
            frame.macSrc.toString(),
            this.nic.id,
            Date.now()
        ];
        let found = false;
        this.cache.forEach(entry => {
            if (entry.ip == ip) {
                found = true;
                entry.mac = mac; // Update mac
                entry.port = port;
                entry.date = timestamp;
                log("ARP", "Update", ip + ":" + mac);
            }
        });
        if (!found) {
            this.cache.push([ip, mac, port, timestamp]);
            log("ARP", "Add", port + ":" + mac);
        }
    }

    remove(ip) {
        this.cache.forEach((entry, index) => {
            if (entry.ip === ip) {
                this.neighbors.splice(index, 1);
            }
        });
        log("LLDP", "Remove", ip);
    }

    sendQuery(ip) {
        log("ARP", "Query", "from "+this.nic+" to "+ip);
        const frame = new Frame(Arp.MULTICAST, this.nic.mac, 'arp', new Tlv("ipDst", ip));
        this.nic.sendFrame(frame, this.nic);
    }

    showCache() {
        log("ARP", "ShowCache", "PortID:" + this.nic.id);
        this.cache.forEach(entry => {
            log("ARP", "Entry", entry.port + ":" + entry.ip + " " + entry.mac.toString() + "(" + (Date.now()-entry.timestamp) + ")");
        })
    }

    tick() {
        if (this.enabled) {
            this.cache.forEach(entry => {
                if (Date.now() - entry.timestamp > 120000) { // 2 minutes timeout
                    this.remove(entry.ip);
                    log("ARP", "Timeout", entry.port + ":" + entry.ip + " " + entry.mac);
                }
            });
            this.showCache();
            setTimeout(this.tick.bind(this), 8000 + Math.random() * 2000);
        }
    }
}
