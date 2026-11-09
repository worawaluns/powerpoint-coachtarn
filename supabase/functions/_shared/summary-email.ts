// Sales-summary emails for Coach Tarn (daily 23:00, monthly on the 1st).
// Pure: rows in, HTML out. No Deno/Supabase imports so a harness can render it with real data.
// Layout follows docs/mockups/email-summary/ (Ice approved 7 Nov 2026: "โอเคครับเอาตามนี้เลยผ่าน").

export const PRICE = 499
export const LOGO_URL = 'https://coachtarnslide.com/img/logo-email.png' // PNG: Gmail does not show SVG

export type Order = {
  name: string
  email: string
  status: string
  ref_source: string | null
  use_case: string | null
  created_at: string
  reject_reason?: string | null
  verify_detail?: { actualAmount?: number | string | null } | null
  recheck_count?: number | null
  last_recheck_at?: string | null
  slip_url?: string | null
  slipUrl?: string | null      // signed URL, set by daily-summary before rendering
}

export const isTest = (o: { ref_source: string | null }) => o.ref_source === 'internal_test'
export const emailKey = (o: { email: string }) => String(o.email || '').trim().toLowerCase()

/** Amount actually paid, read off the slip. A verified order without it was verified by hand: 499, and flagged. */
export function amountOf(o: Order): { amt: number | null; assumed: boolean } {
  const a = o.verify_detail?.actualAmount
  if (a != null && a !== '' && !isNaN(Number(a))) return { amt: Number(a), assumed: false }
  return o.status === 'verified' ? { amt: PRICE, assumed: true } : { amt: null, assumed: false }
}

export const baht = (n: number) => `฿${Math.round(n).toLocaleString('en-US')}`
/** Figure over a chart bar: 780, 1.28k (Ice, 7 Nov). */
export const shortBaht = (n: number) => n < 1000 ? String(Math.round(n)) : `${(n / 1000).toFixed(2).replace(/\.?0+$/, '')}k`

export function escHtml(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
}

const TH_DAY = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
export const TH_MONTH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']

/** Thai wall clock for a UTC timestamp, read with getUTC*. */
const bkk = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600000)
export const bkkDate = (iso: string) => bkk(iso).toISOString().slice(0, 10)
const hhmm = (iso: string) => bkk(iso).toISOString().slice(11, 16)
const dMonTime = (iso: string) => { const t = bkk(iso); return `${t.getUTCDate()} ${TH_MON[t.getUTCMonth()]} ${hhmm(iso)}` }

const REF: Record<string, string> = {
  fbbio: 'FB bio', fbpost: 'FB post', fbad: 'FB Ads', ig: 'Instagram', igbio: 'IG bio',
  line: 'LINE', tiktok: 'TikTok', google: 'Google',
}
export const refLabel = (r: string | null) => (!r || r.toLowerCase() === 'direct') ? 'FB Ads' : (REF[r.toLowerCase()] ?? r)

const USE: Record<string, string> = {
  employee: 'พนักงาน / คนทำงาน', teacher: 'ครู / วิทยากร', business: 'เจ้าของธุรกิจ',
  sales: 'งานขาย / Pitching', other: 'อื่นๆ',
}
const USE_SHORT: Record<string, string> = { employee: 'พนักงาน', sales: 'งานขาย' }
/** 'other:freetext' and 'other' are one group; null = never answered. */
export const useKey = (v: string | null) => !v ? '' : v.startsWith('other') ? 'other' : v
export const useLabel = (k: string) => k === '' ? 'ไม่ระบุ' : (USE[k] ?? k)
const useShort = (k: string) => USE_SHORT[k] ?? useLabel(k)
/** CSV keeps the free text after 'other:'. */
export function useCaseLabel(val: string | null): string {
  if (!val) return '-'
  if (val.startsWith('other:')) return `อื่นๆ (${val.slice(6) || '-'})`
  return USE[val] ?? val
}

const REASON: Record<string, string> = {
  wrong_account: 'บัญชีปลายทางไม่ตรง', wrong_amount: 'ยอดไม่ตรง', invalid_slip: 'อ่านสลิปไม่ได้',
  duplicate_slip: 'สลิปซ้ำ', trans_ref_duplicate: 'สลิปนี้ใช้ไปแล้ว',
}
const RECHECKED = ['wrong_account', 'duplicate_slip'] // recheck-slips retries these every 15 min
const DUP = ['duplicate_slip', 'trans_ref_duplicate']

// ── shared blocks ──────────────────────────────────────────────────────────
const C = { red: '#C84B2F', ink: '#2B2B2B', mute: '#8A7F7A', soft: '#A8968E', line: '#F3E2DA', bar: '#F3D5C9' }

function shell(title: string, sub: string, body: string, footer: string, logoSrc: string): string {
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#FFF6F2;font-family:'Sukhumvit Set','Noto Sans Thai','Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:24px 0;font-family:'Sukhumvit Set','Noto Sans Thai','Helvetica Neue',Arial,sans-serif;">
<tr><td align="center" style="padding:0 8px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid ${C.line};">
<tr><td style="background:${C.red};padding:16px 20px;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="middle">
      <p style="margin:0;color:#FFFFFF;font-size:17px;font-weight:800;line-height:1.6;">${title}</p>
      <p style="margin:0;color:#FBE3DA;font-size:12.5px;line-height:1.6;">${sub}</p>
    </td>
    <td valign="middle" align="right" width="76">
      <div style="background:#FFFFFF;border-radius:10px;padding:5px 7px;display:inline-block;"><img src="${logoSrc}" width="62" height="27" alt="Coach Tarn" style="display:block;border:0;"></div>
    </td>
  </tr></table>
</td></tr>
${body}
<tr><td style="padding:14px 20px;background:#FFF6F2;text-align:center;">
  <p style="margin:0;font-size:11px;color:${C.soft};line-height:1.6;">${footer}</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`
}

function headline(n: number, unit: string, rowLabel: string, total: number, totalLabel: string, assumed: number): string {
  const note = assumed > 0
    ? `<p style="margin:6px 0 0;font-size:11.5px;color:#B45309;line-height:1.6;">${assumed} ออเดอร์ไม่มียอดจากสลิป (verify มือ) คิดออเดอร์ละ ${baht(PRICE)}</p>`
    : ''
  return `<p style="margin:0;font-size:34px;font-weight:800;color:${C.ink};line-height:1.2;">${n}<span style="font-size:13px;font-weight:700;color:${C.mute};"> ${unit}</span></p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
    <tr>
      <td style="padding:6px 0;font-size:13.5px;color:#5B514C;line-height:1.6;">${rowLabel}</td>
      <td style="padding:6px 0;font-size:13.5px;font-weight:800;color:${C.ink};text-align:right;white-space:nowrap;">${baht(total)}</td>
    </tr>
    <tr>
      <td style="border-top:2px solid ${C.red};padding:9px 0 0;font-size:14px;font-weight:800;color:${C.red};line-height:1.6;">${totalLabel}</td>
      <td style="border-top:2px solid ${C.red};padding:9px 0 0;font-size:22px;font-weight:800;color:${C.red};text-align:right;white-space:nowrap;">${baht(total)}</td>
    </tr>
  </table>${note}`
}

/** Bars with shortBaht over each; nothing over an empty day. The highlighted bar is `hi`. */
function bars(items: { label: string; value: number }[], hi: number, pad: number): string {
  const max = Math.max(1, ...items.map((b) => b.value))
  const w = (100 / items.length).toFixed(1)
  const top = items.map((b, i) => {
    const col = i === hi ? C.red : C.bar, txt = i === hi ? C.red : C.soft
    const h = b.value > 0 ? Math.max(4, Math.round((b.value / max) * 56)) : 3
    const fig = b.value > 0 ? `<div style="font-size:9.5px;font-weight:700;color:${txt};text-align:center;padding-bottom:2px;white-space:nowrap;">${shortBaht(b.value)}</div>` : ''
    return `<td valign="bottom" width="${w}%" style="padding:0 ${pad}px;">${fig}<div style="height:${h}px;background:${col};border-radius:4px 4px 0 0;"></div></td>`
  }).join('')
  const lab = items.map((b, i) => `<td style="padding:3px ${pad}px 0;text-align:center;font-size:9.5px;color:${i === hi ? C.red : C.soft};${i === hi ? 'font-weight:700;' : ''}line-height:1.6;">${b.label}</td>`).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;"><tr>${top}</tr><tr>${lab}</tr></table>`
}

const sectionTitle = (t: string) => `<p style="margin:0 0 2px;font-size:12px;font-weight:800;color:${C.ink};line-height:1.6;">${t}</p>`

type Channel = { label: string; n: number; baht: number; uses?: Record<string, number> }
function channelBlock(chs: Channel[]): string {
  if (!chs.length) return ''
  const rows = chs.map((c) => {
    const uses = c.uses ? Object.entries(c.uses).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${escHtml(useShort(k))} x${n}`).join(' · ') : ''
    return `<tr><td style="padding:7px 0;border-top:1px solid ${C.line};">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="color:${C.ink};font-size:13px;font-weight:700;line-height:1.6;">${escHtml(c.label)}</td>
        <td style="color:${C.ink};font-weight:800;font-size:13px;text-align:right;white-space:nowrap;">${baht(c.baht)} <span style="color:${C.soft};font-weight:400;font-size:11px;">${c.n} รายการ</span></td>
      </tr></table>${uses ? `
      <div style="color:${C.mute};font-size:11px;line-height:1.6;">${uses}</div>` : ''}
    </td></tr>`
  }).join('')
  return `<tr><td style="padding:16px 20px 0;">
  ${sectionTitle('ช่องทาง')}
  <table width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
</td></tr>`
}

/** Verified orders grouped by channel label, money from amountOf. */
export function channelsOf(verified: Order[]): Channel[] {
  const m: Record<string, Channel> = {}
  for (const o of verified) {
    const l = refLabel(o.ref_source)
    const c = m[l] ??= { label: l, n: 0, baht: 0, uses: {} }
    c.n++; c.baht += amountOf(o).amt ?? 0
    const k = useKey(o.use_case); c.uses![k] = (c.uses![k] || 0) + 1
  }
  return Object.values(m).sort((a, b) => b.baht - a.baht || b.n - a.n)
}

// ── daily ──────────────────────────────────────────────────────────────────

/** 8 bars ending on `todayStr`, keyed on the Thai order date. Loop starts from `${todayStr}T00:00:00Z`
 *  (starting from Bangkok midnight shifted every key a day early: Diary Planner bug, 7 Nov). */
export function buildBars(todayStr: string, verified: Order[]): { d: string; baht: number }[] {
  const byDay: Record<string, number> = {}
  for (const o of verified) if (!isTest(o)) byDay[bkkDate(o.created_at)] = (byDay[bkkDate(o.created_at)] || 0) + (amountOf(o).amt ?? 0)
  const out = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date(new Date(`${todayStr}T00:00:00Z`).getTime() - i * 86400000).toISOString().slice(0, 10)
    out.push({ d, baht: byDay[d] || 0 })
  }
  return out
}

export type DailyInput = {
  todayStr: string                    // YYYY-MM-DD, Thai date
  orders: Order[]                     // every order created that Thai day
  bars: { d: string; baht: number }[] // from buildBars
  verifiedLater: Order[]              // verified by recheck during that Thai day
  logoSrc?: string
}

export function renderDaily(inp: DailyInput): { html: string; subject: string; people: number; revenue: number } {
  const orders = inp.orders.filter((o) => !isTest(o)).sort((a, b) => a.created_at.localeCompare(b.created_at))
  const verified = orders.filter((o) => o.status === 'verified')
  const paidEmails = new Set(verified.map(emailKey))
  const isDup = (o: Order) => o.status === 'rejected' && DUP.includes(o.reject_reason ?? '') && paidEmails.has(emailKey(o))
  const dupPeople = new Set(orders.filter(isDup).map(emailKey)).size

  // People who ordered and got no code today: their latest order decides rejected vs waiting
  const lastFail: Record<string, Order> = {}
  for (const o of orders) if (o.status !== 'verified' && !isDup(o) && !paidEmails.has(emailKey(o))) lastFail[emailKey(o)] = o
  const failed = Object.values(lastFail)
  const rejectedN = failed.filter((o) => o.status === 'rejected').length
  const pendingN = failed.length - rejectedN

  let revenue = 0, assumed = 0
  for (const o of verified) { const a = amountOf(o); revenue += a.amt ?? 0; if (a.assumed) assumed++ }
  const people = paidEmails.size

  // ── 2-3. headline + 8-day chart
  const best = inp.bars.reduce((a, b) => (b.baht > a.baht ? b : a), inp.bars[0])
  const caption = best && best.baht > 0
    ? `8 วันล่าสุด เฉพาะยอดไทย · สูงสุด ${best.d.slice(8, 10)}/${best.d.slice(5, 7)} ${baht(best.baht)}`
    : '8 วันล่าสุด ยังไม่มียอด'
  const top = `<tr><td style="padding:18px 20px 0;">
  ${headline(people, 'คนที่ซื้อวันนี้', `ไทย ${people} คน`, revenue, 'รวมทั้งหมด', assumed)}
  ${bars(inp.bars.map((b) => ({ label: b.d.slice(8, 10), value: b.baht })), inp.bars.length - 1, 2)}
  <p style="margin:6px 0 0;font-size:11.5px;color:${C.soft};line-height:1.6;">${caption}</p>
</td></tr>`

  // ── 6. problems / all clear + verified later
  const row = (label: string, n: number, color: string, bold: boolean) =>
    `<tr><td style="padding:7px 0;border-top:1px solid ${C.line};font-size:13px;color:${color};${bold ? 'font-weight:700;' : ''}line-height:1.6;">${label}</td><td style="padding:7px 0;border-top:1px solid ${C.line};text-align:right;font-size:13px;${bold ? 'font-weight:800;' : ''}color:${color};">${n} ราย</td></tr>`
  let status = ''
  if (rejectedN) status += row('สลิปไม่ผ่าน', rejectedN, '#C0352B', true)
  if (pendingN) status += row('รอตรวจสลิป (pending)', pendingN, '#B45309', true)
  if (!failed.length) status += `<tr><td colspan="2" style="padding:0 0 ${dupPeople ? 8 : 0}px;"><div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:10px 12px;font-size:12.5px;color:#166534;font-weight:700;line-height:1.6;">สลิปผ่านหมด ไม่มีค้าง</div></td></tr>`
  if (dupPeople) status += row('ส่งสลิปซ้ำ (ไม่นับเป็นไม่ผ่าน)', dupPeople, C.mute, false)

  const later = inp.verifiedLater.filter((o) => !isTest(o))
  const laterBox = later.length ? `
  <div style="margin-top:10px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:10px 12px;">
    <p style="margin:0;font-size:12.5px;font-weight:800;color:#1D4ED8;line-height:1.6;">verified ภายหลัง ${new Set(later.map(emailKey)).size} ราย · ${baht(later.reduce((s, o) => s + (amountOf(o).amt ?? 0), 0))}</p>
    ${later.map((o) => `<p style="margin:0;font-size:11.5px;color:#475569;line-height:1.6;">${escHtml(o.name)} · ส่งสลิป ${dMonTime(o.created_at)}${o.reject_reason ? ` (${escHtml(REASON[o.reject_reason] ?? o.reject_reason)})` : ''} ระบบตรวจซ้ำ ${o.recheck_count ?? 0} รอบ ผ่าน ${o.last_recheck_at ? dMonTime(o.last_recheck_at) : '-'} ส่งอีเมล + code แล้ว</p>`).join('\n    ')}
  </div>` : ''
  const statusBlock = `<tr><td style="padding:16px 20px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">${status}</table>${laterBox}
</td></tr>`

  // ── 7. ordered but no code
  const failRows = failed.map((o) => {
    const a = amountOf(o).amt
    const why = o.status === 'rejected'
      ? `<span style="font-size:11px;color:#B91C1C;">${escHtml(REASON[o.reject_reason ?? ''] ?? o.reject_reason ?? 'ไม่ผ่าน')}${RECHECKED.includes(o.reject_reason ?? '') ? ' ระบบจะตรวจซ้ำทุก 15 นาที' : ''}</span>`
      : `<span style="font-size:11px;color:#B45309;">${o.status === 'pending_review' ? 'รอแอดมินตรวจสลิป' : 'รอตรวจสลิป'}</span>`
    return `<tr>
        <td valign="top" style="padding:6px 0;border-top:1px solid #FDE2E2;width:42px;color:${C.mute};font-size:11.5px;line-height:1.6;">${hhmm(o.created_at)}</td>
        <td valign="top" style="padding:6px 0;border-top:1px solid #FDE2E2;font-size:12.5px;color:${C.ink};line-height:1.6;"><strong>${escHtml(o.name)}</strong><br><span style="font-size:11.5px;color:#6B6460;">${escHtml(o.email)}</span><br>${why}</td>
        <td valign="top" style="padding:6px 0;border-top:1px solid #FDE2E2;text-align:right;white-space:nowrap;font-size:12.5px;font-weight:800;color:#B91C1C;">${a != null ? `โอน ${baht(a)}` : ''}</td>
      </tr>`
  }).join('')
  const failBlock = failed.length ? `<tr><td style="padding:16px 20px 0;">
  <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:12px 13px;">
    <p style="margin:0;font-size:12.5px;font-weight:800;color:#B91C1C;line-height:1.6;">สั่งแล้วไม่สำเร็จ ${failed.length} คน</p>
    <p style="margin:0 0 6px;font-size:11px;color:${C.mute};line-height:1.6;">ยังไม่ได้ code ทักกลับทาง Messenger</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">${failRows}</table>
  </div>
</td></tr>` : ''

  // ── 9. today's customers, one row per person
  const cust: Record<string, { t: string; name: string; amt: number }> = {}
  for (const o of verified) {
    const c = cust[emailKey(o)] ??= { t: hhmm(o.created_at), name: o.name, amt: 0 }
    c.amt += amountOf(o).amt ?? 0
  }
  const custRows = Object.values(cust).map((c) =>
    `<tr><td style="padding:9px 0;border-top:1px solid ${C.line};width:42px;color:${C.soft};font-size:11.5px;">${c.t}</td><td style="padding:9px 0;border-top:1px solid ${C.line};color:${C.ink};font-size:13.5px;font-weight:700;line-height:1.6;">${escHtml(c.name)}</td><td style="padding:9px 0;border-top:1px solid ${C.line};text-align:right;white-space:nowrap;color:${C.ink};font-size:13.5px;font-weight:800;">${baht(c.amt)}</td></tr>`).join('')
  const custBlock = custRows ? `<tr><td style="padding:16px 20px 18px;">
  ${sectionTitle('ลูกค้าวันนี้')}
  <table width="100%" cellpadding="0" cellspacing="0" border="0">${custRows}</table>
</td></tr>` : '<tr><td style="padding:0 0 18px;"></td></tr>'

  // ── 10. slips (Ice 8 Nov: "สลิปไม่ขึ้นภาพมานะ"): every order of the day with a slip, by time, failed ones marked
  const slips = inp.orders.filter((o) => o.slipUrl).sort((a, b) => a.created_at.localeCompare(b.created_at))
  const slipBlock = slips.length ? `<tr><td style="padding:0 20px 18px;">
  ${sectionTitle('สลิปวันนี้')}
  ${slips.map((o) => `<div style="padding:10px 0;border-top:1px solid ${C.line};">
    <p style="margin:0 0 8px;font-size:12.5px;color:${C.ink};line-height:1.6;"><span style="color:${C.soft};">${hhmm(o.created_at)}</span>&nbsp; <b>${escHtml(o.name)}</b>${o.status === 'verified' ? '' : ` <span style="color:#B42318;font-weight:700;">· ${o.status === 'pending' ? 'รอตรวจ' : 'ไม่ผ่าน'}</span>`}</p>
    <img src="${escHtml(o.slipUrl)}" alt="สลิป ${escHtml(o.name)}" width="220" style="display:block;width:220px;max-width:100%;border-radius:10px;border:1px solid ${C.line};">
  </div>`).join('')}
</td></tr>` : ''

  const [y, m, d] = inp.todayStr.split('-').map(Number)
  const dow = TH_DAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  const sub = `${dow} ${d} ${TH_MON[m - 1]} ${y + 543} · ส่งตอน 23:00`
  const html = shell('สรุปยอดขาย Coach Tarn', sub,
    top + statusBlock + failBlock + channelBlock(channelsOf(verified)) + custBlock + slipBlock,
    'ส่งอัตโนมัติทุกวัน 23:00 น. · PowerPoint Template by Coach Tarn', inp.logoSrc ?? LOGO_URL)

  const subject = `สรุปยอดขาย ${d} ${TH_MON[m - 1]} · ${people} คน ${baht(revenue)}`
    + (failed.length ? ` · ไม่สำเร็จ ${failed.length}` : '')
    + (later.length ? ` · verified ภายหลัง ${later.length}` : '')
  return { html, subject, people, revenue }
}

// ── monthly ────────────────────────────────────────────────────────────────

export type MonthSummary = {
  ym: string                                   // YYYY-MM
  people: number; orders: number; baht: number; assumed: number
  prev: { people: number; baht: number } | null
  weeks: { from: number; to: number; baht: number; people?: number }[]
  bestDay?: { d: string; baht: number } | null
  uses: { key: string; n: number }[]           // by person
  channels: Channel[]
  verifiedLater?: number                       // people recovered by recheck
  failed: number                               // people with no code at month end
}

/** Thai-time window of a month: [start, end) in UTC ISO. */
export function monthWindow(ym: string): { start: string; end: string } {
  const [y, m] = ym.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  return { start: new Date(`${ym}-01T00:00:00+07:00`).toISOString(), end: new Date(`${next}-01T00:00:00+07:00`).toISOString() }
}

/** Week buckets Monday to Sunday, cut at the month edges (1-4, 5-11 … for Oct 2026). */
export function weekBuckets(ym: string): { from: number; to: number }[] {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const out: { from: number; to: number }[] = []
  for (let d = 1; d <= last; d++) {
    if (d === 1 || new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 1) out.push({ from: d, to: d })
    else out[out.length - 1].to = d
  }
  return out
}

/** rows: every order created in the month (any status). prev: verified orders of the month before. */
export function summarizeMonth(ym: string, rows: Order[], prev: Order[] | null): MonthSummary {
  const all = rows.filter((o) => !isTest(o))
  const verified = all.filter((o) => o.status === 'verified')
  const paid = new Set(verified.map(emailKey))
  let baht = 0, assumed = 0
  const byDay: Record<string, number> = {}
  const weeks = weekBuckets(ym).map((w) => ({ ...w, baht: 0, emails: new Set<string>() }))
  const firstUse: Record<string, string> = {}
  for (const o of verified) {
    const a = amountOf(o); baht += a.amt ?? 0; if (a.assumed) assumed++
    const day = bkkDate(o.created_at)
    byDay[day] = (byDay[day] || 0) + (a.amt ?? 0)
    const w = weeks.find((w) => Number(day.slice(8, 10)) <= w.to)!
    w.baht += a.amt ?? 0; w.emails.add(emailKey(o))
    if (!(emailKey(o) in firstUse)) firstUse[emailKey(o)] = useKey(o.use_case)
  }
  const useN: Record<string, number> = {}
  for (const k of Object.values(firstUse)) useN[k] = (useN[k] || 0) + 1
  const bestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]
  const isDup = (o: Order) => o.status === 'rejected' && DUP.includes(o.reject_reason ?? '') && paid.has(emailKey(o))
  const pv = prev?.filter((o) => !isTest(o) && o.status === 'verified') ?? null
  return {
    ym, people: paid.size, orders: verified.length, baht, assumed,
    prev: pv ? { people: new Set(pv.map(emailKey)).size, baht: pv.reduce((s, o) => s + (amountOf(o).amt ?? 0), 0) } : null,
    weeks: weeks.map(({ from, to, baht, emails }) => ({ from, to, baht, people: emails.size })),
    bestDay: bestDay ? { d: bestDay[0], baht: bestDay[1] } : null,
    uses: Object.entries(useN).map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n),
    channels: channelsOf(verified),
    verifiedLater: new Set(verified.filter((o) => (o.recheck_count ?? 0) > 0).map(emailKey)).size,
    failed: new Set(all.filter((o) => o.status !== 'verified' && !isDup(o) && !paid.has(emailKey(o))).map(emailKey)).size,
  }
}

export function renderMonthly(s: MonthSummary, filename: string, logoSrc = LOGO_URL): { html: string; subject: string } {
  const [y, m] = s.ym.split('-').map(Number)
  const mon = TH_MON[m - 1], monthName = `${TH_MONTH[m - 1]} ${y + 543}`
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const sendMon = TH_MON[m % 12]

  let compare = ''
  if (s.prev && s.prev.baht > 0) {
    const diff = s.baht - s.prev.baht, pct = Math.round((diff / s.prev.baht) * 100)
    const up = diff >= 0
    const [bg, bd, fg, sub] = up ? ['#F0FDF4', '#BBF7D0', '#166534', '#4B6B55'] : ['#FEF2F2', '#FECACA', '#B91C1C', '#7F4B4B']
    const pm = m === 1 ? 12 : m - 1
    compare = `
  <div style="margin-top:10px;background:${bg};border:1px solid ${bd};border-radius:10px;padding:10px 12px;">
    <p style="margin:0;font-size:12.5px;font-weight:800;color:${fg};line-height:1.6;">${up ? 'เพิ่มขึ้น' : 'ลดลง'} ${baht(Math.abs(diff))} (${up ? '+' : '−'}${Math.abs(pct)}%) จากเดือน${TH_MONTH[pm - 1]}</p>
    <p style="margin:0;font-size:11.5px;color:${sub};line-height:1.6;">${TH_MON[pm - 1]} ${baht(s.prev.baht)} · ${s.prev.people} คน &nbsp;|&nbsp; ${mon} ${baht(s.baht)} · ${s.people} คน</p>
  </div>`
  }
  const top = `<tr><td style="padding:18px 20px 0;">
  ${headline(s.people, 'คนที่ซื้อเดือนนี้', `${s.orders} ออเดอร์`, s.baht, 'รวมทั้งเดือน', s.assumed)}${compare}
</td></tr>`

  const bw = s.weeks.reduce((bi, w, i) => (w.baht > s.weeks[bi].baht ? i : bi), 0)
  const bwk = s.weeks[bw]
  const capParts = []
  if (bwk && bwk.baht > 0) capParts.push(`สัปดาห์ที่ดีที่สุด ${bwk.from}-${bwk.to} ${mon} ${baht(bwk.baht)}${bwk.people != null ? ` (${bwk.people} คน)` : ''}`)
  if (s.bestDay) capParts.push(`วันที่ขายดีสุด ${Number(s.bestDay.d.slice(8, 10))}/${Number(s.bestDay.d.slice(5, 7))} ${baht(s.bestDay.baht)}`)
  const weeks = s.weeks.length ? `<tr><td style="padding:16px 20px 0;">
  <p style="margin:0 0 6px;font-size:12px;font-weight:800;color:${C.ink};line-height:1.6;">ยอดรายสัปดาห์</p>
  ${bars(s.weeks.map((w) => ({ label: w.from === w.to ? `${w.from}` : `${w.from}-${w.to}`, value: w.baht })), bwk && bwk.baht > 0 ? bw : -1, 6).replace('margin-top:14px;', '')}
  ${capParts.length ? `<p style="margin:6px 0 0;font-size:11.5px;color:${C.soft};line-height:1.6;">${capParts.join(' · ')}</p>` : ''}
</td></tr>` : ''

  const totalUse = s.uses.reduce((a, u) => a + u.n, 0) || 1
  const uses = s.uses.length ? `<tr><td style="padding:16px 20px 0;">
  ${sectionTitle('ลูกค้าทำงานอะไร')}
  <table width="100%" cellpadding="0" cellspacing="0" border="0">${s.uses.map((u, i) => {
    const pct = Math.round((u.n / totalUse) * 100)
    return `
    <tr><td style="padding:7px 0 2px;border-top:1px solid ${C.line};font-size:13px;font-weight:700;color:${C.ink};line-height:1.6;">${escHtml(useLabel(u.key))}</td><td style="padding:7px 0 2px;border-top:1px solid ${C.line};text-align:right;font-size:13px;font-weight:800;color:${C.ink};white-space:nowrap;">${u.n} <span style="color:${C.soft};font-weight:400;font-size:11px;">${pct}%</span></td></tr>
    <tr><td colspan="2" style="padding:0 0 7px;"><div style="background:#FBEDE7;border-radius:3px;height:5px;"><div style="width:${pct}%;background:${i === 0 ? C.red : '#E39478'};height:5px;border-radius:3px;"></div></div></td></tr>`
  }).join('')}
  </table>
</td></tr>` : ''

  const srow = (label: string, n: number, color: string) => `<tr><td style="padding:7px 0;border-top:1px solid ${C.line};font-size:13px;color:${color};font-weight:700;line-height:1.6;">${label}</td><td style="padding:7px 0;border-top:1px solid ${C.line};text-align:right;font-size:13px;font-weight:800;color:${color};">${n} ราย</td></tr>`
  const slips = (s.verifiedLater != null ? srow('verified ภายหลัง (ระบบตรวจซ้ำกู้คืน)', s.verifiedLater, '#1D4ED8') : '')
    + srow('สั่งแล้วไม่สำเร็จ สิ้นเดือน', s.failed, '#C0352B')

  const csv = `<tr><td style="padding:16px 20px 18px;">
  <div style="background:#FFF6F2;border:1px solid ${C.bar};border-radius:12px;padding:12px 14px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="top" width="30" style="padding-top:2px;">
        <div style="width:20px;height:24px;border:2px solid ${C.red};border-radius:4px;font-size:8px;font-weight:800;color:${C.red};text-align:center;line-height:24px;">CSV</div>
      </td>
      <td valign="top">
        <p style="margin:0;font-size:13px;font-weight:800;color:${C.ink};line-height:1.6;">แนบไฟล์ ${escHtml(filename)}</p>
        <p style="margin:0;font-size:11.5px;color:#6B6460;line-height:1.6;">${s.orders} ออเดอร์ เปิดด้วย Excel ได้เลย มีวันที่ เวลา ชื่อ อีเมล Redeem Code ใช้งานล่าสุด ช่องทาง อาชีพ ยอด</p>
      </td>
    </tr></table>
  </div>
</td></tr>`

  const html = shell(`สรุปยอดเดือน${monthName}`, `1-${last} ${mon} · ส่ง 1 ${sendMon} 08:00`,
    top + weeks + uses + channelBlock(s.channels) + `<tr><td style="padding:16px 20px 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">${slips}</table>
</td></tr>` + csv,
    'ส่งอัตโนมัติทุกวันที่ 1 ของเดือน 08:00 น. · PowerPoint Template by Coach Tarn', logoSrc)
  return { html, subject: `สรุปยอดเดือน${monthName}: ${s.people} คน · ${baht(s.baht)}` }
}
