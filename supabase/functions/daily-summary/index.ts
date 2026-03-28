import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6.9.16'

// ── Cron: ทุกวัน 23:00 น. (Bangkok) = 16:00 UTC ─────────────────────────────
// ตั้งใน Supabase → Edge Functions → Schedule: "0 16 * * *"

const GMAIL_USER  = Deno.env.get('GMAIL_USER')!
const GMAIL_PASS  = Deno.env.get('GMAIL_APP_PASSWORD')!
const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL')!

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
      .select('id, name, email, status, ref_source, use_case, slip_url, created_at')
      .gte('created_at', startUTC.toISOString())
      .lte('created_at', endUTC.toISOString())
      .order('created_at', { ascending: false })

    const all      = orders ?? []
    const verified = all.filter(o => o.status === 'verified')
    const pending  = all.filter(o => o.status === 'pending')
    const rejected = all.filter(o => o.status === 'rejected')
    const revenue  = verified.length * 499

    // ── ถ้าวันนี้ไม่มีออเดอร์เลย ไม่ส่ง ────────────────────────────────────
    if (all.length === 0) {
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

    const orderRows = verifiedWithSlip.map(o => {
      const time = new Date(o.created_at).toLocaleTimeString('th-TH', {
        timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit',
      })
      return `<tr>
        <td style="padding:8px 12px;font-size:13px;color:#1D1D1F;border-bottom:1px solid #F0F0F0;">${o.name}</td>
        <td style="padding:8px 12px;font-size:13px;color:#6E6E73;border-bottom:1px solid #F0F0F0;">${o.email}</td>
        <td style="padding:8px 12px;font-size:13px;color:#6E6E73;border-bottom:1px solid #F0F0F0;">${time}</td>
        <td style="padding:8px 12px;font-size:13px;color:#D34724;font-weight:600;border-bottom:1px solid #F0F0F0;">${refLabel(o.ref_source)}</td>
        <td style="padding:8px 12px;font-size:13px;color:#6E6E73;border-bottom:1px solid #F0F0F0;">${useCaseLabel(o.use_case)}</td>
      </tr>`
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

  <!-- Stats -->
  <tr><td style="padding:28px 40px;border-bottom:1px solid #F0F0F0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="background:#F0FDF4;border-radius:12px;padding:20px;width:30%;">
          <div style="font-size:28px;font-weight:700;color:#166534;">฿${revenue.toLocaleString()}</div>
          <div style="font-size:12px;color:#16A34A;margin-top:4px;">รายได้วันนี้</div>
        </td>
        <td width="12">&nbsp;</td>
        <td align="center" style="background:#F5F5F7;border-radius:12px;padding:20px;width:30%;">
          <div style="font-size:28px;font-weight:700;color:#1D1D1F;">${verified.length}</div>
          <div style="font-size:12px;color:#6E6E73;margin-top:4px;">สลิปผ่าน (verified)</div>
        </td>
        <td width="12">&nbsp;</td>
        <td align="center" style="background:#FFF5F5;border-radius:12px;padding:20px;width:30%;">
          <div style="font-size:28px;font-weight:700;color:#DC2626;">${pending.length + rejected.length}</div>
          <div style="font-size:12px;color:#DC2626;margin-top:4px;">สลิปไม่ผ่าน (rejected)</div>
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

    // ── ส่งอีเมล ────────────────────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    })

    await transporter.sendMail({
      from   : `"Coach Tarn Slide · Report" <${GMAIL_USER}>`,
      to     : OWNER_EMAIL,
      subject: `📊 สรุปยอดขาย ${dateStr}: ${verified.length} ออเดอร์ · ฿${revenue.toLocaleString()}`,
      html,
    })

    console.log(`Daily summary sent: ${verified.length} orders, ฿${revenue}`)
    return new Response('ok', { status: 200 })

  } catch (err) {
    console.error('daily-summary error:', err)
    return new Response('error', { status: 500 })
  }
})
