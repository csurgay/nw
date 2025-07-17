class Patch {
    constructor(id, port1, port2) { // full-duplex patch cable, no CSMA/CD required
        this.id = id;
        this.port1 = port1;
        this.port2 = port2;
        port1.connect(this);
        port2.connect(this);
        this.frame = []; // full duplex: [port1 to port2, port2 to port1]
        this.sending = [false, false]; // [port1 to port2, port2 to port1]
        this.sendPhase = [0, 0]; // 0% to 100%: port1 to port2;
        this.queue = [[], []]; // [port1 to port2, port2 to port1] queues for frames
        this.animated = true; // Enable animation by default
        this.color = [0, 0];
//        this.animated = false; // Enable animation by default
        log("Patch", "Create", this);
        setTimeout(this.checkQueue.bind(this), 100);
    }
    
    draw() {
        ctx.beginPath();
        ctx.moveTo(this.port1.x, this.port1.y);
        ctx.lineTo(this.port2.x, this.port2.y); 
        ctx.strokeStyle = this.port1.connected && this.port2.connected ? 'blue' : 'gray';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
        if (this.animated) for (let i=0; i<=1; i++) {
            if (this.sending[i]) {
                const midX = ((100-this.sendPhase[i]) * this.port1.x + this.sendPhase[i] * this.port2.x) / 100;
                const midY = ((100-this.sendPhase[i]) * this.port1.y + this.sendPhase[i] * this.port2.y) / 100;
                ctx.beginPath();
                ctx.arc(midX, midY, 5, 0, Math.PI * 2);
                ctx.fillStyle = this.color[i]; // Use color for visualization
                ctx.fill();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.closePath();
                this.sendPhase[i] += 1-i*2;
                if (this.sendPhase[i] >= 100 || this.sendPhase[i] <= 0) {
                    if (this.sendPhase[i] >= 100) {
                        this.deliverFrame(this.port2, this.frame[0]);
                    }
                    else if (this.sendPhase[i] <= 0) {
                        this.deliverFrame(this.port1, this.frame[1]);
                    }
                    this.sending[i] = false;
                }
            }
        }
    }

    sendFrame(frame, senderPort) {
        if (this.animated) {
            if (senderPort === this.port1) {
                this.queue[0].push(frame);
            }
            else if (senderPort === this.port2) {
                this.queue[1].push(frame);
            }
        }
        else {
            if (senderPort==this.port1) this.deliverFrame(this.port2, frame);
            else if (senderPort==this.port2) this.deliverFrame(this.port1, frame);
        }
    }

    checkQueue() {
        if (!this.sending[0] && this.queue[0].length>0) {
            this.frame[0] = this.queue[0].shift();
            this.color[0] = this.frame[0].color; // Set color for visualization
            this.sending[0] = true;
            this.sendPhase[0] = 0; // reset phase
        }
        if (!this.sending[1] && this.queue[1].length>0) {
            this.frame[1] = this.queue[1].shift();
            this.color[1] = this.frame[1].color; // Set color for visualization
            this.sending[1] = true;
            this.sendPhase[1] = 100; // reset phase
        }
        setTimeout(this.checkQueue.bind(this), 100);
    }

    deliverFrame(rcvPort, frame) {
        rcvPort.rcvFrame(frame);
    }

    toString() {
        return this.id + ": " + this.port1 + " <-> " + this.port2;
    }
}
