'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function AuthCodeErrorPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900">Authentication Error</h1>
                    <p className="text-gray-500">
                        We couldn't verify your sign-in code. This usually happens if the link expired or was already used.
                    </p>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-left">
                    <h2 className="text-sm font-semibold text-amber-800 mb-1">Common Fixes:</h2>
                    <ul className="text-sm text-amber-700 space-y-2 list-disc pl-4">
                        <li>Make sure you aren't using an old sign-in email.</li>
                        <li>Check if your browser's "incognito" mode is interfering.</li>
                        <li>Try signing in again from the main page.</li>
                    </ul>
                </div>

                <div className="pt-4">
                    <Button asChild className="w-full">
                        <Link href="/login" className="flex items-center justify-center gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Return to Login
                        </Link>
                    </Button>
                </div>

                <p className="text-xs text-gray-400">
                    If you keep seeing this, please <Link href="https://getcohortly.vercel.app/support" className="text-blue-500 hover:underline">contact support</Link>.
                </p>
            </div>
        </div>
    );
}
