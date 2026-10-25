// How the admin laptop reaches the lab machines (⚙ Settings, or the  access  command).
//   simple   — "ssh host1" logs in straight from the admin console, "ssh host1 ip route" runs one
//              command there: a shortcut of the lab, the machines need no address for it.
//   console  — like in real life: the admin laptop is not on the lab network. It reaches a machine
//              through its console port (console router1, login root / nw); from inside the lab
//              ssh goes over the network: TCP handshake, host key, password or key, all in Wireshark.
const Access = {
    KEY: "nw.access",
    mode: "simple",
    auto: null, // a hint chip or popup button logs in by itself (it types root / nw for you)

    load() {
        try { const m = localStorage.getItem(this.KEY); if (m == "simple" || m == "console") this.mode = m; } catch (e) { /* private window */ }
    },

    // quiet: no message in the terminal (Autotest switches back and forth)
    set(m, quiet) {
        if (m != "simple" && m != "console") return false;
        if (m != this.mode) {
            this.mode = m;
            try { localStorage.setItem(this.KEY, m); } catch (e) { /* ignore */ }
            const t = terminal;
            const inside = shell.host || shell.sessions.length || shell.loginAt || shell.prompter;
            if (inside) {
                shell.cancelPrompter();
                shell.toConsole();
                if (!quiet) { t.waiting = false; if (!t.textarea.value.endsWith("\n")) t.raw("\n"); t.println("(the way to the machines has changed: you are back on the admin console)"); t.showPrompt(); }
            }
            if (!quiet) Sim.event("info", m == "console"
                ? "Access: <b>console</b> — the admin laptop is not on the lab network any more. Log in with <code>console router1</code>; ssh works between the lab machines, over the network."
                : "Access: <b>simplified ssh</b> — <code>ssh host1</code> logs in straight from the admin console again.");
        }
        this.sync();
        return true;
    },

    describe() {
        return this.mode == "console"
            ? "console access — the admin laptop is not on the lab network.\n  console NAME   connect to a machine's console port (login: root, password: nw)\n  ssh ADDRESS    from inside the lab, over the network (TCP port 22)"
            : "simplified ssh — a shortcut of the lab.\n  ssh NAME             log in straight from the admin console\n  ssh NAME COMMAND     run one command there";
    },

    // ------------------------------------------------------------------ the console port
    // console NAME (only on the admin laptop)
    consoleCmd(sh, argv) {
        const t = sh.t;
        if (sh.host) {
            t.println("-bash: console: command not found   (console runs on the admin laptop: type  ~.  to leave this console first)");
            sh.status = 127;
            return true;
        }
        const name = argv[1];
        if (!name) { t.println("usage: console NAME   (connect to the console port of a lab machine)"); return true; }
        const d = Id.find(name);
        if (!d || !(d instanceof Host || d instanceof Hub)) { t.println(`console: ${name}: no such machine in this lab`); sh.status = 1; return true; }
        if (d instanceof Hub && !d.managed) {
            t.println(`console: ${d.id} has no console port — ${d instanceof Switch ? "an unmanaged switch" : "a hub"} has nothing inside to log in to`);
            sh.status = 1;
            return true;
        }
        const n = d.id.toString();
        sh.consoleCwd = sh.cwd;
        if (d.cli) {
            t.println(`Connected to ${n} — console port, 9600 8N1 (type ~. to disconnect)\n`);
            this.iosReady(sh, d);
            return false;
        }
        const pc = !(d instanceof Router) && !(d instanceof Server) && !(d instanceof Switch);
        t.println(pc ? `Connected to ${n} — its own screen and keyboard (type ~. to leave)` : `Connected to ${n} — serial console ttyS0, 115200 8N1 (type ~. to disconnect)`);
        if (d.down) t.println(`(${n} is starting up — the login prompt is already there, it answers in a few seconds)`);
        this.getty(sh, d);
        return false;
    },

    // the text a Linux console shows before the login prompt
    getty(sh, d) {
        sh.t.println(`\n${Vfs.OS} ${Vfs.VER} (Blue Wire)\nKernel ${Vfs.KERNEL} on an x86_64\n`);
        this.login(sh, d);
    },

    login(sh, d) {
        const t = sh.t, n = d.id.toString();
        sh.loginAt = d;
        if (this.auto === d) {
            this.auto = null;
            t.waiting = false;
            t.raw(`${n} login: root\nPassword: \n`);
            return this.loggedIn(sh, d) && t.showPrompt();
        }
        const again = () => this.login(sh, d);
        t.ask(`${n} login: `, u => {
            u = u.trim();
            if (u == "~.") return this.disconnect(sh);
            if (!u) return again();
            t.ask("Password: ", pw => {
                if (d.down) { t.println(`\n(${n} is still starting up — try again in a moment)`); return again(); }
                if (u == "root" && pw == (d.rootPassword ? d.rootPassword() : d.rootPw || "nw")) return this.loggedIn(sh, d);
                t.println("\nLogin incorrect");
                again();
            }, { secret: true, cancel: again });
        }, { cancel: again });
    },

    loggedIn(sh, d) {
        sh.loginAt = null;
        sh.sessions = [{ kind: "console", host: d }];
        sh.host = d;
        sh.cwd = "/root";
        sh.oldCwd = null;
        const last = d.lastLogin || new Date(Math.min(Date.now() - 60000, Vfs.bootOf(d).getTime() + 90000));
        const tty = d instanceof Router || d instanceof Server || d instanceof Switch ? "ttyS0" : "tty1";
        sh.t.println(`Last login: ${last.toString().slice(0, 24)} ${d.lastFrom ? "from " + d.lastFrom : "on " + (d.lastTty || tty)}`);
        d.lastLogin = new Date();
        d.lastFrom = null;
        d.lastTty = tty;
        sh.updatePrompt();
        return true;
    },

    // IOS-style switch: no login on the console, just Return
    iosReady(sh, d) {
        const t = sh.t;
        sh.loginAt = d;
        const go = () => {
            sh.loginAt = null;
            d.cli.reset();
            sh.sessions = [{ kind: "console", host: d }];
            sh.host = d;
            sh.cwd = "/root";
            sh.updatePrompt();
            return true;
        };
        if (this.auto === d) { this.auto = null; t.println(`${d.id} con0 is now available\n\nPress RETURN to get started.\n`); go(); t.showPrompt(); return true; }
        t.ask(`${d.id} con0 is now available\n\nPress RETURN to get started.\n`, a => {
            if (a.trim() == "~.") return this.disconnect(sh);
            return go();
        }, { cancel: () => this.iosReady(sh, d) });
    },

    // exit on the IOS console: back to "Press RETURN"
    iosLogout(sh, d) {
        sh.sessions = [];
        sh.host = null;
        sh.t.waiting = false;
        sh.t.println("");
        this.iosReady(sh, d);
    },

    // ~. : the console cable is unplugged (and every ssh started from there ends)
    disconnect(sh) {
        const d = sh.loginAt || (sh.sessions[0] && sh.sessions[0].host);
        sh.cancelPrompter();
        sh.toConsole();
        sh.t.waiting = false;
        if (!sh.t.textarea.value.endsWith("\n")) sh.t.raw("\n");
        sh.t.println(`Disconnected from the console of ${d ? d.id : "the machine"}.`);
        return true;
    },

    inConsoleOf(d) { return shell.loginAt === d || (shell.sessions[0] && shell.sessions[0].kind == "console" && shell.sessions[0].host === d); },

    // exit / logout / Ctrl-D: returns true when it was handled here
    leave(sh) {
        const top = sh.sessions[sh.sessions.length - 1];
        if (!top) return false;
        if (top.kind == "ssh") { top.client.logout("logout"); return true; }
        if (top.kind == "console") {
            if (top.host.cli) { this.iosLogout(sh, top.host); return true; }
            sh.t.println("logout");
            sh.sessions = [];
            sh.host = null;
            sh.cwd = sh.consoleCwd || "/home/admin";
            sh.t.waiting = false;
            this.getty(sh, top.host);
            return true;
        }
        return false;
    },

    // a machine reboots: what happens to the console or ssh session on it
    onReboot(d) {
        const sh = shell, t = sh.t;
        if (sh.loginAt === d) {
            t.print(`\n${d.id}: the system is going down for reboot NOW!\n`);
            return true;
        }
        const i = sh.sessions.findIndex(s => s.host === d);
        if (i < 0) return false;
        const s = sh.sessions[i];
        // (later: the reboot command itself may still be running inside the ssh server)
        if (s.kind == "ssh") { const c = s.client; Sim.after(400, () => c.lost(null)); return true; }
        // its console: the machine goes away under you, then greets you with a new login prompt
        sh.sessions.slice(1).forEach(x => { if (x.client) x.client.session = null; });
        if (sh.job) { sh.job.cancel(false); sh.job = null; }
        sh.sessions = [];
        sh.host = null;
        t.waiting = false;
        if (!t.textarea.value.endsWith("\n")) t.raw("\n");
        t.println(`\nBroadcast message from root@${d.id} (ttyS0):\n\nThe system will reboot now!\n\n[  OK  ] Stopped every service.\n[  OK  ] Reached target System Reboot.\n…\n(the console stays connected while ${d.id} starts again)`);
        if (d.cli) this.iosReady(sh, d);
        else this.getty(sh, d);
        return true;
    },

    // ------------------------------------------------------------------ ssh over the network
    ssh(sh, argv) {
        const t = sh.t;
        let user = "root", dest = null, i = 1;
        while (i < argv.length) {
            const a = argv[i];
            if (a == "-l") { user = argv[i + 1] || user; i += 2; continue; }
            if (a == "-p" || a == "-i" || a == "-o") { i += 2; continue; }
            if (a.startsWith("-")) { i++; continue; }
            dest = a; i++; break;
        }
        if (!dest) { t.println("usage: ssh [-l login_name] [user@]destination [command]"); sh.status = 255; return true; }
        if (dest.includes("@")) [user, dest] = [dest.split("@")[0], dest.split("@").slice(1).join("@")];
        const rest = argv.slice(i).join(" ");
        if (!sh.host) {
            t.println(IP.isValid(dest) ? `ssh: connect to host ${dest} port 22: Network is unreachable` : `ssh: Could not resolve hostname ${dest}: Name or service not known`);
            const d = Id.find(dest);
            t.println(`(console access: the admin laptop is not on the lab network — use  console ${d ? d.id : "NAME"}  and ssh from there.  Simplified ssh: ⚙ Settings or  access simple)`);
            sh.status = 255;
            return true;
        }
        if (!sh.host.tcp || sh.host instanceof Switch) {
            t.println(`ssh: connect to host ${dest} port 22: Network is unreachable   (this switch has no IP address — it only passes frames on)`);
            sh.status = 255;
            return true;
        }
        const from = sh.host;
        const go = ip => {
            if (from.l3.isLocal(ip)) { t.println(`(you are on ${from.id} already — ssh to the machine itself is not simulated)`); return true; }
            return new SshClient(sh, from, ip, user, rest ? "exec" : "shell", rest).start();
        };
        return this.resolve(sh, from, dest, "ssh", go);
    },

    // a name → an IP address (with DNS if this machine has a server), then go(ip)
    resolve(sh, from, dest, prog, go) {
        const t = sh.t;
        if (IP.isValid(dest)) return go(dest);
        let sync = true, res = null;
        const pend = { active: true, kind: "resolve" };
        const req = from.resolver.resolve(dest, (ip, err) => {
            if (sync) { res = { ip, err }; return; }
            if (!pend.active) return;
            pend.active = false;
            if (sh.job === pend) sh.job = null;
            if (!ip) { this.noName(sh, from, dest, prog); return t.showPrompt(); }
            if (go(ip)) t.showPrompt();
        });
        sync = false;
        if (res) {
            if (!res.ip) { this.noName(sh, from, dest, prog); return true; }
            return go(res.ip);
        }
        pend.cancel = () => { pend.active = false; if (req && req.cancel) req.cancel(); };
        sh.job = pend;
        return false;
    },

    noName(sh, from, dest, prog) {
        sh.t.println(`${prog}: Could not resolve hostname ${dest}: Name or service not known` +
            (from.dnsServer ? "" : `\n(${from.id} has no DNS server — use the IP address, e.g.  ${prog} 192.168.1.11)`));
        sh.status = 255;
    },

    // ssh-copy-id [user@]host
    copyId(sh, argv) {
        const t = sh.t;
        if (!sh.host || !sh.host.tcp) { t.println("/usr/bin/ssh-copy-id: ERROR: run it on a lab machine (the admin laptop is not on the lab network)"); return true; }
        let dest = argv.filter((a, i) => i > 0 && !a.startsWith("-") && argv[i - 1] != "-i").pop();
        if (!dest) { t.println("Usage: /usr/bin/ssh-copy-id [-i [identity_file]] [user@]hostname"); return true; }
        let user = "root";
        if (dest.includes("@")) [user, dest] = dest.split("@");
        const from = sh.host;
        if (!from.sshKey) { t.println("/usr/bin/ssh-copy-id: ERROR: No identities found   (make one first:  ssh-keygen)"); sh.status = 1; return true; }
        t.println(`/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "/root/.ssh/id_ed25519.pub"\n/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed\n/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys`);
        return this.resolve(sh, from, dest, "ssh-copy-id", ip => new SshClient(sh, from, ip, user, "copy-id").start());
    },

    // ssh-keygen  /  ssh-keygen -R 192.168.1.11
    keygen(sh, argv) {
        const t = sh.t, h = sh.host;
        if (!h || !h.tcp) { t.println("ssh-keygen: make the keys on a lab machine (the admin laptop is not on the lab network)"); return true; }
        const r = argv.indexOf("-R");
        if (r > 0) {
            const ip = argv[r + 1];
            const kh = h.knownHosts || {};
            if (!ip) { t.println("usage: ssh-keygen -R hostname"); return true; }
            if (!kh[ip]) { t.println(`Host ${ip} not found in /root/.ssh/known_hosts`); return true; }
            delete kh[ip];
            t.println(`# Host ${ip} found: line 1\n/root/.ssh/known_hosts updated.\nOriginal contents retained as /root/.ssh/known_hosts.old`);
            return true;
        }
        const make = (header = true) => {
            if (header) t.println("Generating public/private ed25519 key pair.");
            t.ask("Enter file in which to save the key (/root/.ssh/id_ed25519): ", () =>
                t.ask("Enter passphrase (empty for no passphrase): ", () =>
                    t.ask("Enter same passphrase again: ", () => {
                        const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                        const rnd = n => Array.from({ length: n }, () => A[Math.floor(Math.random() * 64)]).join("");
                        h.sshKey = { fp: rnd(43), pub: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI" + rnd(43) + " root@" + h.id };
                        t.println(`Your identification has been saved in /root/.ssh/id_ed25519\nYour public key has been saved in /root/.ssh/id_ed25519.pub\nThe key fingerprint is:\nSHA256:${h.sshKey.fp} root@${h.id}\nThe key's randomart image is:\n+--[ED25519 256]--+\n|   .o+=*o.       |\n|  . .o*+= .      |\n|   o o+B.+       |\n|    ..=.* o      |\n|     o.ES+ .     |\n|    . +o=.o      |\n|     o.+..       |\n|      ++o        |\n|     .o*o        |\n+----[SHA256]-----+`);
                        return true;
                    }, { secret: true }), { secret: true }));
            return false;
        };
        if (h.sshKey) {
            t.println("Generating public/private ed25519 key pair.");
            t.ask("/root/.ssh/id_ed25519 already exists.\nOverwrite (y/n)? ", a => {
                if (a.trim().toLowerCase().startsWith("y")) { h.sshKey = null; make(false); return; }
                return true;
            });
            return false;
        }
        return make();
    },

    // passwd: a new root password (on the machine's disk: it survives a reboot)
    passwd(sh) {
        const t = sh.t, h = sh.host;
        if (!h) { t.println("passwd: the admin's own password is not part of the lab — try it on a lab machine"); return true; }
        t.println("Changing password for user root.");
        t.ask("New password: ", a => t.ask("Retype new password: ", b => {
            if (a != b) { t.println("Sorry, passwords do not match.\npasswd: Authentication token manipulation error"); sh.status = 1; return true; }
            if (!a) { t.println("No password has been supplied.\npasswd: Authentication token manipulation error"); sh.status = 1; return true; }
            h.rootPw = a;
            t.println("passwd: all authentication tokens updated successfully.");
            return true;
        }, { secret: true }), { secret: true });
        return false;
    },

    // ------------------------------------------------------------------ hint chips and popup buttons
    // "ssh host1 ping …" from a button: in console mode it becomes  console host1 (logged in for you), then the command
    adapt(cmd) {
        if (this.mode != "console") return null;
        const m = cmd.match(/^\s*ssh\s+(?:root@)?([A-Za-z][\w-]*)(?:\s+([\s\S]*))?$/);
        if (!m) return null;
        const d = Id.find(m[1]);
        if (!d || !(d instanceof Host || (d instanceof Hub && d.managed))) return null;
        const steps = [];
        const here = shell.sessions.length == 1 && shell.sessions[0].kind == "console" && shell.sessions[0].host === d && !shell.prompter;
        if (!here) {
            if (shell.sessions.length || shell.loginAt) steps.push({ disconnect: true });
            steps.push({ cmd: "console " + d.id, auto: d });
        }
        if (m[2]) steps.push({ cmd: m[2] });
        return steps;
    },

    // ------------------------------------------------------------------ ⚙ Settings
    initUI() {
        this.load();
        const btn = document.getElementById("btnSettings");
        const el = document.createElement("div");
        el.className = "settings";
        el.hidden = true;
        el.innerHTML = `<div class="set-h"><span>⚙</span><b>Settings</b><button class="pop-x set-x" title="Close">×</button></div>
            <div class="set-sec"><div class="set-t">Access to the lab machines</div>
                <label class="set-opt"><input type="radio" name="nwAccess" value="simple"><div><b>Simplified ssh</b>
                    <span><code>ssh host1</code> logs in straight from the admin console, <code>ssh host1 systemctl start lldpd</code> runs one command there. A shortcut of the lab: it works even when the machine has no address yet.</span></div></label>
                <label class="set-opt"><input type="radio" name="nwAccess" value="console"><div><b>Console access</b> <i>(realistic)</i>
                    <span>The admin laptop is not on the lab network. <code>console router1</code> plugs a console cable into the machine (login <b>root</b>, password <b>nw</b>, <code>~.</code> leaves). From there <code>ssh 192.168.1.11</code> goes over the network: TCP handshake, host key, password or key — watch it in Wireshark.</span></div></label>
            </div>
            <div class="set-sec"><div class="set-t">Tests</div>
                <button class="ctl ctl-sm set-at" title="Every UI test, then every terminal test; your network comes back at the end">✔ Run Autotest…</button>
                <p class="set-note">The pointer builds a network, then every terminal test runs (in simplified ssh). Your network and settings come back at the end.</p>
            </div>`;
        document.body.appendChild(el);
        this.el = el;
        const close = () => { el.hidden = true; btn.classList.remove("active"); };
        btn.addEventListener("click", ev => {
            ev.stopPropagation();
            el.hidden = !el.hidden;
            btn.classList.toggle("active", !el.hidden);
            if (!el.hidden) { const r = btn.getBoundingClientRect(); el.style.top = (r.bottom + 6) + "px"; el.style.right = Math.max(8, innerWidth - r.right) + "px"; this.sync(); }
        });
        el.querySelector(".set-x").addEventListener("click", close);
        el.querySelectorAll('input[name="nwAccess"]').forEach(r => r.addEventListener("change", () => this.set(r.value)));
        el.querySelector(".set-at").addEventListener("click", () => { close(); AutoTest.open(); });
        document.addEventListener("click", ev => { if (!el.hidden && !ev.target.closest(".settings, #btnSettings")) close(); });
        window.addEventListener("keydown", ev => { if (ev.key == "Escape" && !el.hidden) close(); });
        this.sync();
    },

    sync() {
        if (this.el) this.el.querySelectorAll('input[name="nwAccess"]').forEach(r => { r.checked = r.value == this.mode; });
        const b = document.getElementById("btnSettings");
        if (b) b.title = "Settings — access: " + (this.mode == "console" ? "console (realistic)" : "simplified ssh") + " · Autotest";
    },
};

// ---------------------------------------------------------------------- the terminal asks a question
Object.assign(Terminal.prototype, {
    // a prompt that is not the shell's: "router1 login: ", "Password: ", "(yes/no)? "
    // fn(answer) — return true to get the shell prompt back; secret: nothing is shown while typing
    ask(text, fn, o = {}) {
        this.waiting = false;
        this.prompt = text;
        shell.prompter = fn;
        shell.prompterCancel = o.cancel || null;
        this.secret = !!o.secret;
        this.secretBuf = "";
        const v = this.textarea.value;
        if (v && !v.endsWith("\n") && !text.startsWith("\n")) this.raw("\n");
        this.raw(text);
        this.waiting = true;
    },

    // a typed character while a password is asked: kept, not shown
    secretKey(evt) {
        if (!this.secret) return false;
        const k = evt.key;
        if (k == "Enter") { evt.preventDefault(); this.enter(this.secretBuf || ""); return true; }
        if (k == "Backspace") { evt.preventDefault(); this.secretBuf = (this.secretBuf || "").slice(0, -1); return true; }
        if (k && k.length == 1 && !evt.ctrlKey && !evt.metaKey && !evt.altKey) { evt.preventDefault(); this.secretBuf = (this.secretBuf || "") + k; return true; }
        return false;
    },
});

Object.assign(Shell.prototype, {
    cancelPrompter() {
        if (!this.prompter) return;
        this.prompter = null;
        this.prompterCancel = null;
        this.t.secret = false;
        this.updatePrompt();
    },
});
