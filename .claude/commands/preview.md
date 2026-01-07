# Preview Command

Launch Grovr Desktop preview for UI testing.

## Instructions

1. Run `./scripts/preview.sh start` in background
2. Tell the user the app is running and ask for feedback
3. If user reports issues, check the log file at the path shown in output
4. When user says they're done or closes the app, run `./scripts/preview.sh stop` to cleanup

## Log file location

`/private/tmp/grovr-preview-{worktree}/preview.log`

## Example flow

```
Claude: [runs preview.sh start in background]
Claude: "Preview is running. Please test the app and let me know if you find any issues."
User: "The button doesn't work"
Claude: [reads log file to check for errors]
Claude: "I see an error in the log..."
User: "I'm done testing"
Claude: [runs preview.sh stop]
```
