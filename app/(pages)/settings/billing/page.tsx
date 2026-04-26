import { BillingSettings } from "@/components/settings/billing-settings";
import { getBillingSnapshot } from "@/lib/billing/snapshot";

export default async function BillingSettingsPage() {
    const snapshot = await getBillingSnapshot();

    return <BillingSettings snapshot={snapshot} />;
}
