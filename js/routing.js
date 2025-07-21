class Routing {
    constructor(host) {
        this.host = host;
        this.arp = new ARP(this.host);
        this.table = []; // Routing table
    }

    addRoute(nic) {
        this.table.push([
            nic.ip.subnet,
            nic.ip.cidr,
            "dev", nic.id.toString(),
            "src", nic.ip.ip
        ]);
    }

    showRoute() {
        Debug.log(this.host.id, "RoutingTable");
        this.table.forEach(r => {
            Debug.log(r[0]+"/"+r[1], r[2]+" "+r[3], r[4]+" "+r[5]);
        })
    }

    route(ip) {
        return this.host.nics[0]; // !!! ROUTE THIS BY TABLE !!!
    }

    sendArpRequest(ip) {
        this.arp.sendQuery(ip, this.route(ip));
    }
}
