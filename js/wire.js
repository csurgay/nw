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
        if (frame.etherType == "IPv4") {
            const icmp = p.getPayload();
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

    static encodeIpv4(p, begin, field, end) {
        const icmp = p.getPayload();
        // build ICMP first, we need its length and checksum
        let icmpBytes = [];
        let parts = [];
        if (icmp) {
            const type = icmp.getValue("Type") == "EchoRequest" ? 8 : 0;
            const ident = icmp.getValue("Identifier") || 0;
            const seq = icmp.getValue("Seq") || 0;
            const ts = Math.floor(icmp.ts || 0);
            const data = [...Wire.u32(Math.floor(ts / 1000)), ...Wire.u32((ts % 1000) * 1000)];
            for (let i = 0; i < 48; i++) data.push(0x10 + i);
            const noSum = [type, 0, 0, 0, ...Wire.u16(ident), ...Wire.u16(seq), ...data];
            const sum = Wire.checksum(noSum);
            parts = [type, ident, seq, sum, data];
            icmpBytes = noSum;
            icmpBytes[2] = sum >> 8; icmpBytes[3] = sum & 255;
        }
        const total = 20 + icmpBytes.length;
        const proto = { ICMP: 1, TCP: 6, UDP: 17 }[p.getValue("Protocol")] || 0;
        const ttl = p.getValue("TTL") || 64;
        const ident = p.ident || 0;
        const hdr = [0x45, 0, ...Wire.u16(total), ...Wire.u16(ident), 0x40, 0, ttl, proto, 0, 0,
            ...Wire.ip(p.getValue("SrcIP")), ...Wire.ip(p.getValue("DstIP"))];
        const hsum = Wire.checksum(hdr);

        begin("Internet Protocol v4", "ip", COLORS.IPv4,
            "Layer 3. The IP header carries the logical addresses; routers use them to forward packets between networks.");
        field("Version / IHL", [0x45], "4 / 20 bytes",
            "<b>0x45</b>: the high 4 bits say IP <b>version 4</b>, the low 4 bits the header length in 32-bit words (5 × 4 = 20 bytes).");
        field("DSCP / ECN", [0], "0x00", "<b>Differentiated services</b> — priority marking for quality of service. 0 = normal.");
        field("Total length", Wire.u16(total), total + " bytes", "<b>Total length</b> of the IP packet: header + data (here the 20-byte header + " + icmpBytes.length + " bytes of ICMP).");
        field("Identification", Wire.u16(ident), Wire.hex(ident, 4), "<b>Identification</b> — a counter, used to put fragments of the same packet back together.");
        field("Flags / Fragment", [0x40, 0], "Don't fragment",
            "<b>Flags</b>: DF = don't fragment. Fragment offset 0 — this packet is not split up.");
        field("Time to live", [ttl], String(ttl),
            "<b>TTL</b> — every router lowers it by one; at 0 the packet is dropped. This stops packets from circling forever. Linux starts at 64.");
        field("Protocol", [proto], proto + " (" + p.getValue("Protocol") + ")", "<b>Protocol</b> of the data inside: 1 = ICMP, 6 = TCP, 17 = UDP.");
        field("Header checksum", Wire.u16(hsum), Wire.hex(hsum, 4), "<b>Header checksum</b> — protects only the IP header; every router recomputes it after changing the TTL.");
        field("Source address", Wire.ip(p.getValue("SrcIP")), p.getValue("SrcIP"), "<b>Source IP</b> — who sent the packet.");
        field("Destination address", Wire.ip(p.getValue("DstIP")), p.getValue("DstIP"), "<b>Destination IP</b> — where the packet should end up, maybe many networks away.");
        end();

        if (icmp) {
            const [type, id, seq, sum, data] = parts;
            begin("ICMP", "icmp", COLORS.ICMP, "Internet Control Message Protocol — used by ping and for error reports.");
            field("Type", [type], type + (type == 8 ? " (Echo request)" : " (Echo reply)"),
                "<b>Type</b> 8 = echo request (<i>are you there?</i>), 0 = echo reply (<i>yes!</i>). This is what <code>ping</code> sends.");
            field("Code", [0], "0", "<b>Code</b> — sub-type; always 0 for echo.");
            field("Checksum", Wire.u16(sum), Wire.hex(sum, 4), "<b>Checksum</b> over the whole ICMP message.");
            field("Identifier", Wire.u16(id), String(id) + " (" + Wire.hex(id, 4) + ")",
                "<b>Identifier</b> — picked by each running ping, so replies find the right ping program.");
            field("Sequence", Wire.u16(seq), String(seq), "<b>Sequence number</b> — counts up by one: this is the <code>icmp_seq</code> ping prints.");
            field("Data", data, data.length + " bytes (timestamp + pattern)",
                "<b>Data</b> — ping fills 56 bytes: a timestamp (to measure the round-trip time) and a counting pattern. The reply echoes it back unchanged.");
            end();
        }
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
