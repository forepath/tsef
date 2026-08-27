# loadweaver-shared-feature-cli

Commander entrypoint and command registration for the Loadweaver CLI.

## Internal architecture diagrams

Mermaid sources in [`docs/`](./docs/) (contributor-only; not published user docs).

**General overview:** [architecture.mmd](./docs/architecture.mmd)

**Focused breakdowns:**

- [cli-overview.mmd](./docs/cli-overview.mmd) — libraries and SSH execution model
- [cluster-topology.mmd](./docs/cluster-topology.mmd) — runtime node and service layout
- [network-layers.mmd](./docs/network-layers.mmd) — wg0, wg1, BIRD, Swarm overlay stack
- [routing-architecture.mmd](./docs/routing-architecture.mmd) — default vs hub BIRD routing
- [routing-inter-cluster.mmd](./docs/routing-inter-cluster.mmd) — eBGP between clusters
- [cluster-init-sequence.mmd](./docs/cluster-init-sequence.mmd) — `cluster init` step order
- [cluster-update-planner.mmd](./docs/cluster-update-planner.mmd) — incremental update actions
- [workspace-state.mmd](./docs/workspace-state.mmd) — `.loadweaver/` operator state

## Running unit tests

Run `nx test loadweaver-shared-feature-cli` to execute the unit tests via [Jest](https://jestjs.io).
