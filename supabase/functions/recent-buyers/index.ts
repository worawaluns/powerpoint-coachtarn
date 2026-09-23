// Social proof for the landing page: recent orders and recent visits.
// Counts only. No name, no email, no visitor id, nothing that points at a person.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-recheck-token',
}

// our own test orders must never count as sales
const SKIP = [
  Deno.env.get('ADMIN_EMAIL'), Deno.env.get('OWNER_EMAIL'), Deno.env.get('GMAIL_USER'),
  'powerpoint.officialth@gmail.com',
].filter(Boolean).map(e => String(e).toLowerCase())

const SITE = 'coachtarnslide.com'
const bkkDay = (d: Date) =>
  new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10)   // Asia/Bangkok has no DST

// Pull daily page views straight from Cloudflare, for the days before we started counting.
async function cloudflareViews(days: number): Promise<Record<string, number>> {
  const token = Deno.env.get('CF_API_TOKEN')
  if (!token) throw new Error('CF_API_TOKEN is not set')
  const auth = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

  let zone = Deno.env.get('CF_ZONE_ID')
  if (!zone) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${SITE}`, { headers: auth })
    const j = await r.json()
    zone = j?.result?.[0]?.id
    if (!zone) throw new Error(`zone lookup failed: ${JSON.stringify(j?.errors ?? j)}`)
  }

  const until = bkkDay(new Date())
  const since = bkkDay(new Date(Date.now() - days * 86400000))
  const query = `query($zone:String!,$since:Date!,$until:Date!){
    viewer{ zones(filter:{zoneTag:$zone}){
      httpRequests1dGroups(limit:60, filter:{date_geq:$since, date_leq:$until}){
        dimensions{ date } sum{ pageViews }
      } } } }`

  const r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST', headers: auth,
    body: JSON.stringify({ query, variables: { zone, since, until } }),
  })
  const j = await r.json()
  if (j.errors?.length) throw new Error(JSON.stringify(j.errors))
  const rows = j?.data?.viewer?.zones?.[0]?.httpRequests1dGroups ?? []
  return Object.fromEntries(rows.map((g: any) => [g.dimensions.date, g.sum.pageViews ?? 0]))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let body: any = {}
  try { body = await req.json() } catch (_) {}

  // ── admin: fill in the days from before this counter existed ──
  if (body.backfill_days) {
    if (req.headers.get('x-recheck-token') !== Deno.env.get('RECHECK_TOKEN')) {
      return Response.json({ error: 'forbidden' }, { status: 403, headers: CORS })
    }
    let cf: Record<string, number>
    try { cf = await cloudflareViews(Number(body.backfill_days)) }
    catch (e) { return Response.json({ error: String(e) }, { status: 502, headers: CORS }) }

    // never touch a day we counted ourselves
    const { data: have } = await supabase.from('site_views').select('day')
    const mine = new Set((have ?? []).map(r => r.day as string))
    const rows = Object.entries(cf)
      .filter(([day]) => !mine.has(day))
      .map(([day, views]) => ({ day, views }))
    if (rows.length) await supabase.from('site_views').insert(rows)
    return Response.json({ filled: rows, skipped: [...mine] }, { headers: CORS })
  }

  const since = (days: number) =>
    new Date(Date.now() - days * 86400000).toISOString()

  const orders = async (days: number) => {
    let q = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'verified')
      .gte('created_at', since(days))
    for (const e of SKIP) q = q.neq('email', e)
    const { count, error } = await q
    return error ? 0 : (count ?? 0)
  }

  // one row per day; the client decides when to send a view
  if (body.hit === true && /(^|\.)coachtarnslide\.com$|^localhost$/.test(
        (() => { try { return new URL(req.headers.get('origin') ?? '').hostname } catch { return '' } })())) {
    await supabase.rpc('bump_view')
  }

  const { data: views } = await supabase
    .from('site_views')
    .select('day, views')
    .gte('day', bkkDay(new Date(Date.now() - 6 * 86400000)))
  const today = bkkDay(new Date())
  const v1 = (views ?? []).find(r => r.day === today)?.views ?? 0
  const v7 = (views ?? []).reduce((a, r) => a + r.views, 0)

  const { data: first } = await supabase
    .from('site_views').select('day').order('day', { ascending: true }).limit(1)

  const [d1, d7] = await Promise.all([orders(1), orders(7)])

  return Response.json({ d1, d7, v1, v7, since: first?.[0]?.day ?? null }, { headers: CORS })
})
