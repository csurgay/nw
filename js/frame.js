class Frame extends Drawable {
    static EtherType = {
        "IPv4": 0x0800,
        "ARP": 0x0806,
        "Wake-on-LAN": 0x0842,
        "LLDP": 0x88cc,
    }

    constructor(x, y, macDst, macSrc, etherType, payload) {
        super(x,y);
        this.id = new Id("Frame", this);
        this.macDst = macDst; // Destination MAC address
        this.macSrc = macSrc; // Source MAC address
        this.etherType = etherType; // EtherType field: "ipv4", "ipv6", "arp", "vlan", "lldp"
        this.payload = payload; // Data being sent
        this.timestamp = Date.now(); // Timestamp for the frame
        this.color=getRandomColor(); // Random color for visualization
        this.phase = 0; // distance% along the way on a patch
        Debug.log(this.id, "Create", this);
    }

    copy() {
        const frame = new Frame(this.x,this.y, this.macDst, this.macSrc, 
            this.etherType, this.payload);
        frame.id = this.id;
        frame.timestamp = this.timestamp;
        frame.color = this.color;
        return frame;
    }

    draw() {
        super.draw(this.etherType);
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = this.color; // Use color for visualization
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.closePath();
   }

    toString() {
        return "" +
            super.toString() + 
            " Dst:" + this.macDst + 
            " Src:" + this.macSrc + 
            " EtherType:" + this.etherType + 
            " Payload:" + this.payload;
    }

    removeFromDrawlist() {
        const index = Id.list["Drawable"].indexOf(this);
        if (index==-1) {
            Debug.error(this.id,"Frame not in Drawable",Id.list["Drawable"])
        }
        else {
            Id.list["Drawable"].splice(index, 1);
            Debug.log(this.id, "RemoveFromDrawlist", this.id);
        }
    }

}
