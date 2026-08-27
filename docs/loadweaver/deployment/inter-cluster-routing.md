# Inter-cluster routing

Use this guide when two or more independent Loadweaver clusters must exchange routes (for example production and staging, or two geographic regions with separate Swarm/Ceph stacks).

## Topology

Each cluster has its own `loadweaver.yml`, WireGuard full mesh, Swarm, and Ceph. Only **routing hub nodes** (typically one manager per site) run BIRD.

Hub nodes in cluster A peer with hub nodes in cluster B using:

1. **eBGP** over an existing L3 path (when hub WireGuard IPs are already reachable), or
2. **eBGP over a dedicated cross-cluster WireGuard tunnel** (`wg1` by default) configured under `routing.peers[].wireguardPeer`.

Workers and non-hub nodes are unchanged; they continue using the intra-cluster WireGuard mesh.

## Why BGP (not OSPF)

Loadweaver uses **BGP** for hub-to-hub and inter-cluster routing because hubs sit at **administrative boundaries** between independent clusters or sites. BGP is designed for policy-controlled prefix exchange between autonomous systems (ASNs), optional multihop peering, and explicit import/export filters.

**OSPF** is a link-state interior gateway protocol (IGP) for a single routing domain. It assumes shared trust and flooding within one area — a poor fit when you are connecting **edges** of separate Loadweaver clusters that should only advertise agreed prefixes (for example the WireGuard CIDR) to each other.

## Configuration checklist

### Cluster A (`localAsn: 64512`)

```yaml
routing:
  enabled: true
  localAsn: 64512
  hubNodes: [node-a1]
  exportWireguardSubnet: true
  peers:
    - name: cluster-b
      remoteAsn: 64513
      neighbor: 10.201.0.1
      exportFilter: cluster
      importFilter: accept
      wireguardPeer:
        publicKey: '<cluster-b-hub-public-key>'
        endpoint: b-hub.example.com:51821
        allowedIps: [10.201.0.0/24]
        interface: wg1
        listenPort: 51821
        localAddress: 10.210.0.1/32
```

### Cluster B (`localAsn: 64513`)

Mirror the peer entry pointing back at cluster A's hub WireGuard or cross-link address. Use a **different** `localAsn` and non-overlapping `clusterCidr` / `wireguardIp` ranges.

## Converge order

1. Bootstrap and converge each cluster independently (`cluster init`).
2. Exchange cross-cluster WireGuard public keys out of band (or read from `birdc`/hub after first dry-run).
3. Add `routing.peers` on both sides and run `loadweaver routing reconcile` (or `cluster update`).

Verify on a hub:

```bash
loadweaver --config ./loadweaver.yml routing status
loadweaver --json --config ./loadweaver.yml routing status
```

Look for `Established` BGP sessions and imported remote cluster prefixes in `birdc show route` output.

## Safety notes

- Keep `exportFilter: cluster` unless you intentionally advertise more than the local WireGuard CIDR.
- Do not overlap `clusterCidr` or `wireguardPeer.allowedIps` between clusters; `config validate` rejects overlaps.
- Cross-cluster tunnels are hub-only; they do not replace the per-cluster full mesh on `wg0`.
