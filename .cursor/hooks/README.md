# Cursor Hooks System

This directory contains the Cursor hooks system for DevKit, providing comprehensive audit logging and monitoring capabilities.

## 📁 Files

- **`audit.sh`** - Main audit script that logs all Cursor hook events
- **`README.md`** - This documentation file

## 🔧 Configuration

The hooks system is configured in `.cursor/hooks.json` and includes the following hooks:

- **`beforeShellExecution`** - Logs shell command execution
- **`beforeMCPExecution`** - Logs MCP tool usage
- **`afterFileEdit`** - Logs file modifications
- **`beforeSubmitPrompt`** - Logs prompt submissions
- **`stop`** - Logs session termination

## 📊 Audit Logging

### Log Location

- **Primary Log**: `/tmp/devkit-audit/cursor-audit.log`
- **System Log**: Available via `logger` command (if available)

### Log Format

```
[YYYY-MM-DD HH:MM:SS] [CONTEXT] <sanitized_data>
```

### Log Rotation

- **Size Limit**: 100MB per log file
- **Retention**: 10 rotated log files
- **Automatic**: Logs rotate automatically when size limit is reached

## 🔒 Security Features

### Data Sanitization

The audit script automatically sanitizes sensitive data:

- Passwords, tokens, keys, and secrets are redacted
- Pattern: `***REDACTED***`

### Enterprise Integration

- **System Logging**: Integrates with system logger for enterprise environments
- **Log Rotation**: Prevents disk space issues
- **Error Handling**: Graceful failure handling

## 🚀 Usage

The hooks system runs automatically when Cursor executes the configured hooks. No manual intervention is required.

### Manual Testing

```bash
# Test shell command logging
echo '{"command": "nx test"}' | .cursor/hooks/audit.sh beforeShellExecution

# Test MCP tool logging
echo '{"tool": "mcp_github_get_issue"}' | .cursor/hooks/audit.sh beforeMCPExecution
```

## 📈 Monitoring

### Log Analysis

```bash
# View recent audit entries
tail -f /tmp/devkit-audit/cursor-audit.log

# Search for specific events
grep "SHELL_CMD" /tmp/devkit-audit/cursor-audit.log

# Count events by type
grep -o "\[.*\]" /tmp/devkit-audit/cursor-audit.log | sort | uniq -c
```

### Enterprise Monitoring

For enterprise environments, integrate with:

- **SIEM Systems** - Forward logs to security information systems
- **Log Aggregation** - Centralize logs for analysis
- **Alerting** - Set up alerts for suspicious activities

## 🛠️ Troubleshooting

### Common Issues

1. **Permission Denied**

   ```bash
   chmod +x .cursor/hooks/audit.sh
   ```

2. **Log Directory Missing**

   ```bash
   mkdir -p /tmp/devkit-audit
   ```

3. **Hooks Not Executing**
   - Verify `.cursor/hooks.json` exists and is valid
   - Check Cursor configuration
   - Ensure audit.sh is executable

### Debug Mode

Set environment variable for verbose logging:

```bash
export DEVKIT_AUDIT_DEBUG=true
```

## 📞 Support

For issues with the hooks system:

- **General Questions**: hi@forepath.io
- **Security Concerns**: security@forepath.io
- **Technical Support**: support@forepath.io

---

**Part of the DevKit Enterprise-Ready Development Framework**
