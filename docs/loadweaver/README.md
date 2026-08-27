# Loadweaver

Loadweaver is a Node.js CLI for managing multi-node infrastructure with Docker Swarm, WireGuard, Ceph, Traefik, and floating VIP ingress.

## Quick start

```bash
npx nx run loadweaver-cli-loadweaver:binary
./dist/apps/loadweaver/cli-loadweaver/bin/loadweaver hello
./dist/apps/loadweaver/cli-loadweaver/bin/loadweaver config init-template ./loadweaver.yml
./dist/apps/loadweaver/cli-loadweaver/bin/loadweaver config validate --config ./loadweaver.yml
```

## Documentation

- [Getting started](./getting-started.md)
- [Architecture overview](./architecture/system-overview.md)
- [CLI reference](./cli-reference.md)
- [Configuration](./configuration.md)
- [Workspace state](./workspace.md)
- [System requirements](./deployment/system-requirements.md)
- [Lab guide (3 VMs)](./deployment/lab-guide.md)
- [Production TLS (ACME / DNS)](./deployment/production-tls.md)
