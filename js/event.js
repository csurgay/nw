document.addEventListener('keydown', keypress);
document.addEventListener('click', mouse.mouseclick.bind(mouse));
document.addEventListener('mousedown', mouse.mousedown.bind(mouse));
document.addEventListener('mouseup', mouse.mouseup.bind(mouse));
document.addEventListener('mousemove', mouse.mousemove.bind(mouse));
consoleArea.addEventListener('click', terminal.mouseclick.bind(terminal));

function keypress(evt) {
    //Debug.log("Shell", "keypress", evt.key);
    terminal.keypress(evt);
}
