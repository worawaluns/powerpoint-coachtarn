import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildBars, isTest, renderDaily, type Order } from '../_shared/summary-email.ts'

// ── Cron: ทุกวัน 23:00 น. (Bangkok) = 16:00 UTC ─────────────────────────────
// ตั้งใน Supabase → Edge Functions → Schedule: "0 16 * * *"
// หน้าตาอีเมลตาม docs/mockups/email-summary/daily.html (ไอซ์ผ่าน 7 พ.ย. 2569)

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const OWNER_EMAIL    = Deno.env.get('OWNER_EMAIL')!

const FROM_EMAIL = 'Coach Tarn Slide · Report <noreply@coachtarnslide.com>'
const COLS = 'name, email, status, slip_url, ref_source, use_case, created_at, reject_reason, verify_detail, recheck_count, last_recheck_at'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── optional override_date สำหรับ test (YYYY-MM-DD, เวลาไทย) ─────────────
    let body: any = {}
    try { body = await req.json() } catch { /* cron has no body */ }
    const od = body?.override_date
    const todayStr: string = (typeof od === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(od))
      ? od
      : new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)

    // วันไทย = 17:00Z วันก่อน ถึง 17:00Z
    const startUTC   = new Date(`${todayStr}T00:00:00+07:00`).toISOString()
    const endUTC     = new Date(new Date(startUTC).getTime() + 86400000).toISOString()
    const chartStart = new Date(new Date(startUTC).getTime() - 7 * 86400000).toISOString()

    const { data: orders, error: e1 } = await supabase.from('orders').select(COLS)
      .gte('created_at', startUTC).lt('created_at', endUTC)
    if (e1) throw e1

    // เคสที่ระบบตรวจซ้ำผ่านวันนี้ (รวม order ของวันก่อนที่กู้คืนวันนี้)
    const { data: later, error: e2 } = await supabase.from('orders').select(COLS)
      .eq('status', 'verified').gt('recheck_count', 0)
      .gte('last_recheck_at', startUTC).lt('last_recheck_at', endUTC)
      .order('last_recheck_at', { ascending: true })
    if (e2) throw e2

    // ตัด internal_test ใน JS (.neq ใน PostgREST ตัดแถว ref_source = null ทิ้งไปด้วย)
    const today = ((orders ?? []) as Order[]).filter((o) => !isTest(o))
    const verifiedLater = ((later ?? []) as Order[]).filter((o) => !isTest(o))
    if (today.length === 0 && verifiedLater.length === 0) {
      console.log(`No orders ${todayStr}, skipping email`)
      return new Response('no orders', { status: 200 })
    }

    // กราฟ 8 วัน: นับตามวันที่สั่ง ยอดจริงจากสลิป
    const { data: chartRows, error: e3 } = await supabase.from('orders').select(COLS)
      .eq('status', 'verified').gte('created_at', chartStart).lt('created_at', endUTC)
    if (e3) throw e3

    // slip images for the email (signed 7 days, the bucket is private): every order of the day that has one
    await Promise.all(today.map(async (o: Order) => {
      if (!o.slip_url) return
      const { data } = await supabase.storage.from('slips').createSignedUrl(o.slip_url, 7 * 24 * 3600)
      o.slipUrl = data?.signedUrl ?? null
    }))

    const { html, subject, people, revenue } = renderDaily({
      todayStr, orders: today, verifiedLater, bars: buildBars(todayStr, (chartRows ?? []) as Order[]),
    })

    const resendRes = await fetch('https://api.resend.com/emails', {
      method : 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [OWNER_EMAIL], subject, html }),
    })
    if (!resendRes.ok) throw new Error(`Resend ${resendRes.status}: ${await resendRes.text()}`)

    console.log(`Daily summary sent ${todayStr}: ${people} people, ฿${revenue}, ${verifiedLater.length} verified-later`)
    return new Response('ok', { status: 200 })

  } catch (err) {
    console.error('daily-summary error:', err)
    return new Response('error', { status: 500 })
  }
})
