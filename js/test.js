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
        ["ssh Host1 lldpcli show neighbors", ["NIC2 [02:02:02:02:02:02]", "*"], 100],
        ["ssh Host1 arping blabla", ["arping: blabla: Name or service not known", "*"], 100],
        ["ssh Host1 arping 192.168.1.234", ["*", "*"], 1000],
        ["ssh Host1 arping 192.168.1.2", ["ARPING 192.168.1.2 from 192.168.1.1 NIC1", "*"], 3000],
        ["", ["Unicast reply from 192.168.1.2 [02:02:02:02:02:02]", "[root@Host12 ~]# "], 3000],
        ["ssh Host1 arp -a", ["? (192.168.1.2) at 02:02:02:02:02:02 [ether] on NIC1", "*"], 100],
        ["ssh Host1 ping 192.168.1.2", ["PING 192.168.1.2 (192.168.1.2) 56(84) bytes of data.", "*"], 3000],
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
        this.failed = false;
        this.index = this.startCase;
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
