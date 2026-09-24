import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SLIP2GO_KEY      = Deno.env.get('SLIP2GO_SECRET_KEY')!
const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')!
const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY')!
const DOWNLOAD_URL     = Deno.env.get('DOWNLOAD_PAGE_URL') ?? 'https://coachtarnslide.com/download'
const ADMIN_EMAIL      = Deno.env.get('ADMIN_REVIEW_EMAIL') ?? 'powerpoint.officialth@gmail.com'
const REVIEW_PAGE      = Deno.env.get('REVIEW_PAGE_URL') ?? 'https://coachtarnslide.com/review'

// Resend sender — DKIM อยู่ที่ resend._domainkey.coachtarnslide.com → ใช้ root domain
const FROM_EMAIL = 'PowerPoint Template by Coach Tarn <noreply@coachtarnslide.com>'

async function sendEmailViaResend(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method : 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type' : 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend ${res.status}: ${err}`)
  }
  return res.json()
}

// team packs: seats -> price. 1 seat stays 499 so nothing changes for normal orders.
const PACK_PRICE: Record<number, string> = { 1: '499', 5: '1990', 10: '3490', 20: '5990' }
const PRICE          = '499'
const ACCOUNT_NUMBER = '2293980961'
const ACCOUNT_TYPE   = '01004'  // KBANK
// KBANK ส่งชื่อมาพร้อม ์ ตัวอื่นบางที่ส่งไม่มี — รับทั้ง 2 รูปแบบ (Slip2Go match แบบ OR)
const ACCOUNT_NAMES_TH = ['บจก. ดับเบิ้ลคราฟ', 'บจก. ดับเบิ้ลคราฟ์']
// ธนาคารอื่น (SCB, BBL, BAY ฯลฯ) แสดงชื่อบัญชีปลายทางเป็นภาษาอังกฤษในสลิป
// → ต้อง match EN ด้วย ไม่งั้น cross-bank transfer จะถูก Slip2Go ตอบ 200401 wrong_account
const ACCOUNT_NAMES_EN = ['DOUBLE CRAFT CO.,LTD.', 'DOUBLE CRAFT CO., LTD.']

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
function buildEmailHtml(name: string, codes: string | string[], price = '499'): string {
  const list = Array.isArray(codes) ? codes : [codes]
  const paid = Number(price).toLocaleString('en-US')
  const code = list[0]
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
      <p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:1px;color:#8E8E93;text-transform:uppercase;">${list.length > 1 ? `Redeem Code ทั้ง ${list.length} สิทธิ์` : 'Redeem Code ของคุณ'}</p>

      ${list.length > 1 ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
        <tr><td style="padding:0 0 10px;font-size:13.5px;color:#6E6E73;line-height:1.6;">
          แพ็กทีม ${list.length} สิทธิ์ แจกให้ทีมคนละ 1 โค้ด ใช้กรอกที่หน้าดาวน์โหลดได้เลย ทุกโค้ดได้คลังเต็มเท่ากัน
        </td></tr>
        ${list.map((c, i) => `<tr>
          <td style="padding:7px 14px;border:1px solid #EFEFEF;border-radius:10px;background:#FAFAFA;font-family:'Courier New',Courier,monospace;font-size:17px;font-weight:800;letter-spacing:2px;color:#1D1D1F;">
            <span style="display:inline-block;width:26px;font-family:-apple-system,Arial,sans-serif;font-size:12px;font-weight:700;color:#8E8E93;letter-spacing:0;">${i + 1}.</span>${c}
          </td></tr><tr><td style="height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>`).join('')}
      </table>` : ''}

      <!-- Code box (single-seat orders only; team packs list every code above) -->
      ${list.length > 1 ? '' : `<table width="100%" cellpadding="0" cellspacing="0" border="0">
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
      </table>`}
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
        รับไฟล์สไลด์
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
          <td align="right" style="font-size:13px;color:#1D1D1F;padding-bottom:10px;">6,500+ สไลด์ &middot; 3 ฟอร์แมต${list.length > 1 ? ` &middot; ${list.length} สิทธิ์` : ''}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#8E8E93;border-top:1px solid #F0F0F0;padding-top:14px;">ยอดชำระ</td>
          <td align="right" style="font-size:18px;color:#D34724;font-weight:800;border-top:1px solid #F0F0F0;padding-top:14px;">&#3647;${paid}</td>
        </tr>
      </table>
    </td></tr>

    <!-- ── Tax invoice (manual, on request) ── -->
    <tr><td style="padding:26px 48px;border-bottom:1px solid #F0F0F0;background:#FFF8F5;">
      <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:#1D1D1F;">ต้องการใบกำกับภาษี / ใบเสร็จในนามบริษัท?</p>
      <p style="margin:0 0 12px;font-size:13px;color:#6E6E73;line-height:1.7;">
        ระบบไม่ได้ออกให้อัตโนมัติ ทักแชทเพจ แนบสลิปโอนเงิน แล้วแจ้งชื่อบริษัท ที่อยู่ และเลขประจำตัวผู้เสียภาษี
        แอดมินจะออกเอกสารส่งกลับภายใน 1 วันทำการ
      </p>
      <a href="https://m.me/ThePowerpointTemplate" target="_blank"
         style="display:inline-block;background:#ffffff;border:1.5px solid #D34724;color:#D34724;text-decoration:none;font-size:14px;font-weight:700;padding:11px 22px;border-radius:100px;">
        ขอใบกำกับภาษีทางแชท
      </a>
    </td></tr>

    <!-- ── Footer ── -->
    <tr><td align="center" style="padding:32px 48px 40px;background:#FAFAFA;">
      <p style="margin:0 0 10px;font-size:13px;color:#8E8E93;line-height:1.7;">
        เก็บอีเมลนี้ไว้นะคะ Code ใช้ได้ตลอด ไม่มีวันหมดอายุ
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


// ── สลิปที่ Slip2Go อ่านไม่ได้ (สลิปบริษัท/e-receipt ไม่มี QR) เข้าคิวให้แอดมินตรวจ ──
function adminReviewHtml(order: any, seats: number, price: string, link: string, slipUrl: string | null, why: string): string {
  const esc = (v: unknown) => String(v ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))
  const row = (k: string, v: string) => `<tr><td style="padding:9px 13px;font-size:13px;color:#8a8a92;border-bottom:1px solid #F4F4F6;">${k}</td><td align="right" style="padding:9px 13px;font-size:13.5px;font-weight:700;color:#1D1D1F;border-bottom:1px solid #F4F4F6;">${v}</td></tr>`
  const tax = order.tax_invoice ? `
    <p style="margin:16px 0 6px;font-size:12px;font-weight:700;letter-spacing:1px;color:#8E8E93;">ข้อมูลใบกำกับภาษี</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #EFEFEF;border-radius:12px;">
      ${row('ชื่อบริษัท', esc(order.tax_name))}
      ${row('สาขา', esc(order.tax_branch || 'สำนักงานใหญ่'))}
      ${row('เลขผู้เสียภาษี', esc(order.tax_id))}
      ${row('เบอร์โทรติดต่อ', esc(order.tax_phone || '-'))}
    </table>
    <p style="margin:8px 0 0;font-size:13px;color:#6E6E73;line-height:1.7;">ที่อยู่บริษัท ตามที่จดทะเบียน: ${esc(order.tax_address)}</p>
    <p style="margin:6px 0 0;font-size:13px;color:#1D1D1F;line-height:1.7;font-weight:700;">ส่งเอกสารไปที่: ${esc(order.tax_ship_address || order.tax_address)}</p>` : ''
  return `<!DOCTYPE html><html lang="th"><body style="margin:0;padding:0;background:#F2F2F7;font-family:-apple-system,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2F2F7;"><tr><td align="center" style="padding:32px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;border-radius:20px;overflow:hidden;">
  <tr><td style="height:5px;background:#F5A623;font-size:0;">&nbsp;</td></tr>
  <tr><td style="padding:26px 30px 22px;">
    <p style="margin:0 0 10px;"><span style="display:inline-block;font-size:11.5px;font-weight:700;color:#B26A00;background:#FFF4E5;padding:4px 11px;border-radius:100px;">${esc(why)}</span></p>
    <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#1D1D1F;">รอยืนยันเงินเข้า ${Number(price).toLocaleString('en-US')} บาท</h1>
    <p style="margin:0 0 16px;font-size:13.5px;color:#6E6E73;">เช็คยอดในบัญชีแล้วกดยืนยันเพื่อส่ง Redeem Code ให้ลูกค้า</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #EFEFEF;border-radius:12px;">
      ${row('เลขออเดอร์', esc(order.id).slice(0, 8))}
      ${row('ยอดที่ต้องได้รับ', Number(price).toLocaleString('en-US') + ' บาท')}
      ${row('แพ็ก', seats + ' สิทธิ์')}
      ${row('ชื่อผู้สั่งซื้อ', esc(order.name))}
      ${row('อีเมลลูกค้า', esc(order.email))}
      ${row('ขอใบกำกับภาษี', order.tax_invoice ? 'ใช่' : 'ไม่')}
    </table>
    ${tax}
    ${slipUrl ? `<p style="margin:16px 0 0;"><a href="${slipUrl}" target="_blank" style="font-size:13.5px;color:#D34724;font-weight:700;">เปิดดูสลิปที่ลูกค้าแนบ</a></p>` : ''}
    <a href="${link}" target="_blank" style="display:block;text-align:center;background:#16A34A;color:#fff;text-decoration:none;font-size:15.5px;font-weight:800;padding:15px;border-radius:12px;margin-top:18px;">เปิดหน้ายืนยันเงินเข้า</a>
    <p style="margin:12px 0 0;font-size:12px;color:#9a9aa2;line-height:1.7;">ลิงก์ใช้ได้ครั้งเดียว หมดอายุใน 7 วัน กดแล้วจะมีหน้ายืนยันอีกครั้งก่อนส่งจริง</p>
  </td></tr>
</table></td></tr></table></body></html>`
}

async function queueForReview(supabase: any, order: any, seats: number, price: string, why: string) {
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8)
  await supabase.from('orders').update({
    status: 'pending_review', review_token: token, review_sent_at: new Date().toISOString(),
    reject_reason: null,
  }).eq('id', order.id)
  let slipUrl: string | null = null
  try {
    const { data } = await supabase.storage.from('slips').createSignedUrl(order.slip_url, 7 * 24 * 3600)
    slipUrl = data?.signedUrl ?? null
  } catch (_) {}
  try {
    await sendEmailViaResend(
      ADMIN_EMAIL,
      `รอยืนยันเงินเข้า ${Number(price).toLocaleString('en-US')} บาท ${order.name}`,
      adminReviewHtml(order, seats, price, `${REVIEW_PAGE}?t=${token}`, slipUrl, why),
    )
  } catch (e) { console.error('[verify-slip] admin review mail failed:', e) }
}

// ── Main ─────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { order_id, turnstile_token, is_retry, final } = await req.json()
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
      .select('id, name, email, slip_url, status, trans_ref, manychat_subscriber_id, pack, pay_channel')
      .eq('id', order_id)
      .single()

    if (orderErr || !order) {
      return Response.json({ status: 'rejected', reason: 'order_not_found' }, { headers: CORS })
    }
    if (order.status === 'verified') {
      return Response.json({ status: 'already_verified' }, { headers: CORS })
    }
    // already waiting on a person: re-checking would only mail the admin again and
    // invalidate the review link they were sent
    if (order.status === 'pending_review') {
      return Response.json({ status: 'pending_review' }, { headers: CORS })
    }

    // ── 2b. ราคาตามแพ็ก (order.pack) ─────────────────────────────────────────
    const seats     = PACK_PRICE[Number(order.pack) || 1] ? (Number(order.pack) || 1) : 1
    const packPrice = PACK_PRICE[seats]

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
                checkDuplicate: is_retry ? false : true,
                checkReceiver: [
                  ...ACCOUNT_NAMES_TH.map(name => ({
                    accountType  : ACCOUNT_TYPE,
                    accountNameTH: name,
                    accountNumber: ACCOUNT_NUMBER,
                  })),
                  ...ACCOUNT_NAMES_EN.map(name => ({
                    accountType  : ACCOUNT_TYPE,
                    accountNameEN: name,
                    accountNumber: ACCOUNT_NUMBER,
                  })),
                ],
                checkAmount: { type: 'eq', amount: packPrice },
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
      await supabase.from('orders').update({
        verify_detail : { error: 'slip2go_fetch_failed', message: String(e) },
      }).eq('id', order_id)
      await queueForReview(supabase, order, seats, packPrice, 'ระบบตรวจสลิปขัดข้อง ต้องเช็คด้วยตา')
      return Response.json({ status: 'pending_review' }, { headers: CORS })
    }

    const s2gCode      = slip?.code?.toString()
    const s2gMessage   = slip?.message ?? null
    const transRef     = slip?.data?.transRef ?? null
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

    // ── 4b. โอนจากบัญชีบริษัท ────────────────────────────────────────────────
    // ลูกค้าเลือกเองตั้งแต่หน้าแนบสลิปว่าโอนจากบัญชีบริษัท สลิปกลุ่มนี้ออกจากระบบ
    // หลังบ้านของธนาคาร ไม่มี QR ให้เครื่องอ่าน จึงไม่ปล่อยให้ผลอัตโนมัติ reject
    // ถ้าอ่านได้ผ่าน (200200) ยังได้ Code ทันทีเหมือนเดิม
    if (order.pay_channel === 'corporate' && s2gCode !== '200200') {
      await supabase.from('orders').update({
        slip2go_code: s2gCode, slip2go_message: s2gMessage,
        verify_detail: { actualAmount, transRef },
      }).eq('id', order_id)
      await queueForReview(supabase, order, seats, packPrice,
        'ลูกค้าแจ้งว่าโอนจากบัญชีบริษัท ต้องเช็คยอดเงินเข้าบัญชีด้วยตา')
      return Response.json({ status: 'pending_review' }, { headers: CORS })
    }

    // ── 5. สลิปซ้ำ ───────────────────────────────────────────────────────────
    if (s2gCode === '200501') {
      // First call — could be Slip2Go's own cache from previous failed call.
      // Return pending to trigger frontend retry with checkDuplicate=false.
      if (!is_retry) {
        return Response.json({ status: 'bbl_pending' }, { headers: CORS })
      }
      // After retry with checkDuplicate=false: still duplicate → genuine duplicate.
      await supabase.from('orders').update({
        status         : 'rejected',
        reject_reason  : 'duplicate_slip',
        slip2go_code   : s2gCode,
        slip2go_message: s2gMessage,
        verify_detail  : { transRef, actualAmount, isDuplicate: true },
      }).eq('id', order_id)
      return Response.json({ status: 'rejected', reason: 'duplicate' }, { headers: CORS })
    }

    // ── 6. SUCCESS path ──────────────────────────────────────────────────────
    // Slip2Go คืน 200200 = "Slip is Valid" → ตรวจครบทุกเงื่อนไขที่เราส่งใน
    // checkCondition แล้ว (account name + account number + amount + duplicate)
    // เราเชื่อ Slip2Go เป็นหลัก เพราะถ้าไม่ตรง เขาคืน code อื่น (200401/200402/...)
    // เก็บ amountOk เป็น sanity safety net เผื่อกรณีหายากที่ Slip2Go มี bug
    let amountOk = false
    let bankId = '', receiverAccount = '', accountDigits = ''

    if (s2gCode === '200200') {
      amountOk        = Number(actualAmount) === Number(packPrice)
      bankId          = slip?.data?.receiver?.bank?.id ?? slip?.data?.bank?.id ?? ''
      receiverAccount = slip?.data?.receiver?.account?.bank?.account ?? ''
      accountDigits   = receiverAccount.replace(/\D/g, '')

      console.log('[verify-slip] 200200 sanity check:', {
        amountOk, bankId, receiverAccount, accountDigits, actualAmount,
      })

      if (!amountOk) {
        await supabase.from('orders').update({
          status         : 'rejected',
          reject_reason  : 'wrong_amount',
          slip2go_code   : s2gCode,
          slip2go_message: s2gMessage,
          verify_detail  : { amountOk, bankId, receiverAccount, accountDigits, actualAmount, transRef },
        }).eq('id', order_id)
        return Response.json({ status: 'rejected', reason: 'wrong_amount', actual_amount: actualAmount }, { headers: CORS })
      }
      // ✅ Slip2Go validated + amount sanity passed — continue to section 7
    } else {
      // ── ไม่ผ่าน — direct reject (ไม่แปลงเป็น bbl_pending ยกเว้น 200404) ────

      // 200404 = slip ยังหาไม่เจอใน BBL/bank system → bbl_pending (real BBL delay)
      if (s2gCode === '200404') {
        if (final) {                       // รอครบทุกรอบแล้วยังอ่านไม่ได้ ส่งให้แอดมินตรวจมือ
          await queueForReview(supabase, order, seats, packPrice, 'สลิปไม่มี QR ตรวจอัตโนมัติไม่ได้')
          return Response.json({ status: 'pending_review' }, { headers: CORS })
        }
        return Response.json({ status: 'bbl_pending' }, { headers: CORS })
      }

      // 200500 = Slip is Fraud. Corporate e-receipts and re-saved images trip this
      // even when the money really did arrive, so a person checks the bank instead
      // of the customer being told "สลิปไม่ถูกต้อง" with no way forward.
      // Anything we do not recognise goes the same way.
      if (s2gCode === '200500' || !['200401', '200402', '200403'].includes(s2gCode)) {
        await supabase.from('orders').update({
          slip2go_code: s2gCode, slip2go_message: s2gMessage,
          verify_detail: { actualAmount, transRef },
        }).eq('id', order_id)
        await queueForReview(supabase, order, seats, packPrice,
          s2gCode === '200500'
            ? 'ระบบอ่านสลิปแล้วสงสัยว่าไฟล์ถูกแก้ไข ต้องเช็คยอดเงินเข้าในบัญชีด้วยตาก่อนยืนยัน'
            : `ระบบตรวจสลิปตอบรหัส ${s2gCode} ที่ยังไม่รู้จัก ต้องเช็คด้วยตา`)
        return Response.json({ status: 'pending_review' }, { headers: CORS })
      }

      let reason = 'invalid_slip'
      if      (s2gCode === '200401') reason = 'wrong_account'
      else if (s2gCode === '200402') reason = 'wrong_amount'

      await supabase.from('orders').update({
        status         : 'rejected',
        reject_reason  : reason,
        slip2go_code   : s2gCode,
        slip2go_message: s2gMessage,
        verify_detail  : { actualAmount, transRef },
      }).eq('id', order_id)
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
        await supabase.from('orders').update({
          status         : 'rejected',
          reject_reason  : 'trans_ref_duplicate',
          slip2go_code   : s2gCode,
          slip2go_message: s2gMessage,
          verify_detail  : { transRef, conflictingOrderId: dupOrder.id },
        }).eq('id', order_id)
        return Response.json({ status: 'rejected', reason: 'duplicate' }, { headers: CORS })
      }
    }

    // ── 8. สร้าง Redeem Code (1 ใบต่อ 1 สิทธิ์) ──────────────────────────────
    const codes: string[] = []
    for (let seat = 0; seat < seats; seat++) {
      for (let i = 0; i < 5; i++) {                 // retry on the rare code collision
        const candidate = generateCode()
        const { error } = await supabase.from('redeem_codes').insert({
          order_id: order_id, customer_name: order.name, code: candidate,
        })
        if (!error) { codes.push(candidate); break }
      }
    }
    if (codes.length !== seats) {
      return Response.json({ status: 'error', reason: 'code_generation_failed' }, { status: 500, headers: CORS })
    }
    const redeemCode = codes[0]

    // ── 9. Update order → verified ───────────────────────────────────────────
    await supabase.from('orders').update({
      status         : 'verified',
      trans_ref      : transRef ?? null,
      slip2go_code   : s2gCode,
      slip2go_message: s2gMessage,
      verify_detail  : { amountOk, bankId, accountDigits, actualAmount, transRef },
    }).eq('id', order_id)

    // ── 10. ส่งอีเมล via Resend ──────────────────────────────────────────────
    await sendEmailViaResend(
      order.email,
      seats > 1 ? `✅ Redeem Code ${seats} สิทธิ์ของคุณพร้อมแล้ว` : `✅ Redeem Code ของคุณพร้อมแล้ว ${redeemCode}`,
      buildEmailHtml(order.name, codes, packPrice),
    )

    // ── 11. ManyChat tag (additive, non-critical — only for Messenger-referred users) ────
    try {
      const mcId = order.manychat_subscriber_id
      if (mcId) {
        const mcRes = await fetch('https://api.manychat.com/fb/subscriber/addTagByName', {
          method : 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('MANYCHAT_API_TOKEN')}`,
            'Content-Type' : 'application/json',
          },
          body: JSON.stringify({
            subscriber_id: Number(mcId),
            tag_name     : 'website_purchased',
          }),
        })
        if (!mcRes.ok) {
          const errorBody = await mcRes.text()
          console.error('[verify-slip] ManyChat API non-200:', mcRes.status, errorBody)
        }
      }
    } catch (error) {
      console.error('[verify-slip] ManyChat tag call failed (non-critical):', error)
      // Must NOT throw — order is already verified and email sent
    }

    return Response.json({ status: 'verified', code: redeemCode, codes, seats }, { headers: CORS })

  } catch (err) {
    console.error('verify-slip error:', err)
    return Response.json({ status: 'error', reason: 'server_error' }, { status: 500, headers: CORS })
  }
})
