class Test {
    static case = [
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
        ["ssh Host1 lldpcli show neighbors", ["NIC2 [02:02:02:02:02:02]", "*"], 100],
        ["ssh Host1 arping blabla", ["arping: blabla: Name or service not known", "*"], 100],
        ["ssh Host1 arping 192.168.1.234", ["*", "*"], 1000],
        ["ssh Host1 arping 192.168.1.2", ["ARPING 192.168.1.2 from 192.168.1.1 NIC1", "*"], 3000],
        ["", ["Unicast reply from 192.168.1.2 [02:02:02:02:02:02]", "[root@Host12 ~]# "], 3000],
        ["ssh Host1 arp -a", ["? (192.168.1.2) at 02:02:02:02:02:02 [ether] on NIC1", "*"], 100],
        ["ssh Host1 ping 192.168.1.2", ["PING 192.168.1.2 (192.168.1.2) 56(84) bytes of data.", "*"], 3000],
    ];

    constructor(terminal, shell) {
        this.terminal = terminal;
        this.shell = shell;
        this.index = 0;
        this.failed = false;
    }

    test() {
        this.index = 0;
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
                Debug.error("Test", "assert", "_" + assert[i] 
                    + "_ is not _" + outStr[assert.length-1-i] + "_");
            }
        }
        if (ret) {
            Debug.log("Test", assert, "...OK");
        }
        else {
            this.failed = true;
        }
        this.index++;
        if (this.index < Test.case.length) {
            setTimeout(this.input.bind(this), 10);
        }
        else {
            if (this.failed) {
                Debug.log("Test", "SOME TESTS", "FAILED");
            }
            else {
                Debug.log("Test", "ALL TESTS", "OK");
            }
            // End of testing
            DEBUG = "whitelist";
        }
    }
}
