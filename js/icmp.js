class ICMP {
    constructor(host) {
        this.id = new Id('ICMP', this);
        this.host = host;
        Debug.log(this.id, "Create", this.host.id);
    }

    processIcmpPayload(payload, nic) {
        let icmpPacket = payload.getPayload();
        if (icmpPacket.getValue("Type") == "EchoRequest") {
            icmpPacket.addValue("Type", "EchoReply");
            let ipPacket = new IpPacket(
                "ICMP",
                payload.getValue("DstIP"),
                payload.getValue("SrcIP"),
                icmpPacket
            );
            ipPacket.color = payload.color;
            this.host.l3.sendIpPacket(nic, ipPacket);
        }
        else if (icmpPacket.getValue("Type") == "EchoReply") {
            Debug.log(this.id, "Response", payload.getValue("DstIP") +
                "("+nic.id+")");
            this.host.terminal.print("\n64 bytes from " + 
                payload.getValue("DstIP") + ": icmp_seq=" + 
                icmpPacket.getValue("Seq") +
                "\n" + this.host.terminal.prompt
            );
        }
    }

    sendEchoRequest(ip, nic) {
        Debug.log(this.id, "EchoRequest "+nic+" -> "+ip);
        let icmpPacket = new IcmpPacket('EchoRequest', 1);
        let ipPacket = new IpPacket('ICMP', nic.ip.ip, ip, icmpPacket);
        this.host.l3.sendIpPacket(nic, ipPacket);
    }
}
