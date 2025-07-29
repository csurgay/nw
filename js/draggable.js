class Draggable extends Clickable {
    constructor(x,y) {
        super(x,y);
        this.id = new Id("Draggable", this);
    }
}

