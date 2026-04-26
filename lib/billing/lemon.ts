import { getConfiguredVariantId, type BillingInterval, type BillingPlanKey } from '@/lib/billing/plans';

const LEMON_API_BASE_URL = 'https://api.lemonsqueezy.com/v1';

interface LemonJsonApiResponse<T> {
    data: T;
    errors?: Array<{ detail?: string; title?: string }>;
}

interface LemonSubscriptionResponse {
    id: string;
    attributes: {
        urls?: {
            customer_portal?: string | null;
            update_payment_method?: string | null;
        };
    };
}

interface LemonCustomerResponse {
    id: string;
    attributes: {
        urls?: {
            customer_portal?: string | null;
        };
    };
}

function getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not configured.`);
    }

    return value;
}

async function lemonFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const apiKey = getRequiredEnv('LEMON_SQUEEZY_API_KEY');

    const response = await fetch(`${LEMON_API_BASE_URL}${path}`, {
        ...init,
        headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            Authorization: `Bearer ${apiKey}`,
            ...(init?.headers ?? {}),
        },
        cache: 'no-store',
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const message =
            payload?.errors?.[0]?.detail ??
            payload?.errors?.[0]?.title ??
            'Lemon Squeezy request failed.';
        throw new Error(message);
    }

    return payload as T;
}

export async function createCheckoutUrl(params: {
    plan: BillingPlanKey;
    interval: BillingInterval;
    userId: string;
    email?: string | null;
    name?: string | null;
    redirectUrl: string;
}) {
    const variantId = getConfiguredVariantId(params.plan, params.interval);

    if (!variantId) {
        throw new Error(`No Lemon Squeezy variant is configured for ${params.plan} (${params.interval}).`);
    }

    const storeId = getRequiredEnv('LEMON_SQUEEZY_STORE_ID');
    const testMode = process.env.LEMON_SQUEEZY_TEST_MODE === 'true';

    const payload = await lemonFetch<LemonJsonApiResponse<{ attributes?: { url?: string | null } }>>('/checkouts', {
        method: 'POST',
        body: JSON.stringify({
            data: {
                type: 'checkouts',
                attributes: {
                    checkout_data: {
                        email: params.email ?? undefined,
                        name: params.name ?? undefined,
                        custom: {
                            user_id: params.userId,
                        },
                    },
                    checkout_options: {
                        embed: false,
                        media: false,
                        logo: true,
                    },
                    product_options: {
                        redirect_url: params.redirectUrl,
                        enabled_variants: [Number(variantId)],
                    },
                    expires_at: null,
                    test_mode: testMode,
                },
                relationships: {
                    store: {
                        data: {
                            type: 'stores',
                            id: String(storeId),
                        },
                    },
                    variant: {
                        data: {
                            type: 'variants',
                            id: String(variantId),
                        },
                    },
                },
            },
        }),
    });

    const checkoutUrl = payload.data.attributes?.url;

    if (!checkoutUrl) {
        throw new Error('Lemon Squeezy did not return a checkout URL.');
    }

    return checkoutUrl;
}

export async function getCustomerPortalUrl(params: {
    subscriptionId?: string | null;
    customerId?: string | null;
}) {
    if (params.subscriptionId) {
        const payload = await lemonFetch<LemonJsonApiResponse<LemonSubscriptionResponse>>(
            `/subscriptions/${params.subscriptionId}`
        );

        return (
            payload.data.attributes?.urls?.customer_portal ??
            payload.data.attributes?.urls?.update_payment_method ??
            null
        );
    }

    if (params.customerId) {
        const payload = await lemonFetch<LemonJsonApiResponse<LemonCustomerResponse>>(`/customers/${params.customerId}`);
        return payload.data.attributes?.urls?.customer_portal ?? null;
    }

    return null;
}
