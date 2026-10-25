// An IOS-style command line for the managed switch of the "cisco" kind.
// The modes work like on the real thing:
//   switch1>              user mode: look, but don't touch
//   switch1#              privileged mode (enable)
//   switch1(config)#      configure terminal
//   switch1(config-if)#   interface gi0/3
// Every change goes into the running-config at once; "write memory" copies it into
// the startup-config, and that is what comes back after a reload.
// Words can be shortened as long as they stay unique (sh mac add, conf t, int gi0/3),
// "?" lists what may come next, TAB completes a word.
class IosCli {
    constructor(sw) {
        this.sw = sw;
        this.history = [];
        this.reset();
    }

    reset() {
        this.mode = "exec";
        this.ifs = [];
        this.vlan = null;
        this.ask = null;
    }

    prompt() {
        if (this.ask) return this.ask.q;
        const n = this.sw.id.toString();
        if (this.mode == "if") return n + (this.ifs.length > 1 ? "(config-if-range)#" : "(config-if)#");
        return n + { exec: ">", priv: "#", config: "(config)#", vlan: "(config-vlan)#" }[this.mode];
    }

    // ---------------------------------------------------------------- grammar
    // keyword node: { k, h, c: [children], f(args) -> output text }
    // argument node: { a: "<name>", h, t: RegExp, c, f, rest: takes the rest of the line }
    tree(mode) {
        const K = (k, h, c, f) => ({ k, h, c, f });
        const A = (a, h, t, c, f, rest) => ({ a, h, t, c, f, rest });
        const IF = (c, f) => A("<interface>", "GigabitEthernet interface, e.g. gi0/1", /^[a-z]*\d+\/\d+$/i, c, f);
        const priv = mode != "exec";
        const show = K("show", "Show running system information", [
            K("version", "System hardware and software status", null, () => this.showVersion()),
            K("mac", "MAC configuration", [K("address-table", "MAC forwarding table", [K("dynamic", "dynamic entry type", null, () => this.showMac())], () => this.showMac())]),
            K("vlan", "VTP VLAN status", [K("brief", "VTP all VLAN status in brief", null, () => this.showVlan())], () => this.showVlan()),
            K("interfaces", "Interface status and configuration", [K("status", "Show interface line status", null, () => this.showIfStatus()),
                IF(null, a => this.showIf(a[0]))], () => this.showIfStatus()),
            ...(priv ? [K("running-config", "Current operating configuration", null, () => this.showRun()),
                K("startup-config", "Contents of startup configuration", null, () => this.showStart())] : []),
            K("history", "Display the session command history", null, () => this.history.slice(-10).map(l => "  " + l).join("\n")),
            K("clock", "Display the system clock", null, () => "*" + Coreutils.fmtDate(new Date(), "%T.000 %Z %a %b %e %Y")),
        ]);
        const noIp = () => "% This switch has no IP address in the lab: it is managed from the console.\n  Ping from a computer instead:  exit,  then  ssh host1 ping ...";
        const leave = [K("exit", "Exit from the EXEC", null, () => this.logout()), K("logout", "Exit from the EXEC", null, () => this.logout()),
            K("quit", "Exit from the EXEC", null, () => this.logout())];
        const net = [K("ping", "Send echo messages", [A("WORD", "Ping destination address or hostname", /.+/, null, noIp)], noIp),
            K("traceroute", "Trace route to destination", [A("WORD", "Destination address or hostname", /.+/, null, noIp)], noIp)];
        const iface = K("interface", "Select an interface to configure", [
            IF(null, a => this.enterIf([a[0]])),
            K("range", "interface range command", [A("<range>", "e.g. gi0/1-3", /^[a-z]*\d+\/\d+(-\d+)?$/i, null, a => this.enterIf(this.range(a[0])))]),
        ]);
        const vlanCmd = K("vlan", "VLAN commands", [A("<1-4094>", "ISL VLAN IDs 1-1005", /^\d+$/, null, a => this.enterVlan(+a[0]))]);
        const end = K("end", "Exit from configure mode", null, () => this.end());
        const exitUp = K("exit", "Exit from the current mode", null, () => this.exitMode());
        const doCmd = K("do", "To run exec commands in config mode", [A("LINE", "Exec Command", /.+/, null, a => this.runIn("priv", a[0]), true)]);
        const word = (h, f) => A("WORD", h, /^\S+$/, null, f);

        if (mode == "exec") return [
            K("enable", "Turn on privileged commands", null, () => { this.mode = "priv"; }),
            show, ...net, ...leave,
        ];
        if (mode == "priv") return [
            K("enable", "Turn on privileged commands", null, () => ""),
            K("disable", "Turn off privileged commands", null, () => { this.mode = "exec"; }),
            K("configure", "Enter configuration mode", [K("terminal", "Configure from the terminal", null, () => this.configure())], () => this.configure()),
            show,
            K("copy", "Copy from one file to another", [K("running-config", "Copy from current system configuration", [K("startup-config", "Copy to startup configuration", null,
                () => "Destination filename [startup-config]? \n" + this.save())])]),
            K("write", "Write running configuration to memory", [K("memory", "Write to NV memory", null, () => this.save())], () => this.save()),
            K("reload", "Halt and perform a cold restart", null, () => this.reload()),
            K("clear", "Reset functions", [K("mac", "MAC forwarding table", [K("address-table", "MAC forwarding table", [K("dynamic", "dynamic entry type", null, () => this.clearMac())], () => this.clearMac())])]),
            ...net, ...leave,
        ];
        if (mode == "config") return [
            K("hostname", "Set system's network name", [word("This system's network name", a => this.hostname(a[0]))]),
            iface, vlanCmd,
            K("no", "Negate a command or set its defaults", [
                K("vlan", "Delete a VLAN", [A("<1-4094>", "VLAN ID", /^\d+$/, null, a => this.noVlan(+a[0]))]),
                K("hostname", "Set system's network name", null, () => this.hostname(this.sw.id.defaultName())),
            ]),
            doCmd, end, exitUp,
        ];
        if (mode == "vlan") return [
            K("name", "Ascii name of the VLAN", [word("The ascii name for the VLAN", a => { this.sw.vlanNames[this.vlan] = a[0].slice(0, 32); })]),
            vlanCmd, iface, doCmd, end, exitUp,
        ];
        // interface mode
        return [
            K("switchport", "Set switching mode characteristics", [
                K("mode", "Set trunking mode of the interface", [
                    K("access", "Set trunking mode to ACCESS unconditionally", null, () => this.eachIf(p => this.sw.setPortVlan(p, p.vlan))),
                    K("trunk", "Set trunking mode to TRUNK unconditionally", null, () => this.eachIf(p => this.sw.setPortVlan(p, "trunk"))),
                ]),
                K("access", "Set access mode characteristics of the interface", [K("vlan", "Set VLAN when interface is in access mode",
                    [A("<1-4094>", "VLAN ID of the VLAN when this port is in access mode", /^\d+$/, null, a => this.accessVlan(+a[0]))])]),
                K("trunk", "Set trunking characteristics of the interface", [K("allowed", "Set allowed VLAN characteristics", [K("vlan", "Set allowed VLANs",
                    [A("WORD", "VLAN IDs of the allowed VLANs", /.+/, null, () => "", true)])])]),
                K("nonegotiate", "Device will not engage in negotiation protocol", null, () => ""),
            ]),
            K("shutdown", "Shutdown the selected interface", null, () => this.shut(true)),
            K("description", "Interface specific description", [A("LINE", "Up to 240 characters describing this interface", /.+/, null, a => this.eachIf(p => { p.desc = a[0].slice(0, 240); }), true)]),
            K("no", "Negate a command or set its defaults", [
                K("shutdown", "Shutdown the selected interface", null, () => this.shut(false)),
                K("description", "Interface specific description", null, () => this.eachIf(p => { p.desc = ""; })),
                K("switchport", "Set switching mode characteristics", [K("access", "Set access mode characteristics", [K("vlan", "Set VLAN when interface is in access mode", null, () => this.accessVlan(1))])]),
            ]),
            iface, doCmd, end, exitUp,
        ];
    }

    // ---------------------------------------------------------------- parsing
    tokens(line) {
        const out = [];
        line.replace(/\S+/g, (s, p) => { out.push({ s, p }); return s; });
        return out;
    }

    // "interface gigabitethernet 0/1" -> "interface gigabitethernet0/1", "gi0/1 - 3" -> "gi0/1-3"
    normalize(line) {
        return line.replace(/\b([a-z]+)\s+(\d+\/\d+)/gi, (m, w, n) => /^(g|gi|gig|giga|gigabit|gigabitethernet|f|fa|fastethernet|e|eth|ethernet)$/i.test(w) ? w + n : m)
            .replace(/(\d+\/\d+)\s*-\s*(\d+)/g, "$1-$2");
    }

    walk(mode, toks) {
        let nodes = this.tree(mode), node = null;
        const args = [];
        for (let i = 0; i < toks.length; i++) {
            const tok = toks[i].s, low = tok.toLowerCase();
            const exact = nodes.find(n => n.k == low);
            const kws = nodes.filter(n => n.k && n.k.startsWith(low));
            let pick = exact || (kws.length == 1 ? kws[0] : null);
            if (!pick && kws.length > 1) return { err: "ambiguous", i };
            if (!pick) pick = nodes.find(n => n.t && n.t.test(tok));
            if (!pick) return { err: "invalid", i };
            node = pick;
            if (pick.rest) { args.push(toks.slice(i).map(t => t.s).join(" ")); return { node, args }; }
            if (pick.t) args.push(tok);
            nodes = pick.c || [];
        }
        return { node, args, nodes };
    }

    // run one line in a mode; returns the output text
    runIn(mode, line) {
        const saved = this.mode;
        if (mode != this.mode) this.mode = mode;
        const r = this.run(line);
        if (this.mode == mode && mode != saved) this.mode = saved; // "do" does not change the mode
        return r;
    }

    run(line) {
        line = this.normalize(line);
        const toks = this.tokens(line);
        if (!toks.length) return "";
        const w = this.walk(this.mode, toks);
        if (w.err == "ambiguous") return `% Ambiguous command:  "${line.trim()}"`;
        if (w.err == "invalid") return " ".repeat(this.prompt().length + toks[w.i].p) + "^\n% Invalid input detected at '^' marker.";
        if (!w.node.f) return "% Incomplete command.";
        const out = w.node.f(w.args);
        return out == null ? "" : String(out);
    }

    // the shell sends every line here while somebody is logged in
    exec(sh, line) {
        this.sh = sh;
        if (this.ask) {
            const a = this.ask;
            this.ask = null;
            const out = a.on(line.trim().toLowerCase());
            if (out) sh.t.println(out);
            if (shell.host == this.sw) sh.updatePrompt();
            return true;
        }
        if (!line.trim()) return true;
        // the lab's own command still works from here
        if (/^\s*lab(\s|$)/.test(line)) { this.logout(true); return sh.parse(line); }
        this.history.push(line.trim());
        // show ... | include WORD  (also exclude, begin)
        let filter = null;
        const m = line.match(/^(.*?)\s+\|\s*(i|in|inc|incl|include|e|ex|exc|exclude|b|be|beg|begin)\s+(.+)$/i);
        if (m) { line = m[1]; filter = { kind: m[2][0].toLowerCase(), re: new RegExp(m[3].trim(), "i") }; }
        let out = this.run(line);
        if (filter && out) {
            const lines = out.split("\n");
            if (filter.kind == "b") { const i = lines.findIndex(l => filter.re.test(l)); out = i < 0 ? "" : lines.slice(i).join("\n"); }
            else out = lines.filter(l => filter.re.test(l) == (filter.kind == "i")).join("\n");
        }
        if (out) sh.t.println(out);
        if (shell.host == this.sw) sh.updatePrompt();
        return true;
    }

    // "?" pressed: what may come next
    help(line) {
        line = this.normalize(line);
        const toks = this.tokens(line);
        const endsWithSpace = !line.length || /\s$/.test(line);
        const done = endsWithSpace ? toks : toks.slice(0, -1);
        const part = endsWithSpace ? "" : toks[toks.length - 1].s.toLowerCase();
        const w = done.length ? this.walk(this.mode, done) : { node: null, nodes: this.tree(this.mode) };
        if (w.err) return "% Unrecognized command";
        if (w.node && w.node.rest) return "  <cr>";
        const nodes = (w.node ? w.node.c : w.nodes) || [];
        if (!endsWithSpace) {
            const list = nodes.filter(n => n.k && n.k.startsWith(part)).map(n => n.k);
            return list.length ? list.join("  ") : "% Unrecognized command";
        }
        const rows = nodes.map(n => "  " + (n.k || n.a).padEnd(16) + n.h);
        if (w.node && w.node.f) rows.push("  <cr>");
        return rows.join("\n") || "  <cr>";
    }

    // TAB: complete the last word if it is unique
    complete(line) {
        const toks = this.tokens(this.normalize(line));
        if (!toks.length || /\s$/.test(line)) return { line, list: [] };
        const done = toks.slice(0, -1), part = toks[toks.length - 1].s.toLowerCase();
        const w = done.length ? this.walk(this.mode, done) : { nodes: this.tree(this.mode) };
        if (w.err) return { line, list: [] };
        const nodes = (w.node ? w.node.c : w.nodes) || [];
        const list = nodes.filter(n => n.k && n.k.startsWith(part)).map(n => n.k);
        if (list.length == 1) return { line: line.substring(0, line.length - part.length) + list[0] + " ", list: [] };
        return { line, list };
    }

    // ---------------------------------------------------------------- actions
    logout(quiet) {
        const name = this.sw.id.toString();
        this.reset();
        if (shell.host != this.sw) return "";
        if (!shell.oneShot && typeof Access != "undefined" && Access.inConsoleOf(this.sw)) { Access.iosLogout(shell, this.sw); return ""; }
        if (!quiet) this.sh.t.println(`Connection to ${name} closed.`);
        if (!shell.oneShot) shell.toConsole();
        return "";
    }

    configure() {
        this.mode = "config";
        return "Enter configuration commands, one per line.  End with CNTL/Z.";
    }

    end() {
        this.mode = "priv";
        this.ifs = [];
        return "%SYS-5-CONFIG_I: Configured from console by vty0";
    }

    exitMode() {
        if (this.mode == "config") { this.mode = "priv"; return ""; }
        this.mode = "config";
        this.ifs = [];
        return "";
    }

    port(name) {
        const p = this.sw.findPort(name);
        return p && /\d+\/\d+$/.test(name) && name.match(/(\d+)\//)[1] == "0" ? p : null;
    }

    range(spec) {
        const m = spec.match(/(\d+)\/(\d+)(?:-(\d+))?$/);
        if (!m) return [];
        const a = +m[2], b = m[3] ? +m[3] : a;
        const out = [];
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) out.push("gi0/" + i);
        return out;
    }

    enterIf(names) {
        const ps = names.map(n => this.port(n));
        if (!names.length || ps.some(p => !p)) return `% Invalid interface: this switch has GigabitEthernet0/1 - 0/${this.sw.ports.length}`;
        this.ifs = ps;
        this.mode = "if";
        return "";
    }

    eachIf(fn) {
        this.ifs.forEach(fn);
        return "";
    }

    enterVlan(n) {
        if (n < 1 || n > 4094) return "% Invalid VLAN ID";
        if (!this.sw.vlanNames[n]) this.sw.vlanNames[n] = "VLAN" + String(n).padStart(4, "0");
        this.vlan = n;
        this.mode = "vlan";
        return "";
    }

    noVlan(n) {
        if (n == 1) return "%Default VLAN 1 may not be deleted.";
        delete this.sw.vlanNames[n];
        return "";
    }

    accessVlan(n) {
        if (n < 1 || n > 4094) return "% Invalid VLAN ID";
        let out = "";
        if (!this.sw.vlanNames[n]) out = `% Access VLAN does not exist. Creating vlan ${n}`;
        this.ifs.forEach(p => {
            if (p.trunk) { p.vlan = n; this.sw.vlanNames[n] = this.sw.vlanNames[n] || "VLAN" + String(n).padStart(4, "0"); }
            else this.sw.setPortVlan(p, n);
        });
        return out;
    }

    shut(down) {
        return this.ifs.map(p => {
            if (!!p.adminDown == down) return "";
            this.sw.setPortDown(p, down);
            const n = this.sw.portName(p, true);
            return down ? `%LINK-5-CHANGED: Interface ${n}, changed state to administratively down`
                : `%LINK-3-UPDOWN: Interface ${n}, changed state to ${p.linkUp() ? "up" : "down"}`;
        }).filter(x => x).join("\n");
    }

    hostname(name) {
        if (!/^[A-Za-z][A-Za-z0-9-]{0,23}$/.test(name)) return "% Hostname contains one or more illegal characters.";
        const e = this.sw.rename(name, false);
        return e ? "% " + e.replace(/^hostname:\s*/, "") : "";
    }

    save() {
        this.sw.saveStartup();
        Sim.event("info", `<b>${this.sw}</b> saved its running-config as startup-config — it survives a reload now`, { obj: this.sw });
        return "Building configuration...\n[OK]";
    }

    clearMac() {
        this.sw.macTable = [];
        Sim.event("info", `<b>${this.sw}</b> MAC table cleared — it will flood until it learns again`, { obj: this.sw });
        return "";
    }

    reload() {
        const sh = this.sh;
        const confirm = () => {
            this.ask = {
                q: "Proceed with reload? [confirm]",
                on: a => {
                    if (a === "" || a[0] == "y") { this.sw.reboot(); return ""; }
                    return "";
                },
            };
        };
        if (this.sw.modified()) {
            this.ask = {
                q: "System configuration has been modified. Save? [yes/no]: ",
                on: a => {
                    let out = "";
                    if (a[0] == "y") out = this.save();
                    else if (a[0] != "n") { out = "% Please answer 'yes' or 'no'."; this.reload(); return out; }
                    confirm();
                    return out;
                },
            };
        } else confirm();
        return "";
    }

    // ---------------------------------------------------------------- show
    dotMac(mac) {
        const h = String(mac).replace(/[:-]/g, "").toLowerCase();
        return h.slice(0, 4) + "." + h.slice(4, 8) + "." + h.slice(8, 12);
    }

    showVersion() {
        const min = Math.floor((Date.now() - Vfs.bootOf(this.sw).getTime()) / 60000);
        return `NW IOS-style Software (lab edition), Version 15.2(7)E-lab\nTechnical Support: the lexicon (📖) of this lab\n\n` +
            `${this.sw.id} uptime is ${min} minute${min == 1 ? "" : "s"}\nSystem returned to ROM by power-on\nSystem image file is "flash:nw-ios.bin"\n\n` +
            `Model number : NW-IOS-${this.sw.ports.length}\n${this.sw.ports.length} Gigabit Ethernet interfaces\nConfiguration register is 0xF`;
    }

    showMac() {
        const rows = this.sw.macTable.filter(e => Sim.time - e.t <= Switch.AGING_MS)
            .sort((a, b) => a.vlan - b.vlan || this.sw.portNo(a.port) - this.sw.portNo(b.port))
            .map(e => `${String(e.vlan).padStart(4)}    ${this.dotMac(e.mac)}    DYNAMIC     ${this.sw.portName(e.port)}`);
        return "          Mac Address Table\n-------------------------------------------\n\n" +
            "Vlan    Mac Address       Type        Ports\n----    -----------       --------    -----\n" +
            (rows.length ? rows.join("\n") + "\n" : "") + `Total Mac Addresses for this criterion: ${rows.length}`;
    }

    showVlan() {
        const ids = [...new Set([...Object.keys(this.sw.vlanNames).map(Number), ...this.sw.ports.filter(p => !p.trunk).map(p => p.vlan)])].sort((a, b) => a - b);
        const rows = ids.map(v => {
            const ports = this.sw.ports.filter(p => !p.trunk && p.vlan == v).map(p => this.sw.portName(p)).join(", ");
            return `${String(v).padEnd(5)}${(this.sw.vlanNames[v] || "VLAN" + String(v).padStart(4, "0")).padEnd(33)}active    ${ports}`;
        });
        return "VLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n" + rows.join("\n") +
            (this.sw.ports.some(p => p.trunk) ? "\n\n(trunk ports carry every VLAN and are not listed here: show interfaces status)" : "");
    }

    ifStatus(p) {
        if (p.adminDown) return "disabled";
        return p.linkUp() ? "connected" : "notconnect";
    }

    showIfStatus() {
        return "Port      Name               Status       Vlan       Duplex  Speed Type\n" +
            this.sw.ports.map(p => `${this.sw.portName(p).padEnd(10)}${(p.desc || "").slice(0, 18).padEnd(19)}${this.ifStatus(p).padEnd(13)}` +
                `${(p.trunk ? "trunk" : String(p.vlan)).padEnd(11)}${p.linkUp() ? "a-full a-1000" : "  auto   auto"} 10/100/1000BaseTX`).join("\n");
    }

    showIf(name) {
        const p = this.port(name);
        if (!p) return "% Invalid input detected";
        const n = this.sw.portName(p, true);
        const up = p.linkUp();
        return `${n} is ${p.adminDown ? "administratively down" : up ? "up" : "down"}, line protocol is ${up ? "up (connected)" : "down (" + this.ifStatus(p) + ")"}\n` +
            (p.desc ? `  Description: ${p.desc}\n` : "") +
            `  Hardware is Gigabit Ethernet\n  ${up ? "Full-duplex, 1000Mb/s" : "Auto-duplex, Auto-speed"}, media type is 10/100/1000BaseTX\n` +
            `  ${p.stats.rx} packets input\n  ${p.stats.tx} packets output\n  ${p.stats.drop} input errors`;
    }

    config(s, name) {
        const lines = ["!", "version 15.2", "no service pad", "hostname " + name, "!"];
        Object.keys(s.vlanNames).map(Number).filter(v => v != 1).sort((a, b) => a - b).forEach(v => lines.push(`vlan ${v}`, ` name ${s.vlanNames[v]}`, "!"));
        s.ports.forEach((c, i) => {
            lines.push(`interface GigabitEthernet0/${i + 1}`);
            if (c.desc) lines.push(" description " + c.desc);
            if (c.trunk) lines.push(" switchport mode trunk");
            else if (c.vlan != 1) lines.push(` switchport access vlan ${c.vlan}`, " switchport mode access");
            if (c.down) lines.push(" shutdown");
            lines.push("!");
        });
        lines.push("line vty 0 4", " login local", " transport input ssh", "!", "end");
        return lines.join("\n");
    }

    showRun() {
        const txt = this.config(this.sw.snapshot(), this.sw.id.toString());
        return `Building configuration...\n\nCurrent configuration : ${txt.length} bytes\n` + txt;
    }

    showStart() {
        const s = this.sw.startup;
        const txt = this.config(s, s.name || this.sw.id.defaultName());
        return `Using ${txt.length} out of 65536 bytes\n` + txt;
    }
}
