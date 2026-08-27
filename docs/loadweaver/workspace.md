# Workspace state

Loadweaver stores operator-local state beside your configuration file in a `.loadweaver/` directory.

Example layout when `./loadweaver.yml` is the config path:

```text
./loadweaver.yml
./.loadweaver/
  state.json
  lock.json
  wireguard/
    keys.json
```

Each managed node also stores:

```text
/etc/loadweaver/inventory.json
/etc/loadweaver/lock.json   # short-lived host mutex during mutations
```

## state.json

Written after a successful guarded mutation (not in `--dry-run`). `cluster destroy` removes it.

Contains:

- Planner snapshot of the last converged configuration (node ids, Swarm label expectations, Traefik image/mode, overlay networks, volumes, VIP fingerprint/pools)
- `desired` — sanitized full `loadweaver.yml` snapshot (`vip.authPass` is redacted)
- `inventorySerial` — monotonic generation used to reconcile host inventory files
- `remoteFingerprint` — live cluster observations captured at persist time (Swarm membership, node labels, WireGuard peer counts, Traefik revision, per-node service health)

Used by:

- `cluster update` — incremental planner diffs against the last recorded config snapshot
- `cluster drift` — compares stored `remoteFingerprint` to the current cluster
- Mutation guards — warn before changes when drift is detected

If `state.json` is missing, `cluster update` performs a full init path before recording state. Older state files without `desired` / `inventorySerial` remain valid; the next persist writes those fields.

## lock.json

Exclusive operational lock for mutating commands.

- Acquired by `runGuardedMutation()` for all cluster and domain mutations (unless `--dry-run`)
- Records PID, operation name, and timestamp
- Stale locks (dead PID or older than 2 hours) are replaced automatically

Prevents concurrent `cluster update`, `wireguard init`, `traefik deploy`, and similar commands from corrupting shared state on the **same workstation**. It is not a substitute for host inventory.

## Host inventory and host locks

`/etc/loadweaver/inventory.json` is the per-node copy of last applied inventory (serial, node identity, last operation, and that node's fingerprint). It is written after successful mutations and removed on `node leave` and `cluster destroy`.

`/etc/loadweaver/lock.json` is a short-lived host mutex so two operator workstations cannot mutate the same node at once. Stale host locks (older than 2 hours) are replaced. Read-only commands (`ssh`, `diag`, `status`, `cluster drift`) do not take host locks.

## WireGuard key rotation schedule

Configure automatic rotation policy under `wireguard.keyRotation`:

```yaml
wireguard:
  keyRotation:
    enabled: true
    intervalDays: 90
    warnBeforeDays: 14
```

Each key record in `wireguard/keys.json` stores `rotatedAt` (ISO timestamp). Keys without `rotatedAt` are treated as due when rotation is enabled.

Commands:

- `wireguard rotation-status` — show per-node age and due/warning state
- `wireguard rotate-if-due` — rotate only overdue keys (guarded mutation; use in cron)
- `wireguard rotation-schedule` — print suggested cron/systemd timer entries

`cluster update` prepends `wireguard.rotate-if-due` when rotation is enabled and keys are overdue, even when no other config changes are pending.

Suggested daily cron (non-interactive):

```bash
0 3 * * * root loadweaver --config /etc/loadweaver/loadweaver.yml --yes wireguard rotate-if-due
```

Monitoring-only cron (alert without rotating):

```bash
30 2 * * * root loadweaver --config /etc/loadweaver/loadweaver.yml wireguard rotation-status
# exit 1 = keys due, exit 2 = warning window
```

## wireguard/keys.json

WireGuard private/public key pairs for each node id.

- Created on first `wireguard init` or `cluster init`
- Mode `600` on write
- Removed by `cluster destroy` (via `wireguard teardownAndClearKeys`)
- Rotated with `wireguard rotate-keys [nodeId]`
- Automatically rotated when due via `wireguard rotate-if-due` or `cluster update` (when `wireguard.keyRotation.enabled` is true)
- Individual node keys removed on `wireguard remove-peer`

Requires `wireguard-tools` (`wg`) on the operator workstation for non-dry-run key generation.

## Drift detection

Before mutating commands run, Loadweaver compares:

- Stored `remoteFingerprint` to live probes
- Local `inventorySerial` to `/etc/loadweaver/inventory.json` on each node
- Host inventory fingerprints to live probes on that node

Drift checks include:

| Area           | Examples                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| Swarm          | Membership changes, unknown hostnames, label changes                                                   |
| WireGuard      | Interface down, peer count mismatch or change                                                          |
| Traefik        | Stack removed, image change, service revision/replica summary change                                   |
| VIP            | keepalived active state and per-address VIP holder changes                                             |
| Host inventory | Missing file, serial mismatch, cluster/node identity mismatch, live probe mismatch vs host fingerprint |

Inspect drift without mutating:

```bash
loadweaver cluster drift
```

When drift is found, mutating commands prompt:

- `y` — proceed and overwrite live (keep stored inventory until the mutation persists a new snapshot)
- `s` — skip/accept drift: refresh local and host inventory from live, then continue the action
- `N` — abort

`--yes` proceeds without a prompt (overwrite). `--accept-drift` takes the skip/refresh path without a prompt. Non-interactive sessions require one of those flags.

`--dry-run` skips live drift collection and does not acquire locks or persist workspace or host inventory files.

## --yes semantics

| Scenario                           | Behavior                                                                         |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| Drift detected before mutation     | `--yes` proceeds (overwrite); `--accept-drift` refreshes inventory then proceeds |
| `cluster destroy`                  | Required (unless `--dry-run`)                                                    |
| `cluster update` with node removal | Allows destructive planner actions                                               |
| Non-TTY environments               | `--yes` or `--accept-drift` required for drift prompts                           |

`--yes` does not bypass schema validation or missing SSH identity file checks.
