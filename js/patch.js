class Patch {
    constructor(id, port1, port2) {
        this.id = id;
        this.port1 = port1;
        this.port2 = port2;
        port1.connect(this);
        port2.connect(this);
        this.data = "";
        this.sending = false;
        this.sendPhase = 0; // 0% to 100%: port1 to port2;
        this.sendDirection = 1; // 1: port1 to port2, -1: port2 to port1
        this.animated = true; // Enable animation by default
    }
    
    draw() {
        ctx.beginPath();
        ctx.moveTo(this.port1.x, this.port1.y);
        ctx.lineTo(this.port2.x, this.port2.y); 
        ctx.strokeStyle = this.port1.isConnected() && this.port2.isConnected() ? 'blue' : 'gray';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
        if (this.sending) {
            ctx.beginPath();
            const midX = ((100-this.sendPhase) * this.port1.x + this.sendPhase * this.port2.x) / 100;
            const midY = ((100-this.sendPhase) * this.port1.y + this.sendPhase * this.port2.y) / 100;
            ctx.arc(midX, midY, 5, 0, Math.PI * 2);
            ctx.fillStyle = 'yellow';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.closePath();
            this.sendPhase += 1 * this.sendDirection;
            if (this.sendPhase >= 100 || this.sendPhase <= 0) {
                if (this.sendPhase >= 100) {
                    this.port2.rcvData(this.data);
                }
                else if (this.sendPhase <= 0) {
                    this.port1.rcvData(this.data);
                }
                this.sending = false;
            }
        }
    }

    sendData(data, senderPort) {
        if (this.animated) {
            this.sending = true;
            this.data = data;
            if (senderPort === this.port1) {
                this.sendDirection = 1; // port1 to port2
                this.sendPhase = 0; // reset phase
            }
            else if (senderPort === this.port2) {
                this.sendDirection = -1; // port2 to port1
                this.sendPhase = 100; // reset phase
            }
        }
        else {
            if (senderPort==this.port1) this.port2.rcvData(data);
            else if (senderPort==this.port2) this.port1.rcvData(data);
        }
    }
}
