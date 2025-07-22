class IP {
    constructor(ip, cidr) {
        this.id = new Id('IP', this);
        this.ip = ip;
        this.cidr = cidr;
        this.subnet = this.calcSubnet();
        Debug.log(this.id, "Create", this);
    }

    isValid() {
        const parts = this.ip.split('.');
        if (parts.length !== 4) return false;
        for (const part of parts) {
            const num = parseInt(part, 10);
            if (isNaN(num) || num < 0 || num > 255) return false;
        }
        return true;
    }

    toString() {
        return this.ip + "/" + this.cidr;
    }

    static calcBinary(ipString) {
        let octets = ipString.split(".");
        let binary = "";
        octets.forEach(octet => {
            binary += new Number(octet).toString(2).padStart(8, "0");
        });
        return binary;
    }

    calcSubnet() {
        let ipBinary = IP.calcBinary(this.ip);
        let subnetBinary = "";
        for (let i = 0; i < 32; i++) {
            if (i < this.cidr) subnetBinary += ipBinary[i];
            else subnetBinary += "0";
        }
        let subnet = "";
        for (let i = 0; i < 4; i++) {
            subnet += parseInt(subnetBinary.substring(8 * i, 8 * i + 8), 2).toString();
            if (i < 3) subnet += ".";
        }
        return subnet;
    }

    inSubnet(subnet) {
        let ret = true;
        let ipBinary = IP.calcBinary(this.ip);
        let subnetBinary = IP.calcBinary(subnet);
        for (let i = 0; i < this.cidr; i++) {
            if (ipBinary[i] != subnetBinary[i]) ret = false;
        }
        return ret;
    }
}
