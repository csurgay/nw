class ARPentry {
    constructor(ip, mac, port, timestamp = Date.now()) {
        this.id = new Id('ARPentry', this);
        this.ip = ip; // IP address as a string
        this.mac = mac; // MAC address as a string
        this.port = port; // Port number as a string
        this.timestamp = timestamp; // Timestamp for the entry
    }
}

class ARPplayload {
    constructor(opCode,macSender,macTarget,ipSender,ipTarget) {
        this.opCode = opCode;
        this.macSender = macSender;
        this.macTarget = macTarget;
        this.ipSender = ipSender;
        this.ipTarget = ipTarget;
    }
}

class ARP {
    static MULTICAST = "ff:ff:ff:ff:ff:ff"; // ARP multicast address
    constructor(host) {
        this.id = new Id('ARP', this);
        this.host = host;
        this.cache = [];
        Debug.log(this.id, "Create", this.host.id);
    }

    processFrame(frame) {
        const [ipDst, ipSrc, macDst, macSrc, port] = [
            frame.payload.ipDst,
            frame.payload.ipSrc,
            frame.macDst.toString(),
            frame.macSrc.toString(),
            this.nic.id
        ];
        if (ipDst == this.nic.ip.ip) {
            Debug.log(this.id, "Hit", ipDst+"("+this.nic.id+")");
            const frame = new Frame(
                this.nic.x, this.nic.y,
                macDst,
                this.nic.mac,
                'arp',
                new Packet(this.nic.id, ipDst)
            );
            this.nic.sendFrame(frame, this.nic);
        }
        else {
            this.cacheIP(ipSrc, macSrc, port);
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

    cacheIP(ip, mac, port) {
        let found = false;
        let timestamp = Date.now();
        this.cache.forEach(entry => {
            if (entry.ip == ip) {
                found = true;
                entry.mac = mac; // Update mac
                entry.port = port; // Update port
                entry.timestamp = timestamp;
                Debug.log(this.id, "Update", port + ":" + ip + " " + mac);
            }
        });
        if (!found) {
            this.cache.push(new ARPentry(ip, mac, port, timestamp));
            Debug.log(this.id, "Add", port + ":" + ip + " " + mac);
        }
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
