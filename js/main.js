// ---- Lab topology (creation order matters: it sets Host/NIC numbers and MACs) ----

// three point-to-point links: Host1-Host2, Host3-Host4, Host5-Host6
for (let i = 0; i < 3; i++) {
	const y = 300 + 98 * i;
	const nic1 = new NIC(0, 0, new MAC("same"));
	nic1.addIP(new IP(`192.168.1.${2 * i + 1}`, 24));
	const host1 = new Host(160, y, terminal, { nicSide: "right" });
	host1.addNic(nic1);
	const nic2 = new NIC(0, 0, new MAC("same"));
	nic2.addIP(new IP(`192.168.1.${2 * i + 2}`, 24));
	const host2 = new Host(792, y, terminal, { nicSide: "left" });
	host2.addNic(nic2);
	const patch = new Patch(nic1, nic2, { sag: 18 });
}

// two hubs with three hosts each, hubs joined by an uplink cable
const hub4a = new Hub4(72, 22);
for (let i = 0; i < 3; i++) {
	const nic = new NIC(0, 0, new MAC("same"));
	const host = new Host(40 + 86 * i, 150, terminal, { nicSide: "up" });
	nic.addIP(new IP(`192.168.1.${10 + i}`, 24));
	host.addNic(nic);
	const patch = new Patch(nic, hub4a.ports[i], { sag: 0 });
}

const hub4b = new Hub4(612, 22);
for (let i = 0; i < 3; i++) {
	const nic = new NIC(0, 0, new MAC("same"));
	const host = new Host(772 + 86 * i, 150, terminal, { nicSide: "up", mirror: true });
	nic.addIP(new IP(`192.168.1.${20 + i}`, 24));
	host.addNic(nic);
	const patch = new Patch(nic, hub4b.ports[i + 1], { sag: 0 });
}

new Patch(hub4a.ports[3], hub4b.ports[0], { color: COLORS.uplink, sag: 40, kind: "Cat5e uplink cable (hub to hub)" });

App.zones = [
	{ x: 16, y: 8, w: 1014, h: 256, label: "Shared Ethernet segment — 2 hubs, one collision domain" },
	{ x: 130, y: 282, w: 770, h: 330, label: "Point-to-point cables — each link connects just two hosts" },
];

EventLog.init(document.getElementById("eventLog"));
App.init();

// kept for the "start" / "stop" commands and older code paths
function draw() { App.render(); }
