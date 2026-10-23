class Patch extends Clickable {
    constructor(port1, port2, opts = {}) { // full-duplex patch cable, no CSMA/CD required
        super((port1.x + port2.x) / 2, (port1.y + port2.y) / 2);
        this.id = new Id('Patch', this);
        this.ports = [port1, port2];
        port1.connect(this);
        port2.connect(this);
        this.flight = [[], []]; // frames on the wire, per direction (full duplex)
        this.queue = [[], []]; // frames waiting for the wire, per direction
        this.color = opts.color || COLORS.cable;
        this.sag = opts.sag;
        this.kind = opts.kind || "Cat5e UTP patch cable";
        this.carried = 0;
        this._path = null;
        Debug.log(this.id, "Create", this);
        this.info.push(["Q", function (o) { return o.queue[0].length + o.queue[1].length; }]);
    }

    other(port) {
        return port == this.ports[0] ? this.ports[1] : this.ports[0];
    }

    static GAP = 0.22; // a new frame may start when the previous one is this far along (serialization)

    get frame() { // oldest frame on the wire in each direction
        return [this.flight[0][0] || null, this.flight[1][0] || null];
    }

    get sending() {
        return [this.flight[0].length > 0, this.flight[1].length > 0];
    }

    inFlight() {
        return [...this.flight[0], ...this.flight[1]];
    }

    path() {
        if (this._path) return this._path;
        const a = this.ports[0].anchor(), b = this.ports[1].anchor();
        const da = Gfx.dirVec(this.ports[0].dir), db = Gfx.dirVec(this.ports[1].dir);
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        const k = Math.max(26, Math.min(150, dist * 0.35));
        const sag = this.sag != null ? this.sag : Math.min(46, dist * 0.08);
        this._path = [a,
            { x: a.x + da.x * k, y: a.y + da.y * k + sag },
            { x: b.x + db.x * k, y: b.y + db.y * k + sag },
            b];
        this._len = Gfx.bezLength(this._path);
        return this._path;
    }

    length() {
        this.path();
        return this._len;
    }

    // time a frame needs to travel the cable (long cables take longer)
    duration() {
        return Sim.HOP_MS * (0.45 + this.length() / 650);
    }

    pointAt(dir, t) {
        return Gfx.bez(this.path(), dir == 0 ? t : 1 - t);
    }

    sendFrame(frame, senderPort) {
        const i = senderPort == this.ports[0] ? 0 : 1;
        frame.patch = this;
        frame.dir = i;
        frame.progress = 0;
        frame.state = "queued";
        this.queue[i].push(frame);
    }

    update(dt) {
        for (let i = 0; i <= 1; i++) {
            const fl = this.flight[i];
            fl.forEach(f => { f.progress += dt / this.duration(); });
            while (fl.length && fl[0].progress >= 1) {
                const f = fl.shift();
                f.progress = 1;
                f.state = "arrived";
                this.carried++;
                this.deliverFrame(this.ports[1 - i], f);
            }
            const last = fl[fl.length - 1];
            if (this.queue[i].length && (!last || last.progress >= Patch.GAP)) {
                const f = this.queue[i].shift();
                f.state = "wire";
                f.progress = 0;
                fl.push(f);
            }
        }
    }

    deliverFrame(rcvPort, frame) {
        frame.log(`arrived at ${rcvPort.owner()} ${rcvPort.hub ? "port " + (rcvPort.hub.ports.indexOf(rcvPort) + 1) : rcvPort.id}`);
        rcvPort.rcvFrame(frame);
    }

    drawCable(hover) {
        const p = this.path();
        const stroke = (w, c) => {
            ctx.beginPath();
            ctx.moveTo(p[0].x, p[0].y);
            ctx.bezierCurveTo(p[1].x, p[1].y, p[2].x, p[2].y, p[3].x, p[3].y);
            ctx.strokeStyle = c;
            ctx.lineWidth = w;
            ctx.lineCap = "round";
            ctx.stroke();
        };
        stroke(6, "rgba(0,0,0,.45)");
        stroke(4, this.color);
        stroke(1.2, "rgba(255,255,255,.28)");
        if (hover) stroke(9, "rgba(56,189,248,.25)");
        // signal trail behind each frame in flight
        this.flight.forEach((fl, i) => fl.forEach(f => {
            const t0 = Math.max(0, f.progress - 0.35);
            ctx.beginPath();
            for (let s = 0; s <= 16; s++) {
                const q = this.pointAt(i, t0 + (f.progress - t0) * s / 16);
                s == 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y);
            }
            const a = this.pointAt(i, t0), b = this.pointAt(i, f.progress);
            const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            g.addColorStop(0, "rgba(255,255,255,0)");
            g.addColorStop(1, f.color());
            ctx.strokeStyle = g;
            ctx.lineWidth = 4;
            ctx.stroke();
        }));
    }

    drawFrames(hoverObj) {
        for (let i = 0; i <= 1; i++) {
            this.flight[i].forEach(f => {
                const q = this.pointAt(i, f.progress);
                f.drawAt(q.x, q.y, hoverObj == f || (typeof Capture != "undefined" && Capture.mark === f));
            });
            // frames waiting at the sending socket
            const n = this.queue[i].length;
            if (n) {
                const a = this.ports[i].anchor();
                this.queue[i].forEach((qf, k) => {
                    qf.fx = a.x + 6 + k * 3; qf.fy = a.y - 14 - k * 3;
                });
                Gfx.rrect(a.x + 6, a.y - 22, 22, 13, 6);
                ctx.fillStyle = "rgba(15,22,31,.9)";
                ctx.fill();
                ctx.strokeStyle = this.queue[i][0].color();
                ctx.lineWidth = 1;
                ctx.stroke();
                Gfx.text("+" + n, a.x + 17, a.y - 12.5, { size: 9.5, weight: 700, color: "#fff", mono: true });
            }
        }
    }

    hit(x, y) {
        for (let s = 0; s <= 40; s++) {
            const q = Gfx.bez(this.path(), s / 40);
            if (Math.hypot(q.x - x, q.y - y) < 6) return true;
        }
        return false;
    }

    bounds() {
        return null;
    }

    endName(port) {
        if (port.hub && port.hub.portName) return `${port.hub} ${port.hub.portName(port)}`;
        return port.hub ? `${port.hub} port ${port.hub.ports.indexOf(port) + 1}` : `${port.host} ${port.id}`;
    }

    tooltipLines() {
        return [
            `${this.id} · ${this.kind}`,
            `${this.endName(this.ports[0])}  ⇄  ${this.endName(this.ports[1])}`,
            `in flight ${this.inFlight().length}  queued ${this.queue[0].length + this.queue[1].length}  carried ${this.carried}`,
        ];
    }

    inspect() {
        const row = i => {
            const dirTxt = `${this.endName(this.ports[i])} → ${this.endName(this.ports[1 - i])}`;
            const fl = this.flight[i].map(f => `<span class="lnk" data-open="${f.uid}">${f.label()}</span>
                <div class="bar" style="--c:${f.color()}"><i style="width:${Math.round(f.progress * 100)}%"></i></div>`).join("");
            return `<tr><td>${dirTxt}</td><td>${fl || '<span class="note">idle</span>'}
                ${this.queue[i].length ? `<div class="note">${this.queue[i].length} waiting</div>` : ""}</td></tr>`;
        };
        return {
            title: `${this.id}`,
            sub: this.kind,
            badge: "UTP",
            color: this.color,
            sections: [
                {
                    h: "Cable", html: `<p>A twisted-pair cable with an RJ45 plug at each end. It has separate wire pairs for each direction, so both ends can send at the same time — <b>full duplex</b>.</p>
                    <table class="t kv"><tr><td>End A</td><td>${this.endName(this.ports[0])}</td></tr>
                    <tr><td>End B</td><td>${this.endName(this.ports[1])}</td></tr>
                    <tr><td>Frames carried</td><td class="m">${this.carried}</td></tr></table>`
                },
                { h: "On the wire now", html: `<table class="t">${row(0)}${row(1)}</table>` },
            ],

        };
    }

    toString() {
        return "" +
            this.id.toString() + ": " +
            this.ports[0].toString() + " <-> " +
            this.ports[1].toString();
    }
}
