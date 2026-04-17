import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { seedDemoCohort } from '@/lib/demo-seeder'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in search params, use it as the redirection URL after successful sign in
    const next = searchParams.get('next') ?? '/home'

    const mode = searchParams.get('mode') ?? 'login'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const { data: { user } } = await supabase.auth.getUser()
            let isNewUser = false;
            
            if (user) {
                // Check if profile already exists
                const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
                
                // Gatekeeper: If trying to login but no account exists, bounce to signup
                if (mode === 'login' && !existingProfile) {
                    return NextResponse.redirect(`${origin}/signup?error=account_not_found`)
                }

                // If we're in signup mode, or the profile doesn't exist yet, treat as new user
                isNewUser = (mode === 'signup') || !existingProfile;

                // Create or update profile
                await supabase.from('profiles').upsert(
                    {
                        id: user.id,
                        email: user.email,
                        full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
                        avatar_url: user.user_metadata?.avatar_url ?? null,
                    },
                    { onConflict: 'id', ignoreDuplicates: false }
                )
                
                // Seed demo if applicable
                if (isNewUser) {
                    await seedDemoCohort(supabase, user.id);
                }
            }
            
            const finalRedirectUrl = (isNewUser && mode === 'signup') 
                ? `${origin}${next}?demo_seeded=1` 
                : `${origin}${next}`;

            return NextResponse.redirect(finalRedirectUrl)
        }
        console.error('Auth error:', error)
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
