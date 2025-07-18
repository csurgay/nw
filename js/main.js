const canvas = document.getElementById('nwCanvas');
const ctx = canvas.getContext('2d');

for (let i=0; i<3; i++) {
    const nic1 = new NIC(`NIC${2*i+1}`, Math.random() * canvas.width, Math.random() * canvas.height, new MAC(""+(2*i+1)));
    nic1.ip = new IP(`192.168.1.${2*i+1}`, 24);
    const nic2 = new NIC(`NIC${2*i+2}`, Math.random() * canvas.width, Math.random() * canvas.height, new MAC(""+(2*i+2)));
    nic2.ip = new IP(`192.168.1.${2*i+2}`, 24);
    const patch = new Patch(`Patch${i}`, nic1, nic2);
}

const hub4 = new Hub4("Hub4", 100, 100);
for (let i=0; i<3; i++) {
    const nic = new NIC(`NIC${10+i}`, 100+10*i, 200, new MAC(""+(10+i)));
    nic.ip = new IP(`192.168.1.${10+1}`, 24);
    const patch = new Patch(`PatcH${i}`, nic, hub4.ports[i]);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.stroke();
    
    Drawable.list.forEach(drawable => drawable.draw());
    Patch.list.forEach(drawable => drawable.draw());

    if (ANIM==1) requestAnimationFrame(draw);
}

draw();

