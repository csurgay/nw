function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function stop() {
  ANIM = 0;
  Debug.log("Util", "ANIM", "Stopped")
}
function start() {
  ANIM = 1;
  Debug.log("Util", "ANIM", "Started")
  draw();
}
