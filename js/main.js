// The network is built from the lab library (js/topologies.js).
Lang.init();
Lexicon.init(LEXICON);
EventLog.init(document.getElementById("eventLog"));
terminal.initTouch();
App.init();
Layout.init();
Topology.initUI();
Editor.initUI();
Lang.onChange(() => { Topology.fillSelect(); Topology.syncUI(); });
Topology.load(Topology.fromHash() || TOPOLOGIES[0].id);

// kept for the "start" / "stop" commands and older code paths
function draw() { App.render(); }
