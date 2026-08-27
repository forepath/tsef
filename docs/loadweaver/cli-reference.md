# CLI reference

Top-level command: `loadweaver`

Global flags:

- `--config <path>` — configuration file (default `./loadweaver.yml`)
- `--env <profile>` — merge a named profile overlay from the file
- `LOADWEAVER_CONFIG` — optional YAML/JSON in the environment, deep-merged over the file (and profile); env wins
- `--dry-run` — print planned commands; skip locks, persistence, and live drift probes
- `--verbose` — reserved; progress output is shown at the default log level
- `--debug` — include full SSH command traces
- `--yes` — skip drift confirmation and proceed (overwrite live); required for `cluster destroy`; allows destructive update actions
- `--accept-drift` — when drift is detected, refresh inventory from live, then continue (non-interactive skip)
- `--local` — restrict operations to the local node
- `--json` — machine-readable JSON for `cluster drift`, `cluster status`, `wireguard status`, `host status`, `diag ssh`, and dry-run step lists from `cluster init|update|destroy`

## Commands

| Group       | Commands                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| `hello`     | Validate CLI wiring                                                                                                 |
| `config`    | `show`, `validate`, `init-template`                                                                                 |
| `host`      | `bootstrap`, `verify`, `status`                                                                                     |
| `cluster`   | `init`, `update`, `destroy`, `status`, `drift`                                                                      |
| `node`      | `join`, `leave`, `label`                                                                                            |
| `wireguard` | `init`, `add-peer`, `remove-peer`, `rotate-keys`, `rotation-status`, `rotate-if-due`, `rotation-schedule`, `status` |
| `swarm`     | `init`, `join`, `reconcile-labels`, `network create`, `status`                                                      |
| `ssh`       | Run a command on a node (`<nodeId> [command...]`)                                                                   |
| `ceph`      | `init`, `cephfs-create`, `cephfs-mount`, `osd-add`, `osd-reconcile`, `osd-remove`, `status`                         |
| `volume`    | `create`, `list`                                                                                                    |
| `traefik`   | `deploy`, `update`, `destroy`, `status`, `verify-acme`, `acme-env init`                                             |
| `vip`       | `init`, `reconcile`, `status`, `verify-failover`, `destroy`                                                         |
| `routing`   | `init`, `reconcile`, `status`, `destroy`                                                                            |
| `diag`      | `all`, `ping`, `ssh`                                                                                                |

Run `loadweaver <group> --help` for details and examples.

## Progress output

By default, Loadweaver prints:

- Orchestrator steps (`Running step: …`)
- High-level service actions (bootstrap, WireGuard deploy, label reconcile, …)
- Per-node SSH progress: `→ node-a1 (root@203.0.113.10): ssh exec — apt-get update`

Use `--debug` to print full SSH/SCP command lines. Use `--dry-run` to mark remote actions with `[dry-run]` without connecting.

## Mutation safety

Mutating commands acquire a workspace lock, complementary per-node host locks, and inspect remote drift (when local inventory exists):

- Cluster: `init`, `update`, `destroy`
- Host: `bootstrap`
- Domain: `wireguard`, `swarm`, `ceph`, `volume`, `traefik`, `vip`, `routing`, `node` write operations

Read-only commands (`status`, `drift`, `list`, `config show`, `ssh`) do not acquire locks.

See [Workspace state](./workspace.md) for lock, inventory, drift, `--yes`, and `--accept-drift` details.

## WireGuard key rotation

Manual rotation:

```bash
# Rotate all node keys and roll out updated peer configs
loadweaver wireguard rotate-keys

# Rotate a single node
loadweaver wireguard rotate-keys node-a1
```

Scheduled rotation (configure `wireguard.keyRotation` in `loadweaver.yml`):

```bash
# Inspect key age and due/warning state
loadweaver wireguard rotation-status
loadweaver --json wireguard rotation-status

# Exit codes for monitoring (when wireguard.keyRotation.enabled is true):
# 0 = all keys ok, 1 = at least one key due, 2 = warning window only

# Rotate only overdue keys (for cron/systemd automation)
loadweaver --yes wireguard rotate-if-due

# Print suggested cron/systemd timer snippets
loadweaver wireguard rotation-schedule
```

When `wireguard.keyRotation.enabled` is true, `cluster update` rotates overdue keys before other update steps.

## Swarm label reconcile

`swarm reconcile-labels` and `cluster update` (via `swarm.reconcile-labels`) add expected loadweaver labels and remove stale managed labels.

Label encoding (Docker-compatible, supports multiple roles per node):

- Roles: `loadweaver.role.<role>=true` (for example `loadweaver.role.manager=true`)
- Routing hubs (when `routing.enabled`): `loadweaver.role.router=true`
- Sites: `loadweaver.site.<siteName>=true`
- Legacy single-key labels (`loadweaver.role`, `loadweaver.site`) are removed during reconcile

```bash
loadweaver swarm reconcile-labels
loadweaver swarm reconcile-labels node-a2
```

`cluster destroy` runs `wg-quick down` on all nodes and removes `.loadweaver/wireguard/keys.json`.

## Ad-hoc SSH

Run a command on a cluster node using the same SSH target resolution as other Loadweaver commands (config `nodes.<id>.ssh` or defaults):

```bash
loadweaver ssh node-a1 -- docker ps
loadweaver ssh node-a1 -- ls -la /mnt/cephfs
loadweaver --json ssh node-a1 -- docker ps
loadweaver --dry-run ssh node-a1 -- systemctl status keepalived
```

The remote exit code is propagated to the local process. Use `--json` for structured output (`nodeId`, `command`, `exitCode`, `stdout`, `stderr`, `dryRun`).

`diag ssh` only verifies SSH connectivity and host readiness; use top-level `ssh` to run arbitrary commands.
