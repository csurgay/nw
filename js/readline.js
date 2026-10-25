// Line editing like bash (GNU readline): moving and deleting by words, cut and paste,
// undo, the reverse history search (Ctrl-R) and the history expansion (!! !$ ^a^b).
// Some keys are taken by the browser and never reach the page (Ctrl-T, Ctrl-W, Ctrl-N
// open or close tabs and windows); the Alt versions and the phone key bar still work.
Object.assign(Terminal.prototype, {

    // ---------------------------------------------------------------- editing keys
    // returns true when the key was handled here
    readlineKey(evt) {
        if (this.isearch) return this.isearchKey(evt);
        if (this.busy && this.busy() && evt.ctrlKey && /^(r|p|n)$/i.test(evt.key)) { evt.preventDefault(); return true; } // history waits for the prompt
        const k = evt.key, code = evt.code || "";
        const ctrl = evt.ctrlKey && !evt.altKey && !evt.metaKey, alt = evt.altKey && !evt.ctrlKey;
        // Mac: Option+B gives "∫", so the physical key (code) decides
        const letter = code.startsWith("Key") ? code.slice(3).toLowerCase() : (k.length == 1 ? k.toLowerCase() : "");
        const act = (fn) => { evt.preventDefault(); fn(); this.showBottom(); return true; };
        if (ctrl) {
            if (letter == "r") return act(() => this.isearchStart());
            if (letter == "a") return act(() => this.caret(this.lineStart()));
            if (letter == "e") return act(() => this.caret(this.textarea.value.length));
            if (letter == "b") return act(() => this.caret(Math.max(this.lineStart(), this.textarea.selectionStart - 1)));
            if (letter == "f") return act(() => this.caret(Math.min(this.textarea.value.length, this.textarea.selectionEnd + 1)));
            if (letter == "u") return act(() => this.kill(this.lineStart(), this.pos()));
            if (letter == "k") return act(() => this.kill(this.pos(), this.textarea.value.length));
            if (letter == "w") return act(() => this.kill(this.wordStart(this.pos(), /\s/), this.pos()));
            if (letter == "y") return act(() => this.yankKill());
            if (letter == "p") return act(() => this.keypress({ key: "ArrowUp", preventDefault() {} }));
            if (letter == "n") return act(() => this.keypress({ key: "ArrowDown", preventDefault() {} }));
            if (k == "_" || k == "/" || (k == "-" && evt.shiftKey)) return act(() => this.undo());
            if (k == "ArrowLeft") return act(() => this.caret(this.wordStart(this.pos())));
            if (k == "ArrowRight") return act(() => this.caret(this.wordEnd(this.pos())));
        }
        if (alt) {
            if (letter == "b") return act(() => this.caret(this.wordStart(this.pos())));
            if (letter == "f") return act(() => this.caret(this.wordEnd(this.pos())));
            if (letter == "d") return act(() => this.kill(this.pos(), this.wordEnd(this.pos())));
            if (k == "Backspace") return act(() => this.kill(this.wordStart(this.pos()), this.pos()));
        }
        // remember the line before an edit, for Ctrl-_ (undo)
        if (!evt.ctrlKey && !evt.altKey && !evt.metaKey && (k.length == 1 || k == "Backspace" || k == "Delete")) this.snapshot();
        return false;
    },

    pos() { return Math.max(this.lineStart(), this.textarea.selectionStart); },
    caret(p) { this.textarea.selectionStart = this.textarea.selectionEnd = p; },

    // word boundaries: letters and digits make a word (Alt-B/F/D), or anything but spaces (Ctrl-W)
    wordStart(p, sep = /[^A-Za-z0-9]/) {
        const v = this.textarea.value, s = this.lineStart();
        while (p > s && sep.test(v[p - 1])) p--;
        while (p > s && !sep.test(v[p - 1])) p--;
        return p;
    },
    wordEnd(p, sep = /[^A-Za-z0-9]/) {
        const v = this.textarea.value;
        while (p < v.length && sep.test(v[p])) p++;
        while (p < v.length && !sep.test(v[p])) p++;
        return p;
    },

    // cut a piece of the line into the kill ring (Ctrl-Y pastes it back)
    kill(a, b) {
        if (b <= a) return;
        this.snapshot();
        const v = this.textarea.value;
        this.killed = v.substring(a, b);
        this.textarea.value = v.substring(0, a) + v.substring(b);
        this.caret(a);
    },

    yankKill() {
        if (!this.killed) return;
        this.snapshot();
        const ta = this.textarea, p = this.pos();
        ta.value = ta.value.substring(0, p) + this.killed + ta.value.substring(ta.selectionEnd);
        this.caret(p + this.killed.length);
    },

    snapshot() {
        const s = { line: this.line(), at: this.pos() - this.lineStart() };
        this.undoStack = this.undoStack || [];
        const last = this.undoStack[this.undoStack.length - 1];
        if (!last || last.line != s.line) this.undoStack.push(s);
        if (this.undoStack.length > 200) this.undoStack.shift();
    },

    undo() {
        const st = this.undoStack || [];
        let s = st.pop();
        while (s && s.line == this.line() && st.length) s = st.pop();
        if (!s || s.line == this.line()) return;
        this.setLine(s.line);
        this.caret(this.lineStart() + Math.min(s.at, s.line.length));
    },

    // ---------------------------------------------------------------- Ctrl-R
    // (reverse-i-search)`ping': ssh host1 ping -c 3 192.168.1.2
    isearchStart() {
        const ta = this.textarea;
        this.isearch = { query: "", idx: this.history.length, match: "", orig: this.line(), at: ta.value.lastIndexOf(this.prompt), failed: false };
        this.isearchShow();
    },

    isearchFind(from) {
        const s = this.isearch;
        if (!s.query) { s.match = ""; s.failed = false; return; }
        for (let k = from; k >= 0; k--) {
            if (this.history[k] && this.history[k].includes(s.query)) { s.idx = k; s.match = this.history[k]; s.failed = false; return; }
        }
        s.failed = true;
    },

    isearchShow() {
        const s = this.isearch, ta = this.textarea;
        ta.value = ta.value.substring(0, s.at) + `(${s.failed ? "failed " : ""}reverse-i-search)\`${s.query}': ${s.match}`;
        const at = s.match.indexOf(s.query);
        this.caret(ta.value.length - s.match.length + Math.max(0, at));
        this.showBottom();
    },

    // leave the search: the prompt comes back with the found command (or the old line)
    isearchEnd(keep) {
        const s = this.isearch;
        this.isearch = null;
        const ta = this.textarea;
        ta.value = ta.value.substring(0, s.at) + this.prompt + (keep ? (s.match || s.orig) : s.orig);
        this.caret(ta.value.length);
        this.showBottom();
    },

    isearchKey(evt) {
        const s = this.isearch, k = evt.key;
        if (["Shift", "Control", "Alt", "Meta"].includes(k)) return true;
        evt.preventDefault();
        const letter = (evt.code || "").startsWith("Key") ? evt.code.slice(3).toLowerCase() : k.toLowerCase();
        if (evt.ctrlKey && letter == "r") { this.isearchFind(s.match ? s.idx - 1 : this.history.length - 1); this.isearchShow(); return true; }
        if (evt.ctrlKey && (letter == "g" || letter == "c")) { this.isearchEnd(false); return true; }
        if (k == "Enter") { this.isearchEnd(true); this.keypress({ key: "Enter", preventDefault() {} }); return true; }
        if (k == "Backspace") {
            s.query = s.query.slice(0, -1);
            this.isearchFind(this.history.length - 1);
            this.isearchShow();
            return true;
        }
        if (k.length == 1 && !evt.ctrlKey && !evt.altKey && !evt.metaKey) { this.isearchType(k); return true; }
        // any other key (arrows, Esc, Tab, Ctrl-A …) takes the found line for editing
        this.isearchEnd(true);
        if (k != "Escape") this.keypress(evt);
        return true;
    },

    isearchType(text) {
        const s = this.isearch;
        s.query += text;
        this.isearchFind(s.match && s.match.includes(s.query) ? s.idx : this.history.length - 1);
        this.isearchShow();
    },

    // ---------------------------------------------------------------- history expansion
    // returns { line } or { error }
    expandHistory(line) {
        const h = this.history;
        const last = () => h[h.length - 1];
        const words = (c) => (c || "").trim().split(/\s+/);
        // ^old^new — the last command with the first "old" changed to "new"
        const q = line.match(/^\^([^^]*)\^([^^]*)\^?$/);
        if (q) {
            const l = last();
            if (!l || !l.includes(q[1])) return { error: "-bash: :s" + q[1] + "^" + q[2] + ": substitution failed" };
            return { line: l.replace(q[1], q[2]) };
        }
        if (line.indexOf("!") < 0) return { line };
        let out = "", err = null, inQuote = false;
        for (let i = 0; i < line.length && !err; i++) {
            const c = line[i];
            if (c == "'") inQuote = !inQuote;
            if (c != "!" || inQuote || i + 1 >= line.length || /[\s=(]/.test(line[i + 1])) { out += c; continue; }
            const rest = line.substring(i + 1);
            let m, ev = null, len = 0, pick = null;
            if (rest[0] == "!") { ev = last(); len = 1; }
            else if (rest[0] == "$") { ev = last(); len = 1; pick = "$"; }
            else if (rest[0] == "*") { ev = last(); len = 1; pick = "*"; }
            else if (rest[0] == "^") { ev = last(); len = 1; pick = "^"; }
            else if ((m = rest.match(/^-(\d+)/))) { ev = h[h.length - +m[1]]; len = m[0].length; }
            else if ((m = rest.match(/^(\d+)/))) { ev = h[+m[1] - 1]; len = m[0].length; }
            else if ((m = rest.match(/^([^\s:;|&]+)/))) {
                for (let k = h.length - 1; k >= 0; k--) if (h[k].startsWith(m[1])) { ev = h[k]; break; }
                len = m[0].length;
            }
            if (ev == null) { err = "-bash: !" + rest.split(/\s/)[0] + ": event not found"; break; }
            // !!:$ style word designators
            const w = rest.substring(len).match(/^:(\$|\^|\*|\d+)/);
            if (w) { pick = w[1]; len += w[0].length; }
            const ws = words(ev);
            if (pick == "$") ev = ws[ws.length - 1];
            else if (pick == "^") ev = ws[1] || "";
            else if (pick == "*") ev = ws.slice(1).join(" ");
            else if (pick != null) ev = ws[+pick] || "";
            out += ev;
            i += len;
        }
        return err ? { error: err } : { line: out };
    },
});
