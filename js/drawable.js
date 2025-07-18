class Drawable {
    static list = [];
    constructor(id,x,y) {
        this.type = new Id('Drawable', this);
        this.id = id;
        this.x = x;
        this.y = y;
        this.enabled = true;
        Drawable.list.push(this);
    }

    draw() {
        ctx.beginPath();
        ctx.fillStyle = 'lightgray';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.rect(this.x, this.y, 50, 20);
        ctx.fill();
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillStyle = 'black';
        ctx.fillText(this.id, this.x + 25, this.y + 15);
        ctx.closePath();
    }
}
