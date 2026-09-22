import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // ── CORS preflight ────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { code, slug } = await req.json()

    // ── Validate format ────────────────────────────────────────────────────
    if (!code || !/^TARN-[A-Z0-9]{8}$/i.test(code)) {
      return Response.json(
        { valid: false, reason: 'invalid_format' },
        { headers: CORS }
      )
    }

    const normalizedCode = code.toUpperCase()

    // ── Supabase client (service role — runs server-side only) ─────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── Look up code in redeem_codes ───────────────────────────────────────
    const { data, error } = await supabase
      .from('redeem_codes')
      .select('id, customer_name, order_id, created_at')
      .eq('code', normalizedCode)
      .single()

    if (error || !data) {
      return Response.json(
        { valid: false, reason: 'not_found' },
        { headers: CORS }
      )
    }

    // ── Log usage (update last_used_at) — don't block if fails ────────────
    await supabase
      .from('redeem_codes')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)

    // ── Per-set download link (only for a valid code; links are never public) ─
    let file: string | null = null, drive: string | null = null
    if (typeof slug === 'string' && /^[a-z0-9-]{1,40}$/i.test(slug)) {
      const { data: f } = await supabase
        .from('template_files')
        .select('file_url, drive_url')
        .eq('slug', slug)
        .single()
      if (f) { file = f.file_url; drive = f.drive_url }
    }

    // ── Return success ─────────────────────────────────────────────────────
    return Response.json(
      { valid: true, name: data.customer_name, file, drive },
      { headers: CORS }
    )

  } catch (err) {
    console.error('verify-code error:', err)
    return Response.json(
      { valid: false, reason: 'server_error' },
      { status: 500, headers: CORS }
    )
  }
})
