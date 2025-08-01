class Clickable extends Drawable {
    constructor(x,y) {
        super(x,y);
        this.id = new Id('Clickable', this);
        this.button = [];
    }

    draw() {
        super.draw();
    }

    drawTooltip() {
//        super.drawTooltip();
        this.button.forEach( b => {
            b.draw()
        })
    }

    click() {
    }
}
