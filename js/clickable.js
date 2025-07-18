class Clickable extends Drawable {
    constructor(id,x,y) {
        super(id, x, y);
        this.type = new Id('Clickable', this);
    }

    hover() {
        if (this.enabled) {
            log("Clickable", "Hover", this);
        }        
    }

    click() {
        if (this.enabled) {
            log("Clickable", "Click", this);
        }        
    }

    draw() {
        super.draw();
    }
}
