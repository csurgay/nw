class Host extends Clickable {
    constructor(x,y, terminal) {
        super(x,y);
        this.terminal = terminal;
        this.id = new Id("Host", this);
        this.nics = [];
        this.l2 = new Switching(this);
        this.l3 = new Routing(this);
        this.info.push(["LLDP",function(o){return o.l2.lldp?o.l2.lldp.enabled:"false";}]);
        this.info.push(["ARP",function(o){return o.l3.arp.enabled;}]);
        this.button.push(new Button(this.x+150,this.y+10,"LldpOn",function(o){o.host.l2.lldpStart();},this));
        this.button.push(new Button(this.x+150,this.y+30,"LldpDu",function(o){o.host.l2.sendLldpDu();},this));
        this.button.push(new Button(this.x+150,this.y+50,"ArpReq",function(o){o.host.l3.sendArpRequest();},this));
    }

    addNic(nic) {
        nic.host = this;
        this.nics.push(nic);
        nic.host = this;
        nic.tlvs.addData("SystemName", this.id.toString());
        // 192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.10
        this.l3.addRoute(nic);
    }

    draw() {
        super.draw();
        // host box
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.rect(this.x, this.y, 50, 80);
        ctx.stroke();
        ctx.closePath();
    }

    toString() {
        return super.toString();
    }
}
