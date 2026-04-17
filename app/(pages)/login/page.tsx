'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ScalingWrapper } from '@/components/scaling-wrapper';

function LoginForm() {
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    const texts = [
        { regular: "Your programs are exactly where ", emphasized: "you left them" },
        { regular: "Applications waiting, scores ready, and decisions ", emphasized: "still yours to make." },
        { regular: "Pick up right where you paused and get today's cohort ", emphasized: "one step closer to launch." },
        { regular: "Let's keep building the future, ", emphasized: "one great application at a time." }
    ];

    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            toast.error(decodeURIComponent(error));
        }
    }, [searchParams]);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsVisible(false);
            setTimeout(() => {
                setCurrentTextIndex((prev) => (prev + 1) % texts.length);
                setIsVisible(true);
            }, 1000);
        }, 5000);
        return () => clearInterval(interval);
    }, [texts.length]);

    const handleGoogleLogin = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?mode=login`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
        if (error) {
            toast.error(error.message);
            setLoading(false);
        }
    };

    return (
        <ScalingWrapper className="min-h-screen flex">
            {/* Left Section - Form */}
            <div className="flex-1 overflow-y-auto bg-white">
                <div className="min-h-screen flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 py-12">
                    <div className="w-full max-w-md mx-auto">
                        {/* Logo */}
                        <div className="mb-12">
                            <Link href="/" className="flex items-center gap-2 w-fit">
                                <div className="w-6 h-6 relative flex items-center justify-center shrink-0">
                                    <Image
                                        src="/logo.svg"
                                        alt="Cohortly"
                                        width={24}
                                        height={24}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <span className="font-semibold text-lg text-gray-900">Cohortly</span>
                            </Link>
                        </div>

                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Welcome to Cohortly
                            </h1>
                            <p className="text-lg text-gray-500">
                                Your AI assistant for work
                            </p>
                        </div>

                        {/* Google Sign In */}
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full mb-8 py-6 text-base font-medium transition-all hover:bg-gray-50 hover:border-gray-400"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-3">
                                <path d="M19.8 10.2273C19.8 9.51819 19.7364 8.83637 19.6182 8.18182H10.2V12.05H15.5818C15.3273 13.3 14.5636 14.3591 13.4182 15.0682V17.5773H16.7364C18.7091 15.8364 19.8 13.2727 19.8 10.2273Z" fill="#4285F4" />
                                <path d="M10.2 20C12.9 20 15.1727 19.1045 16.7364 17.5773L13.4182 15.0682C12.4636 15.6682 11.2364 16.0227 10.2 16.0227C7.59545 16.0227 5.38182 14.2636 4.53636 11.9H1.11364V14.4909C2.66818 17.5909 6.20909 20 10.2 20Z" fill="#34A853" />
                                <path d="M4.53636 11.9C4.31818 11.3 4.19091 10.6591 4.19091 10C4.19091 9.34091 4.31818 8.7 4.53636 8.1V5.50909H1.11364C0.418182 6.89091 0 8.4 0 10C0 11.6 0.418182 13.1091 1.11364 14.4909L4.53636 11.9Z" fill="#FBBC05" />
                                <path d="M10.2 3.97727C11.3364 3.97727 12.3545 4.35909 13.1545 5.12727L16.0909 2.19091C15.1682 1.34091 12.9045 0 10.2 0C6.20909 0 2.66818 2.40909 1.11364 5.50909L4.53636 8.1C5.38182 5.73636 7.59545 3.97727 10.2 3.97727Z" fill="#EA4335" />
                            </svg>
                            {loading ? 'Connecting...' : 'Continue with Google'}
                        </Button>

                        {/* Terms */}
                        <p className="text-xs text-gray-500 leading-relaxed mb-8">
                            By signing in, you agree to the{' '}
                            <Link href="/terms" className="underline hover:text-gray-700">
                                Terms of Use
                            </Link>
                            ,{' '}
                            <Link href="/privacy" className="underline hover:text-gray-700">
                                Privacy Notice
                            </Link>
                            , and{' '}
                            <Link href="/cookies" className="underline hover:text-gray-700">
                                Cookie Notice
                            </Link>
                        </p>

                        {/* Sign up Link */}
                        <div className="pt-6 border-t border-gray-100">
                            <p className="text-sm text-center text-gray-600">
                                New to Cohortly?{' '}
                                <Link href="/signup" className="font-semibold text-black hover:underline underline-offset-4">
                                    Create an account
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Section - Animated Text - Card */}
            <div className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen flex-1 p-6">
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-[2.5rem] border border-gray-200" style={{ backgroundColor: '#f5f5f5' }}>
                    <div className="relative flex items-center justify-center w-full px-16">
                        <div className="max-w-xl">
                            <p
                                className={`text-3xl font-medium leading-relaxed text-left transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                                style={{ color: '#111827' }}
                            >
                                {texts[currentTextIndex].regular}
                                <span className="text-blue-600 italic font-semibold font-playfair">
                                    {texts[currentTextIndex].emphasized}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </ScalingWrapper>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white">Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
