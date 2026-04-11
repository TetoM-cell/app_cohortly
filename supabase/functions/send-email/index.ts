import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
// Default to Brevo shared sender if not configured, or use a verified domain
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Cohortly <no-reply@cohortly.com>'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailPayload {
    to: string
    subject: string
    template: 'reviewer-invite' | 'application-shortlisted' | 'application-rejected'
    data: Record<string, any>
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { to, subject, template, data } = await req.json() as EmailPayload

        // Validation
        if (!to || !subject || !template) {
            throw new Error('Missing required fields: to, subject, or template')
        }

        if (!BREVO_API_KEY) {
            throw new Error('BREVO_API_KEY is not set')
        }

        let html = ''

        // Templates
        switch (template) {
            case 'reviewer-invite':
                html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
            <h2 style="color: #333;">Welcome to Cohortly!</h2>
            <p>You've been invited to review applications for <strong>${data.programName}</strong> as a <strong>${data.role || 'Reviewer'}</strong>.</p>
            <p>Click the link below to join the program and start reviewing:</p>
            <div style="margin: 30px 0;">
              <a href="${data.inviteLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Join Program</a>
            </div>
            <p style="color: #666; font-size: 14px;">If you didn't expect this invite, you can safely ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">Sent by Cohortly</p>
          </div>
        `
                break

            case 'application-shortlisted':
                html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
            <h2 style="color: #28a745;">Great News!</h2>
            <p>Congratulations! Your application for <strong>${data.programName}</strong> has been shortlisted.</p>
            <p><strong>Next Steps:</strong></p>
            <p>${data.nextSteps || 'The program coordinator will reach out to you shortly with more details.'}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">Sent by Cohortly</p>
          </div>
        `
                break

            case 'application-rejected':
                html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 8px;">
            <h2 style="color: #333;">Update on your application</h2>
            <p>Thank you for your interest in <strong>${data.programName}</strong>.</p>
            <p>After careful review, we regret to inform you that we won't be moving forward with your application at this time.</p>
            ${data.feedback ? `<p><strong>Feedback:</strong><br>${data.feedback}</p>` : ''}
            <p>We appreciate the time and effort you put into your application and wish you the best in your future endeavors.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">Sent by Cohortly</p>
          </div>
        `
                break

            default:
                throw new Error(`Unknown template: ${template}`)
        }

        // Parse custom From address if needed, typically "Name <email>"
        // Brevo expects object { name, email }
        let senderName = 'Cohortly'
        let senderEmail = 'no-reply@cohortly.com' // Fallback

        // Simple parsing of "Name <email>" format
        const fromMatch = FROM_EMAIL.match(/^(.*?)\s*<(.*)>$/)
        if (fromMatch) {
            senderName = fromMatch[1].trim()
            senderEmail = fromMatch[2].trim()
        } else {
            senderEmail = FROM_EMAIL
        }

        // Using Brevo shared sender for early production – add custom domain later

        // Call Brevo API
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: {
                    name: senderName,
                    email: senderEmail
                },
                to: [
                    {
                        email: to
                    }
                ],
                subject: subject,
                htmlContent: html,
            }),
        })

        const result = await res.json()

        if (!res.ok) {
            console.error('Brevo API error:', result)
            throw new Error(`Brevo API failed: ${result.message || result.code || res.statusText}`)
        }

        console.log(`Email sent successfully to ${to} using template ${template}. Message ID: ${result.messageId}`)

        return new Response(JSON.stringify({ success: true, message_id: result.messageId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Error sending email:', error.message)
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
