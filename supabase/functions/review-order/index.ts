// Manual review for slips Slip2Go cannot read (corporate e-receipts have no QR).
// The admin gets a mail with a one-time token link; this function backs that page.
//   { token, action: 'info' }    -> order summary + signed slip url (for the review page)
//   { token, action: 'approve' } -> issue redeem codes, mail the customer, mark verified
//   { token, action: 'reject' }  -> mark rejected, mail the customer to contact admin
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const DOWNLOAD_URL   = Deno.env.get('DOWNLOAD_PAGE_URL') ?? 'https://coachtarnslide.com/download'
const FROM_EMAIL     = 'PowerPoint Template by Coach Tarn <noreply@coachtarnslide.com>'
const PACK_PRICE: Record<number, string> = { 1: '499', 5: '1990', 10: '3490', 20: '5990' }

async function sendMail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method : 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body   : JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
  return res.json()
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `TARN-${s}`
}

const esc = (v: unknown) => String(v ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))

// ── customer mail: codes (+ tax invoice note only when they asked for one) ────
function customerHtml(order: any, codes: string[]): string {
  const paid = Number(PACK_PRICE[Number(order.pack) || 1] ?? '499').toLocaleString('en-US')
  const list = codes.map((c, i) => `
    <tr><td style="padding:9px 14px;border:1px solid #EFEFEF;border-radius:10px;background:#FAFAFA;
      font-family:'Courier New',monospace;font-size:17px;font-weight:800;letter-spacing:2px;color:#1D1D1F;">
      <span style="display:inline-block;width:26px;font-family:Arial,sans-serif;font-size:12px;color:#8E8E93;letter-spacing:0;">${i + 1}.</span>${c}
    </td></tr><tr><td style="height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>`).join('')
  const taxBlock = order.tax_invoice ? `
    <tr><td style="padding:24px 40px;background:#FFF8F5;border-top:1px solid #F0F0F0;">
      <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:#1D1D1F;">ใบกำกับภาษี</p>
      <p style="margin:0;font-size:13px;color:#6E6E73;line-height:1.75;">
        ทีมงานจะออกใบกำกับภาษีในนาม <strong>${esc(order.tax_name)}</strong>
        ${order.tax_branch ? `(${esc(order.tax_branch)})` : ''}
        และจัดส่งทางไปรษณีย์ตามที่อยู่ที่แจ้งไว้ ภายใน <strong>7 ถึง 10 วันทำการ</strong>
        ไม่รวมวันเสาร์ อาทิตย์ และวันหยุดนักขัตฤกษ์ ขอบคุณค่ะ
      </p>
    </td></tr>` : ''
  return `<!DOCTYPE html><html lang="th"><body style="margin:0;padding:0;background:#F2F2F7;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2F2F7;"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.08);">
  <tr><td style="height:5px;background:linear-gradient(90deg,#EB7D4A,#D34724);font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td align="center" style="padding:46px 40px 30px;border-bottom:1px solid #F0F0F0;">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;"><tr><td align="center" valign="middle"
      style="width:74px;height:74px;border-radius:50%;background:linear-gradient(135deg,#34C759,#28A745);font-size:38px;color:#fff;line-height:74px;">&#10003;</td></tr></table>
    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:2px;color:#D34724;">ตรวจสอบเงินเข้าเรียบร้อย</p>
    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#1D1D1F;">ยืนยันการชำระเงินแล้ว</h1>
    <p style="margin:0;font-size:15px;color:#6E6E73;line-height:1.65;">
      สวัสดีคุณ <strong style="color:#1D1D1F;">${esc(order.name)}</strong><br>
      ทีมงานตรวจสอบยอดโอน ${paid} บาท เรียบร้อยแล้วค่ะ
    </p>
  </td></tr>
  <tr><td style="padding:30px 40px 26px;border-bottom:1px solid #F0F0F0;">
    <p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:1px;color:#8E8E93;">
      ${codes.length > 1 ? `REDEEM CODE ทั้ง ${codes.length} สิทธิ์ แจกให้ทีมคนละ 1 โค้ด` : 'REDEEM CODE ของคุณ'}</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">${list}</table>
  </td></tr>
  <tr><td align="center" style="padding:30px 40px;background:#FAFAFA;border-bottom:1px solid #F0F0F0;">
    <a href="${DOWNLOAD_URL}?code=${encodeURIComponent(codes[0])}" target="_blank"
      style="display:inline-block;background:linear-gradient(135deg,#EB7D4A,#D34724);color:#fff;text-decoration:none;font-size:16px;font-weight:800;padding:16px 44px;border-radius:100px;">
      รับไฟล์สไลด์</a>
    <p style="margin:14px 0 0;font-size:13px;color:#AEAEB2;">กดปุ่มด้านบนเพื่อไปยังหน้าดาวน์โหลด</p>
  </td></tr>
  ${taxBlock}
  <tr><td align="center" style="padding:26px 40px 32px;background:#FAFAFA;">
    <p style="margin:0;font-size:12.5px;color:#8E8E93;line-height:1.7;">เก็บอีเมลนี้ไว้นะคะ Code ใช้ได้ตลอด ไม่มีวันหมดอายุ</p>
  </td></tr>
</table></td></tr></table></body></html>`
}

function rejectHtml(order: any): string {
  return `<!DOCTYPE html><html lang="th"><body style="margin:0;padding:0;background:#F2F2F7;font-family:-apple-system,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2F2F7;"><tr><td align="center" style="padding:40px 16px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;border-radius:22px;overflow:hidden;">
  <tr><td style="height:5px;background:#D34724;font-size:0;">&nbsp;</td></tr>
  <tr><td style="padding:36px 40px;">
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#1D1D1F;">ยังตรวจสอบยอดโอนไม่พบ</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6E6E73;line-height:1.75;">
      สวัสดีคุณ ${esc(order.name)} ทีมงานตรวจสอบรายการโอนตามสลิปที่แนบมาแล้ว แต่ยังไม่พบยอดเงินเข้าบัญชีค่ะ
      รบกวนทักแชทเพจพร้อมส่งสลิปตัวเต็ม ทีมงานจะตรวจสอบให้อีกครั้งทันที
    </p>
    <a href="https://m.me/ThePowerpointTemplate" style="display:inline-block;background:#D34724;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 28px;border-radius:100px;">ทักแชทเพจ</a>
  </td></tr>
</table></td></tr></table></body></html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { token, action } = await req.json()
    if (!token || typeof token !== 'string' || token.length < 20) {
      return Response.json({ error: 'bad_token' }, { status: 400, headers: CORS })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: order } = await supabase.from('orders').select('*').eq('review_token', token).single()
    if (!order) return Response.json({ error: 'not_found' }, { status: 404, headers: CORS })

    // link expires after 7 days
    const sent = order.review_sent_at ? new Date(order.review_sent_at).getTime() : 0
    if (sent && Date.now() - sent > 7 * 24 * 3600 * 1000) {
      return Response.json({ error: 'expired' }, { status: 410, headers: CORS })
    }

    const seats     = PACK_PRICE[Number(order.pack) || 1] ? (Number(order.pack) || 1) : 1
    const packPrice = PACK_PRICE[seats]

    // ── info: what the review page shows ────────────────────────────────────
    if (action === 'info') {
      const { data: signed } = await supabase.storage.from('slips').createSignedUrl(order.slip_url, 900)
      return Response.json({
        order: {
          id: order.id, name: order.name, email: order.email, status: order.status,
          pack: seats, amount: packPrice, created_at: order.created_at,
          tax_invoice: order.tax_invoice, tax_name: order.tax_name, tax_branch: order.tax_branch,
          tax_id: order.tax_id, tax_address: order.tax_address, tax_phone: order.tax_phone,
          tax_ship_address: order.tax_ship_address,
          slip2go_code: order.slip2go_code, reviewed_at: order.reviewed_at,
        },
        slip_url: signed?.signedUrl ?? null,
      }, { headers: CORS })
    }

    if (order.status === 'verified') return Response.json({ error: 'already_verified' }, { headers: CORS })
    if (order.reviewed_at)           return Response.json({ error: 'already_reviewed' }, { headers: CORS })

    // ── reject ──────────────────────────────────────────────────────────────
    if (action === 'reject') {
      await supabase.from('orders').update({
        status: 'rejected', reject_reason: 'manual_not_found',
        reviewed_at: new Date().toISOString(), reviewed_by: 'admin_email', review_token: null,
      }).eq('id', order.id)
      try { await sendMail(order.email, 'เรื่องการตรวจสอบยอดโอนของคุณ', rejectHtml(order)) } catch (_) {}
      return Response.json({ ok: true, result: 'rejected' }, { headers: CORS })
    }

    // ── approve: issue one code per seat, then mail the customer ────────────
    if (action === 'approve') {
      const codes: string[] = []
      for (let seat = 0; seat < seats; seat++) {
        for (let i = 0; i < 5; i++) {
          const candidate = generateCode()
          const { error } = await supabase.from('redeem_codes').insert({
            order_id: order.id, customer_name: order.name, code: candidate,
          })
          if (!error) { codes.push(candidate); break }
        }
      }
      if (codes.length !== seats) {
        return Response.json({ error: 'code_generation_failed' }, { status: 500, headers: CORS })
      }
      await supabase.from('orders').update({
        status: 'verified', reviewed_at: new Date().toISOString(),
        reviewed_by: 'admin_email', review_token: null,
      }).eq('id', order.id)

      await sendMail(
        order.email,
        seats > 1 ? `ยืนยันการชำระเงินแล้ว Redeem Code ${seats} สิทธิ์` : `ยืนยันการชำระเงินแล้ว Redeem Code ${codes[0]}`,
        customerHtml(order, codes),
      )
      return Response.json({ ok: true, result: 'verified', codes, tax_invoice: order.tax_invoice }, { headers: CORS })
    }

    return Response.json({ error: 'bad_action' }, { status: 400, headers: CORS })
  } catch (err) {
    console.error('[review-order]', err)
    return Response.json({ error: 'server_error', detail: String(err) }, { status: 500, headers: CORS })
  }
})
