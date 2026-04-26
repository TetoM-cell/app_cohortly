import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    
    if (!secret) {
        console.error('Missing LEMON_SQUEEZY_WEBHOOK_SECRET');
        return new Response('Webhook secret not configured', { status: 500 });
    }

    try {
        // 1. Get raw body and signature
        const rawBody = await request.text();
        const signature = request.headers.get('x-signature');

        if (!signature) {
            return new Response('Missing signature', { status: 401 });
        }

        // 2. Verify signature using timingSafeEqual
        const hmac = crypto.createHmac('sha256', secret);
        const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
        const signatureBuffer = Buffer.from(signature, 'utf8');

        if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
            return new Response('Invalid signature', { status: 401 });
        }

        // 3. Parse payload
        const payload = JSON.parse(rawBody);
        const eventName = payload.meta.event_name;
        const lemonObjectId = String(payload.data?.id || '');
        const eventId = request.headers.get('x-event-id') || `${eventName}_${lemonObjectId}_${Date.now()}`;
        const userId = payload.meta.custom_data?.user_id;

        const supabase = createAdminClient();

        // 4. Log the event for idempotency
        const { error: eventError } = await supabase.from('billing_events').insert({
            event_key: eventId,
            event_name: eventName,
            lemon_object_id: lemonObjectId,
            user_id: userId || null,
            payload: payload
        });

        // If error is unique constraint violation (code 23505), we already processed this
        if (eventError && eventError.code === '23505') {
            console.log(`Webhook already processed: ${eventId}`);
            return NextResponse.json({ message: 'Already processed' }, { status: 200 });
        } else if (eventError) {
            console.error('Error inserting billing_event:', eventError);
            throw eventError;
        }

        // 5. Handle subscription events
        if (eventName.startsWith('subscription_')) {
            const attributes = payload.data.attributes;
            
            // Only update if we have a user_id
            if (userId) {
                const subscriptionData = {
                    user_id: userId,
                    lemon_customer_id: String(attributes.customer_id),
                    lemon_subscription_id: String(payload.data.id),
                    lemon_order_id: attributes.order_id ? String(attributes.order_id) : null,
                    status: attributes.status,
                    variant_id: String(attributes.variant_id),
                    product_name: attributes.product_name,
                    variant_name: attributes.variant_name,
                    trial_ends_at: attributes.trial_ends_at || null,
                    renews_at: attributes.renews_at || null,
                    ends_at: attributes.ends_at || null,
                    cancelled_at: attributes.cancelled_at || null,
                    raw_payload: payload,
                    updated_at: new Date().toISOString()
                };

                const { error: subError } = await supabase
                    .from('subscriptions')
                    .upsert(subscriptionData, { onConflict: 'user_id' });

                if (subError) {
                    console.error('Error upserting subscription:', subError);
                    throw subError;
                }
            }
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('Webhook error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
