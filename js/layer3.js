class Layer3 {
    constructor(host) {
        this.host = host;
        this.arp = new ARP(this.host);
        this.icmp = new ICMP(this.host);
        this.routing = new Routing(this.host);
    }

    sendArpRequest(ip) {
        let nic = this.routing.route(ip);
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
        this.icmp.sendEchoRequest(ip, this.routing.route(ip));
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
