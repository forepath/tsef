# Validation Pipeline

Our validation pipeline ensures code quality, consistency, and reliability throughout the development process. Understanding how to use and troubleshoot the validation pipeline is essential for productive development.

## 🎯 Overview

The validation pipeline consists of multiple layers:
- **Code Formatting** - Ensures consistent code style
- **Linting** - Catches potential issues and enforces standards
- **Testing** - Validates functionality and prevents regressions
- **Build Verification** - Ensures code compiles and integrates correctly
- **Pre-push Validation** - Final check before submitting changes

## 🎨 Code Formatting

### Why Formatting Matters

Consistent code formatting:
- **Improves readability** - Makes code easier to understand
- **Reduces review time** - Reviewers focus on logic, not style
- **Prevents CI failures** - Our pipeline requires proper formatting
- **Enables better tooling** - Automated tools work better with consistent code

### Using the Formatter

**Always format your code after making changes:**

```bash
nx format:write
```

This command:
- Formats all changed files using Prettier
- Applies consistent indentation and spacing
- Ensures code meets our style guidelines
- **Must be run** - CI will fail without proper formatting

### When to Format

- **After making changes** - Before committing your code
- **Before creating PRs** - Ensure your code is ready for review
- **When CI fails** - If formatting is the issue, run this first

## 🔍 Linting

### What Linting Does

Linting catches:
- **Potential bugs** - Logic errors and common mistakes
- **Style violations** - Code that doesn't follow our standards
- **Security issues** - Vulnerable patterns and practices
- **Performance problems** - Inefficient code patterns

### Running Lints

```bash
# Lint individual projects
nx run-many -t lint -p PROJECT_NAME

# Lint affected projects
nx affected -t lint

# Lint all projects
nx run-many -t lint
```

### Common Lint Issues

**Unused imports**
- Remove imports that aren't being used
- Use your IDE's auto-import feature to avoid this

**Missing return types**
- Add explicit return types to functions
- Helps with code clarity and tooling

**Complex functions**
- Break down functions that are too complex
- Aim for single responsibility

## 🧪 Testing

### Testing Strategy

Our testing approach includes:
- **Unit tests** - Test individual components and functions
- **Integration tests** - Test how components work together
- **End-to-end tests** - Test complete user workflows
- **Visual tests** - Ensure UI components render correctly

### Running Tests

```bash
# Test individual projects
nx run-many -t test -p PROJECT_NAME

# Test affected projects
nx affected -t test

# Run end-to-end tests
nx affected -t e2e

# Test all projects
nx run-many -t test
```

### Test Best Practices

**Write meaningful tests**
- Test behavior, not implementation
- Use descriptive test names
- Focus on edge cases and error conditions

**Keep tests fast**
- Use mocks for external dependencies
- Avoid unnecessary setup and teardown
- Run tests frequently during development

**Maintain test coverage**
- Aim for high coverage of critical paths
- Don't sacrifice quality for coverage numbers
- Focus on testing the right things

## 🏗️ Build Verification

### Why Build Verification Matters

Build verification ensures:
- **Code compiles** - No syntax or type errors
- **Dependencies resolve** - All imports and references work
- **Integration works** - Components can be combined successfully
- **Production readiness** - Code can be deployed

### Running Builds

```bash
# Build individual projects
nx run-many -t build -p PROJECT_NAME

# Build affected projects
nx affected -t build

# Build all projects
nx run-many -t build
```

### Common Build Issues

**Type errors**
- Fix TypeScript type issues
- Ensure all imports are correctly typed
- Check for missing type definitions

**Dependency issues**
- Ensure all dependencies are installed
- Check for version conflicts
- Verify import paths are correct

**Configuration problems**
- Check project configuration files
- Ensure all required settings are present
- Validate environment variables

## 🚀 Pre-push Validation

### Complete Validation Suite

Before pushing your changes, run the full validation suite:

```bash
nx prepush
```

This command runs:
- Code formatting checks
- Linting for all affected projects
- All relevant tests
- Build verification
- Any other quality checks

### Handling Validation Failures

**If validation fails:**

1. **Read the error messages** - They usually tell you exactly what to fix
2. **Fix the issues** - Address each problem systematically
3. **Re-run validation** - Ensure all issues are resolved
4. **Amend your commit** - Don't add new commits just for fixes

**Common failure patterns:**

- **Formatting issues** → Run `nx format:write`
- **Lint errors** → Fix the specific linting issues
- **Test failures** → Fix the failing tests
- **Build errors** → Resolve compilation issues

## 🔄 Validation Workflow

### Recommended Development Flow

1. **Make your changes** - Implement the feature or fix
2. **Format your code** - Run `nx format:write`
3. **Test locally** - Run tests for affected projects
4. **Validate completely** - Run `nx prepush`
5. **Commit your changes** - Only after validation passes
6. **Push and create PR** - Submit your work for review

### Continuous Validation

**During development:**
- Run formatting frequently
- Test changes as you make them
- Use your IDE's linting features
- Run builds to catch issues early

**Before committing:**
- Always run the full validation suite
- Fix all issues before committing
- Don't commit broken code

## 🛠️ Troubleshooting

### Common Issues and Solutions

**"Formatting check failed"**
```bash
nx format:write
```

**"Lint check failed"**
- Read the lint error messages
- Fix the specific issues mentioned
- Re-run the lint check

**"Test failed"**
- Look at the test output for details
- Fix the failing test
- Ensure your changes don't break existing functionality

**"Build failed"**
- Check for TypeScript errors
- Verify all dependencies are available
- Ensure configuration is correct

### Getting Help

**If you can't resolve validation issues:**
- Check the error messages carefully
- Look for similar issues in the codebase
- Ask for help from the team
- Don't skip validation - it's there for a reason

## 📊 Validation Metrics

### What We Track

- **Test coverage** - Percentage of code covered by tests
- **Lint violations** - Number and severity of linting issues
- **Build success rate** - How often builds pass
- **Validation time** - How long validation takes

### Improving Validation

**To make validation faster:**
- Write focused, fast tests
- Use appropriate test types for different scenarios
- Optimize build configurations
- Cache dependencies and build artifacts

**To make validation more effective:**
- Add tests for new functionality
- Update linting rules as needed
- Improve error messages
- Add validation for new patterns

## 🎯 Success Criteria

Successful validation means:
- **All formatting checks pass** - Code follows style guidelines
- **All linting checks pass** - Code meets quality standards
- **All tests pass** - Functionality works as expected
- **All builds succeed** - Code compiles and integrates correctly
- **Validation runs quickly** - Doesn't slow down development

## 🚀 Next Steps

Now that you understand the validation pipeline:

1. **[Explore best practices](../best-practices/)** - Learn proven approaches for writing quality code
2. **[Review the architecture guides](../architecture/)** - Understand how to structure your code
3. **[Check out the tools documentation](../tools/)** - Learn about the tools that power our pipeline

---

Remember: The validation pipeline is your friend. It catches issues early, ensures consistency, and helps maintain code quality. Use it frequently and trust its feedback.
