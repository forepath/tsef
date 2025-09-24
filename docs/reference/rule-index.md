# Rule Index

Complete reference to all development rules and guidelines. This index provides quick access to specific rules and their locations.

## 📋 Rule Categories

### 🤖 AI Agent Rules

Technical specifications for AI agent behavior and workflows.

- **[Agent Guidelines](../.cursor/rules/agents.mdc)** - How AI agents should behave and operate
- **[Application Guidelines](../.cursor/rules/applications.mdc)** - Application structure and organization rules
- **[Domain & Library Guidelines](../.cursor/rules/domains_and_libraries.mdc)** - Library organization and dependency rules
- **[Conventional Commits](../.cursor/rules/conventional_commits.mdc)** - Commit message standards and format
- **[Software Development Principles](../.cursor/rules/software_develoment_principals.mdc)** - Core development principles and practices
- **[Internal Documentation](../.cursor/rules/internal_documentation.mdc)** - Documentation interaction guidelines

### 🚀 Development Workflows

Human-readable guides for common development processes.

- **[Getting Started](../development-workflows/getting-started.md)** - Your first steps in the monorepo
- **[Operation Modes](../development-workflows/operation-modes.md)** - Plan-First vs Immediate Implementation modes
- **[GitHub Workflow](../development-workflows/github-workflow.md)** - Issue handling and PR process
- **[Validation Pipeline](../development-workflows/validation-pipeline.md)** - Code quality and testing workflow

### 🏗️ Architecture Guidelines

Structural and organizational principles for the monorepo.

- **[Monorepo Structure](../architecture/monorepo-structure.md)** - High-level organization and principles

### ✨ Best Practices

Proven approaches and quality guidelines.

- **[Code Quality](../best-practices/code-quality.md)** - Writing maintainable, high-quality code

## 🔍 Quick Rule Lookup

### By Topic

**Code Formatting**

- Rule: Always use `nx format:write` after making changes
- Location: [Agent Guidelines](../.cursor/rules/agents.mdc#code-formatting)
- Human Guide: [Validation Pipeline](../development-workflows/validation-pipeline.md#code-formatting)

**Commit Messages**

- Rule: Use conventional commit format with type, scope, and description
- Location: [Conventional Commits](../.cursor/rules/conventional_commits.mdc)
- Human Guide: [Code Quality](../best-practices/code-quality.md)

**Library Naming**

- Rule: Follow `{domain}-{scope}-{type}-{name}` pattern
- Location: [Domain & Library Guidelines](../.cursor/rules/domains_and_libraries.mdc#library-rules)
- Human Guide: [Monorepo Structure](../architecture/monorepo-structure.md#library-naming-convention)

**Dependency Rules**

- Rule: Applications depend on libraries, libraries depend on other libraries
- Location: [Domain & Library Guidelines](../.cursor/rules/domains_and_libraries.mdc#dependency-rules)
- Human Guide: [Monorepo Structure](../architecture/monorepo-structure.md#dependency-rules)

**Operation Modes**

- Rule: Use Plan-First for analysis, Immediate Implementation for fixes
- Location: [Agent Guidelines](../.cursor/rules/agents.mdc#operation-modes)
- Human Guide: [Operation Modes](../development-workflows/operation-modes.md)

### By Rule Type

**MUST Rules** (Mandatory)

- Code formatting with `nx format:write`
- Following naming conventions
- Not editing generated files
- Using Nx commands for builds and tests

**SHOULD Rules** (Recommended)

- Making focused commits
- Running validation before pushing
- Using multiple small commits for reviewability
- Keeping changes scoped to the problem

**MAY Rules** (Optional)

- Adding comments for complex logic
- Including longer commit bodies
- Using scope in commit messages
- Referencing plugin ecosystem

## 📚 Rule Hierarchy

### Precedence Order

1. **AI Agent Rules** - Technical specifications for automated behavior
2. **Architecture Guidelines** - Structural principles and organization
3. **Development Workflows** - Process and procedure guidelines
4. **Best Practices** - Recommended approaches and quality standards

### Conflict Resolution

When rules conflict:

1. **AI Agent Rules take precedence** for automated behavior
2. **Architecture Guidelines** override general practices for structural decisions
3. **Development Workflows** guide process and procedure
4. **Best Practices** provide recommendations when no specific rule exists

## 🎯 Rule Categories Explained

### Technical Rules (AI Agent Rules)

- **Purpose**: Define exact behavior for AI agents and automated systems
- **Format**: RFC 2119 compliant with MUST/SHOULD/MAY language
- **Audience**: AI agents, automated systems, developers implementing tooling
- **Examples**: Exact command usage, file editing restrictions, validation requirements

### Process Rules (Development Workflows)

- **Purpose**: Guide human developers through common processes
- **Format**: Narrative explanations with examples and context
- **Audience**: Human developers, team members, new contributors
- **Examples**: How to handle issues, when to use different modes, PR process

### Structural Rules (Architecture Guidelines)

- **Purpose**: Define how code should be organized and structured
- **Format**: Explanatory text with diagrams and examples
- **Audience**: All developers, architects, team leads
- **Examples**: Library organization, dependency patterns, naming conventions

### Quality Rules (Best Practices)

- **Purpose**: Promote high-quality, maintainable code and processes
- **Format**: Proven approaches with rationale and examples
- **Audience**: All developers, code reviewers, team members
- **Examples**: Testing strategies, code quality guidelines, review practices

## 🔄 Rule Evolution

### How Rules Change

1. **Identify Need** - New requirement or problem emerges
2. **Propose Change** - Create issue or discussion about the rule
3. **Review Impact** - Consider effects on existing code and processes
4. **Update Rules** - Modify both AI agent rules and human-readable docs
5. **Communicate Change** - Notify team of rule updates
6. **Monitor Compliance** - Ensure new rules are being followed

### Rule Maintenance

- **Regular Review** - Periodically review rules for relevance and effectiveness
- **Feedback Collection** - Gather input from developers using the rules
- **Documentation Updates** - Keep both technical and human-readable docs in sync
- **Tool Integration** - Update automated tools to enforce new rules

## 🆘 Finding Rules

### When You Need a Rule

1. **Check this index** - Look for your topic in the categories above
2. **Search the documentation** - Use your browser's search function
3. **Ask the team** - Someone else might know where to find it
4. **Check the AI agent rules** - Technical specifications are comprehensive

### Common Rule Locations

**Code Quality Issues**

- [Validation Pipeline](../development-workflows/validation-pipeline.md)
- [Code Quality](../best-practices/code-quality.md)
- [Agent Guidelines](../.cursor/rules/agents.mdc#command-and-tooling-guidelines)

**Architecture Questions**

- [Monorepo Structure](../architecture/monorepo-structure.md)
- [Domain & Library Guidelines](../.cursor/rules/domains_and_libraries.mdc)

**Process Questions**

- [Operation Modes](../development-workflows/operation-modes.md)
- [GitHub Workflow](../development-workflows/github-workflow.md)
- [Agent Guidelines](../.cursor/rules/agents.mdc#operation-modes)

**Tool Usage**

- [Quick Commands](./quick-commands.md)
- [Tools Documentation](../tools/)
- [Agent Guidelines](../.cursor/rules/agents.mdc#command-and-tooling-guidelines)

## 📖 Rule Documentation Standards

### AI Agent Rules

- Use RFC 2119 language (MUST, SHOULD, MAY)
- Be specific and unambiguous
- Include exact commands and procedures
- Reference external tools and systems

### Human-Readable Rules

- Use narrative explanations
- Provide context and rationale
- Include examples and use cases
- Explain the "why" behind the rule

### Cross-References

- Link between related rules
- Connect technical specs to human guides
- Provide navigation between rule categories
- Maintain consistency across documentation

---

This index is your starting point for finding any rule or guideline. Use it to quickly locate the information you need, whether you're looking for technical specifications or human-readable explanations.
