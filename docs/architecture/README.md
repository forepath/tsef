# Architecture Documentation

This section covers the architectural principles, patterns, and structural decisions that guide our monorepo development. Understanding these concepts is essential for building maintainable, scalable applications.

## Overview

Our architecture is built on **domain-driven design** principles combined with **clear separation of concerns**. This approach enables teams to work independently while maintaining consistency and reusability across the entire codebase.

## Documentation Structure

### [Monorepo Structure](./monorepo-structure.md)

Comprehensive guide to understanding how our code is organized, including:

- Application and library organization
- Domain-driven design principles
- Dependency rules and communication patterns
- Naming conventions and best practices

## Key Architectural Concepts

### Domain-Driven Design

Our monorepo is organized around **business domains** rather than technical layers. Each domain represents a bounded context with clear responsibilities:

- **Authentication Domain** - User login, sessions, security
- **User Management Domain** - Profiles, preferences, roles
- **Payment Domain** - Billing, subscriptions, transactions
- **And more...**

### Library Types

We use a consistent library structure across all domains:

- **Feature Libraries** - Business logic and workflows
- **Data-Access Libraries** - External communication and state management
- **UI Libraries** - Reusable presentational components
- **Utility Libraries** - Generic helpers and utilities

### Scope Separation

Clear boundaries between different technology scopes:

- **Frontend** - Angular applications and libraries
- **Backend** - NestJS applications and libraries
- **Native** - Mobile/desktop applications
- **Keycloak Theme** - Authentication UI customizations
- **Shared** - Cross-cutting, framework-agnostic utilities

## Related Documentation

### Development Workflows

- **[Getting Started](../development-workflows/getting-started.md)** - Start here if you're new
- **[Operation Modes](../development-workflows/operation-modes.md)** - How to approach different tasks
- **[Validation Pipeline](../development-workflows/validation-pipeline.md)** - Quality assurance processes

### Best Practices

- **[Code Quality](../best-practices/code-quality.md)** - Writing maintainable, high-quality code
- **[Architecture Guidelines](../best-practices/README.md)** - Proven architectural patterns

### Tools and Reference

- **[Development Tools](../tools/README.md)** - Tooling that supports our architecture
- **[Quick Commands](../reference/quick-commands.md)** - Essential commands for daily work
- **[Rule Index](../reference/rule-index.md)** - Complete reference to all guidelines

## Getting Started

New to our architecture? Follow this learning path:

1. **[Monorepo Structure](./monorepo-structure.md)** - Understand the big picture
2. **[Getting Started Guide](../development-workflows/getting-started.md)** - Learn the development workflow
3. **[Code Quality Guidelines](../best-practices/code-quality.md)** - Master our quality standards

## Architecture Principles

### Scalability

- **Independent Domains** - Teams can work on different domains without conflicts
- **Reusable Components** - Shared libraries reduce duplication
- **Clear Boundaries** - Well-defined interfaces prevent tight coupling

### Maintainability

- **Consistent Patterns** - Same approach across all domains
- **Single Responsibility** - Each library has a clear, focused purpose
- **Testable Design** - Architecture supports comprehensive testing

### Developer Experience

- **Clear Structure** - Easy to find and understand code
- **Powerful Tooling** - Nx provides excellent developer experience
- **Comprehensive Documentation** - Everything you need to know is documented

---

For detailed technical specifications and AI agent behavior, see the [Cursor Rules](../../.cursor/rules/) directory.
