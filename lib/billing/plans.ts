export type BillingPlanKey = 'pro';
export type BillingInterval = 'monthly' | 'yearly';

export interface BillingPlanDefinition {
    key: BillingPlanKey;
    name: string;
    description: string;
    features: string[];
    prices: Record<BillingInterval, string>;
    limits: {
        activePrograms: number | null;
        applicationsPerMonth: number | null;
        aiReviewsPerDay: number | null;
    };
}

export const BILLING_PLANS: BillingPlanDefinition[] = [
    {
        key: 'pro',
        name: 'Pro',
        description: 'For active operators running serious application workflows.',
        features: ['Unlimited active cohorts', 'Unlimited applications / month', 'Priority support'],
        prices: {
            monthly: '$49',
            yearly: '$39',
        },
        limits: {
            activePrograms: null,
            applicationsPerMonth: 500,
            aiReviewsPerDay: 500,
        },
    },
];

const paidPlanVariantEnvMap: Record<BillingPlanKey, Record<BillingInterval, string[]>> = {
    pro: {
        monthly: ['LS_PRO_MONTHLY_ID'],
        yearly: ['LS_PRO_YEARLY_ID'],
    },
};

export function getPlanDefinition(plan: BillingPlanKey): BillingPlanDefinition {
    return BILLING_PLANS.find((item) => item.key === plan) ?? BILLING_PLANS[0];
}

export function getConfiguredVariantId(plan: BillingPlanKey, interval: BillingInterval): string | null {
    const envNames = paidPlanVariantEnvMap[plan][interval];

    for (const envName of envNames) {
        const value = process.env[envName];
        if (value) {
            return value;
        }
    }

    return null;
}

export function resolvePlanFromVariantId(variantId: string | null | undefined): BillingPlanKey {
    for (const plan of Object.keys(paidPlanVariantEnvMap) as BillingPlanKey[]) {
        for (const interval of Object.keys(paidPlanVariantEnvMap[plan]) as BillingInterval[]) {
            const configuredVariantId = getConfiguredVariantId(plan, interval);
            if (configuredVariantId === variantId) {
                return plan;
            }
        }
    }

    return 'pro';
}

export function resolveIntervalFromVariantId(variantId: string | null | undefined): BillingInterval | null {
    if (!variantId) {
        return null;
    }

    for (const plan of Object.keys(paidPlanVariantEnvMap) as BillingPlanKey[]) {
        for (const interval of Object.keys(paidPlanVariantEnvMap[plan]) as BillingInterval[]) {
            const configuredVariantId = getConfiguredVariantId(plan, interval);
            if (configuredVariantId === variantId) {
                return interval;
            }
        }
    }

    return null;
}

export function isBillingConfigured(): boolean {
    return Boolean(
        process.env.LEMON_SQUEEZY_API_KEY &&
        process.env.LEMON_SQUEEZY_STORE_ID &&
        (
            getConfiguredVariantId('pro', 'monthly') ||
            getConfiguredVariantId('pro', 'yearly')
        )
    );
}
