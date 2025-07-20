function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function stop() {
  ANIM=0;
  Debug.log("Util","ANIM","Stopped")
}
function start() {
  ANIM=1;
  Debug.log("Util","ANIM","Started")
  draw();
}

document.addEventListener('keypress', keypress);
document.addEventListener('mousemove', mousemove);

function keypress(evt) {
  evt.preventDefault();
  console.Debug.log("Key pressed:'"+evt.key+"'");
  if (evt.key==' ') {
    if (ANIM==1) stop();
    else start();
  }
}

function mousemove(evt) {
  let c = 0;
  Id.list["Drawable"].forEach(item => {
    c++;
//    if (item.hover(evt.clientX,evt.clientY)) {
//      item.hovered();
//    }   
  });
}
