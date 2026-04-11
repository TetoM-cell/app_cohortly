'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ScalingWrapper } from '@/components/scaling-wrapper';

export default function LoginPage() {
    const [currentTextIndex, setCurrentTextIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Text content with emphasized portions marked with ** **
    const texts = [
        { regular: "Your programs are exactly where ", emphasized: "you left them" },
        { regular: "Applications waiting, scores ready, and decisions ", emphasized: "still yours to make." },
        { regular: "Pick up right where you paused and get today's cohort ", emphasized: "one step closer to launch." },
        { regular: "Let's keep building the future, ", emphasized: "one great application at a time." }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setIsVisible(false);

            setTimeout(() => {
                setCurrentTextIndex((prev) => (prev + 1) % texts.length);
                setIsVisible(true);
            }, 1000); // Wait for fade out before changing text
        }, 5000); // Change text every 5 seconds

        return () => clearInterval(interval);
    }, [texts.length]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success('Successfully logged in!');
                router.push('/home');
            }
        } catch (err: any) {
            toast.error('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
        if (error) toast.error(error.message);
    };

    return (
        <ScalingWrapper className="min-h-screen flex">
            {/* Left Section - Form */}
            <div className="flex-1 overflow-y-auto">
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
                            className="w-full mb-6"
                            onClick={handleGoogleLogin}
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19.8 10.2273C19.8 9.51819 19.7364 8.83637 19.6182 8.18182H10.2V12.05H15.5818C15.3273 13.3 14.5636 14.3591 13.4182 15.0682V17.5773H16.7364C18.7091 15.8364 19.8 13.2727 19.8 10.2273Z" fill="#4285F4" />
                                <path d="M10.2 20C12.9 20 15.1727 19.1045 16.7364 17.5773L13.4182 15.0682C12.4636 15.6682 11.2364 16.0227 10.2 16.0227C7.59545 16.0227 5.38182 14.2636 4.53636 11.9H1.11364V14.4909C2.66818 17.5909 6.20909 20 10.2 20Z" fill="#34A853" />
                                <path d="M4.53636 11.9C4.31818 11.3 4.19091 10.6591 4.19091 10C4.19091 9.34091 4.31818 8.7 4.53636 8.1V5.50909H1.11364C0.418182 6.89091 0 8.4 0 10C0 11.6 0.418182 13.1091 1.11364 14.4909L4.53636 11.9Z" fill="#FBBC05" />
                                <path d="M10.2 3.97727C11.3364 3.97727 12.3545 4.35909 13.1545 5.12727L16.0909 2.19091C15.1682 1.34091 12.9045 0 10.2 0C6.20909 0 2.66818 2.40909 1.11364 5.50909L4.53636 8.1C5.38182 5.73636 7.59545 3.97727 10.2 3.97727Z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </Button>

                        {/* Divider */}
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-500">or</span>
                            </div>
                        </div>

                        <form onSubmit={handleLogin}>
                            {/* Email Input */}
                            <div className="mb-4">
                                <Input
                                    type="email"
                                    placeholder="janesmith1.cohortly@gmail.com"
                                    className="h-10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Password Input */}
                            <div className="mb-6">
                                <Input
                                    type="password"
                                    placeholder="Password"
                                    className="h-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Continue Button */}
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full mb-6 bg-black hover:bg-gray-800"
                                disabled={loading}
                            >
                                {loading ? 'Logging in...' : 'Continue with email'}
                            </Button>
                        </form>

                        {/* Terms */}
                        <p className="text-xs text-gray-500 leading-relaxed">
                            By signing up, you agree to the{' '}
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
                        <p className="text-sm text-center text-gray-600">
                            Don't have an account?{' '}
                            <Link href="/signup" className="font-medium text-black hover:underline">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Section - Animated Text - Card */}
            <div className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen flex-1 p-6">
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-[2.5rem] border border-gray-200" style={{ backgroundColor: '#f5f5f5' }}>
                    {/* Animated Text Content */}
                    <div className="relative flex items-center justify-center w-full px-16">
                        <div className="max-w-xl">
                            <p
                                className={`text-3xl font-medium leading-relaxed text-left transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'
                                    }`}
                                style={{ color: '#111827' }}
                            >
                                {texts[currentTextIndex].regular}
                                <span
                                    className="text-blue-600 italic font-semibold font-playfair"
                                >
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
