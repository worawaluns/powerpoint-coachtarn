// Social proof for the landing page: recent orders and recent visits.
// Counts only. No name, no email, no visitor id, nothing that points at a person.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// our own test orders must never count as sales
const SKIP = [
  Deno.env.get('ADMIN_EMAIL'), Deno.env.get('OWNER_EMAIL'), Deno.env.get('GMAIL_USER'),
  'powerpoint.officialth@gmail.com',
].filter(Boolean).map(e => String(e).toLowerCase())

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const since = (days: number) =>
    new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const count = async (days: number) => {
    let q = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'verified')
      .gte('created_at', since(days))
    for (const e of SKIP) q = q.neq('email', e)
    const { count, error } = await q
    return error ? 0 : (count ?? 0)
  }

  // one visit per browser tab-session; the client decides when to send it
  let hit = false
  try { hit = (await req.json())?.hit === true } catch (_) {}
  if (hit && /(^|\.)coachtarnslide\.com$|^localhost$/.test(
        (() => { try { return new URL(req.headers.get('origin') ?? '').hostname } catch { return '' } })())) {
    await supabase.from('site_hits').insert({})
    if (Math.random() < 0.01) {                       // occasional trim, the table only needs 8 days
      await supabase.from('site_hits').delete().lt('created_at', since(8))
    }
  }

  const visits = async (days: number) => {
    const { count, error } = await supabase
      .from('site_hits')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since(days))
    return error ? 0 : (count ?? 0)
  }

  const [d1, d7, v1, v7] = await Promise.all([count(1), count(7), visits(1), visits(7)])

  return Response.json({ d1, d7, v1, v7 }, { headers: CORS })
})
