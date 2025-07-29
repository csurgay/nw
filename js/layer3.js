class Layer3 {
    constructor(host) {
        this.host = host;
        this.arp = new ARP(this.host);
        this.icmp = new ICMP(this.host);
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
            Debug.log(r[0] + "/" + r[1], r[2] + " " + r[3], r[4] + " " + r[5]);
        })
    }

    route(ip) {
        return this.host.nics[0]; // !!! ROUTE THIS BY TABLE !!!
    }

    sendArpRequest(ip) {
        let nic = this.route(ip);
        let payload = this.arp.getQueryPayload(ip, nic);
        this.host.l2.sendFrame(nic, 
            'ARP', 
            payload
        );
    }

    rcvArpPayload(payload, nic) {
        this.arp.processArpPayload(payload, nic);
    }

    sendPingRequest(ip) {
        this.icmp.sendEchoRequest(ip, this.route(ip));
    }

    sendIpPacket(nic, ipPacket) {
        this.host.l2.sendFrame(nic, 'IPv4', ipPacket);
    }

    processIpPayload(payload, nic) {
        let protocol = payload.getValue("Protocol");
        if (protocol == 'ICMP') {
            this.icmp.processIcmpPayload(payload, nic);
        }
    }

}
