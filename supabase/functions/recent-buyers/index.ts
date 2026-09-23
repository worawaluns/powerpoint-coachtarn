// Social proof for the landing page: the latest real purchases, masked for PDPA.
// Raw names and emails never leave this function.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// "ชลิตา วงศ์…" → "ช" ／ "Somchai" → "S"
function maskName(name: string): string {
  const first = [...String(name ?? '').trim()].find(c => /\S/.test(c)) ?? ''
  return first
}

// "aommy@gmail.com" → "a....@gmail.com"
function maskEmail(email: string): string {
  const [user, domain] = String(email ?? '').split('@')
  if (!domain) return ''
  return `${[...(user ?? '')][0] ?? ''}....@${domain}`
}

// our own test orders must never show up as social proof
const SKIP = new Set([
  Deno.env.get('ADMIN_EMAIL'), Deno.env.get('OWNER_EMAIL'), Deno.env.get('GMAIL_USER'),
  'powerpoint.officialth@gmail.com',
].filter(Boolean).map(e => String(e).toLowerCase()))

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase
    .from('orders')
    .select('name, email, pack, created_at')
    .eq('status', 'verified')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return Response.json({ buyers: [] }, { headers: CORS })

  const buyers = (data ?? [])
    .filter(o => !SKIP.has(String(o.email ?? '').toLowerCase()))
    .map(o => ({
    n   : maskName(o.name),
    e   : maskEmail(o.email),
    pack: Number(o.pack) || 1,
    at  : o.created_at,
    })).filter(b => b.n && b.e)

  return Response.json({ buyers }, {
    headers: { ...CORS, 'Cache-Control': 'public, max-age=180' },
  })
})
