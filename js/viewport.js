// Fits the 1000×600 scene into the stage, runs the animation loop,
// does hit testing for hover tooltips and click-to-inspect.
const App = {
    W: 1030,
    H: 620,
    scale: 1,
    ox: 0,
    oy: 0,
    dpr: 1,
    hover: null,
    mx: -1, my: -1,       // mouse in screen (css) pixels relative to the canvas
    last: 0,
    zones: [],

    init() {
        this.stage = document.getElementById("stage");
        window.addEventListener("resize", () => this.resize());
        this.resize();
        nwCanvas.addEventListener("mousemove", ev => {
            const r = nwCanvas.getBoundingClientRect();
            this.mx = ev.clientX - r.left;
            this.my = ev.clientY - r.top;
            const p = this.toWorld(this.mx, this.my);
            mouse.moveTo(p.x, p.y);
            this.hover = this.pick(p.x, p.y);
            nwCanvas.style.cursor = this.hover ? "pointer" : "default";
        });
        nwCanvas.addEventListener("mouseleave", () => { this.hover = null; this.mx = -1; });
        nwCanvas.addEventListener("click", ev => {
            const r = nwCanvas.getBoundingClientRect();
            const p = this.toWorld(ev.clientX - r.left, ev.clientY - r.top);
            const obj = this.pick(p.x, p.y);
            if (!obj) return;
            if (obj instanceof Frame && Sim.running) {
                Sim.pause(); // freeze the wire so the frame can be studied
            }
            Inspector.open(obj, { x: ev.clientX + 18, y: ev.clientY - 30 });
        });
        this.initControls();
        requestAnimationFrame(t => this.loop(t));
    },

    resize() {
        const r = this.stage.getBoundingClientRect();
        this.dpr = window.devicePixelRatio || 1;
        nwCanvas.width = Math.round(r.width * this.dpr);
        nwCanvas.height = Math.round(r.height * this.dpr);
        this.cw = r.width; this.ch = r.height;
        this.scale = Math.min(r.width / this.W, (r.height - 24) / this.H);
        this.ox = (r.width - this.W * this.scale) / 2;
        this.oy = Math.max(4, (r.height - 24 - this.H * this.scale) / 2);
    },

    toWorld(x, y) {
        return { x: (x - this.ox) / this.scale, y: (y - this.oy) / this.scale };
    },

    list(type) {
        return Id.list[type] || [];
    },

    // topmost first: frames, sockets, hosts, hubs, cables
    pick(x, y) {
        const frames = [];
        this.list("Patch").forEach(p => {
            p.inFlight().forEach(f => frames.push(f));
            p.queue.forEach(q => q.forEach(f => frames.push(f)));
        });
        for (const f of frames) if (f.hit(x, y)) return f;
        for (const n of this.list("Port")) if (n.hit(x, y)) return n;
        for (const h of this.list("Host")) if (h.hit(x, y)) return h;
        for (const h of this.list("Hub")) if (h.hit(x, y)) return h;
        for (const p of this.list("Patch")) if (p.hit(x, y)) return p;
        return null;
    },

    loop(t) {
        const dt = this.last ? t - this.last : 16;
        this.last = t;
        Sim.update(dt);
        this.render();
        Inspector.tick(t);
        this.updateClock();
        requestAnimationFrame(tt => this.loop(tt));
    },

    drawZones() {
        this.zones.forEach(z => {
            ctx.save();
            Gfx.rrect(z.x, z.y, z.w, z.h, 14);
            ctx.fillStyle = "rgba(148,163,184,.025)";
            ctx.fill();
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = "rgba(148,163,184,.16)";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
            Gfx.text(z.label, z.x + 12, z.y + z.h - 9, { align: "left", size: 10.5, weight: 600, color: "rgba(148,163,184,.55)" });
        });
    },

    render() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, nwCanvas.width, nwCanvas.height);
        ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * this.ox, this.dpr * this.oy);

        this.drawZones();
        const hov = this.hover;
        this.list("Patch").forEach(p => p.drawCable(hov == p));
        this.list("Hub").forEach(h => h.draw());
        this.list("Host").forEach(h => h.draw());

        // outline for hovered object and for objects with an open popup
        const outline = (o, strong) => {
            const b = o && o.bounds && o.bounds();
            if (b) Gfx.highlight(b, strong);
        };
        Inspector.wins.forEach(w => { if (!(w.obj instanceof Frame)) outline(w.obj, true); });
        if (hov && !(hov instanceof Frame)) outline(hov, false);

        this.list("Patch").forEach(p => p.drawFrames(hov));

        // tooltip in screen space
        if (hov && hov.tooltipLines && this.mx >= 0) {
            ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            const c = hov instanceof Frame ? hov.color() : hov instanceof Patch ? hov.color : COLORS.select;
            Gfx.tooltip(this.mx, this.my, hov.tooltipLines(), c, this.cw, this.ch);
        }
    },

    // ---------- top bar ----------
    initControls() {
        const play = document.getElementById("btnPlay");
        const step = document.getElementById("btnStep");
        const speed = document.getElementById("speed");
        speed.value = Sim.SPEEDS.indexOf(Sim.speed);
        play.addEventListener("click", () => Sim.toggle());
        step.addEventListener("click", () => Sim.step());
        speed.addEventListener("input", () => Sim.setSpeed(Sim.SPEEDS[+speed.value]));
        document.getElementById("btnClearLog").addEventListener("click", () => EventLog.clear());
        Sim.onChange(() => this.syncControls());
        this.syncControls();

        const tries = [
            ["ARP", "ssh Host1 arping 192.168.1.2"],
            ["ping", "ssh Host1 ping -c 3 192.168.1.2"],
            ["via hubs", "ssh Host7 ping -c 2 192.168.1.21"],
            ["LLDP on", "for i in {1..12}; do ssh Host$i systemctl start lldpd; done"],
            ["LLDP send", "ssh Host8 lldpcli update"],
            ["neighbours", "ssh Host7 lldpcli show neighbors"],
            ["ARP cache", "ssh Host7 ip neigh"],
            ["help", "help"],
        ];
        const box = document.getElementById("tries");
        box.innerHTML = '<span class="lbl">Try:</span>';
        tries.forEach(([label, cmd]) => {
            const b = document.createElement("button");
            b.className = "try";
            b.textContent = label;
            b.title = cmd;
            b.addEventListener("click", () => { terminal.runCommand(cmd); consoleArea.focus(); });
            box.appendChild(b);
        });
    },

    syncControls() {
        const state = Sim.stepping ? "step" : Sim.running ? "run" : "pause";
        document.getElementById("icoPlay").className = "ico " + (Sim.running && !Sim.stepping ? "pause" : "play");
        document.getElementById("lblPlay").textContent = Sim.running && !Sim.stepping ? "Pause" : "Play";
        const st = document.getElementById("simState");
        st.className = "state " + state;
        st.textContent = { run: "running", pause: "paused", step: "stepping…" }[state];
        document.getElementById("speed").value = Sim.SPEEDS.indexOf(Sim.speed);
        document.getElementById("speedOut").textContent = Sim.speed + "×";
    },

    updateClock() {
        const el = document.getElementById("simTime");
        const s = "t = " + (Sim.time / 1000).toFixed(1) + " s";
        if (el.textContent != s) el.textContent = s;
    },
};
