import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6.9.16'

// ── Cron: ทุกวัน 23:00 น. (Bangkok) = 16:00 UTC ─────────────────────────────
// ตั้งใน Supabase → Edge Functions → Schedule: "0 16 * * *"

const GMAIL_USER  = Deno.env.get('GMAIL_USER')!
const GMAIL_PASS  = Deno.env.get('GMAIL_APP_PASSWORD')!
const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL')!   // อีเมลเจ้าของ (ไอซ์)

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── Query ยอดวันนี้ (Asia/Bangkok) ─────────────────────────────────────
    const todayStart = new Date()
    todayStart.setUTCHours(todayStart.getUTCHours() - 7) // แปลงเป็น BKK
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(todayStart)
    todayEnd.setHours(23, 59, 59, 999)

    // แปลงกลับเป็น UTC สำหรับ query
    const startUTC = new Date(todayStart.getTime() + 7 * 60 * 60 * 1000).toISOString()
    const endUTC   = new Date(todayEnd.getTime()   + 7 * 60 * 60 * 1000).toISOString()

    const { data: orders } = await supabase
      .from('orders')
      .select('id, name, email, status, ref_source, created_at')
      .gte('created_at', startUTC)
      .lte('created_at', endUTC)
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

    // ── Build email HTML ────────────────────────────────────────────────────
    const dateStr = new Date().toLocaleDateString('th-TH', {
      timeZone: 'Asia/Bangkok',
      weekday : 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    // แปลง ref code เป็น label อ่านง่าย
    function refLabel(ref: string | null): string {
      const map: Record<string, string> = {
        'fbbio'   : 'FB bio',
        'fbpost'  : 'FB post',
        'fbad'    : 'FB Ads',
        'ig'      : 'Instagram',
        'igbio'   : 'IG bio',
        'line'    : 'LINE',
        'tiktok'  : 'TikTok',
        'google'  : 'Google',
        'direct'  : 'direct',
      }
      if (!ref) return 'direct'
      return map[ref.toLowerCase()] ?? ref
    }

    const orderRows = verified.map(o => {
      const time = new Date(o.created_at).toLocaleTimeString('th-TH', {
        timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit',
      })
      const ref = refLabel(o.ref_source)
      const isFbbio = (o.ref_source ?? '').toLowerCase() === 'fbbio'
      return `<tr>
        <td style="padding:8px 12px;font-size:13px;color:#1D1D1F;border-bottom:1px solid #F0F0F0;">${time}</td>
        <td style="padding:8px 12px;font-size:13px;color:#1D1D1F;border-bottom:1px solid #F0F0F0;">${o.name}</td>
        <td style="padding:8px 12px;font-size:13px;color:#6E6E73;border-bottom:1px solid #F0F0F0;">${o.email}</td>
        <td style="padding:8px 12px;font-size:13px;border-bottom:1px solid #F0F0F0;${isFbbio ? 'color:#D34724;font-weight:700;' : 'color:#6E6E73;'}">${ref}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="th">
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
  <tr><td style="height:4px;background:#D34724;font-size:0;">&nbsp;</td></tr>
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
          <div style="font-size:12px;color:#6E6E73;margin-top:4px;">ออเดอร์สำเร็จ</div>
        </td>
        <td width="12">&nbsp;</td>
        <td align="center" style="background:#F5F5F7;border-radius:12px;padding:20px;width:30%;">
          <div style="font-size:28px;font-weight:700;color:#1D1D1F;">${pending.length + rejected.length}</div>
          <div style="font-size:12px;color:#6E6E73;margin-top:4px;">ไม่สำเร็จ</div>
        </td>
      </tr>
    </table>
  </td></tr>
  ${verified.length > 0 ? `
  <!-- Order list -->
  <tr><td style="padding:28px 40px;">
    <p style="margin:0 0 14px;font-size:13px;font-weight:600;color:#6E6E73;">รายชื่อลูกค้าวันนี้</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #F0F0F0;border-radius:10px;overflow:hidden;">
      <tr style="background:#F5F5F7;">
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6E6E73;text-align:left;">เวลา</th>
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6E6E73;text-align:left;">ชื่อ</th>
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6E6E73;text-align:left;">อีเมล</th>
        <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6E6E73;text-align:left;">ช่องทาง</th>
      </tr>
      ${orderRows}
    </table>
  </td></tr>` : ''}
  <tr><td style="padding:20px 40px;border-top:1px solid #F0F0F0;">
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
      subject: `📊 ยอดขายวันนี้: ${verified.length} ออเดอร์ · ฿${revenue.toLocaleString()}`,
      html,
    })

    console.log(`Daily summary sent: ${verified.length} orders, ฿${revenue}`)
    return new Response('ok', { status: 200 })

  } catch (err) {
    console.error('daily-summary error:', err)
    return new Response('error', { status: 500 })
  }
})
