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
