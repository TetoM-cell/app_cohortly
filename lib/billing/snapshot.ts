import { getPlanDefinition, isBillingConfigured, resolveIntervalFromVariantId, type BillingPlanKey } from '@/lib/billing/plans';
import { createClient } from '@/lib/supabase/server';

export interface BillingSnapshot {
    billingConfigured: boolean;
    subscriptionStatus: string;
    hasActiveSubscription: boolean;
    hasAccess: boolean;
    accessState: 'trial' | 'subscription' | 'grace_period' | 'restricted';
    currentPlan: BillingPlanKey;
    trial: {
        startedAt: string | null;
        endsAt: string | null;
    } | null;
    subscription: {
        lemonCustomerId: string | null;
        lemonSubscriptionId: string | null;
        plan: BillingPlanKey;
        status: string;
        variantId: string | null;
        billingInterval: string | null;
        renewsAt: string | null;
        endsAt: string | null;
        cardBrand: string | null;
        cardLastFour: string | null;
    } | null;
    usage: {
        activePrograms: number;
        totalApplications: number;
        currentMonthApplications: number;
        applicationLimit: number | null;
        applicationUsagePercent: number;
    };
    plans: Array<{
        key: BillingPlanKey;
        name: string;
        description: string;
        features: string[];
        prices: {
            monthly: string;
            yearly: string;
        };
        isCurrent: boolean;
    }>;
}

export async function getBillingSnapshot(): Promise<BillingSnapshot> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('You must be logged in to view billing.');
    }

    const [
        { data: subscription },
        { data: rawUsageSummary },
        { data: rawAccessSummary },
    ] = await Promise.all([
        supabase
            .from('subscriptions')
            .select(
                'lemon_customer_id, lemon_subscription_id, plan, status, variant_id, billing_interval, renews_at, ends_at, card_brand, card_last_four, trial_ends_at'
            )
            .eq('user_id', user.id)
            .maybeSingle(),
        supabase.rpc('get_billing_usage_summary').maybeSingle(),
        supabase.rpc('get_my_billing_access').maybeSingle(),
    ]);

    const usageSummary = rawUsageSummary as any;
    const accessSummary = rawAccessSummary as any;

    const currentPlan: BillingPlanKey = 'pro';
    const effectiveBillingInterval =
        subscription?.billing_interval ?? resolveIntervalFromVariantId(subscription?.variant_id ?? null);
    const planDefinition = getPlanDefinition(currentPlan);
    const currentMonthApplications = Number(usageSummary?.current_month_applications ?? 0);
    const applicationLimit = planDefinition.limits.applicationsPerMonth;
    const applicationUsagePercent = applicationLimit
        ? Math.min(100, Math.round((currentMonthApplications / applicationLimit) * 100))
        : 0;

    return {
        billingConfigured: isBillingConfigured(),
        subscriptionStatus: subscription?.status ?? 'inactive',
        hasAccess: Boolean(accessSummary?.has_access),
        accessState: (accessSummary?.access_state as BillingSnapshot['accessState'] | undefined) ?? 'restricted',
        hasActiveSubscription: Boolean(subscription?.lemon_subscription_id),
        currentPlan,
        trial: accessSummary?.trial_ends_at || accessSummary?.trial_started_at
            ? {
                startedAt: accessSummary?.trial_started_at ?? null,
                endsAt: accessSummary?.trial_ends_at ?? null,
            }
            : null,
        subscription: subscription
            ? {
                lemonCustomerId: subscription.lemon_customer_id ?? null,
                lemonSubscriptionId: subscription.lemon_subscription_id ?? null,
                plan: currentPlan,
                status: subscription.status,
                variantId: subscription.variant_id ?? null,
                billingInterval: effectiveBillingInterval,
                renewsAt: subscription.renews_at ?? null,
                endsAt: subscription.ends_at ?? null,
                cardBrand: subscription.card_brand ?? null,
                cardLastFour: subscription.card_last_four ?? null,
            }
            : null,
        usage: {
            activePrograms: Number(usageSummary?.active_programs ?? 0),
            totalApplications: Number(usageSummary?.total_applications ?? 0),
            currentMonthApplications,
            applicationLimit,
            applicationUsagePercent,
        },
        plans: ['pro'].map((planKey) => {
            const item = getPlanDefinition(planKey as BillingPlanKey);

            return {
                key: item.key,
                name: item.name,
                description: item.description,
                features: item.features,
                prices: item.prices,
                isCurrent: item.key === currentPlan,
            };
        }),
    };
}
