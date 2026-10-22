// The network is built from the lab library (js/topologies.js).
EventLog.init(document.getElementById("eventLog"));
App.init();
Topology.initUI();
Topology.load(Topology.fromHash() || TOPOLOGIES[0].id);

// kept for the "start" / "stop" commands and older code paths
function draw() { App.render(); }
