// Example networks, from the simplest to more complex ones.
// Devices are numbered in the order they are listed (Host1, Host2…, Hub1…, Switch1…, Router1…).
// Link ends: "Host3" (its first NIC), "Router1:2" (2nd interface), "Switch1:4" (port 4).
// Host:   { type:"host", x, y, nic:"right|left|up", mirror, ip:"a.b.c.d/nn", gw }
// Hub/Switch: { type:"hub"|"switch", x, y, ports }
// Router: { type:"router", x, y, ifs:[{ ip, side:"left|right|up|down" }], routes:["net/nn via gw", "default via gw"] }

function twoRouterLab(id, title, goal, loop, tries) {
    return {
        id, title, goal, tries,
        devices: [
            { type: "switch", x: 30, y: 100, ports: 4 },
            { type: "host", x: 30, y: 230, nic: "up", ip: "192.168.1.10/24", gw: "192.168.1.1" },
            { type: "host", x: 116, y: 230, nic: "up", ip: "192.168.1.11/24", gw: "192.168.1.1" },
            { type: "switch", x: 700, y: 100, ports: 4 },
            { type: "host", x: 860, y: 230, nic: "up", mirror: true, ip: "192.168.2.10/24", gw: "192.168.2.1" },
            { type: "host", x: 946, y: 230, nic: "up", mirror: true, ip: "192.168.2.11/24", gw: "192.168.2.1" },
            {
                type: "router", x: 220, y: 400,
                ifs: [{ ip: "192.168.1.1/24", side: "up" }, { ip: "10.0.0.1/30", side: "right" }],
                routes: ["192.168.2.0/24 via 10.0.0.2", ...(loop ? ["default via 10.0.0.2"] : [])],
            },
            {
                type: "router", x: 630, y: 400,
                ifs: [{ ip: "10.0.0.2/30", side: "left" }, { ip: "192.168.2.1/24", side: "up" }],
                routes: ["192.168.1.0/24 via 10.0.0.1", ...(loop ? ["default via 10.0.0.1"] : [])],
            },
        ],
        links: [
            ["Host1", "Switch1:1"], ["Host2", "Switch1:2"], ["Switch1:4", "Router1:1"],
            ["Host3", "Switch2:3"], ["Host4", "Switch2:4"], ["Switch2:1", "Router2:2"],
            ["Router1:2", "Router2:1", { color: COLORS.uplink, sag: 10, kind: "Cat5e cable (router to router)" }],
        ],
        zones: [
            { x: 16, y: 84, w: 310, h: 262, label: "LAN A — 192.168.1.0/24" },
            { x: 690, y: 84, w: 330, h: 262, label: "LAN B — 192.168.2.0/24", align: "right" },
            { x: 380, y: 392, w: 240, h: 92, label: "transit network 10.0.0.0/30" },
        ],
    };
}

const TOPOLOGIES = [
    {
        id: "p2p",
        title: "1 · Two PCs and one cable",
        goal: "The smallest network. Before Host1 can ping Host2 it must learn Host2's MAC address: watch the ARP request (broadcast) and the ARP reply, then the ping.",
        devices: [
            { type: "host", x: 300, y: 250, nic: "right", ip: "192.168.1.1/24" },
            { type: "host", x: 652, y: 250, nic: "left", ip: "192.168.1.2/24" },
        ],
        links: [["Host1", "Host2", { sag: 14 }]],
        zones: [{ x: 250, y: 210, w: 530, h: 190, label: "one Ethernet link — 192.168.1.0/24" }],
        tries: [
            ["arping", "ssh Host1 arping 192.168.1.2"],
            ["ping", "ssh Host1 ping -c 3 192.168.1.2"],
            ["ARP cache", "ssh Host1 ip neigh"],
            ["addresses", "ssh Host2 ip addr"],
            ["help", "help"],
        ],
    },
    {
        id: "hub",
        title: "2 · A hub: everybody hears everything",
        goal: "A hub repeats every frame to every port. Ping from Host1 to Host3 and watch Host2 and Host4: their network cards receive the frames too, but throw them away because the destination MAC is not theirs.",
        devices: [
            { type: "hub", x: 380, y: 140, ports: 4 },
            { type: "host", x: 340, y: 300, nic: "up", ip: "192.168.1.1/24" },
            { type: "host", x: 430, y: 300, nic: "up", ip: "192.168.1.2/24" },
            { type: "host", x: 520, y: 300, nic: "up", ip: "192.168.1.3/24" },
            { type: "host", x: 610, y: 300, nic: "up", ip: "192.168.1.4/24" },
        ],
        links: [["Host1", "Hub1:1"], ["Host2", "Hub1:2"], ["Host3", "Hub1:3"], ["Host4", "Hub1:4"]],
        zones: [{ x: 300, y: 110, w: 430, h: 320, label: "one hub = one collision domain" }],
        tries: [
            ["ping", "ssh Host1 ping -c 2 192.168.1.3"],
            ["arping", "ssh Host4 arping 192.168.1.2"],
            ["Host2 ARP", "ssh Host2 ip neigh"],
            ["LLDP on", "for i in {1..4}; do ssh Host$i systemctl start lldpd; done"],
            ["LLDP send", "ssh Host1 lldpcli update"],
            ["neighbours", "ssh Host3 lldpcli show neighbors"],
        ],
    },
    {
        id: "switch",
        title: "3 · A switch learns MAC addresses",
        goal: "Same four PCs, but on a switch. The first frames are flooded like on a hub — meanwhile the switch learns which MAC is behind which port. Afterwards it sends each frame only to the right port. Open Switch1 to watch its MAC table grow.",
        devices: [
            { type: "switch", x: 380, y: 140, ports: 4 },
            { type: "host", x: 340, y: 300, nic: "up", ip: "192.168.1.1/24" },
            { type: "host", x: 430, y: 300, nic: "up", ip: "192.168.1.2/24" },
            { type: "host", x: 520, y: 300, nic: "up", ip: "192.168.1.3/24" },
            { type: "host", x: 610, y: 300, nic: "up", ip: "192.168.1.4/24" },
        ],
        links: [["Host1", "Switch1:1"], ["Host2", "Switch1:2"], ["Host3", "Switch1:3"], ["Host4", "Switch1:4"]],
        zones: [{ x: 300, y: 110, w: 430, h: 320, label: "one switch = one broadcast domain, separate collision domains" }],
        tries: [
            ["ping", "ssh Host1 ping -c 3 192.168.1.3"],
            ["again", "ssh Host3 ping -c 2 192.168.1.1"],
            ["arping", "ssh Host4 arping 192.168.1.2"],
            ["LLDP on", "for i in {1..4}; do ssh Host$i systemctl start lldpd; done"],
            ["LLDP send", "ssh Host1 lldpcli update"],
        ],
    },
    {
        id: "hub-vs-switch",
        title: "4 · Hub and switch side by side",
        goal: "Two separate little networks. Run the same ping on both and compare: on the hub every PC gets every frame, on the switch only the first (ARP broadcast and unknown) frames are flooded.",
        devices: [
            { type: "hub", x: 60, y: 140, ports: 4 },
            { type: "host", x: 60, y: 300, nic: "up", ip: "192.168.1.1/24" },
            { type: "host", x: 150, y: 300, nic: "up", ip: "192.168.1.2/24" },
            { type: "host", x: 240, y: 300, nic: "up", ip: "192.168.1.3/24" },
            { type: "switch", x: 700, y: 140, ports: 4 },
            { type: "host", x: 760, y: 300, nic: "up", mirror: true, ip: "192.168.2.1/24" },
            { type: "host", x: 850, y: 300, nic: "up", mirror: true, ip: "192.168.2.2/24" },
            { type: "host", x: 940, y: 300, nic: "up", mirror: true, ip: "192.168.2.3/24" },
        ],
        links: [
            ["Host1", "Hub1:1"], ["Host2", "Hub1:2"], ["Host3", "Hub1:3"],
            ["Host4", "Switch1:1"], ["Host5", "Switch1:2"], ["Host6", "Switch1:3"],
        ],
        zones: [
            { x: 30, y: 110, w: 330, h: 320, label: "hub — 192.168.1.0/24" },
            { x: 670, y: 110, w: 355, h: 320, label: "switch — 192.168.2.0/24" },
        ],
        tries: [
            ["hub ping", "ssh Host1 ping -c 3 192.168.1.3"],
            ["switch ping", "ssh Host4 ping -c 3 192.168.2.3"],
            ["both", "ssh Host1 ping -c 2 192.168.1.2"],
        ],
    },
    {
        id: "two-switches",
        title: "5 · Two switches with an uplink",
        goal: "A bigger LAN made of two switches. Notice that Switch1 learns all of Switch2's PCs behind one single port: the uplink (port 4).",
        devices: [
            { type: "switch", x: 72, y: 122, ports: 4 },
            { type: "host", x: 40, y: 250, nic: "up", ip: "192.168.1.11/24" },
            { type: "host", x: 126, y: 250, nic: "up", ip: "192.168.1.12/24" },
            { type: "host", x: 212, y: 250, nic: "up", ip: "192.168.1.13/24" },
            { type: "switch", x: 612, y: 122, ports: 4 },
            { type: "host", x: 772, y: 250, nic: "up", mirror: true, ip: "192.168.1.21/24" },
            { type: "host", x: 858, y: 250, nic: "up", mirror: true, ip: "192.168.1.22/24" },
            { type: "host", x: 944, y: 250, nic: "up", mirror: true, ip: "192.168.1.23/24" },
        ],
        links: [
            ["Host1", "Switch1:1"], ["Host2", "Switch1:2"], ["Host3", "Switch1:3"],
            ["Host4", "Switch2:2"], ["Host5", "Switch2:3"], ["Host6", "Switch2:4"],
            ["Switch1:4", "Switch2:1", { color: COLORS.uplink, sag: 40, kind: "Cat5e uplink cable (switch to switch)" }],
        ],
        zones: [{ x: 16, y: 100, w: 1014, h: 260, label: "one LAN, one broadcast domain — 192.168.1.0/24" }],
        tries: [
            ["ping across", "ssh Host1 ping -c 2 192.168.1.23"],
            ["ping local", "ssh Host2 ping -c 2 192.168.1.13"],
            ["more", "ssh Host5 ping -c 2 192.168.1.11"],
        ],
    },
    {
        id: "router",
        title: "6 · A router joins two networks",
        goal: "Two LANs with different network addresses. Host1 sees that 192.168.2.10 is not in its own network, so it sends the packet to its default gateway (the router). Watch the router lower the TTL and wrap the packet in a new Ethernet frame — the MAC addresses change, the IP addresses don't.",
        devices: [
            { type: "switch", x: 60, y: 140, ports: 4 },
            { type: "host", x: 60, y: 270, nic: "up", ip: "192.168.1.10/24", gw: "192.168.1.1" },
            { type: "host", x: 150, y: 270, nic: "up", ip: "192.168.1.11/24", gw: "192.168.1.1" },
            { type: "switch", x: 700, y: 140, ports: 4 },
            { type: "host", x: 860, y: 270, nic: "up", mirror: true, ip: "192.168.2.10/24", gw: "192.168.2.1" },
            { type: "host", x: 946, y: 270, nic: "up", mirror: true, ip: "192.168.2.11/24", gw: "192.168.2.1" },
            {
                type: "router", x: 440, y: 300,
                ifs: [{ ip: "192.168.1.1/24", side: "left" }, { ip: "192.168.2.1/24", side: "right" }],
            },
        ],
        links: [
            ["Host1", "Switch1:1"], ["Host2", "Switch1:2"], ["Switch1:4", "Router1:1"],
            ["Host3", "Switch2:3"], ["Host4", "Switch2:4"], ["Switch2:1", "Router1:2"],
        ],
        zones: [
            { x: 30, y: 116, w: 330, h: 270, label: "LAN A — 192.168.1.0/24" },
            { x: 670, y: 116, w: 355, h: 270, label: "LAN B — 192.168.2.0/24", align: "right" },
        ],
        tries: [
            ["ping", "ssh Host1 ping -c 2 192.168.2.10"],
            ["routes", "ssh Host1 ip route"],
            ["router routes", "ssh Router1 ip route"],
            ["traceroute", "ssh Host1 traceroute 192.168.2.10"],
            ["no route", "ssh Host1 ping -c 1 172.16.0.1"],
            ["dead host", "ssh Host1 ping -c 1 192.168.2.99"],
        ],
    },
    twoRouterLab("two-routers", "7 · Two routers: traceroute",
        "Three networks in a row. Each router needs a route to the far LAN (ssh Router1 ip route). traceroute sends pings with TTL 1, 2, 3… — every router where the TTL runs out answers with “time exceeded”, and so reveals itself.",
        false, [
            ["traceroute", "ssh Host1 traceroute 192.168.2.10"],
            ["ping", "ssh Host1 ping -c 2 192.168.2.11"],
            ["R1 routes", "ssh Router1 ip route"],
            ["R2 routes", "ssh Router2 ip route"],
            ["TTL 2", "ssh Host1 ping -c 1 -t 2 192.168.2.10"],
        ]),
    twoRouterLab("routing-loop", "8 · A routing loop — why TTL exists",
        "A configuration mistake: each router's default route points to the other one. A packet to an unknown network bounces between them until its TTL runs out. Without TTL it would circle forever.",
        true, [
            ["loop (TTL 6)", "ssh Host1 ping -c 1 -t 6 172.16.0.1"],
            ["traceroute", "ssh Host1 traceroute -m 8 172.16.0.1"],
            ["R1 routes", "ssh Router1 ip route"],
            ["normal ping", "ssh Host1 ping -c 1 192.168.2.10"],
        ]),
    {
        id: "classic",
        title: "9 · The original lab (used by the test suite)",
        goal: "Three point-to-point links and two hubs joined by an uplink, all in 192.168.1.0/24. Run “test” in the terminal to check the simulator.",
        devices: [
            { type: "host", x: 160, y: 300, nic: "right", ip: "192.168.1.1/24" },
            { type: "host", x: 792, y: 300, nic: "left", ip: "192.168.1.2/24" },
            { type: "host", x: 160, y: 398, nic: "right", ip: "192.168.1.3/24" },
            { type: "host", x: 792, y: 398, nic: "left", ip: "192.168.1.4/24" },
            { type: "host", x: 160, y: 496, nic: "right", ip: "192.168.1.5/24" },
            { type: "host", x: 792, y: 496, nic: "left", ip: "192.168.1.6/24" },
            { type: "hub", x: 72, y: 22, ports: 4 },
            { type: "host", x: 40, y: 150, nic: "up", ip: "192.168.1.10/24" },
            { type: "host", x: 126, y: 150, nic: "up", ip: "192.168.1.11/24" },
            { type: "host", x: 212, y: 150, nic: "up", ip: "192.168.1.12/24" },
            { type: "hub", x: 612, y: 22, ports: 4 },
            { type: "host", x: 772, y: 150, nic: "up", mirror: true, ip: "192.168.1.20/24" },
            { type: "host", x: 858, y: 150, nic: "up", mirror: true, ip: "192.168.1.21/24" },
            { type: "host", x: 944, y: 150, nic: "up", mirror: true, ip: "192.168.1.22/24" },
        ],
        links: [
            ["Host1", "Host2", { sag: 18 }], ["Host3", "Host4", { sag: 18 }], ["Host5", "Host6", { sag: 18 }],
            ["Host7", "Hub1:1", { sag: 0 }], ["Host8", "Hub1:2", { sag: 0 }], ["Host9", "Hub1:3", { sag: 0 }],
            ["Host10", "Hub2:2", { sag: 0 }], ["Host11", "Hub2:3", { sag: 0 }], ["Host12", "Hub2:4", { sag: 0 }],
            ["Hub1:4", "Hub2:1", { color: COLORS.uplink, sag: 40, kind: "Cat5e uplink cable (hub to hub)" }],
        ],
        zones: [
            { x: 16, y: 8, w: 1014, h: 256, label: "Shared Ethernet segment — 2 hubs, one collision domain" },
            { x: 130, y: 282, w: 770, h: 330, label: "Point-to-point cables — each link connects just two hosts" },
        ],
        tries: [
            ["ARP", "ssh Host1 arping 192.168.1.2"],
            ["ping", "ssh Host1 ping -c 3 192.168.1.2"],
            ["via hubs", "ssh Host7 ping -c 2 192.168.1.21"],
            ["LLDP on", "for i in {1..12}; do ssh Host$i systemctl start lldpd; done"],
            ["LLDP send", "ssh Host8 lldpcli update"],
            ["neighbours", "ssh Host7 lldpcli show neighbors"],
            ["test", "test"],
        ],
    },
];
