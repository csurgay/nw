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
        this.stage = document.getElementById("canvasWrap");
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
        nwCanvas.addEventListener("mousedown", ev => {
            const p = this.eventPoint(ev);
            if (Editor.mousedown(p, this.pick(p.x, p.y))) ev.preventDefault();
        });
        window.addEventListener("mousemove", ev => {
            if (Editor.on) Editor.mousemove(this.eventPoint(ev));
        });
        window.addEventListener("mouseup", () => { this.suppressClick = Editor.mouseup(); });
        nwCanvas.addEventListener("click", ev => {
            const p = this.eventPoint(ev);
            const obj = this.pick(p.x, p.y);
            if (this.suppressClick) { this.suppressClick = false; return; }
            if (Editor.click(p, obj)) return;
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
        const v = this.view || { x: 0, y: 0, w: this.W, h: this.H };
        this.scale = Math.min(r.width / v.w, (r.height - 24) / v.h);
        this.ox = (r.width - v.w * this.scale) / 2 - v.x * this.scale;
        this.oy = Math.max(4, (r.height - 24 - v.h * this.scale) / 2) - v.y * this.scale;
    },

    // zoom to the current network: bounding box of devices and zones
    fit() {
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        const add = b => { if (!b) return; x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); };
        this.devices().forEach(d => add(d.bounds()));
        this.zones.forEach(add);
        if (x0 > x1) { this.view = null; return this.resize(); }
        const m = 24;
        x0 -= m; y0 -= m; x1 += m; y1 += m;
        // don't zoom in too much on tiny networks
        const w = Math.max(x1 - x0, 760), h = Math.max(y1 - y0, 420);
        this.view = { x: (x0 + x1 - w) / 2, y: (y0 + y1 - h) / 2, w, h };
        this.resize();
    },

    eventPoint(ev) {
        const r = nwCanvas.getBoundingClientRect();
        return this.toWorld(ev.clientX - r.left, ev.clientY - r.top);
    },

    toWorld(x, y) {
        return { x: (x - this.ox) / this.scale, y: (y - this.oy) / this.scale };
    },

    list(type) {
        return Id.list[type] || [];
    },

    // every box on the canvas: hubs, switches, hosts, routers
    devices() {
        return [...this.list("Hub"), ...this.list("Switch"), ...this.list("Host"), ...this.list("Server"), ...this.list("Router")];
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
        for (const h of this.devices()) if (h.hit(x, y)) return h;
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
            const right = z.align == "right";
            Gfx.text(z.label, right ? z.x + z.w - 12 : z.x + 12, z.y + z.h - 9, { align: right ? "right" : "left", size: 10.5, weight: 600, color: "rgba(148,163,184,.55)" });
        });
    },

    render() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, nwCanvas.width, nwCanvas.height);
        ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * this.ox, this.dpr * this.oy);

        this.drawZones();
        const hov = this.hover;
        this.list("Patch").forEach(p => p.drawCable(hov == p));
        this.devices().forEach(h => h.draw());

        // outline for hovered object and for objects with an open popup
        const outline = (o, strong) => {
            const b = o && o.bounds && o.bounds();
            if (b) Gfx.highlight(b, strong);
        };
        Inspector.wins.forEach(w => { if (!(w.obj instanceof Frame)) outline(w.obj, true); });
        if (hov && !(hov instanceof Frame)) outline(hov, false);

        this.list("Patch").forEach(p => p.drawFrames(hov));
        Editor.drawOverlay();

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

    },

    // clickable example commands under the terminal
    setTries(tries) {
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
