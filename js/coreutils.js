// The everyday Linux commands: ls, cd, pwd, cat, whoami, id, date, ps, ss ...
// They work on the file system in fs.js and show the live state of the lab.
const Coreutils = {
    BIN: ["bash", "cat", "date", "df", "echo", "env", "false", "file", "free", "grep", "head", "host", "hostname", "id",
        "less", "ls", "lldpcli", "man", "mkdir", "more", "netstat", "nslookup", "ping", "printenv", "ps", "pwd", "rm", "rmdir", "sort",
        "ss", "ssh", "su", "sudo", "systemctl", "tail", "touch", "traceroute", "tree", "true", "uname", "uniq", "uptime",
        "w", "wc", "which", "who", "whoami", "groups", "hostnamectl"],
    SBIN: ["arp", "arping", "dhclient", "dhcpd", "ifconfig", "ip", "lldpd", "named", "sshd", "reboot", "shutdown", "poweroff", "halt", "init"],

    // commands that read text and may sit behind a |
    FILTERS: ["grep", "head", "tail", "wc", "sort", "uniq", "cat", "less", "more", "tee"],

    has(name) { return !!this.cmds[name]; },

    run(sh, argv) {
        const f = this.cmds[argv[0]];
        if (!f) return null;
        const r = f.call(this, sh, argv.slice(1), argv[0]);
        return r === false ? false : true;
    },

    // split "-la" "-n" "5" "file" into flags and the rest; valued: letters that take a value
    opts(args, valued = "") {
        const o = { f: new Set(), v: {}, rest: [], long: new Set() };
        for (let i = 0; i < args.length; i++) {
            const a = args[i];
            if (a == "--") { o.rest.push(...args.slice(i + 1)); break; }
            if (a.startsWith("--")) { o.long.add(a.substring(2)); continue; }
            if (a.startsWith("-") && a.length > 1 && !/^-\d+$/.test(a)) {
                for (let j = 1; j < a.length; j++) {
                    const c = a[j];
                    if (valued.includes(c)) {
                        o.v[c] = a.substring(j + 1) || args[++i];
                        break;
                    }
                    o.f.add(c);
                }
            }
            else if (/^-\d+$/.test(a)) o.v.n = a.substring(1);
            else o.rest.push(a);
        }
        return o;
    },

    out(sh, s) { sh.t.println(s); },
    err(sh, s) { sh.stderr(s); sh.status = 1; },

    human(n) {
        if (n < 1024) return String(n);
        const u = ["K", "M", "G", "T"];
        let i = -1;
        do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
        return (n < 10 ? n.toFixed(1) : Math.round(n)) + u[i];
    },

    // lines in columns, top to bottom then left to right, like ls on a terminal
    columns(names, width = 78) {
        if (!names.length) return "";
        const w = Math.max(...names.map(n => n.length)) + 2;
        const cols = Math.max(1, Math.floor((width + 2) / w));
        const rows = Math.ceil(names.length / cols);
        const out = [];
        for (let r = 0; r < rows; r++) {
            let line = "";
            for (let c = 0; c < cols; c++) {
                const n = names[c * rows + r];
                if (n == null) continue;
                line += (c * rows + r + rows < names.length) ? n.padEnd(w) : n;
            }
            out.push(line.replace(/\s+$/, ""));
        }
        return out.join("\n");
    },

    // read files given on the command line, or the piped input
    inputOf(sh, files, input, cmd) {
        if (!files.length) return input == null ? "" : input;
        const v = sh.vfs();
        let s = "";
        for (const f of files) {
            const r = v.lookup(v.abs(f, sh.cwd));
            if (r.err) { this.err(sh, `${cmd}: ${f}: ${r.err}`); continue; }
            if (r.node.t == "d") { this.err(sh, `${cmd}: ${f}: Is a directory`); continue; }
            const d = v.read(r.node);
            if (d == null) { this.err(sh, `${cmd}: ${f}: Permission denied`); continue; }
            s += d.endsWith("\n") || d == "" ? d : d + "\n";
        }
        return s;
    },

    lines(s) {
        const l = s.split("\n");
        if (l.length && l[l.length - 1] == "") l.pop();
        return l;
    },

    // ---- text filters: (sh, args, input) -> output text
    filters: {
        cat(sh, a, input) {
            const o = Coreutils.opts(a);
            let s = Coreutils.inputOf(sh, o.rest, input, "cat");
            if (o.f.has("n")) s = Coreutils.lines(s).map((l, i) => String(i + 1).padStart(6) + "\t" + l).join("\n");
            return s;
        },
        less(sh, a, input) { return Coreutils.inputOf(sh, a.filter(x => !x.startsWith("-")), input, "less"); },
        more(sh, a, input) { return Coreutils.inputOf(sh, a.filter(x => !x.startsWith("-")), input, "more"); },
        head(sh, a, input) {
            const o = Coreutils.opts(a, "n");
            const n = parseInt(o.v.n || 10);
            return Coreutils.lines(Coreutils.inputOf(sh, o.rest, input, "head")).slice(0, n).join("\n");
        },
        tail(sh, a, input) {
            const o = Coreutils.opts(a, "n");
            const n = parseInt(o.v.n || 10);
            const l = Coreutils.lines(Coreutils.inputOf(sh, o.rest, input, "tail"));
            return l.slice(Math.max(0, l.length - n)).join("\n");
        },
        wc(sh, a, input) {
            const o = Coreutils.opts(a);
            const s = Coreutils.inputOf(sh, o.rest, input, "wc");
            const l = (s.match(/\n/g) || []).length, w = s.split(/\s+/).filter(x => x).length, c = new TextEncoder().encode(s).length;
            const parts = [];
            const any = o.f.has("l") || o.f.has("w") || o.f.has("c");
            if (!any || o.f.has("l")) parts.push(l);
            if (!any || o.f.has("w")) parts.push(w);
            if (!any || o.f.has("c")) parts.push(c);
            if (parts.length == 1) return parts[0] + (o.rest.length == 1 ? " " + o.rest[0] : "");
            return o.rest.length == 1 ? parts.join(" ") + " " + o.rest[0] : parts.map(x => String(x).padStart(7)).join(" ");
        },
        grep(sh, a, input) {
            const o = Coreutils.opts(a);
            const pat = o.rest.shift();
            if (pat == null) { Coreutils.err(sh, "Usage: grep [OPTION]... PATTERNS [FILE]..."); return ""; }
            let re;
            try { re = new RegExp(pat, o.f.has("i") ? "i" : ""); } catch (e) { re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), o.f.has("i") ? "i" : ""); }
            const l = Coreutils.lines(Coreutils.inputOf(sh, o.rest, input, "grep"));
            const hits = [];
            l.forEach((x, i) => { if (re.test(x) != o.f.has("v")) hits.push(o.f.has("n") ? (i + 1) + ":" + x : x); });
            if (!hits.length) sh.status = 1;
            return o.f.has("c") ? String(hits.length) : hits.join("\n");
        },
        sort(sh, a, input) {
            const o = Coreutils.opts(a);
            let l = Coreutils.lines(Coreutils.inputOf(sh, o.rest, input, "sort"));
            l = o.f.has("n") ? l.sort((x, y) => parseFloat(x) - parseFloat(y)) : l.sort((x, y) => x.localeCompare(y));
            if (o.f.has("r")) l.reverse();
            if (o.f.has("u")) l = l.filter((x, i) => x != l[i - 1]);
            return l.join("\n");
        },
        uniq(sh, a, input) {
            const o = Coreutils.opts(a);
            const l = Coreutils.lines(Coreutils.inputOf(sh, o.rest, input, "uniq"));
            const out = [];
            l.forEach(x => {
                const last = out[out.length - 1];
                if (last && last.s == x) last.n++;
                else out.push({ s: x, n: 1 });
            });
            return out.map(x => o.f.has("c") ? String(x.n).padStart(7) + " " + x.s : x.s).join("\n");
        },
        tee(sh, a, input) {
            const o = Coreutils.opts(a);
            const v = sh.vfs();
            o.rest.forEach(f => {
                const e = v.write(v.abs(f, sh.cwd), input || "", o.f.has("a"));
                if (e) Coreutils.err(sh, `tee: ${f}: ${e}`);
            });
            return input || "";
        },
    },

    // the date like `date` prints it, or with a +FORMAT
    fmtDate(d, fmt, utc) {
        const g = (k) => utc ? d["getUTC" + k]() : d["get" + k]();
        const p = (n, w = 2) => String(n).padStart(w, "0");
        const off = utc ? 0 : -d.getTimezoneOffset();
        const tzName = () => {
            if (utc) return "UTC";
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
            if (/^Europe\/(Budapest|Vienna|Berlin|Prague|Bratislava|Warsaw|Paris|Rome|Madrid|Amsterdam|Brussels|Zagreb|Ljubljana|Belgrade|Stockholm|Oslo|Copenhagen|Zurich)$/.test(tz))
                return off == 120 ? "CEST" : "CET";
            if (tz == "Europe/London") return off == 60 ? "BST" : "GMT";
            const m = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(d).find(x => x.type == "timeZoneName");
            return m ? m.value : "UTC";
        };
        const start = utc ? Date.UTC(d.getUTCFullYear(), 0, 1) : new Date(d.getFullYear(), 0, 1).getTime();
        const map = {
            Y: () => g("FullYear"), m: () => p(g("Month") + 1), d: () => p(g("Date")), e: () => String(g("Date")).padStart(2),
            H: () => p(g("Hours")), M: () => p(g("Minutes")), S: () => p(g("Seconds")), s: () => Math.floor(d.getTime() / 1000),
            F: () => `${g("FullYear")}-${p(g("Month") + 1)}-${p(g("Date"))}`, T: () => `${p(g("Hours"))}:${p(g("Minutes"))}:${p(g("Seconds"))}`,
            R: () => `${p(g("Hours"))}:${p(g("Minutes"))}`,
            a: () => Vfs.DAY[g("Day")], A: () => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][g("Day")],
            b: () => Vfs.MON[g("Month")], h: () => Vfs.MON[g("Month")],
            B: () => ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][g("Month")],
            Z: tzName, z: () => (off < 0 ? "-" : "+") + p(Math.floor(Math.abs(off) / 60)) + p(Math.abs(off) % 60),
            j: () => p(Math.floor((d.getTime() - start) / 864e5) + 1, 3), u: () => g("Day") || 7, n: () => "\n", t: () => "\t", "%": () => "%",
        };
        if (!fmt) fmt = "%a %b %e %H:%M:%S %Z %Y";
        return fmt.replace(/%(.)/g, (m, c) => map[c] ? map[c]() : m);
    },

    uptimeText(sh) {
        const boot = Vfs.bootOf(sh.host);
        const min = Math.floor((Date.now() - boot.getTime()) / 60000);
        const up = min < 60 ? `${min} min` : `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
        return ` ${this.fmtDate(new Date(), "%T")} up ${up},  1 user,  load average: 0.00, 0.01, 0.00`;
    },

    // the running programs of a machine
    procs(sh) {
        const h = sh.host;
        const p = [
            { pid: 1, user: "root", tty: "?", cmd: "/usr/lib/systemd/systemd --switched-root --system", rss: 14320 },
            { pid: 2, user: "root", tty: "?", cmd: "[kthreadd]", rss: 0, kernel: true },
            { pid: 512, user: "root", tty: "?", cmd: "/usr/lib/systemd/systemd-journald", rss: 9100 },
        ];
        if (h) {
            p.push({ pid: 702, user: "root", tty: "?", cmd: "sshd: /usr/sbin/sshd -D [listener]", rss: 7800 });
            if (h.l2.lldp && h.l2.lldp.enabled) p.push({ pid: 745, user: "root", tty: "?", cmd: "lldpd: monitor.", rss: 3100 });
            if (h.dhcpd) p.push({ pid: 812, user: "dhcpd", tty: "?", cmd: "/usr/sbin/dhcpd -f -cf /etc/dhcp/dhcpd.conf", rss: 11200 });
            if (h.named) p.push({ pid: 830, user: "named", tty: "?", cmd: "/usr/sbin/named -u named -c /etc/named.conf", rss: 48000 });
            if (h.dhcpPending) p.push({ pid: 960, user: "root", tty: "?", cmd: "/usr/sbin/dhclient " + h.nics[0].id, rss: 5200 });
            p.push({ pid: 1201, user: "root", tty: "pts/0", cmd: "-bash", rss: 5400 });
        } else {
            p.push({ pid: 1100, user: "admin", tty: "tty1", cmd: "-bash", rss: 5400 });
        }
        return p;
    },

    // UDP/TCP "sockets": which program waits on which port
    sockets(sh) {
        const h = sh.host;
        if (!h) return [];
        const s = [{ proto: "tcp", state: "LISTEN", local: "0.0.0.0:22", prog: "sshd", pid: 702 }];
        const known = { 67: ["dhcpd", 812], 68: ["dhclient", 960], 53: ["named", 830] };
        Object.keys(h.udp.sockets).map(Number).sort((a, b) => a - b).forEach(port => {
            const k = known[port] || ["resolver", 1201];
            const nic = h.nics.find(n => n.ip);
            const addr = port == 53 && nic ? nic.ip.ip : "0.0.0.0";
            s.push({ proto: "udp", state: "UNCONN", local: addr + ":" + port, prog: k[0], pid: k[1] });
        });
        return s;
    },

    // ---- the commands
    cmds: {
        pwd(sh) { Coreutils.out(sh, sh.cwd); },

        cd(sh, a) {
            const v = sh.vfs();
            let to = a[0];
            if (to == null || to == "~") to = v.home();
            if (to == "-") { to = sh.oldCwd || sh.cwd; Coreutils.out(sh, to); }
            const r = v.lookup(v.abs(to, sh.cwd));
            if (r.err) return Coreutils.err(sh, `-bash: cd: ${a[0]}: ${r.err}`);
            if (r.node.t != "d") return Coreutils.err(sh, `-bash: cd: ${a[0]}: Not a directory`);
            if (r.node.priv && !sh.host) return Coreutils.err(sh, `-bash: cd: ${a[0]}: Permission denied`);
            sh.oldCwd = sh.cwd;
            sh.cwd = v.abs(to, sh.cwd);
            sh.updatePrompt();
        },

        ls(sh, a) {
            const o = Coreutils.opts(a);
            const v = sh.vfs();
            const long = o.f.has("l") || o.f.has("n") || o.f.has("g") || o.f.has("o");
            const all = o.f.has("a"), almost = o.f.has("A");
            const paths = o.rest.length ? o.rest : ["."];
            const owner = (n, path) => n.owner || (sh.host ? "root" : (path.startsWith("/home/admin") ? "admin" : "root"));
            const entry = (name, node, path) => ({ name, node, path });
            const files = [], dirs = [];
            for (const p of paths) {
                const full = v.abs(p, sh.cwd);
                const lr = v.lookup(full, false);
                if (lr.err) { Coreutils.err(sh, `ls: cannot access '${p}': ${lr.err}`); continue; }
                let node = lr.node;
                if (node.t == "l" && !(long && !p.endsWith("/"))) {
                    const r = v.lookup(full);
                    if (!r.err) node = r.node;
                }
                if (node.t == "d" && !o.f.has("d")) dirs.push({ p, full: lr.node.t == "l" ? v.lookup(full).path : full, node });
                else files.push(entry(p, node, full));
            }
            const sortList = (l) => {
                const key = s => s.name.replace(/^\.+/, "").toLowerCase();
                l.sort((x, y) => key(x).localeCompare(key(y)) || x.name.localeCompare(y.name));
                if (o.f.has("t")) l.sort((x, y) => v.mtime(y.node) - v.mtime(x.node));
                if (o.f.has("S")) l.sort((x, y) => v.size(y.node) - v.size(x.node));
                if (o.f.has("r")) l.reverse();
                return l;
            };
            const suffix = (e) => !o.f.has("F") ? "" : e.node.t == "d" ? "/" : e.node.t == "l" ? "@" : /x/.test(e.node.mode) ? "*" : "";
            const render = (list, withTotal) => {
                if (!long) {
                    const names = list.map(e => e.name + suffix(e));
                    return o.f.has("1") || sh.piping ? names.join("\n") : Coreutils.columns(names);
                }
                const rows = list.map(e => {
                    const n = e.node;
                    let links = 1;
                    if (n.t == "d") {
                        try { links = 2 + Object.values(v.children(n, e.path)).filter(c => c.t == "d").length; } catch (x) { links = 2; }
                    }
                    const sz = n.t == "c" ? n.dev : o.f.has("h") ? Coreutils.human(v.size(n)) : String(v.size(n));
                    const own = o.f.has("n") ? (owner(n, e.path) == "admin" ? "1000" : "0") : owner(n, e.path);
                    return {
                        mode: n.mode + ".", links: String(links), own, grp: own, sz,
                        date: Vfs.lsDate(v.mtime(n)),
                        name: e.name + (n.t == "l" ? " -> " + n.to : suffix(e)),
                    };
                });
                const w = k => Math.max(0, ...rows.map(r => r[k].length));
                const lines = rows.map(r => [r.mode, r.links.padStart(w("links")), ...(o.f.has("g") ? [] : [r.own.padEnd(w("own"))]),
                    ...(o.f.has("o") ? [] : [r.grp.padEnd(w("grp"))]), r.sz.padStart(w("sz")), r.date, r.name].join(" "));
                if (withTotal) {
                    const blocks = list.reduce((s, e) => s + (e.node.t == "d" ? (e.node.proc ? 0 : 4) : e.node.t == "f" ? Math.ceil(v.size(e.node) / 4096) * 4 : 0), 0);
                    lines.unshift("total " + (o.f.has("h") ? Coreutils.human(blocks * 1024) : blocks));
                }
                return lines.join("\n");
            };
            const parts = [];
            if (files.length) parts.push(render(sortList(files), false));
            dirs.sort((x, y) => x.p.localeCompare(y.p));
            for (const d of dirs) {
                if (d.node.priv && !sh.host) { Coreutils.err(sh, `ls: cannot open directory '${d.p}': Permission denied`); continue; }
                const ch = v.children(d.node, d.full);
                let list = Object.entries(ch).filter(([n]) => all || almost || !n.startsWith(".")).map(([n, node]) => entry(n, node, (d.full == "/" ? "" : d.full) + "/" + n));
                list = sortList(list);
                if (all) {
                    const up = v.lookup(Vfs.parent(d.full));
                    list.unshift(entry(".", d.node, d.full), entry("..", up.node || d.node, Vfs.parent(d.full)));
                }
                const body = render(list, true);
                parts.push((paths.length > 1 ? d.p + ":\n" : "") + body);
            }
            const s = parts.filter(x => x !== "").join("\n\n");
            if (s) Coreutils.out(sh, s);
        },
        ll(sh, a) { return Coreutils.cmds.ls(sh, ["-l", ...a]); },
        la(sh, a) { return Coreutils.cmds.ls(sh, ["-la", ...a]); },

        tree(sh, a) {
            const o = Coreutils.opts(a, "L");
            const v = sh.vfs();
            const max = o.v.L ? parseInt(o.v.L) : 4;
            const start = o.rest[0] || ".";
            const r = v.lookup(v.abs(start, sh.cwd));
            if (r.err) return Coreutils.err(sh, `${start} [error opening dir]`);
            const out = [start];
            let nd = 0, nf = 0;
            const walk = (node, path, prefix, depth) => {
                if (depth > max || out.length > 400) return;
                if (node.priv && !sh.host) return;
                const ch = Object.entries(v.children(node, path)).filter(([n, c]) => (o.f.has("a") || !n.startsWith(".")) && (!o.f.has("d") || c.t == "d"))
                    .sort((x, y) => x[0].replace(/^\./, "").toLowerCase().localeCompare(y[0].replace(/^\./, "").toLowerCase()));
                ch.forEach(([n, c], i) => {
                    const last = i == ch.length - 1;
                    out.push(prefix + (last ? "└── " : "├── ") + n + (c.t == "l" ? " -> " + c.to : ""));
                    if (c.t == "d") { nd++; walk(c, (path == "/" ? "" : path) + "/" + n, prefix + (last ? "    " : "│   "), depth + 1); }
                    else nf++;
                });
            };
            if (r.node.t == "d") walk(r.node, r.path, "", 1);
            if (out.length > 400) out.push("… (cut, try tree -L 2)");
            out.push("", `${nd} director${nd == 1 ? "y" : "ies"}` + (o.f.has("d") ? "" : `, ${nf} file${nf == 1 ? "" : "s"}`));
            Coreutils.out(sh, out.join("\n"));
        },

        file(sh, a) {
            const v = sh.vfs();
            a.filter(x => !x.startsWith("-")).forEach(f => {
                const r = v.lookup(v.abs(f, sh.cwd), false);
                if (r.err) return Coreutils.out(sh, `${f}: cannot open \`${f}' (${r.err})`);
                const n = r.node;
                const what = n.t == "d" ? "directory" : n.t == "l" ? "symbolic link to " + n.to : n.t == "c" ? (n.mode[0] == "b" ? "block special" : "character special") + " (" + n.dev.replace(", ", "/") + ")"
                    : /x/.test(n.mode) ? "ELF 64-bit LSB executable, x86-64, dynamically linked" : v.size(n) == 0 ? "empty" : "ASCII text";
                Coreutils.out(sh, `${f}: ${what}`);
            });
        },

        touch(sh, a) {
            const v = sh.vfs();
            a.filter(x => !x.startsWith("-")).forEach(f => {
                const p = v.abs(f, sh.cwd);
                const r = v.lookup(p);
                if (!r.err) { if (v.overlay()[p]) v.overlay()[p].mtime = new Date(); return; }
                const e = v.write(p, "", true);
                if (e) Coreutils.err(sh, `touch: cannot touch '${f}': ${e}`);
            });
        },

        mkdir(sh, a) {
            const o = Coreutils.opts(a);
            const v = sh.vfs();
            o.rest.forEach(f => {
                const p = v.abs(f, sh.cwd);
                const todo = o.f.has("p") ? p.split("/").filter(x => x).map((_, i, arr) => "/" + arr.slice(0, i + 1).join("/")) : [p];
                for (const q of todo) {
                    const r = v.lookup(q);
                    if (!r.err) {
                        if (!o.f.has("p")) Coreutils.err(sh, `mkdir: cannot create directory '${f}': File exists`);
                        continue;
                    }
                    const up = v.lookup(Vfs.parent(q));
                    if (up.err) return Coreutils.err(sh, `mkdir: cannot create directory '${f}': No such file or directory`);
                    if (!v.writable(q)) return Coreutils.err(sh, `mkdir: cannot create directory '${f}': ${sh.host ? "Read-only file system" : "Permission denied"}`);
                    v.overlay()[q] = Vfs.D({}, { mtime: new Date(), owner: v.user() });
                }
            });
        },

        rm(sh, a) {
            const o = Coreutils.opts(a);
            const v = sh.vfs();
            const ov = v.overlay();
            o.rest.forEach(f => {
                const p = v.abs(f, sh.cwd);
                const r = v.lookup(p, false);
                if (r.err) { if (!o.f.has("f")) Coreutils.err(sh, `rm: cannot remove '${f}': ${r.err}`); return; }
                if (r.node.t == "d" && !o.f.has("r") && !o.f.has("R")) return Coreutils.err(sh, `rm: cannot remove '${f}': Is a directory`);
                if (!ov[p]) return Coreutils.err(sh, `rm: cannot remove '${f}': ${sh.host ? "Read-only file system — only files you made can be removed here" : "Permission denied"}`);
                Object.keys(ov).forEach(k => { if (k == p || k.startsWith(p + "/")) delete ov[k]; });
            });
        },

        rmdir(sh, a) {
            const v = sh.vfs();
            const ov = v.overlay();
            a.forEach(f => {
                const p = v.abs(f, sh.cwd);
                const r = v.lookup(p, false);
                if (r.err) return Coreutils.err(sh, `rmdir: failed to remove '${f}': ${r.err}`);
                if (r.node.t != "d") return Coreutils.err(sh, `rmdir: failed to remove '${f}': Not a directory`);
                if (Object.keys(v.children(r.node, p)).length) return Coreutils.err(sh, `rmdir: failed to remove '${f}': Directory not empty`);
                if (!ov[p]) return Coreutils.err(sh, `rmdir: failed to remove '${f}': ${sh.host ? "Read-only file system" : "Permission denied"}`);
                delete ov[p];
            });
        },

        echo(sh, a) {
            let n = false, e = false;
            while (a.length && /^-[ne]+$/.test(a[0])) { n = n || a[0].includes("n"); e = e || a[0].includes("e"); a = a.slice(1); }
            let s = a.join(" ");
            if (e) s = s.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
            if (n) sh.t.print(s); else Coreutils.out(sh, s);
        },

        whoami(sh) { Coreutils.out(sh, sh.vfs().user()); },
        id(sh, a) {
            const u = a.find(x => !x.startsWith("-")) || sh.vfs().user();
            if (u == "root") Coreutils.out(sh, "uid=0(root) gid=0(root) groups=0(root) context=unconfined_u:unconfined_r:unconfined_t:s0");
            else if (u == "admin" && !sh.host) Coreutils.out(sh, "uid=1000(admin) gid=1000(admin) groups=1000(admin),10(wheel)");
            else Coreutils.err(sh, `id: '${u}': no such user`);
        },
        groups(sh) { Coreutils.out(sh, sh.host ? "root" : "admin wheel"); },

        hostname(sh, a) {
            const o = Coreutils.opts(a);
            const h = sh.host;
            const name = h ? h.id.toString() : "console";
            if (o.f.has("I")) Coreutils.out(sh, h ? h.nics.filter(n => n.ip).map(n => n.ip.ip).join(" ") + " " : "");
            else if (o.f.has("i")) Coreutils.out(sh, h && h.nics.find(n => n.ip) ? h.nics.find(n => n.ip).ip.ip : "127.0.0.1");
            else if (o.f.has("f")) Coreutils.out(sh, h && h.domain ? name.toLowerCase() + "." + h.domain : name);
            else if (o.f.has("d")) Coreutils.out(sh, h && h.domain ? h.domain : "");
            else if (o.rest.length) {
                if (!h) return Coreutils.err(sh, "hostname: you must be root to change the host name");
                const e = h.rename(o.rest[0], false);
                if (e) Coreutils.err(sh, e);
            }
            else Coreutils.out(sh, name);
        },

        hostnamectl(sh, a) {
            const h = sh.host;
            const o = Coreutils.opts(a);
            const sub = o.rest[0] || "status";
            if (sub == "set-hostname" || sub == "hostname") {
                if (!o.rest[1]) return Coreutils.err(sh, sub == "hostname" ? (h ? h.id.toString() : "console") : "Too few arguments.");
                if (!h) return Coreutils.err(sh, "Could not set static hostname: Access denied\n(Only root can do this: log in to a lab machine with  ssh Host1)");
                const e = h.rename(o.rest[1], !o.long.has("transient"));
                if (e) Coreutils.err(sh, e.replace(/^hostname:/, "hostnamectl:"));
                return;
            }
            if (sub != "status") return Coreutils.err(sh, `Unknown command verb '${sub}'.`);
            const name = h ? h.id.toString() : "console";
            const stat = h ? (h.persistName || h.id.defaultName()) : "console";
            const kind = !h ? ["computer-desktop", "desktop 🖥️"] : h.forwarding ? ["network-wired", "router 📶"] : h.dhcpd || h.named ? ["computer-server", "server 🖳"] : ["computer-desktop", "desktop 🖥️"];
            Coreutils.out(sh, ` Static hostname: ${stat}\n` + (stat != name ? `Transient hostname: ${name}\n` : "") +
                `       Icon name: ${kind[0]}\n         Chassis: ${kind[1]}\n      Machine ID: ${sh.vfs().read(sh.vfs().lookup("/etc/machine-id").node)}\n` +
                `Operating System: ${Vfs.OS} ${Vfs.VER} (Blue Wire)\n          Kernel: Linux ${Vfs.KERNEL}\n    Architecture: x86-64`);
        },

        reboot(sh) {
            if (sh.host) { sh.host.reboot(); return; }
            return sh.rebootConsole();
        },
        shutdown(sh, a) {
            if (a.includes("-r")) return Coreutils.cmds.reboot(sh);
            Coreutils.err(sh, "In this lab the machines can't be switched off, only restarted: try  reboot  (or  shutdown -r now)");
        },
        poweroff(sh) { return Coreutils.cmds.shutdown(sh, []); },
        halt(sh) { return Coreutils.cmds.shutdown(sh, []); },
        init(sh, a) {
            if (a[0] == "6") return Coreutils.cmds.reboot(sh);
            if (a[0] == "0") return Coreutils.cmds.shutdown(sh, []);
            Coreutils.err(sh, "init: use  init 6  to restart");
        },

        uname(sh, a) {
            const o = Coreutils.opts(a);
            const name = sh.host ? sh.host.id.toString() : "console";
            const f = {
                s: "Linux", n: name, r: Vfs.KERNEL, v: "#1 SMP PREEMPT_DYNAMIC", m: "x86_64", p: "x86_64", i: "x86_64", o: "GNU/Linux",
            };
            let keys = o.f.has("a") ? ["s", "n", "r", "v", "m", "p", "i", "o"] : ["s", "n", "r", "v", "m", "p", "i", "o"].filter(k => o.f.has(k));
            if (!keys.length) keys = ["s"];
            Coreutils.out(sh, keys.map(k => f[k]).join(" "));
        },

        date(sh, a) {
            const o = Coreutils.opts(a);
            const fmt = o.rest.find(x => x.startsWith("+"));
            Coreutils.out(sh, Coreutils.fmtDate(new Date(), fmt ? fmt.substring(1) : null, o.f.has("u") || o.long.has("utc")));
        },

        uptime(sh, a) {
            if (a.includes("-p")) {
                const min = Math.floor((Date.now() - (Vfs.bootOf(sh.host)).getTime()) / 60000);
                return Coreutils.out(sh, "up " + (min >= 60 ? Math.floor(min / 60) + " hour" + (min >= 120 ? "s" : "") + ", " : "") + (min % 60) + " minute" + (min % 60 == 1 ? "" : "s"));
            }
            if (a.includes("-s")) return Coreutils.out(sh, Coreutils.fmtDate(Vfs.bootOf(sh.host), "%F %T"));
            Coreutils.out(sh, Coreutils.uptimeText(sh));
        },

        who(sh) {
            const login = Coreutils.fmtDate(Vfs.bootOf(sh.host), "%F %R");
            Coreutils.out(sh, sh.host ? `root     pts/0        ${login} (console)` : `admin    tty1         ${login}`);
        },
        w(sh) {
            const login = Coreutils.fmtDate(Vfs.bootOf(sh.host), "%R");
            Coreutils.out(sh, Coreutils.uptimeText(sh) + "\nUSER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT\n" +
                (sh.host ? `root     pts/0    console          ${login}    0.00s  0.02s  0.00s w` : `admin    tty1     -                ${login}    0.00s  0.03s  0.00s w`));
        },

        env(sh, a, name) {
            const vars = sh.vars();
            if (name == "printenv" && a.length) return a.forEach(k => vars[k] != null ? Coreutils.out(sh, vars[k]) : (sh.status = 1));
            Coreutils.out(sh, Object.entries(vars).filter(([k]) => /^[A-Z]/.test(k)).map(([k, x]) => k + "=" + x).join("\n"));
        },
        printenv(sh, a) { return Coreutils.cmds.env(sh, a, "printenv"); },

        history(sh, a) {
            const h = sh.t.history;
            const n = parseInt(a[0]) || h.length;
            Coreutils.out(sh, h.slice(-n).map((c, i) => String(h.length - Math.min(n, h.length) + i + 1).padStart(5) + "  " + c).join("\n"));
        },

        which(sh, a) {
            a.filter(x => !x.startsWith("-")).forEach(c => {
                if (c == "ll" || c == "la") return Coreutils.out(sh, `alias ${c}='ls -${c == "ll" ? "l" : "la"}'\n\t/usr/bin/ls`);
                if (Coreutils.BIN.includes(c)) Coreutils.out(sh, "/usr/bin/" + c);
                else if (Coreutils.SBIN.includes(c)) Coreutils.out(sh, "/usr/sbin/" + c);
                else Coreutils.err(sh, `/usr/bin/which: no ${c} in (${sh.vars().PATH})`);
            });
        },

        man(sh, a) {
            if (!a.length) return Coreutils.err(sh, "What manual page do you want?\nFor example, try 'man man'.");
            Coreutils.err(sh, `No manual entry for ${a[a.length - 1]}\n(This lab has no manual pages: type  help  for the commands, or open the 📖 Lexicon.)`);
        },

        ps(sh, a) {
            const o = Coreutils.opts(a);
            const raw = a.join(" ");
            const all = /a|e|x/.test(raw.replace(/^-/, "")) || o.f.has("e") || o.f.has("A");
            const me = sh.vfs().user();
            const tty = sh.host ? "pts/0" : "tty1";
            let p = Coreutils.procs(sh);
            const psPid = 1300 + Math.floor((Date.now() / 1000) % 600);
            p.push({ pid: psPid, user: me, tty, cmd: "ps " + raw, rss: 3900 });
            if (!all) {
                p = p.filter(x => x.tty == tty);
                return Coreutils.out(sh, "    PID TTY          TIME CMD\n" + p.map(x => `${String(x.pid).padStart(7)} ${x.tty.padEnd(8)} 00:00:00 ${x.cmd.replace(/^-/, "").split(" ")[0]}`).join("\n"));
            }
            const start = Coreutils.fmtDate(Vfs.bootOf(sh.host), "%R");
            if (/u/.test(raw) && !raw.startsWith("-e")) {
                return Coreutils.out(sh, "USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n" +
                    p.map(x => `${x.user.padEnd(8)} ${String(x.pid).padStart(7)}  0.0  ${(x.rss / 20000).toFixed(1).padStart(3)} ${String(x.rss * 4 + (x.rss ? 9000 : 0)).padStart(6)} ${String(x.rss).padStart(5)} ${x.tty.padEnd(8)} ${x.kernel ? "S   " : x.pid == psPid ? "R+  " : "Ss  "} ${start}   0:00 ${x.cmd}`).join("\n"));
            }
            Coreutils.out(sh, "UID          PID    PPID  C STIME TTY          TIME CMD\n" +
                p.map(x => `${x.user.padEnd(8)} ${String(x.pid).padStart(7)} ${String(x.pid == 1 || x.pid == 2 ? 0 : x.pid == psPid ? (sh.host ? 1201 : 1100) : 1).padStart(7)}  0 ${start} ${x.tty.padEnd(8)} 00:00:00 ${x.cmd}`).join("\n"));
        },

        ss(sh, a, name) {
            if (!sh.host) return Coreutils.err(sh, `${name}: the admin console has no network here — log in to a host first, e.g.  ssh Host1`);
            const o = Coreutils.opts(a);
            let s = Coreutils.sockets(sh);
            if (o.f.has("t") != o.f.has("u")) s = s.filter(x => x.proto == (o.f.has("t") ? "tcp" : "udp"));
            const prog = o.f.has("p");
            if (name == "netstat") {
                return Coreutils.out(sh, "Active Internet connections (only servers)\nProto Recv-Q Send-Q Local Address           Foreign Address         State      " + (prog ? " PID/Program name" : "") + "\n" +
                    s.map(x => `${x.proto.padEnd(5)}      0      0 ${x.local.padEnd(23)} ${"0.0.0.0:*".padEnd(23)} ${(x.state == "LISTEN" ? "LISTEN" : "").padEnd(10)} ${prog ? " " + x.pid + "/" + x.prog : ""}`.replace(/\s+$/, "")).join("\n"));
            }
            Coreutils.out(sh, "Netid State  Recv-Q Send-Q   Local Address:Port    Peer Address:Port" + (prog ? " Process" : "") + "\n" +
                s.map(x => `${x.proto.padEnd(5)} ${x.state.padEnd(6)} 0      ${x.state == "LISTEN" ? "128" : "0  "}    ${x.local.padStart(18)}      ${"0.0.0.0:*".padEnd(13)}` +
                    (prog ? ` users:(("${x.prog}",pid=${x.pid},fd=${x.proto == "tcp" ? 3 : 6}))` : "")).join("\n"));
        },
        netstat(sh, a) { return Coreutils.cmds.ss(sh, a, "netstat"); },

        ifconfig(sh, a) {
            if (!sh.host) return Coreutils.err(sh, "ifconfig: the admin console has no lab network card — log in to a host first, e.g.  ssh Host1");
            const h = sh.host;
            const want = a.find(x => !x.startsWith("-"));
            const blocks = h.nics.filter(n => !want || String(n.id) == want).map(n => {
                const up = n.linkUp();
                return `${n.id}: flags=${up ? "4163<UP,BROADCAST,RUNNING,MULTICAST>" : "4099<UP,BROADCAST,MULTICAST>"}  mtu 1500\n` +
                    (n.ip ? `        inet ${n.ip.ip}  netmask ${IP.maskOf(n.ip.cidr)}  broadcast ${IP.broadcastOf(n.ip.ip, n.ip.cidr)}\n` : "") +
                    `        ether ${n.mac}  txqueuelen 1000  (Ethernet)\n` +
                    `        RX packets ${n.stats.rx}  dropped ${n.stats.drop}\n` +
                    `        TX packets ${n.stats.tx}  errors 0  collisions 0`;
            });
            if (!want || want == "lo") blocks.push("lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536\n        inet 127.0.0.1  netmask 255.0.0.0\n        loop  txqueuelen 1000  (Local Loopback)");
            if (!blocks.length) return Coreutils.err(sh, `${want}: error fetching interface information: Device not found`);
            Coreutils.out(sh, blocks.join("\n\n"));
        },

        free(sh, a) {
            const o = Coreutils.opts(a);
            const kb = [2015232, 337920, 1372160, 8192, 305152, 1599488], sw = [2097148, 0, 2097148];
            const f = o.f.has("h") ? (k => k == 0 ? "0B" : k >= 1048576 ? (k / 1048576).toFixed(1) + "Gi" : Math.round(k / 1024) + "Mi")
                : o.f.has("m") ? (k => String(Math.round(k / 1024))) : (k => String(k));
            Coreutils.out(sh, "               total        used        free      shared  buff/cache   available\n" +
                "Mem:   " + kb.map(k => f(k).padStart(12)).join("") + "\n" +
                "Swap:  " + sw.map(k => f(k).padStart(12)).join(""));
        },

        df(sh, a) {
            const o = Coreutils.opts(a);
            const rows = [["devtmpfs", 4096, 0, "/dev"], ["tmpfs", 991232, 0, "/dev/shm"], ["tmpfs", 396492, 6124, "/run"],
                ["/dev/sda1", 20961280, 2204748, "/"], ["tmpfs", 198244, 4, sh.host ? "/run/user/0" : "/run/user/1000"]];
            const H = o.f.has("h");
            const f = k => H ? (k == 0 ? "0" : Coreutils.human(k * 1024)) : String(k);
            Coreutils.out(sh, (H ? "Filesystem      Size  Used Avail Use% Mounted on\n" : "Filesystem     1K-blocks    Used Available Use% Mounted on\n") +
                rows.map(([fs, size, used, mnt]) => H
                    ? `${fs.padEnd(14)} ${f(size).padStart(5)} ${f(used).padStart(5)} ${f(size - used).padStart(5)} ${(Math.ceil(used / size * 100) + "%").padStart(4)} ${mnt}`
                    : `${fs.padEnd(14)} ${String(size).padStart(9)} ${String(used).padStart(7)} ${String(size - used).padStart(9)} ${(Math.ceil(used / size * 100) + "%").padStart(4)} ${mnt}`).join("\n"));
        },

        sudo(sh, a) {
            if (!a.length) return Coreutils.err(sh, "usage: sudo command");
            if (sh.host) return sh.parse(a.join(" "));
            Coreutils.err(sh, "admin is not in the sudoers file.  This incident will be reported.\n(Here you become root by logging in to a lab machine:  ssh Host1)");
        },
        su(sh) {
            if (sh.host) return;
            Coreutils.err(sh, "Password:\nsu: Authentication failure\n(Log in to a lab machine instead:  ssh Host1)");
        },
        logout(sh) { return sh.parse("exit"); },
        true() { },
        false(sh) { sh.status = 1; },
    },
};

// the text filters work on files too:  head /etc/passwd,  grep root /etc/passwd
Coreutils.FILTERS.forEach(name => {
    Coreutils.cmds[name] = function (sh, a) {
        const s = Coreutils.filters[name](sh, a, null);
        if (s !== "" && s != null) Coreutils.out(sh, s.endsWith("\n") ? s.slice(0, -1) : s);
    };
});
