import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Awake } from '../types'

const DEFAULT_HOURS = 12
// 0.05 h is 3 minutes: short enough to test with.
const MIN_HOURS = 0.05
const MAX_HOURS = 24
// Named in full: the engine starts commands with a trimmed PATH, which the
// new Terminal tab inherits.
const PWSH = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe'

const awake = atom({ plugin: 'keep-awake', key: 'awake' } as const, null as Awake | null)

async function stateFile($: EngineInterface): Promise<string> {
  const base = (await $.env.get('LOCALAPPDATA')) ?? (await $.env.get('TEMP')) ?? '.'

  return `${base}\\claude-keep-awake\\status.json`
}

// The running keep-awake, or null: the status file the script wrote, its end
// still ahead, and its process still alive (closing the tab kills it without
// the script getting to delete the file).
async function check($: EngineInterface): Promise<Awake | null> {
  const path = await stateFile($)
  if (!(await $.fs.exists(path))) {
    return null
  }

  let found: Awake
  try {
    found = JSON.parse((await $.fs.read(path)).replace(/^﻿/, '')) as Awake
  } catch {
    return null
  }
  if (!Number.isInteger(found.pid) || found.endsAt <= (await $.clock.now())) {
    return null
  }

  const { stdout } = await $.process.run(
    ['tasklist', '/FI', `PID eq ${found.pid}`, '/FO', 'CSV', '/NH'],
    { timeoutMs: 10000 },
  )

  return stdout.includes(`"${found.pid}"`) ? found : null
}

async function refresh($: EngineInterface): Promise<Awake | null> {
  const now = await check($).catch(() => null)
  await update($, awake, () => now)

  return now
}

async function start($: EngineInterface, hours: number): Promise<string> {
  const running = await refresh($)
  if (running) {
    return `Keep-awake is already running, until ${running.label}. Close its tab (or /keep-awake stop) first to start a new one.`
  }

  // A command has 10 s in all; stop waiting for the tab well before that and
  // let the minute timer catch a slower start.
  const deadline = (await $.clock.now()) + 7500
  const launcher = `${$.plugin.root}\\scripts\\launch.ps1`
  const path = await stateFile($)
  try {
    const { exitCode, stderr } = await $.process.run(
      [
        PWSH, '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
        '-File', launcher, '-Hours', String(hours), '-StateFile', path,
      ],
      { timeoutMs: 6000 },
    )
    if (exitCode !== 0 && stderr.trim()) {
      return `Could not open Windows Terminal: ${stderr.trim()}`
    }
  } catch (error) {
    return `Could not open Windows Terminal: ${String(error)}`
  }

  // The tab writes its status file once PowerShell is up.
  while ((await $.clock.now()) < deadline) {
    await $.clock.sleep(500)
    const now = await refresh($)
    if (now) {
      return `Keep-awake started in a new Terminal tab, until ${now.label}. Close that tab to end it.`
    }
  }

  return 'Opening the Keep-awake tab in Windows Terminal. It has not reported in yet; run /keep-awake status in a moment to confirm.'
}

async function stop($: EngineInterface): Promise<string> {
  const running = await refresh($)
  if (!running) {
    return 'Keep-awake is not running.'
  }

  await $.process.run(['taskkill', '/PID', String(running.pid), '/F'], { timeoutMs: 10000 })
  await refresh($)

  return 'Keep-awake stopped. The laptop can sleep again.'
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'keep-awake',
      description: 'Keep the laptop awake in a visible Terminal tab (12 hours unless you give a number of hours)',
      argumentHint: '[hours | status | stop]',
    })
    void refresh($)
    $.clock.every(60000, () => {
      void refresh($)
    })

    return next(e)
  })

  on('command.run', { command: 'keep-awake' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg === 'stop') {
      return { text: await stop($) }
    }
    if (arg === 'status') {
      const now = await refresh($)

      return { text: now ? `Keep-awake is on, until ${now.label}.` : 'Keep-awake is off.' }
    }

    const hours = arg === '' ? DEFAULT_HOURS : Number(arg.replace(/h(ours?)?$/, ''))
    if (!Number.isFinite(hours) || hours < MIN_HOURS || hours > MAX_HOURS) {
      return {
        text: `Usage: /keep-awake (12 hours), /keep-awake <hours> (${MIN_HOURS} to ${MAX_HOURS}), /keep-awake status, /keep-awake stop.`,
      }
    }

    return { text: await start($, hours) }
  })

  // The dim line under the prompt: add the end time while it runs.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const now = await read($, awake)
    if (!now) {
      return next(e)
    }

    return next({ ...e, props: { ...e.props, tail: ` · awake until ${now.label}` } })
  })
}
