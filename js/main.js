const canvas = document.getElementById('nwCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const drawables = [];

const lldpMulticast = new MacAddress("01:80:C2:00:00:0E");

for (let i=0; i<5; i++) {
    const nic1 = new NIC(`NIC${2*i}`, Math.random() * canvas.width, Math.random() * canvas.height, new MacAddress());
    const nic2 = new NIC(`NIC${2*i+1}`, Math.random() * canvas.width, Math.random() * canvas.height, new MacAddress());
    const patch = new Patch(`Patch${i}`, nic1, nic2);
    drawables.push(nic1, nic2, patch);
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
