class Hub {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.ports = [];
    }

    addPort(port) {
        this.ports.push(port);
        port.attachHub(this);
    }

    processFrame(frame, sourcePort) {
        this.ports.forEach(port => {
            if (port.connected && port != sourcePort) {
                port.sendFrame(frame);
            }
        });
    }

    toString() {
        return "Hub:" + this.id + " Ports:" + this.ports.length;
    }
}

class Hub4 extends Hub {
    constructor(id, x, y) {
        super(id, x, y);
        log("Hub4", "Create", this);
        for (let i = 0; i < 4; i++) {
            const port = new Port(`Port${i}`, x + i * 10, y);
            drawables.push(port);
            this.addPort(port);
        }
    }
}
