// Language switch (EN/HU) for the lexicon and the lesson texts
const Lang = {
    cur: "en",
    KEY: "nw.lang",
    listeners: [],

    init() {
        let l = null;
        try { l = localStorage.getItem(this.KEY); } catch (e) { /* storage blocked */ }
        if (!l) l = (navigator.language || "").toLowerCase().startsWith("hu") ? "hu" : "en";
        this.cur = l == "hu" ? "hu" : "en";
        document.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => this.set(b.dataset.lang)));
        this.sync();
    },

    set(l) {
        this.cur = l;
        try { localStorage.setItem(this.KEY, l); } catch (e) { /* ignore */ }
        this.sync();
        this.listeners.forEach(fn => fn());
    },

    sync() {
        document.querySelectorAll("[data-lang]").forEach(b => b.classList.toggle("active", b.dataset.lang == this.cur));
        document.documentElement.lang = this.cur;
        const lb = document.getElementById("btnLex");
        if (lb) lb.lastChild.textContent = this.cur == "hu" ? " Lexikon" : " Lexicon";
    },

    // pick the right language from {en, hu} or from obj.x / obj.x_hu
    t(o, field) {
        if (field) return (this.cur == "hu" && o[field + "_hu"]) || o[field];
        if (o == null) return "";
        if (typeof o == "string") return o;
        return o[this.cur] || o.en;
    },

    onChange(fn) { this.listeners.push(fn); },
};

// Small SVG building blocks for the lexicon illustrations (viewBox 0 0 480 220)
const Fig = {
    c: { pc: "#cfd5db", dark: "#2b3038", line: "#4b5563", text: "#d7e0ea", dim: "#8193a8", sw: "#2f4d68", hub: "#454c55", rt: "#2f3c34",
        arp: "#f59e0b", icmp: "#34d399", lldp: "#a78bfa", ip: "#60a5fa", eth: "#38bdf8", fcs: "#94a3b8", dhcp: "#fb7185", dns: "#fde047", udp: "#e2e8f0", vlan: "#f472b6", ok: "#4ade80", bad: "#f87171" },

    svg(inner, h = 220) {
        return `<svg viewBox="0 0 480 ${h}" xmlns="http://www.w3.org/2000/svg" class="fig" role="img">` +
            `<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>` +
            inner + `</svg>`;
    },

    // figure labels in the current language
    tr(s) {
        return Lang.cur == "hu" && FIG_HU[s] ? FIG_HU[s] : s;
    },

    t(x, y, s, o = {}) {
        s = Fig.tr(s);
        return `<text x="${x}" y="${y}" style="white-space:pre" fill="${o.c || Fig.c.text}" font-size="${o.s || 12}" font-weight="${o.w || 600}" text-anchor="${o.a || "middle"}"` +
            `${o.mono ? ' font-family="ui-monospace,Menlo,Consolas,monospace"' : ""}>${s}</text>`;
    },

    // a computer: monitor + tower, centred on x
    pc(x, y, label, sub, glow) {
        return `<g><rect x="${x - 30}" y="${y}" width="40" height="28" rx="3" fill="${Fig.c.dark}" stroke="${glow || "#15181c"}" stroke-width="${glow ? 2 : 1}"/>` +
            `<rect x="${x - 27}" y="${y + 3}" width="34" height="21" fill="#0b1a2a"/>` +
            `<rect x="${x - 24}" y="${y + 7}" width="18" height="2" fill="#5fa8d3" opacity=".7"/><rect x="${x - 24}" y="${y + 12}" width="12" height="2" fill="#5fa8d3" opacity=".7"/>` +
            `<rect x="${x - 13}" y="${y + 28}" width="6" height="5" fill="#3a4048"/><rect x="${x - 20}" y="${y + 33}" width="20" height="3" rx="1.5" fill="#3a4048"/>` +
            `<rect x="${x + 14}" y="${y + 2}" width="14" height="36" rx="2" fill="${Fig.c.pc}" stroke="#5d646c"/>` +
            `<rect x="${x + 16}" y="${y + 6}" width="10" height="3" fill="#3c424a"/><circle cx="${x + 21}" cy="${y + 16}" r="2" fill="#8b9198"/>` +
            (label ? Fig.t(x, y + 52, label, { s: 12, w: 700 }) : "") + (sub ? Fig.t(x, y + 65, sub, { s: 10, c: Fig.c.dim, mono: true, w: 500 }) : "") + `</g>`;
    },

    server(x, y, label, sub) {
        return `<g><rect x="${x - 16}" y="${y - 2}" width="32" height="42" rx="3" fill="#30353c" stroke="#121518"/>` +
            [0, 1, 2].map(i => `<rect x="${x - 12}" y="${y + 3 + i * 7}" width="24" height="4" fill="#1a1d21"/><circle cx="${x + 9}" cy="${y + 5 + i * 7}" r="1.3" fill="${Fig.c.ok}"/>`).join("") +
            Fig.t(x, y + 35, "SRV", { s: 7, c: "#9aa6b2", w: 800 }) +
            (label ? Fig.t(x, y + 54, label, { s: 12, w: 700 }) : "") + (sub ? Fig.t(x, y + 67, sub, { s: 10, c: Fig.c.dim, mono: true, w: 500 }) : "") + `</g>`;
    },

    box(x, y, w, color, title, n = 4, portColors) {
        let p = "";
        for (let i = 0; i < n; i++) {
            const px = x + w - 14 - (n - 1 - i) * 18;
            p += `<rect x="${px - 6}" y="${y + 12}" width="12" height="10" rx="1.5" fill="#0b0e12" stroke="#9aa4ae"/>` +
                (portColors && portColors[i] ? `<rect x="${px - 6}" y="${y + 4}" width="12" height="5" fill="${portColors[i]}"/>` : `<circle cx="${px}" cy="${y + 7}" r="1.8" fill="${Fig.c.ok}"/>`);
        }
        return `<g><rect x="${x}" y="${y}" width="${w}" height="30" rx="3" fill="${color}" stroke="#1a1e23"/>` +
            Fig.t(x + 8, y + 19, title, { a: "start", s: 11, w: 800 }) + p + `</g>`;
    },

    sw(x, y, label = "switch", n = 4, pc) { return Fig.box(x, y, 60 + n * 18, Fig.c.sw, label, n, pc); },
    hub(x, y, label = "hub", n = 4) { return Fig.box(x, y, 60 + n * 18, Fig.c.hub, label, n); },

    router(x, y, label = "router", sub) {
        return `<g><rect x="${x - 40}" y="${y}" width="80" height="34" rx="6" fill="${Fig.c.rt}" stroke="#141a16"/>` +
            `<ellipse cx="${x}" cy="${y + 17}" rx="14" ry="8" fill="#5b8f74" stroke="#a7d7bd"/>` +
            `<path d="M${x - 5} ${y + 14}l-6-3M${x + 5} ${y + 20}l6 3M${x - 5} ${y + 20}l-6 3M${x + 5} ${y + 14}l6-3" stroke="#eafff2" stroke-width="1.6" stroke-linecap="round"/>` +
            Fig.t(x, y + 50, label, { s: 12, w: 700 }) + (sub ? Fig.t(x, y + 63, sub, { s: 10, c: Fig.c.dim, mono: true, w: 500 }) : "") + `</g>`;
    },

    cable(x1, y1, x2, y2, color = "#2f7fd8") {
        const my = Math.max(y1, y2) + 18;
        return `<path d="M${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}" fill="none" stroke="#000" stroke-opacity=".4" stroke-width="5"/>` +
            `<path d="M${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="3"/>`;
    },

    line(x1, y1, x2, y2, color = "#2f7fd8", w = 3) {
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
    },

    arrow(x1, y1, x2, y2, color = Fig.c.text, label, dashed) {
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" marker-end="url(#ah)"${dashed ? ' stroke-dasharray="5 4"' : ""}/>` +
            (label ? Fig.t(mx, my - 6, label, { s: 10.5, c: color }) : "");
    },

    // an envelope = a frame/packet
    env(x, y, color, label, w = 44) {
        return `<g><rect x="${x - w / 2}" y="${y - 13}" width="${w}" height="26" rx="4" fill="${color}" stroke="#000" stroke-opacity=".5"/>` +
            `<rect x="${x - w / 2}" y="${y - 13}" width="9" height="26" rx="3" fill="${Fig.c.eth}"/>` +
            `<rect x="${x + w / 2 - 4}" y="${y - 13}" width="4" height="26" fill="${Fig.c.fcs}"/>` +
            (label ? `<rect x="${x - label.length * 3.4 - 6}" y="${y - 32}" width="${label.length * 6.8 + 12}" height="15" rx="7.5" fill="#0b1118" stroke="${color}"/>` + Fig.t(x, y - 21, label, { s: 9.5, c: color, w: 700 }) : "") + `</g>`;
    },

    bubble(x, y, text, color = Fig.c.text, w) {
        w = w || text.length * 6.6 + 20;
        return `<g><rect x="${x - w / 2}" y="${y - 16}" width="${w}" height="24" rx="12" fill="#101820" stroke="${color}"/>` +
            `<path d="M${x - 6} ${y + 8} l6 9 l6 -9 z" fill="#101820" stroke="${color}"/><rect x="${x - 5}" y="${y + 6}" width="10" height="3" fill="#101820"/>` +
            Fig.t(x, y, text, { s: 11, c: color }) + `</g>`;
    },

    // a row of header fields: [[label, width, color], ...]
    fields(x, y, list, h = 30) {
        let cx = x, out = "";
        list.forEach(([label, w, color, sub]) => {
            out += `<rect x="${cx}" y="${y}" width="${w}" height="${h}" fill="${color}" fill-opacity=".28" stroke="${color}"/>` +
                Fig.t(cx + w / 2, y + h / 2 + (sub ? -1 : 4), label, { s: 10.5, w: 700 }) +
                (sub ? Fig.t(cx + w / 2, y + h / 2 + 11, sub, { s: 8.5, c: Fig.c.dim, w: 500 }) : "");
            cx += w;
        });
        return out;
    },

    tag(x, y, text, color) {
        const w = text.length * 6.4 + 12;
        return `<rect x="${x - w / 2}" y="${y - 10}" width="${w}" height="16" rx="8" fill="${color}" fill-opacity=".18" stroke="${color}"/>` + Fig.t(x, y + 2, text, { s: 10, c: color, w: 700 });
    },

    zone(x, y, w, h, label, color = "#94a3b8") {
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${color}" fill-opacity=".05" stroke="${color}" stroke-opacity=".5" stroke-dasharray="5 4"/>` +
            (label ? Fig.t(x + 8, y + h - 7, label, { a: "start", s: 10, c: color, w: 600 }) : "");
    },

    no(x, y) {
        return `<g stroke="${Fig.c.bad}" stroke-width="3" stroke-linecap="round"><line x1="${x - 7}" y1="${y - 7}" x2="${x + 7}" y2="${y + 7}"/><line x1="${x + 7}" y1="${y - 7}" x2="${x - 7}" y2="${y + 7}"/></g>`;
    },

    yes(x, y) {
        return `<path d="M${x - 7} ${y} l5 6 l10 -12" fill="none" stroke="${Fig.c.ok}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    },
};

// Hungarian versions of the texts inside the figures
const FIG_HU = {
    "→ one way": "→ egyik irány", "← the other way": "← másik irány", "for PC3": "a PC3-nak",
    "MAC table": "MAC-tábla", "only here!": "csak ide!", "same IP addresses, new MACs": "ugyanazok az IP-címek, új MAC-címek",
    "an address, please!": "kérek egy címet!", "who is www?": "ki az a www?",
    "first 3 bytes: maker (OUI)": "első 3 bájt: gyártó (OUI)", "last 3: this card": "utolsó 3: ez a kártya",
    "last bit 0 = one card (unicast) · 1 = group": "utolsó bit 0 = egy kártya (unicast) · 1 = csoport",
    "ff:ff:ff:ff:ff:ff = everybody (broadcast)": "ff:ff:ff:ff:ff:ff = mindenki (broadcast)",
    "network: 192.168.1  (/24 = first 24 bits)": "hálózat: 192.168.1  (/24 = első 24 bit)", "computer: 10": "gép: 10",
    "Host1 = 192.168.1.10 · Host2 = 192.168.1.11 · same network": "Host1 = 192.168.1.10 · Host2 = 192.168.1.11 · azonos hálózat",
    "24 ones = network part": "24 egyes = hálózat rész", "8 zeros = computers": "8 nulla = gépek",
    "192.168.1.0 = the network · 192.168.1.255 = broadcast · 1 … 254 = computers": "192.168.1.0 = a hálózat · 192.168.1.255 = broadcast · 1 … 254 = gépek",
    "other": "többi", "networks": "hálózat",
    "192.168.1.0/24 dev NIC1        ← my own network: send directly": "192.168.1.0/24 dev NIC1        ← saját hálózat: közvetlenül",
    "default via 192.168.1.1        ← everything else": "default via 192.168.1.1        ← minden más",
    "Who has 192.168.1.3?": "Kié a 192.168.1.3?", "destination MAC ff:ff:ff:ff:ff:ff": "cél MAC: ff:ff:ff:ff:ff:ff",
    "data (payload)": "adat (payload)", "6 bytes": "6 bájt", "an Ethernet frame — at least 64, at most 1518 bytes": "egy Ethernet-keret — legalább 64, legfeljebb 1518 bájt",
    "Who has 192.168.1.2?": "Kié a 192.168.1.2?", "It's me: 02:…:02": "Az enyém: 02:…:02", "1) broadcast": "1) broadcast", "2) straight back": "2) egyenesen vissza",
    "Ethernet frame": "Ethernet-keret", "IP packet": "IP-csomag", "data": "adat",
    "echo request (ping)": "echo kérés (ping)", "echo reply (pong)": "echo válasz (pong)", "time exceeded!": "lejárt a TTL!",
    "2 bytes": "2 bájt", "8-byte header, then the message (DNS, DHCP…)": "8 bájtos fejléc, utána az üzenet (DNS, DHCP…)",
    "new PC": "új gép", "no IP yet": "még nincs IP", "DHCP server": "DHCP-szerver", "DNS server": "DNS-szerver",
    "1) what is www.lab?": "1) mi a www.lab címe?", "3) now ping 10.0.0.80": "3) most jöhet a ping",
    "I am Host1, port NIC1": "Host1 vagyok, NIC1 port", "I am Host2, port NIC2": "Host2 vagyok, NIC2 port",
    "on the cable": "a kábelen", "opened up": "kinyitva",
    "the blue IP packet stays the same, the frames change": "a kék IP-csomag ugyanaz marad, a keretek cserélődnek",
    "DNS question": "DNS-kérdés", "frame bytes …": "a keret bájtjai …", "receiver: calculate again →": "a fogadó újraszámolja →",
    "same → OK": "egyezik → rendben", "different → drop": "eltér → eldobja",
    "… at 0: dropped + ICMP time exceeded": "… 0-nál: eldobják + ICMP time exceeded", "= 69 in decimal": "= 69 tízes számrendszerben",
    "Applications: DNS, DHCP": "Alkalmazások: DNS, DHCP", "4  Transport: UDP, ports": "4  Szállítási: UDP, portok",
    "3  Network: IP, routers": "3  Hálózati: IP, routerek", "2  Data link: Ethernet, MAC, switches": "2  Adatkapcsolati: Ethernet, MAC, switchek",
    "1  Physical: cables, hubs": "1  Fizikai: kábelek, hubok",
    "MAC address          port   age": "MAC-cím              port   kor",
    "192.168.1.0/24 dev NIC5      → LAN A": "192.168.1.0/24 dev NIC5      → A hálózat",
    "192.168.2.0/24 via 10.0.0.2 → next router": "192.168.2.0/24 via 10.0.0.2 → következő router",
    "default via 10.0.0.2         → everything else": "default via 10.0.0.2         → minden más",
    "where is …:09? no idea!": "hol a …:09? fogalmam sincs!",
    "hub: 1 collision domain": "hub: 1 ütközési tartomány", "switch: one per port": "switch: portonként egy",
    "broadcast domain A": "A szórási tartomány", "broadcast domain B": "B szórási tartomány",
    "both directions at the same time": "egyszerre mindkét irányba", "default route → the other router": "alapértelmezett útvonal → a másik router",
    "trunk: one cable, every VLAN, tagged frames": "trunk: egy kábel, minden VLAN, címkézett keretek",
    "who has .2?": "kié a .2?", "me! 02:…:02": "enyém! 02:…:02", "to port 53": "az 53-as portra",
    "computer": "gép", "domain": "tartomány", "type": "típus", "length": "hossz", "value": "érték",
    "system name": "rendszernév", "port ID": "port azonosító", "chip": "csip",
};

// The illustrated lexicon window
const Lexicon = {
    entries: [],
    byId: {},
    current: null,
    filter: "",
    cat: "all",
    termRe: null,
    termMap: {},

    CATS: {
        all: { en: "Everything", hu: "Minden" },
        devices: { en: "Devices", hu: "Eszközök", c: "#38bdf8" },
        addresses: { en: "Addresses", hu: "Címek", c: "#f59e0b" },
        protocols: { en: "Protocols", hu: "Protokollok", c: "#34d399" },
        packets: { en: "Inside a frame", hu: "A keret belseje", c: "#a78bfa" },
        ideas: { en: "Ideas", hu: "Fogalmak", c: "#fb7185" },
        commands: { en: "Commands", hu: "Parancsok", c: "#fde047" },
    },

    UI: {
        search: { en: "Search…", hu: "Keresés…" },
        oneLine: { en: "In one sentence", hu: "Egy mondatban" },
        like: { en: "It's like…", hu: "Olyan, mint…" },
        tryIt: { en: "Try it", hu: "Próbáld ki" },
        see: { en: "See also", hu: "Lásd még" },
        title: { en: "Network lexicon", hu: "Hálózati lexikon" },
        none: { en: "Nothing found.", hu: "Nincs találat." },
        stands: { en: "stands for", hu: "jelentése" },
    },

    init(entries) {
        this.entries = entries;
        entries.forEach(e => { this.byId[e.id] = e; });
        // terms to link in other texts: longest first
        const keys = [];
        entries.forEach(e => (e.keys || []).forEach(k => { keys.push(k); this.termMap[k] = e.id; }));
        keys.sort((a, b) => b.length - a.length);
        const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        this.termRe = new RegExp("(?<![\\w\\-])(" + keys.map(escRe).join("|") + ")(?![\\w])", "g");

        const el = document.getElementById("lexicon");
        el.innerHTML = `<div class="lex-win">
            <div class="lex-h"><span class="lex-logo">📖</span><b class="lex-title"></b>
                <span class="lang-sw"><button data-lang="en">EN</button><button data-lang="hu">HU</button></span>
                <button class="pop-x lex-x" title="Close">×</button></div>
            <div class="lex-body">
                <nav class="lex-nav"><input class="lex-search" type="search" spellcheck="false"><div class="lex-cats"></div><div class="lex-list"></div></nav>
                <article class="lex-art"></article>
            </div></div>`;
        el.querySelector(".lex-x").addEventListener("click", () => this.close());
        el.addEventListener("click", ev => { if (ev.target == el) this.close(); });
        el.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => Lang.set(b.dataset.lang)));
        const s = el.querySelector(".lex-search");
        s.addEventListener("input", () => { this.filter = s.value.trim().toLowerCase(); this.renderList(); });
        s.addEventListener("keydown", ev => {
            ev.stopPropagation();
            if (ev.key == "Enter") { const first = el.querySelector(".lex-item"); if (first) this.show(first.dataset.id); }
            if (ev.key == "Escape") this.close();
        });
        el.addEventListener("click", ev => {
            const it = ev.target.closest("[data-id]");
            if (it) return this.show(it.dataset.id);
            const c = ev.target.closest("[data-cat]");
            if (c) { this.cat = c.dataset.cat; this.renderList(); return; }
            const tr = ev.target.closest("[data-try]");
            if (tr) return this.tryIt(tr.dataset.lab, tr.dataset.try);
        });
        document.getElementById("btnLex").addEventListener("click", () => this.open());
        window.addEventListener("keydown", ev => { if (ev.key == "Escape" && this.isOpen()) this.close(); });
        // clicks on linked terms anywhere in the page
        document.addEventListener("click", ev => {
            const l = ev.target.closest(".lex-link");
            if (!l) return;
            ev.stopPropagation();
            ev.preventDefault();
            this.open(l.dataset.lex);
        }, true);
        Lang.onChange(() => { if (this.isOpen()) this.render(); });
    },

    isOpen() { return !document.getElementById("lexicon").hidden; },

    open(id) {
        const el = document.getElementById("lexicon");
        el.hidden = false;
        if (id && this.byId[id]) this.current = id;
        if (!this.current) this.current = this.entries[0].id;
        this.render();
        if (!id) setTimeout(() => el.querySelector(".lex-search").focus(), 50);
    },

    close() { document.getElementById("lexicon").hidden = true; },

    T(o) { return Lang.t(o); },

    render() {
        const el = document.getElementById("lexicon");
        el.querySelector(".lex-title").textContent = this.T(this.UI.title);
        el.querySelector(".lex-search").placeholder = this.T(this.UI.search);
        el.querySelectorAll("[data-lang]").forEach(b => b.classList.toggle("active", b.dataset.lang == Lang.cur));
        this.renderList();
        this.show(this.current, true);
    },

    renderList() {
        const el = document.getElementById("lexicon");
        el.querySelector(".lex-cats").innerHTML = Object.entries(this.CATS).map(([k, c]) =>
            `<button data-cat="${k}" class="${this.cat == k ? "active" : ""}" style="--c:${c.c || "#d7e0ea"}">${this.T(c)}</button>`).join("");
        const f = this.filter;
        const list = this.entries.filter(e => (this.cat == "all" || e.cat == this.cat) &&
            (!f || [e.en.t, e.hu.t, e.abbr || "", ...(e.keys || [])].join(" ").toLowerCase().includes(f)))
            .sort((a, b) => this.T(a).t.localeCompare(this.T(b).t, Lang.cur));
        el.querySelector(".lex-list").innerHTML = list.length ? list.map(e =>
            `<div class="lex-item${e.id == this.current ? " active" : ""}" data-id="${e.id}" style="--c:${this.CATS[e.cat].c}">${esc(this.T(e).t)}</div>`).join("") :
            `<p class="note">${this.T(this.UI.none)}</p>`;
    },

    show(id, keepList) {
        const e = this.byId[id];
        if (!e) return;
        this.current = id;
        const L = this.T(e);
        const art = document.getElementById("lexicon").querySelector(".lex-art");
        const cat = this.CATS[e.cat];
        art.style.setProperty("--c", cat.c);
        art.innerHTML = `<div class="lex-cat">${this.T(cat)}</div>
            <h2>${esc(L.t)}</h2>
            ${e.abbr ? `<div class="lex-abbr"><b>${esc(e.abbr.split(" = ")[0])}</b> ${this.T(this.UI.stands)}: ${esc(e.abbr.split(" = ")[1] || "")}</div>` : ""}
            <div class="lex-fig">${e.fig ? e.fig() : ""}</div>
            <div class="lex-short"><span>${this.T(this.UI.oneLine)}</span>${L.short}</div>
            ${(L.body || []).map(p => `<p>${p}</p>`).join("")}
            ${L.like ? `<div class="lex-like"><span>${this.T(this.UI.like)}</span>${L.like}</div>` : ""}
            ${e.try ? `<div class="lex-try"><span>${this.T(this.UI.tryIt)}</span>${e.try.map(([lab, cmd]) => `<button data-try="${esc(cmd)}" data-lab="${lab}"><code>${esc(cmd)}</code></button>`).join("")}</div>` : ""}
            ${e.see ? `<div class="lex-see"><span>${this.T(this.UI.see)}</span>${e.see.filter(s => this.byId[s]).map(s => `<button data-id="${s}" style="--c:${this.CATS[this.byId[s].cat].c}">${esc(this.T(this.byId[s]).t)}</button>`).join("")}</div>` : ""}`;
        art.scrollTop = 0;
        if (!keepList) this.renderList();
        else document.querySelectorAll("#lexicon .lex-item").forEach(i => i.classList.toggle("active", i.dataset.id == id));
    },

    tryIt(lab, cmd) {
        this.close();
        if (lab && (!Topology.current || Topology.current.id != lab)) terminal.runCommand("lab " + lab);
        terminal.runCommand(cmd);
        consoleArea.focus();
    },

    // turn known terms inside an element into lexicon links (each term once)
    linkify(root) {
        if (!this.termRe || !root) return;
        const seen = new Set();
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: n => n.parentElement.closest("a, code, pre, select, option, button, input, .lex-link, .hex, .fn, .fv") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(n => {
            const txt = n.nodeValue;
            this.termRe.lastIndex = 0;
            if (!this.termRe.test(txt)) return;
            this.termRe.lastIndex = 0;
            const frag = document.createDocumentFragment();
            let last = 0, m;
            while ((m = this.termRe.exec(txt))) {
                const id = this.termMap[m[1]];
                if (seen.has(id)) continue;
                seen.add(id);
                frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
                const a = document.createElement("span");
                a.className = "lex-link";
                a.dataset.lex = id;
                a.title = this.T(this.byId[id]).t + " — " + this.T(this.UI.title);
                a.textContent = m[1];
                frag.appendChild(a);
                last = m.index + m[1].length;
            }
            if (!last) return;
            frag.appendChild(document.createTextNode(txt.slice(last)));
            n.parentNode.replaceChild(frag, n);
        });
    },
};
