const canvas = document.getElementById('nwCanvas');
const ctx = canvas.getContext('2d');

if (true) for (let i=0; i<3; i++) {
    const nic1 = new NIC(
        Math.floor(Math.random() * (canvas.width-100)+50), 
        Math.floor(Math.random() * (canvas.height-100)+50), 
        new MAC("same"));
    nic1.ip = new IP(`192.168.1.${2*i+1}`, 24);
    const nic2 = new NIC(
        Math.floor(Math.random() * (canvas.width-100)+50), 
        Math.floor(Math.random() * (canvas.height-100)+50), 
        new MAC("same"));
    nic2.ip = new IP(`192.168.1.${2*i+2}`, 24);
    const patch = new Patch(nic1, nic2);
}

const hub4 = new Hub4(100, 100);
for (let i=0; i<3; i++) {
    const nic = new NIC(
        100+40*i, 200, new MAC("same"));
    nic.ip = new IP(`192.168.1.${10+i}`, 24);
    const patch = new Patch(nic, hub4.ports[i]);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    
    Id.list["Drawable"].forEach(drawable => drawable.draw());

    if (ANIM==1) requestAnimationFrame(draw);
}

draw();

