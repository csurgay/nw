class Patch extends Clickable {
    constructor(port1, port2) { // full-duplex patch cable, no CSMA/CD required
        super((port1.x+port2.x)/2,(port1.y+port2.y)/2);
        this.id = new Id('Patch', this);
        this.ports = [port1, port2];
        port1.connect(this);
        port2.connect(this);
        this.frame = [null, null]; // full duplex: [port1 to port2, port2 to port1]
        this.sending = [false, false]; // [port1 to port2, port2 to port1]
        this.queue = []; // queues for both directions
        this.animated = true; // Enable animation by default
        Debug.log(this.id, "Create", this);
        setTimeout(this.checkQueue.bind(this), 100);
        this.info.push(["Q", function(o){ return o.queue.length;}]);
        this.info.push(["F[0]", function(o){ return o.frame[0];}]);
        this.info.push(["F[1]", function(o){ return o.frame[1];}]);
    }
    
    draw() {
        super.draw();
        ctx.beginPath();
        ctx.moveTo(this.ports[0].x, this.ports[0].y);
        ctx.lineTo(this.ports[1].x, this.ports[1].y);
        ctx.strokeStyle = 'lightgray';
        if (this.ports[0].connected && this.ports[1].connected)
            ctx.strokeStyle = 'blue';
        if (this.sending[0] || this.sending[1])
            ctx.strokeStyle = 'gray'; // Highlight if sending
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
        if (this.animated) for (let i=0; i<=1; i++) {
            if (this.sending[i]) {
                this.frame[i].x = 
                    ((100-this.frame[i].phase) * this.ports[i].x + 
                    this.frame[i].phase * this.ports[1-i].x) / 100;
                this.frame[i].y = 
                    ((100-this.frame[i].phase) * this.ports[i].y + 
                    this.frame[i].phase * this.ports[1-i].y) / 100;
                this.frame[i].phase += 1;
                if (this.frame[i].phase >= 100) {
                    this.deliverFrame(this.ports[1-i], this.frame[i]);
                    this.sending[i] = false;
                    this.frame[i] = null;
                }
            }
        }
    }

    sendFrame(frame, senderPort) {
        this.queue.push([frame,senderPort]);
    }

    checkQueue() {
        this.queue.forEach( (item, index) => {
            const [frame, senderPort] = item;
            for (let i=0; i<=1; i++) {
                if (senderPort==this.ports[i] && !this.sending[i]) {
                    if (this.animated) {
                        this.frame[i] = frame;
                        this.sending[i] = true;
                        this.frame[i].phase = 0;
                        this.queue.splice(index, 1);
                    }
                    else this.deliverFrame(this.ports[1-i], frame);
                }
            }
        })
        setTimeout(this.checkQueue.bind(this), 100);
    }

    deliverFrame(rcvPort, frame) {
        rcvPort.rcvFrame(frame);
    }

    toString() {
        return "" +
            this.id.toString() + ": " + 
            this.ports[0].toString() + " <-> " + 
            this.ports[1].toString();
    }
}
