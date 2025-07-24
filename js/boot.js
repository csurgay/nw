const bootlog = `
------------ Wed Jul 24 10:08:00 CET 2025 ------------
[  OK  ] Started Show Plymouth Boot Screen.
[  OK  ] Started Forward Password Requests to Plymouth Directory Watch.
[  OK  ] Reached target Path Units.
[  OK  ] Found device /dev/mapper/rhel-root.
[  OK  ] Reached target Initrd Root Device.
[  OK  ] Found device /dev/mapper/rhel-swap.
         Starting Resume from hibernation using device /dev/mapper/rhel-swap...
[  OK  ] Finished Resume from hibernation using device /dev/mapper/rhel-swap.
[  OK  ] Reached target Preparation for Local File Systems.
[  OK  ] Reached target Local File Systems.
[  OK  ] Reached target System Initialization.
[  OK  ] Reached target Basic System.
[  OK  ] Finished dracut initqueue hook.
[  OK  ] Reached target Preparation for Remote File Systems.
[  OK  ] Reached target Remote File Systems.
         Starting File System Check on /dev/mapper/rhel-root...
[  OK  ] Finished File System Check on /dev/mapper/rhel-root.
         Mounting /sysroot...
[  OK  ] Mounted /sysroot.
[  OK  ] Reached target Initrd Root File System.
         Starting Mountpoints Configured in the Real Root...
[  OK  ] Finished Mountpoints Configured in the Real Root.
[  OK  ] Reached target Initrd File Systems.
[  OK  ] Reached target Initrd Default Target.
         Starting dracut pre-pivot and cleanup hook...
[  OK  ] Finished dracut pre-pivot and cleanup hook.
         Starting Cleaning Up and Shutting Down Daemons...
[  OK  ] Stopped target Network.
[  OK  ] Stopped target Timer Units.
[  OK  ] Closed D-Bus System Message Bus Socket.
[  OK  ] Stopped dracut pre-pivot and cleanup hook.
[  OK  ] Stopped target Initrd Default Target.
[  OK  ] Stopped target Basic System.
[  OK  ] Stopped target Initrd Root Device.
[  OK  ] Stopped target Initrd /usr File System.
[  OK  ] Stopped target Path Units.
[  OK  ] Stopped target Remote File Systems.
[  OK  ] Stopped target Preparation for Remote File Systems.
[  OK  ] Stopped target Slice Units.
[  OK  ] Stopped target Socket Units.
[  OK  ] Stopped target System Initialization.
[  OK  ] Stopped target Local File Systems.
[  OK  ] Stopped target Preparation for Local File Systems.
[  OK  ] Stopped target Swaps.
[  OK  ] Stopped dracut initqueue hook.
         Starting Plymouth switch root service...
[  OK  ] Stopped Apply Kernel Variables.
[  OK  ] Stopped Load Kernel Modules.
[  OK  ] Stopped Create Volatile Files and Directories.
[  OK  ] Stopped Coldplug All udev Devices.
         Stopping Rule-based Manager for Device Events and Files...
[  OK  ] Finished Cleaning Up and Shutting Down Daemons.
[  OK  ] Stopped Rule-based Manager for Device Events and Files.
[  OK  ] Closed udev Control Socket.
[  OK  ] Closed udev Kernel Socket.
[  OK  ] Stopped dracut pre-udev hook.
[  OK  ] Stopped dracut cmdline hook.
         Starting Cleanup udev Database...
[  OK  ] Stopped Create Static Device Nodes in /dev.
[  OK  ] Stopped Create List of Static Device Nodes.
[  OK  ] Stopped Create System Users.
[  OK  ] Finished Cleanup udev Database.
[  OK  ] Reached target Switch Root.
[  OK  ] Finished Plymouth switch root service.
         Starting Switch Root...
[  OK  ] Stopped Switch Root.
[  OK  ] Created slice Slice /system/getty.
[  OK  ] Created slice Slice /system/modprobe.
[  OK  ] Created slice Slice /system/sshd-keygen.
[  OK  ] Created slice Slice /system/systemd-fsck.
[  OK  ] Created slice User and Session Slice.
[  OK  ] Started Forward Password Requests to Wall Directory Watch.
[  OK  ] Set up automount Arbitrary Executable File Formats File System Automount Point.
[  OK  ] Reached target Local Encrypted Volumes.
[  OK  ] Reached target Login Prompts.
[  OK  ] Stopped target Switch Root.
[  OK  ] Stopped target Initrd File Systems.
[  OK  ] Stopped target Initrd Root File System.
[  OK  ] Reached target Local Integrity Protected Volumes.
[  OK  ] Reached target Slice Units.
[  OK  ] Reached target Local Verity Protected Volumes.
[  OK  ] Listening on Device-mapper event daemon FIFOs.
[  OK  ] Listening on LVM2 poll daemon socket.
[  OK  ] Listening on RPCbind Server Activation Socket.
[  OK  ] Reached target RPC Port Mapper.
[  OK  ] Listening on Process Core Dump Socket.
[  OK  ] Listening on initctl Compatibility Named Pipe.
[  OK  ] Listening on udev Control Socket.
[  OK  ] Listening on udev Kernel Socket.
         Activating swap /dev/mapper/rhel-swap...
         Mounting Huge Pages File System...
         Mounting POSIX Message Queue File System...
         Mounting NFSD configuration filesystem...
         Mounting Kernel Debug File System...
         Mounting Kernel Trace File System...
         Starting Kernel Module supporting RPCSEC_GSS...
         Starting Create List of Static Device Nodes...
         Starting Monitoring of LVM2 mirrors, snapshots etc. using dmeventd or progress polling...
         Starting Load Kernel Module configfs...
         Starting Load Kernel Module drm...
         Starting Load Kernel Module fuse...
         Starting Read and set NIS domainname from /etc/sysconfig/network...
[  OK  ] Stopped Plymouth switch root service.
[  OK  ] Stopped File System Check on Root Device.
[  OK  ] Stopped Journal Service.
         Starting Journal Service...
         Starting Load Kernel Modules...
         Starting Generate network units from Kernel command line...
         Starting Remount Root and Kernel File Systems...
         Starting Coldplug All udev Devices...
[  OK  ] Activated swap /dev/mapper/rhel-swap.
[  OK  ] Mounted Huge Pages File System.
[  OK  ] Mounted POSIX Message Queue File System.
[  OK  ] Mounted Kernel Debug File System.
[  OK  ] Mounted Kernel Trace File System.
[  OK  ] Finished Create List of Static Device Nodes.
[  OK  ] Finished Load Kernel Module configfs.
[  OK  ] Finished Load Kernel Module drm.
[  OK  ] Reached target Swaps.
         Mounting Kernel Configuration File System...
[  OK  ] Mounted Kernel Configuration File System.
[  OK  ] Finished Generate network units from Kernel command line.
[  OK  ] Finished Load Kernel Module fuse.
         Mounting FUSE Control File System...
[  OK  ] Finished Read and set NIS domainname from /etc/sysconfig/network.
[  OK  ] Mounted FUSE Control File System.
[  OK  ] Finished Remount Root and Kernel File Systems.
         Starting Load/Save OS Random Seed...
         Starting Create Static Device Nodes in /dev...
[  OK  ] Finished Load Kernel Modules.
         Starting Apply Kernel Variables...
[  OK  ] Started Journal Service.
         Starting Flush Journal to Persistent Storage...
[  OK  ] Finished Load/Save OS Random Seed.
[  OK  ] Finished Flush Journal to Persistent Storage.
[  OK  ] Finished Apply Kernel Variables.
[  OK  ] Finished Kernel Module supporting RPCSEC_GSS.
[  OK  ] Finished Monitoring of LVM2 mirrors, snapshots etc. using dmeventd or progress polling.
[  OK  ] Finished Create Static Device Nodes in /dev.
         Starting Rule-based Manager for Device Events and Files...
[  OK  ] Mounted NFSD configuration filesystem.
[  OK  ] Finished Coldplug All udev Devices.
         Starting Wait for udev To Complete Device Initialization...
[  OK  ] Started Rule-based Manager for Device Events and Files.
         Starting Load Kernel Module configfs...
[  OK  ] Finished Load Kernel Module configfs.
         Starting Load Kernel Module fuse...
[  OK  ] Finished Load Kernel Module fuse.
[  OK  ] Started /usr/sbin/lvm vgchange -aay --autoactivation event rhel.
[  OK  ] Found device /dev/mapper/rhel-home.
[  OK  ] Finished Wait for udev To Complete Device Initialization.
[  OK  ] Reached target Preparation for Local File Systems.
         Mounting /boot...
         Mounting /home...
         Starting File System Check on /dev/disk/by-uuid/2887-AC04...
[  OK  ] Mounted /boot.
[  OK  ] Finished File System Check on /dev/disk/by-uuid/2887-AC04.
         Mounting /boot/efi...
[  OK  ] Mounted /home.
[  OK  ] Mounted /boot/efi.
[  OK  ] Reached target Local File Systems.
         Starting Tell Plymouth To Write Out Runtime Data...
         Starting Automatic Boot Loader Update...
         Starting Create Volatile Files and Directories...
[  OK  ] Finished Tell Plymouth To Write Out Runtime Data.
[  OK  ] Finished Automatic Boot Loader Update.
[  OK  ] Finished Create Volatile Files and Directories.
         Mounting RPC Pipe File System...
         Starting Security Auditing Service...
         Starting RPC Bind...
[  OK  ] Mounted RPC Pipe File System.
[  OK  ] Reached target rpc_pipefs.target.
         Starting NFSv4 ID-name mapping service...
         Starting NFSv4 Client Tracking Daemon...
[  OK  ] Started NFSv4 Client Tracking Daemon.
[  OK  ] Started NFSv4 ID-name mapping service.
[  OK  ] Started RPC Bind.
[  OK  ] Started Security Auditing Service.
         Starting Record System Boot/Shutdown in UTMP...
[  OK  ] Finished Record System Boot/Shutdown in UTMP.
[  OK  ] Reached target System Initialization.
[  OK  ] Started CUPS Scheduler.
[  OK  ] Started Monitor /etc/insights-client/.lastupload for modifications.
[  OK  ] Started dnf makecache --timer.
[  OK  ] Started Daily rotation of log files.
[  OK  ] Started Updates mlocate database every day.
[  OK  ] Started Daily Cleanup of Temporary Directories.
[  OK  ] Reached target Path Units.
[  OK  ] Listening on Avahi mDNS/DNS-SD Stack Activation Socket.
         Starting Cockpit Web Service Socket...
[  OK  ] Listening on CUPS Scheduler.
[  OK  ] Listening on D-Bus System Message Bus Socket.
[  OK  ] Listening on Open-iSCSI iscsid Socket.
[  OK  ] Listening on Open-iSCSI iscsiuio Socket.
[  OK  ] Listening on SSSD Kerberos Cache Manager responder socket.
         Starting D-Bus System Message Bus...
[  OK  ] Listening on Cockpit Web Service Socket.
[  OK  ] Reached target Socket Units.
[  OK  ] Started D-Bus System Message Bus.
[  OK  ] Reached target Basic System.
         Starting Avahi mDNS/DNS-SD Stack...
         Starting NTP client/server...
         Starting Restore /run/initramfs on shutdown...
[  OK  ] Started irqbalance daemon.
[  OK  ] Started libstoragemgmt plug-in server daemon.
[  OK  ] Started Machine Check Exception Logging Daemon.
         Starting Generate rndc key for BIND (DNS)...
         Starting Authorization Manager...
         Starting RealtimeKit Scheduling Policy Service...
[  OK  ] Reached target sshd-keygen.target.
         Starting System Security Services Daemon...
         Starting Switcheroo Control Proxy service...
         Starting Disk Manager...
         Starting Daemon for power management...
[  OK  ] Started VGAuth Service for open-vm-tools.
[  OK  ] Started Service for virtual machines hosted on VMware.
[  OK  ] Finished Restore /run/initramfs on shutdown.
[  OK  ] Finished Generate rndc key for BIND (DNS).
[  OK  ] Started RealtimeKit Scheduling Policy Service.
[  OK  ] Started Avahi mDNS/DNS-SD Stack.
[  OK  ] Started Switcheroo Control Proxy service.
         Starting Load Kernel Module drm...
[  OK  ] Finished Load Kernel Module drm.
[  OK  ] Started NTP client/server.
[  OK  ] Started Authorization Manager.
         Starting Modem Manager...
         Starting firewalld - dynamic firewall daemon...
[  OK  ] Started Modem Manager.
[  OK  ] Started System Security Services Daemon.
[  OK  ] Reached target User and Group Name Lookups.
         Starting Accounts Service...
         Starting User Login Management...
[  OK  ] Started Disk Manager.
[  OK  ] Started Accounts Service.
[  OK  ] Started User Login Management.
[  OK  ] Created slice User Slice of UID 855600003.
         Starting User Runtime Directory /run/user/855600003...
[  OK  ] Finished User Runtime Directory /run/user/855600003.
[  OK  ] Started Daemon for power management.
[  OK  ] Started firewalld - dynamic firewall daemon.
[  OK  ] Reached target Preparation for Network.
         Starting Network Manager...
         Starting Hostname Service...
[  OK  ] Started Hostname Service.
[  OK  ] Listening on Load/Save RF Kill Switch Status /dev/rfkill Watch.
         Starting Network Manager Script Dispatcher Service...
[  OK  ] Started Network Manager Script Dispatcher Service.
[  OK  ] Started Network Manager.
[  OK  ] Reached target Network.
         Starting Network Manager Wait Online...
         Starting CUPS Scheduler...
         Starting GSSAPI Proxy Daemon...
         Starting Berkeley Internet Name Domain (DNS)...
[  OK  ] Started privileged operations for unprivileged applications.
         Starting Enable periodic update of entitlement certificates....
         Starting OpenSSH server daemon...
         Starting Dynamic System Tuning Daemon...
[  OK  ] Started Enable periodic update of entitlement certificates..
[  OK  ] Started GSSAPI Proxy Daemon.
         Starting RPC security service for NFS client and server...
[  OK  ] Started RPC security service for NFS client and server.
[  OK  ] Reached target NFS client services.
[  OK  ] Reached target Preparation for Remote File Systems.
[  OK  ] Started OpenSSH server daemon.
[  OK  ] Started CUPS Scheduler.
[  OK  ] Started Berkeley Internet Name Domain (DNS).
[  OK  ] Reached target Host and Network Name Lookups.
[  OK  ] Started Dynamic System Tuning Daemon.
[  OK  ] Finished Network Manager Wait Online.
[  OK  ] Reached target Network is Online.
[  OK  ] Started Insights Client Timer Task.
[  OK  ] Reached target Timer Units.
         Starting Cockpit motd updater service...
         Starting HAProxy Load Balancer...
         Starting Login and scanning of iSCSI devices...
[  OK  ] Started Kea DHCPv4 Server.
         Starting NFS Mount Daemon...
         Starting NFS status monitor for NFSv2/3 locking....
         Starting System Logging Service...
         Starting Squid caching proxy...
[  OK  ] Finished Login and scanning of iSCSI devices.
[  OK  ] Reached target Remote File Systems.
         Starting The Apache HTTP Server...
         Starting Crash recovery kernel arming...
         Starting Permit User Sessions...
[  OK  ] Finished Permit User Sessions.
[  OK  ] Started Deferred execution scheduler.
[  OK  ] Started Command Scheduler.
         Starting GNOME Display Manager...
         Starting Hold until boot process finishes up...
         Starting User Manager for UID 855600003...
[  OK  ] Finished Cockpit motd updater service.
[  OK  ] Started GNOME Display Manager.
[  OK  ] Started System Logging Service.
`
class Boot {
    constructor(term) {
        this.term = term;
        this.scrollIndex = 0;
    }
    init() {
        this.term.scrollTop = 0;
        setTimeout(this.scroll.bind(this), 1);
    }
    scroll() {
        this.scrollIndex += 24;
        if (this.scrollIndex < this.term.scrollHeight) {
            this.term.scrollTop = this.scrollIndex;
            setTimeout(this.scroll.bind(this), 1);
        }
        else {
            setTimeout(this.setPrompt.bind(this), 1);
        }
    }
    setPrompt() {
        this.term.value = Shell.consolePrompt;
    }
}