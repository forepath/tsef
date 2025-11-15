<p style="text-align: center;">
 <picture>
 <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/forepath/tsef/main/images/tsef-dark.svg">
 <img alt="TSEF - The AI-ready Typescript Enterprise Framework" src="https://raw.githubusercontent.com/forepath/tsef/main/images/tsef-light.svg" width="100%">
 </picture>
</p>

<div style="text-align: center;">

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Nx](https://img.shields.io/badge/powered%20by-Nx-143055?style=flat&logo=nx&logoColor=white)](https://nx.dev)
[![Cursor](https://img.shields.io/badge/Cursor-IDE-FFB500?style=flat&logo=cursor&logoColor=white)](https://www.cursor.so)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Angular](https://img.shields.io/badge/Angular-DD0031?style=flat&logo=angular&logoColor=white)](https://angular.io)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)

</div>

# The Agentic Framework for TypeScript Developers

From idea to scalable product in no time. Standardize AI-powered development workflows and start producing maintainable code in seconds. Built for developers and AI agents.

To create a new TSEF workspace run:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/forepath/tsef/refs/heads/main/install.sh)"
```

To activate Cursor hooks for this workspace, run:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/forepath/tsef/refs/heads/main/hooks.sh)"
```

To update an existing TSEF workspace, run:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/forepath/tsef/refs/heads/main/update.sh)"
```

## Documentation

### Development Workflows

- [Getting Started](./docs/development-workflows/getting-started.md) - Your first steps in the framework
- [Operation Modes](./docs/development-workflows/operation-modes.md) - Understanding different approaches to tasks
- [GitHub Workflow](./docs/development-workflows/github-workflow.md) - Issue handling and PR processes
- [Validation Pipeline](./docs/development-workflows/validation-pipeline.md) - Quality assurance and testing

### Software Architecture

- [Monorepo Structure](./docs/architecture/monorepo-structure.md) - High-level organization and principles

### Best Practices

- [Code Quality](./docs/best-practices/code-quality.md) - Writing maintainable, high-quality code

### Tools & Integration

- [Development Tools](./docs/tools/README.md) - MCP servers, automation, and integrations
- [GitHub Integration](./docs/tools/github-mcp-setup.md) - GitHub workflow automation
- [Framework MCP Server](./docs/tools/devkit/mcp-proxy-architecture.md) - Workspace insights and diagnostics

### Reference

- [Quick Commands](./docs/reference/quick-commands.md) - Essential daily commands
- [AI Agent Rules](./docs/reference/rule-index.md) - Complete reference to all guidelines
- [Troubleshooting](./docs/reference/troubleshooting.md) - Common issues and solutions

## License

This project is licensed under the **MIT License**.

Copyright (c) 2025 IPvX UG (haftungsbeschränkt)

Portions of this software were originally Copyright (c) 2017-2025 Narwhal Technologies Inc.

This program is free software: you can redistribute it and/or modify it under the terms of the MIT License. See the [LICENSE](./LICENSE) file for the full license text.

### Sublicensed Components

The following components are sublicensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**:

- [`apps/backend-agent-manager`](./apps/backend-agent-manager/) - Backend application for agent management
- [`libs/domains/framework/backend/feature-agent-manager`](./libs/domains/framework/backend/feature-agent-manager/) - Agent management feature library

These components are licensed under AGPL-3.0, which means that any modifications or derivative works must also be licensed under AGPL-3.0 and made available to users, including when accessed over a network. See the respective [backend-agent-manager application LICENSE](./apps/backend-agent-manager/LICENSE) and [feature-agent-manager library LICENSE](./libs/domains/framework/backend/feature-agent-manager/LICENSE) files for the full AGPL-3.0 license text.

The following components are sublicensed under the **Business Source License 1.1 (BUSL-1.1)**:

- [`apps/backend-agent-controller`](./apps/backend-agent-controller/) - Backend application for agent controller
- [`libs/domains/framework/backend/feature-agent-controller`](./libs/domains/framework/backend/feature-agent-controller/) - Agent controller feature library

These components are licensed under BUSL-1.1, which permits non-production use and limited production use (subject to the Additional Use Grant terms). The license will convert to AGPL-3.0 after the Change Date (three years from release date). See the respective [backend-agent-controller application LICENSE](./apps/backend-agent-controller/LICENSE) and [feature-agent-controller library LICENSE](./libs/domains/framework/backend/feature-agent-controller/LICENSE) files for the full BUSL-1.1 license text.

## Contribution

We welcome contributions! Whether you're fixing bugs, adding features, or improving documentation, your input helps make this framework better for everyone.

For detailed information on how to contribute, please see our [Contributing Guide](./CONTRIBUTING.md).

---

_Built with ❤️ for developers who want to build better software, faster._
