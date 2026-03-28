import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6.9.16'

// ── Cron: วันที่ 1 ของทุกเดือน 08:00 (Bangkok) = 01:00 UTC ─────────────────
// ตั้งใน Supabase → Edge Functions → Schedule: "0 1 1 * *"

const GMAIL_USER  = Deno.env.get('GMAIL_USER')!
const GMAIL_PASS  = Deno.env.get('GMAIL_APP_PASSWORD')!
const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL')!

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── optional override_month สำหรับ test (YYYY-MM) ───────────────────────
    let body: any = {}
    try { body = await req.json() } catch { /* cron has no body */ }
    const overrideMonth: string | undefined = body?.override_month

    // ── เดือนที่แล้ว (หรือ override) ───────────────────────────────────────
    const now = new Date()
    let lastMonth: Date, lastMonthEnd: Date
    if (overrideMonth) {
      const [oy, om] = overrideMonth.split('-').map(Number)
      lastMonth    = new Date(oy, om - 1, 1)
      lastMonthEnd = new Date(oy, om, 0, 23, 59, 59)
    } else {
      lastMonth    = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    }

    const monthStr = lastMonth.toLocaleDateString('th-TH', {
      timeZone: 'Asia/Bangkok', year: 'numeric', month: 'long',
    })

    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id, name, email, status, ref_source, created_at,
        redeem_codes ( code, last_used_at )
      `)
      .eq('status', 'verified')
      .gte('created_at', lastMonth.toISOString())
      .lte('created_at', lastMonthEnd.toISOString())
      .order('created_at', { ascending: true })

    const rows = orders ?? []
    const revenue = rows.length * 499

    // ── สร้าง CSV ───────────────────────────────────────────────────────────
    const csvHeader = 'ลำดับ,วันที่,เวลา,ชื่อ,อีเมล,Redeem Code,ใช้งานล่าสุด,ช่องทาง,ยอด (฿)\n'
    const csvRows = rows.map((o, i) => {
      const date = new Date(o.created_at).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })
      const time = new Date(o.created_at).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' })
      const code = (o.redeem_codes as any)?.[0]?.code ?? '-'
      const lastUsed = (o.redeem_codes as any)?.[0]?.last_used_at
        ? new Date((o.redeem_codes as any)[0].last_used_at).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })
        : 'ยังไม่ได้ใช้'
      const src = o.ref_source ?? 'direct'
      // escape commas in name/email
      const safeName  = `"${o.name.replace(/"/g, '""')}"`
      const safeEmail = `"${o.email.replace(/"/g, '""')}"`
      return `${i + 1},${date},${time},${safeName},${safeEmail},${code},${lastUsed},${src},499`
    }).join('\n')

    const csv = '\uFEFF' + csvHeader + csvRows  // BOM สำหรับ Excel ภาษาไทย

    // ── Build summary email ─────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="th">
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
  <tr><td style="height:4px;background:#D34724;font-size:0;">&nbsp;</td></tr>
  <tr><td style="padding:32px 40px;border-bottom:1px solid #F0F0F0;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#D34724;letter-spacing:1.5px;text-transform:uppercase;">สรุปยอดขายรายเดือน</p>
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#1D1D1F;">${monthStr}</h1>
  </td></tr>
  <tr><td style="padding:28px 40px;border-bottom:1px solid #F0F0F0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="background:#F0FDF4;border-radius:12px;padding:24px;width:45%;">
          <div style="font-size:32px;font-weight:700;color:#166534;">฿${revenue.toLocaleString()}</div>
          <div style="font-size:12px;color:#16A34A;margin-top:4px;">รายได้รวม</div>
        </td>
        <td width="16">&nbsp;</td>
        <td align="center" style="background:#F5F5F7;border-radius:12px;padding:24px;width:45%;">
          <div style="font-size:32px;font-weight:700;color:#1D1D1F;">${rows.length}</div>
          <div style="font-size:12px;color:#6E6E73;margin-top:4px;">ลูกค้าทั้งหมด</div>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:24px 40px;">
    <p style="margin:0;font-size:14px;color:#6E6E73;line-height:1.6;">
      ไฟล์ CSV แนบมาด้วยครับ เปิดด้วย Excel ได้เลย<br>
      มีข้อมูลลูกค้า ${rows.length} รายของเดือน${monthStr} ครบถ้วน
    </p>
  </td></tr>
  <tr><td style="padding:16px 40px 24px;border-top:1px solid #F0F0F0;">
    <p style="margin:0;font-size:12px;color:#AEAEB2;">ส่งอัตโนมัติทุกวันที่ 1 ของเดือน 08:00 น. · PowerPoint Template by Coach Tarn</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`

    // ── ส่งอีเมลพร้อมแนบ CSV ───────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    })

    const filename = `coachtarn-${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}.csv`

    await transporter.sendMail({
      from   : `"Coach Tarn Slide · Report" <${GMAIL_USER}>`,
      to     : OWNER_EMAIL,
      subject: `📁 สรุปลูกค้าเดือน${monthStr}: ${rows.length} ราย · ฿${revenue.toLocaleString()}`,
      html,
      attachments: [{
        filename,
        content : csv,
        encoding: 'utf-8',
      }],
    })

    console.log(`Monthly CSV sent: ${rows.length} orders, ฿${revenue}`)
    return new Response('ok', { status: 200 })

  } catch (err) {
    console.error('monthly-csv error:', err)
    return new Response('error', { status: 500 })
  }
})
