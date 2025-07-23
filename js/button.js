class Button extends Clickable {
    constructor(x,y, name,func, host) {
        super(x,y);
        this.enabled = false;
        this.id = name;
        this.func = func;
        this.host = host;
    }

    draw() {
        super.draw();
    }

    hover() {
        return super.hover();
    }

    click() {
        Debug.log(this.id,"click");
        this.func(this);
    }
}
