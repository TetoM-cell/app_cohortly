import { supabase } from '@/lib/supabase/client';

export interface BillingAccessSummary {
    has_access: boolean;
    access_state: 'trial' | 'subscription' | 'grace_period' | 'restricted';
    trial_started_at: string | null;
    trial_ends_at: string | null;
    subscription_status: string | null;
    subscription_ends_at: string | null;
    billing_interval: string | null;
    has_subscription: boolean;
}

export async function getClientBillingAccess(): Promise<BillingAccessSummary> {
    const { data: rawData, error } = await supabase.rpc('get_my_billing_access').maybeSingle();
    const data = rawData as any;

    if (error) {
        throw new Error(error.message || 'Unable to load billing access.');
    }

    return {
        has_access: Boolean(data?.has_access),
        access_state: (data?.access_state as BillingAccessSummary['access_state'] | undefined) ?? 'restricted',
        trial_started_at: data?.trial_started_at ?? null,
        trial_ends_at: data?.trial_ends_at ?? null,
        subscription_status: data?.subscription_status ?? null,
        subscription_ends_at: data?.subscription_ends_at ?? null,
        billing_interval: data?.billing_interval ?? null,
        has_subscription: Boolean(data?.has_subscription),
    };
}

export function getBillingRestrictionMessage(access: BillingAccessSummary) {
    if (access.access_state === 'trial' && access.trial_ends_at) {
        const endLabel = new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(new Date(access.trial_ends_at));

        return `Your trial is active until ${endLabel}.`;
    }

    if (access.access_state === 'grace_period' && access.subscription_ends_at) {
        const endLabel = new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(new Date(access.subscription_ends_at));

        return `Your subscription is cancelled and access ends on ${endLabel}.`;
    }

    return 'Your Pro access has ended. Subscribe to continue using premium features.';
}
