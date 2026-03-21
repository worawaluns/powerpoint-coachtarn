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
const DOWNLOAD_URL     = Deno.env.get('DOWNLOAD_PAGE_URL') ?? 'https://coachtarnslide.com/download'

const PRICE          = '499'
const ACCOUNT_NUMBER = '1578147760'
const ACCOUNT_NAME   = 'บจก. ดับเบิ้ลคราฟ์'
const ACCOUNT_TYPE   = '01004'  // KBANK

// ── Generate CT-XXXXXXXX (CT- + 8 random chars, 1.1T combinations) ───────────
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
  const fbUrl = 'https://www.facebook.com/ThePowerpointTemplate'
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Redeem Code ของคุณพร้อมแล้ว</title>
</head>
<body style="margin:0;padding:0;background:#F2F2F7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2F2F7;">
<tr><td style="padding:40px 16px 56px;" align="center">

  <!-- Card -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="max-width:580px;background:#ffffff;border-radius:24px;overflow:hidden;
           box-shadow:0 2px 8px rgba(0,0,0,0.05),0 12px 40px rgba(0,0,0,0.08);">

    <!-- ── Gradient top bar ── -->
    <tr><td style="height:5px;background:linear-gradient(90deg,#EB7D4A 0%,#D34724 100%);font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- ── Hero section ── -->
    <tr><td align="center" style="padding:52px 48px 40px;border-bottom:1px solid #F0F0F0;">

      <!-- Icon circle: table-based for email client compat (no flexbox) -->
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;">
        <tr>
          <td align="center" valign="middle"
            style="width:80px;height:80px;border-radius:50%;
                   background:linear-gradient(135deg,#34C759 0%,#28A745 100%);
                   box-shadow:0 8px 24px rgba(40,167,69,0.30);
                   font-size:42px;font-weight:900;color:#ffffff;
                   line-height:80px;text-align:center;">
            &#10003;
          </td>
        </tr>
      </table>

      <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;color:#D34724;text-transform:uppercase;">คำสั่งซื้อสำเร็จ</p>
      <h1 style="margin:0 0 14px;font-size:28px;font-weight:800;color:#1D1D1F;line-height:1.25;letter-spacing:-0.5px;">ขอบคุณที่สั่งซื้อนะคะ &#128522;</h1>
      <p style="margin:0;font-size:15px;color:#6E6E73;line-height:1.65;">
        สวัสดีคุณ <strong style="color:#1D1D1F;font-weight:700;">${name}</strong><br>
        PowerPoint Template by Coach Tarn พร้อมให้คุณแล้วค่ะ
      </p>
    </td></tr>

    <!-- ── Redeem Code ── -->
    <tr><td style="padding:36px 48px 32px;border-bottom:1px solid #F0F0F0;">
      <p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:1px;color:#8E8E93;text-transform:uppercase;">Redeem Code ของคุณ</p>

      <!-- Code box -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background:linear-gradient(135deg,#FFF3EF 0%,#FFF8F5 100%);
                     border:2px solid rgba(211,71,36,0.15);
                     border-radius:16px;padding:24px 28px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#D34724;letter-spacing:1px;text-transform:uppercase;">รหัสรับสไลด์</p>
            <span style="font-family:'Courier New',Courier,monospace;
                         font-size:30px;font-weight:900;color:#1D1D1F;
                         letter-spacing:5px;display:block;margin-bottom:8px;">${code}</span>
            <!-- Progress dots for visual flair -->
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:6px;height:6px;background:#D34724;border-radius:50%;"></td>
                <td style="width:4px;"></td>
                <td style="width:6px;height:6px;background:#EB7D4A;border-radius:50%;"></td>
                <td style="width:4px;"></td>
                <td style="width:6px;height:6px;background:#F5A97A;border-radius:50%;"></td>
                <td style="padding-left:10px;font-size:12px;color:#8E8E93;vertical-align:middle;">ใช้ได้ตลอด &middot; ไม่มีวันหมดอายุ</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- ── How to redeem ── -->
    <tr><td style="padding:32px 48px 28px;border-bottom:1px solid #F0F0F0;">
      <p style="margin:0 0 22px;font-size:12px;font-weight:700;letter-spacing:1px;color:#8E8E93;text-transform:uppercase;">วิธีรับไฟล์สไลด์</p>

      <!-- Step 1 -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
        <tr>
          <td width="40" valign="top">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr><td align="center" valign="middle"
                style="width:32px;height:32px;border-radius:10px;
                       background:#D34724;
                       font-size:14px;font-weight:800;color:#ffffff;
                       line-height:32px;text-align:center;">
                1
              </td></tr>
            </table>
          </td>
          <td style="padding-left:14px;padding-top:5px;font-size:15px;color:#1D1D1F;line-height:1.5;">
            กดปุ่ม <strong style="color:#D34724;">"รับไฟล์สไลด์"</strong> ด้านล่าง
          </td>
        </tr>
      </table>

      <!-- Step 2 -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
        <tr>
          <td width="40" valign="top">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr><td align="center" valign="middle"
                style="width:32px;height:32px;border-radius:10px;
                       background:#D34724;
                       font-size:14px;font-weight:800;color:#ffffff;
                       line-height:32px;text-align:center;">
                2
              </td></tr>
            </table>
          </td>
          <td style="padding-left:14px;padding-top:5px;font-size:15px;color:#1D1D1F;line-height:1.5;">
            วาง Code&nbsp;<span style="background:#FFF3EF;border-radius:6px;padding:3px 10px;font-family:'Courier New',monospace;font-size:13px;color:#D34724;font-weight:700;letter-spacing:2px;">${code}</span>&nbsp;ในช่องที่กำหนด
          </td>
        </tr>
      </table>

      <!-- Step 3 -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="40" valign="top">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr><td align="center" valign="middle"
                style="width:32px;height:32px;border-radius:10px;
                       background:#D34724;
                       font-size:14px;font-weight:800;color:#ffffff;
                       line-height:32px;text-align:center;">
                3
              </td></tr>
            </table>
          </td>
          <td style="padding-left:14px;padding-top:5px;font-size:15px;color:#1D1D1F;line-height:1.5;">
            เลือกโฟลเดอร์ที่ต้องการแล้วดาวน์โหลดได้เลย
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- ── CTA button ── -->
    <tr><td align="center" style="padding:36px 48px;border-bottom:1px solid #F0F0F0;background:#FAFAFA;">
      <a href="${downloadUrl}" target="_blank"
         style="display:inline-block;
                background:linear-gradient(135deg,#EB7D4A 0%,#D34724 100%);
                color:#ffffff;text-decoration:none;
                font-size:17px;font-weight:800;
                padding:18px 52px;border-radius:100px;
                letter-spacing:-0.2px;
                box-shadow:0 6px 20px rgba(211,71,36,0.35);">
        รับไฟล์สไลด์ &rarr;
      </a>
      <p style="margin:16px 0 0;font-size:13px;color:#AEAEB2;">กดปุ่มด้านบนเพื่อไปยังหน้าดาวน์โหลด</p>
    </td></tr>

    <!-- ── Order details ── -->
    <tr><td style="padding:28px 48px;border-bottom:1px solid #F0F0F0;">
      <p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:1px;color:#8E8E93;text-transform:uppercase;">รายละเอียดคำสั่งซื้อ</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-size:13px;color:#8E8E93;padding-bottom:10px;">สินค้า</td>
          <td align="right" style="font-size:13px;color:#1D1D1F;font-weight:600;padding-bottom:10px;">PowerPoint Template by Coach Tarn</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#8E8E93;padding-bottom:10px;">รายละเอียด</td>
          <td align="right" style="font-size:13px;color:#1D1D1F;padding-bottom:10px;">6,500+ สไลด์ &middot; 3 ฟอร์แมต</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#8E8E93;border-top:1px solid #F0F0F0;padding-top:14px;">ยอดชำระ</td>
          <td align="right" style="font-size:18px;color:#D34724;font-weight:800;border-top:1px solid #F0F0F0;padding-top:14px;">&#3647;499</td>
        </tr>
      </table>
    </td></tr>

    <!-- ── Footer ── -->
    <tr><td align="center" style="padding:32px 48px 40px;background:#FAFAFA;">
      <p style="margin:0 0 10px;font-size:13px;color:#8E8E93;line-height:1.7;">
        เก็บอีเมลนี้ไว้นะคะ — Code ใช้ได้ตลอด ไม่มีวันหมดอายุ
      </p>
      <p style="margin:0 0 20px;font-size:13px;color:#8E8E93;line-height:1.7;">
        มีปัญหาติดต่อได้ที่
        <a href="${fbUrl}" style="color:#D34724;text-decoration:none;font-weight:700;">Facebook: PowerPoint Template by Coach Tarn</a>
      </p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
        <tr>
          <td style="width:40px;height:1px;background:#E5E5EA;"></td>
          <td style="padding:0 12px;font-size:11px;color:#C7C7CC;">&#9670;</td>
          <td style="width:40px;height:1px;background:#E5E5EA;"></td>
        </tr>
      </table>
      <p style="margin:0;font-size:11px;color:#C7C7CC;">&#169; 2026 DoubleCraft Co., Ltd. &middot; All rights reserved</p>
    </td></tr>

  </table><!-- /Card -->

</td></tr>
</table>

</body></html>`
}

// ── Main ─────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { order_id, turnstile_token } = await req.json()
    if (!order_id) return Response.json({ error: 'missing order_id' }, { status: 400, headers: CORS })

    // ── 1. Turnstile bot check (soft — Slip2Go คือ security จริง) ────────────
    if (turnstile_token) {
      try {
        const ip = req.headers.get('CF-Connecting-IP') ?? ''
        const ok = await verifyTurnstile(turnstile_token, ip)
        if (!ok) console.warn(`[verify-slip] Turnstile failed for order ${order_id}`)
      } catch (e) {
        console.warn('[verify-slip] Turnstile check error:', e)
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
      console.log('[verify-slip] Slip2Go HTTP status:', slip2goRes.status)
      console.log('[verify-slip] Slip2Go raw response:', text.slice(0, 2000))
      slip = JSON.parse(text)
    } catch (e) {
      console.error('[verify-slip] Slip2Go fetch/parse error:', e)
      await supabase.from('orders').update({ status: 'rejected', reject_reason: 'invalid_slip' }).eq('id', order_id)
      return Response.json({ status: 'rejected', reason: 'invalid_slip' }, { headers: CORS })
    }

    const s2gCode     = slip?.code?.toString()
    const transRef    = slip?.data?.transRef
    const actualAmount = slip?.data?.amount ?? null

    console.log('[verify-slip] slip.code:', s2gCode, '| transRef:', transRef, '| amount:', actualAmount)

    // ── Slip2Go response codes (ดู doc: https://app.slip2go.com/shop/api-connect/response)
    // 200200 = Slip is Valid (ผ่านทุก checkCondition) ✅
    // 200000 = Slip found (ไม่ได้ส่ง checkCondition)
    // 200401 = Recipient Account Not Match
    // 200402 = Transfer Amount Not Match
    // 200403 = Transfer Date Not Match
    // 200404 = Slip Not Found
    // 200500 = Slip is Fraud
    // 200501 = Slip is Duplicated

    // ── 5. สลิปซ้ำ ───────────────────────────────────────────────────────────
    if (s2gCode === '200501') {
      await supabase.from('orders').update({ status: 'rejected', reject_reason: 'duplicate_slip' }).eq('id', order_id)
      return Response.json({ status: 'rejected', reason: 'duplicate' }, { headers: CORS })
    }

    // ── 6. ผ่านทุก condition → SUCCESS ───────────────────────────────────────
    if (s2gCode === '200200') {
      // ✅ ถูกต้อง — ดำเนินการต่อด้านล่าง
    } else {
      // ── ไม่ผ่าน — วิเคราะห์ reason จาก code ───────────────────────────────
      let reason = 'invalid_slip'
      if      (s2gCode === '200401') reason = 'wrong_account'
      else if (s2gCode === '200402') reason = 'wrong_amount'
      else if (s2gCode === '200404') reason = 'invalid_slip'
      else if (s2gCode === '200500') reason = 'invalid_slip'

      await supabase.from('orders').update({ status: 'rejected', reject_reason: reason }).eq('id', order_id)
      return Response.json({
        status       : 'rejected',
        reason,
        actual_amount: actualAmount,
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
