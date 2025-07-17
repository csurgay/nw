const canvas = document.getElementById('nwCanvas');
const ctx = canvas.getContext('2d');
const drawables = [];

for (let i=0; i<3; i++) {
    const nic1 = new NIC(`NIC${2*i}`, Math.random() * canvas.width, Math.random() * canvas.height, new MAC());
    const nic2 = new NIC(`NIC${2*i+1}`, Math.random() * canvas.width, Math.random() * canvas.height, new MAC());
    const patch = new Patch(`Patch${i}`, nic1, nic2);
    drawables.push(nic1, nic2, patch);
}

const hub4 = new Hub4("Hub4", 100, 100);

for (let i=0; i<3; i++) {
    const nic = new NIC(`NIC${10+i}`, 100+10*i, 200, new MAC());
    const patch = new Patch(`PatcH${i}`, nic, hub4.ports[i]);
    drawables.push(nic, patch);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.stroke();
    
    drawables.forEach(drawable => drawable.draw());

    requestAnimationFrame(draw);
}

draw();

