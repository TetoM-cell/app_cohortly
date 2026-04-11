// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { crypto } from "https://deno.land/std@0.210.0/crypto/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Helper to convert hex signature to bytes for crypto.subtle.verify
 */
function hexToBytes(hex: string) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const signature = req.headers.get('x-signature')
    const secret = Deno.env.get('LEMON_WEBHOOK_SECRET')

    if (!signature || !secret) {
        console.error('[LemonWebhook] Missing signature or secret')
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const body = await req.text()
    
    // 1. VERIFY SIGNATURE (HMAC-SHA256)
    try {
        const hmac = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"]
        );
        const isValid = await crypto.subtle.verify(
            "HMAC",
            hmac,
            hexToBytes(signature),
            new TextEncoder().encode(body)
        );

        if (!isValid) {
            console.error('[LemonWebhook] Invalid signature')
            return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 })
        }
    } catch (e) {
        console.error('[LemonWebhook] Signature verification crash:', e.message)
        return new Response(JSON.stringify({ error: 'Auth error' }), { status: 401 })
    }

    const payload = JSON.parse(body)
    const eventName = payload.meta.event_name
    const obj = payload.data.attributes
    const customData = payload.meta.custom_data || {}
    const userId = customData.user_id

    // We MUST have a user_id to map this to a Supabase user
    if (!userId) {
        console.warn(`[LemonWebhook] Ignoring ${eventName} - No user_id in custom_data`)
        return new Response(JSON.stringify({ message: 'Ignored: No user_id' }), { status: 200 })
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') || '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    console.log(`[LemonWebhook] Received ${eventName} for user ${userId}`)

    try {
        // Handle Subscriptions (Created, Updated, Cancelled, Paused, Resumed)
        if (eventName.startsWith('subscription_')) {
            const variantId = String(obj.variant_id)
            let plan = 'pro' // Default fallback
            
            // Map Variant IDs to internal plan slugs (Pro and Max)
            const proMonthly = Deno.env.get('LS_PRO_MONTHLY_ID')
            const proYearly = Deno.env.get('LS_PRO_YEARLY_ID')
            const maxMonthly = Deno.env.get('LS_MAX_MONTHLY_ID')
            const maxYearly = Deno.env.get('LS_MAX_YEARLY_ID')

            if (variantId === proMonthly || variantId === proYearly) {
                plan = 'pro'
            } else if (variantId === maxMonthly || variantId === maxYearly) {
                plan = 'max'
            }

            const { error } = await supabase
                .from('subscriptions')
                .upsert({
                    user_id: userId,
                    lemon_subscription_id: String(payload.data.id),
                    lemon_customer_id: String(obj.customer_id),
                    plan: plan,
                    status: obj.status, // LS status: active, cancelled, etc.
                    variant_id: variantId,
                    current_period_end: obj.renews_at,
                    renews_at: obj.renews_at,
                    ends_at: obj.ends_at,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })

            if (error) throw error
            console.log(`[LemonWebhook] Successfully updated ${plan} plan for ${userId}`)
        }
        
        return new Response(JSON.stringify({ success: true }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
        })
    } catch (err) {
        console.error('[LemonWebhook] DB Error:', err.message)
        // Return 500 so Lemon Squeezy retries later
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
})
