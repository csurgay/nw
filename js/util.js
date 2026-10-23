function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// "stop" / "start" shell commands pause and resume the simulation clock
function stop() {
  Sim.pause();
  Debug.log("Util", "ANIM", "Stopped")
}
function start() {
  Sim.play();
  Debug.log("Util", "ANIM", "Started")
}

// focus a field, but not on a phone or tablet: the on-screen keyboard would pop up
function deskFocus(el) {
    if (!(window.matchMedia && matchMedia("(pointer: coarse)").matches)) el.focus();
}
