class MAC {
	static macs = [LLDP.MULTICAST];
	constructor(mac = "none") {
		this.id = new Id('MAC', this); // Unique identifier for MAC
		this.address = "";
		if (mac != "none") {
			if (this.isValid(mac)) {
				mac = mac.toLowerCase();
				this.address = mac;
			}
			else if (mac == "same") {
				// readable lab address: locally administered unicast (02:…),
				// the last digits are the NIC number, e.g. NIC12 -> 02:00:00:00:00:12
				const n = String(this.id.seq).padStart(4, '0');
				mac = "02:00:00:00:" + n.slice(0, 2) + ":" + n.slice(2, 4);
				this.address = mac;
			}
			else {
				error(this.id, "Invalid", `MAC address ${mac} is not valid.`);
			}
		} else {
			this.generateUnique();
		}
		MAC.macs.push(this.address);
		Debug.log(this.id, "Create", this);
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

	isValid(mac) {
		const parts = mac.split(':');
		if (parts.length !== 6) return false;
		for (const part of parts) {
			const num = parseInt(part, 16);
			if (isNaN(num) || num < 0 || num > 255) return false;
		}
		return true;
	}
}
