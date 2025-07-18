class Port extends Drawable {
    constructor(id, x, y) {
        super(id, x, y);
        this.type = new Id('Port', this); // Unique identifier for Port
        this.connected = false;
        this.patch = null;
        this.hub = null; // Reference to the hub if attached
    }

    draw() {
        super.draw();
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
