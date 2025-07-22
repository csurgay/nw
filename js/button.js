class Button extends Clickable {
    constructor(x,y, name,func) {
        super(x,y);
        this.id = name;
        this.func = func;
    }

    draw() {
        super.draw();
    }

    click() {
        this.func();
    }
}
