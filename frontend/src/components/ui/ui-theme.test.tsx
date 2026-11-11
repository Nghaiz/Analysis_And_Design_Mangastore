import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Button } from './button'
import { Checkbox } from './checkbox'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog'
import { Input } from './input'
import { Label } from './label'
import { Table, TableBody, TableCell, TableRow } from './table'
import { Textarea } from './textarea'

afterEach(cleanup)

// Paper has no round corners (.claude/rules/tiem-ui-theme.md): only rounded-paper (2px) or none.
const ROUNDED = /(?:^|\s)rounded-(?!paper\b|none\b)\S+/

function allClassNames(root: ParentNode): string[] {
  return [...root.querySelectorAll('[class]')].map((element) => element.getAttribute('class') ?? '')
}

describe('shadcn components themed for the shop', () => {
  it('use no radius larger than rounded-paper, no dark: variants, Vietnamese labels', () => {
    render(
      <div>
        <Button>Gửi</Button>
        <Button variant="outline" size="sm">
          Huỷ
        </Button>
        <Checkbox />
        <Input />
        <Label>Nhãn</Label>
        <Textarea />
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>ô</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Dialog open>
          <DialogContent>
            <DialogTitle>Tiêu đề</DialogTitle>
            <DialogDescription>Mô tả</DialogDescription>
          </DialogContent>
        </Dialog>
      </div>,
    )
    const classes = allClassNames(document.body)
    expect(classes.length).toBeGreaterThan(8)
    expect(classes.filter((c) => ROUNDED.test(c))).toEqual([])
    expect(classes.filter((c) => c.includes('dark:'))).toEqual([])
    expect(document.body.querySelector('[data-slot="dialog-close"] .sr-only')?.textContent).toBe('Đóng')
  })
})
