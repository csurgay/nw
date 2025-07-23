class Shell {
    static history = [];
    static historyIndex = 0;
    constructor() {
    }

    static parse(command) {
        command = command.split(" ");
        Debug.log("Shell", "parse", command);
        if (command[0] == "start") start();
        if (command[0] == "stop") stop();
        if (command[0] == "ssh") {
            if (command.length==1) {
                term.value += "\nusage: ssh destination";
            }
            else {
                let h = command[1];
                let o = Id.find(h);
                if (o==null) {
                    term.value += "\nCould not resolve hostname "+h;
                }
                else {
                    prompt = "[root@"+h+" ~]# ";
                }
            }
        }
    }
}
