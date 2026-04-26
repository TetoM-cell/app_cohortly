import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { crypto } from "https://deno.land/std@0.210.0/crypto/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function hexToBytes(hex: string) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

function configuredVariantMap() {
    return [
        { plan: 'pro', interval: 'monthly', env: Deno.env.get('LS_PRO_MONTHLY_ID') },
        { plan: 'pro', interval: 'yearly', env: Deno.env.get('LS_PRO_YEARLY_ID') },
    ].filter((entry) => entry.env);
}

function resolvePlanFromVariantId(variantId: string | null) {
    const match = configuredVariantMap().find((entry) => entry.env === variantId);
    return match?.plan ?? 'pro';
}

function resolveIntervalFromVariantId(variantId: string | null) {
    const match = configuredVariantMap().find((entry) => entry.env === variantId);
    return match?.interval ?? null;
}

interface LemonWebhookPayload {
    meta?: {
        event_name?: string;
        custom_data?: {
            user_id?: string;
        };
    };
    data?: {
        type?: string;
        id?: string | number;
        attributes?: {
            customer_id?: string | number | null;
            variant_id?: string | number | null;
            order_id?: string | number | null;
            status?: string | null;
            currency?: string | null;
            product_name?: string | null;
            variant_name?: string | null;
            card_brand?: string | null;
            card_last_four?: string | null;
            trial_ends_at?: string | null;
            renews_at?: string | null;
            ends_at?: string | null;
            cancelled?: boolean | null;
            updated_at?: string | null;
            created_at?: string | null;
        };
    };
}

async function resolveUserId(supabase: SupabaseClient, payload: LemonWebhookPayload) {
    const customUserId = payload?.meta?.custom_data?.user_id;

    if (customUserId) {
        return String(customUserId);
    }

    const attributes = payload?.data?.attributes ?? {};
    const subscriptionId = payload?.data?.type === 'subscriptions' ? String(payload?.data?.id) : null;
    const customerId = attributes?.customer_id ? String(attributes.customer_id) : null;

    if (subscriptionId) {
        const { data } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('lemon_subscription_id', subscriptionId)
            .maybeSingle();

        if (data?.user_id) {
            return data.user_id;
        }
    }

    if (customerId) {
        const { data } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('lemon_customer_id', customerId)
            .maybeSingle();

        if (data?.user_id) {
            return data.user_id;
        }
    }

    return null;
}

Deno.serve(async (req) => {
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
    } catch (error) {
        console.error('[LemonWebhook] Signature verification failed:', error?.message ?? error)
        return new Response(JSON.stringify({ error: 'Auth error' }), { status: 401 })
    }

    const payload: LemonWebhookPayload = JSON.parse(body)
    const eventName = payload?.meta?.event_name ?? req.headers.get('x-event-name') ?? 'unknown'
    const objectId = String(payload?.data?.id ?? '')
    const attributes = payload?.data?.attributes ?? {}
    const eventKey = [
        eventName,
        payload?.data?.type ?? 'unknown',
        objectId,
        attributes?.updated_at ?? attributes?.created_at ?? signature,
    ].join(':')

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') || '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    try {
        const userId = await resolveUserId(supabase, payload)

        const { error: eventError } = await supabase
            .from('billing_events')
            .insert({
                event_key: eventKey,
                event_name: eventName,
                lemon_object_id: objectId,
                user_id: userId,
                payload,
            })

        if (eventError) {
            if (eventError.code === '23505') {
                return new Response(JSON.stringify({ success: true, duplicate: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                })
            }

            throw eventError
        }

        if (payload?.data?.type === 'subscriptions') {
            if (!userId) {
                console.warn(`[LemonWebhook] Ignoring ${eventName} - unable to map subscription ${objectId} to a user`)
                return new Response(JSON.stringify({ success: true, ignored: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                })
            }

            const variantId = attributes?.variant_id ? String(attributes.variant_id) : null
            const plan = resolvePlanFromVariantId(variantId)
            const billingInterval = resolveIntervalFromVariantId(variantId)

            const { error: subscriptionError } = await supabase
                .from('subscriptions')
                .upsert({
                    user_id: userId,
                    lemon_customer_id: attributes?.customer_id ? String(attributes.customer_id) : null,
                    lemon_subscription_id: objectId,
                    lemon_order_id: attributes?.order_id ? String(attributes.order_id) : null,
                    plan,
                    status: String(attributes?.status ?? 'inactive'),
                    variant_id: variantId,
                    billing_interval: billingInterval,
                    currency: attributes?.currency ?? null,
                    product_name: attributes?.product_name ?? null,
                    variant_name: attributes?.variant_name ?? null,
                    card_brand: attributes?.card_brand ?? null,
                    card_last_four: attributes?.card_last_four ?? null,
                    trial_ends_at: attributes?.trial_ends_at ?? null,
                    renews_at: attributes?.renews_at ?? null,
                    ends_at: attributes?.ends_at ?? null,
                    cancelled_at: attributes?.cancelled ? (attributes?.ends_at ?? attributes?.updated_at ?? new Date().toISOString()) : null,
                    raw_payload: payload,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' })

            if (subscriptionError) {
                throw subscriptionError
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('[LemonWebhook] Processing error:', error?.message ?? error)
        return new Response(JSON.stringify({ error: error?.message ?? 'Webhook processing failed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
