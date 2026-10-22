class ICMP {
    constructor(host) {
        this.id = new Id('ICMP', this);
        this.host = host;
        this.job = null; // running ping or traceroute
        Debug.log(this.id, "Create", this.host.id);
    }

    static errText(icmp) {
        if (icmp.getValue("Type") == "TimeExceeded") return "Time to live exceeded";
        return icmp.code == 1 ? "Destination Host Unreachable" : icmp.code == 3 ? "Destination Port Unreachable" : "Destination Net Unreachable";
    }

    processIcmpPayload(payload, nic, frame) {
        let icmpPacket = payload.getPayload();
        const src = payload.getValue("SrcIP");
        const type = icmpPacket.getValue("Type");
        if (type == "EchoRequest") {
            Sim.event("l3", `<b>${this.host}</b> got a ping (echo request seq=${icmpPacket.getValue("Seq")}) from ${src} → sends an echo reply`, { frame, obj: this.host });
            const reply = new IcmpPacket("EchoReply", icmpPacket.getValue("Seq"), icmpPacket.getValue("Identifier"));
            reply.ts = icmpPacket.ts;
            this.host.l3.sendIp(new IpPacket("ICMP", payload.getValue("DstIP"), src, reply));
        }
        else if (type == "EchoReply") {
            Debug.log(this.id, "Response", src + "(" + nic.id + ")");
            Sim.event("l3", `<b>${this.host}</b> echo reply seq=${icmpPacket.getValue("Seq")} from ${src} arrived — ${src} is alive!`, { frame, obj: this.host });
            this.onReply(src, icmpPacket, payload);
        }
        else if (type == "TimeExceeded" || type == "DestUnreachable") {
            Sim.event("l3", `<b>${this.host}</b> ICMP error from ${src}: “${ICMP.errText(icmpPacket)}” — it carries the start of our own packet, so we know which one failed`, { frame, obj: this.host });
            this.onError(src, icmpPacket);
        }
    }

    // a reply to one of our probes
    onReply(src, icmp, payload) {
        const job = this.job;
        if (!job || !job.active || job.ident != icmp.getValue("Identifier")) return;
        const seq = icmp.getValue("Seq");
        if (job.kind == "trace") return this.traceHop(job, seq, src, true);
        if (job.dst != src || job.sentAt[seq] == null || job.got[seq]) return;
        job.got[seq] = true;
        const rtt = (Sim.time - job.sentAt[seq]) / 1000; // the animation runs ~1000× slower than reality
        job.rtts.push(rtt);
        job.recv++;
        this.host.terminal.println("64 bytes from " + src + ": icmp_seq=" + seq +
            " ttl=" + payload.getValue("TTL") + " time=" + rtt.toFixed(2) + " ms");
        if (job.count && job.recv + job.errors >= job.count) this.finish(job);
    }

    // an ICMP error about one of our probes (the error quotes our packet)
    onError(src, icmp) {
        const orig = icmp.orig, oi = orig && orig.getPayload();
        const job = this.job;
        if (!oi || !job || !job.active || job.ident != oi.getValue("Identifier")) return;
        const seq = oi.getValue("Seq");
        if (job.kind == "trace") return this.traceHop(job, seq, src, icmp.getValue("Type") != "TimeExceeded", icmp);
        if (job.got[seq]) return;
        job.got[seq] = true;
        job.errors++;
        this.host.terminal.println("From " + src + " icmp_seq=" + seq + " " + ICMP.errText(icmp));
        if (job.count && job.recv + job.errors >= job.count) this.finish(job);
    }

    // our own ARP for the next hop failed
    localUnreachable(packet) {
        const icmp = packet.getPayload();
        const job = this.job;
        if (!icmp || !job || !job.active || job.kind != "ping" || job.ident != icmp.getValue("Identifier")) return;
        const seq = icmp.getValue("Seq");
        if (job.got[seq]) return;
        job.got[seq] = true;
        job.errors++;
        this.host.terminal.println("From " + packet.getValue("SrcIP") + " icmp_seq=" + seq + " Destination Host Unreachable");
        if (job.count && job.recv + job.errors >= job.count) this.finish(job);
    }

    sendEchoRequest(ip, seq, ident, ttl = 64) {
        const r = this.host.l3.routing.lookup(ip);
        if (!r) return false;
        Debug.log(this.id, "EchoRequest " + r.nic + " -> " + ip);
        let icmpPacket = new IcmpPacket('EchoRequest', seq, ident);
        icmpPacket.ts = Sim.time;
        let ipPacket = new IpPacket('ICMP', r.nic.ip.ip, ip, icmpPacket);
        if (ttl != 64) ipPacket.addValue("TTL", ttl);
        return this.host.l3.sendIp(ipPacket);
    }

    // ping [-c count] [-i interval] [-t ttl] destination
    ping(shell, command) {
        let count = 0, interval = 1000, ttl = 64, dst = null;
        for (let i = 1; i < command.length; i++) {
            if (command[i] == "-c") count = parseInt(command[++i]) || 0;
            else if (command[i] == "-i") interval = Math.max(200, (parseFloat(command[++i]) || 1) * 1000);
            else if (command[i] == "-t") ttl = Math.max(1, Math.min(255, parseInt(command[++i]) || 64));
            else if (command[i]) dst = command[i];
        }
        if (!dst) {
            shell.t.println("ping: usage error: Destination address required");
            return true;
        }
        return this.withName(shell, "ping", dst, ip => this.startPing(shell, dst, ip, count, interval, ttl));
    }

    // resolve a name first (DNS), then go on; returns the showPrompt flag
    withName(shell, cmd, name, go) {
        if (IP.isValid(name)) return go(name);
        const t = this.host.terminal;
        const pend = { active: true };
        let req = null;
        pend.cancel = () => { pend.active = false; if (req) req.cancel(); };
        shell.job = pend;
        req = this.host.resolver.resolve(name, (ip, err) => {
            if (!pend.active) return;
            pend.active = false;
            if (shell.job == pend) shell.job = null;
            if (!ip) {
                if (err) { t.println(cmd + ": " + name + ": " + err); t.showPrompt(); }
                return;
            }
            if (go(ip)) t.showPrompt();
        });
        return !pend.active ? (shell.job == pend ? (shell.job = null, true) : false) : false;
    }

    startPing(shell, name, dst, count, interval, ttl) {
        if (!this.host.l3.routing.lookup(dst)) {
            shell.t.println("ping: connect: Network is unreachable");
            return true;
        }
        shell.t.println("PING " + name + " (" + dst + ") 56(84) bytes of data.");
        const job = {
            kind: "ping", dst, name, count, interval, ttl, active: true, ident: Math.floor(Math.random() * 65535) + 1,
            sent: 0, recv: 0, errors: 0, rtts: [], sentAt: {}, got: {}, start: Sim.time, timer: null,
        };
        job.cancel = (printStats) => {
            if (printStats) this.finish(job);
            else this.stop(job);
        };
        this.job = job;
        shell.job = job;
        const send = () => {
            if (!job.active) return;
            job.sent++;
            job.sentAt[job.sent] = Sim.time;
            this.sendEchoRequest(dst, job.sent, job.ident, ttl);
            if (!job.count || job.sent < job.count) job.timer = Sim.after(interval, send);
            else job.timer = Sim.after(25000, () => this.finish(job)); // wait for late replies (like ping -W)
        };
        send();
        return false;
    }

    // traceroute destination — probes with TTL 1, 2, 3 … (ICMP echo, like traceroute -I)
    traceroute(shell, command) {
        let max = 30, dst = null;
        for (let i = 1; i < command.length; i++) {
            if (command[i] == "-m") max = Math.max(1, parseInt(command[++i]) || 30);
            else if (command[i].startsWith("-")) continue;
            else dst = command[i];
        }
        if (!dst) {
            shell.t.println("Usage: traceroute [-I] [-m max_ttl] host");
            return true;
        }
        return this.withName(shell, "traceroute", dst, ip => this.startTrace(shell, dst, ip, max));
    }

    startTrace(shell, name, dst, max) {
        if (!this.host.l3.routing.lookup(dst)) {
            shell.t.println("connect: Network is unreachable");
            return true;
        }
        shell.t.println("traceroute to " + name + " (" + dst + "), " + max + " hops max, 60 byte packets");
        const job = {
            kind: "trace", dst, max, hop: 0, active: true, ident: Math.floor(Math.random() * 65535) + 1,
            sentAt: {}, timer: null, start: Sim.time,
        };
        job.cancel = (printPrompt) => {
            this.stop(job);
            if (printPrompt) this.host.terminal.showPrompt();
        };
        this.job = job;
        shell.job = job;
        this.traceNext(job);
        return false;
    }

    traceNext(job) {
        if (!job.active) return;
        job.hop++;
        if (job.hop > job.max) return this.traceDone(job);
        const hop = job.hop;
        job.sentAt[hop] = Sim.time;
        Sim.event("info", `<b>${this.host}</b> traceroute probe #${hop}: ping to ${job.dst} with TTL = ${hop}`, { proto: "ICMP", obj: this.host });
        this.sendEchoRequest(job.dst, hop, job.ident, hop);
        job.timer = Sim.after(25000, () => {
            if (!job.active || job.hop != hop) return;
            this.host.terminal.println(String(hop).padStart(2) + "  *");
            this.traceNext(job);
        });
    }

    traceHop(job, seq, src, last, icmp) {
        if (seq != job.hop) return;
        if (job.timer) job.timer.cancel();
        const rtt = (Sim.time - job.sentAt[seq]) / 1000;
        const mark = icmp && icmp.getValue("Type") == "DestUnreachable" ? (icmp.code == 1 ? " !H" : " !N") : "";
        this.host.terminal.println(String(seq).padStart(2) + "  " + src + " (" + src + ")  " + rtt.toFixed(3) + " ms" + mark);
        if (last || src == job.dst) this.traceDone(job);
        else this.traceNext(job);
    }

    traceDone(job) {
        if (!job.active) return;
        this.stop(job);
        this.host.terminal.showPrompt();
    }

    stop(job) {
        job.active = false;
        if (job.timer) job.timer.cancel();
        if (this.job == job) this.job = null;
        if (shell.job == job) shell.job = null;
    }

    finish(job) {
        if (!job.active) return;
        if (job.kind == "trace") return this.traceDone(job);
        this.stop(job);
        const t = this.host.terminal;
        const loss = job.sent ? Math.round(100 * (job.sent - job.recv) / job.sent) : 0;
        t.println("");
        t.println("--- " + (job.name || job.dst) + " ping statistics ---");
        t.println(job.sent + " packets transmitted, " + job.recv + " received, " +
            (job.errors ? "+" + job.errors + " errors, " : "") + loss + "% packet loss, time " +
            Math.round((job.sentAt[job.sent] || job.start) - job.start) + "ms");
        if (job.rtts.length) {
            const r = job.rtts, avg = r.reduce((a, b) => a + b, 0) / r.length;
            const mdev = Math.sqrt(r.reduce((a, b) => a + (b - avg) * (b - avg), 0) / r.length);
            t.println("rtt min/avg/max/mdev = " + [Math.min(...r), avg, Math.max(...r), mdev].map(v => v.toFixed(3)).join("/") + " ms");
        }
        t.showPrompt();
    }
}
