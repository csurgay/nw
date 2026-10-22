// The commands of a managed switch that runs Linux (like Cumulus Linux or SONiC):
// every front port is a network interface (swp1, swp2 ...), all of them are
// members of one VLAN-aware bridge (br0), and the bridge is the switch.
// Everything else — ls, cat, ps, hostnamectl, reboot — is the normal shell.
const LinuxSwitch = {
    // commands that need an IP address: a switch here has none, it is managed out of band
    NO_IP: ["ping", "arping", "arp", "traceroute", "tracert", "dhclient", "host", "nslookup"],

    // returns undefined if the command is not a switch command
    exec(sh, argv) {
        const sw = sh.host, cmd = argv[0];
        const out = s => sh.t.println(s);
        if (this.NO_IP.includes(cmd)) {
            out(`${cmd}: this switch has no IP address in the lab — it only passes frames on.\nTry it from a computer:  exit,  then  ssh host1 ${argv.join(" ")}`);
            sh.status = 1;
            return true;
        }
        if (cmd == "bridge") { this.bridge(sh, sw, argv.slice(1)); return true; }
        if (cmd == "ip") { this.ip(sh, sw, argv.slice(1)); return true; }
        if (cmd == "ifconfig") { out(this.ifconfig(sw, argv[1])); return true; }
        if (cmd == "ethtool") { out(this.ethtool(sh, sw, argv[1])); return true; }
        if (cmd == "lldpcli" || (cmd == "systemctl" && /lldpd/.test(argv[2] || ""))) {
            out("lldpd: not running on this switch in this lab (switches never forward LLDP frames — watch them stop at the switch)");
            return true;
        }
        return undefined;
    },

    mac(sw, i) {
        const h = n => n.toString(16).padStart(2, "0");
        return `02:53:00:00:${h(sw.id.seq)}:${h(i)}`;
    },

    flags(p) {
        if (p.adminDown) return "<BROADCAST,MULTICAST>";
        return p.linkUp() ? "<BROADCAST,MULTICAST,UP,LOWER_UP>" : "<NO-CARRIER,BROADCAST,MULTICAST,UP>";
    },

    state(p) { return p.adminDown ? "DOWN" : p.linkUp() ? "UP" : "DOWN"; },

    port(sh, sw, name, cmd) {
        const p = /^swp\d+$/.test(name || "") ? sw.findPort(name) : null;
        if (!p) sh.t.println(name ? `Cannot find device "${name}"` : `${cmd}: which port? e.g. swp1`);
        return p;
    },

    links(sw, withAddr) {
        const rows = [`1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00` +
            (withAddr ? "\n    inet 127.0.0.1/8 scope host lo" : ""),
            `2: br0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP\n    link/ether ${this.mac(sw, 0)} brd ff:ff:ff:ff:ff:ff`];
        sw.ports.forEach((p, i) => rows.push(`${i + 3}: swp${i + 1}: ${this.flags(p)} mtu 1500 master br0 state ${this.state(p)}\n    link/ether ${this.mac(sw, i + 1)} brd ff:ff:ff:ff:ff:ff`));
        return rows.join("\n");
    },

    ip(sh, sw, a) {
        const sub = a[0] || "";
        if ("link".startsWith(sub) && sub != "" && a[1] == "set") {
            // ip link set swp2 down | up
            const p = this.port(sh, sw, a[2], "ip link set");
            if (!p) return;
            if (a[3] != "up" && a[3] != "down") return sh.t.println("Usage: ip link set DEVICE { up | down }");
            if ((a[3] == "down") != !!p.adminDown) sw.setPortDown(p, a[3] == "down");
            return;
        }
        if ("link".startsWith(sub) && sub != "") return sh.t.println(this.links(sw, false));
        if (("addr".startsWith(sub) && sub != "") || sub == "a") {
            if (["add", "del", "replace", "change", "flush"].includes(a[1]))
                return sh.t.println("In this lab a switch gets no IP address: it is managed from the console with ssh.");
            return sh.t.println(this.links(sw, true));
        }
        if (("route".startsWith(sub) && sub != "") || sub == "r") return sh.t.println("(no routes: a switch works with MAC addresses, not IP addresses)");
        if (("neighbour".startsWith(sub) || "neighbor".startsWith(sub)) && sub != "") return sh.t.println("(empty: no IP, so no ARP — the MAC table is in  bridge fdb show)");
        sh.t.println("Usage: ip [ link | addr | link set swpN up|down ]");
    },

    bridge(sh, sw, a) {
        const obj = a[0] || "";
        const verb = a[1] || "show";
        if ("fdb".startsWith(obj) && obj != "") {
            if (verb != "show") return sh.t.println("In this lab the MAC table is only learned, not set by hand: bridge fdb show");
            const rows = sw.macTable.filter(e => Sim.time - e.t <= Switch.AGING_MS)
                .map(e => `${e.mac} dev ${sw.portName(e.port)} vlan ${e.vlan} master br0`);
            rows.push(...sw.ports.map((p, i) => `${this.mac(sw, i + 1)} dev swp${i + 1} vlan 1 master br0 permanent`));
            return sh.t.println(rows.join("\n"));
        }
        if ("vlan".startsWith(obj) && obj != "") {
            if (verb == "show") {
                const used = sw.vlans();
                const rows = ["port              vlan-id"];
                sw.ports.forEach(p => {
                    const n = sw.portName(p).padEnd(18);
                    if (p.trunk) {
                        rows.push(n + "1 PVID Egress Untagged");
                        used.filter(v => v != 1).forEach(v => rows.push(" ".repeat(18) + v));
                    } else rows.push(n + p.vlan + " PVID Egress Untagged");
                });
                rows.push("br0".padEnd(18) + "1 PVID Egress Untagged");
                return sh.t.println(rows.join("\n"));
            }
            if (verb == "add" || verb == "del") {
                // bridge vlan add dev swp3 vid 20 pvid untagged   (access port in VLAN 20)
                // bridge vlan add dev swp4 vid 20                  (tagged: the port becomes a trunk)
                const dev = a[a.indexOf("dev") + 1], vid = parseInt(a[a.indexOf("vid") + 1]);
                if (a.indexOf("dev") < 0 || a.indexOf("vid") < 0 || isNaN(vid)) return sh.t.println("Usage: bridge vlan { add | del } dev DEV vid VLAN_ID [ pvid ] [ untagged ]");
                const p = this.port(sh, sw, dev, "bridge vlan");
                if (!p) return;
                if (vid < 1 || vid > 4094) return sh.t.println("Error: invalid VLAN id.");
                if (verb == "add") sw.setPortVlan(p, a.includes("pvid") || a.includes("untagged") ? vid : "trunk");
                else if (p.trunk || p.vlan == vid) sw.setPortVlan(p, 1);
                return;
            }
            return sh.t.println("Usage: bridge vlan { show | add | del } ...");
        }
        if ("link".startsWith(obj) && obj != "") {
            return sh.t.println(sw.ports.map((p, i) => `${i + 3}: swp${i + 1}: ${this.flags(p)} mtu 1500 master br0 state ${p.adminDown ? "disabled" : p.linkUp() ? "forwarding" : "disabled"} priority 32 cost 4`).join("\n"));
        }
        sh.t.println("Usage: bridge { fdb | vlan | link } [ show ]");
    },

    ifconfig(sw, want) {
        const blocks = sw.ports.map((p, i) => ({ n: "swp" + (i + 1), s: `swp${i + 1}: flags=${p.adminDown ? "4098<BROADCAST,MULTICAST>" : p.linkUp() ? "4163<UP,BROADCAST,RUNNING,MULTICAST>" : "4099<UP,BROADCAST,MULTICAST>"}  mtu 1500\n` +
            `        ether ${this.mac(sw, i + 1)}  txqueuelen 1000  (Ethernet)\n        RX packets ${p.stats.rx}  dropped ${p.stats.drop}\n        TX packets ${p.stats.tx}  errors 0  collisions 0` }));
        blocks.unshift({ n: "br0", s: `br0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n        ether ${this.mac(sw, 0)}  txqueuelen 1000  (Ethernet)` });
        blocks.push({ n: "lo", s: "lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536\n        inet 127.0.0.1  netmask 255.0.0.0\n        loop  txqueuelen 1000  (Local Loopback)" });
        const list = want ? blocks.filter(b => b.n == want) : blocks;
        return list.length ? list.map(b => b.s).join("\n\n") : `${want}: error fetching interface information: Device not found`;
    },

    ethtool(sh, sw, name) {
        const p = /^swp\d+$/.test(name || "") ? sw.findPort(name) : null;
        if (!p) return name ? `netlink error: no device matches name (offset 24)\nnetlink error: No such device` : "ethtool: bad command line argument(s)\nFor more information run ethtool -h";
        const up = p.linkUp();
        return `Settings for ${name}:\n\tSupported link modes:   10baseT/Full 100baseT/Full 1000baseT/Full\n\tSpeed: ${up ? "1000Mb/s" : "Unknown!"}\n\tDuplex: ${up ? "Full" : "Unknown! (255)"}\n` +
            `\tPort: Twisted Pair\n\tAuto-negotiation: on\n\tLink detected: ${up ? "yes" : "no"}`;
    },

    // /etc/network/interfaces, written the ifupdown2 way
    interfaces(sw) {
        const vids = sw.vlans().filter(v => v != 1);
        const lines = ["# The switch configuration (ifupdown2 style).", "# In this lab a reboot brings back the start settings.", "",
            "auto lo", "iface lo inet loopback", ""];
        sw.ports.forEach((p, i) => {
            lines.push(`auto swp${i + 1}`, `iface swp${i + 1}`);
            if (p.trunk) lines.push(`    bridge-vids ${vids.join(" ") || "1"}`);
            else if (p.vlan != 1) lines.push(`    bridge-access ${p.vlan}`);
            if (p.adminDown) lines.push("    link-down yes");
            lines.push("");
        });
        lines.push("auto br0", "iface br0", `    bridge-ports ${sw.ports.map((_, i) => "swp" + (i + 1)).join(" ")}`, "    bridge-vlan-aware yes",
            `    bridge-vids ${[1, ...vids].join(" ")}`, "    bridge-pvid 1");
        return lines.join("\n");
    },
};
