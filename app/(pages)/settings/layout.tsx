"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, CreditCard, Bell, Blocks, Users, Palette, AlertTriangle } from "lucide-react";

const sidebarNavItems = [
    { title: "Profile", href: "/settings/profile", icon: User },
    { title: "Billing & Plans", href: "/settings/billing", icon: CreditCard },
    { title: "Notifications", href: "/settings/notifications", icon: Bell },
    { title: "Integrations", href: "/settings/integrations", icon: Blocks },
    { title: "Team & Reviewers", href: "/settings/team", icon: Users },
    { title: "Appearance", href: "/settings/appearance", icon: Palette },
    { title: "Danger Zone", href: "/settings/danger", icon: AlertTriangle, variant: "destructive" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col md:flex-row h-full">
            <aside className="w-full md:w-64 border-r border-gray-200 bg-gray-50/50 min-h-[calc(100vh-64px)] p-6 space-y-1">
                <div className="mb-6 px-3">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your account settings and preferences.</p>
                </div>
                <nav className="flex flex-col gap-1 w-full relative">
                    {sidebarNavItems.map((item) => {
                        const isActive = pathname === item.href;
                        const isDestructive = item.variant === "destructive";

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${isActive
                                        ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                                        : isDestructive
                                            ? "text-red-600 hover:bg-red-50 hover:text-red-700 mt-6"
                                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    }`}
                            >
                                <item.icon className={`h-4 w-4 ${isActive ? "text-gray-900" : isDestructive ? "text-red-500" : "text-gray-500"}`} />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>
            </aside>
            <main className="flex-1 w-full bg-white p-8 md:p-12 overflow-y-auto min-h-[calc(100vh-64px)]">
                <div className="mx-auto w-full max-w-4xl">
                    {children}
                </div>
            </main>
        </div>
    );
}
