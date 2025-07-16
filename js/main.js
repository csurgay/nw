const canvas = document.getElementById('nwCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const drawables = [];

const p1= new Port('Port1', 100, 100);
const p2= new Port('Port2', 200, 100);
const patch = new Patch("Patch1",p1, p2);

drawables.push(p1, p2, patch);

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.stroke();
    
    drawables.forEach(drawable => drawable.draw());

    requestAnimationFrame(draw);
}

draw();
