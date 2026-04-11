"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

function BetaGuardInner() {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const router = useRouter()
    
    const [isOpen, setIsOpen] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isChecking, setIsChecking] = useState(true)

    // Check URL for beta code parameter
    useEffect(() => {
        const urlCode = searchParams.get('beta')
        if (urlCode) {
            setCode(urlCode.toUpperCase())
        }
    }, [searchParams])

    useEffect(() => {
        const checkBetaAccess = async () => {
            const { data: { session }, error } = await supabase.auth.getSession()
            const currentUser = session?.user
            
            if (!currentUser) {
                setIsOpen(false)
                setIsChecking(false)
                return
            }
            
            setUser(currentUser)

            if (currentUser.user_metadata?.is_beta_user) {
                setIsOpen(false)
            } else {
                // Not a beta user, show modal if they are on a protected page
                const publicPaths = ['/login', '/signup', '/terms', '/privacy', '/cookies']
                // Don't block public landing pages, auth callbacks, or admin routes
                if (!publicPaths.includes(pathname) && !pathname.startsWith('/auth/') && !pathname.startsWith('/admin')) {
                    setIsOpen(true)
                }
            }
            setIsChecking(false)
        }
        
        checkBetaAccess()
        
        // Listen to auth state changes to dynamically catch when a user logs in
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user
            if (!currentUser) {
                setIsOpen(false)
                setUser(null)
            } else {
                setUser(currentUser)
                if (currentUser.user_metadata?.is_beta_user) {
                    setIsOpen(false)
                } else {
                    const publicPaths = ['/login', '/signup', '/terms', '/privacy', '/cookies']
                    if (!publicPaths.includes(pathname) && !pathname.startsWith('/auth/') && !pathname.startsWith('/admin')) {
                        setIsOpen(true)
                    }
                }
            }
        })
        
        return () => subscription.unsubscribe()
    }, [pathname])

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!code.trim() || !user) return
        
        setLoading(true)
        setError(null)
        
        try {
            // Attempt to claim the beta code
            const { data, error: updateError } = await supabase
                .from('beta_codes')
                .update({ 
                    is_used: true, 
                    used_by: user.id 
                })
                .eq('code', code.trim().toUpperCase())
                .eq('is_used', false)
                .select()
                .single()
                
            if (updateError || !data) {
                setError("Invalid, expired, or previously redeemed beta code. Please check and try again.")
                setLoading(false)
                return
            }
            
            // If successful, update user metadata
            const { error: metaError } = await supabase.auth.updateUser({
                data: { is_beta_user: true }
            })
            
            if (metaError) {
                setError("Failed to update user profile. Please contact support.")
                setLoading(false)
                return
            }
            
            toast.success("Beta access granted! Welcome to Cohortly.")
            
            setIsOpen(false)
            
            // Clean up URL if it has the beta parameter
            if (searchParams.get('beta')) {
                const newUrl = new URL(window.location.href)
                newUrl.searchParams.delete('beta')
                router.replace(newUrl.pathname + newUrl.search)
            }
            
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    if (isChecking) return null

    return (
        <Dialog open={isOpen} onOpenChange={() => {}}>
            <DialogContent 
                className="sm:max-w-xs outline-none gap-0"
                wrapperClassName="p-5"
                showCloseButton={false} 
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader className="text-center items-center pb-3">
                    <Image src="/logo.svg" alt="Cohortly" width={28} height={28} className="w-7 h-7 object-contain mb-2" />
                    <DialogTitle className="text-lg font-bold tracking-tight text-gray-900">Welcome to Cohortly</DialogTitle>
                    <DialogDescription className="text-sm text-gray-500 text-center mt-1">
                        Please enter your exclusive beta code to continue unlocking full features.
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleVerify} className="space-y-4">
                    <div className="space-y-2">
                        <Input 
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="Enter code..."
                            className="text-center font-mono tracking-widest uppercase h-10 text-base font-semibold text-gray-900 placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-400 placeholder:text-sm bg-gray-50/50"
                            autoFocus
                        />
                    </div>
                    
                    {error && (
                        <Alert variant="destructive" className="py-2.5 bg-red-50 border-red-200">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-[11px] font-semibold">{error}</AlertDescription>
                        </Alert>
                    )}
                    
                    <Button 
                        type="submit" 
                        disabled={loading || !code.trim()} 
                        className="w-full h-10 bg-gray-900 hover:bg-gray-800 text-white font-medium transition-all active:scale-[0.98]"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            "Verify & Continue"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export function BetaGuard() {
    return (
        <Suspense fallback={null}>
            <BetaGuardInner />
        </Suspense>
    )
}
