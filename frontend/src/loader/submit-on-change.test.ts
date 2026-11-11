import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { mountIslands } from './mount-islands'
import { installSubmitOnChange, submitOnChange } from './submit-on-change'

// ConfirmRentalBillView (C3): đổi số ngày thuê thì form tự gửi về chính trang để tính lại tổng.
const PAGE = `
<form id="confirm" method="post" action="/ConfirmRentalBillView.jsp" data-submit-on-change>
  <input type="number" name="txtExpectedDays" id="txtExpectedDays" value="7">
  <textarea name="txtNote" id="txtNote"></textarea>
</form>
<form id="plain" method="post" action="/SearchBookView.jsp">
  <div data-submit-on-change><input type="number" name="txtQuantity" id="txtQuantity" value="1"></div>
  <input type="text" name="txtKeyword" id="txtKeyword">
</form>
<input type="number" name="txtOutside" id="txtOutside" form="plain" data-submit-on-change>
<div data-submit-on-change><input id="orphan" value="1"></div>`

let submitSpies: Map<string, MockInstance<HTMLFormElement['requestSubmit']>>

function byId<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id)
  if (!found) throw new Error(`test page has no #${id}`)
  return found as T
}

/** jsdom cannot make a trusted event, so the handler is driven with the two fields it reads. */
function trustedChange(target: EventTarget): Pick<Event, 'isTrusted' | 'target'> {
  return { isTrusted: true, target }
}

beforeEach(() => {
  document.body.innerHTML = PAGE
  submitSpies = new Map(
    ['confirm', 'plain'].map((id) => [id, vi.spyOn(byId<HTMLFormElement>(id), 'requestSubmit').mockImplementation(() => {})]),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('submitOnChange', () => {
  it('submits the form of a changed field when the attribute is on the form', () => {
    expect(submitOnChange(trustedChange(byId('txtExpectedDays')))).toBe(byId('confirm'))
    expect(submitSpies.get('confirm')).toHaveBeenCalledTimes(1)
    expect(submitSpies.get('confirm')).toHaveBeenCalledWith()
  })

  it('submits when the attribute is on the field or a wrapper, using the field’s owner form', () => {
    submitOnChange(trustedChange(byId('txtQuantity')))
    submitOnChange(trustedChange(byId('txtOutside')))
    expect(submitSpies.get('plain')).toHaveBeenCalledTimes(2)
  })

  it('ignores fields outside any data-submit-on-change and fields with no form', () => {
    expect(submitOnChange(trustedChange(byId('txtKeyword')))).toBeNull()
    expect(submitOnChange(trustedChange(byId('orphan')))).toBeNull()
    for (const spy of submitSpies.values()) expect(spy).not.toHaveBeenCalled()
  })

  it('ignores events an island fires itself (isTrusted === false), so the form is not sent twice', () => {
    expect(submitOnChange({ isTrusted: false, target: byId('txtExpectedDays') })).toBeNull()
    expect(submitSpies.get('confirm')).not.toHaveBeenCalled()
  })
})

describe('installSubmitOnChange', () => {
  it('always registers the same function, so the DOM keeps one listener, and drops synthetic change events', () => {
    const listen = vi.spyOn(document, 'addEventListener')
    installSubmitOnChange(document)
    installSubmitOnChange(document)
    expect(listen.mock.calls).toEqual([
      ['change', submitOnChange],
      ['change', submitOnChange],
    ])

    // dispatchEvent always builds an untrusted event: exactly what useFormBridge sends.
    byId('txtExpectedDays').dispatchEvent(new Event('change', { bubbles: true }))
    expect(submitSpies.get('confirm')).not.toHaveBeenCalled()
  })

  it('routes change events through submitOnChange', () => {
    const root = document.createElement('div')
    const listen = vi.spyOn(root, 'addEventListener')
    installSubmitOnChange(root)
    expect(listen).toHaveBeenCalledWith('change', submitOnChange)
  })
})

describe('loader wiring', () => {
  it('mountIslands installs the listener on its root even when the page has no island', async () => {
    const root = document.createElement('div')
    const listen = vi.spyOn(root, 'addEventListener')
    await mountIslands({ registry: new Map(), root, reportError: () => {} })
    expect(listen).toHaveBeenCalledWith('change', submitOnChange)
  })
})
