class IPaddress {
  constructor(ip, cidr) {
    this.ip = ip;
    this.cidr = cidr;
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
