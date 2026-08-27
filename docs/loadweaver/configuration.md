# Configuration

Loadweaver reads YAML/JSON from `loadweaver.yml` (override with `--config`).

## Secrets and config overlays

Do not commit passwords into the main config if you can avoid it. Prefer:

1. **`LOADWEAVER_CONFIG` (recommended for selective secrets)** — YAML (or JSON) in the environment, deep-merged over the file. Env wins on conflicts; nested keys merge selectively (arrays are replaced wholesale).
2. **Gitignored local config** — `--config ./loadweaver.local.yml`
3. **Host-side secrets** — Traefik DNS tokens in `/etc/loadweaver/traefik-acme.env` (not in YAML)

### `LOADWEAVER_CONFIG`

Merge order: file → `--env` profile overlay → `LOADWEAVER_CONFIG` → schema validation.

```bash
# Only override keepalived password; keep the rest from loadweaver.yml
export LOADWEAVER_CONFIG='
vip:
  authPass: your8ch
'

loadweaver --config ./loadweaver.yml config show
loadweaver --config ./loadweaver.yml cluster update
```

Nested example (file `vip.address` / `vip.interface` remain; only `authPass` changes):

```bash
export LOADWEAVER_CONFIG="$(cat <<'EOF'
vip:
  authPass: prodsecret
EOF
)"
```

`config show` and `config validate` apply the same merge, so you can inspect the effective config before mutating.

## Key sections

- `cluster` — cluster name and primary manager node id
- `sites` — optional multi-site groupings of node ids (metadata/validation only)
- `nodes` — per-node hostname, public/private IP, WireGuard IP, roles, optional `osdDevice` for Ceph OSD scale-out, optional SSH overrides
- `ssh` — optional global SSH defaults (user, port, identity file, proxy jump, connection timeouts)
- `wireguard` — interface name, listen port, MTU
- `swarm` — advertise interface and overlay network list
- `ceph` — filesystem name, mount path, replication factor, Ceph release for cephadm (`release`, default `quincy`)
- `traefik` — image, network, deployment mode, optional ACME settings
- `vip` — Traefik floating IP and optional named L4 pools (keepalived + host HAProxy)
- `routing` — optional BIRD hub routing (disabled by default; iBGP within cluster, eBGP to remote clusters)
- `volumes` — Docker bind volumes mapped to CephFS subdirectories

Generate a starter file:

```bash
loadweaver config init-template ./loadweaver.yml
```

Validate schema and SSH settings:

```bash
loadweaver config validate --config ./loadweaver.yml
```

Production profiles should define at least three manager nodes for Swarm quorum.

## SSH access

Loadweaver connects to nodes with the system `ssh` and `scp` binaries using key-based auth (`BatchMode=yes`).

Global defaults:

```yaml
ssh:
  user: root
  port: 22
  identityFile: ~/.ssh/loadweaver_ed25519
  proxyJump: bastion.example.com
  connectTimeoutSeconds: 10
  serverAliveIntervalSeconds: 15
```

Connection timeouts apply to every `ssh` and `scp` call Loadweaver makes. Defaults are **10** seconds for TCP connect (`ConnectTimeout`) and **15** seconds for keepalive probes (`ServerAliveInterval`). Set either value to **0** to disable that option and fall back to OpenSSH/system defaults.

Per-node overrides (take precedence over global values):

```yaml
nodes:
  node-a1:
    hostname: a1.example.com
    publicIp: 203.0.113.10
    wireguardIp: 10.200.0.1
    roles: [manager]
    sshUser: deploy
    sshPort: 2222
    identityFile: ~/.ssh/node-a1
    proxyJump: jump-a.example.com
```

Host resolution order for SSH: `publicIp` → `privateIp` → `hostname`.

### Validation

`loadweaver config validate` and cluster prerequisite checks:

- **Fail** if a configured `identityFile` path does not exist locally (supports `~/` expansion)
- **Warn** if a configured `proxyJump` host is unreachable (mutation may still be attempted)

Ensure the operator workstation can reach nodes (directly or via jump host) before running converge commands.

## Advanced routing (BIRD)

By default Loadweaver uses static WireGuard mesh routes only. Enable BIRD on **routing hub nodes** when you need dynamic route exchange between sites or remote clusters.

```yaml
routing:
  enabled: true
  localAsn: 64512
  clusterCidr: 10.200.0.0/24 # optional; derived from wireguardIp /24 when omitted
  hubNodes: [node-a1, node-b1] # optional; defaults to first manager per site
  exportWireguardSubnet: true
  peers:
    - name: staging
      remoteAsn: 64513
      neighbor: 10.201.0.1
      importFilter: accept # accept | none
      exportFilter: cluster # cluster | none
      wireguardPeer: # optional cross-cluster tunnel on hubs (wg1)
        publicKey: '<remote-hub-public-key>'
        endpoint: staging-hub.example.com:51821
        allowedIps: [10.201.0.0/24]
        interface: wg1
        listenPort: 51821
        localAddress: 10.210.0.1/32
```

When `routing.enabled` is false or the section is omitted, no BIRD package or configuration is applied.

Hub nodes receive `bird2` during `host bootstrap`. BIRD is configured after `wireguard init` during `cluster init`. Routing hubs also receive the Swarm label `loadweaver.role.router=true` (alongside their configured roles) so placement constraints can target edge routers.

### Protocol choice: BGP at cluster edges

Inter-cluster and multi-site hub routing uses **BGP** (iBGP between hubs in one cluster, eBGP to remote clusters). BGP fits **edge peering** between separate administrative domains with explicit ASN and prefix policy.

Do not use OSPF for this pattern: OSPF is an IGP for one contiguous routing domain, not for controlled advertisement between independent cluster edges.

Set `connectTimeoutSeconds` / `serverAliveIntervalSeconds` under `ssh:` if hub nodes are reached through slow links.

## Host bootstrap

Loadweaver installs required packages on each node before configuring the stack:

```bash
loadweaver host bootstrap          # all nodes
loadweaver host bootstrap node-a1  # single node
loadweaver host verify
```

`cluster init` runs `host.bootstrap` automatically as its first step.

Supported target OS: Debian 12 and Ubuntu 22.04+.

Optional host settings:

```yaml
host:
  configureFirewall: true
  aptProxy: http://proxy.example.com:8080
```

Non-root SSH users are supported when passwordless `sudo` is available.

## Ceph OSD scale-out

Assign the `ceph-osd` role and an `osdDevice` on each node that should host an OSD. Loadweaver registers the host with cephadm and runs `ceph orch daemon add osd` from the primary manager during `cluster init`, `ceph osd-reconcile`, and `cluster update` when devices are added or changed.

```yaml
nodes:
  node-a2:
    hostname: a2
    wireguardIp: 10.200.0.2
    roles: [worker, ceph-osd]
    osdDevice: /dev/sdb
```

Manual addition remains available: `loadweaver ceph osd-add node-a2 /dev/sdb`.

## Traefik ACME (production TLS)

Full runbook: [production TLS](./deployment/production-tls.md) (DNS vs HTTP-01, token export on primary manager, verification).

Use **DNS-01** for production with real DNS. Use **HTTP-01** only when the VIP or public IP is reachable on port 80 from the internet.

```yaml
traefik:
  acme:
    email: ops@example.com
    challengeType: dns
    dnsProvider: cloudflare
    storagePath: /letsencrypt/acme.json
vip:
  address: 203.0.113.100/32
  interface: eth0
  authPass: your8ch # keepalived VRRP password (max 8 characters)
  pools:
    - name: postgres
      address: 203.0.113.101/32
      healthCheck:
        type: tcp
        port: 5432
      listeners:
        - port: 5432
          protocol: tcp
          backends:
            - type: node
              nodeId: node-a1
              port: 5432
            - type: host
              host: 10.200.0.50
              port: 5432
            - type: swarm
              service: postgres
              port: 5432
```

`vip.address` remains the Traefik VIP (health check on local `:80`). Each pool has an independent VRRP instance and optional HAProxy listeners. Backends may target a configured node (WireGuard IP), a host IP, or Swarm task IPs resolved at apply time. Use `vip reconcile` (or `cluster update`) to refresh Swarm backends.

Before `loadweaver traefik deploy`, persist credentials on the primary manager:

```bash
loadweaver traefik acme-env init
# On primary: edit /etc/loadweaver/traefik-acme.env (chmod 600)
loadweaver traefik deploy
loadweaver traefik verify-acme
```

Or export in the current shell: `export CF_DNS_API_TOKEN='...'`

`verify-acme` checks stack resolver args, DNS env var injection into the Traefik service, and `acme.json` inside the container.

## VIP failover verification

After `vip init`, confirm each configured address is held by exactly one node:

```bash
loadweaver vip status
loadweaver --json vip status
loadweaver vip verify-failover
loadweaver vip verify-failover --pool postgres
loadweaver vip reconcile
```

To exercise failover (stops keepalived briefly on the current holder):

```bash
loadweaver --yes vip verify-failover --simulate
loadweaver --yes vip verify-failover --simulate --address 203.0.113.101
```

Operator-local state lives in `.loadweaver/` next to the config file. See [Workspace state](./workspace.md) for `state.json`, locks, WireGuard keys, and drift behavior.
