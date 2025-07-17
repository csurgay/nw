const DEBUG=1;

const debugSources = {
    'Frame': false,
    'NIC': true,
    'Patch': true,
    'MAC': true,
    'LLDP': true
}

function log(source, action, message) {
    if (DEBUG==1 || debugSources[source]) {
        console.log(source + "." + action + ": " + message);
    }
}

function error(source, action, message) {
    if (DEBUG==1 || debugSources[source]) {
        console.log("ERROR: " + source + "." + action + ": " + message);
    }
}
