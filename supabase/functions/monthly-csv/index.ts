import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encodeBase64 } from 'https://deno.land/std@0.208.0/encoding/base64.ts'
import { amountOf, isTest, monthWindow, renderMonthly, summarizeMonth, useCaseLabel, type Order } from '../_shared/summary-email.ts'

// ── Cron: วันที่ 1 ของทุกเดือน 08:00 (Bangkok) = 01:00 UTC ─────────────────
// ตั้งใน Supabase → Edge Functions → Schedule: "0 1 1 * *"
// หน้าตาอีเมลตาม docs/mockups/email-summary/monthly.html (ไอซ์ผ่าน 7 พ.ย. 2569)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const OWNER_EMAIL    = Deno.env.get('OWNER_EMAIL')!

const FROM_EMAIL = 'Coach Tarn Slide · Report <noreply@coachtarnslide.com>'
const COLS = 'name, email, status, ref_source, use_case, created_at, reject_reason, verify_detail, recheck_count'

const prevYm = (ym: string) => {
  const [y, m] = ym.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

/** CSV columns unchanged; ยอด (฿) is now the amount on the slip (499 only for hand-verified orders). */
function buildCsv(rows: any[]): string {
  const thDate = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })
  const header = 'ลำดับ,วันที่,เวลา,ชื่อ,อีเมล,Redeem Code,ใช้งานล่าสุด,ช่องทาง,ด้านการใช้งาน,ยอด (฿)\n'
  const body = rows.map((o, i) => {
    const time = new Date(o.created_at).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })
    const rc = o.redeem_codes?.[0]
    const lastUsed = rc?.last_used_at ? thDate(rc.last_used_at) : 'ยังไม่ได้ใช้'
    const q = (s: string) => `"${String(s ?? '').replace(/"/g, '""')}"`
    return `${i + 1},${thDate(o.created_at)},${time},${q(o.name)},${q(o.email)},${rc?.code ?? '-'},${lastUsed},${o.ref_source ?? 'direct'},${q(useCaseLabel(o.use_case))},${amountOf(o).amt}`
  }).join('\n')
  return '﻿' + header + body  // BOM สำหรับ Excel ภาษาไทย
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── optional override_month สำหรับ test (YYYY-MM) ───────────────────────
    let body: any = {}
    try { body = await req.json() } catch { /* cron has no body */ }
    const om = body?.override_month
    const ym: string = (typeof om === 'string' && /^\d{4}-\d{2}$/.test(om))
      ? om
      : prevYm(new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 7))

    // เดือนตามเวลาไทย (วันที่ 1 00:00 ไทย = 17:00Z ของวันก่อน)
    const cur = monthWindow(ym), prev = monthWindow(prevYm(ym))
    const { data: rows, error: e1 } = await supabase.from('orders')
      .select(`${COLS}, redeem_codes ( code, last_used_at )`)
      .gte('created_at', cur.start).lt('created_at', cur.end)
      .order('created_at', { ascending: true })
    if (e1) throw e1
    const { data: prevRows, error: e2 } = await supabase.from('orders').select(COLS)
      .eq('status', 'verified').gte('created_at', prev.start).lt('created_at', prev.end)
    if (e2) throw e2

    const all = ((rows ?? []) as any[]).filter((o) => !isTest(o))
    const summary = summarizeMonth(ym, all as Order[], (prevRows ?? []) as Order[])
    const filename = `coachtarn-${ym}.csv`
    const { html, subject } = renderMonthly(summary, filename)
    const csv = buildCsv(all.filter((o) => o.status === 'verified'))

    const resendRes = await fetch('https://api.resend.com/emails', {
      method : 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL, to: [OWNER_EMAIL], subject, html,
        attachments: [{ filename, content: encodeBase64(new TextEncoder().encode(csv)) }],
      }),
    })
    if (!resendRes.ok) throw new Error(`Resend ${resendRes.status}: ${await resendRes.text()}`)

    console.log(`Monthly CSV sent ${ym}: ${summary.people} people, ${summary.orders} orders, ฿${summary.baht}`)
    return new Response('ok', { status: 200 })

  } catch (err) {
    console.error('monthly-csv error:', err)
    return new Response('error', { status: 500 })
  }
})
