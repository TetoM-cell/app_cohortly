"use client";

import React from "react";
import { Bell } from "lucide-react";

export function NotificationSettings() {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 mt-8 mb-20">
            <Bell className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Notification Preferences Coming Soon</h3>
            <p className="text-sm text-gray-500 max-w-sm">
                Our team is currently working hard on a robust notification system. You will soon be able to manage email, Slack, and in-app alerts here.
            </p>
        </div>
    );
}
