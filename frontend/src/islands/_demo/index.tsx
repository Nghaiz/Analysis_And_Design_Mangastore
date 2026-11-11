// React twin of /dev/StyleGuideView.jsp (phase-05-ui-contract.md §5): every §3 component with
// the same sample data as the JSP tags, so the two renderings can be compared side by side.
// No props. Also the island the loader tests mount through the real glob registry.
import { BookCover } from '@/components/nostalgia/BookCover'
import { ConditionTag } from '@/components/nostalgia/ConditionTag'
import { LedgerTable } from '@/components/nostalgia/LedgerTable'
import { MessageBox } from '@/components/nostalgia/MessageBox'
import { PaperCard } from '@/components/nostalgia/PaperCard'
import { Stamp } from '@/components/nostalgia/Stamp'
import { Ticket } from '@/components/nostalgia/Ticket'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CONDITION_OK } from '@/lib/condition'
import { bookCode, formatMoney, rentalBillCode } from '@/lib/format'
import { RENTAL_STATUS } from '@/lib/rental-status'
import { DEMO } from './sample'

const FONT_SAMPLES = [
  { className: 'font-body', label: 'Be Vietnam Pro' },
  { className: 'font-type', label: 'Xanh Mono' },
  { className: 'font-pen', label: 'Patrick Hand' },
  { className: 'font-sign', label: 'Fraunces' },
] as const

export default function DemoStyleGuide() {
  return (
    <div className="grid gap-6">
      <Ticket title={DEMO.ticketTitle} code={rentalBillCode(DEMO.rentalBillId)}>
        <p>{DEMO.ticketBody}</p>
      </Ticket>

      <PaperCard heading={DEMO.cardHeading} taped>
        <p className="flex flex-wrap gap-4">
          <Stamp status={RENTAL_STATUS.pending} />
          <Stamp status={RENTAL_STATUS.renting} />
          <Stamp status={RENTAL_STATUS.cancelled} />
        </p>
        <p className="flex flex-wrap gap-4">
          <ConditionTag text={null} />
          <ConditionTag text={CONDITION_OK} />
          <ConditionTag text={DEMO.damageText} />
        </p>
      </PaperCard>

      <PaperCard>
        <LedgerTable caption={DEMO.ledgerCaption}>
          <thead>
            <tr>
              <th scope="col">Mã</th>
              <th scope="col">Tên đầu truyện</th>
              <th scope="col">Giá thuê</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{bookCode(DEMO.bookId)}</td>
              <td>{DEMO.bookName}</td>
              <td>{formatMoney(DEMO.rentalPrice)}</td>
            </tr>
          </tbody>
        </LedgerTable>
      </PaperCard>

      <div className="flex flex-wrap items-end gap-4">
        <BookCover bookId={DEMO.bookId} name={DEMO.bookName} size="sm" eager />
        <BookCover bookId={DEMO.bookId} name={DEMO.bookName} size="md" />
        <BookCover bookId={DEMO.bookId} name={DEMO.bookName} size="lg" />
      </div>

      <div className="grid gap-2">
        <MessageBox kind="success" text={DEMO.messages.success} />
        <MessageBox kind="error" text={DEMO.messages.error} />
        <MessageBox kind="info" text={DEMO.messages.info} />
      </div>

      <ul className="grid gap-2">
        {FONT_SAMPLES.map((font) => (
          <li key={font.className} className={font.className}>
            {font.label}: {DEMO.accentSample}
          </li>
        ))}
      </ul>

      <PaperCard heading="Điều khiển (shadcn theo chủ đề)">
        <div className="grid max-w-md gap-4">
          <Label htmlFor="demo-keyword">Tên đầu truyện</Label>
          <Input id="demo-keyword" placeholder={DEMO.bookName} />
          <Label htmlFor="demo-note">Ghi chú</Label>
          <Textarea id="demo-note" placeholder="Ố vàng ở gáy" />
          <Label htmlFor="demo-received">
            <Checkbox id="demo-received" /> Nhận
          </Label>
          <div className="flex flex-wrap gap-2">
            <Button type="button">Xác nhận</Button>
            <Button type="button" variant="outline">
              Huỷ
            </Button>
            <Button type="button" variant="destructive">
              Xoá
            </Button>
          </div>
        </div>
      </PaperCard>
    </div>
  )
}
