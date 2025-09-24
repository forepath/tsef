# BugBot Pull Request Review Guide

This guide defines the required steps and best practices for the Cursor BugBot to perform a comprehensive, rules-compliant review of a pull request (PR) in this repository. All steps **MUST** be followed in order, and all checks **MUST** be performed in alignment with the repository's ruleset.

> The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

## Rule File Structure

This guide references the following authoritative rule files. **DO NOT** duplicate rules from these files - always reference them as the source of truth:

- [Agent Guidelines](./rules/agents.mdc) - Nx workflows, PR templates, GitHub workflows
- [Application Guidelines](./rules/applications.mdc) - Application structure and boundaries
- [Domain and Library Guidelines](./rules/domains_and_libraries.mdc) - Library organization and dependencies
- [Conventional Commit Guidelines](./rules/conventional_commits.mdc) - Commit message format
- [Software Development Principles](./rules/software_develoment_principals.mdc) - Code quality principles

---

## 1. Preparation

- **Retrieve PR Details**
  - Fetch the PR description, associated issue(s), and all changed files.
  - Identify the PR’s scope (bugfix, feature, chore, etc.) and affected projects/libraries.
  - If the PR references an issue, fetch the issue details for context.

- **Load Ruleset**
  - Load and parse the following rules:
    - [`.cursor/rules/agents.mdc`](./rules/agents.mdc)
    - [`.cursor/rules/applications.mdc`](./rules/applications.mdc)
    - [`.cursor/rules/domains_and_libraries.mdc`](./rules/domains_and_libraries.mdc)
    - [`.cursor/rules/conventional_commits.mdc`](./rules/conventional_commits.mdc)
    - [`.cursor/rules/software_develoment_principals.mdc`](./rules/software_develoment_principals.mdc)
  - Ensure all referenced rules are up-to-date and applied.

---

## 2. Commit Message Compliance

- **Check Conventional Commits**
  - Each commit **MUST** follow the [Conventional Commit Guidelines](./rules/conventional_commits.mdc)
  - **Reject** PRs with non-compliant commit messages and request amendments
  - Reference the full ruleset for detailed requirements

---

## 3. Code and Structure Review

- **Application and Library Boundaries**
  - Verify that all changes respect [Application Guidelines](./rules/applications.mdc)
  - Check [Domain and Library Guidelines](./rules/domains_and_libraries.mdc)
  - Ensure all new or changed dependencies are allowed by the ruleset
  - Check for circular dependencies and recommend refactoring if found

- **Software Development Principles**
  - Code **MUST** follow [Software Development Principles](./rules/software_develoment_principals.mdc)
  - Reference the full ruleset for KISS, YAGNI, DRY, and other principles

---

## 4. Nx Workflow and Tooling Compliance

- **Nx Usage**
  - All build, test, lint, and affected analysis steps **MUST** follow [Agent Guidelines](./rules/agents.mdc) for Nx workflows
  - Reference the full ruleset for specific command requirements and validation steps

- **Validation**
  - Follow [Testing Changes](./rules/agents.mdc#testing-changes) validation workflow
  - Confirm all affected projects pass builds, tests, and lint checks

---

## 5. Pull Request Description and Template

- **PR Template**
  - Ensure the PR description follows the [PR Template Requirements](./rules/agents.mdc#pull-request-template-requirements)
  - If missing or incomplete, request the contributor to update the PR

- **Issue Linking**
  - Follow [GitHub Issue Workflow](./rules/agents.mdc#github-issue-workflow) requirements for issue references and "Fixes #ISSUE_NUMBER" format

---

## 6. Documentation and Tests

- **Documentation**
  - Check that any new features, changes, or breaking changes are reflected in the documentation
  - Follow [Internal Documentation Guidelines](./rules/internal_documentation.mdc) for documentation standards

- **Tests**
  - Follow [Testing Changes](./rules/agents.mdc#testing-changes) requirements
  - Ensure new code is covered by appropriate unit, integration, or e2e tests

---

## 7. Final Review and Feedback

- **Summarize Findings**
  - Provide a clear summary of all rule violations, required changes, and suggestions.
  - Highlight any best practices that are especially well-followed.

- **Approval or Request Changes**
  - Approve the PR only if all rules are satisfied and the code meets quality standards.
  - Otherwise, request changes with specific, actionable feedback.

---

## 8. Example Review Checklist

- [ ] All commits follow [Conventional Commit Guidelines](./rules/conventional_commits.mdc)
- [ ] Application/library boundaries and dependencies are valid per [Application](./rules/applications.mdc) and [Domain/Library Guidelines](./rules/domains_and_libraries.mdc)
- [ ] Code follows [Software Development Principles](./rules/software_develoment_principals.mdc)
- [ ] Nx workflows are used per [Agent Guidelines](./rules/agents.mdc)
- [ ] All affected projects build, test, and lint successfully
- [ ] PR description and template are complete per [Agent Guidelines](./rules/agents.mdc#pull-request-template-requirements)
- [ ] Documentation is updated as needed
- [ ] Tests are present and sufficient
- [ ] No circular dependencies or rule violations

---

**Note:** Always reference the relevant rule section when requesting changes, and provide links to documentation for contributor guidance.

---
