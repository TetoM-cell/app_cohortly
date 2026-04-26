import { NextResponse } from 'next/server';

import { getCustomerPortalUrl } from '@/lib/billing/lemon';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'You must be logged in to manage billing.' }, { status: 401 });
        }

        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('lemon_subscription_id, lemon_customer_id')
            .eq('user_id', user.id)
            .maybeSingle();

        const portalUrl = await getCustomerPortalUrl({
            subscriptionId: subscription?.lemon_subscription_id ?? null,
            customerId: subscription?.lemon_customer_id ?? null,
        });

        if (!portalUrl) {
            return NextResponse.json(
                { error: 'No customer portal is available yet. Complete checkout first.' },
                { status: 404 }
            );
        }

        return NextResponse.json({ url: portalUrl });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to open billing portal.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
