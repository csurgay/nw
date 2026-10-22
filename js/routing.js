// The kernel routing table: connected networks, static routes and a default route.
class Routing {
    constructor(host) {
        this.host = host;
        this.table = []; // {net, cidr, nic, via, src, proto}
    }

    // connected network of an interface ("proto kernel scope link")
    addRoute(nic) {
        this.table.push({ net: nic.ip.subnet, cidr: nic.ip.cidr, nic, via: null, src: nic.ip.ip, proto: "kernel" });
    }

    // the interface whose network contains this IP
    directNic(ip) {
        const r = this.table.filter(r => r.proto == "kernel" && IP.sameSubnet(ip, r.net, r.cidr))
            .sort((a, b) => b.cidr - a.cidr)[0];
        return r ? r.nic : null;
    }

    // ip route add <net>/<cidr> via <gw>; returns an error text or null
    addStatic(net, cidr, via) {
        if (!IP.isValid(String(via))) return "Error: inet address is expected rather than \"" + via + "\".";
        const nic = this.directNic(via);
        if (!nic) return "Error: Nexthop has invalid gateway.";
        net = IP.networkOf(net, cidr);
        this.table = this.table.filter(r => !(r.proto == "static" && r.net == net && r.cidr == cidr));
        this.table.push({ net, cidr, nic, via, src: nic.ip.ip, proto: "static" });
        return null;
    }

    addDefault(ip) {
        return this.addStatic("0.0.0.0", 0, ip);
    }

    get gateway() {
        const d = this.table.find(r => r.cidr == 0);
        return d ? d.via : null;
    }

    lines() {
        const sorted = this.table.slice().sort((a, b) => (a.cidr == 0 ? -1 : 0) - (b.cidr == 0 ? -1 : 0));
        return sorted.map(r => {
            if (r.cidr == 0) return `default via ${r.via} dev ${r.nic.id}`;
            if (r.via) return `${r.net}/${r.cidr} via ${r.via} dev ${r.nic.id}`;
            return `${r.net}/${r.cidr} dev ${r.nic.id} proto kernel scope link src ${r.src}`;
        });
    }

    showRoute() {
        Debug.log(this.host.id, "RoutingTable");
        this.lines().forEach(l => Debug.log(this.host.id, l));
    }

    // longest prefix match: the most specific route wins
    lookup(ip) {
        let best = null;
        this.table.forEach(r => {
            if (IP.sameSubnet(ip, r.net, r.cidr) && (!best || r.cidr > best.cidr)) best = r;
        });
        return best;
    }

    route(ip) {
        const r = this.lookup(ip);
        return r ? r.nic : null;
    }
}
