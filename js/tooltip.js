class Tooltip extends Drawable {
    constructor(x,y) {
        super(x,y);
        this.visible = false;
    }

    draw() {
        if (this.visible) {
            ctx.beginPath();
            ctx.fillStyle = "lightgray";
            ctx.strokeStyle = "black";
            ctx.fillRect(this.x,this.y,200,70);
            ctx.rect(this.x,this.y,200,70);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.fillStyle = "black";
            ctx.textAlign = 'left';
            let x = this.x+5, y = this.y+10;
            this.info.forEach( item => {
                ctx.fillText( item[0], x, y);
                ctx.fillText( item[1](this), x+30, y);
                y += 10;
            })
        }
    }
}