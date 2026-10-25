// Turns a simulated Frame into the bytes that would really be on the wire,
// with every field annotated, so popups can show a Wireshark-like dissection.
class Wire {
    static CRC_TABLE = (() => {
        const t = [];
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            t[n] = c >>> 0;
        }
        return t;
    })();

    static crc32(bytes) {
        let c = 0xffffffff;
        bytes.forEach(b => { c = Wire.CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); });
        return (c ^ 0xffffffff) >>> 0;
    }

    static checksum(bytes) { // Internet checksum (RFC 1071)
        let s = 0;
        for (let i = 0; i < bytes.length; i += 2) s += (bytes[i] << 8) + (bytes[i + 1] || 0);
        while (s >> 16) s = (s & 0xffff) + (s >> 16);
        return (~s) & 0xffff;
    }

    static mac(m) { return String(m).split(":").map(h => parseInt(h, 16) & 255); }
    static ip(a) { return String(a).split(".").map(n => parseInt(n, 10) & 255); }
    static u16(n) { return [(n >> 8) & 255, n & 255]; }
    static u32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
    static ascii(s) { return [...String(s)].map(c => c.charCodeAt(0) & 255); }
    static hex(n, d = 2) { return "0x" + n.toString(16).padStart(d, "0"); }

    static macNote(m) {
        m = String(m).toLowerCase();
        if (m == "ff:ff:ff:ff:ff:ff") return " (Broadcast)";
        if (m == "01:80:c2:00:00:0e") return " (LLDP multicast)";
        if (m == "00:00:00:00:00:00") return " (unknown — that's the question!)";
        return "";
    }

    static etherDesc(t) {
        return "<b>EtherType</b> tells the receiving NIC driver which protocol is inside the frame, " +
            "so it can hand the payload to the right handler: <code>0x0800</code> IPv4, " +
            "<code>0x0806</code> ARP, <code>0x88cc</code> LLDP. Here: <b>" + t + "</b>.";
    }

    // Short Wireshark-style "Info" column text
    static info(frame) {
        const p = frame.payload;
        if (frame.etherType == "ARP") {
            if (p.getValue("OpCode") == "ArpRequest")
                return "Who has " + p.getValue("DstIP") + "? Tell " + p.getValue("SrcIP");
            return p.getValue("SrcIP") + " is at " + p.getValue("SrcMAC");
        }
        if (frame.etherType == "LLDP") {
            return "LLDP " + p.getValue("SystemName") + " / " + p.getValue("PortID") + "  TTL " + (p.getValue("TTL") || 120);
        }
        if (frame.etherType == "IPv4" && p.getValue("Protocol") == "UDP") {
            const d = p.getPayload(), app = d.getPayload();
            if (app && app.kind == "DHCP") {
                const t = app.type[0] + app.type.slice(1).toLowerCase();
                return "DHCP " + t + " - Transaction ID " + Wire.hex(app.xid, 8) + (app.yiaddr != "0.0.0.0" ? "  (" + app.yiaddr + ")" : "");
            }
            if (app && app.kind == "DNS") {
                if (!app.qr) return "Standard query " + Wire.hex(app.id, 4) + " A " + app.qname;
                if (app.rcode == 3) return "Standard query response " + Wire.hex(app.id, 4) + " No such name A " + app.qname;
                return "Standard query response " + Wire.hex(app.id, 4) + " A " + app.qname + " A " + app.answers.map(a => a.ip).join(", ");
            }
            return "UDP " + d.getValue("SrcPort") + " → " + d.getValue("DstPort");
        }
        if (frame.etherType == "IPv4" && p.getValue("Protocol") == "TCP") {
            const seg = p.getPayload();
            if (seg.data) return seg.data.map(m => m.info()).join(", ");
            return `${seg.sp} → ${seg.dp} [${seg.flags.split(",").join(", ")}] Seq=${seg.rel.seq}` + (seg.flags.includes("ACK") ? ` Ack=${seg.rel.ack}` : "") + " Win=64240 Len=0";
        }
        if (frame.etherType == "IPv4") {
            const icmp = p.getPayload();
            if (p.getValue("Protocol") == "ICMP" && icmp && icmp.getValue("Type") == "TimeExceeded")
                return "Time-to-live exceeded  " + p.getValue("SrcIP") + " → " + p.getValue("DstIP");
            if (p.getValue("Protocol") == "ICMP" && icmp && icmp.getValue("Type") == "DestUnreachable")
                return "Destination unreachable (" + (icmp.code == 1 ? "Host" : "Network") + " unreachable)  " + p.getValue("SrcIP") + " → " + p.getValue("DstIP");
            if (p.getValue("Protocol") == "ICMP" && icmp) {
                const req = icmp.getValue("Type") == "EchoRequest";
                return "Echo (ping) " + (req ? "request" : "reply") + "  " + p.getValue("SrcIP") + " → " +
                    p.getValue("DstIP") + "  seq=" + icmp.getValue("Seq");
            }
            return "IPv4 " + p.getValue("SrcIP") + " → " + p.getValue("DstIP");
        }
        return frame.etherType;
    }

    static encode(frame) {
        const out = { bytes: [], fields: [], layers: [] };
        let layer = null;
        const begin = (name, key, color, desc) => {
            layer = { name, key, color, start: out.bytes.length, len: 0, desc, fields: [] };
            out.layers.push(layer);
        };
        const end = () => { layer.len = out.bytes.length - layer.start; };
        const field = (name, bytes, value, desc) => {
            const f = { name, start: out.bytes.length, len: bytes.length, value, desc, layer };
            out.bytes.push(...bytes);
            out.fields.push(f);
            layer.fields.push(f);
            return f;
        };

        const dst = String(frame.macDst).toLowerCase(), src = String(frame.macSrc).toLowerCase();
        const et = { IPv4: 0x0800, ARP: 0x0806, LLDP: 0x88cc }[frame.etherType] || 0;

        // ---- Layer 2: Ethernet II header ----
        begin("Ethernet II", "eth", COLORS.ETH,
            "Layer 2. The Ethernet header carries the hardware (MAC) addresses of the receiver and the sender.");
        field("Destination", Wire.mac(dst), dst + Wire.macNote(dst),
            "<b>Destination MAC</b> — which network card should take this frame. Every NIC compares it with its own " +
            "address and silently drops frames that are not for it. <code>ff:ff:ff:ff:ff:ff</code> means " +
            "<i>everybody</i> (broadcast).");
        field("Source", Wire.mac(src), src,
            "<b>Source MAC</b> — the hardware address of the sending NIC. Receivers learn it, " +
            "so they know where to send the answer.");
        if (frame.vlan) {
            end();
            begin("802.1Q VLAN tag", "vlan", COLORS.VLAN,
                "A 4-byte label squeezed into the Ethernet header between switches (on a trunk), saying which VLAN the frame belongs to.");
            field("TPID", Wire.u16(0x8100), "0x8100 (802.1Q)",
                "<b>Tag protocol identifier</b> — 0x8100 sits where the EtherType normally is and says: <i>a VLAN tag follows</i>.");
            field("TCI", Wire.u16(frame.vlan & 0x0fff), "priority 0, VLAN " + frame.vlan,
                "<b>Tag control information</b> — 3 bits priority, 1 bit DEI, and 12 bits <b>VLAN ID</b> (1–4094). Here: VLAN " + frame.vlan + ". The last switch removes the tag before the frame reaches a computer.");
            end();
            begin("Ethernet II (type)", "eth", COLORS.ETH, "The rest of the Ethernet header.");
        }
        field("Type", Wire.u16(et), Wire.hex(et, 4) + " (" + frame.etherType + ")", Wire.etherDesc(frame.etherType));
        end();

        const p = frame.payload;
        if (frame.etherType == "ARP") Wire.encodeArp(p, begin, field, end);
        else if (frame.etherType == "LLDP") Wire.encodeLldp(p, begin, field, end);
        else if (frame.etherType == "IPv4") Wire.encodeIpv4(p, begin, field, end);

        const n = out.bytes.length;
        if (n < 60) {
            begin("Padding", "pad", COLORS.PAD, "Filler zeros added by the sender's NIC.");
            field("Padding", new Array(60 - n).fill(0), (60 - n) + " zero bytes",
                "<b>Padding</b> — an Ethernet frame must be at least 64 bytes long (60 + 4 FCS), so that a " +
                "collision on a shared hub segment is always noticed while the frame is still being sent. " +
                "Short frames like ARP are padded with zeros.");
            end();
        }
        const crc = Wire.crc32(out.bytes);
        begin("Frame check", "fcs", COLORS.FCS, "Trailer");
        field("FCS (CRC-32)", [crc & 255, (crc >>> 8) & 255, (crc >>> 16) & 255, crc >>> 24], Wire.hex(crc, 8),
            "<b>Frame Check Sequence</b> — a CRC-32 checksum of the whole frame. The receiving NIC recomputes it; " +
            "if a single bit was damaged on the cable, the numbers differ and the frame is thrown away.");
        end();
        return out;
    }

    static encodeArp(p, begin, field, end) {
        const req = p.getValue("OpCode") == "ArpRequest";
        begin("ARP", "arp", COLORS.ARP,
            "Address Resolution Protocol: translates an IPv4 address into a MAC address on the local network.");
        field("Hardware type", Wire.u16(1), "1 (Ethernet)", "<b>Hardware type</b> 1 = Ethernet. ARP can work on other networks too.");
        field("Protocol type", Wire.u16(0x0800), "0x0800 (IPv4)", "<b>Protocol type</b> — we resolve IPv4 addresses.");
        field("Hardware size", [6], "6", "<b>Hardware address length</b> — a MAC address is 6 bytes.");
        field("Protocol size", [4], "4", "<b>Protocol address length</b> — an IPv4 address is 4 bytes.");
        field("Opcode", Wire.u16(req ? 1 : 2), req ? "request (1)" : "reply (2)",
            "<b>Opcode</b> 1 = request (<i>who has this IP?</i>), 2 = reply (<i>I have it, here is my MAC</i>).");
        field("Sender MAC", Wire.mac(p.getValue("SrcMAC")), String(p.getValue("SrcMAC")),
            "<b>Sender MAC</b> — receivers that need it store this in their ARP cache.");
        field("Sender IP", Wire.ip(p.getValue("SrcIP")), p.getValue("SrcIP"), "<b>Sender IP</b> — the IP that belongs to the sender MAC.");
        field("Target MAC", Wire.mac(p.getValue("DstMAC")), String(p.getValue("DstMAC")) + Wire.macNote(p.getValue("DstMAC")),
            req ? "<b>Target MAC</b> — all zeros, because this is exactly what the sender wants to find out."
                : "<b>Target MAC</b> — the MAC of the host that asked.");
        field("Target IP", Wire.ip(p.getValue("DstIP")), p.getValue("DstIP"),
            "<b>Target IP</b> — only the host that owns this IP answers. Everybody else ignores the request.");
        end();
    }

    static ICMP_TYPES = { EchoRequest: 8, EchoReply: 0, DestUnreachable: 3, TimeExceeded: 11 };

    // ICMP message bytes (with checksum) and its parts
    static icmpParts(icmp) {
        const t = icmp.getValue("Type");
        const type = Wire.ICMP_TYPES[t];
        const code = icmp.code || 0;
        let rest, body;
        if (t == "EchoRequest" || t == "EchoReply") {
            const ts = Math.floor(icmp.ts || 0);
            body = [...Wire.u32(Math.floor(ts / 1000)), ...Wire.u32((ts % 1000) * 1000)];
            for (let i = 0; i < 48; i++) body.push(0x10 + i);
            rest = [...Wire.u16(icmp.getValue("Identifier") || 0), ...Wire.u16(icmp.getValue("Seq") || 0)];
        } else {
            rest = [0, 0, 0, 0];
            body = icmp.orig ? Wire.ipv4Bytes(icmp.orig).slice(0, 28) : [];
        }
        const bytes = [type, code, 0, 0, ...rest, ...body];
        const sum = Wire.checksum(bytes);
        bytes[2] = sum >> 8; bytes[3] = sum & 255;
        return { t, type, code, sum, rest, body, bytes };
    }

    static ipHeader(p, payloadLen) {
        const total = 20 + payloadLen;
        const proto = { ICMP: 1, TCP: 6, UDP: 17 }[p.getValue("Protocol")] || 0;
        const ttl = p.getValue("TTL") || 64;
        const ident = p.ident || 0;
        const bytes = [0x45, 0, ...Wire.u16(total), ...Wire.u16(ident), 0x40, 0, ttl, proto, 0, 0,
            ...Wire.ip(p.getValue("SrcIP")), ...Wire.ip(p.getValue("DstIP"))];
        const sum = Wire.checksum(bytes);
        bytes[10] = sum >> 8; bytes[11] = sum & 255;
        return { bytes, total, proto, ttl, ident, sum };
    }

    // the bytes after the IP header
    static l4Bytes(p) {
        if (!p.getPayload()) return [];
        if (p.getValue("Protocol") == "UDP") return Wire.udpParts(p).bytes;
        if (p.getValue("Protocol") == "TCP") return Wire.tcpParts(p).bytes;
        return Wire.icmpParts(p.getPayload()).bytes;
    }

    // a whole IPv4 packet as bytes (used inside ICMP error messages)
    static ipv4Bytes(p) {
        const l4 = Wire.l4Bytes(p);
        return [...Wire.ipHeader(p, l4.length).bytes, ...l4];
    }

    static ipStr(a) { return a && IP.isValid(String(a)) ? String(a) : "0.0.0.0"; }

    // UDP header + application data; fields are [name, bytes, value, desc]
    static udpParts(p) {
        const d = p.getPayload(), app = d.getPayload();
        const appF = app && app.kind == "DHCP" ? Wire.dhcpFields(app) : app && app.kind == "DNS" ? Wire.dnsFields(app) : [];
        const appBytes = [].concat(...appF.map(f => f[1]));
        const len = 8 + appBytes.length;
        const sp = d.getValue("SrcPort"), dp = d.getValue("DstPort");
        const pseudo = [...Wire.ip(Wire.ipStr(p.getValue("SrcIP"))), ...Wire.ip(Wire.ipStr(p.getValue("DstIP"))), 0, 17, ...Wire.u16(len)];
        const noSum = [...Wire.u16(sp), ...Wire.u16(dp), ...Wire.u16(len), 0, 0, ...appBytes];
        let sum = Wire.checksum([...pseudo, ...noSum]);
        if (sum == 0) sum = 0xffff;
        const bytes = noSum.slice();
        bytes[6] = sum >> 8; bytes[7] = sum & 255;
        return { sp, dp, len, sum, appF, bytes, app };
    }

    // TCP header + the SSH messages inside
    static TCP_BITS = { FIN: 1, SYN: 2, RST: 4, PSH: 8, ACK: 16 };
    static tcpParts(p) {
        const seg = p.getPayload();
        const msgs = seg.data || [];
        const data = [].concat(...msgs.map(m => m.bytes()));
        const flags = seg.flags.split(",").reduce((n, f) => n | (Wire.TCP_BITS[f] || 0), 0);
        const head = [...Wire.u16(seg.sp), ...Wire.u16(seg.dp), ...Wire.u32(seg.getValue("Seq")), ...Wire.u32(seg.getValue("Ack")), 0x50, flags, ...Wire.u16(64240), 0, 0, 0, 0];
        const pseudo = [...Wire.ip(Wire.ipStr(p.getValue("SrcIP"))), ...Wire.ip(Wire.ipStr(p.getValue("DstIP"))), 0, 6, ...Wire.u16(head.length + data.length)];
        const sum = Wire.checksum([...pseudo, ...head, ...data]);
        head[16] = sum >> 8; head[17] = sum & 255;
        return { seg, msgs, data, flags, sum, head, bytes: [...head, ...data] };
    }

    static dhcpFields(m) {
        const ip = Wire.ip, opt = (code, data) => [code, data.length, ...data];
        const typeDesc = { DISCOVER: "client looks for a server", OFFER: "server offers an address", REQUEST: "client asks for the offered address", ACK: "server confirms", NAK: "server refuses" };
        const f = [
            ["Message type (op)", [m.op], m.op == 1 ? "1 (boot request)" : "2 (boot reply)", "<b>op</b> 1 = from the client, 2 = from the server. DHCP grew out of the older BOOTP protocol, that's why the header looks so old-fashioned."],
            ["Hardware type", [1], "1 (Ethernet)", "<b>Hardware type</b> 1 = Ethernet."],
            ["Hardware addr length", [6], "6", "A MAC address is 6 bytes long."],
            ["Hops", [0], "0", "<b>Hops</b> — used by DHCP relay agents on routers. 0 here."],
            ["Transaction ID", Wire.u32(m.xid), Wire.hex(m.xid, 8), "<b>Transaction ID</b> — a random number the client picks. All four messages of one DORA dialog carry the same ID, so the client knows the answers are for it."],
            ["Seconds", [0, 0], "0", "Seconds since the client started asking."],
            ["Flags", [0x80, 0], "Broadcast", "<b>Broadcast flag</b> — the client has no IP address yet, so it asks the server to answer with a broadcast that it can surely receive."],
            ["Client IP (ciaddr)", ip(Wire.ipStr(m.ciaddr)), m.ciaddr, "<b>ciaddr</b> — the client's current address; 0.0.0.0 because it has none yet."],
            ["Your IP (yiaddr)", ip(Wire.ipStr(m.yiaddr)), m.yiaddr, "<b>yiaddr</b> — “your” IP: the address the server gives to the client."],
            ["Server IP (siaddr)", ip(Wire.ipStr(m.siaddr)), m.siaddr, "<b>siaddr</b> — the DHCP server's address."],
            ["Relay agent IP", [0, 0, 0, 0], "0.0.0.0", "<b>giaddr</b> — filled in by a DHCP relay on a router; unused here."],
            ["Client MAC (chaddr)", [...Wire.mac(m.chaddr), ...new Array(10).fill(0)], m.chaddr, "<b>chaddr</b> — the client's MAC address (+10 bytes padding). The server uses it to remember who got which address."],
            ["Server name", new Array(64).fill(0), "(64 empty bytes)", "Old BOOTP field for a server name — empty."],
            ["Boot file name", new Array(128).fill(0), "(128 empty bytes)", "Old BOOTP field for a boot file (used when computers start from the network) — empty."],
            ["Magic cookie", [0x63, 0x82, 0x53, 0x63], "DHCP", "<b>Magic cookie</b> 63 82 53 63 — says: DHCP options follow."],
            ["Option 53: message type", opt(53, [DhcpMessage.TYPES[m.type]]), "DHCP " + m.type, "<b>DHCP message type</b> — " + m.type + ": " + (typeDesc[m.type] || "") + ". Discover → Offer → Request → Ack (“DORA”)."],
        ];
        if (m.opts.requested) f.push(["Option 50: requested IP", opt(50, ip(m.opts.requested)), m.opts.requested, "The address the client would like to get."]);
        if (m.opts.serverId) f.push(["Option 54: server ID", opt(54, ip(m.opts.serverId)), m.opts.serverId, "Which DHCP server this is about — if there are several, everybody knows whose offer was chosen."]);
        if (m.opts.lease) f.push(["Option 51: lease time", opt(51, Wire.u32(m.opts.lease)), m.opts.lease + " s", "<b>Lease time</b> — the address is borrowed, not given forever. The client must renew it in time."]);
        if (m.opts.mask) f.push(["Option 1: subnet mask", opt(1, ip(m.opts.mask)), m.opts.mask, "The <b>netmask</b>: which addresses are in the local network."]);
        if (m.opts.router) f.push(["Option 3: router", opt(3, ip(m.opts.router)), m.opts.router, "The <b>default gateway</b> — where to send packets for other networks."]);
        if (m.opts.dns) f.push(["Option 6: DNS server", opt(6, ip(m.opts.dns)), m.opts.dns, "The <b>DNS server</b> that turns names into IP addresses."]);
        if (m.opts.domain) f.push(["Option 15: domain name", opt(15, Wire.ascii(m.opts.domain)), m.opts.domain, "The <b>search domain</b>: “host1” will be looked up as “host1." + esc(m.opts.domain) + "”."]);
        f.push(["Option 255: end", [255], "end", "End of the options."]);
        return f;
    }

    static dnsName(n) {
        const out = [];
        n.split(".").filter(x => x).forEach(l => out.push(l.length, ...Wire.ascii(l)));
        out.push(0);
        return out;
    }

    static dnsFields(m) {
        const flags = m.qr ? 0x8180 | (m.rcode & 15) : 0x0100;
        const f = [
            ["Transaction ID", Wire.u16(m.id), Wire.hex(m.id, 4), "<b>ID</b> — the question and its answer carry the same number, so the asker can match them."],
            ["Flags", Wire.u16(flags), Wire.hex(flags, 4) + (m.qr ? (m.rcode == 3 ? " (response, no such name)" : " (response, no error)") : " (standard query, recursion desired)"),
                "<b>Flags</b> — the first bit says question (0) or answer (1); the last 4 bits are the result code: 0 = OK, 3 = NXDOMAIN (no such name)."],
            ["Questions", Wire.u16(1), "1", "How many questions follow."],
            ["Answer RRs", Wire.u16(m.answers.length), String(m.answers.length), "How many answers (resource records) follow."],
            ["Authority RRs", Wire.u16(0), "0", "Records about which server is responsible — none here."],
            ["Additional RRs", Wire.u16(0), "0", "Extra records — none here."],
            ["Query name", Wire.dnsName(m.qname), m.qname, "<b>The name</b>, written as labels: each part starts with its length (e.g. 5 h o s t 1, 3 l a b, 0)."],
            ["Query type / class", [0, 1, 0, 1], "A (IPv4 address), IN", "<b>Type A</b> = “give me the IPv4 address”. Class IN = Internet."],
        ];
        m.answers.forEach(a => f.push(["Answer: " + a.name, [0xc0, 0x0c, 0, 1, 0, 1, ...Wire.u32(a.ttl), 0, 4, ...Wire.ip(a.ip)],
            a.ip + " (TTL " + a.ttl + " s)", "<b>The answer</b>: name (as a 2-byte pointer c0 0c back to the question), type A, class IN, how long it may be cached (TTL), and the 4-byte IPv4 address <b>" + a.ip + "</b>."]));
        return f;
    }

    static encodeIpv4(p, begin, field, end) {
        if (p.getValue("Protocol") == "TCP") return Wire.encodeTcp(p, begin, field, end);
        const isUdp = p.getValue("Protocol") == "UDP";
        const icmp = isUdp ? null : p.getPayload();
        const ic = icmp ? Wire.icmpParts(icmp) : null;
        const U = isUdp ? Wire.udpParts(p) : null;
        const H = Wire.ipHeader(p, ic ? ic.bytes.length : U ? U.bytes.length : 0);

        Wire.encodeIpHeader(p, H, begin, field, end);

        if (U) {
            begin("User Datagram Protocol", "udp", COLORS.UDP, "Layer 4. UDP adds port numbers, so the packet reaches the right program on the computer.");
            const svc = { 67: "DHCP server", 68: "DHCP client", 53: "DNS" };
            field("Source port", Wire.u16(U.sp), U.sp + (svc[U.sp] ? " (" + svc[U.sp] + ")" : ""), "<b>Source port</b> — which program sent it. The answer will go back to this port.");
            field("Destination port", Wire.u16(U.dp), U.dp + (svc[U.dp] ? " (" + svc[U.dp] + ")" : ""), "<b>Destination port</b> — which program should get it: 67 = DHCP server, 68 = DHCP client, 53 = DNS server.");
            field("Length", Wire.u16(U.len), U.len + " bytes", "<b>Length</b> of the UDP header (8 bytes) plus the data.");
            field("Checksum", Wire.u16(U.sum), Wire.hex(U.sum, 4), "<b>Checksum</b> over the UDP data and a “pseudo header” with the IP addresses.");
            end();
            if (U.appF.length) {
                const dh = U.app.kind == "DHCP";
                begin(dh ? "DHCP" : "DNS", dh ? "dhcp" : "dns", dh ? COLORS.DHCP : COLORS.DNS,
                    dh ? "Dynamic Host Configuration Protocol — gives a computer its IP address, gateway and DNS server automatically." :
                        "Domain Name System — turns names like host1.lab into IP addresses.");
                U.appF.forEach(([n, b, v, d]) => field(n, b, v, d));
                end();
            }
            return;
        }
        if (!ic) return;
        const names = { 8: "Echo request", 0: "Echo reply", 3: "Destination unreachable", 11: "Time exceeded" };
        begin("ICMP", "icmp", COLORS.ICMP, "Internet Control Message Protocol — used by ping and traceroute, and for error reports.");
        field("Type", [ic.type], ic.type + " (" + names[ic.type] + ")",
            "<b>Type</b> 8 = echo request (<i>are you there?</i>), 0 = echo reply (<i>yes!</i>), 11 = time exceeded (a router dropped the packet because its TTL ran out), 3 = destination unreachable.");
        if (ic.type == 8 || ic.type == 0) {
            field("Code", [0], "0", "<b>Code</b> — sub-type; always 0 for echo.");
            field("Checksum", Wire.u16(ic.sum), Wire.hex(ic.sum, 4), "<b>Checksum</b> over the whole ICMP message.");
            const id = icmp.getValue("Identifier") || 0, seq = icmp.getValue("Seq") || 0;
            field("Identifier", Wire.u16(id), String(id) + " (" + Wire.hex(id, 4) + ")",
                "<b>Identifier</b> — picked by each running ping, so replies find the right ping program.");
            field("Sequence", Wire.u16(seq), String(seq), "<b>Sequence number</b> — counts up by one: this is the <code>icmp_seq</code> ping prints.");
            field("Data", ic.body, ic.body.length + " bytes (timestamp + pattern)",
                "<b>Data</b> — ping fills 56 bytes: a timestamp (to measure the round-trip time) and a counting pattern. The reply echoes it back unchanged.");
        } else {
            const codeTxt = ic.type == 11 ? "TTL expired in transit" : (ic.code == 1 ? "host unreachable" : "network unreachable");
            field("Code", [ic.code], ic.code + " (" + codeTxt + ")",
                "<b>Code</b> — the exact reason. Time exceeded 0 = TTL ran out in transit. Unreachable 0 = no route to the network, 1 = the host did not answer ARP.");
            field("Checksum", Wire.u16(ic.sum), Wire.hex(ic.sum, 4), "<b>Checksum</b> over the whole ICMP message.");
            field("Unused", [0, 0, 0, 0], "0", "<b>Unused</b> — four zero bytes.");
            const o = icmp.orig, oi = o && o.getPayload();
            field("Original packet", ic.body, ic.body.length + " bytes: " + (o ? o.getValue("SrcIP") + " → " + o.getValue("DstIP") + (oi ? ", ICMP seq=" + oi.getValue("Seq") : "") : ""),
                "<b>The beginning of the packet that failed</b> — its IP header plus the first 8 bytes of its data. Thanks to this the sender (and its ping or traceroute) can tell exactly which packet it was.");
        }
        end();
    }

    static encodeIpHeader(p, H, begin, field, end) {
        begin("Internet Protocol v4", "ip", COLORS.IPv4,
            "Layer 3. The IP header carries the logical addresses; routers use them to forward packets between networks.");
        field("Version / IHL", [0x45], "4 / 20 bytes",
            "<b>0x45</b>: the high 4 bits say IP <b>version 4</b>, the low 4 bits the header length in 32-bit words (5 × 4 = 20 bytes).");
        field("DSCP / ECN", [0], "0x00", "<b>Differentiated services</b> — priority marking for quality of service. 0 = normal.");
        field("Total length", Wire.u16(H.total), H.total + " bytes", "<b>Total length</b> of the IP packet: header + data (here the 20-byte header + " + (H.total - 20) + " bytes of " + p.getValue("Protocol") + ").");
        field("Identification", Wire.u16(H.ident), Wire.hex(H.ident, 4), "<b>Identification</b> — a counter, used to put fragments of the same packet back together. Routers don't change it.");
        field("Flags / Fragment", [0x40, 0], "Don't fragment",
            "<b>Flags</b>: DF = don't fragment. Fragment offset 0 — this packet is not split up.");
        field("Time to live", [H.ttl], String(H.ttl),
            "<b>TTL</b> — every router lowers it by one; when it would reach 0 the packet is dropped and the router sends back an ICMP “time exceeded”. This stops packets from circling forever. Linux starts at 64; <code>traceroute</code> uses 1, 2, 3… on purpose.");
        field("Protocol", [H.proto], H.proto + " (" + p.getValue("Protocol") + ")", "<b>Protocol</b> of the data inside: 1 = ICMP, 6 = TCP, 17 = UDP.");
        field("Header checksum", Wire.u16(H.sum), Wire.hex(H.sum, 4), "<b>Header checksum</b> — protects only the IP header; every router recomputes it after lowering the TTL.");
        field("Source address", Wire.ip(p.getValue("SrcIP")), p.getValue("SrcIP"), "<b>Source IP</b> — who sent the packet. Routers don't change it.");
        field("Destination address", Wire.ip(p.getValue("DstIP")), p.getValue("DstIP"), "<b>Destination IP</b> — where the packet should end up, maybe many networks away. Stays the same all the way, while the MAC addresses change at every router.");
        end();
    }

    static encodeTcp(p, begin, field, end) {
        const T = Wire.tcpParts(p), seg = T.seg;
        const H = Wire.ipHeader(p, T.bytes.length);
        Wire.encodeIpHeader(p, H, begin, field, end);
        const svc = { 22: "ssh" };
        const fl = seg.flags.split(",").join(", ");
        begin("Transmission Control Protocol", "tcp", COLORS.TCP,
            "Layer 4. TCP makes a reliable <i>conversation</i> out of single packets: it opens a connection (SYN, SYN-ACK, ACK), numbers every byte, gets every byte acknowledged, and closes the connection politely (FIN). ssh, web pages and e-mail all ride on TCP.");
        field("Source port", Wire.u16(seg.sp), seg.sp + (svc[seg.sp] ? " (" + svc[seg.sp] + ")" : ""), "<b>Source port</b> — the program that sent it. The ssh client picks a random high number; the ssh server always answers from 22.");
        field("Destination port", Wire.u16(seg.dp), seg.dp + (svc[seg.dp] ? " (" + svc[seg.dp] + ")" : ""), "<b>Destination port</b> — which program should get it: 22 = the ssh server (sshd). <code>ss -tulpn</code> shows which ports are listening on a machine.");
        field("Sequence number", Wire.u32(seg.getValue("Seq")), seg.getValue("Seq") + "  (relative: " + seg.rel.seq + ")",
            "<b>Sequence number</b> — the number of the first byte in this segment. Each side starts from a random number (Wireshark shows them from 0, “relative”). SYN and FIN count as one byte each.");
        field("Acknowledgment number", Wire.u32(seg.getValue("Ack")), seg.getValue("Ack") + "  (relative: " + seg.rel.ack + ")",
            "<b>Acknowledgment number</b> — “I have got everything up to here, send the next byte from this number”. This is how TCP notices a lost packet and sends it again.");
        field("Header length / Flags", [0x50, T.flags], "20 bytes · [" + fl + "]",
            "<b>Flags</b> — SYN: let's open a connection · ACK: the acknowledgment number is valid · PSH: hand the data to the program now · FIN: I am done, let's close · RST: no, go away (nobody listens on that port, or something went wrong). Here: <b>" + fl + "</b>.");
        field("Window", Wire.u16(64240), "64240 bytes", "<b>Window</b> — how many bytes the sender of this segment can still receive before the other side has to wait. This is how a slow receiver is not flooded (flow control).");
        field("Checksum", Wire.u16(T.sum), Wire.hex(T.sum, 4), "<b>Checksum</b> over the TCP header, the data and a “pseudo header” with the IP addresses.");
        field("Urgent pointer", [0, 0], "0", "<b>Urgent pointer</b> — almost never used. 0.");
        end();
        if (!T.msgs.length) return;
        begin("SSH Protocol", "ssh", COLORS.SSH,
            "Secure Shell: logging in to another machine over the network. Only the version banners and the key exchange can be read; after <b>New Keys</b> everything — the password, the commands, the answers — is encrypted.");
        T.msgs.forEach(m => {
            const b = m.bytes();
            if (m.type == "banner") {
                field("Protocol", b, m.text, "<b>Version banner</b> — the first thing both sides say, in plain text: “I speak SSH version 2.0, my program is " + esc(m.text.split("-").slice(2).join("-")) + "”.");
                return;
            }
            if (m.type == "enc") {
                field("Packet length (encrypted)", b.slice(0, 4), "(encrypted)", "Even the length is encrypted (with the chacha20-poly1305 cipher).");
                field("Encrypted packet", b.slice(4), (b.length - 4) + " bytes", "<b>Encrypted</b> — this is the whole point of ssh: whoever sees this frame on the cable (like you in Wireshark) cannot tell whether it is a password, a command or its output. Only the two ends know the key.");
                return;
            }
            const what = { kexinit: "Key Exchange Init — the lists of methods this side knows: key exchange (curve25519-sha256), host key (ssh-ed25519), cipher (chacha20-poly1305@openssh.com) … Both sides pick the first common one.",
                "ecdh-init": "Elliptic Curve Diffie-Hellman Init — the client's half of the key exchange: a public number. From the two halves both sides compute the same secret, which never travels on the cable.",
                "ecdh-reply": "Elliptic Curve Diffie-Hellman Reply — the server's half, plus its <b>host key</b> and a signature. The client compares the host key with ~/.ssh/known_hosts: is this really the same machine as last time?",
                newkeys: "New Keys — “from the next packet on, everything is encrypted”." }[m.type];
            field("Packet length", b.slice(0, 4), String(b.length - 4) + " bytes", "<b>Packet length</b> — how many bytes follow in this SSH message.");
            field("Padding length", [b[4]], String(b[4]), "<b>Padding</b> — filler bytes, so that the length is a multiple of 8.");
            field("Message code", [b[5]], b[5] + " (" + m.info().split(": ")[1] + ")", "<b>Message code</b> — " + what);
            if (b.length > 6) field("Payload", b.slice(6), (b.length - 6) + " bytes", what);
        });
        end();
    }

    static encodeLldp(p, begin, field, end) {
        const tlv = (type, len) => Wire.u16((type << 9) | len);
        const chassis = String(p.getValue("ChassisID"));
        const port = String(p.getValue("PortID"));
        const name = String(p.getValue("SystemName"));
        const ttl = p.getValue("TTL") || 120;
        const capName = p.getValue("SystemCapabilities") || "Station";
        const capBit = 1 << ({ Other: 0, Repeater: 1, Bridge: 2, WlanAP: 3, Router: 4, Telephone: 5, DocsysCable: 6, Station: 7 }[capName] || 0);
        const mgmt = p.getValue("MgmtIP");

        begin("Link Layer Discovery Protocol", "lldp", COLORS.LLDP,
            "LLDP: each device tells its direct neighbours who it is. A list of Type-Length-Value (TLV) blocks.");
        field("Chassis ID TLV", [...tlv(1, 7), 4, ...Wire.mac(chassis)], "MAC " + chassis,
            "<b>Chassis ID</b> (type 1) identifies the device; here its MAC address (subtype 4). " +
            "Each TLV starts with 7 bits of type and 9 bits of length.");
        field("Port ID TLV", [...tlv(2, port.length + 1), 5, ...Wire.ascii(port)], port,
            "<b>Port ID</b> (type 2) — the name of the interface that sent this frame (subtype 5 = interface name).");
        field("Time To Live TLV", [...tlv(3, 2), ...Wire.u16(ttl)], ttl + " s",
            "<b>TTL</b> (type 3) — how many seconds the neighbour should remember this information.");
        field("System Name TLV", [...tlv(5, name.length), ...Wire.ascii(name)], name, "<b>System name</b> (type 5) — the hostname.");
        field("Capabilities TLV", [...tlv(7, 4), ...Wire.u16(capBit), ...Wire.u16(capBit)], capName,
            "<b>System capabilities</b> (type 7) — what the device can do: bridge, router, station… Two bitmaps: supported and enabled.");
        if (mgmt) {
            field("Management Address TLV", [...tlv(8, 12), 5, 1, ...Wire.ip(mgmt), 2, 0, 0, 0, 0, 0], mgmt,
                "<b>Management address</b> (type 8) — an IP address where the device can be managed.");
        }
        field("End TLV", [0, 0], "end", "<b>End of LLDPDU</b> — type 0, length 0.");
        end();
    }
}
