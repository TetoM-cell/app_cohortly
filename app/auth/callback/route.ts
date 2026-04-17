import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const error_description = searchParams.get('error_description')
    const next = searchParams.get('next') ?? '/dashboard'

    if (error) {
        console.error('Auth error:', error, error_description)
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error)}`)
    }

    if (code) {
        const supabase = await createClient()
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        
        if (!exchangeError) {
            return NextResponse.redirect(`${origin}${next}`)
        }
        
        console.error('Exchange error:', exchangeError.message)
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`)
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/login?error=No+authentication+code+received`)
}
