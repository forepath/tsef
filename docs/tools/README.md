# Development Tools

This section covers the tools, automation, and integrations that power our development workflow. These tools are designed to streamline development, enforce standards, and accelerate productivity.

## 🛠️ Available Tools

### MCP Servers (Model Context Protocol)

MCP servers provide AI agents with structured access to development tools and data:

- **[Devkit MCP Server](./devkit/mcp-proxy-architecture.md)** - Workspace insights and diagnostics
- **[GitHub MCP Server](./github-mcp-setup.md)** - GitHub integration and automation
- **[Nx MCP Server](https://nx.dev/docs/features/enhance-ai#setting-up-nx-mcp)** - Nx workspace management
- **[Repomix MCP Server](https://repomix.com/guide/)** - Code analysis and documentation

### Development Tools

- **[Nx](https://nx.dev)** - Monorepo tooling and task execution
- **[Prettier](https://prettier.io)** - Code formatting and style consistency
- **[ESLint](https://eslint.org)** - Code linting and quality checks
- **[Jest](https://jestjs.io)** - Testing framework
- **[Storybook](https://storybook.js.org)** - Component documentation and testing

### AI Agent Commands

Cursor AI commands for common development tasks:

- **[Plan Command](../../.cursor/commands/plan.md)** - Guidelines for planning features and code changes
- **[Implement Command](../../.cursor/commands/implement.md)** - Guidelines for implementing a recent plan
- **[Ship Command](../../.cursor/commands/ship.md)** - Guidelines for opening a new PR regarding an implementation

## 🚀 Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) - For running MCP servers
- [Node.js](https://nodejs.org) - For development tools
- [Git](https://git-scm.com) - For version control

### Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Configure MCP servers** (see individual setup guides)

3. **Verify tooling**:
   ```bash
   nx --version
   npx prettier --version
   npx eslint --version
   ```

## 🔧 Configuration

### Environment Variables

MCP servers require specific environment variables:

- `~/.cursor/.env` - User-level secrets and tokens
- `./.cursor/.github.env` - Project-level GitHub configuration
- `./.cursor/.devkit.env` - Devkit-specific configuration

### Tool Configuration

- **Prettier**: `.prettierrc` - Code formatting rules
- **ESLint**: `.eslintrc.json` - Linting rules and standards
- **Nx**: `nx.json` - Workspace configuration and task definitions

## 📚 Documentation

Each tool has its own documentation:

- **[Devkit MCP Server](./devkit/mcp-proxy-architecture.md)** - Workspace management and diagnostics
- **[GitHub MCP Server](./github-mcp-setup.md)** - GitHub integration setup and usage
- **[Development Workflows](../development-workflows/)** - How to use tools in your daily workflow
- **[Best Practices](../best-practices/)** - Proven approaches for using tools effectively

## 🆘 Troubleshooting

### Common Issues

**MCP Server Connection Issues**

- Check Docker is running
- Verify environment variables are set
- Check server logs for errors

**Tool Version Conflicts**

- Use `npx` to run tools with project versions
- Check `package.json` for version constraints
- Update tools regularly

**Configuration Problems**

- Validate configuration files
- Check for syntax errors
- Review tool-specific documentation

### Getting Help

- Check tool-specific documentation
- Review troubleshooting guides
- Ask the team for assistance
- Check tool issue trackers

## 🎯 Best Practices

### Using Tools Effectively

- **Keep tools updated** - Regular updates provide new features and bug fixes
- **Configure consistently** - Use the same configuration across environments
- **Automate where possible** - Let tools handle repetitive tasks
- **Monitor tool output** - Pay attention to warnings and suggestions

### Tool Integration

- **Use tools together** - They're designed to work as a cohesive system
- **Follow the workflow** - Use tools in the recommended order
- **Leverage automation** - Don't do manually what tools can automate
- **Customize when needed** - Adjust tools to fit your specific needs

---

For specific tool setup and usage instructions, see the individual tool documentation linked above.
