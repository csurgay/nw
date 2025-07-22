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
				mac = Array.from({ length: 6 }, () =>
					this.id.seq.toString(16).padStart(2, '0')
				).join(':');
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
