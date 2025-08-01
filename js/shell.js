class Shell {
    constructor(terminal) {
        this.host = null;
        this.t = terminal;
    }
    parse(cmd) {
        let command = cmd.split(" ");
        Debug.log("Shell", "parse", command);
        if (command[0] == "exit") this.t.quitToConsole();
        else if (command[0] == "start") start();
        else if (command[0] == "stop") stop();
        else if (command[0] == "for") {
            let variable = command[1];
            if (command[2] != "in") {
                this.t.print("\nSyntax error near unexpected token " + command[2]);
            }
            else {
                let loop = command[3];
                let loop1 = loop.substring(1,loop.indexOf(".."));
                let loop2 = loop.substring(loop.indexOf("..")+2,loop.indexOf("}"));
                Debug.log("Shell","loop",loop1 + "-" + loop2);
                let com = cmd.substring(cmd.indexOf(" do ") + 4,
                    cmd.lastIndexOf("; done"));
                for (let i=loop1; i<=loop2; i++) {
                    this.parse(com.replace("$"+variable, i));
                }
            }
        }
        else if (command[0] == "test") {
            test.test();
        }
        else if (command[0] == "debug") {
            DEBUG = command[1];
        }
        else if (command[0] == "ssh") {
            if (command.length == 1) {
                this.t.print("\nusage: ssh destination");
            }
            else {
                let h = command[1];
                let o = Id.find(h);
                if (o==null) {
                    this.t.print("\nCould not resolve hostname "+h);
                }
                else {
                    let savedHost = this.host;
                    this.host = o;
                    if (command.length == 2) {
                        this.t.prompt = "[root@"+h+" ~]# ";
                    }
                    else {
                        let c = command.slice(2,command.length);
                        c = c.join(" ");
                        this.parse(c);
                        this.host = savedHost;
                    }
                }
            }
        }
        else if (command[0] == "systemctl") {
            if (command[1] == "start" && command[2] == "lldpd") {
                this.t.print("\n"+this.host.l2.lldpStart());
            }
            if (command[1] == "stop" && command[2] == "lldpd") {
                this.t.print("\n"+this.host.l2.lldpStop());
            }
            if (command[1] == "is-active" && command[2] == "lldpd") {
                let ret = "failed";
                if (this.host.l2.lldp && this.host.l2.lldp.enabled) {
                    ret = "active";
                }
                this.t.print("\n"+ret);
            }
        }
        else if (command[0] == "lldpcli") {
            if (!this.host.l2.lldp || !this.host.l2.lldp.enabled) {
                this.t.print("\nUnable to connect to lldpd");
            }
            else {
                if (command[1] == "update") {
                    this.host.l2.sendLldp();
                }
                if (command[1] == "show" && "chassis".startsWith(command[2])) {
                    this.t.print(this.host.l2.showDetails());
                }
                if (command[1] == "show" && "neighbors".startsWith(command[2])) {
                    this.t.print("\n"+this.host.l2.showNeighbors());
                }
            }
        }
        else if (command[0] == "arping") {
            if (!command[1]) {
                this.t.print("\nusage: arping <destination>");
            }
            else if(!IP.isValid(command[1])) {
                this.t.print("\narping: " + command[1] + ": Name or service not known");
            }
            else {
                this.t.print("\nARPING " + command[1] + 
                    " from " + this.host.nics[0].ip.ip + 
                    " " + this.host.nics[0].id);
                this.host.l3.sendArpRequest(command[1]);
            }
        }
        else if (command[0] == "arp" && command[1] == "-a") {
            let ret = this.host.l3.arp.showCache();
            this.t.print(ret);
        }
        else if (command[0] == "ping") {
            if (!command[1]) {
                this.t.print("\nuping: usage error: Destination address required");
            }
            else if(!IP.isValid(command[1])) {
                this.t.print("\nping: " + command[1] + ": Name or service not known");
            }
            else {
                this.t.print("\nPING " + command[1] + 
                    " (" + command[1] + ") 56(84) bytes of data.");
                this.host.l3.sendPingRequest(command[1]);
            }
        }
        else if (command[0] != "") {
            this.t.print("\n" + command[0] + ": command not found...");
        }

    }
}
