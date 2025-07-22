class Mouse extends Position {
    constructor() {
    }

    static mousemove(evt) {
        Mouse.moveTo(evt.clientX, evt.clientY);
    }

    static moveTo(x,y) {
        this.x = x;
        this.y = y;
    }
}

document.addEventListener('keypress', keypress);
document.addEventListener('mousemove', Mouse.mousemove);

function keypress(evt) {
  evt.preventDefault();
  Debug.log("Key pressed:'"+evt.key+"'");
  if (evt.key==' ') {
    if (ANIM==1) stop();
    else start();
  }
}

