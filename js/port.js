class Port extends Clickable {
    constructor(x, y) {
        super(x, y);
        this.id = new Id('Port', this); // Unique identifier for Port
        this.host = null; // the host this nic is plugged in
        this.connected = false;
        this.patch = null; // Reference to the Patch cable if connected
        this.hub = null; // Reference to the hub if attached
        this.info.push(["Conn", function (o) { return o.connected; }]);
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
            Debug.log(this.id, "Send", frame);
            this.patch.sendFrame(frame, this);
        } else {
            error(this.id, "NotConnected", this.id);
        }
    }

    rcvFrame(frame) {
        Debug.log(this.id, "Receive", frame);
        if (this.hub) {
            this.hub.processFrame(frame, this);
        }
    }

    attachHub(hub) {
        this.hub = hub;
    }

    toString() {
        return super.toString();
    }
}
