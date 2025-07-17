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
            console.log(`Sending data from ${this.id}:`, frame.toString());
            this.patch.sendFrame(frame, this);
        } else {
            console.error(`Port ${this.id} is not connected.`);
        }
    }

    rcvFrame(frame) {
        console.log(`Receiving data from ${this.id}:`, frame.toString());
    }

    toString() {
        return `${this.id}`;
    }
}

class NIC extends Port {
    constructor(id, x, y ,mac) {
        super(id, x, y);
        this.mac = mac; // Instance of MacAddress
        console.log("NIC created: " + this.toString());
        this.lldp = new Lldp(this);
    }

    toString() {
        return super.toString()+" "+this.mac.toString();
    }
}
