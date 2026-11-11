import { useCallback, useMemo, type RefObject } from 'react'

/** Identifies a real submit button of the form by its `name` and, when several share it, `value`. */
export interface SubmitterRef {
  name: string
  value?: string
}

export interface FormBridge {
  /** The form that contains the island; throws when the island is not inside one. */
  form(): HTMLFormElement
  /** Sets the value of the `index`-th control named `name` (text, date, hidden, textarea, select). */
  setValue(name: string, value: string, index?: number): void
  /** Ticks or unticks the checkbox/radio named `name` whose value is `value`. */
  setChecked(name: string, value: string, checked: boolean): void
  /**
   * Submits through `form.requestSubmit`, with the real button as submitter so its name/value
   * and formaction are sent; without a submitter the form posts back to its own action.
   */
  submit(submitter?: SubmitterRef): void
}

type ValueControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
type SubmitControl = HTMLButtonElement | HTMLInputElement

function controlsNamed(form: HTMLFormElement, name: string): Element[] {
  return Array.from(form.elements).filter((element) => element.getAttribute('name') === name)
}

function isValueControl(element: Element): element is ValueControl {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  )
}

function isSubmitControl(element: Element): element is SubmitControl {
  return (
    (element instanceof HTMLButtonElement && element.type === 'submit') ||
    (element instanceof HTMLInputElement && (element.type === 'submit' || element.type === 'image'))
  )
}

/** Tells listeners that the value changed, the way a user edit would. */
function announce(control: Element): void {
  control.dispatchEvent(new Event('input', { bubbles: true }))
  control.dispatchEvent(new Event('change', { bubbles: true }))
}

/** The form around `anchor`; throws when the island is not rendered inside one. */
export function enclosingForm(anchor: Element | null): HTMLFormElement {
  const found = anchor?.closest('form')
  if (!found) {
    throw new Error('useFormBridge: the island is not inside a <form>; JSP must render the mount point in the form.')
  }
  return found
}

export function setFormValue(form: HTMLFormElement, name: string, value: string, index = 0): void {
  const control = controlsNamed(form, name).filter(isValueControl)[index]
  if (!control) throw new Error(`useFormBridge: no control named "${name}" at index ${index} in the form.`)
  control.value = value
  announce(control)
}

export function setFormChecked(form: HTMLFormElement, name: string, value: string, checked: boolean): void {
  const control = controlsNamed(form, name).find(
    (element): element is HTMLInputElement =>
      element instanceof HTMLInputElement &&
      (element.type === 'checkbox' || element.type === 'radio') &&
      element.value === value,
  )
  if (!control) throw new Error(`useFormBridge: no checkbox or radio "${name}" with value "${value}" in the form.`)
  if (control.checked === checked) return
  control.checked = checked
  announce(control)
}

export function submitForm(form: HTMLFormElement, submitter?: SubmitterRef): void {
  if (!submitter) {
    form.requestSubmit()
    return
  }
  const button = controlsNamed(form, submitter.name)
    .filter(isSubmitControl)
    .find((element) => submitter.value === undefined || element.value === submitter.value)
  if (!button) {
    const which = submitter.value === undefined ? '' : ` with value "${submitter.value}"`
    throw new Error(`useFormBridge: no submit button "${submitter.name}"${which} in the form.`)
  }
  form.requestSubmit(button)
}

/**
 * Island side of "cách B" (docs/contracts.md §11): change the real inputs of the parent form,
 * then let the form post itself. `anchorRef` is any element the island renders inside its
 * mount point; the form is looked up on every call (never during render), so the ref may
 * still be empty while rendering.
 */
export function useFormBridge(anchorRef: RefObject<Element | null>): FormBridge {
  const form = useCallback(() => enclosingForm(anchorRef.current), [anchorRef])
  const setValue = useCallback<FormBridge['setValue']>(
    (name, value, index) => setFormValue(form(), name, value, index),
    [form],
  )
  const setChecked = useCallback<FormBridge['setChecked']>(
    (name, value, checked) => setFormChecked(form(), name, value, checked),
    [form],
  )
  const submit = useCallback<FormBridge['submit']>((submitter) => submitForm(form(), submitter), [form])
  return useMemo(() => ({ form, setValue, setChecked, submit }), [form, setValue, setChecked, submit])
}
