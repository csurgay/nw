class Routing {
    constructor(host) {
        this.host = host;
        this.table = [];
        this.gateway = null;
    }

    addRoute(nic) {
        this.table.push([
            nic.ip.subnet,
            nic.ip.cidr,
            "dev", nic.id.toString(),
            "src", nic.ip.ip,
            nic,
        ]);
    }

    addDefault(ip) {
        this.gateway = ip;
    }

    lines() {
        const l = this.table.map(r => `${r[0]}/${r[1]} dev ${r[3]} proto kernel scope link src ${r[5]}`);
        if (this.gateway) l.unshift(`default via ${this.gateway} dev ${this.host.nics[0].id}`);
        return l;
    }

    showRoute() {
        Debug.log(this.host.id, "RoutingTable");
        this.lines().forEach(l => Debug.log(this.host.id, l));
    }

    // longest prefix match over the connected networks
    route(ip) {
        let best = null;
        this.table.forEach(r => {
            if (IP.sameSubnet(ip, r[0], r[1]) && (!best || r[1] > best[1])) best = r;
        });
        if (best) return best[6];
        return this.gateway ? this.host.nics[0] : null;
    }
}
