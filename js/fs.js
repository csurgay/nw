// A small file system that every machine shows to ls, cd, cat & co.
// Most files are made on the fly from the live state of the simulation, so
// `cat /proc/sys/net/ipv4/ip_forward` really tells whether the box routes,
// and /etc/resolv.conf changes when dhclient gets a DNS server.
// Users may create their own files in their home folder and in /tmp.
class Vfs {
    static PAGE = new Date();      // when the page was opened: the admin console booted
    static BOOT = new Date();      // when the current lab was loaded: the lab machines booted
    static INSTALL = (() => { const d = new Date(Date.now() - 118 * 864e5); d.setHours(10, 17, 42); return d; })(); // "installed" four months ago
    static KERNEL = "5.14.0-427.lab.x86_64";
    static OS = "NetLab Linux";
    static VER = "9.4";
    static MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    static DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // ---- node builders
    static D(c = {}, o = {}) { return Object.assign({ t: "d", c, mode: "drwxr-xr-x" }, o); }
    static F(data, o = {}) { return Object.assign({ t: "f", data, mode: "-rw-r--r--" }, o); }
    static X(name) { return { t: "f", data: Vfs.elf(name), mode: "-rwxr-xr-x", size: Vfs.fakeSize(name) }; }
    static L(to) { return { t: "l", to, mode: "lrwxrwxrwx" }; }
    static C(dev, mode = "crw-rw-rw-") { return { t: "c", dev, mode, data: "" }; }

    static fakeSize(s) {
        let h = 7;
        for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        return 20000 + h % 400000;
    }
    static elf(name) {
        return () => "\u007fELF\u0002\u0001\u0001\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0003\u0000>\u0000\u0001\u0000\u0000\u0000" +
            "  …this is a program (machine code for the processor), not text. Run it by typing its name: " + name;
    }

    constructor(shell) {
        this.shell = shell;
        this.host = shell.host;
        this.root = this.build();
    }

    // ---- the overlay holds files the user made: fullPath -> node
    overlay() {
        if (this.host) return this.host.userFiles || (this.host.userFiles = {});
        return this.shell.consoleFiles;
    }

    user() { return this.host ? "root" : "admin"; }
    home() { return this.host ? "/root" : "/home/admin"; }

    writable(path) {
        return path == "/tmp" || path.startsWith("/tmp/") || path == "/var/tmp" || path.startsWith("/var/tmp/") ||
            path.startsWith(this.home() + "/");
    }

    // ---- paths
    abs(p, cwd) {
        if (p == null || p === "") p = ".";
        if (p == "~" || p.startsWith("~/")) p = this.home() + p.substring(1);
        const parts = (p.startsWith("/") ? p : cwd + "/" + p).split("/");
        const out = [];
        for (const s of parts) {
            if (s == "" || s == ".") continue;
            if (s == "..") out.pop();
            else out.push(s);
        }
        return "/" + out.join("/");
    }

    static parent(p) { return p == "/" ? "/" : p.substring(0, p.lastIndexOf("/")) || "/"; }
    static base(p) { return p == "/" ? "/" : p.substring(p.lastIndexOf("/") + 1); }

    children(node, path) {
        const c = Object.assign({}, typeof node.c == "function" ? node.c() : node.c);
        const ov = this.overlay();
        const pre = path == "/" ? "/" : path + "/";
        for (const k in ov) {
            if (k.startsWith(pre) && k.indexOf("/", pre.length) < 0) c[k.substring(pre.length)] = ov[k];
        }
        return c;
    }

    // -> { node, path } (path with symlinks resolved), or { err }
    lookup(path, follow = true, depth = 0) {
        if (depth > 8) return { err: "Too many levels of symbolic links" };
        let node = this.root, real = "/";
        const segs = path.split("/").filter(s => s);
        for (let i = 0; i < segs.length; i++) {
            if (node.t != "d") return { err: "Not a directory" };
            if (node.priv && !this.host) return { err: "Permission denied" };
            const next = this.children(node, real)[segs[i]];
            if (!next) return { err: "No such file or directory" };
            const here = real == "/" ? "/" + segs[i] : real + "/" + segs[i];
            if (next.t == "l" && (follow || i < segs.length - 1)) {
                const r = this.lookup(this.abs(next.to, real), true, depth + 1);
                if (r.err) return r;
                node = r.node;
                real = r.path;
            } else {
                node = next;
                real = here;
            }
        }
        return { node, path: real };
    }

    read(node) {
        if (node.priv && !this.host) return null;
        return typeof node.data == "function" ? node.data() : (node.data || "");
    }

    size(node) {
        if (node.t == "d") return node.proc ? 0 : 4096;
        if (node.t == "l") return node.to.length;
        if (node.size != null) return node.size;
        if (node.proc) return 0;
        const d = this.read(node);
        return d == null ? 0 : new TextEncoder().encode(d.endsWith("\n") || d == "" ? d : d + "\n").length;
    }

    mtime(node) {
        if (node.mtime) return typeof node.mtime == "function" ? node.mtime() : node.mtime;
        if (node.proc) return this.host ? Vfs.BOOT : Vfs.PAGE;
        return Vfs.INSTALL;
    }

    // ---- writes (only in the overlay)
    write(path, text, append) {
        const ov = this.overlay();
        const r = this.lookup(path);
        if (r.node && r.node.t == "d") return "Is a directory";
        const dir = this.lookup(Vfs.parent(path));
        if (dir.err) return dir.err;
        if (dir.node.t != "d") return "Not a directory";
        if (!this.writable(path)) return this.host ? "Read-only file system" : "Permission denied";
        const old = ov[path];
        ov[path] = Vfs.F(append && old ? old.data + text : text, { mtime: new Date(), owner: this.user() });
        return null;
    }

    // ---- what the file system looks like
    build() {
        const { D, F, X, L, C } = Vfs;
        const h = this.host, sh = this.shell;
        const boot = () => this.host ? Vfs.BOOT : Vfs.PAGE;
        const now = () => new Date();
        const name = h ? h.id.toString() : "console";
        const isRouter = h && h.forwarding;
        const isServer = h && typeof Server != "undefined" && h instanceof Server;
        const live = { mtime: now };

        const bins = {};
        Coreutils.BIN.forEach(n => bins[n] = X(n));
        const sbins = {};
        Coreutils.SBIN.forEach(n => sbins[n] = X(n));

        // /etc
        const etc = {
            "hostname": F(name),
            "hosts": F("127.0.0.1   localhost localhost.localdomain\n::1         localhost localhost.localdomain\n"),
            "os-release": F(`NAME="${Vfs.OS}"\nVERSION="${Vfs.VER} (Blue Wire)"\nID="netlab"\nID_LIKE="rhel centos fedora"\nVERSION_ID="${Vfs.VER}"\nPRETTY_NAME="${Vfs.OS} ${Vfs.VER} (Blue Wire)"\nHOME_URL="https://github.com/csurgay/nw"`),
            "redhat-release": L("netlab-release"),
            "netlab-release": F(`${Vfs.OS} release ${Vfs.VER} (Blue Wire)`),
            "machine-id": F(Array.from({ length: 32 }, (_, i) => "0123456789abcdef"[(Vfs.fakeSize(name + i) >> 3) & 15]).join("")),
            "motd": F(h ? `\nWelcome to ${name}!\nThis is a ${isRouter ? "router: it passes packets between networks" : isServer ? "server: other machines ask it for things" : "computer on the lab network"}.\nType  help  to see what you can do here.\n`
                : "\nWelcome to the admin console.\nThis machine is not on the lab network: log in to one with  ssh Host1\n"),
            "passwd": F(this.passwd(isServer)),
            "group": F("root:x:0:\nbin:x:1:\ndaemon:x:2:\nwheel:x:10:admin\n" + (isServer ? (h.dhcpd ? "dhcpd:x:177:\n" : "") + (h.named ? "named:x:25:\n" : "") : "") + (h ? "" : "admin:x:1000:\n")),
            "shadow": F("root:!locked::0:99999:7:::\nbin:*:19000:0:99999:7:::\n" + (h ? "" : "admin:$6$lab$Ze5mE3sQqzY...:20000:0:99999:7:::\n"), { mode: "----------", priv: true }),
            "fstab": F("# /etc/fstab: which disks are attached where\n/dev/sda1   /       xfs     defaults        0 0\n/dev/sda2   swap    swap    defaults        0 0"),
            "resolv.conf": F(() => h ? ((h.domain ? "search " + h.domain + "\n" : "") + (h.dnsServer ? "nameserver " + h.dnsServer : "# no nameserver configured")) : "# the console uses no DNS", { mtime: () => h && h.lease ? new Date(Vfs.BOOT.getTime() + h.lease.got) : boot() }),
            "services": F("# service name  port/protocol   # what it is\nssh             22/tcp          # Secure Shell login\ndomain          53/udp          # DNS: names -> IP addresses\nbootps          67/udp          # DHCP server\nbootpc          68/udp          # DHCP client\nhttp            80/tcp          # web pages\nntp             123/udp         # time\nhttps           443/tcp         # secure web pages"),
            "protocols": F("# protocol  number  NAME   # what it is\nip          0       IP     # internet protocol\nicmp        1       ICMP   # ping, traceroute errors\ntcp         6       TCP    # reliable streams\nudp         17      UDP    # quick datagrams (DHCP, DNS)"),
            "localtime": L("../usr/share/zoneinfo/" + (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")),
            "ssh": D({ "sshd_config": F("Port 22\nPermitRootLogin yes\nPasswordAuthentication no   # this lab trusts you anyway :)") }),
            "sysconfig": D({
                "network-scripts": D(() => {
                    const o = {};
                    if (h) h.nics.forEach(n => o["ifcfg-" + n.id] = F(() => this.ifcfg(n), live));
                    return o;
                }),
            }),
        };
        if (isRouter) etc["sysctl.d"] = D({ "90-router.conf": F("# a router passes packets that are not for itself\nnet.ipv4.ip_forward = 1") });
        if (h && h.dhcpd) etc["dhcp"] = D({ "dhcpd.conf": F(() => this.dhcpdConf()) });
        if (h && h.named) etc["named.conf"] = F(`options {\n    directory "/var/named";\n    listen-on port 53 { any; };\n};\nzone "${h.named.domain}" IN {\n    type master;\n    file "${h.named.domain}.zone";\n};`);

        // /proc: the kernel tells about itself
        const P = (fn) => F(fn, { proc: true, mtime: now, mode: "-r--r--r--" });
        const proc = {
            "version": P(() => `Linux version ${Vfs.KERNEL} (builder@netlab) (gcc 11.4.1) #1 SMP PREEMPT_DYNAMIC`),
            "uptime": P(() => { const s = (Date.now() - boot().getTime()) / 1000; return s.toFixed(2) + " " + (s * 0.97).toFixed(2); }),
            "loadavg": P(() => "0.00 0.01 0.00 1/97 " + (1200 + Math.floor(Sim.time / 1000) % 800)),
            "cmdline": P(() => `BOOT_IMAGE=(hd0,msdos1)/vmlinuz-${Vfs.KERNEL} root=/dev/sda1 ro quiet`),
            "cpuinfo": P(() => "processor\t: 0\nvendor_id\t: GenuineLab\nmodel name\t: Tiny Lab CPU @ 1.00GHz\ncpu MHz\t\t: 1000.000\ncache size\t: 512 KB\ncpu cores\t: 1"),
            "meminfo": P(() => "MemTotal:        2015232 kB\nMemFree:         1372160 kB\nMemAvailable:    1599488 kB\nBuffers:            2048 kB\nCached:           302592 kB\nSwapTotal:       2097148 kB\nSwapFree:        2097148 kB"),
            "net": D({
                "arp": P(() => "IP address       HW type     Flags       HW address            Mask     Device\n" +
                    (h ? h.l3.arp.cache.map(e => `${String(e.ip).padEnd(17)}0x1         0x2         ${String(e.mac).padEnd(22)}*        ${e.port}`).join("\n") : "")),
                "dev": P(() => "Inter-|   Receive    |  Transmit\n face |   packets    |   packets\n    lo:          0            0\n" +
                    (h ? h.nics.map(n => `${String(n.id).padStart(6)}: ${String(n.stats.rx).padStart(10)}   ${String(n.stats.tx).padStart(10)}`).join("\n") : "")),
            }, { proc: true }),
            "sys": D({ "net": D({ "ipv4": D({ "ip_forward": P(() => h && h.forwarding ? "1" : "0") }, { proc: true }) }, { proc: true }) }, { proc: true }),
        };

        // /sys/class/net: one folder per network card
        const sysnet = () => {
            const o = { "lo": D({ "address": P(() => "00:00:00:00:00:00"), "operstate": P(() => "unknown"), "mtu": P(() => "65536") }, { proc: true }) };
            if (h) h.nics.forEach(n => o[n.id] = D({
                "address": P(() => String(n.mac)),
                "operstate": P(() => n.linkUp() ? "up" : "down"),
                "carrier": P(() => n.linkUp() ? "1" : "0"),
                "mtu": P(() => "1500"),
                "statistics": D({
                    "rx_packets": P(() => String(n.stats.rx)),
                    "tx_packets": P(() => String(n.stats.tx)),
                    "rx_dropped": P(() => String(n.stats.drop)),
                }, { proc: true }),
            }, { proc: true }));
            return o;
        };

        // home folders
        const hist = () => terminal.history.join("\n");
        const rootHome = D({
            ".bashrc": F("# .bashrc\nalias ll='ls -l'\nalias la='ls -la'\nPS1='[\\u@\\h \\W]\\# '"),
            ".bash_profile": F("# .bash_profile\n[ -f ~/.bashrc ] && . ~/.bashrc"),
            ".bash_history": F(hist, { mode: "-rw-------", mtime: now }),
            ".ssh": D({ "authorized_keys": F("ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIL4b admin@console", { mode: "-rw-------" }) }, { mode: "drwx------" }),
            "anaconda-ks.cfg": F("# Kickstart file: how this machine was installed\nlang en_US.UTF-8\nkeyboard us\ntimezone Europe/Budapest\nrootpw --lock\n%packages\n@core\n%end", { mode: "-rw-------" }),
            "README.txt": F(() => this.readme(isRouter, isServer)),
        }, { mode: "dr-xr-x---", priv: true });
        const home = h ? {} : {
            "admin": D({
                ".bashrc": F("# .bashrc\nalias ll='ls -l'"),
                ".bash_history": F(hist, { mode: "-rw-------", mtime: now, owner: "admin" }),
                "notes.txt": F("Things to try:\n  lab               list the example networks\n  ssh Host1         log in to a lab computer\n  ls -la /etc       look around (the network settings live here)\n  help              all commands", { owner: "admin" }),
            }, { mode: "drwx------", owner: "admin" }),
        };

        // /var
        const varLib = {};
        if (h && h.dhcpd) varLib["dhcpd"] = D({ "dhcpd.leases": F(() => h.dhcpd.leaseText() || "# no leases yet", { mtime: now, owner: "dhcpd" }) });
        if (h && h.lease) varLib["dhclient"] = D({ ["dhclient-" + (h.nics[0] ? h.nics[0].id : "NIC1") + ".leases"]: F(() => this.clientLease(), live) });
        const vard = {
            "log": D({
                "messages": F(() => this.messages(), { mode: "-rw-------", mtime: now }),
                "lastlog": F("", { size: 292292 }),
            }),
            "lib": D(varLib),
            "tmp": D({}, { mode: "drwxrwxrwt" }),
            "spool": D({}),
        };
        if (h && h.named) vard["named"] = D({ [h.named.domain + ".zone"]: F(() => h.named.zoneText(), { owner: "named" }) });

        return D({
            "bin": L("usr/bin"),
            "boot": D({
                ["vmlinuz-" + Vfs.KERNEL]: Object.assign(X("vmlinuz"), { size: 11538072, data: () => "This is the Linux kernel: the heart of the system that talks to the hardware." }),
                ["initramfs-" + Vfs.KERNEL + ".img"]: F("(a tiny starter file system used while booting)", { size: 34120448 }),
            }, { mode: "dr-xr-xr-x" }),
            "dev": D({
                "null": C("1, 3"), "zero": C("1, 5"), "random": C("1, 8"), "tty": C("5, 0"),
                "sda": C("8, 0", "brw-rw----"), "sda1": C("8, 1", "brw-rw----"), "sda2": C("8, 2", "brw-rw----"),
                "pts": D({ "0": C("136, 0", "crw--w----") }),
            }, { mtime: boot }),
            "etc": D(etc),
            "home": D(home),
            "lib": L("usr/lib"),
            "lib64": L("usr/lib64"),
            "mnt": D({}),
            "opt": D({}),
            "proc": D(proc, { mode: "dr-xr-xr-x", proc: true, mtime: boot }),
            "root": rootHome,
            "run": D({}, { mtime: boot }),
            "sbin": L("usr/sbin"),
            "srv": D({}),
            "sys": D({ "class": D({ "net": D(sysnet, { proc: true }) }, { proc: true }) }, { mode: "dr-xr-xr-x", proc: true, mtime: boot }),
            "tmp": D({}, { mode: "drwxrwxrwt", mtime: now }),
            "usr": D({
                "bin": D(bins, { mode: "dr-xr-xr-x" }),
                "sbin": D(sbins, { mode: "dr-xr-xr-x" }),
                "lib": D({}, { mode: "dr-xr-xr-x" }),
                "lib64": D({}, { mode: "dr-xr-xr-x" }),
                "share": D({ "zoneinfo": D({}) }),
            }),
            "var": D(vard),
        }, { mode: "dr-xr-xr-x" });
    }

    passwd(isServer) {
        const h = this.host;
        let s = "root:x:0:0:root:/root:/bin/bash\nbin:x:1:1:bin:/bin:/sbin/nologin\ndaemon:x:2:2:daemon:/sbin:/sbin/nologin\n" +
            "sshd:x:74:74:Privilege-separated SSH:/usr/share/empty.sshd:/sbin/nologin\n";
        if (isServer && h.dhcpd) s += "dhcpd:x:177:177:DHCP server:/:/sbin/nologin\n";
        if (isServer && h.named) s += "named:x:25:25:Named:/var/named:/sbin/nologin\n";
        if (!h) s += "admin:x:1000:1000:Lab Admin:/home/admin:/bin/bash\n";
        return s;
    }

    ifcfg(n) {
        const h = this.host;
        if (h.useDhcp || h.lease) return `# ${n.id}: settings for this network card\nDEVICE=${n.id}\nTYPE=Ethernet\nHWADDR=${n.mac}\nBOOTPROTO=dhcp\nONBOOT=yes`;
        const gw = h.l3.routing.table.find(r => r.cidr == 0 && r.via);
        return `# ${n.id}: settings for this network card\nDEVICE=${n.id}\nTYPE=Ethernet\nHWADDR=${n.mac}\nBOOTPROTO=${n.ip ? "none" : "none   # no address set"}\nONBOOT=yes` +
            (n.ip ? `\nIPADDR=${n.ip.ip}\nPREFIX=${n.ip.cidr}` : "") + (gw && n == h.nics[0] ? `\nGATEWAY=${gw.via}` : "");
    }

    dhcpdConf() {
        const d = this.host.dhcpd, nic = this.host.nics.find(n => n.ip);
        const net = nic ? IP.networkOf(nic.ip.ip, nic.ip.cidr) : "0.0.0.0";
        return `# dhcpd.conf: which addresses this DHCP server may hand out\ndefault-lease-time ${d.lease};\n` +
            (d.domain ? `option domain-name "${d.domain}";\n` : "") + (d.dns ? `option domain-name-servers ${d.dns};\n` : "") +
            `\nsubnet ${net} netmask ${nic ? IP.maskOf(nic.ip.cidr) : "0.0.0.0"} {\n    range ${d.first} ${d.last};\n` +
            (d.router ? `    option routers ${d.router};\n` : "") + "}";
    }

    clientLease() {
        const l = this.host.lease;
        return `lease {\n  interface "${this.host.nics[0].id}";\n  fixed-address ${l.ip};\n  option dhcp-server-identifier ${l.server};\n` +
            (this.host.dnsServer ? `  option domain-name-servers ${this.host.dnsServer};\n` : "") + `  option dhcp-lease-time ${l.time};\n}`;
    }

    readme(isRouter, isServer) {
        const n = this.host.id.toString();
        return `Hi! You are logged in to ${n}.\n\n` +
            "Interesting places on this computer:\n" +
            "  /etc/hostname                 the name of this computer\n" +
            "  /etc/resolv.conf              which DNS server it asks about names\n" +
            "  /etc/sysconfig/network-scripts   the settings of each network card\n" +
            "  /proc/net/arp                 who is who: IP address -> MAC address\n" +
            "  /proc/sys/net/ipv4/ip_forward 1 = this machine is a router\n" +
            "  /sys/class/net                one folder per network card\n" +
            "  /var/log/messages             what happened here (newest at the end)\n" +
            (isServer ? "  /etc/dhcp, /etc/named.conf    the server programs' settings\n" : "") +
            "\nTry:  ls -la /etc   cat /proc/net/arp   tail /var/log/messages";
    }

    messages() {
        const h = this.host;
        const tag = h ? `<b>${h.id}</b>` : null;
        const rows = EventLog.entries.filter(e => h ? (e.obj == h || (e.text || "").indexOf(tag) >= 0) : e.kind == "cmd");
        const strip = s => { const d = document.createElement("div"); d.innerHTML = s; return d.textContent; };
        const name = h ? h.id.toString() : "console";
        const head = `${Vfs.lsDate(h ? Vfs.BOOT : Vfs.PAGE, true)} ${name} kernel: Linux version ${Vfs.KERNEL}\n` +
            `${Vfs.lsDate(h ? Vfs.BOOT : Vfs.PAGE, true)} ${name} systemd[1]: Reached target Multi-User System.`;
        return head + (rows.length ? "\n" : "") + rows.slice(-60).map(e => {
            const d = new Date((h ? Vfs.BOOT : Vfs.PAGE).getTime() + e.t);
            const proto = e.proto || (e.frame ? e.frame.proto() : "");
            const who = e.kind == "cmd" ? "bash" : proto == "DHCP" ? (h && h.dhcpd ? "dhcpd" : "dhclient") :
                proto == "DNS" ? (h && h.named ? "named" : "resolver") : "kernel";
            return `${Vfs.lsDate(d, true)} ${name} ${who}: ${strip(e.text).replace(new RegExp("^" + name + "\\s*"), "")}`;
        }).join("\n");
    }

    // "Oct 22 20:43" (recent) or "Jun 25  2025"; syslog style always has the time with seconds
    static lsDate(d, syslog) {
        const p = n => String(n).padStart(2, "0");
        const md = Vfs.MON[d.getMonth()] + " " + String(d.getDate()).padStart(2, " ");
        if (syslog) return `${md} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
        const recent = Math.abs(Date.now() - d.getTime()) < 182 * 864e5;
        return md + " " + (recent ? `${p(d.getHours())}:${p(d.getMinutes())}` : " " + d.getFullYear());
    }
}
