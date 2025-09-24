# Troubleshooting

Common issues and their solutions. This guide helps you resolve problems quickly and get back to productive development.

## 🚨 Common Issues

### Code Formatting Problems

**Issue**: CI fails with "Formatting check failed"

**Solution**:
```bash
# Format all changed files
nx format:write

# Commit the formatted files
git add .
git commit -m "fix: format code"
```

**Prevention**: Always run `nx format:write` before committing.

---

**Issue**: Prettier conflicts with ESLint

**Solution**:
1. Ensure Prettier and ESLint are properly configured
2. Use `eslint-config-prettier` to disable conflicting rules
3. Run formatting before linting:
   ```bash
   nx format:write
   nx run-many -t lint
   ```

### Linting Issues

**Issue**: "Lint check failed" in CI

**Solution**:
```bash
# Fix linting issues automatically where possible
nx run-many -t lint --fix

# Fix remaining issues manually
nx run-many -t lint
```

**Common Lint Issues**:
- **Unused imports**: Remove unused import statements
- **Missing return types**: Add explicit return types to functions
- **Complex functions**: Break down functions that are too complex
- **Missing dependencies**: Add missing dependencies to useEffect hooks

---

**Issue**: ESLint can't find configuration

**Solution**:
```bash
# Check if .eslintrc.json exists
ls -la .eslintrc.json

# If missing, create from template
nx g @nx/angular:lib --dry-run
```

### Testing Problems

**Issue**: Tests fail after making changes

**Solution**:
1. **Read the error message** - It usually tells you exactly what's wrong
2. **Check the test output** - Look for specific failure details
3. **Run tests locally** - Don't wait for CI to catch issues
   ```bash
   nx run-many -t test -p PROJECT_NAME
   ```

**Common Test Issues**:
- **Mock not working**: Check mock setup and expectations
- **Async test not completing**: Ensure proper async/await usage
- **Component not rendering**: Check imports and dependencies
- **Snapshot mismatch**: Update snapshots if changes are intentional

---

**Issue**: Tests are slow

**Solution**:
```bash
# Run tests in watch mode for faster feedback
nx test PROJECT_NAME --watch

# Run only affected tests
nx affected -t test

# Use test.only for focused testing during development
```

### Build Failures

**Issue**: "Build failed" in CI

**Solution**:
```bash
# Build locally to see the exact error
nx run-many -t build -p PROJECT_NAME

# Check for TypeScript errors
nx run-many -t build --verbose
```

**Common Build Issues**:
- **Type errors**: Fix TypeScript type issues
- **Missing dependencies**: Install missing packages
- **Import errors**: Check import paths and exports
- **Configuration issues**: Verify project configuration

---

**Issue**: Build is slow

**Solution**:
```bash
# Use build cache
nx run-many -t build --parallel

# Build only affected projects
nx affected -t build

# Check for circular dependencies
nx graph
```

### Dependency Issues

**Issue**: "Module not found" errors

**Solution**:
```bash
# Install missing dependencies
npm install

# Check if package is in package.json
npm list PACKAGE_NAME

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

**Issue**: Version conflicts

**Solution**:
```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Use npx for project-specific versions
npx nx build PROJECT_NAME
```

### Git Issues

**Issue**: Merge conflicts

**Solution**:
```bash
# Rebase on latest main
git rebase origin/main

# Resolve conflicts manually
git mergetool

# Continue rebase
git rebase --continue
```

---

**Issue**: Commit message format errors

**Solution**:
```bash
# Fix last commit message
git commit --amend -m "feat(scope): correct message"

# For multiple commits, use interactive rebase
git rebase -i HEAD~3
```

### MCP Server Issues

**Issue**: MCP server connection failed

**Solution**:
1. **Check Docker is running**:
   ```bash
   docker --version
   docker ps
   ```

2. **Verify environment variables**:
   ```bash
   # Check if .env files exist
   ls -la ~/.cursor/.env
   ls -la ./.cursor/.github.env
   ```

3. **Restart MCP servers**:
   - Disable and re-enable in Cursor settings
   - Check server logs for errors

---

**Issue**: GitHub MCP server authentication failed

**Solution**:
1. **Check GitHub token**:
   ```bash
   # Verify token in ~/.cursor/.env
   cat ~/.cursor/.env | grep GITHUB_PERSONAL_ACCESS_TOKEN
   ```

2. **Test token manually**:
   ```bash
   gh auth status
   ```

3. **Regenerate token if needed**:
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Create new token with required permissions

### Nx Issues

**Issue**: "Project not found" errors

**Solution**:
```bash
# List all projects
nx show projects

# Check project configuration
nx show project PROJECT_NAME

# Verify project exists in workspace
cat nx.json | grep PROJECT_NAME
```

---

**Issue**: Nx commands are slow

**Solution**:
```bash
# Use Nx daemon
nx daemon --start

# Run commands in parallel
nx run-many -t build --parallel

# Use affected commands
nx affected -t build
```

## 🔧 Diagnostic Commands

### System Information

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check Nx version
nx --version

# Check Docker version
docker --version
```

### Project Status

```bash
# Check project graph
nx graph

# Show affected projects
nx affected:graph

# List all projects
nx show projects

# Check project details
nx show project PROJECT_NAME
```

### Dependency Analysis

```bash
# Check for circular dependencies
nx graph --file=graph.html

# Analyze bundle size
nx build PROJECT_NAME --analyze

# Check outdated dependencies
npm outdated
```

## 🆘 Getting Help

### When to Ask for Help

- You've tried the solutions above and they don't work
- The error message is unclear or confusing
- You're not sure what the problem is
- The issue is blocking your work

### How to Ask for Help

**Provide Context**:
- What were you trying to do?
- What error message did you get?
- What steps did you take to try to fix it?
- What environment are you using?

**Include Information**:
- Error messages (full text, not just screenshots)
- Relevant code snippets
- Steps to reproduce the issue
- System information (OS, Node version, etc.)

### Where to Get Help

- **Team chat** - For quick questions and discussions
- **GitHub issues** - For bugs and feature requests
- **Code reviews** - For code-specific questions
- **Documentation** - For process and workflow questions

## 🎯 Prevention Strategies

### Daily Practices

- **Run validation frequently** - Don't wait until the end to check your work
- **Keep dependencies updated** - Regular updates prevent version conflicts
- **Use consistent tooling** - Stick to the established tools and versions
- **Read error messages carefully** - They usually tell you exactly what to fix

### Development Workflow

- **Format code regularly** - Run `nx format:write` after making changes
- **Test as you go** - Don't wait until the end to run tests
- **Commit frequently** - Small, focused commits are easier to debug
- **Use feature branches** - Isolate your work from the main branch

### Environment Setup

- **Keep tools updated** - Regular updates provide bug fixes and improvements
- **Use consistent versions** - Ensure everyone uses the same tool versions
- **Document your setup** - Keep notes on your development environment
- **Test your setup** - Verify everything works after changes

## 📚 Additional Resources

- **[Quick Commands](./quick-commands.md)** - Essential commands for daily development
- **[Rule Index](./rule-index.md)** - Complete reference to all guidelines
- **[Validation Pipeline](../development-workflows/validation-pipeline.md)** - Understanding the quality checks
- **[Tools Documentation](../tools/)** - Detailed tool setup and usage

---

Remember: Most issues have been encountered before. Check this guide first, then ask for help with specific details about your situation.
