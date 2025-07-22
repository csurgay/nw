const canvas = document.getElementById('nwCanvas');
const ctx = canvas.getContext('2d');
let tooltip = null; // object currently showing tooltip

if (true) for (let i = 0; i < 3; i++) {
	const nic1 = new NIC(110, 330 + 100 * i, new MAC("same"));
	nic1.ip = new IP(`192.168.1.${2 * i + 1}`, 24);
	const host1 = new Host(100, 300 + 100 * i);
	host1.addNic(nic1);
	const nic2 = new NIC(560, 330 + 100 * i, new MAC("same"));
	nic2.ip = new IP(`192.168.1.${2 * i + 2}`, 24);
	const host2 = new Host(550, 300 + 100 * i);
	host2.addNic(nic2);
	const patch = new Patch(nic1, nic2);
}

const hub4a = new Hub4(100, 50);
for (let i = 0; i < 3; i++) {
	const nic = new NIC(110 + 60 * i, 200, new MAC("same"));
	const host = new Host(100 + 60 * i, 170);
	nic.ip = new IP(`192.168.1.${10 + i}`, 24);
	host.addNic(nic);
	const patch = new Patch(nic, hub4a.ports[i]);
}

const hub4b = new Hub4(400, 50);
for (let i = 0; i < 3; i++) {
	const nic = new NIC(410 + 60 * i, 200, new MAC("same"));
	const host = new Host(400 + 60 * i, 170);
	nic.ip = new IP(`192.168.1.${20 + i}`, 24);
	host.addNic(nic);
	const patch = new Patch(nic, hub4b.ports[i + 1]);
}

new Patch(hub4a.ports[3], hub4b.ports[0]);

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.beginPath();

	Id.list["Drawable"].forEach(drawable => drawable.draw());
	let hover = false;
	Id.list["Drawable"].forEach(drawable => {
		if (drawable.hover()) {
			hover = true;
			if (!tooltip) tooltip = drawable;
			tooltip.drawTooltip();
		}
	});
	if (!hover) tooltip = false;

	if (ANIM == 1) requestAnimationFrame(draw);
}

draw();

