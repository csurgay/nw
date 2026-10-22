class Terminal {
    static consolePrompt = "[admin@console ~]$ ";
    constructor(textarea) {
        this.history = [
            "ssh host1 systemctl start lldpd",
            "ssh host1 lldpcli update",
            "ssh host1 lldpcli show neighbors",
            "ssh host1 arping 192.168.1.2",
            "for i in {1..12}; do ssh host$i systemctl start lldpd; done",
            "for i in {1..12}; do ssh host$i lldpcli update; done",
        ];
        this.textarea = textarea;
        this.historyIndex = 0;
        this.prompt = Terminal.consolePrompt;
        this.textarea.value = this.prompt;
        this.textarea.value = bootlog;
        this.booting = true;
        this.boot = new Boot(this);
        this.boot.init();
        this.host = "console";
    }

    callback() {
        if (TEST) test.test();
        consoleArea.focus();
    }

    showPrompt(newLine=false) {
        if (newLine) this.newLine();        
        this.textarea.value += this.prompt;        
    }

    newLine() {
        this.print("\n");
    }

    print(string) {
        this.textarea.value += string;
        this.showBottom();
    }

    println(string) {
        this.print(string);
        this.newLine();
    }

    showBottom() {
        this.textarea.scrollTop = this.textarea.scrollHeight;
    }

    mouseclick(evt) {
        if (this.textarea.selectionStart - 
            this.textarea.value.lastIndexOf(this.prompt) - 
            this.prompt.length < 0) 
        {
            //evt.preventDefault();
            this.textarea.selectionStart = this.textarea.value.length;
            this.textarea.selectionEnd = this.textarea.value.length;
        }
        //Debug.log("Terminal", "mouseclick");
    }

    quitToConsole() {
        this.host = "console";
        if (typeof shell != "undefined" && shell.toConsole) shell.toConsole();
        else this.prompt = Terminal.consolePrompt;
        this.historyIndex = 0;
    }

    // the console restarts: the boot log scrolls by, then a fresh prompt
    reboot() {
        this.booting = true;
        this.textarea.value = bootlog;
        this.textarea.scrollTop = 0;
        this.boot = new Boot(this);
        this.boot.init();
    }

    // run a command as if it had been typed (used by popup buttons and hint chips)
    runCommand(command) {
        if (this.booting) { // wait until the boot log has scrolled by
            setTimeout(() => this.runCommand(command), 200);
            return;
        }
        const v = this.textarea.value;
        const p = v.lastIndexOf(this.prompt);
        if (p >= 0 && v.indexOf("\n", p) < 0) {
            this.textarea.value = v.substring(0, p + this.prompt.length);
        } else if (!v.endsWith("\n")) {
            this.newLine();
        }
        this.print(command);
        this.enter(command);
    }

    enter(command) {
        if (shell.job) { // a new command interrupts a waiting ping / arping
            shell.job.cancel(false);
            shell.job = null;
        }
        if (command != "" && typeof Sim != "undefined") {
            Sim.event("cmd", esc((shell.host ? "[" + shell.host + "] " : "") + command));
        }
        if (command != "" && command != this.history[
            this.history.length-1]) 
        {
            this.history.push(command);
        }
        this.newLine();
        if (shell.parse(command)) {
            this.showPrompt();
        }
        this.historyIndex = 0;
    }

    // TAB: complete the word; TAB TAB: show what could come here
    tab() {
        if (this.booting || typeof Completion == "undefined") return;
        const v = this.textarea.value;
        const start = v.lastIndexOf(this.prompt) + this.prompt.length;
        const line = v.substring(start);
        const r = Completion.complete(shell, line);
        if (r.line != line) {
            this.textarea.value = v.substring(0, start) + r.line;
            this.lastTab = r.list.length > 1 ? r.line : null; // still several: the next TAB lists them
        }
        else if (r.list.length && this.lastTab === line) {
            this.textarea.value += "\n" + Coreutils.columns(r.list) + "\n" + this.prompt + line;
            this.lastTab = null;
        }
        else this.lastTab = line;
        this.textarea.selectionStart = this.textarea.selectionEnd = this.textarea.value.length;
        this.showBottom();
    }

    lastLines() {
        let lines = this.textarea.value.split("\n");
        let l = lines.length;
        let ret = [];
        for (let i=1; i<=5; i++) {
            if (lines[l-i]) ret.push(lines[l-i]);
        }
        return ret;
    }

    keypress(evt) {
        if (evt.key == "Tab") {
            evt.preventDefault();
            this.tab();
            return;
        }
        // IOS-style switch: "?" shows the help right away, the line stays
        if (evt.key == "?" && shell.host && shell.host.cli && !shell.host.cli.ask) {
            evt.preventDefault();
            const v = this.textarea.value;
            const line = v.substring(v.lastIndexOf(this.prompt) + this.prompt.length);
            this.textarea.value += "?\n" + shell.host.cli.help(line) + "\n" + this.prompt + line;
            this.textarea.selectionStart = this.textarea.selectionEnd = this.textarea.value.length;
            this.showBottom();
            return;
        }
        if (evt.key != "Shift") this.lastTab = null;
        if (["ArrowUp","ArrowDown","Control"].includes(evt.key)) evt.preventDefault();
        if (evt.key == "ArrowLeft") {
            if (this.textarea.selectionStart - 
                this.textarea.value.lastIndexOf(this.prompt) - 
                this.prompt.length < 1) 
            {
                evt.preventDefault();
            }
        }
        if (evt.key == "Home") {
            evt.preventDefault();
            this.textarea.selectionStart = 
                this.textarea.value.lastIndexOf(this.prompt) + 
                this.prompt.length;
            this.textarea.selectionEnd = this.textarea.selectionStart;
        }
        if (evt.key == "Backspace") {
            if (this.textarea.selectionStart - 
                this.textarea.value.lastIndexOf(this.prompt) - 
                this.prompt.length < 1) 
            {
                evt.preventDefault();
            }
        }
        if (evt.ctrlKey && (evt.key == 'c' || evt.key == 'C')) {
            evt.preventDefault();
            this.historyIndex = 0;
            if (shell.job) { // like real ping: Ctrl-C prints the statistics
                const job = shell.job;
                shell.job = null;
                this.print("^C");
                if (job.dst) { this.newLine(); job.cancel(true); }
                else { job.cancel(false); this.print("\n" + this.prompt); }
            }
            else this.print("^C\n" + this.prompt);
        }    
        if (evt.ctrlKey && (evt.key == 'd' || evt.key == 'D')) {
            evt.preventDefault();
            this.quitToConsole();
            this.showPrompt();
        }    
        if (evt.ctrlKey && (evt.key == 'l' || evt.key == 'L')) {
            evt.preventDefault();
            this.textarea.value = this.prompt;
        }    
        if (evt.key == "Enter") {
            evt.preventDefault();
            let command = this.textarea.value.substring(this.textarea.value.lastIndexOf(
                this.prompt)+this.prompt.length).trim();
            this.enter(command);
        }
        else if (evt.key == "ArrowUp") {
            if (this.history.length > 0) {
                this.historyIndex++;
                if (this.historyIndex > this.history.length) {
                    this.historyIndex = this.history.length;
                }
                this.textarea.value = this.textarea.value.substring(0,
                    this.textarea.value.lastIndexOf(this.prompt)+this.prompt.length);
                this.print(this.history[this.history.length-this.historyIndex]);
            }
        }
        else if (evt.key == "ArrowDown") {
            if (this.history.length > 0) {
                this.historyIndex--;
                let newCommand = this.history[this.history.length-this.historyIndex];
                if (this.historyIndex <= 0) {
                    this.historyIndex = 1;
                    newCommand = "";
                }
                this.textarea.value = this.textarea.value.substring(0,
                    this.textarea.value.lastIndexOf(this.prompt)+this.prompt.length);
                this.print(newCommand);
            }
        }
        else if (!["ArrowLeft", "ArrowRight"].includes(evt.key)) {
        }
        if (false && evt.key == ' ') {
            if (ANIM == 1) stop();
            else start();
        }
        this.showBottom();
    }
}
