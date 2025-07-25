class Mouse extends Position {
	constructor() {
	}

	static mouseclick(evt) {
        Mouse.mousemove(evt);
        Id.list["Clickable"].forEach(clickable => {
            if (clickable.hover()) {
                clickable.click();
            }
        })
    }
    
    static mousemove(evt) {
		Mouse.moveTo(evt.pageX, evt.pageY);
	}

	static moveTo(x, y) {
		this.x = x;
		this.y = y;
	}
}

document.addEventListener('keydown', keypress);
document.addEventListener('click', Mouse.mouseclick);
document.addEventListener('mousemove', Mouse.mousemove);
consoleArea.addEventListener('click', terminal.mouseclick.bind(terminal));

function keypress(evt) {
    //Debug.log("Shell", "keypress", evt.key);
    terminal.keypress(evt);
}
