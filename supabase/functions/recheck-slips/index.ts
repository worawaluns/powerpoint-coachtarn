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

// Legacy JWT anon key (สำหรับ internal call ผ่าน gateway)
// ระบบ Supabase ใหม่ SUPABASE_ANON_KEY env อาจเป็น sb_publishable_xxx
// ไม่ใช่ JWT format — gateway reject 401 invalid JWT
// Anon key เป็น public อยู่แล้ว (มีใน frontend) — hardcode ปลอดภัย
const LEGACY_ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dWJ0enlodXFhbG1qcGpobWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MjkzNjQsImV4cCI6MjA4OTMwNTM2NH0.z11wUqyRWOSsI5o_STNZWZx-e1HV7UuLe7bEtipk3nQ'

// ── Tunables (Phase 3: พ.ค. 2026 — ขยาย coverage ให้ครอบ delay หลักชั่วโมง) ─
const RECHECK_REASONS  = ['wrong_account', 'duplicate_slip']
const WINDOW_MINUTES   = 1440 // ออเดอร์เก่ากว่า 24 ชม.ไม่ recheck (Phase 2: 90)
const COOLDOWN_MINUTES = 30   // เว้นระหว่างรอบ ให้ธนาคาร sync นาน (Phase 2: 14)
const MAX_RECHECKS     = 5    // recheck ครั้งสูงสุดต่อ order (Phase 2: 3)
const CLEANUP_WINDOW_MINUTES = 60  // ±1 ชม.รอบ winner — กันลบ order คนละครั้งของลูกค้าเดียวกัน

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
  type Candidate = { id: string; email: string; recheck_count: number; reject_reason: string; created_at: string }
  let candidates: Candidate[] | null = null
  let queryErr: { message: string } | null = null

  if (explicitOrderIds) {
    // ── Ad-hoc mode: bypass window/cooldown/MAX_RECHECKS filters ────────────
    // Safety: ยังคง enforce status='rejected' (ไม่ให้ override verified order)
    console.log(`[recheck-slips] ad-hoc mode: ${explicitOrderIds.length} order(s)`)
    const { data, error } = await supabase
      .from('orders')
      .select('id, email, recheck_count, reject_reason, created_at')
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
      .select('id, email, recheck_count, reject_reason, created_at')
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

  // ── Smart filter (Phase 3): group by email → ตรวจแค่ "winner" ต่อ email ──
  // เคสลูกค้าส่งสลิปเดียวกันซ้ำ 2-3 ครั้ง:
  //   row 1 = wrong_account (Slip2Go OCR ได้)
  //   row 2-3 = duplicate_slip (Slip2Go จำว่าซ้ำ)
  // ถ้าตรวจทุก row จะ waste quota เพราะ row 2-3 จะ fail ทุกครั้ง
  // → เลือก 1 winner ต่อ email, siblings จะถูก cleanup เมื่อ winner verified
  // ใน ad-hoc mode: bypass grouping เผื่อไอซ์อยากตรวจ row เฉพาะที่ระบุ
  let workQueue: Candidate[]
  if (explicitOrderIds) {
    workQueue = candidates
  } else {
    const grouped = new Map<string, Candidate[]>()
    for (const c of candidates) {
      const list = grouped.get(c.email) ?? []
      list.push(c)
      grouped.set(c.email, list)
    }
    workQueue = []
    for (const [, list] of grouped) {
      // priority: wrong_account ก่อน (Slip2Go เคย OCR ได้), แล้วค่อย earliest created_at
      const sorted = [...list].sort((a, b) => {
        const aWrong = a.reject_reason === 'wrong_account'
        const bWrong = b.reject_reason === 'wrong_account'
        if (aWrong && !bWrong) return -1
        if (!aWrong && bWrong) return 1
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
      workQueue.push(sorted[0])
    }
    const skipped = candidates.length - workQueue.length
    if (skipped > 0) {
      console.log(`[recheck-slips] smart-filter: ${workQueue.length} winner(s), skipped ${skipped} sibling(s)`)
    }
  }

  // ── Process sequentially (ป้องกัน Slip2Go rate limit + ป้องกัน race) ────
  const results: Array<Record<string, unknown>> = []
  let recoveredCount = 0

  for (const order of workQueue) {
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
    // ใช้ legacy anon JWT (hardcoded) เพราะ Supabase ใหม่ env keys
    // ไม่ใช่ JWT format อีก (publishable_xxx / secret_xxx) → gateway reject 401
    let logResult = 'error'
    let logReason: string | null = null
    let cleanedSiblings = 0

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-slip`, {
        method : 'POST',
        headers: {
          'Authorization': `Bearer ${LEGACY_ANON_JWT}`,
          'Content-Type' : 'application/json',
        },
        body: JSON.stringify({ order_id: order.id, is_retry: true }),
      })
      const result = await res.json()

      // Detect malformed response (HTTP error or missing status field)
      if (!res.ok || !result.status) {
        console.error(`[recheck-slips] verify-slip bad response for ${order.id}: HTTP ${res.status}`, result)
        logReason = `verify_slip_bad_response_${res.status}`
        results.push({
          order_id   : order.id,
          attempt,
          prev_reason: order.reject_reason,
          error      : logReason,
          raw        : result,
        })
      } else {
        logResult = result.status
        logReason = result.reason ?? null

        if (result.status === 'verified') {
          recoveredCount++

          // ── 3) Cleanup duplicate siblings — ลบ row ที่ลูกค้าส่งซ้ำ ──────
          // window ±1 ชม. รอบ winner กันลบ order คนละครั้งของลูกค้าเดียวกัน
          const winnerTime    = new Date(order.created_at).getTime()
          const cleanupWindow = CLEANUP_WINDOW_MINUTES * 60 * 1000
          const startWindow   = new Date(winnerTime - cleanupWindow).toISOString()
          const endWindow     = new Date(winnerTime + cleanupWindow).toISOString()

          const { data: deleted, error: delErr } = await supabase
            .from('orders')
            .delete()
            .eq('email', order.email)
            .eq('status', 'rejected')
            .in('reject_reason', RECHECK_REASONS)
            .neq('id', order.id)
            .gte('created_at', startWindow)
            .lte('created_at', endWindow)
            .select('id')

          if (delErr) {
            console.error(`[recheck-slips] cleanup failed for ${order.id}:`, delErr.message)
          } else {
            cleanedSiblings = deleted?.length ?? 0
            if (cleanedSiblings > 0) {
              console.log(`[recheck-slips] cleaned ${cleanedSiblings} sibling(s) for winner ${order.id}`)
            }
          }
        }

        results.push({
          order_id : order.id,
          attempt,
          prev_reason: order.reject_reason,
          result   : result.status,
          ...(result.reason ? { reason: result.reason } : {}),
          ...(cleanedSiblings > 0 ? { cleaned_siblings: cleanedSiblings } : {}),
        })
      }
    } catch (err) {
      console.error(`[recheck-slips] verify-slip call failed for ${order.id}:`, err)
      logReason = String(err)
      results.push({ order_id: order.id, attempt, error: logReason })
    }

    // ── 4) Insert recheck_logs (Phase 3) — เก็บประวัติทุกรอบ ────────────
    const { error: logErr } = await supabase
      .from('recheck_logs')
      .insert({
        order_id      : order.id,
        customer_email: order.email,
        attempt,
        prev_reason   : order.reject_reason,
        result        : logResult,
        reason        : logReason,
      })
    if (logErr) {
      console.warn(`[recheck-slips] failed to insert log for ${order.id}:`, logErr.message)
    }
  }

  console.log(`[recheck-slips] done — checked=${results.length}, recovered=${recoveredCount}`)
  return Response.json({
    checked  : results.length,
    recovered: recoveredCount,
    results,
  }, { headers: CORS })
})
