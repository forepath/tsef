# GitHub MCP Server Setup

This guide provides step-by-step instructions for configuring and running the GitHub MCP (Monorepo Control Plane) server within your workspace. The GitHub MCP server enables advanced automation, insights, and workflow integration with GitHub, streamlining monorepo management and developer experience. By following these steps, you will ensure a secure, reliable, and maintainable setup that aligns with the monorepo’s best practices.

## Overview

The GitHub MCP server is distributed as a Docker image and is designed to be run as a containerized service. It requires specific environment variables for authentication and configuration, which are typically provided via `.env` files. The server integrates with GitHub APIs to provide features such as issue management, pull request automation, and repository insights.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running on your machine or CI environment.
- Access to the required environment variable files:
  - `~/.cursor/.env` (user-level secrets and tokens)
  - `./.cursor/.github.env` (project-level GitHub configuration)
- Sufficient permissions to pull images from [ghcr.io/github/github-mcp-server](https://github.com/orgs/github/packages/container/github-mcp-server).

## Setup

The GitHub MCP server requires several environment variables to function correctly. These are typically provided via two `.env` files:

### 1. `~/.cursor/.env`

This file should contain sensitive user-level secrets, such as your GitHub personal access token. Example:

```bash
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. `./.cursor/.github.env`

This file should contain non-sensitive MCP server configuration parameters. Example:

```bash
GITHUB_TOOLSETS=context,actions,issues,orgs,pull_requests,repos
```

This repository comes with a pre-configured set of github toolsets. A full list of available toolsets can be found in the [official github-mcp-server documentation](https://github.com/github/github-mcp-server?tab=readme-ov-file#available-toolsets).

### 3. Enable the MCP server

Enable or disable and re-enable the GitHub MCP server integration. Ensure that your environment variable files are correctly configured as described above before performing this action.

## Links

- [github-mcp-server Documentation](https://github.com/github/github-mcp-server?tab=readme-ov-file)
