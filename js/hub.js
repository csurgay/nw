class Hub extends Drawable {
    constructor(x,y) {
        super(x,y);
        this.id = new Id('Hub', this);
        this.ports = [];
    }

    addPort(port) {
        this.ports.push(port);
        port.attachHub(this);
    }

    processFrame(frame, sourcePort) {
        this.ports.forEach(port => {
            if (port.connected && port != sourcePort) {
                port.sendFrame(frame.copy());
            }
        });
        frame.removeFromDrawlist();
        Id.remove(frame);
    }

    draw() {
        super.draw();
    }

    toString() {
        return ""+super.toString() + " Ports:" + this.ports.length;
    }
}

class Hub4 extends Hub {
    constructor(x, y) {
        super(x, y);
        for (let i = 0; i < 4; i++) {
            const port = new Port(x + 20 + i * 40, y + 20);
            this.addPort(port);
        }
        Debug.log(this.id, "Create", this);
    }

    draw() {
        super.draw();
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.rect(this.x, this.y, 200, 41);
        ctx.stroke();
        ctx.closePath();
    }
}
