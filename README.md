# keep-awake

A Claude Code mod for Windows. `/keep-awake` opens a visible Windows Terminal
tab named "Keep-awake" that stops the laptop from sleeping (and the screen from
turning off) for 12 hours. Closing the tab ends it at once.

- `/keep-awake`: start, 12 hours
- `/keep-awake 8`: start for another number of hours (0.05 to 24)
- `/keep-awake status`: on or off, and when it ends
- `/keep-awake stop`: end it (same as closing the tab)

While it runs, the dim line under the prompt ends with "· awake until <day time>".
Only one runs at a time. The tab keeps going if Claude Code is closed.
Requires Windows Terminal (`wt.exe`) and PowerShell 7 (`pwsh`).

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install keep-awake --marketplace keyhearingaids/claude-keep-awake
```

Answer `y` to add the marketplace, then press Enter for the user scope (every project).

From a shell:

```
claude plugin install keep-awake --marketplace keyhearingaids/claude-keep-awake
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins,
Add marketplace with `keyhearingaids/claude-keep-awake`, then Add plugin.

## How it works

`scripts/launch.ps1` opens `scripts/keep-awake.ps1` in a new Windows Terminal tab. That script calls
`SetThreadExecutionState` in a loop and writes its process id and end time to
`%LOCALAPPDATA%\claude-keep-awake\status.json`, which the mod reads to show status. Windows drops the
keep-awake request as soon as the tab's PowerShell process exits.

## License

MIT. See [LICENSE](LICENSE).
