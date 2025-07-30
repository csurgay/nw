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
        this.enabled = true;
        this.tooltipEnabled = true;
        this.tooltip = false;
        this.info = [];
        this.info.push(["ID",function(o){return ""+o.id;}]);
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
    }

    inBox(x,y, tooltip=false) {
        let dx=35, dy=16;
        if (tooltip) { dx=200; dy=70; }
        return x>this.x && x<this.x+dx && y>this.y && y<this.y+dy;
    }

    toString() {
        return this.id.toString();
    }

    hover() {
        if (this.inBox(mouse.x,mouse.y,this.tooltip)) {
            this.tooltip = true;
            return true;
        }
        else {
            this.tooltip = false;
            return false;
        }
    }
}
