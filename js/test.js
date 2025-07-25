class Test {
    static case = [
        ["ssh Host1", "[root@Host1 ~]# ", 100],
        ["exit", "[admin@console ~]$ ", 100],
        ["for i in {1..12}; do ssh Host$i; done", "[root@Host12 ~]# ", 100],
    ];

    constructor(terminal, shell) {
        this.terminal = terminal;
        this.shell = shell;
        this.index = 0;
    }

    test() {
        this.index = 0;
        setTimeout(this.input.bind(this), 100);
    }

    input() {
        this.terminal.print(Test.case[this.index][0]);
        this.terminal.enter(Test.case[this.index][0]);
        setTimeout(this.output.bind(this), Test.case[this.index][2]);
    }

    output() {
        let output = this.terminal.lastLine();
        if (output === Test.case[this.index][1]) {
            Debug.error("Test", "assert", output + " OK");
        }
        else {
            Debug.error("Test", "assert", "_" + Test.case[this.index][1] 
                + "_ is not _" + output + "_");
        }
        this.index++;
        if (this.index < Test.case.length) {
            setTimeout(this.input.bind(this), 10);
        }
    }
}
