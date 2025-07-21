class Routing {
    constructor(host) {
        this.host = host;
        this.arp = new ARP(this.host);
    }
}
