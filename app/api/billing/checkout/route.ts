import { NextResponse } from 'next/server';

import { createCheckoutUrl } from '@/lib/billing/lemon';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'You must be logged in to manage billing.' }, { status: 401 });
        }

        const body = await request.json();
        const plan = body?.plan;
        const interval = body?.interval;

        if (plan !== 'pro' || !['monthly', 'yearly'].includes(interval)) {
            return NextResponse.json({ error: 'Invalid billing selection.' }, { status: 400 });
        }

        const redirectUrl = new URL('/settings/billing?checkout=success', request.url).toString();
        const checkoutUrl = await createCheckoutUrl({
            plan,
            interval,
            userId: user.id,
            email: user.email,
            name: user.user_metadata?.full_name ?? null,
            redirectUrl,
        });

        return NextResponse.json({ url: checkoutUrl });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to create checkout.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
