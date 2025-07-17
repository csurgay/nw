class MAC {
  static macs = [Lldp.lldpMulticast];
  constructor(mac="none") {
    this.address = "";
    if (mac !== "none") {
      if (this.isValid(mac)) {
        mac = mac.toLowerCase();
        this.address = mac;
      }
      else {
        error("MAC", "Invalid", `MAC address ${mac} is not valid.`);
      }
    } else {
      this.generateUnique();
    }
    MAC.macs.push(this.address);
    log("MAC", "Create", this);
  }

  generateUnique() {
    let newMac;
    do {
      newMac = Array.from({ length: 6 }, () =>
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
      ).join(':');
    } while (MAC.macs.includes(newMac));
    this.address = newMac;
  }

  toString() {
    return this.address;
  }

  isValid() {
    const parts = this.address.split(':');
    if (parts.length !== 6) return false;
    for (const part of parts) {
      const num = parseInt(part, 16);
      if (isNaN(num) || num < 0 || num > 255) return false;
    }
    return true;
  }
}
