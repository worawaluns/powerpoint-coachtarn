// ═══════════════════════════════════════════════════════════════════════════
//  recheck-slips Edge Function — Phase 2 Background Recheck
//
//  เรียกโดย pg_cron ทุก 15 นาที
//  หา orders ที่ reject เพราะ delay (wrong_account / duplicate_slip) ภายใน
//  90 นาทีล่าสุด แล้วเรียก verify-slip ให้ตรวจใหม่ด้วย checkDuplicate=false
//  ถ้าผ่าน → verify-slip จะ generate code + ส่ง email + tag ManyChat ให้เอง
//
//  Auth: x-recheck-token header (env: RECHECK_TOKEN)
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RECHECK_TOKEN   = Deno.env.get('RECHECK_TOKEN')!

// ── Tunables (ตัด/เพิ่มได้ตาม cost / quota) ─────────────────────────────────
const RECHECK_REASONS  = ['wrong_account', 'duplicate_slip']
const WINDOW_MINUTES   = 90   // ออเดอร์เก่ากว่านี้ไม่ recheck
const COOLDOWN_MINUTES = 14   // เว้นช่วงระหว่าง recheck แต่ละครั้งของ order เดียว
const MAX_RECHECKS     = 3    // recheck ครั้งสูงสุดต่อ order

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-recheck-token',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.headers.get('x-recheck-token')
  if (!token || token !== RECHECK_TOKEN) {
    return Response.json({ error: 'forbidden' }, { status: 403, headers: CORS })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // ── Optional body: ad-hoc mode for manual recovery (bypass time filters) ──
  // Usage: POST { "order_ids": ["uuid1", "uuid2", ...] }
  // ใช้สำหรับ recover ลูกค้าที่ตกหล่นนอก window 90 นาที (เช่น order เก่ากว่า 24 ชม.)
  let explicitOrderIds: string[] | null = null
  try {
    const body = await req.json()
    if (Array.isArray(body?.order_ids) && body.order_ids.length > 0) {
      explicitOrderIds = body.order_ids.filter((x: unknown) => typeof x === 'string')
    }
  } catch (_) {
    // No body or invalid JSON — fall through to cron mode (default)
  }

  // ── Find candidates ───────────────────────────────────────────────────────
  let candidates: Array<{ id: string; recheck_count: number; reject_reason: string; created_at: string }> | null = null
  let queryErr: { message: string } | null = null

  if (explicitOrderIds) {
    // ── Ad-hoc mode: bypass window/cooldown/MAX_RECHECKS filters ────────────
    // Safety: ยังคง enforce status='rejected' (ไม่ให้ override verified order)
    console.log(`[recheck-slips] ad-hoc mode: ${explicitOrderIds.length} order(s)`)
    const { data, error } = await supabase
      .from('orders')
      .select('id, recheck_count, reject_reason, created_at')
      .in('id', explicitOrderIds)
      .eq('status', 'rejected')
    candidates = data
    queryErr   = error
  } else {
    // ── Cron mode (default): scan recent rejected candidates ────────────────
    const now           = Date.now()
    const windowStart   = new Date(now - WINDOW_MINUTES   * 60 * 1000).toISOString()
    const cooldownStart = new Date(now - COOLDOWN_MINUTES * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('orders')
      .select('id, recheck_count, reject_reason, created_at')
      .eq('status', 'rejected')
      .in('reject_reason', RECHECK_REASONS)
      .gte('created_at', windowStart)
      .lt('recheck_count', MAX_RECHECKS)
      .or(`last_recheck_at.is.null,last_recheck_at.lt.${cooldownStart}`)
    candidates = data
    queryErr   = error
  }

  if (queryErr) {
    console.error('[recheck-slips] DB query error:', queryErr)
    return Response.json({ error: 'db_query_failed', detail: queryErr.message },
      { status: 500, headers: CORS })
  }

  if (!candidates || candidates.length === 0) {
    return Response.json({ checked: 0, recovered: 0, results: [] }, { headers: CORS })
  }

  console.log(`[recheck-slips] found ${candidates.length} candidate(s)`)

  // ── Process sequentially (ป้องกัน Slip2Go rate limit + ป้องกัน race) ────
  const results: Array<Record<string, unknown>> = []
  let recoveredCount = 0

  for (const order of candidates) {
    const attempt = order.recheck_count + 1

    // 1) Increment counter FIRST — ป้องกัน double-process กรณี cron firing ซ้อน
    const { error: updErr } = await supabase
      .from('orders')
      .update({
        recheck_count   : attempt,
        last_recheck_at : new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('recheck_count', order.recheck_count)  // optimistic lock

    if (updErr) {
      console.warn(`[recheck-slips] skip ${order.id} — update failed:`, updErr.message)
      continue
    }

    // 2) เรียก verify-slip ให้ตรวจใหม่ (is_retry=true → checkDuplicate=false)
    // ใช้ SERVICE_KEY เพราะเป็น internal-to-internal call (auto-injected เสมอ)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-slip`, {
        method : 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type' : 'application/json',
        },
        body: JSON.stringify({ order_id: order.id, is_retry: true }),
      })
      const result = await res.json()

      // Detect malformed response (HTTP error or missing status field)
      if (!res.ok || !result.status) {
        console.error(`[recheck-slips] verify-slip bad response for ${order.id}: HTTP ${res.status}`, result)
        results.push({
          order_id   : order.id,
          attempt,
          prev_reason: order.reject_reason,
          error      : `verify_slip_bad_response_${res.status}`,
          raw        : result,
        })
        continue
      }

      if (result.status === 'verified') recoveredCount++

      results.push({
        order_id : order.id,
        attempt,
        prev_reason: order.reject_reason,
        result   : result.status,
        ...(result.reason ? { reason: result.reason } : {}),
      })
    } catch (err) {
      console.error(`[recheck-slips] verify-slip call failed for ${order.id}:`, err)
      results.push({ order_id: order.id, attempt, error: String(err) })
    }
  }

  console.log(`[recheck-slips] done — checked=${results.length}, recovered=${recoveredCount}`)
  return Response.json({
    checked  : results.length,
    recovered: recoveredCount,
    results,
  }, { headers: CORS })
})
