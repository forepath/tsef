# ACP protocol fixtures

Sample newline-delimited JSON-RPC messages for ACP v1 over stdio (illustrative):

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":1,"clientCapabilities":{"fs":{"readTextFile":true,"writeTextFile":true}},"clientInfo":{"name":"agenstra","version":"0.0.0"}}}
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":1,"agentCapabilities":{}}}
{"jsonrpc":"2.0","id":2,"method":"session/new","params":{"cwd":"/app","mcpServers":[]}}
{"jsonrpc":"2.0","id":2,"result":{"sessionId":"sess-1"}}
{"jsonrpc":"2.0","id":3,"method":"session/prompt","params":{"sessionId":"sess-1","prompt":[{"type":"text","text":"Hello"}]}}
{"jsonrpc":"2.0","method":"session/update","params":{"sessionId":"sess-1","update":{"sessionUpdate":"agent_message_chunk","content":{"type":"text","text":"Hi"}}}}
{"jsonrpc":"2.0","id":3,"result":{"stopReason":"end_turn"}}
```

See [Agent Client Protocol docs](../../../../../../../docs/agenstra/ai-agents/agent-client-protocol.md).
