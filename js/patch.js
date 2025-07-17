class Patch {
    constructor(id, port1, port2) { // full-duplex patch cable, no CSMA/CD required
        this.id = id;
        this.port1 = port1;
        this.port2 = port2;
        port1.connect(this);
        port2.connect(this);
        this.data = [];
        this.sending = [false, false]; // [port1 to port2, port2 to port1]
        this.sendPhase = [0, 0]; // 0% to 100%: port1 to port2;
        this.animated = true; // Enable animation by default
    }
    
    draw() {
        ctx.beginPath();
        ctx.moveTo(this.port1.x, this.port1.y);
        ctx.lineTo(this.port2.x, this.port2.y); 
        ctx.strokeStyle = this.port1.connected && this.port2.connected ? 'blue' : 'gray';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
        for (let i=0; i<=1; i++) {
            if (this.sending[i]) {
                const midX = ((100-this.sendPhase[i]) * this.port1.x + this.sendPhase[i] * this.port2.x) / 100;
                const midY = ((100-this.sendPhase[i]) * this.port1.y + this.sendPhase[i] * this.port2.y) / 100;
                ctx.beginPath();
                ctx.arc(midX, midY, 5, 0, Math.PI * 2);
                ctx.fillStyle = 'yellow';
                ctx.fill();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.closePath();
                this.sendPhase[i] += 1-i*2;
                if (this.sendPhase[i] >= 100 || this.sendPhase[i] <= 0) {
                    if (this.sendPhase[i] >= 100) {
                        this.port2.rcvData(this.data[0]);
                    }
                    else if (this.sendPhase[i] <= 0) {
                        this.port1.rcvData(this.data[1]);
                    }
                    this.sending[i] = false;
                }
            }
        }
    }

    sendData(data, senderPort) {
        if (this.animated) {
            if (senderPort === this.port1) {
                this.sending[0] = true;
                this.data[0] = data;
                this.sendPhase[0] = 0; // reset phase
            }
            else if (senderPort === this.port2) {
                this.sending[1] = true;
                this.data[1] = data;
                this.sendPhase[1] = 100; // reset phase
            }
        }
        else {
            if (senderPort==this.port1) this.port2.rcvData(data[0]);
            else if (senderPort==this.port2) this.port1.rcvData(data[1]);
        }
    }
}
