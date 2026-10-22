class Test {
    static case = [
        ["blabla", ["blabla: command not found...", "*"], 100],
        ["ssh Host1", ["[root@Host1 ~]# "], 100],
        ["exit", ["[admin@console ~]$ "], 100],
        ["for i in {1..12}; do ssh Host$i; done", ["[root@Host12 ~]# "], 100],
        ["ssh Host1 systemctl is-active lldpd", ["failed", "*"], 100],
        ["ssh Host1 systemctl start lldpd", ["lldp.service started", "*"], 100],
        ["ssh Host1 systemctl is-active lldpd", ["active", "*"], 100],
        ["ssh Host1 lldpcli show chassis", ["SystemName: Host1", "SystemCapabilities: Station", "*"], 100],
        ["ssh Host1 lldpcli show neighbors", ["Host1 LLDP neighbors:", "*"], 100],
        ["ssh Host2 systemctl start lldpd", ["lldp.service started", "*"], 100],
        ["ssh Host2 lldpcli update", ["*", "*"], 3000],
        ["ssh Host1 lldpcli show neighbors", ["NIC2 [02:00:00:00:00:02]", "*"], 100],
        ["ssh Host1 arping blabla", ["arping: blabla: Name or service not known", "*"], 100],
        ["ssh Host1 arping 192.168.1.234", ["ARPING 192.168.1.234 from 192.168.1.1 NIC1"], 1000],
        ["ssh Host1 arping 192.168.1.2", ["ARPING 192.168.1.2 from 192.168.1.1 NIC1"], 100],
        ["", ["Unicast reply from 192.168.1.2 [02:00:00:00:00:02]", "[root@Host12 ~]# "], 4000],
        ["ssh Host1 arp -a", ["? (192.168.1.2) at 02:00:00:00:00:02 [ether] on NIC1", "*"], 100],
        ["ssh Host1 ping -c 3 192.168.1.2", ["PING 192.168.1.2 (192.168.1.2) 56(84) bytes of data."], 100],
        ["", ["--- 192.168.1.2 ping statistics ---", "*", "*", "*"], 7000],
        ["ssh Host7 ping -c 1 192.168.1.21", ["PING 192.168.1.21 (192.168.1.21) 56(84) bytes of data."], 100],
        ["", ["--- 192.168.1.21 ping statistics ---", "*", "*", "*"], 14000],
        ["ssh Host9 arp -a", ["[root@Host12 ~]# ssh Host9 arp -a", "*"], 100],
        ["ssh Host11 ip neigh", ["192.168.1.10 dev NIC11 lladdr 02:00:00:00:00:07 REACHABLE", "*"], 100],
        ["lab switch", ["Loaded lab: 3 · A switch learns MAC addresses", "*"], 100],
        ["ssh Host1 ping -c 1 192.168.1.3", ["--- 192.168.1.3 ping statistics ---", "*", "*", "*"], 9000],
        ["ssh Host2 ip neigh", ["[admin@console ~]$ ssh Host2 ip neigh", "*"], 100],
        ["lab router", ["Loaded lab: 6 · A router joins two networks", "*"], 100],
        ["ssh Host1 traceroute 192.168.2.10", ["traceroute to 192.168.2.10 (192.168.2.10), 30 hops max, 60 byte packets"], 100],
        ["", ["*", "*", "[admin@console ~]$ "], 16000],
        ["ssh Router1 ip neigh", ["192.168.1.10 dev NIC5 lladdr 02:00:00:00:00:01 REACHABLE", "192.168.2.10 dev NIC6 lladdr 02:00:00:00:00:03 REACHABLE", "*"], 100],
        ["lab routing-loop", ["Loaded lab: 8 · A routing loop — why TTL exists", "*"], 100],
        ["ssh Host1 ping -c 1 -t 4 172.16.0.1", ["From 10.0.0.2 icmp_seq=1 Time to live exceeded", "--- 172.16.0.1 ping statistics ---", "*", "*"], 12000],
    ];

    constructor(terminal, shell) {
        this.id = new Id("Test", this);
        this.terminal = terminal;
        this.shell = shell;
        this.index = 0;
        this.startCase;
        this.endCase;
        this.failed = false;
    }

    test(startCase, endCase) {
        if (isNaN(parseInt(startCase))) {
            this.startCase = 0;
            this.endCase = Test.case.length - 1;
        }
        else {
            this.startCase = parseInt(startCase);
            if (isNaN(parseInt(endCase))) {
                this.endCase = parseInt(startCase);
            }
            else {
                this.endCase = parseInt(endCase);
            }
        }
        if (this.startCase == 0) Topology.load("classic"); // the cases expect the original lab
        this.failed = false;
        this.index = this.startCase;
        Sim.setSpeed(1); // test timing assumes real-time speed
        Sim.play();
        setTimeout(this.input.bind(this), 100);
    }

    input() {
        let inStr = Test.case[this.index][0];
        if (inStr != "") {
            this.terminal.print(inStr);
            this.terminal.enter(inStr);
        }
        setTimeout(this.output.bind(this), Test.case[this.index][2]);
    }

    output() {
        let outStr = this.terminal.lastLines();
        let assert = Test.case[this.index][1];
        let ret = true;
        for (let i=assert.length-1; i>=0; i--) {
            if (assert[i] != "*" && assert[i] != outStr[assert.length-1-i]) {
                ret = false;
                Debug.error(this.id, this.index+".assert", "_" + assert[i] 
                    + "_ is not _" + outStr[assert.length-1-i] + "_");
            }
        }
        if (ret) {
            Debug.log(this.id, this.index+"."+assert, "...OK");
        }
        else {
            this.failed = true;
        }
        this.index++;
        if (this.index <= this.endCase) {
            setTimeout(this.input.bind(this), 10);
        }
        else {
            if (this.failed) {
                Debug.log(this.id, "SOME TESTS", "FAILED");
            }
            else {
                Debug.log(this.id, "ALL TESTS", "OK");
            }
            // End of testing
            DEBUG = "whitelist";
        }
    }
}
