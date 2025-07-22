class Clickable extends Drawable {
    constructor(x,y) {
        super(x,y);
        this.id = new Id('Clickable', this);
    }

    draw() {
        super.draw();
    }

    drawTooltip() {
        super.drawTooltip();
    }

    click() {
        if (this.enabled) {
            Debug.log(this.id, "Click", this);
        }        
    }
}
