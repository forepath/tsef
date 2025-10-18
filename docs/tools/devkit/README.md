# Devkit MCP Server Documentation

This section covers the Devkit MCP (Model Context Protocol) server, which provides AI agents with structured access to workspace insights, diagnostics, and development tools.

## Overview

The Devkit MCP Server is a specialized tool that enables AI agents to understand and interact with our monorepo workspace. It provides comprehensive insights into project structure, dependencies, and development workflows.

## Documentation Structure

### [MCP Proxy Architecture](./mcp-proxy-architecture.md)

Detailed technical documentation covering:

- Architecture overview and design principles
- Proxy server implementation and configuration
- Integration with AI agents and development tools
- Security considerations and best practices

## Key Features

### Workspace Insights

- **Project Structure Analysis** - Understand monorepo organization
- **Dependency Mapping** - Visualize project relationships
- **Configuration Management** - Access workspace and project configurations
- **Generator Information** - Discover available code generators

### Development Diagnostics

- **Project Health Monitoring** - Identify potential issues and improvements
- **Performance Analysis** - Understand build and test performance
- **Dependency Analysis** - Track and manage project dependencies
- **Configuration Validation** - Ensure proper setup and configuration

### AI Agent Integration

- **Structured Data Access** - Provide clean, structured information to AI agents
- **Context-Aware Responses** - Deliver relevant information based on context
- **Workflow Integration** - Support development workflows and processes
- **Tool Orchestration** - Coordinate with other development tools

## Related Documentation

### Development Tools

- **[Development Tools Overview](../README.md)** - Complete tooling ecosystem
- **[GitHub MCP Server](../github-mcp-setup.md)** - GitHub integration and automation
- **[MCP Server Setup](../README.md#mcp-servers-model-context-protocol)** - General MCP server configuration

### Development Workflows

- **[Getting Started](../../development-workflows/getting-started.md)** - Your first steps in the monorepo
- **[Operation Modes](../../development-workflows/operation-modes.md)** - How to approach different tasks
- **[Validation Pipeline](../../development-workflows/validation-pipeline.md)** - Quality assurance processes

### Architecture and Best Practices

- **[Monorepo Structure](../../architecture/monorepo-structure.md)** - Understanding our code organization
- **[Code Quality](../../best-practices/code-quality.md)** - Writing maintainable, high-quality code
- **[Best Practices](../../best-practices/README.md)** - Proven approaches for common scenarios

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) - For running the MCP server
- [Node.js](https://nodejs.org) - For development tools
- [Git](https://git-scm.com) - For version control

### Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Configure environment variables**:
   - `~/.cursor/.env` - User-level secrets and tokens
   - `./.cursor/.devkit.env` - Devkit-specific configuration

3. **Start the MCP server**:
   ```bash
   # Follow the setup instructions in the architecture documentation
   ```

### Verification

```bash
# Verify the server is running and accessible
# Check logs for any connection issues
# Test basic functionality with AI agents
```

## Configuration

### Environment Variables

- **Server Configuration** - Port, host, and connection settings
- **Authentication** - Security tokens and access controls
- **Logging** - Debug and diagnostic information
- **Performance** - Optimization and caching settings

### Integration Settings

- **AI Agent Configuration** - How agents connect and interact
- **Tool Coordination** - Integration with other development tools
- **Workflow Integration** - Support for development processes
- **Security Policies** - Access controls and data protection

## Troubleshooting

### Common Issues

**Connection Problems**

- Check Docker is running
- Verify environment variables are set
- Check server logs for errors
- Validate network connectivity

**Configuration Issues**

- Validate configuration files
- Check for syntax errors
- Review environment variable setup
- Ensure proper permissions

**Performance Problems**

- Monitor resource usage
- Check caching configuration
- Review log levels
- Optimize server settings

### Getting Help

- Check the [MCP Proxy Architecture](./mcp-proxy-architecture.md) documentation
- Review [Troubleshooting](../../reference/troubleshooting.md) guide
- Ask the team for assistance
- Check server logs for detailed error information

## Best Practices

### Server Management

- **Regular Updates** - Keep the server updated with latest features
- **Monitoring** - Monitor server health and performance
- **Backup Configuration** - Keep configuration files backed up
- **Security** - Follow security best practices for MCP servers

### Integration

- **Proper Configuration** - Ensure all settings are correctly configured
- **Testing** - Test integrations before deploying to production
- **Documentation** - Keep configuration and setup documented
- **Team Coordination** - Coordinate with team members on server usage

## Architecture Benefits

### For AI Agents

- **Structured Access** - Clean, organized access to workspace information
- **Context Awareness** - Relevant information based on current context
- **Efficient Queries** - Optimized data retrieval and processing
- **Reliable Integration** - Stable, consistent interface for AI tools

### For Developers

- **Enhanced Productivity** - AI agents can provide better assistance
- **Consistent Information** - Reliable, up-to-date workspace insights
- **Automated Diagnostics** - Proactive identification of issues
- **Workflow Support** - Integration with development processes

### For Teams

- **Standardized Tooling** - Consistent AI agent capabilities across the team
- **Knowledge Sharing** - AI agents can share workspace knowledge
- **Quality Assurance** - Automated checks and validations
- **Scalable Growth** - Tooling that scales with team and project growth

---

For detailed technical specifications and AI agent behavior, see the [Cursor Rules](../../../.cursor/rules/) directory.
