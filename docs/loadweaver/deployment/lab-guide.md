# Lab guide (3 VMs)

Use this guide to validate Loadweaver against real Debian 12 or Ubuntu 22.04 VMs before production use.

## VM sizing

| Role               | vCPU | RAM  | Disk                          |
| ------------------ | ---- | ---- | ----------------------------- |
| Manager + Ceph MON | 2    | 8 GB | 40 GB OS + optional OSD disk  |
| Worker + Ceph OSD  | 2    | 8 GB | 40 GB OS + dedicated OSD disk |

Minimum lab: **3 VMs** (3 managers for Swarm quorum, Ceph co-located for simplicity).

## Network

- Public or private IPs reachable from the operator workstation via SSH
- Allow outbound HTTPS for apt/Docker/Ceph repositories during bootstrap
- Loadweaver opens **ufw** rules when `host.configureFirewall: true` (default)

Ports referenced during bootstrap:

| Port                             | Service                                                                 |
| -------------------------------- | ----------------------------------------------------------------------- |
| 22/tcp                           | SSH                                                                     |
| 2377/tcp, 7946/tcp+udp, 4789/udp | Docker Swarm                                                            |
| 51820/udp                        | WireGuard (`wg0`, default)                                              |
| 51821/udp                        | Cross-cluster WireGuard (`wg1`, when routing peers use `wireguardPeer`) |
| 179/tcp                          | BIRD BGP (routing hubs only, when `routing.enabled`)                    |
| 80/tcp, 443/tcp                  | Traefik                                                                 |
| 112                              | keepalived VRRP (when `vip` is configured)                              |

## Operator setup

1. Generate SSH key: `ssh-keygen -t ed25519 -f ~/.ssh/loadweaver_ed25519`
2. Install public key on each VM (`root` or sudo-capable user)
3. Build CLI:

```bash
npx nx run loadweaver-cli-loadweaver:binary
```

## Configuration

```bash
./dist/apps/loadweaver/cli-loadweaver/bin/loadweaver config init-template ./loadweaver-lab.yml
```

Edit:

- `nodes.*.publicIp` / `privateIp`
- `nodes.*.wireguardIp` (unique /32 per node, e.g. `10.200.0.x`)
- `nodes.*.osdDevice` on OSD nodes (e.g. `/dev/sdb`) for automated Ceph scale-out
- `ssh.identityFile` if not using default agent keys
- `host.aptProxy` if VMs reach the internet via proxy
- `vip.authPass` (max 8 characters) when using a floating IP
- `traefik.acme` — use `challengeType: http` for simple labs; see [production TLS](./production-tls.md) for DNS-01

Validate:

```bash
loadweaver config validate --config ./loadweaver-lab.yml
```

### Optional: inter-cluster routing lab

Add a `routing` block and hub nodes to exercise BIRD/BGP. Hubs receive Swarm label `loadweaver.role.router=true`. See [inter-cluster routing](./inter-cluster-routing.md).

## Converge sequence

Dry-run first:

```bash
loadweaver --dry-run --verbose --config ./loadweaver-lab.yml cluster init
loadweaver --json --dry-run --config ./loadweaver-lab.yml cluster init
```

Execute:

```bash
loadweaver --config ./loadweaver-lab.yml cluster init
```

Verify:

```bash
loadweaver --config ./loadweaver-lab.yml cluster status
loadweaver --config ./loadweaver-lab.yml cluster drift
loadweaver --json --config ./loadweaver-lab.yml host status
loadweaver --json --config ./loadweaver-lab.yml diag ssh node-a1
loadweaver --json --config ./loadweaver-lab.yml wireguard status
loadweaver --config ./loadweaver-lab.yml ceph status
```

### VIP (when configured)

```bash
loadweaver --json --config ./loadweaver-lab.yml vip status
loadweaver --config ./loadweaver-lab.yml vip verify-failover
loadweaver --config ./loadweaver-lab.yml vip verify-failover --pool postgres
loadweaver --yes --config ./loadweaver-lab.yml vip verify-failover --simulate
loadweaver --config ./loadweaver-lab.yml vip reconcile
```

Named `vip.pools` use independent VRRP instances. Listeners install host HAProxy; Swarm backends refresh on `vip reconcile` / `cluster update`.

### Traefik ACME (DNS lab)

On the primary manager, persist provider credentials then deploy:

```bash
loadweaver --config ./loadweaver-lab.yml traefik acme-env init
# SSH to primary: edit /etc/loadweaver/traefik-acme.env (chmod 600), uncomment CF_DNS_API_TOKEN=
loadweaver --config ./loadweaver-lab.yml traefik deploy
loadweaver --json --config ./loadweaver-lab.yml traefik verify-acme
```

For HTTP-01 labs, ensure port 80 on the VIP is reachable before enabling ACME. See [production TLS](./production-tls.md).

### Routing (when enabled)

```bash
loadweaver --json --config ./loadweaver-lab.yml routing status
```

## Add a 4th node (incremental update)

1. Add the node to `loadweaver-lab.yml` (include `roles: [worker, ceph-osd]` and `osdDevice` if it should host an OSD)
2. Run:

```bash
loadweaver --dry-run --config ./loadweaver-lab.yml cluster update
loadweaver --config ./loadweaver-lab.yml cluster update
```

Expected planner steps include `host.bootstrap.<nodeId>`, `ceph.osd-add.<nodeId>` when `osdDevice` is set, and `swarm.join`.

Manual OSD reconcile:

```bash
loadweaver --config ./loadweaver-lab.yml ceph osd-reconcile
```

## Remove a node

1. Remove the node from `loadweaver-lab.yml`
2. Run with confirmation:

```bash
loadweaver --yes --config ./loadweaver-lab.yml cluster update
```

Expected steps: `ceph.osd-remove.<nodeId>` (when the node had OSDs), `node.leave.<nodeId>`, `wireguard.remove-peer.<nodeId>`.

## Troubleshooting

| Symptom                        | Check                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| Bootstrap fails on apt         | VM outbound internet; set `host.aptProxy`                                                   |
| `sudo: a password is required` | Use root SSH or passwordless sudo for bootstrap user                                        |
| Swarm join fails               | `host bootstrap` completed; WireGuard mesh up (`loadweaver wireguard status`)               |
| Ceph bootstrap fails           | MON nodes have `cephadm`; sufficient RAM                                                    |
| OSD not added                  | `osdDevice` set; run `ceph osd-reconcile` or check `ceph orch device ls` on primary         |
| VIP not held                   | `keepalived` active on all nodes; `vip.interface` matches NIC name                          |
| VIP split-brain                | `loadweaver vip verify-failover`; check priorities in keepalived config                     |
| ACME DNS fails                 | `traefik acme-env init`; token in `/etc/loadweaver/traefik-acme.env`; `traefik verify-acme` |
| BGP session down               | Port 179 between hubs; `routing status`; peer `neighbor` reachable                          |

## Tear down

```bash
loadweaver --yes --config ./loadweaver-lab.yml cluster destroy
```

Removes Traefik stack, Swarm membership, CephFS mounts, WireGuard interfaces, optional BIRD/routing config, and local `.loadweaver/` workspace state.
