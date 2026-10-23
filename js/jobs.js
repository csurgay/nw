// Job control, aliases and watch — the bash way.
//   ping 192.168.1.2 &     run in the background        jobs      list them
//   Ctrl-Z                 stop the running command     fg / bg   continue it in front / behind
//   kill %1                end a job                    alias p='ping -c 2'   a short name
//   watch -n 2 ip neigh    run a command again and again, the screen shows the newest output
Object.assign(Shell.prototype, {

    // ---------------------------------------------------------------- jobs
    jobList() {
        this.jobs = this.jobs || [];
        return this.jobs.filter(j => j.ctx == this.host);
    },

    addJob(j, state) {
        this.jobs = this.jobs || [];
        if (!j.n) {
            j.n = this.jobList().reduce((m, x) => Math.max(m, x.n), 0) + 1;
            j.ctx = this.host;
            this.jobs.push(j);
        }
        j.state = state;
        return j.n;
    },

    // Ctrl-Z on a running command
    suspendJob() {
        const j = this.job;
        this.job = null;
        j.suspended = true;
        const n = this.addJob(j, "Stopped");
        this.t.raw(`[${n}]+  ${"Stopped".padEnd(24)}${j.cmd || ""}\n`);
    },

    resumeJob(j) {
        j.suspended = false;
        if (j.held) { j.held.forEach(l => this.t.println(l)); j.held = null; }
        if (j.resume) { const f = j.resume; j.resume = null; f(); }
    },

    // "ping www &": the DNS question was the job, now the ping itself takes its place
    adoptJob(old) {
        const nj = this.job;
        if (nj && nj !== old) {
            Object.assign(nj, { n: old.n, cmd: old.cmd, ctx: old.ctx, state: old.state });
            this.jobs = this.jobs.map(j => j === old ? nj : j);
            this.job = null;
            if (old.suspended) { nj.suspended = true; }
        }
    },

    isDone(j) { return j.active === false && !j.suspended; },

    // before the next prompt: "[1]+  Done   ping -c 3 192.168.1.2"
    reportJobs() {
        const done = this.jobList().filter(j => this.isDone(j));
        done.forEach(j => this.t.println(`[${j.n}]+  ${"Done".padEnd(24)}${j.cmd || ""}`));
        this.jobs = (this.jobs || []).filter(j => !done.includes(j));
    },

    // leaving a machine ends the jobs that were started there (they get a hang-up)
    hangUp(ctx) {
        (this.jobs || []).filter(j => j.ctx == ctx).forEach(j => { if (j.cancel) j.cancel(false); });
        this.jobs = (this.jobs || []).filter(j => j.ctx != ctx);
    },

    pickJob(arg, name) {
        const list = this.jobList();
        let j;
        if (!arg || arg == "%" || arg == "%%" || arg == "%+") j = list[list.length - 1];
        else if (arg == "%-") j = list[list.length - 2];
        else { const n = parseInt(arg.replace(/^%/, "")); j = list.find(x => x.n == n); }
        if (!j) this.t.println(`-bash: ${name}: ${arg || "current"}: no such job`);
        return j;
    },

    // ---------------------------------------------------------------- aliases
    aliasMap() {
        const holder = this.host || this;
        if (!holder.aliases) holder.aliases = { ll: "ls -l", la: "ls -la" };
        return holder.aliases;
    },

    // the first word of a command may be an alias (not again inside its own text)
    expandAlias(cmd) {
        const m = cmd.match(/^(\s*)([^\s=|;&]+)(.*)$/s);
        if (!m) return cmd;
        const a = this.aliasMap()[m[2]];
        if (a == null || this.aliasing == m[2]) return cmd;
        return m[1] + a + m[3];
    },

    // ---------------------------------------------------------------- watch
    // the screen below the command line shows the newest output, until Ctrl-C
    watch(args) {
        let n = 2, i = 0;
        if (args[0] == "-n") { n = Math.max(0.5, parseFloat(args[1]) || 2); i = 2; }
        else if (/^-n\d/.test(args[0] || "")) { n = Math.max(0.5, parseFloat(args[0].slice(2)) || 2); i = 1; }
        const cmd = args.slice(i).join(" ");
        if (!cmd) { this.t.println("Usage:\n watch [-n seconds] command"); return true; }
        const t = this.t, start = t.textarea.value.length;
        const name = this.host ? this.host.id.toString() : "console";
        const ctxHost = this.host, ctxCwd = this.cwd;
        const job = { active: true, kind: "watch", timer: null };
        job.cancel = () => { job.active = false; if (job.timer) job.timer.cancel(); if (this.job == job) this.job = null; };
        const tick = () => {
            if (!job.active) return;
            if (job.suspended) { job.resume = tick; return; }
            // run it on the machine where watch was started
            const saved = { host: this.host, cwd: this.cwd, job: this.job };
            this.host = ctxHost; this.cwd = ctxCwd;
            const out = this.capture(cmd);
            this.host = saved.host; this.cwd = saved.cwd; this.job = saved.job;
            const head = `Every ${n.toFixed(1)}s: ${cmd}`;
            const right = `${name}: ${Coreutils.fmtDate(new Date(), "%a %b %e %T %Y")}`;
            const pad = Math.max(2, 78 - head.length - right.length);
            if (job.active && !job.suspended && this.job == job) {
                t.textarea.value = t.textarea.value.substring(0, start) + head + " ".repeat(pad) + right + "\n\n" + out;
                t.showBottom();
            }
            job.timer = Sim.after(n * 1000, tick);
        };
        this.job = job;
        tick();
        return false;
    },

    // run a command and return what it printed (watch, and anything that needs the text)
    capture(cmd) {
        const t = this.t, realPrint = t.print;
        let buf = "";
        const outer = { realPrint: this.realPrint, piping: this.piping, job: this.job };
        t.print = s => { buf += s; };
        this.realPrint = t.print; // error messages too
        this.piping = true;
        let show;
        try { show = this.parse(cmd); }
        catch (e) { buf += "error: " + e.message + "\n"; }
        finally {
            t.print = realPrint;
            this.realPrint = outer.realPrint;
            this.piping = outer.piping;
        }
        if (this.job && this.job !== outer.job) {
            // something that keeps running (ping …) cannot be watched: stop it
            this.job.cancel(false);
            buf += "\n(watch shows commands that finish at once — try ip neigh, arp -a, bridge fdb show)\n";
        }
        this.job = outer.job;
        return buf;
    },

    // "NIC1" on this machine, or "host1:NIC1" / "switch1:swp2" / "switch1:Gi0/2" anywhere
    findPort(name) {
        let dev = this.host, pn = name;
        const m = name.match(/^([^:]+):(.+)$/);
        if (m && !/^\d/.test(m[2]) || m && !this.host) { dev = Id.find(m[1]); pn = m[2]; }
        if (!dev) return null;
        const ports = dev.nics || dev.ports || [];
        const lc = pn.toLowerCase();
        return ports.find(p => p.patch && (String(p.id).toLowerCase() == lc || (dev.portName && [dev.portName(p), dev.portName(p, true), "port" + (ports.indexOf(p) + 1), String(ports.indexOf(p) + 1)].some(x => String(x).toLowerCase().replace(/\s/g, "") == lc.replace(/\s/g, ""))))) || null;
    },

    // ---------------------------------------------------------------- the commands
    // returns undefined when it is not one of these
    builtin(c, raw) {
        const t = this.t;
        switch (c[0]) {
            case "jobs": {
                const list = this.jobList();
                list.forEach((j, i) => {
                    if (this.isDone(j)) j.state = "Done";
                    const mark = i == list.length - 1 ? "+" : i == list.length - 2 ? "-" : " ";
                    const state = j.state == "Running" ? "Running" : j.state;
                    t.println(`[${j.n}]${mark}  ${state.padEnd(24)}${j.cmd || ""}${j.state == "Running" ? " &" : ""}`);
                });
                this.jobs = (this.jobs || []).filter(j => !this.isDone(j));
                return true;
            }
            case "fg": {
                const j = this.pickJob(c[1], "fg");
                if (!j) return true;
                this.jobs = this.jobs.filter(x => x !== j);
                t.println(j.cmd || "");
                if (this.isDone(j)) return true;
                this.job = j;
                j.state = "Running";
                this.resumeJob(j);
                return !(this.job === j && j.active !== false);
            }
            case "bg": {
                const j = this.pickJob(c[1], "bg");
                if (!j) return true;
                if (j.state == "Running") { t.println(`-bash: bg: job ${j.n} already in background`); return true; }
                j.state = "Running";
                t.println(`[${j.n}]+ ${j.cmd || ""} &`);
                this.resumeJob(j);
                return true;
            }
            case "kill": {
                const args = c.slice(1).filter(a => !/^-(\d+|[A-Z]+)$/.test(a));
                if (!args.length) { t.println("kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]"); return true; }
                args.forEach(a => {
                    const list = this.jobList();
                    const j = a.startsWith("%") ? this.pickJob(a, "kill") : list.find(x => String(x.pid) == a);
                    if (!j) { if (!a.startsWith("%")) t.println(`-bash: kill: (${a}) - No such process`); return; }
                    j.suspended = false;
                    if (j.cancel) j.cancel(false);
                    this.jobs = this.jobs.filter(x => x !== j);
                    t.println(`[${j.n}]+  ${"Terminated".padEnd(24)}${j.cmd || ""}`);
                });
                return true;
            }
            case "alias": {
                const map = this.aliasMap();
                if (c.length == 1) {
                    Object.keys(map).sort().forEach(k => t.println(`alias ${k}='${map[k]}'`));
                    return true;
                }
                c.slice(1).forEach(a => {
                    const eq = a.indexOf("=");
                    if (eq < 0) {
                        if (map[a] != null) t.println(`alias ${a}='${map[a]}'`);
                        else { t.println(`-bash: alias: ${a}: not found`); this.status = 1; }
                    } else map[a.substring(0, eq)] = a.substring(eq + 1);
                });
                return true;
            }
            case "unalias": {
                const map = this.aliasMap();
                if (c[1] == "-a") { Object.keys(map).forEach(k => delete map[k]); return true; }
                c.slice(1).forEach(a => { if (map[a] != null) delete map[a]; else t.println(`-bash: unalias: ${a}: not found`); });
                return true;
            }
            case "watch":
                return this.watch(c.slice(1));
            case "wireshark": {
                // wireshark [-i interface] [-Y "display filter"]
                let ifn = null, flt = null;
                for (let i = 1; i < c.length; i++) {
                    if (c[i] == "-i") ifn = c[++i];
                    else if (c[i] == "-Y" || c[i] == "-f") flt = c[++i];
                    else if (c[i] == "-k") continue;
                    else flt = (flt ? flt + " " : "") + c[i];
                }
                let port;
                if (ifn) {
                    port = this.findPort(ifn);
                    if (!port) { t.println(`wireshark: “${ifn}”: no such interface with a cable${this.host ? "" : " (on the console write host1:NIC1 or switch1:swp2)"}`); return true; }
                } else if (this.host) port = (this.host.nics || []).find(n => n.patch) || null;
                const comp = flt != null ? Capture.compile(flt) : { fn: null };
                if (comp.error) { t.println("wireshark: display filter: " + comp.error); return true; }
                setTimeout(() => Capture.open({ iface: port || null, filter: flt != null ? flt : undefined }), 30);
                t.println(`Wireshark opens · capturing on ${port ? Capture.portName(port) : "any"}${flt ? " · filter: " + flt : ""}`);
                return true;
            }
            case "autotest":
                // the File ▸ Autotest window, also on a phone where the editor bar is small
                if (this.host) { t.println("autotest: run it on the console (exit first)"); return true; }
                setTimeout(() => AutoTest.open(), 50);
                t.println("Autotest: the window opens — UI tests first, then the terminal tests.");
                return true;
        }
        return undefined;
    },
});
