import { NextRequest, NextResponse } from "next/server";

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || "";
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Missing Turnstile token." },
                { status: 400 }
            );
        }

        if (!TURNSTILE_SECRET_KEY) {
            // If Turnstile is not configured, allow the request (dev mode)
            console.warn("[Turnstile] Secret key not configured — skipping verification.");
            return NextResponse.json({ success: true });
        }

        const formData = new URLSearchParams();
        formData.append("secret", TURNSTILE_SECRET_KEY);
        formData.append("response", token);

        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
        if (ip) {
            formData.append("remoteip", ip);
        }

        const result = await fetch(TURNSTILE_VERIFY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
        });

        const outcome = await result.json();

        if (!outcome.success) {
            console.error("[Turnstile] Verification failed:", outcome["error-codes"]);
            return NextResponse.json(
                { success: false, error: "Bot verification failed. Please try again." },
                { status: 403 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Turnstile] Server error:", error);
        return NextResponse.json(
            { success: false, error: "Verification service error." },
            { status: 500 }
        );
    }
}
