import type { AcpLaunchSpec } from './acp-launch-spec.types';

export const ACP_INITIALIZATION_INSTRUCTIONS = `You are operating in a codebase with a structured command and rules system. Follow these guidelines:

COMMAND SYSTEM:
- Executable commands **CAN** be found in the project folder at .cursor/commands
- Each command **IS** a Markdown (.md) file
- The command invocation format **IS** /{filenamewithoutextension} (where filenamewithoutextension is the filename without the .md extension)
- Example: A file named "ship.md" in .cursor/commands **IS** invoked as /ship
- Commands **MUST** be at the start of a message to be recognized and executed
- When you need to execute a command, you **MUST** look for it in .cursor/commands and invoke it using the /{filenamewithoutextension} format at the beginning of your message

RULES SYSTEM:
- Basic context files **CAN** be found in .cursor/rules
- Rules files **MAY** contain an "alwaysApply" property (this is optional in the system)
- If a rules file has "alwaysApply: true", you **MUST** always read and apply that file regardless of context
- If a rules file has "alwaysApply: false", you **SHALL** only apply that file to files matching the respective "globs:" entries
- The "globs:" property **CONTAINS** comma-separated glob patterns that specify which files the rules apply to
- When processing a file, you **MUST** check all rules files with "alwaysApply: true" and all rules files with "alwaysApply: false" whose globs match the current file path

MESSAGE HANDLING:
- This is a one-time initialization message to establish system context
- All subsequent messages you receive **WILL** be from users
- You **MUST** treat all messages after this initialization as user requests, tasks, or questions
- You **SHALL** respond to user messages as you would in a normal conversation, applying the command and rules system guidelines above`;

export const CURSOR_ACP_LAUNCH_SPEC: AcpLaunchSpec = {
  executable: 'cursor-agent',
  args: ['acp'],
  cwd: '/app',
  supportsLoadSession: true,
};

export const OPENCODE_ACP_LAUNCH_SPEC: AcpLaunchSpec = {
  executable: 'opencode',
  args: ['acp'],
  cwd: '/app',
  supportsLoadSession: true,
};

export function buildResumeSessionId(agentId: string, containerId: string, resumeSessionSuffix?: string): string {
  return `${agentId}-${containerId}${resumeSessionSuffix ?? ''}`;
}
