class Shell {
    static consolePrompt = "[admin@console ~]$ ";
    constructor(prompt) {
        this.history = [
            "ssh Host1 systemctl start lldpd",
            "ssh Host1 lldpcli update",
            "ssh Host1 lldpcli show neighbors",
            "ssh Host1 arping 192.168.1.2",
        ];
        this.historyIndex = 0;
        this.prompt = prompt;
        term.value = this.prompt;
        term.value = bootlog;
        this.boot = new Boot(term);
        this.boot.init();
        this.host = "console";
    }

    keypress(evt) {
        if (["ArrowUp","ArrowDown","Control"].includes(evt.key)) evt.preventDefault();
        if (evt.key == "ArrowLeft") {
            if (term.selectionStart - 
                term.value.lastIndexOf(this.prompt) - this.prompt.length < 1) 
            {
                evt.preventDefault();
            }
        }
        if (evt.key == "Home") {
            evt.preventDefault();
            term.selectionStart = term.value.lastIndexOf(this.prompt) + 
                this.prompt.length;
            term.selectionEnd = term.selectionStart;
        }
        if (evt.key == "Backspace") {
            if (term.selectionStart - term.value.lastIndexOf(this.prompt) - 
                this.prompt.length < 1) 
            {
                evt.preventDefault();
            }
        }
        if (evt.ctrlKey && (evt.key == 'c' || evt.key == 'C')) {
            term.value += "^C\n" + this.prompt;
            this.historyIndex = 0;
        }    
        if (evt.ctrlKey && (evt.key == 'd' || evt.key == 'D')) {
            this.host = "console";
            this.prompt = Shell.consolePrompt;
            term.value += "\n" + this.prompt;
            this.historyIndex = 0;
        }    
        if (evt.key == "Enter") {
            evt.preventDefault();
            let command = term.value.substring(term.value.lastIndexOf(
                this.prompt)+this.prompt.length).trim();
            if (command != "" && command != this.history[
                this.history.length-1]) 
            {
                this.history.push(command);
            }
            this.parse(command);
            term.value += "\n" + this.prompt;
            this.historyIndex = 0;
        }
        else if (evt.key == "ArrowUp") {
            if (this.history.length > 0) {
                this.historyIndex++;
                if (this.historyIndex > this.history.length) {
                    this.historyIndex = this.history.length;
                }
                term.value = term.value.substring(0,
                    term.value.lastIndexOf(this.prompt)+this.prompt.length);
                term.value += this.history[this.history.length-this.historyIndex];
            }
        }
        else if (evt.key == "ArrowDown") {
            if (this.history.length > 0) {
                this.historyIndex--;
                if (this.historyIndex <= 0) this.historyIndex = 1;
                term.value = term.value.substring(0,
                    term.value.lastIndexOf(this.prompt)+this.prompt.length);
                term.value += this.history[this.history.length-this.historyIndex];;
            }
        }
        else if (!["ArrowLeft", "ArrowRight"].includes(evt.key)) {
        }
        if (false && evt.key == ' ') {
            if (ANIM == 1) stop();
            else start();
        }
        term.scrollTop = term.scrollHeight;
    }

    parse(command) {
        command = command.split(" ");
        Debug.log("Shell", "parse", this.command);
        if (command[0] == "start") start();
        if (command[0] == "stop") stop();
        if (command[0] == "ssh") {
            if (command.length == 1) {
                term.value += "\nusage: ssh destination";
            }
            else {
                let h = command[1];
                let o = Id.find(h);
                if (o==null) {
                    term.value += "\nCould not resolve hostname "+h;
                }
                else {
                    this.host = o;
                    if (command.length == 2) {
                        this.prompt = "[root@"+h+" ~]# ";
                    }
                    else {
                        let c = command.slice(2,command.length);
                        c = c.join(" ");
                        this.parse(c);
                    }
                }
            }
        }
        if (command[0] == "systemctl") {
            if (command[1] == "start" && command[2] == "lldpd") {
                this.host.l2.lldpStart();
            }
            if (command[1] == "stop" && command[2] == "lldpd") {
                this.host.l2.lldpStop();
            }
        }
        if (command[0] == "lldpcli") {
            if (command[1] == "update") {
                this.host.l2.sendLldpDu();
            }
            if (command[1] == "show" && command[2] == "chassis") {
                this.host.l2.lldpStop();
            }
            if (command[1] == "show" && command[2] == "neighbors") {
                this.host.l2.showNeighbors();
            }
        }
        if (command[0] == "arping") {
            if (!command[1]) {
                term.value += "\nusage: arping <destination>";
            }
            else if(!IP.isValid(command[1])) {
                term.value += "\narping: " + command[1] + ": Name or service not known";
            }
            else {
                term.value += "\nARPING " + command[1] + 
                    " from " + this.host.nics[0].ip.ip + 
                    " [" + this.host.nics[0].mac + "]";
                this.host.l3.sendArpRequest(command[1]);
            }
        }
        if (command[0] == "arp" && command[1] == "-a") {
            this.host.l3.arp.showCache();
        }
    }
}
