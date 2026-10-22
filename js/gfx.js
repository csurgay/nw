// Drawing helpers for the small, realistic hardware illustrations.
const COLORS = {
    ARP: "#f59e0b",
    ICMP: "#34d399",
    LLDP: "#a78bfa",
    IPv4: "#60a5fa",
    ETH: "#38bdf8",
    FCS: "#94a3b8",
    PAD: "#64748b",
    DROP: "#f87171",
    select: "#38bdf8",
    cable: "#2f7fd8",
    uplink: "#e4b43c",
    ledGreen: "#3ee87a",
    ledAmber: "#ffb020",
    label: "#d7e0ea",
    labelDim: "#7f91a6",
};

const Gfx = {
    rrect(x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    },

    vgrad(y0, y1, stops) {
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
        return g;
    },

    led(x, y, r, color, on, glow = 1) {
        ctx.save();
        if (on) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 8 * glow;
        }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = on ? color : "#1d2620";
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = on ? "rgba(255,255,255,.65)" : "rgba(255,255,255,.08)";
        ctx.fill();
    },

    text(str, x, y, opts = {}) {
        ctx.font = (opts.weight || "500") + " " + (opts.size || 11) + "px " +
            (opts.mono ? "ui-monospace, Menlo, Consolas, monospace" : "Inter, system-ui, sans-serif");
        ctx.textAlign = opts.align || "center";
        ctx.textBaseline = opts.base || "alphabetic";
        ctx.fillStyle = opts.color || COLORS.label;
        ctx.fillText(str, x, y);
    },

    // RJ45 socket. (x,y) is the socket centre, dir is the direction the
    // cable leaves in ("up","down","left","right"), s is a scale factor.
    jack(x, y, dir, s, opts) {
        const vertical = dir == "up" || dir == "down";
        const w = (vertical ? 14 : 11) * s, h = (vertical ? 11 : 14) * s;
        ctx.save();
        ctx.translate(x, y);
        // metal shield
        Gfx.rrect(-w / 2 - 1.5 * s, -h / 2 - 1.5 * s, w + 3 * s, h + 3 * s, 2 * s);
        ctx.fillStyle = "#9aa4ae";
        ctx.fill();
        // dark opening
        Gfx.rrect(-w / 2, -h / 2, w, h, 1.5 * s);
        ctx.fillStyle = "#0b0e12";
        ctx.fill();
        // gold contacts
        ctx.fillStyle = "#d9b45a";
        for (let i = 0; i < 6; i++) {
            const p = -w / 2 + (i + 1.5) * (vertical ? w : h) / 9;
            if (vertical) ctx.fillRect(p, dir == "down" ? -h / 2 + 1 * s : h / 2 - 3 * s, 0.9 * s, 2 * s);
            else ctx.fillRect(dir == "right" ? -w / 2 + 1 * s : w / 2 - 3 * s, -h / 2 + (i + 1.5) * h / 9, 2 * s, 0.9 * s);
        }
        ctx.restore();
        if (opts && opts.plug) Gfx.plug(x, y, dir, s, opts.plug);
    },

    // The plastic boot of an inserted RJ45 plug, pointing out of the socket.
    plug(x, y, dir, s, color) {
        const d = Gfx.dirVec(dir);
        const len = 13 * s, wid = 9 * s;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(d.y, d.x));
        // clear plastic head
        Gfx.rrect(-4 * s, -wid / 2 - 0.5 * s, 8 * s, wid + 1 * s, 1.5 * s);
        ctx.fillStyle = "rgba(220,235,245,.55)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.4)";
        ctx.lineWidth = 0.6;
        ctx.stroke();
        // boot
        ctx.beginPath();
        ctx.moveTo(3 * s, -wid / 2);
        ctx.lineTo(len, -wid / 3);
        ctx.lineTo(len, wid / 3);
        ctx.lineTo(3 * s, wid / 2);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.18)";
        ctx.fillRect(4 * s, -wid / 2 + 1 * s, len - 5 * s, 1.2 * s);
        ctx.restore();
    },

    dirVec(dir) {
        return { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[dir] || { x: 0, y: 1 };
    },

    // point on a cubic bezier
    bez(p, t) {
        const u = 1 - t;
        return {
            x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
            y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
        };
    },

    bezLength(p) {
        let len = 0, prev = p[0];
        for (let i = 1; i <= 24; i++) {
            const q = Gfx.bez(p, i / 24);
            len += Math.hypot(q.x - prev.x, q.y - prev.y);
            prev = q;
        }
        return len;
    },

    // a small rounded tooltip box drawn in screen space
    tooltip(x, y, lines, color, vw, vh) {
        ctx.save();
        ctx.font = "600 12px Inter, system-ui, sans-serif";
        let w = ctx.measureText(lines[0]).width;
        ctx.font = "11px ui-monospace, Menlo, Consolas, monospace";
        lines.slice(1).forEach(l => { w = Math.max(w, ctx.measureText(l).width); });
        w += 20;
        const h = 12 + lines.length * 16;
        let tx = x + 16, ty = y + 16;
        if (tx + w > vw - 6) tx = x - w - 12;
        if (ty + h > vh - 6) ty = vh - h - 6;
        ctx.shadowColor = "rgba(0,0,0,.5)";
        ctx.shadowBlur = 14;
        Gfx.rrect(tx, ty, w, h, 7);
        ctx.fillStyle = "rgba(15,22,31,.96)";
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillRect(tx, ty + 6, 3, h - 12);
        lines.forEach((l, i) => {
            if (i == 0) Gfx.text(l, tx + 11, ty + 19, { align: "left", weight: 700, size: 12, color: "#fff" });
            else Gfx.text(l, tx + 11, ty + 19 + i * 16, { align: "left", mono: true, size: 11, color: "#b9c6d4" });
        });
        ctx.restore();
    },

    // glow outline around a hovered / inspected object
    highlight(b, strong) {
        ctx.save();
        ctx.shadowColor = COLORS.select;
        ctx.shadowBlur = strong ? 16 : 10;
        Gfx.rrect(b.x - 5, b.y - 5, b.w + 10, b.h + 10, 8);
        ctx.strokeStyle = strong ? "rgba(56,189,248,.95)" : "rgba(56,189,248,.6)";
        ctx.lineWidth = strong ? 2 : 1.5;
        ctx.setLineDash(strong ? [] : [4, 3]);
        ctx.stroke();
        ctx.restore();
    },
};
