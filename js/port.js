class Port {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.connected = false;
        this.patch = null;
        this.hub = null; // Reference to the hub if attached
    }

    draw() {
        ctx.beginPath();
        ctx.fillStyle = this.connected ? 'green' : 'red';
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
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
        if (this.hub) {
            this.hub.processFrame(frame, this);
        }
    }

    attachHub(hub) {
        this.hub = hub;
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

    rcvFrame(frame) {
        super.rcvFrame(frame);
        if (frame.etherType === 'lldp') {
            this.lldp.add(frame.payload, frame.macSrc.toString(), Date.now());
        }
    }

    toString() {
        return super.toString() + " " + this.mac;
    }
}
