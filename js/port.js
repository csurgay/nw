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

    isConnected() {
        return this.connected;
    }

    sendData(data) {
        if (this.isConnected() && this.patch) {
            console.log(`Sending data from ${this.id}:`, data);
            this.patch.sendData(data, this);
        } else {
            console.error(`Port ${this.id} is not connected.`);
        }
    }

    rcvData(data) {
        console.log(`Receiving data from ${this.id}:`, data);
    }
}
