class Shell {
    constructor(terminal) {
        this.host = null;
        this.t = terminal;
        this.disableInput = false;
    }
    parse(cmd) {
        let showPrompt = true;
        let command = cmd.split(" ");
        Debug.log("Shell", "parse", command);
        if (command[0] == "exit") this.t.quitToConsole();
        else if (command[0] == "start") start();
        else if (command[0] == "stop") stop();
        else if (command[0] == "for") {
            let variable = command[1];
            if (command[2] != "in") {
                this.t.println("Syntax error near unexpected token " + command[2]);
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
                let h = command[1];
                let o = Id.find(h);
                if (o==null) {
                    this.t.println("Could not resolve hostname "+h);
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
                        this.parse(sshCommand);
                        this.host = savedHost;
                    }
                }
            }
        }
        else if (command[0] == "systemctl") {
            if (command[1] == "start" && command[2] == "lldpd") {
                this.t.println(this.host.l2.lldpStart());
            }
            if (command[1] == "stop" && command[2] == "lldpd") {
                this.t.println(this.host.l2.lldpStop());
            }
            if (command[1] == "is-active" && command[2] == "lldpd") {
                let ret = "failed";
                if (this.host.l2.lldp && this.host.l2.lldp.enabled) {
                    ret = "active";
                }
                this.t.println(ret);
            }
        }
        else if (command[0] == "lldpcli") {
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
            showPrompt = false;
            if (!command[1]) {
                this.t.println("usage: arping <destination>");
            }
            else if(!IP.isValid(command[1])) {
                this.t.println("arping: " + command[1] + ": Name or service not known");
            }
            else {
                this.t.println("ARPING " + command[1] + 
                    " from " + this.host.nics[0].ip.ip + 
                    " " + this.host.nics[0].id);
                this.host.l3.sendArpRequest(command[1]);
            }
        }
        else if (command[0] == "arp" && command[1] == "-a") {
            let ret = this.host.l3.arp.showCache();
            this.t.println(ret);
        }
        else if (command[0] == "ping") {
            showPrompt = false;
            this.host.l3.icmp.ping(this, command);
        }
        else if (command[0] != "") {
            this.t.println(command[0] + ": command not found...");
        }
        return showPrompt;
    }
}
