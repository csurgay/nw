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
            this.host.terminal.println("64 bytes from " + 
                payload.getValue("DstIP") + ": icmp_seq=" + 
                icmpPacket.getValue("Seq")
            );
            this.host.terminal.showPrompt();
        }
    }

    sendEchoRequest(ip, nic, seq) {
        Debug.log(this.id, "EchoRequest "+nic+" -> "+ip);
        let icmpPacket = new IcmpPacket('EchoRequest', seq);
        let ipPacket = new IpPacket('ICMP', nic.ip.ip, ip, icmpPacket);
        this.host.l3.sendIpPacket(nic, ipPacket);
    }

    ping(shell, command) {
        if (!command[1]) {
            shell.t.println("uping: usage error: Destination address required");
        }
        else if(!IP.isValid(command[1])) {
            shell.t.println("ping: " + command[1] + ": Name or service not known");
        }
        else {
            shell.t.println("PING " + command[1] + 
                " (" + command[1] + ") 56(84) bytes of data.");
            for (let seq=1; seq<=3; seq++) {
                this.sendEchoRequest(command[1], 
                    this.host.l3.routing.route(command[1]), seq);
            }
        }
    }
}
