class ARPentry {
    constructor(ip, mac, port) {
        this.type = new Id('ARPentry', this);
        this.ip = ip; // IP address as a string
        this.mac = mac; // MAC address as a string
        this.port = port; // Port number as a string
        this.timestamp = Date.now(); // Timestamp for the entry
    }
}

class ARP {
    static MULTICAST = new MAC("ff:ff:ff:ff:ff:ff"); // ARP multicast address
    constructor(nic) {
        this.type = new Id('ARP', this);
        this.nic = nic;
        this.cache = [];
        log("ARP", "Create", "for: " + nic);
    }

    processFrame(frame) {
        const [ip, mac, port, timestamp] = [
            frame.payload.ipDst, 
            frame.macSrc.toString(),
            this.nic.id,
            Date.now()
        ];
        console.log(ip);
        console.log(mac);
        console.log(port);
        console.log(this.nic.ip.ip);
        if (ip == this.nic.ip.ip) {
            log("ARP", "Hit", ip);
            const frame = new Frame(
                mac,
                this.nic.mac,
                'arp',
                new Packet(this.nic.ip, ip)
            );
            this.nic.sendFrame(frame, this.nic);
        }
        else {
            let found = false;
            this.cache.forEach(entry => {
                if (entry.ip == ip) {
                    found = true;
                    entry.mac = mac; // Update mac
                    entry.port = port;
                    entry.date = timestamp;
                    log("ARP", "Update", port + ":" + ip + " " + mac);
                }
            });
            if (!found) {
                this.cache.push(new ARPentry(ip, mac, port, timestamp));
                log("ARP", "Add", port + ":" + ip + " " + mac);
            }
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
        const frame = new Frame(
            ARP.MULTICAST, 
            this.nic.mac, 
            'arp', 
            new Packet(this.nic.ip, ip)
        );
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
