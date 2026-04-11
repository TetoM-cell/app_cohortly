// @ts-nocheck

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
    application_id: string;
    program_id: string;
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        const supabaseClient = createClient(
            supabaseUrl,
            supabaseServiceKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        const { application_id, program_id } = await req.json() as Payload;

        if (!application_id || !program_id) {
            throw new Error('Missing application_id or program_id');
        }

        // 1. Fetch Threshold Rules
        const { data: rules, error: rulesError } = await supabaseClient
            .from('threshold_rules')
            .select('*')
            .eq('program_id', program_id)
            .eq('enabled', true);

        if (rulesError) throw rulesError;

        if (!rules || rules.length === 0) {
            return new Response(JSON.stringify({ message: 'No enabled rules found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // SECURITY GUARD: Check for illegal 'accept' action
        // Auto-accept intentionally blocked at backend to prevent irreversible decisions without human review
        const illegalRule = rules.find((r: any) => r.action === 'accept' || r.action === 'auto-accept');
        if (illegalRule) {
            const warningMsg = `BLOCKED: Illegal 'auto-accept' rule detected for program ${program_id}. All automation halted for this application.`;
            console.error(warningMsg);

            // Log security event
            await supabaseClient.from('application_logs').insert({
                application_id,
                program_id,
                event_type: 'security_warning',
                message: warningMsg,
                details: { rule: illegalRule },
            });

            return new Response(JSON.stringify({ error: warningMsg }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400, // Client error because configuration is invalid/unsafe
            });
        }

        // 2. Fetch Application Data
        const { data: application, error: appError } = await supabaseClient
            .from('applications')
            .select('overall_ai_score, status')
            .eq('id', application_id)
            .single();

        if (appError) throw appError;

        if (!application || application.overall_ai_score === null) {
            return new Response(JSON.stringify({ message: 'Application not found or no score' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        const score = application.overall_ai_score;
        let actionTaken = null;
        let newStatus = null;

        // 3. Evaluate Rules
        // We prioritize actions: Reject > Shortlist > Notify
        // (Or logic depends on your specific needs, here we take the first matching strictly defined action)

        // Check for Reject first (usually safety priority)
        const rejectRule = rules.find((r: any) => r.action === 'reject' || r.action === 'auto-reject');
        if (rejectRule) {
            const threshold = rejectRule.value;
            const operator = rejectRule.operator; // '<', '<=', etc.

            let isMatch = false;
            if (operator === '<' && score < threshold) isMatch = true;
            if (operator === '<=' && score <= threshold) isMatch = true;

            if (isMatch) {
                newStatus = 'rejected';
                actionTaken = 'auto-reject';
            }
        }

        // If not rejected, check for Shortlist
        if (!newStatus) {
            const shortlistRule = rules.find((r: any) => r.action === 'shortlist' || r.action === 'auto-shortlist');
            if (shortlistRule) {
                const threshold = shortlistRule.value;
                const operator = shortlistRule.operator; // '>=', '>', etc.

                let isMatch = false;
                if (operator === '>=' && score >= threshold) isMatch = true;
                if (operator === '>' && score > threshold) isMatch = true;

                if (isMatch) {
                    newStatus = 'shortlist'; // Ensure this matches your DB enum/status string
                    actionTaken = 'auto-shortlist';
                }
            }
        }

        // 4. Execute Action
        if (newStatus && actionTaken) {
            // Update Application Status
            const { error: updateError } = await supabaseClient
                .from('applications')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', application_id);

            if (updateError) throw updateError;

            // Log success
            await supabaseClient.from('application_logs').insert({
                application_id,
                program_id,
                event_type: 'automation_action',
                message: `Application moved to ${newStatus} based on score ${score}`,
                details: { action: actionTaken, score, new_status: newStatus },
            });

            return new Response(JSON.stringify({ success: true, action: actionTaken, newStatus }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });

        } else {
            // No rule matched
            return new Response(JSON.stringify({ success: true, action: 'none', message: 'No rules matched' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

    } catch (error: any) {
        console.error('Error processing thresholds:', error);

        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
