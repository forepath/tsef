# GitHub Workflow

Our GitHub workflow provides a structured approach to handling issues, implementing changes, and managing pull requests. This guide walks you through the complete process from issue to deployment.

## 🎯 Overview

The GitHub workflow consists of five main phases:
1. **Retrieve Issue Details** - Understand what needs to be done
2. **Plan and Analysis** - Determine the best approach
3. **Implementation** - Build the solution
4. **Validation** - Ensure quality and correctness
5. **Pull Request** - Submit your work for review

## 📋 Phase 1: Retrieve Issue Details

### Gathering Information

Start by gathering all relevant information about the issue:

```bash
# View a specific issue
gh issue view ISSUE_NUMBER

# Batch view multiple issues
gh issue list --limit 50 --json number,title,state,labels,assignees,updatedAt,body --jq '.[] | select(.number == 123 or .number == 456 or .number == 789)'

# Filter by criteria
gh issue list --label "bug" --state "open" --json number,title,body,labels --jq '.[]'
gh issue list --assignee "@me" --json number,title,body,state --jq '.[]'
```

### Key Information to Collect

- **Issue description** - What exactly needs to be done?
- **Labels and priority** - How urgent is this?
- **Comments and discussion** - What has already been discussed?
- **Related issues** - Are there dependencies or related work?
- **Reproduction steps** - For bugs, how can you reproduce the issue?

### Best Practices

- **Always provide clickable GitHub URLs** when referencing issues or PRs
- **Clone reproduction repositories** under `./tmp/repros/ISSUE_NUMBER` if needed
- **Read all comments** - important context might be in the discussion

## 🔍 Phase 2: Plan and Analysis

### Understanding the Problem

Before implementing, ensure you understand:

- **What is the current behavior?** - How does the system work now?
- **What should the expected behavior be?** - What needs to change?
- **What are the constraints?** - Are there technical or business limitations?
- **Who are the stakeholders?** - Who needs to be involved or informed?

### Identifying Affected Components

- **Which projects are involved?** - Frontend, backend, shared libraries?
- **What are the dependencies?** - What other components might be affected?
- **Are there breaking changes?** - Will this impact other teams or systems?

### Creating a Plan

Based on your analysis, create a clear implementation plan:

1. **Break down the work** into logical steps
2. **Identify dependencies** between steps
3. **Estimate effort** for each step
4. **Consider risks** and mitigation strategies
5. **Define success criteria** - How will you know it's done?

## 🛠️ Phase 3: Implementation

### Following Established Patterns

- **Use existing conventions** - Follow the patterns already established in the codebase
- **Leverage existing libraries** - Don't reinvent what already exists
- **Maintain consistency** - Keep your changes aligned with the overall architecture

### Keeping Changes Focused

- **Address the specific issue** - Don't make unrelated changes
- **Make incremental progress** - Small, focused changes are easier to review
- **Avoid scope creep** - Stick to what was requested unless explicitly asked to expand

### Code Quality

- **Write clean, readable code** - Future you (and your teammates) will thank you
- **Add appropriate tests** - Ensure your changes work and continue to work
- **Update documentation** - If you're changing behavior, update the docs

## ✅ Phase 4: Validation

### Running Tests

Always validate your changes before submitting:

```bash
# Test individual projects
nx run-many -t test,build,lint -p PROJECT_NAME

# Test affected projects
nx affected -t build,test,lint

# Run end-to-end tests
nx affected -t e2e
```

### Pre-push Validation

Run the full validation suite before committing:

```bash
nx prepush
```

### Handling Validation Failures

If validation fails:
- **Fix the issues** before proceeding
- **Amend your commit** rather than adding new commits just for fixes
- **Don't skip validation** - it's there to prevent problems

### Code Formatting

Ensure your code is properly formatted:

```bash
nx format:write
```

This is **mandatory** - the CI pipeline will fail if code isn't formatted correctly.

## 📤 Phase 5: Pull Request

### Creating the PR

When creating your pull request:

1. **Use a descriptive title** - Make it clear what the PR does
2. **Fill out the PR template completely**:
   - **Current Behavior** - What happens now
   - **Expected Behavior** - What should happen after your changes
   - **Related Issue(s)** - Link to the issue with "Fixes #ISSUE_NUMBER"

### PR Template Format

```markdown
## Current Behavior

[Describe what currently happens]

## Expected Behavior

[Describe what should happen after your changes]

## Related Issue(s)

Fixes #ISSUE_NUMBER
```

### Best Practices

- **Summarize key changes** - Help reviewers understand what you've done
- **Request appropriate reviewers** - Include people who know the affected code
- **Add screenshots** - For UI changes, show before and after
- **Link related PRs** - If this depends on or relates to other work

### PR Description Tips

- **Explain the "why"** - Not just what you changed, but why
- **Highlight breaking changes** - If any, clearly call them out
- **Include testing instructions** - How can reviewers test your changes?
- **Mention any special considerations** - Performance, security, etc.

## 🔄 Common Workflow Patterns

### Bug Fixes

1. **Reproduce the bug** - Ensure you can consistently reproduce the issue
2. **Identify the root cause** - Don't just fix symptoms
3. **Write a test** - Prevent the bug from coming back
4. **Fix the issue** - Make the minimal change needed
5. **Verify the fix** - Ensure the bug is gone and nothing else broke

### Feature Implementation

1. **Understand the requirements** - What exactly needs to be built?
2. **Design the solution** - Consider architecture and integration points
3. **Implement incrementally** - Build and test in small steps
4. **Add comprehensive tests** - Ensure the feature works as expected
5. **Update documentation** - Help others understand and use the feature

### Refactoring

1. **Identify the goal** - What are you trying to improve?
2. **Ensure test coverage** - Good tests give you confidence to refactor
3. **Make small, safe changes** - Reduce the risk of introducing bugs
4. **Validate frequently** - Run tests after each significant change
5. **Document the changes** - Explain what you changed and why

## 🚨 Troubleshooting

### Common Issues

**Validation fails after changes**
- Run `nx format:write` to fix formatting
- Check for linting errors and fix them
- Ensure all tests pass

**PR feedback requires significant changes**
- Don't be discouraged - feedback makes the code better
- Ask for clarification if feedback is unclear
- Make the requested changes and re-request review

**Merge conflicts**
- Rebase your branch on the latest main branch
- Resolve conflicts carefully
- Test after resolving conflicts

### Getting Help

- **Check the troubleshooting guide** - Common solutions are documented
- **Ask in the PR** - Use comments to get clarification
- **Reach out to the team** - Don't struggle alone

## 🎯 Success Criteria

A successful GitHub workflow results in:

- **Clear understanding** of what needs to be done
- **Well-planned implementation** that addresses the root cause
- **High-quality code** that follows established patterns
- **Thoroughly tested changes** that work as expected
- **Clear communication** through PR descriptions and comments
- **Smooth review process** with minimal back-and-forth

## 🚀 Next Steps

Now that you understand the GitHub workflow:

1. **[Learn about the validation pipeline](./validation-pipeline.md)** - Ensure your code meets quality standards
2. **[Explore best practices](../best-practices/)** - Proven approaches for common scenarios
3. **[Review the architecture guides](../architecture/)** - Understand how to structure your code

---

Remember: The GitHub workflow is about more than just code - it's about clear communication, thorough testing, and collaborative problem-solving.
