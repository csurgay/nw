class MAC {
  constructor(mac="none") {
    this.address = "";
    if (mac !== "none") {
      this.address = mac;
    } else {
      this.address = Array.from({ length: 6 }, () => 
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
      ).join(':');;
    }
    log("MAC", "Create", this);
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
