# Implement Command

This guide defines the **REQUIRED** steps and best practices for implementing new features in the monorepo. All contributors **MUST** follow these steps to ensure consistency, maintainability, and reliability across the codebase.

> The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119.

## 1. Context

- You **MUST** read, interpret and respect the plan.
  - A plan file reference **MAY** be provided within the chat history or as explcit reference.
  - If a plan cannot be identified, you **SHOULD** perform a plan using [Plan Guidelines](./plan.md)
- You **MAY** summarize the plan for context optimization so long as requirement is lost in the process.

## 2. Implementation

- You **MUST** implement the feature in the authoritative source files, NOT in any `generated` directories.
- You **MUST** follow the established code style, formatting, and naming conventions.
- You **MUST** use Nx generators and tooling where applicable to scaffold new libraries, components, or modules.
- You **MUST** create feature branches complying with the types referenced in [Conventional Commits](../rules/conventional_commits.mdc) (e.g., `feat/feature_name`).
- You **MUST** make focused, logically grouped commits using [Conventional Commits](../rules/conventional_commits.mdc).
- You **SHOULD** keep changes as small and reviewable as possible.
- You **MUST** update or add documentation as needed (README, code comments, etc.).
  - You **MUST** update or add the README files of any modified libraries, components, or modules.
  - You **SHOULD** update or add a high-level documentation of the feature to the root-level `docs/` directory.
  - You **MAY** generate and embed Mermaid Flowcharts and Diagrams within Markdown (`.md`) files if the complexity of the implementation requires it.
- You **MUST NOT** introduce direct dependencies between applications or violate domain boundaries.

## 3. Testing & Validation

- You **MUST** write or update unit, integration, and/or e2e tests to cover the new feature.
- You **MUST** run all relevant Nx tasks for the affected projects:
  - `nx affected -t build,test,lint`
- You **SHOULD** run formatting on changed files:
  - `nx format:check`
- You **MUST** ensure all tests pass and the codebase remains in a valid state before committing.
- You **SHOULD** run the full pre-push validation suite:
  - `nx prepush`
- If validation fails, you **MUST** resolve issues before proceeding.

## 4. Confirmation

- You **MUST** wait for confirmation before pushing the branch and commits to the git remote.
