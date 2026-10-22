class Shell {
    constructor(terminal) {
        this.host = null;
        this.t = terminal;
        this.disableInput = false;
        this.job = null; // foreground job (ping, arping) that is waiting for replies
        this.cwd = "/home/admin"; // current directory (cd, pwd, the prompt)
        this.oldCwd = null;
        this.consoleCwd = this.cwd; // remembered while logged in to a host
        this.consoleFiles = {}; // files the admin made on the console
        this.status = 0; // exit status of the last command: $?
    }

    vfs() { return new Vfs(this); }

    // error messages skip the pipe and go straight to the screen (or to 2>/dev/null)
    stderr(s) {
        if (this.stderrNull) return;
        (this.realPrint || this.t.print).call(this.t, s + "\n");
    }

    vars() {
        const user = this.host ? "root" : "admin";
        return {
            HOME: this.host ? "/root" : "/home/admin", USER: user, LOGNAME: user, HOSTNAME: this.host ? this.host.id.toString() : "console",
            PWD: this.cwd, OLDPWD: this.oldCwd || "", SHELL: "/bin/bash", LANG: "en_US.UTF-8", TERM: "xterm-256color",
            PATH: this.host ? "/root/.local/bin:/root/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin" : "/home/admin/.local/bin:/home/admin/bin:/usr/local/bin:/usr/bin",
            "?": String(this.status), "$": this.host ? "1201" : "1100",
        };
    }

    // [root@Host1 etc]#  — shows the last part of the current directory
    updatePrompt() {
        const home = this.host ? "/root" : "/home/admin";
        const dir = this.cwd == home ? "~" : this.cwd == "/" ? "/" : Vfs.base(this.cwd);
        this.t.prompt = this.host ? `[root@${this.host.id} ${dir}]# ` : `[admin@console ${dir}]$ `;
    }

    // back to the admin console (exit, Ctrl-D, loading a lab)
    toConsole() {
        this.host = null;
        this.cwd = this.consoleCwd || "/home/admin";
        this.oldCwd = null;
        this.updatePrompt();
    }

    // words like bash makes them: 'quotes', "quotes with $VARS", \escapes, ~
    tokenize(s) {
        const vars = this.vars();
        const out = [];
        let cur = null, i = 0, glob = false;
        const push = () => {
            if (cur === null) return;
            if (glob) out.push(...this.expandGlob(cur));
            else out.push(cur);
            cur = null;
            glob = false;
        };
        const varAt = (j) => {
            const m = s.substring(j).match(/^\$(\{(\w+)\}|(\w+)|([?$]))/);
            if (!m) return null;
            const k = m[2] || m[3] || m[4];
            return { val: vars[k] != null ? vars[k] : "", len: m[0].length };
        };
        while (i < s.length) {
            const c = s[i];
            if (/\s/.test(c)) { push(); i++; continue; }
            if (c == "'") {
                const j = s.indexOf("'", i + 1), e = j < 0 ? s.length : j;
                cur = (cur || "") + s.substring(i + 1, e);
                i = e + 1;
                continue;
            }
            if (c == '"') {
                let j = i + 1, buf = "";
                while (j < s.length && s[j] != '"') {
                    if (s[j] == "\\" && /["\\$`]/.test(s[j + 1] || "")) { buf += s[j + 1]; j += 2; continue; }
                    const v = s[j] == "$" ? varAt(j) : null;
                    if (v) { buf += v.val; j += v.len; continue; }
                    buf += s[j++];
                }
                cur = (cur || "") + buf;
                i = j + 1;
                continue;
            }
            if (c == "\\" && i + 1 < s.length) { cur = (cur || "") + s[i + 1]; i += 2; continue; }
            if (c == "~" && cur === null && (i + 1 >= s.length || /[\s\/]/.test(s[i + 1]))) { cur = vars.HOME; i++; continue; }
            if (c == "$") {
                const v = varAt(i);
                if (v) { cur = (cur || "") + v.val; i += v.len; continue; }
            }
            if (c == "*" || c == "?") glob = true;
            cur = (cur || "") + c;
            i++;
        }
        push();
        return out.length ? out : [""];
    }

    // /etc/*.conf -> the matching names; no match: the word stays as it is (like bash)
    expandGlob(word) {
        if (typeof Vfs == "undefined") return [word];
        const slash = word.lastIndexOf("/");
        const dir = slash < 0 ? "" : word.substring(0, slash + 1);
        const pat = word.substring(slash + 1);
        if (/[*?]/.test(dir)) return [word];
        const re = new RegExp("^" + pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
        const v = this.vfs();
        const r = v.lookup(v.abs(dir || ".", this.cwd));
        if (r.err || r.node.t != "d") return [word];
        const names = Object.keys(v.children(r.node, r.path)).filter(n => re.test(n) && (pat.startsWith(".") || !n.startsWith("."))).sort();
        return names.length ? names.map(n => dir + n) : [word];
    }

    // split at a character that is not inside quotes
    splitUnquoted(s, ch) {
        const parts = [];
        let q = null, start = 0;
        for (let i = 0; i < s.length; i++) {
            const c = s[i];
            if (c == "\\") { i++; continue; }
            if (q) { if (c == q) q = null; continue; }
            if (c == "'" || c == '"') { q = c; continue; }
            if (c == ch && s[i + 1] != ch && s[i - 1] != ch) { parts.push(s.substring(start, i)); start = i + 1; }
        }
        parts.push(s.substring(start));
        return parts;
    }

    // "cmd > file", "cmd >> file", "cmd 2>/dev/null" -> { cmd, target, append, quiet }
    findRedirect(s) {
        let q = null;
        for (let i = 0; i < s.length; i++) {
            const c = s[i];
            if (c == "\\") { i++; continue; }
            if (q) { if (c == q) q = null; continue; }
            if (c == "'" || c == '"') { q = c; continue; }
            if (c == ">") {
                const append = s[i + 1] == ">";
                const errOnly = s[i - 1] == "2";
                const rest = s.substring(i + (append ? 2 : 1));
                const target = this.tokenize(rest)[0];
                const restAfter = rest.trim().substring((rest.trim().match(/^\S+/) || [""])[0].length);
                const cmd = s.substring(0, errOnly ? i - 1 : i) + restAfter;
                return { cmd, target, append, quiet: errOnly };
            }
        }
        return null;
    }

    // a | b | c  and  > file: the output of the first command is caught and fed on
    pipeline(segs, redir) {
        const t = this.t;
        let buf = "";
        const realPrint = t.print;
        const outer = { realPrint: this.realPrint, piping: this.piping, stderrNull: this.stderrNull };
        this.realPrint = outer.realPrint || realPrint;
        this.stderrNull = outer.stderrNull || !!(redir && redir.quiet && redir.target == "/dev/null");
        t.print = (s) => { buf += s; };
        let show;
        try {
            this.piping = segs.length > 1 || !!(redir && !redir.quiet);
            show = this.parse(segs[0]);
            // ping & co. keep running: their output can't be caught here, it goes to the screen
            for (const seg of (show === false ? [] : segs.slice(1))) {
                const argv = this.tokenize(seg.trim());
                const f = Coreutils.filters[argv[0]];
                if (!f) {
                    this.stderr(argv[0] == "" ? "-bash: syntax error near unexpected token `|'" :
                        `-bash: ${argv[0]}: in this lab only these can read from a pipe: ${Coreutils.FILTERS.join(", ")}`);
                    this.status = 1;
                    buf = "";
                    break;
                }
                buf = f(this, argv.slice(1), buf);
                if (buf && !buf.endsWith("\n")) buf += "\n";
            }
        }
        finally {
            t.print = realPrint;
            this.realPrint = outer.realPrint;
            this.piping = outer.piping;
            this.stderrNull = outer.stderrNull;
        }
        if (show === false) { if (buf) t.print(buf); }
        else if (redir && redir.target && !redir.quiet) {
            if (redir.target != "/dev/null") {
                const v = this.vfs();
                const e = v.write(v.abs(redir.target, this.cwd), buf, redir.append);
                if (e) t.println(`-bash: ${redir.target}: ${e}`);
            }
        } else if (buf) t.print(buf);
        return show;
    }

    // commands that only make sense on a host, not on the admin console
    needHost(name) {
        if (this.host) return false;
        this.t.println(name + ": you are on the admin console — log in to a host first, e.g.  ssh Host1");
        return true;
    }

    parse(cmd) {
        let showPrompt = true;
        if (!/^\s*for\s/.test(cmd)) {
            let segs = this.splitUnquoted(cmd, "|");
            const redir = this.findRedirect(segs[segs.length - 1]);
            if (redir && !redir.target) { this.t.println("-bash: syntax error near unexpected token `newline'"); return true; }
            if (redir) segs[segs.length - 1] = redir.cmd;
            if (segs.length > 1 || redir) return this.pipeline(segs, redir);
        }
        let command = this.tokenize(cmd.trim());
        this.status = 0;
        Debug.log("Shell", "parse", command);
        if (command[0] == "exit") { if (this.host) this.t.quitToConsole(); else this.t.println("logout — (this is the admin console: it stays open)"); }
        else if (command[0] == "start") start();
        else if (command[0] == "stop") stop();
        else if (command[0] == "clear") this.t.textarea.value = "";
        else if (command[0] == "help") this.help();
        else if (command[0] == "for") {
            let variable = command[1];
            if (command[2] != "in") {
                this.t.println("Syntax error near unexpected token " + command[2]);
            }
            else {
                let loop = command[3];
                let loop1 = parseInt(loop.substring(1,loop.indexOf("..")));
                let loop2 = parseInt(loop.substring(loop.indexOf("..")+2,loop.indexOf("}")));
                Debug.log("Shell","loop",loop1 + "-" + loop2);
                let com = cmd.substring(cmd.indexOf(" do ") + 4,
                    cmd.lastIndexOf("; done"));
                for (let i=loop1; i<=loop2; i++) {
                    this.parse(com.split("$"+variable).join(i));
                }
            }
        }
        else if (command[0] == "test") {
            test.test(command[1], command[2]);
        }
        else if (command[0] == "debug") {
            if (!command[1] || command[1] == "show") {
                this.t.println(DEBUG);
            }
            else {
                DEBUG = command[1];
            }
        }
        else if (command[0] == "ssh") {
            if (command.length == 1) {
                this.t.println("usage: ssh destination");
            }
            else {
                let h = command[1].replace(/^root@/, "");
                let o = Id.find(h);
                if (o==null || !(o instanceof Host)) {
                    this.t.println("ssh: Could not resolve hostname "+h+": Name or service not known");
                    this.status = 255;
                }
                else if (command.length == 2) {
                    if (!this.host) this.consoleCwd = this.cwd;
                    this.host = o;
                    this.cwd = "/root";
                    this.oldCwd = null;
                    this.updatePrompt();
                }
                else {
                    // one command on the other machine, then back here
                    const saved = { host: this.host, cwd: this.cwd, oldCwd: this.oldCwd };
                    this.host = o;
                    this.cwd = "/root";
                    showPrompt = this.parse(cmd.trim().replace(/^ssh\s+\S+\s+/, ""));
                    this.host = saved.host;
                    this.cwd = saved.cwd;
                    this.oldCwd = saved.oldCwd;
                }
            }
        }
        else if (command[0] == "systemctl" && /^(dhcpd|named)(\.service)?$/.test(command[2] || "")) {
            if (this.needHost("systemctl")) return true;
            const name = command[2].replace(".service", "");
            const on = name == "dhcpd" ? !!this.host.dhcpd : !!this.host.named;
            if (command[1] == "is-active") this.t.println(on ? "active" : "inactive");
            else if (command[1] == "status") this.t.println("● " + name + ".service - " + (name == "dhcpd" ? "DHCPv4 Server Daemon" : "Berkeley Internet Name Domain (DNS)") + "\n   Active: " + (on ? "active (running)" : "inactive (dead)"));
            else this.t.println("This lab keeps " + name + " " + (on ? "running" : "off") + "; it is set up by the lab, not by systemctl.");
        }
        else if (command[0] == "systemctl") {
            if (this.needHost("systemctl")) return true;
            if (command[2] != "lldpd" && command[2] != "lldpd.service") {
                this.t.println("Unit " + (command[2] || "") + ".service could not be found.");
            }
            else if (command[1] == "start") {
                this.t.println(this.host.l2.lldpStart());
            }
            else if (command[1] == "stop") {
                this.t.println(this.host.l2.lldpStop());
            }
            else if (command[1] == "is-active") {
                let ret = "failed";
                if (this.host.l2.lldp && this.host.l2.lldp.enabled) {
                    ret = "active";
                }
                this.t.println(ret);
            }
            else if (command[1] == "status") {
                const on = this.host.l2.lldp && this.host.l2.lldp.enabled;
                this.t.println("● lldpd.service - LLDP daemon\n   Active: " + (on ? "active (running)" : "inactive (dead)"));
            }
        }
        else if (command[0] == "lldpcli") {
            if (this.needHost("lldpcli")) return true;
            if (!this.host.l2.lldp || !this.host.l2.lldp.enabled) {
                this.t.println("Unable to connect to lldpd");
            }
            else {
                if (command[1] == "update") {
                    this.host.l2.sendLldp();
                }
                if (command[1] == "show" && "chassis".startsWith(command[2])) {
                    this.t.println(this.host.l2.showDetails());
                }
                if (command[1] == "show" && "neighbors".startsWith(command[2])) {
                    this.t.println(this.host.l2.showNeighbors());
                }
            }
        }
        else if (command[0] == "arping") {
            if (this.needHost("arping")) return true;
            const dst = command.slice(1).filter(a => !a.startsWith("-")).pop();
            if (!dst) {
                this.t.println("usage: arping <destination>");
            }
            else if(!IP.isValid(dst)) {
                this.t.println("arping: " + dst + ": Name or service not known");
            }
            else {
                showPrompt = this.host.l3.startArping(this, dst);
            }
        }
        else if (command[0] == "arp") {
            if (this.needHost("arp")) return true;
            let ret = this.host.l3.arp.showCache();
            this.t.println(ret);
        }
        else if (command[0] == "ip") {
            if (this.needHost("ip")) return true;
            this.ipCommand(command);
        }
        else if (command[0] == "traceroute" || command[0] == "tracert") {
            if (this.needHost("traceroute")) return true;
            showPrompt = this.host.l3.icmp.traceroute(this, command);
        }
        else if (command[0] == "lab") {
            this.labCommand(command);
        }
        else if (command[0] == "dhclient") {
            if (this.needHost("dhclient")) return true;
            const dev = command.slice(1).filter(a => !a.startsWith("-")).pop();
            const nic = dev ? this.host.nics.find(n => n.id.toString() == dev) : this.host.nics[0];
            if (!nic) { this.t.println("Cannot find device \"" + dev + "\""); return true; }
            if (command.includes("-r")) {
                if (nic.ip) Sim.event("info", `<b>${this.host}</b> gives back its address ${nic.ip.ip} (DHCP release)`, { proto: "DHCP", obj: this.host });
                nic.setIP(null);
                this.host.dnsServer = null;
                this.host.domain = null;
                this.host.lease = null;
            }
            else showPrompt = this.host.dhcpc.start(this, nic);
        }
        else if (command[0] == "host" || command[0] == "nslookup") {
            if (this.needHost(command[0])) return true;
            const name = command[1];
            if (!name) { this.t.println(command[0] == "host" ? "Usage: host [-v] name [server]" : "Usage: nslookup name"); return true; }
            const h = this.host, t = this.t, ns = command[0] == "nslookup";
            if (!h.dnsServer) { t.println(ns ? ";; connection timed out; no servers could be reached" : ";; connection timed out; no servers could be reached"); return true; }
            const fq = h.resolver.fqdn(name);
            const job = { active: true };
            this.job = job;
            const req = h.resolver.resolve(name, (ip, err) => {
                if (!job.active) return;
                job.active = false;
                if (this.job == job) this.job = null;
                if (ns) {
                    t.println("Server:\t\t" + h.dnsServer + "\nAddress:\t" + h.dnsServer + "#53\n");
                    if (ip) t.println("Name:\t" + fq + "\nAddress: " + ip);
                    else t.println(err && err.indexOf("Temporary") == 0 ? ";; connection timed out; no servers could be reached" : "** server can't find " + fq + ": NXDOMAIN");
                } else {
                    if (ip) t.println(fq + " has address " + ip);
                    else t.println(err && err.indexOf("Temporary") == 0 ? ";; connection timed out; no servers could be reached" : "Host " + fq + " not found: 3(NXDOMAIN)");
                }
                t.showPrompt();
            });
            job.cancel = () => { job.active = false; if (req) req.cancel(); };
            showPrompt = false;
        }
        else if (command[0] == "ping") {
            if (this.needHost("ping")) return true;
            showPrompt = this.host.l3.icmp.ping(this, command);
        }
        else if (Coreutils.has(command[0])) {
            showPrompt = Coreutils.run(this, command);
        }
        else if (command[0] != "") {
            this.stderr(command[0] + ": command not found...");
            this.status = 127;
        }
        return showPrompt;
    }

    ipCommand(command) {
        const sub = command[1] || "";
        const h = this.host;
        if (("addr".startsWith(sub) && sub != "" || sub == "a") && ["add", "del", "flush", "replace", "change"].includes(command[2])) {
            // ip addr add|replace A.B.C.D/N dev X · ip addr del A.B.C.D/N dev X · ip addr flush dev X
            const devI = command.indexOf("dev");
            const dev = devI > 0 ? command[devI + 1] : null;
            const nic = dev ? h.nics.find(n => n.id.toString() == dev) : null;
            if (!nic) { this.t.println(dev ? "Cannot find device \"" + dev + "\"" : "Not enough information: \"dev\" argument is required."); return; }
            if (command[2] == "flush") { nic.setIP(null); return; }
            const [a, c] = (command[3] || "").split("/");
            const cidr = c == null ? 32 : parseInt(c);
            if (!IP.isValid(a || "") || isNaN(cidr) || cidr < 1 || cidr > 32) { this.t.println("Error: any valid prefix is expected rather than \"" + (command[3] || "") + "\"."); return; }
            if (command[2] == "del") {
                if (!nic.ip || nic.ip.ip != a) { this.t.println("Error: ipv4: Address not found."); return; }
                nic.setIP(null);
                Sim.event("info", `<b>${h}</b> ${nic.id} lost its address ${a}`, { proto: "IPv4", obj: h });
                return;
            }
            if (command[2] == "add" && nic.ip) { this.t.println("Error: this lab supports one address per interface — use “ip addr replace”."); return; }
            nic.setIP(new IP(a, cidr));
            Sim.event("info", `<b>${h}</b> ${nic.id} is now ${a}/${cidr} (network ${IP.networkOf(a, cidr)}/${cidr})`, { proto: "IPv4", obj: h });
            return;
        }
        if ("addr".startsWith(sub) && sub != "" || sub == "a") {
            this.t.println("1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN\n    inet 127.0.0.1/8 scope host lo");
            h.nics.forEach((n, i) => {
                this.t.println(`${i + 2}: ${n.id}: <BROADCAST,MULTICAST,${n.linkUp() ? "UP,LOWER_UP" : "NO-CARRIER"}> mtu 1500 state ${n.linkUp() ? "UP" : "DOWN"}\n` +
                    `    link/ether ${n.mac} brd ff:ff:ff:ff:ff:ff` +
                    (n.ip ? `\n    inet ${n.ip.toString()} brd ${IP.broadcastOf(n.ip.ip, n.ip.cidr)} scope global ${n.id}` : ""));
            });
        }
        else if ("route".startsWith(sub) && sub != "" || sub == "r") {
            if (command[2] == "add") {
                // ip route add <net>/<cidr>|default via <gw>
                const dest = command[3], via = command[command.indexOf("via") + 1];
                if (!dest || command.indexOf("via") < 0 || !via) {
                    this.t.println("Usage: ip route add { default | NETWORK/PREFIX } via GATEWAY");
                    return;
                }
                let net = "0.0.0.0", cidr = 0;
                if (dest != "default") {
                    [net, cidr] = dest.split("/");
                    cidr = cidr == null ? 32 : parseInt(cidr);
                    if (!IP.isValid(net) || isNaN(cidr) || cidr < 0 || cidr > 32) {
                        this.t.println("Error: any valid prefix is expected rather than \"" + dest + "\".");
                        return;
                    }
                }
                const err = h.l3.routing.addStatic(net, cidr, via);
                if (err) this.t.println(err);
                else Sim.event("info", `<b>${h}</b> new route: ${dest} via ${via}`, { proto: "IPv4", obj: h });
            }
            else this.t.println(h.l3.routing.lines().join("\n"));
        }
        else if ("neighbour".startsWith(sub) && sub != "" || "neighbor".startsWith(sub) && sub != "") {
            this.t.println(h.l3.arp.neighLines().join("\n"));
        }
        else if ("link".startsWith(sub) && sub != "") {
            h.nics.forEach((n, i) => this.t.println(`${i + 1}: ${n.id}: <BROADCAST,MULTICAST,UP> mtu 1500 state ${n.linkUp() ? "UP" : "DOWN"}\n    link/ether ${n.mac} brd ff:ff:ff:ff:ff:ff`));
        }
        else {
            this.t.println("Usage: ip [ addr | route | neigh | link ]");
        }
    }

    labCommand(command) {
        if (!command[1]) {
            this.t.println(Topology.all().map((tp, i) => `${String(i + 1).padStart(2)}  ${tp.id.padEnd(14)} ${tp.title}`).join("\n"));
            this.t.println("usage: lab <name or number>");
            return;
        }
        const n = parseInt(command[1]);
        const tp = Topology.all().find(tp => tp.id == command[1]) || (n ? Topology.all()[n - 1] : null);
        if (!tp) this.t.println("lab: no such lab: " + command[1]);
        else Topology.load(tp.id, { fromShell: true });
    }

    help() {
        this.t.println([
            "Commands in this lab:",
            "  ssh HostN [command]          log in to a host (or run one command there)",
            "  exit                         back to the admin console",
            "  ip addr | ip route | ip neigh   interfaces, routing table, ARP cache",
            "  arp -a                       ARP cache, old style",
            "  arping 192.168.1.2           ask who has this IP (ARP request)",
            "  ping [-c N] [-t TTL] 192.168.1.2   ICMP echo; Ctrl-C stops it",
            "  traceroute 192.168.2.10      list the routers on the way",
            "  dhclient                     get an address from a DHCP server",
            "  host host1.lab · nslookup host1.lab   ask DNS for a name",
            "  ip addr replace 192.168.1.5/24 dev NIC1   set an address",
            "  cat /etc/resolv.conf         which DNS server is used",
            "  ls -la · cd /etc · pwd · cat · tree -L 2   look around the files",
            "  whoami · id · hostname -I · uname -a · date · uptime",
            "  ps aux · ss -tulpn · ifconfig · free -h · df -h · history",
            "  grep, head, tail, wc, sort, uniq   also after a |  (ip route | grep default)",
            "  echo hello > /tmp/a.txt · touch · mkdir · rm    in your home folder and /tmp",
            "  ip route add default via 192.168.1.1",
            "  lab [name|number]            list or load an example network",
            "  systemctl start|stop|status lldpd",
            "  lldpcli update | show neighbors | show chassis",
            "  for i in {1..12}; do ssh Host$i <cmd>; done",
            "  clear (or Ctrl-L), test",
        ].join("\n"));
    }
}
