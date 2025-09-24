# Operation Modes

Our development process uses two distinct operation modes to handle different types of tasks effectively. Understanding when and how to use each mode is crucial for productive development.

## 🎯 Overview

The operation modes are designed to match the natural flow of different types of work:

- **Plan-First Mode** - For understanding, analyzing, and planning
- **Immediate Implementation Mode** - For direct fixes and implementations
- **Mixed-Mode** - For tasks that require both analysis and implementation

## 📋 Plan-First Mode

### When to Use

Use Plan-First Mode when you encounter requests that involve:
- **Analysis** - "analyze this issue"
- **Investigation** - "investigate why this is happening"
- **Assessment** - "assess the impact of this change"
- **Review** - "review this code"
- **Examination** - "examine this problem"
- **Planning** - "plan this feature"
- **Ambiguous requests** - When you're not sure what's needed

### The Process

1. **Analyze the issue in detail**
   - Understand the problem thoroughly
   - Identify affected components
   - Consider potential solutions

2. **Produce a clear implementation plan**
   - Break down the work into actionable steps
   - Identify dependencies and risks
   - Estimate effort and timeline

3. **Post the plan for review**
   - Present your findings and proposed approach
   - Wait for confirmation before proceeding
   - Incorporate feedback into your plan

### Example Scenarios

- **Bug Investigation**: "The login page is slow - investigate why"
- **Feature Planning**: "We need a new user dashboard - plan the implementation"
- **Code Review**: "Review this PR for potential issues"
- **Architecture Assessment**: "Assess the impact of migrating to a new framework"

## ⚡ Immediate Implementation Mode

### When to Use

Use Immediate Implementation Mode for requests that involve:
- **Fixes** - "fix this bug"
- **Implementation** - "implement this feature"
- **Solving** - "solve this problem"
- **Building** - "build this component"
- **Creating** - "create this service"
- **Updating** - "update this functionality"
- **Adding** - "add this feature"
- **Explicit action requests** - When immediate action is clearly needed

### The Process

1. **Perform a concise analysis**
   - Quickly understand the requirements
   - Identify the scope of work
   - Plan your approach

2. **Implement the complete solution**
   - Write the code
   - Add necessary tests
   - Update documentation

3. **Make focused commits**
   - Use multiple small commits for reviewability
   - Each commit should represent one logical change
   - Write clear commit messages

4. **Run tests and validations**
   - Execute the full test suite
   - Run linting and formatting checks
   - Validate your changes work as expected

5. **Handle failures gracefully**
   - If tests fail, iterate up to three times to resolve
   - If you can't fix it in three attempts, escalate for help

6. **Submit your work**
   - Push your branch
   - Create a pull request with "Fixes #ISSUE_NUMBER"
   - Provide a clear description of your changes

### Example Scenarios

- **Bug Fixes**: "Fix the validation error on the contact form"
- **Feature Implementation**: "Add dark mode toggle to the settings page"
- **Quick Updates**: "Update the API endpoint to return the new field"
- **Component Creation**: "Create a reusable button component"

## 🔄 Mixed-Mode Guidelines

### When You Encounter Both

Some requests contain both analysis and implementation keywords:
- "analyze and fix this issue"
- "review and implement this feature"
- "investigate and solve this problem"

### The Approach

1. **Analysis takes precedence**
   - Always start with Plan-First Mode for the analysis portion
   - Understand the problem completely before implementing

2. **Implementation follows**
   - After presenting your analysis, proceed with Immediate Implementation Mode
   - Use the insights from your analysis to guide implementation

3. **Sequential execution**
   - Complete the analysis phase before beginning implementation
   - Don't mix analysis and implementation in the same response

### Example Workflow

For "analyze and fix the login performance issue":

1. **First**: Analyze the login performance problem
   - Identify bottlenecks
   - Measure current performance
   - Present findings and proposed solutions

2. **Then**: Wait for confirmation or proceed with implementation
   - Get approval for your proposed approach
   - Or proceed if the analysis is clear enough

3. **Finally**: Implement the solution
   - Apply the fixes identified in your analysis
   - Test the improvements
   - Submit the changes

## 🤔 Decision Making

### When in Doubt

If you're unsure which mode to use:
- **Default to Plan-First Mode** - It's better to plan than to implement incorrectly
- **Ask for clarification** - Request more specific instructions
- **Consider the complexity** - Complex tasks usually benefit from planning first

### Quick Decision Guide

| Request Type | Mode | Reason |
|-------------|------|--------|
| "Fix this bug" | Immediate Implementation | Clear action needed |
| "Analyze this issue" | Plan-First | Understanding required |
| "Implement user auth" | Plan-First | Complex, needs planning |
| "Update this text" | Immediate Implementation | Simple, direct change |
| "Review this code" | Plan-First | Analysis and feedback needed |
| "Add this field" | Immediate Implementation | Clear, simple addition |

## 💡 Best Practices

### For Plan-First Mode
- **Be thorough** in your analysis
- **Provide actionable insights** not just observations
- **Consider multiple solutions** and their trade-offs
- **Estimate effort** and identify risks

### For Immediate Implementation Mode
- **Keep commits small** and focused
- **Test frequently** during development
- **Don't skip validation** - it prevents issues later
- **Write clear commit messages** for better history

### For Mixed-Mode
- **Separate analysis from implementation** clearly
- **Use insights from analysis** to guide implementation
- **Don't rush** - thorough analysis leads to better implementation

## 🚀 Next Steps

Now that you understand the operation modes:

1. **[Learn the GitHub workflow](./github-workflow.md)** - How to handle issues and PRs
2. **[Master the validation pipeline](./validation-pipeline.md)** - Ensure code quality
3. **[Explore best practices](../best-practices/)** - Proven approaches for common scenarios

---

Remember: The goal is to match your approach to the type of work you're doing. Plan when you need to understand, implement when you know what to do.
