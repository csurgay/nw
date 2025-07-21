class Host extends Drawable {
    constructor(x,y) {
        super(x,y);
        this.id = new Id("Host", this);
        this.nics = [];
        this.l2 = new Switching(this);
        this.l3 = new Routing(this);
    }

    addNic(nic) {
        this.nics.push(nic);
        nic.host = this;
        nic.tlvs.addData("SystemName", this.id.toString());
        // 192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.10
        this.l3.addRoute(nic);
    }

    draw() {
        super.draw();
        super.draw();
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.rect(this.x, this.y, 50, 80);
        ctx.stroke();
        ctx.closePath();
    }
}
