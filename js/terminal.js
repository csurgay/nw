class Terminal {
    static consolePrompt = "[admin@console ~]$ ";
    constructor(textarea) {
        this.history = [
            "ssh Host1 systemctl start lldpd",
            "ssh Host1 lldpcli update",
            "ssh Host1 lldpcli show neighbors",
            "ssh Host1 arping 192.168.1.2",
            "for i in {1..12}; do ssh Host$i systemctl start lldpd; done",
            "for i in {1..12}; do ssh Host$i lldpcli update; done",
        ];
        this.textarea = textarea;
        this.historyIndex = 0;
        this.prompt = Terminal.consolePrompt;
        this.textarea.value = this.prompt;
        this.textarea.value = bootlog;
        this.boot = new Boot(this);
        this.boot.init();
        this.host = "console";
    }

    callback() {
        test.test();
    }

    print(string) {
        this.textarea.value += string;
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
        this.prompt = Terminal.consolePrompt;
        this.historyIndex = 0;
    }

    enter(command) {
        if (command != "" && command != this.history[
            this.history.length-1]) 
        {
            this.history.push(command);
        }
        shell.parse(command);
        this.print("\n" + this.prompt);
        this.historyIndex = 0;
    }

    lastLines() {
        let lines = this.textarea.value.split("\n");
        let l = lines.length;
        return [lines[l-2], lines[l-1]];
    }

    keypress(evt) {
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
            selectionStart = 
                this.textarea.value.lastIndexOf(this.prompt) + 
                this.prompt.length;
            selectionEnd = selectionStart;
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
            this.print("^C\n" + this.prompt);
            this.historyIndex = 0;
        }    
        if (evt.ctrlKey && (evt.key == 'd' || evt.key == 'D')) {
            evt.preventDefault();
            this.quitToConsole();
            this.print("\n" + this.prompt);
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
                if (this.historyIndex <= 0) this.historyIndex = 1;
                this.textarea.value = this.textarea.value.substring(0,
                    this.textarea.value.lastIndexOf(this.prompt)+this.prompt.length);
                this.print(this.history[this.history.length-this.historyIndex]);
            }
        }
        else if (!["ArrowLeft", "ArrowRight"].includes(evt.key)) {
        }
        if (false && evt.key == ' ') {
            if (ANIM == 1) stop();
            else start();
        }
        this.textarea.scrollTop = this.textarea.scrollHeight;
    }
}
