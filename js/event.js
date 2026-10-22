document.addEventListener('keydown', keypress);
consoleArea.addEventListener('click', terminal.mouseclick.bind(terminal));

function keypress(evt) {
    //Debug.log("Shell", "keypress", evt.key);
    if (evt.target == consoleArea) {
        terminal.keypress(evt);
        return;
    }
    if (evt.target.closest && evt.target.closest("input, textarea, select")) return;
    // shortcuts while the focus is not in the terminal
    if (evt.key == " ") { evt.preventDefault(); Sim.toggle(); }
    else if (evt.key == "n" || evt.key == "N" || evt.key == "ArrowRight") { evt.preventDefault(); Sim.step(); }
    else if (evt.key == "Escape") { Array.from(Inspector.wins.keys()).forEach(o => Inspector.close(o)); }
}
