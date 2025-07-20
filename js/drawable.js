class Position {
    constructor(x,y) {
        this.x = x;
        this.y = y;
    }
}

class Drawable extends Position {
    constructor(x,y) {
        super(x,y);
        this.id = new Id('Drawable', this);
    }

    draw(label="none") {
        ctx.beginPath();
        ctx.fillStyle = 'lightgray';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.rect(this.x, this.y, 35, 16);
        ctx.fill();
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillStyle = 'black';
        if (label=="none") label = this.id.toString();
        ctx.fillText(label, this.x + 17, this.y + 12);
        ctx.closePath();
    }

    toString() {
        return this.id;
    }

    hovered(x,y) {
        if (this.enabled) {
            Debug.log(this.id, "Hovered", this);
        }        
    }

    hover() {
        Debug.log(this.id, "Hover", this);
    }
}
