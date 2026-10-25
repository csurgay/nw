// Short manual pages for every command of the lab — only what really works here.
// Each page: section, name line, synopsis, description, options, examples, see also.
const MAN = {
    pages: {
        // ---------------------------------------------------------------- the lab itself
        ssh: [1, "log in to a machine of the lab", ["ssh NAME", "ssh NAME COMMAND", "ssh [user@]ADDRESS [COMMAND]   (console access)"],
            "Simplified ssh (the default, see access): logs you in straight from the admin console to a computer, router, server or managed switch as root; with a COMMAND it runs only that command there and comes back. Names are not case sensitive. Unmanaged switches and hubs have nothing inside to log in to. Console access: the admin laptop is not on the lab network, so ssh works only from inside the lab (log in with console first), over the network: a TCP connection to port 22 (SYN, SYN-ACK, ACK), the version banners, the key exchange, then everything encrypted. The first time it asks whether you trust the machine's host key (it is written into ~/.ssh/known_hosts), then the root password (nw) — or nothing, if your key is in its authorized_keys (ssh-keygen, ssh-copy-id). Names work only with a DNS server; otherwise use the IP address. Errors: Network is unreachable (no route), No route to host (nobody answers ARP, or a router has no route), Connection refused (sshd is stopped), Connection timed out (the packets get lost, e.g. no way back). ~. on an empty line closes the connection.",
            [], ["ssh host1", "ssh router1 ip route", "ssh switch1 show vlan brief", "ssh 192.168.1.11", "ssh root@10.0.0.2 ip route"], ["exit", "console", "access", "ssh-keygen", "ssh-copy-id", "lab"]],
        vi: [1, "edit a text file", ["vi FILE", "vim FILE", "view FILE   (read only)"],
            "A small vi. It starts in normal mode, where keys are commands: h j k l or the arrows move, 0 and $ jump to the start and end of the line, w b e by words, gg and G to the first and last line, /text searches (n: next). x deletes a character, dd a line, yy copies a line, p pastes it, J joins two lines, r replaces one character, u undoes, Ctrl-R redoes. i (or a, I, A, o, O) starts insert mode: type, Enter, Backspace; Esc goes back to normal mode (on a phone: the Esc key of the key bar). : gives a command line: :w saves, :q quits, :wq or :x or ZZ saves and quits, :q! quits without saving, :12 goes to line 12, :set nu shows line numbers. In this lab you can write in the home folder, in /tmp and /etc/hosts.",
            [], ["vi /etc/hosts", "vi notes.txt", "view /etc/resolv.conf"], ["hosts", "cat", "echo"]],
        hosts: [5, "names of machines, without DNS (/etc/hosts)", ["/etc/hosts"],
            "One line per address: the IP address, then one or more names, e.g.  192.168.1.11   host2 host2.lab . Lines starting with # are comments. Programs look here first and ask the DNS server only when the name is not in the file (/etc/nsswitch.conf: hosts: files dns): ping, traceroute, arping, ssh, getent. host and nslookup ask the DNS server only, so they do not see this file. Edit it with vi /etc/hosts, or add a line with  echo \"192.168.1.11 host2\" >> /etc/hosts . It is on the machine's disk: it survives a reboot. Every machine has its own.",
            [], ["cat /etc/hosts", "echo \"192.168.1.11 host2\" >> /etc/hosts", "getent hosts host2", "ping -c 1 host2"], ["getent", "vi", "host"]],
        getent: [1, "look up a name the way the programs do", ["getent hosts NAME"],
            "Prints the address of NAME as ping or ssh would find it: first in /etc/hosts, then from the DNS server. Prints nothing (and exit status 2) when the name is unknown. Compare with host NAME, which asks only the DNS server.",
            [], ["getent hosts host2", "getent hosts host1.lab"], ["hosts", "host"]],
        console: [1, "connect to the console port of a lab machine (console access)", ["console NAME"],
            "Like plugging a console cable into a router or switch (or sitting at a computer's own screen): it works even when the machine has no IP address at all — that is how a new router is set up. Log in as root, password nw. exit logs out (the login prompt comes back), ~. on an empty line disconnects. Only on the admin laptop; hubs and unmanaged switches have no console port. An IOS-style switch asks for Return instead of a login.",
            [], ["console router1", "console switch1"], ["access", "ssh", "passwd"]],
        access: [7, "how the admin laptop reaches the lab machines", ["access", "access simple", "access console"],
            "simple: ssh NAME logs in straight from the admin console, ssh NAME COMMAND runs one command there — a shortcut, it needs no addresses. console: realistic — the admin laptop is not on the lab network; console NAME logs in through the console port, and ssh works between the lab machines over the network (you can watch it in Wireshark). The same switch is in ⚙ Settings. Changing it brings you back to the admin console.",
            [], ["access", "access console", "access simple"], ["console", "ssh"]],
        "ssh-keygen": [1, "make a key pair for ssh (console access)", ["ssh-keygen", "ssh-keygen -R ADDRESS"],
            "Makes a key pair: the private half stays in ~/.ssh/id_ed25519, the public half (~/.ssh/id_ed25519.pub) can be given to other machines with ssh-copy-id. Then ssh logs in with the key, without a password. Press Enter at the questions. -R removes a machine from ~/.ssh/known_hosts (needed when its host key changed).",
            [], ["ssh-keygen", "ssh-copy-id 192.168.1.11", "ssh-keygen -R 192.168.1.11"], ["ssh-copy-id", "ssh"]],
        "ssh-copy-id": [1, "put your public key on another machine", ["ssh-copy-id [user@]ADDRESS"],
            "Logs in once with the password and appends your public key to the other machine's ~/.ssh/authorized_keys. From then on ssh to it needs no password. Make the key first with ssh-keygen.",
            [], ["ssh-copy-id 192.168.1.11"], ["ssh-keygen", "ssh"]],
        passwd: [1, "change the root password", ["passwd"],
            "Asks for the new password twice (nothing is shown while you type). It is kept on the machine's disk, so it survives a reboot. The lab's machines start with root / nw.",
            [], ["passwd"], ["console", "ssh"]],
        exit: [1, "leave the machine, back to the admin console", ["exit", "logout"],
            "Closes the ssh session. On the admin console itself it does nothing. Ctrl-D does the same.", [], [], ["ssh"]],
        lab: [7, "list or load an example network", ["lab", "lab NAME", "lab NUMBER"],
            "Without arguments lists the lessons and your own saved networks. With a name or a number loads that network: every machine starts fresh.",
            [], ["lab", "lab dhcp", "lab 8"], ["help"]],
        router: [7, "how to make a Linux machine a router between two or three networks", ["ssh router1", "ip addr add ADDRESS/PREFIX dev NIC", "ip route add NETWORK/PREFIX via NEXT-ROUTER", "sysctl -w net.ipv4.ip_forward=1", "ssh hostN ip route add default via ROUTER-ADDRESS"],
            "1. Log in to the router; ip addr shows its cards. 2. Give every card an address in the network it is plugged into (usually .1). The connected networks then appear in ip route by themselves. 3. For a network that is further away (behind another router) add a route via the next router; that router's address must be in a network you already have, so add the addresses first. 4. Switch forwarding on with sysctl. 5. On every computer set the default gateway: the router's address in the computer's own network. 6. Test with ping and traceroute. If it does not work: check the addresses, ip_forward, the gateways, and that every router has a route to the target AND back. Labs 18 and 19 start with empty routers; the lexicon page “Setting up a router” has both solutions step by step.",
            [], ["ip addr add 192.168.1.1/24 dev NIC7", "ip route add 192.168.2.0/24 via 10.0.0.2", "sysctl -w net.ipv4.ip_forward=1", "for i in {1..2}; do ssh host$i ip route add default via 192.168.1.1; done"], ["ip", "sysctl", "traceroute", "ping"]],
        help: [7, "the short list of commands", ["help"], "Prints the commands of this lab, one line each. For the details of one command use man.", [], [], ["man"]],
        man: [1, "show the manual page of a command", ["man COMMAND", "man -k WORD"],
            "Shows how a command is used in this lab.",
            [["-k WORD", "search the short descriptions of all pages for WORD"]], ["man ping", "man -k address"], ["help"]],
        clear: [1, "clear the terminal screen", ["clear"], "Empties the terminal. Ctrl-L does the same.", [], [], []],
        for: [1, "repeat a command with a number", ["for i in {FROM..TO}; do COMMAND; done"],
            "Runs COMMAND once for every number, with $i replaced by the number.", [],
            ["for i in {1..4}; do ssh host$i systemctl start lldpd; done"], ["ssh"]],
        test: [7, "run the self test of the simulator", ["test"],
            "Loads the classic lab and runs every test case of the simulator. The result is written to the browser console.", [], [], ["lab", "autotest"]],
        wireshark: [1, "watch and take apart the frames on the cables", ["wireshark [-i INTERFACE] [-Y FILTER]"],
            "Opens the Wireshark window (also: the 🦈 button). Every frame that goes onto a cable is captured from the moment the page opens. The list shows one line per frame and per cable (a frame that crosses a switch is seen on both cables). Click a line: the layers open below, field by field; click a field to see its bytes and what it means, and to make a filter from it. -i watches one cable only: on a machine NIC1, on the console host1:NIC1 or switch1:swp2. -Y sets a display filter: protocol names (arp icmp ip udp dhcp dns lldp vlan eth), fields (ip.addr, ip.src, ip.dst, ip.ttl, eth.addr, eth.src, eth.dst, arp.opcode, icmp.type, icmp.seq, udp.port, dns.qry.name, vlan.id, frame.number …), comparisons (== != < > <= >= contains), subnets (ip.addr == 192.168.1.0/24), and && || ! with brackets.",
            [], ["wireshark", "wireshark -Y icmp", "wireshark -i NIC1 -Y arp", "wireshark -Y 'ip.addr == 192.168.1.2 && !arp'"], ["ping", "arping", "lldpcli"]],
        autotest: [7, "run all tests in the Autotest window", ["autotest"],
            "Opens the Autotest window (the same as ⚙ Settings ▸ Run Autotest): first a pointer builds a small network with the mouse, then the terminal tests check the protocols. Every case gets a green tick or the reason it failed; the report can be copied. Your network is put aside and comes back at the end. The speed slider makes the run faster or slower. On a phone the screen is shared: the picture on top (the camera follows the frames), the terminal and the report below.", [], ["autotest"], ["test"]],

        bash: [1, "the command line: keys, history, jobs", ["Ctrl-R  Ctrl-A  Ctrl-E  Ctrl-U  Ctrl-K  Ctrl-Y  Alt-B  Alt-F  Alt-.  !!  !$  ^old^new"],
            "Keys: Tab completes, Tab Tab lists. Up/Down and PgUp/PgDn walk the history (PgUp only through commands that start like the typed text). Ctrl-R searches the history as you type, Ctrl-R again goes further back, Enter runs it, Esc keeps it for editing. Ctrl-A and Ctrl-E jump to the start and end, Alt-B and Alt-F (or Ctrl-Left/Right) by words. Ctrl-U cuts to the start, Ctrl-K to the end, Alt-Backspace a word back, Alt-D a word forward; Ctrl-Y pastes it back, Ctrl-_ undoes. Alt-. inserts the last word of earlier commands, Ctrl-T swaps two letters, Ctrl-L clears, Ctrl-C stops, Ctrl-Z pauses a command (see jobs), Ctrl-D logs out. History expansion: !! the last command, !$ its last word, !* all its words, !n command number n (see history), !-2 the one before the last, !text the newest command starting with text, ^old^new the last command with old changed to new. Some Ctrl keys belong to the browser (Ctrl-T, Ctrl-W, Ctrl-N); on a phone use the key bar.",
            [], ["sudo !!", "ping -c 1 !$", "^host1^host2", "!ssh"], ["history", "jobs", "alias"]],
        jobs: [1, "the commands running in the background or stopped", ["jobs"],
            "Ctrl-Z stops the running command and makes it a job; a command with & at the end starts as a job. Each job has a number: %1, %2 …; + is the newest.", [],
            ["ping 192.168.1.2 &", "jobs", "fg %1"], ["fg", "bg", "kill"]],
        fg: [1, "bring a job to the front", ["fg [%N]"], "The job runs in the terminal again; Ctrl-C ends it, Ctrl-Z stops it again.", [], ["fg", "fg %2"], ["jobs", "bg"]],
        bg: [1, "let a stopped job go on in the background", ["bg [%N]"], "Its output still appears, above the prompt, while you type other commands.", [], ["bg"], ["jobs", "fg"]],
        kill: [1, "end a job", ["kill %N"], "Ends the job with that number.", [], ["kill %1"], ["jobs"]],
        alias: [1, "short names for commands", ["alias", "alias NAME='COMMAND'", "unalias NAME"],
            "An alias replaces the first word of a command. Without arguments lists them. They live on the machine where they were made, until it reboots.", [],
            ["alias p='ping -c 2'", "p 192.168.1.2", "alias n='ip neigh'"], ["unalias", "bash"]],
        unalias: [1, "forget an alias", ["unalias NAME", "unalias -a"], "", [["-a", "forget all of them"]], ["unalias p"], ["alias"]],
        watch: [1, "run a command again and again", ["watch [-n SECONDS] COMMAND"],
            "Shows the output of COMMAND, refreshed every 2 seconds (simulated time: faster with the speed slider). Ctrl-C ends it. Good for watching tables change: ip neigh, arp -a, bridge fdb show, ss -ulpn.",
            [["-n SECONDS", "refresh this often"]], ["watch ip neigh", "watch -n 1 arp -a"], ["ip", "bridge"]],

        // ---------------------------------------------------------------- network
        ip: [8, "show and change addresses, routes and neighbours", ["ip addr", "ip addr add|replace ADDRESS/PREFIX dev NIC", "ip addr del ADDRESS/PREFIX dev NIC", "ip addr flush dev NIC",
            "ip route", "ip route add NETWORK/PREFIX|default via GATEWAY", "ip route del NETWORK/PREFIX|default", "ip neigh", "ip link"],
            "The main network tool of Linux. Every word may be shortened (ip a, ip r). On a Linux switch: ip link shows the ports, ip link set swpN up|down switches one on or off.",
            [["addr", "the network cards and their IP addresses"], ["route", "the routing table: where packets go"], ["neigh", "the ARP cache: IP address → MAC address"], ["link", "the network cards without addresses"]],
            ["ip addr", "ip addr replace 192.168.1.5/24 dev NIC1", "ip route add default via 192.168.1.1", "ip route | grep default"], ["arp", "ifconfig", "router"]],
        arp: [8, "show the ARP cache (old style)", ["arp -a"], "Lists which MAC address belongs to which IP address, as learned by ARP. The new way is ip neigh.", [], ["arp -a"], ["ip", "arping"]],
        arping: [8, "ask who has an IP address (ARP request)", ["arping ADDRESS"],
            "Sends ARP requests to a neighbour in the same network and prints every reply with the MAC address. Ctrl-C stops it.", [], ["arping 192.168.1.2"], ["arp", "ping"]],
        ping: [8, "send ICMP echo requests", ["ping [-c COUNT] [-t TTL] [-i SECONDS] DESTINATION"],
            "Sends a ping every second and waits for the answers. DESTINATION may be an IP address or a name (then DNS is asked first). Ctrl-C stops it and prints the statistics.",
            [["-c COUNT", "stop after COUNT pings"], ["-t TTL", "start with this time to live (1–255)"], ["-i SECONDS", "wait this long between pings"]],
            ["ping -c 3 192.168.1.2", "ping -c 1 -t 1 192.168.2.10", "ping www"], ["traceroute", "arping"]],
        traceroute: [8, "show the routers on the way", ["traceroute [-m MAXHOPS] DESTINATION"],
            "Sends pings with TTL 1, 2, 3 … Every router where the TTL runs out answers “time exceeded”, and so it shows up in the list. Also called tracert.",
            [["-m MAXHOPS", "give up after this many hops (default 30)"]], ["traceroute 192.168.2.10"], ["ping", "ip"]],
        dhclient: [8, "get an IP address from a DHCP server", ["dhclient [NIC]", "dhclient -r [NIC]"],
            "Shouts DHCPDISCOVER to everybody, takes the first offer, asks for it (REQUEST) and gets it confirmed (ACK). The address, the gateway and the DNS server are set by themselves.",
            [["-r", "give the address back (release)"]], ["dhclient", "dhclient -r"], ["ip", "cat"]],
        host: [1, "ask DNS for the address of a name", ["host NAME"],
            "Sends a question to the DNS server from /etc/resolv.conf. A name without a dot gets the search domain added (host1 → host1.lab).", [], ["host www", "host host3.lab"], ["nslookup", "cat"]],
        nslookup: [1, "ask DNS for the address of a name", ["nslookup NAME"], "Like host, but also shows which server answered.", [], ["nslookup www"], ["host"]],
        ifconfig: [8, "show the network cards (old style)", ["ifconfig [NIC]"],
            "Shows each card with its address, mask, MAC address and packet counters. The new way is ip addr.", [], ["ifconfig", "ifconfig NIC1"], ["ip"]],
        ss: [8, "which program waits on which port", ["ss -tulpn", "ss -ulpn", "ss -tlpn"],
            "Lists the open sockets: TCP ports that listen and UDP ports that wait for datagrams. A DHCP server waits on UDP 67, a DNS server on UDP 53, ssh on TCP 22.",
            [["-t", "TCP only"], ["-u", "UDP only"], ["-p", "show the program"], ["-l -n", "accepted, they change nothing here"]], ["ss -tulpn"], ["netstat", "ps"]],
        netstat: [8, "which program waits on which port (old style)", ["netstat -tulpn"], "The older tool for the same list as ss.",
            [["-t", "TCP only"], ["-u", "UDP only"], ["-p", "show the program"]], ["netstat -ulpn"], ["ss"]],
        sysctl: [8, "read or change a kernel setting", ["sysctl net.ipv4.ip_forward", "sysctl -w net.ipv4.ip_forward=0|1", "sysctl -a"],
            "In this lab one setting is real: ip_forward. 1 means the machine passes on packets for others — it is a router. A reboot brings back the start value.",
            [["-w", "write a new value"], ["-a", "show all settings"]], ["sysctl net.ipv4.ip_forward", "sysctl -w net.ipv4.ip_forward=0"], ["ip", "reboot"]],
        systemctl: [1, "start and stop services", ["systemctl start|stop|status|is-active lldpd", "systemctl start|stop|status sshd", "systemctl status dhcpd|named", "systemctl reboot"],
            "Controls the programs that run in the background. lldpd and sshd can be switched on and off (a stopped sshd answers a new ssh with “Connection refused”; the sessions already open stay); dhcpd and named are set up by the lab, here you can only look at them. A reboot starts sshd again.", [],
            ["systemctl start lldpd", "systemctl is-active lldpd", "systemctl stop sshd", "systemctl status named"], ["lldpcli", "ps", "ss"]],
        lldpcli: [8, "talk to the LLDP daemon", ["lldpcli update", "lldpcli show neighbors", "lldpcli show chassis"],
            "lldpd tells the direct neighbours who this machine is. update sends an LLDP frame now, show neighbors lists what was heard, show chassis what this machine says about itself. Start lldpd first.", [],
            ["lldpcli update", "lldpcli show neighbors"], ["systemctl"]],
        bridge: [8, "the switch inside a Linux switch", ["bridge fdb show", "bridge vlan show", "bridge vlan add dev swpN vid VLAN [pvid untagged]", "bridge vlan del dev swpN vid VLAN", "bridge link"],
            "Only on a Linux switch. fdb is the MAC table. A port added with pvid untagged becomes an access port of that VLAN; without them it carries the VLAN with a tag, as a trunk.", [],
            ["bridge fdb show", "bridge vlan add dev swp3 vid 20 pvid untagged", "bridge vlan show"], ["ip", "ethtool"]],
        ethtool: [8, "is a cable plugged in?", ["ethtool swpN"], "Only on a Linux switch: speed, duplex and “Link detected” of a port.", [], ["ethtool swp1"], ["bridge", "ip"]],

        // ---------------------------------------------------------------- the machine
        hostname: [1, "show or set the name of the machine", ["hostname", "hostname NAME", "hostname -I | -i | -f | -d"],
            "With a NAME the machine is renamed until the next reboot (/etc/hostname stays). For a name that stays use hostnamectl.",
            [["-I", "all IP addresses"], ["-i", "the first IP address"], ["-f", "the full name with the domain"], ["-d", "the domain"]], ["hostname -I", "hostname web1"], ["hostnamectl"]],
        hostnamectl: [1, "show or set the name for good", ["hostnamectl", "hostnamectl set-hostname NAME"],
            "set-hostname writes the name into /etc/hostname, so it stays after a reboot. Without arguments shows the names and the system.", [], ["hostnamectl set-hostname web1"], ["hostname", "reboot"]],
        reboot: [8, "restart this machine", ["reboot", "shutdown -r now", "init 6", "systemctl reboot"],
            "The machine is gone for a few seconds, then starts with its saved settings: everything learned (ARP cache, DHCP address, routes added by hand) is forgotten, /tmp is emptied, the home folder stays. On the admin console the boot messages scroll by again.",
            [], ["reboot", "ssh router1 reboot"], ["shutdown", "uptime"]],
        shutdown: [8, "restart (only)", ["shutdown -r now", "poweroff", "halt"], "In this lab machines can only be restarted, not switched off: shutdown -r is reboot.", [["-r", "restart"]], ["shutdown -r now"], ["reboot"]],
        init: [8, "change the run level", ["init 6"], "init 6 restarts the machine, like reboot.", [], ["init 6"], ["reboot"]],
        uname: [1, "show the system", ["uname [-a] [-s] [-n] [-r] [-m] [-o]"], "Prints the name of the kernel, the machine, the version.",
            [["-a", "everything"], ["-n", "the machine name"], ["-r", "the kernel version"], ["-m", "the hardware"], ["-o", "the operating system"]], ["uname -a"], ["hostnamectl"]],
        uptime: [1, "how long has the machine been running", ["uptime", "uptime -p", "uptime -s"],
            "Counts from the moment the machine started: when the lab was loaded, when it was put on the canvas, or its last reboot.",
            [["-p", "pretty: up 5 minutes"], ["-s", "since when"]], ["uptime"], ["reboot", "w"]],
        date: [1, "show the date and time", ["date", "date -u", "date +FORMAT"], "FORMAT may use %Y %m %d %H %M %S %F %T %s %a %A %b %B %Z.",
            [["-u", "in UTC"]], ["date", "date +%F", "date +%H:%M"], ["uptime"]],
        whoami: [1, "show your user name", ["whoami"], "root on the lab machines, admin on the console.", [], [], ["id"]],
        id: [1, "show your user and group numbers", ["id [USER]"], "root is user 0. The console user admin is in the wheel group.", [], ["id"], ["whoami", "groups"]],
        groups: [1, "show your groups", ["groups"], "The groups of the current user.", [], [], ["id"]],
        who: [1, "who is logged in", ["who"], "One line per login.", [], [], ["w"]],
        w: [1, "who is logged in and what they do", ["w"], "The uptime line, then one line per login.", [], [], ["who", "uptime"]],
        ps: [1, "list the running programs", ["ps", "ps aux", "ps -ef"],
            "Without options: the programs of this terminal. aux or -ef: every program, with its user and process number — look for dhcpd, named, lldpd, sshd.", [], ["ps aux", "ps aux | grep named"], ["ss"]],
        free: [1, "memory use", ["free [-h] [-m]"], "Total, used and free memory and swap.", [["-h", "human readable (Gi, Mi)"], ["-m", "in megabytes"]], ["free -h"], ["df"]],
        df: [1, "disk use", ["df [-h]"], "Size, used and free space of each file system.", [["-h", "human readable (G, M)"]], ["df -h"], ["free"]],
        env: [1, "show the environment variables", ["env", "printenv [NAME]"], "Variables like HOME, USER, PATH, HOSTNAME. Use them as $NAME.", [], ["printenv HOME", "echo $HOSTNAME"], ["echo"]],
        history: [1, "the commands typed so far", ["history [N]"], "Lists the earlier commands, the last N only if N is given. Arrow up brings them back.", [], ["history 5"], []],
        which: [1, "where is a program", ["which COMMAND"], "Shows the file of the program in /usr/bin or /usr/sbin.", [], ["which ping"], ["man"]],
        sudo: [8, "run a command as root", ["sudo COMMAND"], "On the lab machines you are already root. On the console admin is not allowed — log in with ssh instead.", [], [], ["ssh", "su"]],
        su: [1, "become another user", ["su"], "Not possible on the console: use ssh to become root on a lab machine.", [], [], ["sudo"]],
        true: [1, "do nothing, successfully", ["true", "false"], "true sets $? to 0, false to 1. Useful with && and ||.", [], ["ls /nope || echo missing"], ["echo"]],

        // ---------------------------------------------------------------- files
        ls: [1, "list folder contents", ["ls [-l] [-a] [-A] [-h] [-t] [-S] [-r] [-F] [-1] [-d] [PATH ...]"],
            "Without options the names in columns. ll is ls -l, la is ls -la.",
            [["-l", "long list: permissions, owner, size, date"], ["-a", "also hidden files (starting with a dot), . and .."], ["-A", "hidden files, without . and .."],
                ["-h", "sizes like 4.0K"], ["-t", "newest first"], ["-S", "biggest first"], ["-r", "reverse order"], ["-F", "mark folders with /"], ["-1", "one name per line"], ["-d", "the folder itself, not its contents"]],
            ["ls -la /etc", "ls -l /proc/net", "ll"], ["cd", "tree", "file"]],
        cd: [1, "change the current folder", ["cd [FOLDER]", "cd -", "cd ~"], "Without a folder: go home. cd - goes back to the previous folder. .. is one level up.", [], ["cd /etc", "cd ..", "cd -"], ["pwd", "ls"]],
        pwd: [1, "print the current folder", ["pwd"], "Shows where you are. The last part is also in the prompt.", [], [], ["cd"]],
        cat: [1, "print files", ["cat [-n] FILE ..."], "Prints the contents of the files one after the other. Also reads from a pipe.", [["-n", "number the lines"]],
            ["cat /etc/resolv.conf", "cat /proc/net/arp", "cat -n /etc/passwd"], ["less", "head", "tail"]],
        less: [1, "show a file", ["less FILE", "more FILE"], "Here it simply prints the file, like cat.", [], [], ["cat"]],
        head: [1, "the first lines", ["head [-n N] [FILE]"], "The first 10 lines, or N.", [["-n N", "this many lines (also -N)"]], ["head -3 /etc/passwd"], ["tail"]],
        tail: [1, "the last lines", ["tail [-n N] [FILE]"], "The last 10 lines, or N.", [["-n N", "this many lines (also -N)"]], ["tail -5 /var/log/messages"], ["head"]],
        wc: [1, "count lines, words and bytes", ["wc [-l] [-w] [-c] [FILE]"], "", [["-l", "lines"], ["-w", "words"], ["-c", "bytes"]], ["wc -l /etc/passwd", "ls | wc -l"], ["grep"]],
        grep: [1, "keep the lines that match", ["grep [-i] [-v] [-c] [-n] PATTERN [FILE ...]"], "PATTERN is a regular expression. Mostly used after a pipe: … | grep word.",
            [["-i", "ignore upper/lower case"], ["-v", "the lines that do NOT match"], ["-c", "only count them"], ["-n", "with line numbers"]],
            ["ip route | grep default", "grep root /etc/passwd", "ps aux | grep -v root"], ["head", "sort"]],
        sort: [1, "sort lines", ["sort [-n] [-r] [-u] [FILE]"], "", [["-n", "as numbers"], ["-r", "reverse"], ["-u", "drop repeated lines"]], ["cat /etc/passwd | sort"], ["uniq"]],
        uniq: [1, "drop repeated neighbouring lines", ["uniq [-c] [FILE]"], "Usually after sort.", [["-c", "count how many times each line came"]], ["sort file | uniq -c"], ["sort"]],
        tee: [1, "pass on and also write to a file", ["… | tee [-a] FILE"], "", [["-a", "append instead of overwrite"]], ["ip route | tee /tmp/routes.txt"], ["echo"]],
        echo: [1, "print a line", ["echo [-n] [-e] TEXT", "echo TEXT > FILE", "echo TEXT >> FILE"],
            "Variables like $HOME are replaced. With > the line goes into a file (home folder and /tmp only), >> appends.",
            [["-n", "no new line at the end"], ["-e", "understand \\n and \\t"]], ["echo $HOSTNAME", "echo hello > /tmp/a.txt"], ["cat", "env"]],
        touch: [1, "make an empty file", ["touch FILE ..."], "Creates the file, or updates its time. Works in the home folder and in /tmp.", [], ["touch /tmp/x"], ["mkdir", "rm"]],
        mkdir: [1, "make a folder", ["mkdir [-p] FOLDER ..."], "Works in the home folder and in /tmp.", [["-p", "make the parent folders too, no error if it exists"]], ["mkdir -p /tmp/a/b"], ["rmdir", "touch"]],
        rm: [1, "remove files", ["rm [-r] [-f] FILE ..."], "Only files you made can be removed; the system files are read-only here.",
            [["-r", "folders with everything inside"], ["-f", "no error if missing"]], ["rm /tmp/a.txt", "rm -r /tmp/a"], ["rmdir", "touch"]],
        rmdir: [1, "remove an empty folder", ["rmdir FOLDER"], "", [], [], ["rm", "mkdir"]],
        tree: [1, "show folders as a tree", ["tree [-L LEVELS] [-a] [-d] [FOLDER]"], "",
            [["-L N", "only N levels deep"], ["-a", "also hidden files"], ["-d", "folders only"]], ["tree -L 2 /etc", "tree /sys/class/net"], ["ls"]],
        file: [1, "what kind of file is it", ["file PATH ..."], "folder, text, program (ELF) or symbolic link.", [], ["file /etc/hosts /bin"], ["ls"]],
    },

    // other names of the same page
    alias: { ll: "ls", la: "ls", tracert: "traceroute", logout: "exit", more: "less", printenv: "env", false: "true", poweroff: "shutdown", halt: "shutdown" },

    wrap(text, width = 66, indent = "       ") {
        const out = [];
        let line = "";
        text.split(/\s+/).forEach(w => {
            if ((line + " " + w).trim().length > width) { out.push(indent + line.trim()); line = w; }
            else line += " " + w;
        });
        if (line.trim()) out.push(indent + line.trim());
        return out.join("\n");
    },

    page(name) {
        const key = this.alias[name] || name;
        const p = this.pages[key];
        if (!p) return null;
        const [sec, what, syn, desc, opts, ex, see] = p;
        const head = `${key.toUpperCase()}(${sec})`;
        const title = "NetLab Manual";
        const pad = Math.max(1, Math.floor((72 - head.length * 2 - title.length) / 2));
        const parts = [head + " ".repeat(pad) + title + " ".repeat(pad) + head, "",
            "NAME", `       ${key} - ${what}`, "", "SYNOPSIS", syn.map(s => "       " + s).join("\n")];
        if (desc) parts.push("", "DESCRIPTION", this.wrap(desc));
        if (opts.length) parts.push("", "OPTIONS", opts.map(([o, t]) => "       " + o + "\n" + this.wrap(t, 60, "              ")).join("\n"));
        if (ex.length) parts.push("", "EXAMPLES", ex.map(e => "       " + e).join("\n"));
        if (see.length) parts.push("", "SEE ALSO", "       " + see.map(s => `${s}(${(this.pages[this.alias[s] || s] || [1])[0]})`).join(", "));
        return parts.join("\n");
    },

    // man -k WORD
    search(word) {
        const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        return Object.entries(this.pages).filter(([n, p]) => re.test(n) || re.test(p[1]) || re.test(p[2].join(" ")) || re.test(p[3]))
            .map(([n, p]) => `${(n + " (" + p[0] + ")").padEnd(22)}- ${p[1]}`);
    },

    names() {
        return [...Object.keys(this.pages), ...Object.keys(this.alias)].sort();
    },
};
