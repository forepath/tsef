# Quick Commands

Essential commands you'll use daily in the monorepo. Bookmark this page for quick reference.

## 🚀 Development Commands

### Code Formatting

```bash
# Format all changed files (MANDATORY - CI will fail without this)
nx format:write
```

### Testing

```bash
# Test individual projects
nx run-many -t test -p PROJECT_NAME

# Test affected projects
nx affected -t test

# Test all projects
nx run-many -t test

# Run end-to-end tests
nx affected -t e2e
```

### Building

```bash
# Build individual projects
nx run-many -t build -p PROJECT_NAME

# Build affected projects
nx affected -t build

# Build all projects
nx run-many -t build
```

### Linting

```bash
# Lint individual projects
nx run-many -t lint -p PROJECT_NAME

# Lint affected projects
nx affected -t lint

# Lint all projects
nx run-many -t lint
```

## ✅ Validation Commands

### Complete Validation

```bash
# Run full validation suite (recommended before committing)
nx prepush

# Run all checks for affected projects
nx affected -t build,test,lint

# Run all checks for specific project
nx run-many -t test,build,lint -p PROJECT_NAME
```

### Individual Checks

```bash
# Format check
nx format:check

# Lint check
nx run-many -t lint

# Test check
nx run-many -t test

# Build check
nx run-many -t build
```

## 🔍 Project Management

### Project Information

```bash
# List all projects
nx show projects

# Show project details
nx show project PROJECT_NAME

# Show project graph
nx graph

# Show affected projects
nx affected:graph
```

### Project Generation

```bash
# Generate a new library
nx g @nx/angular:lib libs/domain-scope-type-name

# Generate a new application
nx g @nx/angular:app apps/scope-name

# Generate a component
nx g @nx/angular:component components/name --project=PROJECT_NAME
```

## 🐛 Debugging Commands

### Dependency Analysis

```bash
# Show project dependencies
nx show project PROJECT_NAME --with-target=build

# Show affected projects
nx affected:apps
nx affected:libs

# Show project graph
nx graph --file=graph.html
```

### Build Analysis

```bash
# Analyze bundle size
nx build PROJECT_NAME --analyze

# Show build configuration
nx show project PROJECT_NAME --with-target=build
```

## 📊 Monitoring Commands

### Performance

```bash
# Run with performance monitoring
nx test PROJECT_NAME --verbose

# Profile build performance
nx build PROJECT_NAME --verbose
```

### Coverage

```bash
# Generate test coverage
nx test PROJECT_NAME --coverage

# View coverage report
open coverage/PROJECT_NAME/index.html
```

## 🔧 Utility Commands

### Cleanup

```bash
# Clean all build artifacts
nx reset

# Clean specific project
nx run-many -t clean -p PROJECT_NAME
```

### Dependencies

```bash
# Update dependencies
nx migrate latest

# Check for outdated dependencies
npm outdated

# Install dependencies
npm install
```

## 🚀 GitHub Integration

### Issue Management

```bash
# View specific issue
gh issue view ISSUE_NUMBER

# List issues with filters
gh issue list --label "bug" --state "open"
gh issue list --assignee "@me"

# Create new issue
gh issue create --title "Title" --body "Description"
```

### Pull Requests

```bash
# View PR
gh pr view PR_NUMBER

# List PRs
gh pr list --state "open"

# Create PR
gh pr create --title "Title" --body "Description"
```

## 🎯 Workflow Commands

### Daily Development

```bash
# 1. Start working on an issue
git checkout -b feature/issue-description

# 2. Make your changes
# ... edit files ...

# 3. Format your code
nx format:write

# 4. Test your changes
nx affected -t test

# 5. Validate everything
nx prepush

# 6. Commit your changes
git add .
git commit -m "feat(scope): description"

# 7. Push and create PR
git push origin feature/issue-description
gh pr create --title "Title" --body "Description"
```

### Emergency Fixes

```bash
# Quick fix workflow
nx format:write && nx affected -t test,build,lint && git add . && git commit -m "fix(scope): quick fix"
```

## 📝 Commit Message Templates

### Feature
```bash
git commit -m "feat(scope): add new functionality"
```

### Bug Fix
```bash
git commit -m "fix(scope): resolve issue description"
```

### Documentation
```bash
git commit -m "docs(scope): update documentation"
```

### Refactoring
```bash
git commit -m "refactor(scope): improve code structure"
```

### Breaking Change
```bash
git commit -m "feat(scope)!: breaking change description"
```

## 🆘 Emergency Commands

### When Things Go Wrong

```bash
# Reset to clean state
nx reset && npm install

# Fix formatting issues
nx format:write

# Fix linting issues
nx run-many -t lint --fix

# Rebuild everything
nx run-many -t clean && nx run-many -t build
```

### Recovery Commands

```bash
# Revert last commit (keep changes)
git reset --soft HEAD~1

# Revert last commit (discard changes)
git reset --hard HEAD~1

# Fix merge conflicts
git mergetool

# Abort merge
git merge --abort
```

## 💡 Pro Tips

### Keyboard Shortcuts

- **Ctrl+C** - Cancel running command
- **Ctrl+Z** - Suspend process (use `fg` to resume)
- **Up Arrow** - Previous command
- **Tab** - Auto-complete

### Command Combinations

```bash
# Format and test in one command
nx format:write && nx affected -t test

# Build and lint affected projects
nx affected -t build,lint

# Clean and rebuild everything
nx run-many -t clean && nx run-many -t build
```

### Useful Aliases

Add these to your shell profile (`.bashrc`, `.zshrc`, etc.):

```bash
# Development aliases
alias nxfmt='nx format:write'
alias nxtest='nx affected -t test'
alias nxbuild='nx affected -t build'
alias nxlint='nx affected -t lint'
alias nxval='nx prepush'

# Git aliases
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gpl='git pull'
```

## 🎯 Command Cheat Sheet

| Task | Command |
|------|---------|
| Format code | `nx format:write` |
| Run tests | `nx affected -t test` |
| Build projects | `nx affected -t build` |
| Lint code | `nx affected -t lint` |
| Full validation | `nx prepush` |
| Show projects | `nx show projects` |
| Generate library | `nx g @nx/angular:lib libs/name` |
| View issue | `gh issue view NUMBER` |
| Create PR | `gh pr create` |

---

Bookmark this page and keep it handy for daily development. These commands will become second nature as you work with the monorepo.
