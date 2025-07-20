class IP {
  constructor(ip, cidr) {
    this.id = new Id('IP', this);
    this.ip = ip;
    this.cidr = cidr;
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
    return this.ip+"/"+this.cidr;
  }
}

class Packet {
    constructor(ipSrc=null, ipDst=null) {
      this.id = new Id('Packet', this);
      this.ipSrc = ipSrc;
      this.ipDst = ipDst;
    }
    toString() {
      return this.ipSrc+" -> "+this.ipDst;
    }
}
