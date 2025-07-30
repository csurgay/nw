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
        if (this.hover(mouse.x, mouse.y)) this.cursor("se-resize");
        else this.cursor("default");
    }

    hover(x,y) {
        return x>=this.x&&x<=this.x+9&&y>=this.y&&y<=this.y+9;
    }

    cursor(icon) {
        nwCanvas.style.cursor = icon;
    }

    click() {
        this.downX = mouse.x;
        this.downY = mouse.y;
    }

    move() {
        nwCanvas.width += mouse.x - this.downX;
        nwCanvas.height += mouse.y - this.downY;
    }
}
