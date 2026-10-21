/** Only unmodified, deliberate number presses may select an answer. */
export function answerShortcutIndex(event: KeyboardEvent): number | null {
  if (
    event.defaultPrevented ||
    event.repeat ||
    event.isComposing ||
    event.keyCode === 229 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    !/^[1-4]$/.test(event.key)
  )
    return null

  // Keep editing, native selection/type-ahead, and assistive widgets intact,
  // including a nested element inside an editable ancestor.
  if (
    event.target instanceof Element &&
    event.target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"], [role="spinbutton"], [role="slider"]',
    )
  )
    return null

  return Number(event.key) - 1
}
