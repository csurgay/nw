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

function keypress(evt) {
    //Debug.log("Shell", "keypress", evt.key);
    if (["ArrowUp","ArrowDown","Control"].includes(evt.key)) evt.preventDefault();
    if (evt.key == "ArrowLeft") {
        if (term.selectionStart - term.value.lastIndexOf(prompt) - prompt.length < 1) {
            evt.preventDefault();
        }
    }
    if (evt.key == "Home") {
        evt.preventDefault();
        term.selectionStart = term.value.lastIndexOf(prompt) + prompt.length;
        term.selectionEnd = term.selectionStart;
    }
    if (evt.key == "Backspace") {
        if (term.selectionStart - term.value.lastIndexOf(prompt) - prompt.length < 1) {
            evt.preventDefault();
        }
    }
    if (evt.ctrlKey && (evt.key == 'c' || evt.key === 'C')) {
        term.value += "^C\n" + prompt;
        Shell.historyIndex = 0;
    }    
    if (evt.key == "Enter") {
        evt.preventDefault();
        command = term.value.substring(term.value.lastIndexOf(prompt)+prompt.length).trim();
        if (command != "" && command != Shell.history[Shell.history.length-1]) {
            Shell.history.push(command);
        }
        Shell.parse(command);
        term.value += "\n" + prompt;
        Shell.historyIndex = 0;
    }
    else if (evt.key == "ArrowUp") {
        if (Shell.history.length > 0) {
            Shell.historyIndex++;
            if (Shell.historyIndex > Shell.history.length) Shell.historyIndex = Shell.history.length;
            term.value = term.value.substring(0,term.value.lastIndexOf(prompt)+prompt.length);
            term.value += Shell.history[Shell.history.length-Shell.historyIndex];
        }
    }
    else if (evt.key == "ArrowDown") {
        if (Shell.history.length > 0) {
            Shell.historyIndex--;
            if (Shell.historyIndex <= 0) Shell.historyIndex = 1;
            term.value = term.value.substring(0,term.value.lastIndexOf(prompt)+prompt.length);
            term.value += Shell.history[Shell.history.length-Shell.historyIndex];;
        }
    }
    else if (!["ArrowLeft", "ArrowRight"].includes(evt.key)) {
    }
	if (false && evt.key == ' ') {
		if (ANIM == 1) stop();
		else start();
	}
    term.scrollTop = term.scrollHeight;
}
