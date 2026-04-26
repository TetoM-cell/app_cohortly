'use server';

import { getBillingSnapshot, type BillingSnapshot } from '@/lib/billing/snapshot';

export async function fetchBillingSnapshotAction(): Promise<{ snapshot?: BillingSnapshot; error?: string }> {
    try {
        const snapshot = await getBillingSnapshot();
        return { snapshot };
    } catch (error: any) {
        return { error: error.message };
    }
}
