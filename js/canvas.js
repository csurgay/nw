class Canvas extends Draggable {
    constructor(x,y) {
        super(x,y);
        this.id = new Id("Canvas", this);
        this.tooltipEnabled = false;
        this.downX;
        this.downY;
    }

    draw() {
        //super.draw();
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 0.5;
        ctx.moveTo(this.x, this.y + 7);
        ctx.lineTo(this.x + 7, this.y);
        ctx.moveTo(this.x + 4, this.y + 7);
        ctx.lineTo(this.x + 7, this.y + 4);
        ctx.stroke();
        ctx.closePath();
        if (this.hover(Mouse.x, Mouse.y)) this.cursor("se-resize");
        else this.cursor("default");
    }

    hover(x,y) {
        return x>=this.x&&x<=this.x+9&&y>=this.y&&y<=this.y+9;
    }

    cursor(icon) {
        nwCanvas.style.cursor = icon;
    }

    click() {
        this.downX = Mouse.x;
        this.downY = Mouse.y;
    }

    move() {
        nwCanvas.width += Mouse.x - this.downX;
        nwCanvas.height += Mouse.y - this.downY;
    }
}
