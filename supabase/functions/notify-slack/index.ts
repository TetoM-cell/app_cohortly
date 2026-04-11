// Slack Incoming Webhook – simple, no auth needed. Upgrade to Slack App later for richer features.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Create Supabase Client with SERVICE_ROLE_KEY to bypass RLS for lookups
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // 2. Parse payload
        const json = await req.json()
        const {
            message,
            emoji = ':bell:',
            programName,
            applicationId,
            programId // New: to find the owner's webhook
        } = json

        // 3. Get Target Webhook URL
        let targetUrl = SLACK_WEBHOOK_URL

        if (programId) {
            // Find the owner of this program
            const { data: program } = await supabaseClient
                .from('programs')
                .select('owner_id')
                .eq('id', programId)
                .maybeSingle()

            if (program?.owner_id) {
                const { data: settings } = await supabaseClient
                    .from('user_settings')
                    .select('slack_webhook_url')
                    .eq('user_id', program.owner_id)
                    .maybeSingle()
                
                if (settings?.slack_webhook_url) {
                    targetUrl = settings.slack_webhook_url
                }
            }
        }

        if (!targetUrl) {
            console.error("Missing Webhook URL (Program Owner or Env)")
            return new Response(JSON.stringify({ error: "No Slack Webhook configured for this program owner." }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
        }

        // 4. Build Slack Block Kit message
        const blocks = []

        // Header section
        blocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: `${emoji} *Cohortly Alert:* ${message}`
            }
        })

        // Context fields (Program, App ID, Timestamp)
        const fields = []

        if (programName) {
            fields.push({
                type: "mrkdwn",
                text: `*Program:*\n${programName}`
            })
        }

        if (applicationId) {
            fields.push({
                type: "mrkdwn",
                text: `*Application ID:*\n${applicationId}`
            })
        }

        // Always add timestamp
        fields.push({
            type: "mrkdwn",
            text: `*Timestamp:*\n${new Date().toISOString()}`
        })

        if (fields.length > 0) {
            blocks.push({
                type: "section",
                fields: fields
            })
        }

        // 5. Send to Slack
        const slackResponse = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blocks }),
        })

        if (!slackResponse.ok) {
            const errorText = await slackResponse.text()
            throw new Error(`Slack Webhook failed: ${slackResponse.status} ${errorText}`)
        }

        // 6. Return success
        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        })

    } catch (error) {
        console.error("Error in notify-slack:", error)
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        })
    }
})
