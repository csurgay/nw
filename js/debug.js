const DEBUG=1;
let ANIM=1;

class Debug extends Drawable {
    static SOURCES = {
    'Frame': false,
    'NIC': true,
    'Patch': true,
    'MAC': false,
    'LLDP': true,
    'ARP': false,
    'IP': false,
    'TLV': false,
    'Util': true,
    }

    constructor(x,y) {
        super(x,y);
    }

    static log(source, action, message) {
        if (DEBUG==1 || SOURCES[source.type]) {
            console.log(source + "." + action + ": " + message);
        }
    }

    static error(source, action, message) {
        if (DEBUG==1 || SOURCES[source.type]) {
            console.log("ERROR: " + source + "." + action + ": " + message);
        }
    }
}

function debug() {
    let x=0, y = 10;
    Id.list["Drawable"].forEeach(item => {
        ctx.beginPath();
        ctx.fillStype = "black";
        ctx.fillText(item,x,y);
        y += 16;
    })
}
