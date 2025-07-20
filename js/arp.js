class ARPentry {
    constructor(ip, mac, port) {
        this.id = new Id('ARPentry', this);
        this.ip = ip; // IP address as a string
        this.mac = mac; // MAC address as a string
        this.port = port; // Port number as a string
        this.timestamp = Date.now(); // Timestamp for the entry
    }
}

class ARP {
    static MULTICAST = "ff:ff:ff:ff:ff:ff"; // ARP multicast address
    constructor(nic) {
        this.id = new Id('ARP', this);
        this.nic = nic;
        this.cache = [];
        Debug.log(this.id, "Create", "for: " + nic);
    }

    processFrame(frame) {
        const [ip, mac, port, timestamp] = [
            frame.payload.ipDst, 
            frame.macSrc.toString(),
            this.nic.id,
            Date.now()
        ];
        if (ip == this.nic.ip.ip) {
            Debug.log(this.id, "Hit", ip);
            const frame = new Frame(
                this.nic.x, this.nic.y,
                mac,
                this.nic.mac,
                'arp',
                new Packet(this.nic.id, ip)
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
                    Debug.log(this.id, "Update", port + ":" + ip + " " + mac);
                }
            });
            if (!found) {
                this.cache.push(new ARPentry(ip, mac, port, timestamp));
                Debug.log(this.id, "Add", port + ":" + ip + " " + mac);
            }
        }
    }

    remove(ip) {
        this.cache.forEach((entry, index) => {
            if (entry.ip === ip) {
                this.neighbors.splice(index, 1);
            }
        });
        Debug.log(this.id, "Remove", ip);
    }

    sendQuery(ip) {
        Debug.log(this.id, "Query from "+this.nic+" to "+ip);
        const frame = new Frame(
            this.nic.x, this.nic.y,
            ARP.MULTICAST, 
            this.nic.mac, 
            'arp', 
            new Packet(this.nic.ip, ip)
        );
        this.nic.sendFrame(frame, this.nic);
    }

    showCache() {
        Debug.log(this.id, "ShowCache", "PortID:" + this.nic.id);
        this.cache.forEach(entry => {
            Debug.log(this.id, "Entry", entry.port + ":" + entry.ip + " " + entry.mac.toString() + "(" + (Date.now()-entry.timestamp) + ")");
        })
    }

    tick() {
        if (this.enabled) {
            this.cache.forEach(entry => {
                if (Date.now() - entry.timestamp > 120000) { // 2 minutes timeout
                    this.remove(entry.ip);
                    Debug.log(this.id, "Timeout", entry.port + ":" + entry.ip + " " + entry.mac);
                }
            });
            this.showCache();
            setTimeout(this.tick.bind(this), 8000 + Math.random() * 2000);
        }
    }
}
