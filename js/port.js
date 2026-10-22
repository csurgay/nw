// An RJ45 socket. Hub ports are plain Ports, a NIC is a Port with a MAC.
class Port extends Clickable {
    constructor(x, y) {
        super(x, y);
        this.id = new Id('Port', this); // Unique identifier for Port
        this.host = null; // the host this nic is plugged in
        this.connected = false;
        this.patch = null; // Reference to the Patch cable if connected
        this.hub = null; // Reference to the hub if attached
        this.dir = "down"; // direction the cable leaves the socket
        this.vlan = 1; // switch port: access VLAN
        this.trunk = false; // switch port: carries all VLANs with 802.1Q tags
        this.scale = 1;
        this.lastTx = -1e9;
        this.lastRx = -1e9;
        this.stats = { tx: 0, rx: 0, drop: 0 };
        this.info.push(["Conn", function (o) { return o.connected; }]);
    }

    connect(patch) {
        this.connected = true;
        this.patch = patch;
    }

    disconnect() {
        this.connected = false;
        this.patch = null;
    }

    peer() {
        return this.patch ? this.patch.other(this) : null;
    }

    owner() {
        return this.host || this.hub;
    }

    // point where the cable leaves the plug boot
    anchor() {
        const d = Gfx.dirVec(this.dir);
        return { x: this.x + d.x * 13 * this.scale, y: this.y + d.y * 13 * this.scale };
    }

    linkUp() {
        const o = this.connected && this.patch && this.patch.other(this);
        if (!o) return false;
        // a rebooting machine has its card off: no link light on either end
        if ((this.host && this.host.down) || (o.host && o.host.down)) return false;
        return o;
    }

    activity() {
        return Sim.time - Math.max(this.lastTx, this.lastRx) < 260;
    }

    sendFrame(frame) {
        if (this.connected && this.patch) {
            this.lastTx = Sim.time;
            this.stats.tx++;
            Debug.log(this.id, "Send", frame);
            this.patch.sendFrame(frame, this);
        } else {
            Debug.error(this.id, "NotConnected", this.id);
            Sim.event("drop", `<b>${this.owner()}</b> ${this.id}: no cable plugged in, frame lost`, { frame });
            frame.dispose();
        }
    }

    rcvFrame(frame) {
        this.lastRx = Sim.time;
        this.stats.rx++;
        Debug.log(this.id, "Receive", frame);
        if (this.hub) {
            this.hub.processFrame(frame, this);
        }
    }

    attachHub(hub) {
        this.hub = hub;
    }

    // RJ45 socket + plug + link/activity LEDs
    drawJack(ledOffset) {
        const cable = this.patch ? this.patch.color : null;
        Gfx.jack(this.x, this.y, this.dir, this.scale, { plug: cable });
        if (ledOffset) {
            const blink = this.activity() && Math.floor(Sim.time / 70) % 2 == 0;
            Gfx.led(this.x + ledOffset[0].x, this.y + ledOffset[0].y, 2.2 * this.scale, COLORS.ledGreen, this.linkUp());
            Gfx.led(this.x + ledOffset[1].x, this.y + ledOffset[1].y, 2.2 * this.scale, COLORS.ledAmber, blink);
        }
    }

    hit(x, y) {
        return Math.abs(x - this.x) < 9 * this.scale && Math.abs(y - this.y) < 9 * this.scale;
    }

    bounds() {
        return { x: this.x - 8 * this.scale, y: this.y - 8 * this.scale, w: 16 * this.scale, h: 16 * this.scale };
    }

    toString() {
        return super.toString();
    }
}
