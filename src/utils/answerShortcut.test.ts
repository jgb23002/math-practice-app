import { expect, test } from 'vitest'
import { answerShortcutIndex } from './answerShortcut'

function shortcutFrom(target: Element, options: KeyboardEventInit = {}) {
  let result: number | null = null
  target.addEventListener(
    'keydown',
    (event) => {
      result = answerShortcutIndex(event as KeyboardEvent)
    },
    { once: true },
  )
  const event = new KeyboardEvent('keydown', {
    key: '1',
    cancelable: true,
    ...options,
  })
  target.dispatchEvent(event)
  return result
}

test.each(['1', '2', '3', '4'])(
  'maps key %s to its displayed option, including the numeric keypad',
  (key) => {
    expect(
      shortcutFrom(document.createElement('button'), {
        key,
        code: `Numpad${key}`,
      }),
    ).toBe(Number(key) - 1)
  },
)

test.each(['0', '5', '9', 'Enter', ' ', 'ArrowRight', '!'])(
  'leaves key %s to its native behavior',
  (key) => {
    expect(shortcutFrom(document.createElement('button'), { key })).toBeNull()
  },
)

test.each([
  { ctrlKey: true },
  { metaKey: true },
  { altKey: true },
  { shiftKey: true },
  { repeat: true },
  { isComposing: true },
  { keyCode: 229 },
])('ignores modifiers, held keys, and composition: %j', (options) => {
  expect(shortcutFrom(document.createElement('button'), options)).toBeNull()
})

test('honors an already-handled event', () => {
  const button = document.createElement('button')
  button.addEventListener('keydown', (event) => event.preventDefault(), {
    once: true,
  })
  expect(shortcutFrom(button)).toBeNull()
})

test.each([
  '<input type="text">',
  '<input type="number">',
  '<input type="checkbox">',
  '<textarea></textarea>',
  '<select><option>1</option></select>',
  '<div contenteditable="true"><span>Typing here</span></div>',
  '<div contenteditable=""><span>Typing here</span></div>',
  '<div contenteditable="plaintext-only"><span>Typing here</span></div>',
  '<div role="textbox"><span>Editing</span></div>',
  '<div role="searchbox"></div>',
  '<div role="combobox"></div>',
  '<div role="spinbutton"></div>',
  '<div role="slider"></div>',
])('never intercepts form or editable controls: %s', (markup) => {
  const container = document.createElement('div')
  container.innerHTML = markup
  const target = container.querySelector('span') ?? container.firstElementChild!
  expect(shortcutFrom(target)).toBeNull()
})
