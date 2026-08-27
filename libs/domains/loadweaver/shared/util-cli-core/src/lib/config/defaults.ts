export const DEFAULT_CONFIG_TEMPLATE = `version: 1
profile: prod
cluster:
  name: loadweaver-prod
  primaryManager: node-a1
sites:
  - name: site-a
    nodes: [node-a1, node-a2, node-a3]
  - name: site-b
    nodes: [node-b1, node-b2, node-b3]
nodes:
  node-a1:
    hostname: a1.example.com
    publicIp: 203.0.113.10
    privateIp: 10.0.1.11
    wireguardIp: 10.200.0.1
    roles: [manager, ceph-mon, ceph-mds, ceph-osd]
  node-a2:
    hostname: a2.example.com
    publicIp: 203.0.113.11
    wireguardIp: 10.200.0.2
    roles: [manager, worker, ceph-osd]
  node-a3:
    hostname: a3.example.com
    publicIp: 203.0.113.12
    wireguardIp: 10.200.0.3
    roles: [worker, ceph-osd]
  node-b1:
    hostname: b1.example.com
    publicIp: 203.0.113.20
    wireguardIp: 10.200.0.4
    roles: [manager, ceph-mon, ceph-mds, ceph-osd]
  node-b2:
    hostname: b2.example.com
    publicIp: 203.0.113.21
    wireguardIp: 10.200.0.5
    roles: [worker, ceph-osd]
  node-b3:
    hostname: b3.example.com
    publicIp: 203.0.113.22
    wireguardIp: 10.200.0.6
    roles: [worker, ceph-osd]
ssh:
  user: root
  connectTimeoutSeconds: 10
  serverAliveIntervalSeconds: 15
  # identityFile: ~/.ssh/loadweaver_ed25519
  # proxyJump: bastion.example.com
wireguard:
  interface: wg0
  port: 51820
  mtu: 1420
  keyRotation:
    enabled: true
    intervalDays: 90
    warnBeforeDays: 14
swarm:
  advertiseInterface: wg0
  overlayNetworks: [traefik-public]
ceph:
  fsName: loadweaverfs
  mountPath: /mnt/cephfs
  replication: 3
  release: quincy
host:
  configureFirewall: true
  # aptProxy: http://proxy.example.com:8080
traefik:
  image: traefik:v3
  network: traefik-public
  mode: global
  acme:
    email: admin@example.com
    challengeType: http
    storagePath: /letsencrypt/acme.json
vip:
  address: 203.0.113.100
  interface: eth0
  backend: keepalived
  # authPass: loadwv01  # keepalived VRRP password (max 8 chars)
  # Named L4 VIP pools (optional). Each pool gets its own VRRP instance.
  # pools:
  #   - name: postgres
  #     address: 203.0.113.101
  #     # routerId / authPass / interface optional (defaults from vip.*)
  #     healthCheck:
  #       type: tcp
  #       port: 5432
  #     listeners:
  #       - port: 5432
  #         protocol: tcp
  #         backends:
  #           - type: node
  #             nodeId: node-a1
  #             port: 5432
  #           - type: host
  #             host: 10.200.0.50
  #             port: 5432
  #           - type: swarm
  #             service: postgres
  #             port: 5432
# routing:
#   enabled: true
#   localAsn: 64512
#   hubNodes: [node-a1, node-b1]
#   exportWireguardSubnet: true
#   peers:
#     - name: staging
#       remoteAsn: 64513
#       neighbor: 10.201.0.1
#       wireguardPeer:
#         publicKey: "<remote-hub-public-key>"
#         endpoint: staging-hub.example.com:51821
#         allowedIps: [10.201.0.0/24]
#         interface: wg1
#         listenPort: 51821
volumes:
  - name: traefik-config
    path: traefik/config
  - name: traefik-certs
    path: traefik/certs
`;
