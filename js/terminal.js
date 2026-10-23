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
        // on a phone the keyboard would pop up and the page jump down to the terminal
        deskFocus(consoleArea);
    }

    // waiting = a prompt is on the screen and the line after it belongs to the user.
    // Output that arrives then (a background job, a late reply) goes above the prompt,
    // like in a real terminal, so it never gets mixed into what is being typed.
    showPrompt(newLine=false) {
        if (this.waiting) return; // a prompt is already there (e.g. a background job ended)
        if (newLine) this.newLine();
        this.raw(this.prompt);
        this.waiting = true;
    }

    newLine() {
        this.print("\n");
    }

    // straight onto the end of the screen
    raw(string) {
        this.textarea.value += string;
        this.showBottom();
    }

    print(string) {
        if (!this.waiting) return this.raw(string);
        const ta = this.textarea, v = ta.value, p = v.lastIndexOf(this.prompt);
        if (p < 0 || v.indexOf("\n", p) >= 0) return this.raw(string);
        // keep the caret where it was inside the typed line
        const caret = ta.selectionStart - p;
        ta.value = v.substring(0, p) + string + v.substring(p);
        const np = p + string.length;
        if (caret >= 0) ta.selectionStart = ta.selectionEnd = np + caret;
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
        this.waiting = false;
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
            this.raw("\n");
        }
        this.raw(command);
        this.enter(command);
    }

    enter(command) {
        this.waiting = false;
        if (shell.job) { // a new command interrupts a waiting ping / arping
            shell.job.cancel(false);
            shell.job = null;
        }
        if (command != "" && typeof Sim != "undefined") {
            Sim.event("cmd", esc((shell.host ? "[" + shell.host + "] " : "") + command));
        }
        this.newLine();
        // !! !$ !n !text ^old^new (bash history expansion): the expanded line is shown
        if (typeof this.expandHistory == "function" && !(shell.host && shell.host.cli)) {
            const x = this.expandHistory(command);
            if (x.error) {
                this.raw(x.error + "\n");
                this.showPrompt();
                return;
            }
            if (x.line != command) { this.raw(x.line + "\n"); command = x.line; }
        }
        if (command != "" && command != this.history[
            this.history.length-1]) 
        {
            this.history.push(command);
        }
        const ctx = shell.host;
        if (shell.parse(command)) {
            this.showPrompt();
        }
        // a command that keeps running (ping …): remember what it was, for jobs and Ctrl-Z
        if (shell.job && !shell.job.cmd) { shell.job.cmd = command; shell.job.ctx = ctx; }
        if (shell.reportJobs) shell.reportJobs();
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

    // ---- phones: a row of the keys their keyboard lacks, and a guard for the prompt
    initTouch() {
        const bar = document.getElementById("keybar");
        if (bar) {
            // pressing a key must not take the focus away (the phone keyboard would close)
            bar.addEventListener("pointerdown", ev => { if (ev.target.closest("button")) ev.preventDefault(); });
            bar.addEventListener("mousedown", ev => ev.preventDefault());
            bar.addEventListener("click", ev => {
                const b = ev.target.closest("[data-k]");
                if (b) this.virtualKey(b.dataset.k);
            });
        }
        // Android keyboards often send Backspace and Enter only as text input, not as keys
        this.textarea.addEventListener("beforeinput", ev => {
            const ta = this.textarea, start = this.lineStart(), t = ev.inputType || "";
            if (this.booting) { ev.preventDefault(); return; }
            if (this.isearch) {
                // Ctrl-R search on a phone: the letters go into the search
                ev.preventDefault();
                if (t.startsWith("insert") && t != "insertLineBreak" && ev.data) this.isearchType(ev.data);
                else if (t == "insertLineBreak") this.isearchKey({ key: "Enter", preventDefault() {} });
                else if (t.startsWith("delete")) this.isearchKey({ key: "Backspace", preventDefault() {} });
                return;
            }
            this.snapshot(); // for Ctrl-_ (undo)
            if (t == "insertLineBreak" || t == "insertParagraph") { ev.preventDefault(); this.virtualKey("Enter"); return; }
            if (t.startsWith("delete")) {
                const back = /Backward$/.test(t);
                if (ta.selectionStart < start || (back && ta.selectionStart == start && ta.selectionEnd == start)) ev.preventDefault();
                return;
            }
            if (t.startsWith("insert") && ta.selectionStart < start) {
                // typing above the prompt goes to the end of the line instead
                ev.preventDefault();
                const d = ev.data || (ev.dataTransfer && ev.dataTransfer.getData("text/plain")) || "";
                ta.value += d.replace(/\r?\n/g, " ");
                ta.selectionStart = ta.selectionEnd = ta.value.length;
            }
        });
    }

    virtualKey(k) {
        const ta = this.textarea;
        if (document.activeElement != ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length; }
        const fake = (key, mods = {}) => this.keypress(Object.assign({ key, code: "", altKey: false, ctrlKey: false, preventDefault() {} }, mods));
        const start = this.lineStart();
        if (k == "AltDot") fake(".", { altKey: true, code: "Period" });
        else if (k == "CtrlC") fake("c", { ctrlKey: true });
        else if (k == "CtrlL") fake("l", { ctrlKey: true });
        else if (k == "CtrlD") fake("d", { ctrlKey: true });
        else if (k == "CtrlT") fake("t", { ctrlKey: true });
        else if (/^Ctrl[A-Z]$/.test(k)) fake(k[4].toLowerCase(), { ctrlKey: true });
        else if (k == "ArrowLeft") { const p = Math.max(start, ta.selectionStart - 1); ta.selectionStart = ta.selectionEnd = p; }
        else if (k == "ArrowRight") { const p = Math.min(ta.value.length, ta.selectionEnd + 1); ta.selectionStart = ta.selectionEnd = p; }
        else if (k.length == 1) {
            if (k == "?" && shell.host && shell.host.cli) return fake("?");
            const p = Math.max(start, ta.selectionStart);
            ta.value = ta.value.substring(0, p) + k + ta.value.substring(Math.max(p, ta.selectionEnd));
            ta.selectionStart = ta.selectionEnd = p + 1;
            this.yank = this.hsearch = null;
        }
        else fake(k);
    }

    // ---- the line being typed (after the last prompt)
    lineStart() { return this.textarea.value.lastIndexOf(this.prompt) + this.prompt.length; }
    line() { return this.textarea.value.substring(this.lineStart()); }
    setLine(s) {
        this.textarea.value = this.textarea.value.substring(0, this.lineStart()) + s;
        this.textarea.selectionStart = this.textarea.selectionEnd = this.textarea.value.length;
    }

    // Ctrl-D like bash: on an empty line it ends the ssh session (logout), otherwise it
    // deletes the character under the cursor
    ctrlD() {
        const ta = this.textarea, start = this.lineStart();
        if (this.line() != "") {
            const p = Math.max(start, ta.selectionStart);
            if (p < ta.value.length) {
                ta.value = ta.value.substring(0, p) + ta.value.substring(p + 1);
                ta.selectionStart = ta.selectionEnd = p;
            }
            return;
        }
        if (!shell.host || shell.host.cli) return; // the console stays; the IOS-style CLI leaves with "exit"
        const name = shell.host.id.toString();
        this.raw("logout\nConnection to " + name + " closed.\n");
        this.waiting = false;
        this.quitToConsole();
        this.showPrompt();
    }

    // Ctrl-T like bash: swap the character before the cursor with the one under it and
    // move on; at the end of the line the last two characters are swapped
    transpose() {
        const ta = this.textarea, start = this.lineStart(), v = ta.value;
        let p = Math.max(start, ta.selectionStart);
        if (p >= v.length) p = v.length - 1; // at the end: the last two
        if (p - 1 < start || p >= v.length) return; // nothing to swap
        ta.value = v.substring(0, p - 1) + v[p] + v[p - 1] + v.substring(p + 1);
        ta.selectionStart = ta.selectionEnd = p + 1;
    }

    // Alt-. (bash yank-last-arg): the last word of the previous command; pressed again,
    // the last word of the one before, replacing the word inserted the time before
    yankLastArg() {
        const y = this.yank || { n: 0, base: this.line(), word: "" };
        let word = null;
        while (word == null && y.n < this.history.length) {
            y.n++;
            const words = this.history[this.history.length - y.n].trim().split(/\s+/);
            if (words.length && words[words.length - 1] != "") word = words[words.length - 1];
        }
        if (word == null) return; // nothing older: stay
        y.word = word;
        this.setLine(y.base + word);
        this.yank = y;
    }

    // PgUp / PgDn (bash history-search-backward / -forward): only the earlier commands
    // that start with what is typed so far
    historySearch(dir) {
        const h = this.hsearch || { prefix: this.line(), pos: this.history.length };
        let k = h.pos + dir;
        while (k >= 0 && k < this.history.length && (!this.history[k].startsWith(h.prefix) || this.history[k] == this.line())) k += dir;
        if (k < 0) return; // no older match: stay
        if (k >= this.history.length) { h.pos = this.history.length; this.setLine(h.prefix); }
        else { h.pos = k; this.setLine(this.history[k]); }
        this.hsearch = h;
    }

    keypress(evt) {
        if (this.booting) return;
        if (this.readlineKey && this.readlineKey(evt)) return;
        const yanking = evt.altKey && (evt.key == "." || evt.code == "Period");
        const searching = evt.key == "PageUp" || evt.key == "PageDown";
        if (!["Alt", "Shift", "Control", "Meta"].includes(evt.key)) {
            if (!yanking) this.yank = null;
            if (!searching) this.hsearch = null;
        }
        if (yanking) { evt.preventDefault(); this.yankLastArg(); this.showBottom(); return; }
        if (searching) { evt.preventDefault(); this.historySearch(evt.key == "PageUp" ? -1 : 1); this.showBottom(); return; }
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
                this.raw("^C");
                if (job.dst) { this.raw("\n"); job.cancel(true); }
                else { job.cancel(false); this.raw("\n"); this.showPrompt(); }
            }
            else this.raw("^C\n" + this.prompt);
        }    
        if (evt.ctrlKey && (evt.key == 'z' || evt.key == 'Z')) {
            evt.preventDefault();
            if (shell.job) {
                // like bash: the running command is stopped and becomes a job
                this.raw("^Z\n");
                shell.suspendJob();
                this.showPrompt();
            }
        }
        if (evt.ctrlKey && (evt.key == 'd' || evt.key == 'D')) {
            evt.preventDefault();
            this.ctrlD();
        }
        if (evt.ctrlKey && (evt.key == 't' || evt.key == 'T')) {
            evt.preventDefault();
            this.transpose();
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
                this.raw(this.history[this.history.length-this.historyIndex]);
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
                this.raw(newCommand);
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
