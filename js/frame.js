class Frame extends Drawable {
    static counter = 0;
    static registry = new Map(); // uid -> frame, for links in popups

    constructor(x, y, macDst, macSrc, etherType, payload) {
        super(x,y);
        this.id = new Id("Frame", this);
        this.macDst = macDst; // Destination MAC address
        this.macSrc = macSrc; // Source MAC address
        this.etherType = etherType; // EtherType field: "IPv4", "ARP", "LLDP"
        this.payload = payload; // Data being sent
        this.timestamp = Date.now(); // Timestamp for the frame
        this.created = Sim.time;
        this.phase = 0; // kept for compatibility
        this.progress = 0; // 0..1 along the current cable
        this.state = "new"; // new | queued | wire | arrived | delivered | dropped
        this.history = [];
        this.uid = ++Frame.counter;
        Frame.registry.set(this.uid, this);
        if (Frame.registry.size > 800) Frame.registry.delete(Frame.registry.keys().next().value);
        this.fx = x; this.fy = y;
        Debug.log(this.id, "Create", this);
    }

    copy() {
        const frame = new Frame(this.x,this.y, this.macDst, this.macSrc,
            this.etherType, this.payload);
        frame.id = this.id;
        frame.timestamp = this.timestamp;
        frame.created = this.created;
        frame.history = this.history.slice();
        frame.copyOf = this;
        frame._wire = this._wire;
        return frame;
    }

    proto() {
        if (this.etherType == "IPv4") return this.payload.getValue("Protocol") == "ICMP" ? "ICMP" : "IPv4";
        return this.etherType;
    }

    color() {
        return COLORS[this.proto()] || COLORS.IPv4;
    }

    infoText() {
        if (!this._info) this._info = Wire.info(this);
        return this._info;
    }

    wire() {
        if (!this._wire) this._wire = Wire.encode(this);
        return this._wire;
    }

    isError() {
        if (this.proto() != "ICMP") return false;
        const t = this.payload.getPayload().getValue("Type");
        return t == "TimeExceeded" || t == "DestUnreachable";
    }

    isReply() {
        if (this.etherType == "ARP") return this.payload.getValue("OpCode") == "ArpReply";
        if (this.proto() == "ICMP") return this.payload.getPayload().getValue("Type") == "EchoReply";
        return false;
    }

    // short label on the moving packet
    label() {
        const p = this.proto();
        if (p == "ARP") return this.isReply() ? "ARP reply" : "ARP who-has";
        if (p == "ICMP" && this.isError()) return this.payload.getPayload().getValue("Type") == "TimeExceeded" ? "TTL exceeded" : "unreachable";
        if (p == "ICMP") return (this.isReply() ? "pong #" : "ping #") + this.payload.getPayload().getValue("Seq");
        return p;
    }

    log(text) {
        this.history.push({ t: Sim.time, text });
    }

    dispose(state = "delivered") {
        if (this.disposed) return;
        this.disposed = true;
        this.state = state;
        this.removeFromDrawlist();
        if (Id.list["Frame"] && Id.list["Frame"].includes(this)) Id.remove(this);
    }

    // a little envelope: Ethernet header | payload | FCS, colored like the dissection
    drawAt(x, y, hover) {
        this.fx = x; this.fy = y;
        const s = hover ? 1.25 : 1;
        const w = 30 * s, h = 15 * s;
        const c = this.color();
        ctx.save();
        ctx.shadowColor = c;
        ctx.shadowBlur = hover ? 18 : 10;
        Gfx.rrect(x - w / 2, y - h / 2, w, h, 3.5 * s);
        ctx.fillStyle = c;
        ctx.fill();
        ctx.restore();
        ctx.save();
        Gfx.rrect(x - w / 2, y - h / 2, w, h, 3.5 * s);
        ctx.clip();
        ctx.fillStyle = COLORS.ETH;
        ctx.fillRect(x - w / 2, y - h / 2, 8 * s, h);
        ctx.fillStyle = "rgba(0,0,0,.25)";
        ctx.fillRect(x - w / 2 + 8 * s, y - h / 2, 1 * s, h);
        ctx.fillStyle = COLORS.FCS;
        ctx.fillRect(x + w / 2 - 3 * s, y - h / 2, 3 * s, h);
        ctx.fillStyle = "rgba(255,255,255,.25)";
        ctx.fillRect(x - w / 2, y - h / 2, w, 2 * s);
        ctx.restore();
        Gfx.rrect(x - w / 2, y - h / 2, w, h, 3.5 * s);
        ctx.strokeStyle = "rgba(0,0,0,.55)";
        ctx.lineWidth = 1;
        ctx.stroke();
        // reply marker / request marker
        Gfx.text(this.isError() ? "!" : this.isReply() ? "↩" : (this.proto() == "LLDP" ? "i" : "?"), x + 2 * s, y + 4 * s,
            { size: 10 * s, weight: 800, color: "rgba(10,15,20,.85)" });
        // label above
        const lbl = this.label();
        ctx.font = "700 10px Inter, system-ui, sans-serif";
        const lw = ctx.measureText(lbl).width + 10;
        Gfx.rrect(x - lw / 2, y - h / 2 - 17, lw, 14, 7);
        ctx.fillStyle = "rgba(10,15,22,.88)";
        ctx.fill();
        Gfx.text(lbl, x, y - h / 2 - 6.5, { size: 10, weight: 700, color: c });
    }

    hit(x, y) {
        return this.state == "wire" || this.state == "queued" ?
            Math.abs(x - this.fx) < 17 && Math.abs(y - this.fy) < 11 : false;
    }

    bounds() {
        return { x: this.fx - 15, y: this.fy - 8, w: 30, h: 15 };
    }

    tooltipLines() {
        return [
            `${this.id} · ${this.proto()} ${this.isError() ? "error" : this.isReply() ? "reply" : this.proto() == "LLDP" ? "advertisement" : "request"}`,
            this.infoText(),
            `dst ${this.macDst}`,
            `src ${this.macSrc}`,
            `${this.wire().bytes.length} bytes · click to dissect`,
        ];
    }

    stateText() {
        return {
            new: "created", queued: "waiting for the cable to become free", wire: "travelling on the cable",
            arrived: "arrived", delivered: "delivered and processed", dropped: "dropped (not addressed to that NIC)",
            repeated: "repeated by a hub (copies continue)",
        }[this.state] || this.state;
    }

    inspect() {
        const w = this.wire();
        const layerBar = w.layers.map(l =>
            `<div style="--c:${l.color};flex:${Math.max(l.len, 4)}" data-s="${l.start}" data-l="${l.len}" title="${esc(l.name)} · ${l.len} bytes">${l.len > 7 ? esc(l.key.toUpperCase()) : ""}</div>`).join("");
        const tree = w.layers.map(l => `<div class="L" style="--c:${l.color}">
            <div class="Lh" data-s="${l.start}" data-l="${l.len}">${esc(l.name)}<span class="n">${l.len} bytes</span></div>
            ${l.fields.map(f => `<div class="F" style="--c:${l.color}" data-s="${f.start}" data-l="${f.len}" data-d="${w.fields.indexOf(f)}">
                <span class="fn">${esc(f.name)}</span><span class="fv">${esc(f.value)}</span></div>`).join("")}
            </div>`).join("");
        let hex = "";
        for (let r = 0; r < w.bytes.length; r += 16) {
            let bytes = "", asc = "";
            for (let i = r; i < Math.min(r + 16, w.bytes.length); i++) {
                const c = (w.fields.find(f => i >= f.start && i < f.start + f.len) || { layer: { color: "#999" } }).layer.color;
                const b = w.bytes[i];
                bytes += `<span data-b="${i}" style="--c:${c}"${i % 16 == 8 ? ' class="g"' : ""}>${b.toString(16).padStart(2, "0")}</span> `;
                asc += `<span data-b="${i}" style="--c:${c}">${b >= 32 && b < 127 ? esc(String.fromCharCode(b)) : "·"}</span>`;
            }
            hex += `<div class="row"><span class="off">${r.toString(16).padStart(4, "0")}</span><span class="bytes">${bytes}</span><span class="asc">${asc}</span></div>`;
        }
        const journey = this.history.map(h => `<li><span class="t">${Sim.fmt(h.t)}</span><span>${esc(h.text)}</span></li>`).join("");
        return {
            title: `${this.id} · ${this.proto()}`,
            sub: `Ethernet frame, ${w.bytes.length} bytes on the wire`,
            badge: this.proto().slice(0, 4),
            color: this.color(),
            wide: true,
            sections: [
                { h: "Info", key: "info", html: `<div class="info-line">${esc(this.infoText())}</div><p class="note">Status: <b>${this.stateText()}</b>${this.state == "wire" ? " — " + Math.round(this.progress * 100) + "% of the way" : ""}</p>` },
                { h: "Encapsulation", key: "layers", once: true, html: `<div class="layers">${layerBar}</div><p class="note">Each layer wraps the one inside it: the Ethernet header + trailer carry the ${this.proto()} message across one cable.</p>` },
                { h: "Packet details", key: "tree", once: true, html: `<div class="tree">${tree}</div>` },
                { h: "What is this field?", key: "explain", once: true, html: `<div class="explain">Point at a field above or at a byte below to see what it means.</div>` },
                { h: "Bytes on the wire", key: "hex", once: true, html: `<div class="hex">${hex}</div><p class="note">The 8-byte preamble and start delimiter that precede every frame are not shown (just like in Wireshark).</p>` },
                { h: "Journey", key: "journey", html: `<ul class="journey">${journey || "<li>not sent yet</li>"}</ul>` },
            ],
        };
    }

    toString() {
        return "" +
            super.toString() +
            " Dst:" + this.macDst +
            " Src:" + this.macSrc +
            " EtherType:" + this.etherType +
            " Payload:" + this.payload;
    }

    removeFromDrawlist() {
        const index = Id.list["Drawable"].indexOf(this);
        if (index==-1) {
            Debug.error(this.id,"Frame not in Drawable",Id.list["Drawable"])
        }
        else {
            Id.list["Drawable"].splice(index, 1);
            Debug.log(this.id, "RemoveFromDrawlist", this.id);
        }
    }

}
