// A small Wireshark: every frame that goes onto a cable is captured. The window shows
// the packet list, the packet details (the layers, field by field), the bytes, and
// explains what the selected field means. Display filters work like in Wireshark:
//   icmp   arp || dns   ip.addr == 192.168.1.2   eth.dst == ff:ff:ff:ff:ff:ff   !lldp
const Capture = {
    MAX: 5000,
    recs: [],          // everything captured
    shown: [],         // what the filter lets through
    running: false,
    t0: 0,             // capture start (Sim.total, never reset)
    n: 0,              // frame numbers
    filter: null,      // compiled display filter (null = all)
    filterText: "",
    iface: null,       // a Port: only the frames on its cable are shown (null = any)
    sel: null,         // selected record
    selField: null,    // selected field (index in wire.fields, or "f:<key>" for the Frame layer)
    open_: { frame: false }, // which tree nodes are open (by layer key)
    mark: null,        // the frame drawn highlighted on the canvas

    // ---------------------------------------------------------------- capturing
    // called by Patch.sendFrame: a frame goes onto a cable
    onSend(patch, frame, from) {
        if (!this.running) return;
        const to = patch.other(from);
        const rec = {
            no: ++this.n, t: Sim.total - this.t0, frame, patch, from, to,
            wire: frame.wire(), proto: frame.proto(), info: frame.infoText(),
        };
        rec.len = rec.wire.bytes.length;
        rec.link = this.portName(from) + " → " + this.portName(to);
        this.addresses(rec);
        this.analyse(rec);
        this.recs.push(rec);
        if (this.recs.length > this.MAX) {
            const old = this.recs.shift();
            if (this.shown[0] === old) this.shown.shift(), this.dropFirstRow();
        }
        if (this.visible(rec)) { this.shown.push(rec); this.addRow(rec); }
        this.status();
    },

    portName(p) {
        if (!p) return "?";
        if (p.host) return p.host + " " + p.id;
        const h = p.hub;
        if (!h) return String(p.id);
        return h + " " + (h.portName ? h.portName(p) : "port " + (h.ports.indexOf(p) + 1));
    },

    // the Source / Destination columns: IP addresses when there are any, else MAC addresses
    addresses(rec) {
        const f = rec.frame, p = f.payload;
        const mac = m => {
            m = String(m).toLowerCase();
            return m == "ff:ff:ff:ff:ff:ff" ? "Broadcast" : m == "01:80:c2:00:00:0e" ? "LLDP_Multicast" : m;
        };
        if (f.etherType == "IPv4") { rec.src = String(p.getValue("SrcIP")); rec.dst = String(p.getValue("DstIP")); }
        else { rec.src = mac(f.macSrc); rec.dst = mac(f.macDst); }
    },

    // request ⇄ response: ping, ARP, DNS, DHCP (Wireshark writes "[Response in: 15]")
    analyse(rec) {
        const f = rec.frame, p = f.payload;
        let key = null, isResp = false;
        if (rec.proto == "ICMP") {
            const ic = p.getPayload(), t = ic.getValue("Type");
            if (t == "EchoRequest" || t == "EchoReply") {
                key = "icmp " + ic.getValue("Identifier") + " " + ic.getValue("Seq");
                isResp = t == "EchoReply";
            }
        } else if (rec.proto == "ARP") {
            isResp = p.getValue("OpCode") == "ArpReply";
            key = isResp ? "arp " + p.getValue("SrcIP") + " " + p.getValue("DstIP") : "arp " + p.getValue("DstIP") + " " + p.getValue("SrcIP");
        } else if (rec.proto == "DNS") {
            const a = f.app();
            key = "dns " + a.id; isResp = !!a.qr;
        } else if (rec.proto == "DHCP") {
            const a = f.app();
            key = "dhcp " + a.xid + (a.type == "DISCOVER" || a.type == "OFFER" ? " d" : " r");
            isResp = a.op == 2;
        }
        if (!key) return;
        rec.key = key;
        rec.isResp = isResp;
        if (!isResp) return;
        // the request on the same cable, else anywhere
        let req = null;
        for (let i = this.recs.length - 1; i >= 0 && i > this.recs.length - 600; i--) {
            const r = this.recs[i];
            if (r.key != key || r.isResp) continue;
            if (r.patch == rec.patch) { req = r; break; }
            if (!req) req = r;
        }
        if (!req) return;
        rec.req = req.no;
        rec.rtt = rec.t - req.t;
        if (!req.resp || req.patch != this.byNo(req.resp)?.patch && req.patch == rec.patch) req.resp = rec.no;
    },

    byNo(no) {
        const r = this.recs, i = no - r[0]?.no;
        return r[i] && r[i].no == no ? r[i] : r.find(x => x.no == no);
    },

    start() {
        if (this.running) return;
        this.running = true;
        if (!this.recs.length) { this.t0 = Sim.total; this.n = 0; }
        this.sync();
    },

    stop() {
        this.running = false;
        this.sync();
    },

    clear() {
        this.recs = []; this.shown = []; this.n = 0; this.t0 = Sim.total;
        this.sel = null; this.selField = null; this.mark = null;
        if (this.el) { this.rows.innerHTML = ""; this.showDetails(); }
        this.status();
    },

    // ---------------------------------------------------------------- the fields a filter can use
    fields(rec) {
        if (rec.F) return rec.F;
        const F = {}, add = (k, v) => { if (v == null || v === "") return; (F[k] = F[k] || []).push(typeof v == "string" ? v.toLowerCase() : v); };
        const f = rec.frame, p = f.payload;
        add("frame", 1); add("frame.number", rec.no); add("frame.len", rec.len); add("frame.time_relative", rec.t / 1000);
        add("frame.interface", rec.link);
        add("eth", 1);
        add("eth.src", String(f.macSrc)); add("eth.dst", String(f.macDst));
        add("eth.addr", String(f.macSrc)); add("eth.addr", String(f.macDst));
        add("eth.type", { IPv4: 0x0800, ARP: 0x0806, LLDP: 0x88cc }[f.etherType] || 0);
        if (String(f.macDst).toLowerCase() == "ff:ff:ff:ff:ff:ff") add("eth.dst.ig", 1);
        if (f.vlan) { add("vlan", 1); add("vlan.id", f.vlan); }
        if (f.etherType == "ARP") {
            add("arp", 1);
            add("arp.opcode", p.getValue("OpCode") == "ArpRequest" ? 1 : 2);
            add("arp.src.hw_mac", String(p.getValue("SrcMAC"))); add("arp.src.proto_ipv4", String(p.getValue("SrcIP")));
            add("arp.dst.hw_mac", String(p.getValue("DstMAC"))); add("arp.dst.proto_ipv4", String(p.getValue("DstIP")));
        }
        if (f.etherType == "LLDP") {
            add("lldp", 1);
            add("lldp.chassis.id", String(p.getValue("ChassisID"))); add("lldp.port.id", String(p.getValue("PortID")));
            add("lldp.time_to_live", p.getValue("TTL") || 120); add("lldp.tlv.system.name", String(p.getValue("SystemName")));
            if (p.getValue("MgmtIP")) add("lldp.mgn.addr.ip4", String(p.getValue("MgmtIP")));
        }
        if (f.etherType == "IPv4") {
            add("ip", 1);
            const s = String(p.getValue("SrcIP")), d = String(p.getValue("DstIP"));
            add("ip.src", s); add("ip.dst", d); add("ip.addr", s); add("ip.addr", d);
            add("ip.ttl", p.getValue("TTL") || 64);
            add("ip.proto", { ICMP: 1, TCP: 6, UDP: 17 }[p.getValue("Protocol")] || 0);
            add("ip.id", p.ident || 0);
            const ipL = rec.wire.layers.find(l => l.key == "ip");
            if (ipL) add("ip.len", rec.len - ipL.start - (rec.wire.layers.find(l => l.key == "pad")?.len || 0) - 4);
            if (p.getValue("Protocol") == "ICMP") {
                const ic = p.getPayload();
                add("icmp", 1);
                add("icmp.type", Wire.ICMP_TYPES[ic.getValue("Type")]);
                add("icmp.code", ic.code || 0);
                if (ic.getValue("Type") == "EchoRequest" || ic.getValue("Type") == "EchoReply") {
                    add("icmp.ident", ic.getValue("Identifier") || 0); add("icmp.seq", ic.getValue("Seq") || 0);
                }
            }
            if (p.getValue("Protocol") == "UDP") {
                const u = p.getPayload(), a = u.getPayload();
                add("udp", 1);
                add("udp.srcport", u.getValue("SrcPort")); add("udp.dstport", u.getValue("DstPort"));
                add("udp.port", u.getValue("SrcPort")); add("udp.port", u.getValue("DstPort"));
                const ul = rec.wire.layers.find(l => l.key == "udp");
                if (ul) add("udp.length", ul.len + (rec.wire.layers.find(l => l.key == "dhcp" || l.key == "dns")?.len || 0));
                if (a && a.kind == "DHCP") {
                    add("dhcp", 1); add("bootp", 1);
                    add("dhcp.id", a.xid); add("dhcp.type", a.op);
                    add("dhcp.option.dhcp", DhcpMessage.TYPES[a.type]);
                    add("dhcp.ip.client", String(a.ciaddr)); add("dhcp.ip.your", String(a.yiaddr)); add("dhcp.ip.server", String(a.siaddr));
                    add("dhcp.hw.mac_addr", String(a.chaddr));
                }
                if (a && a.kind == "DNS") {
                    add("dns", 1); add("dns.id", a.id); add("dns.qry.name", a.qname);
                    add("dns.flags.response", a.qr ? 1 : 0); add("dns.flags.rcode", a.rcode || 0);
                    (a.answers || []).forEach(x => add("dns.a", String(x.ip)));
                }
            }
        }
        return (rec.F = F);
    },

    // the filter name of a field in the details tree (shown and used for "Apply as filter")
    FKEY: {
        eth: { Destination: "eth.dst", Source: "eth.src", Type: "eth.type" },
        vlan: { TPID: "vlan", TCI: "vlan.id" },
        arp: { "Hardware type": "arp.hw.type", "Protocol type": "arp.proto.type", "Hardware size": "arp.hw.size", "Protocol size": "arp.proto.size",
            Opcode: "arp.opcode", "Sender MAC": "arp.src.hw_mac", "Sender IP": "arp.src.proto_ipv4", "Target MAC": "arp.dst.hw_mac", "Target IP": "arp.dst.proto_ipv4" },
        ip: { "Version / IHL": "ip.version", "DSCP / ECN": "ip.dsfield", "Total length": "ip.len", Identification: "ip.id", "Flags / Fragment": "ip.flags",
            "Time to live": "ip.ttl", Protocol: "ip.proto", "Header checksum": "ip.checksum", "Source address": "ip.src", "Destination address": "ip.dst" },
        udp: { "Source port": "udp.srcport", "Destination port": "udp.dstport", Length: "udp.length", Checksum: "udp.checksum" },
        icmp: { Type: "icmp.type", Code: "icmp.code", Checksum: "icmp.checksum", Identifier: "icmp.ident", Sequence: "icmp.seq", Data: "data", "Original packet": "icmp.orig" },
        lldp: { "Chassis ID TLV": "lldp.chassis.id", "Port ID TLV": "lldp.port.id", "Time To Live TLV": "lldp.time_to_live", "System Name TLV": "lldp.tlv.system.name",
            "Capabilities TLV": "lldp.tlv.system_cap", "Management Address TLV": "lldp.mgn.addr.ip4", "End TLV": "lldp.end" },
        dhcp: { "Message type (op)": "dhcp.type", "Transaction ID": "dhcp.id", "Client IP (ciaddr)": "dhcp.ip.client", "Your IP (yiaddr)": "dhcp.ip.your",
            "Server IP (siaddr)": "dhcp.ip.server", "Client MAC (chaddr)": "dhcp.hw.mac_addr", "Option 53: message type": "dhcp.option.dhcp" },
        dns: { "Transaction ID": "dns.id", Flags: "dns.flags", "Query name": "dns.qry.name", "Answer RRs": "dns.count.answers" },
        pad: { Padding: "eth.padding" },
        fcs: { "FCS (CRC-32)": "eth.fcs" },
    },

    fieldKey(f) {
        const m = this.FKEY[f.layer.key] || {};
        if (m[f.name]) return m[f.name];
        if (f.layer.key == "dns" && f.name.startsWith("Answer:")) return "dns.a";
        return null;
    },

    // ---------------------------------------------------------------- display filter
    PROTOS: ["frame", "eth", "vlan", "arp", "ip", "icmp", "udp", "dhcp", "bootp", "dns", "lldp"],
    KNOWN: null,
    known() {
        if (this.KNOWN) return this.KNOWN;
        const s = new Set(this.PROTOS);
        ["frame.number", "frame.len", "frame.time_relative", "frame.interface", "eth.src", "eth.dst", "eth.addr", "eth.type", "eth.dst.ig", "vlan.id",
            "arp.opcode", "arp.src.hw_mac", "arp.src.proto_ipv4", "arp.dst.hw_mac", "arp.dst.proto_ipv4",
            "lldp.chassis.id", "lldp.port.id", "lldp.time_to_live", "lldp.tlv.system.name", "lldp.mgn.addr.ip4",
            "ip.src", "ip.dst", "ip.addr", "ip.ttl", "ip.proto", "ip.id", "ip.len",
            "icmp.type", "icmp.code", "icmp.ident", "icmp.seq",
            "udp.srcport", "udp.dstport", "udp.port", "udp.length",
            "dhcp.id", "dhcp.type", "dhcp.option.dhcp", "dhcp.ip.client", "dhcp.ip.your", "dhcp.ip.server", "dhcp.hw.mac_addr",
            "dns.id", "dns.qry.name", "dns.flags.response", "dns.flags.rcode", "dns.a"].forEach(k => s.add(k));
        return (this.KNOWN = s);
    },

    // returns { fn } or { error }
    compile(text) {
        text = text.trim();
        if (!text) return { fn: null };
        const toks = [], re = /\s*(\(|\)|&&|\|\||==|!=|>=|<=|>|<|!|"(?:[^"\\]|\\.)*"|[0-9a-f]{2}(?::[0-9a-f]{2}){5}\b|\d+\.\d+\.\d+\.\d+(?:\/\d+)?|0x[0-9a-f]+|-?\d+(?:\.\d+)?\b|[a-z_][a-z0-9_.\-]*|\S)/giy;
        let m;
        while (re.lastIndex < text.length && (m = re.exec(text))) if (m[1] != null) toks.push(m[1]);
        let i = 0;
        const peek = () => toks[i], next = () => toks[i++];
        const words = { and: "&&", or: "||", not: "!", eq: "==", ne: "!=", gt: ">", lt: "<", ge: ">=", le: "<=" };
        const norm = t => t == null ? t : (words[t.toLowerCase()] || t);
        const OPS = ["==", "!=", ">", "<", ">=", "<=", "contains"];
        const fail = msg => { throw new Error(msg); };
        const value = () => {
            const t = next();
            if (t == null) fail("a value is missing at the end");
            if (t.startsWith('"')) return { s: JSON.parse(t).toLowerCase() };
            if (/^\d+\.\d+\.\d+\.\d+(\/\d+)?$/.test(t)) {
                const [a, n] = t.split("/");
                return { ip: a, bits: n != null ? +n : 32, s: a };
            }
            if (/^0x[0-9a-f]+$/i.test(t)) return { n: parseInt(t, 16), s: t.toLowerCase() };
            if (/^-?\d+(\.\d+)?$/.test(t)) return { n: parseFloat(t), s: t };
            if (/^[()&|!=<>]/.test(t)) fail(`“${t}” — a value was expected here`);
            return { s: t.toLowerCase() };
        };
        const primary = () => {
            let t = norm(peek());
            if (t == null) fail("the filter ends too early");
            if (t == "(") { next(); const e = or(); if (next() != ")") fail("a “)” is missing"); return e; }
            if (t == "!") { next(); const e = primary(); return r => !e(r); }
            const name = next();
            if (!/^[a-z_][a-z0-9_.\-]*$/i.test(name)) fail(`“${name}” is not a field name`);
            const key = name.toLowerCase();
            if (!this.known().has(key)) fail(`“${name}” is neither a protocol nor a field name. Try: ${this.suggest(key)}`);
            const op = norm(peek());
            if (op && OPS.includes(op.toLowerCase())) {
                next();
                const v = value();
                return r => this.test(this.fields(r)[key], op.toLowerCase(), v);
            }
            return r => !!this.fields(r)[key];
        };
        const and = () => {
            let e = primary();
            while (norm(peek()) == "&&") { next(); const a = e, b = primary(); e = r => a(r) && b(r); }
            return e;
        };
        const or = () => {
            let e = and();
            while (norm(peek()) == "||") { next(); const a = e, b = and(); e = r => a(r) || b(r); }
            return e;
        };
        try {
            const fn = or();
            if (i < toks.length) fail(`“${toks[i]}” was not expected here (use && or || between two conditions)`);
            return { fn };
        } catch (e) { return { error: e.message }; }
    },

    suggest(key) {
        const p = key.split(".")[0];
        const list = [...this.known()].filter(k => k.startsWith(p + ".") || k == p);
        return (list.length ? list.slice(0, 6) : ["arp", "icmp", "ip.addr", "eth.addr", "dns", "dhcp"]).join(", ");
    },

    ipNum(a) { return String(a).split(".").reduce((n, x) => n * 256 + (+x & 255), 0); },

    test(vals, op, v) {
        if (!vals) return op == "!=" ? true : false;
        const one = x => {
            if (v.ip && /^\d+\.\d+\.\d+\.\d+$/.test(x)) {
                const mask = v.bits == 0 ? 0 : (0xffffffff << (32 - v.bits)) >>> 0;
                const a = (this.ipNum(x) & mask) >>> 0, b = (this.ipNum(v.ip) & mask) >>> 0;
                if (op == "==" || op == "!=") return a == b;
                const d = this.ipNum(x) - this.ipNum(v.ip);
                return op == ">" ? d > 0 : op == "<" ? d < 0 : op == ">=" ? d >= 0 : d <= 0;
            }
            if (op == "contains") return String(x).includes(v.s);
            const xn = typeof x == "number" ? x : NaN;
            if (v.n != null && !isNaN(xn)) {
                if (op == "==" || op == "!=") return xn == v.n;
                return op == ">" ? xn > v.n : op == "<" ? xn < v.n : op == ">=" ? xn >= v.n : xn <= v.n;
            }
            const xs = String(x);
            if (op == "==" || op == "!=") return xs == v.s;
            return op == ">" ? xs > v.s : op == "<" ? xs < v.s : op == ">=" ? xs >= v.s : xs <= v.s;
        };
        // "!=" is true when no value is equal (ip.addr != a: the address is neither the source nor the destination)
        if (op == "!=") return !vals.some(one);
        return vals.some(one);
    },

    visible(rec) {
        if (this.iface && rec.from !== this.iface && rec.to !== this.iface) return false;
        return !this.filter || this.filter(rec);
    },

    applyFilter(text) {
        const c = this.compile(text);
        if (c.error) { this.filterError(c.error); return false; }
        this.filterText = text.trim();
        this.filter = c.fn;
        if (this.el) {
            this.fin.value = this.filterText;
            this.fin.className = "ws-filter" + (this.filterText ? " ok" : "");
            this.fmsg.textContent = "";
        }
        this.refilter();
        return true;
    },

    refilter() {
        this.shown = this.recs.filter(r => this.visible(r));
        if (!this.el) return;
        this.rows.innerHTML = "";
        const frag = document.createDocumentFragment();
        this.shown.forEach(r => frag.appendChild(this.row(r)));
        this.rows.appendChild(frag);
        if (this.sel && !this.shown.includes(this.sel)) this.select(null);
        else if (this.sel) this.rowOf(this.sel)?.classList.add("sel");
        this.list.scrollTop = this.list.scrollHeight;
        this.status();
    },

    filterError(msg) {
        if (!this.el) return;
        this.fin.className = "ws-filter bad";
        this.fmsg.textContent = msg;
    },

    // ---------------------------------------------------------------- the window
    open(opts = {}) {
        if (!this.el) this.build();
        this.el.hidden = false;
        if (opts.iface !== undefined) this.setIface(opts.iface);
        if (opts.filter != null) this.applyFilter(opts.filter);
        if (!this.running && !this.recs.length) this.start();
        this.fillIfaces();
        this.sync();
        this.el.style.zIndex = ++Inspector.z;
        return this;
    },

    close() {
        if (this.el) this.el.hidden = true;
        this.mark = null;
    },

    EXAMPLES: [
        ["arp", "ARP: “who has this IP?” — “it's me, here is my MAC”"],
        ["icmp", "ping and traceroute, and the ICMP error messages"],
        ["icmp.type == 8", "only the ping requests (echo request)"],
        ["ip.addr == 192.168.1.2", "everything to or from one computer"],
        ["eth.dst == ff:ff:ff:ff:ff:ff", "broadcasts: every computer on the segment gets them"],
        ["ip.ttl < 64", "packets that have passed a router (the TTL got smaller)"],
        ["dhcp", "getting an address: Discover, Offer, Request, Ack"],
        ["dns", "name lookups and their answers"],
        ["lldp", "neighbours introducing themselves"],
        ["vlan", "frames with an 802.1Q tag (on a trunk)"],
        ["!lldp", "hide the LLDP chatter"],
        ["arp || icmp", "two protocols together"],
        ["ip.src == 192.168.1.0/24 && icmp", "pings from one subnet"],
    ],

    build() {
        const el = document.createElement("div");
        el.className = "ws";
        el.hidden = true;
        el.innerHTML = `
            <div class="ws-h"><span class="ws-logo">🦈</span><b>Wireshark</b><span class="ws-sub">frame capture</span>
                <button class="pop-x ws-x" title="Close">×</button></div>
            <div class="ws-tools">
                <button class="mini ws-run" title="Start / stop capturing"></button>
                <button class="mini ws-clear" title="Throw away the captured frames">Clear</button>
                <label class="ws-if" title="Which cable to watch">on <select class="ws-ifsel"></select></label>
                <span class="ws-sep"></span>
                <span class="ws-fwrap"><input class="ws-filter" spellcheck="false" autocomplete="off" placeholder="Apply a display filter … (e.g. icmp, arp, ip.addr == 192.168.1.2)">
                <button class="mini ws-ex" title="Example filters">▾</button>
                <div class="ws-exmenu" hidden>${this.EXAMPLES.map(([f, d]) => `<button data-f="${esc(f)}"><code>${esc(f)}</code><span>${esc(d)}</span></button>`).join("")}</div></span>
                <button class="mini ws-apply" title="Apply the filter (Enter)">Apply</button>
            </div>
            <div class="ws-fmsg"></div>
            <div class="ws-list" tabindex="0"><table><thead><tr><th class="c-no">No.</th><th class="c-t">Time</th><th class="c-a">Source</th><th class="c-a">Destination</th>
                <th class="c-p">Protocol</th><th class="c-l">Length</th><th class="c-link">Captured on</th><th>Info</th></tr></thead><tbody></tbody></table></div>
            <div class="ws-split" title="Drag to share the height"></div>
            <div class="ws-low">
                <div class="ws-tree" tabindex="0"></div>
                <div class="ws-explain"></div>
            </div>
            <div class="ws-hex"></div>
            <div class="ws-status"><span class="ws-s1"></span><span class="ws-s2"></span></div>`;
        document.body.appendChild(el);
        this.el = el;
        this.list = el.querySelector(".ws-list");
        this.rows = el.querySelector("tbody");
        this.tree = el.querySelector(".ws-tree");
        this.hex = el.querySelector(".ws-hex");
        this.ex = el.querySelector(".ws-explain");
        this.fin = el.querySelector(".ws-filter");
        this.fmsg = el.querySelector(".ws-fmsg");
        this.ifsel = el.querySelector(".ws-ifsel");
        this.btnRun = el.querySelector(".ws-run");
        this.s1 = el.querySelector(".ws-s1");
        this.s2 = el.querySelector(".ws-s2");

        el.querySelector(".ws-x").addEventListener("click", () => this.close());
        this.btnRun.addEventListener("click", () => this.running ? this.stop() : this.start());
        el.querySelector(".ws-clear").addEventListener("click", () => this.clear());
        el.querySelector(".ws-apply").addEventListener("click", () => this.applyFilter(this.fin.value));
        const exm = el.querySelector(".ws-exmenu");
        el.querySelector(".ws-ex").addEventListener("click", () => { exm.hidden = !exm.hidden; });
        exm.addEventListener("click", ev => {
            const b = ev.target.closest("[data-f]");
            if (!b) return;
            exm.hidden = true;
            this.applyFilter(b.dataset.f);
        });
        document.addEventListener("click", ev => { if (!ev.target.closest(".ws-fwrap")) exm.hidden = true; });
        this.fin.addEventListener("keydown", ev => {
            ev.stopPropagation();
            if (ev.key == "Enter") this.applyFilter(this.fin.value);
            if (ev.key == "Escape") { this.fin.value = ""; this.applyFilter(""); }
        });
        // while typing: green when it can be understood, red when not (like Wireshark)
        this.fin.addEventListener("input", () => {
            const c = this.compile(this.fin.value);
            this.fin.className = "ws-filter" + (!this.fin.value.trim() ? "" : c.error ? " bad" : " ok");
            this.fmsg.textContent = c.error && this.fin.value.trim() ? c.error : "";
        });
        this.ifsel.addEventListener("focus", () => this.fillIfaces());
        this.ifsel.addEventListener("pointerdown", () => this.fillIfaces());
        this.ifsel.addEventListener("change", () => {
            const p = this.ifaceList[+this.ifsel.value] || null;
            this.setIface(p);
        });

        this.rows.addEventListener("click", ev => {
            const tr = ev.target.closest("tr[data-no]");
            if (tr) this.select(this.byNo(+tr.dataset.no));
        });
        this.rows.addEventListener("dblclick", ev => {
            const tr = ev.target.closest("tr[data-no]");
            if (tr) { const r = this.byNo(+tr.dataset.no); if (r) Inspector.open(r.frame, { x: ev.clientX + 20, y: ev.clientY - 60 }); }
        });
        this.list.addEventListener("keydown", ev => {
            if (ev.key != "ArrowDown" && ev.key != "ArrowUp" && ev.key != "Home" && ev.key != "End") return;
            ev.preventDefault();
            ev.stopPropagation();
            let i = this.shown.indexOf(this.sel);
            i = ev.key == "Home" ? 0 : ev.key == "End" ? this.shown.length - 1 : i + (ev.key == "ArrowDown" ? 1 : -1);
            if (i < 0) i = 0;
            if (this.shown[i]) { this.select(this.shown[i]); this.keepIn(this.list, this.rowOf(this.sel)); }
        });
        this.tree.addEventListener("click", ev => {
            const go = ev.target.closest("[data-go]");
            if (go) { const r = this.byNo(+go.dataset.go); if (r) { this.reveal(r); } return; }
            const tg = ev.target.closest(".ws-tw");
            const node = ev.target.closest("[data-node]");
            if (tg && node) { this.open_[node.dataset.node] = !this.open_[node.dataset.node]; return this.showDetails(); }
            const fld = ev.target.closest("[data-f]");
            if (fld) { this.selField = fld.dataset.f; return this.showDetails(); }
            if (node) { this.selField = "L:" + node.dataset.node; this.showDetails(); }
        });
        this.tree.addEventListener("dblclick", ev => {
            const node = ev.target.closest("[data-node]");
            if (node && !ev.target.closest("[data-f]")) { this.open_[node.dataset.node] = !this.open_[node.dataset.node]; this.showDetails(); }
        });
        this.hex.addEventListener("click", ev => {
            const b = ev.target.closest("[data-b]");
            if (!b || !this.sel) return;
            const w = this.sel.wire, n = +b.dataset.b;
            const idx = w.fields.findIndex(f => n >= f.start && n < f.start + f.len);
            if (idx >= 0) { this.selField = String(idx); this.open_[w.fields[idx].layer.key] = true; this.showDetails(); }
        });
        this.ex.addEventListener("click", ev => {
            const b = ev.target.closest("[data-apply]");
            if (!b) return;
            const add = b.dataset.how, expr = b.dataset.apply;
            const cur = this.filterText;
            const text = add == "and" && cur ? `(${cur}) && ${expr}` : add == "not" ? `!(${expr})` : expr;
            if (add == "prep") { this.fin.value = text; this.fin.focus(); this.fin.dispatchEvent(new Event("input")); }
            else this.applyFilter(text);
        });
        // drag the window by its title, share the height with the splitter
        const h = el.querySelector(".ws-h");
        h.addEventListener("pointerdown", ev => {
            if (ev.target.closest("button")) return;
            el.style.zIndex = ++Inspector.z;
            const r = el.getBoundingClientRect(), sx = ev.clientX, sy = ev.clientY;
            const move = e => { el.style.left = Math.max(0, r.left + e.clientX - sx) + "px"; el.style.top = Math.max(0, r.top + e.clientY - sy) + "px"; el.style.right = "auto"; };
            const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
        });
        el.addEventListener("pointerdown", () => { el.style.zIndex = ++Inspector.z; });
        const sp = el.querySelector(".ws-split");
        sp.addEventListener("pointerdown", ev => {
            ev.preventDefault();
            const sy = ev.clientY, h0 = this.list.offsetHeight;
            const move = e => { this.list.style.flexBasis = Math.max(60, h0 + e.clientY - sy) + "px"; };
            const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
        });
        this.refilter();
        this.showDetails();
    },

    // the cables one can watch: every connected NIC and switch port
    fillIfaces() {
        if (!this.el) return;
        const list = [];
        App.devices().forEach(d => (d.nics || d.ports || []).forEach(p => { if (p.patch) list.push(p); }));
        this.ifaceList = list;
        const cur = this.iface;
        this.ifsel.innerHTML = `<option value="-1">any (all cables)</option>` +
            list.map((p, i) => `<option value="${i}"${p === cur ? " selected" : ""}>${esc(this.portName(p))} ⇄ ${esc(this.portName(p.peer()))}</option>`).join("");
        if (cur && !list.includes(cur)) { this.iface = null; this.refilter(); }
    },

    setIface(p) {
        this.iface = p || null;
        if (this.el) this.fillIfaces();
        this.refilter();
    },

    sync() {
        if (!this.el) return;
        this.btnRun.textContent = this.running ? "■ Stop" : "● Start";
        this.btnRun.classList.toggle("on", this.running);
        this.status();
    },

    status() {
        if (!this.el || this.el.hidden) return;
        const a = this.recs.length, d = this.shown.length;
        this.s1.textContent = `${this.running ? "● capturing" : "■ stopped"} on ${this.iface ? this.portName(this.iface) : "any"} · Packets: ${a} · Displayed: ${d}` +
            (a ? ` (${(d / a * 100).toFixed(1)}%)` : "");
    },

    // ---------------------------------------------------------------- the packet list
    rowClass(rec) {
        const f = rec.frame;
        if (f.isError()) return "err";
        return { ARP: "arp", ICMP: "icmp", LLDP: "lldp", DHCP: "dhcp", DNS: "dns", UDP: "udp" }[rec.proto] || "ip";
    },

    row(rec) {
        const tr = document.createElement("tr");
        tr.dataset.no = rec.no;
        tr.className = "r-" + this.rowClass(rec) + (rec === this.sel ? " sel" : "");
        const proto = rec.proto == "IPv4" ? "IPv4" : rec.proto;
        const link = rec.req ? "↩ " : rec.resp ? "→ " : "";
        tr.innerHTML = `<td class="c-no">${rec.no}</td><td class="c-t">${(rec.t / 1000).toFixed(3)}</td><td class="c-a">${esc(rec.src)}</td><td class="c-a">${esc(rec.dst)}</td>` +
            `<td class="c-p">${esc(proto)}${rec.frame.vlan ? ` <span class="ws-vl">V${rec.frame.vlan}</span>` : ""}</td><td class="c-l">${rec.len}</td><td class="c-link">${esc(rec.link)}</td><td class="c-i">${link}${esc(rec.info)}</td>`;
        return tr;
    },

    // scroll only this pane (vertically) so that el is visible — the page and the other panes stay put
    keepIn(box, el) {
        if (!box || !el) return;
        const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
        const top = box === this.list ? (box.querySelector("thead")?.offsetHeight || 0) : 0;
        if (r.top < b.top + top) box.scrollTop -= b.top + top - r.top + 4;
        else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 4;
    },

    rowOf(rec) { return rec && this.rows.querySelector(`tr[data-no="${rec.no}"]`); },

    addRow(rec) {
        if (!this.el || this.el.hidden && this.shown.length > 2000) return;
        const atEnd = this.list.scrollTop + this.list.clientHeight >= this.list.scrollHeight - 30;
        this.rows.appendChild(this.row(rec));
        if (atEnd) this.list.scrollTop = this.list.scrollHeight;
    },

    dropFirstRow() { if (this.el && this.rows.firstChild) this.rows.firstChild.remove(); },

    // a response / request link in the details: jump there
    reveal(rec) {
        if (!this.shown.includes(rec)) { this.filter = null; this.filterText = ""; this.fin.value = ""; this.fin.className = "ws-filter"; this.iface = null; this.fillIfaces(); this.refilter(); }
        this.select(rec);
        this.keepIn(this.list, this.rowOf(rec));
    },

    select(rec) {
        if (this.el) this.rows.querySelectorAll("tr.sel").forEach(t => t.classList.remove("sel"));
        this.sel = rec;
        if (!rec) { this.selField = null; this.mark = null; return this.showDetails(); }
        this.rowOf(rec)?.classList.add("sel");
        // keep the same kind of field selected when stepping through frames
        if (this.selField && !this.selField.startsWith("L:") && !this.selField.startsWith("f:")) {
            const old = this.lastFieldName;
            const idx = rec.wire.fields.findIndex(f => old && f.name == old.name && f.layer.key == old.key);
            this.selField = idx >= 0 ? String(idx) : null;
        }
        this.showDetails();
    },

    // ---------------------------------------------------------------- details, bytes, explanation
    LAYER_DESC: {
        frame: "<b>Frame</b> is not a part of the bytes: it is what the capture program knows about this frame — when it was seen, how long it is and on which cable. Wireshark always shows it first.",
    },

    summary(rec, L) {
        const f = rec.frame, p = f.payload;
        switch (L.key) {
            case "eth": return L.name == "Ethernet II" ? `Ethernet II, Src: ${f.macSrc}, Dst: ${f.macDst}${Wire.macNote(String(f.macDst).toLowerCase())}` : "Ethernet II (type)";
            case "vlan": return `802.1Q Virtual LAN, PRI: 0, DEI: 0, ID: ${f.vlan}`;
            case "arp": return `Address Resolution Protocol (${p.getValue("OpCode") == "ArpRequest" ? "request" : "reply"})`;
            case "ip": return `Internet Protocol Version 4, Src: ${p.getValue("SrcIP")}, Dst: ${p.getValue("DstIP")}`;
            case "icmp": return "Internet Control Message Protocol";
            case "udp": { const u = p.getPayload(); return `User Datagram Protocol, Src Port: ${u.getValue("SrcPort")}, Dst Port: ${u.getValue("DstPort")}`; }
            case "dhcp": return `Dynamic Host Configuration Protocol (${f.app().type[0] + f.app().type.slice(1).toLowerCase()})`;
            case "dns": return `Domain Name System (${f.app().qr ? "response" : "query"})`;
            case "lldp": return "Link Layer Discovery Protocol";
            case "pad": return `Padding: ${L.len} bytes`;
            case "fcs": return "Frame check sequence (CRC-32)";
        }
        return L.name;
    },

    protoStack(rec) {
        const k = rec.wire.layers.map(l => l.key).filter(k => k != "pad" && k != "fcs");
        const out = [];
        k.forEach(x => { if (out[out.length - 1] != x) out.push(x); });
        return out.join(":") + (rec.proto == "ICMP" ? ":data" : "");
    },

    // the "Frame" node: what the capture knows
    frameFields(rec) {
        const i = this.shown.indexOf(rec), prev = i > 0 ? this.shown[i - 1] : null;
        const F = [
            ["Arrival time", `${(rec.t / 1000).toFixed(3)} s after the capture started`, "frame.time_relative",
                "When the frame was put onto the cable, counted in <b>simulated</b> seconds from the start of the capture (the animation is much slower than a real network)."],
            ["Time since previous displayed frame", prev ? `${((rec.t - prev.t) / 1000).toFixed(3)} s` : "0.000 s", "frame.time_delta_displayed",
                "How long after the frame above it in the list. Handy to see who answers how fast."],
            ["Frame number", String(rec.no), "frame.number", "Every captured frame gets the next number. The filter can hide some, but the numbers stay the same."],
            ["Frame length", `${rec.len} bytes (${rec.len * 8} bits)`, "frame.len", "All the bytes of the frame on the cable, from the destination MAC to the FCS. (The 8-byte preamble that announces every frame is not counted.)"],
            ["Captured on", `${rec.link}`, "frame.interface", "Which cable it was seen on, and in which direction. A switch forwards the frame onto another cable — that is a new line in the list, with the same content (or a VLAN tag added or removed)."],
            ["Protocols in frame", this.protoStack(rec), "frame.protocols", "The layers inside each other, from the outside in. This is <b>encapsulation</b>: each layer carries the next one as its data."],
            ["Coloring rule", this.rowClass(rec).toUpperCase(), null, "The colour of the line in the list shows the protocol, so you can see at a glance what is going on. Red: an error message."],
        ];
        const fr = rec.frame;
        F.push(["State now", fr.stateText ? fr.stateText() : fr.state, null, "Where this frame is now in the simulation. While it is still on its way it glows on the canvas when it is selected here."]);
        return F;
    },

    analysisLines(rec) {
        const out = [];
        if (rec.resp) out.push([`[Response in frame: ${rec.resp}]`, rec.resp, this.respHelp(rec)]);
        if (rec.req) out.push([`[Request in frame: ${rec.req}]`, rec.req, this.respHelp(rec)]);
        if (rec.req && rec.rtt != null) out.push([`[Response time: ${(rec.rtt / 1000).toFixed(3)} s]`, null, "How long the answer took: from the question on this cable to the answer on this cable (simulated seconds)."]);
        return out;
    },

    respHelp(rec) {
        return {
            ICMP: "A ping question and its answer belong together: the same <b>Identifier</b> and <b>Sequence</b> number. Click to jump to the other one.",
            ARP: "The ARP question (<i>who has …?</i>) and the answer (<i>… is at …</i>) belong together. Click to jump to the other one.",
            DNS: "The DNS question and its answer carry the same <b>Transaction ID</b>. Click to jump to the other one.",
            DHCP: "DHCP messages of one dialog carry the same <b>Transaction ID</b>: Discover → Offer, Request → Ack. Click to jump to the other one.",
        }[rec.proto] || "";
    },

    showDetails() {
        if (!this.el) return;
        const rec = this.sel;
        this.mark = rec && (rec.frame.state == "wire" || rec.frame.state == "queued") ? rec.frame : null;
        if (!rec) {
            this.tree.innerHTML = `<div class="ws-empty">Click a line in the list above to see what is inside that frame.</div>`;
            this.hex.innerHTML = "";
            this.ex.innerHTML = this.intro();
            this.s2.textContent = "";
            return;
        }
        const w = rec.wire, sf = this.selField;
        let sel = null; // {start, len, desc, name, key, value, layer}
        const node = (key, title, inner, s, l) => {
            const open = !!this.open_[key];
            const on = sf == "L:" + key;
            if (on) sel = { start: s, len: l, layerKey: key };
            return `<div class="ws-n" data-node="${key}"><div class="ws-nh${on ? " on" : ""}"${s != null ? ` data-s="${s}" data-l="${l}"` : ""}><span class="ws-tw">${open ? "▾" : "▸"}</span>${title}</div>` +
                (open ? `<div class="ws-nb">${inner}</div>` : "") + `</div>`;
        };
        // Frame
        const ff = this.frameFields(rec);
        let html = node("frame", esc(`Frame ${rec.no}: ${rec.len} bytes on wire (${rec.len * 8} bits), captured on ${rec.link}`),
            ff.map(([n, v, k], i) => {
                const on = sf == "f:" + i;
                if (on) sel = { frame: ff[i] };
                return `<div class="ws-f${on ? " on" : ""}" data-f="f:${i}"><span class="fn">${esc(n)}:</span> <span class="fv">${esc(v)}</span></div>`;
            }).join(""), null, null);
        // the layers (Ethernet header, maybe the VLAN tag, the rest of Ethernet, ARP/IP/…, padding, FCS)
        w.layers.forEach((L, li) => {
            const key = L.key + (w.layers.findIndex(x => x.key == L.key) == li ? "" : li);
            if (this.open_[key] === undefined) this.open_[key] = !["eth", "pad", "fcs"].includes(L.key);
            const inner = L.fields.map(f => {
                const idx = w.fields.indexOf(f), on = sf == String(idx);
                if (on) sel = { start: f.start, len: f.len, field: f };
                return `<div class="ws-f${on ? " on" : ""}" data-f="${idx}" style="--c:${L.color}"><span class="fn">${esc(f.name)}:</span> <span class="fv">${esc(f.value)}</span></div>`;
            }).join("") + (["icmp", "arp", "dns", "dhcp"].includes(L.key) ? this.analysisLines(rec).map(([t, go]) =>
                `<div class="ws-f ws-an"${go ? ` data-go="${go}"` : ""}>${esc(t)}</div>`).join("") : "");
            html += node(key, `<span class="ws-dot" style="--c:${L.color}"></span>${esc(this.summary(rec, L))}`, inner, L.start, L.len);
        });
        this.tree.innerHTML = html;
        if (sel && (sel.field || sel.layerKey)) this.lastFieldName = sel.field ? { name: sel.field.name, key: sel.field.layer.key } : null;
        // bytes
        let hex = "";
        const hs = sel && sel.start != null ? sel.start : -1, hl = sel && sel.len != null ? sel.len : 0;
        for (let r = 0; r < w.bytes.length; r += 16) {
            let bytes = "", asc = "";
            for (let i = r; i < Math.min(r + 16, w.bytes.length); i++) {
                const c = (w.fields.find(f => i >= f.start && i < f.start + f.len) || { layer: { color: "#999" } }).layer.color;
                const b = w.bytes[i], on = i >= hs && i < hs + hl ? " on" : "";
                bytes += `<span data-b="${i}" class="b${on}${i % 16 == 8 ? " g" : ""}" style="--c:${c}">${b.toString(16).padStart(2, "0")}</span>`;
                asc += `<span data-b="${i}" class="b${on}" style="--c:${c}">${b >= 32 && b < 127 ? esc(String.fromCharCode(b)) : "·"}</span>`;
            }
            hex += `<div class="ws-hr"><span class="off">${r.toString(16).padStart(4, "0")}</span><span class="by">${bytes}</span><span class="as">${asc}</span></div>`;
        }
        this.hex.innerHTML = hex;
        this.keepIn(this.hex, this.hex.querySelector(".b.on"));
        this.keepIn(this.tree, this.tree.querySelector(".on"));
        this.explain(rec, sel);
    },

    intro() {
        return `<div class="ws-ex-h">How to read this window</div>
            <p><b>Top:</b> every frame that went onto a cable, one line each. The colour shows the protocol.</p>
            <p><b>Left:</b> the frame taken apart, layer by layer — the outer Ethernet envelope, inside it IP or ARP, inside IP the ICMP or UDP message. Click ▸ to open a layer.</p>
            <p><b>Right:</b> what the clicked field means. <b>Bottom:</b> the real bytes; the clicked field lights up.</p>
            <p>Type a <b>display filter</b> to see only some frames: <code>icmp</code>, <code>arp</code>, <code>ip.addr == 192.168.1.2</code>, <code>!lldp</code> — or pick one with ▾.</p>
            <p>Try: <code>ping</code> in the terminal, then click the lines.</p>`;
    },

    explain(rec, sel) {
        const ex = this.ex;
        const apply = (key) => {
            if (!key) return "";
            this.s2.textContent = key;
            let expr;
            if (this.known().has(key)) {
                const v = (this.fields(rec)[key] || [])[0];
                if (v == null || this.PROTOS.includes(key)) expr = key;
                else if (key == "eth.type") expr = `${key} == 0x${v.toString(16).padStart(4, "0")}`;
                else expr = `${key} == ${typeof v == "number" || /^[\d.]+$|^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/.test(v) ? v : JSON.stringify(v)}`;
            } else expr = key.split(".")[0]; // not filterable here: its protocol
            if (!this.known().has(expr.split(" ")[0])) return `<div class="ws-ap"><span class="ws-key">${esc(key)}</span></div>`;
            return `<div class="ws-ap"><span class="ws-key" title="the name of this field in a display filter">${esc(key)}</span>
                <button class="mini" data-apply="${esc(expr)}" title="Show only frames like this">Apply as filter</button>
                <button class="mini" data-apply="${esc(expr)}" data-how="and" title="Add to the current filter with &&">…and selected</button>
                <button class="mini" data-apply="${esc(expr)}" data-how="not" title="Hide frames like this">Not</button>
                <button class="mini" data-apply="${esc(expr)}" data-how="prep" title="Put it into the filter box to change it">Prepare</button>
                <div class="ws-expr"><code>${esc(expr)}</code></div></div>`;
        };
        let html = "";
        this.s2.textContent = "";
        if (!sel) {
            const L = rec.wire.layers.filter(l => !["eth", "pad", "fcs"].includes(l.key)).pop() || rec.wire.layers[0];
            html = `<div class="ws-ex-h">${esc(rec.info)}</div><p>${L.desc}</p>${this.story(rec)}<p class="ws-dim">Click a field on the left (or a byte below) to see what it means.</p>`;
        } else if (sel.frame) {
            const [n, v, key, d] = sel.frame;
            html = `<div class="ws-ex-h">${esc(n)}</div><div class="ws-val">${esc(v)}</div><p>${d}</p>${apply(key)}`;
        } else if (sel.field) {
            const f = sel.field;
            html = `<div class="ws-ex-h" style="--c:${f.layer.color}"><span class="ws-dot"></span>${esc(f.name)}</div><div class="ws-val">${esc(f.value)}</div><p>${f.desc}</p>
                <p class="ws-dim mono">${esc(f.layer.name)} · bytes ${f.start}–${f.start + f.len - 1} · ${f.len} byte${f.len > 1 ? "s" : ""}</p>${apply(this.fieldKey(f))}`;
        } else if (sel.layerKey) {
            const L = rec.wire.layers.find(l => l.start == sel.start) || rec.wire.layers[0];
            const key = { eth: "eth", vlan: "vlan", arp: "arp", ip: "ip", icmp: "icmp", udp: "udp", dhcp: "dhcp", dns: "dns", lldp: "lldp" }[L.key];
            html = `<div class="ws-ex-h" style="--c:${L.color}"><span class="ws-dot"></span>${esc(L.name)}</div><p>${L.desc}</p>
                <p class="ws-dim mono">bytes ${sel.start}–${sel.start + sel.len - 1} · ${sel.len} bytes · ${L.fields.length} fields</p>` + (key ? `<div class="ws-ap"><button class="mini" data-apply="${key}">Apply as filter</button> <code>${key}</code></div>` : "");
        }
        ex.innerHTML = html;
        if (typeof Lexicon != "undefined") Lexicon.linkify(ex);
    },

    // one or two sentences: what this frame does in the story
    story(rec) {
        const f = rec.frame, p = f.payload;
        const bc = String(f.macDst).toLowerCase() == "ff:ff:ff:ff:ff:ff";
        switch (rec.proto) {
            case "ARP": return p.getValue("OpCode") == "ArpRequest"
                ? `<p>${esc(p.getValue("SrcIP"))} wants to send something to ${esc(p.getValue("DstIP"))}, but it does not know its MAC address. It asks <b>everybody</b> (broadcast): the one with that IP will answer.</p>`
                : `<p>The answer: ${esc(p.getValue("SrcIP"))} tells its MAC address directly to the one who asked (unicast). Both write it into their ARP cache.</p>`;
            case "ICMP": {
                if (f.isError()) return `<p>A router or a host reports a problem back to the sender. The message quotes the beginning of the failed packet, so the sender knows which one it was.</p>`;
                return f.isReply() ? `<p>The answer to a ping: the data comes back unchanged. The time between question and answer is the round-trip time ping prints.</p>`
                    : `<p>A ping question: “are you there?”. Look at the TTL in the IP layer — every router makes it one smaller.</p>`;
            }
            case "DHCP": return `<p>A computer without an address gets one: Discover (who can give me an address?) → Offer → Request → Ack. ${bc ? "This one is a broadcast — the client has no IP address yet." : ""}</p>`;
            case "DNS": return f.app().qr ? `<p>The DNS server answers with the IP address of the name.</p>` : `<p>A program wants to reach a name; the computer asks its DNS server for the IP address.</p>`;
            case "LLDP": return `<p>Every 30 seconds lldpd says hello on each cable: “I am …, this is my port …”. Switches never pass it on, so only the direct neighbour hears it.</p>`;
        }
        return "";
    },
};

// every frame that goes onto a cable passes here
(() => {
    const send = Patch.prototype.sendFrame;
    Patch.prototype.sendFrame = function (frame, senderPort) {
        send.call(this, frame, senderPort);
        try { Capture.onSend(this, frame, senderPort); } catch (e) { Debug.error("Capture", "onSend", e.message); }
    };
})();
