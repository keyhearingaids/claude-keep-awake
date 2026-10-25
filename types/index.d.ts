// What the keep-awake script writes on start: its process id, when it ends
// (Unix ms) and that time as the tab shows it ("Sat 2:14 AM").
export type Awake = { pid: number; endsAt: number; label: string }

declare module 'claude-code' {
  interface PluginState {
    'keep-awake': { awake: Awake | null }
  }
}
