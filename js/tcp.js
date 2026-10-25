// TCP (only what ssh needs) and SSH on top of it, travelling through the simulated network.
// Used in the "Console access" mode: the admin laptop reaches the machines through their
// console port, and from inside the lab one machine logs in to another with  ssh 192.168.1.11
//   SYN → SYN,ACK → ACK            the three-way handshake
//   SSH-2.0 banners, key exchange   still readable in Wireshark
//   Encrypted packets               password, commands and output — nobody on the cable can read them
//   FIN,ACK → FIN,ACK → ACK          goodbye

class TcpSegment extends PDU {
    constructor(srcPort, dstPort, seq, ack, flags, data) {
        super("TcpSegment");
        ["SrcPort", "DstPort", "Seq", "Ack", "Flags"].forEach(f => this.addHeaderField(f));
        this.addValue("SrcPort", srcPort);
        this.addValue("DstPort", dstPort);
        this.addValue("Seq", seq >>> 0);
        this.addValue("Ack", ack >>> 0);
        this.addValue("Flags", flags);
        this.data = data && data.length ? data : null; // a list of SSH messages
        this.rel = { seq: 0, ack: 0 };                  // relative numbers, as Wireshark shows them
    }
    get sp() { return this.getValue("SrcPort"); }
    get dp() { return this.getValue("DstPort"); }
    get flags() { return this.getValue("Flags"); }
    get len() { return this.data ? this.data.reduce((n, m) => n + m.bytes().length, 0) : 0; }
}

// one SSH message; "enc" ones carry what nobody may read (it is only in .secret, never on the wire)
class SshMsg {
    static CODES = { kexinit: 20, newkeys: 21, "ecdh-init": 30, "ecdh-reply": 31 };
    constructor(type, from, o = {}) {
        this.kind = "SSH";
        this.type = type;   // banner kexinit ecdh-init ecdh-reply newkeys enc
        this.from = from;   // client | server
        Object.assign(this, o);
    }
    static seed(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; }
    static noise(n, seed) {
        const out = [];
        let x = seed >>> 0 || 1;
        for (let i = 0; i < n; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; out.push(x & 255); }
        return out;
    }
    // the bytes on the wire
    bytes() {
        if (this._b) return this._b;
        if (this.type == "banner") return (this._b = Wire.ascii(this.text + "\r\n"));
        if (this.type == "enc") {
            const n = 16 * Math.ceil((24 + (this.size || 0)) / 16) + 16; // padded, + 16 bytes MAC
            return (this._b = [...Wire.u32(n - 4), ...SshMsg.noise(n - 4, SshMsg.seed(this.nonce || n))]);
        }
        const body = {
            kexinit: 160, "ecdh-init": 36, "ecdh-reply": 140, newkeys: 0,
        }[this.type];
        const pad = 8 - ((body + 6) % 8) + 4;
        return (this._b = [...Wire.u32(body + 2 + pad), pad, SshMsg.CODES[this.type], ...SshMsg.noise(body, SshMsg.seed(this.type + this.from)), ...new Array(pad).fill(0)]);
    }
    // the Info column
    info() {
        const who = this.from == "client" ? "Client" : "Server";
        if (this.type == "banner") return `${who}: Protocol (${this.text})`;
        if (this.type == "enc") return `${who}: Encrypted packet (len=${this.bytes().length})`;
        return `${who}: ` + { kexinit: "Key Exchange Init", "ecdh-init": "Elliptic Curve Diffie-Hellman Key Exchange Init",
            "ecdh-reply": "Elliptic Curve Diffie-Hellman Key Exchange Reply", newkeys: "New Keys" }[this.type];
    }
}

class Tcp {
    static SYN_TIMEOUT = 40000; // simulated ms: a far machine (ARP at every router) needs time
    constructor(host) {
        this.host = host;
        this.conns = new Map();
    }
    static key(lp, rip, rp) { return lp + "|" + rip + "|" + rp; }

    ephemeral() {
        let p;
        do { p = 32768 + Math.floor(Math.random() * 28000); } while ([...this.conns.values()].some(c => c.lp == p));
        return p;
    }

    // h: { onOpen(c), onData(c, msgs), onClose(c), onError(c, text) }
    connect(dstIp, dstPort, h) {
        const nic = this.host.l3.routing.route(dstIp);
        if (!nic || !nic.ip) return null;
        const c = { tcp: this, lip: nic.ip.ip, lp: this.ephemeral(), rip: dstIp, rp: dstPort, state: "SYN_SENT",
            isn: Math.floor(Math.random() * 4e9), rsn: 0, snd: 0, rcv: 0, h };
        this.conns.set(Tcp.key(c.lp, c.rip, c.rp), c);
        Sim.event("info", `<b>${this.host}</b> opens a TCP connection to ${dstIp} port ${dstPort}: SYN (“shall we talk?”) — the first of the three-way handshake`, { proto: "TCP", obj: this.host });
        this.out(c, "SYN");
        c.snd = 1;
        c.timer = Sim.after(Tcp.SYN_TIMEOUT, () => { if (c.state == "SYN_SENT") this.fail(c, "Connection timed out"); });
        return c;
    }

    out(c, flags, data) {
        const ack = flags.includes("ACK");
        const seg = new TcpSegment(c.lp, c.rp, c.isn + c.snd, ack ? c.rsn + c.rcv : 0, flags, data);
        seg.rel = { seq: c.snd, ack: ack ? c.rcv : 0 };
        if (seg.data) c.snd += seg.len;
        return this.host.l3.sendIp(new IpPacket("TCP", c.lip, c.rip, seg));
    }

    send(c, msgs) { if (c.state == "EST") this.out(c, "PSH,ACK", msgs); }

    close(c) {
        if (c.state != "EST") return this.drop(c);
        this.out(c, "FIN,ACK");
        c.snd += 1;
        c.state = "FIN_WAIT";
        c.closeTimer = Sim.after(20000, () => this.drop(c));
    }

    drop(c) {
        if (c.timer) c.timer.cancel();
        if (c.closeTimer) c.closeTimer.cancel();
        c.state = "CLOSED";
        this.conns.delete(Tcp.key(c.lp, c.rip, c.rp));
    }

    fail(c, text) {
        const st = c.state;
        this.drop(c);
        if (c.h && c.h.onError) c.h.onError(c, text, st);
    }

    receive(ip, nic, frame) {
        const seg = ip.getPayload(), src = ip.getValue("SrcIP"), dst = ip.getValue("DstIP"), F = seg.flags;
        const c = this.conns.get(Tcp.key(seg.dp, src, seg.sp));
        const h = `<b>${this.host}</b>`;
        if (!c) {
            if (F != "SYN") return;
            if (seg.dp == 22 && this.host.sshdOn && this.host.sshdOn()) {
                const s = { tcp: this, lip: dst, lp: seg.dp, rip: src, rp: seg.sp, state: "SYN_RCVD", isn: Math.floor(Math.random() * 4e9),
                    rsn: seg.getValue("Seq"), snd: 0, rcv: 1, server: true };
                s.h = SshServer.handler(this.host, s);
                this.conns.set(Tcp.key(s.lp, s.rip, s.rp), s);
                Sim.event("l3", `${h} sshd listens on TCP port 22 → answers SYN,ACK (“yes, let's talk”)`, { frame, obj: this.host });
                this.out(s, "SYN,ACK");
                s.snd = 1;
                return;
            }
            // nobody listens there: a reset (the client prints "Connection refused")
            Sim.event("drop", `${h} nobody listens on TCP port ${seg.dp} → RST (connection refused)`, { frame, obj: this.host });
            const r = new TcpSegment(seg.dp, seg.sp, 0, seg.getValue("Seq") + 1, "RST,ACK");
            r.rel = { seq: 0, ack: 1 };
            this.host.l3.sendIp(new IpPacket("TCP", dst, src, r));
            return;
        }
        if (F.includes("RST")) return this.fail(c, c.state == "SYN_SENT" ? "Connection refused" : "Connection reset by peer");
        if (c.state == "SYN_SENT") {
            if (F != "SYN,ACK") return;
            c.rsn = seg.getValue("Seq");
            c.rcv = 1;
            c.state = "EST";
            if (c.timer) c.timer.cancel();
            Sim.event("l3", `${h} got SYN,ACK → sends ACK: the connection to ${src}:${seg.sp} is open`, { frame, obj: this.host });
            this.out(c, "ACK");
            if (c.h.onOpen) c.h.onOpen(c);
            return;
        }
        if (c.state == "SYN_RCVD" && F.includes("ACK")) {
            c.state = "EST";
            if (c.h.onOpen) c.h.onOpen(c);
        }
        if (seg.data) {
            c.rcv += seg.len;
            if (c.h.onData) c.h.onData(c, seg.data, frame);
        }
        if (F.includes("FIN")) {
            c.rcv += 1;
            if (c.state == "FIN_WAIT") { this.out(c, "ACK"); this.drop(c); return; }
            this.out(c, "FIN,ACK");
            c.snd += 1;
            c.state = "LAST_ACK";
            if (c.h.onClose) c.h.onClose(c);
            c.closeTimer = Sim.after(20000, () => this.drop(c));
            return;
        }
        if (c.state == "LAST_ACK" && F == "ACK") this.drop(c);
    }

    // an ICMP error came back about one of our segments (a router had no route, ARP failed …)
    icmpError(orig, icmp) {
        const seg = orig.getPayload();
        const c = this.conns.get(Tcp.key(seg.sp, orig.getValue("DstIP"), seg.dp));
        if (!c || c.state != "SYN_SENT") return;
        const t = icmp ? icmp.getValue("Type") : "DestUnreachable", code = icmp ? icmp.code : 1;
        this.fail(c, t == "DestUnreachable" && code == 0 ? "Network is unreachable" : "No route to host");
    }

    // the machine reboots: every connection is gone without a word
    reset() { this.conns.forEach(c => { if (c.timer) c.timer.cancel(); if (c.closeTimer) c.closeTimer.cancel(); c.state = "CLOSED"; }); this.conns.clear(); }
}

// ------------------------------------------------------------------------ the SSH server (sshd)
const SshServer = {
    BANNER: "SSH-2.0-OpenSSH_8.7",

    handler(host, c) {
        c.ssh = { user: null, authed: false };
        return {
            onData: (c, msgs, frame) => msgs.forEach(m => SshServer.msg(host, c, m, frame)),
            onClose: () => {},
        };
    },

    msg(host, c, m, frame) {
        const send = list => host.tcp.send(c, list);
        const h = `<b>${host}</b>`;
        if (m.type == "banner") {
            Sim.event("l3", `${h} sshd: the client speaks ${esc(m.text)} → answers with its own version and the list of methods it knows (Key Exchange Init)`, { frame, obj: host });
            return send([new SshMsg("banner", "server", { text: SshServer.BANNER }), new SshMsg("kexinit", "server")]);
        }
        if (m.type == "ecdh-init") {
            Sim.event("l3", `${h} sshd: Diffie-Hellman — from here on both sides know a secret key that never travelled on the cable. Its host key (fingerprint ${host.hostKeyFp().slice(0, 14)}…) proves who it is`, { frame, obj: host });
            return send([new SshMsg("ecdh-reply", "server", { fp: host.hostKeyFp() }), new SshMsg("newkeys", "server")]);
        }
        if (m.type != "enc") return;
        const s = m.secret || {}, reply = (o, size) => send([new SshMsg("enc", "server", { secret: o, size: size || 16, nonce: Math.random() })]);
        if (s.op == "auth") {
            let ok = false;
            if (s.user != "root") ok = false;
            else if (s.method == "publickey") ok = (host.authorizedKeys || []).includes(s.key);
            else ok = s.password === host.rootPassword();
            Sim.event(ok ? "l3" : "drop", `${h} sshd: ${s.method == "publickey" ? "key" : "password"} login for ${esc(s.user)} — ${ok ? "accepted" : "refused"} (the cable only sees an encrypted packet)`, { frame, obj: host });
            c.ssh.authed = ok;
            c.ssh.user = s.user;
            return reply({ op: ok ? "auth-ok" : "auth-fail", method: s.method });
        }
        if (!c.ssh.authed) return reply({ op: "auth-fail" });
        if (s.op == "copy-id") {
            host.authorizedKeys = host.authorizedKeys || [];
            const added = host.authorizedKeys.includes(s.key) ? 0 : 1;
            if (added) host.authorizedKeys.push(s.key);
            return reply({ op: "copy-ok", added });
        }
        if (s.op == "shell") {
            c.ssh.cwd = "/root";
            c.ssh.from = c.rip;
            return reply({ op: "shell-ok", last: host.lastLogin, from: c.rip }, 64);
            // (host.lastLogin is updated by the client side when the session starts)
        }
        if (s.op == "exec" || s.op == "line") {
            const r = SshServer.run(host, c, s.cmd, s.op == "exec");
            return reply({ op: "output", text: r.text, job: r.job, exec: s.op == "exec", status: r.status }, r.text.length);
        }
    },

    // run a command on this machine and catch what it prints
    run(host, c, cmd, oneShot) {
        const sh = shell, t = sh.t;
        const saved = { host: sh.host, cwd: sh.cwd, oldCwd: sh.oldCwd, job: sh.job };
        sh.host = host;
        sh.cwd = c.ssh.cwd || "/root";
        if (oneShot) sh.oneShot = (sh.oneShot || 0) + 1;
        let buf = "";
        const realPrint = t.print, outer = sh.realPrint;
        t.print = s => { buf += s; };
        sh.realPrint = t.print;
        let show;
        try { show = sh.parse(cmd); }
        catch (e) { buf += "-bash: " + e.message + "\n"; }
        finally {
            t.print = realPrint;
            sh.realPrint = outer;
            if (oneShot) sh.oneShot--;
        }
        c.ssh.cwd = sh.cwd;
        const job = show === false && sh.job && sh.job !== saved.job;
        const status = sh.status;
        if (oneShot || saved.host !== host) {
            // a single command (or the user is elsewhere now): back to where the user is
            sh.host = saved.host; sh.cwd = saved.cwd; sh.oldCwd = saved.oldCwd;
            sh.updatePrompt();
        }
        return { text: buf, job: !!job, status };
    },
};

// ------------------------------------------------------------------------ the SSH client (ssh)
class SshClient {
    // mode: "shell" (log in), "exec" (one command), "copy-id"
    constructor(sh, from, ip, user, mode, cmd) {
        Object.assign(this, { sh, from, ip, user, mode, cmd, name: ip });
        this.t = sh.t;
        this.tries = 0;
        this.triedKey = false;
        this.active = true;
        this.cmd = cmd;
    }

    start() {
        this.c = this.from.tcp.connect(this.ip, 22, this);
        if (!this.c) {
            this.t.println(`ssh: connect to host ${this.ip} port 22: Network is unreachable`);
            this.sh.status = 255;
            return true;
        }
        this.job = { active: true, kind: "ssh", cancel: () => this.abort() };
        this.sh.job = this.job;
        return false;
    }

    // Ctrl-C while connecting / logging in
    abort() {
        if (!this.active) return;
        this.active = false;
        this.job.active = false;
        if (this.c && this.c.state != "CLOSED") this.from.tcp.close(this.c);
    }

    finish(showPrompt = true) {
        this.active = false;
        if (this.job) this.job.active = false;
        if (this.sh.job === this.job) this.sh.job = null;
        if (showPrompt) this.t.showPrompt();
    }

    send(list) { this.from.tcp.send(this.c, list); }
    enc(o, size) { return new SshMsg("enc", "client", { secret: o, size: size || 32, nonce: Math.random() }); }

    onOpen() {
        if (!this.active) return this.from.tcp.close(this.c);
        this.send([new SshMsg("banner", "client", { text: "SSH-2.0-OpenSSH_8.7" })]);
    }

    onError(c, text, state) {
        if (this.session) return this.lost("Connection reset by peer");
        if (!this.active) return;
        this.t.println(`ssh: connect to host ${this.ip} port 22: ${text}`);
        this.sh.status = 255;
        this.finish();
    }

    onClose() {
        // the other side hung up (reboot, logout from there …)
        if (this.session) this.lost(null);
    }

    onData(c, msgs) {
        msgs.forEach(m => {
            if (m.type == "kexinit") this.send([new SshMsg("kexinit", "client"), new SshMsg("ecdh-init", "client")]);
            else if (m.type == "ecdh-reply") this.hostKey(m.fp);
            else if (m.type == "enc") this.secret(m.secret || {});
        });
    }

    // ---- is it really that machine? (~/.ssh/known_hosts)
    hostKey(fp) {
        if (!this.active) return;
        const known = this.from.knownHosts = this.from.knownHosts || {};
        const go = () => this.auth();
        if (known[this.ip] == fp) return go();
        if (known[this.ip] && known[this.ip] != fp) {
            this.t.println(["@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@",
                "@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @",
                "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@",
                "IT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!",
                "Someone could be eavesdropping on you right now (man-in-the-middle attack)!",
                "It is also possible that a host key has just been changed.",
                `The fingerprint for the ED25519 key sent by the remote host is\nSHA256:${fp}.`,
                `Offending ED25519 key in /root/.ssh/known_hosts:1`,
                `  remove with:\n  ssh-keygen -R ${this.ip}`,
                `Host key for ${this.ip} has changed and you have requested strict checking.`,
                "Host key verification failed."].join("\n"));
            this.sh.status = 255;
            this.from.tcp.close(this.c);
            return this.finish();
        }
        this.t.println(`The authenticity of host '${this.ip} (${this.ip})' can't be established.\nED25519 key fingerprint is SHA256:${fp}.\nThis key is not known by any other names.`);
        const answer = a => {
            a = a.trim();
            if (a == "yes" || a == fp || a == "SHA256:" + fp) {
                known[this.ip] = fp;
                this.t.println(`Warning: Permanently added '${this.ip}' (ED25519) to the list of known hosts.`);
                return go();
            }
            if (a == "no") {
                this.t.println("Host key verification failed.");
                this.sh.status = 255;
                this.from.tcp.close(this.c);
                return this.finish();
            }
            this.t.ask("Please type 'yes', 'no' or the fingerprint: ", answer, { cancel: () => this.cancelled() });
        };
        this.t.ask("Are you sure you want to continue connecting (yes/no/[fingerprint])? ", answer, { cancel: () => this.cancelled() });
    }

    cancelled() {
        this.abort();
        this.finish();
    }

    // ---- log in: first the key (if there is one), then the password
    auth() {
        if (!this.active) return;
        const key = this.from.sshKey;
        if (key && !this.triedKey) {
            this.triedKey = true;
            return this.send([new SshMsg("newkeys", "client"), this.enc({ op: "auth", user: this.user, method: "publickey", key: key.pub }, 64)]);
        }
        this.askPassword();
    }

    askPassword(first = true) {
        this.t.ask(`${this.user}@${this.ip}'s password: `, pw => {
            this.send([...(this.tries == 0 && !this.triedKey ? [new SshMsg("newkeys", "client")] : []),
                this.enc({ op: "auth", user: this.user, method: "password", password: pw }, 32)]);
            this.tries++;
        }, { secret: true, cancel: () => this.cancelled() });
    }

    secret(s) {
        if (!this.active && !this.session) return;
        if (s.op == "auth-fail") {
            if (s.method == "publickey") return this.askPassword();
            if (this.tries < 3) { this.t.println("Permission denied, please try again."); return this.askPassword(); }
            this.t.println(`${this.user}@${this.ip}: Permission denied (publickey,password).`);
            this.sh.status = 255;
            this.from.tcp.close(this.c);
            return this.finish();
        }
        if (s.op == "auth-ok") {
            if (this.mode == "exec") return this.send([this.enc({ op: "exec", cmd: this.cmd }, this.cmd.length)]);
            if (this.mode == "copy-id") return this.send([this.enc({ op: "copy-id", key: this.from.sshKey.pub }, 96)]);
            return this.send([this.enc({ op: "shell" }, 24)]);
        }
        if (s.op == "copy-ok") {
            this.t.println(`\nNumber of key(s) added: ${s.added}\n\nNow try logging into the machine, with:   "ssh '${this.user}@${this.ip}'"\nand check to make sure that only the key(s) you wanted were added.\n`);
            this.from.tcp.close(this.c);
            return this.finish();
        }
        if (s.op == "shell-ok") return this.openSession(s);
        if (s.op == "output") {
            if (s.text) this.t.print(s.text);
            if (s.exec) {
                this.sh.status = s.status || 0;
                this.from.tcp.close(this.c);
                return this.finish(!s.job);
            }
            this.waiting = false;
            if (!s.job) this.t.showPrompt();
            this.next();
        }
    }

    // ---- an interactive session: what you type goes over the cable, encrypted
    openSession(s) {
        const target = SshClient.hostOf(this.ip);
        this.finish(false);
        this.active = false;
        this.session = { kind: "ssh", client: this, host: target, prevHost: this.sh.host, prevCwd: this.sh.cwd, prevOld: this.sh.oldCwd };
        this.sh.sessions.push(this.session);
        if (target) {
            this.t.println(`Last login: ${(target.lastLogin || new Date(Math.min(Date.now() - 60000, Vfs.bootOf(target).getTime() + 60000))).toString().slice(0, 24)} ${target.lastFrom ? "from " + target.lastFrom : "on " + (target.lastTty || "ttyS0")}`);
            target.lastLogin = new Date();
            target.lastFrom = this.c.lip;
        }
        this.sh.host = target;
        this.sh.cwd = "/root";
        this.sh.oldCwd = null;
        this.queue = [];
        this.sh.updatePrompt();
        this.t.showPrompt();
    }

    // a typed line: off to the other machine
    line(cmd) {
        if (this.waiting) { this.queue.push(cmd); return; }
        this.waiting = true;
        this.send([this.enc({ op: "line", cmd }, cmd.length)]);
        // no answer for a long time: the line is broken
        const sent = Sim.total;
        this.watch = Sim.after(30000, () => { if (this.waiting && this.session && Sim.total - sent >= 29000) this.lost("Timeout, server " + this.ip + " not responding."); });
    }

    next() {
        if (this.watch) { this.watch.cancel(); this.watch = null; }
        const q = this.queue && this.queue.shift();
        if (q != null) { this.t.waiting = false; this.t.raw(q + "\n"); this.line(q); }
    }

    // exit / logout / Ctrl-D in the session
    logout(word = "logout") {
        this.t.println(word);
        this.close(`Connection to ${this.ip} closed.`);
    }

    close(text) {
        if (this.watch) { this.watch.cancel(); this.watch = null; }
        if (this.c && this.c.state == "EST") this.from.tcp.close(this.c);
        this.endSession(text);
    }

    // the other side went away
    lost(text) {
        if (!this.session) return;
        if (this.c && this.c.state != "CLOSED") this.from.tcp.drop(this.c);
        this.endSession(text || `Connection to ${this.ip} closed by remote host.\nConnection to ${this.ip} closed.`);
    }

    endSession(text) {
        const s = this.session;
        if (!s) return;
        this.session = null;
        const i = this.sh.sessions.indexOf(s);
        const wasTop = i == this.sh.sessions.length - 1;
        if (i >= 0) this.sh.sessions.splice(i);
        this.sh.host = s.prevHost;
        this.sh.cwd = s.prevCwd;
        this.sh.oldCwd = s.prevOld;
        // something typed meanwhile moves down, after the new prompt
        const t = this.t, v = t.textarea.value;
        let typed = "";
        if (t.waiting) {
            const p = v.lastIndexOf(t.prompt);
            if (p >= 0 && v.indexOf("\n", p) < 0) { typed = v.substring(p + t.prompt.length); t.textarea.value = v.substring(0, p + t.prompt.length) + "\n"; }
        } else {
            const nl = v.lastIndexOf("\n");
            typed = v.substring(nl + 1);
            t.textarea.value = v.substring(0, nl + 1);
        }
        t.waiting = false;
        if (text) this.t.println(text);
        this.sh.updatePrompt();
        if (wasTop || i >= 0) { this.t.showPrompt(); if (typed) this.t.raw(typed); }
    }

    static hostOf(ip) {
        return [...(Id.list.Host || []), ...(Id.list.Router || []), ...(Id.list.Server || [])].find(h => h.nics.some(n => n.ip && n.ip.ip == ip)) || null;
    }
}
