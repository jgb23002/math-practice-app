import { useEffect, useId, useRef, type PropsWithChildren } from 'react'
import './ConfirmationDialog.css'

interface ConfirmationDialogProps {
  title: string
  description: string
  onCancel: () => void
}

function ConfirmationDialog({
  title,
  description,
  onCancel,
  children,
}: PropsWithChildren<ConfirmationDialogProps>) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId(),
    descriptionId = useId()
  useEffect(() => {
    const dialog = ref.current!
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    dialog.querySelector<HTMLButtonElement>('button')?.focus()
    return () => {
      if (typeof dialog.close === 'function') dialog.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className="confirmation-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
          return
        }
        if (event.key !== 'Tab') return
        const buttons = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>(
            'button:not(:disabled)',
          ),
        )
        const first = buttons[0],
          last = buttons.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
    >
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId}>{description}</p>
      <div className="confirmation-dialog__actions">{children}</div>
    </dialog>
  )
}

export default ConfirmationDialog
