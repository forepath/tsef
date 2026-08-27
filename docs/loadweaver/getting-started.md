# Getting started

## Prerequisites

- Node.js 18+ (to build/run the CLI)
- SSH key access as root (or a sudo-capable user) to every cluster node
- Debian 12 or Ubuntu 22.04+ on target nodes
- `loadweaver.yml` describing your cluster (see [configuration.md](./configuration.md))

No Docker, WireGuard, or Ceph tools are required on the operator workstation.

## Build the CLI

```bash
npx nx run loadweaver-cli-loadweaver:build
npx nx run loadweaver-cli-loadweaver:binary
```

## Bootstrap workflow

1. Generate a template config: `loadweaver config init-template`
2. Edit node addresses, roles, WireGuard IPs, SSH settings, and VIP settings
3. Validate: `loadweaver config validate`
4. Dry-run full bootstrap: `loadweaver --dry-run cluster init`
5. Execute bootstrap: `loadweaver cluster init`

`cluster init` installs host packages (`host bootstrap`), verifies software, then configures WireGuard → Swarm → Ceph → Traefik → VIP.

You can also bootstrap hosts independently:

```bash
loadweaver host bootstrap
loadweaver host verify
```

## Typical dependency order

Host packages → WireGuard mesh → Docker Swarm → Ceph/CephFS → Docker volumes → overlay networks → Traefik → VIP
