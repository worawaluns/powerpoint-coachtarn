import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6.9.16'

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SLIP2GO_KEY      = Deno.env.get('SLIP2GO_SECRET_KEY')!
const GMAIL_USER       = Deno.env.get('GMAIL_USER')!
const GMAIL_PASS       = Deno.env.get('GMAIL_APP_PASSWORD')!
const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY')!
const DOWNLOAD_URL     = Deno.env.get('DOWNLOAD_PAGE_URL') ?? 'https://coachtarnslide.netlify.app/download'

const PRICE          = '499'
const ACCOUNT_NUMBER = '1578147760'
const ACCOUNT_NAME   = 'บจก. ดับเบิ้ลคราฟ์'
const ACCOUNT_TYPE   = '01004'  // KBANK

// ── Generate TARN-XXXXXXXX ───────────────────────────────────────────────────
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 8; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return `TARN-${suffix}`
}

// ── Verify Turnstile token ───────────────────────────────────────────────────
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token, remoteip: ip }),
  })
  const data = await res.json()
  return data.success === true
}

// ── Email HTML ───────────────────────────────────────────────────────────────
function buildEmailHtml(name: string, code: string): string {
  const downloadUrl = `${DOWNLOAD_URL}?code=${encodeURIComponent(code)}`
  return `<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F7;padding:40px 16px 48px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0"
  style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;
         box-shadow:0 1px 3px rgba(0,0,0,0.06),0 8px 32px rgba(0,0,0,0.06);">
  <tr><td style="height:4px;background:#D34724;font-size:0;">&nbsp;</td></tr>
  <tr><td align="center" style="padding:48px 48px 36px;border-bottom:1px solid #F0F0F0;">
    <div style="width:64px;height:64px;background:#FFF3EF;border-radius:18px;margin:0 auto 20px;text-align:center;line-height:64px;">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M22 11.08V12a10 10 0 1 1-5.93-9.14' stroke='%23D34724' stroke-width='2' stroke-linecap='round'/%3E%3Cpolyline points='22 4 12 14.01 9 11.01' stroke='%23D34724' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E" width="32" height="32" alt="">
    </div>
    <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:1.5px;color:#D34724;text-transform:uppercase;">คำสั่งซื้อสำเร็จ</p>
    <h1 style="margin:0 0 10px;font-size:26px;font-weight:700;color:#1D1D1F;line-height:1.2;">ขอบคุณที่สั่งซื้อนะคะ</h1>
    <p style="margin:0;font-size:15px;color:#6E6E73;line-height:1.5;">
      สวัสดีคุณ <strong style="color:#1D1D1F;">${name}</strong> · PowerPoint Template by Coach Tarn พร้อมให้คุณแล้วค่ะ
    </p>
  </td></tr>
  <tr><td style="padding:36px 48px;border-bottom:1px solid #F0F0F0;">
    <p style="margin:0 0 14px;font-size:13px;font-weight:600;color:#6E6E73;">Redeem Code ของคุณ</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background:#F5F5F7;border-radius:12px;padding:20px 24px;">
        <span style="font-family:'SF Mono','Fira Code','Courier New',monospace;font-size:26px;font-weight:700;color:#1D1D1F;letter-spacing:4px;display:block;">${code}</span>
        <span style="font-size:12px;color:#8E8E93;margin-top:4px;display:block;">ใช้ได้ตลอด · ไม่มีวันหมดอายุ</span>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:32px 48px;border-bottom:1px solid #F0F0F0;">
    <p style="margin:0 0 20px;font-size:13px;font-weight:600;color:#6E6E73;">วิธีรับไฟล์สไลด์</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
      <tr>
        <td width="36" valign="top"><div style="width:26px;height:26px;background:#F5F5F7;border-radius:8px;text-align:center;line-height:26px;font-size:13px;font-weight:700;color:#D34724;">1</div></td>
        <td style="padding-left:12px;padding-top:3px;font-size:15px;color:#1D1D1F;">กดปุ่ม <strong>"รับไฟล์สไลด์"</strong> ด้านล่าง</td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
      <tr>
        <td width="36" valign="top"><div style="width:26px;height:26px;background:#F5F5F7;border-radius:8px;text-align:center;line-height:26px;font-size:13px;font-weight:700;color:#D34724;">2</div></td>
        <td style="padding-left:12px;padding-top:3px;font-size:15px;color:#1D1D1F;">วาง Code <code style="background:#F5F5F7;border-radius:6px;padding:2px 8px;font-size:13px;color:#D34724;font-weight:700;">${code}</code> ในช่องที่กำหนด</td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="36" valign="top"><div style="width:26px;height:26px;background:#F5F5F7;border-radius:8px;text-align:center;line-height:26px;font-size:13px;font-weight:700;color:#D34724;">3</div></td>
        <td style="padding-left:12px;padding-top:3px;font-size:15px;color:#1D1D1F;">เลือกโฟลเดอร์ที่ต้องการแล้วดาวน์โหลดได้เลย</td>
      </tr>
    </table>
  </td></tr>
  <tr><td align="center" style="padding:32px 48px;border-bottom:1px solid #F0F0F0;">
    <a href="${downloadUrl}" target="_blank"
       style="display:inline-block;background:#D34724;color:#ffffff;text-decoration:none;
              font-size:16px;font-weight:600;padding:15px 40px;border-radius:100px;">
      รับไฟล์สไลด์ →
    </a>
  </td></tr>
  <tr><td style="padding:24px 48px;border-bottom:1px solid #F0F0F0;">
    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#1D1D1F;">รายละเอียดคำสั่งซื้อ</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="font-size:13px;color:#6E6E73;padding-bottom:6px;">สินค้า</td>
        <td align="right" style="font-size:13px;color:#1D1D1F;font-weight:500;padding-bottom:6px;">PowerPoint Template by Coach Tarn</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#6E6E73;padding-bottom:6px;">รายละเอียด</td>
        <td align="right" style="font-size:13px;color:#1D1D1F;padding-bottom:6px;">6,500+ สไลด์ · 3 ฟอร์แมต</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#6E6E73;border-top:1px solid #F0F0F0;padding-top:10px;">ยอดชำระ</td>
        <td align="right" style="font-size:15px;color:#1D1D1F;font-weight:700;border-top:1px solid #F0F0F0;padding-top:10px;">฿499</td>
      </tr>
    </table>
  </td></tr>
  <tr><td align="center" style="padding:28px 48px;">
    <p style="margin:0 0 6px;font-size:13px;color:#8E8E93;line-height:1.6;">
      เก็บอีเมลนี้ไว้นะคะ — Code ใช้ได้ตลอด ไม่มีวันหมดอายุ<br>
      มีปัญหาติดต่อได้ที่ Line <a href="https://line.me/ti/p/@coachtarn" style="color:#D34724;text-decoration:none;">@coachtarn</a>
    </p>
    <p style="margin:16px 0 0;font-size:11px;color:#AEAEB2;">© 2025 DoubleCraft Co., Ltd.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

// ── Main ─────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { order_id, turnstile_token } = await req.json()
    if (!order_id) return Response.json({ error: 'missing order_id' }, { status: 400, headers: CORS })

    // ── 1. Turnstile bot check ───────────────────────────────────────────────
    if (turnstile_token) {
      const ip = req.headers.get('CF-Connecting-IP') ?? ''
      const ok = await verifyTurnstile(turnstile_token, ip)
      if (!ok) {
        return Response.json(
          { status: 'rejected', reason: 'bot_detected' },
          { status: 403, headers: CORS }
        )
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── 2. ดึง order ─────────────────────────────────────────────────────────
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, name, email, slip_url, status, trans_ref')
      .eq('id', order_id)
      .single()

    if (orderErr || !order) {
      return Response.json({ status: 'rejected', reason: 'order_not_found' }, { headers: CORS })
    }
    if (order.status === 'verified') {
      return Response.json({ status: 'already_verified' }, { headers: CORS })
    }

    // ── 3. Signed URL ────────────────────────────────────────────────────────
    const { data: signedData } = await supabase.storage
      .from('slips')
      .createSignedUrl(order.slip_url, 300)

    if (!signedData?.signedUrl) {
      return Response.json({ status: 'rejected', reason: 'invalid_slip' }, { headers: CORS })
    }

    // ── 4. เรียก Slip2Go API ─────────────────────────────────────────────────
    let slip: any = null
    try {
      const slip2goRes = await fetch(
        'https://connect.slip2go.com/api/verify-slip/qr-image-link/info',
        {
          method : 'POST',
          headers: { 'Authorization': `Bearer ${SLIP2GO_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payload: {
              imageUrl: signedData.signedUrl,
              checkCondition: {
                checkDuplicate: true,
                checkReceiver: [{ accountType: ACCOUNT_TYPE, accountNameTH: ACCOUNT_NAME, accountNumber: ACCOUNT_NUMBER }],
                checkAmount: { type: 'eq', amount: PRICE },
              },
            },
          }),
        }
      )
      const text = await slip2goRes.text()
      slip = JSON.parse(text)
    } catch {
      await supabase.from('orders').update({ status: 'rejected', reject_reason: 'invalid_slip' }).eq('id', order_id)
      return Response.json({ status: 'rejected', reason: 'invalid_slip' }, { headers: CORS })
    }

    const s2gCode      = slip?.code?.toString()
    const isPass       = slip?.data?.checkCondition?.isPass
    const transRef     = slip?.data?.transRef
    const amountPass   = slip?.data?.checkCondition?.checkAmount?.isPass
    const receiverPass = slip?.data?.checkCondition?.checkReceiver?.[0]?.isPass ?? slip?.data?.checkCondition?.checkReceiver?.isPass
    const actualAmount = slip?.data?.amount ?? slip?.data?.checkCondition?.checkAmount?.amount

    // ── 5. สลิปซ้ำ (Slip2Go layer) ──────────────────────────────────────────
    if (s2gCode === '200501') {
      await supabase.from('orders').update({ status: 'rejected', reject_reason: 'duplicate_slip' }).eq('id', order_id)
      return Response.json({ status: 'rejected', reason: 'duplicate' }, { headers: CORS })
    }

    // ── 6. ไม่ผ่าน — วิเคราะห์ reason ──────────────────────────────────────
    if (!isPass) {
      let reason = 'invalid_slip'

      if (amountPass === false && receiverPass === false) {
        reason = 'wrong_amount_and_account'
      } else if (amountPass === false) {
        reason = 'wrong_amount'
      } else if (receiverPass === false) {
        reason = 'wrong_account'
      } else if (s2gCode && s2gCode !== '200000') {
        reason = 'invalid_slip'
      }

      await supabase.from('orders').update({ status: 'rejected', reject_reason: reason }).eq('id', order_id)
      return Response.json({
        status      : 'rejected',
        reason,
        actual_amount: actualAmount ?? null,
        expected_amount: PRICE,
      }, { headers: CORS })
    }

    // ── 7. ตรวจ trans_ref ซ้ำใน DB ──────────────────────────────────────────
    if (transRef) {
      const { data: dupOrder } = await supabase
        .from('orders').select('id').eq('trans_ref', transRef).eq('status', 'verified').single()
      if (dupOrder && dupOrder.id !== order_id) {
        await supabase.from('orders').update({ status: 'rejected', reject_reason: 'trans_ref_duplicate' }).eq('id', order_id)
        return Response.json({ status: 'rejected', reason: 'duplicate' }, { headers: CORS })
      }
    }

    // ── 8. สร้าง Redeem Code ─────────────────────────────────────────────────
    let redeemCode = ''
    for (let i = 0; i < 5; i++) {
      const candidate = generateCode()
      const { error } = await supabase.from('redeem_codes').insert({
        order_id: order_id, customer_name: order.name, code: candidate,
      })
      if (!error) { redeemCode = candidate; break }
    }
    if (!redeemCode) {
      return Response.json({ status: 'error', reason: 'code_generation_failed' }, { status: 500, headers: CORS })
    }

    // ── 9. Update order → verified ───────────────────────────────────────────
    await supabase.from('orders').update({ status: 'verified', trans_ref: transRef ?? null }).eq('id', order_id)

    // ── 10. ส่งอีเมล ─────────────────────────────────────────────────────────
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

    return Response.json({ status: 'verified', code: redeemCode }, { headers: CORS })

  } catch (err) {
    console.error('verify-slip error:', err)
    return Response.json({ status: 'error', reason: 'server_error' }, { status: 500, headers: CORS })
  }
})
