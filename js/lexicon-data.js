// The illustrated lexicon: every abbreviation, packet type, protocol and idea of the lab.
// Each entry: id, cat, abbr ("ABC = what it stands for"), keys (words that get linked
// in popups, log and lessons), en/hu texts {t, short, body[], like}, fig(), try [[lab, cmd]], see [ids].

const LEXICON = [
    // ---------------------------------------------------------------- devices
    {
        id: "host", cat: "devices", keys: ["workstation", "end station"],
        en: {
            t: "Computer (host)",
            short: "Any computer on the network that sends and receives data — a PC, a laptop, a phone or a server.",
            body: ["In networking every computer is called a <b>host</b>. Each host has at least one network card (NIC) with a MAC address, and usually an IP address.",
                "Hosts are where every journey starts and ends: a frame always leaves one host and arrives at another. Switches and routers in between only pass it on."],
            like: "the houses in a town: letters start and end at houses, the post office only carries them.",
        },
        hu: {
            t: "Számítógép (host)",
            short: "Minden gép a hálózaton, ami adatot küld és fogad — PC, laptop, telefon vagy szerver.",
            body: ["A hálózatban minden számítógépet <b>hostnak</b> (gazdagépnek) hívunk. Mindegyiknek van legalább egy hálózati kártyája (NIC) MAC-címmel, és általában IP-címe is.",
                "Minden út egy hostnál kezdődik és egy hostnál ér véget: a keret mindig egy hostból indul és egy másikba érkezik. A közbeeső switchek és routerek csak továbbadják."],
            like: "a házak egy városban: a levél házból indul és házba érkezik, a posta csak viszi.",
        },
        fig: () => Fig.svg(Fig.pc(110, 60, "host1", "192.168.1.1") + Fig.pc(370, 60, "host2", "192.168.1.2") +
            Fig.line(138, 92, 342, 92) + Fig.env(240, 92, Fig.c.icmp, "ping") + Fig.arrow(205, 122, 280, 122, Fig.c.icmp)),
        try: [["p2p", "ssh host1 ip addr"]], see: ["nic", "ip", "mac", "server"],
    },
    {
        id: "nic", cat: "devices", abbr: "NIC = Network Interface Card", keys: ["NIC", "network card"],
        en: {
            t: "Network card (NIC)",
            short: "The part of a computer that the network cable plugs into.",
            body: ["The NIC turns bits into electrical signals on the cable, and signals back into bits. It has its own <b>MAC address</b>, written into it at the factory.",
                "A NIC hears everything on its cable, but it only passes on frames addressed to its own MAC, to everybody (broadcast) or to a group it listens to (multicast). Everything else is quietly thrown away — watch the red DROP lines in the event log!"],
            like: "the letterbox of a house, with the house number painted on it.",
        },
        hu: {
            t: "Hálózati kártya (NIC)",
            short: "A számítógép azon része, amelybe a hálózati kábelt dugjuk.",
            body: ["A NIC a biteket elektromos jelekké alakítja a kábelen, és vissza. Saját <b>MAC-címe</b> van, amit a gyárban írnak bele.",
                "A NIC mindent hall, ami a kábelén jön, de csak azt adja tovább, ami a saját MAC-címére, mindenkinek (broadcast) vagy egy általa figyelt csoportnak (multicast) szól. Minden mást csendben eldob — figyeld a piros DROP sorokat az eseménynaplóban!"],
            like: "a ház postaládája, rajta a házszámmal.",
        },
        fig: () => Fig.svg(`<rect x="120" y="50" width="240" height="110" rx="6" fill="#1f5a3a" stroke="#0d2a1b"/>` +
            `<rect x="140" y="160" width="200" height="12" fill="#d9b45a"/>` + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `<rect x="${146 + i * 19}" y="161" width="9" height="10" fill="#b38a2e"/>`).join("") +
            `<rect x="170" y="80" width="60" height="50" fill="#1a1d21" stroke="#555"/>` + Fig.t(200, 109, "chip", { s: 10, c: Fig.c.dim }) +
            `<rect x="300" y="72" width="54" height="44" rx="3" fill="#9aa4ae"/><rect x="306" y="78" width="42" height="32" fill="#0b0e12"/>` +
            `<circle cx="312" cy="66" r="3" fill="${Fig.c.ok}"/><circle cx="342" cy="66" r="3" fill="${Fig.c.arp}"/>` +
            Fig.tag(240, 30, "MAC 02:00:00:00:00:07", Fig.c.arp) + Fig.t(327, 135, "RJ45", { s: 10, c: Fig.c.dim })),
        see: ["mac", "cable", "frame", "broadcast"],
    },
    {
        id: "cable", cat: "devices", abbr: "UTP = Unshielded Twisted Pair · RJ45 = the plug", keys: ["UTP", "RJ45", "patch cable", "Cat5e"],
        en: {
            t: "Network cable (UTP, RJ45)",
            short: "The wire that connects two network sockets; it carries the bits as tiny electrical pulses.",
            body: ["An Ethernet cable has 8 thin wires, twisted into 4 pairs (the twisting keeps out interference). The clear plastic plug at each end is the <b>RJ45</b>.",
                "Different pairs carry the two directions, so both ends can talk at the same time: <b>full duplex</b>. In the lab a frame on a cable is a little coloured envelope."],
            like: "a two-lane road: cars go both ways at the same time.",
        },
        hu: {
            t: "Hálózati kábel (UTP, RJ45)",
            short: "A vezeték, ami két hálózati aljzatot összeköt; a biteket apró elektromos impulzusokként viszi.",
            body: ["Az Ethernet-kábelben 8 vékony vezeték van, 4 párba sodorva (a sodrás véd a zavaroktól). A két végén lévő átlátszó műanyag dugó az <b>RJ45</b>.",
                "A két irányt külön érpárak viszik, így a két végpont egyszerre is beszélhet: ez a <b>full duplex</b>. A laborban a kábelen utazó keret egy kis színes boríték."],
            like: "egy kétsávos út: az autók egyszerre mennek mindkét irányba.",
        },
        fig: () => Fig.svg(`<rect x="40" y="88" width="46" height="34" rx="4" fill="rgba(220,235,245,.5)" stroke="#fff"/><rect x="394" y="88" width="46" height="34" rx="4" fill="rgba(220,235,245,.5)" stroke="#fff"/>` +
            [0, 1, 2, 3].map(i => `<path d="M86 ${96 + i * 6} C 160 ${80 + i * 10}, 320 ${130 - i * 10}, 394 ${96 + i * 6}" stroke="${["#f59e0b", "#38bdf8", "#4ade80", "#a78bfa"][i]}" stroke-width="3" fill="none"/>`).join("") +
            Fig.arrow(160, 60, 320, 60, Fig.c.eth, "→ one way") + Fig.arrow(320, 160, 160, 160, Fig.c.icmp, "← the other way") + Fig.t(63, 140, "RJ45", { s: 10, c: Fig.c.dim }) + Fig.t(417, 140, "RJ45", { s: 10, c: Fig.c.dim })),
        see: ["nic", "full-duplex", "hub"],
    },
    {
        id: "hub", cat: "devices", keys: ["hub", "repeater"],
        en: {
            t: "Hub",
            short: "An old, simple box that copies every frame to all of its other ports.",
            body: ["A hub works on <b>Layer 1</b>: it does not read addresses at all. Whatever arrives on one port is repeated, bit by bit, out of every other port.",
                "So every computer on a hub hears every frame, and each network card must decide whether it's meant for it. If two computers send at the same moment, the signals crash: a collision. Today switches have replaced hubs."],
            like: "a loudspeaker in a classroom: whatever one person says, everybody hears.",
        },
        hu: {
            t: "Hub (jelismétlő)",
            short: "Régi, egyszerű doboz, ami minden keretet lemásol az összes többi portjára.",
            body: ["A hub az <b>1. rétegen</b> dolgozik: egyáltalán nem olvas címeket. Ami az egyik portján bejön, azt bitről bitre kiküldi az összes többin.",
                "Így a hubon minden gép minden keretet hall, és minden hálózati kártyának magának kell eldöntenie, neki szól-e. Ha két gép egyszerre ad, a jelek összeütköznek (ütközés). Ma már switchek váltották fel a hubokat."],
            like: "egy hangosbemondó az osztályteremben: amit valaki mond, mindenki hallja.",
        },
        fig: () => Fig.svg(Fig.hub(160, 30, "HUB") + [70, 190, 310, 430].map((x, i) => Fig.pc(x, 120, "PC" + (i + 1))) +
            [70, 190, 310, 430].map((x, i) => i == 0 ? Fig.arrow(x, 116, 200, 68, Fig.c.arp) : Fig.arrow(240, 68, x, 116, Fig.c.arp, "", true)).join("") +
            Fig.bubble(118, 100, "for PC3", Fig.c.arp)),
        try: [["hub", "ssh host1 ping -c 2 192.168.1.3"]], see: ["switch", "collision-domain", "flooding", "layers"],
    },
    {
        id: "switch", cat: "devices", keys: ["switch", "learning switch", "kapcsoló"],
        en: {
            t: "Switch",
            short: "A smart box that learns where each computer is, and sends every frame only to the right port.",
            body: ["A switch works on <b>Layer 2</b>. It reads the <b>source MAC address</b> of each frame and remembers which port it came from: that is its MAC table.",
                "For the <b>destination MAC</b> it looks into the table: if it knows the port, the frame goes only there. If not — or for a broadcast — it floods the frame out of all other ports, like a hub. Switches can also be cut into VLANs."],
            like: "a school porter who knows which classroom each child is in, and takes a note only to that room.",
        },
        hu: {
            t: "Switch (kapcsoló)",
            short: "Okos doboz, ami megtanulja, melyik gép hol van, és minden keretet csak a jó portra küld.",
            body: ["A switch a <b>2. rétegen</b> dolgozik. Minden keretnél elolvassa a <b>forrás MAC-címet</b>, és megjegyzi, melyik portról jött: ez a MAC-táblája.",
                "A <b>cél MAC-címet</b> kikeresi a táblából: ha ismeri a portot, a keret csak oda megy. Ha nem — vagy broadcastnál —, minden más portra kiküldi (elárasztás), mint egy hub. A switchet VLAN-okra is lehet osztani."],
            like: "az iskolai portás, aki tudja, ki melyik osztályba jár, és az üzenetet csak abba a terembe viszi.",
        },
        fig: () => Fig.svg(Fig.sw(160, 30, "SWITCH") + [70, 190, 310, 430].map((x, i) => Fig.pc(x, 130, "PC" + (i + 1))).join("") +
            Fig.arrow(70, 126, 196, 66, Fig.c.icmp) + Fig.arrow(268, 66, 310, 126, Fig.c.icmp, "only here!") +
            `<rect x="330" y="8" width="140" height="52" rx="6" fill="#0b1118" stroke="#5aa7e0"/>` + Fig.t(400, 24, "MAC table", { s: 10.5, c: "#5aa7e0", w: 700 }) +
            Fig.t(400, 38, "…:01 → port 1", { s: 9.5, mono: true }) + Fig.t(400, 52, "…:03 → port 3", { s: 9.5, mono: true })),
        try: [["switch", "ssh host1 ping -c 3 192.168.1.3"]], see: ["mac-table", "flooding", "hub", "vlan", "managed-switch"],
    },
    {
        id: "router", cat: "devices", keys: ["router", "útválasztó"],
        en: {
            t: "Router",
            short: "A device that connects different networks and decides which way each packet should go.",
            body: ["A router has a leg (interface) in every network it connects. For a packet to another network it looks at the <b>destination IP</b> and its routing table, lowers the <b>TTL</b> by one, and sends the packet on in a brand-new Ethernet frame.",
                "The IP addresses stay the same for the whole journey, but the MAC addresses change at every router. Your home router connects your home network to the Internet."],
            like: "a post office: it reads the town on the letter and puts it on the right truck.",
        },
        hu: {
            t: "Router (útválasztó)",
            short: "Eszköz, ami különböző hálózatokat köt össze, és eldönti, merre menjen tovább egy csomag.",
            body: ["A routernek minden összekötött hálózatban van egy „lába” (interfésze). Ha egy csomag másik hálózatba megy, megnézi a <b>cél IP-címet</b> és az útvonaltábláját, eggyel csökkenti a <b>TTL</b>-t, és egy vadonatúj Ethernet-keretben küldi tovább.",
                "Az IP-címek az egész úton ugyanazok maradnak, a MAC-címek viszont minden routernél kicserélődnek. Az otthoni router az otthoni hálózatot köti össze az internettel."],
            like: "egy postahivatal: elolvassa a várost a levélen, és a megfelelő teherautóra teszi.",
        },
        fig: () => Fig.svg(Fig.zone(10, 30, 150, 150, "192.168.1.0/24", Fig.c.eth) + Fig.zone(320, 30, 150, 150, "192.168.2.0/24", Fig.c.icmp) +
            Fig.pc(70, 70, "host1") + Fig.pc(390, 70, "host3") + Fig.router(240, 80, "Router") + Fig.line(98, 102, 200, 97) + Fig.line(280, 97, 362, 102) +
            Fig.tag(150, 60, "TTL 64", Fig.c.ip) + Fig.tag(330, 60, "TTL 63", Fig.c.ip) + Fig.arrow(150, 205, 330, 205, Fig.c.ip, "same IP addresses, new MACs"), 220),
        try: [["router", "ssh host1 ping -c 2 192.168.2.10"]], see: ["router-setup", "routing-table", "gateway", "ttl", "ipv4"],
    },
    {
        id: "server", cat: "devices", keys: ["server", "szerver"],
        en: {
            t: "Server",
            short: "A computer that offers a service to the others — for example giving out addresses (DHCP) or answering name questions (DNS).",
            body: ["A server is a normal computer, usually without screen and keyboard, running programs that wait for questions on a <b>port number</b>.",
                "In this lab server1 can run <code>dhcpd</code> (hands out IP addresses) and <code>named</code> (a DNS server). Web, file and game servers work the same way."],
            like: "the reception desk of a hotel: guests come with questions, the desk answers them.",
        },
        hu: {
            t: "Szerver (kiszolgáló)",
            short: "Számítógép, ami szolgáltatást nyújt a többieknek — például címeket oszt (DHCP) vagy nevekre válaszol (DNS).",
            body: ["A szerver egy hétköznapi számítógép, többnyire képernyő és billentyűzet nélkül. Programok futnak rajta, amelyek egy <b>portszámon</b> várják a kérdéseket.",
                "A laborban a server1 futtathat <code>dhcpd</code>-t (IP-címeket oszt) és <code>named</code>-et (DNS-szerver). A web-, fájl- és játékszerverek ugyanígy működnek."],
            like: "a szálloda recepciója: a vendégek kérdeznek, a recepció válaszol.",
        },
        fig: () => Fig.svg(Fig.server(240, 70, "server1", "dhcpd · named") + Fig.pc(80, 60, "host1") + Fig.pc(400, 60, "host2") +
            Fig.bubble(110, 40, "an address, please!", Fig.c.dhcp, 150) + Fig.bubble(380, 40, "who is www?", Fig.c.dns, 110) +
            Fig.arrow(120, 110, 215, 95, Fig.c.dhcp) + Fig.arrow(360, 110, 265, 95, Fig.c.dns)),
        try: [["dhcp", "ssh host1 dhclient"]], see: ["dhcp", "dns", "port-number"],
    },

    // ---------------------------------------------------------------- addresses
    {
        id: "mac", cat: "addresses", abbr: "MAC = Media Access Control", keys: ["MAC address", "MAC addresses", "MAC", "MAC-cím"],
        en: {
            t: "MAC address",
            short: "The hardware address of a network card: 6 bytes, written like 02:00:00:00:00:07.",
            body: ["Every network card has a MAC address. It is used inside the local network: every Ethernet frame carries the destination MAC and the source MAC at its very beginning.",
                "Normally the first 3 bytes tell the manufacturer. If the lowest bit of the first byte is 1, it is a group (multicast) address; <code>ff:ff:ff:ff:ff:ff</code> is the broadcast address — everybody. In this lab the MACs look like 02:00:00:00:00:NN, where NN is the card's number."],
            like: "the name tag sewn into your jacket: it stays with the card wherever it goes.",
        },
        hu: {
            t: "MAC-cím",
            short: "A hálózati kártya hardvercíme: 6 bájt, így írjuk: 02:00:00:00:00:07.",
            body: ["Minden hálózati kártyának van MAC-címe. A helyi hálózaton belül használják: minden Ethernet-keret legelején ott a cél és a forrás MAC-címe.",
                "Általában az első 3 bájt a gyártót jelöli. Ha az első bájt legalsó bitje 1, akkor csoportcím (multicast); az <code>ff:ff:ff:ff:ff:ff</code> a broadcast cím — mindenkinek szól. A laborban a MAC-címek így néznek ki: 02:00:00:00:00:NN, ahol NN a kártya sorszáma."],
            like: "a kabátodba varrt névcédula: a kártyával megy, bárhová is kerül.",
        },
        fig: () => Fig.svg(Fig.fields(60, 70, ["02", "00", "00", "00", "00", "07"].map((b, i) => [b, 60, i < 3 ? Fig.c.arp : Fig.c.eth])) +
            Fig.t(150, 60, "first 3 bytes: maker (OUI)", { s: 10.5, c: Fig.c.arp }) + Fig.t(330, 60, "last 3: this card", { s: 10.5, c: Fig.c.eth }) +
            Fig.t(90, 130, "0000 0010", { s: 11, mono: true, c: Fig.c.dim }) + Fig.arrow(90, 140, 90, 165, Fig.c.dim) +
            Fig.t(170, 182, "last bit 0 = one card (unicast) · 1 = group", { s: 10.5, a: "start", c: Fig.c.text }) +
            Fig.t(170, 198, "ff:ff:ff:ff:ff:ff = everybody (broadcast)", { s: 10.5, a: "start", c: Fig.c.arp })),
        try: [["p2p", "ssh host1 ip link"]], see: ["nic", "arp", "broadcast", "unicast-multicast"],
    },
    {
        id: "ip", cat: "addresses", abbr: "IP = Internet Protocol", keys: ["IP address", "IP addresses", "IP", "IP-cím"],
        en: {
            t: "IP address",
            short: "The logical address of a computer, like 192.168.1.10: four numbers between 0 and 255.",
            body: ["An IPv4 address is 4 bytes, written as four numbers with dots. The first part says <b>which network</b> the computer is in, the rest <b>which computer</b> inside that network — the netmask (like /24) tells where the line is.",
                "Unlike the MAC address, the IP address is given by the network: you set it by hand (<code>ip addr</code>) or a DHCP server gives it. Routers use it to find the way across many networks."],
            like: "your postal address: town and street (the network) plus house number (the computer).",
        },
        hu: {
            t: "IP-cím",
            short: "A számítógép logikai címe, például 192.168.1.10: négy szám 0 és 255 között.",
            body: ["Az IPv4-cím 4 bájt, négy ponttal elválasztott számként írjuk. Az eleje megmondja, <b>melyik hálózatban</b> van a gép, a vége, hogy <b>melyik gép</b> azon belül — a hálózati maszk (például /24) jelzi, hol a határ.",
                "A MAC-címmel ellentétben az IP-címet a hálózat adja: kézzel állítjuk be (<code>ip addr</code>), vagy egy DHCP-szerver osztja ki. A routerek ez alapján találják meg az utat sok hálózaton át."],
            like: "a postacímed: város és utca (a hálózat) meg házszám (a gép).",
        },
        fig: () => Fig.svg(Fig.fields(60, 80, [["192", 90, Fig.c.ip], ["168", 90, Fig.c.ip], ["1", 90, Fig.c.ip], ["10", 90, Fig.c.arp]]) +
            Fig.t(195, 70, "network: 192.168.1  (/24 = first 24 bits)", { s: 11, c: Fig.c.ip }) + Fig.t(375, 135, "computer: 10", { s: 11, c: Fig.c.arp }) +
            Fig.t(240, 175, "host1 = 192.168.1.10 · host2 = 192.168.1.11 · same network", { s: 11, c: Fig.c.dim })),
        try: [["p2p", "ssh host1 ip addr"]], see: ["subnet", "ipv4", "mac", "dhcp"],
    },
    {
        id: "subnet", cat: "addresses", abbr: "CIDR = Classless Inter-Domain Routing (the /24 way of writing)", keys: ["netmask", "subnet", "prefix", "CIDR", "alhálózat"],
        en: {
            t: "Network, netmask and /24",
            short: "The netmask tells which part of an IP address is the network and which part is the computer.",
            body: ["192.168.1.10<b>/24</b> means: the first 24 bits (192.168.1) are the network, the last 8 bits (10) are the computer. Written as a netmask it is 255.255.255.0.",
                "Computers in the same network talk directly (with ARP and Ethernet). For any other network they need a router — the default gateway. The first address (192.168.1.0) names the network, the last one (192.168.1.255) is its broadcast address."],
            like: "a street: everybody on the same street can knock on each other's door; for another street you go through the crossroads.",
        },
        hu: {
            t: "Hálózat, hálózati maszk és /24",
            short: "A hálózati maszk megmondja, hogy az IP-cím melyik része a hálózat és melyik a gép.",
            body: ["A 192.168.1.10<b>/24</b> azt jelenti: az első 24 bit (192.168.1) a hálózat, az utolsó 8 bit (10) a gép. Maszkként felírva: 255.255.255.0.",
                "Az azonos hálózatban lévő gépek közvetlenül beszélnek (ARP-pal és Ethernettel). Minden más hálózathoz routerre van szükség — ez az alapértelmezett átjáró. Az első cím (192.168.1.0) a hálózat neve, az utolsó (192.168.1.255) a broadcast címe."],
            like: "egy utca: az egy utcában lakók bekopoghatnak egymáshoz; másik utcába a kereszteződésen át vezet az út.",
        },
        fig: () => Fig.svg(`<g font-family="ui-monospace,Menlo,monospace">` + Fig.fields(30, 70, [["11111111", 105, Fig.c.ip], ["11111111", 105, Fig.c.ip], ["11111111", 105, Fig.c.ip], ["00000000", 105, Fig.c.arp]]) + `</g>` +
            Fig.t(187, 60, "24 ones = network part", { s: 11, c: Fig.c.ip }) + Fig.t(397, 60, "8 zeros = computers", { s: 11, c: Fig.c.arp }) +
            Fig.t(240, 135, "255 . 255 . 255 . 0   =   /24", { s: 14, mono: true }) +
            Fig.t(240, 170, "192.168.1.0 = the network · 192.168.1.255 = broadcast · 1 … 254 = computers", { s: 10.5, c: Fig.c.dim })),
        try: [["router", "ssh host1 ip route"]], see: ["ip", "gateway", "routing-table", "broadcast"],
    },
    {
        id: "gateway", cat: "addresses", keys: ["default gateway", "gateway", "átjáró"],
        en: {
            t: "Default gateway",
            short: "The router to which a computer sends everything that is not in its own network.",
            body: ["Every computer has a routing table. Its <b>default route</b> says: “for any other network, give it to this router”. That router is the default gateway.",
                "The computer does not change the destination IP address — it only puts the gateway's MAC address on the frame. Check it with <code>ip route</code>: <code>default via 192.168.1.1</code>."],
            like: "the door of your classroom: everything that goes outside goes through it.",
        },
        hu: {
            t: "Alapértelmezett átjáró (gateway)",
            short: "Az a router, amelynek a gép mindent elküld, ami nem a saját hálózatába megy.",
            body: ["Minden gépnek van útvonaltáblája. Az <b>alapértelmezett útvonal</b> azt mondja: „minden más hálózatot add oda ennek a routernek”. Ez a router az alapértelmezett átjáró.",
                "A gép nem írja át a cél IP-címet — csak az átjáró MAC-címét teszi a keretre. Nézd meg: <code>ip route</code> → <code>default via 192.168.1.1</code>."],
            like: "az osztályterem ajtaja: ami kimegy, az mind azon át megy ki.",
        },
        fig: () => Fig.svg(Fig.pc(80, 60, "host1", "192.168.1.10") + Fig.router(260, 70, "gateway", "192.168.1.1") + Fig.line(108, 92, 220, 87) +
            `<ellipse cx="410" cy="85" rx="55" ry="34" fill="#16222f" stroke="${Fig.c.dim}"/>` + Fig.t(410, 81, "other", { s: 11 }) + Fig.t(410, 95, "networks", { s: 11 }) + Fig.line(300, 87, 355, 87, Fig.c.dim) +
            `<rect x="30" y="155" width="420" height="44" rx="6" fill="#0b1016" stroke="#1c2735"/>` +
            Fig.t(45, 173, "192.168.1.0/24 dev NIC1        ← my own network: send directly", { s: 10, mono: true, a: "start", c: "#c9f7d6" }) +
            Fig.t(45, 190, "default via 192.168.1.1        ← everything else", { s: 10, mono: true, a: "start", c: "#c9f7d6" })),
        try: [["router", "ssh host1 ip route"]], see: ["router", "routing-table", "subnet"],
    },
    {
        id: "broadcast", cat: "addresses", keys: ["broadcast", "broadcasts", "üzenetszórás"],
        en: {
            t: "Broadcast",
            short: "A message for everybody in the local network: ff:ff:ff:ff:ff:ff (Ethernet) or 255.255.255.255 (IP).",
            body: ["Every network card accepts a broadcast frame. Switches flood it out of every port in the same VLAN. Routers never pass it on, so it stays inside one network — that area is the <b>broadcast domain</b>.",
                "ARP requests and the first DHCP messages are broadcasts, because the sender doesn't know yet whom to ask."],
            like: "shouting in the classroom: everybody in the room hears it, nobody outside does.",
        },
        hu: {
            t: "Broadcast (üzenetszórás)",
            short: "Üzenet a helyi hálózat minden gépének: ff:ff:ff:ff:ff:ff (Ethernet) vagy 255.255.255.255 (IP).",
            body: ["A broadcast keretet minden hálózati kártya elfogadja. A switch az azonos VLAN minden portjára kiküldi. A router sosem adja tovább, így egy hálózaton belül marad — ez a terület a <b>szórási tartomány</b>.",
                "Az ARP-kérések és a DHCP első üzenetei broadcastok, mert a küldő még nem tudja, kitől kérdezzen."],
            like: "bekiabálni az osztályba: a teremben mindenki hallja, kint senki.",
        },
        fig: () => Fig.svg(Fig.pc(90, 90, "host1") + Fig.bubble(90, 60, "Who has 192.168.1.3?", Fig.c.arp, 160) +
            [260, 340, 420].map((x, i) => Fig.pc(x, 100, "host" + (i + 2)) + Fig.arrow(130, 115, x - 32, 115 + (i - 1) * 6, Fig.c.arp, "", true)).join("") +
            Fig.t(240, 200, "destination MAC ff:ff:ff:ff:ff:ff", { s: 11, mono: true, c: Fig.c.arp })),
        try: [["hub", "ssh host4 arping 192.168.1.2"]], see: ["arp", "broadcast-domain", "unicast-multicast", "flooding"],
    },
    {
        id: "unicast-multicast", cat: "addresses", keys: ["unicast", "multicast"],
        en: {
            t: "Unicast and multicast",
            short: "Unicast goes to one computer, multicast to a group, broadcast to everybody.",
            body: ["Most frames are <b>unicast</b>: one sender, one receiver; the destination MAC is the receiver's own address.",
                "A <b>multicast</b> address is for a group of listeners. LLDP uses 01:80:c2:00:00:0e, which switches never pass on. The lowest bit of the first MAC byte tells which kind it is: 0 = unicast, 1 = group."],
            like: "a letter to one friend, a letter to the chess club, and an announcement on the school radio.",
        },
        hu: {
            t: "Unicast és multicast",
            short: "A unicast egy gépnek szól, a multicast egy csoportnak, a broadcast mindenkinek.",
            body: ["A legtöbb keret <b>unicast</b>: egy küldő, egy címzett; a cél MAC a címzett saját címe.",
                "A <b>multicast</b> cím egy hallgatócsoportnak szól. Az LLDP a 01:80:c2:00:00:0e címet használja, amit a switchek sosem adnak tovább. Az első MAC-bájt legalsó bitje dönti el: 0 = unicast, 1 = csoport."],
            like: "levél egy barátnak, levél a sakkszakkörnek, és bemondás az iskolarádióban.",
        },
        fig: () => Fig.svg([["unicast", 1, Fig.c.icmp], ["multicast", 2, Fig.c.lldp], ["broadcast", 4, Fig.c.arp]].map(([n, k, c], r) =>
            Fig.t(70, 45 + r * 62, n, { s: 12, c, w: 700 }) + Fig.env(160, 40 + r * 62, c) +
            [0, 1, 2, 3].map(i => `<circle cx="${270 + i * 55}" cy="${40 + r * 62}" r="13" fill="${i < k ? c : "#1c2735"}" fill-opacity="${i < k ? .5 : 1}" stroke="${i < k ? c : "#2f3f54"}"/>`).join("") +
            Fig.arrow(188, 40 + r * 62, 252, 40 + r * 62, c)).join("")),
        see: ["broadcast", "mac", "lldp"],
    },
    {
        id: "port-number", cat: "addresses", keys: ["port number", "port numbers", "UDP port", "portszám"],
        en: {
            t: "Port number",
            short: "A number (0–65535) that says which program on a computer a message is for.",
            body: ["The IP address brings the packet to the right computer; the <b>port number</b> brings it to the right program. Servers listen on well-known ports: DNS 53, DHCP server 67, DHCP client 68, web 80/443, ssh 22.",
                "The asking side picks a random high port (like 40213) for the answer to come back to. Don't mix it up with a switch port — that is a physical socket!"],
            like: "the flat number inside a big apartment building.",
        },
        hu: {
            t: "Portszám",
            short: "Egy szám (0–65535), ami megmondja, hogy a gépen melyik programnak szól az üzenet.",
            body: ["Az IP-cím a jó géphez viszi a csomagot, a <b>portszám</b> a jó programhoz. A szerverek jól ismert portokon figyelnek: DNS 53, DHCP-szerver 67, DHCP-kliens 68, web 80/443, ssh 22.",
                "A kérdező fél egy véletlen, nagy portot választ (például 40213), oda érkezik majd a válasz. Ne keverd össze a switch portjával — az egy fizikai aljzat!"],
            like: "a lakás száma egy nagy társasházban.",
        },
        fig: () => Fig.svg(`<rect x="170" y="30" width="140" height="160" rx="8" fill="#16222f" stroke="${Fig.c.dim}"/>` + Fig.t(240, 50, "server1 · 192.168.1.2", { s: 11 }) +
            [["53 DNS", Fig.c.dns], ["67 DHCP", Fig.c.dhcp], ["22 ssh", Fig.c.icmp]].map(([t, c], i) => `<rect x="190" y="${65 + i * 40}" width="100" height="30" rx="5" fill="${c}" fill-opacity=".2" stroke="${c}"/>` + Fig.t(240, 85 + i * 40, t, { s: 12, c, w: 700 })).join("") +
            Fig.env(80, 80, Fig.c.dns, "to port 53") + Fig.arrow(105, 80, 188, 80, Fig.c.dns)),
        see: ["udp", "server", "dns", "dhcp"],
    },
    {
        id: "domain-name", cat: "addresses", keys: ["domain name", "search domain", "FQDN"],
        en: {
            t: "Domain name",
            short: "A name like www.lab or host1.lab that people can remember instead of an IP address.",
            body: ["Names are read from the right: <b>lab</b> is the domain, <b>www</b> is a computer in it. On the Internet it is the same: www.example.com.",
                "Computers still need the IP address, so they ask a DNS server. The <b>search domain</b> lets you type just “host1”: the computer adds “.lab” for you."],
            like: "a name in your phone's contacts instead of the phone number.",
        },
        hu: {
            t: "Tartománynév (domain név)",
            short: "Egy név, például www.lab vagy host1.lab, amit az emberek könnyebben megjegyeznek, mint egy IP-címet.",
            body: ["A neveket jobbról balra olvassuk: a <b>lab</b> a tartomány, a <b>www</b> egy gép benne. Az interneten is így van: www.example.com.",
                "A gépeknek viszont IP-cím kell, ezért megkérdeznek egy DNS-szervert. A <b>keresési tartomány</b> miatt elég annyit írni: „host1” — a gép hozzáteszi a „.lab”-ot."],
            like: "egy név a telefonod névjegyzékében a telefonszám helyett.",
        },
        fig: () => Fig.svg(Fig.t(240, 70, "host1 . lab", { s: 30, mono: true, c: Fig.c.dns }) + Fig.t(185, 100, "computer", { s: 11, c: Fig.c.dim }) + Fig.t(300, 100, "domain", { s: 11, c: Fig.c.dim }) +
            Fig.arrow(240, 120, 240, 160, Fig.c.dns, "DNS") + Fig.t(240, 190, "192.168.1.11", { s: 22, mono: true, c: Fig.c.ip })),
        try: [["dns", "ssh host1 host host3"]], see: ["dns", "ip"],
    },

    // ---------------------------------------------------------------- protocols
    {
        id: "ethernet", cat: "protocols", keys: ["Ethernet", "Ethernet II"],
        en: {
            t: "Ethernet",
            short: "The rules for sending frames over cables in a local network (Layer 2).",
            body: ["Ethernet describes the cable, the signals and the <b>frame</b>: destination MAC, source MAC, type, data, and a checksum at the end (FCS).",
                "Nearly every wired network uses Ethernet, and Wi-Fi works very much like it. Every coloured envelope on a cable in this lab is an Ethernet frame."],
            like: "the rules of the post: what an envelope looks like and where the addresses go.",
        },
        hu: {
            t: "Ethernet",
            short: "A szabályok arra, hogyan menjenek a keretek a kábeleken a helyi hálózatban (2. réteg).",
            body: ["Az Ethernet leírja a kábelt, a jeleket és a <b>keretet</b>: cél MAC, forrás MAC, típus, adat és a végén egy ellenőrzőösszeg (FCS).",
                "Szinte minden vezetékes hálózat Ethernetet használ, és a Wi-Fi is nagyon hasonlóan működik. A laborban minden színes boríték a kábeleken egy Ethernet-keret."],
            like: "a posta szabályai: hogyan néz ki egy boríték, és hová kerülnek a címek.",
        },
        fig: () => Fig.svg(Fig.fields(20, 80, [["dst MAC", 80, Fig.c.eth, "6 bytes"], ["src MAC", 80, Fig.c.eth, "6"], ["type", 50, Fig.c.eth, "2"], ["data (payload)", 160, Fig.c.ip, "46–1500"], ["FCS", 50, Fig.c.fcs, "4"]], 44) +
            Fig.t(240, 160, "an Ethernet frame — at least 64, at most 1518 bytes", { s: 11, c: Fig.c.dim })),
        see: ["frame", "mac", "ethertype", "fcs"],
    },
    {
        id: "arp", cat: "protocols", abbr: "ARP = Address Resolution Protocol", keys: ["ARP", "ARP request", "ARP reply"],
        en: {
            t: "ARP",
            short: "Finds the MAC address that belongs to an IP address in the local network.",
            body: ["Before sending to 192.168.1.2, a computer must know its MAC address. So it shouts (broadcast): <i>“Who has 192.168.1.2? Tell 192.168.1.1!”</i> Only the owner answers, straight back: <i>“192.168.1.2 is at 02:00:00:00:00:02.”</i>",
                "The answer is kept in the <b>ARP cache</b>, so the question isn't needed again for a while. See it with <code>ip neigh</code> or <code>arp -a</code>."],
            like: "calling out in class “Who is Anna?” — and Anna puts up her hand.",
        },
        hu: {
            t: "ARP",
            short: "Megkeresi, melyik MAC-cím tartozik egy IP-címhez a helyi hálózatban.",
            body: ["Mielőtt egy gép a 192.168.1.2-nek küldene, tudnia kell a MAC-címét. Ezért bekiabál (broadcast): <i>„Kié a 192.168.1.2? Szóljon a 192.168.1.1-nek!”</i> Csak a tulajdonos válaszol, egyenesen vissza: <i>„A 192.168.1.2 a 02:00:00:00:00:02-n van.”</i>",
                "A választ az <b>ARP-gyorsítótár</b> megjegyzi, így egy ideig nem kell újra kérdezni. Nézd meg: <code>ip neigh</code> vagy <code>arp -a</code>."],
            like: "bekiabálni az osztályban: „Ki az Anna?” — és Anna jelentkezik.",
        },
        fig: () => Fig.svg(Fig.pc(90, 90, "host1", ".1") + Fig.pc(390, 90, "host2", ".2") +
            Fig.bubble(150, 50, "Who has 192.168.1.2?", Fig.c.arp, 160) + Fig.bubble(340, 50, "It's me: 02:…:02", Fig.c.icmp, 130) +
            Fig.arrow(130, 150, 350, 150, Fig.c.arp, "1) broadcast") + Fig.arrow(350, 180, 130, 180, Fig.c.icmp, "2) straight back")),
        try: [["p2p", "ssh host1 arping 192.168.1.2"]], see: ["arp-cache", "broadcast", "mac", "ip"],
    },
    {
        id: "ipv4", cat: "protocols", abbr: "IPv4 = Internet Protocol version 4", keys: ["IPv4", "IP packet", "IP header"],
        en: {
            t: "IPv4 (Internet Protocol)",
            short: "The rules for addressing and delivering packets across many networks (Layer 3).",
            body: ["An IP packet has a header with the source and destination IP address, the <b>TTL</b>, and a protocol number saying what's inside (1 = ICMP, 17 = UDP, 6 = TCP).",
                "On every cable the IP packet travels inside an Ethernet frame. Routers unpack it, look at the destination IP, and pack it into a new frame for the next cable."],
            like: "the label on a parcel that travels by truck, train and plane.",
        },
        hu: {
            t: "IPv4 (internetprotokoll)",
            short: "A szabályok arra, hogyan címezzük és juttassuk el a csomagokat sok hálózaton át (3. réteg).",
            body: ["Az IP-csomag fejlécében benne van a forrás és a cél IP-címe, a <b>TTL</b>, és egy protokollszám, ami megmondja, mi van benne (1 = ICMP, 17 = UDP, 6 = TCP).",
                "Minden kábelen az IP-csomag egy Ethernet-keretben utazik. A routerek kicsomagolják, megnézik a cél IP-t, és új keretbe csomagolják a következő kábelhez."],
            like: "a címke egy csomagon, ami teherautón, vonaton és repülőn is utazik.",
        },
        fig: () => Fig.svg(`<rect x="30" y="50" width="420" height="110" rx="6" fill="${Fig.c.eth}" fill-opacity=".12" stroke="${Fig.c.eth}"/>` + Fig.t(50, 70, "Ethernet frame", { a: "start", s: 11, c: Fig.c.eth }) +
            `<rect x="60" y="80" width="360" height="66" rx="5" fill="${Fig.c.ip}" fill-opacity=".15" stroke="${Fig.c.ip}"/>` + Fig.t(80, 98, "IP packet", { a: "start", s: 11, c: Fig.c.ip }) +
            Fig.fields(80, 106, [["src IP", 80, Fig.c.ip], ["dst IP", 80, Fig.c.ip], ["TTL", 50, Fig.c.ip], ["data", 110, Fig.c.icmp]], 30)),
        see: ["ip", "router", "ttl", "encapsulation"],
    },
    {
        id: "icmp", cat: "protocols", abbr: "ICMP = Internet Control Message Protocol", keys: ["ICMP", "echo request", "echo reply", "time exceeded", "Time to live exceeded", "Destination Host Unreachable"],
        en: {
            t: "ICMP",
            short: "Small control messages between computers: “are you there?”, “yes!”, and error reports.",
            body: ["<code>ping</code> uses ICMP <b>echo request</b> (type 8) and <b>echo reply</b> (type 0). Routers use ICMP to report problems: <b>time exceeded</b> (type 11) when the TTL runs out, <b>destination unreachable</b> (type 3) when there is no way.",
                "An ICMP error always carries the beginning of the packet that failed, so the sender knows exactly which one it was."],
            like: "short notes: “Are you there?” — “Yes!” — or “Sorry, I couldn't deliver it.”",
        },
        hu: {
            t: "ICMP",
            short: "Kis vezérlőüzenetek a gépek között: „ott vagy?”, „igen!”, és hibajelentések.",
            body: ["A <code>ping</code> ICMP <b>echo kérést</b> (8-as típus) és <b>echo választ</b> (0-s típus) használ. A routerek ICMP-vel jelzik a gondokat: <b>time exceeded</b> (11), ha lejárt a TTL, <b>destination unreachable</b> (3), ha nincs út.",
                "Az ICMP-hibaüzenet mindig magával viszi a hibás csomag elejét, így a küldő pontosan tudja, melyikről van szó."],
            like: "rövid cetlik: „Ott vagy?” — „Igen!” — vagy „Bocs, nem tudtam kézbesíteni.”",
        },
        fig: () => Fig.svg(Fig.pc(80, 60, "host1") + Fig.pc(400, 60, "host2") +
            Fig.arrow(120, 70, 360, 70, Fig.c.icmp, "echo request (ping)") + Fig.arrow(360, 105, 120, 105, Fig.c.icmp, "echo reply (pong)") +
            Fig.router(340, 150, "router") + Fig.arrow(298, 167, 140, 145, Fig.c.bad, "time exceeded!")),
        try: [["p2p", "ssh host1 ping -c 2 192.168.1.2"], ["routing-loop", "ssh host1 ping -c 1 -t 6 172.16.0.1"]], see: ["ping", "ttl", "traceroute"],
    },
    {
        id: "udp", cat: "protocols", abbr: "UDP = User Datagram Protocol", keys: ["UDP"],
        en: {
            t: "UDP",
            short: "A simple way to send one message to a program on another computer (Layer 4).",
            body: ["UDP adds only 8 bytes: source port, destination port, length and a checksum. It doesn't check whether the message arrived — if an answer is missing, the program simply asks again.",
                "DNS and DHCP use UDP because their messages are short questions and answers. (TCP, its big brother, builds a reliable connection — used for web pages.)"],
            like: "a postcard: quick and simple, but without a receipt.",
        },
        hu: {
            t: "UDP",
            short: "Egyszerű módja annak, hogy egy üzenetet küldjünk egy másik gép egy programjának (4. réteg).",
            body: ["Az UDP csak 8 bájtot tesz hozzá: forrásport, célport, hossz és ellenőrzőösszeg. Nem nézi meg, megérkezett-e az üzenet — ha nem jön válasz, a program egyszerűen újra kérdez.",
                "A DNS és a DHCP UDP-t használ, mert rövid kérdés-válasz üzeneteik vannak. (A nagytestvére, a TCP, megbízható kapcsolatot épít — ezt használják a weboldalak.)"],
            like: "egy képeslap: gyors és egyszerű, de nincs tértivevény.",
        },
        fig: () => Fig.svg(Fig.fields(40, 80, [["src port", 100, Fig.c.udp, "2 bytes"], ["dst port", 100, Fig.c.udp, "2"], ["length", 100, Fig.c.udp, "2"], ["checksum", 100, Fig.c.udp, "2"]], 44) +
            Fig.t(240, 160, "8-byte header, then the message (DNS, DHCP…)", { s: 11, c: Fig.c.dim })),
        see: ["port-number", "dns", "dhcp", "layers"],
    },
    {
        id: "dhcp", cat: "protocols", abbr: "DHCP = Dynamic Host Configuration Protocol", keys: ["DHCP", "DORA", "dhcpd", "DHCPDISCOVER", "DHCPOFFER", "DHCPREQUEST", "DHCPACK"],
        en: {
            t: "DHCP",
            short: "Gives a computer its IP address, gateway and DNS server automatically.",
            body: ["A new computer has no address, so it shouts: <b>DISCOVER</b> (“is there a DHCP server?”). The server <b>OFFER</b>s an address, the computer <b>REQUEST</b>s it, and the server confirms with <b>ACK</b>. Discover – Offer – Request – Ack: <b>DORA</b>.",
                "The address is only lent for a while (the <b>lease</b>). Before it runs out, the computer asks to keep it."],
            like: "the reception of a hotel: you arrive, ask for a room, and get a key for a few nights.",
        },
        hu: {
            t: "DHCP",
            short: "Automatikusan ad a gépnek IP-címet, átjárót és DNS-szervert.",
            body: ["Az új gépnek még nincs címe, ezért bekiabál: <b>DISCOVER</b> („van itt DHCP-szerver?”). A szerver <b>OFFER</b>-rel felajánl egy címet, a gép <b>REQUEST</b>-tel elkéri, a szerver <b>ACK</b>-val megerősíti. Discover – Offer – Request – Ack: <b>DORA</b>.",
                "A címet csak kölcsönbe kapja egy időre (ez a <b>lease</b>, bérleti idő). Mielőtt lejár, a gép kéri, hogy megtarthassa."],
            like: "a szálloda recepciója: megérkezel, kérsz egy szobát, és kapsz kulcsot néhány éjszakára.",
        },
        fig: () => Fig.svg(Fig.pc(80, 40, "new PC", "no IP yet") + Fig.server(400, 40, "DHCP server") +
            [["1 DISCOVER", 1], ["2 OFFER .100", -1], ["3 REQUEST .100", 1], ["4 ACK ✓", -1]].map(([t, d], i) =>
                d > 0 ? Fig.arrow(120, 110 + i * 26, 370, 110 + i * 26, Fig.c.dhcp, t) : Fig.arrow(370, 110 + i * 26, 120, 110 + i * 26, Fig.c.dhcp, t)).join(""), 220),
        try: [["dhcp", "ssh host1 dhclient"]], see: ["lease", "broadcast", "udp", "gateway", "dns"],
    },
    {
        id: "dns", cat: "protocols", abbr: "DNS = Domain Name System", keys: ["DNS", "named", "NXDOMAIN", "nameserver"],
        en: {
            t: "DNS",
            short: "Turns names like www.lab into IP addresses.",
            body: ["When you type <code>ping www</code>, the computer first asks its DNS server (its address is in <code>/etc/resolv.conf</code>): <i>“What is the address of www.lab?”</i> The server answers “10.0.0.80” — only then can the ping start.",
                "If the name doesn't exist, the answer is <b>NXDOMAIN</b> (“no such domain”). DNS questions travel in UDP to port 53."],
            like: "the phone book, or your contacts: you look up the name to get the number.",
        },
        hu: {
            t: "DNS (névfeloldás)",
            short: "Neveket (például www.lab) fordít le IP-címekre.",
            body: ["Ha beírod: <code>ping www</code>, a gép először megkérdezi a DNS-szerverét (a címe az <code>/etc/resolv.conf</code>-ban van): <i>„Mi a www.lab címe?”</i> A szerver azt feleli: „10.0.0.80” — csak ezután indulhat a ping.",
                "Ha a név nem létezik, a válasz <b>NXDOMAIN</b> („nincs ilyen tartomány”). A DNS-kérdések UDP-ben utaznak az 53-as portra."],
            like: "a telefonkönyv, vagy a névjegyzéked: a név alapján megkeresed a számot.",
        },
        fig: () => Fig.svg(Fig.pc(80, 60, "host1") + Fig.server(400, 60, "DNS server") +
            Fig.arrow(120, 75, 370, 75, Fig.c.dns, "1) what is www.lab?") + Fig.arrow(370, 110, 120, 110, Fig.c.dns, "2) 10.0.0.80") +
            Fig.arrow(120, 170, 370, 170, Fig.c.icmp, "3) now ping 10.0.0.80")),
        try: [["dns", "ssh host1 host host3"], ["dns", "ssh host1 ping -c 1 host3"]], see: ["domain-name", "udp", "port-number", "host-cmd"],
    },
    {
        id: "lldp", cat: "protocols", abbr: "LLDP = Link Layer Discovery Protocol", keys: ["LLDP", "lldpd", "LLDPDU"],
        en: {
            t: "LLDP",
            short: "Devices tell their direct neighbours who they are.",
            body: ["With LLDP each device sends a small frame out of every port: my name, my port, my MAC, what I can do. The neighbour at the other end of the cable stores it (<code>lldpcli show neighbors</code>).",
                "LLDP frames go to a special multicast address that switches never pass on — so you only learn about the device at the other end of your own cable. Network admins use it to draw maps of their networks."],
            like: "saying hello to whoever sits next to you on the bus.",
        },
        hu: {
            t: "LLDP",
            short: "Az eszközök elmondják a közvetlen szomszédaiknak, kik ők.",
            body: ["Az LLDP-vel minden eszköz kis keretet küld ki minden portján: a nevem, a portom, a MAC-címem, mit tudok. A kábel másik végén lévő szomszéd eltárolja (<code>lldpcli show neighbors</code>).",
                "Az LLDP-keretek egy különleges multicast címre mennek, amit a switchek sosem adnak tovább — így csak a saját kábeled túlsó végén lévő eszközről tudsz meg valamit. A hálózatüzemeltetők ezzel rajzolnak térképet a hálózatukról."],
            like: "köszönni annak, aki melletted ül a buszon.",
        },
        fig: () => Fig.svg(Fig.pc(110, 70, "host1") + Fig.pc(370, 70, "host2") + Fig.line(138, 102, 342, 102) +
            Fig.bubble(120, 45, "I am host1, port NIC1", Fig.c.lldp, 160) + Fig.bubble(360, 45, "I am host2, port NIC2", Fig.c.lldp, 160) +
            Fig.env(240, 102, Fig.c.lldp, "LLDP")),
        try: [["hub", "for i in {1..4}; do ssh host$i systemctl start lldpd; done"], ["hub", "ssh host1 lldpcli update"]], see: ["tlv", "unicast-multicast", "lldpcli"],
    },
    {
        id: "vlan", cat: "protocols", abbr: "VLAN = Virtual Local Area Network · 802.1Q = the VLAN tag standard", keys: ["VLAN", "VLANs", "802.1Q"],
        en: {
            t: "VLAN",
            short: "Cuts one switch into several separate networks, as if you had more switches.",
            body: ["Every switch port is put into a VLAN by number (for example 10 or 20). Frames — even broadcasts — never cross from one VLAN to another inside the switch. To get from one VLAN to another you need a router.",
                "Between switches a single <b>trunk</b> cable can carry many VLANs: each frame gets a 4-byte <b>802.1Q tag</b> with its VLAN number, which the last switch removes again."],
            like: "invisible walls in one big room: the groups can't hear each other.",
        },
        hu: {
            t: "VLAN (virtuális hálózat)",
            short: "Egy switchet több külön hálózatra vág, mintha több switch lenne.",
            body: ["Minden switchport egy számmal jelölt VLAN-ba kerül (például 10 vagy 20). A keretek — még a broadcastok is — sosem mennek át a switchen belül egyik VLAN-ból a másikba. Ehhez router kell.",
                "A switchek között egyetlen <b>trunk</b> kábel sok VLAN-t is vihet: minden keret kap egy 4 bájtos <b>802.1Q címkét</b> a VLAN számával, amit az utolsó switch újra levesz."],
            like: "láthatatlan falak egy nagy teremben: a csoportok nem hallják egymást.",
        },
        fig: () => Fig.svg(Fig.sw(150, 40, "SWITCH", 4, [Fig.c.vlan, Fig.c.vlan, Fig.c.eth, Fig.c.eth]) +
            [60, 170, 300, 410].map((x, i) => Fig.pc(x, 120, "PC" + (i + 1), i < 2 ? "VLAN 10" : "VLAN 20")).join("") +
            Fig.zone(15, 110, 215, 100, "", Fig.c.vlan) + Fig.zone(250, 110, 215, 100, "", Fig.c.eth) + Fig.no(240, 160)),
        try: [["vlan", "ssh host1 ping -c 1 192.168.1.3"], ["vlan-trunk", "ssh host1 ping -c 2 192.168.10.21"]], see: ["trunk-access", "switch", "broadcast-domain"],
    },

    // ---------------------------------------------------------------- inside a frame
    {
        id: "frame", cat: "packets", keys: ["frame", "frames", "Ethernet frame", "keret"],
        en: {
            t: "Frame",
            short: "The envelope that travels on a cable: Ethernet header + data + checksum.",
            body: ["A frame starts with the destination and source MAC addresses and the type, then comes the data (for example an IP packet), and at the end a 4-byte checksum (FCS).",
                "A frame lives only on one local network. At every router the old frame is thrown away and a new one is made. Click any envelope in the lab to open it!"],
            like: "an envelope: addresses on the outside, the letter inside.",
        },
        hu: {
            t: "Keret (frame)",
            short: "A boríték, ami a kábelen utazik: Ethernet-fejléc + adat + ellenőrzőösszeg.",
            body: ["A keret a cél és a forrás MAC-címmel meg a típussal kezdődik, utána jön az adat (például egy IP-csomag), a végén pedig egy 4 bájtos ellenőrzőösszeg (FCS).",
                "Egy keret csak egy helyi hálózaton belül él. Minden routernél a régi keret eldobódik, és új készül. Kattints bármelyik borítékra a laborban, és nyisd ki!"],
            like: "egy boríték: kívül a címek, belül a levél.",
        },
        fig: () => Fig.svg(Fig.env(110, 110, Fig.c.arp, "", 120) + Fig.arrow(180, 110, 230, 110, Fig.c.dim) +
            Fig.fields(240, 90, [["dst", 45, Fig.c.eth], ["src", 45, Fig.c.eth], ["type", 35, Fig.c.eth], ["data", 75, Fig.c.ip], ["FCS", 35, Fig.c.fcs]], 40) +
            Fig.t(110, 160, "on the cable", { s: 11, c: Fig.c.dim }) + Fig.t(357, 160, "opened up", { s: 11, c: Fig.c.dim })),
        see: ["ethernet", "packet", "encapsulation", "fcs"],
    },
    {
        id: "packet", cat: "packets", keys: ["packet", "packets", "csomag"],
        en: {
            t: "Packet",
            short: "A piece of data with an IP header, which can travel across many networks.",
            body: ["People say “packet” for many things; strictly, an IP packet = IP header + data. On each cable the packet rides inside an Ethernet frame.",
                "Big files are cut into many packets; each one finds its way and they are put together again at the end."],
            like: "a parcel that is moved from truck to truck — the label stays the same.",
        },
        hu: {
            t: "Csomag (packet)",
            short: "Egy darab adat IP-fejléccel, ami sok hálózaton át is utazhat.",
            body: ["A „csomag” szót sokféle értelemben használják; pontosan: IP-csomag = IP-fejléc + adat. Minden kábelen a csomag egy Ethernet-keretben utazik.",
                "A nagy fájlokat sok csomagra vágják; mindegyik megtalálja az útját, és a végén újra összerakják őket."],
            like: "egy csomag, amit teherautóról teherautóra raknak át — a címke ugyanaz marad.",
        },
        fig: () => Fig.svg([60, 240, 420].map((x, i) => Fig.env(x, 100, i == 1 ? Fig.c.icmp : Fig.c.arp, "frame " + (i + 1), 70) +
            `<rect x="${x - 18}" y="${92}" width="36" height="16" rx="3" fill="${Fig.c.ip}"/>`).join("") +
            Fig.arrow(100, 100, 200, 100, Fig.c.dim, "router") + Fig.arrow(280, 100, 380, 100, Fig.c.dim, "router") + Fig.t(240, 160, "the blue IP packet stays the same, the frames change", { s: 11, c: Fig.c.ip })),
        see: ["ipv4", "frame", "encapsulation"],
    },
    {
        id: "encapsulation", cat: "packets", keys: ["encapsulation", "payload", "header"],
        en: {
            t: "Header, payload, encapsulation",
            short: "Each layer puts its own header in front of the data it carries — like envelopes inside envelopes.",
            body: ["A DNS question is put into a UDP datagram, that into an IP packet, that into an Ethernet frame. Each header says how to handle what is inside it: its <b>payload</b>.",
                "The receiver opens the envelopes one by one: Ethernet → IP → UDP → DNS. Open any frame in the lab to see the layers as coloured blocks."],
            like: "Russian dolls (matryoshka): a doll inside a doll inside a doll.",
        },
        hu: {
            t: "Fejléc, hasznos teher, beágyazás",
            short: "Minden réteg a saját fejlécét teszi az általa vitt adat elé — mint borítékok a borítékban.",
            body: ["A DNS-kérdés egy UDP-datagramba kerül, az egy IP-csomagba, az egy Ethernet-keretbe. Minden fejléc megmondja, mit kell kezdeni azzal, ami benne van: a <b>hasznos teherrel</b> (payload).",
                "A címzett sorban kibontja a borítékokat: Ethernet → IP → UDP → DNS. Nyiss ki bármelyik keretet a laborban: a rétegeket színes sávokként látod."],
            like: "matrjoska baba: baba a babában a babában.",
        },
        fig: () => Fig.svg([["Ethernet", Fig.c.eth, 0], ["IP", Fig.c.ip, 1], ["UDP", Fig.c.udp, 2], ["DNS question", Fig.c.dns, 3]].map(([t, c, i]) =>
            `<rect x="${30 + i * 32}" y="${18 + i * 30}" width="${420 - i * 64}" height="${190 - i * 42}" rx="8" fill="${c}" fill-opacity=".1" stroke="${c}"/>` +
            Fig.t(44 + i * 32, 36 + i * 30, t, { a: "start", s: 12, c, w: 700 })).join("")),
        see: ["layers", "frame", "packet", "udp"],
    },
    {
        id: "ethertype", cat: "packets", keys: ["EtherType"],
        en: {
            t: "EtherType",
            short: "A 2-byte number in the Ethernet header that says what is inside the frame.",
            body: ["<code>0x0800</code> = IPv4 packet, <code>0x0806</code> = ARP, <code>0x88cc</code> = LLDP, <code>0x8100</code> = a VLAN tag follows. The receiving computer uses it to hand the data to the right part of its software."],
            like: "a sticker on a parcel: “books”, “food” or “fragile”.",
        },
        hu: {
            t: "EtherType (típusmező)",
            short: "Egy 2 bájtos szám az Ethernet-fejlécben, ami megmondja, mi van a keretben.",
            body: ["<code>0x0800</code> = IPv4-csomag, <code>0x0806</code> = ARP, <code>0x88cc</code> = LLDP, <code>0x8100</code> = VLAN-címke következik. A fogadó gép ez alapján adja át az adatot a szoftvere megfelelő részének."],
            like: "matrica a csomagon: „könyv”, „élelmiszer” vagy „törékeny”.",
        },
        fig: () => Fig.svg([["0x0800", "IPv4", Fig.c.ip], ["0x0806", "ARP", Fig.c.arp], ["0x88cc", "LLDP", Fig.c.lldp], ["0x8100", "VLAN tag", Fig.c.vlan]].map(([h, n, c], i) =>
            Fig.tag(120, 45 + i * 40, h, c) + Fig.arrow(165, 47 + i * 40, 255, 47 + i * 40, c) + Fig.t(270, 51 + i * 40, n, { a: "start", s: 13, c, w: 700 })).join("")),
        see: ["ethernet", "frame"],
    },
    {
        id: "fcs", cat: "packets", abbr: "FCS = Frame Check Sequence · CRC = Cyclic Redundancy Check", keys: ["FCS", "CRC-32", "CRC"],
        en: {
            t: "FCS (CRC-32 checksum)",
            short: "A 4-byte checksum at the end of every frame that shows if the frame got damaged.",
            body: ["The sender calculates a number (CRC-32) from all the bytes of the frame and adds it at the end. The receiver calculates it again: if even one bit changed on the way, the numbers differ and the frame is thrown away.",
                "Ethernet does not repair frames — a higher layer (or the program) has to send again if needed."],
            like: "the seal on an envelope: if it's broken, you know something happened to it.",
        },
        hu: {
            t: "FCS (CRC-32 ellenőrzőösszeg)",
            short: "4 bájtos ellenőrzőösszeg minden keret végén, ami elárulja, ha a keret megsérült.",
            body: ["A küldő a keret összes bájtjából kiszámol egy számot (CRC-32), és a végére írja. A fogadó újra kiszámolja: ha útközben akár egyetlen bit is megváltozott, a két szám eltér, és a keret a kukába kerül.",
                "Az Ethernet nem javítja a kereteket — ha kell, egy magasabb réteg (vagy a program) küldi újra."],
            like: "a pecsét a borítékon: ha sérült, tudod, hogy valami történt vele.",
        },
        fig: () => Fig.svg(Fig.fields(40, 50, [["frame bytes …", 300, Fig.c.ip], ["a7 0e 4c 21", 100, Fig.c.fcs]], 36) +
            Fig.t(240, 120, "receiver: calculate again →", { s: 11, c: Fig.c.dim }) + Fig.yes(130, 160) + Fig.t(200, 165, "same → OK", { s: 12, c: Fig.c.ok }) +
            Fig.no(300, 160) + Fig.t(380, 165, "different → drop", { s: 12, c: Fig.c.bad })),
        see: ["checksum", "frame", "padding"],
    },
    {
        id: "padding", cat: "packets", keys: ["padding"],
        en: {
            t: "Padding",
            short: "Zero bytes added to short frames, so that every frame is at least 64 bytes long.",
            body: ["An ARP message is only 28 bytes, so 18 zero bytes are added. The minimum size makes sure that on a shared cable (a hub) a collision is noticed while the frame is still being sent."],
            like: "packing paper in a box that is too big for what's inside.",
        },
        hu: {
            t: "Kitöltés (padding)",
            short: "Nulla bájtok a rövid keretek végén, hogy minden keret legalább 64 bájtos legyen.",
            body: ["Egy ARP-üzenet csak 28 bájt, ezért 18 nulla bájtot tesznek hozzá. A legkisebb méret biztosítja, hogy egy közös kábelen (hubon) az ütközés még a keret küldése közben kiderüljön."],
            like: "töltőanyag egy dobozban, ami túl nagy ahhoz, ami benne van.",
        },
        fig: () => Fig.svg(Fig.fields(30, 80, [["Ethernet 14", 90, Fig.c.eth], ["ARP 28", 160, Fig.c.arp], ["00 00 … 18", 120, Fig.c.pad || "#64748b"], ["FCS", 50, Fig.c.fcs]], 40) +
            Fig.t(240, 160, "14 + 28 + 18 + 4 = 64 bytes", { s: 13, mono: true })),
        see: ["frame", "collision-domain", "fcs"],
    },
    {
        id: "ttl", cat: "packets", abbr: "TTL = Time To Live", keys: ["TTL"],
        en: {
            t: "TTL (time to live)",
            short: "A counter in every IP packet: each router lowers it by one, and at 0 the packet is dropped.",
            body: ["Linux starts at 64. If a packet goes round in a routing loop, the TTL makes sure it dies after a while. The router that drops it sends back an ICMP <b>time exceeded</b>.",
                "<code>traceroute</code> uses this on purpose: it sends packets with TTL 1, 2, 3… and every router on the way gives itself away."],
            like: "a bus ticket for 64 rides: every router punches one hole, and when it's full, the trip is over.",
        },
        hu: {
            t: "TTL (élettartam)",
            short: "Számláló minden IP-csomagban: minden router eggyel csökkenti, és 0-nál a csomagot eldobják.",
            body: ["A Linux 64-ről indul. Ha egy csomag körbe-körbe jár egy útválasztási hurokban, a TTL gondoskodik róla, hogy egy idő után elfogyjon. Az eldobó router ICMP <b>time exceeded</b> üzenetet küld vissza.",
                "A <code>traceroute</code> ezt szándékosan használja ki: 1, 2, 3… TTL-lel küld csomagokat, és az út minden routere „lebukik”."],
            like: "egy 64 utazásos buszjegy: minden router lyukaszt egyet, és ha betelt, vége az útnak.",
        },
        fig: () => Fig.svg(Fig.pc(50, 70) + [160, 280, 400].map((x, i) => Fig.router(x, 80, "R" + (i + 1))).join("") +
            [["64", 105], ["63", 220], ["62", 340]].map(([t, x]) => Fig.tag(x, 60, "TTL " + t, Fig.c.ip)).join("") +
            Fig.line(78, 97, 120, 97) + Fig.line(200, 97, 240, 97) + Fig.line(320, 97, 360, 97) + Fig.t(240, 180, "… at 0: dropped + ICMP time exceeded", { s: 11, c: Fig.c.bad })),
        try: [["two-routers", "ssh host1 ping -c 1 -t 2 192.168.2.10"], ["two-routers", "ssh host1 traceroute 192.168.2.10"]], see: ["traceroute", "routing-loop", "icmp", "router"],
    },
    {
        id: "checksum", cat: "packets", keys: ["checksum", "ellenőrzőösszeg"],
        en: {
            t: "Checksum",
            short: "A small number calculated from data, to check that nothing changed on the way.",
            body: ["IP, ICMP and UDP headers carry a 16-bit checksum: add up the numbers, keep the last 16 bits, flip them. Ethernet uses the stronger CRC-32 (the FCS).",
                "Routers change the TTL, so they must recalculate the IP header checksum every time."],
            like: "adding up the prices on a receipt to see whether the total is right.",
        },
        hu: {
            t: "Ellenőrzőösszeg (checksum)",
            short: "Az adatból kiszámolt kis szám, amivel ellenőrizhető, hogy semmi sem változott útközben.",
            body: ["Az IP, ICMP és UDP fejlécében 16 bites ellenőrzőösszeg van: összeadjuk a számokat, megtartjuk az utolsó 16 bitet, és megfordítjuk. Az Ethernet az erősebb CRC-32-t (az FCS-t) használja.",
                "A routerek megváltoztatják a TTL-t, ezért minden alkalommal újra kell számolniuk az IP-fejléc ellenőrzőösszegét."],
            like: "összeadni a blokk tételeit, hogy stimmel-e a végösszeg.",
        },
        fig: () => Fig.svg(Fig.t(240, 60, "4500 + 0054 + 1c46 + 4000 + … ", { s: 16, mono: true }) + Fig.arrow(240, 80, 240, 120, Fig.c.dim) +
            Fig.t(240, 150, "checksum = b1e6", { s: 20, mono: true, c: Fig.c.icmp })),
        see: ["fcs", "ipv4", "udp"],
    },
    {
        id: "tlv", cat: "packets", abbr: "TLV = Type, Length, Value", keys: ["TLV", "TLVs"],
        en: {
            t: "TLV (type–length–value)",
            short: "A simple way to pack information: first what it is, then how long, then the value.",
            body: ["LLDP frames are made of TLVs: type 1 = chassis ID, 2 = port ID, 3 = time to live, 5 = system name… A program that doesn't know a type can just skip it, because it knows the length.",
                "DHCP options work the same way (option 53 = message type, option 3 = router…)."],
            like: "labelled boxes in a removal van: “books · 3 kg · (the books)”.",
        },
        hu: {
            t: "TLV (típus–hossz–érték)",
            short: "Egyszerű csomagolási mód: előbb hogy mi ez, aztán milyen hosszú, aztán az érték.",
            body: ["Az LLDP-keretek TLV-kből állnak: 1-es típus = eszközazonosító, 2 = port, 3 = élettartam, 5 = rendszernév… Ha egy program nem ismer egy típust, egyszerűen átugorja, hiszen tudja a hosszát.",
                "A DHCP-opciók is így működnek (53-as opció = üzenettípus, 3-as = router…)."],
            like: "felcímkézett dobozok a költöztetőautóban: „könyvek · 3 kg · (a könyvek)”.",
        },
        fig: () => Fig.svg(Fig.fields(30, 80, [["T 5", 50, Fig.c.lldp, "type"], ["L 5", 50, Fig.c.lldp, "length"], ["host1", 100, Fig.c.lldp, "value"], ["T 2", 50, Fig.c.eth, "type"], ["L 5", 50, Fig.c.eth, "length"], ["NIC1", 120, Fig.c.eth, "value"]], 44) +
            Fig.t(130, 160, "system name", { s: 11, c: Fig.c.lldp }) + Fig.t(340, 160, "port ID", { s: 11, c: Fig.c.eth })),
        see: ["lldp", "dhcp"],
    },
    {
        id: "hex", cat: "packets", keys: ["hex dump", "hexadecimal"],
        en: {
            t: "Bits, bytes and hex",
            short: "Computers count with bits (0 or 1); 8 bits make a byte, usually written as two hex digits like 0x45.",
            body: ["Hexadecimal uses 16 digits: 0–9 and a–f. One hex digit is exactly 4 bits, so a byte is always two digits: 00 … ff (0 … 255).",
                "“Bytes on the wire” in a frame window shows every byte in hex. Point at a byte to see which field it belongs to."],
            like: "a secret alphabet where every letter stands for exactly 4 bits.",
        },
        hu: {
            t: "Bit, bájt és hexa",
            short: "A gépek bitekkel számolnak (0 vagy 1); 8 bit egy bájt, amit általában két hexa számjeggyel írunk, például 0x45.",
            body: ["A hexadecimális (16-os) számrendszer 16 számjegyet használ: 0–9 és a–f. Egy hexa jegy pontosan 4 bit, így egy bájt mindig két jegy: 00 … ff (0 … 255).",
                "A keret-ablak „Bytes on the wire” része minden bájtot hexában mutat. Mutass rá egy bájtra, és látod, melyik mezőhöz tartozik."],
            like: "egy titkos ábécé, ahol minden betű pontosan 4 bitet jelent.",
        },
        fig: () => Fig.svg(Fig.t(240, 70, "0x45", { s: 34, mono: true, c: Fig.c.ip }) +
            Fig.t(170, 140, "0100", { s: 26, mono: true, c: Fig.c.arp }) + Fig.t(310, 140, "0101", { s: 26, mono: true, c: Fig.c.icmp }) +
            Fig.t(170, 175, "4", { s: 18, mono: true, c: Fig.c.arp }) + Fig.t(310, 175, "5", { s: 18, mono: true, c: Fig.c.icmp }) + Fig.t(240, 205, "= 69 in decimal", { s: 11, c: Fig.c.dim })),
        see: ["frame", "mac", "ip"],
    },

    // ---------------------------------------------------------------- ideas
    {
        id: "layers", cat: "ideas", abbr: "OSI = Open Systems Interconnection (the layer model)", keys: ["Layer 1", "Layer 2", "Layer 3", "Layer 4", "OSI"],
        en: {
            t: "Network layers (OSI model)",
            short: "Networking is split into layers: each one does one job and uses the layer below it.",
            body: ["<b>Layer 1</b> (physical): cables, signals, hubs. <b>Layer 2</b> (data link): Ethernet frames, MAC addresses, switches. <b>Layer 3</b> (network): IP packets, routers. <b>Layer 4</b> (transport): UDP/TCP and ports. On top: the applications (DNS, DHCP, web…).",
                "Thanks to the layers, a switch doesn't need to understand IP, and a web browser doesn't need to know about cables."],
            like: "a layer cake, or a company where everybody has their own job.",
        },
        hu: {
            t: "Hálózati rétegek (OSI-modell)",
            short: "A hálózatot rétegekre bontjuk: mindegyik egy feladatot végez, és az alatta lévőt használja.",
            body: ["<b>1. réteg</b> (fizikai): kábelek, jelek, hubok. <b>2. réteg</b> (adatkapcsolati): Ethernet-keretek, MAC-címek, switchek. <b>3. réteg</b> (hálózati): IP-csomagok, routerek. <b>4. réteg</b> (szállítási): UDP/TCP és portok. Felül: az alkalmazások (DNS, DHCP, web…).",
                "A rétegeknek köszönhetően a switchnek nem kell értenie az IP-hez, a böngészőnek pedig nem kell tudnia a kábelekről."],
            like: "egy emeletes torta, vagy egy cég, ahol mindenkinek megvan a saját dolga.",
        },
        fig: () => Fig.svg([["Applications: DNS, DHCP", Fig.c.dns], ["4  Transport: UDP, ports", Fig.c.udp], ["3  Network: IP, routers", Fig.c.ip], ["2  Data link: Ethernet, MAC, switches", Fig.c.eth], ["1  Physical: cables, hubs", Fig.c.fcs]].map(([t, c], i) =>
            `<rect x="80" y="${12 + i * 40}" width="320" height="34" rx="5" fill="${c}" fill-opacity=".18" stroke="${c}"/>` + Fig.t(240, 34 + i * 40, t, { s: 12, c, w: 700 })).join("")),
        see: ["encapsulation", "hub", "switch", "router"],
    },
    {
        id: "mac-table", cat: "ideas", keys: ["MAC table", "bridge fdb", "MAC-tábla"],
        en: {
            t: "MAC table",
            short: "The switch's notebook: which MAC address is behind which port.",
            body: ["The switch fills it by itself: for every frame it writes down the source MAC and the port it came in on. Entries are forgotten after 300 seconds without traffic (aging).",
                "With VLANs the table also remembers the VLAN number. Open a switch in the lab and watch the table grow."],
            like: "a seating chart that the teacher fills in as the children answer.",
        },
        hu: {
            t: "MAC-tábla",
            short: "A switch jegyzetfüzete: melyik MAC-cím melyik port mögött van.",
            body: ["A switch maga tölti ki: minden keretnél felírja a forrás MAC-címet és a portot, ahol bejött. Ha 300 másodpercig nincs forgalom, a bejegyzés elfelejtődik (öregedés).",
                "VLAN-ok esetén a tábla a VLAN számát is megjegyzi. Nyiss meg egy switchet a laborban, és figyeld, ahogy nő a tábla."],
            like: "egy ülésrend, amit a tanár akkor tölt ki, amikor a gyerekek felelnek.",
        },
        fig: () => Fig.svg(`<rect x="80" y="30" width="320" height="150" rx="8" fill="#0b1118" stroke="#5aa7e0"/>` + Fig.t(240, 54, "MAC address          port   age", { s: 12, mono: true, c: "#5aa7e0" }) +
            [["02:00:00:00:00:01", 1, "4s"], ["02:00:00:00:00:03", 3, "2s"], ["02:00:00:00:00:05", 4, "1s"]].map(([m, p, a], i) => Fig.t(240, 86 + i * 28, `${m}     ${p}     ${a}`, { s: 12, mono: true })).join("")),
        try: [["switch", "ssh host1 ping -c 2 192.168.1.3"]], see: ["switch", "flooding", "mac"],
    },
    {
        id: "arp-cache", cat: "ideas", keys: ["ARP cache", "neighbour table", "ARP-gyorsítótár"],
        en: {
            t: "ARP cache",
            short: "A computer's list of known neighbours: IP address → MAC address.",
            body: ["After an ARP answer the pair is stored here, so the next packets can leave at once. Fresh entries are REACHABLE, older ones become STALE.",
                "Show it with <code>ip neigh</code> (modern) or <code>arp -a</code> (old style)."],
            like: "the contacts list in your phone.",
        },
        hu: {
            t: "ARP-gyorsítótár",
            short: "A gép ismert szomszédainak listája: IP-cím → MAC-cím.",
            body: ["Egy ARP-válasz után a pár ide kerül, így a következő csomagok azonnal indulhatnak. A friss bejegyzés REACHABLE, a régebbi STALE lesz.",
                "Nézd meg: <code>ip neigh</code> (modern) vagy <code>arp -a</code> (régi stílus)."],
            like: "a névjegyzék a telefonodban.",
        },
        fig: () => Fig.svg(`<rect x="50" y="50" width="380" height="110" rx="8" fill="#0b1016" stroke="#1c2735"/>` +
            Fig.t(70, 85, "$ ip neigh", { s: 13, mono: true, a: "start", c: Fig.c.ok }) +
            Fig.t(70, 115, "192.168.1.2 dev NIC1 lladdr 02:00:00:00:00:02", { s: 12, mono: true, a: "start", c: "#c9f7d6" }) +
            Fig.t(70, 135, "REACHABLE", { s: 12, mono: true, a: "start", c: Fig.c.ok })),
        try: [["p2p", "ssh host1 ip neigh"]], see: ["arp", "mac", "ip"],
    },
    {
        id: "routing-table", cat: "ideas", keys: ["routing table", "longest prefix match", "útvonaltábla"],
        en: {
            t: "Routing table",
            short: "The list a computer or router uses to decide where each packet should go.",
            body: ["Each line says: for this network, send the packet out of this card (and maybe to this next router). The most specific matching line wins (<b>longest prefix match</b>), and the <b>default route</b> catches everything else.",
                "Show it with <code>ip route</code>. Routers need a route to every network they must reach."],
            like: "the signposts at a crossroads.",
        },
        hu: {
            t: "Útvonaltábla (routing tábla)",
            short: "A lista, ami alapján egy gép vagy router eldönti, merre menjen egy csomag.",
            body: ["Minden sor azt mondja: ehhez a hálózathoz ezen a kártyán küldd ki (és talán ennek a következő routernek). A legpontosabban illeszkedő sor nyer (<b>leghosszabb előtag</b>), minden mást az <b>alapértelmezett útvonal</b> visz.",
                "Nézd meg: <code>ip route</code>. A routereknek minden elérendő hálózathoz kell útvonal."],
            like: "a útjelző táblák egy kereszteződésben.",
        },
        fig: () => Fig.svg(`<rect x="30" y="40" width="420" height="120" rx="8" fill="#0b1016" stroke="#1c2735"/>` +
            Fig.t(45, 70, "$ ip route", { s: 12, mono: true, a: "start", c: Fig.c.ok }) +
            Fig.t(45, 98, "192.168.1.0/24 dev NIC5      → LAN A", { s: 11.5, mono: true, a: "start", c: "#c9f7d6" }) +
            Fig.t(45, 120, "192.168.2.0/24 via 10.0.0.2 → next router", { s: 11.5, mono: true, a: "start", c: "#c9f7d6" }) +
            Fig.t(45, 142, "default via 10.0.0.2         → everything else", { s: 11.5, mono: true, a: "start", c: "#c9f7d6" })),
        try: [["two-routers", "ssh router1 ip route"]], see: ["router", "gateway", "subnet"],
    },
    {
        id: "flooding", cat: "ideas", keys: ["flood", "floods", "flooding", "flooded", "elárasztás"],
        en: {
            t: "Flooding",
            short: "When a switch doesn't know where to send a frame, it sends it out of all other ports.",
            body: ["Switches flood broadcasts, and frames whose destination MAC is not in the MAC table yet (unknown unicast). Once the answer comes back, the switch has learned the address and stops flooding.",
                "A hub floods everything, always — it never learns."],
            like: "when you don't know who ordered the pizza, you ask everybody in the house.",
        },
        hu: {
            t: "Elárasztás (flooding)",
            short: "Ha a switch nem tudja, hová küldje a keretet, kiküldi az összes többi portján.",
            body: ["A switch elárasztja a broadcastokat, és azokat a kereteket, amelyek cél MAC-címe még nincs a MAC-táblában (ismeretlen unicast). Amint visszajön a válasz, a switch megtanulja a címet, és abbahagyja az elárasztást.",
                "A hub mindig mindent eláraszt — sosem tanul."],
            like: "ha nem tudod, ki rendelte a pizzát, mindenkit megkérdezel a házban.",
        },
        fig: () => Fig.svg(Fig.sw(160, 40, "SWITCH") + [70, 190, 310, 430].map((x, i) => Fig.pc(x, 130, "PC" + (i + 1))).join("") +
            Fig.arrow(70, 126, 196, 76, Fig.c.arp) + [190, 310, 430].map(x => Fig.arrow(240, 76, x, 126, Fig.c.arp, "", true)).join("") + Fig.bubble(360, 22, "where is …:09? no idea!", Fig.c.arp, 170)),
        see: ["switch", "mac-table", "broadcast", "hub"],
    },
    {
        id: "collision-domain", cat: "ideas", keys: ["collision domain", "collision", "ütközési tartomány"],
        en: {
            t: "Collision domain",
            short: "The part of a network where two senders at the same time would scramble each other's signals.",
            body: ["All computers on a hub share one collision domain: only one can send at a time. Every switch port is a separate collision domain, and with full-duplex cables collisions can't happen at all."],
            like: "people talking in one room: if two speak at once, nobody understands either.",
        },
        hu: {
            t: "Ütközési tartomány",
            short: "A hálózatnak az a része, ahol két egyszerre adó gép összezavarná egymás jeleit.",
            body: ["A hubon lévő gépek mind egy ütközési tartományban vannak: egyszerre csak egy adhat. Minden switchport külön ütközési tartomány, a full duplex kábeleken pedig ütközés egyáltalán nem fordulhat elő."],
            like: "emberek egy szobában: ha ketten egyszerre beszélnek, egyiket sem érteni.",
        },
        fig: () => Fig.svg(Fig.zone(10, 20, 220, 180, "hub: 1 collision domain", Fig.c.arp) + Fig.hub(30, 40, "HUB", 3) + [50, 120, 190].map(x => Fig.pc(x, 110)).join("") +
            Fig.zone(250, 20, 220, 180, "switch: one per port", Fig.c.eth) + Fig.sw(270, 40, "SW", 3) + [290, 360, 430].map(x => Fig.zone(x - 34, 100, 68, 60, "", Fig.c.eth) + Fig.pc(x, 110)).join("")),
        see: ["hub", "switch", "full-duplex", "broadcast-domain"],
    },
    {
        id: "broadcast-domain", cat: "ideas", keys: ["broadcast domain", "szórási tartomány"],
        en: {
            t: "Broadcast domain",
            short: "The area a broadcast reaches: every device behind the same switches, up to the routers.",
            body: ["Switches pass broadcasts on, routers stop them. A VLAN makes a separate broadcast domain inside one switch.",
                "Big broadcast domains are noisy (every ARP reaches everybody), so networks are cut into smaller ones with routers or VLANs."],
            like: "everybody who hears the bell in one school building.",
        },
        hu: {
            t: "Szórási tartomány",
            short: "A terület, ameddig egy broadcast eljut: minden eszköz ugyanazok mögött a switchek mögött, egészen a routerekig.",
            body: ["A switchek továbbadják a broadcastot, a routerek megállítják. Egy VLAN egy switchen belül külön szórási tartományt csinál.",
                "A nagy szórási tartomány zajos (minden ARP mindenkihez eljut), ezért a hálózatokat routerekkel vagy VLAN-okkal kisebbekre vágják."],
            like: "mindenki, aki hallja a csengőt egy iskolaépületben.",
        },
        fig: () => Fig.svg(Fig.zone(10, 20, 200, 180, "broadcast domain A", Fig.c.eth) + Fig.zone(270, 20, 200, 180, "broadcast domain B", Fig.c.icmp) +
            Fig.sw(30, 40, "SW", 3) + Fig.sw(290, 40, "SW", 3) + [50, 120].map(x => Fig.pc(x, 110)).join("") + [330, 400].map(x => Fig.pc(x, 110)).join("") +
            Fig.router(240, 130, "router") + Fig.no(240, 110)),
        see: ["broadcast", "vlan", "router"],
    },
    {
        id: "full-duplex", cat: "ideas", keys: ["full duplex", "half duplex"],
        en: {
            t: "Full duplex",
            short: "Both ends of a cable can send at the same time.",
            body: ["Modern Ethernet cables have separate wire pairs for each direction. In the lab you can see two frames pass each other on the same cable.",
                "Half duplex (like a walkie-talkie, or a hub) means only one side can talk at a time."],
            like: "a phone call, compared with a walkie-talkie.",
        },
        hu: {
            t: "Full duplex (kétirányú egyidejű)",
            short: "A kábel két vége egyszerre is küldhet.",
            body: ["A modern Ethernet-kábelekben a két irányhoz külön érpárak vannak. A laborban látod, ahogy két keret elhalad egymás mellett ugyanazon a kábelen.",
                "A half duplex (mint egy adóvevő, vagy egy hub) azt jelenti, hogy egyszerre csak az egyik fél beszélhet."],
            like: "egy telefonhívás az adóvevőhöz képest.",
        },
        fig: () => Fig.svg(Fig.pc(60, 70) + Fig.pc(420, 70) + Fig.line(88, 102, 392, 102) + Fig.env(190, 102, Fig.c.icmp, "→") + Fig.env(300, 102, Fig.c.arp, "←") +
            Fig.t(240, 170, "both directions at the same time", { s: 12, c: Fig.c.dim })),
        see: ["cable", "collision-domain"],
    },
    {
        id: "lease", cat: "ideas", keys: ["lease", "leases"],
        en: {
            t: "Lease (DHCP)",
            short: "The time for which a DHCP server lends an IP address.",
            body: ["The server writes down which address it gave to which MAC address, and for how long. The client must renew it in time, otherwise the address goes back to the pool for others.",
                "See them on the server: <code>cat /var/lib/dhcpd/dhcpd.leases</code>."],
            like: "borrowing a library book for three weeks.",
        },
        hu: {
            t: "Bérlet (DHCP lease)",
            short: "Az idő, amennyire a DHCP-szerver kölcsönad egy IP-címet.",
            body: ["A szerver feljegyzi, melyik címet melyik MAC-címnek adta, és meddig. A kliensnek időben meg kell hosszabbítania, különben a cím visszakerül a közösbe másoknak.",
                "Nézd meg a szerveren: <code>cat /var/lib/dhcpd/dhcpd.leases</code>."],
            like: "kölcsönözni egy könyvet a könyvtárból három hétre.",
        },
        fig: () => Fig.svg(`<rect x="60" y="40" width="360" height="130" rx="8" fill="#0b1016" stroke="#1c2735"/>` +
            Fig.t(80, 70, "lease 192.168.1.100 {", { s: 12, mono: true, a: "start", c: "#c9f7d6" }) +
            Fig.t(100, 94, "hardware ethernet 02:00:00:00:00:02;", { s: 12, mono: true, a: "start", c: "#c9f7d6" }) +
            Fig.t(100, 118, "binding state active;", { s: 12, mono: true, a: "start", c: "#c9f7d6" }) + Fig.t(80, 142, "}", { s: 12, mono: true, a: "start", c: "#c9f7d6" })),
        try: [["dhcp", "ssh server1 cat /var/lib/dhcpd/dhcpd.leases"]], see: ["dhcp", "server"],
    },
    {
        id: "routing-loop", cat: "ideas", keys: ["routing loop", "útválasztási hurok"],
        en: {
            t: "Routing loop",
            short: "A mistake where routers keep sending a packet round and round in a circle.",
            body: ["If router A thinks the way is through B, and B thinks it is through A, a packet bounces between them. Only the TTL stops it: after 64 hops it is dropped and an ICMP “time exceeded” is sent back.",
                "Lesson 10 builds such a loop on purpose, so you can watch it."],
            like: "two people pointing at each other: “ask him!” — “no, ask him!”",
        },
        hu: {
            t: "Útválasztási hurok",
            short: "Hiba, amikor a routerek körbe-körbe küldözgetnek egy csomagot.",
            body: ["Ha az A router azt hiszi, hogy az út B-n át vezet, B pedig azt, hogy A-n át, a csomag pattog közöttük. Csak a TTL állítja meg: 64 ugrás után eldobják, és ICMP „time exceeded” megy vissza.",
                "A 10. lecke szándékosan épít ilyen hurkot, hogy megnézhesd."],
            like: "két ember egymásra mutogat: „kérdezd őt!” — „nem, kérdezd őt!”",
        },
        fig: () => Fig.svg(Fig.router(140, 80, "router1") + Fig.router(340, 80, "router2") +
            `<path d="M180 85 C 240 40, 260 40, 300 85" fill="none" stroke="${Fig.c.bad}" stroke-width="2" marker-end="url(#ah)"/>` +
            `<path d="M300 110 C 260 150, 220 150, 180 110" fill="none" stroke="${Fig.c.bad}" stroke-width="2" marker-end="url(#ah)"/>` +
            Fig.tag(240, 30, "TTL 6 → 5 → 4 …", Fig.c.ip) + Fig.t(240, 195, "default route → the other router", { s: 11, c: Fig.c.dim })),
        try: [["routing-loop", "ssh host1 ping -c 1 -t 6 172.16.0.1"]], see: ["ttl", "routing-table", "icmp"],
    },
    {
        id: "trunk-access", cat: "ideas", keys: ["trunk", "access port", "tagged"],
        en: {
            t: "Access port and trunk",
            short: "An access port belongs to one VLAN; a trunk carries all VLANs between switches, with tags.",
            body: ["Computers plug into access ports and never see VLAN tags. On a trunk every frame carries an 802.1Q tag with its VLAN number, so the next switch keeps it in the right VLAN.",
                "In the lab the colour above a switch port shows its VLAN; a striped “T” marks a trunk. Open a switch to change them."],
            like: "one bridge shared by all bus lines — but every bus shows its line number.",
        },
        hu: {
            t: "Access port és trunk",
            short: "Az access port egy VLAN-hoz tartozik; a trunk az összes VLAN-t viszi a switchek között, címkékkel.",
            body: ["A gépek access portokra csatlakoznak, és sosem látnak VLAN-címkét. A trunkon minden keret 802.1Q címkét visel a VLAN számával, így a következő switch a jó VLAN-ban tartja.",
                "A laborban a switchport feletti szín mutatja a VLAN-t, a csíkos „T” jelöli a trunkot. Nyiss meg egy switchet, ha át szeretnéd állítani."],
            like: "egyetlen híd, amin minden buszjárat átmegy — de mindegyik busz kiírja a számát.",
        },
        fig: () => Fig.svg(Fig.sw(20, 40, "SW1", 3, [Fig.c.vlan, Fig.c.eth, "#ddd"]) + Fig.sw(340, 40, "SW2", 3, ["#ddd", Fig.c.vlan, Fig.c.eth]) +
            Fig.line(120, 75, 360, 75, "#e4b43c", 4) + Fig.env(200, 75, Fig.c.vlan, "V10", 40) + Fig.env(285, 75, Fig.c.eth, "V20", 40) +
            Fig.t(240, 140, "trunk: one cable, every VLAN, tagged frames", { s: 11.5, c: "#e4b43c" })),
        try: [["vlan-trunk", "ssh host2 ping -c 2 192.168.20.22"]], see: ["vlan", "switch"],
    },

    // ---------------------------------------------------------------- commands
    {
        id: "linux-terminal", cat: "commands", keys: ["Linux terminal", "bash", "shell", "command line", "terminál", "parancssor"],
        en: {
            t: "The Linux terminal — every command of the lab",
            short: "The terminal on the right is a bash shell: you type a command, Enter runs it, the answer appears below. From the admin console you log in to the machines with ssh and look at — or change — their network settings.",
            body: [
                "<b>Where am I?</b> The prompt tells you. <code>[admin@console ~]$</code> is your own admin laptop, connected to the lab. <code>ssh host1</code> logs you in to host1: the prompt becomes <code>[root@host1 ~]#</code> (# = you are root, you may change everything). <code>exit</code> or Ctrl-D brings you back. <code>ssh host1 ip route</code> runs a single command over there and comes straight back. <code>for i in {1..4}; do ssh host$i hostname; done</code> asks four machines one after the other.",
                "<b>Looking at the network</b><br><code>ip addr</code> — every network card (NIC) with its MAC address, its IP address/prefix and whether a cable is in (UP / NO-CARRIER).<br><code>ip route</code> — the routing table: <i>proto kernel</i> lines are the networks the machine is plugged into, <i>default via</i> is the gateway, <i>via</i> lines are routes typed in by hand.<br><code>ip neigh</code> (or the old <code>arp -a</code>) — the ARP cache: which IP has which MAC, REACHABLE = just checked, STALE = old, will be checked again.<br><code>ip link</code> — only the cards and their state. <code>ifconfig</code> — the same in the old style.",
                "<b>Testing</b><br><code>ping -c 3 192.168.1.2</code> — is it alive? Three echo requests, the answers with their round-trip time, then a summary. <code>-t 2</code> sets the TTL, <code>-i 0.5</code> the interval. Without <code>-c</code> it runs until Ctrl-C.<br><code>arping 192.168.1.2</code> — only the ARP question: who has this IP? Works only inside the own network.<br><code>traceroute 192.168.2.10</code> — every router on the way, one line per hop.<br><code>host host1.lab</code>, <code>nslookup host1.lab</code> — ask the DNS server for a name; <code>cat /etc/resolv.conf</code> shows which server is asked.<br><code>dhclient</code> — get an address from a DHCP server (Discover, Offer, Request, Ack).<br><code>systemctl start lldpd</code>, <code>lldpcli update</code>, <code>lldpcli show neighbors</code> — who is at the other end of my cable?<br><code>wireshark</code> (or the 🦈 button) — watch the frames themselves, field by field.",
                "<b>Changing the settings</b><br><code>ip addr add 192.168.1.5/24 dev NIC1</code> — give a card an address (<code>replace</code> changes it, <code>del</code> takes it away, <code>flush dev NIC1</code> empties the card).<br><code>ip route add default via 192.168.1.1</code> — the gateway. <code>ip route add 192.168.3.0/24 via 10.0.0.2</code> — a route to one network. <code>ip route del 192.168.3.0/24</code> — away with it.<br><code>sysctl -w net.ipv4.ip_forward=1</code> — the machine passes on packets for others: it becomes a router (<code>=0</code>: it stops).<br><code>hostnamectl set-hostname web1</code> — a new name. <code>reboot</code> — restart: everything you changed is forgotten, the start settings come back (and the ssh session ends).",
                "<b>Switches</b><br><code>ssh switch1</code> on a <b>Linux switch</b>: <code>bridge fdb show</code> (MAC table), <code>bridge vlan show</code>, <code>bridge vlan add dev swp3 vid 20 pvid untagged</code>, <code>ip link set swp2 down</code>.<br>On an <b>IOS-style switch</b> another command line answers: <code>enable</code>, <code>show vlan brief</code>, <code>show mac address-table</code>, <code>configure terminal</code>, <code>interface gi0/3</code>, <code>switchport access vlan 20</code>, <code>end</code>, <code>write memory</code>; <code>?</code> lists what can come next.",
                "<b>Files and the system</b><br><code>ls -la</code>, <code>cd /etc</code>, <code>pwd</code>, <code>cat /etc/hosts</code>, <code>tree -L 2</code>, <code>head</code>, <code>tail</code> — look around. <code>touch</code>, <code>mkdir</code>, <code>rm</code>, <code>echo hello &gt; /tmp/a.txt</code> — write (in the home folder and /tmp).<br><code>whoami</code>, <code>id</code>, <code>hostname -I</code>, <code>uname -a</code>, <code>date</code>, <code>uptime</code>, <code>ps aux</code>, <code>ss -tulpn</code>, <code>free -h</code>, <code>df -h</code> — who, where, what runs, which ports are open.",
                "<b>Joining commands</b><br><code>|</code> (pipe) hands the output to the next command: <code>ip route | grep default</code>, <code>ip neigh | wc -l</code>, <code>… | sort | uniq</code>.<br><code>&gt;</code> writes the output into a file, <code>&gt;&gt;</code> appends to it.<br><code>;</code> one after the other, <code>&amp;&amp;</code> only if the first one succeeded, <code>||</code> only if it failed: <code>ping -c 1 192.168.1.2 &amp;&amp; echo up || echo down</code>.<br><code>$HOSTNAME</code>, <code>$USER</code>, <code>$?</code> are variables; <code>*</code> matches file names; '…' and \"…\" keep spaces together.",
                "<b>Keys</b><br>Tab completes a command, a machine name or a file; Tab Tab lists the choices. ↑ ↓ walk the history, PgUp / PgDn only through the commands that start like the typed text. Ctrl-R searches the history as you type (again: further back, Enter: run, Esc: edit).<br>Ctrl-A / Ctrl-E: start / end of the line, Alt-B / Alt-F: a word back / forward. Ctrl-U / Ctrl-K: cut to the start / end, Alt-Backspace, Alt-D: cut a word; Ctrl-Y: paste it back; Ctrl-_: undo. Alt-. : the last word of the previous command. Ctrl-T: swap two letters. Ctrl-L: clear the screen. Ctrl-C: stop. Ctrl-D: log out. On a phone the key bar under the terminal has these keys.",
                "<b>History</b><br><code>history</code> lists the earlier commands with numbers. <code>!!</code> is the last command, <code>!$</code> its last word, <code>!*</code> all its words, <code>!12</code> command number 12, <code>!-2</code> the one before the last, <code>!ssh</code> the newest that starts with ssh. <code>^host1^host2</code> repeats the last command with host1 changed to host2. Bash first shows the command it made, then runs it.",
                "<b>Jobs, watch, aliases</b><br><code>ping 192.168.1.2 &amp;</code> runs in the background, you can type on. Ctrl-Z stops the running command; <code>jobs</code> lists them, <code>fg</code> brings one back to the front, <code>bg</code> lets it go on behind, <code>kill %1</code> ends it.<br><code>watch -n 1 ip neigh</code> runs the command every second and shows the newest output — watch the ARP cache change while you ping. Ctrl-C ends it.<br><code>alias p='ping -c 1'</code> — a short name; <code>alias</code> lists them, <code>unalias p</code> removes it. <code>ll</code> and <code>la</code> are there already.",
                "<b>Help</b><br><code>help</code> — the short list. <code>man ping</code> — the manual page of a command (<code>man bash</code>: keys and history, <code>man router</code>: the router steps, <code>man -k address</code>: search). <code>lab</code> — the example networks, <code>lab 18</code> loads one. <code>test</code>, <code>autotest</code> — the simulator checks itself.",
            ],
            like: "a telephone line to every machine: you call one (ssh), give it orders in its own language, and it reads you the answer.",
        },
        hu: {
            t: "A Linux terminál — a labor összes parancsa",
            short: "A jobb oldali terminál egy bash shell: beírsz egy parancsot, az Enter lefuttatja, alatta megjelenik a válasz. Az admin konzolról ssh-val lépsz be a gépekre, és megnézed — vagy átállítod — a hálózati beállításaikat.",
            body: [
                "<b>Hol vagyok?</b> A prompt megmondja. A <code>[admin@console ~]$</code> a saját admin laptopod, ami a laborra van kötve. Az <code>ssh host1</code> belép a host1-re: a prompt <code>[root@host1 ~]#</code> lesz (# = root vagy, mindent átállíthatsz). Az <code>exit</code> vagy a Ctrl-D visszahoz. Az <code>ssh host1 ip route</code> csak egy parancsot futtat ott, és rögtön visszajön. A <code>for i in {1..4}; do ssh host$i hostname; done</code> négy gépet kérdez meg egymás után.",
                "<b>A hálózat megnézése</b><br><code>ip addr</code> — minden hálózati kártya (NIC) a MAC-címével, az IP-címével/prefixével, és hogy van-e benne kábel (UP / NO-CARRIER).<br><code>ip route</code> — az útvonaltábla: a <i>proto kernel</i> sorok azok a hálózatok, amelyekbe a gép be van dugva, a <i>default via</i> az átjáró, a <i>via</i> sorok kézzel beírt útvonalak.<br><code>ip neigh</code> (vagy a régi <code>arp -a</code>) — az ARP-gyorsítótár: melyik IP-hez melyik MAC tartozik; REACHABLE = épp ellenőrizve, STALE = régi, újra ellenőrzi majd.<br><code>ip link</code> — csak a kártyák és az állapotuk. <code>ifconfig</code> — ugyanez régi stílusban.",
                "<b>Kipróbálás</b><br><code>ping -c 3 192.168.1.2</code> — él-e? Három echo kérés, a válaszok az oda-vissza idővel, aztán összesítés. A <code>-t 2</code> a TTL-t állítja, a <code>-i 0.5</code> a szünetet. <code>-c</code> nélkül Ctrl-C-ig fut.<br><code>arping 192.168.1.2</code> — csak az ARP-kérdés: kié ez az IP? Csak a saját hálózaton belül működik.<br><code>traceroute 192.168.2.10</code> — minden router az úton, ugrásonként egy sor.<br><code>host host1.lab</code>, <code>nslookup host1.lab</code> — megkérdezi a DNS-szervertől a nevet; a <code>cat /etc/resolv.conf</code> megmutatja, melyik szervert kérdezi.<br><code>dhclient</code> — címet kér egy DHCP-szervertől (Discover, Offer, Request, Ack).<br><code>systemctl start lldpd</code>, <code>lldpcli update</code>, <code>lldpcli show neighbors</code> — ki van a kábelem másik végén?<br><code>wireshark</code> (vagy a 🦈 gomb) — magukat a kereteket nézheted meg, mezőről mezőre.",
                "<b>A beállítások megváltoztatása</b><br><code>ip addr add 192.168.1.5/24 dev NIC1</code> — címet ad egy kártyának (a <code>replace</code> lecseréli, a <code>del</code> elveszi, a <code>flush dev NIC1</code> kiüríti a kártyát).<br><code>ip route add default via 192.168.1.1</code> — az átjáró. <code>ip route add 192.168.3.0/24 via 10.0.0.2</code> — útvonal egy hálózathoz. <code>ip route del 192.168.3.0/24</code> — törli.<br><code>sysctl -w net.ipv4.ip_forward=1</code> — a gép továbbadja a másoknak szóló csomagokat: router lesz belőle (<code>=0</code>: abbahagyja).<br><code>hostnamectl set-hostname web1</code> — új név. <code>reboot</code> — újraindítás: minden változtatás elfelejtődik, visszajönnek a kezdő beállítások (és az ssh-kapcsolat megszakad).",
                "<b>Switchek</b><br><code>ssh switch1</code> egy <b>Linuxos switchen</b>: <code>bridge fdb show</code> (MAC-tábla), <code>bridge vlan show</code>, <code>bridge vlan add dev swp3 vid 20 pvid untagged</code>, <code>ip link set swp2 down</code>.<br>Egy <b>IOS-szerű switchen</b> másik parancssor válaszol: <code>enable</code>, <code>show vlan brief</code>, <code>show mac address-table</code>, <code>configure terminal</code>, <code>interface gi0/3</code>, <code>switchport access vlan 20</code>, <code>end</code>, <code>write memory</code>; a <code>?</code> kilistázza, mi jöhet még.",
                "<b>Fájlok és a rendszer</b><br><code>ls -la</code>, <code>cd /etc</code>, <code>pwd</code>, <code>cat /etc/hosts</code>, <code>tree -L 2</code>, <code>head</code>, <code>tail</code> — körülnézés. <code>touch</code>, <code>mkdir</code>, <code>rm</code>, <code>echo hello &gt; /tmp/a.txt</code> — írás (a saját könyvtárban és a /tmp-ben).<br><code>whoami</code>, <code>id</code>, <code>hostname -I</code>, <code>uname -a</code>, <code>date</code>, <code>uptime</code>, <code>ps aux</code>, <code>ss -tulpn</code>, <code>free -h</code>, <code>df -h</code> — ki, hol, mi fut, mely portok vannak nyitva.",
                "<b>Parancsok összekötése</b><br>A <code>|</code> (cső) a kimenetet a következő parancsnak adja: <code>ip route | grep default</code>, <code>ip neigh | wc -l</code>, <code>… | sort | uniq</code>.<br>A <code>&gt;</code> fájlba írja a kimenetet, a <code>&gt;&gt;</code> hozzáfűzi.<br><code>;</code> egymás után, <code>&amp;&amp;</code> csak ha az első sikerült, <code>||</code> csak ha nem: <code>ping -c 1 192.168.1.2 &amp;&amp; echo él || echo halott</code>.<br>A <code>$HOSTNAME</code>, <code>$USER</code>, <code>$?</code> változók; a <code>*</code> fájlnevekre illeszkedik; a '…' és a \"…\" egyben tartja a szóközös szöveget.",
                "<b>Billentyűk</b><br>A Tab kiegészíti a parancsot, a gépnevet vagy a fájlt; a Tab Tab kilistázza a lehetőségeket. A ↑ ↓ lépked az előzményekben, a PgUp / PgDn csak azokon, amelyek úgy kezdődnek, mint a begépelt szöveg. A Ctrl-R gépelés közben keres az előzményekben (újra: régebbi, Enter: futtatás, Esc: szerkesztés).<br>Ctrl-A / Ctrl-E: a sor eleje / vége, Alt-B / Alt-F: egy szóval vissza / előre. Ctrl-U / Ctrl-K: kivágás a sor elejéig / végéig, Alt-Backspace, Alt-D: egy szó kivágása; Ctrl-Y: visszailleszti; Ctrl-_: visszavonás. Alt-. : az előző parancs utolsó szava. Ctrl-T: két betű cseréje. Ctrl-L: képernyőtörlés. Ctrl-C: leállítás. Ctrl-D: kilépés. Telefonon a terminál alatti billentyűsorban vannak ezek.",
                "<b>Előzmények</b><br>A <code>history</code> számozva kilistázza a korábbi parancsokat. A <code>!!</code> az előző parancs, a <code>!$</code> az utolsó szava, a <code>!*</code> az összes szava, a <code>!12</code> a 12-es parancs, a <code>!-2</code> az utolsó előtti, a <code>!ssh</code> a legutóbbi, ami ssh-val kezdődik. A <code>^host1^host2</code> megismétli az előző parancsot, a host1-et host2-re cserélve. A bash először kiírja a parancsot, amit összerakott, aztán lefuttatja.",
                "<b>Jobok, watch, aliasok</b><br>A <code>ping 192.168.1.2 &amp;</code> a háttérben fut, tovább gépelhetsz. A Ctrl-Z megállítja a futó parancsot; a <code>jobs</code> kilistázza őket, az <code>fg</code> előre hozza, a <code>bg</code> hátul folytatja, a <code>kill %1</code> leállítja.<br>A <code>watch -n 1 ip neigh</code> másodpercenként lefuttatja a parancsot, és a legújabb kimenetet mutatja — nézd, ahogy változik az ARP-gyorsítótár, miközben pingelsz. A Ctrl-C leállítja.<br><code>alias p='ping -c 1'</code> — rövid név; az <code>alias</code> kilistázza, az <code>unalias p</code> törli. Az <code>ll</code> és az <code>la</code> már megvan.",
                "<b>Segítség</b><br><code>help</code> — a rövid lista. <code>man ping</code> — egy parancs kézikönyv-oldala (<code>man bash</code>: billentyűk és előzmények, <code>man router</code>: a router lépései, <code>man -k address</code>: keresés). <code>lab</code> — a példahálózatok, a <code>lab 18</code> betölt egyet. <code>test</code>, <code>autotest</code> — a szimulátor ellenőrzi magát.",
            ],
            like: "egy telefonvonal minden géphez: felhívod (ssh), a saját nyelvén adsz neki utasítást, és felolvassa a választ.",
        },
        fig: () => Fig.svg(`<rect x="20" y="14" width="440" height="196" rx="8" fill="#070b10" stroke="#2f3f54"/>` +
            `<rect x="20" y="14" width="440" height="22" rx="8" fill="#151e29"/><circle cx="36" cy="25" r="4" fill="#f87171"/><circle cx="50" cy="25" r="4" fill="#fbbf24"/><circle cx="64" cy="25" r="4" fill="#4ade80"/>` +
            [["[admin@console ~]$ ", "ssh router1", Fig.c.ok], ["[root@router1 ~]# ", "ip addr add 192.168.1.1/24 dev NIC5", Fig.c.ip],
                ["[root@router1 ~]# ", "sysctl -w net.ipv4.ip_forward=1", Fig.c.ip], ["", "net.ipv4.ip_forward = 1", Fig.c.dim],
                ["[root@router1 ~]# ", "ip route | grep default", Fig.c.ip], ["", "default via 10.0.0.2 dev NIC6", Fig.c.dim],
                ["[root@router1 ~]# ", "exit", Fig.c.ip], ["[admin@console ~]$ ", "ssh host1 traceroute 192.168.2.10", Fig.c.ok]]
                .map(([p, c, col], i) => Fig.t(32, 56 + i * 19, p, { s: 10.5, mono: true, a: "start", c: col, w: 500 }) + Fig.t(32 + p.length * 6.3, 56 + i * 19, c, { s: 10.5, mono: true, a: "start", c: Fig.c.text, w: 600 })).join("")),
        try: [["", "help"], ["", "man bash"], ["", "ssh host1 ip addr"], ["", "ssh host1 ip route | grep default"], ["", "history"]],
        see: ["router-setup", "ip-cmd", "ssh", "ping", "traceroute", "linux-switch", "ios-cli"],
    },
    {
        id: "ping", cat: "commands", keys: ["ping"],
        en: {
            t: "ping",
            short: "Checks whether another computer can be reached, and how long the answer takes.",
            body: ["<code>ping</code> sends ICMP echo requests, one per second. Each reply prints a line with the time (the animation is about 1000× slower, so the times are divided). <b>Ctrl-C</b> stops it and prints a summary.",
                "Useful options: <code>-c 3</code> = send 3 and stop, <code>-t 5</code> = start with TTL 5. You can also ping a name: <code>ping www</code>."],
            like: "shouting “Hello?” into a cave and waiting for the echo.",
        },
        hu: {
            t: "ping",
            short: "Megnézi, elérhető-e egy másik gép, és mennyi idő alatt jön válasz.",
            body: ["A <code>ping</code> másodpercenként küld egy ICMP echo kérést. Minden válasznál kiír egy sort az idővel (az animáció kb. 1000× lassabb, ezért az időket elosztjuk). A <b>Ctrl-C</b> leállítja, és összegzést ír.",
                "Hasznos kapcsolók: <code>-c 3</code> = 3 darab, aztán vége, <code>-t 5</code> = 5-ös TTL-lel indul. Névre is lehet pingelni: <code>ping www</code>."],
            like: "bekiáltani egy barlangba: „Halló?” — és várni a visszhangot.",
        },
        fig: () => Fig.svg(`<rect x="20" y="30" width="440" height="150" rx="8" fill="#0b1016" stroke="#1c2735"/>` +
            ["$ ping -c 2 192.168.1.2", "PING 192.168.1.2 (192.168.1.2) 56(84) bytes of data.", "64 bytes from 192.168.1.2: icmp_seq=1 ttl=64 time=2.61 ms", "64 bytes from 192.168.1.2: icmp_seq=2 ttl=64 time=2.58 ms", "2 packets transmitted, 2 received, 0% packet loss"]
                .map((l, i) => Fig.t(34, 56 + i * 26, l, { s: 11, mono: true, a: "start", c: i ? "#c9f7d6" : Fig.c.ok })).join("")),
        try: [["p2p", "ssh host1 ping -c 3 192.168.1.2"]], see: ["icmp", "ttl", "traceroute"],
    },
    {
        id: "traceroute", cat: "commands", keys: ["traceroute"],
        en: {
            t: "traceroute",
            short: "Lists the routers on the way to a destination, one per line.",
            body: ["It sends probes with TTL 1, 2, 3… The first router throws away the TTL-1 probe and answers “time exceeded” — so we learn its address. Then the second router, and so on, until the destination itself answers.",
                "A line with <b>*</b> means: no answer came in time."],
            like: "asking at every bus stop: “where are we now?”",
        },
        hu: {
            t: "traceroute",
            short: "Soronként kiírja a routereket a cél felé vezető úton.",
            body: ["1, 2, 3… TTL-lel küld próbacsomagokat. Az első router eldobja az 1-es TTL-űt, és „time exceeded”-et válaszol — így megtudjuk a címét. Aztán jön a második router, és így tovább, amíg maga a cél nem válaszol.",
                "A <b>*</b> sor azt jelenti: nem jött időben válasz."],
            like: "minden buszmegállóban megkérdezni: „most hol vagyunk?”",
        },
        fig: () => Fig.svg(`<rect x="20" y="40" width="440" height="130" rx="8" fill="#0b1016" stroke="#1c2735"/>` +
            ["$ traceroute 192.168.2.10", " 1  192.168.1.1 (192.168.1.1)  6.9 ms", " 2  10.0.0.2 (10.0.0.2)  7.4 ms", " 3  192.168.2.10 (192.168.2.10)  12.5 ms"]
                .map((l, i) => Fig.t(34, 68 + i * 28, l, { s: 12, mono: true, a: "start", c: i ? "#c9f7d6" : Fig.c.ok })).join("")),
        try: [["two-routers", "ssh host1 traceroute 192.168.2.10"]], see: ["ttl", "icmp", "router"],
    },
    {
        id: "arping", cat: "commands", keys: ["arping"],
        en: {
            t: "arping",
            short: "Sends an ARP request and shows who answers — like ping, but on Layer 2.",
            body: ["<code>arping 192.168.1.2</code> asks “who has 192.168.1.2?” and prints <code>Unicast reply from 192.168.1.2 [02:00:00:00:00:02]</code>. It only works inside the local network, because ARP never crosses a router."],
            like: "calling a classmate's name in the corridor.",
        },
        hu: {
            t: "arping",
            short: "ARP-kérést küld, és megmutatja, ki válaszol — mint a ping, csak a 2. rétegen.",
            body: ["Az <code>arping 192.168.1.2</code> megkérdezi: „kié a 192.168.1.2?”, és kiírja: <code>Unicast reply from 192.168.1.2 [02:00:00:00:00:02]</code>. Csak a helyi hálózaton belül működik, mert az ARP sosem megy át routeren."],
            like: "kiáltani egy osztálytárs nevét a folyosón.",
        },
        fig: () => Fig.svg(Fig.pc(110, 70, "host1") + Fig.pc(370, 70, "host2") + Fig.arrow(150, 90, 330, 90, Fig.c.arp, "who has .2?") + Fig.arrow(330, 125, 150, 125, Fig.c.icmp, "me! 02:…:02")),
        try: [["p2p", "ssh host1 arping 192.168.1.2"]], see: ["arp", "ping"],
    },
    {
        id: "ip-cmd", cat: "commands", keys: ["ip addr", "ip route", "ip neigh"],
        en: {
            t: "The ip command",
            short: "The Linux tool to show and change addresses, routes and neighbours.",
            body: ["<code>ip addr</code> — the cards and their addresses · <code>ip route</code> — the routing table · <code>ip neigh</code> — the ARP cache.",
                "Changing things: <code>ip addr replace 192.168.1.5/24 dev NIC1</code> sets an address, <code>ip route add default via 192.168.1.1</code> sets the gateway."],
            like: "the settings menu of the network, but in text.",
        },
        hu: {
            t: "Az ip parancs",
            short: "A Linux eszköze a címek, útvonalak és szomszédok megnézésére és átállítására.",
            body: ["<code>ip addr</code> — a kártyák és címeik · <code>ip route</code> — az útvonaltábla · <code>ip neigh</code> — az ARP-gyorsítótár.",
                "Változtatás: <code>ip addr replace 192.168.1.5/24 dev NIC1</code> beállít egy címet, az <code>ip route add default via 192.168.1.1</code> az átjárót."],
            like: "a hálózat beállítások menüje, csak szövegesen.",
        },
        fig: () => Fig.svg(`<rect x="20" y="30" width="440" height="160" rx="8" fill="#0b1016" stroke="#1c2735"/>` +
            ["$ ip addr", "2: NIC1: <BROADCAST,MULTICAST,UP,LOWER_UP>", "    link/ether 02:00:00:00:00:01", "    inet 192.168.1.1/24 brd 192.168.1.255", "$ ip route", "192.168.1.0/24 dev NIC1 proto kernel"]
                .map((l, i) => Fig.t(34, 54 + i * 24, l.replace(/</g, "&lt;").replace(/>/g, "&gt;"), { s: 11, mono: true, a: "start", c: l.startsWith("$") ? Fig.c.ok : "#c9f7d6" })).join("")),
        try: [["p2p", "ssh host1 ip addr"], ["router", "ssh router1 ip route"]], see: ["ip", "routing-table", "arp-cache"],
    },
    {
        id: "dhclient", cat: "commands", keys: ["dhclient"],
        en: {
            t: "dhclient",
            short: "Asks a DHCP server for an address (and gateway and DNS server).",
            body: ["It prints the four steps: DHCPDISCOVER, DHCPOFFER, DHCPREQUEST, DHCPACK, then “bound to …”. <code>dhclient -r</code> gives the address back."],
            like: "going to the hotel reception for a room key.",
        },
        hu: {
            t: "dhclient",
            short: "Címet kér egy DHCP-szervertől (meg átjárót és DNS-szervert).",
            body: ["Kiírja a négy lépést: DHCPDISCOVER, DHCPOFFER, DHCPREQUEST, DHCPACK, aztán „bound to …”. A <code>dhclient -r</code> visszaadja a címet."],
            like: "lemenni a szálloda recepciójára a szobakulcsért.",
        },
        fig: () => Fig.svg(`<rect x="20" y="40" width="440" height="140" rx="8" fill="#0b1016" stroke="#1c2735"/>` +
            ["$ dhclient", "DHCPDISCOVER on NIC2 to 255.255.255.255 port 67", "DHCPOFFER of 192.168.1.100 from 192.168.1.2", "DHCPREQUEST for 192.168.1.100 on NIC2", "DHCPACK of 192.168.1.100 from 192.168.1.2"]
                .map((l, i) => Fig.t(34, 64 + i * 26, l, { s: 11, mono: true, a: "start", c: i ? "#c9f7d6" : Fig.c.ok })).join("")),
        try: [["dhcp", "ssh host1 dhclient"]], see: ["dhcp", "lease"],
    },
    {
        id: "host-cmd", cat: "commands", keys: ["nslookup", "resolv.conf"],
        en: {
            t: "host and nslookup",
            short: "Ask the DNS server for the address of a name.",
            body: ["<code>host www</code> answers in one line: <code>www.lab has address 10.0.0.80</code>. <code>nslookup www</code> also shows which server answered. The server's address is in <code>/etc/resolv.conf</code>."],
            like: "looking up a name in the phone book.",
        },
        hu: {
            t: "host és nslookup",
            short: "Megkérdezik a DNS-szervertől egy név címét.",
            body: ["A <code>host www</code> egy sorban válaszol: <code>www.lab has address 10.0.0.80</code>. Az <code>nslookup www</code> azt is megmutatja, melyik szerver válaszolt. A szerver címe az <code>/etc/resolv.conf</code>-ban van."],
            like: "kikeresni egy nevet a telefonkönyvben.",
        },
        fig: () => Fig.svg(`<rect x="20" y="50" width="440" height="110" rx="8" fill="#0b1016" stroke="#1c2735"/>` +
            ["$ host host3", "host3.lab has address 192.168.1.13", "$ host nobody", "Host nobody.lab not found: 3(NXDOMAIN)"]
                .map((l, i) => Fig.t(34, 78 + i * 24, l, { s: 12, mono: true, a: "start", c: l.startsWith("$") ? Fig.c.ok : "#c9f7d6" })).join("")),
        try: [["dns", "ssh host1 host host3"], ["dns", "ssh host1 nslookup www.lab"]], see: ["dns", "domain-name"],
    },
    {
        id: "ssh", cat: "commands", keys: ["ssh"],
        en: {
            t: "ssh",
            short: "Log in to another computer and type commands there.",
            body: ["<code>ssh host1</code> opens a shell on host1 — its screen lights up green. <code>ssh host1 ip addr</code> runs just one command there. <code>exit</code> (or Ctrl-D) brings you back to the admin console."],
            like: "a remote control for another computer.",
        },
        hu: {
            t: "ssh",
            short: "Belépés egy másik gépre, hogy ott írjunk parancsokat.",
            body: ["Az <code>ssh host1</code> parancssort nyit a host1-en — a képernyője zölden világít. Az <code>ssh host1 ip addr</code> csak egy parancsot futtat ott. Az <code>exit</code> (vagy Ctrl-D) visszavisz az admin konzolra."],
            like: "egy távirányító egy másik számítógéphez.",
        },
        fig: () => Fig.svg(Fig.pc(120, 60, "console") + Fig.pc(360, 60, "host1", "", "#4ade80") + Fig.arrow(160, 80, 320, 80, Fig.c.ok, "ssh host1") +
            Fig.t(240, 170, "[root@host1 ~]#", { s: 16, mono: true, c: Fig.c.ok })),
        try: [["p2p", "ssh host1"]], see: ["host"],
    },
    {
        id: "lldpcli", cat: "commands", keys: ["lldpcli"],
        en: {
            t: "lldpcli",
            short: "Talks to the LLDP program: send an advertisement, show the neighbours.",
            body: ["First start the program: <code>systemctl start lldpd</code>. Then <code>lldpcli update</code> sends an LLDP frame now, <code>lldpcli show neighbors</code> lists who is at the other end of the cable, <code>lldpcli show chassis</code> shows what we tell about ourselves."],
            like: "your name badge, and the list of names you have collected.",
        },
        hu: {
            t: "lldpcli",
            short: "Az LLDP-programot kezeli: bemutatkozó üzenetet küld, kiírja a szomszédokat.",
            body: ["Előbb indítsd el a programot: <code>systemctl start lldpd</code>. Aztán az <code>lldpcli update</code> azonnal küld egy LLDP-keretet, az <code>lldpcli show neighbors</code> kiírja, ki van a kábel túlsó végén, az <code>lldpcli show chassis</code> pedig, hogy mit mondunk magunkról."],
            like: "a névkártyád, meg a nevek listája, amiket összegyűjtöttél.",
        },
        fig: () => Fig.svg(`<rect x="20" y="50" width="440" height="110" rx="8" fill="#0b1016" stroke="#1c2735"/>` +
            ["$ lldpcli show neighbors", "host1 LLDP neighbors:", "NIC2 [02:00:00:00:00:02]"]
                .map((l, i) => Fig.t(34, 80 + i * 26, l, { s: 12, mono: true, a: "start", c: l.startsWith("$") ? Fig.c.ok : "#c9f7d6" })).join("")),
        try: [["hub", "for i in {1..4}; do ssh host$i systemctl start lldpd; done"]], see: ["lldp", "tlv"],
    },
    // ---------------------------------------------------------------- managing devices
    {
        id: "managed-switch", cat: "devices", keys: ["managed switch", "unmanaged switch"],
        en: {
            t: "Managed and unmanaged switch",
            short: "An unmanaged switch just works and has nothing to set; a managed switch is a small computer you can log in to and configure.",
            body: ["An <b>unmanaged switch</b> is plug and play: it learns MAC addresses by itself, but you can't log in, give it a name or split it into VLANs — all its ports are one network. The little switches at home are like that. A <b>hub</b> is never managed.",
                "A <b>managed switch</b> has a small computer inside. You log in (here with <code>ssh switch1</code>) and you can: see its MAC table, put ports into <b>VLANs</b>, make a <b>trunk</b>, switch a port off, give it a name, reboot it. Schools and offices use these.",
                "Managed switches speak one of two kinds of language. A <b>Linux switch</b> uses the same commands as the servers (<code>ip link</code>, <code>bridge vlan</code>). An <b>IOS-style switch</b> has its own command line with modes (<code>enable</code>, <code>configure terminal</code>) — the kind many network engineers learn. The lab has both: compare them!"],
            like: "a light switch and a smart lamp: the first only does on/off, the second you can set up from your phone.",
        },
        hu: {
            t: "Managed és unmanaged switch",
            short: "Az unmanaged (nem menedzselt) switch egyszerűen működik, nincs mit beállítani rajta; a managed switch egy kis számítógép, amelybe be lehet lépni és be lehet állítani.",
            body: ["Az <b>unmanaged switch</b> „bedugod és megy”: magától tanulja a MAC-címeket, de nem lehet belépni, nevet adni neki vagy VLAN-okra osztani — az összes portja egy hálózat. Az otthoni kis switchek ilyenek. A <b>hub</b> soha nem menedzselhető.",
                "A <b>managed switch</b> belsejében egy kis számítógép van. Belépsz (itt: <code>ssh switch1</code>), és megnézheted a MAC-tábláját, portokat tehetsz <b>VLAN</b>-okba, csinálhatsz <b>trunkot</b>, lekapcsolhatsz egy portot, nevet adhatsz neki, újraindíthatod. Iskolákban, irodákban ilyeneket használnak.",
                "A managed switchek kétféle nyelvet beszélnek. A <b>Linuxos switch</b> ugyanazokat a parancsokat érti, mint a szerverek (<code>ip link</code>, <code>bridge vlan</code>). Az <b>IOS-stílusú switch</b> saját parancssort használ, módokkal (<code>enable</code>, <code>configure terminal</code>) — ezt tanulja sok hálózati mérnök. A laborban mindkettő megvan: hasonlítsd össze őket!"],
            like: "egy villanykapcsoló és egy okoslámpa: az első csak fel-le kapcsol, a másodikat a telefonodról állíthatod be.",
        },
        fig: () => Fig.svg(Fig.box(40, 50, 170, "#3d4f60", "unmanaged") + Fig.t(125, 110, "plug and play", { s: 11, c: Fig.c.dim }) + Fig.t(125, 128, "no login · one network", { s: 11, c: Fig.c.dim }) +
            Fig.box(270, 50, 170, "#24524a", "managed", 4, [Fig.c.vlan, Fig.c.vlan, Fig.c.eth, Fig.c.eth]) +
            `<rect x="285" y="96" width="140" height="62" rx="5" fill="#070b10" stroke="#2f6a48"/>` +
            Fig.t(295, 116, "$ ssh switch1", { s: 10.5, mono: true, a: "start", c: Fig.c.ok }) + Fig.t(295, 134, "VLANs · name", { s: 10.5, mono: true, a: "start", c: "#c9f7d6" }) +
            Fig.t(295, 150, "MAC table · reboot", { s: 10.5, mono: true, a: "start", c: "#c9f7d6" }) + Fig.no(125, 175) + Fig.yes(355, 180)),
        try: [["switch", "ssh switch1"], ["linux-switch", "ssh switch1 bridge fdb show"], ["ios-switch", "ssh switch1 show vlan brief"]],
        see: ["switch", "vlan", "linux-switch", "ios-cli", "hub"],
    },
    {
        id: "router-setup", cat: "commands", keys: ["ip_forward", "sysctl", "set up a router"],
        en: {
            t: "Setting up a router, step by step",
            short: "Give each leg of the router an address in its own network, tell it the way to networks further away, allow forwarding, and point the computers at it as their gateway.",
            body: ["<b>1. Log in:</b> <code>ssh router1</code>. <code>ip addr</code> shows its legs (network cards) and their names, e.g. NIC7, NIC8.<br><b>2. One address per leg</b>, each in a different network — usually the .1 of that network: <code>ip addr add 192.168.1.1/24 dev NIC7</code>, <code>ip addr add 192.168.2.1/24 dev NIC8</code>.<br><b>3. Neighbours come for free:</b> <code>ip route</code> now lists the networks the router is plugged into (<i>proto kernel</i>) — no need to type them.",
                "<b>4. Networks further away need a route:</b> <code>ip route add 192.168.3.0/24 via 10.0.0.2</code> — “to get there, hand the packet to 10.0.0.2”. The next router (10.0.0.2) must be in a network the router is already in — so give the addresses first, or you get <i>Nexthop has invalid gateway</i>. One route can also stand for everything else: <code>ip route add default via 10.0.0.2</code>.<br><b>5. Allow passing on:</b> a Linux machine only becomes a router when forwarding is on: <code>sysctl -w net.ipv4.ip_forward=1</code>. Without it the router answers pings to itself, but silently drops packets meant for others.",
                "<b>6. Tell the computers:</b> their <b>gateway</b> is the router's address on <i>their</i> side: <code>ip route add default via 192.168.1.1</code> (or let DHCP hand it out). For many machines at once: <code>for i in {1..2}; do ssh host$i ip route add default via 192.168.1.1; done</code>.<br><b>7. Test:</b> <code>ping</code>, then <code>traceroute</code> to see every hop. The TTL in the answers tells how many routers the packet passed (64 − TTL).",
                "<b>Example 1 — one router, three networks</b> (lab 18, “Your turn: set up a router for three networks”): LAN A 192.168.1.0/24, LAN B 192.168.2.0/24, LAN C 192.168.3.0/24, the router has a leg in each. Every network is directly connected, so no routes are needed — only addresses, forwarding and gateways:<br><code>ssh router1</code><br><code>ip addr add 192.168.1.1/24 dev NIC7</code><br><code>ip addr add 192.168.2.1/24 dev NIC8</code><br><code>ip addr add 192.168.3.1/24 dev NIC9</code><br><code>sysctl -w net.ipv4.ip_forward=1</code><br><code>exit</code><br><code>for i in {1..2}; do ssh host$i ip route add default via 192.168.1.1; done</code><br><code>for i in {3..4}; do ssh host$i ip route add default via 192.168.2.1; done</code><br><code>for i in {5..6}; do ssh host$i ip route add default via 192.168.3.1; done</code><br><code>ssh host1 ping -c 1 192.168.3.11</code> — the answer comes with ttl=63: one router on the way.",
                "<b>Example 2 — two routers, three networks</b> (lab 19, “Your turn: two routers, three networks”): LAN A 192.168.1.0/24 — router1 — transit network 10.0.0.0/30 — router2 — LAN B 192.168.2.0/24. The transit network is only the cable between the routers; /30 has exactly two usable addresses, one for each end. Now router1 does not know LAN B and router2 does not know LAN A, so each needs a route:<br><code>ssh router1</code><br><code>ip addr add 192.168.1.1/24 dev NIC5</code><br><code>ip addr add 10.0.0.1/30 dev NIC6</code><br><code>ip route add 192.168.2.0/24 via 10.0.0.2</code><br><code>sysctl -w net.ipv4.ip_forward=1</code><br><code>exit</code><br><code>ssh router2</code><br><code>ip addr add 10.0.0.2/30 dev NIC7</code><br><code>ip addr add 192.168.2.1/24 dev NIC8</code><br><code>ip route add 192.168.1.0/24 via 10.0.0.1</code><br><code>sysctl -w net.ipv4.ip_forward=1</code><br><code>exit</code><br>then the gateways of host1–host2 (192.168.1.1) and host3–host4 (192.168.2.1), and <code>ssh host1 traceroute 192.168.2.10</code> shows the two hops: 192.168.1.1, 10.0.0.2, then the host.",
                "<b>When it does not work — check it in this order</b><br>① <code>ip addr</code> on the router: has every leg an address, in the right network, on the right card? (Which card goes where: hover over the socket on the canvas.)<br>② <code>sysctl net.ipv4.ip_forward</code> — is it 1?<br>③ <code>ip route</code> on the computer: is there a <i>default via</i>, and is the gateway in the computer's own network?<br>④ <code>ip route</code> on every router: is there a way to the target network — <b>and back</b>? The answer to a ping travels the other way, so the far side needs a route home too. The most common mistake!<br>⑤ <code>traceroute</code> shows where the packets stop; <code>ip neigh</code> shows whether ARP found the next hop; the event log and <code>wireshark</code> show what happened to each frame. “Network is unreachable” means: no route at all on the sender; “Destination Net Unreachable” comes from a router that has no route.<br>A <code>reboot</code> of a router forgets everything that was typed in — exactly like a real Linux router without saved configuration files."],
            like: "a roundabout with signposts: every exit leads to a different town, and the signs tell which exit to take. Forwarding on means the roundabout is open; the routes are the signs; the gateway is the road from your house to the roundabout.",
        },
        hu: {
            t: "Router beállítása lépésenként",
            short: "Adj a router minden lábának egy címet a saját hálózatában, mondd meg neki a távolabbi hálózatok felé vezető utat, engedd meg a továbbítást, és állítsd be a gépeken átjárónak.",
            body: ["<b>1. Lépj be:</b> <code>ssh router1</code>. Az <code>ip addr</code> megmutatja a lábait (hálózati kártyáit) és a nevüket, pl. NIC7, NIC8.<br><b>2. Minden lábra egy cím</b>, mindegyik másik hálózatban — általában a hálózat .1-es címe: <code>ip addr add 192.168.1.1/24 dev NIC7</code>, <code>ip addr add 192.168.2.1/24 dev NIC8</code>.<br><b>3. A szomszédokat magától tudja:</b> az <code>ip route</code> most már mutatja azokat a hálózatokat, amelyekbe a router be van dugva (<i>proto kernel</i>) — ezeket nem kell beírni.",
                "<b>4. A távolabbi hálózatokhoz útvonal kell:</b> <code>ip route add 192.168.3.0/24 via 10.0.0.2</code> — „oda úgy jutsz, hogy átadod a 10.0.0.2-nek”. A következő routernek (10.0.0.2) olyan hálózatban kell lennie, amelyben a router már benne van — ezért előbb a címeket add meg, különben <i>Nexthop has invalid gateway</i> a válasz. Egyetlen útvonal minden másnak is állhat: <code>ip route add default via 10.0.0.2</code>.<br><b>5. Engedd meg a továbbítást:</b> egy linuxos gép csak akkor router, ha be van kapcsolva a továbbítás: <code>sysctl -w net.ipv4.ip_forward=1</code>. Enélkül a router a neki szóló pingekre válaszol, de a másoknak szóló csomagokat csendben eldobja.",
                "<b>6. Szólj a gépeknek:</b> az <b>átjárójuk</b> a router <i>saját oldalukon</i> lévő címe: <code>ip route add default via 192.168.1.1</code> (vagy kiossza a DHCP). Sok gépnek egyszerre: <code>for i in {1..2}; do ssh host$i ip route add default via 192.168.1.1; done</code>.<br><b>7. Próbáld ki:</b> <code>ping</code>, aztán <code>traceroute</code>, hogy minden ugrást láss. A válaszokban a TTL megmutatja, hány routeren ment át a csomag (64 − TTL).",
                "<b>1. példa — egy router, három hálózat</b> (18-as labor, „Te jössz: állíts be egy routert három hálózathoz”): A hálózat 192.168.1.0/24, B 192.168.2.0/24, C 192.168.3.0/24, a routernek mindegyikben van egy lába. Mindegyik hálózat közvetlenül kapcsolódik, ezért útvonal nem kell — csak címek, továbbítás és átjárók:<br><code>ssh router1</code><br><code>ip addr add 192.168.1.1/24 dev NIC7</code><br><code>ip addr add 192.168.2.1/24 dev NIC8</code><br><code>ip addr add 192.168.3.1/24 dev NIC9</code><br><code>sysctl -w net.ipv4.ip_forward=1</code><br><code>exit</code><br><code>for i in {1..2}; do ssh host$i ip route add default via 192.168.1.1; done</code><br><code>for i in {3..4}; do ssh host$i ip route add default via 192.168.2.1; done</code><br><code>for i in {5..6}; do ssh host$i ip route add default via 192.168.3.1; done</code><br><code>ssh host1 ping -c 1 192.168.3.11</code> — a válasz ttl=63-mal jön: egy router volt az úton.",
                "<b>2. példa — két router, három hálózat</b> (19-es labor, „Te jössz: két router, három hálózat”): A hálózat 192.168.1.0/24 — router1 — átmenő hálózat 10.0.0.0/30 — router2 — B hálózat 192.168.2.0/24. Az átmenő hálózat csak a két routert összekötő kábel; a /30-ban pontosan két használható cím van, egy-egy a két végnek. Most a router1 nem ismeri a B hálózatot, a router2 az A-t, ezért mindkettőnek útvonal kell:<br><code>ssh router1</code><br><code>ip addr add 192.168.1.1/24 dev NIC5</code><br><code>ip addr add 10.0.0.1/30 dev NIC6</code><br><code>ip route add 192.168.2.0/24 via 10.0.0.2</code><br><code>sysctl -w net.ipv4.ip_forward=1</code><br><code>exit</code><br><code>ssh router2</code><br><code>ip addr add 10.0.0.2/30 dev NIC7</code><br><code>ip addr add 192.168.2.1/24 dev NIC8</code><br><code>ip route add 192.168.1.0/24 via 10.0.0.1</code><br><code>sysctl -w net.ipv4.ip_forward=1</code><br><code>exit</code><br>aztán a host1–host2 (192.168.1.1) és a host3–host4 (192.168.2.1) átjárója, és az <code>ssh host1 traceroute 192.168.2.10</code> mutatja a két ugrást: 192.168.1.1, 10.0.0.2, aztán a gép.",
                "<b>Ha nem megy — ebben a sorrendben nézd meg</b><br>① <code>ip addr</code> a routeren: minden lábnak van címe, a jó hálózatban, a jó kártyán? (Melyik kártya merre megy: vidd az egeret az aljzat fölé a vásznon.)<br>② <code>sysctl net.ipv4.ip_forward</code> — 1-e?<br>③ <code>ip route</code> a gépen: van <i>default via</i>, és az átjáró a gép saját hálózatában van?<br>④ <code>ip route</code> minden routeren: van út a célhálózatba — <b>és vissza</b>? A ping válasza a másik irányba megy, ezért a túloldalnak is kell útvonal hazafelé. Ez a leggyakoribb hiba!<br>⑤ A <code>traceroute</code> megmutatja, hol akadnak el a csomagok; az <code>ip neigh</code>, hogy az ARP megtalálta-e a következő ugrást; az eseménynapló és a <code>wireshark</code>, hogy mi történt az egyes keretekkel. A „Network is unreachable” azt jelenti: a küldőnek egyáltalán nincs útvonala; a „Destination Net Unreachable” egy routertől jön, amelyiknek nincs útvonala.<br>A router <code>reboot</code>-ja mindent elfelejt, amit beírtál — pont mint egy igazi Linux router mentett konfigurációs fájlok nélkül."],
            like: "egy körforgalom útjelző táblákkal: minden kijárat másik városba visz, a táblák mondják meg, melyiken kell kimenni. A továbbítás bekapcsolása azt jelenti, hogy a körforgalom nyitva van; az útvonalak a táblák; az átjáró az út a házadtól a körforgalomig.",
        },
        fig: () => Fig.svg(Fig.zone(14, 30, 150, 150, "192.168.1.0/24") + Fig.zone(316, 30, 150, 150, "10.0.0.0/24") +
            Fig.pc(80, 60, "host1", "gw 192.168.1.1") + Fig.router(240, 80, "router1") + Fig.line(108, 92, 200, 97) + Fig.line(280, 97, 380, 97) +
            Fig.server(400, 72, "server", "10.0.0.80") +
            Fig.tag(170, 72, "① 192.168.1.1", Fig.c.ip) + Fig.tag(320, 72, "① 10.0.0.1", Fig.c.ip) +
            Fig.tag(240, 160, "② ip route  ③ ip_forward=1", Fig.c.ok) + Fig.tag(80, 196, "④ gateway", Fig.c.arp) + Fig.tag(400, 196, "⑤ ping · traceroute", Fig.c.icmp)),
        try: [["router-diy", "ssh router1 ip addr"], ["router-diy", "ssh host1 ping -c 1 192.168.3.10"], ["two-routers-diy", "ssh router1 ip route"], ["two-routers", "ssh router1 ip route"], ["two-routers", "ssh host1 traceroute 192.168.2.10"]],
        see: ["linux-terminal", "router", "gateway", "routing-table", "ip-cmd", "traceroute", "subnet"],
    },
    {
        id: "linux-switch", cat: "commands", keys: ["Linux switch", "bridge vlan", "swp1", "br0"],
        en: {
            t: "Configuring a Linux switch",
            short: "A Linux switch is a Linux computer whose ports are network interfaces (swp1, swp2 …) joined in one bridge (br0); you set it up with ip and bridge commands.",
            body: ["<b>1. Log in:</b> <code>ssh switch1</code>. You get the same shell as on the servers: <code>ls</code>, <code>cat</code>, <code>ps</code> all work.<br><b>2. Look at the ports:</b> <code>ip link</code> — is each swp UP? <code>ethtool swp1</code> — is a cable plugged in?<br><b>3. The MAC table:</b> <code>bridge fdb show</code> — which MAC address lives behind which port.",
                "<b>4. VLANs:</b> <code>bridge vlan add dev swp3 vid 20 pvid untagged</code> puts swp3 into VLAN 20 (an access port). Without <i>pvid untagged</i> the VLAN is carried with a tag: the port becomes a <b>trunk</b>. Check with <code>bridge vlan show</code>.<br><b>5. A port off and on:</b> <code>ip link set swp2 down</code>, then <code>up</code>.<br><b>6. A name:</b> <code>hostnamectl set-hostname core-sw</code>.",
                "On a real Linux switch the settings are kept in the file <code>/etc/network/interfaces</code> (try <code>cat</code> on it) and <code>ifreload -a</code> applies it. In this lab a <code>reboot</code> brings back the start settings."],
            like: "a power strip with a little computer glued on: every socket has a name, and you can tell the computer which sockets belong together.",
        },
        hu: {
            t: "Linuxos switch beállítása",
            short: "A Linuxos switch egy linuxos számítógép, amelynek a portjai hálózati csatolók (swp1, swp2 …), egyetlen bridge-be (br0) kötve; ip és bridge parancsokkal állítod be.",
            body: ["<b>1. Lépj be:</b> <code>ssh switch1</code>. Ugyanazt a shellt kapod, mint a szervereken: az <code>ls</code>, a <code>cat</code>, a <code>ps</code> mind működik.<br><b>2. Nézd meg a portokat:</b> <code>ip link</code> — minden swp UP? <code>ethtool swp1</code> — van benne kábel?<br><b>3. A MAC-tábla:</b> <code>bridge fdb show</code> — melyik MAC-cím melyik port mögött lakik.",
                "<b>4. VLAN-ok:</b> a <code>bridge vlan add dev swp3 vid 20 pvid untagged</code> a swp3-at a 20-as VLAN-ba teszi (access port). A <i>pvid untagged</i> nélkül a VLAN címkével megy: a port <b>trunk</b> lesz. Ellenőrizd: <code>bridge vlan show</code>.<br><b>5. Port ki és be:</b> <code>ip link set swp2 down</code>, aztán <code>up</code>.<br><b>6. Név:</b> <code>hostnamectl set-hostname core-sw</code>.",
                "Egy igazi Linuxos switchen a beállítások az <code>/etc/network/interfaces</code> fájlban vannak (nézd meg <code>cat</code>-tel), és az <code>ifreload -a</code> alkalmazza őket. A laborban a <code>reboot</code> visszahozza a kezdő beállításokat."],
            like: "egy elosztó, amire egy kis számítógépet ragasztottak: minden aljzatnak neve van, és megmondhatod a gépnek, melyik aljzatok tartoznak össze.",
        },
        fig: () => Fig.svg(`<rect x="60" y="34" width="360" height="30" rx="6" fill="none" stroke="${Fig.c.ok}" stroke-dasharray="5 4"/>` + Fig.t(240, 54, "br0 — the bridge is the switch", { s: 11, c: Fig.c.ok }) +
            [0, 1, 2, 3].map(i => `<rect x="${78 + i * 88}" y="80" width="62" height="34" rx="4" fill="#24524a" stroke="#0e2a24"/>` + Fig.t(109 + i * 88, 102, "swp" + (i + 1), { s: 12, mono: true }) +
                `<rect x="${102 + i * 88}" y="114" width="14" height="10" fill="#0b0e12" stroke="#9aa4ae"/>`).join("") +
            `<rect x="70" y="140" width="340" height="66" rx="5" fill="#070b10" stroke="#2f6a48"/>` +
            ["$ bridge vlan add dev swp3 vid 20 pvid untagged", "$ bridge fdb show", "$ ip link set swp2 down"]
                .map((l, i) => Fig.t(80, 160 + i * 19, l, { s: 10.5, mono: true, a: "start", c: Fig.c.ok })).join("")),
        try: [["linux-switch", "ssh switch1 bridge vlan show"], ["linux-switch", "ssh switch1 cat /etc/network/interfaces"], ["linux-switch", "ssh switch1"]],
        see: ["managed-switch", "vlan", "mac-table", "ios-cli"],
    },
    {
        id: "ios-cli", cat: "commands", keys: ["IOS-style", "configure terminal", "privileged mode", "show vlan brief"],
        en: {
            t: "IOS-style command line (configuring a managed switch)",
            short: "A command language with modes: you climb from looking (>) to changing (#) to configuring ((config)#), one step at a time.",
            body: ["<b>1. Log in:</b> <code>ssh switch1</code> → <code>switch1&gt;</code> — user mode, you may only look.<br><b>2. <code>enable</code></b> → <code>switch1#</code> — privileged mode: show everything, save, reload.<br><b>3. <code>configure terminal</code></b> → <code>switch1(config)#</code> — now changes are allowed. <code>hostname edge1</code> renames the switch.",
                "<b>4. One port:</b> <code>interface gi0/3</code> → <code>(config-if)#</code>, then <code>switchport mode access</code>, <code>switchport access vlan 20</code>, <code>description to host3</code>. A trunk: <code>switchport mode trunk</code>. Off and on: <code>shutdown</code>, <code>no shutdown</code>.<br><b>5. <code>end</code></b> takes you back to <code>#</code>. Check: <code>show vlan brief</code>, <code>show interfaces status</code>, <code>show mac address-table</code>, <code>show running-config</code>.<br><b>6. Save!</b> <code>write memory</code> — or a <code>reload</code> forgets everything.",
                "Tricks: words may be shortened (<code>conf t</code>, <code>int gi0/3</code>, <code>sh vlan br</code>), <b>?</b> shows what can come next, TAB completes a word, and <code>do show …</code> works inside the configuration modes. A wrong word is marked with a <b>^</b>."],
            like: "the floors of a building: the lobby (>) is open to everybody, the office (#) needs a key, and only the workshop ((config)#) has tools.",
        },
        hu: {
            t: "IOS-stílusú parancssor (managed switch beállítása)",
            short: "Módokra osztott parancsnyelv: lépésről lépésre jutsz a nézelődéstől (>) a változtatásig (#), majd a beállításig ((config)#).",
            body: ["<b>1. Lépj be:</b> <code>ssh switch1</code> → <code>switch1&gt;</code> — felhasználói mód, csak nézelődni lehet.<br><b>2. <code>enable</code></b> → <code>switch1#</code> — privilegizált mód: mindent megnézhetsz, menthetsz, újraindíthatsz.<br><b>3. <code>configure terminal</code></b> → <code>switch1(config)#</code> — most már lehet változtatni. A <code>hostname edge1</code> átnevezi a switchet.",
                "<b>4. Egy port:</b> <code>interface gi0/3</code> → <code>(config-if)#</code>, aztán <code>switchport mode access</code>, <code>switchport access vlan 20</code>, <code>description to host3</code>. Trunk: <code>switchport mode trunk</code>. Ki és be: <code>shutdown</code>, <code>no shutdown</code>.<br><b>5. Az <code>end</code></b> visszavisz a <code>#</code>-hoz. Ellenőrizd: <code>show vlan brief</code>, <code>show interfaces status</code>, <code>show mac address-table</code>, <code>show running-config</code>.<br><b>6. Ments!</b> <code>write memory</code> — különben egy <code>reload</code> mindent elfelejt.",
                "Trükkök: a szavakat rövidítheted (<code>conf t</code>, <code>int gi0/3</code>, <code>sh vlan br</code>), a <b>?</b> megmutatja, mi jöhet, a TAB kiegészít egy szót, és a <code>do show …</code> a beállító módokban is működik. A hibás szót egy <b>^</b> jelöli."],
            like: "egy épület emeletei: az előcsarnok (>) mindenkinek nyitva van, az irodához (#) kulcs kell, és csak a műhelyben ((config)#) vannak szerszámok.",
        },
        fig: () => Fig.svg([["switch1>", "user mode: look"], ["switch1#", "privileged: show, save"], ["switch1(config)#", "configure"], ["switch1(config-if)#", "one port"]]
            .map(([p, d], i) => `<rect x="${30 + i * 28}" y="${24 + i * 46}" width="190" height="30" rx="5" fill="#070b10" stroke="#2f5a8a"/>` +
                Fig.t(40 + i * 28, 44 + i * 46, p, { s: 12, mono: true, a: "start", c: Fig.c.ok }) + Fig.t(232 + i * 28, 44 + i * 46, d, { s: 11, a: "start", c: Fig.c.dim })).join("") +
            Fig.arrow(60, 55, 80, 68, Fig.c.eth) + Fig.t(100, 66, "enable", { s: 10, mono: true, a: "start", c: Fig.c.eth }) +
            Fig.arrow(88, 101, 108, 114, Fig.c.eth) + Fig.t(128, 112, "configure terminal", { s: 10, mono: true, a: "start", c: Fig.c.eth }) +
            Fig.arrow(116, 147, 136, 160, Fig.c.eth) + Fig.t(156, 158, "interface gi0/3", { s: 10, mono: true, a: "start", c: Fig.c.eth }) +
            `<path d="M110 200 C 8 206, 4 92, 52 86" fill="none" stroke="${Fig.c.arp}" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#ah)"/>` + Fig.t(64, 216, "end", { s: 11, mono: true, c: Fig.c.arp })),
        try: [["ios-switch", "ssh switch1"], ["ios-switch", "ssh switch1 show interfaces status"], ["vlan-trunk", "ssh switch2 show vlan brief"]],
        see: ["running-config", "managed-switch", "vlan", "trunk-access", "linux-switch"],
    },
    {
        id: "running-config", cat: "ideas", keys: ["running-config", "startup-config", "write memory"],
        en: {
            t: "running-config and startup-config",
            short: "A managed switch or router keeps two copies of its settings: the one in use right now, and the saved one it reads when it starts.",
            body: ["The <b>running-config</b> lives in memory. Every command you type in <code>configure terminal</code> changes it at once — the switch works with it immediately.",
                "The <b>startup-config</b> is saved (in NVRAM, a memory that keeps its contents without power). After a <code>reload</code> the switch starts from it. <code>write memory</code> (or <code>copy running-config startup-config</code>) copies the running one over the saved one.",
                "So a change you did not save disappears at the next reload — handy when you made a mistake, painful when you forgot to save! That is why <code>reload</code> asks: <i>System configuration has been modified. Save?</i>"],
            like: "a drawing on a whiteboard and a photo of it: you can change the whiteboard all day, but only the photo is still there tomorrow.",
        },
        hu: {
            t: "running-config és startup-config",
            short: "A managed switch vagy router két példányban tartja a beállításait: az éppen használtat, és a mentettet, amelyből indulásnál olvas.",
            body: ["A <b>running-config</b> a memóriában él. Minden parancs, amit a <code>configure terminal</code> után beírsz, azonnal megváltoztatja — a switch rögtön aszerint működik.",
                "A <b>startup-config</b> el van mentve (NVRAM-ban, ami áram nélkül is megőrzi a tartalmát). Egy <code>reload</code> után a switch ebből indul. A <code>write memory</code> (vagy <code>copy running-config startup-config</code>) a futót rámásolja a mentettre.",
                "Ezért ami nincs elmentve, az a következő reloadnál eltűnik — jól jön, ha hibáztál, és fáj, ha elfelejtettél menteni! Ezért kérdez a <code>reload</code>: <i>System configuration has been modified. Save?</i>"],
            like: "egy rajz a táblán és egy fénykép róla: a táblát egész nap rajzolhatod, de holnap csak a fénykép lesz meg.",
        },
        fig: () => Fig.svg(`<rect x="20" y="60" width="160" height="80" rx="8" fill="#16222f" stroke="${Fig.c.ok}"/>` + Fig.t(100, 92, "running-config", { s: 13, mono: true, c: Fig.c.ok }) + Fig.t(100, 114, "memory · in use now", { s: 10.5, c: Fig.c.dim }) +
            `<rect x="300" y="60" width="160" height="80" rx="8" fill="#16222f" stroke="${Fig.c.ip}"/>` + Fig.t(380, 92, "startup-config", { s: 13, mono: true, c: Fig.c.ip }) + Fig.t(380, 114, "NVRAM · saved", { s: 10.5, c: Fig.c.dim }) +
            Fig.arrow(186, 82, 294, 82, Fig.c.ok) + Fig.t(240, 72, "write memory", { s: 10.5, mono: true, c: Fig.c.ok }) + Fig.arrow(294, 124, 186, 124, Fig.c.arp) + Fig.t(240, 146, "reload", { s: 10.5, mono: true, c: Fig.c.arp }) +
            Fig.t(240, 190, "not saved + reload = gone", { s: 11, c: Fig.c.bad })),
        try: [["ios-switch", "ssh switch1"]],
        see: ["ios-cli", "managed-switch"],
    },
];
