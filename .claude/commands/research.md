# Research Command

This guide defines the **REQUIRED** steps and best practices for conducting research in the monorepo. All contributors **MUST** follow these steps to ensure comprehensive, well-documented research that can be effectively used during planning and implementation phases.

> The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

## 1. Context

- You **MUST** identify the research scope and objectives clearly.
- You **MUST** determine if research is needed before planning or if it's part of an existing plan.
- You **SHOULD** reference any existing plans, issues, or RFCs that triggered the research need.
- You **MAY** summarize the research objectives for context optimization so long as requirements are not lost in the process.

## 2. Research Execution

- You **MUST** conduct comprehensive research using multiple sources and perspectives.
- You **MUST** document all findings, sources, and methodologies used.
- You **MUST** evaluate different approaches, technologies, and solutions objectively.
- You **SHOULD** consider both technical and business implications of research findings.
- You **MUST** identify potential risks, limitations, and constraints discovered during research.
- You **SHOULD** research industry best practices, standards, and compliance requirements.
- You **MUST** investigate existing solutions, libraries, and tools that could be leveraged.
- You **SHOULD** analyze performance, security, and scalability implications.

## 3. Documentation

- You **MUST** document your research results in a Markdown (`.md`) file placed in the root-level `.research/` directory.
- The research file **MUST** be named using the format: `YYYYMMDD_HHMMSS_research_topic.md` (e.g., `.research/20240607_153000_oauth_authentication_strategies.md`), using snake_case for the research topic and a concise, descriptive topic name.
- You **MUST** use the [`template.md`](../../.research/template.md) file from the root-level `.research/` directory as the base structure for your research file. Copy its contents and fill in the relevant sections when creating new research.
- You **MUST** reference the full path to the research file in related plans, issues, pull requests, and documentation for traceability.
- You **MUST** include proper citations and references for all sources used.
- You **SHOULD** create visual diagrams, flowcharts, or comparison tables when they add value to understanding the research.
- You **MUST** document assumptions, limitations, and areas requiring further investigation.

## 4. Research Validation

- You **MUST** verify information from multiple credible sources.
- You **SHOULD** cross-reference findings with official documentation and authoritative sources.
- You **MUST** identify conflicting information and document how it was resolved.
- You **SHOULD** validate technical claims through practical examples or proof-of-concepts when feasible.
- You **MUST** document any uncertainties or areas where additional research is needed.

## 5. Integration with Planning

- You **MUST** ensure research findings are structured to support planning activities.
- You **MUST** provide clear recommendations and rationale for decisions.
- You **SHOULD** identify implementation considerations and prerequisites.
- You **MUST** document dependencies and relationships between different research findings.
- You **SHOULD** highlight critical decisions that will impact the planning phase.

## 6. Confirmation

- You **MUST** wait for confirmation before proceeding to planning or implementation phases.
- You **SHOULD** present key findings and recommendations for stakeholder review.
- You **MUST** address any questions or concerns raised during research review.
