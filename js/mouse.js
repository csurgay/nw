class Mouse extends Position {
	constructor() {
        super(0,0);
        this.state = "Idle"; // Idle, Down, Drag
	}

	mouseclick(evt) {
        Debug.log("Mouse", "click");
        this.mousemove(evt);
        Id.list["Clickable"].forEach(clickable => {
            if (clickable.hover()) {
                clickable.click();
            }
        })
    }

    mousedown(evt) {
		this.moveTo(evt.pageX, evt.pageY);
    }
    
    mouseup(evt) {
		this.moveTo(evt.pageX, evt.pageY);
    }
    
    mousemove(evt) {
		this.moveTo(evt.pageX, evt.pageY);
	}

	moveTo(x, y) {
		this.x = x;
		this.y = y;
	}
}

const mouse = new Mouse();
