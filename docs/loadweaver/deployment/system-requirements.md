# System requirements

Loadweaver bootstraps required host software over SSH. The operator workstation only needs SSH access to each node (key-based auth).

## Operator workstation

- SSH client
- Node.js runtime (to run the Loadweaver CLI)
- Network reachability to all cluster nodes (directly or via configured `proxyJump`)

No Docker, WireGuard, or Ceph tools are required locally.

## Target nodes

- OS: **Debian 12** or **Ubuntu 22.04+** (host bootstrap uses `apt`)
- Root or sudo-capable SSH user (bootstrap scripts require root)
- CPU: 2 cores minimum (4+ recommended)
- RAM: 4 GB minimum (8+ GB for Ceph OSD / Traefik nodes)
- Disk: sufficient space for Docker images; dedicated disks recommended for Ceph OSDs
- Outbound internet access during bootstrap (Docker and Ceph apt repositories)

## Installed automatically by `host bootstrap`

| Component                                    | When installed                            |
| -------------------------------------------- | ----------------------------------------- |
| Docker CE + compose plugin                   | All nodes                                 |
| WireGuard + wireguard-tools                  | All nodes                                 |
| keepalived                                   | All nodes when `vip` is configured        |
| haproxy                                      | All nodes when any VIP pool has listeners |
| cephadm (+ repo)                             | Nodes with any `ceph-*` role              |
| Base packages (`chrony`, `lvm2`, curl, etc.) | All nodes                                 |

Run standalone:

```bash
loadweaver host bootstrap
loadweaver host verify
```

`cluster init` runs host bootstrap and verification before WireGuard/Swarm setup.

## Network

- Stable connectivity between nodes
- 1 Gbps minimum (10 Gbps recommended for Ceph-heavy workloads)

## Ports

- Swarm: 2377/tcp, 7946/tcp+udp, 4789/udp
- WireGuard: 51820/udp (configurable)
- Traefik: 80/tcp, 443/tcp
- VRRP/keepalived: protocol 112
- VIP pool listeners: each configured listener TCP port (when firewall is enabled)
- Ceph: monitor/OSD ports per cephadm deployment
