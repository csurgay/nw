// A small vi: enough to edit /etc/hosts and friends the real way.
//   normal mode   h j k l (arrows) 0 ^ $ w b e gg G   x X D dd yy p P J r u Ctrl-R   i a I A o O   /text n N   :
//   insert mode   i or the Insert key (R, or Insert again: overwrite) — type, Enter, Backspace, arrows; Esc goes back
//   : commands    :w  :w FILE  :q  :q!  :wq  :x  ZZ  :NUMBER  :$  :set nu / nonu
// It takes over the terminal while it runs (like the real one), then the prompt comes back.
const Vi = {
    active: false,
    st: null,

    // vi [FILE]
    open(sh, argv, readonly) {
        const t = sh.t;
        const name = argv.slice(1).find(a => !a.startsWith("-") && !a.startsWith("+"));
        const v = sh.vfs();
        let abs = null, lines = [""], isNew = true, ro = !!readonly, text = "";
        if (name) {
            abs = v.abs(name, sh.cwd);
            const r = v.lookup(abs);
            if (r.node && r.node.t == "d") { t.println(`vi: "${name}" is a directory`); sh.status = 1; return true; }
            if (r.node) {
                const d = v.read(r.node);
                if (d == null) { t.println(`vi: ${name}: Permission denied`); sh.status = 1; return true; }
                text = String(d);
                isNew = false;
                lines = text.replace(/\n$/, "").split("\n");
            } else if (r.err && r.err != "No such file or directory") { t.println(`vi: ${name}: ${r.err}`); sh.status = 1; return true; }
            if (!v.writable(abs)) ro = true;
        }
        const bytes = new TextEncoder().encode(text).length;
        this.st = {
            sh, host: sh.host, abs, name: name || null, lines, row: 0, col: 0, mode: "normal", cmd: "", top: 0,
            dirty: false, undo: [], redo: [], reg: null, count: "", pending: "", ro, nu: false, search: null,
            msg: name ? `"${name}"` + (isNew ? " [New]" : ` ${ro ? "[readonly] " : ""}${lines.length}L, ${bytes}B`) : "",
            hint: "i: insert text · Esc: back to commands · :wq save and quit · :q! quit without saving · :help",
        };
        this.build();
        this.active = true;
        sh.job = { active: true, kind: "vi", cancel: () => this.close() };
        this.render();
        return false;
    },

    build() {
        const ta = document.getElementById("nwConsole");
        const panel = ta.parentElement;
        let el = this.el;
        if (!el) {
            el = document.createElement("div");
            el.className = "vi";
            el.innerHTML = `<pre class="vi-text"></pre><div class="vi-hintline"></div><div class="vi-status"><span class="vi-left"></span><span class="vi-right"></span></div>`;
            this.el = el;
        }
        panel.appendChild(el);
        const cs = getComputedStyle(ta);
        el.style.top = ta.offsetTop + "px";
        el.style.height = ta.offsetHeight + "px";
        el.style.fontSize = cs.fontSize;
        el.hidden = false;
    },

    close() {
        if (!this.active) return;
        this.active = false;
        if (this.el) this.el.hidden = true;
        const sh = this.st.sh;
        if (sh.job && sh.job.kind == "vi") sh.job = null;
        this.st = null;
        sh.t.waiting = false;
        sh.t.showPrompt();
        deskFocus(consoleArea);
    },

    // ---------------------------------------------------------------- drawing
    rows() {
        const lh = parseFloat(getComputedStyle(this.el.querySelector(".vi-text")).lineHeight) || 16;
        return Math.max(3, Math.floor((this.el.clientHeight - lh * 1.4) / lh));
    },

    render() {
        const s = this.st;
        if (!s) return;
        const n = this.rows();
        if (s.row < s.top) s.top = s.row;
        if (s.row >= s.top + n) s.top = s.row - n + 1;
        const w = String(s.lines.length).length + 1;
        let html = "";
        for (let i = s.top; i < s.top + n; i++) {
            if (i >= s.lines.length) { html += `<span class="vi-tilde">~</span>\n`; continue; }
            const L = s.lines[i];
            const num = s.nu ? `<span class="vi-nu">${String(i + 1).padStart(w)} </span>` : "";
            if (i == s.row && s.mode != "cmd") {
                const c = Math.min(s.col, Math.max(0, L.length - (s.mode == "insert" ? 0 : 1)));
                html += num + esc(L.substring(0, c)) + `<span class="vi-cur${s.mode == "insert" ? " ins" : ""}">${esc(L[c] || " ")}</span>` + esc(L.substring(c + 1)) + "\n";
            } else html += num + esc(L) + "\n";
        }
        this.el.querySelector(".vi-text").innerHTML = html;
        const left = this.el.querySelector(".vi-left");
        if (s.mode == "cmd") left.innerHTML = esc(s.cmdChar + s.cmd) + `<span class="vi-cur">&nbsp;</span>`;
        else if (s.mode == "insert") left.innerHTML = s.replace ? `<b>-- REPLACE --</b>` : `<b>-- INSERT --</b>`;
        else left.innerHTML = s.err ? `<span class="vi-err">${esc(s.msg)}</span>` : esc(s.msg || "");
        const hl = this.el.querySelector(".vi-hintline");
        hl.textContent = s.hint || "";
        hl.hidden = !s.hint;
        const pct = s.lines.length <= n ? "All" : s.top == 0 ? "Top" : s.top + n >= s.lines.length ? "Bot" : Math.round(s.top / (s.lines.length - n) * 100) + "%";
        this.el.querySelector(".vi-right").textContent = `${s.row + 1},${Math.min(s.col, s.lines[s.row].length) + 1}${" ".repeat(8)}${pct}`;
    },

    say(m, err) { this.st.msg = m; this.st.err = !!err; this.st.hint = null; },

    // ---------------------------------------------------------------- editing helpers
    line() { return this.st.lines[this.st.row]; },
    clamp() {
        const s = this.st;
        s.row = Math.max(0, Math.min(s.row, s.lines.length - 1));
        const max = s.mode == "insert" ? s.lines[s.row].length : Math.max(0, s.lines[s.row].length - 1);
        s.col = Math.max(0, Math.min(s.col, max));
    },
    save() {
        const s = this.st;
        s.undo.push({ lines: s.lines.slice(), row: s.row, col: s.col });
        if (s.undo.length > 200) s.undo.shift();
        s.redo = [];
        s.dirty = true;
    },
    firstNonBlank() { const m = this.line().match(/^\s*/); this.st.col = m ? m[0].length : 0; },
    wordFwd() {
        const s = this.st, isW = c => /\w/.test(c);
        let L = this.line(), c = s.col;
        if (c < L.length) {
            const k = isW(L[c]);
            while (c < L.length && !/\s/.test(L[c]) && isW(L[c]) == k) c++;
        }
        while (c < L.length && /\s/.test(L[c])) c++;
        if (c >= L.length && s.row < s.lines.length - 1) { s.row++; s.col = 0; L = this.line(); c = 0; while (c < L.length && /\s/.test(L[c])) c++; }
        s.col = c;
    },
    wordBack() {
        const s = this.st, isW = c => /\w/.test(c);
        let L = this.line(), c = s.col;
        if (c == 0 && s.row > 0) { s.row--; L = this.line(); c = L.length; }
        c--;
        while (c > 0 && /\s/.test(L[c])) c--;
        const k = isW(L[c] || "");
        while (c > 0 && !/\s/.test(L[c - 1]) && isW(L[c - 1]) == k) c--;
        s.col = Math.max(0, c);
    },
    wordEnd() {
        const s = this.st, isW = c => /\w/.test(c), L = this.line();
        let c = s.col + 1;
        while (c < L.length && /\s/.test(L[c])) c++;
        const k = isW(L[c] || "");
        while (c + 1 < L.length && !/\s/.test(L[c + 1]) && isW(L[c + 1]) == k) c++;
        s.col = Math.min(c, Math.max(0, L.length - 1));
    },
    find(dir) {
        const s = this.st;
        if (!s.search) return this.say("E35: No previous regular expression", true);
        const n = s.lines.length;
        for (let k = 1; k <= n; k++) {
            const r = (s.row + dir * k + n * 2) % n;
            const i = s.lines[r].indexOf(s.search);
            if (i >= 0) { s.row = r; s.col = i; this.say((dir > 0 ? "/" : "?") + s.search); return; }
        }
        this.say("E486: Pattern not found: " + s.search, true);
    },

    // ---------------------------------------------------------------- keys
    // returns nothing; every key belongs to vi while it runs
    key(evt) {
        const s = this.st;
        if (!s) return;
        const k = evt.key;
        if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(k)) return;
        if (evt.preventDefault) evt.preventDefault();
        s.err = false;
        if (s.mode == "insert") this.insertKey(evt);
        else if (s.mode == "cmd") this.cmdKey(evt);
        else this.normalKey(evt);
        if (this.st) { this.clamp(); this.render(); }
    },

    // text from a phone keyboard (no key events): typed letters
    text(data) {
        for (const ch of String(data)) this.key({ key: ch, preventDefault() {} });
    },

    insertKey(evt) {
        const s = this.st, k = evt.key;
        if (k == "Escape" || (evt.ctrlKey && (k == "c" || k == "[" ))) { s.replace = false; s.mode = "normal"; s.col = Math.max(0, s.col - 1); s.msg = ""; return; }
        const L = this.line();
        if (k == "Enter") { s.lines.splice(s.row, 1, L.substring(0, s.col), L.substring(s.col)); s.row++; s.col = 0; return; }
        if (k == "Backspace") {
            if (s.col > 0) { s.lines[s.row] = L.substring(0, s.col - 1) + L.substring(s.col); s.col--; }
            else if (s.row > 0) { const prev = s.lines[s.row - 1]; s.lines.splice(s.row - 1, 2, prev + L); s.row--; s.col = prev.length; }
            return;
        }
        if (k == "Delete") { if (s.col < L.length) s.lines[s.row] = L.substring(0, s.col) + L.substring(s.col + 1); else if (s.row < s.lines.length - 1) s.lines.splice(s.row, 2, L + s.lines[s.row + 1]); return; }
        if (k == "ArrowLeft") { s.col--; return; }
        if (k == "ArrowRight") { s.col++; return; }
        if (k == "ArrowUp") { s.row--; return; }
        if (k == "ArrowDown") { s.row++; return; }
        if (k == "Home") { s.col = 0; return; }
        if (k == "End") { s.col = L.length; return; }
        if (k == "Tab") { s.lines[s.row] = L.substring(0, s.col) + "\t" + L.substring(s.col); s.col++; return; }
        // the Insert key switches between inserting and overwriting (like in Vim)
        if (k == "Insert") { s.replace = !s.replace; return; }
        if (k.length == 1 && !evt.ctrlKey && !evt.metaKey) { s.lines[s.row] = L.substring(0, s.col) + k + L.substring(s.col + (s.replace ? 1 : 0)); s.col++; }
    },

    cmdKey(evt) {
        const s = this.st, k = evt.key;
        if (k == "Escape" || (evt.ctrlKey && k == "c")) { s.mode = "normal"; s.cmd = ""; s.msg = ""; return; }
        if (k == "Backspace") { if (!s.cmd) { s.mode = "normal"; s.msg = ""; } else s.cmd = s.cmd.slice(0, -1); return; }
        if (k == "Enter") {
            const c = s.cmd, ch = s.cmdChar;
            s.mode = "normal";
            s.cmd = "";
            if (ch == "/" || ch == "?") { if (c) s.search = c; return this.find(ch == "/" ? 1 : -1); }
            return this.ex(c.trim());
        }
        if (k.length == 1 && !evt.ctrlKey && !evt.metaKey) s.cmd += k;
    },

    normalKey(evt) {
        const s = this.st, k = evt.key;
        if (evt.ctrlKey) {
            if (k == "c") return this.say("Type  :qa!  and press <Enter> to abandon all changes and exit Vim");
            if (k == "r") return this.redoIt();
            if (k == "d") { s.row += Math.floor(this.rows() / 2); return; }
            if (k == "u") { s.row -= Math.floor(this.rows() / 2); return; }
            if (k == "g") return this.fileInfo();
            return;
        }
        if (s.pending) {
            const p = s.pending; s.pending = "";
            const cnt = parseInt(s.count || "1"); s.count = "";
            if (p == "d" && k == "d") { this.save(); s.reg = { lines: s.lines.splice(s.row, cnt), line: true }; if (!s.lines.length) s.lines = [""]; this.firstNonBlank(); if (cnt > 2) this.say(`${cnt} fewer lines`); return; }
            if (p == "y" && k == "y") { s.reg = { lines: s.lines.slice(s.row, s.row + cnt), line: true }; if (cnt > 2) this.say(`${cnt} lines yanked`); return; }
            if (p == "d" && (k == "w" || k == "$")) {
                this.save();
                const L = this.line(), c0 = s.col, r0 = s.row;
                if (k == "$") s.col = L.length; else for (let i = 0; i < cnt; i++) this.wordFwd();
                const c1 = s.row == r0 ? s.col : L.length;
                s.row = r0;
                s.reg = { text: L.substring(c0, c1) };
                s.lines[r0] = L.substring(0, c0) + L.substring(c1);
                s.col = c0;
                return;
            }
            if (p == "g" && k == "g") { s.row = cnt > 1 ? cnt - 1 : 0; this.firstNonBlank(); return; }
            if (p == "r" && k.length == 1) { this.save(); const L = this.line(); s.lines[s.row] = L.substring(0, s.col) + k + L.substring(s.col + 1); return; }
            if (p == "Z" && k == "Z") return this.ex("x");
            if (p == "Z" && k == "Q") return this.ex("q!");
            return;
        }
        if (/^[1-9]$/.test(k) || (k == "0" && s.count)) { s.count += k; return; }
        const cnt = parseInt(s.count || "1");
        const had = !!s.count;
        s.count = "";
        s.hint = null;
        const L = this.line();
        switch (k) {
            case "h": case "ArrowLeft": case "Backspace": s.col -= cnt; return;
            case "l": case "ArrowRight": case " ": s.col += cnt; return;
            case "j": case "ArrowDown": s.row += cnt; return;
            case "k": case "ArrowUp": s.row -= cnt; return;
            case "Enter": s.row += cnt; this.firstNonBlank(); return;
            case "0": case "Home": s.col = 0; return;
            case "^": this.firstNonBlank(); return;
            case "$": case "End": s.col = L.length; return;
            case "w": for (let i = 0; i < cnt; i++) this.wordFwd(); return;
            case "b": for (let i = 0; i < cnt; i++) this.wordBack(); return;
            case "e": for (let i = 0; i < cnt; i++) this.wordEnd(); return;
            case "G": s.row = had ? cnt - 1 : s.lines.length - 1; this.firstNonBlank(); return;
            case "x": case "Delete": if (L) { this.save(); s.reg = { text: L.substr(s.col, cnt) }; s.lines[s.row] = L.substring(0, s.col) + L.substring(s.col + cnt); } return;
            case "X": if (s.col > 0) { this.save(); const a = Math.max(0, s.col - cnt); s.reg = { text: L.substring(a, s.col) }; s.lines[s.row] = L.substring(0, a) + L.substring(s.col); s.col = a; } return;
            case "D": this.save(); s.reg = { text: L.substring(s.col) }; s.lines[s.row] = L.substring(0, s.col); s.col--; return;
            case "J": if (s.row < s.lines.length - 1) { this.save(); const nx = s.lines[s.row + 1].replace(/^\s+/, ""); s.col = L.length; s.lines.splice(s.row, 2, L.replace(/\s+$/, "") + (nx ? " " : "") + nx); } return;
            case "p": case "P": return this.put(k == "P", cnt);
            case "u": return this.undoIt();
            case "d": case "y": case "g": case "r": case "Z": s.pending = k; s.count = had ? String(cnt) : ""; return;
            case "i": case "Insert": this.save(); s.mode = "insert"; s.replace = false; return;
            case "R": this.save(); s.mode = "insert"; s.replace = true; return;
            case "a": this.save(); s.mode = "insert"; s.col = Math.min(L.length, s.col + 1); return;
            case "I": this.save(); s.mode = "insert"; this.firstNonBlank(); return;
            case "A": this.save(); s.mode = "insert"; s.col = L.length; return;
            case "o": this.save(); s.lines.splice(s.row + 1, 0, ""); s.row++; s.col = 0; s.mode = "insert"; return;
            case "O": this.save(); s.lines.splice(s.row, 0, ""); s.col = 0; s.mode = "insert"; return;
            case ":": case "/": case "?": s.mode = "cmd"; s.cmdChar = k; s.cmd = ""; return;
            case "n": return this.find(1);
            case "N": return this.find(-1);
            case "Escape": return;
        }
    },

    put(before, cnt) {
        const s = this.st, r = s.reg;
        if (!r) return this.say("E353: Nothing in register \"", true);
        this.save();
        if (r.line) {
            const add = [].concat(...Array(cnt).fill(r.lines));
            s.lines.splice(before ? s.row : s.row + 1, 0, ...add);
            if (!before) s.row++;
            this.firstNonBlank();
            if (add.length > 2) this.say(`${add.length} more lines`);
        } else {
            const L = this.line(), at = before ? s.col : Math.min(L.length, s.col + 1), txt = r.text.repeat(cnt);
            s.lines[s.row] = L.substring(0, at) + txt + L.substring(at);
            s.col = at + txt.length - 1;
        }
    },

    undoIt() {
        const s = this.st, u = s.undo.pop();
        if (!u) return this.say("Already at oldest change");
        s.redo.push({ lines: s.lines.slice(), row: s.row, col: s.col });
        Object.assign(s, { lines: u.lines, row: u.row, col: u.col });
        s.dirty = s.undo.length > 0 || s.dirtyAtSave;
        this.say(`1 change; before #${s.undo.length + 1}`);
    },
    redoIt() {
        const s = this.st, r = s.redo.pop();
        if (!r) return this.say("Already at newest change");
        s.undo.push({ lines: s.lines.slice(), row: s.row, col: s.col });
        Object.assign(s, { lines: r.lines, row: r.row, col: r.col });
        s.dirty = true;
        this.say(`1 change; after #${s.undo.length}`);
    },

    fileInfo() {
        const s = this.st;
        this.say(`"${s.name || "[No Name]"}"${s.dirty ? " [Modified]" : ""} ${s.lines.length} lines --${Math.round((s.row + 1) / s.lines.length * 100)}%--`);
    },

    // ---------------------------------------------------------------- : commands
    ex(c) {
        const s = this.st;
        if (!c) return;
        if (/^\d+$/.test(c)) { s.row = parseInt(c) - 1; this.firstNonBlank(); return; }
        if (c == "$") { s.row = s.lines.length - 1; return; }
        let m;
        if ((m = c.match(/^set?\s+(\w+)/))) {
            if (m[1] == "nu" || m[1] == "number") s.nu = true;
            else if (m[1] == "nonu" || m[1] == "nonumber") s.nu = false;
            else this.say("E518: Unknown option: " + m[1], true);
            return;
        }
        if ((m = c.match(/^(w|write|wq|x|xit|exit|wq!|x!|w!)(?:\s+(\S+))?$/))) {
            const force = m[1].endsWith("!"), quit = /^(wq|x|xit|exit)/.test(m[1]);
            if (/^x/.test(m[1]) && !s.dirty && !m[2]) return this.close();
            if (!this.write(m[2], force)) return;
            if (quit) this.close();
            return;
        }
        if (c == "q" || c == "quit" || c == "qa") {
            if (s.dirty) return this.say("E37: No write since last change (add ! to override)", true);
            return this.close();
        }
        if (c == "q!" || c == "qa!" || c == "quit!" || c == "cq") return this.close();
        if (c == "help" || c == "h") return this.say("i insert · Esc normal · x dd yy p u · :w save · :q quit · :wq save and quit · :q! quit without saving");
        this.say(`E492: Not an editor command: ${c}`, true);
    },

    write(file, force) {
        const s = this.st;
        const sh = s.sh;
        const saved = { host: sh.host };
        sh.host = s.host;
        const v = sh.vfs();
        sh.host = saved.host;
        let abs = s.abs, name = s.name;
        if (file) { abs = v.abs(file, sh.cwd); name = file; }
        if (!abs) { this.say("E32: No file name", true); return false; }
        if (s.ro && !file && !force && !v.writable(abs)) { this.say("E45: 'readonly' option is set (add ! to override)", true); return false; }
        const text = s.lines.join("\n") + "\n";
        const err = v.write(abs, text, false);
        if (err) { this.say(`"${name}" E212: Can't open file for writing` + (err == "Read-only file system" ? " (Read-only file system)" : ""), true); return false; }
        if (!file || abs == s.abs) { s.dirty = false; s.abs = abs; s.name = name; s.ro = false; }
        this.say(`"${name}" ${s.lines.length}L, ${new TextEncoder().encode(text).length}B written`);
        Sim.event("info", `<b>${s.host || "console"}</b> vi saved ${esc(abs)}`, s.host ? { obj: s.host } : {});
        return true;
    },
};
