class Test {
    static case = [
        ["blabla", ["blabla: command not found...", "*"], 100],
        ["ssh host1", ["[root@host1 ~]# "], 100],
        ["exit", ["[admin@console ~]$ "], 100],
        ["for i in {1..12}; do ssh host$i; done", ["[root@host12 ~]# "], 100],
        ["ssh host1 systemctl is-active lldpd", ["failed", "*"], 100],
        ["ssh host1 systemctl start lldpd", ["lldp.service started", "*"], 100],
        ["ssh host1 systemctl is-active lldpd", ["active", "*"], 100],
        ["ssh host1 lldpcli show chassis", ["SystemName: host1", "SystemCapabilities: Station", "*"], 100],
        ["ssh host1 lldpcli show neighbors", ["host1 LLDP neighbors:", "*"], 100],
        ["ssh host2 systemctl start lldpd", ["lldp.service started", "*"], 100],
        ["ssh host2 lldpcli update", ["*", "*"], 3000],
        ["ssh host1 lldpcli show neighbors", ["NIC2 [02:00:00:00:00:02]", "*"], 100],
        ["ssh host1 arping blabla", ["arping: blabla: Name or service not known", "*"], 100],
        ["ssh host1 arping 192.168.1.234", ["ARPING 192.168.1.234 from 192.168.1.1 NIC1"], 1000],
        ["ssh host1 arping 192.168.1.2", ["ARPING 192.168.1.2 from 192.168.1.1 NIC1"], 100],
        ["", ["Unicast reply from 192.168.1.2 [02:00:00:00:00:02]", "[root@host12 ~]# "], 4000],
        ["ssh host1 arp -a", ["? (192.168.1.2) at 02:00:00:00:00:02 [ether] on NIC1", "*"], 100],
        ["ssh host1 ping -c 3 192.168.1.2", ["PING 192.168.1.2 (192.168.1.2) 56(84) bytes of data."], 100],
        ["", ["--- 192.168.1.2 ping statistics ---", "*", "*", "*"], 7000],
        ["ssh host7 ping -c 1 192.168.1.21", ["PING 192.168.1.21 (192.168.1.21) 56(84) bytes of data."], 100],
        ["", ["--- 192.168.1.21 ping statistics ---", "*", "*", "*"], 14000],
        ["ssh host9 arp -a", ["[root@host12 ~]# ssh host9 arp -a", "*"], 100],
        // REACHABLE or STALE depends on the simulated clock: only the IP -> MAC pair is checked
        ["ssh host11 ip neigh", [/^192\.168\.1\.10 dev NIC11 lladdr 02:00:00:00:00:07 (REACHABLE|STALE)$/, "*"], 100],
        ["lab switch", ["Loaded lab: 3 · A switch learns MAC addresses", "*"], 100],
        ["ssh host1 ping -c 1 192.168.1.3", ["--- 192.168.1.3 ping statistics ---", "*", "*", "*"], 9000],
        ["ssh host2 ip neigh", ["[admin@console ~]$ ssh host2 ip neigh", "*"], 100],
        ["lab router", ["Loaded lab: 8 · A router joins two networks", "*"], 100],
        ["ssh host1 traceroute 192.168.2.10", ["traceroute to 192.168.2.10 (192.168.2.10), 30 hops max, 60 byte packets"], 100],
        ["", ["*", "*", "[admin@console ~]$ "], 16000],
        ["ssh router1 ip neigh", [/^192\.168\.1\.10 dev NIC5 lladdr 02:00:00:00:00:01 (REACHABLE|STALE)$/, /^192\.168\.2\.10 dev NIC6 lladdr 02:00:00:00:00:03 (REACHABLE|STALE)$/, "*"], 100],
        ["lab routing-loop", ["Loaded lab: 10 · A routing loop — why TTL exists", "*"], 100],
        ["ssh host1 ping -c 1 -t 4 172.16.0.1", ["From 10.0.0.2 icmp_seq=1 Time to live exceeded", "--- 172.16.0.1 ping statistics ---", "*", "*"], 12000],
        ["lab vlan", ["Loaded lab: 6 · VLANs: one switch, two worlds", "*"], 100],
        ["ssh host1 ping -c 1 192.168.1.3", ["From 192.168.1.1 icmp_seq=1 Destination Host Unreachable", "--- 192.168.1.3 ping statistics ---", "*", "*"], 14000],
        ["ssh host4 ip neigh", ["[admin@console ~]$ ssh host4 ip neigh", "*"], 100],
        ["lab dhcp", ["Loaded lab: 12 · DHCP: addresses for free", "*"], 100],
        ["ssh host1 dhclient", ["DHCPDISCOVER on NIC2 to 255.255.255.255 port 67 interval 3"], 100],
        ["", ["DHCPACK of 192.168.1.100 from 192.168.1.2", "bound to 192.168.1.100 -- renewal in 1800 seconds.", "[admin@console ~]$ "], 15000],
        ["ssh host1 cat /etc/resolv.conf", ["search lab", "nameserver 192.168.1.2", "*"], 100],
        ["lab dns", ["Loaded lab: 13 · DNS: names instead of numbers", "*"], 100],
        ["ssh host1 host host3", ["host3.lab has address 192.168.1.13", "[admin@console ~]$ "], 9000],
        ["ssh host1 host nobody", ["Host nobody.lab not found: 3(NXDOMAIN)", "[admin@console ~]$ "], 5000],
        ["cd /etc", ["[admin@console etc]$ "], 100],
        ["pwd", ["/etc", "*"], 100],
        ["cd", ["[admin@console ~]$ "], 100],
        ["ls /root", ["ls: cannot open directory '/root': Permission denied", "*"], 100],
        ["ssh host1 whoami", ["root", "*"], 100],
        ["ssh host1 pwd", ["/root", "*"], 100],
        ["ssh host1 cat /proc/sys/net/ipv4/ip_forward", ["0", "*"], 100],
        ["ssh host1 cat /etc/passwd | grep -c root", ["1", "*"], 100],
        ["ssh server1 ss -ulpn | grep -c UNCONN", ["1", "*"], 100],
        ["echo \"hi $USER\" > /tmp/t.txt", ["[admin@console ~]$ echo \"hi $USER\" > /tmp/t.txt", "*"], 100],
        ["cat /tmp/t.txt", ["hi admin", "*"], 100],
        ["ssh host1 hostname Pc1", ["[admin@console ~]$ ssh host1 hostname Pc1", "*"], 100],
        ["ssh Pc1 hostname", ["Pc1", "*"], 100],
        ["ssh Pc1 reboot", ["Connection to Pc1 closed by remote host.", "Connection to Pc1 closed.", "*"], 100],
        ["ssh host1 hostname", ["ssh: connect to host host1 port 22: Connection refused   (host1 is rebooting, try again in a few seconds)", "*"], 100],
        ["", ["*"], 4500],
        ["ssh host1 hostname", ["host1", "*"], 100],
        ["ls /nope && echo yes || echo no", ["no", "*"], 100],
        ["lab switch", ["Loaded lab: 3 · A switch learns MAC addresses", "*"], 100],
        ["ssh switch1", ["ssh: connect to host switch1 port 22: Connection refused   (switch1 is an unmanaged switch: there is nothing inside to log in to)", "*"], 100],
        ["lab linux-switch", ["Loaded lab: 15 · Managing a Linux switch", "*"], 100],
        ["ssh switch1 bridge vlan add dev swp3 vid 20 pvid untagged", ["[admin@console ~]$ ssh switch1 bridge vlan add dev swp3 vid 20 pvid untagged", "*"], 100],
        ["ssh switch1 bridge vlan show | grep swp3", ["swp3              20 PVID Egress Untagged", "*"], 100],
        ["ssh host1 ping -c 1 192.168.1.3", ["From 192.168.1.1 icmp_seq=1 Destination Host Unreachable", "--- 192.168.1.3 ping statistics ---", "*", "*"], 14000],
        ["lab ios-switch", ["Loaded lab: 16 · Managing an IOS-style switch", "*"], 100],
        ["ssh switch1 show vlan brief | include default", ["1    default                          active    Gi0/1, Gi0/2, Gi0/3, Gi0/4", "*"], 100],
        ["ssh switch1", ["switch1>"], 100],
        ["enable", ["switch1#"], 100],
        ["conf t", ["Enter configuration commands, one per line.  End with CNTL/Z.", "switch1(config)#"], 100],
        ["int gi0/3", ["switch1(config-if)#"], 100],
        ["switchport access vlan 20", ["% Access VLAN does not exist. Creating vlan 20", "switch1(config-if)#"], 100],
        ["end", ["%SYS-5-CONFIG_I: Configured from console by vty0", "switch1#"], 100],
        ["exit", ["Connection to switch1 closed.", "[admin@console ~]$ "], 100],
        ["lab router", ["Loaded lab: 8 · A router joins two networks", "*"], 100],
        ["ssh router1 sysctl net.ipv4.ip_forward", ["net.ipv4.ip_forward = 1", "*"], 100],
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
        this.stopped = false;
        this.index = this.startCase;
        Sim.play(); // the waits are in simulated time: any speed works
        setTimeout(this.input.bind(this), 100);
    }

    // the Autotest window can stop a run between two cases
    stop() {
        this.stopped = true;
    }

    input() {
        if (this.stopped) return this.finish();
        let inStr = Test.case[this.index][0];
        if (inStr != "") {
            this.terminal.print(inStr);
            this.terminal.enter(inStr);
        }
        Sim.wait(Test.case[this.index][2], () => this.output());
    }

    output() {
        let outStr = this.terminal.lastLines();
        let assert = Test.case[this.index][1];
        let ret = true;
        const fails = [];
        for (let i=assert.length-1; i>=0; i--) {
            const want = assert[i], got = outStr[assert.length-1-i];
            const match = want instanceof RegExp ? want.test(got || "") : want == got;
            if (want != "*" && !match) {
                ret = false;
                fails.push({ want: assert[i], got: outStr[assert.length-1-i] });
                Debug.error(this.id, this.index+".assert", "_" + assert[i] 
                    + "_ is not _" + outStr[assert.length-1-i] + "_");
            }
        }
        if (this.listener) this.listener.onCase(this.index, fails.reverse());
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
        else this.finish();
    }

    finish() {
        if (this.failed) {
            Debug.log(this.id, "SOME TESTS", "FAILED");
        }
        else {
            Debug.log(this.id, "ALL TESTS", "OK");
        }
        // End of testing
        DEBUG = "whitelist";
        if (this.listener) this.listener.onDone(!this.failed, this.stopped);
    }
}
