// TAB completion like bash: one TAB completes as far as it is unambiguous,
// a second TAB lists the possibilities. What is offered depends on the place:
// commands first, then host names after ssh, IP addresses and DNS names after
// ping, card names after "dev", files and folders everywhere else.
const Completion = {
    // commands of the lab shell (shell.js) — the rest comes from Coreutils
    SHELL_CMDS: ["exit", "clear", "help", "for", "ssh", "systemctl", "lldpcli", "arping", "arp", "ip", "traceroute",
        "tracert", "lab", "dhclient", "host", "nslookup", "ping", "jobs", "fg", "bg", "kill", "alias", "unalias", "watch", "autotest", "wireshark", "console", "access", "ssh-keygen", "ssh-copy-id", "passwd"],

    // line: everything after the prompt -> { line: completed line, list: [shown words] }
    complete(sh, line) {
        if (sh.host && sh.host.cli) return sh.host.cli.complete(line);
        const cut = Math.max(line.lastIndexOf("|"), line.lastIndexOf(";"), line.lastIndexOf("&"));
        let rest = line.substring(cut + 1).replace(/^\s*(do\s+)?/, "");
        const words = rest.split(/\s+/);
        if (rest == "") words.length = 1;
        const cur = words[words.length - 1];
        const prev = words.slice(0, -1);
        const afterPipe = cut >= 0 && line[cut] == "|";
        let cands = this.candidates(sh, prev, cur, afterPipe);
        const seen = new Set();
        cands = cands.filter(c => c.text.startsWith(cur) && !seen.has(c.text) && seen.add(c.text));
        if (!cands.length) return { line, list: [] };
        const head = line.substring(0, line.length - cur.length);
        if (cands.length == 1) return { line: head + cands[0].text + cands[0].suffix, list: [] };
        let lcp = cands[0].text;
        for (const c of cands) while (!c.text.startsWith(lcp)) lcp = lcp.slice(0, -1);
        return { line: head + lcp, list: cands.map(c => c.display).sort((a, b) => a.localeCompare(b)) };
    },

    w(list, suffix = " ") { return list.map(t => ({ text: t, suffix, display: t })); },

    candidates(sh, prev, cur, afterPipe) {
        if (cur.startsWith("$")) return this.w(Object.keys(sh.vars()).filter(k => /^[A-Z]/.test(k)).map(k => "$" + k));
        if (!prev.length) {
            if (cur.includes("/") || cur.startsWith(".") || cur.startsWith("~")) return this.paths(sh, cur);
            return this.w(afterPipe ? Coreutils.FILTERS : this.commands());
        }
        const last = prev[prev.length - 1];
        if (last == ">" || last == ">>" || last == "2>") return this.paths(sh, cur);
        const cmd = prev[0];
        const n = prev.length; // index of the word being completed
        switch (cmd) {
            case "sudo": return this.candidates(sh, prev.slice(1), cur);
            case "man": return this.w(MAN.names());
            case "which": return this.w(this.commands());
            case "console":
                return n == 1 ? this.w(this.hostNames()) : [];
            case "access":
                return n == 1 ? this.w(["simple", "console"]) : [];
            case "ssh-copy-id":
                return [];
            case "ssh":
                if (n == 1 && typeof Access != "undefined" && Access.mode == "console") {
                    // over the network: the addresses this machine knows (ARP cache, known_hosts)
                    const h = sh.host, ips = new Set();
                    if (h && h.knownHosts) Object.keys(h.knownHosts).forEach(i => ips.add(i));
                    if (h && h.l3) (h.l3.arp.cache || []).forEach(e => e.ip && ips.add(String(e.ip)));
                    return this.w([...ips]);
                }
                if (n == 1) {
                    const at = cur.startsWith("root@") ? "root@" : "";
                    return this.w(this.hostNames().map(h => at + h));
                }
                return this.onHost(sh, prev[1], () => this.candidates(sh, prev.slice(2), cur));
            case "ip":
                if (sh.host instanceof Switch) {
                    if (n == 1) return this.w(["link", "addr"]);
                    if (n == 2 && prev[1] == "link") return this.w(["set", "show"]);
                    if (n == 3 && prev[2] == "set") return this.w(this.nics(sh));
                    if (n == 4 && prev[2] == "set") return this.w(["up", "down"]);
                    return [];
                }
                return this.ip(sh, prev, cur);
            case "bridge":
                if (n == 1) return this.w(["fdb", "vlan", "link"]);
                if (n == 2) return this.w(prev[1] == "vlan" ? ["show", "add", "del"] : ["show"]);
                if (last == "dev") return this.w(this.nics(sh));
                if (prev[1] == "vlan" && (prev[2] == "add" || prev[2] == "del")) {
                    if (!prev.includes("dev")) return this.w(["dev"]);
                    if (!prev.includes("vid")) return this.w(["vid"]);
                    if (last != "vid") return this.w(["pvid", "untagged"]);
                }
                return [];
            case "ethtool": return n == 1 ? this.w(this.nics(sh)) : [];
            case "sysctl": return this.w(["-w", "net.ipv4.ip_forward", "net.ipv4.ip_forward=1", "net.ipv4.ip_forward=0"]);
            case "systemctl":
                if (n == 1) return this.w(["start", "stop", "restart", "status", "is-active", "reboot"]);
                if (n == 2) return this.w(["lldpd", "dhcpd", "named"]);
                return [];
            case "lldpcli":
                if (n == 1) return this.w(["update", "show"]);
                if (n == 2 && prev[1] == "show") return this.w(["neighbors", "chassis"]);
                return [];
            case "lab": return n == 1 ? this.w(Topology.all().map(t => t.id)) : [];
            case "watch": {
                let k = 1;
                if (prev[1] == "-n") k = 3;
                if (n < k) return n == 1 ? this.w(["-n"]) : [];
                return this.candidates(sh, prev.slice(k), cur);
            }
            case "fg": case "bg": case "kill": return this.w(sh.jobList().map(j => "%" + j.n));
            case "unalias": return this.w(Object.keys(sh.aliasMap()));
            case "hostnamectl": return n == 1 ? this.w(["set-hostname", "status"]) : [];
            case "shutdown": return this.w(["-r"]);
            case "reboot": case "poweroff": case "halt": return [];
            case "ping": case "traceroute": case "tracert": case "arping": case "host": case "nslookup": {
                if (["-c", "-t", "-w", "-i", "-I"].includes(last)) return last == "-I" ? this.w(this.nics(sh)) : [];
                if (cur.startsWith("-")) return this.w({ ping: ["-c", "-t"], traceroute: ["-n", "-m"], arping: ["-c", "-I"] }[cmd] || [], " ");
                const names = cmd == "arping" ? [] : this.dnsNames(sh);
                return this.w([...this.ips(), ...names]);
            }
            case "dhclient": return this.w(["-r", ...this.nics(sh)]);
            case "ifconfig": return n == 1 ? this.w([...this.nics(sh), "lo"]) : [];
            case "ss": case "netstat": return cur.startsWith("-") ? this.w(["-tulpn", "-ulpn", "-tlpn"]) : [];
            case "ps": return this.w(["aux", "-ef"]);
            case "cd": case "rmdir": case "tree": return this.paths(sh, cur, true);
            case "for": return [];
            case "help": case "clear": case "exit": case "history": case "whoami": case "id": case "date": case "uptime":
            case "free": case "df": case "uname": case "hostname": case "env": case "printenv": case "w": case "who":
                return cmd == "printenv" ? this.w(Object.keys(sh.vars()).filter(k => /^[A-Z]/.test(k))) : [];
            default: return this.paths(sh, cur);
        }
    },

    ip(sh, prev, cur) {
        const n = prev.length, sub = prev[1] || "";
        const last = prev[n - 1];
        if (n == 1) return this.w(["addr", "route", "neigh", "link"]);
        if (last == "dev") return this.w(this.nics(sh));
        if (last == "via") return this.w(this.ips());
        if ("addr".startsWith(sub) || sub == "a") {
            if (n == 2) return this.w(["add", "del", "flush", "replace", "show"]);
            if (n >= 3 && !prev.includes("dev") && (prev[2] == "flush" || n >= 4)) return this.w(["dev"]);
            return [];
        }
        if ("route".startsWith(sub) || sub == "r") {
            if (n == 2) return this.w(["add", "show"]);
            if (prev[2] == "add" && n == 3) return this.w(["default"]);
            if (prev[2] == "add" && n == 4) return this.w(["via"]);
        }
        return [];
    },

    commands() {
        const skip = new Set(["true", "false", "la", "ll"]);
        const sw = typeof shell != "undefined" && shell.host instanceof Switch ? ["bridge", "ethtool"] : [];
        return [...this.SHELL_CMDS, ...Object.keys(Coreutils.cmds).filter(c => !skip.has(c)), "ll", "la", ...sw];
    },

    hostNames() {
        return [...["Host", "Server", "Router"].flatMap(t => (Id.list[t] || []).map(o => o.id.toString())),
            ...(Id.list.Switch || []).filter(s => s.managed).map(s => s.id.toString())];
    },

    machines() {
        return ["Host", "Server", "Router"].flatMap(t => Id.list[t] || []);
    },

    nics(sh) {
        if (sh.host instanceof Switch) return sh.host.ports.map(p => sh.host.portName(p));
        return sh.host ? sh.host.nics.map(n => n.id.toString()) : [];
    },

    ips() {
        const s = new Set();
        this.machines().forEach(m => m.nics.forEach(n => { if (n.ip) s.add(n.ip.ip); }));
        return [...s];
    },

    dnsNames(sh) {
        const out = [];
        (Id.list.Server || []).forEach(s => {
            if (!s.named) return;
            Object.keys(s.named.records).forEach(fq => {
                out.push(fq);
                if (sh.host && sh.host.domain && fq.endsWith("." + sh.host.domain)) out.push(fq.slice(0, -sh.host.domain.length - 1));
            });
        });
        return out;
    },

    // complete as if we were logged in to that machine (ssh host2 cat /etc/<TAB>)
    onHost(sh, name, fn) {
        const o = Id.find((name || "").replace(/^root@/, ""));
        if (!o || !(o instanceof Host)) return [];
        const saved = { host: sh.host, cwd: sh.cwd };
        sh.host = o;
        sh.cwd = "/root";
        try { return fn(); }
        finally { sh.host = saved.host; sh.cwd = saved.cwd; }
    },

    // files and folders; folders end in "/" so the next TAB goes inside
    paths(sh, cur, dirsOnly) {
        const v = sh.vfs();
        const slash = cur.lastIndexOf("/");
        const dirPart = slash < 0 ? "" : cur.substring(0, slash + 1);
        const base = cur.substring(slash + 1);
        if (cur == "~") return [{ text: "~", suffix: "/", display: "~/" }];
        const dirAbs = v.abs(dirPart || ".", sh.cwd);
        const r = v.lookup(dirAbs);
        if (r.err || r.node.t != "d" || (r.node.priv && !sh.host)) return [];
        const out = [];
        for (const [name, node] of Object.entries(v.children(r.node, r.path))) {
            if (name.startsWith(".") && !base.startsWith(".")) continue;
            let isDir = node.t == "d";
            if (node.t == "l") {
                const t = v.lookup((r.path == "/" ? "" : r.path) + "/" + name);
                isDir = !t.err && t.node.t == "d";
            }
            if (dirsOnly && !isDir) continue;
            out.push({ text: dirPart + name, suffix: isDir ? "/" : " ", display: name + (isDir ? "/" : "") });
        }
        return out;
    },
};
