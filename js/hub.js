class Hub extends Clickable {
    constructor(x,y) {
        super(x,y);
        this.id = new Id('Hub', this);
        this.ports = [];
        this.repeated = 0;
    }

    addPort(port) {
        this.ports.push(port);
        port.attachHub(this);
    }

    portNo(port) {
        return this.ports.indexOf(port) + 1;
    }

    // A hub is a multi-port repeater (Layer 1): whatever comes in on one
    // port is copied bit by bit to every other port. No MAC addresses involved.
    processFrame(frame, sourcePort) {
        const outs = this.ports.filter(port => port.connected && port != sourcePort);
        this.repeated++;
        frame.log(`${this} repeated it out of port${outs.length > 1 ? "s" : ""} ${outs.map(p => this.portNo(p)).join(", ")}`);
        Sim.event("hub", `<b>${this}</b> got it on port ${this.portNo(sourcePort)} and repeats it to port${outs.length > 1 ? "s" : ""} ` +
            `${outs.map(p => this.portNo(p)).join(", ")} — a hub doesn't look at addresses`, { frame, obj: this });
        outs.forEach(port => {
            port.sendFrame(frame.copy());
        });
        frame.dispose("repeated");
    }

    toString() {
        return super.toString();
    }
}

class Hub4 extends Hub {
    constructor(x, y) {
        super(x, y);
        this.w = 270;
        this.h = 52;
        for (let i = 0; i < 4; i++) {
            const port = new Port(x + 136 + i * 34, y + 33);
            port.dir = "down";
            this.addPort(port);
        }
        Debug.log(this.id, "Create", this);
    }

    bounds() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    hit(x, y) {
        return x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h;
    }

    draw() {
        const { x, y, w, h } = this;
        // rack ears
        ctx.fillStyle = "#8e969f";
        [x, x + w - 12].forEach(ex => {
            Gfx.rrect(ex, y + 2, 12, h - 4, 2);
            ctx.fillStyle = Gfx.vgrad(y, y + h, ["#b4bbc3", "#7d858e"]);
            ctx.fill();
            [y + 12, y + h - 12].forEach(sy => {
                ctx.beginPath();
                ctx.ellipse(ex + 6, sy, 3, 2.2, 0, 0, Math.PI * 2);
                ctx.fillStyle = "#3b4148";
                ctx.fill();
            });
        });
        // chassis front panel
        Gfx.rrect(x + 11, y, w - 22, h, 3);
        ctx.fillStyle = Gfx.vgrad(y, y + h, ["#4a525c", "#363c44", "#2b3037"]);
        ctx.fill();
        ctx.strokeStyle = "#1a1e23";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.12)";
        ctx.fillRect(x + 12, y + 1, w - 24, 1.5);
        // brand area
        Gfx.text("NW-HUB 4", x + 22, y + 21, { align: "left", weight: 800, size: 12, color: "#e8edf2" });
        Gfx.text("10BASE-T REPEATER", x + 22, y + 33, { align: "left", weight: 600, size: 7.5, color: "#9aa6b2" });
        Gfx.text(this.id.toString(), x + 22, y + 45, { align: "left", weight: 700, size: 9, color: COLORS.select, mono: true });
        // power LED
        Gfx.led(x + 112, y + 14, 2.6, COLORS.ledGreen, true, 0.7);
        Gfx.text("PWR", x + 112, y + 27, { size: 6.5, weight: 700, color: "#9aa6b2" });
        // collision LED: lights when frames are being repeated
        const busy = this.ports.some(p => p.activity());
        Gfx.led(x + 112, y + 37, 2.6, COLORS.ledAmber, busy && Math.floor(Sim.time / 90) % 2 == 0, 0.7);
        // ports
        this.ports.forEach((port, i) => {
            port.drawJack([{ x: -5, y: -15 }, { x: 5, y: -15 }]);
            Gfx.text(String(i + 1), port.x + 12, port.y + 4, { size: 8, weight: 700, color: "#9aa6b2" });
        });
    }

    tooltipLines() {
        return [
            `${this.id} · 4-port Ethernet hub`,
            `ports in use ${this.ports.filter(p => p.connected).length}/4`,
            `frames repeated ${this.repeated}`,
            `Layer 1 device: copies every frame to all ports`,
        ];
    }

    inspect() {
        const rows = this.ports.map((p, i) => {
            const peer = p.peer();
            return `<tr${p.activity() ? ' class="hl"' : ""}><td class="m">${i + 1}</td>
                <td>${p.linkUp() ? '<span class="pill on">link</span>' : '<span class="pill off">empty</span>'}</td>
                <td>${peer ? (peer.hub ? `${peer.hub} port ${peer.hub.portNo(peer)}` : `${peer.host} ${peer.id}`) : "—"}</td>
                <td class="m">${p.stats.rx}</td><td class="m">${p.stats.tx}</td></tr>`;
        }).join("");
        return {
            title: `${this.id}`,
            sub: "4-port Ethernet hub (multiport repeater)",
            badge: "HUB",
            color: "#9aa6b2",
            sections: [
                {
                    h: "How a hub works", html: `<p>A hub works on <b>Layer 1</b>: it does not understand MAC or IP addresses. Every frame that arrives on one port is repeated, bit by bit, out of <b>all other ports</b>.</p>
                    <p>So every computer on the hub sees every frame, and each NIC has to decide for itself whether the frame is meant for it. All ports share one <b>collision domain</b>; a switch would instead learn MAC addresses and send each frame only where it belongs.</p>`
                },
                { h: "Ports", html: `<table class="t"><tr><th>#</th><th>Link</th><th>Connected to</th><th>In</th><th>Out</th></tr>${rows}</table>` },
                { h: "Counters", html: `<table class="t kv"><tr><td>Frames repeated</td><td class="m">${this.repeated}</td></tr></table>` },
            ],
        };
    }
}
