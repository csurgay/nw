class ICMP {
    constructor(host) {
        this.id = new Id('ICMP', this);
        this.host = host;
        this.job = null; // running ping
        Debug.log(this.id, "Create", this.host.id);
    }

    processIcmpPayload(payload, nic, frame) {
        let icmpPacket = payload.getPayload();
        const src = payload.getValue("SrcIP");
        if (icmpPacket.getValue("Type") == "EchoRequest") {
            Sim.event("l3", `<b>${this.host}</b> got a ping (echo request seq=${icmpPacket.getValue("Seq")}) from ${src} → sends an echo reply`, { frame, obj: this.host });
            const reply = new IcmpPacket("EchoReply", icmpPacket.getValue("Seq"), icmpPacket.getValue("Identifier"));
            reply.ts = icmpPacket.ts;
            let ipPacket = new IpPacket(
                "ICMP",
                payload.getValue("DstIP"),
                src,
                reply
            );
            this.host.l3.sendIpPacket(nic, ipPacket);
        }
        else if (icmpPacket.getValue("Type") == "EchoReply") {
            Debug.log(this.id, "Response", src + "(" + nic.id + ")");
            Sim.event("l3", `<b>${this.host}</b> echo reply seq=${icmpPacket.getValue("Seq")} from ${src} arrived — ${src} is alive!`, { frame, obj: this.host });
            const job = this.job;
            if (job && job.active && job.ident == icmpPacket.getValue("Identifier") && job.dst == src) {
                const seq = icmpPacket.getValue("Seq");
                if (job.sentAt[seq] == null || job.got[seq]) return;
                job.got[seq] = true;
                const rtt = (Sim.time - job.sentAt[seq]) / 1000; // the animation runs ~1000× slower than reality
                job.rtts.push(rtt);
                job.recv++;
                this.host.terminal.println("64 bytes from " + src + ": icmp_seq=" + seq +
                    " ttl=" + payload.getValue("TTL") + " time=" + rtt.toFixed(2) + " ms");
                if (job.count && job.recv >= job.count) this.finish(job);
            }
        }
    }

    sendEchoRequest(ip, nic, seq, ident) {
        Debug.log(this.id, "EchoRequest "+nic+" -> "+ip);
        let icmpPacket = new IcmpPacket('EchoRequest', seq, ident);
        icmpPacket.ts = Sim.time;
        let ipPacket = new IpPacket('ICMP', nic.ip.ip, ip, icmpPacket);
        this.host.l3.sendIpPacket(nic, ipPacket);
    }

    // ping [-c count] [-i interval] destination
    ping(shell, command) {
        let count = 0, interval = 1000, dst = null;
        for (let i = 1; i < command.length; i++) {
            if (command[i] == "-c") count = parseInt(command[++i]) || 0;
            else if (command[i] == "-i") interval = Math.max(200, (parseFloat(command[++i]) || 1) * 1000);
            else if (command[i]) dst = command[i];
        }
        if (!dst) {
            shell.t.println("ping: usage error: Destination address required");
            return true;
        }
        if (!IP.isValid(dst)) {
            shell.t.println("ping: " + dst + ": Name or service not known");
            return true;
        }
        const nic = this.host.l3.routing.route(dst);
        if (!nic) {
            shell.t.println("ping: connect: Network is unreachable");
            return true;
        }
        shell.t.println("PING " + dst + " (" + dst + ") 56(84) bytes of data.");
        const job = {
            dst, nic, count, interval, active: true, ident: Math.floor(Math.random() * 65535) + 1,
            sent: 0, recv: 0, rtts: [], sentAt: {}, got: {}, start: Sim.time, timer: null,
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
            this.sendEchoRequest(dst, nic, job.sent, job.ident);
            if (!job.count || job.sent < job.count) job.timer = Sim.after(interval, send);
            else job.timer = Sim.after(15000, () => this.finish(job)); // wait for late replies (like ping -W)
        };
        send();
        return false;
    }

    stop(job) {
        job.active = false;
        if (job.timer) job.timer.cancel();
        if (this.job == job) this.job = null;
        if (shell.job == job) shell.job = null;
    }

    finish(job) {
        if (!job.active) return;
        this.stop(job);
        const t = this.host.terminal;
        const loss = job.sent ? Math.round(100 * (job.sent - job.recv) / job.sent) : 0;
        t.println("");
        t.println("--- " + job.dst + " ping statistics ---");
        t.println(job.sent + " packets transmitted, " + job.recv + " received, " + loss + "% packet loss, time " +
            Math.round((job.sentAt[job.sent] || job.start) - job.start) + "ms");
        if (job.rtts.length) {
            const r = job.rtts, avg = r.reduce((a, b) => a + b, 0) / r.length;
            const mdev = Math.sqrt(r.reduce((a, b) => a + (b - avg) * (b - avg), 0) / r.length);
            t.println("rtt min/avg/max/mdev = " + [Math.min(...r), avg, Math.max(...r), mdev].map(v => v.toFixed(3)).join("/") + " ms");
        }
        t.showPrompt();
    }
}
