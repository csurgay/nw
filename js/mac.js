class Macs {
    constructor() {
        this.macs = [];
    }

    generateRandom() {
        const randomMac = () => {
            return Array.from({ length: 6 }, () => 
                Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
            ).join(':');
        };
        
        let mac;
        do {
            mac = new MacAddress(randomMac());
        } while (!mac.isValid() || this.macs.some(existingMac => existingMac.address === mac.address));
        
        this.add(mac);
        return mac;
    }
    
    add(mac) {
        if (!(mac instanceof MacAddress)) {
        throw new Error("Only instances of MacAddress can be added.");
        }
        this.macs.push(mac);
    }
}

class MacAddress {
  constructor(address) {
    this.address = address;
  }

  toString() {
    return this.address;
  }

  static fromString(address) {
    return new MacAddress(address);
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
