class ArpEntry {
    constructor(ip, mac, port, timestamp = Date.now()) {
        this.ip = ip; // IP address as a string
        this.mac = mac; // MAC address as a string
        this.port = port; // Port number as a string
        this.timestamp = timestamp; // Timestamp for the entry
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

    processFrame(payload, nic) {
        this.cacheIP(
            payload.data["ipSender"],
            payload.data["macSender"],
            nic.id
        );
        if (payload.data["ipTarget"] == nic.ip.ip && 
            payload.data["opCode"] == "ArpRequest") 
        {
            Debug.log(this.id, "Hit", payload.data["ipTarget"]+
                "("+nic.id+")");
            const pl = new Payload();
            pl.addData("opCode", "ArpResponse");
            pl.addData("macSender", nic.mac);
            pl.addData("ipSender", nic.ip.ip);
            pl.addData("macTarget", payload["macSender"]);
            pl.addData("ipTarget", payload["ipSender"]);
            const frame = new Frame(
                nic.x,nic.y, payload.data["macTarget"], 
                nic.mac, 'arp', pl
            );
            nic.sendFrame(frame);
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
            this.cache.push(new ArpEntry(ip, mac, port, timestamp));
            Debug.log(this.id, "Add", port + ":" + ip + " " + mac);
        }
    }

    sendQuery(ip, nic) {
        Debug.log(this.id, "Query "+nic+" -> "+ip);
        const pl = new Payload();
        pl.addData("opCode", "ArpRequest");
        pl.addData("macSender", nic.mac);
        pl.addData("ipSender", nic.ip.ip);
        pl.addData("macTarget", Payload.MACNULL);
        pl.addData("ipTarget", ip);
        const frame = new Frame(
            nic.x,nic.y, ARP.MULTICAST, nic.mac, 'arp', pl
        );
        nic.sendFrame(frame);
    }

    showCache() {
        Debug.log(this.id, "ShowCache", "PortID:");
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
