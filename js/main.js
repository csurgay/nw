// The network is built from the lab library (js/topologies.js).
Lang.init();
Lexicon.init(LEXICON);
EventLog.init(document.getElementById("eventLog"));
terminal.initTouch();
App.init();
Layout.init();
Topology.initUI();
Editor.initUI();
Access.initUI();
Lang.onChange(() => { Topology.fillSelect(); Topology.syncUI(); });
Capture.start(); // frames are captured from the start; the Wireshark window shows them
Topology.load(Topology.fromHash() || TOPOLOGIES[0].id);
document.getElementById("btnShark").addEventListener("click", () => Capture.open());

// kept for the "start" / "stop" commands and older code paths
function draw() { App.render(); }
