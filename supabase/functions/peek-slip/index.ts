// One-off admin helper: peek slips + manual verify
// ลบทิ้งหลังใช้เสร็จ

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6.9.16'

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-recheck-token',
}

const GMAIL_USER   = Deno.env.get('GMAIL_USER')!
const GMAIL_PASS   = Deno.env.get('GMAIL_APP_PASSWORD')!
const DOWNLOAD_URL = Deno.env.get('DOWNLOAD_PAGE_URL') ?? 'https://coachtarnslide.com/download'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 8; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return `TARN-${suffix}`
}

function buildEmailHtml(name: string, code: string): string {
  const downloadUrl = `${DOWNLOAD_URL}?code=${encodeURIComponent(code)}`
  return `<!DOCTYPE html><html lang="th"><body style="margin:0;padding:0;background:#F2F2F7;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2F2F7;"><tr><td style="padding:40px 16px;" align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.08);">
<tr><td style="height:5px;background:linear-gradient(90deg,#EB7D4A,#D34724);">&nbsp;</td></tr>
<tr><td align="center" style="padding:48px 40px 32px;">
<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;"><tr><td align="center" valign="middle" style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#34C759,#28A745);font-size:38px;color:#fff;line-height:72px;">&#10003;</td></tr></table>
<p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;color:#D34724;">คำสั่งซื้อสำเร็จ</p>
<h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#1D1D1F;">ขอบคุณที่สั่งซื้อค่ะ</h1>
<p style="margin:0;font-size:15px;color:#6E6E73;line-height:1.6;">สวัสดีคุณ <strong>${name}</strong><br>PowerPoint Template by Coach Tarn พร้อมแล้วค่ะ</p>
</td></tr>
<tr><td style="padding:24px 40px;border-top:1px solid #F0F0F0;">
<p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:1px;color:#8E8E93;">REDEEM CODE</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:linear-gradient(135deg,#FFF3EF,#FFF8F5);border:2px solid rgba(211,71,36,0.15);border-radius:14px;padding:22px;">
<span style="font-family:'Courier New',monospace;font-size:28px;font-weight:900;letter-spacing:4px;display:block;color:#1D1D1F;">${code}</span>
</td></tr></table></td></tr>
<tr><td align="center" style="padding:32px 40px;background:#FAFAFA;border-top:1px solid #F0F0F0;">
<a href="${downloadUrl}" style="display:inline-block;background:linear-gradient(135deg,#EB7D4A,#D34724);color:#fff;text-decoration:none;font-size:16px;font-weight:800;padding:16px 44px;border-radius:100px;box-shadow:0 6px 20px rgba(211,71,36,0.35);">รับไฟล์สไลด์ &rarr;</a>
</td></tr>
<tr><td align="center" style="padding:24px 40px 32px;background:#FAFAFA;">
<p style="margin:0;font-size:12px;color:#8E8E93;">ขออภัยที่ใช้เวลาตรวจสอบนาน หากมีคำถามทักได้ที่ Facebook: PowerPoint Template by Coach Tarn</p>
</td></tr>
</table></td></tr></table></body></html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const token = req.headers.get('x-recheck-token')
  if (token !== Deno.env.get('RECHECK_TOKEN')) {
    return Response.json({ error: 'forbidden' }, { status: 403, headers: CORS })
  }

  const body = await req.json()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ── Mode 1: peek by email (signed URLs) ──
  if (body.email_like) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, name, email, slip_url, status, reject_reason, created_at')
      .ilike('email', `%${body.email_like}%`)
      .order('created_at', { ascending: false })
      .limit(10)

    const results = await Promise.all((orders ?? []).map(async (o) => {
      const { data } = await supabase.storage.from('slips').createSignedUrl(o.slip_url, 600)
      return { ...o, signed_url: data?.signedUrl ?? null }
    }))
    return Response.json({ orders: results }, { headers: CORS })
  }

  // ── Mode 2: manual verify by order_id (admin override Slip2Go) ──
  if (body.manual_verify_order_id) {
    const orderId = body.manual_verify_order_id

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, name, email, status, created_at')
      .eq('id', orderId)
      .single()
    if (orderErr || !order) {
      return Response.json({ error: 'order_not_found' }, { status: 404, headers: CORS })
    }
    if (order.status === 'verified') {
      return Response.json({ error: 'already_verified' }, { headers: CORS })
    }

    // 1) generate + insert code
    let redeemCode = ''
    for (let i = 0; i < 5; i++) {
      const candidate = generateCode()
      const { error } = await supabase.from('redeem_codes').insert({
        order_id: orderId, customer_name: order.name, code: candidate,
      })
      if (!error) { redeemCode = candidate; break }
    }
    if (!redeemCode) {
      return Response.json({ error: 'code_gen_failed' }, { status: 500, headers: CORS })
    }

    // 2) update order
    await supabase.from('orders').update({ status: 'verified' }).eq('id', orderId)

    // 3) cleanup siblings (same email, status=rejected, ±1h around winner)
    const winnerTime = new Date(order.created_at).getTime()
    const winStart   = new Date(winnerTime - 60 * 60 * 1000).toISOString()
    const winEnd     = new Date(winnerTime + 60 * 60 * 1000).toISOString()
    const { data: deleted } = await supabase
      .from('orders').delete()
      .eq('email', order.email)
      .eq('status', 'rejected')
      .in('reject_reason', ['wrong_account', 'duplicate_slip', 'invalid_slip'])
      .neq('id', orderId)
      .gte('created_at', winStart)
      .lte('created_at', winEnd)
      .select('id')
    const cleanedSiblings = deleted?.length ?? 0

    // 4) send email
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 465, secure: true,
        auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      })
      await transporter.sendMail({
        from   : `"PowerPoint Template by Coach Tarn" <${GMAIL_USER}>`,
        to     : order.email,
        subject: `✅ Redeem Code ของคุณพร้อมแล้ว — ${redeemCode}`,
        html   : buildEmailHtml(order.name, redeemCode),
      })
    } catch (e) {
      console.error('[peek-slip] email failed:', e)
      return Response.json({
        verified: true, code: redeemCode, cleaned_siblings: cleanedSiblings,
        email_error: String(e),
      }, { headers: CORS })
    }

    return Response.json({
      verified: true,
      code: redeemCode,
      cleaned_siblings: cleanedSiblings,
      email_sent_to: order.email,
    }, { headers: CORS })
  }

  return Response.json({ error: 'missing email_like or manual_verify_order_id' }, { status: 400, headers: CORS })
})
