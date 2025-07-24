class Shell {
    static consolePrompt = "[admin@console ~]$ ";
    constructor(prompt) {
        this.history = [
            "systemctl start lldpd",
            "ssh Host1",
            "lldpcli update",
            "lldpcli show neighbors",
        ];
        this.historyIndex = 0;
        this.prompt = prompt;
        this.command = "";
        term.value = this.prompt;
        term.value = bootlog;
        this.boot = new Boot(term);
        this.boot.init();
        this.host = "console";
    }

    keypress(evt) {
        if (["ArrowUp","ArrowDown","Control"].includes(evt.key)) evt.preventDefault();
        if (evt.key == "ArrowLeft") {
            if (term.selectionStart - term.value.lastIndexOf(this.prompt) - prompt.length < 1) {
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
            this.command = term.value.substring(term.value.lastIndexOf(
                this.prompt)+this.prompt.length).trim();
            if (this.command != "" && this.command != this.history[
                this.history.length-1]) 
            {
                this.history.push(this.command);
            }
            this.parse(this.command);
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
        this.command = this.command.split(" ");
        Debug.log("Shell", "parse", this.command);
        if (this.command[0] == "start") start();
        if (this.command[0] == "stop") stop();
        if (this.command[0] == "ssh") {
            if (this.command.length==1) {
                term.value += "\nusage: ssh destination";
            }
            else {
                let h = this.command[1];
                let o = Id.find(h);
                if (o==null) {
                    term.value += "\nCould not resolve hostname "+h;
                }
                else {
                    this.host = o;
                    this.prompt = "[root@"+h+" ~]# ";
                }
            }
        }
        if (this.command[0] == "systemctl") {
            if (this.command[1] == "start" && this.command[2] == "lldpd") {
                this.host.l2.lldpStart();
            }
            if (this.command[1] == "stop" && this.command[2] == "lldpd") {
                this.host.l2.lldpStop();
            }
        }
        if (this.command[0] == "lldpcli") {
            if (this.command[1] == "update") {
                this.host.l2.sendLldpDu();
            }
            if (this.command[1] == "show" && this.command[2] == "chassis") {
                this.host.l2.lldpStop();
            }
            if (this.command[1] == "show" && this.command[2] == "neighbors") {
                this.host.l2.showNeighbors();
            }
        }
    }
}
