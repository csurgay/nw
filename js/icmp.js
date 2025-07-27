class ICMP {
    constructor(host) {
        this.id = new Id('ICMP', this);
        this.host = host;
        Debug.log(this.id, "Create", this.host.id);
    }

    processIcmpPayload(payload, nic, color = getRandomColor()) {
        if (payload["opCode"] == "PingRequest") 
        {
            const pl = new Payload();
            pl.addData("opCode", "PingResponse");
            const frame = new Frame(
                nic.x,nic.y, payload["macTarget"], 
                nic.mac, 'icmp', pl
            );
            this.host.l2.sendFrame(nic, frame, color);
        }
        if (payload["ipTarget"] == nic.ip.ip && 
            payload["opCode"] == "PingResponse") 
        {
            Debug.log(this.id, "Response", payload["ipTarget"]+
                "("+nic.id+")");
            this.host.terminal.print("\n64 bytes from " + 
                payload["ipSender"] + ": icmp_seq=1" +
                "\n" + this.host.terminal.prompt
            );
        }
    }

    sendQuery(ip, nic) {
        Debug.log(this.id, "Query "+nic+" -> "+ip);
        const pl = new Payload();
        pl.addData("opCode", "PingRequest");
        pl.addData("ipSrc", nic.ip.ip);
        pl.addData("ipDst", ip);
        let macTarget = this.host.l3.arp.getMAC(ip);
        if (macTarget) {
            const frame = new Frame(
                nic.x,nic.y, macTarget, nic.mac, 'icmp', pl
            );
            this.host.l2.sendFrame(nic, frame);
        }
        else {
            this.host.terminal.print("ide kell egy arp előbb");
        }
    }
}
