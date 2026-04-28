// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { application_id, program_id } = await req.json()
        console.log(`[AI-Scorer] Starting for App: ${application_id}, Program: ${program_id}`)

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

        if (!geminiApiKey) throw new Error('GEMINI_API_KEY secret is missing in Supabase')

        // --- AUTH VERIFICATION ---
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Unauthorized: No Authorization header found.')
        }

        const userToken = authHeader.replace('Bearer ', '')
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Verifying the user token via the auth service
        const { data: { user }, error: authError } = await supabase.auth.getUser(userToken)

        if (authError || !user) {
            console.error('[AI-Scorer AUTH ERROR]:', authError?.message || 'No user found for token')
            throw new Error(`Unauthorized: ${authError?.message || 'Invalid or expired session token.'}`)
        }
        console.log(`[AI-Scorer] Verified user: ${user.id}`)
        // --- END AUTH VERIFICATION ---

        // 1. Fetch Program, Rubric, and Form Definition
        const [
            { data: program, error: programError },
            { data: rubric, error: rubricError },
            { data: form, error: formError },
            { data: application, error: appError }
        ] = await Promise.all([
            supabase.from('programs').select('name, type, owner_id').eq('id', program_id).single(),
            supabase.from('rubrics').select('id, name, description, weight').eq('program_id', program_id),
            supabase.from('forms').select('fields').eq('program_id', program_id).maybeSingle(),
            supabase.from('applications').select('answers').eq('id', application_id).single()
        ])

        if (programError || !program) throw new Error('Program not found')
        if (program.owner_id !== user.id) throw new Error('Forbidden: You do not own this program.')
        if (rubricError || !rubric || rubric.length === 0) throw new Error('No rubric found for this program')
        if (appError || !application) throw new Error('Application data not found')

        // 2. Map Answers to Labels for AI Context
        const fieldMap = {}
        if (form?.fields) {
            form.fields.forEach(f => { fieldMap[f.id] = f.label })
        }

        const enrichedAnswers = []
        Object.entries(application.answers || {}).forEach(([id, val]) => {
            const label = fieldMap[id] || id
            enrichedAnswers.push({ question: label, answer: val })
        })

        // 3. Build Prompt with Full Context
        const prompt = `
You are an expert evaluator for the program: "${program.name}".
Your task is to score the following application based on the provided rubric.

RUBRIC:
${rubric.map(r => `- [${r.name}] (Weight: ${r.weight}%): ${r.description || 'No description provided.'}`).join('\n')}

APPLICATION DATA:
${enrichedAnswers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')}

INSTRUCTIONS:
1. Score each criterion from 0 to 100.
2. Provide a brief, professional explanation for each score.
3. Calculate an overall_score (weighted average) from 0 to 100.
4. Provide a reasoning_summary that explains the overall decision.

Respond ONLY with valid JSON in this format:
{
  "overall_score": <number>,
  "reasoning_summary": "<string>",
  "breakdown": [
    { "criterion_id": "<id>", "score": <number>, "explanation": "<string>" }
  ]
}`

        // 4. Call Gemini (User requested: gemini-2.5-flash)
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    response_mime_type: "application/json"
                }
            })
        })

        if (!res.ok) {
            const err = await res.text()
            throw new Error(`Gemini API error: ${res.status} - ${err}`)
        }

        const geminiData = await res.json()
        const rawText = geminiData.candidates[0].content.parts[0].text.trim()
        const result = JSON.parse(rawText)

        // 5. Update Database
        const scoresMap = {}
        result.breakdown.forEach(item => {
            scoresMap[item.criterion_id] = { score: item.score, explanation: item.explanation }
        })

        const { error: updateError } = await supabase
            .from('applications')
            .update({
                overall_ai_score: result.overall_score,
                ai_explanation: result.reasoning_summary,
                scores: scoresMap,
                status: 'scored'
            })
            .eq('id', application_id)

        if (updateError) throw new Error(`Database update failed: ${updateError.message}`)

        // 6. Chain Automation: Trigger Threshold Processing
        try {
            await fetch(`${supabaseUrl}/functions/v1/process-application-thresholds`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`
                },
                body: JSON.stringify({
                    application_id: application_id,
                    program_id: program_id
                })
            })
        } catch (automationErr) {
            console.error(`[AI-Scorer] Automation chaining failed: ${automationErr.message}`)
        }

        // 7. Optional: Trigger Slack Notification
        try {
            await fetch(`${supabaseUrl}/functions/v1/notify-slack`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`
                },
                body: JSON.stringify({
                    message: `AI Scoring complete for *${program.name}*. \n*Score: ${result.overall_score}* \n${result.reasoning_summary}`,
                    programName: program.name,
                    applicationId: application_id,
                    programId: program_id,
                    emoji: '🤖'
                })
            })
        } catch (slackErr) { /* ignore slack failures */ }

        return new Response(JSON.stringify({ success: true, score: result.overall_score }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (err) {
        console.error(`[AI-Scorer CRASH]: ${err.message}`)
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })
    }
})
