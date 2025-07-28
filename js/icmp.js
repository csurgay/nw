class IcmpPacket {
    constructor(type, seq) {
        this.type = type;
        this.seq = seq;
    }
    toString() {
        return "Type:" + this.type + " Seq:" + this.seq;
    }
}

class ICMP {
    static Types = new Lookup("IcmpTypes", {
        "EchoRequest": 0x08,
        "EchoReply": 0x00,
    });

    constructor(host) {
        this.id = new Id('ICMP', this);
        this.host = host;
        Debug.log(this.id, "Create", this.host.id);
    }

    processIcmpPayload(payload, nic) {
        let icmpPacket = payload.data["ipPayload"];
        if (icmpPacket.type == ICMP.Types.getValue("EchoRequest")) {
            icmpPacket.type = ICMP.Types.getValue("EchoReply");
            let ipAux = payload.data["ipTarget"];
            payload.data["ipTarget"] = payload.data["ipSender"];
            payload.data["ipSender"] = ipAux;
            let macAux = payload.data["macTarget"];
            payload.data["macTarget"] = payload.data["macSender"];
            payload.data["macSender"] = macAux;
            this.host.l2.sendPayload(nic,
                Frame.EtherTypes.getValue("IPv4"),
                payload
            );
        }
        else if (icmpPacket.type == ICMP.Types.getValue("EchoReply")) {
            Debug.log(this.id, "Response", payload.data["ipTarget"]+
                "("+nic.id+")");
            this.host.terminal.print("\n64 bytes from " + 
                payload.data["ipSender"] + ": icmp_seq=1" +
                "\n" + this.host.terminal.prompt
            );
        }
    }

    sendEchoRequest(ip, nic) {
        Debug.log(this.id, "EchoRequest "+nic+" -> "+ip);
        const icmpPacket = new IcmpPacket(
            ICMP.Types.getValue('EchoRequest'), 1);
        const pl = new Payload();
        pl.addData("ipProtocol", IP.Protocol.getValue('ICMP'));
        pl.addData("ipSender", nic.ip.ip);
        pl.addData("ipTarget", ip);
        pl.addData("ipPayload", icmpPacket);
        pl.addData("payloadColor", getRandomColor());
        this.host.l2.sendPayload(nic, 
            Frame.EtherTypes.getValue('IPv4'), 
            pl
        );
    }
}
