import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    try {
        let response = NextResponse.next({
            request: {
                headers: request.headers,
            },
        })

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        request.cookies.set({
                            name,
                            value,
                            ...options,
                        })
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        })
                        response.cookies.set({
                            name,
                            value,
                            ...options,
                        })
                    },
                    remove(name: string, options: CookieOptions) {
                        request.cookies.set({
                            name,
                            value: '',
                            ...options,
                        })
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        })
                        response.cookies.set({
                            name,
                            value: '',
                            ...options,
                        })
                    },
                },
            }
        )

        const { data: { user } } = await supabase.auth.getUser()

        // Protected routes logic
        const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
            request.nextUrl.pathname.startsWith('/signup')
        const isPublicRoute = isAuthPage ||
            request.nextUrl.pathname.startsWith('/auth') ||
            request.nextUrl.pathname === '/'

        // If user is not logged in and trying to access a private route
        if (!user && !isPublicRoute) {
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/login'
            redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
            return NextResponse.redirect(redirectUrl)
        }

        // If user is logged in and trying to access login/signup pages
        if (user && isAuthPage) {
            const redirectUrl = request.nextUrl.clone()
            redirectUrl.pathname = '/home'
            return NextResponse.redirect(redirectUrl)
        }

        return response
    } catch (e) {
        console.error('Middleware error:', e)
        return NextResponse.next()
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
