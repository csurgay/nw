class Port {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.connected = false;
        this.patch = null;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = this.connected ? 'green' : 'red';
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
    }

    connect(patch) {
        this.connected = true;
        this.patch = patch;
    }

    disconnect() {
        this.connected = false;
        this.patch = null;
    }

    sendFrame(frame) {
        if (this.connected && this.patch) {
            log("Port", "Send", this.id + ": " + frame);
            this.patch.sendFrame(frame, this);
        } else {
            error("Port", "NotConnected", this.id);
        }
    }

    rcvFrame(frame) {
        log("Port", "Receive", this.id + ": " + frame);
    }

    toString() {
        return this.id;
    }
}

class NIC extends Port {
    constructor(id, x, y ,mac) {
        super(id, x, y);
        this.mac = mac; // Instance of MacAddress
        log("NIC", "Create", this);
        this.lldp = new Lldp(this);
    }

    toString() {
        return super.toString() + " " + this.mac;
    }
}
