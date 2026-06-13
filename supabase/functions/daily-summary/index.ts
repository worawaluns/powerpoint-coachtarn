import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Cron: ทุกวัน 23:00 น. (Bangkok) = 16:00 UTC ─────────────────────────────
// ตั้งใน Supabase → Edge Functions → Schedule: "0 16 * * *"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const OWNER_EMAIL    = Deno.env.get('OWNER_EMAIL')!

const FROM_EMAIL = 'Coach Tarn Slide · Report <noreply@coachtarnslide.com>'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── optional override_date สำหรับ test (YYYY-MM-DD, BKK timezone) ────────
    let body: any = {}
    try { body = await req.json() } catch { /* cron has no body */ }
    const overrideDate: string | undefined = body?.override_date

    // ── Query ยอดวันนี้ (Asia/Bangkok = UTC+7) ──────────────────────────────
    const now    = overrideDate ? new Date(`${overrideDate}T16:00:00Z`) : new Date()
    const nowBKK = new Date(now.getTime() + 7 * 3600000)
    const y = nowBKK.getUTCFullYear(), m = nowBKK.getUTCMonth(), d = nowBKK.getUTCDate()
    // 00:00:00 BKK = UTC - 7h
    const startUTC = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - 7 * 3600000)
    const endUTC   = new Date(startUTC.getTime() + 86400000 - 1)

    const { data: orders } = await supabase
      .from('orders')
      .select('id, name, email, status, ref_source, use_case, slip_url, created_at, recheck_count, last_recheck_at, reject_reason')
      .gte('created_at', startUTC.toISOString())
      .lte('created_at', endUTC.toISOString())
      .order('created_at', { ascending: true })  // เก่าก่อน → ใหม่ทีหลัง (chronological)

    const all      = orders ?? []
    const verified = all.filter(o => o.status === 'verified')
    const pending  = all.filter(o => o.status === 'pending')
    const rejected = all.filter(o => o.status === 'rejected')
    const revenue  = verified.length * 499

    // ── Phase 3: เคสที่ verified ภายหลัง (filter โดย last_recheck_at) ─────
    // catch ทั้ง order ของวันนี้ + ของวันก่อนที่ recover วันนี้ (edge case Order ข้ามวัน)
    const { data: verifiedLaterRaw } = await supabase
      .from('orders')
      .select('id, name, email, recheck_count, reject_reason, created_at, last_recheck_at, ref_source, use_case')
      .eq('status', 'verified')
      .gt('recheck_count', 0)
      .gte('last_recheck_at', startUTC.toISOString())
      .lte('last_recheck_at', endUTC.toISOString())
      .order('last_recheck_at', { ascending: true })  // chronological (เก่าก่อน) ตรงกับ order list

    const verifiedLater = verifiedLaterRaw ?? []
    const verifiedLaterIds = new Set(verifiedLater.map(o => o.id))

    // ── ถ้าวันนี้ไม่มีออเดอร์ + ไม่มี verified ภายหลัง → ไม่ส่ง ──────────
    if (all.length === 0 && verifiedLater.length === 0) {
      console.log('No orders today, skipping email')
      return new Response('no orders', { status: 200 })
    }

    // ── แปลง ref code เป็น label อ่านง่าย ──────────────────────────────────
    // ถ้าไม่มี ref หรือเป็น 'direct' = เข้ามาจาก URL ปกติ → FB Ads
    function useCaseLabel(val: string | null): string {
      if (!val) return '-'
      const map: Record<string, string> = {
        'employee': 'พนักงาน / คนทำงาน',
        'teacher' : 'ครู / วิทยากร',
        'business': 'เจ้าของธุรกิจ',
        'sales'   : 'งานขาย / Pitching',
        'other'   : 'อื่นๆ',
      }
      if (val.startsWith('other:')) return `อื่นๆ (${val.slice(6) || '-'})`
      return map[val] ?? val
    }

    function refLabel(ref: string | null): string {
      const map: Record<string, string> = {
        'fbbio'  : 'FB bio',
        'fbpost' : 'FB post',
        'fbad'   : 'FB Ads',
        'ig'     : 'Instagram',
        'igbio'  : 'IG bio',
        'line'   : 'LINE',
        'tiktok' : 'TikTok',
        'google' : 'Google',
      }
      if (!ref || ref.toLowerCase() === 'direct') return 'FB Ads'
      return map[ref.toLowerCase()] ?? ref
    }

    // ── Generate signed URLs สำหรับสลิป (7 วัน พอสำหรับเปิดอีเมล) ─────────
    const verifiedWithSlip = await Promise.all(
      verified.map(async (o) => {
        if (!o.slip_url) return { ...o, slipUrl: null as string | null }
        const { data } = await supabase.storage
          .from('slips')
          .createSignedUrl(o.slip_url, 7 * 24 * 3600)
        return { ...o, slipUrl: data?.signedUrl ?? null }
      })
    )

    // ── Channel breakdown ─────────────────────────────────────────────────
    const channelMap: Record<string, number> = {}
    for (const o of verified) {
      const ch = refLabel(o.ref_source)
      channelMap[ch] = (channelMap[ch] || 0) + 1
    }
    const channelRows = Object.entries(channelMap)
      .sort((a, b) => b[1] - a[1])
      .map(([ch, count]) =>
        `<tr>
          <td style="padding:7px 14px;font-size:13px;color:#1D1D1F;border-bottom:1px solid #F5F5F7;">${ch}</td>
          <td style="padding:7px 14px;font-size:13px;font-weight:600;color:#D34724;text-align:right;border-bottom:1px solid #F5F5F7;">${count} รายการ (฿${(count * 499).toLocaleString()})</td>
        </tr>`
      ).join('')

    // ── Build email HTML ────────────────────────────────────────────────
    const dateStr = new Date().toLocaleDateString('th-TH', {
      timeZone: 'Asia/Bangkok',
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const dateISO = `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

    const orderRows = verifiedWithSlip.map(o => {
      const time = new Date(o.created_at).toLocaleTimeString('th-TH', {
        timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit',
      })
      // Phase 3: dot indicator for "verified ภายหลัง" (ระบบตรวจซ้ำให้)
      const isLater = verifiedLaterIds.has(o.id)
      const namePrefix = isLater
        ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2563EB;margin-right:6px;vertical-align:middle;" title="verified ภายหลัง"></span>`
        : ''
      return `<tr>
        <td style="padding:8px 12px;font-size:13px;color:#1D1D1F;border-bottom:1px solid #F0F0F0;">${namePrefix}${o.name}</td>
        <td style="padding:8px 12px;font-size:13px;color:#6E6E73;border-bottom:1px solid #F0F0F0;">${o.email}</td>
        <td style="padding:8px 12px;font-size:13px;color:#6E6E73;border-bottom:1px solid #F0F0F0;">${time}</td>
        <td style="padding:8px 12px;font-size:13px;color:#D34724;font-weight:600;border-bottom:1px solid #F0F0F0;">${refLabel(o.ref_source)}</td>
        <td style="padding:8px 12px;font-size:13px;color:#6E6E73;border-bottom:1px solid #F0F0F0;">${useCaseLabel(o.use_case)}</td>
      </tr>`
    }).join('')

    // ── Phase 3: blocks สำหรับ section "🔄 เคสที่ verified ภายหลัง" ────────
    function rejectReasonLabel(r: string | null): string {
      const map: Record<string, string> = {
        'wrong_account' : 'ขึ้น wrong_account',
        'duplicate_slip': 'ขึ้น duplicate',
        'wrong_amount'  : 'ยอดไม่ตรง',
        'invalid_slip'  : 'สลิปไม่ valid',
      }
      return r ? (map[r] ?? r) : '-'
    }
    const verifiedLaterBlocks = verifiedLater.map((o, i) => {
      const createdTime = new Date(o.created_at).toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      })
      const recoveredTime = o.last_recheck_at
        ? new Date(o.last_recheck_at).toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
          })
        : '-'
      // Cross-day note: ถ้า created_at < startUTC (วันนี้) → เป็น order ของวันก่อน
      // แสดงแค่ original date — เวลา recover ดูใน bullet ด้านล่างได้
      const isCrossDay = new Date(o.created_at) < startUTC
      const createdDateOnly = new Date(o.created_at).toLocaleDateString('th-TH', {
        timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short',
      })
      const crossDayNote = isCrossDay
        ? `<p style="margin:0 0 8px;padding:6px 10px;background:#FEF3C7;border-radius:6px;font-size:12px;color:#92400E;">⚠️ Order จากวันที่ ${createdDateOnly}</p>`
        : ''
      return `<div style="margin-bottom:16px;background:#EFF6FF;border-left:3px solid #2563EB;border-radius:8px;padding:14px 16px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1D1D1F;">${i + 1}. ${o.name}</p>
        <p style="margin:0 0 10px;font-size:12px;color:#6E6E73;">${o.email}</p>
        ${crossDayNote}
        <ul style="margin:0;padding-left:18px;font-size:12px;color:#1D1D1F;line-height:1.7;">
          <li>ส่งสลิปครั้งแรก: <strong>${createdTime}</strong> — ${rejectReasonLabel(o.reject_reason)}</li>
          <li>ระบบตรวจซ้ำ <strong>${o.recheck_count} รอบ</strong> → ผ่านรอบที่ ${o.recheck_count} เวลา <strong>${recoveredTime}</strong></li>
          <li>ส่ง email + redeem code ให้ลูกค้าแล้ว</li>
        </ul>
      </div>`
    }).join('')

    const slipBlocks = verifiedWithSlip
      .filter(o => o.slipUrl)
      .map((o, i) => {
        const time = new Date(o.created_at).toLocaleTimeString('th-TH', {
          timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit',
        })
        return `<div style="margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#1D1D1F;">${i + 1}. ${o.name} &mdash; ${time}</p>
          <img src="${o.slipUrl}" alt="สลิป" style="max-width:100%;width:300px;border-radius:10px;border:1px solid #E5E5EA;display:block;">
        </div>`
      }).join('')

    const html = `<!DOCTYPE html>
<html lang="th">
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">

  <tr><td style="height:4px;background:#D34724;font-size:0;">&nbsp;</td></tr>

  <!-- Header -->
  <tr><td style="padding:32px 40px;border-bottom:1px solid #F0F0F0;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#D34724;letter-spacing:1.5px;text-transform:uppercase;">สรุปยอดขายประจำวัน</p>
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#1D1D1F;">${dateStr}</h1>
  </td></tr>

  <!-- Stats: 4 cards (Phase 3 — เพิ่ม "verified ภายหลัง") -->
  <tr><td style="padding:28px 40px;border-bottom:1px solid #F0F0F0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="background:#F0FDF4;border-radius:10px;padding:16px 8px;width:23%;">
          <div style="font-size:22px;font-weight:700;color:#166534;">฿${revenue.toLocaleString()}</div>
          <div style="font-size:11px;color:#16A34A;margin-top:4px;">รายได้วันนี้</div>
        </td>
        <td width="8">&nbsp;</td>
        <td align="center" style="background:#F5F5F7;border-radius:10px;padding:16px 8px;width:23%;">
          <div style="font-size:22px;font-weight:700;color:#1D1D1F;">${verified.length}</div>
          <div style="font-size:11px;color:#6E6E73;margin-top:4px;">สลิปผ่าน</div>
        </td>
        <td width="8">&nbsp;</td>
        <td align="center" style="background:#EFF6FF;border-radius:10px;padding:16px 8px;width:23%;">
          <div style="font-size:22px;font-weight:700;color:#2563EB;">${verifiedLater.length}</div>
          <div style="font-size:11px;color:#2563EB;margin-top:4px;">verified ภายหลัง</div>
        </td>
        <td width="8">&nbsp;</td>
        <td align="center" style="background:#FFF5F5;border-radius:10px;padding:16px 8px;width:23%;">
          <div style="font-size:22px;font-weight:700;color:#DC2626;">${pending.length + rejected.length}</div>
          <div style="font-size:11px;color:#DC2626;margin-top:4px;">สลิปไม่ผ่าน</div>
        </td>
      </tr>
    </table>
  </td></tr>

  ${Object.keys(channelMap).length > 0 ? `
  <!-- Channel breakdown -->
  <tr><td style="padding:24px 40px;border-bottom:1px solid #F0F0F0;">
    <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:1px;color:#8E8E93;text-transform:uppercase;">แยกตามช่องทาง</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #F0F0F0;border-radius:10px;overflow:hidden;">
      ${channelRows}
    </table>
  </td></tr>` : ''}

  ${verified.length > 0 ? `
  <!-- Order list -->
  <tr><td style="padding:24px 40px;border-bottom:1px solid #F0F0F0;">
    <p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:1px;color:#8E8E93;text-transform:uppercase;">รายชื่อลูกค้าที่ชำระสำเร็จ</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #F0F0F0;border-radius:10px;overflow:hidden;">
      <tr style="background:#F5F5F7;">
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6E6E73;text-align:left;">ชื่อ</th>
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6E6E73;text-align:left;">อีเมล</th>
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6E6E73;text-align:left;">เวลา</th>
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6E6E73;text-align:left;">ช่องทาง</th>
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6E6E73;text-align:left;">ด้านการใช้งาน</th>
      </tr>
      ${orderRows}
    </table>
  </td></tr>` : ''}

  ${verifiedLater.length > 0 ? `
  <!-- Phase 3: Verified ภายหลัง section -->
  <tr><td style="padding:24px 40px;border-bottom:1px solid #F0F0F0;">
    <p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:1px;color:#8E8E93;text-transform:uppercase;">🔄 เคสที่ verified ภายหลัง</p>
    ${verifiedLaterBlocks}
  </td></tr>` : ''}

  ${slipBlocks ? `
  <!-- Slip images -->
  <tr><td style="padding:24px 40px;border-bottom:1px solid #F0F0F0;">
    <p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:1px;color:#8E8E93;text-transform:uppercase;">หลักฐานการโอนเงิน</p>
    ${slipBlocks}
  </td></tr>` : ''}

  <tr><td style="padding:20px 40px;">
    <p style="margin:0;font-size:12px;color:#AEAEB2;">ส่งอัตโนมัติทุกวัน 23:00 น. · PowerPoint Template by Coach Tarn</p>
  </td></tr>

</table>
</td></tr></table>
</body></html>`

    // ── ส่งอีเมล via Resend ────────────────────────────────────────────────
    const subjectSuffix = verifiedLater.length > 0
      ? ` · 🔄 verified ภายหลัง ${verifiedLater.length} เคส`
      : ''
    const subject = `📊 สรุปยอดขายวันที่ ${dateISO} — ${verified.length} คำสั่งซื้อสำเร็จ (฿${revenue.toLocaleString()})${subjectSuffix}`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method : 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type' : 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [OWNER_EMAIL], subject, html }),
    })
    if (!resendRes.ok) {
      const err = await resendRes.text()
      throw new Error(`Resend ${resendRes.status}: ${err}`)
    }

    console.log(`Daily summary sent: ${verified.length} orders, ฿${revenue}, ${verifiedLater.length} verified-later`)
    return new Response('ok', { status: 200 })

  } catch (err) {
    console.error('daily-summary error:', err)
    return new Response('error', { status: 500 })
  }
})
