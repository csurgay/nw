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

    processArpPayload(payload, nic) {
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
            pl.addData("macTarget", payload.data["macSender"]);
            pl.addData("ipTarget", payload.data["ipSender"]);
            pl.addData("payloadColor", payload.data["payloadColor"]);
            this.host.l2.sendPayload(nic, 
                Frame.EtherTypes.getValue('ARP'), 
                pl
            );
        }
        if (payload.data["ipTarget"] == nic.ip.ip && 
            payload.data["opCode"] == "ArpResponse") 
        {
            Debug.log(this.id, "Response", payload.data["ipTarget"]+
                "("+nic.id+")");
            this.host.terminal.print("\nUnicast reply from " + 
                payload.data["ipSender"] + " [" + 
                payload.data["macSender"] + "]" +
                "\n" + this.host.terminal.prompt
            );
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

    getMAC(ip) {
        let ret = null;
        this.cache.forEach(entry => {
            if (entry.ip == ip) {
                ret = entry.mac; // found mac
                Debug.log(this.id, "Found", ip + " " + entry.mac);
            }
        });
        return ret;
    }

    getQueryPayload(ip, nic) {
        Debug.log(this.id, "Query "+nic+" -> "+ip);
        const pl = new Payload();
        pl.addData("opCode", "ArpRequest");
        pl.addData("macSender", nic.mac);
        pl.addData("ipSender", nic.ip.ip);
        pl.addData("macTarget", Payload.MACNULL);
        pl.addData("ipTarget", ip);
        pl.addData("payloadColor", getRandomColor());
        return pl;
    }

    showCache() {
        Debug.log(this.id, "ShowCache", "PortID:");
        let ret = "";
        this.cache.forEach(entry => {
            Debug.log(this.id, "Entry", entry.port + ":" + 
                entry.ip + " " + entry.mac.toString() + 
                "(" + (Date.now() - entry.timestamp) + ")"
            );
            ret += "\n? (" + entry.ip + ") at " + entry.mac.toString() +
            " [ether] on " + entry.port;
        })
        return ret;
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
