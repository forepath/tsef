# Architecture overview

Loadweaver manages a multi-site cluster where:

- **WireGuard** provides an L3 full mesh (`wg0`) between nodes
- **Docker Swarm** runs services with overlay networks advertised over WireGuard
- **Ceph/CephFS** backs shared storage mounted on every node
- **Traefik** serves ingress from a Swarm stack with shared config/certs on CephFS
- **VIP/keepalived** fronts Traefik for external traffic
- **BIRD (optional)** on hub nodes exchanges routes between sites and remote clusters over WireGuard

See [architecture.mmd](../../libs/domains/loadweaver/shared/feature-cli/docs/architecture.mmd) for the general overview diagram. Focused breakdowns (CLI libraries, network layers, routing, orchestrator sequences) live alongside it under [`feature-cli/docs/`](../../libs/domains/loadweaver/shared/feature-cli/docs/).

## Execution model

The CLI runs from an operator workstation and converges remote nodes over SSH using idempotent commands. **Host bootstrap** installs Docker, WireGuard, keepalived, and cephadm before the stack is configured. Use `--dry-run` to inspect planned operations.

The only prerequisite on the operator machine is SSH access to every node.

## Future extensions

Inter-cluster routing is available via optional `routing` configuration and BIRD on hub nodes. Each cluster keeps its own Swarm, Ceph, and WireGuard mesh; hub nodes peer with remote clusters over eBGP (and optional cross-cluster WireGuard tunnels). See [configuration.md](../configuration.md#advanced-routing-bird) and [inter-cluster routing](./deployment/inter-cluster-routing.md).
