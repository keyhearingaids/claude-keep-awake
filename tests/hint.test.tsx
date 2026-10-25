import { expect, test } from 'claude-code/testing'

const HINT = {
  plugin: 'keep-awake',
  component: 'PromptHint',
  props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
} as const

// Stands for the engine: draws the hint line with whatever tail it was handed.
const engineLine = ($: any, e: any) => {
  const { Text } = $.ui.resolve(e)

  return <Text>{`${e.props.hint}${e.props.tail ?? ''}`}</Text>
}

test('the hint line is left alone while keep-awake is off', async ($, on) => {
  on('ui.render', engineLine)

  const ui = await $.ui.mount({ ...HINT, surface: 'terminal' })

  expect((await ui.find({ type: 'Text' }))?.text).toBe('? for shortcuts')
  await ui.unmount()
})

test('the hint line shows the end time while keep-awake runs', async ($, on) => {
  on('ui.render', engineLine)
  on('state.get', () => ({
    value: { value: { pid: 1234, endsAt: 4102444800000, label: 'Sat 2:14 AM' }, version: 1 },
  }))

  const ui = await $.ui.mount({ ...HINT, surface: 'terminal' })

  expect((await ui.find({ type: 'Text' }))?.text).toBe('? for shortcuts · awake until Sat 2:14 AM')
  await ui.unmount()
})
