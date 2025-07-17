class Lldp {
    constructor(nic) {
        this.nic = nic; // NIC instance
        this.table = {};
        console.log(`LLDP initialized for NIC: ${nic}`);
        setTimeout(this.sendLldpDu.bind(this), 1000);
    }

    add(mac, port) {
        if (!this.table[mac]) {
            this.table[mac] = [];
        }
        this.table[mac].push(port);
    }

    remove(mac, port) {
        if (this.table[mac]) {
            this.table[mac] = this.table[mac].filter(p => p !== port);
            if (this.table[mac].length === 0) {
                delete this.table[mac];
            }
        }
    }

    sendLldpDu() {
        console.log(`Sending LLDP-DU from ${this.nic}`);
        const frame = new Frame(lldpMulticast, this.nic.mac, 'lldp', "myTlvList");        
        this.nic.sendFrame(frame, this.nic);
        setTimeout(this.sendLldpDu.bind(this), 5000); // Resend every 30 seconds
    }
}
