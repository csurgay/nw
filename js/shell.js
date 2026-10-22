class Shell {
    constructor(terminal) {
        this.host = null;
        this.t = terminal;
        this.disableInput = false;
        this.job = null; // foreground job (ping, arping) that is waiting for replies
    }

    // commands that only make sense on a host, not on the admin console
    needHost(name) {
        if (this.host) return false;
        this.t.println(name + ": you are on the admin console — log in to a host first, e.g.  ssh Host1");
        return true;
    }

    parse(cmd) {
        let showPrompt = true;
        let command = cmd.trim().split(/\s+/);
        Debug.log("Shell", "parse", command);
        if (command[0] == "exit") this.t.quitToConsole();
        else if (command[0] == "start") start();
        else if (command[0] == "stop") stop();
        else if (command[0] == "clear") this.t.textarea.value = "";
        else if (command[0] == "help") this.help();
        else if (command[0] == "for") {
            let variable = command[1];
            if (command[2] != "in") {
                this.t.println("Syntax error near unexpected token " + command[2]);
            }
            else {
                let loop = command[3];
                let loop1 = parseInt(loop.substring(1,loop.indexOf("..")));
                let loop2 = parseInt(loop.substring(loop.indexOf("..")+2,loop.indexOf("}")));
                Debug.log("Shell","loop",loop1 + "-" + loop2);
                let com = cmd.substring(cmd.indexOf(" do ") + 4,
                    cmd.lastIndexOf("; done"));
                for (let i=loop1; i<=loop2; i++) {
                    this.parse(com.split("$"+variable).join(i));
                }
            }
        }
        else if (command[0] == "test") {
            test.test(command[1], command[2]);
        }
        else if (command[0] == "debug") {
            if (!command[1] || command[1] == "show") {
                this.t.println(DEBUG);
            }
            else {
                DEBUG = command[1];
            }
        }
        else if (command[0] == "ssh") {
            if (command.length == 1) {
                this.t.println("usage: ssh destination");
            }
            else {
                let h = command[1].replace(/^root@/, "");
                let o = Id.find(h);
                if (o==null || !(o instanceof Host)) {
                    this.t.println("ssh: Could not resolve hostname "+h+": Name or service not known");
                }
                else {
                    let savedHost = this.host;
                    this.host = o;
                    if (command.length == 2) {
                        this.t.prompt = "[root@"+h+" ~]# ";
                    }
                    else {
                        let sshCommand = command.slice(2,command.length);
                        sshCommand = sshCommand.join(" ");
                        showPrompt = this.parse(sshCommand);
                        this.host = savedHost;
                    }
                }
            }
        }
        else if (command[0] == "hostname") {
            this.t.println(this.host ? this.host.id.toString() : "console");
        }
        else if (command[0] == "systemctl") {
            if (this.needHost("systemctl")) return true;
            if (command[2] != "lldpd" && command[2] != "lldpd.service") {
                this.t.println("Unit " + (command[2] || "") + ".service could not be found.");
            }
            else if (command[1] == "start") {
                this.t.println(this.host.l2.lldpStart());
            }
            else if (command[1] == "stop") {
                this.t.println(this.host.l2.lldpStop());
            }
            else if (command[1] == "is-active") {
                let ret = "failed";
                if (this.host.l2.lldp && this.host.l2.lldp.enabled) {
                    ret = "active";
                }
                this.t.println(ret);
            }
            else if (command[1] == "status") {
                const on = this.host.l2.lldp && this.host.l2.lldp.enabled;
                this.t.println("● lldpd.service - LLDP daemon\n   Active: " + (on ? "active (running)" : "inactive (dead)"));
            }
        }
        else if (command[0] == "lldpcli") {
            if (this.needHost("lldpcli")) return true;
            if (!this.host.l2.lldp || !this.host.l2.lldp.enabled) {
                this.t.println("Unable to connect to lldpd");
            }
            else {
                if (command[1] == "update") {
                    this.host.l2.sendLldp();
                }
                if (command[1] == "show" && "chassis".startsWith(command[2])) {
                    this.t.println(this.host.l2.showDetails());
                }
                if (command[1] == "show" && "neighbors".startsWith(command[2])) {
                    this.t.println(this.host.l2.showNeighbors());
                }
            }
        }
        else if (command[0] == "arping") {
            if (this.needHost("arping")) return true;
            const dst = command.slice(1).filter(a => !a.startsWith("-")).pop();
            if (!dst) {
                this.t.println("usage: arping <destination>");
            }
            else if(!IP.isValid(dst)) {
                this.t.println("arping: " + dst + ": Name or service not known");
            }
            else {
                showPrompt = this.host.l3.startArping(this, dst);
            }
        }
        else if (command[0] == "arp") {
            if (this.needHost("arp")) return true;
            let ret = this.host.l3.arp.showCache();
            this.t.println(ret);
        }
        else if (command[0] == "ip") {
            if (this.needHost("ip")) return true;
            this.ipCommand(command);
        }
        else if (command[0] == "ping") {
            if (this.needHost("ping")) return true;
            showPrompt = this.host.l3.icmp.ping(this, command);
        }
        else if (command[0] != "") {
            this.t.println(command[0] + ": command not found...");
        }
        return showPrompt;
    }

    ipCommand(command) {
        const sub = command[1] || "";
        const h = this.host;
        if ("addr".startsWith(sub) && sub != "" || sub == "a") {
            this.t.println("1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN\n    inet 127.0.0.1/8 scope host lo");
            h.nics.forEach((n, i) => {
                this.t.println(`${i + 2}: ${n.id}: <BROADCAST,MULTICAST,${n.linkUp() ? "UP,LOWER_UP" : "NO-CARRIER"}> mtu 1500 state ${n.linkUp() ? "UP" : "DOWN"}\n` +
                    `    link/ether ${n.mac} brd ff:ff:ff:ff:ff:ff` +
                    (n.ip ? `\n    inet ${n.ip.toString()} brd ${IP.broadcastOf(n.ip.ip, n.ip.cidr)} scope global ${n.id}` : ""));
            });
        }
        else if ("route".startsWith(sub) && sub != "" || sub == "r") {
            this.t.println(h.l3.routing.lines().join("\n"));
        }
        else if ("neighbour".startsWith(sub) && sub != "" || "neighbor".startsWith(sub) && sub != "") {
            this.t.println(h.l3.arp.neighLines().join("\n"));
        }
        else if ("link".startsWith(sub) && sub != "") {
            h.nics.forEach((n, i) => this.t.println(`${i + 1}: ${n.id}: <BROADCAST,MULTICAST,UP> mtu 1500 state ${n.linkUp() ? "UP" : "DOWN"}\n    link/ether ${n.mac} brd ff:ff:ff:ff:ff:ff`));
        }
        else {
            this.t.println("Usage: ip [ addr | route | neigh | link ]");
        }
    }

    help() {
        this.t.println([
            "Commands in this lab:",
            "  ssh HostN [command]          log in to a host (or run one command there)",
            "  exit                         back to the admin console",
            "  ip addr | ip route | ip neigh   interfaces, routing table, ARP cache",
            "  arp -a                       ARP cache, old style",
            "  arping 192.168.1.2           ask who has this IP (ARP request)",
            "  ping [-c N] 192.168.1.2      ICMP echo; Ctrl-C stops it",
            "  systemctl start|stop|status lldpd",
            "  lldpcli update | show neighbors | show chassis",
            "  for i in {1..12}; do ssh Host$i <cmd>; done",
            "  clear (or Ctrl-L), test",
        ].join("\n"));
    }
}
