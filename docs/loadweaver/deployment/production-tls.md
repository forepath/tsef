# Production TLS with Traefik ACME

Use this runbook when issuing Let's Encrypt certificates on a production Loadweaver cluster with real DNS.

## Choose a challenge type

| Challenge                           | When to use                                                     | Requirements                                                                       |
| ----------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **DNS-01** (`challengeType: dns`)   | Production default; wildcards; VIP not on public :80            | DNS provider API token on primary manager                                          |
| **HTTP-01** (`challengeType: http`) | Simple lab or when VIP/public IP serves port 80 to the internet | `vip.address` (or node public IP) reachable on **TCP 80** from the public internet |

Use **DNS-01** unless you have confirmed HTTP-01 reachability (see below).

## DNS-01 (recommended)

### 1. Configure ACME in `loadweaver.yml`

```yaml
traefik:
  image: traefik:v3
  network: traefik-public
  mode: global
  acme:
    email: ops@example.com
    challengeType: dns
    dnsProvider: cloudflare
    storagePath: /letsencrypt/acme.json
```

Supported `dnsProvider` values: `cloudflare`, `route53`, `digitalocean`.

### 2. Persist credentials on the primary manager

**Option A — env file (recommended for production):**

```bash
loadweaver traefik acme-env init
```

SSH to the primary manager, edit `/etc/loadweaver/traefik-acme.env` (mode `600`), uncomment and set values:

```bash
# CF_DNS_API_TOKEN=your-scoped-token
```

`traefik deploy` sources this file automatically before `docker stack deploy`.

**Option B — export in shell (quick tests):**

```bash
export CF_DNS_API_TOKEN='your-token'
```

Use the same shell session (or re-export before each deploy).

Custom path: set `traefik.acme.envFile` in `loadweaver.yml` (default `/etc/loadweaver/traefik-acme.env`).

### 3. Deploy and verify

```bash
loadweaver traefik deploy
loadweaver traefik verify-acme
loadweaver --json traefik verify-acme
```

`verify-acme` confirms:

- Stack includes the expected DNS challenge resolver args
- Required env var **names** are present on the Traefik service (host → container injection)
- `acme.json` exists and is non-empty inside the running Traefik container

### 4. Attach certificates to services

Label Swarm services with Traefik router TLS settings pointing at resolver `le` (see Traefik v3 Swarm docs).

## HTTP-01 (only when port 80 is public)

```yaml
traefik:
  acme:
    email: ops@example.com
    challengeType: http
    storagePath: /letsencrypt/acme.json
vip:
  address: 203.0.113.100/32
  interface: eth0
```

Before relying on HTTP-01, confirm reachability from outside your network:

```bash
curl -I http://203.0.113.100/
# or your public hostname resolving to the VIP
```

If the VIP is private, behind NAT without port forwarding, or filtered by firewall, HTTP-01 will fail — switch to DNS-01.

## Troubleshooting

| Symptom                                       | Likely cause                                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `Missing CF_DNS_API_TOKEN on primary manager` | Token not exported on primary before deploy                                   |
| `missing DNS provider environment variables`  | Stack deployed before token export; re-export and `loadweaver traefik update` |
| `acme.json missing or empty`                  | No certificate issued yet; check Traefik logs and DNS API permissions         |
| HTTP-01 timeout                               | Port 80 not reachable on VIP from internet                                    |

## Related commands

```bash
loadweaver --dry-run traefik deploy          # inspect planned stack YAML
loadweaver --dry-run --json traefik verify-acme
loadweaver vip verify-failover               # confirm VIP healthy before cutover
```
